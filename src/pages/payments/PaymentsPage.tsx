import { useState, useEffect } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { Modal } from '../../components/ui/Modal'
import { Field, Input, Select } from '../../components/ui/Field'
import {
  fetchAllPayments, fetchInvoices, recordPayment,
  type PaymentWithInvoice, type InvoiceWithClient,
} from '../../lib/invoices'
import { formatCurrency, formatDate } from '../../utils/format'
import type { PaymentMethod } from '../../types/database'

interface OutletCtx { openSidebar: () => void }

const METHOD_COLOURS: Record<string, string> = {
  EFT:     '#2a5a8c',
  cash:    '#4a7c59',
  card:    '#7a2020',
  PayShap: '#b57d2a',
}

function today() { return new Date().toISOString().split('T')[0] }

export function PaymentsPage() {
  const { openSidebar } = useOutletContext<OutletCtx>()
  const navigate = useNavigate()

  const [payments, setPayments]     = useState<PaymentWithInvoice[]>([])
  const [invoices, setInvoices]     = useState<InvoiceWithClient[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)
  const [modalOpen, setModalOpen]   = useState(false)

  // Form state
  const [invoiceId, setInvoiceId]   = useState('')
  const [amount, setAmount]         = useState('')
  const [method, setMethod]         = useState<PaymentMethod>('EFT')
  const [reference, setReference]   = useState('')
  const [date, setDate]             = useState(today())
  const [saving, setSaving]         = useState(false)
  const [formError, setFormError]   = useState<string | null>(null)

  useEffect(() => {
    Promise.all([fetchAllPayments(), fetchInvoices()])
      .then(([pays, invs]) => {
        setPayments(pays)
        setInvoices(invs.filter((i) => i.status !== 'paid'))
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false))
  }, [])

  const selectedInvoice = invoices.find((i) => i.id === invoiceId)

  function openModal() {
    setInvoiceId('')
    setAmount('')
    setMethod('EFT')
    setReference('')
    setDate(today())
    setFormError(null)
    setModalOpen(true)
  }

  // Pre-fill amount when invoice is selected
  function handleInvoiceChange(id: string) {
    setInvoiceId(id)
    const inv = invoices.find((i) => i.id === id)
    if (inv) setAmount(inv.balance_due > 0 ? inv.balance_due.toFixed(2) : inv.total_amount.toFixed(2))
    else setAmount('')
  }

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    if (!invoiceId) { setFormError('Select an invoice.'); return }
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) { setFormError('Enter a valid amount.'); return }
    setSaving(true)
    setFormError(null)
    try {
      await recordPayment({
        invoice_id:     invoiceId,
        amount:         amt,
        payment_method: method,
        reference:      reference.trim() || null,
        payment_date:   date,
        notes:          null,
      })
      // Refresh payments list
      const [pays, invs] = await Promise.all([fetchAllPayments(), fetchInvoices()])
      setPayments(pays)
      setInvoices(invs.filter((i) => i.status !== 'paid'))
      setModalOpen(false)
    } catch (e) {
      setFormError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const total = payments.reduce((s, p) => s + p.amount, 0)

  return (
    <div className="page">
      <Header
        title="Payments"
        onMenuClick={openSidebar}
        actions={
          <button className="btn btn--primary" onClick={openModal}>
            <Plus size={15} /> Record payment
          </button>
        }
      />

      <div className="page__content">
        {loading && <p className="state-msg">Loading payments…</p>}
        {error   && <p className="state-msg state-msg--error">{error}</p>}

        {!loading && !error && payments.length === 0 && (
          <div className="empty-state">
            <p>No payments recorded yet.</p>
          </div>
        )}

        {!loading && !error && payments.length > 0 && (
          <>
            <div className="outstanding-banner" style={{ marginBottom: 'var(--space-5)', borderColor: 'var(--colour-green)', background: 'var(--colour-green-bg)' }}>
              <span className="outstanding-banner__label" style={{ color: 'var(--colour-green)' }}>Total received</span>
              <span className="outstanding-banner__amount" style={{ color: 'var(--colour-green)' }}>
                {formatCurrency(total)}
              </span>
            </div>

            <div className="payments-all-list">
              {payments.map((p) => (
                <div
                  key={p.id}
                  className="payments-all-row"
                  onClick={() => navigate(`/invoices/${p.invoice_id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && navigate(`/invoices/${p.invoice_id}`)}
                >
                  <div className="payments-all-row__left">
                    <span
                      className="payments-all-row__method"
                      style={{ background: METHOD_COLOURS[p.payment_method] ?? 'var(--colour-ink)' }}
                    >
                      {p.payment_method}
                    </span>
                    <div className="payments-all-row__body">
                      <span className="payments-all-row__client">
                        {p.invoices.clients.full_name}
                      </span>
                      <span className="payments-all-row__meta">
                        {p.invoices.invoice_number} · {formatDate(p.payment_date)}
                        {p.reference && <> · Ref: {p.reference}</>}
                      </span>
                    </div>
                  </div>
                  <span className="payments-all-row__amount">{formatCurrency(p.amount)}</span>
                </div>
              ))}
            </div>

            <p className="list-count">{payments.length} {payments.length === 1 ? 'payment' : 'payments'} total</p>
          </>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Record payment" width="sm">
        <form onSubmit={handleSubmit} className="form">

          <Field label="Invoice" required>
            <Select value={invoiceId} onChange={(e) => handleInvoiceChange(e.target.value)}>
              <option value="">Select an invoice…</option>
              {invoices.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {inv.invoice_number} — {inv.clients.full_name} ({formatCurrency(inv.balance_due > 0 ? inv.balance_due : inv.total_amount)} due)
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Amount (ZAR)" required>
            <Input
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
            />
            {selectedInvoice && (
              <button
                type="button"
                className="field-hint-btn"
                onClick={() => setAmount(
                  (selectedInvoice.balance_due > 0 ? selectedInvoice.balance_due : selectedInvoice.total_amount).toFixed(2)
                )}
              >
                Use balance: {formatCurrency(selectedInvoice.balance_due > 0 ? selectedInvoice.balance_due : selectedInvoice.total_amount)}
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
            <Field label="Reference">
              <Input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="e.g. ABC123"
              />
            </Field>
          </div>

          {formError && <p className="form__error">{formError}</p>}

          <div className="form__actions">
            <button type="button" className="btn btn--secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn--primary" disabled={saving}>
              {saving ? 'Saving…' : 'Record payment'}
            </button>
          </div>

        </form>
      </Modal>
    </div>
  )
}
