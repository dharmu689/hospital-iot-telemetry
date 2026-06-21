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

    // 1. Fetch alerts - query by patient if specified, otherwise fetch all patients' alerts
    if (patientId) {
      // Single patient: use direct collection query
      const snapshot = await adminDb
        .collection("patients")
        .doc(patientId)
        .collection("alerts")
        .orderBy("triggeredAt", "desc")
        .get();

      const allAlerts = snapshot.docs.map((doc: any) => doc.data());
      total = allAlerts.length;
      const startIndex = (page - 1) * limitCount;
      alerts = allAlerts.slice(startIndex, startIndex + limitCount);
    } else {
      // All patients: fetch from each patient's alerts subcollection (capped to avoid slowness)
      const patientsSnapshot = await adminDb.collection("patients").limit(100).get();
      let allAlerts: any[] = [];

      // Fetch alerts from each patient in parallel for speed
      const alertPromises = patientsSnapshot.docs.map(patientDoc =>
        adminDb
          .collection("patients")
          .doc(patientDoc.id)
          .collection("alerts")
          .limit(50) // Limit per patient to avoid huge fetches
          .get()
          .then(snap => snap.docs.map(doc => doc.data()))
      );

      const alertsPerPatient = await Promise.all(alertPromises);
      allAlerts = alertsPerPatient.flat();

      // Sort by triggeredAt descending
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
      { headers: { "Cache-Control": "private, max-age=900" } } // 15 min cache
    );
  } catch (error: any) {
    const errorMsg = error.message || String(error);
    const isQuotaError = errorMsg.includes('429') || errorMsg.includes('Quota') || errorMsg.includes('RESOURCE_EXHAUSTED');

    console.error(`[ALERTS API] ${isQuotaError ? 'QUOTA' : 'ERROR'}: ${errorMsg}`);

    return NextResponse.json(
      {
        error: isQuotaError
          ? 'Firestore quota exceeded. Will reset at 6:30 AM IST (1 AM GMT).'
          : error.message
      },
      { status: isQuotaError ? 503 : 500 }
    );
  }
}
