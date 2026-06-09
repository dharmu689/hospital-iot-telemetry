import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const patientId = url.searchParams.get("patientId");
    const page = parseInt(url.searchParams.get('page') || '1');
    const limitCount = parseInt(url.searchParams.get('limit') || '10');

    // Fetch all patients to map names to alerts
    const patientsSnap = await adminDb.collection("patients").get();
    const patientNames: Record<string, string> = {};
    patientsSnap.docs.forEach(doc => {
      patientNames[doc.id] = doc.data().name || doc.id;
    });

    let snapshot;
    if (patientId) {
      snapshot = await adminDb
        .collection("patients")
        .doc(patientId)
        .collection("alerts")
        .get();
    } else {
      snapshot = await adminDb.collectionGroup("alerts").get();
    }

    let alerts = snapshot.docs.map(doc => {
      const data = doc.data();
      const pId = data.patientId || "unknown";
      return {
        ...data,
        patientName: patientNames[pId] || pId,
      };
    });

    // Sort in-memory because Firestore collectionGroup queries need specific compound indexes for sorting
    alerts.sort((a: any, b: any) => b.triggeredAt - a.triggeredAt);

    // Apply pagination in-memory because we had to sort in-memory
    const total = alerts.length;
    const startIndex = (page - 1) * limitCount;
    const paginatedAlerts = alerts.slice(startIndex, startIndex + limitCount);

    return NextResponse.json({
      data: paginatedAlerts,
      meta: {
        total,
        page,
        limit: limitCount,
        totalPages: Math.ceil(total / limitCount)
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
