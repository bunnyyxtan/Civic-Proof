// src/lib/demo/runEngineSmoke.ts
// Programmatic smoke test suite running our core loops

import { runContractValidation } from "./demoContracts";
import { INTAKE_SCHOOL_DRAIN, INTAKE_SCHOOL_DRAIN_DUPLICATE, INTAKE_ROAD_CRATER } from "./civicDemoPayloads";
import { CivicProofAgent } from "../agent/civicAgent";
import { getCasesDb, resetCasesDb } from "./mockDb";

export async function runEngineSmokeTest(): Promise<{
  success: boolean;
  logs: string[];
}> {
  const logs: string[] = [];
  logs.push("=== CIVICPROOF ENGINE SMOKE TEST RUN ===");
  logs.push(`Timestamp: ${new Date().toISOString()}`);
  
  try {
    resetCasesDb();
    logs.push("Seeded in-memory mock cases database successfully.");

    // Step 1: Submit first case (Open Drain near school)
    logs.push("\n--- STEP 1: Submit Initial Citizen Report (Open Drain near school) ---");
    const existing = getCasesDb();
    const result1 = await CivicProofAgent.submitReport(INTAKE_SCHOOL_DRAIN, existing);
    
    if (result1.status === "new_case_created") {
      logs.push(`SUCCESS: Case CP-WATR opened for: "${result1.case.title}"`);
      logs.push(`- Normalized Category: ${result1.case.category}`);
      logs.push(`- Decided Severity: ${result1.case.severity.toUpperCase()}`);
      logs.push(`- Calculated Harm Score: ${result1.case.harmScore}/100`);
      logs.push(`- Assigned Department: ${result1.case.departmentRoute.departmentName}`);
      logs.push(`- SLA Period: ${result1.case.slaDays} Days`);
      logs.push(`- Initial Complaint Packet generated: ${result1.case.complaintPacket ? "YES" : "NO"}`);
      
      // Save it to database
      existing.push(result1.case);
    } else {
      logs.push("FAILED: Pipeline link returned incorrect duplicate status unexpectedly.");
    }

    // Step 2: Submit duplicate report (Verify duplicate links as corroboration)
    logs.push("\n--- STEP 2: Submit Second Neighbor Report (Duplicate link check) ---");
    const result2 = await CivicProofAgent.submitReport(INTAKE_SCHOOL_DRAIN_DUPLICATE, existing);
    
    if (result2.status === "duplicate_linked") {
      logs.push(`SUCCESS: Duplicate detected successfully! Similarity score met merge threshold.`);
      logs.push(`- Parent Case Linked: ${result2.parentCaseId}`);
      logs.push(`- Created Corroboration ID: ${result2.corroborationRecord.id}`);
      logs.push(`- Contributor Note logged: "${result2.corroborationRecord.citizenNote}"`);

      // Update parent case with corroboration
      const parent = existing.find(c => c.id === result2.parentCaseId);
      if (parent) {
        const updated = CivicProofAgent.corroborateCase(parent, result2.corroborationRecord);
        logs.push(`- Parent Case updated! New Harm Score boosted to ${updated.harmScore}/100 (due to neighborhood backing).`);
        
        // Save back
        const idx = existing.indexOf(parent);
        existing[idx] = updated;
      }
    } else {
      logs.push("FAILED: Failed to detect duplicate for nearly identical coordinate/note reports.");
    }

    // Step 3: Run Contract Validation assertions
    logs.push("\n--- STEP 3: Run Contract Validation Assertions ---");
    const validation = await runContractValidation();
    for (const assertion of validation.assertions) {
      logs.push(`[${assertion.passed ? "PASS" : "FAIL"}] ${assertion.name}: ${assertion.message}`);
    }

    logs.push(`\nSmoke Test Suite Execution: ${validation.success ? "SUCCESS" : "FAILED"}`);
    return { success: validation.success, logs, validation };

  } catch (err: any) {
    logs.push(`\nCRITICAL SMOKE EXCEPTION: ${err.message || err}`);
    return { success: false, logs };
  }
}
export default runEngineSmokeTest;
