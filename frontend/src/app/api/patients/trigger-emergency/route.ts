import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
  try {
    const { patientId, vitalType, severity } = await req.json();

    if (!patientId) {
      return NextResponse.json({ success: false, error: "Patient ID is required" }, { status: 400 });
    }

    // Set a flag in Firestore that the Python simulator will read
    await adminDb.collection("patients").doc(patientId).update({
      force_emergency: true,
      emergency_vital: vitalType || "random",
      emergency_severity: severity || "critical"
    });

    return NextResponse.json({ success: true, message: "Emergency triggered for ${patientId}" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
