import { useState, useEffect, useCallback } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Plus, Trash2 } from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { ExpenseLogForm } from './ExpenseLogForm'
import {
  fetchExpenseLogs,
  deleteExpenseLog,
  SUBSECTION_LABELS,
  SUBSECTIONS,
  CATEGORY_LABELS,
  CATEGORY_COLOURS,
  type ExpenseLogWithItems,
} from '../../lib/expenses'
import { formatCurrency, formatDate } from '../../utils/format'
import type { ExpenseSubsection } from '../../types/database'

interface OutletCtx { openSidebar: () => void }

export function ExpensesPage() {
  const { openSidebar } = useOutletContext<OutletCtx>()

  const [subsection, setSubsection] = useState<ExpenseSubsection>('clients')
  const [logs, setLogs]             = useState<ExpenseLogWithItems[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)
  const [formOpen, setFormOpen]     = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    fetchExpenseLogs(subsection)
      .then(setLogs)
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false))
  }, [subsection])

  useEffect(() => { load() }, [load])

  async function handleDelete(id: string) {
    if (!confirm('Delete this expense log and all its items? This cannot be undone.')) return
    try {
      await deleteExpenseLog(id)
      setLogs((prev) => prev.filter((l) => l.id !== id))
    } catch (e) {
      alert((e as Error).message)
    }
  }

  const sectionTotal = logs.reduce((s, l) => s + l.total_amount, 0)

  return (
    <div className="page expenses-page">
      <Header
        title="Expenses"
        onMenuClick={openSidebar}
        actions={
          <button className="btn btn--primary" onClick={() => setFormOpen(true)}>
            <Plus size={16} />
            Log expense
          </button>
        }
      />

      <div className="page__content">
        {/* Subsection tabs */}
        <div className="subsection-tabs">
          {SUBSECTIONS.map((s) => (
            <button
              key={s}
              className={`subsection-tab ${subsection === s ? 'subsection-tab--active' : ''}`}
              onClick={() => setSubsection(s)}
            >
              {SUBSECTION_LABELS[s]}
            </button>
          ))}
        </div>

        {/* Section total */}
        {!loading && logs.length > 0 && (
          <div className="expense-section-banner">
            <span className="expense-section-banner__label">
              {SUBSECTION_LABELS[subsection]} — {logs.length} {logs.length === 1 ? 'log' : 'logs'}
            </span>
            <span className="expense-section-banner__total">{formatCurrency(sectionTotal)}</span>
          </div>
        )}

        {loading && <p className="state-msg">Loading…</p>}
        {error && <p className="state-msg state-msg--error">{error}</p>}

        {!loading && !error && logs.length === 0 && (
          <div className="empty-state">
            <p>No expenses logged under {SUBSECTION_LABELS[subsection]} yet. Hit "Log expense" to start tracking costs here.</p>
          </div>
        )}

        {!loading && !error && logs.length > 0 && (
          <div className="expense-log-list">
            {logs.map((log) => {
              // Build category totals for this log
              const catTotals = new Map<string, number>()
              for (const item of log.expense_items) {
                catTotals.set(item.category, (catTotals.get(item.category) ?? 0) + item.amount)
              }

              return (
                <div key={log.id} className="expense-log-row">
                  <div className="expense-log-row__top">
                    <div className="expense-log-row__meta">
                      <span className="expense-log-row__date">{formatDate(log.log_date)}</span>
                      {log.reference_name && (
                        <span className="expense-log-row__ref">{log.reference_name}</span>
                      )}
                      <span className="expense-log-row__count">
                        {log.expense_items.length} {log.expense_items.length === 1 ? 'item' : 'items'}
                      </span>
                    </div>
                    <div className="expense-log-row__right">
                      <span className="expense-log-row__total">{formatCurrency(log.total_amount)}</span>
                      <button
                        className="row-delete-btn"
                        aria-label="Delete log"
                        onClick={() => handleDelete(log.id)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Category breakdown */}
                  <div className="expense-log-row__cats">
                    {Array.from(catTotals.entries()).map(([cat, total]) => (
                      <div key={cat} className="expense-log-row__cat-item">
                        <span className={`badge badge--${CATEGORY_COLOURS[cat as keyof typeof CATEGORY_COLOURS] ?? 'blue'}`}>
                          {CATEGORY_LABELS[cat as keyof typeof CATEGORY_LABELS] ?? cat}
                        </span>
                        <span className="expense-log-row__cat-amount">{formatCurrency(total)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Item list */}
                  {log.expense_items.length > 0 && (
                    <div className="expense-log-row__items">
                      {log.expense_items.map((item) => (
                        <div key={item.id} className="expense-log-item">
                          <span className="expense-log-item__desc">{item.description}</span>
                          {item.unit_quantity && item.unit_price && (
                            <span className="expense-log-item__unit">
                              {item.unit_quantity}
                              {item.unit_type === 'metre' ? 'm' : item.unit_type === 'hour' ? 'h' : '×'}
                              {' @ '}{formatCurrency(item.unit_price)}
                              {item.unit_type === 'metre' ? '/m' : item.unit_type === 'hour' ? '/h' : ''}
                            </span>
                          )}
                          {item.supplier && (
                            <span className="expense-log-item__supplier">{item.supplier}</span>
                          )}
                          <span className="expense-log-item__amount">{formatCurrency(item.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {log.notes && (
                    <p className="expense-log-row__notes">{log.notes}</p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <ExpenseLogForm
        open={formOpen}
        subsection={subsection}
        onClose={() => setFormOpen(false)}
        onSaved={load}
      />
    </div>
  )
}
