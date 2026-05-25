import { useState, useMemo } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { Plus, Upload, Search, ChevronRight, Trash2 } from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { StatusBadge } from '../../components/ui/Badge'
import { InvoiceForm } from './InvoiceForm'
import { InvoiceUploadModal } from './InvoiceUploadModal'
import { useInvoices } from '../../hooks/useInvoices'
import { formatCurrency, formatDate } from '../../utils/format'
import type { InvoiceStatus } from '../../types/database'

interface OutletCtx { openSidebar: () => void }

const STATUS_FILTERS: { label: string; value: InvoiceStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Draft', value: 'draft' },
  { label: 'Sent', value: 'sent' },
  { label: 'Part paid', value: 'partially_paid' },
  { label: 'Paid', value: 'paid' },
  { label: 'Overdue', value: 'overdue' },
]

export const INVOICE_STATUS_MAP: Record<InvoiceStatus, { label: string; colour: string }> = {
  draft:          { label: 'Draft',     colour: 'blue' },
  sent:           { label: 'Sent',      colour: 'amber' },
  partially_paid: { label: 'Part paid', colour: 'accent' },
  paid:           { label: 'Paid',      colour: 'green' },
  overdue:        { label: 'Overdue',   colour: 'red' },
}

export function InvoicesPage() {
  const { openSidebar } = useOutletContext<OutletCtx>()
  const navigate = useNavigate()
  const { invoices, loading, error, reload, addInvoice, removeInvoice } = useInvoices()

  const [formOpen, setFormOpen] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all')

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return invoices.filter((inv) => {
      const matchesSearch =
        !q ||
        inv.invoice_number.toLowerCase().includes(q) ||
        inv.clients.full_name.toLowerCase().includes(q) ||
        (inv.clients.email ?? '').toLowerCase().includes(q)
      const matchesStatus = statusFilter === 'all' || inv.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [invoices, search, statusFilter])

  const totalOutstanding = invoices
    .filter((i) => i.status !== 'paid')
    .reduce((s, i) => s + i.balance_due, 0)

  function handleDelete(e: React.MouseEvent, id: string, number: string) {
    e.stopPropagation()
    if (confirm(`Delete invoice ${number}? This cannot be undone.`)) removeInvoice(id)
  }

  return (
    <div className="page">
      <Header
        title="Invoices"
        onMenuClick={openSidebar}
        actions={
          <>
            <button className="btn btn--secondary" onClick={() => setUploadOpen(true)}>
              <Upload size={16} />
              Import
            </button>
            <button className="btn btn--primary" onClick={() => setFormOpen(true)}>
              <Plus size={16} />
              New invoice
            </button>
          </>
        }
      />

      <div className="page__content">
        {totalOutstanding > 0 && (
          <div className="outstanding-banner">
            <span className="outstanding-banner__label">Outstanding receivables</span>
            <span className="outstanding-banner__amount">{formatCurrency(totalOutstanding)}</span>
          </div>
        )}

        <div className="toolbar">
          <div className="search-box">
            <Search size={16} className="search-box__icon" />
            <input
              className="search-box__input"
              placeholder="Search invoices…"
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

        {loading && <p className="state-msg">Loading invoices…</p>}
        {error && <p className="state-msg state-msg--error">{error}</p>}

        {!loading && !error && filtered.length === 0 && (
          <div className="empty-state">
            <p>{search || statusFilter !== 'all'
              ? 'No invoices match your search.'
              : 'No invoices yet. Create your first invoice to get started.'}</p>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="invoice-list">
            {filtered.map((inv) => (
              <div
                key={inv.id}
                className="invoice-row"
                onClick={() => navigate(`/invoices/${inv.id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && navigate(`/invoices/${inv.id}`)}
              >
                <div className="invoice-row__left">
                  <span className="invoice-row__number">{inv.invoice_number}</span>
                  <span className="invoice-row__client">{inv.clients.full_name}</span>
                  <span className="invoice-row__date">
                    Issued {formatDate(inv.issue_date)} · Due {formatDate(inv.due_date)}
                  </span>
                </div>
                <div className="invoice-row__right">
                  <div className="invoice-row__amounts">
                    <span className="invoice-row__total">{formatCurrency(inv.total_amount)}</span>
                    {inv.balance_due > 0 && inv.status !== 'paid' && (
                      <span className="invoice-row__balance">
                        {formatCurrency(inv.balance_due)} due
                      </span>
                    )}
                  </div>
                  <StatusBadge status={inv.status} map={INVOICE_STATUS_MAP} />
                  <button
                    className="row-delete-btn"
                    aria-label={`Delete ${inv.invoice_number}`}
                    onClick={(e) => handleDelete(e, inv.id, inv.invoice_number)}
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
            {filtered.length} {filtered.length === 1 ? 'invoice' : 'invoices'}
            {statusFilter !== 'all' || search ? ' shown' : ' total'}
          </p>
        )}
      </div>

      <InvoiceForm open={formOpen} onClose={() => setFormOpen(false)} onSubmit={addInvoice} />

      <InvoiceUploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onImported={() => { setUploadOpen(false); reload() }}
      />
    </div>
  )
}
