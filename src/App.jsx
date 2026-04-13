import { useState, useEffect, useCallback } from 'react'
import { X, Eye, EyeOff } from 'lucide-react'
import { supabase } from './lib/supabase'
import Sidebar from './components/Sidebar'
import VoiceInput from './components/VoiceInput'
import PatientQueue from './components/PatientQueue'
import PatientHistory from './components/PatientHistory'
import ConsultPanel from './components/ConsultPanel'
import PatientFormModal from './components/PatientFormModal'

const SUPABASE_ENABLED =
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY

function App() {
  const [patients, setPatients] = useState([])
  const [history, setHistory] = useState([])
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentView, setCurrentView] = useState('queue')
  const [showSettings, setShowSettings] = useState(false)
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [savedMsg, setSavedMsg] = useState(false)
  const [patientForm, setPatientForm] = useState(null) // null | { mode: 'add' } | { mode: 'edit', patient }

  useEffect(() => {
    if (SUPABASE_ENABLED) {
      loadFromSupabase()
    } else {
      const stored = localStorage.getItem('vascular_patients')
      if (stored) setPatients(JSON.parse(stored))
      const storedHistory = localStorage.getItem('vascular_history')
      if (storedHistory) setHistory(JSON.parse(storedHistory))
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!SUPABASE_ENABLED && !loading) {
      localStorage.setItem('vascular_patients', JSON.stringify(patients))
    }
  }, [patients, loading])

  useEffect(() => {
    if (!SUPABASE_ENABLED && !loading) {
      localStorage.setItem('vascular_history', JSON.stringify(history))
    }
  }, [history, loading])

  async function loadFromSupabase() {
    setLoading(true)
    const [queueRes, historyRes] = await Promise.all([
      supabase.from('patients').select('*').eq('status', 'queue').order('position', { ascending: true }),
      supabase.from('patients').select('*').eq('status', 'discharged').order('discharged_at', { ascending: false }),
    ])
    if (!queueRes.error && queueRes.data) setPatients(queueRes.data.map(dbToLocal))
    if (!historyRes.error && historyRes.data) setHistory(historyRes.data.map(dbToLocal))
    setLoading(false)
  }

  function localToDb(patient, position) {
    return {
      id: patient.id,
      name: patient.name,
      age: patient.age,
      clinical_manifestation: patient.clinicalManifestation,
      underlying_disease: patient.underlyingDisease,
      imaging_diagnosis: patient.imagingDiagnosis,
      status: 'queue',
      position,
    }
  }

  function dbToLocal(row) {
    return {
      id: row.id,
      name: row.name,
      age: row.age,
      clinicalManifestation: row.clinical_manifestation,
      underlyingDisease: row.underlying_disease,
      imagingDiagnosis: row.imaging_diagnosis,
      dischargedAt: row.discharged_at ?? null,
    }
  }

  const addPatient = useCallback((parsed) => {
    const newPatient = { id: crypto.randomUUID(), ...parsed }
    setPatients(prev => {
      const updated = [...prev, newPatient]
      if (SUPABASE_ENABLED) {
        supabase.from('patients').insert(localToDb(newPatient, updated.length - 1))
          .then(({ error }) => { if (error) console.error(error) })
      }
      return updated
    })
  }, [])

  const removePatient = useCallback((id) => {
    setPatients(prev => {
      const patient = prev.find(p => p.id === id)
      const updated = prev.filter(p => p.id !== id)

      const dischargedAt = new Date().toISOString()
      const discharged = { ...patient, dischargedAt }

      setHistory(h => [discharged, ...h])

      if (SUPABASE_ENABLED) {
        supabase.from('patients')
          .update({ status: 'discharged', discharged_at: dischargedAt })
          .eq('id', id)
          .then(({ error }) => { if (error) console.error(error) })
        updated.forEach((p, i) =>
          supabase.from('patients').update({ position: i }).eq('id', p.id)
            .then(({ error }) => { if (error) console.error(error) })
        )
      }
      return updated
    })
  }, [])

  // Hard delete — no history entry
  const deletePatient = useCallback((id) => {
    setPatients(prev => {
      const updated = prev.filter(p => p.id !== id)
      if (SUPABASE_ENABLED) {
        supabase.from('patients').delete().eq('id', id)
          .then(({ error }) => { if (error) console.error(error) })
      }
      return updated
    })
  }, [])

  const tagPatient = useCallback((id) => {
    const TAG_CYCLE = [null, 'red', 'orange', 'green', 'blue']
    setPatients(prev => prev.map(p => {
      if (p.id !== id) return p
      const idx = TAG_CYCLE.indexOf(p.tag ?? null)
      return { ...p, tag: TAG_CYCLE[(idx + 1) % TAG_CYCLE.length] }
    }))
  }, [])

  const toggleTodoPatient = useCallback((id) => {
    setPatients(prev => prev.map(p =>
      p.id === id ? { ...p, hasTodo: !p.hasTodo } : p
    ))
  }, [])

  const notePatient = useCallback((id, note) => {
    setPatients(prev => prev.map(p => p.id === id ? { ...p, note } : p))
  }, [])

  const restorePatient = useCallback((patient) => {
    const restored = { ...patient, dischargedAt: null }
    setHistory(prev => prev.filter(p => p.id !== patient.id))
    setPatients(prev => {
      const updated = [...prev, restored]
      if (SUPABASE_ENABLED) {
        supabase.from('patients')
          .update({ status: 'queue', discharged_at: null, position: updated.length - 1 })
          .eq('id', patient.id)
          .then(({ error }) => { if (error) console.error(error) })
      }
      return updated
    })
    setCurrentView('queue')
  }, [])

  const updatePatient = useCallback((id, fields) => {
    setPatients(prev => {
      const updated = prev.map(p => p.id === id ? { ...p, ...fields } : p)
      if (SUPABASE_ENABLED) {
        const p = updated.find(p => p.id === id)
        if (p) {
          supabase.from('patients').update({
            name: p.name,
            age: p.age,
            clinical_manifestation: p.clinicalManifestation,
            underlying_disease: p.underlyingDisease,
            imaging_diagnosis: p.imagingDiagnosis,
          }).eq('id', id)
            .then(({ error }) => { if (error) console.error(error) })
        }
      }
      return updated
    })
    setSelectedPatient(prev => prev?.id === id ? { ...prev, ...fields } : prev)
  }, [])

  const reorderPatients = useCallback((newOrder) => {
    setPatients(newOrder)
    if (SUPABASE_ENABLED) {
      newOrder.forEach((p, i) =>
        supabase.from('patients').update({ position: i }).eq('id', p.id)
          .then(({ error }) => { if (error) console.error(error) })
      )
    }
  }, [])

  function handleFormSubmit(fields) {
    if (patientForm?.mode === 'edit') {
      updatePatient(patientForm.patient.id, fields)
    } else {
      addPatient(fields)
    }
  }

  function saveApiKey() {
    localStorage.setItem('groq_api_key', apiKeyInput.trim())
    setSavedMsg(true)
    setTimeout(() => setSavedMsg(false), 2000)
  }

  function openSettings() {
    setApiKeyInput(localStorage.getItem('groq_api_key') || '')
    setShowSettings(true)
  }

  const isQueue = currentView === 'queue'

  return (
    <div className="app-root">
      {/* Left — Sidebar */}
      <Sidebar
        currentView={currentView}
        onViewChange={setCurrentView}
        onOpenSettings={openSettings}
      />

      {/* Center — Queue or History */}
      <div className="center-col">
        <div className="center-col-header">
          <div>
            <h2 className="center-col-title">
              {isQueue ? 'Patient Queue' : 'History'}
            </h2>
            <p className="center-col-sub">
              {isQueue
                ? `${patients.length} patient${patients.length !== 1 ? 's' : ''} · Drag to reorder · Swipe → discharge · Swipe ← annotate`
                : `${history.length} discharged patient${history.length !== 1 ? 's' : ''}`
              }
            </p>
          </div>
          <div className="queue-count-badge">
            <span className="queue-count-num">{isQueue ? patients.length : history.length}</span>
            <span className="queue-count-label">{isQueue ? 'in queue' : 'total'}</span>
          </div>
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="spinner" />
            <p>Loading…</p>
          </div>
        ) : isQueue ? (
          <PatientQueue
            patients={patients}
            selectedId={selectedPatient?.id}
            onSelect={setSelectedPatient}
            onReorder={reorderPatients}
            onDischarge={(id) => {
              if (selectedPatient?.id === id) setSelectedPatient(null)
              removePatient(id)
            }}
            onDelete={(id) => {
              if (selectedPatient?.id === id) setSelectedPatient(null)
              deletePatient(id)
            }}
            onUpdate={updatePatient}
            onEdit={(patient) => setPatientForm({ mode: 'edit', patient })}
            onTag={tagPatient}
            onToggleTodo={toggleTodoPatient}
            onNote={notePatient}
          />
        ) : (
          <PatientHistory
            history={history}
            onRestore={restorePatient}
          />
        )}
      </div>

      {/* Right — AI Consult Panel */}
      <ConsultPanel selectedPatient={selectedPatient} />

      {/* FAB group — only show on queue view */}
      {isQueue && (
        <div className="fab-group">
          <button
            className="fab-text-btn"
            onClick={() => setPatientForm({ mode: 'add' })}
            title="Add patient manually"
          >
            +
          </button>
          <VoiceInput onPatientParsed={addPatient} />
        </div>
      )}

      {/* Patient form modal */}
      {patientForm && (
        <PatientFormModal
          patient={patientForm.mode === 'edit' ? patientForm.patient : null}
          onSubmit={handleFormSubmit}
          onClose={() => setPatientForm(null)}
        />
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="modal-box glass-panel" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Settings</h2>
              <button className="icon-btn" onClick={() => setShowSettings(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <label className="settings-label">Groq API Key</label>
              <p className="settings-hint">
                Used for AI parsing of voice input and clinical consultation.
                Get a free key at <span className="settings-link">console.groq.com</span>
              </p>
              <div className="api-key-row">
                <input
                  type={showKey ? 'text' : 'password'}
                  className="api-key-input"
                  value={apiKeyInput}
                  onChange={e => setApiKeyInput(e.target.value)}
                  placeholder="gsk_..."
                  spellCheck={false}
                />
                <button className="icon-btn" onClick={() => setShowKey(v => !v)}>
                  {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <button className="save-btn" onClick={saveApiKey}>
                {savedMsg ? '✓ Saved' : 'Save Key'}
              </button>
              {!SUPABASE_ENABLED && (
                <p className="settings-notice">
                  Supabase not configured — data is stored in your browser only.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
