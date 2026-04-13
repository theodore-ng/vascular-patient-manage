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

export default function PatientQueue({ patients, selectedId, onSelect, onReorder, onDischarge, onDelete, onUpdate, onEdit, onTag, onToggleTodo, onNote }) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    })
  )

  function handleDragEnd(event) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = patients.findIndex(p => p.id === active.id)
    const newIndex = patients.findIndex(p => p.id === over.id)
    const reordered = arrayMove(patients, oldIndex, newIndex)
    onReorder(reordered)
  }

  if (patients.length === 0) {
    return (
      <div className="queue-empty glass-panel">
        <Users size={48} strokeWidth={1} />
        <p className="queue-empty-title">No patients in queue</p>
        <p className="queue-empty-sub">Use the mic above to add a patient via voice</p>
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={patients.map(p => p.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="patient-queue">
          {patients.map((patient, index) => (
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
              onToggleTodo={onToggleTodo}
              onNote={onNote}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
