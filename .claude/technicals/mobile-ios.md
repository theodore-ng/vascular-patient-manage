# Mobile & iOS UI Issues

---

## Auto-zoom on input focus (iOS Safari)

**Symptom:** Tapping any `<input>` or `<textarea>` zooms the entire page on iPhone.  
**Root cause:** iOS Safari auto-zooms focused inputs with `font-size` below 16px — OS-level behaviour.  
**Fix:**
```css
@media (max-width: 720px) {
  input, textarea, select { font-size: 16px !important; }
}
```
**Do not** use `user-scalable=no` in the viewport meta — it breaks pinch-zoom accessibility.

---

## Keyboard pushes FAB / fixed elements up and doesn't restore

**Symptom:** Opening the virtual keyboard pushes fixed-position elements (FAB) upward. After dismissing the keyboard they stay high and never return.  
**Root cause:** By default, the browser resizes the *layout* viewport when the keyboard opens. `position: fixed` elements re-anchor to the shrunken layout viewport.  
**Fix:** Add `interactive-widget=resizes-visual` to the viewport meta tag. This tells the browser to only shrink the *visual* viewport for the keyboard, leaving the layout viewport (and all fixed elements) untouched.
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, interactive-widget=resizes-visual" />
```
**Browser support:** Chrome 108+, Edge 108+. Safari handles keyboard differently and is unaffected.

---

## touch-action: none on draggable cards blocks page scroll

**Symptom:** The patient list cannot be scrolled on iPhone after making patient cards draggable.  
**Root cause:** `touch-action: none` on an element tells the browser to hand all touch events to JavaScript — including vertical scroll. If applied to the whole card, the user can never scroll the list.  
**Fix:** Apply `touch-action: none` **only** to the dedicated drag handle element (the queue number badge), not the entire card. The rest of the card's surface remains scrollable.
```jsx
// ✓ Only the badge blocks touch — drag handle only
<div className="queue-badge" {...listeners} style={{ touchAction: 'none' }}>1</div>

// ✗ Whole card — blocks scroll
<div className="patient-card-wrapper" style={{ touchAction: 'none' }} {...listeners}>
```
**Rule:** `touch-action: none` scope should match the drag handle, not the scrollable container.

---

## Mobile nav bar items not equal width

**Symptom:** On iPhone, some nav icons are bunched on the left and others are spaced far right — items are not evenly distributed across the bar.  
**Root cause:** Some nav items are direct `<button>` children of the flex nav, others are wrapped in `<div>` containers (to allow expandable sub-panels). Only the direct buttons receive `flex: 1`; the wrapper divs don't, so they collapse to their content width.  
**Fix:** Target both the wrapper divs and the buttons:
```css
@media (max-width: 720px) {
  .sidebar-nav > div { flex: 1; min-width: 0; }   /* wrapper divs for nav items with sub-panels */
  .sidebar-nav-item  { flex: 1; justify-content: center; width: 100%; }
}
```

---

## Showing a panel in the same grid cell as center content (mobile right panel)

**Symptom:** Need to show the AI Consultant panel in the "main" area on mobile, replacing the queue view, without duplicating the component or using JS-based show/hide.  
**Root cause:** CSS Grid doesn't natively stack two items into the same cell without explicit placement.  
**Fix:** Use `grid-template-areas` to name the main cell, then assign both the center column and the right panel to the same area. The later DOM element renders on top. Use `display: none` / `display: flex` to toggle visibility.
```css
@media (max-width: 720px) {
  .app-root {
    grid-template-areas: "nav" "main";
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
  }
  .center-col      { grid-area: main; }
  .app-right-panel { grid-area: main; display: none; }
  .app-right-panel--mobile-active { display: flex; flex-direction: column; }
}
```
**Trade-off:** Both elements exist in the DOM at all times, so the hidden one's state (e.g. chat history) is preserved.

---

## Web Speech API continuous mode unreliable on iOS

**Symptom:** Voice input creates a patient with all fields empty on iPhone.  
**Root cause:** iOS Safari's Web Speech API supports `continuous = true` but may fire `onend` before any `onresult` events, or return a transcript Groq can't parse.  
**Fix:** After parsing, verify at least one meaningful field was extracted before acting:
```js
const hasData = patient.name !== '—' || patient.age !== null || ...
if (!hasData) { showError('Could not extract data. Try again.'); return }
```
**Note:** Chrome/Edge fully support `continuous = true`. For iOS, consider falling back to `continuous = false` if the empty-guard still triggers frequently.
