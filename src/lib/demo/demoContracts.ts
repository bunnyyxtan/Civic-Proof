// src/lib/demo/demoContracts.ts
// Official test assertions and contracts for CivicProof Hackathon Validation

import { INTAKE_SCHOOL_DRAIN } from "./civicDemoPayloads";
import { runReportPipeline } from "../agent/pipeline";

export async function runContractValidation(): Promise<{
  success: boolean;
  assertions: { name: string; passed: boolean; message: string }[];
}> {
  const assertions: { name: string; passed: boolean; message: string }[] = [];
  
  try {
    // Contract Check 1: Open Drain near School
    const result = await runReportPipeline(INTAKE_SCHOOL_DRAIN, []);
    
    if (result.status === "new_case_created") {
      const isCritical = result.case.severity === "critical";
      assertions.push({
        name: "Critical severity contract check",
        passed: isCritical,
        message: isCritical 
          ? "PASSED: Open drain next to school is classified as CRITICAL severity."
          : "FAILED: Open drain next to school failed to classify as CRITICAL severity."
      });

      const isHighHarmScore = result.case.harmScore >= 75;
      assertions.push({
        name: "Harm Score contract threshold (>= 75)",
        passed: isHighHarmScore,
        message: isHighHarmScore
          ? `PASSED: Open drain next to school calculated Harm Score as ${result.case.harmScore} (>= 75).`
          : `FAILED: Open drain next to school calculated Harm Score as ${result.case.harmScore} (< 75).`
      });

      const hasCorrectRoute = result.case.departmentRoute.departmentId === "BWSSB_WATER_SUPPLY";
      assertions.push({
        name: "Department routing contract mapping",
        passed: hasCorrectRoute,
        message: hasCorrectRoute
          ? `PASSED: Correctly routed to Bangalore Water Supply and Sewerage Board (BWSSB).`
          : `FAILED: Mapped to incorrect department ID: ${result.case.departmentRoute.departmentId}`
      });

      const hasVulnerableKeywords = result.case.riskFactors.includes("school children nearby");
      assertions.push({
        name: "School proximity risk factor contract extraction",
        passed: hasVulnerableKeywords,
        message: hasVulnerableKeywords
          ? "PASSED: Risk factor 'school children nearby' successfully extracted."
          : "FAILED: Failed to extract school proximity risk factor."
      });
    } else {
      assertions.push({
        name: "New case creation pipeline",
        passed: false,
        message: "FAILED: Pipeline returned incorrect status: " + result.status,
      });
    }
  } catch (err: any) {
    assertions.push({
      name: "Pipeline run success contract",
      passed: false,
      message: `FAILED: Exception thrown during validation run: ${err.message || err}`,
    });
  }

  const success = assertions.every(a => a.passed);
  return { success, assertions };
}
