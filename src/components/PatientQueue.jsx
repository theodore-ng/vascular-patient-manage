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
import { Users, SlidersHorizontal, X } from 'lucide-react'
import PatientCard from './PatientCard'
import { VASCULAR_GROUPS } from '../services/groq'

const SORT_OPTIONS = [
  { key: 'queue',     label: 'Queue order'  },
  { key: 'name-asc',  label: 'Name A → Z'  },
  { key: 'name-desc', label: 'Name Z → A'  },
  { key: 'age-asc',   label: 'Age youngest' },
  { key: 'age-desc',  label: 'Age oldest'   },
]

const TAG_COLORS = ['red', 'yellow', 'green']
const TAG_LABELS  = { red: 'Red', yellow: 'Yellow', green: 'Green' }

export default function PatientQueue({
  patients, selectedId, onSelect, onReorder, onDischarge, onDelete,
  onUpdate, onEdit, onTag, onSetGroup, onNote,
  sortBy, onSortChange, tagFilter, onTagFilterChange,
  activeGroupFilter, onGroupFilterChange,
}) {
  const [filtersOpen, setFiltersOpen] = useState(false)
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

  const activeGroups = VASCULAR_GROUPS.filter(g => patients.some(p => p.group === g))
  const hasActiveFilter = sortBy !== 'queue' || tagFilter || activeGroupFilter

  return (
    <div className="patient-queue-wrapper">
      {/* Filter toolbar */}
      <div className="queue-filter-bar">
        <button
          className={`queue-filter-toggle ${filtersOpen ? 'queue-filter-toggle--open' : ''} ${hasActiveFilter ? 'queue-filter-toggle--active' : ''}`}
          onClick={() => setFiltersOpen(v => !v)}
          title="Filters"
        >
          <SlidersHorizontal size={15} />
          <span>Filters</span>
          {hasActiveFilter && <span className="queue-filter-dot" />}
        </button>
        {hasActiveFilter && (
          <button
            className="queue-filter-reset"
            onClick={() => { onSortChange('queue'); onTagFilterChange(null); onGroupFilterChange(null) }}
          >
            <X size={12} /> Reset
          </button>
        )}
      </div>

      {/* Expandable filter panel */}
      {filtersOpen && (
        <div className="queue-filter-panel">
          <div className="sidebar-filter-section">
            <span className="sidebar-filter-label">Sort by</span>
            <div className="sidebar-filter-chips">
              {SORT_OPTIONS.map(opt => (
                <button
                  key={opt.key}
                  className={`sidebar-filter-chip ${sortBy === opt.key ? 'sidebar-filter-chip--active' : ''}`}
                  onClick={() => onSortChange(opt.key)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="sidebar-filter-section">
            <span className="sidebar-filter-label">Tag</span>
            <div className="sidebar-filter-chips">
              <button
                className={`sidebar-filter-chip ${!tagFilter ? 'sidebar-filter-chip--active' : ''}`}
                onClick={() => onTagFilterChange(null)}
              >All</button>
              {TAG_COLORS.map(c => (
                <button
                  key={c}
                  className={`sidebar-filter-chip sidebar-filter-chip--tag ${tagFilter === c ? 'sidebar-filter-chip--active' : ''}`}
                  onClick={() => onTagFilterChange(tagFilter === c ? null : c)}
                >
                  <span className={`sf-tag-dot sf-tag-dot--${c}`} />
                  {TAG_LABELS[c]}
                </button>
              ))}
            </div>
          </div>

          {activeGroups.length > 0 && (
            <div className="sidebar-filter-section">
              <span className="sidebar-filter-label">Group</span>
              <div className="sidebar-filter-chips">
                <button
                  className={`sidebar-filter-chip ${!activeGroupFilter ? 'sidebar-filter-chip--active' : ''}`}
                  onClick={() => onGroupFilterChange(null)}
                >All</button>
                {activeGroups.map(g => (
                  <button
                    key={g}
                    className={`sidebar-filter-chip ${activeGroupFilter === g ? 'sidebar-filter-chip--active' : ''}`}
                    onClick={() => onGroupFilterChange(activeGroupFilter === g ? null : g)}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          )}
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
