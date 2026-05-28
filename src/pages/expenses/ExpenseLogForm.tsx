import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Field, Input, Textarea, Select } from '../../components/ui/Field'
import {
  CATEGORY_LABELS,
  DEFAULT_UNIT_TYPES,
  SUBSECTION_LABELS,
  createExpenseLog,
  type ExpenseLogInsert,
} from '../../lib/expenses'
import { formatCurrency } from '../../utils/format'
import type { ExpenseCategory, ExpenseSubsection, ExpenseUnitType } from '../../types/database'

// ── Full item (non-shoots subsections) ────────────────────────────────────────
interface FullItem {
  category: ExpenseCategory
  description: string
  unitType: ExpenseUnitType
  qty: string
  price: string
  supplier: string
}

// ── Simple item (shoots — just description + cost) ────────────────────────────
interface SimpleItem {
  description: string
  amount: string
}

const UNIT_LABELS: Record<ExpenseUnitType, { qty: string; price: string }> = {
  unit:  { qty: 'Quantity',  price: 'Price each (R)'      },
  metre: { qty: 'Metres',    price: 'Price per metre (R)' },
  hour:  { qty: 'Hours',     price: 'Rate per hour (R)'   },
}

function newFull(category: ExpenseCategory = 'fabric'): FullItem {
  return { category, description: '', unitType: DEFAULT_UNIT_TYPES[category], qty: '', price: '', supplier: '' }
}

function newSimple(): SimpleItem {
  return { description: '', amount: '' }
}

function fullAmount(item: FullItem): number {
  const qty   = parseFloat(item.qty)
  const price = parseFloat(item.price)
  if (isNaN(qty) || isNaN(price)) return 0
  return Math.round(qty * price * 100) / 100
}

interface Props {
  open: boolean
  subsection: ExpenseSubsection
  onClose: () => void
  onSaved: () => void
}

export function ExpenseLogForm({ open, subsection, onClose, onSaved }: Props) {
  const isSimple = subsection === 'shoots' || subsection === 'studio'

  const [logDate, setLogDate]   = useState(() => new Date().toISOString().slice(0, 10))
  const [referenceName, setRef] = useState('')
  const [notes, setNotes]       = useState('')
  const [fullItems, setFull]    = useState<FullItem[]>([newFull()])
  const [simpleItems, setSimple]= useState<SimpleItem[]>([newSimple()])
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState<string | null>(null)

  // ── Full item helpers ──────────────────────────────────────────────────────
  function addFull() { setFull((p) => [...p, newFull()]) }
  function removeFull(idx: number) { setFull((p) => p.filter((_, i) => i !== idx)) }
  function updateFull<K extends keyof FullItem>(idx: number, field: K, value: FullItem[K]) {
    setFull((p) => p.map((item, i) => {
      if (i !== idx) return item
      const updated = { ...item, [field]: value }
      if (field === 'category') updated.unitType = DEFAULT_UNIT_TYPES[value as ExpenseCategory]
      return updated
    }))
  }

  // ── Simple item helpers ────────────────────────────────────────────────────
  function addSimple() { setSimple((p) => [...p, newSimple()]) }
  function removeSimple(idx: number) { setSimple((p) => p.filter((_, i) => i !== idx)) }
  function updateSimple<K extends keyof SimpleItem>(idx: number, field: K, value: SimpleItem[K]) {
    setSimple((p) => p.map((item, i) => i === idx ? { ...item, [field]: value } : item))
  }

  const runningTotal = isSimple
    ? simpleItems.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0)
    : fullItems.reduce((s, i) => s + fullAmount(i), 0)

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    setError(null)

    if (isSimple) {
      for (const item of simpleItems) {
        if (!item.description.trim()) { setError('Every item needs a description.'); return }
        if (isNaN(parseFloat(item.amount)) || parseFloat(item.amount) < 0) {
          setError('Enter a valid amount for all items.'); return
        }
      }
    } else {
      for (const item of fullItems) {
        if (!item.description.trim()) { setError('Every item needs a description.'); return }
        const qty   = parseFloat(item.qty)
        const price = parseFloat(item.price)
        if (isNaN(qty) || qty <= 0)    { setError('Enter a valid quantity for all items.'); return }
        if (isNaN(price) || price < 0) { setError('Enter a valid price for all items.'); return }
      }
    }

    setSaving(true)
    try {
      const payload: ExpenseLogInsert = {
        subsection,
        log_date: logDate,
        reference_name: referenceName.trim() || null,
        notes: notes.trim() || null,
        total_amount: runningTotal,
      }

      const itemPayloads = isSimple
        ? simpleItems.map((item) => ({
            category:      'accessories' as ExpenseCategory,
            description:   item.description.trim(),
            unit_type:     'unit' as ExpenseUnitType,
            unit_quantity: null as number | null,
            unit_price:    null as number | null,
            amount:        parseFloat(item.amount),
            supplier:      null as string | null,
            notes:         null as string | null,
          }))
        : fullItems.map((item) => ({
            category:      item.category,
            description:   item.description.trim(),
            unit_type:     item.unitType,
            unit_quantity: parseFloat(item.qty),
            unit_price:    parseFloat(item.price),
            amount:        fullAmount(item),
            supplier:      item.supplier.trim() || null,
            notes:         null as string | null,
          }))

      await createExpenseLog(payload, itemPayloads)

      setLogDate(new Date().toISOString().slice(0, 10))
      setRef('')
      setNotes('')
      setFull([newFull()])
      setSimple([newSimple()])
      onSaved()
      onClose()
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
      title={`Log expense — ${SUBSECTION_LABELS[subsection]}`}
      width="md"
    >
      <form onSubmit={handleSubmit} className="form">
        <div className="form__grid form__grid--2">
          <Field label="Date" required>
            <Input
              type="date"
              value={logDate}
              onChange={(e) => setLogDate(e.target.value)}
              required
            />
          </Field>
          <Field label="Reference (optional)">
            <Input
              value={referenceName}
              onChange={(e) => setRef(e.target.value)}
              placeholder={
                subsection === 'clients'         ? 'e.g. Naledi Dlamini' :
                subsection === 'collections'     ? 'e.g. SS25 Collection' :
                subsection === 'shoots'          ? 'e.g. Lookbook shoot' :
                subsection === 'cmt'             ? 'e.g. Factory run' :
                subsection === 'passion_projects'? 'e.g. Project name' :
                'Optional label'
              }
            />
          </Field>
        </div>

        <div className="expense-items-section">
          <div className="expense-items-section__head">
            <span className="expense-items-section__label">Items</span>
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={isSimple ? addSimple : addFull}
            >
              <Plus size={13} />
              Add item
            </button>
          </div>

          {/* ── Simple mode (Shoots) ── */}
          {isSimple && simpleItems.map((item, idx) => (
            <div key={idx} className="expense-item-block">
              <div className="expense-item-block__header">
                <span className="expense-item-block__num">Item {idx + 1}</span>
                {simpleItems.length > 1 && (
                  <button
                    type="button"
                    className="expense-item-block__remove"
                    onClick={() => removeSimple(idx)}
                    aria-label="Remove item"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <Field label="What is this expense for?" required>
                <Input
                  value={item.description}
                  onChange={(e) => updateSimple(idx, 'description', e.target.value)}
                  placeholder="e.g. Photographer fee, Studio hire, Props…"
                  required
                  autoFocus={idx === 0}
                />
              </Field>

              <Field label="Cost (R)" required>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={item.amount}
                  onChange={(e) => updateSimple(idx, 'amount', e.target.value)}
                  placeholder="0.00"
                  required
                />
              </Field>
            </div>
          ))}

          {/* ── Full mode (all other subsections) ── */}
          {!isSimple && fullItems.map((item, idx) => {
            const labels = UNIT_LABELS[item.unitType]
            const lineTotal = fullAmount(item)
            return (
              <div key={idx} className="expense-item-block">
                <div className="expense-item-block__header">
                  <span className="expense-item-block__num">Item {idx + 1}</span>
                  {fullItems.length > 1 && (
                    <button
                      type="button"
                      className="expense-item-block__remove"
                      onClick={() => removeFull(idx)}
                      aria-label="Remove item"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <div className="form__grid form__grid--2">
                  <Field label="Category">
                    <Select
                      value={item.category}
                      onChange={(e) => updateFull(idx, 'category', e.target.value as ExpenseCategory)}
                    >
                      {(Object.entries(CATEGORY_LABELS) as [ExpenseCategory, string][]).map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Priced by">
                    <Select
                      value={item.unitType}
                      onChange={(e) => updateFull(idx, 'unitType', e.target.value as ExpenseUnitType)}
                    >
                      <option value="unit">Per unit</option>
                      <option value="metre">Per metre</option>
                      <option value="hour">Per hour</option>
                    </Select>
                  </Field>
                </div>

                <Field label="Description" required>
                  <Input
                    value={item.description}
                    onChange={(e) => updateFull(idx, 'description', e.target.value)}
                    placeholder={
                      item.category === 'fabric'      ? 'e.g. Duchess satin, ivory' :
                      item.category === 'trims'       ? 'e.g. Gold zippers 22cm' :
                      item.category === 'labour'      ? 'e.g. Cutting & sewing' :
                      item.category === 'accessories' ? 'e.g. Gold chain belt' :
                      'Description'
                    }
                    required
                  />
                </Field>

                <div className="form__grid form__grid--3">
                  <Field label={labels.qty} required>
                    <Input
                      type="number"
                      min={0}
                      step="any"
                      value={item.qty}
                      onChange={(e) => updateFull(idx, 'qty', e.target.value)}
                      placeholder="0"
                      required
                    />
                  </Field>
                  <Field label={labels.price} required>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={item.price}
                      onChange={(e) => updateFull(idx, 'price', e.target.value)}
                      placeholder="0.00"
                      required
                    />
                  </Field>
                  <Field label="Line total">
                    <div className="expense-line-total">
                      {lineTotal > 0 ? formatCurrency(lineTotal) : '—'}
                    </div>
                  </Field>
                </div>

                <Field label="Supplier (optional)">
                  <Input
                    value={item.supplier}
                    onChange={(e) => updateFull(idx, 'supplier', e.target.value)}
                    placeholder="e.g. Fabric World, Joburg"
                  />
                </Field>
              </div>
            )
          })}
        </div>

        <Field label="Notes (optional)">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any additional notes for this expense log…"
          />
        </Field>

        <div className="expense-log-total">
          <span>Log total</span>
          <strong>{formatCurrency(runningTotal)}</strong>
        </div>

        {error && <p className="form__error">{error}</p>}

        <div className="form__actions">
          <button type="button" className="btn btn--secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn--primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save log'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
