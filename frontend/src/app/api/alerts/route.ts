import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const patientId = url.searchParams.get("patientId");
    const page = parseInt(url.searchParams.get("page") || "1");
    const limitCount = parseInt(url.searchParams.get("limit") || "10");
    const search = url.searchParams.get("search");

    let alerts: any[] = [];
    let total = 0;
    let indexError = false;

    // 1. Try DB-level sorting and pagination
    try {
      let query: any = adminDb.collectionGroup("alerts");
      if (patientId) {
        query = adminDb.collection("patients").doc(patientId).collection("alerts");
      }

      const countSnap = await query.count().get();
      total = countSnap.data().count;

      const offsetCount = (page - 1) * limitCount;
      const snapshot = await query
        .orderBy("triggeredAt", "desc")
        .offset(offsetCount)
        .limit(limitCount)
        .get();

      alerts = snapshot.docs.map((doc: any) => doc.data());
    } catch (err: any) {
      console.warn("Falling back to in-memory sorting/pagination:", err.message);
      indexError = true;
    }

    // 2. Fallback to in-memory if DB-level query fails
    if (indexError) {
      let snapshot;
      if (patientId) {
        snapshot = await adminDb.collection("patients").doc(patientId).collection("alerts").get();
      } else {
        snapshot = await adminDb.collectionGroup("alerts").get();
      }
      const allAlerts = snapshot.docs.map((doc: any) => doc.data());
      allAlerts.sort((a: any, b: any) => b.triggeredAt - a.triggeredAt);
      total = allAlerts.length;
      const startIndex = (page - 1) * limitCount;
      alerts = allAlerts.slice(startIndex, startIndex + limitCount);
    }

    // 3. Batch-fetch patient names for alerts on current page
    const uniquePatientIds = Array.from(new Set(alerts.map((a: any) => a.patientId).filter(Boolean)));
    const patientNames: Record<string, string> = {};

    if (uniquePatientIds.length > 0) {
      const patientRefs = uniquePatientIds.map(id => adminDb.collection("patients").doc(id as string));
      const patientSnaps = await adminDb.getAll(...patientRefs);
      patientSnaps.forEach(snap => {
        if (snap.exists) {
          patientNames[snap.id] = snap.data()?.name || snap.id;
        }
      });
    }

    // 4. Join names
    let finalAlerts = alerts.map((alert: any) => {
      const pId = alert.patientId || "unknown";
      return { ...alert, patientName: patientNames[pId] || pId };
    });

    // 5. Apply server-side search filter after name join
    if (search && search.trim() !== "") {
      const searchLower = search.toLowerCase();
      finalAlerts = finalAlerts.filter((a: any) =>
        (a.message && a.message.toLowerCase().includes(searchLower)) ||
        (a.patientId && a.patientId.toLowerCase().includes(searchLower)) ||
        (a.patientName && a.patientName.toLowerCase().includes(searchLower))
      );
      total = finalAlerts.length;
    }

    return NextResponse.json(
      {
        data: finalAlerts,
        meta: {
          total,
          page,
          limit: limitCount,
          totalPages: Math.ceil(total / limitCount) || 1,
        },
      },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
