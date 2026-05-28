import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Download, Send, Plus, Trash2 } from 'lucide-react'
import { StatusBadge } from '../../components/ui/Badge'
import { PaymentForm } from './PaymentForm'
import { SendInvoiceModal } from './SendInvoiceModal'
import { useInvoice } from '../../hooks/useInvoices'
import { deleteInvoice, fetchOrderItems } from '../../lib/invoices'
import { generateInvoicePDF } from '../../lib/pdf'
import { formatCurrency, formatDate, VAT_RATE } from '../../utils/format'
import { INVOICE_STATUS_MAP } from './InvoicesPage'
import type { OrderItem } from '../../types/database'

type FxCurrency = 'USD' | 'GBP' | 'EUR'
const FX_SYMBOLS: Record<FxCurrency, string> = { USD: '$', GBP: '£', EUR: '€' }

export function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { invoice, payments, loading, error, addPayment, removePayment } = useInvoice(id!)

  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [sendOpen, setSendOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Currency conversion
  const [fxCurrency, setFxCurrency] = useState<FxCurrency | 'ZAR'>('ZAR')
  const [fxRate, setFxRate] = useState<number | null>(null)
  const [fxLoading, setFxLoading] = useState(false)
  const [fxError, setFxError] = useState<string | null>(null)

  useEffect(() => {
    if (invoice?.order_id) {
      fetchOrderItems(invoice.order_id).then(setOrderItems).catch(() => {})
    }
  }, [invoice?.order_id])

  useEffect(() => {
    if (fxCurrency === 'ZAR') { setFxRate(null); setFxError(null); return }
    setFxLoading(true)
    setFxError(null)
    fetch(`https://api.frankfurter.app/latest?from=ZAR&to=${fxCurrency}`)
      .then((r) => r.json())
      .then((data) => {
        const rate = data?.rates?.[fxCurrency]
        if (typeof rate === 'number') setFxRate(rate)
        else setFxError('Could not load rate')
      })
      .catch(() => setFxError('Could not load rate'))
      .finally(() => setFxLoading(false))
  }, [fxCurrency])

  function fxFormat(zarAmount: number): string {
    if (!fxRate || fxCurrency === 'ZAR') return formatCurrency(zarAmount)
    const symbol = FX_SYMBOLS[fxCurrency]
    return `${symbol}${(zarAmount * fxRate).toFixed(2)}`
  }

  async function handleDelete() {
    if (!invoice) return
    if (!confirm(`Delete invoice ${invoice.invoice_number}? This cannot be undone.`)) return
    setDeleting(true)
    try {
      await deleteInvoice(invoice.id)
      navigate('/invoices')
    } catch (e) {
      alert((e as Error).message)
      setDeleting(false)
    }
  }

  async function handleDownloadPDF() {
    if (!invoice) return
    await generateInvoicePDF(invoice, orderItems, payments)
  }


  if (loading) return <div className="page"><p className="state-msg">Loading…</p></div>
  if (error || !invoice) return <div className="page"><p className="state-msg state-msg--error">{error ?? 'Invoice not found.'}</p></div>

  const isPaid     = invoice.status === 'paid'
  const hasBalance = !isPaid || invoice.total_amount > invoice.amount_paid

  return (
    <div className="page">
      <div className="detail-header">
        <button className="detail-header__back" onClick={() => navigate('/invoices')}>
          <ArrowLeft size={18} />
          Invoices
        </button>
        <div className="detail-header__actions">
          <button className="btn btn--secondary" onClick={handleDownloadPDF}>
            <Download size={15} />
            PDF
          </button>
          {!isPaid && (
            <button className="btn btn--secondary" onClick={() => setSendOpen(true)}>
              <Send size={15} />
              Send
            </button>
          )}
          {hasBalance && (
            <button className="btn btn--accent" onClick={() => setPaymentOpen(true)}>
              <Plus size={15} />
              Record payment
            </button>
          )}
          <button className="btn btn--danger" onClick={handleDelete} disabled={deleting}>
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      <div className="page__content">
        {/* Invoice header */}
        <div className="invoice-header-card">
          <div className="invoice-header-card__top">
            <div>
              <h2 className="invoice-header-card__number">{invoice.invoice_number}</h2>
              <div className="detail-meta">
                <Link to={`/clients/${invoice.client_id}`} className="detail-meta__link">
                  {invoice.clients.full_name}
                </Link>
                {invoice.clients.email && <span>{invoice.clients.email}</span>}
                {invoice.order_id && (
                  <Link to={`/orders/${invoice.order_id}`} className="detail-meta__link">
                    View order
                  </Link>
                )}
              </div>
            </div>
            <StatusBadge status={invoice.status} map={INVOICE_STATUS_MAP} />
          </div>

          <div className="invoice-header-card__dates">
            <div className="invoice-date-pill">
              <span className="invoice-date-pill__label">Issued</span>
              <span className="invoice-date-pill__value">{formatDate(invoice.issue_date)}</span>
            </div>
            <div className="invoice-date-pill">
              <span className="invoice-date-pill__label">Due</span>
              <span className="invoice-date-pill__value">{formatDate(invoice.due_date)}</span>
            </div>
            {invoice.sent_at && (
              <div className="invoice-date-pill">
                <span className="invoice-date-pill__label">Sent</span>
                <span className="invoice-date-pill__value">{formatDate(invoice.sent_at)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Line items */}
        <section className="detail-section">
          <div className="detail-section__heading"><h3>Items</h3></div>

          {orderItems.length > 0 ? (
            <div className="items-table">
              <div className="items-table__head">
                <span>Garment</span>
                <span>Details</span>
                <span className="items-table__num">Qty</span>
                <span className="items-table__num">Unit price</span>
                <span className="items-table__num">Total</span>
                <span />
              </div>
              {orderItems.map((item) => (
                <div key={item.id} className="items-table__row">
                  <div className="items-table__name">
                    <strong>{item.garment_name}</strong>
                    {item.notes && <span className="items-table__note">{item.notes}</span>}
                  </div>
                  <div className="items-table__details">
                    {[item.garment_type, item.fabric, item.colour, item.size].filter(Boolean).join(' · ')}
                  </div>
                  <span className="items-table__num">{item.quantity}</span>
                  <span className="items-table__num">{formatCurrency(item.unit_price)}</span>
                  <span className="items-table__num items-table__num--strong">{formatCurrency(item.line_total)}</span>
                  <span />
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state empty-state--sm">
              <p>No order linked — invoice total entered manually.</p>
            </div>
          )}

          {/* ZAR Totals */}
          <div className="order-totals">
            <div className="order-totals__row">
              <span>Subtotal</span><span>{formatCurrency(invoice.subtotal)}</span>
            </div>
            <div className="order-totals__row">
              <span>VAT ({(VAT_RATE * 100).toFixed(0)}%)</span>
              <span>{formatCurrency(invoice.vat_amount)}</span>
            </div>
            <div className="order-totals__row order-totals__row--total">
              <span>Total</span><span>{formatCurrency(invoice.total_amount)}</span>
            </div>
            {invoice.amount_paid > 0 && (
              <>
                <div className="order-totals__row order-totals__row--deposit">
                  <span>Paid</span><span>− {formatCurrency(invoice.amount_paid)}</span>
                </div>
                <div className="order-totals__row order-totals__row--balance">
                  <span>Balance due</span><span>{formatCurrency(invoice.balance_due)}</span>
                </div>
              </>
            )}
          </div>

          {/* Currency converter */}
          <div className="fx-converter">
            <div className="fx-converter__toggle">
              <span className="fx-converter__label">View in</span>
              <select
                className="fx-converter__select"
                value={fxCurrency}
                onChange={(e) => setFxCurrency(e.target.value as FxCurrency | 'ZAR')}
              >
                <option value="ZAR">ZAR (South African Rand)</option>
                <option value="USD">USD (US Dollar)</option>
                <option value="GBP">GBP (British Pound)</option>
                <option value="EUR">EUR (Euro)</option>
              </select>
            </div>

            {fxCurrency !== 'ZAR' && (
              <div className="fx-converter__panel">
                {fxLoading && <p className="fx-converter__status">Fetching rate…</p>}
                {fxError && <p className="fx-converter__status fx-converter__status--error">{fxError}</p>}
                {fxRate && !fxLoading && (
                  <>
                    <p className="fx-converter__rate">
                      1 ZAR = {FX_SYMBOLS[fxCurrency]}{fxRate.toFixed(4)} {fxCurrency}
                    </p>
                    <div className="fx-totals">
                      <div className="fx-totals__row">
                        <span>Subtotal</span>
                        <span>{fxFormat(invoice.subtotal)}</span>
                      </div>
                      <div className="fx-totals__row">
                        <span>VAT</span>
                        <span>{fxFormat(invoice.vat_amount)}</span>
                      </div>
                      <div className="fx-totals__row fx-totals__row--total">
                        <span>Total</span>
                        <span>{fxFormat(invoice.total_amount)}</span>
                      </div>
                      {invoice.amount_paid > 0 && (
                        <>
                          <div className="fx-totals__row">
                            <span>Paid</span>
                            <span>− {fxFormat(invoice.amount_paid)}</span>
                          </div>
                          <div className="fx-totals__row fx-totals__row--total">
                            <span>Balance due</span>
                            <span>{fxFormat(invoice.balance_due)}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Payments */}
        <section className="detail-section">
          <div className="detail-section__heading">
            <h3>Payments</h3>
            {hasBalance && (
              <button className="btn btn--secondary btn--sm" onClick={() => setPaymentOpen(true)}>
                <Plus size={14} />
                Record
              </button>
            )}
          </div>

          {payments.length === 0 ? (
            <div className="empty-state empty-state--sm">
              <p>No payments recorded yet.</p>
            </div>
          ) : (
            <div className="payments-list">
              {payments.map((p) => (
                <div key={p.id} className="payment-row">
                  <div className="payment-row__left">
                    <span className="payment-row__method">{p.payment_method}</span>
                    <span className="payment-row__date">{formatDate(p.payment_date)}</span>
                    {p.reference && <span className="payment-row__ref">Ref: {p.reference}</span>}
                  </div>
                  <div className="payment-row__right">
                    <span className="payment-row__amount">{formatCurrency(p.amount)}</span>
                    <button
                      className="items-table__del"
                      aria-label="Delete payment"
                      onClick={() => {
                        if (confirm(`Delete this ${p.payment_method} payment of ${formatCurrency(p.amount)}?`)) {
                          removePayment(p.id)
                        }
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {invoice.notes && (
          <section className="detail-section">
            <div className="detail-section__heading"><h3>Notes</h3></div>
            <p className="detail-card__notes">{invoice.notes}</p>
          </section>
        )}
      </div>

      <PaymentForm
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        onSubmit={addPayment}
        balanceDue={invoice.balance_due}
      />

      <SendInvoiceModal
        open={sendOpen}
        onClose={() => setSendOpen(false)}
        onSent={() => setSendOpen(false)}
        invoice={invoice}
        items={orderItems}
        payments={payments}
      />
    </div>
  )
}
