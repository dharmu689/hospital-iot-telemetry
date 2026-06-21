interface CacheEntry {
  data: any;
  timestamp: number;
  promise?: Promise<any>;
}

const CACHE_TTL = 15 * 60 * 1000; // 15 minutes (reduces reads by 66%)
const cache = new Map<string, CacheEntry>();

function getCacheKey(method: string, url: string): string {
  return `${method}:${url}`;
}

function isExpired(entry: CacheEntry): boolean {
  return Date.now() - entry.timestamp > CACHE_TTL;
}

/**
 * Fetch with client-side caching, TTL, and request deduplication.
 * - Returns cached response if fresh (< 5min old)
 * - Deduplicates in-flight requests (returns same promise)
 * - Auto-expires after 5 minutes
 * - Supports manual cache invalidation
 */
export async function cachedFetch(
  url: string,
  options: RequestInit = {},
  skipCache = false
): Promise<any> {
  const method = (options.method || "GET").toUpperCase();
  const cacheKey = getCacheKey(method, url);

  // Skip cache for non-GET requests or manual override
  if (method !== "GET" || skipCache) {
    const response = await fetch(url, options);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  // Check if we have a fresh cached entry
  const cached = cache.get(cacheKey);
  if (cached && !isExpired(cached)) {
    return cached.data;
  }

  // Check if a request is already in flight
  if (cached?.promise) {
    return cached.promise;
  }

  // Create new fetch promise
  const fetchPromise = fetch(url, options)
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then(data => {
      // Store in cache with promise cleared
      cache.set(cacheKey, { data, timestamp: Date.now(), promise: undefined });
      return data;
    })
    .catch(err => {
      // Remove from cache on error so next request will retry
      cache.delete(cacheKey);
      throw err;
    });

  // Store promise to deduplicate concurrent requests
  cache.set(cacheKey, { data: null, timestamp: Date.now(), promise: fetchPromise });

  return fetchPromise;
}

/**
 * Manually invalidate cache entries to force fresh fetch.
 * Useful after POST/PUT/DELETE mutations.
 */
export function invalidateCache(urlPattern: string | RegExp): void {
  if (typeof urlPattern === "string") {
    // Exact match
    for (const [key] of cache) {
      if (key.includes(urlPattern)) {
        cache.delete(key);
      }
    }
  } else {
    // Regex match
    for (const [key] of cache) {
      const url = key.split(":")[1];
      if (urlPattern.test(url)) {
        cache.delete(key);
      }
    }
  }
}

/**
 * Clear entire cache (useful for logout, manual refresh)
 */
export function clearCache(): void {
  cache.clear();
}

/**
 * Get cache stats for debugging
 */
export function getCacheStats() {
  const stats = {
    size: cache.size,
    entries: Array.from(cache.entries()).map(([key, entry]) => ({
      key,
      age: Date.now() - entry.timestamp,
      expired: isExpired(entry),
    })),
  };
  return stats;
}
