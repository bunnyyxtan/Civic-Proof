// src/lib/demo/mockDb.ts
// In-memory persistent server-side store for cross-session sandbox tests

import { CivicIssue } from "../civic/types";

// In-memory storage cache - starts empty and NEVER auto-seeds
let casesDb: CivicIssue[] = [];

export function getCasesDb(): CivicIssue[] {
  return casesDb;
}

export function saveCasesDb(updated: CivicIssue[]): void {
  casesDb = updated;
}

export function addCaseDb(c: CivicIssue): void {
  casesDb.push(c);
}

export function resetCasesDb(): void {
  casesDb = [];
}

