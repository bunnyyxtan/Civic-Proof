// app/api/report/route.ts
// API route to submit citizen report, run duplicate pipeline, and save to repository

import { NextRequest, NextResponse } from "next/server";
import { ReportIntakeSchema } from "@/src/lib/ai/schemas";
import { getCaseRepository, getPersistenceMetadata } from "@/src/lib/repositories/repositoryFactory";
import { CivicProofAgent } from "@/src/lib/agent/civicAgent";
import { processCorroboration } from "@/src/lib/agent/actions";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { report } = body;

    if (!report) {
      return NextResponse.json({ success: false, error: "Missing 'report' field in request body." }, { status: 400 });
    }

    // Set default reportedAt if missing
    if (!report.reportedAt) {
      report.reportedAt = new Date().toISOString();
    }

    // Validate intake schema
    const validation = ReportIntakeSchema.safeParse(report);
    if (!validation.success) {
      return NextResponse.json({
        success: false,
        error: "Invalid report intake schema.",
        details: validation.error.issues,
      }, { status: 400 });
    }

    const intake = validation.data;
    const repository = getCaseRepository();

    // Fetch existing cases for duplicate checks
    const existingCases = await repository.listCases();

    // Run report pipeline
    const pipelineResult = await CivicProofAgent.submitReport(intake, existingCases);

    let finalCase;

    if (pipelineResult.status === "duplicate_linked") {
      const parentId = pipelineResult.parentCaseId;
      const parentCase = await repository.getCaseById(parentId);
      
      if (!parentCase) {
        throw new Error(`Pipeline recommended merge with parent ID ${parentId}, but parent case was not found in database.`);
      }

      // Merge corroboration into parent case using deterministic engine rules
      const updatedCase = processCorroboration(parentCase, pipelineResult.corroborationRecord);
      
      // Update the parent document in the repository
      finalCase = await repository.updateCase(parentId, updatedCase);
    } else {
      // Create new case file
      const newCaseWithOrigin = { ...pipelineResult.case, dataOrigin: "user_report" as const };
      finalCase = await repository.createCase(newCaseWithOrigin);
    }

    return NextResponse.json({
      success: true,
      case: finalCase,
      pipeline: pipelineResult,
      meta: getPersistenceMetadata(),
    });
  } catch (err: any) {
    console.error("POST /api/report failed:", err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Failed to submit report.",
        meta: getPersistenceMetadata(),
      },
      { status: 500 }
    );
  }
}
