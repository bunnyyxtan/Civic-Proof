// src/lib/repositories/repositoryFactory.ts
// Factory for retrieving and fallback-orchestrating CaseRepositories

import { CaseRepository } from "./caseRepository";
import { MockCaseRepository } from "./mockCaseRepository";
import { FirestoreCaseRepository } from "./firestoreCaseRepository";
import { isFirestoreConfigured } from "../firebase/firebaseAdmin";
import { CivicIssue, CorroborationRecord, TimelineEvent } from "../civic/types";

export type PersistenceMode = "firestore" | "mock" | "firestore_fallback";

interface PersistenceState {
  mode: PersistenceMode;
  error?: string;
}

const state: PersistenceState = {
  mode: isFirestoreConfigured() ? "firestore" : "mock",
};

/**
 * Global function to check active persistence metadata.
 */
export function getPersistenceMetadata() {
  return {
    persistence: state.mode,
    ...(state.error ? { error: state.error } : {}),
  };
}

/**
 * Runtime Fallback proxy wrapper that intercepts Firestore failures
 * and redirects transactions to the local memory/mock repository instantly.
 */
class RuntimeFallbackCaseRepository implements CaseRepository {
  private firestoreRepo: FirestoreCaseRepository;
  private mockRepo: MockCaseRepository;

  constructor() {
    this.firestoreRepo = new FirestoreCaseRepository();
    this.mockRepo = new MockCaseRepository();
  }

  private shouldTryFirestore(): boolean {
    return state.mode === "firestore";
  }

  private handleFallback(err: any, operationName: string) {
    console.error(`CRITICAL: Firestore persistence failure during "${operationName}". Falling back to in-memory mock repository.`, err);
    state.mode = "firestore_fallback";
    state.error = err instanceof Error ? err.message : String(err);
  }

  async listCases(): Promise<CivicIssue[]> {
    if (this.shouldTryFirestore()) {
      try {
        return await this.firestoreRepo.listCases();
      } catch (err) {
        this.handleFallback(err, "listCases");
      }
    }
    return this.mockRepo.listCases();
  }

  async getCaseById(id: string): Promise<CivicIssue | null> {
    if (this.shouldTryFirestore()) {
      try {
        return await this.firestoreRepo.getCaseById(id);
      } catch (err) {
        this.handleFallback(err, `getCaseById(${id})`);
      }
    }
    return this.mockRepo.getCaseById(id);
  }

  async createCase(issue: CivicIssue): Promise<CivicIssue> {
    if (this.shouldTryFirestore()) {
      try {
        return await this.firestoreRepo.createCase(issue);
      } catch (err) {
        this.handleFallback(err, `createCase(${issue.id})`);
      }
    }
    return this.mockRepo.createCase(issue);
  }

  async updateCase(id: string, patch: Partial<CivicIssue>): Promise<CivicIssue> {
    if (this.shouldTryFirestore()) {
      try {
        return await this.firestoreRepo.updateCase(id, patch);
      } catch (err) {
        this.handleFallback(err, `updateCase(${id})`);
      }
    }
    return this.mockRepo.updateCase(id, patch);
  }

  async addCorroboration(caseId: string, corroboration: CorroborationRecord): Promise<CivicIssue> {
    if (this.shouldTryFirestore()) {
      try {
        return await this.firestoreRepo.addCorroboration(caseId, corroboration);
      } catch (err) {
        this.handleFallback(err, `addCorroboration(${caseId})`);
      }
    }
    return this.mockRepo.addCorroboration(caseId, corroboration);
  }

  async appendTimelineEvent(caseId: string, event: TimelineEvent): Promise<CivicIssue> {
    if (this.shouldTryFirestore()) {
      try {
        return await this.firestoreRepo.appendTimelineEvent(caseId, event);
      } catch (err) {
        this.handleFallback(err, `appendTimelineEvent(${caseId})`);
      }
    }
    return this.mockRepo.appendTimelineEvent(caseId, event);
  }
}

// Singleton repository instance that handles fallback transparently
let activeRepositoryInstance: CaseRepository | null = null;

export function getCaseRepository(): CaseRepository {
  if (!activeRepositoryInstance) {
    activeRepositoryInstance = new RuntimeFallbackCaseRepository();
  }
  return activeRepositoryInstance;
}

/**
 * Manual state reset primarily used to clear fallback conditions during testing
 */
export function resetRepositoryConfiguration() {
  state.mode = isFirestoreConfigured() ? "firestore" : "mock";
  state.error = undefined;
  activeRepositoryInstance = null;
}
