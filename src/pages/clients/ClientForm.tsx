import { useState } from 'react'
import { Modal } from '../../components/ui/Modal'
import { Field, Input, Textarea, Select } from '../../components/ui/Field'
import type { Client, ClientType, SizeSystem } from '../../types/database'
import type { ClientInsert } from '../../lib/clients'

interface ClientFormProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: ClientInsert) => Promise<unknown>
  initial?: Client
}

const SIZE_OPTIONS: Record<SizeSystem, string[]> = {
  'S-XXL': ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'],
  'EU':    ['32', '34', '36', '38', '40', '42', '44', '46', '48', '50', '52'],
  'US':    ['0', '2', '4', '6', '8', '10', '12', '14', '16', '18', '20'],
}

const empty: ClientInsert = {
  full_name:        '',
  email:            '',
  phone:            '',
  address:          '',
  city:             '',
  country:          'South Africa',
  client_type:      'retail',
  size_system:      null,
  clothing_size:    null,
  notes:            '',
  style_preferences: '',
}

function toInsert(c: Client): ClientInsert {
  return {
    full_name:        c.full_name,
    email:            c.email ?? '',
    phone:            c.phone ?? '',
    address:          c.address ?? '',
    city:             c.city ?? '',
    country:          c.country,
    client_type:      c.client_type,
    size_system:      c.size_system ?? null,
    clothing_size:    c.clothing_size ?? null,
    notes:            c.notes ?? '',
    style_preferences: c.style_preferences ?? '',
  }
}

export function ClientForm({ open, onClose, onSubmit, initial }: ClientFormProps) {
  const [form, setForm] = useState<ClientInsert>(initial ? toInsert(initial) : empty)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  function set<K extends keyof ClientInsert>(key: K, value: ClientInsert[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleSizeSystemChange(system: SizeSystem | '') {
    setForm((prev) => ({
      ...prev,
      size_system:   system || null,
      clothing_size: null,   // reset size when system changes
    }))
  }

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    if (!form.full_name.trim()) return
    setSaving(true)
    setError(null)
    try {
      await onSubmit({
        ...form,
        email:            form.email?.trim()             || null,
        phone:            form.phone?.trim()             || null,
        address:          form.address?.trim()           || null,
        city:             form.city?.trim()              || null,
        notes:            form.notes?.trim()             || null,
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

  const sizeChoices = form.size_system ? SIZE_OPTIONS[form.size_system] : []

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Edit client' : 'New client'} width="md">
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
              <option value="custom">Custom</option>
              <option value="made_to_order">Made to Order</option>
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

          {/* Size system + actual size side by side */}
          <Field label="Size system">
            <Select
              value={form.size_system ?? ''}
              onChange={(e) => handleSizeSystemChange(e.target.value as SizeSystem | '')}
            >
              <option value="">Not specified</option>
              <option value="S-XXL">S – XXL</option>
              <option value="EU">European (EU)</option>
              <option value="US">US sizing</option>
            </Select>
          </Field>

          <Field label="Size">
            <Select
              value={form.clothing_size ?? ''}
              onChange={(e) => set('clothing_size', e.target.value || null)}
              disabled={!form.size_system}
            >
              <option value="">
                {form.size_system ? 'Select size…' : 'Pick a system first'}
              </option>
              {sizeChoices.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
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
          <button type="button" className="btn btn--secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn--primary" disabled={saving}>
            {saving ? 'Saving…' : initial ? 'Save changes' : 'Create client'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
