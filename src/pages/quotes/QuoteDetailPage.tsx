import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Pencil, Trash2, Plus, X, Download, Mail } from 'lucide-react'
import { StatusBadge } from '../../components/ui/Badge'
import { QuoteForm } from './QuoteForm'
import { QuoteItemForm } from './QuoteItemForm'
import {
  fetchQuote,
  fetchQuoteItems,
  updateQuote,
  deleteQuote,
  createQuoteItem,
  deleteQuoteItem,
  type QuoteWithClient,
  type QuoteInsert,
  type QuoteItemInsert,
} from '../../lib/quotes'
import { generateQuotePDF } from '../../lib/pdf'
import { formatCurrency, formatDate, VAT_RATE } from '../../utils/format'
import type { QuoteItem, QuoteStatus } from '../../types/database'
import { QUOTE_STATUS_MAP } from './QuotesPage'

const STATUS_OPTIONS: { value: QuoteStatus; label: string }[] = [
  { value: 'draft',    label: 'Draft'    },
  { value: 'sent',     label: 'Sent'     },
  { value: 'accepted', label: 'Accepted' },
  { value: 'declined', label: 'Declined' },
]

export function QuoteDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [quote, setQuote]   = useState<QuoteWithClient | null>(null)
  const [items, setItems]   = useState<QuoteItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState<string | null>(null)
  const [editOpen, setEditOpen]     = useState(false)
  const [itemFormOpen, setItemFormOpen] = useState(false)
  const [deleting, setDeleting]     = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const [q, is] = await Promise.all([fetchQuote(id), fetchQuoteItems(id)])
      setQuote(q)
      setItems(is)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  async function handleDelete() {
    if (!quote) return
    if (!confirm(`Delete quote ${quote.quote_number}? This cannot be undone.`)) return
    setDeleting(true)
    try {
      await deleteQuote(quote.id)
      navigate('/quotes')
    } catch (e) {
      alert((e as Error).message)
      setDeleting(false)
    }
  }

  async function handleStatusChange(status: QuoteStatus) {
    if (!quote) return
    await updateQuote(quote.id, { status })
    setQuote((q) => q ? { ...q, status } : q)
  }

  async function handleEdit(data: QuoteInsert) {
    if (!quote) return
    await updateQuote(quote.id, data)
    await load()
  }

  async function handleAddItem(data: QuoteItemInsert) {
    await createQuoteItem(data)
    await load()
  }

  async function handleRemoveItem(itemId: string) {
    if (!quote) return
    await deleteQuoteItem(itemId, quote.id)
    await load()
  }

  async function handleDownloadPDF() {
    if (!quote) return
    setPdfLoading(true)
    try {
      await generateQuotePDF(quote, items)
    } finally {
      setPdfLoading(false)
    }
  }

  function handleEmailGmail() {
    if (!quote) return
    const subject = encodeURIComponent(`Quote ${quote.quote_number} — TADI wa NASHE`)
    const body = encodeURIComponent(
      `Dear ${quote.clients.full_name},\n\nPlease find your quote attached (${quote.quote_number}).\n\nTotal: ${formatCurrency(quote.total_amount)}\n\nKind regards,\nTadiwanashe\nTADI wa NASHE\n+27 73 928 0572`
    )
    const to = quote.clients.email ? encodeURIComponent(quote.clients.email) : ''
    const url = `https://mail.google.com/mail/?view=cm&fs=1${to ? `&to=${to}` : ''}&su=${subject}&body=${body}`
    window.open(url, '_blank')
  }

  if (loading) return <div className="page"><p className="state-msg">Loading…</p></div>
  if (error || !quote) return <div className="page"><p className="state-msg state-msg--error">{error ?? 'Quote not found.'}</p></div>

  const subtotal = items.reduce((s, i) => s + i.line_total, 0)
  const vat = Math.round(subtotal * VAT_RATE * 100) / 100
  const total = subtotal + vat

  return (
    <div className="page">
      <div className="detail-header">
        <button className="detail-header__back" onClick={() => navigate('/quotes')}>
          <ArrowLeft size={18} />
          Quotes
        </button>
        <div className="detail-header__actions">
          <button
            className="btn btn--secondary"
            onClick={handleDownloadPDF}
            disabled={pdfLoading}
          >
            <Download size={15} />
            {pdfLoading ? 'Generating…' : 'Download PDF'}
          </button>
          <button className="btn btn--secondary" onClick={handleEmailGmail}>
            <Mail size={15} />
            Send via Gmail
          </button>
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
        {/* Quote header card */}
        <div className="detail-card">
          <div className="detail-card__info" style={{ width: '100%' }}>
            <div className="order-detail__title-row">
              <div>
                <h2 className="detail-card__name">{quote.quote_number}</h2>
                <div className="detail-meta">
                  <span>{quote.clients.full_name}</span>
                  <span>Issued {formatDate(quote.issue_date)}</span>
                </div>
              </div>
              <StatusBadge status={quote.status} map={QUOTE_STATUS_MAP} />
            </div>
            {quote.notes && (
              <p className="order-detail__description">{quote.notes}</p>
            )}
          </div>
        </div>

        {/* Status selector */}
        <section className="detail-section">
          <div className="detail-section__heading">
            <h3>Status</h3>
          </div>
          <div className="filter-pills">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className={`filter-pill ${quote.status === opt.value ? 'filter-pill--active' : ''}`}
                onClick={() => handleStatusChange(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </section>

        {/* Line items */}
        <section className="detail-section">
          <div className="detail-section__heading">
            <h3>Items</h3>
            <button className="btn btn--secondary btn--sm" onClick={() => setItemFormOpen(true)}>
              <Plus size={14} />
              Add item
            </button>
          </div>

          {items.length === 0 ? (
            <div className="empty-state empty-state--sm">
              <p>No items added yet. Add items to calculate the quote total.</p>
            </div>
          ) : (
            <>
              <div className="items-table">
                <div className="items-table__head">
                  <span>Description</span>
                  <span>Notes</span>
                  <span className="items-table__num">Qty</span>
                  <span className="items-table__num">Unit price</span>
                  <span className="items-table__num">Total</span>
                  <span />
                </div>
                {items.map((item) => (
                  <div key={item.id} className="items-table__row">
                    <div className="items-table__name">
                      <strong>{item.description}</strong>
                    </div>
                    <div className="items-table__details">
                      {item.notes ?? '—'}
                    </div>
                    <span className="items-table__num">{item.quantity}</span>
                    <span className="items-table__num">{formatCurrency(item.unit_price)}</span>
                    <span className="items-table__num items-table__num--strong">
                      {formatCurrency(item.line_total)}
                    </span>
                    <button
                      className="items-table__del"
                      onClick={() => handleRemoveItem(item.id)}
                      aria-label="Remove item"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>

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
              </div>
            </>
          )}
        </section>
      </div>

      <QuoteForm
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSubmit={handleEdit}
        initial={quote}
      />

      <QuoteItemForm
        open={itemFormOpen}
        quoteId={quote.id}
        onClose={() => setItemFormOpen(false)}
        onSubmit={handleAddItem}
      />
    </div>
  )
}
