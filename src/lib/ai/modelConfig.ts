// src/lib/ai/modelConfig.ts
// Gemini API Configuration and Feature Flag Manager

export function getGeminiApiKey(): string | undefined {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
}

export function isForcedMock(): boolean {
  return process.env.CIVICPROOF_FORCE_MOCK_AI === "true";
}

export function shouldUseGemini(): boolean {
  if (isForcedMock()) {
    return false;
  }
  const key = getGeminiApiKey();
  return typeof key === "string" && key.trim().length > 0;
}

export function getTextModelName(): string {
  return process.env.GEMINI_TEXT_MODEL || "gemini-3.5-flash";
}

export function getMultimodalModelName(): string {
  return process.env.GEMINI_MULTIMODAL_MODEL || "gemini-3.5-flash";
}
