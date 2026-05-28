import { supabase } from './supabase'
import type { Invoice, InvoiceItem, Payment, InvoiceStatus } from '../types/database'

export interface InvoiceItemInsert {
  invoice_id: string
  description: string
  quantity: number
  unit_price: number
  notes: string | null
}

export async function fetchInvoiceItems(invoiceId: string): Promise<InvoiceItem[]> {
  const { data, error } = await supabase
    .from('invoice_items')
    .select('*')
    .eq('invoice_id', invoiceId)
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as InvoiceItem[]
}

export async function createInvoiceItem(payload: InvoiceItemInsert): Promise<InvoiceItem> {
  const lineTotal = Math.round(payload.quantity * payload.unit_price * 100) / 100
  const { data, error } = await supabase
    .from('invoice_items')
    .insert({ ...payload, line_total: lineTotal })
    .select()
    .single()
  if (error) throw new Error(error.message)
  await recalcInvoiceTotals(payload.invoice_id)
  return data as InvoiceItem
}

export async function createInvoiceItems(payloads: InvoiceItemInsert[]): Promise<void> {
  if (payloads.length === 0) return
  const rows = payloads.map((p) => ({
    ...p,
    line_total: Math.round(p.quantity * p.unit_price * 100) / 100,
  }))
  const { error } = await supabase.from('invoice_items').insert(rows)
  if (error) throw new Error(error.message)
  await recalcInvoiceTotals(payloads[0].invoice_id)
}

export async function deleteInvoiceItem(itemId: string, invoiceId: string): Promise<void> {
  const { error } = await supabase.from('invoice_items').delete().eq('id', itemId)
  if (error) throw new Error(error.message)
  await recalcInvoiceTotals(invoiceId)
}

export async function recalcInvoiceTotals(invoiceId: string): Promise<void> {
  const items = await fetchInvoiceItems(invoiceId)
  const subtotal = Math.round(items.reduce((s, i) => s + i.line_total, 0) * 100) / 100
  const vat      = Math.round(subtotal * 0.15 * 100) / 100
  const total    = Math.round((subtotal + vat) * 100) / 100

  const { data: inv } = await supabase
    .from('invoices').select('amount_paid').eq('id', invoiceId).single()
  const amountPaid = (inv as { amount_paid: number } | null)?.amount_paid ?? 0
  const balanceDue = Math.max(0, total - amountPaid)
  const status: InvoiceStatus = balanceDue === 0 && total > 0 ? 'paid' : amountPaid > 0 ? 'partially_paid' : 'sent'

  const { error } = await supabase
    .from('invoices')
    .update({ subtotal, vat_amount: vat, total_amount: total, balance_due: balanceDue, status })
    .eq('id', invoiceId)
  if (error) throw new Error(error.message)
}

export type InvoiceInsert = Omit<Invoice, 'id' | 'created_at' | 'invoice_number' | 'amount_paid' | 'sent_at'>
export type InvoiceUpdate = Partial<Omit<Invoice, 'id' | 'created_at' | 'invoice_number'>>
export type PaymentInsert = Omit<Payment, 'id' | 'created_at'>

export interface InvoiceWithClient extends Invoice {
  clients: { full_name: string; email: string | null }
}

export async function generateInvoiceNumber(): Promise<string> {
  const { data, error } = await supabase.rpc('generate_invoice_number')
  if (error) throw error
  return data as string
}

export async function fetchInvoices(): Promise<InvoiceWithClient[]> {
  const { data, error } = await supabase
    .from('invoices')
    .select('*, clients(full_name, email)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as InvoiceWithClient[]
}

export async function fetchInvoice(id: string): Promise<InvoiceWithClient> {
  const { data, error } = await supabase
    .from('invoices')
    .select('*, clients(full_name, email)')
    .eq('id', id)
    .single()
  if (error) throw error
  return data as InvoiceWithClient
}

export async function createInvoice(payload: InvoiceInsert): Promise<Invoice> {
  const invoiceNumber = await generateInvoiceNumber()
  const { data, error } = await supabase
    .from('invoices')
    .insert({ ...payload, invoice_number: invoiceNumber, amount_paid: 0 })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateInvoice(id: string, payload: InvoiceUpdate): Promise<Invoice> {
  const { data, error } = await supabase
    .from('invoices')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function markInvoiceSent(id: string): Promise<void> {
  const { error } = await supabase
    .from('invoices')
    .update({ status: 'sent' as InvoiceStatus, sent_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function importInvoice(
  payload: InvoiceInsert & { invoice_number_override?: string; amount_paid?: number }
): Promise<Invoice> {
  const invoiceNumber = payload.invoice_number_override?.trim() || await generateInvoiceNumber()
  const amountPaid = payload.amount_paid ?? 0
  const balanceDue = Math.max(0, (payload.total_amount ?? 0) - amountPaid)
  const { data, error } = await supabase
    .from('invoices')
    .insert({
      ...payload,
      invoice_number: invoiceNumber,
      amount_paid: amountPaid,
      balance_due: balanceDue,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteInvoice(id: string): Promise<void> {
  const { error } = await supabase.from('invoices').delete().eq('id', id)
  if (error) throw error
}

export async function deletePayment(paymentId: string, invoiceId: string): Promise<void> {
  const { error } = await supabase.from('payments').delete().eq('id', paymentId)
  if (error) throw error

  const { data: allPayments, error: paymentsError } = await supabase
    .from('payments').select('amount').eq('invoice_id', invoiceId)
  if (paymentsError) throw paymentsError

  const totalPaid = (allPayments ?? []).reduce((s: number, p: { amount: number }) => s + p.amount, 0)

  const { data: inv, error: invError } = await supabase
    .from('invoices').select('total_amount').eq('id', invoiceId).single()
  if (invError) throw invError

  const totalAmount = (inv as { total_amount: number } | null)?.total_amount ?? 0
  const balance = Math.max(0, totalAmount - totalPaid)
  const status: InvoiceStatus = balance === 0 && totalPaid > 0 ? 'paid' : totalPaid > 0 ? 'partially_paid' : 'sent'

  const { error: updateError } = await supabase
    .from('invoices').update({ amount_paid: totalPaid, balance_due: balance, status }).eq('id', invoiceId)
  if (updateError) throw updateError
}

export async function fetchPayments(invoiceId: string): Promise<Payment[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('invoice_id', invoiceId)
    .order('payment_date', { ascending: false })
  if (error) throw error
  return data
}

export async function recordPayment(payload: PaymentInsert): Promise<Payment> {
  const { data, error } = await supabase
    .from('payments')
    .insert(payload)
    .select()
    .single()
  if (error) throw error

  const { data: inv, error: invError } = await supabase
    .from('invoices')
    .select('total_amount, amount_paid')
    .eq('id', payload.invoice_id)
    .single()
  if (invError) throw invError

  const { total_amount, amount_paid } = inv as { total_amount: number; amount_paid: number }
  const newAmountPaid = amount_paid + payload.amount
  const balance      = Math.max(0, total_amount - newAmountPaid)
  const status: InvoiceStatus = balance === 0 ? 'paid' : 'partially_paid'

  const { error: updateError } = await supabase
    .from('invoices')
    .update({ amount_paid: newAmountPaid, balance_due: balance, status })
    .eq('id', payload.invoice_id)
  if (updateError) throw updateError

  return data
}

export interface PaymentWithInvoice extends Payment {
  invoices: { invoice_number: string; clients: { full_name: string } }
}

export async function fetchAllPayments(): Promise<PaymentWithInvoice[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('*, invoices(invoice_number, clients(full_name))')
    .order('payment_date', { ascending: false })
  if (error) throw error
  return data as unknown as PaymentWithInvoice[]
}

export async function fetchOrderItems(orderId: string) {
  const { data, error } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', orderId)
  if (error) throw error
  return data
}

export async function fetchClientOrders(clientId: string) {
  const { data, error } = await supabase
    .from('orders')
    .select('id, order_number, collection_name, total_amount')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as { id: string; order_number: string; collection_name: string | null; total_amount: number }[]
}
