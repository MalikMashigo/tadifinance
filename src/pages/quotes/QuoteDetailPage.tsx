import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Pencil, Trash2, Plus, X, Download, Send } from 'lucide-react'
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
import { generateQuotePDF, getQuotePDFBase64, buildQuoteEmailBody } from '../../lib/pdf'
import { sendEmailWithPDF } from '../../lib/email'
import { formatCurrency, formatDate, VAT_RATE } from '../../utils/format'
import type { QuoteItem, QuoteStatus } from '../../types/database'
import { QUOTE_STATUS_MAP } from './QuotesPage'

type FxCurrency = 'USD' | 'GBP' | 'EUR'
const FX_SYMBOLS: Record<FxCurrency, string> = { USD: '$', GBP: '£', EUR: '€' }

const STATUS_OPTIONS: { value: QuoteStatus; label: string }[] = [
  { value: 'draft',    label: 'Draft'    },
  { value: 'sent',     label: 'Sent'     },
  { value: 'accepted', label: 'Accepted' },
  { value: 'declined', label: 'Declined' },
]

export function QuoteDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [quote, setQuote]       = useState<QuoteWithClient | null>(null)
  const [items, setItems]       = useState<QuoteItem[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [itemFormOpen, setItemFormOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [sending, setSending]   = useState(false)

  // Currency conversion
  const [fxCurrency, setFxCurrency] = useState<FxCurrency | 'ZAR'>('ZAR')
  const [fxRate, setFxRate]         = useState<number | null>(null)
  const [fxLoading, setFxLoading]   = useState(false)
  const [fxError, setFxError]       = useState<string | null>(null)

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

  useEffect(() => {
    if (fxCurrency === 'ZAR') { setFxRate(null); setFxError(null); return }
    setFxLoading(true)
    setFxError(null)
    fetch(`https://api.frankfurter.app/latest?from=ZAR&to=${fxCurrency}`)
      .then((r) => r.json())
      .then((data) => {
        const rate = data?.rates?.[fxCurrency]
        if (typeof rate === 'number') setFxRate(rate)
        else setFxError('Could not load rate')
      })
      .catch(() => setFxError('Could not load rate'))
      .finally(() => setFxLoading(false))
  }, [fxCurrency])

  function fxFormat(zarAmount: number): string {
    if (!fxRate || fxCurrency === 'ZAR') return formatCurrency(zarAmount)
    const symbol = FX_SYMBOLS[fxCurrency]
    return `${symbol}${(zarAmount * fxRate).toFixed(2)}`
  }

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
    // Mark as sent when status changes to sent
    if (status === 'sent') {
      await updateQuote(quote.id, { status, sent_at: new Date().toISOString() })
    }
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

  async function handleSend() {
    if (!quote) return
    if (!quote.clients.email) {
      alert('This client has no email address on file.')
      return
    }

    setSending(true)
    try {
      const [pdfBase64, html] = await Promise.all([
        getQuotePDFBase64(quote, items),
        Promise.resolve(buildQuoteEmailBody(quote, items)),
      ])
      await sendEmailWithPDF({
        to: quote.clients.email,
        subject: `Quote ${quote.quote_number}: TADI wa NASHE`,
        html,
        pdfBase64,
        pdfFilename: `${quote.quote_number}.pdf`,
      })
      alert(`Quote sent to ${quote.clients.email}`)
      if (quote.status === 'draft') await handleStatusChange('sent')
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setSending(false)
    }
  }

  if (loading) return <div className="page"><p className="state-msg">Loading…</p></div>
  if (error || !quote) return <div className="page"><p className="state-msg state-msg--error">{error ?? 'Quote not found.'}</p></div>

  const subtotal = items.reduce((s, i) => s + i.line_total, 0)
  const vat   = Math.round(subtotal * VAT_RATE * 100) / 100
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
            onClick={() => { if (quote) generateQuotePDF(quote, items) }}
          >
            <Download size={15} />
            PDF
          </button>
          <button className="btn btn--secondary" onClick={handleSend} disabled={sending}>
            <Send size={15} />
            {sending ? 'Preparing…' : 'Send'}
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
        <div className="invoice-header-card">
          <div className="invoice-header-card__top">
            <div>
              <h2 className="invoice-header-card__number">{quote.quote_number}</h2>
              <div className="detail-meta">
                <span className="detail-meta__link"
                  style={{ cursor: 'default' }}>{quote.clients.full_name}</span>
                {quote.clients.email && <span>{quote.clients.email}</span>}
                {quote.clients.phone && <span>{quote.clients.phone}</span>}
              </div>
            </div>
            <StatusBadge status={quote.status} map={QUOTE_STATUS_MAP} />
          </div>

          <div className="invoice-header-card__dates">
            <div className="invoice-date-pill">
              <span className="invoice-date-pill__label">Issued</span>
              <span className="invoice-date-pill__value">{formatDate(quote.issue_date)}</span>
            </div>
            {quote.sent_at && (
              <div className="invoice-date-pill">
                <span className="invoice-date-pill__label">Sent</span>
                <span className="invoice-date-pill__value">{formatDate(quote.sent_at)}</span>
              </div>
            )}
          </div>

          {quote.notes && (
            <p className="detail-card__notes" style={{ marginTop: '0.75rem' }}>{quote.notes}</p>
          )}
        </div>

        {/* Status */}
        <section className="detail-section">
          <div className="detail-section__heading"><h3>Status</h3></div>
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
              </div>

              {/* Currency converter */}
              <div className="fx-converter">
                <div className="fx-converter__toggle">
                  <span className="fx-converter__label">View in</span>
                  <select
                    className="fx-converter__select"
                    value={fxCurrency}
                    onChange={(e) => setFxCurrency(e.target.value as FxCurrency | 'ZAR')}
                  >
                    <option value="ZAR">ZAR (South African Rand)</option>
                    <option value="USD">USD (US Dollar)</option>
                    <option value="GBP">GBP (British Pound)</option>
                    <option value="EUR">EUR (Euro)</option>
                  </select>
                </div>

                {fxCurrency !== 'ZAR' && (
                  <div className="fx-converter__panel">
                    {fxLoading && <p className="fx-converter__status">Fetching rate…</p>}
                    {fxError  && <p className="fx-converter__status fx-converter__status--error">{fxError}</p>}
                    {fxRate && !fxLoading && (
                      <>
                        <p className="fx-converter__rate">
                          1 ZAR = {FX_SYMBOLS[fxCurrency]}{fxRate.toFixed(4)} {fxCurrency}
                        </p>
                        <div className="fx-totals">
                          <div className="fx-totals__row">
                            <span>Subtotal</span><span>{fxFormat(subtotal)}</span>
                          </div>
                          <div className="fx-totals__row">
                            <span>VAT</span><span>{fxFormat(vat)}</span>
                          </div>
                          <div className="fx-totals__row fx-totals__row--total">
                            <span>Total</span><span>{fxFormat(total)}</span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
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
