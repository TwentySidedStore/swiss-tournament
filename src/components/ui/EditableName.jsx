import { useState, useRef, useEffect } from 'react'

export default function EditableName({ name, onSave }) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(name)
  const inputRef = useRef(null)
  const savedRef = useRef(false)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const save = () => {
    if (savedRef.current) return
    savedRef.current = true
    const trimmed = editValue.trim()
    if (trimmed && trimmed !== name) {
      onSave(trimmed)
    }
    setIsEditing(false)
  }

  const cancel = () => {
    savedRef.current = true
    setEditValue(name)
    setIsEditing(false)
  }

  const startEditing = () => {
    savedRef.current = false
    setEditValue(name)
    setIsEditing(true)
  }

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            save()
          } else if (e.key === 'Escape') {
            e.preventDefault()
            cancel()
          }
        }}
        onBlur={save}
        aria-label="Player name"
        className="bg-bg-base border border-gold-primary rounded px-2 py-0.5 text-text-primary text-sm focus:outline-none w-full max-w-[12rem]"
      />
    )
  }

  return (
    <span className="inline-flex items-center gap-1">
      <span className="text-text-primary">{name}</span>
      <button
        onClick={startEditing}
        className="text-text-muted hover:text-text-secondary opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-0.5"
        aria-label={`Edit ${name}`}
      >
        <span aria-hidden="true" className="text-xs">✏</span>
      </button>
    </span>
  )
}
