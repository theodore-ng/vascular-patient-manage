import { useRef, useEffect, useState, useCallback } from 'react'

const SNAP_THRESHOLD = 72   // px to trigger snap-open
const SNAP_WIDTH = 200      // width of each action panel

/**
 * Bidirectional swipe hook.
 * Right swipe (→) snaps open to `openSide === 'right'` — reveals left-side actions.
 * Left swipe  (←) snaps open to `openSide === 'left'`  — reveals right-side actions.
 * Call `close()` to snap the card back to center.
 */
export function useSwipeRemove() {
  const ref = useRef(null)
  const [translateX, setTranslateX] = useState(0)
  const [openSide, setOpenSide] = useState(null) // 'right' | 'left' | null

  // Refs mirror state so event handlers always see current values
  const txRef       = useRef(0)
  const openSideRef = useRef(null)
  const startX      = useRef(null)
  const startY      = useRef(null)
  const isTracking  = useRef(false)

  const close = useCallback(() => {
    txRef.current       = 0
    openSideRef.current = null
    setTranslateX(0)
    setOpenSide(null)
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el) return

    function onPointerDown(e) {
      if (e.button !== 0 && e.pointerType !== 'touch') return
      startX.current = e.clientX
      startY.current = e.clientY
      isTracking.current = true
    }

    function onPointerMove(e) {
      if (!isTracking.current) return
      const dx = e.clientX - startX.current
      const dy = Math.abs(e.clientY - startY.current)

      // Abort if primarily vertical (allow page scroll)
      if (dy > 10 && Math.abs(dx) < dy) {
        isTracking.current = false
        return
      }

      let newTx
      const side = openSideRef.current
      if (side === 'right') {
        // Panel open to right — allow closing swipe back left
        newTx = Math.max(0, Math.min(SNAP_WIDTH + 40, SNAP_WIDTH + dx))
      } else if (side === 'left') {
        // Panel open to left — allow closing swipe back right
        newTx = Math.min(0, Math.max(-SNAP_WIDTH - 40, -SNAP_WIDTH + dx))
      } else {
        if (dx > 0) {
          newTx = Math.min(dx, SNAP_WIDTH + 40)
        } else {
          newTx = Math.max(dx, -SNAP_WIDTH - 40)
        }
      }

      if (newTx !== 0) e.preventDefault()
      txRef.current = newTx
      setTranslateX(newTx)
    }

    function onPointerUp() {
      if (!isTracking.current) return
      isTracking.current = false

      const tx   = txRef.current
      const side = openSideRef.current

      if (side === 'right') {
        // Already open — close if swiped back past halfway
        if (tx < SNAP_WIDTH / 2) {
          openSideRef.current = null
          txRef.current = 0
          setTranslateX(0)
          setOpenSide(null)
        } else {
          txRef.current = SNAP_WIDTH
          setTranslateX(SNAP_WIDTH)
        }
      } else if (side === 'left') {
        if (tx > -SNAP_WIDTH / 2) {
          openSideRef.current = null
          txRef.current = 0
          setTranslateX(0)
          setOpenSide(null)
        } else {
          txRef.current = -SNAP_WIDTH
          setTranslateX(-SNAP_WIDTH)
        }
      } else {
        if (tx >= SNAP_THRESHOLD) {
          openSideRef.current = 'right'
          txRef.current = SNAP_WIDTH
          setTranslateX(SNAP_WIDTH)
          setOpenSide('right')
        } else if (tx <= -SNAP_THRESHOLD) {
          openSideRef.current = 'left'
          txRef.current = -SNAP_WIDTH
          setTranslateX(-SNAP_WIDTH)
          setOpenSide('left')
        } else {
          txRef.current = 0
          setTranslateX(0)
        }
      }
    }

    el.addEventListener('pointerdown', onPointerDown)
    el.addEventListener('pointermove', onPointerMove, { passive: false })
    el.addEventListener('pointerup', onPointerUp)
    el.addEventListener('pointercancel', onPointerUp)

    return () => {
      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('pointermove', onPointerMove)
      el.removeEventListener('pointerup', onPointerUp)
      el.removeEventListener('pointercancel', onPointerUp)
    }
  }, []) // no deps — all values accessed via refs

  return { ref, translateX, openSide, close }
}
