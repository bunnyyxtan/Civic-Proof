# CivicProof Submission Document

## 1. Project Title
**CivicProof**

## 2. Problem Statement & Mission
* **Problem:** Traditional municipal grievance portals treat complaints as isolated, text-only tickets. This results in duplicate filing spam, high administrative waste, absence of visual context, and total lack of accountability when official SLAs are breached in silence.
* **Mission:** Turn citizen-led local reports into high-integrity, evidence-backed civic case files that can be automatically analyzed, deduplicated, scored by public safety risk, routed, and forensically verified upon resolution.

---

## 3. Product Features & Core Loops

### A. Cognitive Evidence Extraction
Gemini-powered visual-cognitive capture parses geotagged photographs and translates voice recordings into structured technical assessments of localized defects.

### B. Duplicate-to-Corroboration Link
If a report matches an existing open issue within 450 meters and shares issue characteristics, it is merged as a "verified signature endorsement" of the parent docket rather than generating a duplicate ticket, concentrating citizen demand.

### C. Deterministic Harm Score
Computes a dynamic risk score from 0 to 100 based on standard categories, severity level, proximity to schools or hospitals, and unaddressed silence durations.

### D. Automated Department Routing & SLAs
Directly dispatches issues to BBMP (Roads, Solid Waste Management) or BWSSB (Sewage, Water Supply) with fixed Citizen Charter SLAs.

### E. Watchdog Silence Clock
Tracks unaddressed department silence against SLAs, automatically raising case flags to warning or overdue levels, and unlocking formal administrative escalation petitions.

### F. Forensic Resolution Audit
Compares post-repair photographic proof with original defect records to forensically audit repair quality before sealing the case file.

---

## 4. Technical Architecture & Tech Stack
* **Frontend:** Next.js 15 with App Router, Tailwind CSS, motion animations, and a bespoke "Neighborhood Native" retro terminal and Polaroid develop interface.
* **AI Cognitive Layer:** Server-side @google/genai SDK leveraging the highly-responsive `gemini-3.5-flash` model.
* **Deterministic Logic:** Modular pure TypeScript functions controlling math, state transitions, timeline generation, and template formatting.
* **Validation:** Strict runtime contract verification using Zod schemas.
* **Persistence:** Client-side LocalStorage synced with transient in-memory server cache to support seamless sandbox testing.
