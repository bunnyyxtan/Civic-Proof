// app/api/demo/seed-cases/route.ts
// Programmatic database hydration endpoint for developer testing and demo safety

import { NextRequest, NextResponse } from "next/server";
import { getCaseRepository, getPersistenceMetadata } from "@/src/lib/repositories/repositoryFactory";
import { CivicIssue } from "@/src/lib/civic/types";

const SEED_ISSUES: CivicIssue[] = [
  {
    id: "CP-ROAD-P80E1",
    title: "Severe Crater Pothole on 12th Main Road",
    category: "road_damage",
    status: "routed",
    severity: "high",
    harmScore: 68,
    locationName: "12th Main Road, Indiranagar, Bengaluru",
    latitude: 12.9716,
    longitude: 77.6412,
    reportedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    lastMeaningfulActionAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    slaDays: 7,
    departmentRoute: {
      departmentId: "bbmp_road",
      departmentName: "Bruhat Bengaluru Mahanagara Palike (BBMP) - Road Infrastructure Dept",
      slaDays: 7,
      escalationLabel: "BBMP Chief Commissioner Desk",
      routeReason: "Automated routing mapped to pothole and surface defects category.",
      confidence: 0.98,
    },
    riskFactors: ["Vehicle Swerving", "Low Night Visibility", "Scooter Danger"],
    evidence: {
      photoUrl: "https://picsum.photos/seed/pothole/600/400",
      description: "Huge structural asphalt crater right in front of the active intersection. Two-wheelers have to veer dangerously into oncoming traffic to avoid it. Depth is about 15cm and width is over 1 meter.",
    },
    corroborations: [
      {
        id: "CORR-001",
        reportedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        contributorName: "Arjun Rao (Original Reporter)",
        citizenNote: "First detected on my morning ride.",
      },
      {
        id: "CORR-002",
        reportedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        contributorName: "Priya Nair",
        citizenNote: "Nearly slipped my scooter here last night under low streetlights. Extremely deep!",
      }
    ],
    timeline: [
      {
        id: "EV-001",
        type: "report_submitted",
        label: "Case Evidence Filed",
        description: "Citizen report logged with on-site geotagged photo proof and automated severity evaluation.",
        timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        actor: "citizen",
      },
      {
        id: "EV-002",
        type: "department_routed",
        label: "Routed to BBMP Division",
        description: "Deterministic routing matrix routed the file to the BBMP Road Infrastructure Department.",
        timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        actor: "system",
      },
      {
        id: "EV-003",
        type: "corroboration_added",
        label: "Corroborated by Priya N.",
        description: "Neighborhood verification added: Impact level confirmed. Harm score scaled from 54 → 68.",
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        actor: "community",
      }
    ],
  },
  {
    id: "CP-POWE-B44E8",
    title: "Exposed BESCOM Cable Near Play School",
    category: "streetlight", // Map power Danger to streetlight or custom
    status: "overdue",
    severity: "critical",
    harmScore: 95,
    locationName: "6th Cross Road, Indiranagar, Bengaluru",
    latitude: 12.9752,
    longitude: 77.6438,
    reportedAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
    lastMeaningfulActionAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    slaDays: 3,
    departmentRoute: {
      departmentId: "bescom_power",
      departmentName: "Bangalore Electricity Supply Company (BESCOM)",
      slaDays: 3,
      escalationLabel: "BESCOM Executive Engineer",
      routeReason: "High-tension exposed cable detected near active pedestrian area.",
      confidence: 0.99,
    },
    riskFactors: ["Electrocution Risk", "Wet Soil Zone", "Children Proximity"],
    evidence: {
      photoUrl: "https://picsum.photos/seed/cable/600/400",
      description: "Heavy high-tension power line has slipped off the pole clamp and is hanging loose at face height right near the Kids Academy entrance. Soil around the pole is waterlogged due to heavy rains.",
    },
    corroborations: [
      {
        id: "CORR-003",
        reportedAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
        contributorName: "Sarah Thomas",
      },
      {
        id: "CORR-004",
        reportedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
        contributorName: "Manjunath S.",
        citizenNote: "This is a disaster waiting to happen. Little toddlers walk right past this hanging wire every morning.",
      },
      {
        id: "CORR-005",
        reportedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        contributorName: "Vikram Sen",
        citizenNote: "Hanging loose under wet trees. Sparks visible during heavy wind.",
      }
    ],
    timeline: [
      {
        id: "EV-004",
        type: "report_submitted",
        label: "Emergency Case Filed",
        description: "Citizen Sarah Thomas surfaced exposed power cable. Extreme hazard flag enabled.",
        timestamp: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
        actor: "citizen",
      },
      {
        id: "EV-005",
        type: "department_routed",
        label: "Routed to BESCOM Central Desk",
        description: "Official routing dispatched file to BESCOM Ward 59 Sub-Division.",
        timestamp: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
        actor: "system",
      },
      {
        id: "EV-006",
        type: "corroboration_added",
        label: "Corroborated by Manjunath S.",
        description: "Impact confirmed: Hazard is adjacent to commercial kids' play school.",
        timestamp: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
        actor: "community",
      },
      {
        id: "EV-007",
        type: "silence_detected",
        label: "SLA Silence Breach Detected",
        description: "Silence Clock crossed 3-day milestone without department acknowledgment. Case flag shifted to BREACHED.",
        timestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
        actor: "system",
      }
    ],
  },
  {
    id: "CP-WATE-G15A3",
    title: "Blackwater Sewage Overflow outside Metro Station",
    category: "water_leakage",
    status: "verified_resolved",
    severity: "high",
    harmScore: 82,
    locationName: "Indiranagar Metro Station, CMH Road, Indiranagar, Bengaluru",
    latitude: 12.9698,
    longitude: 77.6395,
    reportedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    lastMeaningfulActionAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    slaDays: 5,
    departmentRoute: {
      departmentId: "bwssb_water",
      departmentName: "Bangalore Water Supply and Sewerage Board (BWSSB)",
      slaDays: 5,
      escalationLabel: "BWSSB Engineer Desk",
      routeReason: "Sewer main rupture flooding public thoroughfare.",
      confidence: 0.95,
    },
    riskFactors: ["Pedestrian Obstruction", "Biohazard Flood", "High Traffic Hub"],
    evidence: {
      photoUrl: "https://picsum.photos/seed/sewage/600/400",
      description: "Sanitary sewer manhole has ruptured. Black raw sewage with strong odor flooding CMH road footpath and entry stairs of Indiranagar Metro Station.",
    },
    corroborations: [
      {
        id: "CORR-007",
        reportedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        contributorName: "Adil Khan",
      },
      {
        id: "CORR-008",
        reportedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
        contributorName: "Karan Johar",
        citizenNote: "Pedestrians can't even enter the metro station without stepping in blackwater.",
      }
    ],
    timeline: [
      {
        id: "EV-008",
        type: "report_submitted",
        label: "Sewerage Overflow Filed",
        description: "Adil Khan filed blackwater sanitary breach.",
        timestamp: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        actor: "citizen",
      },
      {
        id: "EV-009",
        type: "department_routed",
        label: "Routed to BWSSB Central Sewerage Desk",
        description: "File routed to BWSSB Sanitary Engineering Division.",
        timestamp: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        actor: "system",
      },
      {
        id: "EV-010",
        type: "case_created",
        label: "Official Site Inspection",
        description: "BWSSB assistant engineer inspected repair scope.",
        timestamp: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000).toISOString(),
        actor: "department",
      },
      {
        id: "EV-011",
        type: "resolution_checked",
        label: "Sewer Main Repaired",
        description: "Sanitation crew replaced sub-surface pipes, sealed concrete slabs, and disinfected surface.",
        timestamp: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
        actor: "community",
      }
    ],
    resolutionVerification: {
      beforeImageObservations: ["Heavy surface blackwater flooding"],
      afterImageObservations: ["Asphalt is dry, clean concrete slab poured"],
      repairLikely: true,
      confidence: 0.98,
      remainingConcerns: [],
      recommendedStatus: "verified_resolved",
      forensicReasoning: "Before/after comparative inspection shows water leak completely plugged, concrete structure fully replaced, and adjacent sidewalk bleached dry.",
    }
  }
];

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const allowSeed = url.searchParams.get("allow_seed_emergency") === "true";

    if (!allowSeed) {
      return NextResponse.json({
        ok: false,
        error: {
          code: "DEMO_SEEDING_DISABLED_BY_DEFAULT",
          message: "Demo seeding is disabled for the normal app. Use /demo for judge story mode."
        }
      }, { status: 403 });
    }

    const repository = getCaseRepository();
    const meta = getPersistenceMetadata();
    const repoType = meta.persistence.includes("firestore") ? "firestore" : "mock";
    const overwrite = url.searchParams.get("overwrite") === "true";

    const existing = await repository.listCases();
    if (existing.length > 0 && !overwrite) {
      return NextResponse.json({
        ok: true,
        data: {
          repository: repoType,
          seededCount: 0,
          existingCount: existing.length,
          message: "Database already contains records. Seeding skipped. Pass ?overwrite=true to clear/overwrite.",
        }
      });
    }

    // Write issues sequentially
    const createdIssues: CivicIssue[] = [];
    for (const issue of SEED_ISSUES) {
      const issueWithOrigin = { ...issue, dataOrigin: "judge_demo" as const };
      const created = await repository.createCase(issueWithOrigin);
      createdIssues.push(created);
    }

    return NextResponse.json({
      ok: true,
      success: true,
      data: {
        repository: repoType,
        seededCount: createdIssues.length,
        existingCount: existing.length,
        message: `Database seeded successfully with ${createdIssues.length} case documents!`,
      }
    });
  } catch (err: any) {
    console.error("GET /api/demo/seed-cases failed:", err);
    return NextResponse.json(
      {
        ok: false,
        error: err.message || "Failed to seed default database files.",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const body = await req.json().catch(() => ({}));
    const allowSeed = url.searchParams.get("allow_seed_emergency") === "true" || body.allow_seed_emergency === true;

    if (!allowSeed) {
      return NextResponse.json({
        ok: false,
        error: {
          code: "DEMO_SEEDING_DISABLED_BY_DEFAULT",
          message: "Demo seeding is disabled for the normal app. Use /demo for judge story mode."
        }
      }, { status: 403 });
    }

    const repository = getCaseRepository();
    const meta = getPersistenceMetadata();
    const repoType = meta.persistence.includes("firestore") ? "firestore" : "mock";
    const { overwrite = false } = body;

    const existing = await repository.listCases();
    if (existing.length > 0 && !overwrite) {
      return NextResponse.json({
        ok: true,
        data: {
          repository: repoType,
          seededCount: 0,
          existingCount: existing.length,
          message: "Database already contains records. Seeding skipped. Set { overwrite: true } to clear and overwrite.",
        }
      });
    }

    // Write issues sequentially
    const createdIssues: CivicIssue[] = [];
    for (const issue of SEED_ISSUES) {
      const issueWithOrigin = { ...issue, dataOrigin: "judge_demo" as const };
      const created = await repository.createCase(issueWithOrigin);
      createdIssues.push(created);
    }

    return NextResponse.json({
      ok: true,
      success: true,
      data: {
        repository: repoType,
        seededCount: createdIssues.length,
        existingCount: existing.length,
        message: `Database seeded successfully with ${createdIssues.length} case documents!`,
      }
    });
  } catch (err: any) {
    console.error("POST /api/demo/seed-cases failed:", err);
    return NextResponse.json(
      {
        ok: false,
        error: err.message || "Failed to seed default database files.",
      },
      { status: 500 }
    );
  }
}
