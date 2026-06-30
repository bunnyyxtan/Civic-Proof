// src/lib/ai/geminiService.ts
// Direct Gemini API invocation handlers

import fs from "fs";
import path from "path";
import { getGeminiClient } from "./geminiClient";
import { getMultimodalModelName, getTextModelName } from "./modelConfig";
import { ReportIntake, AIAnalysisResult, ComplaintPacket, EscalationPacket, ResolutionVerification } from "../civic/types";
import { extractJson } from "./geminiJson";
import {
  buildAnalysisPrompt,
  buildComplaintPrompt,
  buildEscalationPrompt,
  buildResolutionPrompt,
} from "./prompts";
import { ISSUE_CATEGORIES } from "../civic/constants";
import { AI_TIMEOUTS } from "./aiTimeouts";

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`AI Timeout: ${label} exceeded ${ms}ms`)), ms)
    )
  ]);
}

// Helper to load image inline data for Gemini supporting data URLs, remote URLs, and local files
async function getImagePart(url: string): Promise<{ mimeType: string; data: string } | null> {
  if (!url) return null;

  if (url.startsWith("data:image/")) {
    try {
      const parts = url.split(",");
      if (parts.length < 2) return null;
      const meta = parts[0];
      const base64 = parts[1];
      const mimeType = meta.split(";")[0].split(":")[1] || "image/jpeg";
      return { mimeType, data: base64 };
    } catch (err) {
      console.error("getImagePart failed for base64:", err);
      return null;
    }
  }

  if (url.startsWith("http")) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const arrayBuffer = await res.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const mimeType = res.headers.get("content-type") || "image/jpeg";
        return {
          mimeType,
          data: buffer.toString("base64"),
        };
      }
    } catch (err) {
      console.error("getImagePart failed to fetch remote url:", url, err);
      return null;
    }
  }

  if (url.startsWith("/")) {
    try {
      const filePath = path.join(process.cwd(), "public", url);
      if (fs.existsSync(filePath)) {
        const buffer = fs.readFileSync(filePath);
        const ext = path.extname(filePath).toLowerCase();
        let mimeType = "image/jpeg";
        if (ext === ".png") mimeType = "image/png";
        else if (ext === ".gif") mimeType = "image/gif";
        else if (ext === ".webp") mimeType = "image/webp";
        return {
          mimeType,
          data: buffer.toString("base64"),
        };
      }
    } catch (err) {
      console.error("getImagePart failed to read local file:", url, err);
    }
  }

  return null;
}

export async function analyzeReportWithGemini(report: ReportIntake): Promise<AIAnalysisResult> {
  const ai = getGeminiClient();
  const contextText = `Citizen note: "${report.citizenNote || 'None'}". Reported location: "${report.locationName}". Category choice: "${report.selectedCategory || 'None'}".`;
  
  const categoriesList = Object.keys(ISSUE_CATEGORIES);
  const prompt = buildAnalysisPrompt(contextText, categoriesList);

  const contents: any[] = [];
  const imagePart = report.imageDataUrl ? await getImagePart(report.imageDataUrl) : null;
  
  if (imagePart) {
    contents.push({
      inlineData: {
        mimeType: imagePart.mimeType,
        data: imagePart.data,
      },
    });
  }
  contents.push({ text: prompt });

  const response = await withTimeout(
    ai.models.generateContent({
      model: getMultimodalModelName(),
      contents: contents,
      config: {
        responseMimeType: "application/json",
      },
    }),
    AI_TIMEOUTS.reportAnalysis,
    "Report Analysis"
  );

  const text = response.text;
  if (!text) {
    throw new Error("No response text returned from Gemini API during report analysis.");
  }

  const rawJson = extractJson(text);
  
  // Clean up and map to guarantee all properties exist
  return {
    detectedIssue: rawJson.detectedIssue || "Undetermined reported issue",
    normalizedCategory: rawJson.normalizedCategory || "road_damage",
    severity: rawJson.severity || "medium",
    confidence: typeof rawJson.confidence === "number" ? rawJson.confidence : 0.90,
    visibleEvidence: Array.isArray(rawJson.visibleEvidence) ? rawJson.visibleEvidence : ["Visual report"],
    riskFactors: Array.isArray(rawJson.riskFactors) ? rawJson.riskFactors : ["General municipal risk"],
    missingEvidence: Array.isArray(rawJson.missingEvidence) ? rawJson.missingEvidence : [],
    recommendedDepartment: rawJson.recommendedDepartment || "BBMP Municipal Ward",
    civicSummary: rawJson.civicSummary || "Civic defect registered near ward coordinates.",
    citizenImpact: rawJson.citizenImpact || "General pedestrian movement restricted.",
    suggestedTitle: rawJson.suggestedTitle || "Grievance Report",
    harmSignals: Array.isArray(rawJson.harmSignals) ? rawJson.harmSignals : ["Safety risk"],
  };
}

export async function generateComplaintWithGemini(
  caseId: string,
  title: string,
  category: string,
  department: string,
  gpsString: string,
  elapsedDays: number,
  analysisText: string
): Promise<ComplaintPacket> {
  const ai = getGeminiClient();
  const prompt = buildComplaintPrompt(caseId, title, category, department, gpsString, elapsedDays, analysisText);

  const response = await withTimeout(
    ai.models.generateContent({
      model: getTextModelName(),
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    }),
    AI_TIMEOUTS.complaintPacket,
    "Complaint Packet Generation"
  );

  const text = response.text;
  if (!text) {
    throw new Error("No complaint text returned from Gemini API.");
  }

  const rawJson = extractJson(text);

  return {
    recipientDepartment: rawJson.recipientDepartment || department,
    subject: rawJson.subject || `Formal Petition: Pavement Safety — ${caseId}`,
    formalBody: rawJson.formalBody || "Formal complaint letter body uncompiled.",
    evidenceSummary: rawJson.evidenceSummary || "Evidentiary context compiled.",
    citizenImpact: rawJson.citizenImpact || "Local citizens and transit are actively endangered.",
    requestedAction: rawJson.requestedAction || "Conduct on-site repair dispatch within 48 hours.",
    tone: rawJson.tone || (elapsedDays >= 7 ? "urgent" : "formal"),
    generatedAt: rawJson.generatedAt || new Date().toISOString(),
  };
}

export async function generateEscalationWithGemini(
  caseId: string,
  title: string,
  category: string,
  department: string,
  gpsString: string,
  elapsedDays: number,
  analysisText: string,
  corroborationCount: number
): Promise<EscalationPacket> {
  const ai = getGeminiClient();
  const prompt = buildEscalationPrompt(caseId, title, category, department, gpsString, elapsedDays, analysisText, corroborationCount);

  const response = await withTimeout(
    ai.models.generateContent({
      model: getTextModelName(),
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    }),
    AI_TIMEOUTS.escalationPacket,
    "Escalation Packet Generation"
  );

  const text = response.text;
  if (!text) {
    throw new Error("No escalation text returned from Gemini API.");
  }

  const rawJson = extractJson(text);

  return {
    escalationReason: rawJson.escalationReason || `Unaddressed municipal negligence over ${elapsedDays} days.`,
    daysSilent: typeof rawJson.daysSilent === "number" ? rawJson.daysSilent : elapsedDays,
    slaBreached: true,
    unresolvedEvidence: Array.isArray(rawJson.unresolvedEvidence) ? rawJson.unresolvedEvidence : ["Outstanding hazard"],
    communityCorroborationSummary: rawJson.communityCorroborationSummary || `Signed by ${corroborationCount} neighborhood citizens.`,
    formalBody: rawJson.formalBody || "Official escalation petition body uncompiled.",
    generatedAt: rawJson.generatedAt || new Date().toISOString(),
  };
}

export async function verifyResolutionWithGemini(
  originalDesc: string,
  resolutionPhotoUrl: string,
  citizenVerificationNote: string
): Promise<ResolutionVerification> {
  const ai = getGeminiClient();
  const prompt = buildResolutionPrompt(originalDesc, citizenVerificationNote);

  const contents: any[] = [];
  const imagePart = resolutionPhotoUrl ? await getImagePart(resolutionPhotoUrl) : null;
  if (imagePart) {
    contents.push({
      inlineData: {
        mimeType: imagePart.mimeType,
        data: imagePart.data,
      },
    });
  }
  contents.push({ text: prompt });

  const response = await withTimeout(
    ai.models.generateContent({
      model: getMultimodalModelName(),
      contents: contents,
      config: {
        responseMimeType: "application/json",
      },
    }),
    AI_TIMEOUTS.resolutionVerification,
    "Resolution Verification"
  );

  const text = response.text;
  if (!text) {
    throw new Error("No verification response from Gemini API.");
  }

  const rawJson = extractJson(text);

  return {
    beforeImageObservations: Array.isArray(rawJson.beforeImageObservations) ? rawJson.beforeImageObservations : [],
    afterImageObservations: Array.isArray(rawJson.afterImageObservations) ? rawJson.afterImageObservations : [],
    repairLikely: typeof rawJson.repairLikely === "boolean" ? rawJson.repairLikely : true,
    confidence: typeof rawJson.confidence === "number" ? rawJson.confidence : 0.95,
    remainingConcerns: Array.isArray(rawJson.remainingConcerns) ? rawJson.remainingConcerns : [],
    recommendedStatus: rawJson.recommendedStatus || "verified_resolved",
    forensicReasoning: rawJson.forensicReasoning || "Forensic photo audit suggests repair is complete.",
  };
}
