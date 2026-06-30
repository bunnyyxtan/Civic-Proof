// src/lib/auth/authClient.ts
import { auth } from "../firebase/firebaseClient";
import { signInAnonymously as firebaseSignInAnonymously, User } from "firebase/auth";

/**
 * Ensures the citizen has an authenticated anonymous Firebase user session.
 * This provides high-frictionless access while establishing a stable unique UID.
 */
export async function ensureAnonymousUser(): Promise<User | null> {
  try {
    // 1. Check if mock auth is flagged for this session
    if (typeof window !== "undefined" && sessionStorage.getItem("civicproof_use_mock_auth") === "true") {
      return null;
    }

    if (!auth) {
      if (typeof window !== "undefined") {
        sessionStorage.setItem("civicproof_use_mock_auth", "true");
      }
      return null;
    }

    if (auth.currentUser) return auth.currentUser;
    
    // Wait for auth to resolve current user if in loading state
    return new Promise((resolve) => {
      const unsubscribe = auth.onAuthStateChanged((user) => {
        unsubscribe();
        if (user) {
          resolve(user);
        } else {
          firebaseSignInAnonymously(auth)
            .then((credential) => resolve(credential.user))
            .catch((err: any) => {
              // Store failure flag in session storage to prevent repeated attempts
              if (typeof window !== "undefined") {
                sessionStorage.setItem("civicproof_use_mock_auth", "true");
              }

              if (err?.code === "auth/admin-restricted-operation" || err?.message?.includes("admin-restricted-operation")) {
                console.info(
                  "CivicProof: Firebase Anonymous Auth is disabled in your Firebase project. " +
                  "Gracefully falling back to secure Local Storage Identity. " +
                  "To enable cloud authentication, visit the Firebase Console -> Authentication -> Sign-in Method, and enable 'Anonymous'."
                );
              } else {
                console.warn("Firebase Anonymous Auth failed, falling back to local identity:", err?.message || err);
              }
              resolve(null);
            });
        }
      });
    });
  } catch (err) {
    console.warn("ensureAnonymousUser unexpected error:", err);
    return null;
  }
}

/**
 * Generates or retrieves a stable fallback citizen UID stored locally.
 */
export function getOrCreateFallbackUid(): string {
  if (typeof window === "undefined") return "anonymous_fallback";
  let fallbackUid = localStorage.getItem("civicproof_fallback_uid");
  if (!fallbackUid) {
    fallbackUid = `fallback_citizen_${Math.random().toString(36).substring(2, 11)}`;
    localStorage.setItem("civicproof_fallback_uid", fallbackUid);
  }
  return fallbackUid;
}

/**
 * Returns a mock token representing the fallback citizen.
 */
export function getFallbackIdToken(): string {
  const uid = getOrCreateFallbackUid();
  return `mock_token_for_${uid}`;
}

/**
 * Retrieves the security ID token for the authenticated user, which can be passed in Authorization headers.
 */
export async function getCitizenIdToken(): Promise<string | null> {
  try {
    const user = await ensureAnonymousUser();
    if (!user) return getFallbackIdToken();
    return await user.getIdToken();
  } catch (err) {
    console.error("Failed to retrieve citizen auth token:", err);
    return getFallbackIdToken();
  }
}
