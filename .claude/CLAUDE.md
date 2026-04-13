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
  created_at            timestamptz default now()
);

-- Migration for existing tables:
-- alter table patients add column if not exists status text not null default 'queue';
-- alter table patients add column if not exists discharged_at timestamptz;
```

**RLS:** If Row Level Security is enabled, add a policy allowing anon reads/writes,
or use the service-role key server-side.

---

## Architecture

```
src/
├── main.jsx                     # React root mount
├── App.jsx                      # State hub: patients[], history[], add / remove / restore / reorder / update
├── index.css                    # Single stylesheet — all design tokens & components
│
├── lib/
│   └── supabase.js              # createClient() — URL + anon key from env
│
├── services/
│   └── groq.js                  # parsePatientTranscript(text) → PatientFields
│                                #   reads key from env → localStorage fallback
│
├── hooks/
│   └── useSwipeRemove.js        # pointer/touch → translateX state → onRemove()
│                                #   threshold: 120 px rightward
│
└── components/
    ├── VoiceInput.jsx           # mic FAB, SpeechRecognition, transcript display
    ├── PatientFormModal.jsx     # text form modal — add new or edit existing patient
    ├── PatientQueue.jsx         # DndContext + SortableContext wrapper
    ├── PatientHistory.jsx       # list of discharged patients with restore button
    ├── Sidebar.jsx              # left nav (220px); Queue + History active, rest "Soon"
    ├── ConsultPanel.jsx         # right AI panel (380px), structured clinical prompt
    └── PatientCard.jsx          # compact card (name+age), expand chevron, edit btn, per-card voice update
```

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
      ↓  drag handle (@dnd-kit)        →  App.reorderPatients()  → Supabase position updates
      ↓  swipe right (useSwipeRemove)  →  App.removePatient()    → Supabase soft-delete
                                                                     (status='discharged', discharged_at=now())
      ↓  Edit btn (per card)           →  PatientFormModal        → App.updatePatient()
      ↓  "Update" mic btn (per card)   →  App.updatePatient()     → Supabase PATCH changed fields only

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
- Throws `Error('No Groq API key configured')` if no key is available

### `src/hooks/useSwipeRemove.js`
- Attaches `pointerdown / pointermove / pointerup` to the card element via `useRef`
- Cancels tracking if vertical delta exceeds horizontal (scroll protection)
- Returns `{ ref, translateX, isSwiping }` — card applies these as inline style
- The red backdrop (`.swipe-remove-bg`) is a sibling element revealed as the card
  slides right via `translateX`

### `src/components/VoiceInput.jsx`
- Speech recognition language defaults to `vi-VN` (Vietnamese)
- To change: set `recognition.lang` in `startListening()`
- States: `idle → listening → processing → idle | error`
- **Critical pattern**: all transcript processing happens in `recognition.onend`, NOT after
  calling `rec.stop()`. Chrome fires remaining `onresult` events asynchronously after
  `stop()` returns; `onend` is guaranteed to fire only after all of them complete.
- Uses `transcriptRef` (not state) to accumulate transcript — avoids stale closures.
- Uses `onPatientParsedRef` to hold latest callback — avoids stale closure in `onend`.

### `src/components/PatientCard.jsx`
- Default view shows **name + age only** (compact)
- Chevron "Details" button toggles `.card-details` (Clinical, Underlying, Imaging fields)
- **Edit button** opens `PatientFormModal` pre-filled with current patient data
- "Update" mic button runs an inline voice recording → Groq parse → `onUpdate(id, fields)`
  - Same `onend`-based pattern as VoiceInput — processing in `recognition.onend`
  - On update: only fields the AI found (non-null, non-`'—'`) overwrite existing values
  - On successful parse: auto-expands the details section to show new values
- `onUpdate` prop flows: `App.updatePatient` → `PatientQueue` → `PatientCard`
- `onEdit` prop flows: `App` → `PatientQueue` → `PatientCard`

### `src/components/PatientFormModal.jsx`
- Used for both **add** and **edit** modes (determined by whether `patient` prop is passed)
- Fields: name (text), age (number), clinicalManifestation, underlyingDisease, imagingDiagnosis (textareas)
- Edit mode: only non-empty fields are submitted → preserves existing data for blanked fields
- Add mode: blank fields default to `'—'`

### `src/components/PatientHistory.jsx`
- Renders discharged patients, newest first
- Each card shows name, age, discharge timestamp, expandable clinical details
- **Restore** button calls `App.restorePatient()` → moves patient back to active queue

### `src/components/Sidebar.jsx`
- Accepts `currentView` prop and `onViewChange` callback
- "Patient Queue" and "History" are active nav items; Analytics/Reports are "Soon"

### `src/App.jsx`
- `SUPABASE_ENABLED` — compile-time boolean, controls all DB calls
- `currentView` — `'queue' | 'history'`, drives center column content
- **Soft-delete**: `removePatient` sets `status='discharged'` + `discharged_at` in Supabase
  instead of deleting, and appends to local `history[]` state
- `restorePatient(patient)` — moves record back to `status='queue'`, re-adds to `patients[]`
- `loadFromSupabase()` fetches queue (`status='queue'`) and history (`status='discharged'`)
  in parallel via `Promise.all`
- All Supabase writes are fire-and-forget (`.then(({ error }) => ...)`)
- `crypto.randomUUID()` generates client-side IDs before Supabase insertion
- `updatePatient(id, fields)` merges new fields; also refreshes `selectedPatient`

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

Two floating buttons sit fixed above the right panel, stacked vertically:
- **`+` button** (`.fab-text-btn`) — opens `PatientFormModal` in add mode
- **Mic button** (`.voice-fab`) — starts voice recording

Both are wrapped in `.fab-group`:
```css
.fab-group {
  position: fixed;
  bottom: 28px;
  right: calc(var(--right-w) + 24px);
}
```
FABs are hidden when `currentView === 'history'`.

---

## Common Tasks

**Change AI model**
```js
// src/services/groq.js  line 2
const MODEL = 'llama-3.3-70b-versatile'
```

**Change speech recognition language**
```js
// src/components/VoiceInput.jsx  inside startListening()
// src/components/PatientCard.jsx  inside startVoiceUpdate()
recognition.lang = 'vi-VN'   // e.g. 'en-US', 'ja-JP'
// Note: change both — VoiceInput adds new patients, PatientCard updates existing ones
```

**Adjust swipe distance threshold**
```js
// src/hooks/useSwipeRemove.js  line 4
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
| CSS backdrop-filter | Chrome 76+, Safari 14+, Edge 79+ |

For Firefox users, voice input will show an error; all other features work.

---

## Deployment Notes

- Set all three env vars as environment variables in your host (Vercel, Netlify, etc.)
- Supabase anon key is safe to expose publicly (it's the publishable key)
- Groq API key should ideally be proxied server-side in production to avoid exposure
- Build output is in `dist/` — static files, no server required
