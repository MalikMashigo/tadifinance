import { supabase } from './supabase'
import type { Expense, ExpenseCategory, ExpenseSubsection, ExpenseUnitType, ExpenseLog, ExpenseItem } from '../types/database'

// ── Legacy single-expense CRUD (kept for hook / report compat) ──────────────

export type ExpenseInsert = Omit<Expense, 'id' | 'created_at'>
export type ExpenseUpdate = Partial<ExpenseInsert>

export interface ExpenseWithOrder extends Expense {
  orders: { order_number: string } | null
}

export async function fetchExpenses(): Promise<ExpenseWithOrder[]> {
  const { data, error } = await supabase
    .from('expenses')
    .select('*, orders(order_number)')
    .order('expense_date', { ascending: false })
  if (error) throw error
  return data as ExpenseWithOrder[]
}

export async function createExpense(payload: ExpenseInsert): Promise<Expense> {
  const { data, error } = await supabase.from('expenses').insert(payload).select().single()
  if (error) throw error
  return data
}

export async function updateExpense(id: string, payload: ExpenseUpdate): Promise<Expense> {
  const { data, error } = await supabase.from('expenses').update(payload).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteExpense(id: string): Promise<void> {
  const { error } = await supabase.from('expenses').delete().eq('id', id)
  if (error) throw error
}

// ── New expense log / item CRUD ───────────────────────────────────────────────

export interface ExpenseLogWithItems extends ExpenseLog {
  expense_items: ExpenseItem[]
}

export interface ExpenseLogInsert {
  subsection: ExpenseSubsection
  log_date: string
  reference_name: string | null
  notes: string | null
  total_amount: number
}

export interface ExpenseItemInsert {
  log_id: string
  category: ExpenseCategory
  description: string
  unit_type: ExpenseUnitType
  unit_quantity: number | null
  unit_price: number | null
  amount: number
  supplier: string | null
  notes: string | null
}

export async function fetchExpenseLogs(subsection: ExpenseSubsection): Promise<ExpenseLogWithItems[]> {
  const { data, error } = await supabase
    .from('expense_logs')
    .select('*, expense_items(*)')
    .eq('subsection', subsection)
    .order('log_date', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as ExpenseLogWithItems[]
}

export async function createExpenseLog(
  payload: ExpenseLogInsert,
  items: Omit<ExpenseItemInsert, 'log_id'>[],
): Promise<ExpenseLog> {
  const { data, error } = await supabase
    .from('expense_logs')
    .insert(payload)
    .select()
    .single()
  if (error) throw new Error(error.message)
  const log = data as ExpenseLog

  if (items.length > 0) {
    const { error: itemErr } = await supabase
      .from('expense_items')
      .insert(items.map((i) => ({ ...i, log_id: log.id })))
    if (itemErr) throw new Error(itemErr.message)
  }

  return log
}

export async function deleteExpenseLog(id: string): Promise<void> {
  const { error } = await supabase.from('expense_logs').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ── Category / subsection metadata ───────────────────────────────────────────

export const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  fabric:      'Fabric',
  trims:       'Trims',
  labour:      'Labour',
  accessories: 'Accessories',
  packaging:   'Packaging',
  shipping:    'Shipping',
}

export const CATEGORY_COLOURS: Record<ExpenseCategory, string> = {
  fabric:      'accent',
  trims:       'amber',
  labour:      'blue',
  accessories: 'green',
  packaging:   'green',
  shipping:    'green',
}

export const DEFAULT_UNIT_TYPES: Record<ExpenseCategory, ExpenseUnitType> = {
  fabric:      'metre',
  trims:       'unit',
  labour:      'hour',
  accessories: 'unit',
  packaging:   'unit',
  shipping:    'unit',
}

export const SUBSECTION_LABELS: Record<ExpenseSubsection, string> = {
  clients:         'Clients',
  collections:     'Collections',
  shoots:          'Shoots',
  studio:          'Studio',
  cmt:             'CMT',
  passion_projects: 'Passion Projects',
}

export const SUBSECTIONS = Object.keys(SUBSECTION_LABELS) as ExpenseSubsection[]

// ── Kept for reports that still query the legacy expenses table ───────────────

export async function fetchOrdersForPicker() {
  const { data, error } = await supabase
    .from('orders')
    .select('id, order_number, collection_name')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as { id: string; order_number: string; collection_name: string | null }[]
}
