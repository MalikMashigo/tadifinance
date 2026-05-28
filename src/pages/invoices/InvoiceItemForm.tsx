import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Field, Input } from '../../components/ui/Field'
import { formatCurrency } from '../../utils/format'
import type { InvoiceItemInsert } from '../../lib/invoices'

interface ItemDraft {
  description: string
  quantity: string
  unitPrice: string
  notes: string
}

function newRow(): ItemDraft {
  return { description: '', quantity: '1', unitPrice: '', notes: '' }
}

function lineTotal(item: ItemDraft): number {
  const qty   = parseFloat(item.quantity)
  const price = parseFloat(item.unitPrice)
  if (isNaN(qty) || isNaN(price)) return 0
  return Math.round(qty * price * 100) / 100
}

interface Props {
  open: boolean
  invoiceId: string
  onClose: () => void
  onSubmit: (items: InvoiceItemInsert[]) => Promise<unknown>
}

export function InvoiceItemForm({ open, invoiceId, onClose, onSubmit }: Props) {
  const [rows, setRows]     = useState<ItemDraft[]>([newRow()])
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  function addRow() { setRows((prev) => [...prev, newRow()]) }

  function removeRow(idx: number) { setRows((prev) => prev.filter((_, i) => i !== idx)) }

  function update<K extends keyof ItemDraft>(idx: number, field: K, value: ItemDraft[K]) {
    setRows((prev) => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r))
  }

  const runningTotal = rows.reduce((s, r) => s + lineTotal(r), 0)

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    for (const row of rows) {
      if (!row.description.trim()) { setError('Every item needs a description.'); return }
      const qty   = parseFloat(row.quantity)
      const price = parseFloat(row.unitPrice)
      if (isNaN(qty) || qty <= 0)    { setError('Enter a valid quantity for all items.'); return }
      if (isNaN(price) || price < 0) { setError('Enter a valid price for all items.'); return }
    }
    setSaving(true)
    setError(null)
    try {
      await onSubmit(rows.map((r) => ({
        invoice_id:  invoiceId,
        description: r.description.trim(),
        quantity:    parseFloat(r.quantity),
        unit_price:  parseFloat(r.unitPrice),
        notes:       r.notes.trim() || null,
      })))
      setRows([newRow()])
      onClose()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add items" width="md">
      <form onSubmit={handleSubmit} className="form">
        <div className="expense-items-section">
          <div className="expense-items-section__head">
            <span className="expense-items-section__label">Items</span>
            <button type="button" className="btn btn--secondary btn--sm" onClick={addRow}>
              <Plus size={13} />
              Add item
            </button>
          </div>

          {rows.map((row, idx) => (
            <div key={idx} className="expense-item-block">
              <div className="expense-item-block__header">
                <span className="expense-item-block__num">Item {idx + 1}</span>
                {rows.length > 1 && (
                  <button
                    type="button"
                    className="expense-item-block__remove"
                    onClick={() => removeRow(idx)}
                    aria-label="Remove item"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <Field label="Description" required>
                <Input
                  value={row.description}
                  onChange={(e) => update(idx, 'description', e.target.value)}
                  placeholder="e.g. Custom tailored jacket"
                  required
                  autoFocus={idx === 0}
                />
              </Field>

              <div className="form__grid form__grid--3">
                <Field label="Quantity" required>
                  <Input
                    type="number"
                    min={0.01}
                    step="any"
                    value={row.quantity}
                    onChange={(e) => update(idx, 'quantity', e.target.value)}
                    required
                  />
                </Field>
                <Field label="Unit price (R)" required>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={row.unitPrice}
                    onChange={(e) => update(idx, 'unitPrice', e.target.value)}
                    placeholder="0.00"
                    required
                  />
                </Field>
                <Field label="Line total">
                  <div className="expense-line-total">
                    {lineTotal(row) > 0 ? formatCurrency(lineTotal(row)) : '—'}
                  </div>
                </Field>
              </div>

              <Field label="Notes (optional)">
                <Input
                  value={row.notes}
                  onChange={(e) => update(idx, 'notes', e.target.value)}
                  placeholder="Fabric, colour, specs…"
                />
              </Field>
            </div>
          ))}
        </div>

        <div className="expense-log-total">
          <span>Invoice total (excl. VAT)</span>
          <strong>{formatCurrency(runningTotal)}</strong>
        </div>

        {error && <p className="form__error">{error}</p>}

        <div className="form__actions">
          <button type="button" className="btn btn--secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn--primary" disabled={saving}>
            {saving ? 'Saving…' : `Add ${rows.length} item${rows.length > 1 ? 's' : ''}`}
          </button>
        </div>
      </form>
    </Modal>
  )
}
