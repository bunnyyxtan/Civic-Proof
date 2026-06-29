// src/lib/ai/geminiAdapters.ts
// Smart AI adapters with robust mock fallbacks

import { ReportIntake, AIAnalysisResult, ComplaintPacket, EscalationPacket, ResolutionVerification } from "../civic/types";
import { shouldUseGemini, getMultimodalModelName, getTextModelName } from "./modelConfig";
import {
  analyzeReportWithGemini,
  generateComplaintWithGemini,
  generateEscalationWithGemini,
  verifyResolutionWithGemini,
} from "./geminiService";
import {
  mockAnalyzeReport,
  mockGenerateComplaint,
  mockGenerateEscalation,
  mockVerifyResolution,
} from "./mockAi";
import {
  AIAnalysisResultSchema,
  ComplaintPacketSchema,
  EscalationPacketSchema,
  ResolutionVerificationSchema,
} from "./schemas";

export interface AdapterResult<T> {
  data: T;
  meta: {
    provider: "gemini" | "mock";
    model?: string;
    fallbackUsed: boolean;
    fallbackReason?: string;
  };
}

export async function analyzeReportSmart(report: ReportIntake): Promise<AdapterResult<AIAnalysisResult>> {
  if (!shouldUseGemini()) {
    return {
      data: mockAnalyzeReport(report),
      meta: {
        provider: "mock",
        fallbackUsed: true,
        fallbackReason: "Gemini API key is not configured or mock mode is forced.",
      },
    };
  }

  try {
    const rawResult = await analyzeReportWithGemini(report);
    // Validate output with Zod
    const validation = AIAnalysisResultSchema.safeParse(rawResult);
    if (validation.success) {
      return {
        data: validation.data,
        meta: {
          provider: "gemini",
          model: getMultimodalModelName(),
          fallbackUsed: false,
        },
      };
    } else {
      throw new Error(`Zod validation failed: ${JSON.stringify(validation.error.format())}`);
    }
  } catch (err: any) {
    console.warn("Gemini Analysis failed, falling back to mock AI:", err.message || err);
    return {
      data: mockAnalyzeReport(report),
      meta: {
        provider: "mock",
        fallbackUsed: true,
        fallbackReason: `Gemini failure or invalid response schema. Error: ${err.message || "Unknown error"}`,
      },
    };
  }
}

export async function generateComplaintSmart(
  caseId: string,
  title: string,
  category: string,
  department: string,
  gpsString: string,
  elapsedDays: number,
  analysisText: string
): Promise<AdapterResult<ComplaintPacket>> {
  if (!shouldUseGemini()) {
    return {
      data: mockGenerateComplaint(caseId, title, category, department, gpsString, elapsedDays, analysisText),
      meta: {
        provider: "mock",
        fallbackUsed: true,
        fallbackReason: "Gemini API key is not configured or mock mode is forced.",
      },
    };
  }

  try {
    const rawResult = await generateComplaintWithGemini(caseId, title, category, department, gpsString, elapsedDays, analysisText);
    const validation = ComplaintPacketSchema.safeParse(rawResult);
    if (validation.success) {
      return {
        data: validation.data,
        meta: {
          provider: "gemini",
          model: getTextModelName(),
          fallbackUsed: false,
        },
      };
    } else {
      throw new Error(`Zod validation failed: ${JSON.stringify(validation.error.format())}`);
    }
  } catch (err: any) {
    console.warn("Gemini Complaint generation failed, falling back to mock AI:", err.message || err);
    return {
      data: mockGenerateComplaint(caseId, title, category, department, gpsString, elapsedDays, analysisText),
      meta: {
        provider: "mock",
        fallbackUsed: true,
        fallbackReason: `Gemini failure or invalid response schema. Error: ${err.message || "Unknown error"}`,
      },
    };
  }
}

export async function generateEscalationSmart(
  caseId: string,
  title: string,
  category: string,
  department: string,
  gpsString: string,
  elapsedDays: number,
  analysisText: string,
  corroborationCount: number
): Promise<AdapterResult<EscalationPacket>> {
  if (!shouldUseGemini()) {
    return {
      data: mockGenerateEscalation(caseId, title, category, department, gpsString, elapsedDays, analysisText, corroborationCount),
      meta: {
        provider: "mock",
        fallbackUsed: true,
        fallbackReason: "Gemini API key is not configured or mock mode is forced.",
      },
    };
  }

  try {
    const rawResult = await generateEscalationWithGemini(caseId, title, category, department, gpsString, elapsedDays, analysisText, corroborationCount);
    const validation = EscalationPacketSchema.safeParse(rawResult);
    if (validation.success) {
      return {
        data: validation.data,
        meta: {
          provider: "gemini",
          model: getTextModelName(),
          fallbackUsed: false,
        },
      };
    } else {
      throw new Error(`Zod validation failed: ${JSON.stringify(validation.error.format())}`);
    }
  } catch (err: any) {
    console.warn("Gemini Escalation generation failed, falling back to mock AI:", err.message || err);
    return {
      data: mockGenerateEscalation(caseId, title, category, department, gpsString, elapsedDays, analysisText, corroborationCount),
      meta: {
        provider: "mock",
        fallbackUsed: true,
        fallbackReason: `Gemini failure or invalid response schema. Error: ${err.message || "Unknown error"}`,
      },
    };
  }
}

export async function verifyResolutionSmart(
  originalDesc: string,
  resolutionPhotoUrl: string,
  citizenVerificationNote: string
): Promise<AdapterResult<ResolutionVerification>> {
  if (!shouldUseGemini()) {
    return {
      data: mockVerifyResolution(originalDesc, resolutionPhotoUrl, citizenVerificationNote),
      meta: {
        provider: "mock",
        fallbackUsed: true,
        fallbackReason: "Gemini API key is not configured or mock mode is forced.",
      },
    };
  }

  try {
    const rawResult = await verifyResolutionWithGemini(originalDesc, resolutionPhotoUrl, citizenVerificationNote);
    const validation = ResolutionVerificationSchema.safeParse(rawResult);
    if (validation.success) {
      return {
        data: validation.data,
        meta: {
          provider: "gemini",
          model: getMultimodalModelName(),
          fallbackUsed: false,
        },
      };
    } else {
      throw new Error(`Zod validation failed: ${JSON.stringify(validation.error.format())}`);
    }
  } catch (err: any) {
    console.warn("Gemini Resolution verification failed, falling back to mock AI:", err.message || err);
    return {
      data: mockVerifyResolution(originalDesc, resolutionPhotoUrl, citizenVerificationNote),
      meta: {
        provider: "mock",
        fallbackUsed: true,
        fallbackReason: `Gemini failure or invalid response schema. Error: ${err.message || "Unknown error"}`,
      },
    };
  }
}
