import { useState } from 'react'
import { Clock, User, Activity, Heart, Scan, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react'

function formatDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString('en-GB', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function HistoryCard({ patient, onRestore }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="history-card">
      <div className="history-card-top">
        <div className="patient-avatar-icon history-avatar">
          <User size={18} />
        </div>
        <div className="history-card-info">
          <div className="history-card-name">{patient.name}</div>
          {patient.age !== null && (
            <div className="history-card-age">{patient.age} years old</div>
          )}
        </div>
        <div className="history-card-meta">
          <Clock size={12} />
          <span>{formatDate(patient.dischargedAt)}</span>
        </div>
        <div className="history-card-actions">
          <button
            className="history-restore-btn"
            onClick={() => onRestore(patient)}
            title="Restore to queue"
          >
            <RotateCcw size={13} />
            Restore
          </button>
          <button
            className="card-expand-btn"
            onClick={() => setExpanded(v => !v)}
          >
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            {expanded ? 'Less' : 'Details'}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="card-details history-details">
          <div className="card-field">
            <span className="field-icon"><Activity size={13} /></span>
            <div className="field-content">
              <span className="field-label">Clinical Presentation</span>
              <span className="field-value">{patient.clinicalManifestation || '—'}</span>
            </div>
          </div>
          <div className="card-field">
            <span className="field-icon"><Heart size={13} /></span>
            <div className="field-content">
              <span className="field-label">Comorbidities</span>
              <span className="field-value">{patient.underlyingDisease || '—'}</span>
            </div>
          </div>
          <div className="card-field">
            <span className="field-icon"><Scan size={13} /></span>
            <div className="field-content">
              <span className="field-label">Imaging Findings</span>
              <span className="field-value">{patient.imagingDiagnosis || '—'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function PatientHistory({ history, onRestore }) {
  if (history.length === 0) {
    return (
      <div className="queue-empty glass-panel">
        <Clock size={48} strokeWidth={1} />
        <p className="queue-empty-title">No history yet</p>
        <p className="queue-empty-sub">Patients removed from the queue will appear here</p>
      </div>
    )
  }

  return (
    <div className="patient-queue">
      {history.map(patient => (
        <HistoryCard key={patient.id} patient={patient} onRestore={onRestore} />
      ))}
    </div>
  )
}
