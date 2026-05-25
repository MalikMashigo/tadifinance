import { useState } from 'react'
import { Modal } from '../../components/ui/Modal'
import { Field, Input, Textarea } from '../../components/ui/Field'
import type { MeasurementInsert } from '../../lib/clients'

interface MeasurementFormProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: Omit<MeasurementInsert, 'client_id'>) => Promise<unknown>
}

const empty = {
  bust: '', waist: '', hips: '', shoulder_width: '',
  sleeve_length: '', torso_length: '', inseam: '', notes: '',
}

export function MeasurementForm({ open, onClose, onSubmit }: MeasurementFormProps) {
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set(key: keyof typeof empty, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function toNum(v: string) {
    const n = parseFloat(v)
    return isNaN(n) ? null : n
  }

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await onSubmit({
        bust: toNum(form.bust),
        waist: toNum(form.waist),
        hips: toNum(form.hips),
        shoulder_width: toNum(form.shoulder_width),
        sleeve_length: toNum(form.sleeve_length),
        torso_length: toNum(form.torso_length),
        inseam: toNum(form.inseam),
        notes: form.notes.trim() || null,
      })
      onClose()
      setForm(empty)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Record measurements" width="md">
      <form onSubmit={handleSubmit} className="form">
        <p className="form__hint">All measurements in centimetres (cm)</p>

        <div className="form__grid form__grid--3">
          {([
            ['bust', 'Bust'],
            ['waist', 'Waist'],
            ['hips', 'Hips'],
            ['shoulder_width', 'Shoulder width'],
            ['sleeve_length', 'Sleeve length'],
            ['torso_length', 'Torso length'],
            ['inseam', 'Inseam'],
          ] as const).map(([key, label]) => (
            <Field key={key} label={label}>
              <Input
                type="number"
                step="0.5"
                min="0"
                value={form[key]}
                onChange={(e) => set(key, e.target.value)}
                placeholder="cm"
              />
            </Field>
          ))}
        </div>

        <Field label="Notes">
          <Textarea
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="Any fit notes, alterations, posture observations…"
          />
        </Field>

        {error && <p className="form__error">{error}</p>}

        <div className="form__actions">
          <button type="button" className="btn btn--secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn--primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save measurements'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
