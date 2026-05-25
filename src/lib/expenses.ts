import { supabase } from './supabase'
import type { Expense, ExpenseCategory } from '../types/database'

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
  const { data, error } = await supabase
    .from('expenses')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateExpense(id: string, payload: ExpenseUpdate): Promise<Expense> {
  const { data, error } = await supabase
    .from('expenses')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteExpense(id: string): Promise<void> {
  const { error } = await supabase.from('expenses').delete().eq('id', id)
  if (error) throw error
}

export async function fetchOrdersForPicker() {
  const { data, error } = await supabase
    .from('orders')
    .select('id, order_number, collection_name')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as { id: string; order_number: string; collection_name: string | null }[]
}

export const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  fabric:    'Fabric',
  trims:     'Trims',
  labour:    'Labour',
  packaging: 'Packaging',
  shipping:  'Shipping',
  show:      'Show / Event',
}

export const CATEGORY_COLOURS: Record<ExpenseCategory, string> = {
  fabric:    'accent',
  trims:     'amber',
  labour:    'blue',
  packaging: 'green',
  shipping:  'green',
  show:      'red',
}
