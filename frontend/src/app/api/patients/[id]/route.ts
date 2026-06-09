import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminRtdb } from "@/lib/firebase-admin";

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const doc = await adminDb.collection("patients").doc(params.id).get();
    if (!doc.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ patientId: doc.id, ...doc.data() });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const body = await req.json();
    
    // If the patient is being re-admitted, wipe their old telemetry stream in RTDB
    // so they start with a clean slate and the charts don't break.
    if (body.status === 'active' && body.isSimulated === true) {
      await adminRtdb.ref(`vitals/${params.id}/stream`).remove();
      await adminRtdb.ref(`vitals/${params.id}/latest`).remove();
    }

    await adminDb.collection("patients").doc(params.id).update(body);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    // Delete patient entirely.
    await adminDb.collection("patients").doc(params.id).delete();
    // Clean up RTDB as well
    await adminRtdb.ref(`vitals/${params.id}`).remove();
    await adminRtdb.ref(`alerts/${params.id}`).remove();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
