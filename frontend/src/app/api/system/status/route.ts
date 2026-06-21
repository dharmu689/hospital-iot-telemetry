import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// Cache status for 2 seconds to avoid repeated slow queries
let cachedStatus = { simulator: false, agent: false };
let lastCacheTime = 0;
const CACHE_DURATION = 2000; // 2 seconds

export async function GET() {
  try {
    const now = Date.now();

    // Return cached result if fresh
    if (now - lastCacheTime < CACHE_DURATION) {
      return NextResponse.json(cachedStatus, {
        headers: { "Cache-Control": "public, max-age=2" }
      });
    }

    // Use faster tasklist instead of WMI
    try {
      const { stdout } = await execAsync("tasklist");
      cachedStatus = {
        simulator: stdout.includes("simulator.py") || stdout.includes("python.exe"),
        agent: stdout.includes("agent.py") || stdout.includes("python.exe")
      };
    } catch {
      cachedStatus = { simulator: false, agent: false };
    }

    lastCacheTime = now;

    return NextResponse.json(cachedStatus, {
      headers: { "Cache-Control": "private, max-age=120" } // 2 min cache (simulator status)
    });
  } catch (error) {
    return NextResponse.json({ simulator: false, agent: false });
  }
}
