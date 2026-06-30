import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getFirebaseAdminApp } from "@/src/lib/firebase/firebaseAdmin";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const ConfirmSchema = z.object({
  note: z.string().optional()
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json();
    const parsed = ConfirmSchema.parse(body);

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

    const confirmId = `ACT-${Date.now()}`;
    const newConfirmation = {
      id: confirmId,
      note: parsed.note || "Confirmed active today.",
      confirmedAt: new Date().toISOString(),
      confirmedByUid: uid
    };

    const timelineEvent = {
      id: `EV-ACT-${Date.now()}`,
      timestamp: new Date().toISOString(),
      title: "Active Status Confirmed",
      description: `A citizen verified that this issue is still present and unresolved as of today.`,
      type: "active_confirmation_added",
      actorName: "Citizen Reporter"
    };

    const corroboration = {
      id: `CORR-ACT-${Date.now()}`,
      filedAt: new Date().toISOString(),
      text: parsed.note || "Confirmed active today.",
      type: "timestamp",
      contributorName: "Citizen Reporter"
    };

    await caseRef.update({
      activeConfirmations: FieldValue.arrayUnion(newConfirmation),
      corroborations: FieldValue.arrayUnion(corroboration),
      timeline: FieldValue.arrayUnion(timelineEvent)
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
    console.error("Error adding active confirmation:", error);
    return NextResponse.json(
      { ok: false, error: { code: "SERVER_ERROR", message: error.message } },
      { status: 500 }
    );
  }
}
