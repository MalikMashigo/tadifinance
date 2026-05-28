import { useState, useEffect } from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import { TrendingUp, Users, FileText, AlertCircle, ArrowRight } from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { StatusBadge } from '../../components/ui/Badge'
import { fetchDashboardData, type DashboardData } from '../../lib/dashboard'
import { CATEGORY_LABELS, CATEGORY_COLOURS } from '../../lib/expenses'
import { INVOICE_STATUS_MAP } from '../invoices/InvoicesPage'
import { formatCurrency, formatDate } from '../../utils/format'
import type { OrderStatus, ExpenseCategory } from '../../types/database'

interface OutletCtx { openSidebar: () => void }

const ORDER_STATUS_MAP: Record<OrderStatus, { label: string; colour: string }> = {
  consult:  { label: 'Consult',  colour: 'blue'  },
  service:  { label: 'Service',  colour: 'amber' },
  delivery: { label: 'Delivery', colour: 'accent' },
  complete: { label: 'Complete', colour: 'green' },
}

function isOverdue(dueDateStr: string) {
  return new Date(dueDateStr) < new Date()
}

export function DashboardPage() {
  const { openSidebar } = useOutletContext<OutletCtx>()
  const navigate = useNavigate()

  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDashboardData()
      .then(setData)
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false))
  }, [])

  const stats = data
    ? [
        {
          label: 'Revenue this month',
          value: formatCurrency(data.stats.revenueThisMonth),
          icon: TrendingUp,
          accent: 'green',
        },
        {
          label: 'Active clients',
          value: String(data.stats.activeClients),
          icon: Users,
          accent: 'blue',
        },
        {
          label: 'Open invoices',
          value: String(data.stats.openInvoices),
          icon: FileText,
          accent: 'amber',
        },
        {
          label: 'Overdue',
          value: String(data.stats.overdueInvoices),
          icon: AlertCircle,
          accent: data.stats.overdueInvoices > 0 ? 'red' : 'blue',
        },
      ]
    : [
        { label: 'Revenue this month', value: '—', icon: TrendingUp, accent: 'green' },
        { label: 'Active clients',     value: '—', icon: Users,       accent: 'blue' },
        { label: 'Open invoices',      value: '—', icon: FileText,    accent: 'amber' },
        { label: 'Overdue',            value: '—', icon: AlertCircle, accent: 'blue' },
      ]

  const monthName = new Date().toLocaleString('en-ZA', { month: 'long', year: 'numeric' })

  return (
    <div className="page dashboard-page">
      <Header title="Dashboard" onMenuClick={openSidebar} />

      <div className="page__content">
        {error && <p className="state-msg state-msg--error">{error}</p>}

        {/* Stat cards */}
        <div className="stats-grid">
          {stats.map((s) => (
            <div key={s.label} className={`stat-card stat-card--${s.accent}`}>
              <div className="stat-card__icon">
                <s.icon size={20} />
              </div>
              <div className="stat-card__body">
                <span className="stat-card__value">
                  {loading ? <span className="dash-skeleton" /> : s.value}
                </span>
                <span className="stat-card__label">{s.label}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Two-column panels */}
        <div className="dash-panels">

          {/* Outstanding invoices */}
          <div className="dash-panel">
            <div className="dash-panel__head">
              <h2 className="dash-panel__title">Outstanding invoices</h2>
              <button className="dash-panel__link" onClick={() => navigate('/invoices')}>
                View all <ArrowRight size={13} />
              </button>
            </div>

            {loading && <p className="state-msg">Loading…</p>}

            {!loading && data && data.outstanding.length === 0 && (
              <p className="dash-empty">No outstanding invoices. All caught up!</p>
            )}

            {!loading && data && data.outstanding.length > 0 && (
              <div className="dash-list">
                {data.outstanding.map((inv) => (
                  <div
                    key={inv.id}
                    className="dash-row"
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(`/invoices/${inv.id}`)}
                    onKeyDown={(e) => e.key === 'Enter' && navigate(`/invoices/${inv.id}`)}
                  >
                    <div className="dash-row__left">
                      <StatusBadge status={inv.status} map={INVOICE_STATUS_MAP} />
                      <div className="dash-row__body">
                        <span className="dash-row__primary">{inv.clients.full_name}</span>
                        <span className="dash-row__secondary">
                          {inv.invoice_number}
                          {' · '}
                          <span className={isOverdue(inv.due_date) && inv.status !== 'paid' ? 'dash-overdue' : ''}>
                            Due {formatDate(inv.due_date)}
                          </span>
                        </span>
                      </div>
                    </div>
                    <span className="dash-row__amount">{formatCurrency(inv.balance_due)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent orders */}
          <div className="dash-panel">
            <div className="dash-panel__head">
              <h2 className="dash-panel__title">Recent orders</h2>
              <button className="dash-panel__link" onClick={() => navigate('/orders')}>
                View all <ArrowRight size={13} />
              </button>
            </div>

            {loading && <p className="state-msg">Loading…</p>}

            {!loading && data && data.recentOrders.length === 0 && (
              <p className="dash-empty">No orders yet.</p>
            )}

            {!loading && data && data.recentOrders.length > 0 && (
              <div className="dash-list">
                {data.recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="dash-row"
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(`/orders/${order.id}`)}
                    onKeyDown={(e) => e.key === 'Enter' && navigate(`/orders/${order.id}`)}
                  >
                    <div className="dash-row__left">
                      <StatusBadge status={order.status} map={ORDER_STATUS_MAP} />
                      <div className="dash-row__body">
                        <span className="dash-row__primary">{order.clients.full_name}</span>
                        <span className="dash-row__secondary">
                          {order.order_number}
                          {order.due_date && ` · Due ${formatDate(order.due_date)}`}
                        </span>
                      </div>
                    </div>
                    <span className="dash-row__amount">{formatCurrency(order.total_amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Monthly expenses */}
        {!loading && data && (data.expensesByCategory.size > 0 || data.totalExpensesThisMonth > 0) && (
          <div className="dash-panel dash-panel--wide">
            <div className="dash-panel__head">
              <h2 className="dash-panel__title">Expenses — {monthName}</h2>
              <button className="dash-panel__link" onClick={() => navigate('/expenses')}>
                View all <ArrowRight size={13} />
              </button>
            </div>

            <div className="dash-expense-cats">
              {(Object.keys(CATEGORY_LABELS) as ExpenseCategory[])
                .filter((cat) => data.expensesByCategory.has(cat))
                .map((cat) => {
                  const amount = data.expensesByCategory.get(cat) ?? 0
                  const pct = data.totalExpensesThisMonth > 0
                    ? Math.round((amount / data.totalExpensesThisMonth) * 100)
                    : 0
                  return (
                    <div key={cat} className="dash-expense-cat">
                      <div className="dash-expense-cat__head">
                        <span className={`badge badge--${CATEGORY_COLOURS[cat]}`}>
                          {CATEGORY_LABELS[cat]}
                        </span>
                        <span className="dash-expense-cat__amount">{formatCurrency(amount)}</span>
                      </div>
                      <div className="dash-expense-cat__bar-track">
                        <div
                          className={`dash-expense-cat__bar dash-expense-cat__bar--${CATEGORY_COLOURS[cat]}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              <div className="dash-expense-total">
                <span>Total this month</span>
                <strong>{formatCurrency(data.totalExpensesThisMonth)}</strong>
              </div>
            </div>
          </div>
        )}

        {!loading && data && data.expensesByCategory.size === 0 && data.outstanding.length === 0 && data.recentOrders.length === 0 && (
          <div className="empty-state" style={{ marginTop: 'var(--space-6)' }}>
            <p>Add clients, orders, and invoices to see your business at a glance.</p>
          </div>
        )}
      </div>
    </div>
  )
}
