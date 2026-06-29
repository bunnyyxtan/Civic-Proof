// app/api/demo/persistence-health/route.ts
// Live diagnostics and health check endpoint for CivicProof Persistence Layer

import { NextRequest, NextResponse } from "next/server";
import { isFirestoreConfigured } from "@/src/lib/firebase/firebaseAdmin";
import { getCaseRepository, getPersistenceMetadata } from "@/src/lib/repositories/repositoryFactory";

export async function GET(req: NextRequest) {
  const configured = isFirestoreConfigured();
  const meta = getPersistenceMetadata();
  const repository = getCaseRepository();

  let connectionStatus = "idle";
  let activeCollectionSize = 0;
  let testError: string | null = null;

  if (configured && meta.persistence === "firestore") {
    try {
      // Perform a small quick query to test active read capability
      const list = await repository.listCases();
      activeCollectionSize = list.length;
      connectionStatus = "success";
    } catch (err: any) {
      connectionStatus = "failed";
      testError = err.message || String(err);
    }
  } else {
    try {
      const list = await repository.listCases();
      activeCollectionSize = list.length;
      connectionStatus = "mock_active";
    } catch (err: any) {
      connectionStatus = "mock_failed";
      testError = err.message || String(err);
    }
  }

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    diagnostics: {
      firestoreConfigured: configured,
      activePersistenceMode: meta.persistence,
      connectionTestStatus: connectionStatus,
      recordCount: activeCollectionSize,
      ...(testError ? { testError } : {}),
      env: {
        FIRESTORE_ENABLED: process.env.FIRESTORE_ENABLED,
        FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID ? "PRESENT" : "MISSING",
        FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL ? "PRESENT" : "MISSING",
        FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY ? "PRESENT" : "MISSING",
        FIREBASE_SERVICE_ACCOUNT_JSON: process.env.FIREBASE_SERVICE_ACCOUNT_JSON ? "PRESENT" : "MISSING",
      }
    }
  });
}
