import { useState, useMemo } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { Plus, Search, ChevronRight, Trash2 } from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { StatusBadge } from '../../components/ui/Badge'
import { OrderForm } from './OrderForm'
import { useOrders } from '../../hooks/useOrders'
import { formatCurrency, formatDate } from '../../utils/format'
import type { OrderStatus, OrderType } from '../../types/database'

interface OutletCtx { openSidebar: () => void }

const STATUS_FILTERS: { label: string; value: OrderStatus | 'all' }[] = [
  { label: 'All',      value: 'all'      },
  { label: 'Consult',  value: 'consult'  },
  { label: 'Service',  value: 'service'  },
  { label: 'Delivery', value: 'delivery' },
  { label: 'Complete', value: 'complete' },
]

const STATUS_MAP: Record<OrderStatus, { label: string; colour: string }> = {
  consult:  { label: 'Consult',  colour: 'blue'  },
  service:  { label: 'Service',  colour: 'amber' },
  delivery: { label: 'Delivery', colour: 'accent' },
  complete: { label: 'Complete', colour: 'green' },
}

const TYPE_LABELS: Record<OrderType, string> = {
  bespoke:     'Bespoke',
  outsourcing: 'Outsourcing',
  alteration:  'Alteration',
}

export function OrdersPage() {
  const { openSidebar } = useOutletContext<OutletCtx>()
  const navigate = useNavigate()
  const { orders, loading, error, addOrder, removeOrder } = useOrders()

  const [formOpen, setFormOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all')

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return orders.filter((o) => {
      const matchesSearch =
        !q ||
        o.order_number.toLowerCase().includes(q) ||
        o.clients.full_name.toLowerCase().includes(q) ||
        (o.collection_name ?? '').toLowerCase().includes(q)
      const matchesStatus = statusFilter === 'all' || o.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [orders, search, statusFilter])

  function handleDelete(e: React.MouseEvent, id: string, number: string) {
    e.stopPropagation()
    if (confirm(`Delete order ${number}? This cannot be undone.`)) removeOrder(id)
  }

  return (
    <div className="page orders-page">
      <Header
        title="Orders"
        onMenuClick={openSidebar}
        actions={
          <button className="btn btn--primary" onClick={() => setFormOpen(true)}>
            <Plus size={16} />
            New order
          </button>
        }
      />

      <div className="page__content">
        <div className="toolbar">
          <div className="search-box">
            <Search size={16} className="search-box__icon" />
            <input
              className="search-box__input"
              placeholder="Search orders…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="filter-pills">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                className={`filter-pill ${statusFilter === f.value ? 'filter-pill--active' : ''}`}
                onClick={() => setStatusFilter(f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {loading && <p className="state-msg">Loading orders…</p>}
        {error && <p className="state-msg state-msg--error">{error}</p>}

        {!loading && !error && filtered.length === 0 && (
          <div className="empty-state">
            <p>{search || statusFilter !== 'all'
              ? 'No orders match your search.'
              : 'No orders yet. Create your first order to begin tracking.'}</p>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="order-list">
            {filtered.map((order) => (
              <div
                key={order.id}
                className="order-row"
                onClick={() => navigate(`/orders/${order.id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && navigate(`/orders/${order.id}`)}
              >
                <div className="order-row__left">
                  <span className="order-row__number">{order.order_number}</span>
                  <span className="order-row__client">{order.clients.full_name}</span>
                  <span className="order-row__type">
                    {TYPE_LABELS[order.order_type]}{order.collection_name ? ` — ${order.collection_name}` : ''}
                  </span>
                </div>
                <div className="order-row__right">
                  <div className="order-row__meta">
                    {order.due_date && (
                      <span className="order-row__date">Due {formatDate(order.due_date)}</span>
                    )}
                    <span className="order-row__amount">{formatCurrency(order.total_amount)}</span>
                  </div>
                  <StatusBadge status={order.status} map={STATUS_MAP} />
                  <button
                    className="row-delete-btn"
                    aria-label={`Delete ${order.order_number}`}
                    onClick={(e) => handleDelete(e, order.id, order.order_number)}
                  >
                    <Trash2 size={15} />
                  </button>
                  <ChevronRight size={16} className="order-row__chevron" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && (
          <p className="list-count">
            {filtered.length} {filtered.length === 1 ? 'order' : 'orders'}
            {statusFilter !== 'all' || search ? ' shown' : ' total'}
          </p>
        )}
      </div>

      <OrderForm open={formOpen} onClose={() => setFormOpen(false)} onSubmit={addOrder} />
    </div>
  )
}
