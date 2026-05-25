import { useState, useEffect } from 'react'
import { Modal } from '../../components/ui/Modal'
import { Field, Input, Select } from '../../components/ui/Field'
import { fetchOrdersForPicker, CATEGORY_LABELS, type ExpenseInsert } from '../../lib/expenses'
import type { ExpenseCategory } from '../../types/database'
import type { ExpenseWithOrder } from '../../lib/expenses'

interface ExpenseFormProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: ExpenseInsert) => Promise<unknown>
  initial?: ExpenseWithOrder
  preselectedOrderId?: string
}

function today() { return new Date().toISOString().split('T')[0] }

type Order = { id: string; order_number: string; collection_name: string | null }

function toForm(e: ExpenseWithOrder) {
  return {
    category: e.category,
    description: e.description,
    supplier: e.supplier ?? '',
    amount: e.amount.toString(),
    expense_date: e.expense_date,
    order_id: e.order_id ?? '',
    receipt_url: e.receipt_url ?? '',
  }
}

const defaultForm = {
  category: 'fabric' as ExpenseCategory,
  description: '',
  supplier: '',
  amount: '',
  expense_date: today(),
  order_id: '',
  receipt_url: '',
}

export function ExpenseForm({ open, onClose, onSubmit, initial, preselectedOrderId }: ExpenseFormProps) {
  const [orders, setOrders] = useState<Order[]>([])
  const [form, setForm] = useState(initial ? toForm(initial) : { ...defaultForm, order_id: preselectedOrderId ?? '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) fetchOrdersForPicker().then(setOrders).catch(() => {})
  }, [open])

  useEffect(() => {
    if (open) setForm(initial ? toForm(initial) : { ...defaultForm, order_id: preselectedOrderId ?? '' })
  }, [open, initial, preselectedOrderId])

  function set<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    const amount = parseFloat(form.amount)
    if (!form.description.trim()) return
    if (!amount || amount <= 0) { setError('Enter a valid amount.'); return }
    setSaving(true)
    setError(null)
    try {
      await onSubmit({
        category: form.category,
        description: form.description.trim(),
        supplier: form.supplier.trim() || null,
        amount,
        expense_date: form.expense_date,
        order_id: form.order_id || null,
        receipt_url: form.receipt_url.trim() || null,
      })
      onClose()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Edit expense' : 'Log expense'} width="md">
      <form onSubmit={handleSubmit} className="form">

        <div className="form__grid form__grid--2">
          <Field label="Category" required>
            <Select
              value={form.category}
              onChange={(e) => set('category', e.target.value as ExpenseCategory)}
            >
              {(Object.entries(CATEGORY_LABELS) as [ExpenseCategory, string][]).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </Select>
          </Field>

          <Field label="Date" required>
            <Input
              type="date"
              value={form.expense_date}
              onChange={(e) => set('expense_date', e.target.value)}
              required
            />
          </Field>
        </div>

        <Field label="Description" required>
          <Input
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="e.g. 3m duchess satin, ivory"
            required
            autoFocus={!initial}
          />
        </Field>

        <div className="form__grid form__grid--2">
          <Field label="Supplier">
            <Input
              value={form.supplier}
              onChange={(e) => set('supplier', e.target.value)}
              placeholder="e.g. Fabric World Joburg"
            />
          </Field>

          <Field label="Amount (ZAR)" required>
            <Input
              type="number"
              min="0.01"
              step="0.01"
              value={form.amount}
              onChange={(e) => set('amount', e.target.value)}
              placeholder="0.00"
              required
            />
          </Field>
        </div>

        <Field label="Link to order (optional)">
          <Select value={form.order_id} onChange={(e) => set('order_id', e.target.value)}>
            <option value="">No order — general overhead</option>
            {orders.map((o) => (
              <option key={o.id} value={o.id}>
                {o.order_number}{o.collection_name ? ` — ${o.collection_name}` : ''}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Receipt URL (optional)">
          <Input
            type="url"
            value={form.receipt_url}
            onChange={(e) => set('receipt_url', e.target.value)}
            placeholder="https://… or leave blank"
          />
        </Field>

        {error && <p className="form__error">{error}</p>}

        <div className="form__actions">
          <button type="button" className="btn btn--secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn--primary" disabled={saving}>
            {saving ? 'Saving…' : initial ? 'Save changes' : 'Log expense'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
