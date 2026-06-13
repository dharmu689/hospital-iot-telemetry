import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limitCount = parseInt(url.searchParams.get('limit') || '10');
    const status = url.searchParams.get('status');
    const search = url.searchParams.get('search'); 

    let query: any = adminDb.collection("patients");
    
    if (status) {
      query = query.where("status", "==", status);
    }

    // Get total count for pagination math
    const countSnapshot = await query.count().get();
    let total = countSnapshot.data().count;

    // We fetch all matching status, then do search filtering in-memory 
    // because Firestore doesn't support substring matching natively.
    // If no search, we can use limit/offset directly on DB.
    let patients = [];
    
    if (search && search.trim() !== "") {
      const snapshot = await query.get();
      const allDocs = snapshot.docs.map(doc => ({ patientId: doc.id, ...doc.data() }));
      const searchLower = search.toLowerCase();
      
      const filtered = allDocs.filter(p => 
        (p.name && p.name.toLowerCase().includes(searchLower)) ||
        (p.patientId && p.patientId.toLowerCase().includes(searchLower)) ||
        (p.ward && p.ward.toLowerCase().includes(searchLower)) ||
        (p.assignedDoctor && p.assignedDoctor.toLowerCase().includes(searchLower))
      );
      
      total = filtered.length;
      const startIndex = (page - 1) * limitCount;
      patients = filtered.slice(startIndex, startIndex + limitCount);
      
    } else {
      // Pure Database pagination (only grabs what is needed from DB)
      const offsetCount = (page - 1) * limitCount;
      query = query.offset(offsetCount).limit(limitCount);
      const snapshot = await query.get();
      patients = snapshot.docs.map(doc => ({ patientId: doc.id, ...doc.data() }));
    }

    return NextResponse.json(
      {
        data: patients,
        meta: {
          total,
          page,
          limit: limitCount,
          totalPages: Math.ceil(total / limitCount),
        },
      },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { patientId, ...data } = body;
    await adminDb.collection("patients").doc(patientId).set({
      ...data,
      patientId: patientId, 
      status: 'active',
      isSimulated: true, 
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
