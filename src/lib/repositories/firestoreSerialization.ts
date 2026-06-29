// src/lib/repositories/firestoreSerialization.ts
// Handles safe serialization and deserialization of CivicIssues for Firestore

import { CivicIssue } from "../civic/types";
import { CivicIssueSchema } from "../ai/schemas";

/**
 * Recursively cleans an object by removing any fields that have `undefined` values.
 * Firestore throws errors when encountering `undefined` during writes.
 */
export function cleanForFirestore(value: any): any {
  if (value === null || value === undefined) {
    return null; // Convert undefined to null or omit
  }

  if (Array.isArray(value)) {
    return value.map((item) => cleanForFirestore(item));
  }

  if (typeof value === "object") {
    const cleaned: Record<string, any> = {};
    for (const key of Object.keys(value)) {
      const val = value[key];
      if (val !== undefined) {
        cleaned[key] = cleanForFirestore(val);
      }
    }
    return cleaned;
  }

  return value;
}

/**
 * Prepares a CivicIssue domain object for safe writing to Firestore.
 */
export function caseToFirestore(issue: CivicIssue): Record<string, any> {
  const cleaned = cleanForFirestore(issue);
  return cleaned;
}

/**
 * Deserializes a Firestore document into a valid CivicIssue, running schema validation.
 * Returns null or falls back gracefully if the document is malformed.
 */
export function firestoreToCase(id: string, data: Record<string, any>): CivicIssue | null {
  try {
    const raw = {
      ...data,
      id: data.id || id,
    };

    // Parse and validate using our strict Zod schema
    const result = CivicIssueSchema.safeParse(raw);
    if (result.success) {
      return result.data as CivicIssue;
    } else {
      console.warn(`Validation failed for document ${id}:`, result.error.issues);
      
      // Fallback gracefully: try to construct whatever we can, or return partial issue if safe.
      // But we must meet CivicIssue interface. Let's coerce or return the raw casted object 
      // if it has the critical elements, or log/skip.
      // Returning null skips malformed records to preserve system integrity.
      return null;
    }
  } catch (err) {
    console.error(`Exception deserializing Firestore document ${id}:`, err);
    return null;
  }
}
