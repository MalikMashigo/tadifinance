import { useState, useEffect } from 'react'
import { Modal } from '../../components/ui/Modal'
import { Field, Input, Textarea, Select } from '../../components/ui/Field'
import { fetchClients } from '../../lib/clients'
import { fetchClientOrders, fetchOrderItems } from '../../lib/invoices'
import { calcVat, calcTotal } from '../../utils/format'
import type { Client } from '../../types/database'
import type { InvoiceInsert } from '../../lib/invoices'

interface InvoiceFormProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: InvoiceInsert) => Promise<unknown>
  preselectedOrderId?: string
  preselectedClientId?: string
}

type ClientOrder = { id: string; order_number: string; collection_name: string | null; total_amount: number }

function today() { return new Date().toISOString().split('T')[0] }
function daysFromNow(n: number) {
  const d = new Date(); d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

export function InvoiceForm({ open, onClose, onSubmit, preselectedOrderId, preselectedClientId }: InvoiceFormProps) {
  const [clients, setClients] = useState<Client[]>([])
  const [orders, setOrders] = useState<ClientOrder[]>([])
  const [clientId, setClientId] = useState(preselectedClientId ?? '')
  const [orderId, setOrderId] = useState(preselectedOrderId ?? '')
  const [issueDate, setIssueDate] = useState(today())
  const [dueDate, setDueDate] = useState(daysFromNow(14))
  const [subtotal, setSubtotal] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) fetchClients().then(setClients).catch(() => {})
  }, [open])

  useEffect(() => {
    if (!clientId) { setOrders([]); setOrderId(''); return }
    fetchClientOrders(clientId).then(setOrders).catch(() => {})
  }, [clientId])

  useEffect(() => {
    if (!orderId) return
    fetchOrderItems(orderId).then((items) => {
      const sub = items.reduce((s, i) => s + i.line_total, 0)
      setSubtotal(sub > 0 ? sub.toFixed(2) : '')
    }).catch(() => {})

    const linked = orders.find((o) => o.id === orderId)
    if (linked && linked.total_amount > 0) {
      setSubtotal(linked.total_amount.toFixed(2))
    }
  }, [orderId, orders])

  const sub = parseFloat(subtotal) || 0
  const vat = calcVat(sub)
  const total = calcTotal(sub)

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    if (!clientId) { setError('Please select a client.'); return }
    if (!sub) { setError('Please enter a subtotal amount.'); return }
    setSaving(true)
    setError(null)
    try {
      await onSubmit({
        client_id: clientId,
        order_id: orderId || null,
        status: 'draft',
        issue_date: issueDate,
        due_date: dueDate,
        subtotal: sub,
        vat_amount: vat,
        total_amount: total,
        balance_due: total,
        notes: notes.trim() || null,
      })
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
              <option value="">No order — standalone invoice</option>
              {orders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.order_number}{o.collection_name ? ` — ${o.collection_name}` : ''}
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

        <Field label="Subtotal (ZAR, excl. VAT)" required>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={subtotal}
            onChange={(e) => setSubtotal(e.target.value)}
            placeholder="0.00"
            required
          />
        </Field>

        {sub > 0 && (
          <div className="invoice-preview-totals">
            <div className="invoice-preview-totals__row">
              <span>Subtotal</span><span>R {sub.toFixed(2)}</span>
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
