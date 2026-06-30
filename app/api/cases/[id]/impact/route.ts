import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getFirebaseAdminApp } from "@/src/lib/firebase/firebaseAdmin";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const ImpactSchema = z.object({
  note: z.string(),
  chips: z.array(z.string()).optional().default([])
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json();
    const parsed = ImpactSchema.parse(body);

    const app = getFirebaseAdminApp();
    const db = getFirestore(app);
    const caseRef = db.collection("civic_cases").doc(id);

    const caseDoc = await caseRef.get();
    if (!caseDoc.exists) {
      return NextResponse.json(
        { ok: false, error: { code: "NOT_FOUND", message: "Case not found" } },
        { status: 404 }
      );
    }

    const currentCase = caseDoc.data();
    
    // Auth - extracting Uid from authorization header if available
    const authHeader = req.headers.get("Authorization");
    let uid = "anonymous";
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const idToken = authHeader.split("Bearer ")[1];
        const { getAuth } = await import("firebase-admin/auth");
        const decoded = await getAuth(app).verifyIdToken(idToken);
        uid = decoded.uid;
      } catch (e) {
        console.warn("Auth token invalid", e);
      }
    }

    const impactId = `IMP-${Date.now()}`;
    const newImpact = {
      id: impactId,
      note: parsed.note,
      chips: parsed.chips,
      createdAt: new Date().toISOString(),
      createdByUid: uid
    };

    const timelineEvent = {
      id: `EV-IMP-${Date.now()}`,
      timestamp: new Date().toISOString(),
      title: "Impact Note Added",
      description: `A citizen logged how this case is impacting the community: "${parsed.note.substring(0, 50)}${parsed.note.length > 50 ? '...' : ''}"`,
      type: "impact_note_added",
      actorName: "Citizen Reporter"
    };

    const corroboration = {
      id: `CORR-IMP-${Date.now()}`,
      filedAt: new Date().toISOString(),
      text: parsed.note,
      type: "impact",
      contributorName: "Citizen Reporter"
    };

    let harmScore = currentCase?.harmScore || 10;
    harmScore = Math.min(100, harmScore + 8); // boost for impact

    await caseRef.update({
      impactSignals: FieldValue.arrayUnion(newImpact),
      corroborations: FieldValue.arrayUnion(corroboration),
      timeline: FieldValue.arrayUnion(timelineEvent),
      harmScore
    });

    const updatedDoc = await caseRef.get();
    
    return NextResponse.json({
      ok: true,
      data: {
        case: updatedDoc.data(),
        event: timelineEvent
      }
    });
  } catch (error: any) {
    console.error("Error adding impact note:", error);
    return NextResponse.json(
      { ok: false, error: { code: "SERVER_ERROR", message: error.message } },
      { status: 500 }
    );
  }
}
