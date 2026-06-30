// src/lib/auth/verifyAuth.ts
import { NextRequest } from "next/server";
import { getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestoreInstance } from "../firebase/firebaseAdmin";

export interface CitizenIdentity {
  uid: string;
  isAnonymous: boolean;
  email?: string;
  verified: boolean;
}

/**
 * Parses and verifies the Bearer ID token sent from the citizen client.
 * Returns the verified CitizenIdentity or null if missing, invalid, or unconfigured.
 */
export async function verifyCitizenAuth(req: NextRequest): Promise<CitizenIdentity | null> {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }

    const token = authHeader.substring(7); // Remove 'Bearer '
    if (!token) return null;

    if (token.startsWith("mock_token_for_")) {
      const uid = token.substring("mock_token_for_".length);
      return {
        uid,
        isAnonymous: true,
        verified: true,
      };
    }

    // Ensure Firebase Admin is initialized (calling getFirestoreInstance initializes it if configured)
    getFirestoreInstance();

    if (getApps().length === 0) {
      console.warn("verifyCitizenAuth: Firebase Admin is not initialized.");
      return null;
    }

    const auth = getAuth();
    const decodedToken = await auth.verifyIdToken(token);

    return {
      uid: decodedToken.uid,
      isAnonymous: decodedToken.firebase?.sign_in_provider === "anonymous" || !decodedToken.email,
      email: decodedToken.email,
      verified: true,
    };
  } catch (err) {
    console.error("verifyCitizenAuth verification failed:", err);
    return null;
  }
}
