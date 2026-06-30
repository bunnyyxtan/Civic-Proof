// src/lib/ai/mockAi.ts
// High-Fidelity Domain Mock AI fallback layer

import { ReportIntake, AIAnalysisResult, ComplaintPacket, EscalationPacket, ResolutionVerification } from "../civic/types";
import { ISSUE_CATEGORIES, DEPARTMENTS } from "../civic/constants";
import { extractCivicRiskSignals } from "../civic/riskSignals";

export function mockAnalyzeReport(report: ReportIntake): AIAnalysisResult {
  const note = (report.citizenNote || "").toLowerCase();
  const address = (report.locationName || "").toLowerCase();
  
  // Default values
  let detectedIssue = "Undetermined structural civic issue";
  let normalizedCategory: ReportIntake["selectedCategory"] = report.selectedCategory || "road_damage";
  let severity: 'low' | 'medium' | 'high' | 'critical' = "medium";
  let visibleEvidence = ["Physical defect on public pavement"];
  let riskFactors = ["Local pedestrian tripping risk"];
  let missingEvidence = ["Sub-base closeup snapshot"];
  let civicSummary = "Standard municipal defect reported on ward road infrastructure.";
  let citizenImpact = "Local street pedestrian movement is partially restricted.";
  let suggestedTitle = "Municipal Pavement Issue";
  let harmSignals = ["Pedestrian hazard"];

  // 1. Keyword check for classifications
  if (note.includes("drain") || note.includes("stagnant") || note.includes("water") || note.includes("mosquito") || note.includes("pipe") || note.includes("leak") || note.includes("sewage")) {
    normalizedCategory = "water_leakage";
  } else if (note.includes("pothole") || note.includes("road") || note.includes("broken road") || note.includes("crater") || note.includes("asphalt")) {
    normalizedCategory = "road_damage";
  } else if (note.includes("garbage") || note.includes("waste") || note.includes("bin") || note.includes("dumping") || note.includes("trash")) {
    normalizedCategory = "waste_management";
  } else if (note.includes("streetlight") || note.includes("light") || note.includes("dark") || note.includes("pole") || note.includes("lamp")) {
    normalizedCategory = "streetlight";
  }

  // 2. High-fidelity specific mock situations
  if (normalizedCategory === "water_leakage") {
    const isSchoolNear = note.includes("school") || address.includes("school");
    if (isSchoolNear) {
      detectedIssue = "Open drain with stagnant water near school boundary";
      severity = "critical";
      visibleEvidence = [
        "Uncovered brick drainage culvert, width ~1.5m",
        "Deep stagnant blackwater pooling on walkway",
        "Heavy swarm of active insects / mosquitoes"
      ];
      riskFactors = [
        "school children nearby",
        "pedestrian fall risk",
        "mosquito breeding risk",
        "contamination risk"
      ];
      missingEvidence = ["Detailed water-level gauge measurement", "Upstream drain inlet closeup"];
      civicSummary = "Extremely dangerous open drainage channel filled with stagnant waste runoff, directly bordering an active primary school entrance. High risk of pediatric injuries and disease transmission.";
      citizenImpact = "Children, teachers, and parents are forced to walk on road margins beside high-speed traffic.";
      suggestedTitle = "Critical Open Drain near School";
      harmSignals = ["Infectious disease vector breeding", "Open culvert fall risk", "Contaminated runoff flooding"];
    } else {
      detectedIssue = "Main line pipe rupture with surface water leakage";
      severity = "high";
      visibleEvidence = [
        "Sub-surface pipe seam split, continuous discharge",
        "Waterlogging covering approx 15 sq meters"
      ];
      riskFactors = ["Localized asphalt erosion", "Drinking water contamination", "Algae slippage hazard"];
      missingEvidence = ["Rupture valve section image"];
      civicSummary = "High-pressure municipal water supply conduit failure causing active flooding on public pavement.";
      citizenImpact = "Drinking water pressure in adjoining blocks is significantly depleted.";
      suggestedTitle = "Main Line Water Leakage";
      harmSignals = ["Water resource wastage", "Pavement erosion", "Algae slipperiness"];
    }
  } else if (normalizedCategory === "road_damage") {
    const isMajorPothole = note.includes("crater") || note.includes("deep") || note.includes("severe");
    detectedIssue = isMajorPothole 
      ? "Severe structural asphalt crater in center lanes" 
      : "Active structural road surface crumbling";
    severity = isMajorPothole ? "high" : "medium";
    visibleEvidence = [
      "Asphalt surface failure exceeding 15cm depth",
      "Loose aggregate scattered across 3-meter lane"
    ];
    riskFactors = [
      "Two-wheeler vehicular crash hazard",
      "Sudden lane-veer collision risk",
      "Low light visibility threat"
    ];
    missingEvidence = ["Pothole depth ruler comparison", "Street lighting overview under darkness"];
    civicSummary = "Substantial structural pavement crater positioned directly in active traffic lane, exposing sub-base and aggregate stone layers.";
    citizenImpact = "Vehicular transit speed is highly congested; scooters slip on loose gravel debris.";
    suggestedTitle = isMajorPothole ? "Severe Lane-Block Crater Pothole" : "Structural Pavement Cracking";
    harmSignals = ["Two-wheeler crash danger", "Traffic congestion jam", "Suspension damage threat"];
  } else if (normalizedCategory === "waste_management") {
    detectedIssue = "Uncontrolled solid municipal waste dumping";
    severity = note.includes("rotten") || note.includes("smell") ? "high" : "medium";
    visibleEvidence = [
      "Accumulated household plastic bags exceeding 200kg",
      "Stray animal scavenging scattering garbage",
      "Drainage inlet blockages caused by refuse"
    ];
    riskFactors = ["Stray dog congregation risk", "Noxious odor emissions", "Localized stormwater backing"];
    missingEvidence = ["Bin capacity fullness perspective"];
    civicSummary = "Illegal spontaneous trash dump covering public walking sidewalks due to missing collection bin infrastructure.";
    citizenImpact = "Extreme foul smells entering neighboring houses; pedestrians forced onto roads.";
    suggestedTitle = "Illegal Street Waste Accumulation";
    harmSignals = ["Stray animal pack attraction", "Sidewalk blockage", "Microplastic rain runoff"];
  } else if (normalizedCategory === "streetlight") {
    detectedIssue = "Malfunctioning streetlight causing pitch-black corridor";
    severity = "medium";
    visibleEvidence = [
      "Complete luminaire failure on pole #59",
      "Zero light emission on active pedestrian zebra crossing"
    ];
    riskFactors = ["Increase in criminal vulnerability", "Pedestrian vehicle strike risk", "Low visibility collisions"];
    missingEvidence = ["Pole ID plaque closeup", "Nighttime ambient light meter reading"];
    civicSummary = "High-pressure sodium street luminaire circuit failure, leaving critical pedestrian crossing in darkness.";
    citizenImpact = "Women, children, and elderly residents feel unsafe traversing the block post-sunset.";
    suggestedTitle = "Streetlight Blackout Corridor";
    harmSignals = ["Anti-social activity potential", "Pedestrian traffic collision risk", "Low light fear"];
  }

  const dept = DEPARTMENTS[normalizedCategory];

  const derivedSignals = extractCivicRiskSignals(report.citizenNote || "", report.locationName);
  const finalRiskFactors = Array.from(new Set([...riskFactors, ...derivedSignals]));

  return {
    detectedIssue,
    normalizedCategory,
    severity,
    confidence: 0.94,
    visibleEvidence,
    riskFactors: finalRiskFactors,
    missingEvidence,
    recommendedDepartment: dept.name,
    civicSummary,
    citizenImpact,
    suggestedTitle,
    harmSignals,
  };
}

export function mockGenerateComplaint(
  caseId: string,
  title: string,
  category: string,
  department: string,
  gpsString: string,
  elapsedDays: number,
  analysisText: string
): ComplaintPacket {
  const generatedAt = new Date().toISOString();
  const subject = `FORMAL REPRESENTATION: Persistent Unaddressed Public Hazard [Ref: ${caseId}]`;
  
  const formalBody = `CIVIC GRIEVANCE PETITION / EVIDENCE PACKET
Issued under Ward Administration Citizen's Charter Guidelines
Case Reference: ${caseId}
Generated: ${new Date(generatedAt).toLocaleDateString()}

TO,
The Designated Grievance Officer,
${department},
Municipal Administration.

SUBJECT: Formal Representation regarding persistent neglected public defect: "${title}" (${category}) at GPS: ${gpsString}.

Sir/Madam,

Under the Municipal Corporations Act and Citizen's Charter, we hereby submit formal evidentiary proof of a critical municipal failure that has remained unaddressed on our street for ${elapsedDays} days, despite posing active risks to public health and pedestrian safety.

The localized issue has been recorded, cataloged, and backed by independent community-level verification. Below is the technical inspection and evidence summary:

EVIDENTIARY ANALYSIS:
${analysisText}

LOCATION LOGS:
• GPS Coordinates: ${gpsString}
• Locality Jurisdiction: Local Ward Office
• Verified Proof File: Sealed under cryptographic reference ID ${caseId}-PROOF-01

CITIZEN INJUNCTION & REQUESTED ACTION:
We urge your department to initiate an immediate physical inspection and deploy corrective crew assets within 48 hours. Should this defect remain unresolved, this docket will be escalated to the Public Grievance Redressal Commission and the Ward Commissioner's Desk for neglect of duty audits.

We expect a formal response indicating status updates and the assigned engineering supervisor's details.

Yours faithfully,
The Concerned Citizens
(Verified through CivicProof — Public Grievance Verification Ledger)`;

  return {
    recipientDepartment: department,
    subject,
    formalBody,
    evidenceSummary: `Civic analysis identifies unresolved ${category} hazards.`,
    citizenImpact: `Pedestrians and vehicular transit are actively endangered.`,
    requestedAction: "Conduct emergency site inspection and clear the hazard within 48 hours.",
    tone: elapsedDays >= 7 ? "urgent" : "formal",
    generatedAt,
  };
}

export function mockGenerateEscalation(
  caseId: string,
  title: string,
  category: string,
  department: string,
  gpsString: string,
  elapsedDays: number,
  analysisText: string,
  corroborationCount: number
): EscalationPacket {
  const generatedAt = new Date().toISOString();

  const formalBody = `FORMAL PETITION OF ADMINISTRATIVE NEGLIGENCE & PUBLIC RISK
Submitted to the Public Grievance Redressal Commission & Ward Joint Commissioner
Escalation Ticket ID: ESC-${caseId}
Generated: ${new Date(generatedAt).toLocaleDateString()}

TO,
The Joint Commissioner (Grievance Desk),
Municipal Ward Head Office.

SUBJECT: Escalation regarding persistent department inaction over critical safety hazard: "${title}" - Ignored for ${elapsedDays} Days (SLA BREACH).

RESPECTED SIR/MADAM,

This petition is filed on behalf of ${corroborationCount + 1} verified neighborhood residents. We formally lodge a grievance of administrative neglect against the ${department}.

The public hazard, cataloged under case reference ${caseId}, was initially filed with clear visual and location evidence. Despite the mandatory 7-day citizen SLA timeline expiring, the department has maintained absolute silence, failing to route corrective engineering or issue an official response.

COMMUNITY LEDGER OF CORROBORATION:
• Total Verified Citizen Signatures: ${corroborationCount + 1}
• SLA Silence Duration: ${elapsedDays} Days (Mandatory timeline was 7 days)
• Public Harm Score: High Risk
• Core Evidence Breakdown: ${analysisText}

DEMANDS FOR RESOLUTION:
1. Direct the Assistant Executive Engineer (AEE) of ${department} to conduct an immediate emergency site visit within 24 hours.
2. Initiate a departmental review of the negligence and delay regarding this specific complaint docket.
3. Update the public status of this case file immediately to prevent further community hazard liabilities.

Please find attached the complete evidentiary file, GPS coordinate ledger, and timestamped photo timeline.

We expect immediate disciplinary routing and public transparency on this critical issue.

Respectfully submitted,
Verified Neighbor Coalition`;

  return {
    escalationReason: `Official citizen charter resolution timeline exceeded by ${elapsedDays} days.`,
    daysSilent: elapsedDays,
    slaBreached: true,
    unresolvedEvidence: ["Active visual hazard", "Community movement blockages"],
    communityCorroborationSummary: `Signed by ${corroborationCount} neighbors in collective physical verification.`,
    formalBody,
    generatedAt,
  };
}

export function mockVerifyResolution(
  originalDesc: string,
  resolutionPhotoUrl: string,
  citizenVerificationNote: string
): ResolutionVerification {
  const note = citizenVerificationNote.toLowerCase();
  
  const isNo =
    note.includes("no") ||
    note.includes("not") ||
    note.includes("bad") ||
    note.includes("still") ||
    note.includes("half") ||
    note.includes("unresolved") ||
    note.includes("incomplete") ||
    note.includes("debris");

  if (isNo) {
    return {
      beforeImageObservations: [
        "Original reported hazard is severe and unresolved.",
        "Citizen reports pavement crumbling."
      ],
      afterImageObservations: [
        "Resolution photo confirms sloppy, unfinished asphalt laying.",
        "Active rubble continues to block walkway."
      ],
      repairLikely: false,
      confidence: 0.94,
      remainingConcerns: [
        "Tripping hazard for pedestrians remains on sidewalk.",
        "Drain inlet continues to show sand debris accumulation."
      ],
      recommendedStatus: "keep_open",
      forensicReasoning: "• Forensic image analysis reveals remaining structural debris around the reported site.\n• Citizen feedback confirms asphalt patch was laid poorly, already washing away.\n• Pedestrian walkway remains obstructed. Re-opening case."
    };
  }

  return {
    beforeImageObservations: [
      "Pothole or water leak originally reported.",
      "Vulnerable pathway compromised."
    ],
    afterImageObservations: [
      "A clean flat asphalt surface has been successfully steam-rolled flat.",
      "Adjacent debris has been cleanly cleared away."
    ],
    repairLikely: true,
    confidence: 0.98,
    remainingConcerns: [],
    recommendedStatus: "verified_resolved",
    forensicReasoning: "• Visual inspection confirms potholes have been successfully filled and steam-rolled flat.\n• Drainage clearance completed. Surface runoff is flowing correctly.\n• Verified completed on-site by community physical audit."
  };
}
