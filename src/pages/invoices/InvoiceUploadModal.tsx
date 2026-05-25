import { useState, useEffect, useRef } from 'react'
import { UploadCloud, FileText, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Field, Input, Select } from '../../components/ui/Field'
import { extractInvoiceFromFile, type ExtractedInvoice } from '../../lib/extractInvoice'
import { importInvoice } from '../../lib/invoices'
import { searchClients, createClient } from '../../lib/clients'
import { formatCurrency } from '../../utils/format'
import type { Client } from '../../types/database'

interface Props {
  open: boolean
  onClose: () => void
  onImported: () => void
}

type Step = 'upload' | 'review'

function today() { return new Date().toISOString().split('T')[0] }
function thirtyDaysOut() {
  const d = new Date(); d.setDate(d.getDate() + 30)
  return d.toISOString().split('T')[0]
}

export function InvoiceUploadModal({ open, onClose, onImported }: Props) {
  const [step, setStep] = useState<Step>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [extractError, setExtractError] = useState<string | null>(null)

  // Review form state
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [clientQuery, setClientQuery] = useState('')
  const [clientMatches, setClientMatches] = useState<Client[]>([])
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [issueDate, setIssueDate] = useState(today())
  const [dueDate, setDueDate] = useState(thirtyDaysOut())
  const [status, setStatus] = useState<'draft' | 'sent' | 'paid' | 'overdue' | 'partially_paid'>('sent')
  const [subtotal, setSubtotal] = useState('')
  const [vatAmount, setVatAmount] = useState('')
  const [totalAmount, setTotalAmount] = useState('')
  const [amountPaid, setAmountPaid] = useState('0')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!open) {
      setStep('upload')
      setFile(null)
      setExtractError(null)
      setExtractError(null)
      setSaveError(null)
    }
  }, [open])

  // Debounced client search
  useEffect(() => {
    if (selectedClient) return
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(async () => {
      if (clientQuery.length >= 2) {
        const results = await searchClients(clientQuery).catch(() => [])
        setClientMatches(results)
      } else {
        setClientMatches([])
      }
    }, 250)
  }, [clientQuery, selectedClient])

  function applyExtracted(data: ExtractedInvoice) {
    setInvoiceNumber(data.invoice_number ?? '')
    setClientQuery(data.client_name ?? '')
    setIssueDate(data.issue_date ?? today())
    setDueDate(data.due_date ?? thirtyDaysOut())
    setStatus(data.status ?? 'sent')
    setSubtotal(data.subtotal != null ? String(data.subtotal) : '')
    setVatAmount(data.vat_amount != null ? String(data.vat_amount) : '')
    setTotalAmount(data.total_amount != null ? String(data.total_amount) : '')
    setAmountPaid(String(data.amount_paid ?? 0))
    setNotes(data.notes ?? '')
    setSelectedClient(null)
  }

  function handleFile(f: File) {
    setFile(f)
    setExtractError(null)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  async function handleExtract() {
    if (!file) return
    setExtracting(true)
    setExtractError(null)
    try {
      const data = await extractInvoiceFromFile(file)
      applyExtracted(data)
      setStep('review')
    } catch (e) {
      setExtractError((e as Error).message)
    } finally {
      setExtracting(false)
    }
  }

  function handleSkipExtract() {
    setStep('review')
  }

  async function handleImport() {
    if (!clientQuery.trim()) { setSaveError('Enter a client name.'); return }
    const total = parseFloat(totalAmount)
    if (!total || total <= 0) { setSaveError('Enter a valid total amount.'); return }

    setSaving(true)
    setSaveError(null)
    try {
      let clientId: string

      if (selectedClient) {
        clientId = selectedClient.id
      } else {
        // Find close match or create
        const matches = await searchClients(clientQuery)
        const exact = matches.find(
          (c) => c.full_name.toLowerCase() === clientQuery.toLowerCase()
        )
        if (exact) {
          clientId = exact.id
        } else {
          const created = await createClient({
            full_name: clientQuery.trim(),
            email: null,
            phone: null,
            address: null,
            city: null,
            country: 'ZA',
            client_type: 'retail',
            notes: null,
            style_preferences: null,
          })
          clientId = created.id
        }
      }

      const sub = parseFloat(subtotal) || 0
      const vat = parseFloat(vatAmount) || 0
      const paid = parseFloat(amountPaid) || 0

      await importInvoice({
        client_id: clientId,
        order_id: null,
        status,
        issue_date: issueDate,
        due_date: dueDate,
        subtotal: sub || total,
        vat_amount: vat,
        total_amount: total,
        balance_due: Math.max(0, total - paid),
        notes: notes.trim() || null,
        invoice_number_override: invoiceNumber,
        amount_paid: paid,
      })

      onImported()
      onClose()
    } catch (e) {
      setSaveError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const balanceDue = Math.max(0, (parseFloat(totalAmount) || 0) - (parseFloat(amountPaid) || 0))

  return (
    <Modal open={open} onClose={onClose} title="Import existing invoice" width="md">
      {step === 'upload' && (
        <div className="upload-modal">
          <div
            className={`upload-dropzone ${dragging ? 'upload-dropzone--drag' : ''} ${file ? 'upload-dropzone--has-file' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => !file && fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              style={{ display: 'none' }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
            />
            {file ? (
              <div className="upload-dropzone__file">
                <FileText size={28} className="upload-dropzone__file-icon" />
                <span className="upload-dropzone__filename">{file.name}</span>
                <button
                  className="upload-dropzone__change"
                  onClick={(e) => { e.stopPropagation(); setFile(null); setExtractError(null) }}
                >
                  Change file
                </button>
              </div>
            ) : (
              <div className="upload-dropzone__prompt">
                <UploadCloud size={32} className="upload-dropzone__icon" />
                <p className="upload-dropzone__label">Drop a PDF or image here</p>
                <p className="upload-dropzone__sub">or click to browse · PDF, JPG, PNG</p>
              </div>
            )}
          </div>

          {extractError && (
            <div className="upload-error">
              <AlertCircle size={15} />
              <span>{extractError}</span>
            </div>
          )}

          <div className="form__actions">
            <button className="btn btn--secondary" onClick={onClose}>Cancel</button>
            <button className="btn btn--secondary" onClick={handleSkipExtract} disabled={extracting}>
              Enter manually
            </button>
            <button
              className="btn btn--primary"
              onClick={handleExtract}
              disabled={!file || extracting}
            >
              {extracting
                ? <><Loader2 size={15} className="spin" /> Extracting…</>
                : 'Extract with AI'}
            </button>
          </div>
        </div>
      )}

      {step === 'review' && (
        <div className="form">
          {file && (
            <div className="upload-source-badge">
              <CheckCircle2 size={14} />
              <span>Data extracted from <strong>{file.name}</strong> — review and confirm below.</span>
            </div>
          )}

          <div className="form__grid form__grid--2">
            <Field label="Invoice number">
              <Input
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="e.g. INV-2024-001 (auto if blank)"
              />
            </Field>

            <Field label="Status" required>
              <Select value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
                <option value="sent">Sent</option>
                <option value="partially_paid">Partially paid</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
                <option value="draft">Draft</option>
              </Select>
            </Field>
          </div>

          {/* Client picker */}
          <Field label="Client" required>
            <div className="upload-client-field">
              <Input
                value={selectedClient ? selectedClient.full_name : clientQuery}
                onChange={(e) => {
                  setSelectedClient(null)
                  setClientQuery(e.target.value)
                }}
                placeholder="Client name"
                autoComplete="off"
              />
              {selectedClient && (
                <div className="upload-client-selected">
                  <CheckCircle2 size={13} />
                  <span>Existing client matched</span>
                  <button className="upload-client-clear" onClick={() => { setSelectedClient(null) }}>×</button>
                </div>
              )}
              {!selectedClient && clientMatches.length > 0 && (
                <div className="upload-client-matches">
                  {clientMatches.map((c) => (
                    <button
                      key={c.id}
                      className="upload-client-match"
                      onClick={() => { setSelectedClient(c); setClientQuery(c.full_name) }}
                    >
                      {c.full_name}
                      {c.email && <span className="upload-client-match__email">{c.email}</span>}
                    </button>
                  ))}
                </div>
              )}
              {!selectedClient && clientQuery.length >= 2 && clientMatches.length === 0 && (
                <p className="upload-client-hint">No existing client found — will create "{clientQuery}"</p>
              )}
            </div>
          </Field>

          <div className="form__grid form__grid--2">
            <Field label="Issue date" required>
              <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} required />
            </Field>
            <Field label="Due date" required>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
            </Field>
          </div>

          <div className="form__grid form__grid--2">
            <Field label="Subtotal (ZAR)">
              <Input
                type="number" min="0" step="0.01"
                value={subtotal}
                onChange={(e) => setSubtotal(e.target.value)}
                placeholder="0.00"
              />
            </Field>
            <Field label="VAT amount (ZAR)">
              <Input
                type="number" min="0" step="0.01"
                value={vatAmount}
                onChange={(e) => setVatAmount(e.target.value)}
                placeholder="0.00"
              />
            </Field>
          </div>

          <div className="form__grid form__grid--2">
            <Field label="Total amount (ZAR)" required>
              <Input
                type="number" min="0.01" step="0.01"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                placeholder="0.00"
                required
              />
            </Field>
            <Field label="Amount already paid (ZAR)">
              <Input
                type="number" min="0" step="0.01"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                placeholder="0.00"
              />
            </Field>
          </div>

          {parseFloat(totalAmount) > 0 && (
            <div className="upload-balance-preview">
              <span>Balance due after import</span>
              <strong className={balanceDue > 0 ? 'upload-balance-preview--owed' : 'upload-balance-preview--clear'}>
                {formatCurrency(balanceDue)}
              </strong>
            </div>
          )}

          <Field label="Notes (optional)">
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Payment terms, references…"
            />
          </Field>

          {saveError && <p className="form__error">{saveError}</p>}

          <div className="form__actions">
            <button className="btn btn--secondary" onClick={() => setStep('upload')}>Back</button>
            <button
              className="btn btn--primary"
              onClick={handleImport}
              disabled={saving}
            >
              {saving ? 'Importing…' : 'Import invoice'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
