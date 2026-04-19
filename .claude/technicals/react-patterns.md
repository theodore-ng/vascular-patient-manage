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

## Lifting filter state to a shared ancestor

**Problem:** Filter controls (sort, tag, group) were local state inside `PatientQueue`. Moving them to the sidebar required access from both the sidebar (to render controls) and the queue (to apply filters).  
**Fix:** Lift `sortBy`, `tagFilter`, `activeGroupFilter` to `App.jsx`. Pass values and setters to the sidebar for rendering; pass values only (read-only) to `PatientQueue` for filtering. `PatientQueue` becomes a pure display component with no filter UI of its own.

**State ownership:**
```
App.jsx
  ├── sortBy, setSortBy
  ├── tagFilter, setTagFilter
  ├── activeGroupFilter, setActiveGroupFilter
  ├── filtersOpen, setFiltersOpen
  │
  ├── Sidebar (receives all + setters → renders filter panel)
  └── PatientQueue (receives values only → applies filter/sort logic)
```
**Rule:** When two sibling subtrees need the same state, lift it to their lowest common ancestor.

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
