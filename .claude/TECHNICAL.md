# Technical Learnings — Vascular Manage

Reusable debugging experiences and patterns from building this project.
Each entry notes the symptom, root cause, and fix so it can be applied to future projects.

---

## iOS Safari

### Auto-zoom on input focus
**Symptom:** Tapping any `<input>` or `<textarea>` causes the entire page to zoom in on iPhone.  
**Root cause:** iOS Safari auto-zooms any focused input whose `font-size` is below 16px. This is OS-level behaviour, not a CSS bug.  
**Fix:** One rule in the mobile media query — no need to change individual component styles.
```css
@media (max-width: 720px) {
  input, textarea, select {
    font-size: 16px !important;
  }
}
```
**Do not** use `user-scalable=no` in the viewport meta tag — it breaks pinch-zoom accessibility.

### Web Speech API — continuous mode unreliable
**Symptom:** Voice input creates a patient with all fields empty on iPhone.  
**Root cause:** iOS Safari's Web Speech API supports `continuous = true` but behaves unpredictably — may fire `onend` before any `onresult` events, or return a transcript that Groq can't parse into structured data.  
**Fix (defensive):** After parsing, check that at least one meaningful field was extracted before acting. If nothing was extracted, show an error instead of creating an empty record.
```js
const hasData = patient.name !== '—' || patient.age !== null || ...
if (!hasData) { showError('Could not extract data. Try again.'); return }
```
**Note:** Chrome/Edge fully support `continuous = true`. For iOS, consider a fallback to single-shot mode (`continuous = false`) if the empty-guard still triggers too often.

---

## Web Speech API — Stale Closure in onend

**Symptom:** `onend` callback reads an old version of state/props (classic stale closure).  
**Root cause:** `onend` is registered once at recognition start; any state it closes over is frozen at that moment.  
**Fix:** Use a `ref` to mirror the latest callback and accumulate transcript.
```js
const onPatientParsedRef = useRef(onPatientParsed)
useEffect(() => { onPatientParsedRef.current = onPatientParsed }, [onPatientParsed])

const transcriptRef = useRef('')

recognition.onresult = (e) => {
  // accumulate into ref, not state — state updates are async and won't be visible in onend
  for (let i = e.resultIndex; i < e.results.length; i++) {
    if (e.results[i].isFinal) transcriptRef.current += e.results[i][0].transcript
  }
}

recognition.onend = () => {
  // safe: reads ref values, calls latest callback via ref
  processTranscript(transcriptRef.current, onPatientParsedRef.current)
}
```
**Rule:** Always process speech recognition results in `onend`, never after calling `.stop()`. Chrome fires remaining `onresult` events asynchronously after `stop()` returns — `onend` is guaranteed to fire only after all of them complete.

---

## Bidirectional Snap-Open Swipe (Mobile Cards)

**Symptom:** Pointer event handlers in `pointermove`/`pointerup` read stale state.  
**Root cause:** Event handlers are closures captured at the time they're registered — state updates don't reach them.  
**Fix:** Mirror all state that event handlers need into refs.
```js
const [translateX, setTranslateX] = useState(0)
const txRef = useRef(0)  // mirror for event handlers

const [openSide, setOpenSide] = useState(null)
const openSideRef = useRef(null)

// Always update both together:
function applyTx(val) { txRef.current = val; setTranslateX(val) }
function applyOpen(val) { openSideRef.current = val; setOpenSide(val) }
```
**General rule:** Any value read inside `pointerdown/move/up` or `touchstart/move/end` handlers must live in a ref, not just state.

---

## CSS `:has()` for Parent-Aware Layout

**Use case:** Reposition a FAB button when a sibling panel collapses, without passing props up/down the component tree.  
**Technique:** Use `:has()` on a common ancestor to detect a descendant's state class.
```css
/* FAB repositions itself when the consult panel is collapsed */
.app-root:has(.consult-panel--collapsed) .fab-group {
  bottom: 20px;
}
```
**Browser support:** Chrome 105+, Safari 15.4+, Edge 105+. Safe for modern mobile (iOS 15.4+).  
**When to use:** Layout reactions to UI state that would otherwise require threading props or context through multiple layers.

---

## GitHub Authentication in Non-Interactive Environments

**Symptom:** `git push` fails with `could not read Username for 'https://github.com': No such device or address`.  
**Root cause:** HTTPS authentication requires an interactive terminal for credential prompts — not available in automated/agent environments.  
**Fix:** Use SSH instead.
```bash
ssh-keygen -t ed25519 -C "your-email" -f ~/.ssh/id_ed25519 -N ""
cat ~/.ssh/id_ed25519.pub  # add this to GitHub → Settings → SSH Keys
git remote set-url origin git@github.com:owner/repo.git
```

---

## GitHub Pages — Vite SPA Deployment

**Symptom:** GitHub Pages deployment fails with 404 even though the workflow runs.  
**Root cause:** GitHub Pages must have its source set to **GitHub Actions** (not "Deploy from a branch") before the `deploy-pages` action can create a deployment.  
**Fix:**
1. Go to **Settings → Pages → Build and deployment → Source** → select **GitHub Actions** and save.
2. Set `base` in `vite.config.js` to the repo name, so asset paths resolve correctly under the subpath:
```js
export default defineConfig({
  base: '/your-repo-name/',
})
```
3. Store env vars as repository **Secrets** and pass them to the build step via `env:` in the workflow.

**Re-running vs fresh run:** When the first-ever deploy fails (404), re-running the old job may not help. Trigger a fresh workflow run via **Actions → Run workflow** instead.

---

## Protecting Secrets Before First Git Commit

**Rule:** Add `.env` to `.gitignore` *before* `git init` or before the first commit — not after.  
Once a secret is committed it is in git history even after deletion, and must be rotated.
```bash
# Safe order:
echo ".env" >> .gitignore
echo ".env.*" >> .gitignore
git add .gitignore
git commit -m "chore: ignore env files"
# THEN add your .env and start working
```
Always provide a `.env.example` with placeholder values so collaborators know what variables are needed.

---

## Groq AI — Structured Extraction Reliability

**Pattern:** When using an LLM to extract structured data from free-form speech/text:
1. Instruct the model to return **only** a JSON object — no markdown, no explanation.
2. Add a regex fallback to strip markdown code fences if the model wraps the JSON anyway.
3. After parsing, validate that meaningful fields were extracted before acting on the result.
4. Use `temperature: 0.1` for extraction tasks — lower temperature = more consistent JSON output.

```js
let parsed
try {
  parsed = JSON.parse(raw)
} catch {
  const match = raw.match(/\{[\s\S]*\}/)
  if (match) parsed = JSON.parse(match[0])
  else throw new Error('Could not parse AI response as JSON')
}
```

---

## Exposing Imperative Controls from a Child Component (startRef / stopRef pattern)

**Use case:** A parent component needs to programmatically trigger actions inside a child (e.g. start voice recording from a FAB menu that lives in the parent).  
**Anti-pattern:** Lifting all state to the parent and drilling callbacks creates coupling. `useImperativeHandle` requires `forwardRef` boilerplate.  
**Simpler pattern:** Pass a plain `useRef` from the parent; the child assigns its internal function to `ref.current` via `useEffect`.

```jsx
// Parent
const startRef = useRef(null)
const stopRef  = useRef(null)

// Trigger from parent
<button onClick={() => startRef.current?.()}>Voice</button>

// Child receives and wires up
function VoiceInput({ startRef, stopRef }) {
  const startListening = useCallback(() => { /* ... */ }, [])
  const stopListening  = useCallback(() => { /* ... */ }, [])

  useEffect(() => { if (startRef) startRef.current = startListening }, [startRef, startListening])
  useEffect(() => { if (stopRef)  stopRef.current  = stopListening  }, [stopRef,  stopListening])
}
```

**When to use:** One-directional triggers (parent → child) where the child owns its own state. Not a substitute for proper data flow when the parent needs to read the child's state.

---

## Expanding FAB Menu (single button → options)

**Pattern:** A single floating action button expands into labeled option pills when tapped — avoids cluttering the UI with multiple persistent FABs.

```jsx
// State in parent
const [fabOpen, setFabOpen] = useState(false)

// JSX
{fabOpen && (
  <div className="fab-options">
    <button className="fab-option" onClick={() => { setFabOpen(false); doVoice() }}>
      <Mic size={15} /> Voice
    </button>
    <button className="fab-option" onClick={() => { setFabOpen(false); doText() }}>
      <Pencil size={15} /> Text
    </button>
  </div>
)}
<button
  className={`fab-text-btn ${fabOpen ? 'fab-text-btn--open' : ''}`}
  onClick={() => setFabOpen(v => !v)}
>+</button>
```

```css
/* Rotate + → × on open */
.fab-text-btn { transition: transform .2s ease; }
.fab-text-btn--open { transform: rotate(45deg); }

/* Option pills animate in from below */
@keyframes fab-option-in {
  from { opacity: 0; transform: translateY(6px) scale(.95); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
.fab-option { animation: fab-option-in .15s ease; }
```

**UX note:** When an action changes the FAB to a different state (e.g. recording), hide the option menu and replace the main button with the new state indicator.

---

## @dnd-kit — Drag Index Mismatch When Filtering

**Symptom:** After filtering a list, drag-and-drop moves items to the wrong position.  
**Root cause:** `arrayMove` uses indices from the *filtered* list, but the source-of-truth array is the full list. The two index spaces diverge.  
**Fix:** Disable drag-and-drop while a filter is active. Resume it only when showing the full list.
```jsx
{activeFilter ? (
  <div className="patient-queue">{cards}</div>
) : (
  <DndContext onDragEnd={handleDragEnd}>
    <SortableContext items={...}>
      <div className="patient-queue">{cards}</div>
    </SortableContext>
  </DndContext>
)}
```
