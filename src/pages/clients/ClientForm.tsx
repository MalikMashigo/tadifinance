import { useState } from 'react'
import { Modal } from '../../components/ui/Modal'
import { Field, Input, Textarea, Select } from '../../components/ui/Field'
import type { Client, ClientType } from '../../types/database'
import type { ClientInsert } from '../../lib/clients'

interface ClientFormProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: ClientInsert) => Promise<unknown>
  initial?: Client
}

const empty: ClientInsert = {
  full_name: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  country: 'South Africa',
  client_type: 'retail',
  notes: '',
  style_preferences: '',
}

function toInsert(c: Client): ClientInsert {
  return {
    full_name: c.full_name,
    email: c.email ?? '',
    phone: c.phone ?? '',
    address: c.address ?? '',
    city: c.city ?? '',
    country: c.country,
    client_type: c.client_type,
    notes: c.notes ?? '',
    style_preferences: c.style_preferences ?? '',
  }
}

export function ClientForm({ open, onClose, onSubmit, initial }: ClientFormProps) {
  const [form, setForm] = useState<ClientInsert>(initial ? toInsert(initial) : empty)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set<K extends keyof ClientInsert>(key: K, value: ClientInsert[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    if (!form.full_name.trim()) return
    setSaving(true)
    setError(null)
    try {
      await onSubmit({
        ...form,
        email: form.email?.trim() || null,
        phone: form.phone?.trim() || null,
        address: form.address?.trim() || null,
        city: form.city?.trim() || null,
        notes: form.notes?.trim() || null,
        style_preferences: form.style_preferences?.trim() || null,
      } as ClientInsert)
      onClose()
      if (!initial) setForm(empty)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? 'Edit client' : 'New client'}
      width="md"
    >
      <form onSubmit={handleSubmit} className="form">
        <div className="form__grid form__grid--2">
          <Field label="Full name" required>
            <Input
              value={form.full_name}
              onChange={(e) => set('full_name', e.target.value)}
              placeholder="e.g. Naledi Dlamini"
              required
              autoFocus
            />
          </Field>

          <Field label="Client type">
            <Select
              value={form.client_type}
              onChange={(e) => set('client_type', e.target.value as ClientType)}
            >
              <option value="retail">Retail</option>
              <option value="stylist">Stylist</option>
              <option value="media">Media</option>
              <option value="wholesale">Wholesale</option>
            </Select>
          </Field>

          <Field label="Email">
            <Input
              type="email"
              value={form.email ?? ''}
              onChange={(e) => set('email', e.target.value)}
              placeholder="naledi@example.com"
            />
          </Field>

          <Field label="Phone">
            <Input
              type="tel"
              value={form.phone ?? ''}
              onChange={(e) => set('phone', e.target.value)}
              placeholder="+27 82 000 0000"
            />
          </Field>

          <Field label="City">
            <Input
              value={form.city ?? ''}
              onChange={(e) => set('city', e.target.value)}
              placeholder="Johannesburg"
            />
          </Field>

          <Field label="Country">
            <Input
              value={form.country}
              onChange={(e) => set('country', e.target.value)}
            />
          </Field>
        </div>

        <Field label="Address">
          <Input
            value={form.address ?? ''}
            onChange={(e) => set('address', e.target.value)}
            placeholder="Street address"
          />
        </Field>

        <Field label="Style preferences">
          <Textarea
            value={form.style_preferences ?? ''}
            onChange={(e) => set('style_preferences', e.target.value)}
            placeholder="Fabrics, silhouettes, colours she gravitates toward…"
          />
        </Field>

        <Field label="Notes">
          <Textarea
            value={form.notes ?? ''}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="Anything else to remember about this client…"
          />
        </Field>

        {error && <p className="form__error">{error}</p>}

        <div className="form__actions">
          <button type="button" className="btn btn--secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn--primary" disabled={saving}>
            {saving ? 'Saving…' : initial ? 'Save changes' : 'Create client'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
