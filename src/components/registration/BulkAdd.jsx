import { useState } from 'react'

export default function BulkAdd({ onBulkAdd }) {
  const [isOpen, setIsOpen] = useState(false)
  const [text, setText] = useState('')

  const names = text
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)

  const handleAdd = () => {
    if (names.length === 0) return
    onBulkAdd(names)
    setText('')
    setIsOpen(false)
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="text-sm text-gold-mid hover:text-gold-primary transition-colors"
      >
        Bulk Add
      </button>
    )
  }

  return (
    <div className="space-y-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste player names, one per line"
        rows={6}
        className="w-full bg-bg-surface border border-gold-dim rounded px-3 py-2 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-gold-primary resize-y"
        autoFocus
      />
      <div className="flex gap-2 items-center">
        <button
          onClick={handleAdd}
          disabled={names.length === 0}
          className="px-4 py-2 bg-gold-primary text-bg-base font-semibold rounded hover:bg-gold-bright disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Add {names.length} Player{names.length !== 1 ? 's' : ''}
        </button>
        <button
          onClick={() => { setIsOpen(false); setText('') }}
          className="px-4 py-2 text-text-secondary hover:text-text-primary transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
