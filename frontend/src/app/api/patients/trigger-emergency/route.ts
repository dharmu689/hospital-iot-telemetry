import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
  try {
    const { patientId, vitalType, severity } = await req.json();

    if (!patientId || (Array.isArray(patientId) && patientId.length === 0)) {
      return NextResponse.json({ success: false, error: "Patient ID is required" }, { status: 400 });
    }

    const patientIds = Array.isArray(patientId) ? patientId : [patientId];

    const batch = adminDb.batch();
    for (const id of patientIds) {
      const docRef = adminDb.collection("patients").doc(id);
      batch.update(docRef, {
        force_emergency: true,
        emergency_vital: vitalType || "random",
        emergency_severity: severity || "critical"
      });
    }
    
    await batch.commit();

    return NextResponse.json({ success: true, message: `Emergency triggered for ${patientIds.length} patient(s)` });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
