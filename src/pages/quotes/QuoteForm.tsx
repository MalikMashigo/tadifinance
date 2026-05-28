import { useState, useEffect } from 'react'
import { Plus, X } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Field, Input, Textarea, Select } from '../../components/ui/Field'
import { supabase } from '../../lib/supabase'
import { createQuote, createQuoteItems, type QuoteInsert } from '../../lib/quotes'
import { formatCurrency } from '../../utils/format'
import type { QuoteWithClient } from '../../lib/quotes'

interface ClientOption { id: string; full_name: string }

interface ItemRow {
  description: string
  quantity: string
  unitPrice: string
  notes: string
}

function newRow(): ItemRow {
  return { description: '', quantity: '1', unitPrice: '', notes: '' }
}

function lineTotal(row: ItemRow): number {
  const qty   = parseFloat(row.quantity)
  const price = parseFloat(row.unitPrice)
  if (isNaN(qty) || isNaN(price)) return 0
  return Math.round(qty * price * 100) / 100
}

const today = () => new Date().toISOString().slice(0, 10)

interface QuoteFormProps {
  open: boolean
  onClose: () => void
  // For new quotes: called with the new quote id so the page can navigate
  onCreated?: (quoteId: string) => void
  // For editing existing quotes: called with updated data
  onSubmit?: (data: QuoteInsert) => Promise<unknown>
  initial?: QuoteWithClient
}

export function QuoteForm({ open, onClose, onCreated, onSubmit, initial }: QuoteFormProps) {
  const [clientId, setClientId]   = useState(initial?.client_id ?? '')
  const [issueDate, setIssueDate] = useState(initial?.issue_date ?? today())
  const [notes, setNotes]         = useState(initial?.notes ?? '')
  const [clients, setClients]     = useState<ClientOption[]>([])
  const [rows, setRows]           = useState<ItemRow[]>([newRow()])
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    supabase
      .from('clients')
      .select('id, full_name')
      .order('full_name')
      .then(({ data }) => setClients((data ?? []) as ClientOption[]))
  }, [open])

  const subtotal = rows.reduce((s, r) => s + lineTotal(r), 0)

  function addRow() { setRows((p) => [...p, newRow()]) }
  function removeRow(idx: number) { setRows((p) => p.filter((_, i) => i !== idx)) }
  function update<K extends keyof ItemRow>(idx: number, field: K, value: ItemRow[K]) {
    setRows((p) => p.map((r, i) => i === idx ? { ...r, [field]: value } : r))
  }

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    if (!clientId) { setError('Please select a client.'); return }
    setSaving(true)
    setError(null)

    try {
      if (initial && onSubmit) {
        // Edit mode — just update metadata
        await onSubmit({ client_id: clientId, issue_date: issueDate, notes: notes.trim() || null })
        onClose()
        return
      }

      // New quote — validate items
      for (const row of rows) {
        if (!row.description.trim()) { setError('Every item needs a description.'); setSaving(false); return }
        const qty   = parseFloat(row.quantity)
        const price = parseFloat(row.unitPrice)
        if (isNaN(qty) || qty <= 0)    { setError('Enter a valid quantity for all items.'); setSaving(false); return }
        if (isNaN(price) || price < 0) { setError('Enter a valid price for all items.'); setSaving(false); return }
      }

      const quote = await createQuote({ client_id: clientId, issue_date: issueDate, notes: notes.trim() || null })

      await createQuoteItems(rows.map((r) => ({
        quote_id:    quote.id,
        description: r.description.trim(),
        quantity:    parseFloat(r.quantity),
        unit_price:  parseFloat(r.unitPrice),
        notes:       r.notes.trim() || null,
      })))

      onClose()
      onCreated?.(quote.id)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const isEdit = !!initial

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit quote' : 'New quote'} width="md">
      <form onSubmit={handleSubmit} className="form">
        <Field label="Client" required>
          <Select value={clientId} onChange={(e) => setClientId(e.target.value)} required>
            <option value="">Select client…</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.full_name}</option>
            ))}
          </Select>
        </Field>

        <Field label="Quote date" required>
          <Input
            type="date"
            value={issueDate}
            onChange={(e) => setIssueDate(e.target.value)}
            required
          />
        </Field>

        {/* Items — only shown when creating a new quote */}
        {!isEdit && (
          <div className="expense-items-section">
            <div className="expense-items-section__head">
              <span className="expense-items-section__label">Items</span>
              <button type="button" className="btn btn--secondary btn--sm" onClick={addRow}>
                <Plus size={13} /> Add item
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
                      type="number" min={0.01} step="any"
                      value={row.quantity}
                      onChange={(e) => update(idx, 'quantity', e.target.value)}
                      required
                    />
                  </Field>
                  <Field label="Unit price (R)" required>
                    <Input
                      type="number" min={0} step="0.01"
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

            {subtotal > 0 && (
              <div className="expense-log-total">
                <span>Quote subtotal (excl. VAT)</span>
                <strong>{formatCurrency(subtotal)}</strong>
              </div>
            )}
          </div>
        )}

        <Field label="Notes">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional information for the client…"
          />
        </Field>

        {error && <p className="form__error">{error}</p>}

        <div className="form__actions">
          <button type="button" className="btn btn--secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn--primary" disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create quote'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
