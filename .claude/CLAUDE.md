# Vascular Flow — Claude Code Guide

> Patient queue management for vascular surgery departments.
> Voice / text → AI → structured patient card → drag-to-reorder → swipe-to-discharge → history.

---

## Quick Start

```bash
npm run dev        # dev server at http://localhost:5173
npm run build      # production build → dist/
npm run preview    # preview production build locally
npm run lint       # ESLint check
```

---

## Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | React 19 + Vite 8 | ES modules, HMR |
| Styling | Vanilla CSS (index.css) | White/light modern, CSS variables |
| Icons | lucide-react | 20–22 px, strokeWidth 1.5–2 |
| Drag & Drop | @dnd-kit/core + sortable + modifiers | Touch + pointer, vertical axis only |
| Voice | Web Speech API (browser-native) | Chrome / Edge only; no library needed |
| AI Parsing | Groq API — `llama-3.3-70b-versatile` | temperature 0.1, JSON-only output |
| Database | Supabase (postgres) | Falls back to localStorage if unconfigured |

---

## Environment Variables

File: `.env` in project root (never commit this).

```
VITE_GROQ_API_KEY=gsk_...        # Required — Groq API key for AI parsing
VITE_SUPABASE_URL=https://...    # Optional — Supabase project URL
VITE_SUPABASE_ANON_KEY=sb_...    # Optional — Supabase publishable key
```

If `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are blank, the app silently
falls back to `localStorage` under the keys `vascular_patients` and `vascular_history`.

The Groq key can also be set at runtime via Settings (gear icon) and is stored
in `localStorage` as `groq_api_key`.

---

## Supabase Schema

Run once (or migrate) in the Supabase SQL editor for your project
(`vxjwcarfxxgchvalwiyn.supabase.co`):

```sql
create table patients (
  id                    uuid        primary key default gen_random_uuid(),
  name                  text,
  age                   integer,
  clinical_manifestation text,
  underlying_disease    text,
  imaging_diagnosis     text,
  position              integer     not null default 0,
  status                text        not null default 'queue',   -- 'queue' | 'discharged'
  discharged_at         timestamptz,
  tag                   text,
  group_name            text,
  note                  text,
  created_at            timestamptz default now()
);
```

**RLS:** If Row Level Security is enabled, add a policy allowing anon reads/writes,
or use the service-role key server-side.

---

## Architecture

```
src/
├── main.jsx
├── App.jsx                  # State hub: patients[], history[], filters, layout state
├── index.css                # Single stylesheet — all design tokens & components
│
├── lib/
│   └── supabase.js          # createClient() — URL + anon key from env
│
├── services/
│   └── groq.js              # parsePatientTranscript() · autoGroupPatients() · VASCULAR_GROUPS
│
├── hooks/
│   └── useSwipeRemove.js    # pointer/touch → translateX state → onRemove()
│                            #   threshold: 120 px rightward
│
└── components/
    ├── VoiceInput.jsx        # headless voice recorder; controlled via startRef/stopRef
    ├── PatientFormModal.jsx  # add / edit patient fields modal
    ├── PatientQueue.jsx      # DndContext + SortableContext; display-only (no filter UI)
    ├── PatientHistory.jsx    # discharged patients list with restore
    ├── Sidebar.jsx           # left nav + expandable Filters panel
    ├── ConsultPanel.jsx      # AI consultant chat (right column on desktop)
    ├── PatientCard.jsx       # compact card with inline edit, voice, note, expand
    └── ToolsPanel.jsx        # AI auto-group tool
```

### Layout (3-column, desktop)

```
┌────────────┬──────────────────────┬──────────────┐
│  Sidebar   │    Center column     │  Right panel │
│ (220px)    │       (1fr)          │   (380px)    │
│            │                      │              │
│ nav items  │  PatientQueue /      │ ConsultPanel │
│ + Filters  │  History / Tools     │  (always on) │
│   panel    │                      │              │
└────────────┴──────────────────────┴──────────────┘
```

On mobile (≤720px): single column, sidebar becomes a top icon bar, ConsultPanel
shown full-height when "AI Consultant" nav item is selected.

### Data flow

```
[Surgeon speaks]
      ↓  Web Speech API — onend fires after all onresult events complete
[Transcript string]
      ↓  groq.parsePatientTranscript()
[PatientFields JSON]  { name, age, clinicalManifestation, underlyingDisease, imagingDiagnosis }
      ↓  App.addPatient()  →  optimistic UI update + Supabase insert (status='queue')

[Text form (+ FAB)]
      ↓  PatientFormModal submit
      ↓  App.addPatient() or App.updatePatient()

[PatientCard rendered in queue]
      ↓  queue badge hold (@dnd-kit)   →  App.reorderPatients()  → Supabase position updates
      ↓  swipe right (useSwipeRemove)  →  App.removePatient()    → Supabase soft-delete
      ↓  Edit btn (per card)           →  PatientFormModal        → App.updatePatient()
      ↓  Mic btn (per card)            →  App.updatePatient()     → Supabase PATCH

[Filters (sidebar)]
      ↓  sortBy / tagFilter / activeGroupFilter live in App.jsx
      ↓  Sidebar renders controls, PatientQueue applies them (read-only props)

[History view]
      ↓  Sidebar "History" click  →  currentView='history'  →  PatientHistory rendered
      ↓  Restore btn              →  App.restorePatient()   →  Supabase status='queue'
```

---

## Key Files & Patterns

### `src/services/groq.js`
- Sends transcript to `https://api.groq.com/openai/v1/chat/completions`
- System prompt instructs the model to return **only** a JSON object with five keys
- JSON parsing has a regex fallback for markdown-wrapped responses
- Exports `VASCULAR_GROUPS` — the 9 fixed group names used by Sidebar, PatientCard, ToolsPanel
- `autoGroupPatients(patients)` — single batch call → `[{ id, group }]`

### `src/hooks/useSwipeRemove.js`
- Attaches `pointerdown / pointermove / pointerup` to the card element via `useRef`
- Cancels tracking if vertical delta exceeds horizontal (scroll protection)
- Returns `{ ref, translateX, openSide, close }`

### `src/components/VoiceInput.jsx`
- Speech recognition language defaults to `vi-VN` (Vietnamese)
- **Does not render its own button** — controlled entirely by parent via refs:
  - `startRef` / `stopRef` — parent calls these to start/stop recording
  - `onStatusChange(status)` — fired on every state transition
- Renders only a status pill when active (recording, processing, error)
- **Critical:** all transcript processing happens in `recognition.onend` — see `technicals/voice-speech.md`

### `src/components/PatientCard.jsx`
- Left column: note button + queue badge (drag handle, `touch-action: none`) + expand toggle below badge
- Expand toggle: small grey transparent pill (22×14px), not the old blue circle
- Drag: `{...listeners}` on badge only; `{...attributes}` (ARIA) on outer wrapper
- Voice update: inline SpeechRecognition → Groq parse → `onUpdate(id, fields)` (non-null fields only)

### `src/components/Sidebar.jsx`
- Nav sections: **Workspace** (Queue, History, Filters, Reports) · **Tools** (AI Consultant, Tools)
- "Filters" item (SlidersHorizontal icon): clicking toggles an expandable sub-panel inline
  - Sub-panel has Sort by, Tag, and Group sections
  - Blue dot indicator on the item when any filter is active
  - "Reset all filters" button clears everything
  - Clicking Filters also switches `currentView` to `'queue'`
- All filter state (`sortBy`, `tagFilter`, `activeGroupFilter`, `filtersOpen`) lives in `App.jsx`

### `src/components/PatientQueue.jsx`
- **Display-only** — no filter UI of its own
- Receives `sortBy`, `tagFilter`, `activeGroupFilter` as read-only props from App
- DnD disabled when any filter is active (`isDndEnabled` check)

### `src/App.jsx`
- `SUPABASE_ENABLED` — compile-time boolean, controls all DB calls
- `currentView` — `'queue' | 'history' | 'consult' | 'tools'`
- Filter state: `sortBy`, `tagFilter`, `activeGroupFilter`, `filtersOpen`
- **Soft-delete**: `removePatient` sets `status='discharged'` in Supabase → appends to `history[]`
- `restorePatient(patient)` — moves record back to `status='queue'`
- All Supabase writes are fire-and-forget (`.then(({ error }) => ...)`)

---

## Design System (index.css)

```
--bg:             #f1f5f9    Page background (light gray)
--surface:        #ffffff    Cards / panels
--border:         #e2e8f0    Subtle borders
--border-strong:  #cbd5e1    Strong borders
--text-primary:   #0f172a
--text-secondary: #64748b
--text-muted:     #94a3b8
--primary:        #2563eb    Blue (buttons, links, selected)
--primary-hover:  #1d4ed8
--primary-light:  #eff6ff
--primary-ring:   rgba(37,99,235,.2)
--accent:         #ef4444    Red (danger, recording)
--success:        #10b981    Green (restore button hover)
--warning:        #f59e0b
--radius:         12px
--sidebar-w:      220px
--right-w:        380px
```

All component styles live in `index.css` — no CSS modules, no Tailwind.
Add new component styles at the bottom of the relevant section.

---

## FAB Layout

A single **`+` button** (`.fab-text-btn`) floats fixed in the center column. Tapping opens two option pills:
- **Voice** — triggers `voiceStartRef.current()` → VoiceInput starts recording
- **Text** — opens `PatientFormModal` in add mode

While recording → pulsing mic stop button (`.voice-fab--recording`).  
While processing → spinner (`.voice-fab--processing`).

```css
.fab-group {
  position: fixed;
  bottom: 28px;
  right: calc(var(--right-w) + 24px);  /* stays left of the right panel */
}
```
The FAB is only rendered when `currentView === 'queue'`.

---

## Common Tasks

**Change AI model**
```js
// src/services/groq.js
const MODEL = 'llama-3.3-70b-versatile'
```

**Change speech recognition language**
```js
// src/components/VoiceInput.jsx  →  startListening()
// src/components/PatientCard.jsx →  startVoiceUpdate()
recognition.lang = 'vi-VN'   // e.g. 'en-US', 'ja-JP'
// Change both — VoiceInput adds patients, PatientCard updates existing ones
```

**Adjust swipe distance threshold**
```js
// src/hooks/useSwipeRemove.js
const SWIPE_THRESHOLD = 120   // pixels
```

**Add a new patient field**
1. Add column to Supabase table
2. Add field to `localToDb` / `dbToLocal` in `App.jsx`
3. Add field key to the Groq system prompt in `src/services/groq.js`
4. Add input to `PatientFormModal.jsx`
5. Render the new field in `PatientCard.jsx` and `PatientHistory.jsx`

---

## Browser Support

| Feature | Minimum |
|---|---|
| Web Speech API | Chrome 25+, Edge 79+ (not Firefox/Safari) |
| Pointer Events | All modern browsers |
| CSS :has() | Chrome 105+, Safari 15.4+, Edge 105+ |
| interactive-widget viewport | Chrome 108+, Edge 108+ |

---

## Deployment Notes

- Deployed to **GitHub Pages** via `.github/workflows/deploy.yml` — auto-deploys on push to `main`
- Set `VITE_GROQ_API_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` as **repository secrets**
- `base: '/vascular-patient-manage/'` is set in `vite.config.js` — required for GitHub Pages subpath
- Supabase anon key is safe to expose publicly (it's the publishable key)
- Build output is in `dist/` — static files, no server required

---

## Technical Notes

Detailed debugging patterns, iOS quirks, and architectural decisions are documented in:

| File | Topics |
|---|---|
| [`technicals/mobile-ios.md`](technicals/mobile-ios.md) | Auto-zoom, keyboard FAB, touch-action scroll, nav equal width, grid-area overlap, iOS Speech API |
| [`technicals/drag-drop.md`](technicals/drag-drop.md) | dnd-kit filter index mismatch, touch-action scope, hold-to-drag delay config |
| [`technicals/voice-speech.md`](technicals/voice-speech.md) | onend processing, stale closures in event handlers |
| [`technicals/react-patterns.md`](technicals/react-patterns.md) | startRef/stopRef, FAB menu, filter state lifting, CSS :has() |
| [`technicals/ai-groq.md`](technicals/ai-groq.md) | Structured extraction, JSON fallback parsing, batch classification |
| [`technicals/deployment.md`](technicals/deployment.md) | GitHub Pages setup, SSH auth, protecting secrets |
