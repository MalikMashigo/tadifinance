import { useState, useEffect } from 'react'
import { Modal } from '../../components/ui/Modal'
import { Field, Input, Textarea, Select } from '../../components/ui/Field'
import { fetchClients } from '../../lib/clients'
import type { Client, OrderType, OrderStatus } from '../../types/database'
import type { OrderInsert, OrderWithClient } from '../../lib/orders'

interface OrderFormProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: OrderInsert) => Promise<unknown>
  initial?: OrderWithClient
  preselectedClientId?: string
}

export function OrderForm({ open, onClose, onSubmit, initial, preselectedClientId }: OrderFormProps) {
  const [clients, setClients] = useState<Client[]>([])
  const [form, setForm] = useState({
    client_id:       initial?.client_id       ?? preselectedClientId ?? '',
    order_type:      initial?.order_type       ?? 'bespoke' as OrderType,
    status:          initial?.status           ?? 'consult' as OrderStatus,
    collection_name: initial?.collection_name  ?? '',
    description:     initial?.description      ?? '',
    due_date:        initial?.due_date         ?? '',
    deposit_amount:  initial?.deposit_amount?.toString() ?? '',
    notes:           initial?.notes            ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  useEffect(() => {
    if (open) fetchClients().then(setClients).catch(() => {})
  }, [open])

  function set<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    if (!form.client_id) { setError('Please select a client.'); return }
    setSaving(true)
    setError(null)
    try {
      const deposit = parseFloat(form.deposit_amount) || 0
      await onSubmit({
        client_id:       form.client_id,
        order_type:      form.order_type,
        status:          form.status,
        collection_name: form.collection_name.trim() || null,
        description:     form.description.trim() || null,
        due_date:        form.due_date || null,
        delivery_date:   initial?.delivery_date ?? null,
        total_amount:    initial?.total_amount ?? 0,
        deposit_amount:  deposit,
        balance_due:     (initial?.total_amount ?? 0) - deposit,
        notes:           form.notes.trim() || null,
      })
      onClose()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Edit order' : 'New order'} width="md">
      <form onSubmit={handleSubmit} className="form">

        <Field label="Client" required>
          <Select value={form.client_id} onChange={(e) => set('client_id', e.target.value)} required>
            <option value="">Select a client…</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.full_name}</option>
            ))}
          </Select>
        </Field>

        <div className="form__grid form__grid--2">

          <Field label="Order type">
            <Select value={form.order_type} onChange={(e) => set('order_type', e.target.value as OrderType)}>
              <option value="bespoke">Bespoke</option>
              <option value="outsourcing">Outsourcing</option>
              <option value="alteration">Alteration</option>
            </Select>
          </Field>

          <Field label="Status">
            <Select value={form.status} onChange={(e) => set('status', e.target.value as OrderStatus)}>
              <option value="consult">Consult</option>
              <option value="service">Service</option>
              <option value="complete">Complete</option>
              <option value="delivery">Delivery</option>
            </Select>
          </Field>

          {form.order_type === 'outsourcing' && (
            <Field label="Type of Look">
              <Input
                value={form.collection_name}
                onChange={(e) => set('collection_name', e.target.value)}
                placeholder="e.g. Editorial SS25"
              />
            </Field>
          )}

          <Field label="Due date">
            <Input
              type="date"
              value={form.due_date}
              onChange={(e) => set('due_date', e.target.value)}
            />
          </Field>

          <Field label="Deposit (ZAR)">
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.deposit_amount}
              onChange={(e) => set('deposit_amount', e.target.value)}
              placeholder="0.00"
            />
          </Field>

        </div>

        <Field label="Description">
          <Textarea
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Brief description of the order…"
          />
        </Field>

        <Field label="Notes">
          <Textarea
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="Fitting schedule, fabric sourcing notes…"
          />
        </Field>

        {error && <p className="form__error">{error}</p>}

        <div className="form__actions">
          <button type="button" className="btn btn--secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn--primary" disabled={saving}>
            {saving ? 'Saving…' : initial ? 'Save changes' : 'Create order'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
