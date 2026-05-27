import { Check } from 'lucide-react'
import type { OrderStatus } from '../../types/database'

const ORDER_STEPS: { status: OrderStatus; label: string }[] = [
  { status: 'consult',  label: 'Consult'  },
  { status: 'service',  label: 'Service'  },
  { status: 'complete', label: 'Complete' },
  { status: 'delivery', label: 'Delivery' },
]

interface StatusStepperProps {
  current: OrderStatus
  onChange?: (status: OrderStatus) => void
}

export function StatusStepper({ current, onChange }: StatusStepperProps) {
  const currentIdx = ORDER_STEPS.findIndex((s) => s.status === current)

  return (
    <div className="stepper">
      {ORDER_STEPS.map((step, idx) => {
        const done   = idx < currentIdx
        const active = idx === currentIdx
        return (
          <button
            key={step.status}
            className={`stepper__step ${done ? 'stepper__step--done' : ''} ${active ? 'stepper__step--active' : ''}`}
            onClick={() => onChange?.(step.status)}
            disabled={!onChange}
            title={onChange ? `Move to ${step.label}` : step.label}
          >
            <div className="stepper__dot">
              {done ? <Check size={10} strokeWidth={3} /> : <span>{idx + 1}</span>}
            </div>
            <span className="stepper__label">{step.label}</span>
            {idx < ORDER_STEPS.length - 1 && (
              <div className={`stepper__line ${done ? 'stepper__line--done' : ''}`} />
            )}
          </button>
        )
      })}
    </div>
  )
}
