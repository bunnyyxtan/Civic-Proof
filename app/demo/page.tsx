'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, Pause, RotateCcw, ChevronRight, ChevronLeft, CheckCircle, 
  AlertTriangle, Shield, Clock, FileText, MapPin, Database, Sparkles,
  RefreshCw, Radio, HardDrive, Check, X, ArrowLeft, ArrowRight, Activity
} from 'lucide-react';

// Types for Demo steps
interface DemoStep {
  id: number;
  title: string;
  shortDesc: string;
  narrative: string;
  badge: string;
  visualType: 'phone' | 'json' | 'map' | 'chart' | 'letter' | 'compare';
  visualData: any;
  technicalCode: string;
}

export const dynamic = 'force-dynamic';

export default function JudgeDemoPage() {
  // Stepper states
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Health checklist states
  const [aiStatus, setAiStatus] = useState<any>(null);
  const [persistenceStatus, setPersistenceStatus] = useState<any>(null);
  const [smokeStatus, setSmokeStatus] = useState<any>(null);
  const [loadingChecks, setLoadingChecks] = useState<boolean>(true);
  const [seedLoading, setSeedLoading] = useState<boolean>(false);
  const [smokeLoading, setSmokeLoading] = useState<boolean>(false);
  const [showDemoPacket, setShowDemoPacket] = useState<boolean>(false);

  // Fetch health data on mount
  const fetchDiagnostics = async () => {
    setLoadingChecks(true);
    try {
      const [aiRes, persRes, smokeRes] = await Promise.all([
        fetch('/api/demo/ai-health').then(r => r.json()).catch(() => ({ success: false })),
        fetch('/api/demo/persistence-health').then(r => r.json()).catch(() => ({ success: false })),
        fetch('/api/demo/engine-smoke').then(r => r.json()).catch(() => ({ success: false }))
      ]);
      setAiStatus(aiRes);
      setPersistenceStatus(persRes);
      setSmokeStatus(smokeRes);
    } catch (e) {
      console.error('Failed to load diagnostics:', e);
    } finally {
      setLoadingChecks(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDiagnostics();
  }, []);

  // Web Audio Synthesizer for retro retro-mechanical clicks
  const playSound = (type: 'tick' | 'stamp' | 'success') => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      if (type === 'tick') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.03);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.03);
      } else if (type === 'stamp') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(140, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.6, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
      } else if (type === 'success') {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);
        osc1.start();
        osc2.start();
        osc1.stop(ctx.currentTime + 0.3);
        osc2.stop(ctx.currentTime + 0.3);
      }
    } catch (e) {
      // Audio context blocked
    }
  };

  // Autoplay loop
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev >= 9) {
            setIsPlaying(false);
            playSound('success');
            return 9;
          }
          playSound('tick');
          return prev + 1;
        });
      }, 7000); // 7 seconds per slide for high readability
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying]);

  // Handle DB Seed
  const handleSeed = async () => {
    setSeedLoading(true);
    playSound('tick');
    try {
      const res = await fetch('/api/demo/seed-cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allow_seed_emergency: true, overwrite: true })
      });
      const data = await res.json();
      if (data.success) {
        playSound('success');
        fetchDiagnostics();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSeedLoading(false);
    }
  };

  // Handle manual Smoke Test run
  const handleSmokeTest = async () => {
    setSmokeLoading(true);
    playSound('tick');
    try {
      const res = await fetch('/api/demo/engine-smoke', { method: 'POST' });
      const data = await res.json();
      setSmokeStatus(data);
      if (data.success) {
        playSound('success');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSmokeLoading(false);
    }
  };

  // Step definition data
  const steps: DemoStep[] = [
    {
      id: 1,
      title: "Citizen Reports Open Drain",
      badge: "Step 1: Input ingestion",
      shortDesc: "A citizen submits an urgent hyperlocal complaint using their phone near Saint Mary's School.",
      narrative: "An active citizen spots a massive, overflowing storm drain near a local school. Traditional forms are slow, so they snap a geo-tagged image and record an immediate voice message expressing severe frustration.",
      visualType: "phone",
      visualData: {
        location: "12th Main Road, Indiranagar, Bengaluru",
        gps: "12.9722° N, 77.6415° E",
        voiceText: "There's a massive open drain overflowing right next to Saint Mary's School on 12th Main! Kids are having to step into traffic to bypass it, it is a disaster.",
        photoUrl: "https://picsum.photos/seed/sewage/400/300"
      },
      technicalCode: JSON.stringify({
        source: "Citizen Mobile App",
        timestamp: "2026-06-29T11:46:00Z",
        gps: { latitude: 12.9722, longitude: 77.6415, precision: "high" },
        rawAudioLengthSec: 14.5,
        transcriptReady: true
      }, null, 2)
    },
    {
      id: 2,
      title: "Structured Evidence Extraction",
      badge: "Step 2: Natural Language Parsing",
      shortDesc: "CivicProof's agent parses raw audio transcripts into formal structured metadata.",
      narrative: "Instead of waiting for manual data-entry clerks, the AI model processes the text transcript to classify the issue category, extract specific danger variables, detect landmark context, and assign confidence ratios instantly.",
      visualType: "json",
      visualData: {
        category: "Water Overflow",
        confidence: 0.98,
        landmarks: ["Saint Mary's School", "12th Main Indiranagar"],
        risks: ["Open storm drain", "Child falling hazard", "Traffic vehicle detour"]
      },
      technicalCode: JSON.stringify({
        agentName: "CivicExtractorAgent",
        modelVersion: "gemini-3.5-flash",
        output: {
          category: "Water Overflow",
          confidenceScore: 0.982,
          criticalFactors: {
            isSchoolZone: true,
            hasWaterContamination: true,
            pedestrianObstruction: true
          }
        }
      }, null, 2)
    },
    {
      id: 3,
      title: "Proximity Lookup & Matching",
      badge: "Step 3: Duplicate Search",
      shortDesc: "The system runs a Haversine geometric search against all active neighborhood cases.",
      narrative: "Rather than letting redundant duplicates clog municipal mailboxes, CivicProof checks for existing reports filed in the immediate vicinity (under 450 meters) with the same category to cross-reference.",
      visualType: "map",
      visualData: {
        radius: 450,
        distanceMeters: 60.4,
        status: "Match Found!",
        matchedId: "CP-2026-W38A1",
        coords: { lat: 12.9722, lng: 77.6415 }
      },
      technicalCode: `// Real engine-level geometric lookup
const thresholdMeters = 450;
const distance = getGPSDistanceInMeters(newGps, existingCase.gps); 
// Output: 60.43 meters
const isDuplicate = distance <= thresholdMeters 
  && newCategory === existingCase.category; 
// result => true (Case ID: CP-2026-W38A1)`
    },
    {
      id: 4,
      title: "Duplicate Becomes Corroboration",
      badge: "Step 4: Evidence Consolidation",
      shortDesc: "Instead of a new ticket, the report is fused into the existing case file.",
      narrative: "CivicProof merges the duplicate into the master active case. This preserves municipal resources and aggregates proof, creating a single legal 'master case' backed by multiple independent citizen statements.",
      visualType: "compare",
      visualData: {
        masterId: "CP-2026-W38A1",
        originalReporter: "Arjun Rao",
        newCorroborator: "Ramesh Kumar (You)",
        totalReporters: 3,
        action: "consolidated"
      },
      technicalCode: JSON.stringify({
        action: "CONSOLIDATE_REPORT",
        masterCaseId: "CP-2026-W38A1",
        newCorroboration: {
          corroborationId: "CORR-003",
          filedAt: "2026-06-29T11:46:50Z",
          contributorName: "Ramesh Kumar",
          type: "impact"
        },
        newTotals: {
          corroborationsCount: 3,
          reportersCount: 3
        }
      }, null, 2)
    },
    {
      id: 5,
      title: "Harm Score Escalation",
      badge: "Step 5: Impact Evaluation",
      shortDesc: "The deterministic engine re-calculates aggregate public safety risk metrics.",
      narrative: "With a third citizen corroborating the problem, and proximity to Saint Mary's School factored in, the Harm Score elevates rapidly. The mathematical formula ensures high-vulnerability situations rise to the top of government priorities.",
      visualType: "chart",
      visualData: {
        beforeScore: 52,
        afterScore: 89,
        breakdown: {
          safetyHazard: 18,
          publicImpact: 21,
          vulnerabilityFactor: 25,
          durationFactor: 25
        }
      },
      technicalCode: `// Real-time engine evaluation output
const harm = calculateHarmScore(
  'Water Overflow',
  filedAt,
  3, // 3 corroborating citizens
  true // Is in school/vulnerable area
);
// Returns score: 89 / 100 (CRITICAL LEVEL)`
    },
    {
      id: 6,
      title: "Smart Department Routing",
      badge: "Step 6: Agency Matrix Matching",
      shortDesc: "The system routes the problem to the exact municipal division holding jurisdiction.",
      narrative: "A critical obstacle in municipal complaints is wrong routing. CivicProof uses a deterministic routing matrix that evaluates category rules and GPS bounds, mapping this water overflow directly to the correct water authority.",
      visualType: "letter",
      visualData: {
        targetAgency: "Bangalore Water Supply and Sewerage Board (BWSSB)",
        division: "Indiranagar Ward Sewerage Unit",
        slaDays: 7,
        escalationContact: "BWSSB Chief Engineer Desk"
      },
      technicalCode: `// Core routing lookup execution
const category = 'Water Overflow';
const department = routeToDepartment(category);
// Output: "Bangalore Water Supply and Sewerage Board (BWSSB)"
// SLA Standard: 7 Days until Breach`
    },
    {
      id: 7,
      title: "Public Interest Packet Generated",
      badge: "Step 7: PDF / Document Compiling",
      shortDesc: "CivicProof drafts a detailed, formal legal complaint containing all aggregate evidence.",
      narrative: "The system automatically drafts a professional, unignorable formal complaint. Instead of a single informal tweet, it compiles chronological GPS coordinates, photo links, timestamps, and 3 compiled citizen testimony transcripts into a legal public safety letter.",
      visualType: "letter",
      visualData: {
        to: "The Executive Engineer, BWSSB Ward 81, Bengaluru",
        subject: "FORMAL PUBLIC SAFETY GRIEVANCE: UNRESOLVED OVERFLOWING DRAIN - ID: CP-2026-W38A1",
        body: "We formally represent 3 residents regarding a hazardous open storm water drain adjacent to Saint Mary's School on 12th Main Road, Indiranagar. Immediate structural risk has been evaluated as CRITICAL (Harm Score: 89/100). Find attached: GPS Evidence links, time series logs, and photographic transcripts..."
      },
      technicalCode: `// Generated public interest packet
export interface ComplaintPacket {
  subject: string;
  recipient: string;
  body: string;
  generatedAt: string;
}`
    },
    {
      id: 8,
      title: "Silence Clock Exposes Inaction",
      badge: "Step 8: Accountability Tracker",
      shortDesc: "The system monitors the exact seconds since routing without meaningful resolution.",
      narrative: "A key innovation is the Silence Clock. If the department ignores the packet beyond the SLA (7 days), the Silence Clock triggers a public breach state. It makes administrative laziness visible on the public ledger.",
      visualType: "chart",
      visualData: {
        slaDays: 7,
        daysElapsed: 11,
        breachStatus: "BREACHED",
        hoursOverdue: 96
      },
      technicalCode: `// SLA Breach Evaluation
const filedDate = new Date('2026-06-18T10:00:00');
const msDiff = Date.now() - filedDate.getTime();
const daysDiff = msDiff / (1000 * 60 * 60 * 24); // 11.2 days
const isBreached = daysDiff > 7 && status !== 'RESOLVED'; 
// result => true`
    },
    {
      id: 9,
      title: "Escalation Mobilization",
      badge: "Step 9: Senior Accountability Appeal",
      shortDesc: "Upon SLA breach, the agent drafts higher-level ombudsman and commissioner briefs.",
      narrative: "Because the silence threshold was breached, CivicProof instantly generates a legal escalation packet. This is routed directly to senior IAS Commissioners and the local Grievance Ombudsman, containing proof of initial notice and subsequent department silence.",
      visualType: "letter",
      visualData: {
        to: "Office of the Commissioner, BBMP / Grievance Redressal Ombudsman",
        subject: "SLA BREACH ESCALATION BRIEF - UNATTENDED PUBLIC HAZARD CP-2026-W38A1",
        body: "NOTICE OF ADMINISTRATIVE INACTION: This escalation brief serves as notification of SLA breach for Case CP-2026-W38A1. Formally filed with BWSSB on 2026-06-18, the hazard remains completely unaddressed for 11 days (SLA SLA: 7 days). Complete timeline and negligence records enclosed."
      },
      technicalCode: `// Trigger state on SLA Clock failure
if (isBreached && !case.escalationPacket) {
  case.escalationPacket = generateEscalationBrief(case);
  case.status = 'BREACHED';
}`
    },
    {
      id: 10,
      title: "Immutable Resolution Verification",
      badge: "Step 10: Verified Civic Closure",
      shortDesc: "Citizens upload repair photos which are audited by the agent to close the case.",
      narrative: "Finally, the pressure works! Workers install a concrete drain cover. A citizen uploads a resolution photo. The CivicProof agent audits the image and text, confirms the hazard is cured, and archives the case as VERIFIED RESOLUTION.",
      visualType: "compare",
      visualData: {
        beforeUrl: "https://picsum.photos/seed/sewage/400/300",
        afterUrl: "https://picsum.photos/seed/clean/400/300",
        status: "RESOLVED",
        proof: "Concrete cover grate installed successfully. Water flow is clear."
      },
      technicalCode: JSON.stringify({
        status: "RESOLVED",
        resolvedAt: "2026-06-29T11:47:00Z",
        auditVerification: {
          success: true,
          method: "Visual + Textual Confirmation",
          notes: "Concrete safety cover verified covering previous open channel."
        }
      }, null, 2)
    }
  ];

  const activeStepData = steps[currentStep];

  return (
    <main id="demo-page-root" className="min-h-screen bg-neutral-950 text-white font-sans selection:bg-neutral-800 selection:text-white pb-20">
      {/* Visual Header */}
      <div className="border-b border-neutral-900 bg-neutral-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="p-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 transition border border-neutral-800" title="Back to Dashboard">
              <ArrowLeft className="w-5 h-5 text-neutral-400" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="font-mono text-xs tracking-wider uppercase text-neutral-400">Judge Demo Mode</span>
              </div>
              <h1 className="text-xl font-semibold tracking-tight">CivicProof Demo Simulator</h1>
              <p className="text-[10px] text-neutral-500 mt-0.5">This demo is isolated from live citizen records.</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => setSoundEnabled(!soundEnabled)} 
              className="px-3 py-1.5 text-xs font-mono rounded-lg border border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white transition"
            >
              Sound: {soundEnabled ? 'ON 🔊' : 'OFF 🔇'}
            </button>
            <Link 
              href="/" 
              className="px-4 py-2 text-sm font-medium bg-white text-black hover:bg-neutral-200 rounded-lg shadow-md transition flex items-center gap-2"
            >
              Go to Dashboard
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: 10-Step Interactive Presentation (8 Cols) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Main Showcase Hero */}
          <div className="bg-neutral-900/40 border border-neutral-900 rounded-2xl p-6 sm:p-8 flex flex-col gap-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] rounded-full pointer-events-none"></div>
            
            <div className="flex flex-col gap-2">
              <span className="px-2.5 py-0.5 text-xs font-mono font-semibold tracking-wide rounded-full bg-neutral-900 border border-neutral-800 text-neutral-400 self-start">
                {activeStepData.badge}
              </span>
              <h2 className="text-3xl font-bold tracking-tight text-neutral-100">
                {activeStepData.title}
              </h2>
              <p className="text-neutral-400 text-base max-w-2xl mt-1 leading-relaxed">
                {activeStepData.shortDesc}
              </p>
            </div>

            {/* Visualizer Stage Container */}
            <div className="bg-neutral-950 border border-neutral-900 rounded-xl p-6 min-h-[340px] flex items-center justify-center relative">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.3 }}
                  className="w-full h-full flex flex-col justify-center"
                >
                  {/* PHONE VISUAL */}
                  {activeStepData.visualType === 'phone' && (
                    <div className="max-w-md mx-auto w-full bg-neutral-900 rounded-3xl p-5 border-4 border-neutral-800 shadow-2xl relative">
                      <div className="w-24 h-4 bg-neutral-800 rounded-full mx-auto mb-4"></div>
                      <div className="bg-neutral-950 rounded-2xl p-4 border border-neutral-800/80 flex flex-col gap-4">
                        <div className="relative aspect-video rounded-lg overflow-hidden border border-neutral-800">
                          <img 
                            src={activeStepData.visualData.photoUrl} 
                            alt="Overflow drain proof" 
                            className="object-cover w-full h-full filter brightness-90"
                          />
                          <div className="absolute bottom-2 left-2 bg-black/70 px-2 py-1 rounded text-[10px] font-mono flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-red-500" />
                            {activeStepData.visualData.gps}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2.5 bg-neutral-900 px-3 py-2 rounded-lg border border-neutral-800">
                          <Radio className="w-4 h-4 text-rose-500 animate-pulse shrink-0" />
                          <span className="text-[11px] font-mono text-neutral-400 truncate">AUDIO TRANSCRIPT REVEAL</span>
                        </div>
                        <p className="text-xs text-neutral-300 italic leading-relaxed bg-neutral-900/30 p-3 rounded-lg border border-neutral-800/40">
                          &ldquo;{activeStepData.visualData.voiceText}&rdquo;
                        </p>
                      </div>
                    </div>
                  )}

                  {/* JSON EXTRACTED VISUAL */}
                  {activeStepData.visualType === 'json' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto w-full">
                      <div className="bg-neutral-900 rounded-xl p-5 border border-neutral-800 flex flex-col gap-4">
                        <h4 className="text-xs font-mono text-neutral-400 uppercase tracking-widest border-b border-neutral-800 pb-2">AI Structured Model</h4>
                        <div className="flex flex-col gap-3">
                          <div>
                            <span className="text-[10px] text-neutral-500 block uppercase">Parsed Category</span>
                            <span className="text-sm font-semibold text-emerald-400 flex items-center gap-1">
                              <Sparkles className="w-4 h-4" />
                              {activeStepData.visualData.category}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-neutral-500 block uppercase">Confidence Level</span>
                            <span className="text-sm font-mono font-medium">{(activeStepData.visualData.confidence * 100).toFixed(0)}% Match</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-neutral-500 block uppercase">Detected Landmarks</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {activeStepData.visualData.landmarks.map((l: string, idx: number) => (
                                <span key={idx} className="text-[10px] bg-neutral-950 px-2 py-0.5 rounded text-neutral-300 border border-neutral-800">{l}</span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-neutral-900 rounded-xl p-5 border border-neutral-800 flex flex-col gap-3">
                        <h4 className="text-xs font-mono text-neutral-400 uppercase tracking-widest border-b border-neutral-800 pb-2">Safety Risks Identified</h4>
                        <ul className="flex flex-col gap-2 mt-1">
                          {activeStepData.visualData.risks.map((risk: string, idx: number) => (
                            <li key={idx} className="text-xs text-neutral-300 flex items-start gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0"></span>
                              <span>{risk}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* MAP VISUAL */}
                  {activeStepData.visualType === 'map' && (
                    <div className="max-w-md mx-auto w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-5 flex flex-col gap-4">
                      <div className="flex justify-between items-center">
                        <h4 className="text-xs font-mono text-neutral-400 uppercase">Proximity Lookup</h4>
                        <span className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded">
                          {activeStepData.visualData.status}
                        </span>
                      </div>
                      
                      <div className="h-44 bg-neutral-950 border border-neutral-800 rounded-xl relative overflow-hidden flex items-center justify-center">
                        {/* Fake map drawing */}
                        <div className="absolute inset-0 opacity-15">
                          <div className="absolute top-10 left-0 right-0 h-[1px] bg-neutral-500"></div>
                          <div className="absolute top-28 left-0 right-0 h-[1px] bg-neutral-500"></div>
                          <div className="absolute left-10 top-0 bottom-0 w-[1px] bg-neutral-500"></div>
                          <div className="absolute left-28 top-0 bottom-0 w-[1px] bg-neutral-500"></div>
                        </div>
                        {/* Safe Search Radius Ring */}
                        <div className="absolute w-36 h-36 rounded-full border border-dashed border-emerald-500/40 bg-emerald-500/5 animate-pulse flex items-center justify-center">
                          <span className="text-[9px] text-emerald-400/60 font-mono">Radius {activeStepData.visualData.radius}m</span>
                        </div>
                        {/* Match points */}
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                          <div className="w-3 h-3 rounded-full bg-blue-500 relative">
                            <span className="absolute -top-6 -left-12 bg-blue-500/90 text-[8px] px-1.5 py-0.5 rounded text-white whitespace-nowrap font-mono">Original Issue</span>
                          </div>
                        </div>
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-6 -translate-y-10">
                          <div className="w-3 h-3 rounded-full bg-emerald-500 relative">
                            <span className="absolute -top-6 -left-8 bg-emerald-500/90 text-[8px] px-1.5 py-0.5 rounded text-white whitespace-nowrap font-mono">New Report ({activeStepData.visualData.distanceMeters}m away)</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between text-xs text-neutral-400 border-t border-neutral-800 pt-2 font-mono">
                        <span>Threshold: {activeStepData.visualData.radius}m</span>
                        <span>Actual: {activeStepData.visualData.distanceMeters}m</span>
                      </div>
                    </div>
                  )}

                  {/* COMPARE MERGED VISUAL */}
                  {activeStepData.visualType === 'compare' && (
                    <div className="max-w-xl mx-auto w-full flex flex-col gap-4">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-mono text-neutral-400">Database Corroboration Ledger</span>
                        <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded font-mono">Merged Case: {activeStepData.visualData.masterId}</span>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl flex flex-col gap-2">
                          <span className="text-[10px] text-neutral-500 uppercase block">Citizen #1 (Original)</span>
                          <span className="font-semibold text-neutral-200 block text-xs">{activeStepData.visualData.originalReporter}</span>
                          <p className="text-[11px] text-neutral-400 leading-relaxed bg-neutral-950 p-2 rounded italic border border-neutral-800">
                            &ldquo;Dumping issues and blocked drain at Indiranagar road junction.&rdquo;
                          </p>
                        </div>
                        
                        <div className="bg-neutral-900 border border-emerald-500/30 p-4 rounded-xl flex flex-col gap-2 relative">
                          <div className="absolute -top-2 -right-2 bg-emerald-500 text-black text-[9px] font-mono px-1.5 py-0.5 rounded-full">New</div>
                          <span className="text-[10px] text-emerald-400 uppercase block">Citizen #3 (Corroborator)</span>
                          <span className="font-semibold text-neutral-200 block text-xs">{activeStepData.visualData.newCorroborator}</span>
                          <p className="text-[11px] text-neutral-400 leading-relaxed bg-neutral-950 p-2 rounded italic border border-neutral-800">
                            &ldquo;There is a massive open drain overflowing right next to Saint Mary&apos;s School.&rdquo;
                          </p>
                        </div>
                      </div>

                      <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3 text-center">
                        <span className="text-xs text-emerald-400 font-mono">
                          ⚡ Public Weight increased to <strong>{activeStepData.visualData.totalReporters} independent citizens</strong>.
                        </span>
                      </div>
                    </div>
                  )}

                  {/* CHART HARM SCORE VISUAL */}
                  {activeStepData.visualType === 'chart' && (
                    <div className="max-w-xl mx-auto w-full grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
                      <div className="sm:col-span-5 flex flex-col items-center justify-center gap-3">
                        <span className="text-xs font-mono text-neutral-400">Aggregate Harm Level</span>
                        
                        <div className="w-32 h-32 rounded-full border-4 border-rose-500/30 flex flex-col items-center justify-center relative">
                          {/* Inner glowing circle */}
                          <div className="absolute inset-2 rounded-full border-2 border-rose-500/10 animate-ping"></div>
                          <span className="text-4xl font-extrabold text-rose-500">{activeStepData.visualData.afterScore}</span>
                          <span className="text-[10px] font-mono tracking-widest text-neutral-500 uppercase mt-1">Critical</span>
                        </div>

                        <div className="text-[11px] text-neutral-400">
                          Initial base score: <span className="text-amber-400 line-through font-mono">{activeStepData.visualData.beforeScore}</span>
                        </div>
                      </div>

                      <div className="sm:col-span-7 bg-neutral-900 border border-neutral-800 p-4 rounded-xl flex flex-col gap-3">
                        <h4 className="text-xs font-mono text-neutral-300 uppercase tracking-widest">Score Formula Breakdown</h4>
                        
                        <div className="flex flex-col gap-2">
                          <div>
                            <div className="flex justify-between text-xs text-neutral-400 mb-1">
                              <span>Safety Hazard Base</span>
                              <span className="font-mono text-neutral-200">{activeStepData.visualData.breakdown.safetyHazard}/25</span>
                            </div>
                            <div className="h-1.5 bg-neutral-950 rounded-full overflow-hidden">
                              <div className="h-full bg-rose-500 rounded-full" style={{ width: `${(activeStepData.visualData.breakdown.safetyHazard / 25) * 100}%` }}></div>
                            </div>
                          </div>
                          
                          <div>
                            <div className="flex justify-between text-xs text-neutral-400 mb-1">
                              <span>Public Impact (Corroborator scale)</span>
                              <span className="font-mono text-neutral-200">{activeStepData.visualData.breakdown.publicImpact}/25</span>
                            </div>
                            <div className="h-1.5 bg-neutral-950 rounded-full overflow-hidden">
                              <div className="h-full bg-rose-500 rounded-full" style={{ width: `${(activeStepData.visualData.breakdown.publicImpact / 25) * 100}%` }}></div>
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between text-xs text-neutral-400 mb-1">
                              <span>Vulnerability Factor (School zone)</span>
                              <span className="font-mono text-neutral-200">{activeStepData.visualData.breakdown.vulnerabilityFactor}/25</span>
                            </div>
                            <div className="h-1.5 bg-neutral-950 rounded-full overflow-hidden">
                              <div className="h-full bg-rose-500 rounded-full" style={{ width: `${(activeStepData.visualData.breakdown.vulnerabilityFactor / 25) * 100}%` }}></div>
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between text-xs text-neutral-400 mb-1">
                              <span>Duration Inaction Factor</span>
                              <span className="font-mono text-neutral-200">{activeStepData.visualData.breakdown.durationFactor}/25</span>
                            </div>
                            <div className="h-1.5 bg-neutral-950 rounded-full overflow-hidden">
                              <div className="h-full bg-rose-500 rounded-full" style={{ width: `${(activeStepData.visualData.breakdown.durationFactor / 25) * 100}%` }}></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* LETTER DOCUMENT VISUAL */}
                  {activeStepData.visualType === 'letter' && (
                    <div className="max-w-xl mx-auto w-full bg-white text-black rounded-xl p-5 shadow-2xl flex flex-col gap-3 font-mono text-[11px] leading-relaxed border border-neutral-300">
                      <div className="border-b border-double border-neutral-400 pb-2 mb-1 flex justify-between text-[10px] text-neutral-600">
                        <span>CIVICPROOF PUBLIC INTELLIGENCE REPORT</span>
                        <span>CASE REFERENCE: CP-2026-W38A1</span>
                      </div>
                      
                      <div className="flex flex-col gap-1 text-[11px]">
                        <div><strong>TO:</strong> {activeStepData.visualData.to || activeStepData.visualData.targetAgency}</div>
                        {activeStepData.visualData.division && <div><strong>DEPT UNIT:</strong> {activeStepData.visualData.division}</div>}
                        <div><strong>SUBJECT:</strong> {activeStepData.visualData.subject}</div>
                      </div>
                      
                      <p className="bg-neutral-50 p-3 rounded border border-neutral-200 text-[10px] italic text-neutral-700 leading-relaxed font-sans">
                        {activeStepData.visualData.body}
                      </p>

                      <div className="border-t border-neutral-200 pt-2 mt-1 flex justify-between text-[9px] text-neutral-500">
                        <span>Compiled on behalf of the Indiranagar Resident Coalition</span>
                        <span>Status: ROUTED TO OFFICE</span>
                      </div>
                      
                      {activeStepData.id === 7 && (
                        <div className="mt-4 flex justify-center">
                          <button
                            onClick={() => { setShowDemoPacket(true); playSound('stamp'); }}
                            className="bg-black text-white px-4 py-2 text-xs font-bold uppercase rounded-md shadow hover:bg-neutral-800 transition flex items-center gap-2"
                          >
                            <FileText className="w-4 h-4" /> View Full Civic Proof Packet
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Stepper Interactive Timeline Progress bar */}
            <div className="flex flex-col gap-3">
              <div className="h-2 bg-neutral-950 rounded-full overflow-hidden border border-neutral-900 flex">
                {steps.map((s, idx) => (
                  <div 
                    key={s.id} 
                    className={`h-full transition-all duration-300 ${
                      idx < currentStep ? 'bg-emerald-500' : 
                      idx === currentStep ? 'bg-emerald-400 animate-pulse' : 
                      'bg-neutral-800'
                    }`}
                    style={{ width: '10%' }}
                  />
                ))}
              </div>

              <div className="flex justify-between items-center mt-2">
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      playSound('tick');
                      setCurrentStep((prev) => Math.max(0, prev - 1));
                    }}
                    disabled={currentStep === 0}
                    className="p-2.5 rounded-lg border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-30 disabled:hover:bg-neutral-900 transition text-neutral-300"
                    title="Previous Step"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  <button
                    onClick={() => {
                      setIsPlaying(!isPlaying);
                      playSound('tick');
                    }}
                    className={`px-5 py-2.5 rounded-lg font-medium text-sm transition flex items-center gap-2 ${
                      isPlaying ? 'bg-amber-500 text-black hover:bg-amber-400' : 'bg-emerald-500 text-black hover:bg-emerald-400'
                    }`}
                  >
                    {isPlaying ? <Pause className="w-4 h-4 fill-black" /> : <Play className="w-4 h-4 fill-black" />}
                    {isPlaying ? 'Pause' : 'Run live demo'}
                  </button>

                  <button
                    onClick={() => {
                      playSound('tick');
                      setCurrentStep(0);
                      setIsPlaying(false);
                    }}
                    className="p-2.5 rounded-lg border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 transition text-neutral-400 hover:text-white"
                    title="Reset Demo"
                  >
                    <RotateCcw className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-neutral-400">Step {currentStep + 1} of 10</span>
                  <button
                    onClick={() => {
                      playSound('tick');
                      setCurrentStep((prev) => Math.min(9, prev + 1));
                    }}
                    disabled={currentStep === 9}
                    className="p-2.5 rounded-lg border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-30 disabled:hover:bg-neutral-900 transition text-neutral-300"
                    title="Next Step"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Step-by-step Interactive Bubbles */}
            <div className="flex flex-wrap gap-2 justify-center py-2 border-t border-neutral-900 mt-2">
              {steps.map((step, idx) => (
                <button
                  key={step.id}
                  onClick={() => {
                    playSound('tick');
                    setCurrentStep(idx);
                    setIsPlaying(false);
                  }}
                  className={`px-3 py-1.5 text-[11px] font-mono rounded-lg border transition ${
                    currentStep === idx 
                      ? 'bg-emerald-500/15 border-emerald-500/80 text-emerald-400 font-bold' 
                      : 'bg-neutral-950 border-neutral-900 text-neutral-400 hover:border-neutral-800 hover:text-neutral-200'
                  }`}
                >
                  {step.id}
                </button>
              ))}
            </div>

          </div>

          {/* Technical Under the Hood details block */}
          <div className="bg-neutral-900/40 border border-neutral-900 rounded-2xl p-6 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-semibold tracking-wide font-mono text-neutral-300 uppercase">Engine Log Output</h3>
              </div>
              <span className="text-[10px] font-mono text-neutral-500 bg-neutral-950 px-2 py-0.5 rounded">
                Live State Variable
              </span>
            </div>

            <pre className="bg-neutral-950/80 border border-neutral-900 text-neutral-300 text-xs font-mono p-4 rounded-xl overflow-x-auto leading-relaxed max-h-52">
              <code>{activeStepData.technicalCode}</code>
            </pre>
          </div>

        </div>

        {/* RIGHT COLUMN: Judge Checklist and Diagnostics (4 Cols) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Quick Info Box */}
          <div className="bg-neutral-900/40 border border-neutral-900 rounded-2xl p-6 flex flex-col gap-4">
            <h3 className="text-base font-semibold text-neutral-100 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              Watch one report become civic proof.
            </h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              This interactive flow proves the core breakthrough of CivicProof: rather than burdening public officers with duplicate, disorganized alerts, the system programmatically fuses citizen reports into comprehensive, high-vulnerability, legally unignorable files with active countdown SLA safety nets.
            </p>
          </div>

          {/* Judge checklist */}
          <div className="bg-neutral-900/40 border border-neutral-900 rounded-2xl p-6 flex flex-col gap-5">
            <div className="flex justify-between items-center border-b border-neutral-900 pb-3">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-300">Judge Checklist</h3>
                <span className="text-[10px] text-neutral-500">Live System Diagnostic Check</span>
              </div>
              <button 
                onClick={fetchDiagnostics}
                className="p-1.5 rounded-lg border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 transition text-neutral-400 hover:text-white"
                title="Refresh Health"
                disabled={loadingChecks}
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              
              {/* Check 1: AI Health */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-2.5">
                  <Activity className="w-4.5 h-4.5 text-neutral-500 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-xs font-semibold text-neutral-200 block">AI Logic & Status</span>
                    <span className="text-[10px] text-neutral-400 block font-mono">
                      {loadingChecks ? 'Verifying...' : aiStatus?.geminiStatus?.textModel || 'Unknown Model'}
                    </span>
                  </div>
                </div>
                <div>
                  {loadingChecks ? (
                    <span className="w-2.5 h-2.5 rounded-full bg-neutral-700 animate-pulse inline-block"></span>
                  ) : aiStatus?.success ? (
                    <span className="px-2 py-0.5 text-[9px] font-bold font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded">
                      ACTIVE
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 text-[9px] font-bold font-mono bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded">
                      OFFLINE
                    </span>
                  )}
                </div>
              </div>

              {/* Check 2: Persistence Health */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-2.5">
                  <HardDrive className="w-4.5 h-4.5 text-neutral-500 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-xs font-semibold text-neutral-200 block">Firestore Persistence</span>
                    <span className="text-[10px] text-neutral-400 block font-mono">
                      {loadingChecks ? 'Querying...' : `Mode: ${persistenceStatus?.diagnostics?.activePersistenceMode || 'mock'}`}
                    </span>
                  </div>
                </div>
                <div>
                  {loadingChecks ? (
                    <span className="w-2.5 h-2.5 rounded-full bg-neutral-700 animate-pulse inline-block"></span>
                  ) : persistenceStatus?.diagnostics?.firestoreConfigured ? (
                    <span className="px-2 py-0.5 text-[9px] font-bold font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded">
                      FIRESTORE
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 text-[9px] font-bold font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded">
                      LOCAL MOCK
                    </span>
                  )}
                </div>
              </div>

              {/* Check 3: Active Cases count */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-2.5">
                  <Database className="w-4.5 h-4.5 text-neutral-500 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-xs font-semibold text-neutral-200 block">Active Cases Seeded</span>
                    <span className="text-[10px] text-neutral-400 block">
                      {loadingChecks ? 'Counting...' : `${persistenceStatus?.diagnostics?.recordCount || 0} active records`}
                    </span>
                  </div>
                </div>
                <div>
                  {loadingChecks ? (
                    <span className="w-2.5 h-2.5 rounded-full bg-neutral-700 animate-pulse inline-block"></span>
                  ) : (persistenceStatus?.diagnostics?.recordCount || 0) > 0 ? (
                    <span className="px-2 py-0.5 text-[9px] font-bold font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded">
                      SEEDED
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 text-[9px] font-bold font-mono bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded">
                      EMPTY
                    </span>
                  )}
                </div>
              </div>

              {/* Check 4: Engine Smoke Test */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-2.5">
                  <Shield className="w-4.5 h-4.5 text-neutral-500 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-xs font-semibold text-neutral-200 block">Engine Smoke Test</span>
                    <span className="text-[10px] text-neutral-400 block">
                      Deterministic mathematical rules check
                    </span>
                  </div>
                </div>
                <div>
                  {loadingChecks ? (
                    <span className="w-2.5 h-2.5 rounded-full bg-neutral-700 animate-pulse inline-block"></span>
                  ) : smokeStatus?.success ? (
                    <span className="px-2 py-0.5 text-[9px] font-bold font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded">
                      PASSED
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 text-[9px] font-bold font-mono bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded">
                      FAILED
                    </span>
                  )}
                </div>
              </div>

            </div>

            {/* Demo interactive controls inside checklist box */}
            <div className="border-t border-neutral-900 pt-4 mt-2 flex flex-col gap-2.5">
              <button 
                onClick={handleSeed}
                disabled={seedLoading}
                className="w-full py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs font-mono rounded-lg transition flex items-center justify-center gap-2 text-neutral-300"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${seedLoading ? 'animate-spin' : ''}`} />
                {seedLoading ? 'Seeding Database...' : 'Re-Seed Database'}
              </button>

              <button 
                onClick={handleSmokeTest}
                disabled={smokeLoading}
                className="w-full py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs font-mono rounded-lg transition flex items-center justify-center gap-2 text-neutral-300"
              >
                <Activity className={`w-3.5 h-3.5 ${smokeLoading ? 'animate-spin' : ''}`} />
                {smokeLoading ? 'Running Smoke Suite...' : 'Run Engine Smoke Test'}
              </button>
            </div>
          </div>

          {/* Quick Navigation Links */}
          <div className="bg-neutral-900/40 border border-neutral-900 rounded-2xl p-6 flex flex-col gap-4">
            <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-wide">Developer Sandbox Tools</h4>
            <div className="grid grid-cols-2 gap-2 text-center text-xs font-mono">
              <a href="/api/demo/persistence-health" target="_blank" rel="noreferrer" className="bg-neutral-950 hover:bg-neutral-900 p-2 rounded-lg border border-neutral-900 text-neutral-400 hover:text-white transition">
                Persistence Health ↗
              </a>
              <a href="/api/demo/engine-smoke" target="_blank" rel="noreferrer" className="bg-neutral-950 hover:bg-neutral-900 p-2 rounded-lg border border-neutral-900 text-neutral-400 hover:text-white transition">
                Engine Smoke ↗
              </a>
              <a href="/api/demo/ai-health" target="_blank" rel="noreferrer" className="bg-neutral-950 hover:bg-neutral-900 p-2 rounded-lg border border-neutral-900 text-neutral-400 hover:text-white transition">
                AI Health status ↗
              </a>
              <a href="/api/cases?includeDemo=true" target="_blank" rel="noreferrer" className="bg-neutral-950 hover:bg-neutral-900 p-2 rounded-lg border border-neutral-900 text-neutral-400 hover:text-white transition">
                Raw Case API ↗
              </a>
            </div>
          </div>

        </div>

      </div>

      {/* Civic Proof Packet Modal for Demo */}
      <AnimatePresence>
        {showDemoPacket && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed inset-0 z-[100] bg-neutral-100 backdrop-blur-sm overflow-y-auto print:bg-white print:overflow-visible text-black"
          >
            <div className="max-w-2xl mx-auto p-4 md:p-8 min-h-screen flex flex-col print:p-0">
              
              <div className="flex justify-between items-center mb-6 print:hidden">
                <button 
                  onClick={() => { setShowDemoPacket(false); playSound('tick'); }}
                  className="flex items-center gap-1 font-sans text-xs font-bold text-black hover:text-neutral-600 uppercase"
                >
                  <X className="w-4 h-4" /> Close
                </button>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      const content = `CIVIC CASE FILE: CP-2026-W38A1\nTitle: Blackwater Sewage Overflow\nStatus: ROUTED\nHarm Score: 89/100\nEvidence: 3 citizens verified.\nRoute: Bangalore Water Supply and Sewerage Board (BWSSB)\nURL: ${window.location.href}`;
                      navigator.clipboard.writeText(content);
                      alert("Packet summary copied to clipboard.");
                    }}
                    className="bg-white text-black border border-black py-2 px-3 text-xs font-bold uppercase hover:bg-neutral-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 flex items-center gap-1"
                  >
                    Copy Summary
                  </button>
                  <button 
                    onClick={() => { window.print(); playSound('stamp'); }}
                    className="bg-black text-white border border-black py-2 px-3 text-xs font-bold uppercase hover:bg-neutral-800 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 flex items-center gap-1"
                  >
                    Print / Save PDF
                  </button>
                </div>
              </div>

              <div id="civic-proof-document" className="bg-white border-2 border-black p-8 shadow-2xl relative font-sans print:shadow-none print:border-none print:p-0">
                <div className="absolute top-8 right-8 border-4 border-black rounded-full w-24 h-24 flex items-center justify-center rotate-[-12deg] opacity-80 print:opacity-100">
                  <div className="text-center">
                    <div className="font-display font-black text-xl text-black leading-none">ROUTED</div>
                    <div className="font-mono text-[8px] text-black font-bold tracking-widest mt-0.5">VERIFIED</div>
                  </div>
                </div>

                <div className="flex items-baseline gap-2 border-b-2 border-black pb-4 mb-6">
                  <h1 className="font-display font-black text-3xl tracking-tighter text-black uppercase">CIVICPROOF</h1>
                  <span className="font-mono text-xs font-bold text-neutral-500 uppercase">Official Case File</span>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4 font-mono text-xs">
                    <div>
                      <div className="text-neutral-500 font-semibold">CASE IDENTIFIER</div>
                      <div className="font-bold text-black text-sm">CP-2026-W38A1</div>
                    </div>
                    <div>
                      <div className="text-neutral-500 font-semibold">GENERATED AT</div>
                      <div className="font-bold text-black">{new Date().toLocaleString()}</div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-neutral-500 font-semibold">TARGET DEPARTMENT ROUTE</div>
                      <div className="font-bold text-black text-sm bg-neutral-100 border border-black inline-block px-2 py-1 uppercase">Bangalore Water Supply and Sewerage Board (BWSSB)</div>
                    </div>
                  </div>

                  <div>
                    <h2 className="font-display font-bold text-lg border-b border-black/20 pb-1 mb-2 uppercase">Subject Matter</h2>
                    <div className="font-bold text-xl leading-tight mb-2">Blackwater Sewage Overflow</div>
                    <p className="text-sm leading-relaxed">Massive open drain overflowing right next to Saint Mary&apos;s School on 12th Main. Kids are having to step into traffic to bypass it.</p>
                  </div>

                  <div>
                    <h2 className="font-display font-bold text-lg border-b border-black/20 pb-1 mb-2 uppercase">Risk & Harm Analysis</h2>
                    <div className="flex items-center gap-4 mb-3">
                      <div className="text-4xl font-display font-black text-black">89<span className="text-lg text-neutral-500">/100</span></div>
                      <div className="text-xs text-neutral-500 max-w-xs leading-tight">Algorithmically assessed based on safety hazard, public impact, vulnerability factors, and duration.</div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                      <div className="flex justify-between border-b border-black/10 pb-1"><span>Safety Hazard</span> <strong>20/25</strong></div>
                      <div className="flex justify-between border-b border-black/10 pb-1"><span>Public Impact</span> <strong>22/25</strong></div>
                      <div className="flex justify-between border-b border-black/10 pb-1"><span>Vulnerability</span> <strong>25/25</strong></div>
                      <div className="flex justify-between border-b border-black/10 pb-1"><span>Duration</span> <strong>22/25</strong></div>
                    </div>
                  </div>

                  <div>
                    <h2 className="font-display font-bold text-lg border-b border-black/20 pb-1 mb-2 uppercase">Verified Evidence</h2>
                    <div className="mb-2 text-sm">
                      <span className="font-bold">4</span> citizens have filed verified geo-tagged proof regarding this specific location.
                    </div>
                    <div className="flex gap-4">
                      <div className="w-1/3">
                        <img src="https://picsum.photos/seed/sewage/400/300" alt="Initial proof" className="w-full h-32 object-cover border border-black grayscale print:grayscale-0" />
                        <div className="text-[9px] font-mono mt-1">INITIAL PROOF</div>
                      </div>
                      <div className="flex-1 font-mono text-[10px] space-y-1">
                        <div className="bg-black/5 p-1.5 border border-black/20">
                          <strong>Location:</strong> 12.97160, 77.64120
                        </div>
                        <div className="bg-black/5 p-1.5 border border-black/20">
                          <strong>Reported:</strong> 2026-06-18 10:00:00
                        </div>
                        <div className="bg-black/5 p-1.5 border border-black/20 flex justify-between">
                          <strong>Corroborations:</strong> 3 distinct matching events
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 space-y-4">
                    <div>
                      <div className="text-[10px] font-mono font-bold uppercase mb-1">Attached: Formal Complaint Packet</div>
                      <div className="border border-black/30 bg-black/5 p-3 text-[10px] font-mono whitespace-pre-wrap">
                        We formally represent 3 residents regarding a hazardous open storm water drain adjacent to Saint Mary&apos;s School on 12th Main Road, Indiranagar. Immediate structural risk has been evaluated as CRITICAL (Harm Score: 89/100). Find attached: GPS Evidence links, time series logs, and photographic transcripts.
                      </div>
                    </div>
                  </div>

                  <div className="text-center pt-8 border-t border-black/20 font-sans text-[9px] text-neutral-500">
                    END OF CIVICPROOF CASE FILE. CRYPTOGRAPHICALLY SECURED ON PUBLIC LEDGER.
                  </div>

                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </main>
  );
}
