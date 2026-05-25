import { useState, useEffect, useCallback } from 'react'
import {
  fetchInvoices,
  fetchInvoice,
  createInvoice,
  updateInvoice,
  markInvoiceSent,
  deleteInvoice,
  fetchPayments,
  recordPayment,
  deletePayment,
  type InvoiceInsert,
  type InvoiceUpdate,
  type InvoiceWithClient,
  type PaymentInsert,
} from '../lib/invoices'
import type { Payment } from '../types/database'

export function useInvoices() {
  const [invoices, setInvoices] = useState<InvoiceWithClient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setInvoices(await fetchInvoices())
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function addInvoice(payload: InvoiceInsert) {
    const created = await createInvoice(payload)
    await load()
    return created
  }

  async function removeInvoice(id: string) {
    await deleteInvoice(id)
    setInvoices((prev) => prev.filter((i) => i.id !== id))
  }

  return { invoices, loading, error, reload: load, addInvoice, removeInvoice }
}

export function useInvoice(id: string) {
  const [invoice, setInvoice] = useState<InvoiceWithClient | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [inv, pays] = await Promise.all([fetchInvoice(id), fetchPayments(id)])
      setInvoice(inv)
      setPayments(pays)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  async function addPayment(payload: Omit<PaymentInsert, 'invoice_id'>) {
    const created = await recordPayment({ ...payload, invoice_id: id })
    setPayments((prev) => [created, ...prev])
    // Reload invoice to get updated totals/status
    const updated = await fetchInvoice(id)
    setInvoice(updated)
    return created
  }

  async function updateInvoiceData(payload: InvoiceUpdate) {
    const updated = await updateInvoice(id, payload)
    setInvoice((prev) => prev ? { ...prev, ...updated } : prev)
    return updated
  }

  async function removePayment(paymentId: string) {
    await deletePayment(paymentId, id)
    setPayments((prev) => prev.filter((p) => p.id !== paymentId))
    const updated = await fetchInvoice(id)
    setInvoice(updated)
  }

  async function sendInvoice() {
    await markInvoiceSent(id)
    setInvoice((prev) => prev ? { ...prev, status: 'sent', sent_at: new Date().toISOString() } : prev)
  }

  return { invoice, payments, loading, error, addPayment, removePayment, updateInvoiceData, sendInvoice, reload: load }
}
