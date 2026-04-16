import { useState } from 'react'
import { Layers, Loader2, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react'
import { autoGroupPatients, VASCULAR_GROUPS } from '../services/groq'

export default function ToolsPanel({ patients, onApplyAutoGroups }) {
  const [status, setStatus] = useState('idle') // idle | loading | preview | error | done
  const [preview, setPreview] = useState([])   // [{ id, name, group }]
  const [error, setError]     = useState('')
  const [appliedCount, setAppliedCount] = useState(0)

  async function runAutoGroup() {
    if (patients.length === 0) return
    setStatus('loading')
    setError('')
    try {
      const results = await autoGroupPatients(patients)
      const withNames = results.map(r => {
        const p = patients.find(p => p.id === r.id)
        return { id: r.id, name: p?.name || r.id, group: r.group }
      })
      setPreview(withNames)
      setStatus('preview')
    } catch (err) {
      setError(err.message)
      setStatus('error')
    }
  }

  function applyGroups() {
    const assigned = preview.filter(r => r.group)
    onApplyAutoGroups(assigned)
    setAppliedCount(assigned.length)
    setStatus('done')
  }

  function reset() {
    setStatus('idle')
    setPreview([])
    setError('')
  }

  const groupedPreview = VASCULAR_GROUPS
    .map(g => ({ group: g, patients: preview.filter(p => p.group === g) }))
    .filter(g => g.patients.length > 0)

  const unclassified = preview.filter(p => !p.group)

  return (
    <div className="tools-panel">
      <div className="tools-header">
        <h2 className="tools-title">Tools</h2>
        <p className="tools-subtitle">AI-powered utilities for the patient queue</p>
      </div>

      <div className="tools-content">
        {/* Auto-Group tool card */}
        <div className="tool-card glass-panel">
          <div className="tool-card-header">
            <div className="tool-card-icon">
              <Layers size={20} />
            </div>
            <div className="tool-card-info">
              <h3 className="tool-card-name">Auto-Group Patients</h3>
              <p className="tool-card-desc">
                AI analyzes imaging findings, clinical presentation, and comorbidities to classify each patient into a standard vascular surgery group.
              </p>
            </div>
          </div>

          {/* Groups reference list */}
          <div className="tool-groups-list">
            {VASCULAR_GROUPS.map(g => (
              <span key={g} className="tool-group-chip">{g}</span>
            ))}
          </div>

          {/* State: idle */}
          {status === 'idle' && (
            <button
              className="tool-run-btn"
              onClick={runAutoGroup}
              disabled={patients.length === 0}
            >
              <Layers size={14} />
              Run Auto-Group
              {patients.length > 0 && (
                <span className="tool-run-count">{patients.length} patient{patients.length !== 1 ? 's' : ''}</span>
              )}
            </button>
          )}

          {/* State: loading */}
          {status === 'loading' && (
            <div className="tool-status-row tool-status-row--loading">
              <Loader2 size={16} className="spin" />
              <span>Analyzing {patients.length} patients…</span>
            </div>
          )}

          {/* State: error */}
          {status === 'error' && (
            <div className="tool-status-row tool-status-row--error">
              <AlertCircle size={15} />
              <span>{error}</span>
              <button className="tool-link-btn" onClick={runAutoGroup}>
                <RefreshCw size={13} /> Retry
              </button>
            </div>
          )}

          {/* State: preview */}
          {status === 'preview' && (
            <div className="tool-preview">
              <p className="tool-preview-label">
                {preview.length} patient{preview.length !== 1 ? 's' : ''} classified — review before applying
              </p>
              <div className="tool-preview-groups">
                {groupedPreview.map(({ group, patients: pts }) => (
                  <div key={group} className="tool-preview-group">
                    <span className="tool-preview-group-name">{group}</span>
                    <div className="tool-preview-patients">
                      {pts.map(p => (
                        <span key={p.id} className="tool-preview-patient">{p.name}</span>
                      ))}
                    </div>
                  </div>
                ))}
                {unclassified.length > 0 && (
                  <div className="tool-preview-group tool-preview-group--unclassified">
                    <span className="tool-preview-group-name">Unclassified</span>
                    <div className="tool-preview-patients">
                      {unclassified.map(p => (
                        <span key={p.id} className="tool-preview-patient tool-preview-patient--muted">{p.name}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="tool-preview-actions">
                <button className="tool-apply-btn" onClick={applyGroups}>
                  <CheckCircle size={14} /> Apply Groups
                </button>
                <button className="tool-cancel-btn" onClick={reset}>Cancel</button>
              </div>
            </div>
          )}

          {/* State: done */}
          {status === 'done' && (
            <div className="tool-status-row tool-status-row--done">
              <CheckCircle size={15} />
              <span>Groups applied to {appliedCount} patient{appliedCount !== 1 ? 's' : ''}</span>
              <button className="tool-link-btn" onClick={reset}>
                <RefreshCw size={13} /> Run again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
