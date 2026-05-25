import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Pencil, Trash2, Plus, X } from 'lucide-react'
import { StatusStepper } from '../../components/ui/StatusStepper'
import { StatusBadge } from '../../components/ui/Badge'
import { OrderForm } from './OrderForm'
import { OrderItemForm } from './OrderItemForm'
import { useOrder } from '../../hooks/useOrders'
import { deleteOrder } from '../../lib/orders'
import { formatCurrency, formatDate, calcVat, VAT_RATE } from '../../utils/format'
import type { OrderStatus } from '../../types/database'

const STATUS_MAP: Record<OrderStatus, { label: string; colour: string }> = {
  consult:   { label: 'Consult',   colour: 'blue' },
  pattern:   { label: 'Pattern',   colour: 'amber' },
  cutting:   { label: 'Cutting',   colour: 'amber' },
  sewing:    { label: 'Sewing',    colour: 'accent' },
  fitting:   { label: 'Fitting',   colour: 'accent' },
  complete:  { label: 'Complete',  colour: 'green' },
  delivered: { label: 'Delivered', colour: 'green' },
}

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { order, items, loading, error, setStatus, updateOrderData, addItem, removeItem } = useOrder(id!)

  const [editOpen, setEditOpen] = useState(false)
  const [itemFormOpen, setItemFormOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!order) return
    if (!confirm(`Delete order ${order.order_number}? This cannot be undone.`)) return
    setDeleting(true)
    try {
      await deleteOrder(order.id)
      navigate('/orders')
    } catch (e) {
      alert((e as Error).message)
      setDeleting(false)
    }
  }

  if (loading) return <div className="page"><p className="state-msg">Loading…</p></div>
  if (error || !order) return <div className="page"><p className="state-msg state-msg--error">{error ?? 'Order not found.'}</p></div>

  const subtotal = items.reduce((s, i) => s + i.line_total, 0)
  const vat = calcVat(subtotal)
  const total = subtotal + vat
  const balance = total - order.deposit_amount

  return (
    <div className="page">
      <div className="detail-header">
        <button className="detail-header__back" onClick={() => navigate('/orders')}>
          <ArrowLeft size={18} />
          Orders
        </button>
        <div className="detail-header__actions">
          <button className="btn btn--secondary" onClick={() => setEditOpen(true)}>
            <Pencil size={15} />
            Edit
          </button>
          <button className="btn btn--danger" onClick={handleDelete} disabled={deleting}>
            <Trash2 size={15} />
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>

      <div className="page__content">
        {/* Order header card */}
        <div className="detail-card">
          <div className="detail-card__info" style={{ width: '100%' }}>
            <div className="order-detail__title-row">
              <div>
                <h2 className="detail-card__name">{order.order_number}</h2>
                <div className="detail-meta">
                  <Link to={`/clients/${order.client_id}`} className="detail-meta__link">
                    {order.clients.full_name}
                  </Link>
                  {order.collection_name && <span>{order.collection_name}</span>}
                  {order.due_date && <span>Due {formatDate(order.due_date)}</span>}
                  <span>Created {formatDate(order.created_at)}</span>
                </div>
              </div>
              <StatusBadge status={order.status} map={STATUS_MAP} />
            </div>
            {order.description && (
              <p className="order-detail__description">{order.description}</p>
            )}
          </div>
        </div>

        {/* Status stepper */}
        <section className="detail-section">
          <div className="detail-section__heading">
            <h3>Progress</h3>
          </div>
          <StatusStepper current={order.status} onChange={setStatus} />
          <p className="stepper__hint">Tap a step to advance the order status.</p>
        </section>

        {/* Garments / line items */}
        <section className="detail-section">
          <div className="detail-section__heading">
            <h3>Garments</h3>
            <button className="btn btn--secondary btn--sm" onClick={() => setItemFormOpen(true)}>
              <Plus size={14} />
              Add garment
            </button>
          </div>

          {items.length === 0 ? (
            <div className="empty-state empty-state--sm">
              <p>No garments added yet. Add line items to calculate totals.</p>
            </div>
          ) : (
            <>
              <div className="items-table">
                <div className="items-table__head">
                  <span>Garment</span>
                  <span>Details</span>
                  <span className="items-table__num">Qty</span>
                  <span className="items-table__num">Unit price</span>
                  <span className="items-table__num">Total</span>
                  <span />
                </div>
                {items.map((item) => (
                  <div key={item.id} className="items-table__row">
                    <div className="items-table__name">
                      <strong>{item.garment_name}</strong>
                      {item.notes && <span className="items-table__note">{item.notes}</span>}
                    </div>
                    <div className="items-table__details">
                      {[item.garment_type, item.fabric, item.colour, item.size]
                        .filter(Boolean).join(' · ')}
                    </div>
                    <span className="items-table__num">{item.quantity}</span>
                    <span className="items-table__num">{formatCurrency(item.unit_price)}</span>
                    <span className="items-table__num items-table__num--strong">
                      {formatCurrency(item.line_total)}
                    </span>
                    <button
                      className="items-table__del"
                      onClick={() => removeItem(item.id)}
                      aria-label="Remove item"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="order-totals">
                <div className="order-totals__row">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="order-totals__row">
                  <span>VAT ({(VAT_RATE * 100).toFixed(0)}%)</span>
                  <span>{formatCurrency(vat)}</span>
                </div>
                <div className="order-totals__row order-totals__row--total">
                  <span>Total</span>
                  <span>{formatCurrency(total)}</span>
                </div>
                {order.deposit_amount > 0 && (
                  <>
                    <div className="order-totals__row order-totals__row--deposit">
                      <span>Deposit paid</span>
                      <span>− {formatCurrency(order.deposit_amount)}</span>
                    </div>
                    <div className="order-totals__row order-totals__row--balance">
                      <span>Balance due</span>
                      <span>{formatCurrency(Math.max(0, balance))}</span>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </section>

        {/* Invoice action */}
        <section className="detail-section">
          <div className="detail-section__heading">
            <h3>Invoice</h3>
            <button
              className="btn btn--primary btn--sm"
              onClick={() => navigate(`/invoices?orderId=${order.id}&clientId=${order.client_id}`)}
            >
              <Plus size={14} />
              Create invoice
            </button>
          </div>
          <div className="empty-state empty-state--sm">
            <p>No invoice created yet. Hit "Create invoice" to generate one from this order.</p>
          </div>
        </section>

        {order.notes && (
          <section className="detail-section">
            <div className="detail-section__heading"><h3>Notes</h3></div>
            <p className="detail-card__notes">{order.notes}</p>
          </section>
        )}
      </div>

      <OrderForm
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSubmit={(data) => updateOrderData(data)}
        initial={order}
      />

      <OrderItemForm
        open={itemFormOpen}
        onClose={() => setItemFormOpen(false)}
        onSubmit={addItem}
      />
    </div>
  )
}
