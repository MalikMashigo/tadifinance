import { useState, useEffect, useCallback } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Download, TrendingUp, TrendingDown, DollarSign, Receipt } from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { fetchReportData, exportToExcel, type ReportData } from '../../lib/reports'
import { CATEGORY_LABELS } from '../../lib/expenses'
import { formatCurrency, formatDate } from '../../utils/format'
import { StatusBadge } from '../../components/ui/Badge'
import { INVOICE_STATUS_MAP } from '../invoices/InvoicesPage'
import type { ExpenseCategory } from '../../types/database'

interface OutletCtx { openSidebar: () => void }

type Period = 'this-month' | 'last-month' | 'this-year' | 'custom'

function periodBounds(period: Period, customFrom: string, customTo: string): { from: string; to: string; label: string } {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

  if (period === 'this-month') {
    const from = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`
    const to = ymd(now)
    return { from, to, label: now.toLocaleString('en-ZA', { month: 'long', year: 'numeric' }) }
  }
  if (period === 'last-month') {
    const d = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const last = new Date(now.getFullYear(), now.getMonth(), 0)
    return { from: ymd(d), to: ymd(last), label: d.toLocaleString('en-ZA', { month: 'long', year: 'numeric' }) }
  }
  if (period === 'this-year') {
    return { from: `${now.getFullYear()}-01-01`, to: ymd(now), label: String(now.getFullYear()) }
  }
  return { from: customFrom, to: customTo, label: `${customFrom} to ${customTo}` }
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  EFT: 'EFT', cash: 'Cash', card: 'Card', PayShap: 'PayShap',
}

export function ReportsPage() {
  const { openSidebar } = useOutletContext<OutletCtx>()

  const today = new Date().toISOString().split('T')[0]
  const firstOfMonth = today.slice(0, 7) + '-01'

  const [period, setPeriod] = useState<Period>('this-month')
  const [customFrom, setCustomFrom] = useState(firstOfMonth)
  const [customTo, setCustomTo] = useState(today)
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [activeTab, setActiveTab] = useState<'invoices' | 'expenses' | 'payments'>('invoices')

  const load = useCallback(async () => {
    const { from, to } = periodBounds(period, customFrom, customTo)
    if (!from || !to || from > to) return
    setLoading(true)
    setError(null)
    try {
      setData(await fetchReportData(from, to))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [period, customFrom, customTo])

  useEffect(() => { load() }, [load])

  function handleExport() {
    if (!data) return
    const { label } = periodBounds(period, customFrom, customTo)
    setExporting(true)
    try {
      exportToExcel(data, label)
    } finally {
      setExporting(false)
    }
  }

  const { label } = periodBounds(period, customFrom, customTo)

  const stats = data
    ? [
        { label: 'Total invoiced', value: formatCurrency(data.summary.totalInvoiced), icon: Receipt, accent: 'blue' },
        { label: 'Revenue received', value: formatCurrency(data.summary.totalPaid), icon: TrendingUp, accent: 'green' },
        { label: 'Total expenses', value: formatCurrency(data.summary.totalExpenses), icon: TrendingDown, accent: 'amber' },
        {
          label: 'Gross profit',
          value: formatCurrency(data.summary.grossProfit),
          icon: DollarSign,
          accent: data.summary.grossProfit >= 0 ? 'green' : 'red',
        },
      ]
    : []

  return (
    <div className="page">
      <Header
        title="Reports"
        onMenuClick={openSidebar}
        actions={
          <button
            className="btn btn--secondary"
            onClick={handleExport}
            disabled={!data || exporting}
          >
            <Download size={16} />
            {exporting ? 'Exporting…' : 'Export Excel'}
          </button>
        }
      />

      <div className="page__content">
        {/* Period selector */}
        <div className="report-period">
          <div className="filter-pills">
            {([
              { value: 'this-month', label: 'This month' },
              { value: 'last-month', label: 'Last month' },
              { value: 'this-year',  label: 'This year'  },
              { value: 'custom',     label: 'Custom'     },
            ] as { value: Period; label: string }[]).map((opt) => (
              <button
                key={opt.value}
                className={`filter-pill ${period === opt.value ? 'filter-pill--active' : ''}`}
                onClick={() => setPeriod(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {period === 'custom' && (
            <div className="report-period__custom">
              <input
                type="date"
                className="input"
                value={customFrom}
                max={customTo}
                onChange={(e) => setCustomFrom(e.target.value)}
              />
              <span className="report-period__dash">–</span>
              <input
                type="date"
                className="input"
                value={customTo}
                min={customFrom}
                max={today}
                onChange={(e) => setCustomTo(e.target.value)}
              />
            </div>
          )}
        </div>

        {error && <p className="state-msg state-msg--error">{error}</p>}

        {/* Summary cards */}
        {!loading && data && (
          <>
            <div className="stats-grid">
              {stats.map((s) => (
                <div key={s.label} className={`stat-card stat-card--${s.accent}`}>
                  <div className="stat-card__icon"><s.icon size={20} /></div>
                  <div className="stat-card__body">
                    <span className="stat-card__value">{s.value}</span>
                    <span className="stat-card__label">{s.label}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Profit note */}
            {data.summary.grossProfit < 0 && (
              <p className="report-loss-note">
                Expenses exceeded revenue by {formatCurrency(Math.abs(data.summary.grossProfit))} for {label}.
              </p>
            )}

            {/* Tab selector */}
            <div className="report-tabs">
              {([
                { id: 'invoices', label: `Invoices (${data.invoices.length})` },
                { id: 'expenses', label: `Expenses (${data.expenses.length})` },
                { id: 'payments', label: `Payments (${data.payments.length})` },
              ] as { id: typeof activeTab; label: string }[]).map((t) => (
                <button
                  key={t.id}
                  className={`report-tab ${activeTab === t.id ? 'report-tab--active' : ''}`}
                  onClick={() => setActiveTab(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Invoices table */}
            {activeTab === 'invoices' && (
              data.invoices.length === 0
                ? <p className="dash-empty">No invoices issued in this period.</p>
                : (
                  <div className="report-table-wrap">
                    <table className="report-table">
                      <thead>
                        <tr>
                          <th>Invoice #</th>
                          <th>Client</th>
                          <th>Issue date</th>
                          <th>Due date</th>
                          <th>Status</th>
                          <th className="num">Subtotal</th>
                          <th className="num">VAT</th>
                          <th className="num">Total</th>
                          <th className="num">Paid</th>
                          <th className="num">Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.invoices.map((inv) => (
                          <tr key={inv.id}>
                            <td className="mono">{inv.invoice_number}</td>
                            <td>{inv.clients.full_name}</td>
                            <td>{formatDate(inv.issue_date)}</td>
                            <td>{formatDate(inv.due_date)}</td>
                            <td><StatusBadge status={inv.status} map={INVOICE_STATUS_MAP} /></td>
                            <td className="num">{formatCurrency(inv.subtotal)}</td>
                            <td className="num">{formatCurrency(inv.vat_amount)}</td>
                            <td className="num bold">{formatCurrency(inv.total_amount)}</td>
                            <td className="num">{formatCurrency(inv.amount_paid)}</td>
                            <td className={`num ${inv.balance_due > 0 ? 'red' : ''}`}>
                              {formatCurrency(inv.balance_due)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan={7} className="foot-label">Totals</td>
                          <td className="num bold">{formatCurrency(data.summary.totalInvoiced)}</td>
                          <td className="num bold">{formatCurrency(data.summary.totalPaid)}</td>
                          <td className="num bold">{formatCurrency(data.summary.outstanding)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )
            )}

            {/* Expenses table */}
            {activeTab === 'expenses' && (
              data.expenses.length === 0
                ? <p className="dash-empty">No expenses logged in this period.</p>
                : (
                  <div className="report-table-wrap">
                    <table className="report-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Subsection</th>
                          <th>Category</th>
                          <th>Description</th>
                          <th>Supplier</th>
                          <th className="num">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.expenses.map((exp) => (
                          <tr key={exp.id}>
                            <td>{formatDate(exp.expense_date)}</td>
                            <td>{exp.reference_name ?? exp.subsection}</td>
                            <td>{CATEGORY_LABELS[exp.category as ExpenseCategory] ?? exp.category}</td>
                            <td>{exp.description}</td>
                            <td>{exp.supplier ?? '—'}</td>
                            <td className="num">{formatCurrency(exp.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan={5} className="foot-label">Total</td>
                          <td className="num bold">{formatCurrency(data.summary.totalExpenses)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )
            )}

            {/* Payments table */}
            {activeTab === 'payments' && (
              data.payments.length === 0
                ? <p className="dash-empty">No payments recorded in this period.</p>
                : (
                  <div className="report-table-wrap">
                    <table className="report-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Invoice #</th>
                          <th>Client</th>
                          <th>Method</th>
                          <th>Reference</th>
                          <th className="num">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.payments.map((p) => (
                          <tr key={p.id}>
                            <td>{formatDate(p.payment_date)}</td>
                            <td className="mono">{p.invoices?.invoice_number ?? '—'}</td>
                            <td>{p.invoices?.clients?.full_name ?? '—'}</td>
                            <td>{PAYMENT_METHOD_LABELS[p.payment_method] ?? p.payment_method}</td>
                            <td>{p.reference ?? '—'}</td>
                            <td className="num bold">{formatCurrency(p.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan={5} className="foot-label">Total received</td>
                          <td className="num bold">{formatCurrency(data.summary.totalPaid)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )
            )}
          </>
        )}

        {loading && <p className="state-msg">Loading report…</p>}
      </div>
    </div>
  )
}
