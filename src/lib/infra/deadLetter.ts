// src/lib/infra/deadLetter.ts
import { getFirestoreInstance } from "../firebase/firebaseAdmin";

export interface DeadLetterRecord {
  route: string;
  operation: string;
  errorMessage: string;
  caseId?: string;
  payload?: any;
  retryable?: boolean;
}

/**
 * Persists failed API/engine actions to the civicproof_dead_letters collection for operations triage.
 * Redacts large media blobs to prevent firestore size issues.
 */
export async function logDeadLetter(record: DeadLetterRecord): Promise<boolean> {
  const db = getFirestoreInstance();
  const timestamp = new Date().toISOString();
  
  // Safely scrub any heavy media strings
  let cleanPayload = undefined;
  if (record.payload) {
    try {
      cleanPayload = JSON.parse(JSON.stringify(record.payload, (key, value) => {
        if (typeof value === "string" && (value.startsWith("data:") || value.length > 5000)) {
          return `[REDACTED_LARGE_DATA_OR_MEDIA: length ${value.length}]`;
        }
        return value;
      }));
    } catch (e) {
      cleanPayload = "[PAYLOAD_SERIALIZATION_FAILED]";
    }
  }

  const data = {
    route: record.route,
    operation: record.operation,
    errorMessage: record.errorMessage,
    caseId: record.caseId,
    payload: cleanPayload,
    retryable: record.retryable ?? false,
    timestamp,
  };

  if (db) {
    try {
      await db.collection("civicproof_dead_letters").add(data);
      return true;
    } catch (err) {
      console.warn("Failed to persist dead letter:", err);
    }
  }

  console.error(`[DEAD_LETTER_FALLBACK] Error in ${record.operation}:`, JSON.stringify(data));
  return false;
}
