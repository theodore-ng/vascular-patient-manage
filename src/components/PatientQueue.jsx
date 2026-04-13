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
  groups, onAddGroup, activeGroupFilter, onFilterChange,
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  )

  const visiblePatients = activeGroupFilter
    ? patients.filter(p => p.group === activeGroupFilter)
    : patients

  function handleDragEnd(event) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = patients.findIndex(p => p.id === active.id)
    const newIndex = patients.findIndex(p => p.id === over.id)
    onReorder(arrayMove(patients, oldIndex, newIndex))
  }

  const cards = visiblePatients.map((patient, index) => (
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
      groups={groups}
      onAddGroup={onAddGroup}
    />
  ))

  return (
    <div className="patient-queue-wrapper">
      {/* Group filter chips */}
      {groups.length > 0 && (
        <div className="group-filter-row">
          <button
            className={`group-filter-chip ${!activeGroupFilter ? 'group-filter-chip--active' : ''}`}
            onClick={() => onFilterChange(null)}
          >
            All
          </button>
          {groups.map(g => (
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

      {visiblePatients.length === 0 && (
        <div className="queue-empty glass-panel">
          <Users size={48} strokeWidth={1} />
          <p className="queue-empty-title">
            {activeGroupFilter ? `No patients in "${activeGroupFilter}"` : 'No patients in queue'}
          </p>
          <p className="queue-empty-sub">
            {activeGroupFilter ? 'Select a different group or clear the filter' : 'Use the mic above to add a patient via voice'}
          </p>
        </div>
      )}

      {/* Only enable DnD when not filtering */}
      {visiblePatients.length > 0 && !activeGroupFilter && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={visiblePatients.map(p => p.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="patient-queue">{cards}</div>
          </SortableContext>
        </DndContext>
      )}

      {visiblePatients.length > 0 && activeGroupFilter && (
        <div className="patient-queue">{cards}</div>
      )}
    </div>
  )
}
