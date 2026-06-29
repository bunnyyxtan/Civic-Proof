# CivicProof

### &ldquo;Citizens do not need another complaint form. They need civic proof.&rdquo;

CivicProof is a hyperlocal problem solver and accountability engine built for the **Vibe2Ship Hackathon — Coding Ninjas x Google for Developers**. It transforms unstructured civic complaints, tweets, and citizen voices into structured, aggregated, legally robust cases of verified community harm.

---

## 🏛️ Selected Problem Statement

Municipal grievance portals are built to fail by design. They suffer from:
1. **The Duplicate Noise Problem**: 50 individual citizens reporting the same pothole results in 50 separate tickets, creating administrative backlog and dilution.
2. **Systemic Government Apathy**: Reports are filed and quietly buried. There is no visible, binding countdown clock that penalizes administrative inaction.
3. **Filing Ambiguity**: Citizens do not know which complex municipal department (e.g. BBMP, BWSSB, BESCOM in Bengaluru) holds jurisdiction, causing wrong routing and dropped issues.

---

## 🚀 What CivicProof Does

CivicProof acts as an agentic intermediary between the community and municipal departments:
* **Evidence Consolidation**: Takes voice transcripts, photos, and geotags. If a duplicate is detected nearby, it compiles it as a **corroboration** of the master case rather than creating a new ticket.
* **Deterministic Harm Scoring**: Dynamically calculates a total public hazard score (1-100) based on safety severity, number of corroborators, proximity to schools/hospitals, and duration.
* **Smart Agency Routing**: Maps reports directly to correct municipal bodies based on jurisdictional categories and GPS coordinates.
* **Silence Clock Accountability**: Starts an active SLA countdown timer (7 days) the moment an issue is routed.
* **Automated Escalation Mobilization**: If the Silence Clock expires without resolution, the engine automatically drafts higher-level legal briefs targeted to commissioners and public ombudsmen.

---

## 💡 Unique Innovation
1. **The Silence Clock**: An immutable timeline tracking administrative silence. Inaction becomes public, searchable telemetry.
2. **Duplicate-to-Corroboration Fusion**: Fuses multiple reports within a 450-meter radius into a single master case, multiplying its community weight and urgency.

---

## 💻 Tech Stack & Google Technologies Used

* **Next.js 15+ (App Router)**: High-performance, production-ready React framework.
* **Google Gemini API**: Utilized server-side (`@google/genai` SDK) to parse unstructured citizen voice transcripts, extract clean telemetry, and compose formal legal escalation briefs.
* **Google Cloud Firestore**: Provides durable, multi-user real-time persistence of all active cases, timelines, and corroboration ledgers.
* **Tailwind CSS v4**: Adaptive, high-contrast visual interface styled with Inter and JetBrains Mono typography.
* **Motion**: Smooth, high-fidelity micro-interactions and staggered route transitions.

---

## 🛠️ How to Run & Test

### Prerequisites
* Node.js (v18+)
* NPM (v10+)

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Create a `.env.local` file at the root:
```env
# Gemini API Key for NLP extraction & packet generation
GEMINI_API_KEY=your_gemini_api_key

# Optional: Firebase Admin Service Account credentials for live Cloud Firestore
FIRESTORE_ENABLED=true
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_client_email
FIREBASE_PRIVATE_KEY="your_private_key"
```
*Note: If Firestore credentials are not supplied, the application automatically enters **Local Mock Mode**, preserving state in browser storage so the app remains fully testable without database configuration.*

### 3. Build & Compile
To verify strict type safety and compile:
```bash
npm run build
```

### 4. Run Development Server
```bash
npm run dev
```

---

## 🔌 API Routes Reference

CivicProof includes direct developer diagnostics and test utility routes:
* **`GET /api/cases`**: Returns the list of all active and resolved civic cases in the database.
* **`GET /api/demo/persistence-health`**: Checks Firestore service credentials and read/write connection health.
* **`GET /api/demo/seed-cases`**: Seeds the database with standard indiranagar, Bengaluru test issues.
* **`GET /api/demo/engine-smoke`**: Executes a programmatic suite verifying calculations, SLA breaches, and routing logic.
* **`GET /api/demo/ai-health`**: Assesses Gemini SDK load status, model configs, and fallback statuses.

---

## 🎥 90-Second Demo Flow

Watch the core product narrative unfold on the `/demo` route:
1. **Ingest**: Citizen reports an open drain next to Indiranagar Saint Mary's School.
2. **Parse**: AI parses voice audio and extracts coordinates.
3. **Lookup**: Proximity lookup finds an existing case 60m away.
4. **Merge**: Duplicate is consolidated as corroboration on the master case.
5. **Score**: Harm Score increases to 89 (Critical) because of school zone and multiple witnesses.
6. **Route**: BWSSB Water Board is assigned.
7. **Draft**: Official Public Complaint letter compiled.
8. **Track**: Silence Clock ticks past 7 days SLA.
9. **Escalate**: Senior Commissioner escalation brief prepared.
10. **Resolve**: Final closure audited via repair photos.

---

## ⚠️ Known Limitations
* **Geofencing**: Current presets and automatic routing are mapped to Bengaluru wards; expanding to outer municipal regions requires additional GIS mapping files.
* **Sandbox Auth**: Administrative user gates are modeled locally for demonstration simplicity.

---

### **&ldquo;CivicProof turns posts into proof, duplicates into verification, and complaints into cases.&rdquo;**
