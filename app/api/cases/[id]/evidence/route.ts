import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getFirebaseAdminApp } from "@/src/lib/firebase/firebaseAdmin";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const EvidenceSchema = z.object({
  imageUrl: z.string().url().optional(),
  caption: z.string().optional(),
  type: z.literal("photo")
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json();
    const parsed = EvidenceSchema.parse(body);

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

    const evidenceId = `EVD-${Date.now()}`;
    const newEvidence = {
      id: evidenceId,
      type: parsed.type,
      imageUrl: parsed.imageUrl,
      caption: parsed.caption,
      uploadedAt: new Date().toISOString(),
      uploadedByUid: uid
    };

    const timelineEvent = {
      id: `EV-EVD-${Date.now()}`,
      timestamp: new Date().toISOString(),
      title: "Evidence Added",
      description: `A citizen uploaded additional photo evidence to strengthen the case file.`,
      type: "evidence_added",
      actorName: "Citizen Reporter"
    };

    const corroboration = {
      id: `CORR-${Date.now()}`,
      filedAt: new Date().toISOString(),
      text: parsed.caption || "Verified same visual coordinates, still active.",
      type: "angle",
      contributorName: "Citizen Reporter",
      additionalPhotoUrl: parsed.imageUrl
    };

    // Calculate slightly boosted harm score because of new corroboration
    let harmScore = currentCase?.harmScore || 10;
    const corroborations = currentCase?.corroborations || [];
    // Just simple increment for demo
    harmScore = Math.min(100, harmScore + 5);

    await caseRef.update({
      evidence: FieldValue.arrayUnion(newEvidence),
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
    console.error("Error adding evidence:", error);
    return NextResponse.json(
      { ok: false, error: { code: "SERVER_ERROR", message: error.message } },
      { status: 500 }
    );
  }
}
