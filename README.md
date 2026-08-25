# Aura Reflect - AI-Powered Reflection & Private Journal

Aura Reflect is a full-stack, mindfulness-focused personal reflection and journaling application built with React, TypeScript, Express, Google Cloud Firestore, Firebase Authentication, and Google Gemini.

---

## 🔒 Security Architecture & Threat Model

| Threat Zone | Identified Risks | Countermeasure & Implementation |
| :--- | :--- | :--- |
| **Input Surfaces** | Malicious payloads, NoSQL/Firestore injection, oversized prompts | Top-level body parsing with strict schema validation, input slicing, null-safe destructuring, and payload sanitation. |
| **Planning & Reasoning** | Prompt injection, goal hijacking, tone disruption | System prompt boundaries, instruction hardening, and temperature stabilization (0.7). |
| **Tool Execution** | API credential exposure, SSRF, backend exhaustion | Server-side Gemini proxy (`/api/chat`, `/api/summarize`), zero client-side API key exposure. |
| **Memory & State** | Cross-user data leakage, unauthorized reads/writes | Path-scoped Firestore security rules (`request.auth.uid == userId`) and `sanitizeFirestorePayload` (stripping `undefined`). |
| **Inter-System Communication** | Token theft, secret leak in VCS | Google Cloud Secret Manager / env var injection for `GEMINI_API_KEY`, Federated Google OAuth. |

---

## 🚀 Architecture Overview

- **Frontend**: React 18, Vite, Tailwind CSS, Lucide icons, Markdown rendering.
- **Backend API**: Express on Node.js / Cloud Run proxying Gemini AI with the resilient fallback ladder (`gemini-2.5-flash` → `gemini-2.5-flash-lite` → `gemini-flash-latest` → `gemini-2.5-pro`).
- **Authentication**: Firebase Authentication (Federated Google Sign-In).
- **Database**: Google Cloud Firestore with owner-isolated security rules (`/users/{userId}/entries/{entryId}`).

---

## 🛠️ Prerequisites & Environment Setup

1. **Google Cloud SDK (`gcloud`)**: Installed and authenticated.
2. **Node.js**: v18 or higher.
3. **Google Cloud Project**: With billing enabled.

### 1. Enable Required Cloud APIs

```bash
gcloud services enable \
  run.googleapis.com \
  secretmanager.googleapis.com \
  firestore.googleapis.com \
  cloudbuild.googleapis.com
```

### 2. Configure Secret Manager for `GEMINI_API_KEY`

```bash
# Create the secret in Secret Manager
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"

# Inject your Gemini API Key into the secret
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# Grant Cloud Run Service Account permission to read the secret
PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) --format="value(projectNumber)")
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## 🛡️ Firestore Security Rules

Deploy the following security rules in `firestore.rules` to enforce owner isolation:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User profile doc isolation
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;

      // User's private journal entries
      match /entries/{entryId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;

        // Subcollections for messages
        match /messages/{messageId} {
          allow read, write: if request.auth != null && request.auth.uid == userId;
        }
      }
    }
  }
}
```

Deploy the rules using Firebase CLI:
```bash
firebase deploy --only firestore:rules
```

---

## 📦 Cloud Run Deployment

### 1. Build and Deploy to Cloud Run

```bash
gcloud run deploy aura-reflect \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest" \
  --port 3000
```

### 2. Campaign Verification Labeling

To register the service for automated challenge verification, apply the mandatory campaign label:

```bash
gcloud run services update aura-reflect \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=us-central1
```

---

## 🧪 Comprehensive Walkthrough & Test Suite

### Journey 1: Federated Google Authentication
- **Test Case 1.1 (Sign In)**: Click **"Begin Your Reflection"** on the landing page → triggers Google OAuth popup → authenticates and loads user workspace.
- **Test Case 1.2 (Sign Out)**: Click the **LogOut** icon in the navbar → clears session state and returns to landing page.

### Journey 2: Multi-Turn Reflection & Gemini AI
- **Test Case 2.1 (Reflection Prompt)**: Select a reflection starter or type in a thought → press **Send** (`Cmd/Ctrl + Enter`) → message appears in right bubble; Gemini responds with empathetic markdown guidance.
- **Test Case 2.2 (Mode Switching)**: Toggle between **Reflect**, **Brainstorm**, and **Actions** → verify system prompt adapts perspective exploration or concrete micro-steps.
- **Test Case 2.3 (Fallback Ladder)**: In the event of primary model latency, server transparently falls back through `gemini-2.5-flash-lite` and `gemini-flash-latest` without interrupting the session.

### Journey 3: Synthesis & Takeaways
- **Test Case 3.1 (Synthesize Insights)**: Click **"Synthesize Insights"** → Gemini generates a 6-word title, mood badge, 2-3 sentence overview, and core bulleted takeaways.
- **Test Case 3.2 (Rename Entry)**: Click on the entry title in the header → edit inline → press **Enter** to save.

### Journey 4: Persistence & Archive Management
- **Test Case 4.1 (Automatic Firestore Persistence)**: Every turn and synthesized insight updates Firestore in real-time under `/users/{uid}/entries/{id}`.
- **Test Case 4.2 (Search & Filter)**: Use the sidebar search bar to filter reflections by keyword or toggle the **Favorites** filter.
- **Test Case 4.3 (Deletion)**: Click the trash icon on a reflection card → confirm delete → entry is removed from Firestore and UI.

---

## 📄 License
MIT License
