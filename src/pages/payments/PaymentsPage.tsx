import { useState, useEffect } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { Header } from '../../components/layout/Header'
import { fetchAllPayments, type PaymentWithInvoice } from '../../lib/invoices'
import { formatCurrency, formatDate } from '../../utils/format'

interface OutletCtx { openSidebar: () => void }

const METHOD_COLOURS: Record<string, string> = {
  EFT:     '#2a5a8c',
  cash:    '#4a7c59',
  card:    '#7a2020',
  PayShap: '#b57d2a',
}

export function PaymentsPage() {
  const { openSidebar } = useOutletContext<OutletCtx>()
  const navigate = useNavigate()
  const [payments, setPayments] = useState<PaymentWithInvoice[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)

  useEffect(() => {
    fetchAllPayments()
      .then(setPayments)
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false))
  }, [])

  const total = payments.reduce((s, p) => s + p.amount, 0)

  return (
    <div className="page">
      <Header title="Payments" onMenuClick={openSidebar} />

      <div className="page__content">
        {loading && <p className="state-msg">Loading payments…</p>}
        {error   && <p className="state-msg state-msg--error">{error}</p>}

        {!loading && !error && payments.length === 0 && (
          <div className="empty-state">
            <p>No payments recorded yet.</p>
            <button className="btn btn--primary" onClick={() => navigate('/invoices')}>
              Go to invoices
            </button>
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
    </div>
  )
}
