# Drag & Drop Patterns (@dnd-kit)

---

## Drag index mismatch when filtering

**Symptom:** After filtering the list, drag-and-drop moves items to the wrong position.  
**Root cause:** `arrayMove` uses indices from the *filtered* display list, but the source-of-truth array is the full unfiltered list. The two index spaces diverge.  
**Fix:** Disable DnD while any filter or non-default sort is active:
```js
const isDndEnabled = !activeGroupFilter && !tagFilter && sortBy === 'queue'

{isDndEnabled ? (
  <DndContext onDragEnd={handleDragEnd}>
    <SortableContext items={display.map(p => p.id)}>
      <div className="patient-queue">{cards}</div>
    </SortableContext>
  </DndContext>
) : (
  <div className="patient-queue">{cards}</div>
)}
```
**Rule:** Extend this condition to any non-default sort too — a sorted display order is also a different index space from the source array.

---

## touch-action: none blocks scroll when applied to whole card

See `mobile-ios.md → touch-action: none on draggable cards blocks page scroll`.  
**Summary:** Keep `{...listeners}` and `touch-action: none` on a small drag handle only, not the whole scrollable card.

---

## Whole-card hold-to-drag vs swipe gesture conflict

**Symptom:** Trying to make the entire card draggable (not just a handle) causes conflicts with the horizontal swipe-to-action gesture and with iOS scroll.  
**Root cause:**  
- `TouchSensor` requires `touch-action: none` on the element it listens to — placing this on the whole card breaks scroll.  
- Both DnD and the swipe hook register on `pointerdown`; with `distance: 8` as the DnD activation constraint, a horizontal swipe of 8 px+ unintentionally activates drag.  

**Resolution:** Use a dedicated drag handle (the queue badge). Keep `{...listeners}` and `touch-action: none` scoped to the badge. The rest of the card surface remains scroll-friendly and swipe-friendly:
```jsx
// ✓ Drag handle only
<div className="queue-badge" {...listeners} style={{ touchAction: 'none', cursor: 'grab' }}>
  {index + 1}
</div>

// ARIA attributes go on the wrapper (no event listeners there)
<div ref={sortableRef} style={sortableStyle} {...attributes}>
```

---

## Hold-to-drag delay (PointerSensor + TouchSensor)

**Pattern:** Using a delay-based activation constraint creates the "hold to drag" UX feel and naturally discriminates between a tap, a swipe, and a drag:

| Sensor | Constraint | Behaviour |
|---|---|---|
| `PointerSensor` | `delay: 150, tolerance: 5` | Mouse: hold 150ms → drag. Quick click → select. |
| `TouchSensor` | `delay: 200, tolerance: 5` | Touch: hold 200ms → drag. Quick tap → select. Fast horizontal move cancels drag → swipe activates. |

```js
const sensors = useSensors(
  useSensor(PointerSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
  useSensor(TouchSensor,   { activationConstraint: { delay: 200, tolerance: 5 } })
)
```
`tolerance: 5` means if the pointer moves more than 5 px during the hold window, the drag is cancelled — allowing fast swipes to pass through unaffected.
