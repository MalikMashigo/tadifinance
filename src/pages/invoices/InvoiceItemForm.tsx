import { useState } from 'react'
import { Modal } from '../../components/ui/Modal'
import { Field, Input, Textarea } from '../../components/ui/Field'
import type { InvoiceItemInsert } from '../../lib/invoices'

interface Props {
  open: boolean
  invoiceId: string
  onClose: () => void
  onSubmit: (data: InvoiceItemInsert) => Promise<unknown>
}

export function InvoiceItemForm({ open, invoiceId, onClose, onSubmit }: Props) {
  const [description, setDescription] = useState('')
  const [quantity, setQuantity]       = useState('1')
  const [unitPrice, setUnitPrice]     = useState('')
  const [notes, setNotes]             = useState('')
  const [saving, setSaving]           = useState(false)
  const [error, setError]             = useState<string | null>(null)

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    const qty   = parseFloat(quantity)
    const price = parseFloat(unitPrice)
    if (!description.trim() || isNaN(qty) || qty <= 0 || isNaN(price) || price < 0) return
    setSaving(true)
    setError(null)
    try {
      await onSubmit({
        invoice_id:  invoiceId,
        description: description.trim(),
        quantity:    qty,
        unit_price:  price,
        notes:       notes.trim() || null,
      })
      onClose()
      setDescription('')
      setQuantity('1')
      setUnitPrice('')
      setNotes('')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add item" width="sm">
      <form onSubmit={handleSubmit} className="form">
        <Field label="Description" required>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Custom tailored jacket"
            required
            autoFocus
          />
        </Field>

        <div className="form__grid form__grid--2">
          <Field label="Quantity" required>
            <Input
              type="number"
              min={0.01}
              step="0.01"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
            />
          </Field>
          <Field label="Unit price (R)" required>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              placeholder="0.00"
              required
            />
          </Field>
        </div>

        <Field label="Notes">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Fabric, colour, specifications…"
          />
        </Field>

        {error && <p className="form__error">{error}</p>}

        <div className="form__actions">
          <button type="button" className="btn btn--secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn--primary" disabled={saving}>
            {saving ? 'Adding…' : 'Add item'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
