import { useState, useEffect } from 'react'
import { Modal } from '../../components/ui/Modal'
import { Field, Input, Textarea, Select } from '../../components/ui/Field'
import { supabase } from '../../lib/supabase'
import type { QuoteInsert } from '../../lib/quotes'
import type { QuoteWithClient } from '../../lib/quotes'

interface ClientOption { id: string; full_name: string }

interface QuoteFormProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: QuoteInsert) => Promise<unknown>
  initial?: QuoteWithClient
}

const today = () => new Date().toISOString().slice(0, 10)

export function QuoteForm({ open, onClose, onSubmit, initial }: QuoteFormProps) {
  const [clientId, setClientId]   = useState(initial?.client_id ?? '')
  const [issueDate, setIssueDate] = useState(initial?.issue_date ?? today())
  const [notes, setNotes]         = useState(initial?.notes ?? '')
  const [clients, setClients]     = useState<ClientOption[]>([])
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    supabase
      .from('clients')
      .select('id, full_name')
      .order('full_name')
      .then(({ data }) => setClients((data ?? []) as ClientOption[]))
  }, [open])

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    if (!clientId) return
    setSaving(true)
    setError(null)
    try {
      await onSubmit({
        client_id:  clientId,
        issue_date: issueDate,
        notes:      notes.trim() || null,
      })
      onClose()
      if (!initial) {
        setClientId('')
        setIssueDate(today())
        setNotes('')
      }
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Edit quote' : 'New quote'} width="sm">
      <form onSubmit={handleSubmit} className="form">
        <Field label="Client" required>
          <Select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            required
          >
            <option value="">Select client…</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.full_name}</option>
            ))}
          </Select>
        </Field>

        <Field label="Quote date" required>
          <Input
            type="date"
            value={issueDate}
            onChange={(e) => setIssueDate(e.target.value)}
            required
          />
        </Field>

        <Field label="Notes">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional information for the client…"
          />
        </Field>

        {error && <p className="form__error">{error}</p>}

        <div className="form__actions">
          <button type="button" className="btn btn--secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn--primary" disabled={saving}>
            {saving ? 'Saving…' : initial ? 'Save changes' : 'Create quote'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
