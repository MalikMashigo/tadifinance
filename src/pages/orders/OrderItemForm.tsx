import { useState } from 'react'
import { Modal } from '../../components/ui/Modal'
import { Field, Input, Textarea } from '../../components/ui/Field'
import type { OrderItemInsert } from '../../lib/orders'
import { formatCurrency } from '../../utils/format'

interface OrderItemFormProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: Omit<OrderItemInsert, 'order_id'>) => Promise<unknown>
}

const empty = {
  garment_name: '', garment_type: '', fabric: '',
  colour: '', size: '', quantity: '1', unit_price: '', notes: '',
}

export function OrderItemForm({ open, onClose, onSubmit }: OrderItemFormProps) {
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set(key: keyof typeof empty, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const qty = parseInt(form.quantity) || 1
  const price = parseFloat(form.unit_price) || 0
  const lineTotal = qty * price

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    if (!form.garment_name.trim()) return
    setSaving(true)
    setError(null)
    try {
      await onSubmit({
        garment_name: form.garment_name.trim(),
        garment_type: form.garment_type.trim() || null,
        fabric: form.fabric.trim() || null,
        colour: form.colour.trim() || null,
        size: form.size.trim() || null,
        quantity: qty,
        unit_price: price,
        line_total: lineTotal,
        notes: form.notes.trim() || null,
      })
      onClose()
      setForm(empty)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add garment" width="md">
      <form onSubmit={handleSubmit} className="form">

        <div className="form__grid form__grid--2">
          <Field label="Garment name" required>
            <Input
              value={form.garment_name}
              onChange={(e) => set('garment_name', e.target.value)}
              placeholder="e.g. Cape dress"
              required
              autoFocus
            />
          </Field>
          <Field label="Type">
            <Input
              value={form.garment_type}
              onChange={(e) => set('garment_type', e.target.value)}
              placeholder="dress, coat, skirt…"
            />
          </Field>
          <Field label="Fabric">
            <Input
              value={form.fabric}
              onChange={(e) => set('fabric', e.target.value)}
              placeholder="e.g. Duchess satin"
            />
          </Field>
          <Field label="Colour">
            <Input
              value={form.colour}
              onChange={(e) => set('colour', e.target.value)}
              placeholder="e.g. Ivory"
            />
          </Field>
          <Field label="Size">
            <Input
              value={form.size}
              onChange={(e) => set('size', e.target.value)}
              placeholder="e.g. Custom"
            />
          </Field>
          <Field label="Quantity">
            <Input
              type="number"
              min="1"
              value={form.quantity}
              onChange={(e) => set('quantity', e.target.value)}
            />
          </Field>
          <Field label="Unit price (ZAR)">
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.unit_price}
              onChange={(e) => set('unit_price', e.target.value)}
              placeholder="0.00"
            />
          </Field>
          <div className="item-line-total">
            <span className="item-line-total__label">Line total</span>
            <span className="item-line-total__value">{formatCurrency(lineTotal)}</span>
          </div>
        </div>

        <Field label="Notes">
          <Textarea
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="Embroidery details, lining notes, alterations…"
          />
        </Field>

        {error && <p className="form__error">{error}</p>}

        <div className="form__actions">
          <button type="button" className="btn btn--secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn--primary" disabled={saving || !form.garment_name.trim()}>
            {saving ? 'Adding…' : 'Add garment'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
