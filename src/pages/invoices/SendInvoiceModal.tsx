import { useState, useMemo } from 'react'
import { Send, Download, Eye, Edit2, Loader } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { buildEmailBody, getInvoicePDFBase64, generateInvoicePDF } from '../../lib/pdf'
import { sendEmailWithPDF } from '../../lib/email'
import { formatCurrency, formatDate } from '../../utils/format'
import type { InvoiceWithClient } from '../../lib/invoices'
import type { OrderItem, Payment } from '../../types/database'

interface Props {
  open: boolean
  onClose: () => void
  onSent: () => void
  invoice: InvoiceWithClient
  items: OrderItem[]
  payments: Payment[]
}

type Tab = 'preview' | 'edit'

export function SendInvoiceModal({ open, onClose, onSent, invoice, items, payments }: Props) {
  const [tab, setTab]         = useState<Tab>('preview')
  const [to, setTo]           = useState(invoice.clients.email ?? '')
  const [subject, setSubject] = useState(`Invoice ${invoice.invoice_number}: TADI wa NASHE`)
  const [sending, setSending] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [sent, setSent]       = useState(false)

  const htmlBody = useMemo(() => buildEmailBody(invoice, items), [invoice, items])

  async function handleSend() {
    if (!to.trim()) { setError('Please enter a recipient email address.'); return }
    setError(null)
    setSending(true)
    try {
      const pdfBase64 = await getInvoicePDFBase64(invoice, items, payments)
      await sendEmailWithPDF({ to: to.trim(), subject, html: htmlBody, pdfBase64, pdfFilename: `${invoice.invoice_number}.pdf` })
      setSent(true)
      setTimeout(() => { onSent(); onClose() }, 1500)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSending(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Send invoice" width="lg">
      <div className="send-invoice-modal">

        {/* ── Summary strip ── */}
        <div className="send-invoice-modal__strip">
          <span className="send-invoice-modal__strip-number">{invoice.invoice_number}</span>
          <span className="send-invoice-modal__strip-sep">·</span>
          <span>{invoice.clients.full_name}</span>
          <span className="send-invoice-modal__strip-sep">·</span>
          <span>Due {formatDate(invoice.due_date)}</span>
          <span className="send-invoice-modal__strip-sep">·</span>
          <strong>{formatCurrency(invoice.total_amount)}</strong>
        </div>

        {/* ── Tabs ── */}
        <div className="send-invoice-modal__tabs">
          <button
            className={`send-invoice-modal__tab ${tab === 'preview' ? 'send-invoice-modal__tab--active' : ''}`}
            onClick={() => setTab('preview')}
          >
            <Eye size={14} /> Preview
          </button>
          <button
            className={`send-invoice-modal__tab ${tab === 'edit' ? 'send-invoice-modal__tab--active' : ''}`}
            onClick={() => setTab('edit')}
          >
            <Edit2 size={14} /> Edit details
          </button>
        </div>

        {/* ── Preview pane ── */}
        {tab === 'preview' && (
          <div className="send-invoice-modal__preview-wrap">
            <iframe
              srcDoc={htmlBody}
              title="Email preview"
              className="send-invoice-modal__preview"
              sandbox="allow-same-origin"
            />
          </div>
        )}

        {/* ── Edit pane ── */}
        {tab === 'edit' && (
          <div className="send-invoice-modal__fields">
            <div className="field">
              <label className="field__label">To</label>
              <input
                className="input"
                type="email"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="client@email.com"
              />
            </div>
            <div className="field">
              <label className="field__label">Subject</label>
              <input
                className="input"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
            <p className="send-invoice-modal__attach-note">
              The invoice PDF will be attached automatically.
            </p>
          </div>
        )}

        {/* ── Error ── */}
        {error && <p className="form__error">{error}</p>}

        {/* ── Actions ── */}
        <div className="send-invoice-modal__actions">
          <button
            className="btn btn--secondary"
            onClick={() => generateInvoicePDF(invoice, items, payments)}
          >
            <Download size={15} /> Download PDF
          </button>
          <div style={{ flex: 1 }} />
          <button className="btn btn--secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn--primary" onClick={handleSend} disabled={sending || sent}>
            {sent ? (
              'Sent!'
            ) : sending ? (
              <><Loader size={15} className="spin" /> Sending…</>
            ) : (
              <><Send size={15} /> Send to client</>
            )}
          </button>
        </div>
      </div>
    </Modal>
  )
}
