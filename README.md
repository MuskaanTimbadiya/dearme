<div align="center">

# 🌿 DearMe - Mindful Intelligence & Reflection Space

<p align="center">
  <img src="https://readme-typing-svg.demolab.com?font=Cormorant+Garamond&weight=600&size=24&pause=1000&color=5A5A40&center=true&vCenter=true&width=600&lines=Your+Private+AI-Powered+Reflection+Journal;Voice+Notes%2C+Photo+Attachments+%26+Speech-To-Text;Tailored+Typography+%26+Ambient+Paper+Themes;Owner-Isolated+Firestore+%26+Resilient+Gemini+AI" alt="Typing SVG" />
</p>

[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini-3.6_Flash-8E75B2?style=for-the-badge&logo=googlecloud&logoColor=white)](https://deepmind.google/technologies/gemini/)
[![Firebase](https://img.shields.io/badge/Firebase-Auth_%26_Firestore-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Vite](https://img.shields.io/badge/Vite-6.2-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)

<p align="center">
  <b>DearMe</b> is a full-stack, mindfulness-focused personal reflection and journaling application featuring voice notes, speech-to-text transcription, photo attachments, ambient paper themes, customizable typography, geolocation auto-detection, and resilient AI synthesis powered by Google Gemini and Google Cloud Firestore.
</p>

---

</div>

## ✨ Core Features & Highlights

```
 📜 Paper Palettes    ───>  Warm Parchment | Sage Forest | Rose Quartz | Midnight Sky
 ✒️ Typography        ───>  Classic Garamond | Handwritten Caveat | Bookish Lora | Typewriter Mono
 🌐 Multilingual      ───>  English | हिन्दी (Hindi) | ગુજરાતી (Gujarati) with 🌐 Navbar Picker
 🕰️ On This Day       ───>  Surfaces Past Entry Memories (1 Year / Month / Week Ago)
 🎙️ Voice & Speech    ───>  MediaRecorder Audio Notes + Real-time Web Speech Transcription
 🔔 Reminders         ───>  Custom Schedule | Web Audio Soft Chime | Native Push & In-App Banner
 📷 Media Attachments ───>  Base64 Image Uploads + Interactive Lightbox Viewer
 😃 Emoji Suite       ───>  Composer Picker Popover | Entry Icons | Message Emoji Reactions
 📍 Geolocation       ───>  1-Click Auto-Detect + Google Places & OpenStreetMap Fallback Search
 💬 DearMe Companion  ───>  Empathetic Socratic Guide | Fact Callbacks | Crisis Support Helplines
 🛡️ Security First    ───>  Firebase Auth Middleware + Owner-Isolated Firestore Rules
```

---

## 🎨 Personalization & Mindful Companionship

- 📜 **Ambient Paper Themes**: Switch seamlessly between **Warm Parchment** 📜, **Sage Forest** 🌿, **Rose Quartz** 🌸, and **Midnight Starlight** 🌌. Text boxes and message bubbles automatically adapt to high-contrast readable colors without unwanted OS dark-mode glitches.
- ✒️ **Custom Journal Typography**: Tailor your reflection fonts in real time using Google Fonts (*Classic Garamond*, *Handwritten Diary Caveat*, *Bookish Lora*, *Typewriter Mono*, *Modern Clean*).
- 🌐 **Multilingual Support (English, Hindi, Gujarati)**:
  - Toggle between **English**, **हिन्दी (Hindi)**, and **ગુજરાતી (Gujarati)** via the Globe 🌐 dropdown in the navigation bar.
  - Generates AI responses and synthesized reflection summaries in natural Devanagari Hindi or Gujarati script.
  - Automatically saves language preference to `localStorage`.
- 🕰️ **"On This Day" Memory Surfacing**:
  - Automatically matches and surfaces past journal entries created on the same date **1 year**, **1 month**, or **1 week** ago.
  - Featured in the sidebar spotlight banner and mindfulness insights modal with **Revisit Entry** and **Reflect** CTAs.
- 🔔 **Reflection Reminders & Notifications**:
  - Flexible scheduling (Daily, Weekdays, Weekends, Custom Days) with 24-hour time picking.
  - Web Audio synthesized soft chimes and browser native push notifications.
  - Floating in-app reminder banner alert with 1-click **Start Reflection** CTA.
- 💬 **DearMe Journaling Companion & Crisis Support**:
  - Non-clinical, gentle, curious Socratic companion prompt.
  - Extracts 0-3 concrete third-person `callback_facts` from entry synthesis and references at most ONE per session when relevant.
  - Integrated distress detection surfacing free, 24/7 India helplines (**Tele MANAS: 14416** & **KIRAN: 1800-599-0019**).
- 📍 **Worldwide Location Pinning & OpenStreetMap Fallback**:
  - Auto-detect current browser location with 1 click.
  - Autocomplete place search powered by Google Places API with automatic **OpenStreetMap Nominatim** fallback when no API key is provided.
  - Instant custom location text pinning with **Enter** key support.
- ⌨️ **Intuitive Keyboard Composer**:
  - Press **Enter** to immediately send reflection messages.
  - Press **Shift + Enter** to insert newlines in the textarea.

---

## 🔒 Security Architecture & Threat Model

| Threat Zone | Identified Risks | Countermeasure & Implementation |
| :--- | :--- | :--- |
| **Input Surfaces** | Malicious payloads, NoSQL/Firestore injection, oversized prompts | Top-level body parsing with strict schema validation, input slicing, null-safe destructuring, client 8k character caps, and Canvas image downscaling (1200px max JPEG). |
| **Rate Limiting & Memory Hygiene** | Distributed DoS attacks, memory leaks | In-memory IP & User sliding window rate limiters with 10-min automated `setInterval` eviction cleanup. *(Note: For multi-instance Cloud Run deployments, back with Redis/Memorystore or Firestore TTL counters).* |
| **Planning & Reasoning** | Prompt injection, goal hijacking, tone disruption | System prompt boundaries, instruction hardening, and temperature stabilization (0.7). |
| **Tool Execution** | API credential exposure, SSRF, backend exhaustion | Server-side Gemini proxy (`/api/chat`, `/api/chat/stream`, `/api/summarize`), Google Places API proxy (`/api/places/autocomplete`), zero client-side API key exposure. |
| **Memory & State** | Cross-user data leakage, unauthorized reads/writes, silent write failures | Path-scoped Firestore security rules (`request.auth.uid == userId`), message subcollections (`/entries/{entryId}/messages/{messageId}`), `sanitizeFirestorePayload` (stripping `undefined`), and strict input-to-save transaction verification. |
| **Inter-System Communication** | Token theft, secret leak in VCS, PII leak in webhooks | Google Cloud Secret Manager / env var injection for `GEMINI_API_KEY`, `GOOGLE_MAPS_API_KEY`, and `EXTERNAL_WEBHOOK_URL`. Strict PII stripping on asynchronous webhook notifications. |

---

## 🚀 Architecture Overview

- **Frontend**: React 19, Vite 6, Tailwind CSS v4, Lucide icons, Markdown rendering, Web Audio & Web Speech API.
- **Backend API**: Express on Node.js / Cloud Run proxying Gemini AI with the resilient fallback ladder (`gemini-3.6-flash` → `gemini-3.5-flash-lite` → `gemini-flash-latest` → `gemini-3.7-flash`). Note: This ladder is kept strictly in sync with `server.ts`.
- **Authentication**: Firebase Authentication (Federated Google Sign-In with Server-Side ID Token Verification).
- **Database**: Google Cloud Firestore with owner-isolated security rules (`/users/{userId}/entries/{entryId}`).

---

## 🛠️ Local Development & Quickstart

```bash
# 1. Clone the repository
git clone https://github.com/MuskaanTimbadiya/dearme.git
cd dearme

# 2. Configure environment variables
cp .env.example .env
# Edit .env and set your GEMINI_API_KEY (and optionally GOOGLE_MAPS_API_KEY)

# 3. Install dependencies
npm install

# 4. Start the local server
npm run dev
```

> **Note**: `firebase-applet-config.json` already contains the public Firebase web config, so no additional Firebase setup is needed for local development against the existing project.

---

<details>
<summary><b>☁️ Google Cloud & Deployment Setup (Expand)</b></summary>

### 1. Enable Required Cloud APIs

```bash
gcloud services enable \
  run.googleapis.com \
  secretmanager.googleapis.com \
  firestore.googleapis.com \
  cloudbuild.googleapis.com
```

### 2. Configure Secret Manager for API Keys

```bash
# Create the secrets in Secret Manager
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
gcloud secrets create GOOGLE_MAPS_API_KEY --replication-policy="automatic"
gcloud secrets create EXTERNAL_WEBHOOK_URL --replication-policy="automatic"

# Inject your values into the secrets
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-
echo -n "YOUR_MAPS_API_KEY" | gcloud secrets versions add GOOGLE_MAPS_API_KEY --data-file=-
echo -n "YOUR_WEBHOOK_URL" | gcloud secrets versions add EXTERNAL_WEBHOOK_URL --data-file=-

# Grant Cloud Run Service Account permission to read the secrets
PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) --format="value(projectNumber)")
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### 3. Deploy Cloud Firestore Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    function isAdmin() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    match /users/{userId} {
      allow read: if request.auth != null && (request.auth.uid == userId || isAdmin());
      allow write: if request.auth != null && (
        (request.auth.uid == userId && (!request.resource.data.diff(resource.data).affectedKeys().hasAny(['role']))) 
        || isAdmin()
      );

      match /entries/{entryId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;

        match /messages/{messageId} {
          allow read, write: if request.auth != null && request.auth.uid == userId;
        }
      }
    }
  }
}
```

```bash
firebase deploy --only firestore:rules
```

### 4. Build and Deploy to Cloud Run

```bash
gcloud run deploy aura-reflect \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest" \
  --port 3000

# Apply campaign verification label
gcloud run services update aura-reflect \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=us-central1
```

</details>

---

## 🧪 Comprehensive Walkthrough & Test Suite

### Journey 1: Federated Authentication & Token Middleware
- **Test Case 1.1 (Sign In)**: Click **"Begin Your Reflection"** → triggers Google OAuth popup → authenticates and receives Firebase ID Token.
- **Test Case 1.2 (Auth Middleware Protection)**: Verify `/api/chat`, `/api/summarize`, and `/api/places/autocomplete` return `401 Unauthorized` without a valid Bearer token.

### Journey 2: Voice Notes & Speech-to-Text
- **Test Case 2.1 (Voice Recording)**: Click the **Microphone** icon → grant permission → observe live audio waveform pulse animation & elapsed timer → click **Stop** → preview audio playback.
- **Test Case 2.2 (Speech Transcription)**: Speak during voice recording → observe live real-time transcript fill the transcription box → click **Attach Note**.

### Journey 3: Photo Attachments & Lightbox Viewer
- **Test Case 3.1 (Photo Attachment)**: Click the **Photo** icon → select an image file → observe preview thumbnail chip appear → press **Send**.
- **Test Case 3.2 (Lightbox View)**: Click any attached photo in a message bubble → opens full-screen interactive Lightbox modal.

### Journey 4: Custom Typography, Themes & Emojis
- **Test Case 4.1 (Font Switcher)**: Open Palette menu 🎨 → select *Handwritten Caveat* or *Typewriter Mono* → verify text font updates instantly.
- **Test Case 4.2 (Paper Theme Switcher)**: Select *Sage Forest* or *Midnight Starlight* → verify background and card styling adapt seamlessly.
- **Test Case 4.3 (Emoji Popover & Reactions)**: Click smile icon 😊 → select emoji → tap quick reaction badges (`❤️`, `🙏`, `✨`) on message bubbles.

### Journey 5: Geolocation & Archive Management
- **Test Case 5.1 (1-Click Auto-Location & OSM Fallback)**: Click **Map Pin** 📍 → click **Auto-Detect** or type location query → place predictions render using Places API or OpenStreetMap Nominatim.
- **Test Case 5.2 (Sorting Archive)**: Select **Sort By** dropdown in sidebar → sort by **Newest**, **Oldest**, **Title (A-Z)**, or **Most Activity**.

### Journey 6: Reflection Reminders & Keyboard Shortcuts
- **Test Case 6.1 (Reminder Schedule)**: Click Bell icon 🔔 in Navbar → set schedule (Daily 20:00) → click **Send Test Notification** → floating in-app banner alert pops up immediately.
- **Test Case 6.2 (Start Reflection CTA)**: Click **Start Reflection** on banner alert → app creates a new reflection pre-filled with custom reminder prompt.
- **Test Case 6.3 (Keyboard Sending)**: Type reflection message → press **Enter** (sends entry) → press **Shift + Enter** (inserts newline).

### Journey 7: Multilingual Support & On This Day Memories
- **Test Case 7.1 (Language Picker)**: Select **हिन्दी (Hindi)** or **ગુજરાતી (Gujarati)** in Navbar 🌐 → UI text updates instantly → AI responses stream in natural Hindi/Gujarati script.
- **Test Case 7.2 (On This Day Spotlight)**: View sidebar spotlight banner or Insights modal → click **Revisit Entry** or **Reflect** → creates pre-filled memory reflection.

---

## 🧪 Automated Test Suite Execution

```bash
# Run complete automated test suite against Firebase Firestore Emulator
npm test
```

- `tests/translations.test.ts`: **5/5 passed** (Key structural parity, Hindi, Gujarati, English fallback)
- `tests/onThisDay.test.ts`: **4/4 passed** (1 year ago, 1 month ago, 1 week ago, fallback calculation)
- `tests/server.test.ts`: **6/6 passed** (Payload validation, strict schema, chat with callbacks and language parameter)
- `tests/reminder.test.ts`: **6/6 passed** (Schedule matching, day calculations, formatting)
- `tests/firestore.rules.test.ts`: **9/9 passed** (Owner data isolation, cross-user write rejection, role escalation prevention)

**Total**: **30/30 passed** (0 failures).

---

## 📄 License
MIT License
