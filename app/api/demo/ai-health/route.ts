// app/api/demo/ai-health/route.ts
// Direct server diagnostic check for Gemini API status and configuration

import { NextRequest, NextResponse } from "next/server";
import { shouldUseGemini, getGeminiApiKey, getTextModelName, getMultimodalModelName, isForcedMock } from "@/src/lib/ai/modelConfig";

export async function GET(req: NextRequest) {
  const key = getGeminiApiKey();
  const loaded = typeof key === "string" && key.trim().length > 0;
  
  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    geminiStatus: {
      isConfiguredAndActive: shouldUseGemini(),
      apiKeyLoaded: loaded,
      apiKeyLength: key ? key.length : 0,
      textModel: getTextModelName(),
      multimodalModel: getMultimodalModelName(),
      forceMockModeActive: isForcedMock(),
    }
  });
}
export async function POST(req: NextRequest) {
  const key = getGeminiApiKey();
  const loaded = typeof key === "string" && key.trim().length > 0;
  
  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    geminiStatus: {
      isConfiguredAndActive: shouldUseGemini(),
      apiKeyLoaded: loaded,
      apiKeyLength: key ? key.length : 0,
      textModel: getTextModelName(),
      multimodalModel: getMultimodalModelName(),
      forceMockModeActive: isForcedMock(),
    }
  });
}
