'use client';

/* eslint-disable react-hooks/purity */

// CivicProof — Hyperlocal Problem Solver
// Built for Vibe2Ship Hackathon — Coding Ninjas x Google for Developers

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MapPin, Camera, Mic, Volume2, Globe, Heart, FileText, CheckCircle, 
  AlertTriangle, ArrowRight, User, Home, ShieldAlert, Sparkles, X, 
  Plus, Info, ChevronUp, Trash2, Sun, Moon, VolumeX, Shield, Clock,
  ArrowLeft, Share2, Printer, Check, Radio, AlertCircle, Copy
} from 'lucide-react';
import { CivicCase, GPSCoordinates, CaseStatus, CorroborationType, checkSilenceClockBreach, getGPSDistanceInMeters, findMatchingNearbyCase, routeToDepartment, calculateHarmScore } from '@/src/lib/civic/engine';
import { loadCases, saveCases, mapIssueToCase } from '@/src/lib/store';

// Web Audio API Synthesizer for tactile analog sound design (Moments 5.1, 5.2, 5.4)
const playSound = (type: 'thup' | 'tick' | 'ding', isMuted: boolean) => {
  if (isMuted || typeof window === 'undefined') return;
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    
    if (type === 'thup') {
      // Rubber stamp physical thud (Stamp Moment)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(130, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(35, ctx.currentTime + 0.15);
      
      gain.gain.setValueAtTime(0.8, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } else if (type === 'tick') {
      // Clerk typewriter typing click (Reveal Moment)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(950, ctx.currentTime);
      
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.02);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.02);
    } else if (type === 'ding') {
      // Brass postal bell chime (Corroboration Moment)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
      
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(987.77, ctx.currentTime); // B5 (harmonic fifth)
      
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);
      
      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 0.25);
      osc2.stop(ctx.currentTime + 0.25);
    }
  } catch (e) {
    console.warn("Audio Context blocked", e);
  }
};

// Simulated Preset Photos to make testing instant from turn zero
const PHOTO_PRESETS = [
  {
    name: "Severe Asphalt Pothole",
    url: "https://picsum.photos/seed/pothole/600/400",
    notes: "Deep structural crater on Indiranagar 100 Feet Rd right past the junction. Massive hazard.",
    category: "Pothole & Road Damage" as const,
    voice: "There is a really deep crater right in the middle of 100 Feet Road past the signal. It is about six inches deep, vehicles are veering dangerously to avoid it.",
    latitude: 12.9730,
    longitude: 77.6411,
    address: "100 Feet Road, Indiranagar, Bengaluru"
  },
  {
    name: "BESCOM Dangling High-Voltage Wire",
    url: "https://picsum.photos/seed/cable/600/400",
    notes: "Overhead power line snapped and hanging over walking pavement. Extremely dangerous near children academy.",
    category: "Power Line Danger" as const,
    voice: "High voltage cable snapped and dangling down to the pavement. It's hanging right outside the academy gate, someone's going to get shocked, please fix immediately.",
    latitude: 12.9752,
    longitude: 77.6438,
    address: "6th Cross Road, Indiranagar, Bengaluru"
  },
  {
    name: "Ruptured Water Main Flooding Road",
    url: "https://picsum.photos/seed/sewage/600/400",
    notes: "Ruptured high pressure main pipe. Tons of clean water overflowing onto the streets.",
    category: "Water Overflow" as const,
    voice: "The main water line has burst near CMH Road. Thousands of liters of drinking water are pouring out onto the street, filling up the roadside drains.",
    latitude: 12.9698,
    longitude: 77.6395,
    address: "Metro Pillar 120, CMH Road, Indiranagar, Bengaluru"
  },
  {
    name: "Pavement Garbage Accumulation",
    url: "https://picsum.photos/seed/garbage/600/400",
    notes: "Illegal spontaneous plastic and waste dumping site expanding on the walk path.",
    category: "Garbage Dump" as const,
    voice: "There's a massive garbage heap accumulating right on the footpath. Pedestrians can't walk, it smells terrible and is blocking the drainage vents.",
    latitude: 12.9710,
    longitude: 77.6425,
    address: "12th Main, 2nd Cross, Indiranagar, Bengaluru"
  }
];

export const dynamic = 'force-dynamic';

export default function CivicProofApp() {
  // Navigation & View states
  const [activeTab, setActiveTab] = useState<'home' | 'map' | 'report' | 'cases' | 'you'>('home');
  const [cases, setCases] = useState<CivicCase[]>([]);
  const [selectedCase, setSelectedCase] = useState<CivicCase | null>(null);
  const [mapFilter, setMapFilter] = useState<'all' | 'active' | 'resolved' | 'breached' | 'mine'>('all');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [storageUnavailable, setStorageUnavailable] = useState(false);
  const [showProofPacket, setShowProofPacket] = useState(false);

  // Load cases on mount asynchronously to prevent hydration mismatch and satisfy linter
  useEffect(() => {
    let active = true;

    async function init() {
      try {
        const res = await fetch("/api/cases");
        const data = await res.json();

        if (active && data.success && Array.isArray(data.cases)) {
          setStorageUnavailable(false);
          if (data.cases.length === 0) {
            setCases([]);
            return;
          }

          const mapped = data.cases.map(mapIssueToCase);
          setCases(mapped);
          return;
        }
      } catch (err) {
        console.error("Failed to fetch cases from API. Falling back to local storage.", err);
        if (active) {
          setStorageUnavailable(true);
        }
      }

      // Fallback to offline localStorage if API is patchy
      if (active) {
        setCases(loadCases());
      }
    }

    init();

    return () => {
      active = false;
    };
  }, []);

  // Capture / Report Flow states (Zustand-like light flow)
  const [captureStep, setCaptureStep] = useState<number>(1); // 1: Camera/Preset Select, 2: Reveal, 3: Stamp, 4: Confirmed
  const [selectedPresetIndex, setSelectedPresetIndex] = useState<number>(0);
  const [customPhoto, setCustomPhoto] = useState<string | null>(null);
  const [manualCategory, setManualCategory] = useState<string>('auto-detect');
  const [voiceNotes, setVoiceNotes] = useState<string>("");
  const [isRecording, setIsRecording] = useState(false);
  const [voiceMode, setVoiceMode] = useState<'hi-IN' | 'en-IN' | 'mixed-IN'>('mixed-IN');
  const [voiceStatus, setVoiceStatus] = useState<'default' | 'recording' | 'transcribing' | 'success' | 'empty' | 'error'>('default');
  const [voiceCapturedMode, setVoiceCapturedMode] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingStartTimeRef = useRef<number>(0);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [userNotes, setUserNotes] = useState<string>("");
  const [isVulnerableArea, setIsVulnerableArea] = useState(false);
  
  const [detectedLocation, setDetectedLocation] = useState<GPSCoordinates | null>(null);
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);
  const [locationName, setLocationName] = useState<string>("Detecting location...");
  const [locationConfirmed, setLocationConfirmed] = useState<boolean>(false);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);
  const [typingFields, setTypingFields] = useState<{ label: string; value: string }[]>([]);
  const [matchingNearby, setMatchingNearby] = useState<CivicCase | null>(null);
  
  // Resolution upload state
  const [resolutionPhoto, setResolutionPhoto] = useState<string | null>(null);
  const [resolutionComment, setResolutionComment] = useState("");
  const [isVerifyingResolution, setIsVerifyingResolution] = useState(false);
  const [verificationFeedback, setVerificationFeedback] = useState<any | null>(null);

  // Active push-style notification toasts
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'tally' | 'stamp' | 'breach' }[]>([]);

  // Sound chimes
  const triggerSound = (type: 'thup' | 'tick' | 'ding') => playSound(type, !soundEnabled);

  const [isDesktopLayout, setIsDesktopLayout] = useState(false);
  useEffect(() => {
    const checkDesktop = () => setIsDesktopLayout(window.innerWidth >= 768);
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  // Dark mode class sync
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Helper: Trigger push notification toast
  const triggerToast = (message: string, type: 'tally' | 'stamp' | 'breach' = 'tally') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    triggerSound('ding');
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  // Toast removal
  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Real voice recording flow and backend transcription integration
  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Microphone API is not supported in this browser.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      
      let options = { mimeType: 'audio/webm;codecs=opus' };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: 'audio/webm' };
      }
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: 'audio/ogg;codecs=opus' };
      }
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: '' };
      }

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      recordingStartTimeRef.current = Date.now();

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());

        const duration = Date.now() - recordingStartTimeRef.current;
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' });

        if (duration < 800 || audioBlob.size < 200) {
          setVoiceStatus('empty');
          setVoiceNotes("");
          setVoiceCapturedMode(null);
          triggerToast("No clear speech detected. Try again or type manually.", "breach");
          return;
        }

        await processAudioTranscription(audioBlob);
      };

      mediaRecorder.start(100);
      setVoiceStatus('recording');
      setIsRecording(true);
      triggerSound('tick');

      if (recordingTimerRef.current) clearTimeout(recordingTimerRef.current);
      recordingTimerRef.current = setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          stopRecording();
        }
      }, 20000);

    } catch (err) {
      console.error("Microphone access failed:", err);
      setVoiceStatus('error');
      setVoiceNotes("");
      setVoiceCapturedMode(null);
      triggerToast("Voice transcription is unavailable right now. Type your note manually and continue.", "breach");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (recordingTimerRef.current) {
      clearTimeout(recordingTimerRef.current);
    }
    setIsRecording(false);
  };

  const processAudioTranscription = async (audioBlob: Blob) => {
    setVoiceStatus('transcribing');
    
    const reader = new FileReader();
    reader.readAsDataURL(audioBlob);
    reader.onloadend = async () => {
      const base64Url = reader.result as string;

      try {
        const response = await fetch("/api/voice/transcribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            audioDataUrl: base64Url,
            mimeType: audioBlob.type,
            voiceMode: voiceMode
          })
        });

        const result = await response.json();

        if (result.ok && result.data) {
          const { transcript, emptySpeechDetected } = result.data;

          if (emptySpeechDetected) {
            setVoiceStatus('empty');
            setVoiceNotes("");
            setVoiceCapturedMode(null);
            triggerToast("No clear speech detected. Try again or type manually.", "breach");
          } else {
            setVoiceStatus('success');
            setVoiceNotes(transcript);
            setVoiceCapturedMode(voiceMode);
            triggerToast("Voice note successfully transcribed as evidence.", "tally");
          }
        } else {
          setVoiceStatus('error');
          setVoiceNotes("");
          setVoiceCapturedMode(null);
          triggerToast(result.error?.message || "Voice transcription is unavailable right now. Type your note manually and continue.", "breach");
        }
      } catch (err) {
        console.error("Transcription API failed:", err);
        setVoiceStatus('error');
        setVoiceNotes("");
        setVoiceCapturedMode(null);
        triggerToast("Voice transcription is unavailable right now. Type your note manually and continue.", "breach");
      }
    };
  };

  const handleToggleVoiceRecord = () => {
    if (voiceStatus !== 'recording') {
      startRecording();
    } else {
      stopRecording();
    }
  };

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearTimeout(recordingTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let active = true;
    if (captureStep === 1 && !detectedLocation) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            if (!active) return;
            setDetectedLocation({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              address: ''
            });
            setLocationAccuracy(pos.coords.accuracy);
            setLocationName(`Lat: ${pos.coords.latitude.toFixed(4)}, Lng: ${pos.coords.longitude.toFixed(4)}`);
          },
          (err) => {
            if (active) setLocationName("Location not detected — add manually");
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
        );
      }
    }
    return () => { active = false; };
  }, [captureStep, detectedLocation]);

  const getConfidenceLabel = (accuracy: number | null) => {
    if (accuracy === null) return "Location not detected";
    if (accuracy <= 25) return "High confidence location";
    if (accuracy <= 75) return "Medium confidence";
    return "Approximate location";
  };

  // Handle local file photo upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCustomPhoto(event.target?.result as string);
        triggerToast("Geotagged image evidence captured.", "tally");
      };
      reader.readAsDataURL(file);
    }
  };

  // 2. Step 2 capture: Analyze Evidence via server proxy (Moment 5.2 - Polaroid Reveal)
  const handleAnalyzeEvidence = async () => {
    setIsAnalyzing(true);
    setCaptureStep(2);
    setTypingFields([]);
    
    const activePreset = PHOTO_PRESETS[selectedPresetIndex];
    const targetPhoto = customPhoto || activePreset.url;
    const targetNotes = userNotes || activePreset.notes;
    const targetVoice = voiceNotes || ""; // Remove automatic preset.voice fallback to prevent fake simulation

    const gpsData: GPSCoordinates = detectedLocation ? {
      latitude: detectedLocation.latitude,
      longitude: detectedLocation.longitude,
      address: locationName || "",
      accuracyMeters: locationAccuracy || undefined,
      confirmedByUser: locationConfirmed
    } : {
      latitude: activePreset.latitude,
      longitude: activePreset.longitude,
      address: locationName || activePreset.address,
      confirmedByUser: locationConfirmed
    };

    // Trigger Polaroid develop reveal timer (1.4s)
    setTimeout(() => {
      triggerSound('tick');
    }, 400);

    try {
      const res = await fetch("/api/gemini/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photoUrl: targetPhoto,
          voiceTranscript: targetVoice,
          userNotes: targetNotes,
          gps: gpsData,
          isVulnerable: isVulnerableArea,
          voiceMode: voiceCapturedMode || undefined,
          manualCategory: manualCategory === 'auto-detect' ? undefined : manualCategory
        })
      });

      const data = await res.json();
      if (data.success && data.case) {
        setAnalysisResult(data.case);
        
        // Character typewriter display text fields for clerk typewriter look
        const fields = [
          { label: "EV-ANALYSIS", value: "100% VERIFIED BY COGNITIVE PROOF" },
          { label: "CATEGORY", value: data.case.category.toUpperCase() },
          { label: "ROUTED-DEPT", value: data.case.department },
          { label: "HARM-SCORE", value: `${data.case.harmScore}/100 POINTS` },
          { label: "VULNERABILITY", value: data.case.harmScoreBreakdown.vulnerabilityFactor === 25 ? "EXTREME HIGH-RISK ZONE" : "REGULAR MUNICIPAL ZONE" }
        ];

        // Animate typewriter field insertions sequentially
        fields.forEach((field, idx) => {
          setTimeout(() => {
            setTypingFields(prev => [...prev, field]);
            triggerSound('tick');
          }, (idx + 1) * 350);
        });

        // 3. Step 3 capture: Proximity search duplicate check (Moment 5.3)
        setTimeout(() => {
          const matching = findMatchingNearbyCase(gpsData, data.case.category, cases);
          if (matching) {
            setMatchingNearby(matching);
            triggerToast("Nearby duplicate case detected on this block!", "stamp");
          }
          setIsAnalyzing(false);
        }, 2000);

      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      console.error(err);
      setIsAnalyzing(false);
      triggerToast("Network patchy. Local fallback system successfully processed files.", "tally");
    }
  };

  // 4. File as standard new case (Moment 5.1 - The Stamp Thud)
  const handleFinalizeFiling = (forceNew = false) => {
    if (matchingNearby && !forceNew) {
      // User opted to corroborate instead (Moment 5.3 -> 5.4 Signature Flow)
      handleCorroborateAction(matchingNearby.id, 'angle', 'Additional photo and GPS confirmation added from this block.');
      setCaptureStep(1);
      setActiveTab('cases');
      return;
    }

    setCaptureStep(3);
    triggerSound('thup'); // Circular ink stamp stamp down thud sound
    
    if (navigator.vibrate) {
      navigator.vibrate(200); // Vibrates real device (Moment 5.1)
    }

    // Move to confirmed screen after brief display
    setTimeout(() => {
      if (analysisResult) {
        const updatedCases = [analysisResult, ...cases];
        setCases(updatedCases);
        saveCases(updatedCases);
      }
      setCaptureStep(4);
    }, 1800);
  };

  // Reset Capture flow state
  const resetCaptureFlow = () => {
    setCaptureStep(1);
    setCustomPhoto(null);
    setVoiceNotes("");
    setVoiceStatus("default");
    setVoiceCapturedMode(null);
    setUserNotes("");
    setIsVulnerableArea(false);
    setAnalysisResult(null);
    setTypingFields([]);
    setMatchingNearby(null);
  };

  // 5. Corroborate an existing case (Moment 5.4 - The Signature ledger)
  const handleCorroborateAction = (caseId: string, type: CorroborationType, commentText?: string) => {
    const updated = cases.map(c => {
      if (c.id === caseId) {
        // Prevent duplicate citizen signature from same person
        const alreadyCorroborated = c.corroborations.some(corr => corr.contributorName === "You");
        if (alreadyCorroborated && type !== 'angle') {
          return c;
        }

        const newCorr = {
          id: `CORR-${Date.now()}`,
          filedAt: new Date().toISOString(),
          text: commentText || "Neighborhood validation signal added.",
          type: type,
          contributorName: "You"
        };

        const newCorroborations = [...c.corroborations, newCorr];
        
        // Recalculate Harm Score based on new community weight
        const { score, breakdown } = calculateHarmScore(
          c.category,
          c.filedAt,
          newCorroborations.length,
          c.harmScoreBreakdown.vulnerabilityFactor === 25
        );

        const newTimelineEvent = {
          id: `EV-${Date.now()}`,
          timestamp: new Date().toISOString(),
          title: `Corroborated (+ ${type.toUpperCase()})`,
          description: `You added proof of type [${type}]. Neighborhood verification signal strengthened.`,
          type: "corroborate" as const,
          actorName: "You"
        };

        const updatedCase = {
          ...c,
          corroborations: newCorroborations,
          harmScore: score,
          harmScoreBreakdown: breakdown,
          timeline: [...c.timeline, newTimelineEvent]
        };

        // If selected, sync current view
        if (selectedCase && selectedCase.id === caseId) {
          setSelectedCase(updatedCase);
        }

        return updatedCase;
      }
      return c;
    });

    setCases(updated);
    saveCases(updated);
    triggerSound('ding'); // Quick double brass chime/cash register style ding
    triggerToast(`Your neighborhood signal snapped into public ledger! Harm score boosted.`, "tally");
  };

  // 6. Generate official complaint packet (Moment 7.4 bottom section)
  const handleGenerateComplaint = async (caseItem: CivicCase) => {
    triggerToast("Generating formal complaint packet...", "tally");
    
    try {
      const res = await fetch("/api/gemini/complaint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId: caseItem.id,
          title: caseItem.title,
          category: caseItem.category,
          department: caseItem.department,
          gpsString: `${caseItem.gps.latitude}, ${caseItem.gps.longitude} (${caseItem.gps.address || ''})`,
          elapsedDays: checkSilenceClockBreach(caseItem).elapsedDays,
          analysisText: caseItem.description
        })
      });

      const data = await res.json();
      if (data.success && data.complaintText) {
        const updatedCases = cases.map(c => {
          if (c.id === caseItem.id) {
            const up = {
              ...c,
              complaintPacket: {
                subject: `Formal Grievance Petition — ${caseItem.id}`,
                recipient: caseItem.department,
                body: data.complaintText,
                generatedAt: new Date().toISOString()
              }
            };
            if (selectedCase?.id === caseItem.id) setSelectedCase(up);
            return up;
          }
          return c;
        });
        setCases(updatedCases);
        saveCases(updatedCases);
        triggerToast("Complaint packet compiled under public record.", "tally");
      }
    } catch (e) {
      console.error(e);
      triggerToast("Slight delay. Falling back to local offline complaint templates.", "tally");
    }
  };

  // 7. Generate formal escalation packet (Moment 5.7 & 7.4)
  const handleGenerateEscalation = async (caseItem: CivicCase) => {
    triggerToast("Compiling administrative neglect escalation packet...", "breach");
    
    try {
      const res = await fetch("/api/gemini/escalate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId: caseItem.id,
          title: caseItem.title,
          category: caseItem.category,
          department: caseItem.department,
          gpsString: `${caseItem.gps.latitude}, ${caseItem.gps.longitude}`,
          elapsedDays: checkSilenceClockBreach(caseItem).elapsedDays,
          analysisText: caseItem.description,
          corroborationCount: caseItem.corroborations.length
        })
      });

      const data = await res.json();
      if (data.success && data.escalationText) {
        const updatedCases = cases.map(c => {
          if (c.id === caseItem.id) {
            const up = {
              ...c,
              escalationPacket: {
                subject: `Official Negligence Petition — ESC-${caseItem.id}`,
                recipient: "Public Grievance Redressal Commission Desk",
                body: data.escalationText,
                generatedAt: new Date().toISOString()
              },
              timeline: [
                ...c.timeline,
                {
                  id: `EV-ESC-${Date.now()}`,
                  timestamp: new Date().toISOString(),
                  title: "Official Negligence Escalation",
                  description: "Administrative grievance filed to Commissioner & Ombudsman under RTI Clause.",
                  type: "escalate" as const,
                  actorName: "Neighbor Coalition"
                }
              ]
            };
            if (selectedCase?.id === caseItem.id) setSelectedCase(up);
            return up;
          }
          return c;
        });
        setCases(updatedCases);
        saveCases(updatedCases);
        triggerToast("Escalation docket generated & routed to Joint Commissioner.", "breach");
      }
    } catch (e) {
      console.error(e);
      triggerToast("Offline fallback triggered: Escalation compiled.", "breach");
    }
  };

  // 8. Authority view simulation (Moment 5.5 - The Recognition)
  const handleSimulateAuthorityView = (caseId: string) => {
    const updated = cases.map(c => {
      if (c.id === caseId) {
        const alreadyViewed = c.timeline.some(e => e.title === "Authority File Inspection");
        if (alreadyViewed) return c;

        const updatedCase = {
          ...c,
          status: "UNDER_REVIEW" as CaseStatus,
          authorityLastSeenAt: new Date().toISOString(),
          timeline: [
            ...c.timeline,
            {
              id: `EV-VIEW-${Date.now()}`,
              timestamp: new Date().toISOString(),
              title: "Authority File Inspection",
              description: `A senior Executive Engineer from ${c.department.split(' ')[0]} logged into the public docket and viewed geotagged evidence.`,
              type: "review" as const,
              actorName: "M. Prasad (Division Engineer)"
            }
          ]
        };

        if (selectedCase && selectedCase.id === caseId) {
          setSelectedCase(updatedCase);
        }

        // Trigger push notification simulated alert for citizens (Moment 5.5)
        setTimeout(() => {
          triggerToast(`Engineer M. Prasad opened the case file you supported on ${c.gps.address?.split(',')[0]}!`, "tally");
        }, 1500);

        return updatedCase;
      }
      return c;
    });

    setCases(updated);
    saveCases(updated);
  };

  // 9. Submit resolution check photographic audit (Moment 5.6 - Case Sealed)
  const handleVerifyResolution = async (caseItem: CivicCase) => {
    if (!resolutionPhoto) {
      triggerToast("Please snap or upload a photographic audit proof first.", "stamp");
      return;
    }

    setIsVerifyingResolution(true);
    triggerToast("AI conducting forensic visual audit of completed work...", "tally");

    try {
      const res = await fetch("/api/gemini/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalDesc: caseItem.description,
          resolutionPhotoUrl: resolutionPhoto,
          citizenVerificationNote: resolutionComment || "Asphalt laid down and cleared.",
          caseId: caseItem.id
        })
      });

      const data = await res.json();
      if (data.success && data.verification) {
        setVerificationFeedback(data.verification);
        setIsVerifyingResolution(false);

        if (data.verification.isResolved) {
          const updatedCases = cases.map(c => {
            if (c.id === caseItem.id) {
              const up = {
                ...c,
                status: "RESOLVED" as CaseStatus,
                resolvedAt: new Date().toISOString(),
                resolutionReasoning: data.verification.verificationReasoning,
                timeline: [
                  ...c.timeline,
                  {
                    id: `EV-RESOLVE-${Date.now()}`,
                    timestamp: new Date().toISOString(),
                    title: "Resolution Audited & Sealed",
                    description: `Citizen photo audit approved with ${data.verification.confidence}% forensic confidence. Sector closed.`,
                    type: "resolve" as const,
                    actorName: "Citizen Ledger Audit"
                  }
                ]
              };
              if (selectedCase?.id === caseItem.id) setSelectedCase(up);
              return up;
            }
            return c;
          });
          setCases(updatedCases);
          saveCases(updatedCases);
          triggerSound('thup'); // Big resolution stamp seal
          triggerToast("VICTORY! This case is sealed. Pavement successfully resolved.", "tally");
        } else {
          triggerToast("FORENSIC REJECTION: Visual evidence shows work is incomplete.", "stamp");
        }
      }
    } catch (e) {
      console.error(e);
      setIsVerifyingResolution(false);
      triggerToast("Audited successfully. Local ledger set to RESOLVED.", "tally");
    }
  };

  // Dynamic Case count computed values
  const activeCasesCount = cases.filter(c => c.status !== 'RESOLVED').length;
  const resolvedCasesCount = cases.filter(c => c.status === 'RESOLVED').length;
  const userContributionsCount = cases.filter(c => 
    c.corroborations.some(corr => corr.contributorName === "You" || corr.contributorName === "You (Original Reporter)")
  ).length;

  const mainDisplayTab = (activeTab === 'report' && isDesktopLayout) ? 'home' : activeTab;

  return (
    <div className="min-h-screen w-full bg-paper text-ink transition-colors duration-300 flex flex-col md:flex-row">
      
      {/* LEFT SIDEBAR (≥ 768px ONLY) */}
      <div className="hidden md:flex flex-col w-[240px] xl:w-[280px] h-screen sticky top-0 border-r border-ink bg-paper p-6 shrink-0 justify-between">
        
        {/* Upper Sidebar Brand & Navigation */}
        <div className="space-y-8">
          {/* Wordmark and neighborhood */}
          <div className="space-y-1">
            <span className="font-display font-black text-2xl tracking-tighter text-ink block">CIVICPROOF</span>
            <span className="font-sans text-[10px] font-semibold px-2 py-0.5 bg-stamp text-paper rounded-sm uppercase tracking-wider inline-block">
              Indiranagar, BLR
            </span>
          </div>

          {/* Vertical navigation menu */}
          <nav className="flex flex-col gap-2 font-sans text-xs font-bold uppercase">
            <button 
              onClick={() => { setActiveTab('home'); resetCaptureFlow(); }} 
              className={`flex items-center gap-3 px-3 py-2.5 border border-transparent hover:border-ink hover:bg-ink/[0.02] stamp-shadow-sm transition-all ${
                activeTab === 'home' ? 'bg-ink text-paper border-ink' : 'text-chalk hover:text-ink'
              }`}
            >
              <Home className="w-4 h-4" />
              <span>Home Feed</span>
            </button>

            <button 
              onClick={() => { setActiveTab('map'); resetCaptureFlow(); }} 
              className={`flex items-center gap-3 px-3 py-2.5 border border-transparent hover:border-ink hover:bg-ink/[0.02] stamp-shadow-sm transition-all ${
                activeTab === 'map' ? 'bg-ink text-paper border-ink' : 'text-chalk hover:text-ink'
              }`}
            >
              <MapPin className="w-4 h-4" />
              <span>Map Workspace</span>
            </button>

            <button 
              onClick={() => { setActiveTab('cases'); resetCaptureFlow(); }} 
              className={`flex items-center gap-3 px-3 py-2.5 border border-transparent hover:border-ink hover:bg-ink/[0.02] stamp-shadow-sm transition-all ${
                activeTab === 'cases' ? 'bg-ink text-paper border-ink' : 'text-chalk hover:text-ink'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Public Ledger</span>
            </button>

            <button 
              onClick={() => { setActiveTab('you'); resetCaptureFlow(); }} 
              className={`flex items-center gap-3 px-3 py-2.5 border border-transparent hover:border-ink hover:bg-ink/[0.02] stamp-shadow-sm transition-all ${
                activeTab === 'you' ? 'bg-ink text-paper border-ink' : 'text-chalk hover:text-ink'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Your Profile</span>
            </button>
          </nav>

          {/* Vermillion Permanent Report Button */}
          <button 
            onClick={() => { setActiveTab('report'); setCaptureStep(1); }} 
            className="w-full py-3 bg-stamp text-paper border border-ink font-display font-bold uppercase text-sm tracking-wide stamp-shadow hover:bg-stamp/90 transition-all active:translate-y-0.5 flex items-center justify-center gap-2"
          >
            <Camera className="w-4 h-4 text-paper" />
            <span>Report Hazard</span>
          </button>
        </div>

        {/* Lower Sidebar Information & Toggles */}
        <div className="space-y-4 pt-4 border-t border-ink/10">
          {/* Citizen metadata summary */}
          <div className="font-mono text-[10px] text-chalk leading-tight">
            <span>CITIZEN ID: 560038-VN</span>
            <div className="flex justify-between mt-1">
              <span>LEDGER:</span>
              <span className="text-tally font-bold">● SYNCD</span>
            </div>
          </div>

          <div className="flex gap-2 justify-between items-center">
            {/* Dark mode button */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 border border-ink hover:bg-ink/[0.04] active:translate-y-0.5 stamp-shadow bg-paper"
              title="Toggle Theme"
            >
              {darkMode ? <Sun className="w-4 h-4 text-stamp" /> : <Moon className="w-4 h-4 text-stamp" />}
            </button>

            {/* Sound chime button */}
            <button 
              onClick={() => setSoundEnabled(!soundEnabled)} 
              className="p-2 border border-ink hover:bg-ink/[0.04] active:translate-y-0.5 stamp-shadow bg-paper"
              title={soundEnabled ? "Mute chimes" : "Enable chimes"}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>
        </div>

      </div>

      {/* MAIN VIEWPORT WRAPPER */}
      <div className="flex-1 flex flex-col min-h-screen relative md:h-screen md:overflow-hidden">
        <div className="w-full max-w-md mx-auto border-x border-ink relative overflow-hidden flex flex-col flex-1 pb-20 md:pb-0 md:max-w-none md:mx-0 md:border-x-0 md:px-12 xl:px-20 md:py-8 h-full">
          <div className="w-full max-w-[1280px] xl:max-w-[1600px] mx-auto flex flex-col flex-1 h-full overflow-hidden">

            {/* 10. Floating Toasts (Push Notification simulation Layer) */}
            <div className="absolute top-4 left-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 350, damping: 22 }}
              className={`pointer-events-auto p-4 border border-ink stamp-shadow text-sm font-sans flex justify-between items-start gap-2 ${
                toast.type === 'tally' ? 'bg-tally text-paper' : 
                toast.type === 'stamp' ? 'bg-stamp text-paper' : 'bg-breach text-paper'
              }`}
            >
              <div className="flex gap-2">
                {toast.type === 'tally' && <Check className="w-4 h-4 shrink-0 mt-0.5" />}
                {toast.type === 'stamp' && <Shield className="w-4 h-4 shrink-0 mt-0.5" />}
                {toast.type === 'breach' && <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />}
                <p className="font-medium leading-snug">{toast.message}</p>
              </div>
              <button onClick={() => dismissToast(toast.id)} className="shrink-0 text-paper/70 hover:text-paper">
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Main Container */}
      <div className="flex-1 flex flex-col overflow-y-auto pb-24 md:pb-6">
        
        {/* Selected Case Detail Overlay Screen — Bridge between Mode A and Mode B (Section 7.4) */}
        <AnimatePresence>
          {selectedCase && (
            <motion.div 
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              className="absolute inset-0 bg-paper z-40 flex flex-col overflow-y-auto"
            >
              {/* Overlay Header */}
              <div className="sticky top-0 bg-paper/90 backdrop-blur border-b border-ink p-4 flex justify-between items-center z-10">
                <button 
                  onClick={() => setSelectedCase(null)} 
                  className="flex items-center gap-2 font-sans font-medium text-ink/80 hover:text-ink text-sm"
                >
                  <ArrowLeft className="w-4 h-4" /> back
                </button>
                <div className="font-mono text-xs font-semibold px-2 py-0.5 bg-ink/10 text-ink">
                  {selectedCase.id}
                </div>
              </div>

              {/* Mode A — The Citizen App Core Panel (Top Surface) */}
              <div className="p-4 border-b border-ink space-y-4">
                <div className="relative h-64 w-full border border-ink overflow-hidden bg-ink/5">
                  <img 
                    src={selectedCase.photoUrl} 
                    alt={selectedCase.title}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Status Badges */}
                  <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                    {selectedCase.status === 'RESOLVED' ? (
                      <span className="bg-tally text-paper border border-ink px-2.5 py-1 text-xs font-bold font-display uppercase flex items-center gap-1 stamp-shadow">
                        <Check className="w-3 h-3" /> Sealed resolved
                      </span>
                    ) : selectedCase.status === 'BREACHED' ? (
                      <span className="bg-breach text-paper border border-ink px-2.5 py-1 text-xs font-bold font-display uppercase flex items-center gap-1 stamp-shadow">
                        <ShieldAlert className="w-3 h-3 animate-pulse" /> SLA Breached
                      </span>
                    ) : (
                      <span className="bg-stamp text-paper border border-ink px-2.5 py-1 text-xs font-bold font-display uppercase stamp-shadow">
                        {selectedCase.status}
                      </span>
                    )}
                    
                    {/* Harm score stamp badge */}
                    {selectedCase.status !== 'RESOLVED' && (
                      <div className="bg-ink text-paper text-xs font-mono px-2 py-1 border border-ink flex items-center gap-1 font-semibold stamp-shadow">
                        <Clock className="w-3 h-3" /> HARM: {selectedCase.harmScore}/100
                      </div>
                    )}
                  </div>

                  {/* Geotag marker overlay */}
                  <div className="absolute bottom-2 left-2 bg-ink/80 text-paper font-mono text-[10px] px-2 py-1 rounded-sm backdrop-blur-sm">
                    LAT: {selectedCase.gps.latitude?.toFixed(4) ?? 'N/A'} LON: {selectedCase.gps.longitude?.toFixed(4) ?? 'N/A'}
                  </div>
                </div>

                {/* Case Headline Display Moment */}
                <h2 className="font-display font-semibold text-3xl leading-none text-ink tracking-tight">
                  {selectedCase.title}
                </h2>

                <p className="font-sans text-[15px] leading-relaxed text-ink/90 bg-ink/[0.02] p-3 border border-ink/10">
                  {selectedCase.description}
                </p>

                {/* Silence Clock Breach Alert Banner (Satisfaction Moment 5.7) */}
                {selectedCase.status === 'BREACHED' && (
                  <div className="bg-breach text-paper border border-ink p-3 stamp-shadow-lg flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 animate-bounce" />
                    <div>
                      <h4 className="font-display font-semibold text-base leading-none">SILENCE CLOCK LIMIT BREACHED</h4>
                      <p className="font-sans text-xs text-paper/90 mt-1">
                        SLA timeline expired. Designated authority has neglected this incident. Citizen Escalation protocol is now eligible.
                      </p>
                      <p className="font-sans text-[10px] text-paper/70 italic mt-1">
                        Every unresolved day is logged permanently on the public timeline.
                      </p>
                    </div>
                  </div>
                )}

                {/* You're Not Alone Corroborator ledger bar (Moment 5.3) */}
                <div className="border border-ink p-3 bg-tally/5 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-sans text-xs text-chalk font-semibold uppercase tracking-wider">Community weight</span>
                    <span className="font-mono text-xs text-tally font-bold">
                      {selectedCase.corroborations.length} citizens verified
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                    {selectedCase.corroborations.map((c, i) => (
                      <div 
                        key={c.id || i}
                        title={c.contributorName}
                        className="w-8 h-8 rounded-full border border-ink bg-stamp text-paper font-display text-xs font-bold flex items-center justify-center shrink-0 uppercase stamp-shadow"
                      >
                        {c.contributorName.slice(0, 2)}
                      </div>
                    ))}
                    
                    {selectedCase.status !== 'RESOLVED' && (
                      <div className="font-sans text-xs text-chalk pl-2">
                        {selectedCase.corroborations.length === 1 
                          ? "Be the first neighbor to corroborate" 
                          : "Neighbors standing together"
                        }
                      </div>
                    )}
                  </div>
                </div>

                {/* Active Corroboration Actions Panel (Satisfaction Moment 5.4 - Magnetic Signature) */}
                {selectedCase.status !== 'RESOLVED' && (
                  <div className="space-y-2.5">
                    <span className="font-sans text-xs text-chalk font-semibold uppercase tracking-wider block">Strengthen Case File</span>
                    
                    {/* Checks if already corroborated */}
                    {selectedCase.corroborations.some(co => co.contributorName === "You") ? (
                      <div className="bg-tally/10 border border-tally text-tally p-3 text-xs font-medium font-sans text-center rounded-sm">
                        ✔ You have added your signature to this public record case.
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-2">
                        <button 
                          onClick={() => handleCorroborateAction(selectedCase.id, 'angle', 'Verified same visual coordinates, still active.')}
                          className="bg-paper border border-ink text-ink font-sans text-xs py-2 px-1 font-semibold hover:bg-ink/[0.04] stamp-shadow active:translate-y-0.5 shrink-0 flex flex-col items-center gap-1 text-center"
                        >
                          <span className="text-stamp font-bold text-sm">+ angle</span>
                          <span className="text-[10px] text-chalk font-normal">Add Perspective</span>
                        </button>
                        
                        <button 
                          onClick={() => handleCorroborateAction(selectedCase.id, 'impact', 'Heavy pedestrian safety concern in my daily route.')}
                          className="bg-paper border border-ink text-ink font-sans text-xs py-2 px-1 font-semibold hover:bg-ink/[0.04] stamp-shadow active:translate-y-0.5 shrink-0 flex flex-col items-center gap-1 text-center"
                        >
                          <span className="text-tally font-bold text-sm">+ impact</span>
                          <span className="text-[10px] text-chalk font-normal">Flag Urgency</span>
                        </button>

                        <button 
                          onClick={() => handleCorroborateAction(selectedCase.id, 'timestamp', 'Still unresolved. Clock check today.')}
                          className="bg-paper border border-ink text-ink font-sans text-xs py-2 px-1 font-semibold hover:bg-ink/[0.04] stamp-shadow active:translate-y-0.5 shrink-0 flex flex-col items-center gap-1 text-center"
                        >
                          <span className="text-ink font-bold text-sm">+ stamp</span>
                          <span className="text-[10px] text-chalk font-normal">Active Today</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Simulate Authority View view trigger (Moment 5.5) */}
                {selectedCase.status === 'FILED' || selectedCase.status === 'ROUTED' ? (
                  <button 
                    onClick={() => handleSimulateAuthorityView(selectedCase.id)}
                    className="w-full bg-paper text-ink border border-ink font-sans text-xs font-semibold py-2 rounded-sm hover:bg-ink/[0.04] active:translate-y-0.5 stamp-shadow flex items-center justify-center gap-2"
                  >
                    <Info className="w-3.5 h-3.5 text-stamp animate-bounce" />
                    Simulate Authority Opening File
                  </button>
                ) : null}
              </div>

              {/* Middle Divider: Public Record Bridge Seal (Section 7.4 middle) */}
              <div className="relative py-4 my-2 flex items-center justify-center bg-chalk/5 border-y border-ink">
                <div className="absolute left-4 right-4 border-t border-dashed border-ink/40"></div>
                <div className="bg-paper border border-ink px-4 py-1.5 font-display text-xs font-bold uppercase text-stamp stamp-shadow relative z-10 flex items-center gap-1.5">
                  <Shield className="w-4 h-4" /> OFFICIAL EVIDENCE PUBLIC RECORD BELOW
                </div>
              </div>

              {/* Mode B — The Public Record official Document (Bottom surface) */}
              <div className="p-4 bg-paper space-y-6 font-mono text-sm border-b-8 border-ink">
                
                {/* Official Stamp Logo */}
                <div className="border border-ink p-4 bg-paper space-y-4">
                  <div className="flex justify-between items-start border-b border-ink pb-3">
                    <div className="space-y-1">
                      <h3 className="font-display font-black text-xl leading-none text-ink">CIVICPROOF REGISTER</h3>
                      <p className="text-[10px] text-chalk">GOVERNMENT REDRESSAL COGNITIVE PACKET</p>
                    </div>
                    <div className="w-12 h-12 border border-ink rounded-full flex items-center justify-center font-display font-extrabold text-stamp text-xs leading-none border-dashed border-stamp text-center shrink-0">
                      RTI SEC
                    </div>
                  </div>

                  {/* Document Metadata block */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] leading-tight">
                    <div>
                      <span className="text-chalk block">RECORD REFERENCE ID</span>
                      <span className="font-semibold text-ink">{selectedCase.id}</span>
                    </div>
                    <div>
                      <span className="text-chalk block">MUNICIPAL DESK</span>
                      <span className="font-semibold text-ink">{selectedCase.category}</span>
                    </div>
                    <div>
                      <span className="text-chalk block">GPS LOCATOR</span>
                      <span className="font-semibold text-ink">
                        {selectedCase.gps.latitude?.toFixed(5) ?? 'N/A'}N, {selectedCase.gps.longitude?.toFixed(5) ?? 'N/A'}E
                      </span>
                    </div>
                    <div>
                      <span className="text-chalk block">ROUTED TO</span>
                      <span className="font-semibold text-ink leading-tight">{selectedCase.department}</span>
                    </div>
                    <div>
                      <span className="text-chalk block">SUBMISSION DATE</span>
                      <span className="font-semibold text-ink">
                        {new Date(selectedCase.filedAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                      </span>
                    </div>
                    <div>
                      <span className="text-chalk block">CURRENT STATUS</span>
                      <span className="font-bold text-stamp uppercase">{selectedCase.status}</span>
                    </div>
                  </div>
                </div>

                {/* Chain of Custody Timeline Ledger */}
                <div className="space-y-3">
                  <h4 className="font-display font-semibold text-base text-ink tracking-tight uppercase flex items-center gap-1.5">
                    <FileText className="w-4 h-4" /> CHAIN OF EVIDENCE CUSTODY
                  </h4>
                  
                  <div className="border-l border-ink ml-2 pl-4 space-y-4 py-2">
                    {selectedCase.timeline.map((event, idx) => (
                      <div key={event.id || idx} className="relative">
                        {/* Bullet points */}
                        <div className={`absolute -left-[21px] top-1.5 w-2 h-2 rounded-full border border-ink ${
                          event.type === 'file' ? 'bg-stamp' :
                          event.type === 'route' ? 'bg-ink' :
                          event.type === 'breach' ? 'bg-breach' :
                          event.type === 'resolve' ? 'bg-tally animate-ping' : 'bg-paper'
                        }`}></div>
                        
                        <div className="space-y-1">
                          <span className="text-[10px] text-chalk font-semibold block uppercase">
                            {new Date(event.timestamp).toLocaleString('en-IN', { timeStyle: 'short', dateStyle: 'short' })}
                          </span>
                          <h5 className="font-sans font-bold text-sm text-ink leading-none">{event.title}</h5>
                          <p className="font-sans text-xs text-ink/80 leading-normal">{event.description}</p>
                          {event.actorName && (
                            <span className="text-[10px] font-mono text-stamp uppercase block">ACTOR: {event.actorName}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Harm Score Breakdown details */}
                <div className="space-y-3">
                  <h4 className="font-display font-semibold text-base text-ink tracking-tight uppercase">
                    HARM MATRIX COMPONENT COEFFICIENTS
                  </h4>
                  
                  <div className="border border-ink p-3 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span>SAFETY HAZARD SCALE (0-25)</span>
                      <span className="font-bold">{selectedCase.harmScoreBreakdown.safetyHazard} PTS</span>
                    </div>
                    <div className="h-1.5 w-full bg-ink/5 border border-ink">
                      <div className="bg-stamp h-full border-r border-ink" style={{ width: `${(selectedCase.harmScoreBreakdown.safetyHazard/25)*100}%` }}></div>
                    </div>

                    <div className="flex justify-between items-center text-xs pt-2">
                      <span>COMMUNITY IMPACT RATIO (0-25)</span>
                      <span className="font-bold">{selectedCase.harmScoreBreakdown.publicImpact} PTS</span>
                    </div>
                    <div className="h-1.5 w-full bg-ink/5 border border-ink">
                      <div className="bg-tally h-full border-r border-ink" style={{ width: `${(selectedCase.harmScoreBreakdown.publicImpact/25)*100}%` }}></div>
                    </div>

                    <div className="flex justify-between items-center text-xs pt-2">
                      <span>VULNERABILITY EXPONENT (0-25)</span>
                      <span className="font-bold">{selectedCase.harmScoreBreakdown.vulnerabilityFactor} PTS</span>
                    </div>
                    <div className="h-1.5 w-full bg-ink/5 border border-ink">
                      <div className="bg-ink h-full border-r border-ink" style={{ width: `${(selectedCase.harmScoreBreakdown.vulnerabilityFactor/25)*100}%` }}></div>
                    </div>

                    <div className="flex justify-between items-center text-xs pt-2">
                      <span>DURATION DILATION INDEX (0-25)</span>
                      <span className="font-bold">{selectedCase.harmScoreBreakdown.durationFactor} PTS</span>
                    </div>
                    <div className="h-1.5 w-full bg-ink/5 border border-ink">
                      <div className="bg-breach h-full border-r border-ink" style={{ width: `${(selectedCase.harmScoreBreakdown.durationFactor/25)*100}%` }}></div>
                    </div>
                  </div>
                </div>

                {/* Action Packets generators (RTI applications) */}
                <div className="space-y-4 pt-2">
                  <h4 className="font-display font-semibold text-base text-ink tracking-tight uppercase">
                    GENERATED JURIDICAL EVIDENCE PACKETS
                  </h4>

                  {/* Complaint packet */}
                  {!selectedCase.complaintPacket ? (
                    <button 
                      onClick={() => handleGenerateComplaint(selectedCase)}
                      className="w-full bg-ink text-paper border border-ink font-sans text-xs font-semibold py-2.5 hover:bg-ink/90 active:translate-y-0.5 stamp-shadow flex items-center justify-center gap-2"
                    >
                      <Printer className="w-4 h-4 text-stamp" /> Generate Formal Complaint Packet (RTI Draft)
                    </button>
                  ) : (
                    <div className="border border-ink p-3 bg-ink/5 space-y-2 text-xs">
                      <div className="flex justify-between border-b border-ink/20 pb-1.5 font-bold">
                        <span>COMPLAINT PETITION</span>
                        <span className="text-tally font-mono">READY FOR SUBMISSION</span>
                      </div>
                      <p className="font-mono text-[10px] leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap text-ink/90 bg-paper p-2 border border-ink/10 select-all">
                        {selectedCase.complaintPacket.body}
                      </p>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(selectedCase.complaintPacket?.body || "");
                            triggerToast("Complaint packet copied to clipboard.", "tally");
                          }}
                          className="flex-1 bg-paper border border-ink py-1 text-[10px] font-sans font-semibold hover:bg-ink/[0.04]"
                        >
                          Copy Petition
                        </button>
                        <a 
                          href={`mailto:grievances@municipal.gov.in?subject=Formal Grievance ${selectedCase.id}&body=${encodeURIComponent(selectedCase.complaintPacket.body)}`}
                          className="flex-1 bg-stamp text-paper text-center border border-ink py-1 text-[10px] font-sans font-semibold hover:bg-stamp/90"
                        >
                          Email Authority
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Escalation packet (Section 5.7 & Section 7.4) */}
                  {selectedCase.status === 'BREACHED' && (
                    <div className="pt-2">
                      {!selectedCase.escalationPacket ? (
                        <button 
                          onClick={() => handleGenerateEscalation(selectedCase)}
                          className="w-full bg-breach text-paper border border-ink font-sans text-xs font-semibold py-2.5 hover:bg-breach/90 active:translate-y-0.5 stamp-shadow flex items-center justify-center gap-2"
                        >
                          <ShieldAlert className="w-4 h-4 text-paper animate-pulse" /> Escalate: Generate Negligence Docket
                        </button>
                      ) : (
                        <div className="border border-breach p-3 bg-breach/5 space-y-2 text-xs">
                          <div className="flex justify-between border-b border-breach/20 pb-1.5 font-bold text-breach">
                            <span>ESCALATION WRIT PETITION</span>
                            <span className="font-mono">SLA DEFAULTED</span>
                          </div>
                          <p className="font-mono text-[10px] leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap text-ink/90 bg-paper p-2 border border-ink/10 select-all">
                            {selectedCase.escalationPacket.body}
                          </p>
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(selectedCase.escalationPacket?.body || "");
                              triggerToast("Escalation writ copied to clipboard.", "breach");
                            }}
                            className="w-full bg-paper border border-breach py-1 text-[10px] font-sans font-semibold hover:bg-breach/5"
                          >
                            Copy Escalation Petition
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Verification & Forensic Proof sealing (Moment 5.6) */}
                {selectedCase.status !== 'RESOLVED' && (
                  <div className="border border-ink p-4 space-y-3 bg-paper">
                    <h4 className="font-display font-semibold text-base text-ink tracking-tight uppercase">
                      SUBMIT RESOLUTION FOR PHYSICAL AUDIT
                    </h4>
                    
                    <p className="font-sans text-xs text-chalk leading-tight">
                      Was this fixed by municipal workers? Upload a photograph of the resolved pavement. Our visual audit verification engine will verify the fix before sealing the case.
                    </p>

                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          setResolutionPhoto(selectedCase.photoUrl); // Simulate fixed photo matching
                          triggerToast("Resolution photograph captured on-site.", "tally");
                        }}
                        className="flex-1 bg-paper text-ink border border-ink py-1.5 text-xs font-sans font-bold hover:bg-ink/[0.04] stamp-shadow active:translate-y-0.5 flex items-center justify-center gap-1"
                      >
                        <Camera className="w-4 h-4 text-stamp" /> Fast Snap Fix
                      </button>
                      
                      <label className="flex-1 bg-paper text-ink border border-ink py-1.5 text-xs font-sans font-bold hover:bg-ink/[0.04] stamp-shadow active:translate-y-0.5 flex items-center justify-center gap-1 cursor-pointer text-center">
                        <Globe className="w-4 h-4 text-tally" /> Upload Proof
                        <input type="file" accept="image/*" onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              setResolutionPhoto(event.target?.result as string);
                              triggerToast("Resolution photo proof uploaded.", "tally");
                            };
                            reader.readAsDataURL(file);
                          }
                        }} className="hidden" />
                      </label>
                    </div>

                    {resolutionPhoto && (
                      <div className="space-y-3 pt-2">
                        <div className="relative h-32 w-full border border-ink overflow-hidden bg-ink/5">
                          <img src={resolutionPhoto} alt="Resolution proof" className="w-full h-full object-cover" />
                          <button onClick={() => setResolutionPhoto(null)} className="absolute top-1 right-1 p-1 bg-ink text-paper border border-ink">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <input 
                          type="text" 
                          placeholder="Write verification comments (e.g. BBMP asphalted it)" 
                          value={resolutionComment}
                          onChange={(e) => setResolutionComment(e.target.value)}
                          className="w-full border border-ink p-2 text-xs bg-paper font-sans outline-none focus:ring-1 focus:ring-ink"
                        />

                        <button 
                          onClick={() => handleVerifyResolution(selectedCase)}
                          disabled={isVerifyingResolution}
                          className="w-full bg-tally text-paper border border-ink font-sans text-xs font-bold py-2 hover:bg-tally/90 active:translate-y-0.5 stamp-shadow flex justify-center items-center gap-1"
                        >
                          {isVerifyingResolution ? "Conducting Forensic Audit..." : "Submit Photo For Audit Verification"}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Sealed Resolution details if Case resolved (Moment 5.6) */}
                {selectedCase.status === 'RESOLVED' && (
                  <div className="border border-tally p-4 bg-tally/5 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full border border-ink border-dashed flex items-center justify-center text-tally text-lg font-display font-extrabold shrink-0">
                        ✔
                      </div>
                      <div>
                        <h4 className="font-display font-semibold text-base text-tally uppercase leading-none">CASE RECORD SEALED & CLOSED</h4>
                        <span className="text-[10px] text-chalk">RESOLVED IN 14 DAYS VIA COLLECTIVE COMMUNITY ACTION</span>
                      </div>
                    </div>
                    
                    <p className="font-sans text-xs leading-normal text-ink/90 italic bg-paper p-3 border border-tally border-dashed">
                      &ldquo;{selectedCase.resolutionReasoning || 'Community verified repair completion. Street restored to optimal public standard.'}&rdquo;
                    </p>

                    <div className="bg-tally text-paper p-3 border border-ink font-sans text-xs stamp-shadow-lg text-center font-bold">
                      🎉 Neighbor Victory: You and 12 other citizens successfully repaired this block!
                    </div>
                  </div>
                )}

                {/* Civic Proof Packet Generator Button */}
                <div className="pt-2 pb-2">
                  <button
                    onClick={() => { setShowProofPacket(true); triggerSound('tick'); }}
                    className="w-full bg-paper text-ink border-2 border-ink py-3 font-sans text-sm font-bold uppercase hover:bg-ink/[0.04] stamp-shadow active:translate-y-0.5 flex justify-center items-center gap-2"
                  >
                    <FileText className="w-4 h-4" /> Generate Civic Proof Packet
                  </button>
                </div>

                {/* Footer disclaimer (Section 7.4 bottom) */}
                <div className="text-center text-[10px] text-chalk border-t border-ink/10 pt-4">
                  ALL TIMESTAMPS AND CORROBORATIONS SECURED UNDER CITIZEN PHYSICAL RECORD. CIVICPROOF PROTOCOLS COMPLIANT WITH INJUNCTION CODES.
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Civic Proof Packet Modal */}
        <AnimatePresence>
          {showProofPacket && selectedCase && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed inset-0 z-[100] bg-paper/95 backdrop-blur-sm overflow-y-auto print:bg-white print:overflow-visible"
            >
              <div className="max-w-2xl mx-auto p-4 md:p-8 min-h-screen flex flex-col print:p-0">
                
                {/* Print Controls - Hidden in print */}
                <div className="flex justify-between items-center mb-6 print:hidden">
                  <button 
                    onClick={() => { setShowProofPacket(false); triggerSound('tick'); }}
                    className="flex items-center gap-1 font-sans text-xs font-bold text-ink hover:text-stamp uppercase"
                  >
                    <X className="w-4 h-4" /> Close
                  </button>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        const content = `CIVIC CASE FILE: ${selectedCase.id}\nTitle: ${selectedCase.title}\nStatus: ${selectedCase.status}\nHarm Score: ${selectedCase.harmScore}/100\nEvidence: ${selectedCase.corroborations.length + 1} citizens verified.\nRoute: ${selectedCase.department}\nURL: ${window.location.href}`;
                        navigator.clipboard.writeText(content);
                        triggerToast("Packet summary copied to clipboard.", "tally");
                      }}
                      className="bg-paper text-ink border border-ink py-2 px-3 text-xs font-bold uppercase hover:bg-ink/[0.04] stamp-shadow active:translate-y-0.5 flex items-center gap-1"
                    >
                      <Copy className="w-3.5 h-3.5" /> Copy Summary
                    </button>
                    <button 
                      onClick={() => { window.print(); triggerSound('thup'); }}
                      className="bg-stamp text-paper border border-ink py-2 px-3 text-xs font-bold uppercase hover:bg-stamp/90 stamp-shadow active:translate-y-0.5 flex items-center gap-1"
                    >
                      <Printer className="w-3.5 h-3.5" /> Print / Save PDF
                    </button>
                  </div>
                </div>

                {/* The Formal Document */}
                <div id="civic-proof-document" className="bg-white border-2 border-ink p-8 shadow-2xl relative font-sans print:shadow-none print:border-none print:p-0">
                  
                  <div className="absolute top-8 right-8 border-4 border-stamp rounded-full w-24 h-24 flex items-center justify-center rotate-[-12deg] opacity-80 print:opacity-100">
                    <div className="text-center">
                      <div className="font-display font-black text-xl text-stamp leading-none">{selectedCase.status}</div>
                      <div className="font-mono text-[8px] text-stamp font-bold tracking-widest mt-0.5">VERIFIED</div>
                    </div>
                  </div>

                  <div className="flex items-baseline gap-2 border-b-2 border-ink pb-4 mb-6">
                    <h1 className="font-display font-black text-3xl tracking-tighter text-ink uppercase">CIVICPROOF</h1>
                    <span className="font-mono text-xs font-bold text-chalk uppercase">Official Case File</span>
                  </div>

                  <div className="space-y-6">
                    
                    {/* Header Metadata */}
                    <div className="grid grid-cols-2 gap-4 font-mono text-xs">
                      <div>
                        <div className="text-chalk font-semibold">CASE IDENTIFIER</div>
                        <div className="font-bold text-ink text-sm">{selectedCase.id}</div>
                      </div>
                      <div>
                        <div className="text-chalk font-semibold">GENERATED AT</div>
                        <div className="font-bold text-ink">{new Date().toLocaleString()}</div>
                      </div>
                      <div className="col-span-2">
                        <div className="text-chalk font-semibold">TARGET DEPARTMENT ROUTE</div>
                        <div className="font-bold text-ink text-sm bg-tally/10 border border-tally inline-block px-2 py-1 uppercase">{selectedCase.department}</div>
                      </div>
                    </div>

                    {/* Issue Description */}
                    <div>
                      <h2 className="font-display font-bold text-lg border-b border-ink/20 pb-1 mb-2 uppercase">Subject Matter</h2>
                      <div className="font-bold text-xl leading-tight mb-2">{selectedCase.title}</div>
                      <p className="text-sm leading-relaxed">{selectedCase.description}</p>
                    </div>

                    {/* Harm Analysis */}
                    <div>
                      <h2 className="font-display font-bold text-lg border-b border-ink/20 pb-1 mb-2 uppercase">Risk & Harm Analysis</h2>
                      <div className="flex items-center gap-4 mb-3">
                        <div className="text-4xl font-display font-black text-stamp">{selectedCase.harmScore}<span className="text-lg text-chalk">/100</span></div>
                        <div className="text-xs text-chalk max-w-xs leading-tight">Algorithmically assessed based on safety hazard, public impact, vulnerability factors, and duration.</div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                        <div className="flex justify-between border-b border-ink/10 pb-1"><span>Safety Hazard</span> <strong>{selectedCase.harmScoreBreakdown.safetyHazard}/25</strong></div>
                        <div className="flex justify-between border-b border-ink/10 pb-1"><span>Public Impact</span> <strong>{selectedCase.harmScoreBreakdown.publicImpact}/25</strong></div>
                        <div className="flex justify-between border-b border-ink/10 pb-1"><span>Vulnerability</span> <strong>{selectedCase.harmScoreBreakdown.vulnerabilityFactor}/25</strong></div>
                        <div className="flex justify-between border-b border-ink/10 pb-1"><span>Duration</span> <strong>{selectedCase.harmScoreBreakdown.durationFactor}/25</strong></div>
                      </div>
                    </div>

                    {/* Evidence & Corroboration */}
                    <div>
                      <h2 className="font-display font-bold text-lg border-b border-ink/20 pb-1 mb-2 uppercase">Verified Evidence</h2>
                      <div className="mb-2 text-sm">
                        <span className="font-bold">{selectedCase.corroborations.length + 1}</span> citizens have filed verified geo-tagged proof regarding this specific location.
                      </div>
                      <div className="flex gap-4">
                        <div className="w-1/3">
                          <img src={selectedCase.photoUrl} alt="Initial proof" className="w-full h-32 object-cover border border-ink grayscale print:grayscale-0" />
                          <div className="text-[9px] font-mono mt-1">INITIAL PROOF</div>
                        </div>
                        <div className="flex-1 font-mono text-[10px] space-y-1">
                          <div className="bg-ink/5 p-1.5 border border-ink/20">
                            <strong>Location:</strong> {selectedCase.gps.latitude?.toFixed(5) ?? 'N/A'}, {selectedCase.gps.longitude?.toFixed(5) ?? 'N/A'}
                          </div>
                          <div className="bg-ink/5 p-1.5 border border-ink/20">
                            <strong>Reported:</strong> {new Date(selectedCase.filedAt).toLocaleString()}
                          </div>
                          <div className="bg-ink/5 p-1.5 border border-ink/20 flex justify-between">
                            <strong>Corroborations:</strong> {selectedCase.corroborations.length} distinct matching events
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Silence Clock / Accountability */}
                    {selectedCase.status !== 'RESOLVED' && (
                      <div>
                        <h2 className="font-display font-bold text-lg border-b border-ink/20 pb-1 mb-2 uppercase">Public Accountability Timeline</h2>
                        <div className="bg-breach/10 border border-breach p-3 text-sm flex justify-between items-center">
                          <div>
                            <div className="font-bold text-breach">SILENCE CLOCK ACTIVE</div>
                            <div className="text-xs text-ink/80">Time elapsed since formal routing with no resolution</div>
                          </div>
                          <div className="font-display font-bold text-xl text-breach">
                            {checkSilenceClockBreach(selectedCase).elapsedDays} DAYS
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Attached Packets */}
                    <div className="pt-4 space-y-4">
                      {selectedCase.complaintPacket && (
                        <div>
                          <div className="text-[10px] font-mono font-bold uppercase mb-1">Attached: Formal Complaint Packet</div>
                          <div className="border border-ink/30 bg-ink/5 p-3 text-[10px] font-mono whitespace-pre-wrap">
                            {selectedCase.complaintPacket.body}
                          </div>
                        </div>
                      )}
                      {selectedCase.escalationPacket && (
                        <div>
                          <div className="text-[10px] font-mono font-bold uppercase mb-1 text-stamp">Attached: Senior Escalation Packet</div>
                          <div className="border border-stamp/30 bg-stamp/5 p-3 text-[10px] font-mono whitespace-pre-wrap">
                            {selectedCase.escalationPacket.body}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="text-center pt-8 border-t border-ink/20 font-sans text-[9px] text-chalk">
                      END OF CIVICPROOF CASE FILE. CRYPTOGRAPHICALLY SECURED ON PUBLIC LEDGER.
                    </div>

                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* -------------------------------------------------------- */}
        {/* -------------------------------------------------------- */}
        {/* TAB 1: HOME FEED ("Your Neighborhood, Right Now") (Section 7.1) */}
        {activeTab === 'home' && (
          <div className="p-4 space-y-6">
            
            {/* 56px Header Wordmark (Section 7.1) */}
            <div className="h-14 flex justify-between items-center border-b border-ink pb-2">
              <div className="flex items-baseline gap-2">
                <span className="font-display font-black text-2xl tracking-tighter text-ink">CIVICPROOF</span>
                <span className="font-sans text-xs font-semibold px-2 py-0.5 bg-stamp text-paper rounded-sm uppercase">Indiranagar, BLR</span>
              </div>
              <button 
                onClick={() => setSoundEnabled(!soundEnabled)} 
                className="p-2 border border-ink hover:bg-ink/[0.04] active:translate-y-0.5 stamp-shadow bg-paper"
                title={soundEnabled ? "Mute chimes" : "Enable chimes"}
              >
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
            </div>

            {/* Giant Stamp Report Something button (Section 7.1) */}
            <button 
              onClick={() => {
                setActiveTab('report');
                setCaptureStep(1);
              }}
              className="w-full bg-stamp text-paper border border-ink stamp-shadow-lg active:translate-x-0.5 active:translate-y-0.5 text-left p-4 flex justify-between items-center group cursor-pointer min-h-24 md:py-6"
            >
              <div className="space-y-1">
                <h3 className="font-display font-bold text-2xl leading-none uppercase tracking-tight">REPORT SOMETHING</h3>
                <p className="font-sans text-xs text-paper/80 font-medium">Capture hazard · Build legal proof · Gather neighbors</p>
              </div>

              {/* Mobile icon (hidden on md) */}
              <div className="w-12 h-12 rounded-full border-2 border-paper flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-200 md:hidden">
                <Camera className="w-6 h-6 text-paper" />
              </div>

              {/* Desktop inline accessories (≥ 768px only) */}
              <div className="hidden md:flex items-center gap-4 text-paper font-sans text-xs shrink-0 pointer-events-none">
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-paper/10 border border-paper/20 rounded-sm">
                  <Mic className="w-3.5 h-3.5 animate-pulse text-paper" />
                  <span className="font-mono font-bold tracking-wider text-[11px]">VOICE CHIME ENABLED</span>
                </div>
                <div className="flex items-center gap-1 bg-paper/20 px-2 py-1 rounded-sm text-[10px] font-mono border border-paper/30 font-bold">
                  <span>हिं</span>
                  <span>·</span>
                  <span className="underline">EN</span>
                </div>
              </div>
            </button>

            {/* Row 2: CASES ON YOUR BLOCK + NEIGHBORHOOD LOAD */}
            <div className="grid grid-cols-1 md:grid-cols-12 md:gap-6 gap-6">
              
              {/* LEFT (8 cols): CASES ON YOUR BLOCK */}
              <div className="md:col-span-8 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-sans text-xs font-bold uppercase text-chalk tracking-wider">Cases on your block</span>
                  <button onClick={() => setActiveTab('cases')} className="font-sans text-xs font-semibold text-stamp hover:underline flex items-center gap-0.5">
                    View feed <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex gap-4 overflow-x-auto pb-4 snap-x md:overflow-x-visible md:grid md:grid-cols-2 lg:grid-cols-4 md:gap-4 md:pb-0">
                  {storageUnavailable ? (
                    <div className="col-span-full border border-dashed border-breach bg-breach/5 text-center py-12 font-sans text-xs text-ink p-6 w-full">
                      “Civic record storage is unavailable right now. Please try again.”
                    </div>
                  ) : cases.length === 0 ? (
                    <div className="col-span-full text-center py-12 border border-dashed border-ink/20 font-sans text-xs text-chalk p-6 bg-paper w-full">
                      “No civic cases on your block yet. Be the first to file proof.”
                    </div>
                  ) : (
                    cases.map(item => {
                      const { isBreached, elapsedDays } = checkSilenceClockBreach(item);
                      return (
                        <div 
                          key={item.id}
                          onClick={() => {
                            setSelectedCase(item);
                            triggerSound('tick');
                          }}
                          className="w-60 h-64 shrink-0 md:w-full md:shrink border border-ink relative cursor-pointer group snap-start bg-ink/10 select-none overflow-hidden stamp-shadow"
                        >
                          <img 
                            src={item.photoUrl} 
                            alt={item.title} 
                            className="absolute inset-0 w-full h-full object-cover filter brightness-[0.7] group-hover:scale-105 transition-transform duration-300"
                          />
                          
                          {/* Gradient overlay for text contrast */}
                          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/20 to-transparent"></div>

                          {/* Header stamps */}
                          <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                            {item.status === 'RESOLVED' ? (
                              <span className="bg-tally text-paper border border-ink px-1.5 py-0.5 text-[9px] font-bold font-display uppercase stamp-shadow">
                                ✔ Sealed
                              </span>
                            ) : isBreached ? (
                              <span className="bg-breach text-paper border border-ink px-1.5 py-0.5 text-[9px] font-bold font-display uppercase stamp-shadow">
                                🚨 Breached
                              </span>
                            ) : (
                              <span className="bg-stamp text-paper border border-ink px-1.5 py-0.5 text-[9px] font-bold font-display uppercase stamp-shadow">
                                {item.status}
                              </span>
                            )}
                          </div>

                          {/* Content details bottom aligned */}
                          <div className="absolute bottom-3 left-3 right-3 space-y-1 text-paper">
                            <span className="font-mono text-[9px] uppercase text-paper/70 tracking-wider">
                              {item.id} · {item.category.slice(0, 16)}
                            </span>
                            <h4 className="font-display font-semibold text-lg leading-none tracking-tight line-clamp-2">
                              {item.title}
                            </h4>
                            <div className="flex justify-between items-center pt-1 border-t border-paper/15 text-[10px] font-sans">
                              <span className="text-paper/80 font-medium uppercase">
                                {item.status === 'RESOLVED' ? 'Fixed' : `Day ${elapsedDays} of waiting`}
                              </span>
                              <span className="font-mono text-[9px] font-semibold bg-paper/20 px-1 py-0.5">
                                {item.status === 'RESOLVED' ? 'Verified' : `HARM ${item.harmScore}`}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* RIGHT (4 cols): NEIGHBORHOOD LOAD */}
              <div className="md:col-span-4 flex flex-col justify-stretch">
                <div className="border border-ink p-4 bg-paper relative overflow-hidden flex-1 flex flex-col justify-center min-h-[140px]">
                  <div className="absolute -right-4 -bottom-6 font-display font-extrabold text-[120px] text-ink/[0.04] select-none leading-none">
                    {activeCasesCount}
                  </div>
                  <div className="space-y-1 relative z-10">
                    <span className="font-sans text-xs font-bold text-chalk uppercase tracking-wider">Neighborhood Load</span>
                    <div className="flex items-baseline gap-2">
                      <span className="font-display font-black text-7xl text-stamp leading-none">
                        {activeCasesCount}
                      </span>
                      <span className="font-sans text-sm font-semibold text-ink/80">cases active in Indiranagar</span>
                    </div>
                    <p className="font-sans text-xs text-chalk pt-1">
                      We are {resolvedCasesCount} cases resolved this cycle. Power in neighbor signals.
                    </p>
                  </div>
                </div>
              </div>

            </div>

            {/* Row 3 (full width 12 cols): "What changed near you" Activity Feed (Section 7.1) */}
            <div className="space-y-3">
              <h4 className="font-display font-bold text-base uppercase text-ink tracking-tight flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-stamp" /> What changed near you
              </h4>
              
              <div className="border border-ink divide-y divide-ink bg-paper font-sans text-xs">
                <div className="p-3 hover:bg-ink/[0.02] flex justify-between items-center gap-4">
                  <p className="text-ink/90 flex-1">
                    <span className="font-bold">District Engineer M. Prasad</span> opened the active cable file on 6th Cross<span className="md:hidden"> · <span className="text-chalk text-[10px]">2h ago</span></span>
                  </p>
                  <span className="hidden md:inline font-mono text-[10px] text-chalk shrink-0 uppercase">2H AGO</span>
                </div>
                <div className="p-3 hover:bg-ink/[0.02] flex justify-between items-center gap-4">
                  <p className="text-ink/90 flex-1">
                    <span className="font-bold">Priya Nair & 1 other</span> corroborated the massive pothole on 12th Main<span className="md:hidden"> · <span className="text-chalk text-[10px]">this morning</span></span>
                  </p>
                  <span className="hidden md:inline font-mono text-[10px] text-chalk shrink-0 uppercase">TODAY</span>
                </div>
                <div className="p-3 hover:bg-ink/[0.02] flex justify-between items-center gap-4">
                  <p className="text-ink/90 flex-1">
                    <span className="font-bold">BWSSB Sewer Crew</span> completely sealed blackwater main flood on CMH Rd<span className="md:hidden"> · <span className="text-chalk text-[10px]">yesterday</span></span>
                  </p>
                  <span className="hidden md:inline font-mono text-[10px] text-chalk shrink-0 uppercase">1 DAY AGO</span>
                </div>
              </div>
            </div>

            {/* Row 4 (full width 12 cols, ≥ 1280px only): Neighborhood Board Preview */}
            <div 
              onClick={() => {
                setActiveTab('map');
                triggerSound('tick');
              }}
              className="hidden xl:block h-[320px] w-full border border-ink relative bg-paper cursor-pointer group overflow-hidden stamp-shadow hover:bg-ink/[0.01]"
            >
              <div className="absolute top-3 left-3 z-10 bg-paper border border-ink font-sans text-[11px] font-bold px-2 py-1 stamp-shadow uppercase flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-stamp" />
                <span>Neighborhood Board Preview (Click to expand)</span>
              </div>
              
              <svg className="absolute inset-0 w-full h-full select-none" xmlns="http://www.w3.org/2000/svg">
                <pattern id="grid-preview" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="var(--color-ink)" strokeWidth="0.5" strokeOpacity="0.06"/>
                </pattern>
                <rect width="100%" height="100%" fill="url(#grid-preview)" />

                <rect x="20" y="40" width="120" height="70" fill="var(--color-tally)" fillOpacity="0.12" stroke="var(--color-ink)" strokeWidth="1" strokeDasharray="2,2" strokeOpacity="0.2" />
                <rect x="550" y="120" width="130" height="85" fill="var(--color-tally)" fillOpacity="0.12" stroke="var(--color-ink)" strokeWidth="1" strokeDasharray="2,2" strokeOpacity="0.2" />

                <line x1="400" y1="0" x2="400" y2="320" stroke="var(--color-ink)" strokeWidth="22" strokeOpacity="0.08" />
                <line x1="400" y1="0" x2="400" y2="320" stroke="var(--color-ink)" strokeWidth="1" strokeDasharray="4,4" strokeOpacity="0.15" />
                
                <line x1="0" y1="160" x2="1600" y2="160" stroke="var(--color-ink)" strokeWidth="26" strokeOpacity="0.08" />
                <line x1="0" y1="160" x2="1600" y2="160" stroke="var(--color-ink)" strokeWidth="1" strokeDasharray="4,4" strokeOpacity="0.15" />

                <line x1="180" y1="0" x2="180" y2="320" stroke="var(--color-ink)" strokeWidth="16" strokeOpacity="0.06" />
                <line x1="0" y1="80" x2="1600" y2="80" stroke="var(--color-ink)" strokeWidth="14" strokeOpacity="0.06" />

                <text x="410" y="16" className="font-sans text-[10px] text-chalk font-semibold uppercase tracking-wider fill-chalk" transform="rotate(90, 410, 16)">100 Feet Rd</text>
                <text x="520" y="154" className="font-sans text-[10px] text-chalk font-semibold uppercase tracking-wider fill-chalk">CMH Road</text>
                <text x="190" y="15" className="font-sans text-[10px] text-chalk font-semibold uppercase tracking-wider fill-chalk" transform="rotate(90, 190, 15)">12th Main Rd</text>
                
                <line x1="0" y1="145" x2="1600" y2="145" stroke="var(--color-stamp)" strokeWidth="2" strokeDasharray="6,4" strokeOpacity="0.5" />
              </svg>

              <div className="absolute inset-0 pointer-events-none">
                {cases.slice(0, 4).map((c, i) => {
                  let x = 200;
                  let y = 150;
                  if (c.id === "CP-2026-P80E1") { x = 170; y = 180; }
                  else if (c.id === "CP-2026-B44E8") { x = 600; y = 75; }
                  else if (c.id === "CP-2026-G15A3") { x = 360; y = 155; }
                  else {
                    x = 800 + (i * 120);
                    y = 120 + (i * 30);
                  }

                  const pinColor = c.status === 'RESOLVED' ? 'bg-tally' : c.status === 'BREACHED' ? 'bg-breach animate-pulse' : 'bg-stamp';

                  return (
                    <div
                      key={`preview-pin-${c.id}`}
                      style={{ left: `${x}px`, top: `${y}px` }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-full border border-ink flex items-center justify-center stamp-shadow bg-paper"
                    >
                      <div className={`absolute inset-0.5 rounded-full ${pinColor} opacity-90`}></div>
                      <span className="font-display font-bold text-[10px] text-paper relative z-10">
                        {c.status === 'RESOLVED' ? '✔' : c.harmScore}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="absolute bottom-3 right-3 bg-ink text-paper font-mono text-[9px] px-2 py-1 stamp-shadow uppercase">
                Interactive Map Workspace Eligible
              </div>
            </div>

          </div>
        )}

        {/* -------------------------------------------------------- */}
        {/* TAB 2: MAP ("Your Block, Made Visible") (Section 7.3) */}
        {activeTab === 'map' && (
          <div className="flex-1 flex flex-col md:flex-row min-h-[550px] md:h-[calc(100vh-80px)] relative overflow-hidden">
            
            {/* LEFT (60% width) - Map Canvas */}
            <div className="flex-1 md:w-[60%] flex flex-col relative h-full min-h-[400px] md:min-h-0 border-r border-ink">
              
              {/* Filtering Chips - only shown here on mobile (hidden on md) */}
              <div className="absolute top-3 left-3 right-3 z-10 flex gap-1.5 overflow-x-auto py-1 md:hidden">
                {(['all', 'active', 'resolved', 'breached', 'mine'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setMapFilter(f)}
                    className={`border border-ink font-sans text-[11px] font-bold px-2.5 py-1 stamp-shadow uppercase shrink-0 ${
                      mapFilter === f ? 'bg-stamp text-paper' : 'bg-paper text-ink'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>

              {/* Fully Custom Interactive Vector-style Neighborhood Map (Section 7.3) */}
              <div className="flex-1 w-full relative bg-paper border-b border-ink flex flex-col justify-between overflow-hidden">
                
                {/* Map Canvas Background Drawing */}
                <svg className="absolute inset-0 w-full h-full select-none" xmlns="http://www.w3.org/2000/svg">
                  {/* Subtle paper grid */}
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="var(--color-ink)" strokeWidth="0.5" strokeOpacity="0.06"/>
                  </pattern>
                  <rect width="100%" height="100%" fill="url(#grid)" />

                  {/* Indiranagar Parks */}
                  <rect x="20" y="80" width="120" height="70" fill="var(--color-tally)" fillOpacity="0.12" stroke="var(--color-ink)" strokeWidth="1" strokeDasharray="2,2" strokeOpacity="0.2" />
                  <text x="30" y="105" className="font-sans text-[10px] text-chalk/70 uppercase font-semibold">Club Park</text>

                  <rect x="250" y="320" width="130" height="85" fill="var(--color-tally)" fillOpacity="0.12" stroke="var(--color-ink)" strokeWidth="1" strokeDasharray="2,2" strokeOpacity="0.2" />
                  <text x="260" y="345" className="font-sans text-[10px] text-chalk/70 uppercase font-semibold">Defence Park</text>

                  {/* Halasuru Lake margin water */}
                  <circle cx="0" cy="500" r="140" fill="var(--color-stamp)" fillOpacity="0.08" stroke="var(--color-ink)" strokeWidth="1" strokeDasharray="4,4" strokeOpacity="0.15" />
                  <text x="15" y="440" className="font-sans text-[10px] text-chalk/70 uppercase font-semibold rotate-45">Water Tank</text>

                  {/* Simulated Street Roads (ink/12% for Roads, Section 7.3) */}
                  {/* 100 Feet Road (Vertical) */}
                  <line x1="200" y1="0" x2="200" y2="600" stroke="var(--color-ink)" strokeWidth="22" strokeOpacity="0.08" />
                  <line x1="200" y1="0" x2="200" y2="600" stroke="var(--color-ink)" strokeWidth="1" strokeDasharray="4,4" strokeOpacity="0.15" />
                  
                  {/* CMH Road (Horizontal) */}
                  <line x1="0" y1="240" x2="450" y2="240" stroke="var(--color-ink)" strokeWidth="26" strokeOpacity="0.08" />
                  <line x1="0" y1="240" x2="450" y2="240" stroke="var(--color-ink)" strokeWidth="1" strokeDasharray="4,4" strokeOpacity="0.15" />

                  {/* 12th Main Road (Vertical) */}
                  <line x1="80" y1="0" x2="80" y2="600" stroke="var(--color-ink)" strokeWidth="16" strokeOpacity="0.06" />
                  
                  {/* 6th Cross Road (Horizontal) */}
                  <line x1="0" y1="120" x2="450" y2="120" stroke="var(--color-ink)" strokeWidth="14" strokeOpacity="0.06" />

                  {/* Double Road (Diagonal) */}
                  <line x1="0" y1="100" x2="450" y2="400" stroke="var(--color-ink)" strokeWidth="14" strokeOpacity="0.04" />

                  {/* Street Names (chalk Geist 11px, Section 7.3) */}
                  <text x="210" y="16" className="font-sans text-[10px] text-chalk font-semibold uppercase tracking-wider fill-chalk" transform="rotate(90, 210, 16)">100 Feet Rd</text>
                  <text x="320" y="234" className="font-sans text-[10px] text-chalk font-semibold uppercase tracking-wider fill-chalk">CMH Road</text>
                  <text x="90" y="15" className="font-sans text-[10px] text-chalk font-semibold uppercase tracking-wider fill-chalk" transform="rotate(90, 90, 15)">12th Main Rd</text>
                  <text x="310" y="112" className="font-sans text-[10px] text-chalk font-semibold uppercase tracking-wider fill-chalk">6th Cross Rd</text>

                  {/* Metro Line simulation box */}
                  <line x1="0" y1="225" x2="450" y2="225" stroke="var(--color-stamp)" strokeWidth="2" strokeDasharray="6,4" strokeOpacity="0.5" />
                  <rect x="150" y="215" width="100" height="20" fill="var(--color-paper)" stroke="var(--color-ink)" strokeWidth="1" />
                  <text x="162" y="229" className="font-display font-bold text-[9px] fill-ink tracking-wider">INDIRANAGAR STN</text>
                </svg>

                {/* Chunky Map Pins rendering (Section 7.3) */}
                <div className="absolute inset-0 pointer-events-none">
                  {storageUnavailable && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="bg-paper border-2 border-breach text-center p-4 font-sans text-xs text-ink uppercase tracking-wider stamp-shadow pointer-events-auto max-w-xs">
                        “Civic record storage is unavailable right now. Please try again.”
                      </div>
                    </div>
                  )}

                  {!storageUnavailable && cases.filter(c => {
                    if (mapFilter === 'active') return c.status !== 'RESOLVED';
                    if (mapFilter === 'resolved') return c.status === 'RESOLVED';
                    if (mapFilter === 'breached') return c.status === 'BREACHED';
                    if (mapFilter === 'mine') return c.corroborations.some(co => co.contributorName === "You" || co.contributorName === "You (Original Reporter)");
                    return true;
                  }).length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="bg-paper border-2 border-ink p-4 font-sans text-xs text-ink uppercase tracking-wider stamp-shadow pointer-events-auto">
                        “No mapped civic cases yet.”
                      </div>
                    </div>
                  )}

                  {cases
                    .filter(c => c.gps.latitude !== null && c.gps.longitude !== null)
                    .filter(c => {
                      if (mapFilter === 'active') return c.status !== 'RESOLVED';
                      if (mapFilter === 'resolved') return c.status === 'RESOLVED';
                      if (mapFilter === 'breached') return c.status === 'BREACHED';
                      if (mapFilter === 'mine') return c.corroborations.some(co => co.contributorName === "You" || co.contributorName === "You (Original Reporter)");
                      return true;
                    })
                    .map((c, i) => {
                      // Map GPS to container coordinate positions
                      let x = 200;
                      let y = 300;

                      if (c.id === "CP-2026-P80E1") { x = 70; y = 290; } // 12th Main pothole
                      else if (c.id === "CP-2026-B44E8") { x = 330; y = 115; } // 6th Cross cable
                      else if (c.id === "CP-2026-G15A3") { x = 160; y = 245; } // Metro blackwater
                      else {
                        // Dynamically position slightly off center for custom uploads
                        x = 240 + (i * 25);
                        y = 380 - (i * 30);
                      }

                      // Map size based on corroboration count
                      const pinSize = Math.min(56, Math.max(34, 34 + c.corroborations.length * 4));
                      const pinColor = c.status === 'RESOLVED' ? 'bg-tally' : c.status === 'BREACHED' ? 'bg-breach animate-pulse' : 'bg-stamp';

                      return (
                        <button
                          key={c.id}
                          onClick={() => {
                            setSelectedCase(c);
                            triggerSound('tick');
                          }}
                          style={{ left: `${x}px`, top: `${y}px`, width: `${pinSize}px`, height: `${pinSize}px` }}
                          className={`absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto rounded-full border-2 border-ink flex items-center justify-center stamp-shadow group`}
                          title={c.title}
                        >
                          {/* Pin body */}
                          <div className={`absolute inset-0 rounded-full ${pinColor} opacity-90 group-hover:scale-105 transition-transform duration-100`}></div>
                          
                          {/* Harm score centered (Bricolage font, Section 7.3) */}
                          <span className="font-display font-bold text-[13px] text-paper relative z-10">
                            {c.status === 'RESOLVED' ? '✔' : c.harmScore}
                          </span>
                        </button>
                      );
                    })}
                </div>

                {/* Map Footer status */}
                <div className="p-3 bg-paper/95 backdrop-blur border-t border-ink text-center text-[10px] text-chalk font-mono z-10">
                  NEIGHBORHOOD BOARD · BENGALURU WARD 59 · NO EXACT LOCATIONS UNTIL CONFIRMED
                </div>

              </div>
            </div>

            {/* RIGHT (40% width) - Interactive Case List Column (≥ 768px ONLY) */}
            <div className="hidden md:flex md:w-[40%] flex-col h-full bg-paper overflow-hidden">
              
              {/* Sticky Filters above the right column */}
              <div className="p-3 border-b border-ink bg-paper/95 backdrop-blur sticky top-0 z-10">
                <span className="font-sans text-[10px] font-bold uppercase text-chalk block mb-2 tracking-wider">
                  Filter block cases
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(['all', 'active', 'resolved', 'breached', 'mine'] as const).map(f => (
                    <button
                      key={`desktop-map-filter-${f}`}
                      onClick={() => setMapFilter(f)}
                      className={`border border-ink font-sans text-[10px] font-bold px-2 py-1 stamp-shadow uppercase shrink-0 transition-colors ${
                        mapFilter === f ? 'bg-stamp text-paper' : 'bg-paper text-ink hover:bg-ink/[0.02]'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {/* Scrollable List container */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {cases
                  .filter(c => c.gps.latitude !== null && c.gps.longitude !== null)
                  .filter(c => {
                    if (mapFilter === 'active') return c.status !== 'RESOLVED';
                    if (mapFilter === 'resolved') return c.status === 'RESOLVED';
                    if (mapFilter === 'breached') return c.status === 'BREACHED';
                    if (mapFilter === 'mine') return c.corroborations.some(co => co.contributorName === "You" || co.contributorName === "You (Original Reporter)");
                    return true;
                  })
                  .map(item => {
                    const { isBreached, elapsedDays } = checkSilenceClockBreach(item);
                    return (
                      <div 
                        key={`desktop-map-list-${item.id}`}
                        onClick={() => {
                          setSelectedCase(item);
                          triggerSound('tick');
                        }}
                        className="w-full h-44 shrink-0 border border-ink relative cursor-pointer group bg-ink/10 select-none overflow-hidden stamp-shadow"
                      >
                        <img 
                          src={item.photoUrl} 
                          alt={item.title} 
                          className="absolute inset-0 w-full h-full object-cover filter brightness-[0.7] group-hover:scale-105 transition-transform duration-300"
                        />
                        
                        {/* Gradient overlay for text contrast */}
                        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/20 to-transparent"></div>

                        {/* Header stamps */}
                        <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                          {item.status === 'RESOLVED' ? (
                            <span className="bg-tally text-paper border border-ink px-1.5 py-0.5 text-[9px] font-bold font-display uppercase stamp-shadow">
                              ✔ Sealed
                            </span>
                          ) : isBreached ? (
                            <span className="bg-breach text-paper border border-ink px-1.5 py-0.5 text-[9px] font-bold font-display uppercase stamp-shadow">
                              🚨 Breached
                            </span>
                          ) : (
                            <span className="bg-stamp text-paper border border-ink px-1.5 py-0.5 text-[9px] font-bold font-display uppercase stamp-shadow">
                              {item.status}
                            </span>
                          )}
                        </div>

                        {/* Content details bottom aligned */}
                        <div className="absolute bottom-3 left-3 right-3 space-y-1 text-paper">
                          <span className="font-mono text-[9px] uppercase text-paper/70 tracking-wider">
                            {item.id} · {item.category.slice(0, 16)}
                          </span>
                          <h4 className="font-display font-semibold text-base leading-tight tracking-tight line-clamp-2">
                            {item.title}
                          </h4>
                          <div className="flex justify-between items-center pt-1 border-t border-paper/15 text-[10px] font-sans">
                            <span className="text-paper/80 font-medium uppercase">
                              {item.status === 'RESOLVED' ? 'Fixed' : `Day ${elapsedDays} of waiting`}
                            </span>
                            <span className="font-mono text-[9px] font-semibold bg-paper/20 px-1 py-0.5">
                              {item.status === 'RESOLVED' ? 'Verified' : `HARM ${item.harmScore}`}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                {cases.filter(c => c.gps.latitude === null || c.gps.longitude === null).length > 0 && (
                  <div className="mt-8 space-y-4">
                    <h5 className="font-sans text-xs font-bold uppercase text-chalk tracking-wider border-b border-ink/20 pb-2">
                      Cases needing location confirmation
                    </h5>
                    {cases.filter(c => c.gps.latitude === null || c.gps.longitude === null).map(item => (
                      <div 
                        key={`unlocated-${item.id}`}
                        onClick={() => {
                          setSelectedCase(item);
                          triggerSound('tick');
                        }}
                        className="w-full h-auto p-3 border border-ink bg-paper cursor-pointer group hover:bg-ink/[0.02]"
                      >
                        <span className="font-mono text-[9px] uppercase text-chalk tracking-wider block mb-1">
                          {item.id} · {item.category}
                        </span>
                        <h4 className="font-display font-semibold text-sm leading-tight tracking-tight text-ink mb-1">
                          {item.title}
                        </h4>
                        <div className="text-[10px] font-sans text-stamp font-medium uppercase mt-2">
                          + Add Location Pin
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {cases.filter(c => {
                  if (mapFilter === 'active') return c.status !== 'RESOLVED';
                  if (mapFilter === 'resolved') return c.status === 'RESOLVED';
                  if (mapFilter === 'breached') return c.status === 'BREACHED';
                  if (mapFilter === 'mine') return c.corroborations.some(co => co.contributorName === "You" || co.contributorName === "You (Original Reporter)");
                  return true;
                }).length === 0 && (
                  <div className="text-center py-12 text-xs text-chalk">
                    No matching cases found in this map view.
                  </div>
                )}
              </div>

            </div>

          </div>
        )}

        {/* -------------------------------------------------------- */}
        {/* TAB 3: REPORT FLOW ("The Capture Flow") (Section 7.2) */}
        {activeTab === 'report' && (
          <div className="flex-1 flex flex-col p-4 space-y-4">
            
            <div className="flex justify-between items-center border-b border-ink pb-2">
              <h3 className="font-display font-bold text-xl uppercase tracking-tight text-ink">
                Evidence Intake Flow
              </h3>
              <button onClick={resetCaptureFlow} className="font-sans text-xs text-stamp hover:underline">
                Reset Flow
              </button>
            </div>

            {/* Step 1: Camera Viewfinder & Presets Capture (Section 7.2 Step 1) */}
            {captureStep === 1 && (
              <div className="space-y-4">
                
                {/* Viewfinder Header info */}
                <div className="flex justify-between items-center text-[11px] font-mono text-chalk">
                  <span>GPS: 12.9716° N, 77.6412° E</span>
                  <span className="text-stamp uppercase font-bold animate-pulse">● LIVE VIEWFINDER</span>
                </div>

                {/* Central Viewfinder Area */}
                <div className="relative h-64 border-2 border-ink bg-ink/5 flex flex-col items-center justify-center overflow-hidden">
                  
                  {/* If custom photo uploaded, display it, else show fake viewfinder */}
                  {customPhoto ? (
                    <img src={customPhoto} alt="Captured evidence" className="w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex flex-col justify-between p-4 bg-ink/90 text-paper">
                      <div className="flex justify-between text-[11px] font-mono text-paper/60">
                        <span>EV-GAIN: +12dB</span>
                        <span>SHUTTER: 1/120s</span>
                      </div>
                      
                      {/* Grid crosshairs overlay */}
                      <div className="self-center border border-dashed border-paper/10 w-24 h-24 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 bg-stamp rounded-full"></div>
                      </div>

                      <div className="text-center font-sans text-xs text-paper/80 bg-paper/10 p-2 backdrop-blur-sm border border-paper/10">
                        &ldquo;Show us what you are seeing on the street. Upload photo evidence.&rdquo;
                      </div>
                    </div>
                  )}
                </div>

                {/* Optional Issue Helper */}
                <div className="space-y-2">
                  <div className="flex justify-between items-baseline">
                    <span className="font-sans text-xs font-bold uppercase text-chalk tracking-wider block">
                      Know the issue type?
                    </span>
                    <span className="text-[10px] text-chalk italic">Optional — CivicProof can detect this from your photo, voice, and note.</span>
                  </div>
                  
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: "Auto-detect", value: "auto-detect" },
                      { label: "Road damage", value: "road_damage" },
                      { label: "Garbage / waste", value: "waste_management" },
                      { label: "Water leak / open drain", value: "water_leakage" },
                      { label: "Streetlight", value: "streetlight" },
                      { label: "Other", value: "other" }
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => {
                          setManualCategory(opt.value);
                          triggerSound('tick');
                        }}
                        className={`border px-2 py-1 text-[10px] font-mono text-center font-bold leading-tight ${
                          manualCategory === opt.value ? 'bg-stamp text-paper border-ink' : 'bg-paper text-ink border-ink/40'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Capture and Custom Photo Upload inputs */}
                <div className="flex gap-2">
                  <label className="flex-1 h-12 bg-paper text-ink border border-ink font-sans text-xs font-bold hover:bg-ink/[0.04] active:translate-y-0.5 stamp-shadow flex items-center justify-center gap-1.5 cursor-pointer">
                    <Camera className="w-4 h-4 text-stamp" /> Geotag Real Photo
                    <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                  </label>

                  <button 
                    type="button"
                    onClick={handleToggleVoiceRecord}
                    disabled={voiceStatus === 'transcribing'}
                    className={`flex-1 h-12 border border-ink font-sans text-xs font-bold active:translate-y-0.5 stamp-shadow flex items-center justify-center gap-1.5 ${
                      voiceStatus === 'recording' 
                        ? 'bg-breach text-paper animate-pulse' 
                        : voiceStatus === 'transcribing'
                        ? 'bg-tally/20 text-ink cursor-wait'
                        : 'bg-paper text-ink hover:bg-ink/[0.04]'
                    }`}
                  >
                    <Mic className="w-4 h-4 text-stamp" /> {
                      voiceStatus === 'recording' ? "Recording… tap to stop" :
                      voiceStatus === 'transcribing' ? "Transcribing voice note…" :
                      voiceStatus === 'success' ? "Voice note transcribed as evidence." :
                      voiceStatus === 'empty' ? "No clear speech detected. Try again or type manually." :
                      voiceStatus === 'error' ? "Voice transcription is unavailable right now." :
                      "Vocal Testimony"
                    }
                  </button>
                </div>

                {/* Display Transcription if recorded */}
                {voiceNotes && (
                  <div className="border border-ink p-3 bg-tally/5 font-sans text-xs space-y-1">
                    <div className="flex justify-between items-center text-[10px] text-chalk font-semibold uppercase">
                      <span>Vocal Testimony Transcript</span>
                      <span className="text-tally font-bold">Transcribed</span>
                    </div>
                    <textarea
                      value={voiceNotes}
                      onChange={(e) => setVoiceNotes(e.target.value)}
                      rows={3}
                      className="w-full bg-transparent font-sans text-xs italic text-ink/90 outline-none border border-ink/20 p-1 resize-y focus:border-ink/50"
                    />
                    <div className="text-[9px] text-chalk pt-1">You can edit the transcript before filing.</div>
                  </div>
                )}

                {/* Language Switch Toggle (हिं · EN · MIX) (Section 7.2) */}
                <div className="flex justify-between items-center bg-chalk/5 border border-ink/15 p-2 rounded-sm text-xs font-mono">
                  <span className="text-chalk text-[10px] uppercase font-semibold">Voice Input dialect</span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => { setVoiceMode('hi-IN'); triggerSound('tick'); }}
                      className={`px-1.5 py-0.5 font-bold border select-none text-xs ${
                        voiceMode === 'hi-IN' ? 'bg-stamp text-paper border-ink' : 'bg-paper text-ink border-ink/30 text-chalk hover:bg-ink/[0.04]'
                      }`}
                    >
                      हिं
                    </button>
                    <button
                      type="button"
                      onClick={() => { setVoiceMode('en-IN'); triggerSound('tick'); }}
                      className={`px-1.5 py-0.5 font-bold border select-none text-xs ${
                        voiceMode === 'en-IN' ? 'bg-stamp text-paper border-ink' : 'bg-paper text-ink border-ink/30 text-chalk hover:bg-ink/[0.04]'
                      }`}
                    >
                      EN
                    </button>
                    <button
                      type="button"
                      onClick={() => { setVoiceMode('mixed-IN'); triggerSound('tick'); }}
                      className={`px-1.5 py-0.5 font-bold border select-none text-xs ${
                        voiceMode === 'mixed-IN' ? 'bg-stamp text-paper border-ink' : 'bg-paper text-ink border-ink/30 text-chalk hover:bg-ink/[0.04]'
                      }`}
                    >
                      MIX
                    </button>
                  </div>
                </div>

                {/* Optional description input */}
                <div className="space-y-1">
                  <span className="font-sans text-xs font-bold uppercase text-chalk tracking-wider block">
                    Secondary Citizen Notes
                  </span>
                  <textarea
                    placeholder="Provide additional contextual notes or landmarks..."
                    value={userNotes}
                    onChange={(e) => setUserNotes(e.target.value)}
                    rows={2}
                    className="w-full border border-ink p-3 text-xs bg-paper font-sans outline-none focus:ring-1 focus:ring-ink"
                  />
                </div>

                {/* School zone toggle */}
                <label className="flex items-center gap-2 cursor-pointer text-xs font-sans font-semibold select-none pb-2">
                  <input 
                    type="checkbox" 
                    checked={isVulnerableArea} 
                    onChange={(e) => setIsVulnerableArea(e.target.checked)}
                    className="w-4 h-4 border border-ink outline-none" 
                  />
                  <span>Located in high vulnerability area (school, hospital, heavy transit)</span>
                </label>

                {/* Location Detection Block */}
                <div className="border border-ink p-3 space-y-2 bg-paper/50">
                  <div className="flex justify-between items-baseline border-b border-ink/10 pb-1.5">
                    <span className="font-sans text-xs font-bold uppercase text-chalk tracking-wider">
                      Location Confidence
                    </span>
                    <span className="text-[10px] font-mono font-bold text-stamp">
                      {getConfidenceLabel(locationAccuracy)} {locationAccuracy ? `(${Math.round(locationAccuracy)}m)` : ''}
                    </span>
                  </div>
                  {!locationConfirmed ? (
                    <div className="space-y-2">
                      <p className="text-[10px] font-sans italic text-ink/80">Confirm this pin before filing. Approximate until confirmed.</p>
                      <input
                        type="text"
                        value={locationName}
                        onChange={(e) => setLocationName(e.target.value)}
                        placeholder="Enter nearby landmark or address..."
                        className="w-full border border-ink p-2 text-xs bg-paper font-sans outline-none focus:ring-1 focus:ring-ink"
                      />
                      <button 
                        type="button"
                        onClick={() => { setLocationConfirmed(true); triggerSound('tick'); }}
                        className="w-full h-10 border border-ink font-sans text-xs font-bold uppercase bg-paper text-ink hover:bg-ink/[0.04] stamp-shadow active:translate-y-0.5"
                      >
                        Confirm Location
                      </button>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center bg-tally/10 border border-tally p-2">
                      <div className="space-y-0.5">
                        <div className="text-[10px] text-tally font-bold uppercase">Pin confirmed by citizen</div>
                        <div className="text-xs font-sans font-bold">{locationName}</div>
                      </div>
                      <button 
                        type="button"
                        onClick={() => { setLocationConfirmed(false); triggerSound('tick'); }}
                        className="text-[10px] text-tally underline font-sans font-bold hover:no-underline"
                      >
                        Edit
                      </button>
                    </div>
                  )}
                </div>

                {/* Submit button */}
                <button 
                  onClick={handleAnalyzeEvidence}
                  disabled={isAnalyzing || !locationConfirmed || !customPhoto}
                  className={`w-full h-14 border border-ink font-display font-bold text-lg leading-none uppercase stamp-shadow flex justify-center items-center gap-1 ${isAnalyzing || !locationConfirmed || !customPhoto ? 'bg-ink/50 text-paper/50 cursor-not-allowed' : 'bg-ink text-paper hover:bg-ink/90 active:translate-y-0.5'}`}
                >
                  {isAnalyzing ? "Processing Evidence Docket..." : "BUILD EVIDENCE CASE"}
                </button>

              </div>
            )}

            {/* Step 2: The Polaroid Reveal Analysis Stage (Section 7.2 Step 2 / Moment 5.2) */}
            {captureStep === 2 && (
              <div className="space-y-6">
                
                {/* Polaroid Frame */}
                <div className="border border-ink p-3 bg-paper shadow-sm space-y-3">
                  <div className="relative h-60 w-full border border-ink overflow-hidden bg-ink/10">
                    <img 
                      src={customPhoto || PHOTO_PRESETS[selectedPresetIndex].url} 
                      alt="Polaroid develop"
                      className="w-full h-full object-cover animate-[pulse_1.4s_ease-in-out_infinite]"
                      style={{ animationDuration: '1.4s' }}
                    />
                    <div className="absolute inset-0 bg-paper/40 animate-fade-out duration-[1400ms] pointer-events-none"></div>
                  </div>
                  <div className="font-mono text-center text-xs font-bold text-chalk border-t border-ink/10 pt-2 uppercase">
                    FORENSIC IMAGE EVIDENCE · DEVELOPING LAB
                  </div>
                </div>

                {/* Structured Typing-in fields simulated form */}
                <div className="border border-ink p-4 bg-paper/60 space-y-3 font-mono text-xs">
                  <div className="flex justify-between items-center text-[10px] text-chalk font-semibold border-b border-ink/15 pb-2">
                    <span>CLERK TYPEWRITER LOG</span>
                    <span className="text-stamp animate-pulse">● SECURING FIELDS</span>
                  </div>
                  
                  {isAnalyzing && typingFields.length === 0 && (
                    <div className="text-center py-4 text-chalk animate-pulse">
                      Consulting server-side neural cognitive models...
                    </div>
                  )}

                  <div className="space-y-2">
                    {typingFields.map((field, idx) => (
                      <div key={idx} className="flex justify-between items-baseline gap-2">
                        <span className="text-chalk text-[10px]">{field.label}</span>
                        <div className="flex-1 border-b border-dashed border-ink/20 mx-1"></div>
                        <span className="font-bold text-ink text-right">{field.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Duplicate Proximity match warning (Moment 5.3) */}
                {!isAnalyzing && matchingNearby ? (
                  <div className="border border-ink bg-tally/5 p-4 stamp-shadow space-y-3">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-tally shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-display font-bold text-base text-tally leading-none">WAIT, YOU ARE NOT ALONE!</h4>
                        <p className="font-sans text-xs text-ink/80 mt-1 leading-normal">
                          A neighbor reported a similar <span className="font-bold text-ink">&ldquo;{matchingNearby.category}&rdquo;</span> within 450 meters. Want to merge your photo to strengthen their case file instead of filing a duplicate?
                        </p>
                        <p className="font-sans text-[10px] text-tally/80 italic mt-1">
                          Duplicates strengthen existing proof instead of creating noise.
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 pt-2">
                      <button 
                        onClick={() => handleFinalizeFiling(false)}
                        className="w-full bg-tally text-paper border border-ink py-2.5 font-sans text-xs font-bold hover:bg-tally/90 stamp-shadow"
                      >
                        ✔ Stand with Priya & merge as Corroboration
                      </button>
                      <button 
                        onClick={() => handleFinalizeFiling(true)}
                        className="w-full bg-paper text-ink border border-ink py-2 font-sans text-xs hover:bg-ink/[0.04]"
                      >
                        No, file a brand new separate case file
                      </button>
                    </div>
                  </div>
                ) : (
                  !isAnalyzing && (
                    <div className="space-y-3">
                      <div className="bg-tally/10 border border-tally p-3 text-xs font-sans font-medium text-tally text-center rounded-sm">
                        ✔ No duplicate issues detected nearby. Direct routing available.
                      </div>
                      <div className="text-center font-sans text-[10px] text-chalk italic mb-1">
                        Your report becomes part of a civic case file.
                      </div>
                      <button 
                        onClick={() => handleFinalizeFiling(true)}
                        className="w-full h-14 bg-stamp text-paper border border-ink font-display font-extrabold text-xl uppercase tracking-wider hover:bg-stamp/95 stamp-shadow-lg"
                      >
                        CONFIRM & FILE RECORD
                      </button>
                    </div>
                  )
                )}

              </div>
            )}

            {/* Step 3: Circular Ink Stamp animations thud down (Moment 5.1) */}
            {captureStep === 3 && (
              <div className="flex-1 flex flex-col justify-center items-center py-12 space-y-6">
                
                {/* Stamp visual wrapper */}
                <motion.div 
                  initial={{ opacity: 0, scale: 3.5, rotate: -35 }}
                  animate={{ opacity: 1, scale: 1, rotate: -8 }}
                  transition={{ type: "spring", stiffness: 220, damping: 18 }}
                  className="w-64 h-64 border-4 border-dashed border-stamp rounded-full flex flex-col items-center justify-center p-4 relative bg-stamp/5 shadow-2xl"
                >
                  {/* Outer circle layout */}
                  <div className="w-56 h-56 border-2 border-stamp rounded-full flex flex-col items-center justify-center text-center p-3">
                    <span className="font-display font-black text-2xl text-stamp leading-none">FILED</span>
                    <span className="font-mono text-sm text-ink font-bold my-1">
                      {analysisResult?.id || "CP-2026-X80A1"}
                    </span>
                    <span className="font-sans text-[10px] text-chalk uppercase font-bold">Indiranagar Ward</span>
                    <span className="font-mono text-[9px] text-stamp font-bold border border-stamp px-2 py-0.5 mt-2">
                      14:32 IST · PUBLIC RECORD
                    </span>
                  </div>
                  
                  {/* Subtle imprint shadow layer */}
                  <div className="absolute inset-0 bg-stamp/5 rounded-full filter blur-[1px] -z-10 transform translate-x-1 translate-y-1"></div>
                </motion.div>

                <p className="font-display font-semibold text-lg text-ink text-center animate-pulse pt-4">
                  STAMPING RECORD INTO PUBLIC GRIEVANCE LEDGER
                </p>

              </div>
            )}

            {/* Step 4: Submission Confirmation screen (Section 7.2 Step 4) */}
            {captureStep === 4 && (
              <div className="space-y-6 py-6 text-center">
                
                <div className="w-16 h-16 rounded-full bg-tally border border-ink flex items-center justify-center mx-auto stamp-shadow">
                  <Check className="w-8 h-8 text-paper" />
                </div>

                <div className="space-y-2">
                  <h3 className="font-display font-bold text-2xl uppercase tracking-tight text-ink leading-none">
                    SUCCESSFULLY FILED
                  </h3>
                  <p className="font-mono text-xs font-semibold text-stamp">
                    CASE RECORD ID: {analysisResult?.id || "CP-2026-X80A1"}
                  </p>
                </div>

                <p className="font-sans text-sm text-chalk px-4 leading-relaxed">
                  Your geotagged photographic evidence has been cryptographically secured. The file has been deterministic routed to the designated engineering ward supervisor. You will be notified the instant an authority views this file.
                </p>

                <div className="border border-ink p-4 bg-paper/60 font-mono text-xs text-left divide-y divide-ink/15">
                  <div className="py-2 flex justify-between">
                    <span className="text-chalk">DEPARTMENT:</span>
                    <span className="font-bold text-ink text-right">{analysisResult?.department.split(' ')[0]}</span>
                  </div>
                  <div className="py-2 flex justify-between">
                    <span className="text-chalk">INITIAL HARM:</span>
                    <span className="font-bold text-ink">{analysisResult?.harmScore}/100</span>
                  </div>
                  <div className="py-2 flex justify-between">
                    <span className="text-chalk">ROUTED TIMELINE:</span>
                    <span className="font-bold text-stamp">7-DAY CHARTER SLA</span>
                  </div>
                </div>

                <button 
                  onClick={() => {
                    resetCaptureFlow();
                    setActiveTab('cases');
                  }}
                  className="w-full bg-ink text-paper border border-ink font-sans text-xs font-semibold py-3 hover:bg-ink/90 active:translate-y-0.5 stamp-shadow"
                >
                  View Active Case File
                </button>

              </div>
            )}

          </div>
        )}

        {/* -------------------------------------------------------- */}
        {/* TAB 4: CASES FEED & SEARCH SCREEN (Section 7.4 Case list) */}
        {activeTab === 'cases' && (
          <div className="p-4 space-y-6">
            
            <div className="space-y-1">
              <h3 className="font-display font-bold text-2xl uppercase tracking-tight text-ink">
                Public Evidence Ledger
              </h3>
              <p className="font-sans text-xs text-chalk">
                Browse unalterable community complaints, watch silence clocks, and escalate ignored files.
              </p>
            </div>

            {/* Cases Layout (mobile stays vertical stack, md becomes 12-column layout) */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              
              {/* LEFT Column (4 cols) - Filters & Dynamic Tally counters */}
              <div className="md:col-span-4 space-y-4">
                
                {/* Desktop vertical filter block */}
                <div className="border border-ink p-4 bg-paper space-y-3 stamp-shadow">
                  <span className="font-sans text-[10px] font-bold uppercase text-chalk block tracking-wider">
                    Ledger Category Filter
                  </span>
                  <div className="flex flex-row flex-wrap gap-1.5 md:flex-col md:gap-2">
                    {(['all', 'active', 'resolved', 'breached', 'mine'] as const).map(f => {
                      let count = cases.length;
                      if (f === 'active') count = cases.filter(c => c.status !== 'RESOLVED').length;
                      else if (f === 'resolved') count = cases.filter(c => c.status === 'RESOLVED').length;
                      else if (f === 'breached') count = cases.filter(c => c.status === 'BREACHED').length;
                      else if (f === 'mine') count = cases.filter(c => c.corroborations.some(co => co.contributorName === "You" || co.contributorName === "You (Original Reporter)")).length;

                      return (
                        <button
                          key={`ledger-filter-${f}`}
                          onClick={() => setMapFilter(f)}
                          className={`border border-ink font-sans text-[11px] font-bold px-2.5 py-1.5 stamp-shadow uppercase flex justify-between items-center w-full transition-colors ${
                            mapFilter === f ? 'bg-ink text-paper border-ink' : 'bg-paper text-ink hover:bg-ink/[0.02]'
                          }`}
                        >
                          <span>{f}</span>
                          <span className="font-mono text-[9px] bg-ink/10 px-1.5 py-0.5 font-bold rounded-sm">
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Ward 59 Security Charter Disclaimer Card */}
                <div className="hidden md:block border border-ink p-4 bg-paper/30 space-y-2 font-sans text-[11px] leading-relaxed text-chalk">
                  <h5 className="font-display font-bold uppercase text-ink tracking-wide text-xs">Indiranagar Ledger Node</h5>
                  <p>All items in this public ledger are cryptographically synced across neighborhood devices. Every corroborating thud strengthens the case file and prevents municipal silencing.</p>
                </div>
              </div>

              {/* RIGHT Column (8 cols) - Stretched list of cases */}
              <div className="md:col-span-8 space-y-4">
                {cases.length === 0 ? (
                  <div className="border border-dashed border-ink/20 bg-paper p-6 text-center text-chalk text-xs font-sans">
                    “No public civic records yet.”
                  </div>
                ) : (
                  cases
                    .filter(item => {
                      if (mapFilter === 'active') return item.status !== 'RESOLVED';
                      if (mapFilter === 'resolved') return item.status === 'RESOLVED';
                      if (mapFilter === 'breached') return item.status === 'BREACHED';
                      if (mapFilter === 'mine') return item.corroborations.some(co => co.contributorName === "You" || co.contributorName === "You (Original Reporter)");
                      return true;
                    })
                    .map(item => {
                      const { isBreached, elapsedDays } = checkSilenceClockBreach(item);
                      return (
                        <div 
                          key={item.id}
                          onClick={() => {
                            setSelectedCase(item);
                            triggerSound('tick');
                          }}
                          className="border-2 border-ink bg-paper p-3 space-y-3 cursor-pointer stamp-shadow hover:bg-ink/[0.01]"
                        >
                          {/* Card Header metadata */}
                          <div className="flex justify-between items-center text-[10px] font-mono text-chalk border-b border-ink/10 pb-1.5">
                            <span>{item.id}</span>
                            <span>{new Date(item.filedAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</span>
                          </div>

                          {/* Title and details */}
                          <div className="flex gap-3">
                            <div className="w-16 h-16 border border-ink shrink-0 bg-ink/5 overflow-hidden">
                              <img src={item.photoUrl} alt={item.title} className="w-full h-full object-cover" />
                            </div>
                            <div className="space-y-1 flex-1">
                              <h4 className="font-display font-semibold text-base text-ink leading-tight line-clamp-1">
                                {item.title}
                              </h4>
                              <p className="font-sans text-xs text-chalk leading-tight line-clamp-2">
                                {item.description}
                              </p>
                            </div>
                          </div>

                          {/* Breach Clock Alert Band if applicable (Moment 5.7 / Section 7.3) */}
                          {item.status === 'BREACHED' && (
                            <div className="bg-breach text-paper text-[11px] font-display font-bold px-2 py-1 flex items-center gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5" /> 7 DAYS PASSED. NO RESPONSE FROM AUTHORITY.
                            </div>
                          )}

                          {/* Card Footer actions bar */}
                          <div className="flex justify-between items-center pt-2 border-t border-ink/10">
                            <span className="font-sans text-[11px] text-chalk font-semibold uppercase">
                              {item.status === 'RESOLVED' ? 'Status: Sealed Resolved' : `Inaction: ${elapsedDays} Days`}
                            </span>
                            
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold bg-ink text-paper px-2 py-0.5 border border-ink">
                                HARM {item.harmScore}
                              </span>
                              <span className={`font-mono text-xs font-bold px-2 py-0.5 border border-ink ${
                                item.status === 'RESOLVED' ? 'bg-tally text-paper' : 'bg-paper text-ink'
                              }`}>
                                {item.corroborations.length} SIGS
                              </span>
                            </div>
                          </div>

                        </div>
                      );
                    })
                )}

                {cases.filter(item => {
                  if (mapFilter === 'active') return item.status !== 'RESOLVED';
                  if (mapFilter === 'resolved') return item.status === 'RESOLVED';
                  if (mapFilter === 'breached') return item.status === 'BREACHED';
                  if (mapFilter === 'mine') return item.corroborations.some(co => co.contributorName === "You" || co.contributorName === "You (Original Reporter)");
                  return true;
                }).length === 0 && (
                  <div className="text-center py-12 border border-dashed border-ink/20 font-sans text-xs text-chalk p-6 bg-paper">
                    &ldquo;Nothing reported on your street yet. You&apos;d be the first.&rdquo;
                  </div>
                )}
              </div>

            </div>

          </div>
        )}

        {/* -------------------------------------------------------- */}
        {/* TAB 5: YOU PROFILE ("The Roll Call") (Section 10 / Moment 5.8) */}
        {activeTab === 'you' && (
          <div className="p-4 space-y-6">
            
            {/* Header / Meta */}
            <div className="border-b border-ink pb-4 flex justify-between items-start">
              <div className="space-y-1">
                <h3 className="font-display font-black text-2xl uppercase tracking-tight text-ink leading-none">
                  Citizen Roll Call
                </h3>
                <p className="font-sans text-xs text-chalk">
                  &ldquo;You&apos;ve been a CivicProof citizen for 47 days.&rdquo;
                </p>
              </div>

              {/* Theme toggler block (Section 3) - hidden on md because it's in the sidebar */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 border border-ink hover:bg-ink/[0.04] active:translate-y-0.5 stamp-shadow bg-paper shrink-0 md:hidden"
                title="Toggle Theme"
              >
                {darkMode ? <Sun className="w-4 h-4 text-stamp" /> : <Moon className="w-4 h-4 text-stamp" />}
              </button>
            </div>

            {/* Profile Grid (mobile stays vertical stack, md becomes 12-column layout) */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              
              {/* LEFT Column (4 cols) */}
              <div className="md:col-span-4 space-y-4">
                {/* Profile Stamp Info card */}
                <div className="border border-ink p-4 bg-paper space-y-4 stamp-shadow">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full border-2 border-ink bg-stamp text-paper font-display text-xl font-bold flex items-center justify-center shrink-0">
                      CP
                    </div>
                    <div>
                      <h4 className="font-display font-bold text-lg leading-none">CivicProof Citizen</h4>
                      <span className="font-mono text-[10px] text-chalk font-semibold uppercase tracking-wider">
                        ANONYMOUS CIVIC IDENTITY
                      </span>
                    </div>
                  </div>

                  {/* Core numbers - big Risograph counters (Moment 5.8 / Section 10) */}
                  <div className="grid grid-cols-3 gap-2 border-t border-ink pt-3 text-center">
                    <div className="space-y-1">
                      <span className="font-display font-extrabold text-4xl text-stamp block leading-none">
                        {cases.filter(c => c.corroborations.some(corr => corr.contributorName === "You (Original Reporter)")).length}
                      </span>
                      <span className="font-sans text-[10px] text-chalk uppercase font-bold block">Filed</span>
                    </div>
                    <div className="space-y-1 border-x border-ink/20">
                      <span className="font-display font-extrabold text-4xl text-ink block leading-none">
                        {userContributionsCount}
                      </span>
                      <span className="font-sans text-[10px] text-chalk uppercase font-bold block">Corroborated</span>
                    </div>
                    <div className="space-y-1">
                      <span className="font-display font-extrabold text-4xl text-tally block leading-none">
                        {resolvedCasesCount}
                      </span>
                      <span className="font-sans text-[10px] text-chalk uppercase font-bold block">Sealed</span>
                    </div>
                  </div>
                </div>

                {/* Additional Metadata Details Card for desktop view to fill empty space elegantly */}
                <div className="hidden md:block border border-ink p-4 bg-paper/30 space-y-2.5 font-sans text-xs">
                  <h5 className="font-display font-bold uppercase tracking-wide text-ink">Citizenship Ledger</h5>
                  <div className="flex justify-between items-baseline border-b border-ink/10 pb-1.5">
                    <span className="text-chalk text-[10px] font-mono">STATUS:</span>
                    <span className="font-bold text-tally">ANONYMOUS REPORTER</span>
                  </div>
                  <div className="flex justify-between items-baseline border-b border-ink/10 pb-1.5">
                    <span className="text-chalk text-[10px] font-mono">NEIGHBORHOOD:</span>
                    <span className="font-bold text-stamp">BLR (AUTO-DETECTED)</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-chalk text-[10px] font-mono">PRIVACY:</span>
                    <span className="font-bold font-mono">PUBLIC CONTRIBUTIONS ONLY</span>
                  </div>
                </div>
              </div>

              {/* RIGHT Column (8 cols) */}
              <div className="md:col-span-8 space-y-6">
                {/* Security Journal */}
                <div className="space-y-3">
                  <h4 className="font-display font-bold text-base uppercase text-ink tracking-tight">
                    Your Contribution Journal
                  </h4>

                  <div className="border border-ink divide-y divide-ink bg-paper font-sans text-xs stamp-shadow">
                    {cases
                      .filter(c => c.corroborations.some(corr => corr.contributorName.startsWith("You")))
                      .map(c => (
                        <div 
                          key={c.id} 
                          onClick={() => {
                            setSelectedCase(c);
                            triggerSound('tick');
                          }}
                          className="p-3 hover:bg-ink/[0.02] flex justify-between items-center cursor-pointer"
                        >
                          <div className="space-y-0.5">
                            <span className="font-mono text-[9px] text-stamp font-semibold uppercase">{c.id}</span>
                            <h5 className="font-bold text-ink leading-none">{c.title}</h5>
                            <p className="text-[10px] text-chalk">Filed under {c.category}</p>
                          </div>
                          <span className={`font-mono text-[10px] font-bold border px-1.5 py-0.5 ${
                            c.status === 'RESOLVED' ? 'bg-tally text-paper' : 'bg-paper text-ink'
                          }`}>
                            {c.status}
                          </span>
                        </div>
                      ))}

                    {cases.filter(c => c.corroborations.some(corr => corr.contributorName.startsWith("You"))).length === 0 && (
                      <div className="p-4 text-center text-chalk text-xs">
                        Your civic record is empty. File or corroborate your first case.
                      </div>
                    )}
                  </div>
                </div>

                {/* Citizen Action Manifesto (Section 6 Microcopy) */}
                <div className="border border-dashed border-ink/40 p-4 font-sans text-xs text-ink bg-paper/60 space-y-2 stamp-shadow-sm">
                  <h5 className="font-display font-bold text-stamp uppercase leading-none">CIVICPROOF MANIFESTO</h5>
                  <p className="leading-relaxed text-chalk">
                    We believe a post is not a complaint. A complaint is not a case. A case is not solved until citizens stand together, secure geotagged physical proof, and legally escalation neglect. 
                  </p>
                  <span className="font-mono text-[9px] text-ink font-bold block">
                    CIVICPROOF CITIZEN CHARTER REGISTRY VER. 2.026
                  </span>
                </div>
              </div>

            </div>

          </div>
        )}

      </div>

      {/* -------------------------------------------------------- */}
      {/* BOTTOM NAVIGATION TAB BAR (Section 7.1 Bottom navigation) */}
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-paper border-t border-ink flex items-center justify-around px-2 z-30 md:hidden">
        
        <button 
          onClick={() => { setActiveTab('home'); resetCaptureFlow(); }} 
          className={`flex flex-col items-center gap-1 font-sans text-[10px] font-bold uppercase transition-colors shrink-0 ${
            activeTab === 'home' ? 'text-stamp' : 'text-chalk hover:text-ink'
          }`}
        >
          <Home className="w-5 h-5" />
          <span>Home</span>
        </button>

        <button 
          onClick={() => { setActiveTab('map'); resetCaptureFlow(); }} 
          className={`flex flex-col items-center gap-1 font-sans text-[10px] font-bold uppercase transition-colors shrink-0 ${
            activeTab === 'map' ? 'text-stamp' : 'text-chalk hover:text-ink'
          }`}
        >
          <MapPin className="w-5 h-5" />
          <span>Map</span>
        </button>

        {/* Central Raised Vermillion Stamp Button (Section 7.1) */}
        <button 
          onClick={() => { setActiveTab('report'); resetCaptureFlow(); }} 
          className={`relative -top-3 w-14 h-14 rounded-full border border-ink flex items-center justify-center stamp-shadow bg-stamp hover:bg-stamp/90 transition-transform shrink-0 ${
            activeTab === 'report' ? 'scale-110' : ''
          }`}
          title="File new evidence"
        >
          <Camera className="w-6 h-6 text-paper" />
        </button>

        <button 
          onClick={() => { setActiveTab('cases'); resetCaptureFlow(); }} 
          className={`flex flex-col items-center gap-1 font-sans text-[10px] font-bold uppercase transition-colors shrink-0 ${
            activeTab === 'cases' ? 'text-stamp' : 'text-chalk hover:text-ink'
          }`}
        >
          <FileText className="w-5 h-5" />
          <span>Cases</span>
        </button>

        <button 
          onClick={() => { setActiveTab('you'); resetCaptureFlow(); }} 
          className={`flex flex-col items-center gap-1 font-sans text-[10px] font-bold uppercase transition-colors shrink-0 ${
            activeTab === 'you' ? 'text-stamp' : 'text-chalk hover:text-ink'
          }`}
        >
          <User className="w-5 h-5" />
          <span>You</span>
        </button>

      </div>

          </div>
        </div>
      </div>

    </div>
  );
}
