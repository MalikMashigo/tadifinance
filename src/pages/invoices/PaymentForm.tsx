import { useState, useEffect } from 'react'
import { Modal } from '../../components/ui/Modal'
import { Field, Input, Textarea, Select } from '../../components/ui/Field'
import type { PaymentInsert } from '../../lib/invoices'
import type { PaymentMethod } from '../../types/database'

interface PaymentFormProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: Omit<PaymentInsert, 'invoice_id'>) => Promise<unknown>
  balanceDue: number
}

function today() { return new Date().toISOString().split('T')[0] }

export function PaymentForm({ open, onClose, onSubmit, balanceDue }: PaymentFormProps) {
  const [amount,    setAmount]    = useState('')
  const [method,    setMethod]    = useState<PaymentMethod>('EFT')
  const [reference, setReference] = useState('')
  const [date,      setDate]      = useState(today())
  const [notes,     setNotes]     = useState('')
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  // Reset the whole form each time the modal opens
  useEffect(() => {
    if (open) {
      setAmount(balanceDue > 0 ? balanceDue.toFixed(2) : '')
      setMethod('EFT')
      setReference('')
      setDate(today())
      setNotes('')
      setError(null)
      setSaving(false)
    }
  }, [open, balanceDue])

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) { setError('Enter a valid amount.'); return }
    setSaving(true)
    setError(null)
    try {
      await onSubmit({
        amount:          amt,
        payment_method:  method,
        reference:       reference.trim() || null,
        payment_date:    date,
        notes:           notes.trim() || null,
      })
      onClose()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Record payment" width="sm">
      <form onSubmit={handleSubmit} className="form">

        <Field label="Amount (ZAR)" required>
          <Input
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            required
            autoFocus
          />
          {balanceDue > 0 && (
            <button
              type="button"
              className="field-hint-btn"
              onClick={() => setAmount(balanceDue.toFixed(2))}
            >
              Use balance: R {balanceDue.toFixed(2)}
            </button>
          )}
        </Field>

        <Field label="Payment method">
          <Select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
            <option value="EFT">EFT</option>
            <option value="card">Card</option>
            <option value="cash">Cash</option>
            <option value="PayShap">PayShap</option>
          </Select>
        </Field>

        <div className="form__grid form__grid--2">
          <Field label="Date">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </Field>
          <Field label="Reference / proof no.">
            <Input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. ABC123"
            />
          </Field>
        </div>

        <Field label="Notes">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any notes about this payment…"
            rows={2}
          />
        </Field>

        {error && <p className="form__error">{error}</p>}

        <div className="form__actions">
          <button type="button" className="btn btn--secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn--primary" disabled={saving}>
            {saving ? 'Saving…' : 'Record payment'}
          </button>
        </div>

      </form>
    </Modal>
  )
}
