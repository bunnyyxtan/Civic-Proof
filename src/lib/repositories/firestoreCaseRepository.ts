// src/lib/repositories/firestoreCaseRepository.ts
// Server-side Firestore implementation of CaseRepository

import { CaseRepository } from "./caseRepository";
import { CivicIssue, CorroborationRecord, TimelineEvent } from "../civic/types";
import { getFirestoreInstance } from "../firebase/firebaseAdmin";
import { caseToFirestore, firestoreToCase } from "./firestoreSerialization";
import { calculateHarmScore } from "../civic/scoring";

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

const COLLECTION_NAME = "civicproof_cases";

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
      isAnonymous: null,
      tenantId: null,
      providerInfo: [],
    },
    operationType,
    path,
  };
  console.error("Firestore Server Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export class FirestoreCaseRepository implements CaseRepository {
  private getDb() {
    const db = getFirestoreInstance();
    if (!db) {
      throw new Error("Firestore database instance is not initialized or configured.");
    }
    return db;
  }

  async listCases(): Promise<CivicIssue[]> {
    const path = COLLECTION_NAME;
    try {
      const db = this.getDb();
      // Sort by reportedAt descending to show latest reports first
      const snapshot = await db.collection(path).orderBy("reportedAt", "desc").get();
      const cases: CivicIssue[] = [];

      snapshot.forEach((doc: any) => {
        const item = firestoreToCase(doc.id, doc.data());
        if (item) {
          cases.push(item);
        }
      });

      return cases;
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, path);
    }
  }

  async getCaseById(id: string): Promise<CivicIssue | null> {
    const path = `${COLLECTION_NAME}/${id}`;
    try {
      const db = this.getDb();
      const doc = await db.collection(COLLECTION_NAME).doc(id).get();
      if (!doc.exists) {
        return null;
      }
      return firestoreToCase(doc.id, doc.data() || {});
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, path);
    }
  }

  async createCase(issue: CivicIssue): Promise<CivicIssue> {
    const path = `${COLLECTION_NAME}/${issue.id}`;
    try {
      const db = this.getDb();
      const serialized = caseToFirestore(issue);
      await db.collection(COLLECTION_NAME).doc(issue.id).set(serialized);
      return issue;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  }

  async updateCase(id: string, patch: Partial<CivicIssue>): Promise<CivicIssue> {
    const path = `${COLLECTION_NAME}/${id}`;
    try {
      const db = this.getDb();
      const docRef = db.collection(COLLECTION_NAME).doc(id);
      
      const serializedPatch = caseToFirestore(patch as CivicIssue);
      await docRef.update(serializedPatch);

      // Fetch the updated document
      const updatedDoc = await docRef.get();
      const updatedCase = firestoreToCase(id, updatedDoc.data() || {});
      if (!updatedCase) {
        throw new Error(`Failed to deserialize updated case ${id}`);
      }
      return updatedCase;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  }

  async addCorroboration(caseId: string, corroboration: CorroborationRecord): Promise<CivicIssue> {
    const path = `${COLLECTION_NAME}/${caseId}/corroborations`;
    try {
      const db = this.getDb();
      const docRef = db.collection(COLLECTION_NAME).doc(caseId);

      let updatedCase: CivicIssue | null = null;

      await db.runTransaction(async (transaction: any) => {
        const doc = await transaction.get(docRef);
        if (!doc.exists) {
          throw new Error(`Case with ID ${caseId} does not exist.`);
        }

        const data = doc.data() || {};
        const issue = firestoreToCase(caseId, data);
        if (!issue) {
          throw new Error(`Case document ${caseId} is malformed or invalid.`);
        }

        const corroborations = issue.corroborations ? [...issue.corroborations] : [];
        const alreadyExists = corroborations.some(c => c.contributorName === corroboration.contributorName);
        if (!alreadyExists) {
          corroborations.push(corroboration);
        }

        // Deterministically calculate new Harm Score
        const scoreResult = calculateHarmScore({
          category: issue.category,
          severity: issue.severity,
          riskFactors: issue.riskFactors,
          citizenNote: issue.evidence.description,
          corroborationCount: corroborations.length,
          daysSilent: 0,
          isOverdue: issue.status === "overdue",
        });

        const patch: Partial<CivicIssue> = {
          corroborations,
          harmScore: scoreResult.score,
        };

        const serializedPatch = caseToFirestore(patch as CivicIssue);
        transaction.update(docRef, serializedPatch);

        updatedCase = {
          ...issue,
          corroborations,
          harmScore: scoreResult.score,
        };
      });

      if (!updatedCase) {
        throw new Error("Transaction completed but case state was not updated.");
      }

      return updatedCase;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  }

  async appendTimelineEvent(caseId: string, event: TimelineEvent): Promise<CivicIssue> {
    const path = `${COLLECTION_NAME}/${caseId}/timeline`;
    try {
      const db = this.getDb();
      const docRef = db.collection(COLLECTION_NAME).doc(caseId);

      let updatedCase: CivicIssue | null = null;

      await db.runTransaction(async (transaction: any) => {
        const doc = await transaction.get(docRef);
        if (!doc.exists) {
          throw new Error(`Case with ID ${caseId} does not exist.`);
        }

        const data = doc.data() || {};
        const issue = firestoreToCase(caseId, data);
        if (!issue) {
          throw new Error(`Case document ${caseId} is malformed or invalid.`);
        }

        const timeline = issue.timeline ? [...issue.timeline, event] : [event];

        const patch: Partial<CivicIssue> = {
          timeline,
        };

        const serializedPatch = caseToFirestore(patch as CivicIssue);
        transaction.update(docRef, serializedPatch);

        updatedCase = {
          ...issue,
          timeline,
        };
      });

      if (!updatedCase) {
        throw new Error("Transaction completed but timeline event was not saved.");
      }

      return updatedCase;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  }
}
