# Vascular Flow

Patient queue management for vascular surgery departments.

Speak or type a patient summary — AI extracts structured clinical fields and places the patient into a live priority queue. Cards can be tagged, grouped, dragged to reorder, and swiped right to discharge.

**Live app:** https://theodore-ng.github.io/vascular-patient-manage/

---

## Features

- **Voice Input** — press the mic and speak; Web Speech API captures the transcript in real time
- **AI Parsing** — Groq (Llama 3.3 70B) extracts Name, Age, Clinical Manifestation, Underlying Disease, and Imaging Diagnosis from free-form speech; clinical fields translated to English, name preserved as spoken
- **Priority Queue** — drag the handle on any card to reorder; order persists to the database
- **Swipe to Discharge** — slide a card right past the threshold to move it to history
- **Tags** — color-code cards (red / yellow / green) with an inline picker
- **Groups** — create named groups, assign patients, filter the queue by group
- **Notes** — per-card inline note editor
- **AI Consultant** — collapsible right panel for structured clinical consultation
- **History** — view discharged patients with one-tap restore back to queue
- **Cloud Persistence** — Supabase (PostgreSQL); falls back to `localStorage` if not configured

---

## Tech Stack

| | |
|---|---|
| Framework | React 19 + Vite 8 |
| Styling | Vanilla CSS |
| Icons | lucide-react |
| Drag & Drop | @dnd-kit/core + @dnd-kit/sortable |
| Voice | Web Speech API (browser-native) |
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

Supabase is optional. If omitted, the app uses `localStorage`.

### 3. Set up the Supabase table (optional)

Run this in your Supabase project's SQL editor:

```sql
create table patients (
  id                    uuid        primary key default gen_random_uuid(),
  name                  text,
  age                   integer,
  clinical_manifestation text,
  underlying_disease    text,
  imaging_diagnosis     text,
  position              integer     not null default 0,
  status                text        not null default 'queue',
  discharged_at         timestamptz,
  created_at            timestamptz default now()
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
├── App.jsx                    # State hub — patients, history, groups, add/remove/reorder/update
├── index.css                  # Single stylesheet — all design tokens and components
├── lib/
│   └── supabase.js            # Supabase client
├── services/
│   └── groq.js                # AI transcript parser → structured patient fields
├── hooks/
│   └── useSwipeRemove.js      # Pointer/touch swipe gesture hook
└── components/
    ├── VoiceInput.jsx         # Mic FAB, transcript, processing states
    ├── PatientFormModal.jsx   # Add / edit patient form
    ├── PatientQueue.jsx       # Drag-and-drop list with group filter chips
    ├── PatientCard.jsx        # Card with tag, group, note, voice update, edit
    ├── PatientHistory.jsx     # Discharged patients with restore
    ├── Sidebar.jsx            # Left navigation
    └── ConsultPanel.jsx       # Collapsible AI consultation panel
```

---

## Deployment

The app is deployed to GitHub Pages via GitHub Actions on every push to `main`.

To deploy your own fork:
1. Go to **Settings → Pages** and set source to **GitHub Actions**
2. Add these repository secrets under **Settings → Secrets and variables → Actions**:
   - `VITE_GROQ_API_KEY`
   - `VITE_SUPABASE_URL` (optional)
   - `VITE_SUPABASE_ANON_KEY` (optional)

---

## Browser Support

Voice input requires the Web Speech API: **Chrome 25+** and **Edge 79+**. All other features work in all modern browsers.

---

## Available Scripts

```bash
npm run dev       # Start development server
npm run build     # Build for production
npm run preview   # Preview the production build
npm run lint      # Run ESLint
```
