import { useState } from 'react'
import Modal from './Modal'

export default function ConfirmDialog({
  isOpen,
  message,
  confirmLabel = 'Confirm',
  onConfirm,
  onCancel,
  requireTyping = null,
}) {
  const [typedValue, setTypedValue] = useState('')

  const canConfirm = requireTyping ? typedValue === requireTyping : true

  const handleConfirm = () => {
    if (!canConfirm) return
    setTypedValue('')
    onConfirm()
  }

  const handleCancel = () => {
    setTypedValue('')
    onCancel()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleCancel}>
      <p className="text-text-secondary mb-4">{message}</p>
      {requireTyping && (
        <input
          type="text"
          value={typedValue}
          onChange={(e) => setTypedValue(e.target.value)}
          placeholder={`Type ${requireTyping} to confirm`}
          className="w-full bg-bg-base border border-gold-dim rounded px-3 py-2 text-text-primary mb-4 focus:outline-none focus:border-gold-primary"
          autoFocus
        />
      )}
      <div className="flex justify-end gap-3">
        <button
          onClick={handleCancel}
          className="px-4 py-2 text-text-secondary hover:text-text-primary rounded border border-gold-dim hover:border-gold-muted transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleConfirm}
          disabled={!canConfirm}
          className="px-4 py-2 bg-gold-primary text-bg-base font-semibold rounded hover:bg-gold-bright disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
