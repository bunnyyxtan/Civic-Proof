// CivicProof State Management & Storage Engine
// Implements client-side state, offline queue, and localStorage persistence

import { CivicCase, calculateHarmScore, routeToDepartment, generateCaseId, checkSilenceClockBreach } from "./civic/engine";
import { CivicIssue } from "./civic/types";

const STORAGE_KEY = "civicproof_cases_v2";

const INITIAL_MOCK_CASES: CivicCase[] = [
  {
    id: "CP-2026-P80E1",
    title: "Severe Crater Pothole on 12th Main Road",
    description: "Huge structural asphalt crater right in front of the active intersection. Two-wheelers have to veer dangerously into oncoming traffic to avoid it. Depth is about 15cm and width is over 1 meter.",
    category: "Pothole & Road Damage",
    department: "Bruhat Bengaluru Mahanagara Palike (BBMP) - Road Infrastructure Dept",
    gps: {
      latitude: 12.9716,
      longitude: 77.6412,
      address: "12th Main Road, 4th Cross, Indiranagar, Bengaluru"
    },
    photoUrl: "https://picsum.photos/seed/pothole/600/400",
    filedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), // 4 days ago
    status: "ROUTED",
    harmScore: 68,
    harmScoreBreakdown: {
      safetyHazard: 15,
      publicImpact: 14, // 2 corroborations (filed + 1 neighbor)
      vulnerabilityFactor: 12,
      durationFactor: 12 // 4 days
    },
    corroborations: [
      {
        id: "CORR-001",
        filedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        type: "angle",
        contributorName: "Arjun Rao (Original Reporter)"
      },
      {
        id: "CORR-002",
        filedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        text: "Nearly slipped my scooter here last night under low streetlights. Extremely deep!",
        type: "impact",
        contributorName: "Priya Nair"
      }
    ],
    timeline: [
      {
        id: "EV-001",
        timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        title: "Case Evidence Filed",
        description: "Citizen report logged with on-site geotagged photo proof and automated severity evaluation.",
        type: "file",
        actorName: "Arjun Rao"
      },
      {
        id: "EV-002",
        timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        title: "Routed to BBMP Division",
        description: "Deterministic routing matrix routed the file to the BBMP Road Infrastructure Department.",
        type: "route"
      },
      {
        id: "EV-003",
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        title: "Corroborated by Priya N.",
        description: "Neighborhood verification added: Impact level confirmed. Harm score scaled from 54 → 68.",
        type: "corroborate",
        actorName: "Priya Nair"
      }
    ],
    complaintPacket: null,
    escalationPacket: null,
    resolutionReasoning: null,
    resolvedAt: null,
    authorityLastSeenAt: null
  },
  {
    id: "CP-2026-B44E8",
    title: "Exposed BESCOM Cable Near Play School",
    description: "Heavy high-tension power line has slipped off the pole clamp and is hanging loose at face height right near the Kids Academy entrance. Soil around the pole is waterlogged due to heavy rains.",
    category: "Power Line Danger",
    department: "Bangalore Electricity Supply Company (BESCOM)",
    gps: {
      latitude: 12.9752,
      longitude: 77.6438,
      address: "6th Cross Road, Indiranagar, Bengaluru"
    },
    photoUrl: "https://picsum.photos/seed/cable/600/400",
    filedAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(), // 9 days ago (SLA Breached!)
    status: "BREACHED",
    harmScore: 95,
    harmScoreBreakdown: {
      safetyHazard: 25,
      publicImpact: 25, // 4+ corroborations
      vulnerabilityFactor: 25, // Play school close + wet soil
      durationFactor: 20 // 9 days
    },
    corroborations: [
      {
        id: "CORR-003",
        filedAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
        type: "angle",
        contributorName: "Sarah Thomas"
      },
      {
        id: "CORR-004",
        filedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
        text: "This is a disaster waiting to happen. Little toddlers walk right past this hanging wire every morning.",
        type: "impact",
        contributorName: "Manjunath S."
      },
      {
        id: "CORR-005",
        filedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        text: "Hanging loose under wet trees. Sparks visible during heavy wind.",
        type: "angle",
        contributorName: "Vikram Sen"
      },
      {
        id: "CORR-006",
        filedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        text: "Still here on Friday morning. Absolutely zero response from BESCOM helpline.",
        type: "timestamp",
        contributorName: "Meera Alok"
      }
    ],
    timeline: [
      {
        id: "EV-004",
        timestamp: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
        title: "Emergency Case Filed",
        description: "Citizen Sarah Thomas surfaced exposed power cable. Extreme hazard flag enabled.",
        type: "file",
        actorName: "Sarah Thomas"
      },
      {
        id: "EV-005",
        timestamp: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
        title: "Routed to BESCOM Central Desk",
        description: "Official routing dispatched file to BESCOM Ward 59 Sub-Division.",
        type: "route"
      },
      {
        id: "EV-006",
        timestamp: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
        title: "Corroborated by Manjunath S.",
        description: "Impact confirmed: Hazard is adjacent to commercial kids' play school.",
        type: "corroborate",
        actorName: "Manjunath S."
      },
      {
        id: "EV-007",
        timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        title: "SLA Silence Breach Detected",
        description: "Silence Clock crossed 7-day milestone without department acknowledgment. Case flag shifted to BREACHED.",
        type: "breach"
      }
    ],
    complaintPacket: null,
    escalationPacket: null,
    resolutionReasoning: null,
    resolvedAt: null,
    authorityLastSeenAt: null
  },
  {
    id: "CP-2026-G15A3",
    title: "Blackwater Sewage Overflow outside Metro Station",
    description: "Sanitary sewer manhole has ruptured. Black raw sewage with strong odor flooding CMH road footpath and entry stairs of Indiranagar Metro Station.",
    category: "Water Overflow",
    department: "Bangalore Water Supply and Sewerage Board (BWSSB)",
    gps: {
      latitude: 12.9698,
      longitude: 77.6395,
      address: "Metro Station Pillar 120, CMH Road, Indiranagar, Bengaluru"
    },
    photoUrl: "https://picsum.photos/seed/sewage/600/400",
    filedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days ago
    status: "RESOLVED",
    harmScore: 82,
    harmScoreBreakdown: {
      safetyHazard: 18,
      publicImpact: 19,
      vulnerabilityFactor: 25,
      durationFactor: 20
    },
    corroborations: [
      {
        id: "CORR-007",
        filedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        type: "angle",
        contributorName: "Adil Khan"
      },
      {
        id: "CORR-008",
        filedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
        text: "Pedestrians can't even enter the metro station without stepping in blackwater.",
        type: "impact",
        contributorName: "Karan Johar"
      }
    ],
    timeline: [
      {
        id: "EV-008",
        timestamp: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        title: "Sewerage Overflow Filed",
        description: "Adil Khan filed blackwater sanitary breach.",
        type: "file",
        actorName: "Adil Khan"
      },
      {
        id: "EV-009",
        timestamp: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        title: "Routed to BWSSB Central Sewerage Desk",
        description: "File routed to BWSSB Sanitary Engineering Division.",
        type: "route"
      },
      {
        id: "EV-010",
        timestamp: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000).toISOString(),
        title: "Official Site Inspection",
        description: "BWSSB assistant engineer marked file as UNDER_REVIEW.",
        type: "review",
        actorName: "A. Prasad (BWSSB Engineer)"
      },
      {
        id: "EV-011",
        timestamp: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
        title: "Sewer Main Repaired",
        description: "BWSSB vacuum suction crew replaced sub-surface pipes and disinfected surface. Status set to RESOLVED.",
        type: "resolve",
        actorName: "BWSSB Sanitation Team"
      }
    ],
    complaintPacket: null,
    escalationPacket: null,
    resolutionReasoning: "Forensic verification confirms manhole rupture was completely sealed, concrete slab replaced, and floor washed with chemical disinfectant. Pedestrian traffic restored cleanly.",
    resolvedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    authorityLastSeenAt: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000).toISOString()
  }
];

export function loadCases(): CivicCase[] {
  if (typeof window === "undefined") return INITIAL_MOCK_CASES;
  
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as CivicCase[];
      // Run automatic Silence Clock checks on load to mark older cases breached
      return parsed.map(c => {
        if (c.status !== 'RESOLVED' && c.status !== 'BREACHED') {
          const { isBreached } = checkSilenceClockBreach(c);
          if (isBreached) {
            c.status = 'BREACHED';
            // Add timeline event if not already present
            const hasBreachEvent = c.timeline.some(e => e.type === 'breach');
            if (!hasBreachEvent) {
              c.timeline.push({
                id: `EV-BREACH-${Date.now()}`,
                timestamp: new Date().toISOString(),
                title: "SLA Silence Breach Detected",
                description: "Silence Clock crossed 7-day milestone with zero official resolution. Status flagged as BREACHED.",
                type: "breach"
              });
            }
          }
        }
        return c;
      });
    }
  } catch (err) {
    console.error("Failed to load local storage cases:", err);
  }
  
  return INITIAL_MOCK_CASES;
}

export function saveCases(cases: CivicCase[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cases));

    // Background asynchronous database synchronization
    if (Array.isArray(cases) && cases.length > 0) {
      // Synchronize the top 5 most recently active cases to keep Firestore light and fast
      const syncTargets = cases.slice(0, 5);
      for (const c of syncTargets) {
        fetch("/api/cases", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ case: c })
        }).catch(err => {
          console.warn(`Background database synchronization failed for case ${c.id}:`, err);
        });
      }
    }
  } catch (err) {
    console.error("Failed to save cases to local storage:", err);
  }
}

export function resetCasesStorage(): CivicCase[] {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_MOCK_CASES));
    } catch (e) {}
  }
  return INITIAL_MOCK_CASES;
}

export function mapIssueToCase(issue: CivicIssue): CivicCase {
  let mappedCategory: CivicCase["category"] = "Pothole & Road Damage";
  if (issue.category === "water_leakage") {
    mappedCategory = "Water Overflow";
  } else if (issue.category === "road_damage") {
    mappedCategory = "Pothole & Road Damage";
  } else if (issue.category === "waste_management") {
    mappedCategory = "Garbage Dump";
  } else if (issue.category === "streetlight") {
    if (issue.title.toLowerCase().includes("power") || issue.title.toLowerCase().includes("bescom") || issue.title.toLowerCase().includes("cable")) {
      mappedCategory = "Power Line Danger";
    } else {
      mappedCategory = "Traffic & Footpath Obstruction";
    }
  }

  let mappedStatus: CivicCase["status"] = "FILED";
  const currentStatus = issue.status as string;
  if (currentStatus === "verified_resolved") {
    mappedStatus = "RESOLVED";
  } else if (currentStatus === "overdue" || currentStatus === "escalated") {
    mappedStatus = "BREACHED";
  } else if (currentStatus === "routed" || currentStatus === "complaint_ready") {
    mappedStatus = "ROUTED";
  }

  const corroborations = (issue.corroborations || []).map((corr, idx) => ({
    id: corr.id || `CORR-${idx}-${Date.now()}`,
    filedAt: corr.reportedAt,
    text: corr.citizenNote,
    type: "angle" as const,
    contributorName: corr.contributorName,
    additionalPhotoUrl: corr.imageDataUrl || undefined,
  }));

  const timeline = (issue.timeline || []).map((ev) => ({
    id: ev.id,
    timestamp: ev.timestamp,
    title: ev.label || ev.type,
    description: ev.description,
    type: (ev.type === "report_submitted" ? "file" : 
           ev.type === "department_routed" ? "route" : 
           ev.type === "corroboration_added" ? "corroborate" : 
           ev.type === "silence_detected" ? "breach" : 
           ev.type === "resolution_checked" ? "resolve" : "file") as any,
    actorName: ev.actor === "citizen" ? "Citizen" : undefined,
  }));

  return {
    id: issue.id,
    title: issue.title,
    description: issue.evidence.description,
    voiceTranscript: issue.evidence.voiceTranscript || undefined,
    category: mappedCategory,
    department: issue.departmentRoute.departmentName,
    gps: {
      latitude: issue.latitude,
      longitude: issue.longitude,
      address: issue.locationName,
    },
    photoUrl: issue.evidence.photoUrl || "",
    filedAt: issue.reportedAt,
    status: mappedStatus,
    harmScore: issue.harmScore,
    harmScoreBreakdown: {
      safetyHazard: issue.harmScore >= 80 ? 25 : 15,
      publicImpact: issue.corroborations.length >= 3 ? 25 : 15,
      vulnerabilityFactor: issue.riskFactors.length >= 2 ? 25 : 12,
      durationFactor: issue.status === "overdue" ? 25 : 10,
    },
    corroborations,
    timeline,
    complaintPacket: issue.complaintPacket ? {
      subject: issue.complaintPacket.subject,
      recipient: issue.complaintPacket.recipientDepartment,
      body: issue.complaintPacket.formalBody,
      generatedAt: issue.complaintPacket.generatedAt,
    } : null,
    escalationPacket: issue.escalationPacket ? {
      subject: `URGENT ESCALATION: SLA Breach - ${issue.title}`,
      recipient: issue.departmentRoute.escalationLabel,
      body: issue.escalationPacket.formalBody,
      generatedAt: issue.escalationPacket.generatedAt,
    } : null,
    resolutionReasoning: issue.resolutionVerification?.forensicReasoning || null,
    resolvedAt: issue.status === "verified_resolved" ? issue.reportedAt : null,
    authorityLastSeenAt: null,
  };
}

export function mapCaseToIssue(c: CivicCase): CivicIssue {
  let mappedCategory: any = "road_damage";
  if (c.category === "Water Overflow") {
    mappedCategory = "water_leakage";
  } else if (c.category === "Pothole & Road Damage") {
    mappedCategory = "road_damage";
  } else if (c.category === "Garbage Dump") {
    mappedCategory = "waste_management";
  } else if (c.category === "Power Line Danger" || c.category === "Traffic & Footpath Obstruction") {
    mappedCategory = "streetlight";
  }

  let mappedStatus: any = "routed";
  if (c.status === "RESOLVED") {
    mappedStatus = "verified_resolved";
  } else if (c.status === "BREACHED") {
    mappedStatus = "overdue";
  } else if (c.status === "ROUTED") {
    mappedStatus = "routed";
  }

  const corroborations = (c.corroborations || []).map((corr) => ({
    id: corr.id,
    reportedAt: corr.filedAt,
    citizenNote: corr.text,
    contributorName: corr.contributorName,
    imageDataUrl: corr.additionalPhotoUrl,
  }));

  const timeline = (c.timeline || []).map((ev) => ({
    id: ev.id,
    timestamp: ev.timestamp,
    label: ev.title,
    description: ev.description,
    type: (ev.type === "file" ? "report_submitted" :
           ev.type === "route" ? "department_routed" :
           ev.type === "corroborate" ? "corroborate_added" :
           ev.type === "breach" ? "silence_detected" :
           ev.type === "resolve" ? "resolution_checked" : "report_submitted") as any,
    actor: ev.actorName === "Citizen" ? "citizen" : "system" as any,
  }));

  return {
    id: c.id,
    title: c.title,
    category: mappedCategory,
    status: mappedStatus,
    severity: c.harmScore >= 80 ? "critical" : c.harmScore >= 50 ? "high" : "medium",
    harmScore: c.harmScore,
    locationName: c.gps.address || "Reported Location",
    latitude: c.gps.latitude,
    longitude: c.gps.longitude,
    reportedAt: c.filedAt,
    lastMeaningfulActionAt: c.filedAt,
    slaDays: c.category === "Power Line Danger" ? 3 : 7,
    departmentRoute: {
      departmentId: "bbmp_routed",
      departmentName: c.department,
      slaDays: c.category === "Power Line Danger" ? 3 : 7,
      escalationLabel: "Chief Commissioner Desk",
      routeReason: "Mapped from category",
      confidence: 0.95,
    },
    riskFactors: [],
    evidence: {
      photoUrl: c.photoUrl,
      description: c.description,
      voiceTranscript: c.voiceTranscript,
    },
    corroborations,
    timeline,
    complaintPacket: c.complaintPacket ? {
      subject: c.complaintPacket.subject,
      recipientDepartment: c.complaintPacket.recipient,
      formalBody: c.complaintPacket.body,
      generatedAt: c.complaintPacket.generatedAt,
      evidenceSummary: c.description,
      citizenImpact: "Public safety hazard",
      requestedAction: "Immediate site repair",
      tone: "urgent",
    } as any : undefined,
    escalationPacket: c.escalationPacket ? {
      escalationReason: "Silence SLA Breach",
      daysSilent: 7,
      slaBreached: true,
      unresolvedEvidence: [],
      communityCorroborationSummary: "",
      formalBody: c.escalationPacket.body,
      generatedAt: c.escalationPacket.generatedAt,
    } as any : undefined,
  };
}
