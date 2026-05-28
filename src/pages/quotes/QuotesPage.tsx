import { useState, useMemo, useEffect, useCallback } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { Plus, Search, ChevronRight, Trash2 } from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { StatusBadge } from '../../components/ui/Badge'
import { QuoteForm } from './QuoteForm'
import { fetchQuotes, createQuote, deleteQuote, type QuoteWithClient, type QuoteInsert } from '../../lib/quotes'
import { formatCurrency, formatDate } from '../../utils/format'
import type { QuoteStatus } from '../../types/database'

interface OutletCtx { openSidebar: () => void }

const STATUS_FILTERS: { label: string; value: QuoteStatus | 'all' }[] = [
  { label: 'All',      value: 'all'      },
  { label: 'Draft',    value: 'draft'    },
  { label: 'Sent',     value: 'sent'     },
  { label: 'Accepted', value: 'accepted' },
  { label: 'Declined', value: 'declined' },
]

export const QUOTE_STATUS_MAP: Record<QuoteStatus, { label: string; colour: string }> = {
  draft:    { label: 'Draft',    colour: 'blue'   },
  sent:     { label: 'Sent',     colour: 'amber'  },
  accepted: { label: 'Accepted', colour: 'green'  },
  declined: { label: 'Declined', colour: 'red'    },
}

export function QuotesPage() {
  const { openSidebar } = useOutletContext<OutletCtx>()
  const navigate = useNavigate()

  const [quotes, setQuotes]         = useState<QuoteWithClient[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)
  const [formOpen, setFormOpen]     = useState(false)
  const [search, setSearch]         = useState('')
  const [statusFilter, setStatus]   = useState<QuoteStatus | 'all'>('all')

  const load = useCallback(() => {
    setLoading(true)
    fetchQuotes()
      .then(setQuotes)
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return quotes.filter((qt) => {
      const matchesSearch =
        !q ||
        qt.quote_number.toLowerCase().includes(q) ||
        qt.clients.full_name.toLowerCase().includes(q)
      const matchesStatus = statusFilter === 'all' || qt.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [quotes, search, statusFilter])

  async function handleAdd(data: QuoteInsert) {
    const quote = await createQuote(data)
    navigate(`/quotes/${quote.id}`)
  }

  async function handleDelete(e: React.MouseEvent, id: string, number: string) {
    e.stopPropagation()
    if (!confirm(`Delete quote ${number}? This cannot be undone.`)) return
    await deleteQuote(id)
    load()
  }

  return (
    <div className="page quotes-page">
      <Header
        title="Quotes"
        onMenuClick={openSidebar}
        actions={
          <button className="btn btn--primary" onClick={() => setFormOpen(true)}>
            <Plus size={16} />
            New quote
          </button>
        }
      />

      <div className="page__content">
        <div className="toolbar">
          <div className="search-box">
            <Search size={16} className="search-box__icon" />
            <input
              className="search-box__input"
              placeholder="Search quotes…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="filter-pills">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                className={`filter-pill ${statusFilter === f.value ? 'filter-pill--active' : ''}`}
                onClick={() => setStatus(f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {loading && <p className="state-msg">Loading quotes…</p>}
        {error && <p className="state-msg state-msg--error">{error}</p>}

        {!loading && !error && filtered.length === 0 && (
          <div className="empty-state">
            <p>{search || statusFilter !== 'all'
              ? 'No quotes match your search.'
              : 'No quotes yet. Create one to send a price estimate to a client.'}</p>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="invoice-list">
            {filtered.map((qt) => (
              <div
                key={qt.id}
                className="invoice-row"
                onClick={() => navigate(`/quotes/${qt.id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && navigate(`/quotes/${qt.id}`)}
              >
                <div className="invoice-row__left">
                  <span className="invoice-row__number">{qt.quote_number}</span>
                  <span className="invoice-row__client">{qt.clients.full_name}</span>
                  <span className="invoice-row__date">Issued {formatDate(qt.issue_date)}</span>
                </div>
                <div className="invoice-row__right">
                  <div className="invoice-row__amounts">
                    <span className="invoice-row__total">{formatCurrency(qt.total_amount)}</span>
                  </div>
                  <StatusBadge status={qt.status} map={QUOTE_STATUS_MAP} />
                  <button
                    className="row-delete-btn"
                    aria-label={`Delete ${qt.quote_number}`}
                    onClick={(e) => handleDelete(e, qt.id, qt.quote_number)}
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
            {filtered.length} {filtered.length === 1 ? 'quote' : 'quotes'}
            {statusFilter !== 'all' || search ? ' shown' : ' total'}
          </p>
        )}
      </div>

      <QuoteForm open={formOpen} onClose={() => setFormOpen(false)} onSubmit={handleAdd} />
    </div>
  )
}
