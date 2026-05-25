import { useState, useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Plus, Search, Pencil, Trash2, ExternalLink } from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { StatusBadge } from '../../components/ui/Badge'
import { ExpenseForm } from './ExpenseForm'
import { useExpenses } from '../../hooks/useExpenses'
import { formatCurrency, formatDate } from '../../utils/format'
import { CATEGORY_LABELS, CATEGORY_COLOURS, type ExpenseWithOrder } from '../../lib/expenses'
import type { ExpenseCategory } from '../../types/database'

interface OutletCtx { openSidebar: () => void }

const CATEGORY_FILTERS: { label: string; value: ExpenseCategory | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Fabric', value: 'fabric' },
  { label: 'Trims', value: 'trims' },
  { label: 'Labour', value: 'labour' },
  { label: 'Packaging', value: 'packaging' },
  { label: 'Shipping', value: 'shipping' },
  { label: 'Show / Event', value: 'show' },
]

export function ExpensesPage() {
  const { openSidebar } = useOutletContext<OutletCtx>()
  const { expenses, loading, error, addExpense, editExpense, removeExpense } = useExpenses()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ExpenseWithOrder | null>(null)
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState<ExpenseCategory | 'all'>('all')

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return expenses.filter((e) => {
      const matchesSearch =
        !q ||
        e.description.toLowerCase().includes(q) ||
        (e.supplier ?? '').toLowerCase().includes(q) ||
        (e.orders?.order_number ?? '').toLowerCase().includes(q)
      const matchesCat = catFilter === 'all' || e.category === catFilter
      return matchesSearch && matchesCat
    })
  }, [expenses, search, catFilter])

  // Summary by category (from all expenses, not just filtered)
  const totals = useMemo(() => {
    const map = new Map<ExpenseCategory, number>()
    for (const e of expenses) {
      map.set(e.category, (map.get(e.category) ?? 0) + e.amount)
    }
    return map
  }, [expenses])

  const grandTotal = expenses.reduce((s, e) => s + e.amount, 0)
  const filteredTotal = filtered.reduce((s, e) => s + e.amount, 0)

  function handleEdit(e: React.MouseEvent, expense: ExpenseWithOrder) {
    e.stopPropagation()
    setEditing(expense)
  }

  function handleDelete(e: React.MouseEvent, id: string, desc: string) {
    e.stopPropagation()
    if (confirm(`Delete "${desc}"? This cannot be undone.`)) removeExpense(id)
  }

  return (
    <div className="page">
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
        {/* Summary cards */}
        {!loading && expenses.length > 0 && (
          <div className="expense-summary">
            <div className="expense-summary__total">
              <span className="expense-summary__total-label">Total expenses</span>
              <span className="expense-summary__total-value">{formatCurrency(grandTotal)}</span>
            </div>
            <div className="expense-summary__cats">
              {(Object.keys(CATEGORY_LABELS) as ExpenseCategory[])
                .filter((cat) => totals.has(cat))
                .map((cat) => (
                  <button
                    key={cat}
                    className={`expense-cat-chip ${catFilter === cat ? 'expense-cat-chip--active' : ''}`}
                    onClick={() => setCatFilter(catFilter === cat ? 'all' : cat)}
                  >
                    <span className={`badge badge--${CATEGORY_COLOURS[cat]}`}>
                      {CATEGORY_LABELS[cat]}
                    </span>
                    <span className="expense-cat-chip__amount">
                      {formatCurrency(totals.get(cat) ?? 0)}
                    </span>
                  </button>
                ))}
            </div>
          </div>
        )}

        {/* Toolbar */}
        <div className="toolbar">
          <div className="search-box">
            <Search size={16} className="search-box__icon" />
            <input
              className="search-box__input"
              placeholder="Search expenses…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="filter-pills">
            {CATEGORY_FILTERS.map((f) => (
              <button
                key={f.value}
                className={`filter-pill ${catFilter === f.value ? 'filter-pill--active' : ''}`}
                onClick={() => setCatFilter(f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {loading && <p className="state-msg">Loading expenses…</p>}
        {error && <p className="state-msg state-msg--error">{error}</p>}

        {!loading && !error && filtered.length === 0 && (
          <div className="empty-state">
            <p>{search || catFilter !== 'all'
              ? 'No expenses match your search.'
              : 'No expenses logged yet. Track fabric, labour and show costs here.'}</p>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <>
            <div className="expense-list">
              {filtered.map((exp) => (
                <div key={exp.id} className="expense-row">
                  <div className="expense-row__left">
                    <StatusBadge
                      status={exp.category}
                      map={Object.fromEntries(
                        (Object.keys(CATEGORY_LABELS) as ExpenseCategory[]).map((k) => [
                          k,
                          { label: CATEGORY_LABELS[k], colour: CATEGORY_COLOURS[k] },
                        ])
                      )}
                    />
                    <div className="expense-row__body">
                      <span className="expense-row__desc">{exp.description}</span>
                      <div className="expense-row__meta">
                        {exp.supplier && <span>{exp.supplier}</span>}
                        {exp.orders && (
                          <span className="expense-row__order">{exp.orders.order_number}</span>
                        )}
                        <span>{formatDate(exp.expense_date)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="expense-row__right">
                    <span className="expense-row__amount">{formatCurrency(exp.amount)}</span>
                    <div className="expense-row__actions">
                      {exp.receipt_url && (
                        <a
                          href={exp.receipt_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="row-icon-btn"
                          aria-label="View receipt"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink size={14} />
                        </a>
                      )}
                      <button
                        className="row-icon-btn"
                        aria-label="Edit expense"
                        onClick={(e) => handleEdit(e, exp)}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        className="row-icon-btn row-icon-btn--danger"
                        aria-label="Delete expense"
                        onClick={(e) => handleDelete(e, exp.id, exp.description)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="expense-list__footer">
              <span className="list-count">
                {filtered.length} {filtered.length === 1 ? 'expense' : 'expenses'}
                {catFilter !== 'all' || search ? ' shown' : ' total'}
              </span>
              {(catFilter !== 'all' || search) && (
                <span className="expense-list__subtotal">
                  Subtotal: <strong>{formatCurrency(filteredTotal)}</strong>
                </span>
              )}
            </div>
          </>
        )}
      </div>

      <ExpenseForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={addExpense}
      />

      {editing && (
        <ExpenseForm
          open={!!editing}
          onClose={() => setEditing(null)}
          onSubmit={(data) => editExpense(editing.id, data)}
          initial={editing}
        />
      )}
    </div>
  )
}
