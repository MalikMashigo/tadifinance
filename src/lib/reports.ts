import { supabase } from './supabase'
import * as XLSX from 'xlsx'
import type { ExpenseCategory, InvoiceStatus, OrderStatus, OrderType } from '../types/database'
import { CATEGORY_LABELS } from './expenses'

export interface ReportInvoice {
  id: string
  invoice_number: string
  issue_date: string
  due_date: string
  status: InvoiceStatus
  subtotal: number
  vat_amount: number
  total_amount: number
  amount_paid: number
  balance_due: number
  clients: { full_name: string; email: string | null }
}

export interface ReportExpense {
  id: string
  expense_date: string
  category: ExpenseCategory
  description: string
  supplier: string | null
  amount: number
  orders: { order_number: string } | null
}

export interface ReportPayment {
  id: string
  payment_date: string
  amount: number
  payment_method: string
  reference: string | null
  invoice_id: string
  invoices: { invoice_number: string; clients: { full_name: string } } | null
}

export interface ReportOrder {
  id: string
  order_number: string
  created_at: string
  due_date: string | null
  status: OrderStatus
  order_type: OrderType
  collection_name: string | null
  total_amount: number
  clients: { full_name: string }
}

export interface ReportSummary {
  totalInvoiced: number
  totalPaid: number
  outstanding: number
  totalExpenses: number
  grossProfit: number
}

export interface ReportData {
  invoices: ReportInvoice[]
  expenses: ReportExpense[]
  payments: ReportPayment[]
  orders: ReportOrder[]
  summary: ReportSummary
}

const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  bespoke:     'Bespoke',
  outsourcing: 'Outsourcing',
  alteration:  'Alteration',
}

const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  consult:  'Consult',
  service:  'Service',
  delivery: 'Delivery',
  complete: 'Complete',
}

export async function fetchReportData(from: string, to: string): Promise<ReportData> {
  const [invoicesRes, expensesRes, paymentsRes, ordersRes] = await Promise.all([
    supabase
      .from('invoices')
      .select('id, invoice_number, issue_date, due_date, status, subtotal, vat_amount, total_amount, amount_paid, balance_due, clients(full_name, email)')
      .gte('issue_date', from)
      .lte('issue_date', to)
      .order('issue_date', { ascending: true }),

    supabase
      .from('expenses')
      .select('id, expense_date, category, description, supplier, amount, orders(order_number)')
      .gte('expense_date', from)
      .lte('expense_date', to)
      .order('expense_date', { ascending: true }),

    supabase
      .from('payments')
      .select('id, payment_date, amount, payment_method, reference, invoice_id, invoices(invoice_number, clients(full_name))')
      .gte('payment_date', from)
      .lte('payment_date', to)
      .order('payment_date', { ascending: true }),

    supabase
      .from('orders')
      .select('id, order_number, created_at, due_date, status, order_type, collection_name, total_amount, clients(full_name)')
      .gte('created_at', from)
      .lte('created_at', to)
      .order('created_at', { ascending: true }),
  ])

  const invoices = (invoicesRes.data ?? []) as unknown as ReportInvoice[]
  const expenses = (expensesRes.data ?? []) as unknown as ReportExpense[]
  const payments = (paymentsRes.data ?? []) as unknown as ReportPayment[]
  const orders   = (ordersRes.data   ?? []) as unknown as ReportOrder[]

  const totalInvoiced = invoices.reduce((s, i) => s + i.total_amount, 0)
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0)
  const outstanding = invoices
    .filter((i) => i.status !== 'paid')
    .reduce((s, i) => s + i.balance_due, 0)
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)
  const grossProfit = totalPaid - totalExpenses

  return {
    invoices,
    expenses,
    payments,
    orders,
    summary: { totalInvoiced, totalPaid, outstanding, totalExpenses, grossProfit },
  }
}

export function exportToExcel(data: ReportData, periodLabel: string) {
  const wb = XLSX.utils.book_new()
  const zar = (n: number) => `R ${n.toFixed(2)}`

  // ── Summary sheet ──
  const summaryRows = [
    ['TADI wa NASHE — Financial Report'],
    ['Period', periodLabel],
    ['Generated', new Date().toLocaleDateString('en-ZA')],
    [],
    ['REVENUE'],
    ['Total invoiced (incl. VAT)', zar(data.summary.totalInvoiced)],
    ['Total received (payments)', zar(data.summary.totalPaid)],
    ['Outstanding balance', zar(data.summary.outstanding)],
    [],
    ['EXPENSES'],
    ['Total expenses', zar(data.summary.totalExpenses)],
    [],
    ['PROFIT'],
    ['Gross profit (received – expenses)', zar(data.summary.grossProfit)],
  ]
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows)
  summarySheet['!cols'] = [{ wch: 36 }, { wch: 18 }]
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary')

  // ── Orders sheet ──
  const orderHeader = ['Order #', 'Client', 'Type', 'Status', 'Collection / Look', 'Due Date', 'Total (R)']
  const orderRows = data.orders.map((o) => [
    o.order_number,
    o.clients.full_name,
    ORDER_TYPE_LABELS[o.order_type] ?? o.order_type,
    ORDER_STATUS_LABELS[o.status]   ?? o.status,
    o.collection_name ?? '',
    o.due_date ?? '',
    o.total_amount,
  ])
  const orderSheet = XLSX.utils.aoa_to_sheet([orderHeader, ...orderRows])
  orderSheet['!cols'] = [
    { wch: 12 }, { wch: 24 }, { wch: 14 }, { wch: 12 }, { wch: 22 }, { wch: 12 }, { wch: 12 },
  ]
  XLSX.utils.book_append_sheet(wb, orderSheet, 'Orders')

  // ── Invoices sheet ──
  const invoiceHeader = ['Invoice #', 'Client', 'Issue Date', 'Due Date', 'Status', 'Subtotal (R)', 'VAT (R)', 'Total (R)', 'Paid (R)', 'Balance (R)']
  const invoiceRows = data.invoices.map((i) => [
    i.invoice_number,
    i.clients.full_name,
    i.issue_date,
    i.due_date,
    i.status,
    i.subtotal,
    i.vat_amount,
    i.total_amount,
    i.amount_paid,
    i.balance_due,
  ])
  const invoiceSheet = XLSX.utils.aoa_to_sheet([invoiceHeader, ...invoiceRows])
  invoiceSheet['!cols'] = [
    { wch: 14 }, { wch: 24 }, { wch: 12 }, { wch: 12 }, { wch: 14 },
    { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
  ]
  XLSX.utils.book_append_sheet(wb, invoiceSheet, 'Invoices')

  // ── Expenses sheet ──
  const expenseHeader = ['Date', 'Category', 'Description', 'Supplier', 'Order', 'Amount (R)']
  const expenseRows = data.expenses.map((e) => [
    e.expense_date,
    CATEGORY_LABELS[e.category] ?? e.category,
    e.description,
    e.supplier ?? '',
    e.orders?.order_number ?? '',
    e.amount,
  ])
  const expenseSheet = XLSX.utils.aoa_to_sheet([expenseHeader, ...expenseRows])
  expenseSheet['!cols'] = [
    { wch: 12 }, { wch: 14 }, { wch: 32 }, { wch: 22 }, { wch: 14 }, { wch: 12 },
  ]
  XLSX.utils.book_append_sheet(wb, expenseSheet, 'Expenses')

  // ── Payments sheet ──
  const paymentHeader = ['Date', 'Invoice #', 'Client', 'Method', 'Reference', 'Amount (R)']
  const paymentRows = data.payments.map((p) => [
    p.payment_date,
    p.invoices?.invoice_number ?? '',
    p.invoices?.clients?.full_name ?? '',
    p.payment_method,
    p.reference ?? '',
    p.amount,
  ])
  const paymentSheet = XLSX.utils.aoa_to_sheet([paymentHeader, ...paymentRows])
  paymentSheet['!cols'] = [
    { wch: 12 }, { wch: 14 }, { wch: 24 }, { wch: 10 }, { wch: 18 }, { wch: 12 },
  ]
  XLSX.utils.book_append_sheet(wb, paymentSheet, 'Payments')

  const filename = `TADI-wa-NASHE-${periodLabel.replace(/\s/g, '-')}.xlsx`
  XLSX.writeFile(wb, filename)
}
