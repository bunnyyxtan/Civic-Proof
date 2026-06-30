// app/api/ops/readiness/route.ts
import { NextResponse } from "next/server";
import { getFirestoreInstance, isFirestoreConfigured } from "@/src/lib/firebase/firebaseAdmin";
import fs from "fs";
import path from "path";

export async function GET() {
  const diagnostics: Record<string, string> = {
    firestore: "not_configured",
    gemini: "not_configured",
    auth: "not_configured",
    rateLimiter: "memory",
    events: "console",
    storage: "unavailable",
  };

  let overallOk = true;

  // 1. Check Firestore Live Connectivity
  if (isFirestoreConfigured()) {
    try {
      const db = getFirestoreInstance();
      if (db) {
        // Run a simple get limit 1 to prove end-to-end database connectivity
        await db.collection("civicproof_cases").limit(1).get();
        diagnostics.firestore = "ok";
        diagnostics.rateLimiter = "firestore";
        diagnostics.events = "firestore_events_collection";
      } else {
        diagnostics.firestore = "degraded";
        overallOk = false;
      }
    } catch (err) {
      console.error("Readiness check: Firestore failed:", err);
      diagnostics.firestore = "degraded";
      overallOk = false;
    }
  } else {
    overallOk = false; // Firestore config missing or disabled
  }

  // 2. Check Gemini Key
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY") {
    diagnostics.gemini = "configured";
  } else {
    diagnostics.gemini = "not_configured";
    overallOk = false;
  }

  // 3. Check Auth Setup Configuration
  if (process.env.NEXT_PUBLIC_FIREBASE_API_KEY && process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
    diagnostics.auth = "configured";
  } else {
    diagnostics.auth = "not_configured";
  }

  // 4. Check Storage directories
  try {
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    diagnostics.storage = "local_uploads_ready";
  } catch (err) {
    diagnostics.storage = "read_only_fallback";
  }

  return NextResponse.json({
    ok: overallOk,
    data: {
      ...diagnostics,
      timestamp: new Date().toISOString(),
    },
  });
}
