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

export default function PatientQueue({
  patients, selectedId, onSelect, onReorder, onDischarge, onDelete,
  onUpdate, onEdit, onTag, onSetGroup, onNote,
  sortBy, tagFilter, activeGroupFilter,
}) {
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

  return (
    <div className="patient-queue-wrapper">
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
