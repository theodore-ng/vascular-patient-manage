# Voice & Speech Recognition Patterns

---

## Process results in onend, never after stop()

**Symptom:** Voice input silently discards the last few spoken words.  
**Root cause:** Chrome fires remaining `onresult` events *asynchronously* after `recognition.stop()` returns. If you try to read the transcript immediately after calling `stop()`, those final results haven't arrived yet.  
**Fix:** Do all processing inside `recognition.onend`, which is guaranteed to fire only after every `onresult` has completed.
```js
recognition.onresult = (e) => {
  for (let i = e.resultIndex; i < e.results.length; i++) {
    if (e.results[i].isFinal) transcriptRef.current += e.results[i][0].transcript
  }
}

// ✓ Safe — all results are in by the time onend fires
recognition.onend = async () => {
  const text = transcriptRef.current.trim()
  if (!text) return
  const parsed = await parsePatientTranscript(text)
  // act on parsed…
}

// ✗ Not safe — final results may not have arrived yet
recognition.stop()
const parsed = await parsePatientTranscript(transcriptRef.current)
```

---

## Stale closure in onend / event handlers

**Symptom:** The `onend` callback reads an old version of state or props (classic stale closure in React).  
**Root cause:** `onend` is registered once at recognition start. Any React state or props it closes over are frozen at that moment and won't reflect later updates.  
**Fix:** Mirror the latest callback and accumulated transcript in refs:
```js
const onPatientParsedRef = useRef(onPatientParsed)
useEffect(() => { onPatientParsedRef.current = onPatientParsed }, [onPatientParsed])

const transcriptRef = useRef('')

recognition.onresult = (e) => {
  // accumulate into ref — state updates are async and won't be visible in onend
  for (let i = e.resultIndex; i < e.results.length; i++) {
    if (e.results[i].isFinal) transcriptRef.current += e.results[i][0].transcript
  }
}

recognition.onend = () => {
  // safe: reads refs, calls latest callback via ref
  onPatientParsedRef.current(transcriptRef.current)
}
```
**General rule:** Any value read inside long-lived event handlers (`onend`, `pointerdown/move/up`) must live in a ref, not just React state.

---

## Stale closure in pointer event handlers (swipe hook)

**Same root cause, different context:** `pointermove`/`pointerup` handlers are registered on `pointerdown` and never re-registered — they close over state at registration time.  
**Fix:** Mirror all mutable state into refs:
```js
const [translateX, setTranslateX] = useState(0)
const txRef = useRef(0)

const [openSide, setOpenSide] = useState(null)
const openSideRef = useRef(null)

function applyTx(val)   { txRef.current = val;      setTranslateX(val) }
function applyOpen(val) { openSideRef.current = val; setOpenSide(val)   }
```
