import { useState, useRef, useCallback, useEffect } from 'react'
import { Mic, MicOff, Loader2, AlertCircle } from 'lucide-react'
import { parsePatientTranscript } from '../services/groq'

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

export default function VoiceInput({ onPatientParsed }) {
  const [status, setStatus] = useState('idle') // idle | listening | processing | error
  const [errorMsg, setErrorMsg] = useState('')
  const recognitionRef = useRef(null)
  const transcriptRef = useRef('')
  const onPatientParsedRef = useRef(onPatientParsed)
  useEffect(() => { onPatientParsedRef.current = onPatientParsed }, [onPatientParsed])

  // Called from onend — guaranteed to run after all onresult events
  async function processTranscript() {
    const text = transcriptRef.current.trim()
    if (!text) {
      setStatus('idle')
      return
    }
    setStatus('processing')
    try {
      const patient = await parsePatientTranscript(text)
      onPatientParsedRef.current(patient)
      transcriptRef.current = ''
      setStatus('idle')
    } catch (err) {
      setErrorMsg(err.message)
      setStatus('error')
    }
  }

  const startListening = useCallback(() => {
    if (!SpeechRecognition) {
      setErrorMsg('Speech recognition requires Chrome or Edge.')
      setStatus('error')
      return
    }

    transcriptRef.current = ''
    setErrorMsg('')
    setStatus('listening')

    const recognition = new SpeechRecognition()
    recognitionRef.current = recognition
    recognition.lang = 'vi-VN'
    recognition.interimResults = false
    recognition.continuous = true

    recognition.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          transcriptRef.current += e.results[i][0].transcript
        }
      }
    }

    recognition.onerror = (e) => {
      recognitionRef.current = null
      setErrorMsg(`Mic error: ${e.error}`)
      setStatus('error')
    }

    // onend fires after ALL onresult events — safest place to process
    recognition.onend = () => {
      recognitionRef.current = null
      processTranscript()
    }

    recognition.start()
  }, [])

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      // onend will fire and call processTranscript — nothing else needed here
    }
  }, [])

  const handleClick = () => {
    if (status === 'idle' || status === 'error') startListening()
    else if (status === 'listening') stopListening()
  }

  const fabClass = [
    'voice-fab',
    status === 'listening' ? 'voice-fab--recording' : '',
    status === 'processing' ? 'voice-fab--processing' : '',
  ].filter(Boolean).join(' ')

  return (
    <div className="voice-fab-root">
      {status !== 'idle' && (
        <div className={`voice-fab-status ${status === 'error' ? 'voice-fab-status--error' : ''}`}>
          {status === 'listening' && (
            <>
              <span className="listening-dot" />
              Recording… tap to stop
            </>
          )}
          {status === 'processing' && 'Parsing patient…'}
          {status === 'error' && errorMsg}
        </div>
      )}

      <button
        className={fabClass}
        onClick={handleClick}
        disabled={status === 'processing'}
        title="Add patient via voice"
      >
        {status === 'idle'       && <Mic size={22} />}
        {status === 'listening'  && <MicOff size={22} />}
        {status === 'processing' && <Loader2 size={22} className="spin" />}
        {status === 'error'      && <AlertCircle size={22} />}
      </button>
    </div>
  )
}
