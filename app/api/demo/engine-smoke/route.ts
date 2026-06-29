// app/api/demo/engine-smoke/route.ts
// Sandbox test endpoint running programmatic smoke test suite

import { NextRequest, NextResponse } from "next/server";
import { runEngineSmokeTest } from "@/src/lib/demo/runEngineSmoke";

export async function GET(req: NextRequest) {
  try {
    const result = await runEngineSmokeTest();
    const failures = result.validation
      ? result.validation.assertions.filter(a => !a.passed).map(a => `${a.name}: ${a.message}`)
      : result.success ? [] : ["Unknown failure occurred."];

    return NextResponse.json({
      ok: result.success,
      success: result.success,
      timestamp: new Date().toISOString(),
      logs: result.logs,
      data: {
        passed: result.success,
        summary: result.success 
          ? "All civic engine smoke tests and contracts passed successfully."
          : `Civic engine smoke test failed with ${failures.length} contract failure(s).`,
        failures,
        result,
      }
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        success: false,
        error: err.message || "Failed to execute smoke test.",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const result = await runEngineSmokeTest();
    const failures = result.validation
      ? result.validation.assertions.filter(a => !a.passed).map(a => `${a.name}: ${a.message}`)
      : result.success ? [] : ["Unknown failure occurred."];

    return NextResponse.json({
      ok: result.success,
      success: result.success,
      timestamp: new Date().toISOString(),
      logs: result.logs,
      data: {
        passed: result.success,
        summary: result.success 
          ? "All civic engine smoke tests and contracts passed successfully."
          : `Civic engine smoke test failed with ${failures.length} contract failure(s).`,
        failures,
        result,
      }
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        success: false,
        error: err.message || "Failed to execute smoke test.",
      },
      { status: 500 }
    );
  }
}
