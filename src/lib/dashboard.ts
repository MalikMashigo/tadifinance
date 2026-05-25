import { supabase } from './supabase'
import type { ExpenseCategory, InvoiceStatus, OrderStatus } from '../types/database'

export interface DashboardStats {
  revenueThisMonth: number
  activeClients: number
  openInvoices: number
  overdueInvoices: number
}

export interface OutstandingInvoice {
  id: string
  invoice_number: string
  status: InvoiceStatus
  due_date: string
  balance_due: number
  total_amount: number
  clients: { full_name: string }
}

export interface RecentOrder {
  id: string
  order_number: string
  status: OrderStatus
  due_date: string | null
  total_amount: number
  clients: { full_name: string }
}

export interface DashboardData {
  stats: DashboardStats
  outstanding: OutstandingInvoice[]
  recentOrders: RecentOrder[]
  expensesByCategory: Map<ExpenseCategory, number>
  totalExpensesThisMonth: number
}

function monthBounds() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
  return { start, end }
}

export async function fetchDashboardData(): Promise<DashboardData> {
  const { start, end } = monthBounds()

  const [paymentsRes, clientsRes, invoicesRes, ordersRes, expensesRes] = await Promise.all([
    supabase
      .from('payments')
      .select('amount')
      .gte('payment_date', start)
      .lte('payment_date', end),

    supabase
      .from('clients')
      .select('id', { count: 'exact', head: true }),

    supabase
      .from('invoices')
      .select('id, invoice_number, status, due_date, balance_due, total_amount, clients(full_name)')
      .in('status', ['sent', 'partially_paid', 'overdue'])
      .order('due_date', { ascending: true }),

    supabase
      .from('orders')
      .select('id, order_number, status, due_date, total_amount, clients(full_name)')
      .order('created_at', { ascending: false })
      .limit(5),

    supabase
      .from('expenses')
      .select('category, amount')
      .gte('expense_date', start)
      .lte('expense_date', end),
  ])

  const revenueThisMonth = (paymentsRes.data ?? []).reduce(
    (s: number, p: { amount: number }) => s + p.amount,
    0,
  )

  const outstandingRaw = (invoicesRes.data ?? []) as unknown as OutstandingInvoice[]
  const overdueInvoices = outstandingRaw.filter((i) => {
    const due = new Date(i.due_date)
    return due < new Date() && i.status !== 'paid'
  }).length

  const expensesByCategory = new Map<ExpenseCategory, number>()
  let totalExpensesThisMonth = 0
  for (const e of expensesRes.data ?? []) {
    const row = e as { category: ExpenseCategory; amount: number }
    expensesByCategory.set(row.category, (expensesByCategory.get(row.category) ?? 0) + row.amount)
    totalExpensesThisMonth += row.amount
  }

  return {
    stats: {
      revenueThisMonth,
      activeClients: clientsRes.count ?? 0,
      openInvoices: outstandingRaw.length,
      overdueInvoices,
    },
    outstanding: outstandingRaw,
    recentOrders: (ordersRes.data ?? []) as unknown as RecentOrder[],
    expensesByCategory,
    totalExpensesThisMonth,
  }
}
