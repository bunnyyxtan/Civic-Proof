// app/api/gemini/analyze/route.ts
// Direct high-fidelity API route for on-site report analysis

import { NextRequest, NextResponse } from "next/server";
import { analyzeReportSmart } from "@/src/lib/ai/geminiAdapters";
import { calculateHarmScore, routeToDepartment, generateCaseId, CivicCase, CaseStatus } from "@/src/lib/civic/engine";
import { ReportIntake } from "@/src/lib/civic/types";

export async function POST(req: NextRequest) {
  try {
    const { photoUrl, voiceTranscript, userNotes, gps, isVulnerable, voiceMode, manualCategory } = await req.json();

    if (!photoUrl) {
      return NextResponse.json({ error: "photoUrl is required for evidence analysis" }, { status: 400 });
    }

    // Adapt to domain schema input
    const intake: ReportIntake = {
      imageDataUrl: photoUrl,
      locationName: gps?.address || "Indiranagar, Bengaluru",
      latitude: gps?.latitude,
      longitude: gps?.longitude,
      citizenNote: userNotes || voiceTranscript,
      reportedAt: new Date().toISOString(),
    };

    // Run AI analysis with strict safety limits and validation
    const smartResult = await analyzeReportSmart(intake);
    const analysis = smartResult.data;
    
    // Override category if manually selected
    const effectiveCategory = manualCategory && manualCategory !== 'other' && manualCategory !== 'auto-detect' 
      ? manualCategory 
      : analysis.normalizedCategory;

    // Map domain category back to frontend-compatible categories
    let mappedCategory: CivicCase["category"] = "Pothole & Road Damage";
    if (effectiveCategory === "water_leakage") {
      mappedCategory = "Water Overflow";
    } else if (effectiveCategory === "road_damage") {
      mappedCategory = "Pothole & Road Damage";
    } else if (effectiveCategory === "waste_management") {
      mappedCategory = "Garbage Dump";
    } else if (effectiveCategory === "streetlight") {
      mappedCategory = "Traffic & Footpath Obstruction";
    }

    // Create a new unique case ID
    const caseId = generateCaseId();
    const routedDept = routeToDepartment(mappedCategory);

    // Calculate deterministic harm score
    const finalVulnerable = isVulnerable || (analysis.severity === "high" || analysis.severity === "critical");
    const { score, breakdown } = calculateHarmScore(mappedCategory, new Date().toISOString(), 1, finalVulnerable);

    // Map severity to standard 1-10 scale for legacy UI compatibility
    let mappedSeverityNum = 5;
    if (analysis.severity === "low") mappedSeverityNum = 3;
    else if (analysis.severity === "medium") mappedSeverityNum = 6;
    else if (analysis.severity === "high") mappedSeverityNum = 8;
    else if (analysis.severity === "critical") mappedSeverityNum = 10;

    // Build the complete CivicCase output matching frontend requirements exactly
    const newCase: CivicCase = {
      id: caseId,
      title: analysis.suggestedTitle || "Unspecified Civic Defect",
      description: userNotes || analysis.civicSummary || "No description provided by citizen.",
      voiceTranscript: voiceTranscript || undefined,
      voiceMode: voiceMode || undefined,
      category: mappedCategory,
      department: routedDept,
      gps: gps || { latitude: 12.9716, longitude: 77.6412, address: "Indiranagar, Bengaluru" },
      photoUrl: photoUrl,
      filedAt: new Date().toISOString(),
      status: "FILED",
      harmScore: score,
      harmScoreBreakdown: breakdown,
      corroborations: [
        {
          id: `CORR-01-${Date.now()}`,
          filedAt: new Date().toISOString(),
          type: "angle",
          contributorName: "You (Original Reporter)",
        }
      ],
      timeline: [
        {
          id: `EV-01-${Date.now()}`,
          timestamp: new Date().toISOString(),
          title: "Case Evidence Filed",
          description: `Citizen evidence logged with on-site geotagged proof. AI identified ${mappedCategory} with severity level ${mappedSeverityNum}/10.`,
          type: "file",
          actorName: "You"
        },
        {
          id: `EV-02-${Date.now()}`,
          timestamp: new Date().toISOString(),
          title: "Routed to Department",
          description: `CivicProof engine routed this file to ${routedDept} under standard citizen charter SLA.`,
          type: "route"
        }
      ],
      complaintPacket: null,
      escalationPacket: null,
      resolutionReasoning: null,
      resolvedAt: null,
      authorityLastSeenAt: null
    };

    // Return exact signature expected by the frontend
    return NextResponse.json({
      success: true,
      case: newCase,
      analysis: {
        headline: analysis.suggestedTitle,
        analysisText: analysis.civicSummary + "\n\n" + (analysis.riskFactors.length ? "Risk Factors:\n" + analysis.riskFactors.map(r => `• ${r}`).join("\n") : ""),
        estimatedSeverity: mappedSeverityNum,
        category: mappedCategory,
        isVulnerableArea: finalVulnerable,
        corroborationPhrase: analysis.harmSignals[0] || "Pedestrian hazard detected. Stand together to verify this block.",
      },
      meta: smartResult.meta
    });

  } catch (err: any) {
    console.error("API Analyze post failed:", err);
    return NextResponse.json({ error: err.message || "Failed to analyze evidence" }, { status: 500 });
  }
}
