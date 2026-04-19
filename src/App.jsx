import { useState, useEffect, useCallback, useRef } from 'react'
import { X, Eye, EyeOff, Mic, MicOff, Loader2, Pencil } from 'lucide-react'
import { supabase } from './lib/supabase'
import Sidebar from './components/Sidebar'
import VoiceInput from './components/VoiceInput'
import PatientQueue from './components/PatientQueue'
import PatientHistory from './components/PatientHistory'
import ConsultPanel from './components/ConsultPanel'
import PatientFormModal from './components/PatientFormModal'
import ToolsPanel from './components/ToolsPanel'

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
  const [activeGroupFilter, setActiveGroupFilter] = useState(null)
  const [sortBy, setSortBy] = useState('queue')
  const [tagFilter, setTagFilter] = useState(null)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [fabOpen, setFabOpen] = useState(false)
  const [voiceStatus, setVoiceStatus] = useState('idle')
  const voiceStartRef = useRef(null)
  const voiceStopRef  = useRef(null)

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
    if (!queueRes.error && queueRes.data) {
      setPatients(queueRes.data.map(dbToLocal))
    }
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
      tag: patient.tag ?? null,
      group_name: patient.group ?? null,
      note: patient.note ?? null,
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
      tag: row.tag ?? null,
      group: row.group_name ?? null,
      note: row.note ?? null,
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

  const tagPatient = useCallback((id, color) => {
    setPatients(prev => prev.map(p => p.id === id ? { ...p, tag: color } : p))
    if (SUPABASE_ENABLED) {
      supabase.from('patients').update({ tag: color }).eq('id', id)
        .then(({ error }) => { if (error) console.error(error) })
    }
  }, [])

  const setPatientGroup = useCallback((id, group) => {
    setPatients(prev => prev.map(p => p.id === id ? { ...p, group } : p))
    if (SUPABASE_ENABLED) {
      supabase.from('patients').update({ group_name: group ?? null }).eq('id', id)
        .then(({ error }) => { if (error) console.error(error) })
    }
  }, [])

  const notePatient = useCallback((id, note) => {
    setPatients(prev => prev.map(p => p.id === id ? { ...p, note } : p))
    if (SUPABASE_ENABLED) {
      supabase.from('patients').update({ note: note ?? null }).eq('id', id)
        .then(({ error }) => { if (error) console.error(error) })
    }
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
            tag: p.tag ?? null,
            group_name: p.group ?? null,
            note: p.note ?? null,
          }).eq('id', id)
            .then(({ error }) => { if (error) console.error(error) })
        }
      }
      return updated
    })
    setSelectedPatient(prev => prev?.id === id ? { ...prev, ...fields } : prev)
  }, [])

  const applyAutoGroups = useCallback((assignments) => {
    assignments.forEach(({ id, group }) => { if (group) setPatientGroup(id, group) })
  }, [setPatientGroup])

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
        filtersOpen={filtersOpen}
        onToggleFilters={() => { setCurrentView('queue'); setFiltersOpen(v => !v) }}
        sortBy={sortBy}
        onSortChange={setSortBy}
        tagFilter={tagFilter}
        onTagFilterChange={setTagFilter}
        activeGroupFilter={activeGroupFilter}
        onGroupFilterChange={setActiveGroupFilter}
        patients={patients}
      />

      {/* Center — Queue or History */}
      <div className="center-col">
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
            onSetGroup={setPatientGroup}
            onNote={notePatient}
            sortBy={sortBy}
            tagFilter={tagFilter}
            activeGroupFilter={activeGroupFilter}
          />
        ) : currentView === 'history' ? (
          <PatientHistory
            history={history}
            onRestore={restorePatient}
          />
        ) : currentView === 'consult' ? (
          <ConsultPanel selectedPatient={selectedPatient} standalone />
        ) : (
          <ToolsPanel
            patients={patients}
            onApplyAutoGroups={applyAutoGroups}
          />
        )}
      </div>

      {/* FAB group — only show on queue view */}
      {isQueue && (
        <div className="fab-group">
          {/* Voice status pill (rendered by VoiceInput, no button) */}
          <VoiceInput
            onPatientParsed={addPatient}
            startRef={voiceStartRef}
            stopRef={voiceStopRef}
            onStatusChange={setVoiceStatus}
          />

          {/* FAB options menu */}
          {fabOpen && voiceStatus === 'idle' && (
            <div className="fab-options">
              <button
                className="fab-option"
                onClick={() => { setFabOpen(false); voiceStartRef.current?.() }}
              >
                <Mic size={15} /> Voice
              </button>
              <button
                className="fab-option"
                onClick={() => { setFabOpen(false); setPatientForm({ mode: 'add' }) }}
              >
                <Pencil size={15} /> Text
              </button>
            </div>
          )}

          {/* Main FAB — changes state when recording */}
          {(voiceStatus === 'idle' || voiceStatus === 'error') && (
            <button
              className={`fab-text-btn ${fabOpen ? 'fab-text-btn--open' : ''}`}
              onClick={() => setFabOpen(v => !v)}
              title="Add patient"
            >
              +
            </button>
          )}
          {voiceStatus === 'listening' && (
            <button
              className="voice-fab voice-fab--recording"
              onClick={() => voiceStopRef.current?.()}
              title="Stop recording"
            >
              <MicOff size={22} />
            </button>
          )}
          {voiceStatus === 'processing' && (
            <button className="voice-fab voice-fab--processing" disabled title="Parsing…">
              <Loader2 size={22} className="spin" />
            </button>
          )}
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
