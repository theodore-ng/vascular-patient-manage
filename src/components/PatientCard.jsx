import { useState, useCallback, useRef } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  GripVertical, Activity, Heart, Scan,
  Trash2, Plus, Minus, Mic, MicOff, Loader2, Pencil,
  LogOut, Archive, Tag, Layers, FileText, X, Check,
} from 'lucide-react'
import { useSwipeRemove } from '../hooks/useSwipeRemove'
import { parsePatientTranscript } from '../services/groq'

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

const TAG_COLORS = ['red', 'yellow', 'green']

export default function PatientCard({
  patient, index, selected,
  onSelect, onDischarge, onDelete, onUpdate, onEdit, onTag, onSetGroup, onNote,
  groups, onAddGroup,
}) {
  const [expanded, setExpanded]               = useState(false)
  const [voiceState, setVoiceState]           = useState('idle')
  const [noteOpen, setNoteOpen]               = useState(false)
  const [noteText, setNoteText]               = useState(patient.note || '')
  const [tagPickerOpen, setTagPickerOpen]     = useState(false)
  const [groupPickerOpen, setGroupPickerOpen] = useState(false)
  const [groupInput, setGroupInput]           = useState('')
  const transcriptRef  = useRef('')
  const recognitionRef = useRef(null)

  const {
    attributes, listeners,
    setNodeRef: sortableRef,
    transform, transition, isDragging,
  } = useSortable({ id: patient.id })

  const { ref: swipeRef, translateX, openSide, close } = useSwipeRemove()

  const sortableStyle = { transform: CSS.Transform.toString(transform), transition }
  const cardStyle = (translateX !== 0)
    ? { transform: `translateX(${translateX}px)`, transition: 'none', zIndex: 2 }
    : { transition: 'transform 0.25s ease', zIndex: 2 }

  /* ── Voice update ─────────────────────────────────────── */
  const startVoiceUpdate = useCallback((e) => {
    e.stopPropagation()
    if (!SpeechRecognition) return
    transcriptRef.current = ''
    setVoiceState('listening')

    const recognition = new SpeechRecognition()
    recognitionRef.current = recognition
    recognition.lang = 'vi-VN'
    recognition.interimResults = false
    recognition.continuous = true

    recognition.onresult = (ev) => {
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        if (ev.results[i].isFinal) transcriptRef.current += ev.results[i][0].transcript
      }
    }

    recognition.onerror = () => { recognitionRef.current = null; setVoiceState('idle') }

    recognition.onend = async () => {
      recognitionRef.current = null
      const text = transcriptRef.current.trim()
      if (!text) { setVoiceState('idle'); return }
      setVoiceState('processing')
      try {
        const parsed = await parsePatientTranscript(text)
        const fields = {}
        if (parsed.name && parsed.name !== '—')                                   fields.name = parsed.name
        if (parsed.age !== null)                                                   fields.age = parsed.age
        if (parsed.clinicalManifestation && parsed.clinicalManifestation !== '—') fields.clinicalManifestation = parsed.clinicalManifestation
        if (parsed.underlyingDisease && parsed.underlyingDisease !== '—')         fields.underlyingDisease = parsed.underlyingDisease
        if (parsed.imagingDiagnosis && parsed.imagingDiagnosis !== '—')           fields.imagingDiagnosis = parsed.imagingDiagnosis
        if (Object.keys(fields).length === 0) { setVoiceState('idle'); return }
        onUpdate(patient.id, fields)
        setExpanded(true)
      } catch { /* silent */ }
      setVoiceState('idle')
    }

    recognition.start()
  }, [patient.id, onUpdate])

  const stopVoiceUpdate = useCallback((e) => {
    e.stopPropagation()
    if (recognitionRef.current) recognitionRef.current.stop()
  }, [])

  const toggleExpand = useCallback((e) => { e.stopPropagation(); setExpanded(v => !v) }, [])

  /* ── Swipe action helpers ─────────────────────────────── */
  function act(fn) { close(); fn() }

  /* ── Group picker actions ─────────────────────────────── */
  function assignGroup(g) {
    onSetGroup(patient.id, patient.group === g ? null : g)
    setGroupPickerOpen(false)
  }

  function submitNewGroup() {
    const name = groupInput.trim()
    if (!name) return
    onAddGroup(name)
    onSetGroup(patient.id, name)
    setGroupInput('')
    setGroupPickerOpen(false)
  }

  const tagColor   = patient.tag   || null
  const groupLabel = patient.group || null

  return (
    <div
      ref={sortableRef}
      style={sortableStyle}
      className={`patient-card-wrapper ${isDragging ? 'dragging' : ''} ${selected ? 'selected' : ''}`}
    >
      {/* ── Left action panel (right swipe →) ── */}
      <div className={`swipe-actions-left ${openSide === 'right' ? 'swipe-actions--visible' : ''}`}>
        <button className="swipe-action-btn swipe-action-btn--discharge" onClick={() => act(() => onDischarge(patient.id))}>
          <LogOut size={18} /><span>Discharge</span>
        </button>
        <button className="swipe-action-btn swipe-action-btn--archive" onClick={() => act(() => onDischarge(patient.id))}>
          <Archive size={18} /><span>Archive</span>
        </button>
        <button className="swipe-action-btn swipe-action-btn--delete" onClick={() => act(() => onDelete(patient.id))}>
          <Trash2 size={18} /><span>Remove</span>
        </button>
      </div>

      {/* ── Right action panel (left swipe ←) ── */}
      <div className={`swipe-actions-right ${openSide === 'left' ? 'swipe-actions--visible' : ''}`}>
        <button className="swipe-action-btn swipe-action-btn--tag" onClick={() => act(() => setTagPickerOpen(true))}>
          <Tag size={18} /><span>Tag</span>
        </button>
        <button className="swipe-action-btn swipe-action-btn--group" onClick={() => act(() => setGroupPickerOpen(true))}>
          <Layers size={18} /><span>Group</span>
        </button>
        <button className="swipe-action-btn swipe-action-btn--note" onClick={() => act(() => { setNoteOpen(true); setNoteText(patient.note || '') })}>
          <FileText size={18} /><span>Note</span>
        </button>
      </div>

      {/* ── The actual sliding card ───────────── */}
      <div
        ref={swipeRef}
        className={`patient-card glass-panel ${selected ? 'patient-card--selected' : ''} ${tagColor ? `patient-card--tag-${tagColor}` : ''}`}
        style={cardStyle}
        onClick={() => { if (openSide) { close(); return } onSelect(patient) }}
      >
        {/* Drag handle */}
        <div className="drag-handle" {...attributes} {...listeners}>
          <GripVertical size={18} />
        </div>

        {/* Queue badge */}
        <div className="queue-badge">{index + 1}</div>

        {/* Card content */}
        <div className="card-body">
          {/* Name row: name/age · edit · mic · expand (right end) */}
          <div className="card-top-row">
            <div className="patient-name-block">
              <h3 className="patient-name">{patient.name}</h3>
              {patient.age !== null && (
                <span className="patient-age">{patient.age} years old</span>
              )}
            </div>

            {/* Edit button */}
            <button
              className="card-inline-btn"
              onClick={e => { e.stopPropagation(); onEdit(patient) }}
              title="Edit patient"
            >
              <Pencil size={13} />
            </button>

            {/* Voice update button */}
            {voiceState === 'idle' && (
              <button className="card-inline-btn" onClick={startVoiceUpdate} title="Voice update">
                <Mic size={13} />
              </button>
            )}
            {voiceState === 'listening' && (
              <button className="card-inline-btn card-inline-btn--recording" onClick={stopVoiceUpdate} title="Stop recording">
                <MicOff size={13} />
              </button>
            )}
            {voiceState === 'processing' && (
              <button className="card-inline-btn" disabled title="Parsing…">
                <Loader2 size={13} className="spin" />
              </button>
            )}

            {/* Expand — circle, right end */}
            <button className={`card-expand-btn ${expanded ? 'card-expand-btn--open' : ''}`} onClick={toggleExpand} title={expanded ? 'Collapse' : 'Show details'}>
              {expanded ? <Minus size={13} /> : <Plus size={13} />}
            </button>
          </div>

          {/* Meta row: tag · group · note — only shown when at least one exists */}
          {(tagColor || groupLabel || (patient.note && !noteOpen)) && (
            <div className="card-meta-row">
              {tagColor && <span className={`card-tag-dot card-tag-dot--${tagColor}`} />}
              {groupLabel && <span className="card-group-badge">{groupLabel}</span>}
              {patient.note && !noteOpen && (
                <span className="card-note-snippet">
                  <FileText size={11} />
                  <span>{patient.note}</span>
                </span>
              )}
            </div>
          )}

          {/* Inline tag color picker */}
          {tagPickerOpen && (
            <div className="card-tag-picker" onClick={e => e.stopPropagation()}>
              {TAG_COLORS.map(c => (
                <button
                  key={c}
                  className={`tag-pick-dot tag-pick-dot--${c} ${patient.tag === c ? 'tag-pick-dot--active' : ''}`}
                  onClick={() => { onTag(patient.id, patient.tag === c ? null : c); setTagPickerOpen(false) }}
                  title={c}
                />
              ))}
              <button
                className="tag-pick-dot tag-pick-dot--clear"
                onClick={() => { onTag(patient.id, null); setTagPickerOpen(false) }}
                title="Clear tag"
              >
                <X size={10} />
              </button>
            </div>
          )}

          {/* Inline group picker */}
          {groupPickerOpen && (
            <div className="card-group-picker" onClick={e => e.stopPropagation()}>
              {groups.length > 0 && (
                <div className="group-chips">
                  {groups.map(g => (
                    <button
                      key={g}
                      className={`group-chip ${patient.group === g ? 'group-chip--active' : ''}`}
                      onClick={() => assignGroup(g)}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              )}
              <div className="group-input-row">
                <input
                  className="group-input"
                  value={groupInput}
                  onChange={e => setGroupInput(e.target.value)}
                  placeholder="New group…"
                  onKeyDown={e => { if (e.key === 'Enter') submitNewGroup() }}
                  autoFocus
                />
                <button className="group-input-add" disabled={!groupInput.trim()} onClick={submitNewGroup}>
                  Add
                </button>
              </div>
              {patient.group && (
                <button className="group-clear-btn" onClick={() => { onSetGroup(patient.id, null); setGroupPickerOpen(false) }}>
                  Clear group
                </button>
              )}
              <button className="group-close-btn" onClick={() => setGroupPickerOpen(false)}>
                <X size={12} /> Close
              </button>
            </div>
          )}

          {/* Inline note editor */}
          {noteOpen && (
            <div className="card-note-editor" onClick={e => e.stopPropagation()}>
              <textarea
                className="card-note-textarea"
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                placeholder="Add a note…"
                rows={3}
                autoFocus
              />
              <div className="card-note-actions">
                <button className="card-note-save" onClick={() => { onNote(patient.id, noteText.trim()); setNoteOpen(false) }}>
                  <Check size={13} /> Save
                </button>
                <button className="card-note-cancel" onClick={() => setNoteOpen(false)}>
                  <X size={13} /> Cancel
                </button>
              </div>
            </div>
          )}

          {/* Expandable clinical details */}
          {expanded && (
            <div className="card-details">
              <div className="card-field">
                <span className="field-icon"><Activity size={14} /></span>
                <div className="field-content">
                  <span className="field-label">Clinical Presentation</span>
                  <span className="field-value">{patient.clinicalManifestation || '—'}</span>
                </div>
              </div>
              <div className="card-field">
                <span className="field-icon"><Heart size={14} /></span>
                <div className="field-content">
                  <span className="field-label">Comorbidities</span>
                  <span className="field-value">{patient.underlyingDisease || '—'}</span>
                </div>
              </div>
              <div className="card-field">
                <span className="field-icon"><Scan size={14} /></span>
                <div className="field-content">
                  <span className="field-label">Imaging Findings</span>
                  <span className="field-value">{patient.imagingDiagnosis || '—'}</span>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
