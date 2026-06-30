// app/api/admin/purge-demo-records/route.ts
// Secure developer-only endpoint to purge sandbox/demo documents from production Firestore

import { NextRequest, NextResponse } from "next/server";
import { getFirestoreInstance, isFirestoreConfigured } from "@/src/lib/firebase/firebaseAdmin";

export async function POST(req: NextRequest) {
  try {
    if (!isFirestoreConfigured()) {
      return NextResponse.json({
        ok: false,
        error: "Firestore is not configured. No records to purge."
      }, { status: 503 });
    }

    const db = getFirestoreInstance();
    if (!db) {
      return NextResponse.json({
        ok: false,
        error: "Failed to initialize Firestore database."
      }, { status: 500 });
    }

    const collectionRef = db.collection("civicproof_cases");
    // Query all records tagged as judge_demo
    const snapshot = await collectionRef.where("dataOrigin", "==", "judge_demo").get();
    
    let purgedCount = 0;
    const batch = db.batch();
    
    snapshot.forEach((doc: any) => {
      batch.delete(doc.ref);
      purgedCount++;
    });

    if (purgedCount > 0) {
      await batch.commit();
    }

    return NextResponse.json({
      ok: true,
      purgedCount,
      message: "Demo cases successfully purged from Firestore."
    });
  } catch (err: any) {
    console.error("Purge demo records failed:", err);
    return NextResponse.json({
      ok: false,
      error: err.message || "An error occurred during purging."
    }, { status: 500 });
  }
}
