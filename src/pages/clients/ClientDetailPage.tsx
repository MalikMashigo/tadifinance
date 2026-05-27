import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Pencil, Plus, Ruler, Trash2 } from 'lucide-react'
import { ClientTypeBadge } from '../../components/ui/Badge'
import { ClientForm } from './ClientForm'
import { MeasurementForm } from './MeasurementForm'
import { OrderForm } from '../orders/OrderForm'
import { useClient } from '../../hooks/useClients'
import { deleteClient } from '../../lib/clients'
import { createOrder, fetchOrdersByClient, type ClientOrderSummary } from '../../lib/orders'
import { formatCurrency, formatDate } from '../../utils/format'
import type { ClientInsert } from '../../lib/clients'

const SIZE_SYSTEM_LABEL: Record<string, string> = {
  'S-XXL': 'S – XXL',
  'EU':    'European (EU)',
  'US':    'US sizing',
}

const ORDER_STATUS_LABEL: Record<string, string> = {
  consult:  'Consult',
  service:  'Service',
  complete: 'Complete',
  delivery: 'Delivery',
}

function MeasurementRow({ label, value }: { label: string; value: number | null }) {
  if (value === null) return null
  return (
    <div className="measure-row">
      <span className="measure-row__label">{label}</span>
      <span className="measure-row__value">{value} cm</span>
    </div>
  )
}

export function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { client, measurements, loading, error, updateClientData, addMeasurement } = useClient(id!)

  const [editOpen, setEditOpen]         = useState(false)
  const [measureOpen, setMeasureOpen]   = useState(false)
  const [orderFormOpen, setOrderFormOpen] = useState(false)
  const [deleting, setDeleting]         = useState(false)
  const [orders, setOrders]             = useState<ClientOrderSummary[]>([])

  useEffect(() => {
    if (id) {
      fetchOrdersByClient(id).then(setOrders).catch(() => {})
    }
  }, [id])

  async function handleDelete() {
    if (!client) return
    if (!confirm(`Delete ${client.full_name}? This cannot be undone.`)) return
    setDeleting(true)
    try {
      await deleteClient(client.id)
      navigate('/clients')
    } catch (e) {
      alert((e as Error).message)
      setDeleting(false)
    }
  }

  async function handleCreateOrder(data: Parameters<typeof createOrder>[0]) {
    const created = await createOrder(data)
    setOrders((prev) => [{ ...created }, ...prev] as ClientOrderSummary[])
    return created
  }

  if (loading) return <div className="page"><p className="state-msg">Loading…</p></div>
  if (error || !client) return <div className="page"><p className="state-msg state-msg--error">{error ?? 'Client not found.'}</p></div>

  const latest = measurements[0] ?? null

  return (
    <div className="page">
      {/* Header */}
      <div className="detail-header">
        <button className="detail-header__back" onClick={() => navigate('/clients')}>
          <ArrowLeft size={18} />
          Clients
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
        {/* Profile card */}
        <div className="detail-card">
          <div className="detail-card__avatar">
            {client.full_name.charAt(0).toUpperCase()}
          </div>
          <div className="detail-card__info">
            <div className="detail-card__name-row">
              <h2 className="detail-card__name">{client.full_name}</h2>
              <ClientTypeBadge type={client.client_type} />
            </div>
            <div className="detail-meta">
              {client.email && <span>{client.email}</span>}
              {client.phone && <span>{client.phone}</span>}
              {(client.city || client.country) && (
                <span>{[client.city, client.country].filter(Boolean).join(', ')}</span>
              )}
              {client.size_system && (
                <span>Size: {SIZE_SYSTEM_LABEL[client.size_system] ?? client.size_system}</span>
              )}
            </div>
            {client.style_preferences && (
              <div className="detail-card__pref">
                <strong>Style preferences:</strong> {client.style_preferences}
              </div>
            )}
            {client.notes && (
              <div className="detail-card__notes">{client.notes}</div>
            )}
            <div className="detail-card__since">
              Client since {formatDate(client.created_at)}
            </div>
          </div>
        </div>

        {/* Measurements */}
        <section className="detail-section">
          <div className="detail-section__heading">
            <div className="detail-section__title-row">
              <Ruler size={16} />
              <h3>Measurements</h3>
              {latest && (
                <span className="detail-section__subtitle">
                  Last recorded {formatDate(latest.measured_at)}
                </span>
              )}
            </div>
            <button className="btn btn--secondary btn--sm" onClick={() => setMeasureOpen(true)}>
              <Plus size={14} />
              Record new
            </button>
          </div>

          {!latest ? (
            <div className="empty-state empty-state--sm">
              <p>No measurements recorded yet.</p>
            </div>
          ) : (
            <div className="measure-grid">
              <MeasurementRow label="Bust"           value={latest.bust} />
              <MeasurementRow label="Waist"          value={latest.waist} />
              <MeasurementRow label="Hips"           value={latest.hips} />
              <MeasurementRow label="Shoulder width" value={latest.shoulder_width} />
              <MeasurementRow label="Sleeve length"  value={latest.sleeve_length} />
              <MeasurementRow label="Wrist"          value={latest.wrist} />
              <MeasurementRow label="Bicep"          value={latest.bicep} />
              <MeasurementRow label="Waist to knee"  value={latest.waist_to_knee} />
              <MeasurementRow label="Waist to ankle" value={latest.waist_to_ankle} />
              <MeasurementRow label="Waist to hip"   value={latest.waist_to_hip} />
              <MeasurementRow label="Inseam"         value={latest.inseam} />
            </div>
          )}

          {measurements.length > 1 && (
            <details className="measure-history">
              <summary>View measurement history ({measurements.length - 1} older records)</summary>
              <div className="measure-history__list">
                {measurements.slice(1).map((m) => (
                  <div key={m.id} className="measure-history__entry">
                    <strong>{formatDate(m.measured_at)}</strong>
                    <div className="measure-grid measure-grid--sm">
                      <MeasurementRow label="Bust"  value={m.bust} />
                      <MeasurementRow label="Waist" value={m.waist} />
                      <MeasurementRow label="Hips"  value={m.hips} />
                    </div>
                  </div>
                ))}
              </div>
            </details>
          )}
        </section>

        {/* Orders */}
        <section className="detail-section">
          <div className="detail-section__heading">
            <h3>Orders</h3>
            <button className="btn btn--primary btn--sm" onClick={() => setOrderFormOpen(true)}>
              <Plus size={14} />
              New order
            </button>
          </div>

          {orders.length === 0 ? (
            <div className="empty-state empty-state--sm">
              <p>No orders yet.</p>
            </div>
          ) : (
            <div className="payments-all-list">
              {orders.map((o) => (
                <div
                  key={o.id}
                  className="payments-all-row"
                  onClick={() => navigate(`/orders/${o.id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && navigate(`/orders/${o.id}`)}
                >
                  <div className="payments-all-row__left">
                    <span
                      className="payments-all-row__method"
                      style={{ background: 'var(--colour-ink)' }}
                    >
                      {ORDER_STATUS_LABEL[o.status] ?? o.status}
                    </span>
                    <div className="payments-all-row__body">
                      <span className="payments-all-row__client">{o.order_number}</span>
                      <span className="payments-all-row__meta">
                        {o.collection_name && <>{o.collection_name} · </>}
                        {o.due_date ? `Due ${formatDate(o.due_date)}` : 'No due date'}
                      </span>
                    </div>
                  </div>
                  {o.total_amount > 0 && (
                    <span className="payments-all-row__amount">{formatCurrency(o.total_amount)}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <ClientForm
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSubmit={(data: ClientInsert) => updateClientData(data)}
        initial={client}
      />

      <MeasurementForm
        open={measureOpen}
        onClose={() => setMeasureOpen(false)}
        onSubmit={addMeasurement}
      />

      <OrderForm
        open={orderFormOpen}
        onClose={() => setOrderFormOpen(false)}
        onSubmit={handleCreateOrder}
        preselectedClientId={client.id}
      />
    </div>
  )
}
