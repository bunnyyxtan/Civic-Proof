// src/lib/demo/judgeDemoData.ts
// Isolated demo/judge data for the CivicProof /demo experience.
// This is strictly forbidden from being imported by the normal user application.

import { CivicIssue } from "../civic/types";

export const JUDGE_DEMO_CASES: CivicIssue[] = [
  {
    id: "CP-ROAD-72A8B",
    title: "Severe Crater Pothole on 12th Main Road",
    category: "road_damage",
    status: "routed",
    severity: "high",
    harmScore: 68,
    locationName: "12th Main Road, 4th Cross, Indiranagar, Bengaluru",
    latitude: 12.9716,
    longitude: 77.6412,
    reportedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    lastMeaningfulActionAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    slaDays: 7,
    departmentRoute: {
      departmentId: "BBMP_ROAD_INFRA",
      departmentName: "Bruhat Bengaluru Mahanagara Palike (BBMP) - Road Infrastructure Dept",
      slaDays: 7,
      escalationLabel: "Chief Engineer (Road Infrastructure)",
      routeReason: "Automated routing mapped to BBMP road repair cells.",
      confidence: 0.98,
    },
    riskFactors: ["Two-wheeler crash risk", "High pedestrian traffic junction", "Low night light visibility"],
    evidence: {
      photoUrl: "https://picsum.photos/seed/pothole/600/400",
      description: "Huge structural asphalt crater right in front of the active intersection. Depth ~15cm and width over 1 meter.",
    },
    corroborations: [
      {
        id: "CORR-ROAD-01",
        reportedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        citizenNote: "Initial submission verified by photo proof",
        contributorName: "Arjun Rao (Original Reporter)",
      },
      {
        id: "CORR-ROAD-02",
        reportedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        citizenNote: "Nearly slipped my scooter here last night under low streetlights. Extremely deep!",
        contributorName: "Priya Nair",
      }
    ],
    timeline: [
      {
        id: "EV-ROAD-01",
        type: "report_submitted",
        label: "Evidence Submitted",
        description: "Citizen report logged with on-site geotagged photo proof.",
        timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        actor: "citizen",
      },
      {
        id: "EV-ROAD-02",
        type: "department_routed",
        label: "Routed to Department",
        description: "Routed to BBMP Road Infrastructure division under standard 7-day SLA.",
        timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        actor: "system",
      },
      {
        id: "EV-ROAD-03",
        type: "corroboration_added",
        label: "Neighbor Corroborated",
        description: "Priya Nair verified the pothole hazard. Harm score scaled to 68.",
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        actor: "community",
      }
    ],
  },
  {
    id: "CP-WATR-34B9C",
    title: "Critical Open Drain near School",
    category: "water_leakage",
    status: "overdue",
    severity: "critical",
    harmScore: 88,
    locationName: "Indiranagar 100ft Road, opposite Government Primary School",
    latitude: 12.9716,
    longitude: 77.5946,
    reportedAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
    lastMeaningfulActionAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
    slaDays: 2,
    departmentRoute: {
      departmentId: "BWSSB_WATER_SUPPLY",
      departmentName: "Bangalore Water Supply and Sewerage Board (BWSSB)",
      slaDays: 2,
      escalationLabel: "Chief Engineer (Maintenance & Sewerage)",
      routeReason: "Stormwater drain blockages routed to BWSSB engineering cell.",
      confidence: 0.99,
    },
    riskFactors: ["school children nearby", "pedestrian fall risk", "mosquito breeding risk", "contamination risk"],
    evidence: {
      photoUrl: "https://picsum.photos/seed/drain/600/400",
      description: "Extremely severe open drain right next to the school entrance. Standing water and mosquitoes everywhere.",
    },
    corroborations: [
      {
        id: "CORR-WATR-01",
        reportedAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
        citizenNote: "Extreme open drain posing severe school safety danger.",
        contributorName: "Sarah Thomas",
      }
    ],
    timeline: [
      {
        id: "EV-WATR-01",
        type: "report_submitted",
        label: "Evidence Submitted",
        description: "Citizen Sarah Thomas surfaced exposed open drain near primary school entrance.",
        timestamp: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
        actor: "citizen",
      },
      {
        id: "EV-WATR-02",
        type: "department_routed",
        label: "Routed to BWSSB Sewerage Desk",
        description: "Routed to BWSSB Sanitary Engineering Division with 2-day priority SLA.",
        timestamp: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
        actor: "system",
      },
      {
        id: "EV-WATR-03",
        type: "silence_detected",
        label: "SLA Breach Detected",
        description: "Silence Clock crossed 2-day milestone without department acknowledgment. Case flag shifted to OVERDUE.",
        timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        actor: "system",
      }
    ],
  }
];
