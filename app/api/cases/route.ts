// app/api/cases/route.ts
// API endpoint to fetch and persist civic cases in the active repository

import { NextRequest, NextResponse } from "next/server";
import { getCaseRepository, getPersistenceMetadata } from "@/src/lib/repositories/repositoryFactory";
import { mapCaseToIssue } from "@/src/lib/store";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const includeDemo = searchParams.get("includeDemo") === "true";

    const repository = getCaseRepository();
    const allCases = await repository.listCases();

    // Filter out judge_demo records unless includeDemo is explicitly requested
    const filteredCases = includeDemo 
      ? allCases 
      : allCases.filter(c => c.dataOrigin !== "judge_demo");

    return NextResponse.json({
      success: true,
      cases: filteredCases,
      meta: getPersistenceMetadata(),
    });
  } catch (err: any) {
    console.error("GET /api/cases failed:", err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Failed to fetch cases.",
        meta: getPersistenceMetadata(),
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { case: civicCase } = body;

    if (!civicCase) {
      return NextResponse.json({ success: false, error: "Missing 'case' field." }, { status: 400 });
    }

    const repository = getCaseRepository();
    // Translate the client-side UI object structure into the strictly-typed domain issue model
    const issue = mapCaseToIssue(civicCase);

    let savedIssue;
    const existing = await repository.getCaseById(issue.id);
    if (existing) {
      savedIssue = await repository.updateCase(issue.id, issue);
    } else {
      savedIssue = await repository.createCase(issue);
    }

    return NextResponse.json({
      success: true,
      case: savedIssue,
      meta: getPersistenceMetadata(),
    });
  } catch (err: any) {
    console.error("POST /api/cases sync failed:", err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Failed to synchronize case state.",
        meta: getPersistenceMetadata(),
      },
      { status: 500 }
    );
  }
}
