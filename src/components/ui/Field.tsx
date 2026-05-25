import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

interface FieldProps {
  label: string
  error?: string
  required?: boolean
  children: React.ReactNode
}

export function Field({ label, error, required, children }: FieldProps) {
  return (
    <div className="field">
      <label className="field__label">
        {label}
        {required && <span className="field__required" aria-hidden="true"> *</span>}
      </label>
      {children}
      {error && <span className="field__error">{error}</span>}
    </div>
  )
}

type InputProps = InputHTMLAttributes<HTMLInputElement>
export function Input({ className, ...props }: InputProps) {
  return <input className={`input ${className ?? ''}`} {...props} />
}

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>
export function Textarea({ className, ...props }: TextareaProps) {
  return <textarea className={`input input--textarea ${className ?? ''}`} rows={3} {...props} />
}

type SelectProps = SelectHTMLAttributes<HTMLSelectElement>
export function Select({ className, children, ...props }: SelectProps) {
  return (
    <select className={`input input--select ${className ?? ''}`} {...props}>
      {children}
    </select>
  )
}
