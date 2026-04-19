# React & CSS Patterns

---

## Exposing imperative controls from child to parent (startRef / stopRef)

**Use case:** Parent needs to programmatically trigger an action inside a child (e.g. start voice recording from a FAB that lives in the parent).  
**Anti-pattern:** Lifting all state to the parent creates coupling. `useImperativeHandle` requires `forwardRef` boilerplate.  
**Simpler pattern:** Pass plain `useRef` objects from the parent; the child assigns its internal functions to `ref.current` via `useEffect`.
```jsx
// Parent
const startRef = useRef(null)
const stopRef  = useRef(null)

<button onClick={() => startRef.current?.()}>Voice</button>
<VoiceInput startRef={startRef} stopRef={stopRef} />

// Child
function VoiceInput({ startRef, stopRef }) {
  const startListening = useCallback(() => { /* … */ }, [])
  const stopListening  = useCallback(() => { /* … */ }, [])

  useEffect(() => { if (startRef) startRef.current = startListening }, [startRef, startListening])
  useEffect(() => { if (stopRef)  stopRef.current  = stopListening  }, [stopRef,  stopListening])
}
```
**When to use:** One-directional triggers (parent → child) where the child owns its own state. Not a substitute for proper data flow when the parent needs to read child state.

---

## Expanding FAB menu (single button → option pills)

**Pattern:** A single FAB expands into labeled option pills on tap — avoids cluttering the UI with multiple persistent buttons.
```jsx
const [fabOpen, setFabOpen] = useState(false)

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
.fab-text-btn { transition: transform .2s ease; }
.fab-text-btn--open { transform: rotate(45deg); }  /* + → × */

@keyframes fab-option-in {
  from { opacity: 0; transform: translateY(6px) scale(.95); }
  to   { opacity: 1; transform: translateY(0)   scale(1);   }
}
.fab-option { animation: fab-option-in .15s ease; }
```
**UX note:** When an action changes the FAB state (e.g. recording), hide the option menu and replace the main button with the new indicator (mic stop button, spinner).

---

## Filter state: shared values, local UI

**Current pattern:** Filter *values* (`sortBy`, `tagFilter`, `activeGroupFilter`) live in `App.jsx` so they survive view changes and can be reset from anywhere. Filter *UI state* (`filtersOpen`) lives locally in `PatientQueue` because nothing outside the queue cares about it.

```
App.jsx
  ├── sortBy, setSortBy
  ├── tagFilter, setTagFilter
  ├── activeGroupFilter, setActiveGroupFilter
  │
  └── PatientQueue
        ├── filtersOpen (local useState — UI only)
        ├── receives values + setters from App
        └── owns the collapsible filter toolbar JSX
```

**Rule:** Lift state only as high as the lowest component that *needs* it. Values consumed by multiple subtrees → lift to ancestor. UI toggle state used by one component → keep local.

**History:** filters were once lifted all the way to `App` and rendered in the Sidebar. When filters moved back into the queue panel, `filtersOpen` was kept local since nothing outside PatientQueue reads it.

---

## Left/right split in a flex row without a spacer element

**Pattern:** To pin some items to the left and others to the right inside the same flex row, wrap the right-side group in a div with `margin-left: auto`. No extra spacer element or `justify-content: space-between` needed.

```css
.row { display: flex; align-items: center; gap: 6px; }
.row-right { display: flex; align-items: center; gap: 6px; margin-left: auto; }
```
```jsx
<div className="row">
  <span>Left content</span>          {/* stays left */}
  <div className="row-right">
    <span>Right A</span>
    <span>Right B</span>
  </div>
</div>
```
**Used in:** `.card-meta-row` — note snippet on left, group badge + tag dot on right via `.card-meta-right`.

---

## CSS :has() for parent-aware layout without prop drilling

**Use case:** Reposition a FAB when a sibling panel collapses, without threading props up/down.  
**Technique:** Use `:has()` on a common ancestor to detect a descendant's state class:
```css
.app-root:has(.consult-panel--collapsed) .fab-group {
  bottom: 20px;
}
```
**Browser support:** Chrome 105+, Safari 15.4+, Edge 105+.  
**When to use:** Layout reactions to UI state that would otherwise require prop drilling or context through multiple layers.
