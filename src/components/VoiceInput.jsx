import { useState, useRef, useCallback, useEffect } from 'react'
import { parsePatientTranscript } from '../services/groq'

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

export default function VoiceInput({ onPatientParsed, startRef, stopRef, onStatusChange }) {
  const [status, setStatus] = useState('idle') // idle | listening | processing | error
  const [errorMsg, setErrorMsg] = useState('')
  const recognitionRef = useRef(null)
  const transcriptRef = useRef('')
  const onPatientParsedRef = useRef(onPatientParsed)
  useEffect(() => { onPatientParsedRef.current = onPatientParsed }, [onPatientParsed])

  const updateStatus = useCallback((s) => {
    setStatus(s)
    onStatusChange?.(s)
  }, [onStatusChange])

  async function processTranscript() {
    const text = transcriptRef.current.trim()
    if (!text) { updateStatus('idle'); return }
    updateStatus('processing')
    try {
      const patient = await parsePatientTranscript(text)
      const hasData = patient.name !== '—' || patient.age !== null ||
        patient.clinicalManifestation !== '—' || patient.underlyingDisease !== '—' ||
        patient.imagingDiagnosis !== '—'
      if (!hasData) {
        setErrorMsg('Could not extract patient data. Please try again.')
        updateStatus('error')
        return
      }
      onPatientParsedRef.current(patient)
      transcriptRef.current = ''
      updateStatus('idle')
    } catch (err) {
      setErrorMsg(err.message)
      updateStatus('error')
    }
  }

  const startListening = useCallback(() => {
    if (!SpeechRecognition) {
      setErrorMsg('Speech recognition requires Chrome or Edge.')
      updateStatus('error')
      return
    }
    transcriptRef.current = ''
    setErrorMsg('')
    updateStatus('listening')

    const recognition = new SpeechRecognition()
    recognitionRef.current = recognition
    recognition.lang = 'vi-VN'
    recognition.interimResults = false
    recognition.continuous = true

    recognition.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) transcriptRef.current += e.results[i][0].transcript
      }
    }

    recognition.onerror = (e) => {
      recognitionRef.current = null
      setErrorMsg(`Mic error: ${e.error}`)
      updateStatus('error')
    }

    recognition.onend = () => {
      recognitionRef.current = null
      processTranscript()
    }

    recognition.start()
  }, [updateStatus])

  const stopListening = useCallback(() => {
    if (recognitionRef.current) recognitionRef.current.stop()
  }, [])

  // Expose controls to parent via refs
  useEffect(() => { if (startRef) startRef.current = startListening }, [startRef, startListening])
  useEffect(() => { if (stopRef) stopRef.current = stopListening }, [stopRef, stopListening])

  // Status pill only — button is owned by the FAB in App
  if (status === 'idle') return null

  return (
    <div className={`voice-fab-status ${status === 'error' ? 'voice-fab-status--error' : ''}`}>
      {status === 'listening' && (
        <><span className="listening-dot" /> Recording… tap mic to stop</>
      )}
      {status === 'processing' && 'Parsing patient…'}
      {status === 'error' && errorMsg}
    </div>
  )
}
