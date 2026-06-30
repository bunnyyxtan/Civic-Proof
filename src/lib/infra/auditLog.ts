// src/lib/infra/auditLog.ts
import { getFirestoreInstance } from "../firebase/firebaseAdmin";

export interface AuditEvent {
  eventType: string;
  caseId?: string;
  citizenUid?: string;
  route?: string;
  provider?: string;
  severity: "info" | "warning" | "error";
  metadata?: Record<string, any>;
}

/**
 * Logs an event to the civicproof_events collection in Firestore, or console as fallback.
 */
export async function logAuditEvent(event: AuditEvent): Promise<boolean> {
  const db = getFirestoreInstance();
  const timestamp = new Date().toISOString();
  
  const record = {
    ...event,
    timestamp,
  };

  if (db) {
    try {
      await db.collection("civicproof_events").add(record);
      return true;
    } catch (err) {
      console.warn("Failed to write audit log to Firestore, logging to console:", err);
    }
  }

  // Fallback to standard console out
  console.log(`[AUDIT] [${event.severity.toUpperCase()}] ${event.eventType}:`, JSON.stringify(record));
  return false;
}
