import { useState, useEffect, useRef } from "react";
import { ref, onValue, Unsubscribe } from "firebase/database";
import { rtdb } from "@/lib/firebase";
import { VitalReading } from "@/types";

interface SubscriptionCache {
  unsubLatest: Unsubscribe;
  unsubStream: Unsubscribe;
  latest: VitalReading | null;
  stream: VitalReading[];
  subscribers: number;
}

// Global cache of subscriptions by patientId to prevent duplicate listeners
const subscriptionCache = new Map<string, SubscriptionCache>();

function getOrCreateSubscription(patientId: string): SubscriptionCache {
  // Reuse existing subscription if one exists
  if (subscriptionCache.has(patientId)) {
    const cached = subscriptionCache.get(patientId)!;
    cached.subscribers++;
    return cached;
  }

  // Create new subscription
  let latestData: VitalReading | null = null;
  let streamData: VitalReading[] = [];

  const latestRef = ref(rtdb, `vitals/${patientId}/latest`);
  const unsubLatest = onValue(latestRef, (snapshot) => {
    if (snapshot.exists()) {
      latestData = snapshot.val();
      // Notify all components using this subscription
      const cached = subscriptionCache.get(patientId);
      if (cached) {
        cached.latest = latestData;
      }
    }
  });

  const streamRef = ref(rtdb, `vitals/${patientId}/stream`);
  const unsubStream = onValue(streamRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      const sorted = Object.values(data) as VitalReading[];
      sorted.sort((a, b) => a.timestamp - b.timestamp);
      streamData = sorted.slice(-360); // Keep last 30 mins
      // Notify all components using this subscription
      const cached = subscriptionCache.get(patientId);
      if (cached) {
        cached.stream = streamData;
      }
    }
  });

  const subscription: SubscriptionCache = {
    unsubLatest,
    unsubStream,
    latest: latestData,
    stream: streamData,
    subscribers: 1,
  };

  subscriptionCache.set(patientId, subscription);
  return subscription;
}

function releaseSubscription(patientId: string) {
  const cached = subscriptionCache.get(patientId);
  if (!cached) return;

  cached.subscribers--;

  // Only unsubscribe when no components are using this subscription
  if (cached.subscribers === 0) {
    cached.unsubLatest();
    cached.unsubStream();
    subscriptionCache.delete(patientId);
  }
}

export function useLiveVitals(patientId: string) {
  const [latest, setLatest] = useState<VitalReading | null>(null);
  const [stream, setStream] = useState<VitalReading[]>([]);
  const subscriptionRef = useRef<SubscriptionCache | null>(null);

  useEffect(() => {
    if (!patientId) return;

    // Get or create subscription
    const subscription = getOrCreateSubscription(patientId);
    subscriptionRef.current = subscription;

    // Set initial state
    setLatest(subscription.latest);
    setStream(subscription.stream);

    // Update state when subscription data changes
    const updateInterval = setInterval(() => {
      setLatest(subscription.latest);
      setStream(subscription.stream);
    }, 100); // Check for updates every 100ms (low overhead)

    return () => {
      clearInterval(updateInterval);
      if (subscriptionRef.current) {
        releaseSubscription(patientId);
        subscriptionRef.current = null;
      }
    };
  }, [patientId]);

  return { latest, stream };
}
