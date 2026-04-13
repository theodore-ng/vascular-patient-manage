import { useState } from 'react'
import { X } from 'lucide-react'

export default function PatientFormModal({ patient, onSubmit, onClose }) {
  const isEdit = !!patient
  const [fields, setFields] = useState({
    name: patient?.name || '',
    age: patient?.age ?? '',
    clinicalManifestation: patient?.clinicalManifestation || '',
    underlyingDisease: patient?.underlyingDisease || '',
    imagingDiagnosis: patient?.imagingDiagnosis || '',
  })

  function set(key, value) {
    setFields(prev => ({ ...prev, [key]: value }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    const parsed = {
      ...fields,
      age: fields.age !== '' ? Number(fields.age) : null,
    }
    // For edits, only pass fields that have a value so empty fields don't overwrite existing data
    if (isEdit) {
      const changed = {}
      if (parsed.name.trim()) changed.name = parsed.name.trim()
      if (parsed.age !== null) changed.age = parsed.age
      if (parsed.clinicalManifestation.trim()) changed.clinicalManifestation = parsed.clinicalManifestation.trim()
      if (parsed.underlyingDisease.trim()) changed.underlyingDisease = parsed.underlyingDisease.trim()
      if (parsed.imagingDiagnosis.trim()) changed.imagingDiagnosis = parsed.imagingDiagnosis.trim()
      onSubmit(changed)
    } else {
      onSubmit({
        name: parsed.name.trim() || '—',
        age: parsed.age,
        clinicalManifestation: parsed.clinicalManifestation.trim() || '—',
        underlyingDisease: parsed.underlyingDisease.trim() || '—',
        imagingDiagnosis: parsed.imagingDiagnosis.trim() || '—',
      })
    }
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box patient-form-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEdit ? 'Edit Patient' : 'Add Patient'}</h2>
          <button className="icon-btn" onClick={onClose}><X size={20} /></button>
        </div>

        <form className="patient-form" onSubmit={handleSubmit}>
          <div className="pf-row">
            <div className="pf-field pf-field--grow">
              <label className="pf-label">Name</label>
              <input
                className="pf-input"
                type="text"
                placeholder="Patient name"
                value={fields.name}
                onChange={e => set('name', e.target.value)}
                autoFocus
              />
            </div>
            <div className="pf-field pf-field--age">
              <label className="pf-label">Age</label>
              <input
                className="pf-input"
                type="number"
                placeholder="—"
                min="0"
                max="150"
                value={fields.age}
                onChange={e => set('age', e.target.value)}
              />
            </div>
          </div>

          <div className="pf-field">
            <label className="pf-label">Clinical Presentation</label>
            <textarea
              className="pf-textarea"
              placeholder="Symptoms and signs…"
              value={fields.clinicalManifestation}
              onChange={e => set('clinicalManifestation', e.target.value)}
              rows={2}
            />
          </div>

          <div className="pf-field">
            <label className="pf-label">Comorbidities</label>
            <textarea
              className="pf-textarea"
              placeholder="Pre-existing conditions…"
              value={fields.underlyingDisease}
              onChange={e => set('underlyingDisease', e.target.value)}
              rows={2}
            />
          </div>

          <div className="pf-field">
            <label className="pf-label">Imaging Findings</label>
            <textarea
              className="pf-textarea"
              placeholder="Radiological findings…"
              value={fields.imagingDiagnosis}
              onChange={e => set('imagingDiagnosis', e.target.value)}
              rows={2}
            />
          </div>

          <div className="pf-actions">
            <button type="button" className="pf-btn pf-btn--cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="pf-btn pf-btn--submit">
              {isEdit ? 'Save Changes' : 'Add Patient'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
