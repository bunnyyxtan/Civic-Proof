// src/lib/repositories/mockCaseRepository.ts
// In-Memory mock storage implementation of CaseRepository

import { CaseRepository } from "./caseRepository";
import { CivicIssue, CorroborationRecord, TimelineEvent } from "../civic/types";
import { getCasesDb, saveCasesDb, addCaseDb } from "../demo/mockDb";
import { calculateHarmScore } from "../civic/scoring";

export class MockCaseRepository implements CaseRepository {
  async listCases(): Promise<CivicIssue[]> {
    return getCasesDb();
  }

  async getCaseById(id: string): Promise<CivicIssue | null> {
    const db = getCasesDb();
    const found = db.find((c) => c.id === id);
    return found || null;
  }

  async createCase(issue: CivicIssue): Promise<CivicIssue> {
    addCaseDb(issue);
    return issue;
  }

  async updateCase(id: string, patch: Partial<CivicIssue>): Promise<CivicIssue> {
    const db = getCasesDb();
    const idx = db.findIndex((c) => c.id === id);
    if (idx === -1) {
      throw new Error(`Case with ID ${id} not found in Mock repository.`);
    }

    const updated = {
      ...db[idx],
      ...patch,
    };
    db[idx] = updated;
    saveCasesDb(db);
    return updated;
  }

  async addCorroboration(caseId: string, corroboration: CorroborationRecord): Promise<CivicIssue> {
    const db = getCasesDb();
    const idx = db.findIndex((c) => c.id === caseId);
    if (idx === -1) {
      throw new Error(`Case with ID ${caseId} not found in Mock repository.`);
    }

    const issue = db[idx];
    const corroborations = [...issue.corroborations];
    
    // Check if already corroborated to avoid duplicate spam in mock
    const alreadyExists = corroborations.some(c => c.contributorName === corroboration.contributorName);
    if (!alreadyExists) {
      corroborations.push(corroboration);
    }

    // Recalculate Harm Score deterministically due to neighbor signatures
    const scoreResult = calculateHarmScore({
      category: issue.category,
      severity: issue.severity,
      riskFactors: issue.riskFactors,
      citizenNote: issue.evidence.description,
      corroborationCount: corroborations.length,
      daysSilent: 0,
      isOverdue: issue.status === "overdue",
    });

    const updated: CivicIssue = {
      ...issue,
      corroborations,
      harmScore: scoreResult.score,
    };

    db[idx] = updated;
    saveCasesDb(db);
    return updated;
  }

  async appendTimelineEvent(caseId: string, event: TimelineEvent): Promise<CivicIssue> {
    const db = getCasesDb();
    const idx = db.findIndex((c) => c.id === caseId);
    if (idx === -1) {
      throw new Error(`Case with ID ${caseId} not found in Mock repository.`);
    }

    const issue = db[idx];
    const timeline = [...issue.timeline, event];

    const updated: CivicIssue = {
      ...issue,
      timeline,
    };

    db[idx] = updated;
    saveCasesDb(db);
    return updated;
  }
}
