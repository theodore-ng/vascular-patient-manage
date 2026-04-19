import { useState } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { Users } from 'lucide-react'
import PatientCard from './PatientCard'
import { VASCULAR_GROUPS } from '../services/groq'

const SORT_OPTIONS = [
  { key: 'queue',      label: 'Queue'    },
  { key: 'name-asc',   label: 'Name A→Z' },
  { key: 'name-desc',  label: 'Name Z→A' },
  { key: 'age-asc',    label: 'Age ↑'    },
  { key: 'age-desc',   label: 'Age ↓'    },
]

const TAG_COLORS = ['red', 'yellow', 'green']

export default function PatientQueue({
  patients, selectedId, onSelect, onReorder, onDischarge, onDelete,
  onUpdate, onEdit, onTag, onSetGroup, onNote,
  activeGroupFilter, onFilterChange,
}) {
  const [sortBy, setSortBy]       = useState('queue')
  const [tagFilter, setTagFilter] = useState(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 200, tolerance: 5 } })
  )

  /* ── Derive display list ─────────────────── */
  let display = patients
  if (activeGroupFilter) display = display.filter(p => p.group === activeGroupFilter)
  if (tagFilter)         display = display.filter(p => p.tag   === tagFilter)
  if (sortBy !== 'queue') {
    display = [...display].sort((a, b) => {
      if (sortBy === 'name-asc')  return (a.name || '').localeCompare(b.name || '')
      if (sortBy === 'name-desc') return (b.name || '').localeCompare(a.name || '')
      if (sortBy === 'age-asc')   return (a.age ?? 999) - (b.age ?? 999)
      if (sortBy === 'age-desc')  return (b.age ?? 999) - (a.age ?? 999)
      return 0
    })
  }

  const isDndEnabled = !activeGroupFilter && !tagFilter && sortBy === 'queue'

  function handleDragEnd(event) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = patients.findIndex(p => p.id === active.id)
    const newIndex = patients.findIndex(p => p.id === over.id)
    onReorder(arrayMove(patients, oldIndex, newIndex))
  }

  /* ── Groups present in current queue ─────── */
  const activeGroups = VASCULAR_GROUPS.filter(g => patients.some(p => p.group === g))

  const cards = display.map((patient, index) => (
    <PatientCard
      key={patient.id}
      patient={patient}
      index={index}
      selected={selectedId === patient.id}
      onSelect={onSelect}
      onDischarge={onDischarge}
      onDelete={onDelete}
      onUpdate={onUpdate}
      onEdit={onEdit}
      onTag={onTag}
      onSetGroup={onSetGroup}
      onNote={onNote}
    />
  ))

  return (
    <div className="patient-queue-wrapper">
      {/* Sort + tag filter toolbar */}
      <div className="queue-toolbar">
        <div className="queue-sort-row">
          {SORT_OPTIONS.map(opt => (
            <button
              key={opt.key}
              className={`queue-sort-btn ${sortBy === opt.key ? 'queue-sort-btn--active' : ''}`}
              onClick={() => setSortBy(opt.key)}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="queue-tag-filter">
          <button
            className={`queue-tag-btn ${!tagFilter ? 'queue-tag-btn--active' : ''}`}
            onClick={() => setTagFilter(null)}
            title="All tags"
          >
            All
          </button>
          {TAG_COLORS.map(c => (
            <button
              key={c}
              className={`queue-tag-btn queue-tag-btn--dot ${tagFilter === c ? 'queue-tag-btn--active' : ''}`}
              onClick={() => setTagFilter(tagFilter === c ? null : c)}
              title={c}
            >
              <span className={`queue-tag-dot queue-tag-dot--${c}`} />
            </button>
          ))}
        </div>
      </div>

      {/* Group filter chips — only groups that have patients */}
      {activeGroups.length > 0 && (
        <div className="group-filter-row">
          <button
            className={`group-filter-chip ${!activeGroupFilter ? 'group-filter-chip--active' : ''}`}
            onClick={() => onFilterChange(null)}
          >
            All
          </button>
          {activeGroups.map(g => (
            <button
              key={g}
              className={`group-filter-chip ${activeGroupFilter === g ? 'group-filter-chip--active' : ''}`}
              onClick={() => onFilterChange(activeGroupFilter === g ? null : g)}
            >
              {g}
            </button>
          ))}
        </div>
      )}

      {display.length === 0 && (
        <div className="queue-empty glass-panel">
          <Users size={48} strokeWidth={1} />
          <p className="queue-empty-title">
            {(activeGroupFilter || tagFilter) ? 'No patients match this filter' : 'No patients in queue'}
          </p>
          <p className="queue-empty-sub">
            {(activeGroupFilter || tagFilter) ? 'Try a different filter' : 'Use the + button to add a patient'}
          </p>
        </div>
      )}

      {display.length > 0 && isDndEnabled ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={display.map(p => p.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="patient-queue">{cards}</div>
          </SortableContext>
        </DndContext>
      ) : display.length > 0 ? (
        <div className="patient-queue">{cards}</div>
      ) : null}
    </div>
  )
}
