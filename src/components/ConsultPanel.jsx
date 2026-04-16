import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Bot, User, Loader2, Stethoscope, ChevronDown, ChevronUp } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const MODEL = 'llama-3.3-70b-versatile'

const SYSTEM_PROMPT = `You are an elite vascular surgery consultant AI. You provide evidence-based clinical guidance strictly for qualified vascular surgeons.

When presented with a clinical query or case, structure your response exactly as follows:

1. **Literature Summary**: A concise summary of recent guidelines (SVS, ESVS, AHA/ACC) and high-impact literature. Use a bulleted list categorized by the specific guideline or source (e.g., - **SVS Guideline**: ...).

2. **Medical Therapy**: Provide detailed pharmacological treatments. Use a bulleted list for each medication. For each bullet include the specific drug name, exact dosage, frequency, and route of administration (e.g., - **Aspirin**: 81 mg PO once daily).

3. **Surgical/Endovascular Intervention**: Separate this into three distinct sub-sections:
   - **Open Surgical Repair**: Indications, technique, pros/cons for this patient.
   - **Endovascular Intervention**: Indications, technique, pros/cons for this patient.
   - **Recommendation**: Explicitly state which approach is indicated based on the specific clinical context.

4. **References**: A numbered list of the specific guidelines or clinical studies cited.

Maintain clinical precision. Do not add disclaimers or suggest consulting another physician.`

function getApiKey() {
  return import.meta.env.VITE_GROQ_API_KEY || localStorage.getItem('groq_api_key') || ''
}

function buildPatientContext(patient) {
  if (!patient) return ''
  return `\n\nActive patient context:\n- Name: ${patient.name}\n- Age: ${patient.age ?? '—'}\n- Clinical Presentation: ${patient.clinicalManifestation}\n- Comorbidities: ${patient.underlyingDisease}\n- Imaging Findings: ${patient.imagingDiagnosis}`
}

export default function ConsultPanel({ selectedPatient, standalone = false }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const chatEndRef = useRef(null)
  const textareaRef = useRef(null)
  const prevPatientId = useRef(null)

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }, [input])

  // When a new patient is selected, inject context message
  useEffect(() => {
    if (selectedPatient && selectedPatient.id !== prevPatientId.current) {
      prevPatientId.current = selectedPatient.id
      setMessages(prev => [
        ...prev,
        {
          role: 'system-notice',
          content: `Patient context loaded: **${selectedPatient.name}**, ${selectedPatient.age} y/o — ${selectedPatient.imagingDiagnosis}`,
        },
      ])
    }
  }, [selectedPatient])

  const sendMessage = useCallback(async () => {
    const text = input.trim()
    if (!text || loading) return

    const apiKey = getApiKey()
    if (!apiKey) {
      setMessages(prev => [...prev, {
        role: 'error',
        content: 'No Groq API key configured. Open Settings to add your key.',
      }])
      return
    }

    const userMsg = { role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    // Build the messages array for the API
    const patientCtx = buildPatientContext(selectedPatient)
    const history = messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({ role: m.role, content: m.content }))

    const apiMessages = [
      { role: 'system', content: SYSTEM_PROMPT + patientCtx },
      ...history,
      { role: 'user', content: text },
    ]

    try {
      const res = await fetch(GROQ_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ model: MODEL, temperature: 0.1, messages: apiMessages }),
      })

      if (!res.ok) throw new Error(`API error ${res.status}`)
      const data = await res.json()
      const reply = data.choices[0].message.content

      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch (err) {
      setMessages(prev => [...prev, { role: 'error', content: err.message }])
    } finally {
      setLoading(false)
    }
  }, [input, loading, messages, selectedPatient])

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const isExpanded = standalone || !collapsed

  return (
    <section className={`consult-panel glass-panel${collapsed && !standalone ? ' consult-panel--collapsed' : ''}${standalone ? ' consult-panel--standalone' : ''}`}>
      {/* Header */}
      <div
        className="consult-header"
        onClick={standalone ? undefined : () => setCollapsed(v => !v)}
        style={standalone ? undefined : { cursor: 'pointer' }}
      >
        <div className="consult-header-left">
          <div className="consult-icon">
            <Stethoscope size={16} />
          </div>
          <div>
            <p className="consult-title">AI Consultant</p>
            <p className="consult-subtitle">
              {selectedPatient
                ? `${selectedPatient.name} · ${selectedPatient.age} y/o`
                : 'No patient selected'}
            </p>
          </div>
        </div>
        <div className="consult-header-right">
          <span className="consult-model-badge">Llama 3.3 70B</span>
          {!standalone && (
            <button className="consult-collapse-btn" onClick={e => { e.stopPropagation(); setCollapsed(v => !v) }}>
              {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
            </button>
          )}
        </div>
      </div>

      {/* Messages + Input — hidden when collapsed (never collapsed in standalone) */}
      {isExpanded && <div className="consult-messages">
        {messages.length === 0 && (
          <div className="consult-empty">
            <Bot size={36} strokeWidth={1} />
            <p className="consult-empty-title">Clinical AI Consultant</p>
            <p className="consult-empty-sub">
              Select a patient from the queue, then ask about treatment options, drug dosing, or surgical planning.
            </p>
            <div className="consult-suggestions">
              {[
                'What is the recommended treatment?',
                'Summarise SVS guidelines for this case',
                'Compare open vs endovascular options',
              ].map(s => (
                <button key={s} className="suggestion-chip" onClick={() => setInput(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => {
          if (msg.role === 'system-notice') {
            return (
              <div key={i} className="consult-notice">
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>
            )
          }
          if (msg.role === 'error') {
            return (
              <div key={i} className="consult-error">{msg.content}</div>
            )
          }
          return (
            <div key={i} className={`consult-message consult-message--${msg.role}`}>
              <div className="consult-message-avatar">
                {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
              </div>
              <div className="consult-message-body">
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>
            </div>
          )
        })}

        {loading && (
          <div className="consult-message consult-message--assistant">
            <div className="consult-message-avatar"><Bot size={14} /></div>
            <div className="consult-message-body consult-typing">
              <span /><span /><span />
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>}

      {isExpanded && <div className="consult-input-area">
        <textarea
          ref={textareaRef}
          className="consult-textarea"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={selectedPatient
            ? `Ask about ${selectedPatient.name}…`
            : 'Ask a clinical question…'}
          rows={1}
          disabled={loading}
        />
        <button
          className={`consult-send-btn ${(!input.trim() || loading) ? 'disabled' : ''}`}
          onClick={sendMessage}
          disabled={!input.trim() || loading}
        >
          {loading ? <Loader2 size={16} className="spin" /> : <Send size={16} />}
        </button>
      </div>}
    </section>
  )
}
