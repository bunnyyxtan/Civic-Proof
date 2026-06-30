// src/lib/firebase/firebaseAdmin.ts
// Lazy-initialized Firebase Admin SDK for server-side Firestore operations using modern modular API

import { getApps, initializeApp, cert, ServiceAccount } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

let isInitialized = false;

export function isFirestoreConfigured(): boolean {
  if (process.env.FIRESTORE_ENABLED !== "true" && process.env.FIRESTORE_ENABLED !== "TRUE") {
    return false;
  }

  // Check Option A: Separate credentials
  const hasOptionA = !!(
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  );

  // Check Option B: JSON payload
  const hasOptionB = !!process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  return hasOptionA || hasOptionB;
}

export function getFirebaseAdminApp() {
  if (!isFirestoreConfigured()) {
    return null;
  }
  // ensure initialization
  getFirestoreInstance();
  const { getApps, getApp } = require("firebase-admin/app");
  const apps = getApps();
  return apps.length > 0 ? getApp() : null;
}

export function getFirestoreInstance(): any | null {
  if (!isFirestoreConfigured()) {
    return null;
  }

  try {
    if (!isInitialized) {
      // Check if already initialized by another module/import
      const apps = getApps();
      if (apps.length > 0) {
        isInitialized = true;
      } else {
        let credential: ServiceAccount | undefined;

        // Option B: Service Account JSON
        if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
          try {
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
            credential = {
              projectId: serviceAccount.project_id,
              clientEmail: serviceAccount.client_email,
              privateKey: serviceAccount.private_key,
            };
          } catch (jsonErr) {
            console.error("Firebase Admin failed to parse service account JSON environment variable:", jsonErr);
          }
        }

        // Option A: Individual Variables (takes precedence if valid or serves as fallback)
        if (!credential && process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
          // Normalize private key newline characters
          let privateKey = process.env.FIREBASE_PRIVATE_KEY;
          if (privateKey.includes("\\n")) {
            privateKey = privateKey.replace(/\\n/g, "\n");
          }

          credential = {
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: privateKey,
          };
        }

        if (credential) {
          initializeApp({
            credential: cert(credential),
          });
          isInitialized = true;
        } else {
          console.warn("Firestore is enabled, but credentials could not be parsed successfully.");
          return null;
        }
      }
    }

    return getFirestore();
  } catch (err) {
    console.error("Failed to initialize Firebase Admin SDK or connect to Firestore:", err);
    return null;
  }
}
