import { useState } from 'react'

export default function PlayerInput({ onAdd, disabled }) {
  const [name, setName] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed || disabled) return
    onAdd(trimmed)
    setName('')
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Enter player name"
        disabled={disabled}
        className="flex-1 bg-bg-surface border border-gold-dim rounded px-3 py-2 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-gold-primary disabled:opacity-40"
        autoFocus
      />
      <button
        type="submit"
        disabled={disabled || !name.trim()}
        className="px-4 py-2 bg-gold-primary text-bg-base font-semibold rounded hover:bg-gold-bright disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        Add
      </button>
    </form>
  )
}
