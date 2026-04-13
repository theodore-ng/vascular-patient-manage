# Vascular Flow

A high-end, responsive web application for vascular surgeons to manage patient flow using voice input and AI-powered parsing.

Speak a patient summary aloud — the app transcribes it, extracts structured clinical fields via AI, and places the patient into a live priority queue. Cards can be dragged to reorder and swiped right to dismiss.

---

## Features

- **Voice Input** — press the mic and speak; the Web Speech API captures the transcript in real time
- **AI Parsing** — Groq (Llama 3.3 70B) extracts Name, Age, Clinical Manifestation, Underlying Disease, and Imaging Diagnosis from free-form speech
- **Priority Queue** — drag the handle on any card to reorder patient priority; order persists to the database
- **Swipe to Remove** — slide a card to the right past the threshold to delete it with a smooth animated dismissal
- **Cloud Persistence** — patient data is stored in Supabase and survives page refreshes; falls back to `localStorage` if Supabase is not configured
- **Dark Glassmorphism UI** — high-contrast design built for clinical environments and mobile use

---

## Tech Stack

| | |
|---|---|
| Framework | React 19 + Vite 8 |
| Styling | Vanilla CSS — dark glassmorphism design system |
| Icons | lucide-react |
| Drag & Drop | @dnd-kit/core + @dnd-kit/sortable |
| Voice | Web Speech API (browser-native, no library) |
| AI | Groq API — `llama-3.3-70b-versatile` |
| Database | Supabase (PostgreSQL) |

---

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create a `.env` file in the project root:

```env
VITE_GROQ_API_KEY=gsk_...
VITE_SUPABASE_URL=https://<project-id>.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...
```

The Groq API key can also be set at runtime via the in-app Settings modal (gear icon) — it is saved to `localStorage`.

### 3. Set up the Supabase table

Run this in your Supabase project's SQL editor:

```sql
create table patients (
  id                     uuid        primary key default gen_random_uuid(),
  name                   text,
  age                    integer,
  clinical_manifestation text,
  underlying_disease     text,
  imaging_diagnosis      text,
  position               integer     not null default 0,
  created_at             timestamptz default now()
);
```

### 4. Start the dev server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in Chrome or Edge (required for voice input).

---

## Project Structure

```
src/
├── App.jsx                    # Root component — state, Supabase sync, settings modal
├── index.css                  # Global stylesheet — all design tokens and components
├── lib/
│   └── supabase.js            # Supabase client
├── services/
│   └── groq.js                # AI transcript parser → structured patient fields
├── hooks/
│   └── useSwipeRemove.js      # Pointer/touch swipe gesture hook
└── components/
    ├── VoiceInput.jsx         # Mic button, live transcript, processing states
    ├── PatientQueue.jsx       # Sortable drag-and-drop list container
    └── PatientCard.jsx        # Individual patient card with swipe-to-remove
```

---

## How It Works

```
Surgeon speaks
    ↓  Web Speech API
Transcript string
    ↓  Groq API (llama-3.3-70b-versatile)
Structured JSON  { name, age, clinicalManifestation, underlyingDisease, imagingDiagnosis }
    ↓  App state + Supabase insert
Patient card appears in queue
    ↓  Drag handle → reorder → Supabase position update
    ↓  Swipe right  → remove  → Supabase delete
```

---

## Browser Support

Voice input requires the Web Speech API, which is supported in **Chrome 25+** and **Edge 79+**. All other features (drag-and-drop, swipe, database sync) work in all modern browsers.

---

## Available Scripts

```bash
npm run dev       # Start development server
npm run build     # Build for production
npm run preview   # Preview the production build
npm run lint      # Run ESLint
```
