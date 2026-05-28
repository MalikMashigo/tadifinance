import { useState, useEffect } from 'react'
import { Plus, X } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Field, Input, Textarea, Select } from '../../components/ui/Field'
import { fetchClients } from '../../lib/clients'
import { fetchClientOrders, createInvoice, createInvoiceItems } from '../../lib/invoices'
import { calcVat, calcTotal, formatCurrency } from '../../utils/format'
import type { Client } from '../../types/database'

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

type ClientOrder = { id: string; order_number: string; collection_name: string | null; total_amount: number }

function today() { return new Date().toISOString().split('T')[0] }
function daysFromNow(n: number) {
  const d = new Date(); d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

interface Props {
  open: boolean
  onClose: () => void
  onSaved: () => void
  preselectedOrderId?: string
  preselectedClientId?: string
}

export function InvoiceForm({ open, onClose, onSaved, preselectedOrderId, preselectedClientId }: Props) {
  const [clients, setClients] = useState<Client[]>([])
  const [orders, setOrders]   = useState<ClientOrder[]>([])
  const [clientId, setClientId] = useState(preselectedClientId ?? '')
  const [orderId, setOrderId]   = useState(preselectedOrderId ?? '')
  const [issueDate, setIssueDate] = useState(today())
  const [dueDate, setDueDate]     = useState(daysFromNow(14))
  const [notes, setNotes]         = useState('')
  const [rows, setRows]           = useState<ItemRow[]>([newRow()])
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState<string | null>(null)

  useEffect(() => {
    if (open) fetchClients().then(setClients).catch(() => {})
  }, [open])

  useEffect(() => {
    if (!clientId) { setOrders([]); setOrderId(''); return }
    fetchClientOrders(clientId).then(setOrders).catch(() => {})
  }, [clientId])

  const subtotal = rows.reduce((s, r) => s + lineTotal(r), 0)
  const vat   = calcVat(subtotal)
  const total = calcTotal(subtotal)

  function addRow() { setRows((p) => [...p, newRow()]) }
  function removeRow(idx: number) { setRows((p) => p.filter((_, i) => i !== idx)) }
  function update<K extends keyof ItemRow>(idx: number, field: K, value: ItemRow[K]) {
    setRows((p) => p.map((r, i) => i === idx ? { ...r, [field]: value } : r))
  }

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    if (!clientId) { setError('Please select a client.'); return }

    for (const row of rows) {
      if (!row.description.trim()) { setError('Every item needs a description.'); return }
      const qty   = parseFloat(row.quantity)
      const price = parseFloat(row.unitPrice)
      if (isNaN(qty) || qty <= 0)    { setError('Enter a valid quantity for all items.'); return }
      if (isNaN(price) || price < 0) { setError('Enter a valid price for all items.'); return }
    }

    if (subtotal <= 0) { setError('Add at least one item with a price.'); return }

    setSaving(true)
    setError(null)
    try {
      const invoice = await createInvoice({
        client_id:    clientId,
        order_id:     orderId || null,
        status:       'draft',
        issue_date:   issueDate,
        due_date:     dueDate,
        subtotal,
        vat_amount:   vat,
        total_amount: total,
        balance_due:  total,
        notes:        notes.trim() || null,
      })

      await createInvoiceItems(rows.map((r) => ({
        invoice_id:  invoice.id,
        description: r.description.trim(),
        quantity:    parseFloat(r.quantity),
        unit_price:  parseFloat(r.unitPrice),
        notes:       r.notes.trim() || null,
      })))

      setClientId(''); setOrderId(''); setIssueDate(today()); setDueDate(daysFromNow(14))
      setNotes(''); setRows([newRow()])
      onSaved()
      onClose()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New invoice" width="md">
      <form onSubmit={handleSubmit} className="form">

        <Field label="Client" required>
          <Select value={clientId} onChange={(e) => setClientId(e.target.value)} required>
            <option value="">Select a client…</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
          </Select>
        </Field>

        {clientId && (
          <Field label="Link to order (optional)">
            <Select value={orderId} onChange={(e) => setOrderId(e.target.value)}>
              <option value="">No order: standalone invoice</option>
              {orders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.order_number}{o.collection_name ? `: ${o.collection_name}` : ''}
                </option>
              ))}
            </Select>
          </Field>
        )}

        <div className="form__grid form__grid--2">
          <Field label="Issue date">
            <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} required />
          </Field>
          <Field label="Due date">
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
          </Field>
        </div>

        {/* Items */}
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
        </div>

        {subtotal > 0 && (
          <div className="invoice-preview-totals">
            <div className="invoice-preview-totals__row">
              <span>Subtotal</span><span>R {subtotal.toFixed(2)}</span>
            </div>
            <div className="invoice-preview-totals__row">
              <span>VAT (15%)</span><span>R {vat.toFixed(2)}</span>
            </div>
            <div className="invoice-preview-totals__row invoice-preview-totals__row--total">
              <span>Total</span><span>R {total.toFixed(2)}</span>
            </div>
          </div>
        )}

        <Field label="Notes">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Payment terms, special instructions…"
          />
        </Field>

        {error && <p className="form__error">{error}</p>}

        <div className="form__actions">
          <button type="button" className="btn btn--secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn--primary" disabled={saving}>
            {saving ? 'Creating…' : 'Create invoice'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
