import { supabase } from './supabase'
import type { Quote, QuoteItem, QuoteStatus } from '../types/database'

export interface QuoteWithClient extends Quote {
  clients: { full_name: string; email: string | null; phone: string | null }
}

export interface QuoteInsert {
  client_id: string
  issue_date: string
  notes: string | null
}

export interface QuoteItemInsert {
  quote_id: string
  description: string
  quantity: number
  unit_price: number
  notes: string | null
}

export async function fetchQuotes(): Promise<QuoteWithClient[]> {
  const { data, error } = await supabase
    .from('quotes')
    .select('*, clients(full_name, email, phone)')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as QuoteWithClient[]
}

export async function fetchQuote(id: string): Promise<QuoteWithClient> {
  const { data, error } = await supabase
    .from('quotes')
    .select('*, clients(full_name, email, phone)')
    .eq('id', id)
    .single()
  if (error) throw new Error(error.message)
  return data as unknown as QuoteWithClient
}

export async function createQuote(payload: QuoteInsert): Promise<Quote> {
  const { data: numData, error: numError } = await supabase.rpc('generate_quote_number')
  if (numError) throw new Error(numError.message)

  const { data, error } = await supabase
    .from('quotes')
    .insert({
      ...payload,
      quote_number: numData as string,
      status: 'draft' as QuoteStatus,
      subtotal: 0,
      vat_amount: 0,
      total_amount: 0,
    })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as Quote
}

export async function updateQuote(
  id: string,
  payload: Partial<QuoteInsert & { status: QuoteStatus; sent_at: string | null }>,
): Promise<void> {
  const { error } = await supabase.from('quotes').update(payload).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteQuote(id: string): Promise<void> {
  const { error } = await supabase.from('quotes').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function createQuoteItems(payloads: QuoteItemInsert[]): Promise<void> {
  if (payloads.length === 0) return
  const rows = payloads.map((p) => ({
    ...p,
    line_total: Math.round(p.quantity * p.unit_price * 100) / 100,
  }))
  const { error } = await supabase.from('quote_items').insert(rows)
  if (error) throw new Error(error.message)
  await recalcQuoteTotals(payloads[0].quote_id)
}

export async function fetchQuoteItems(quoteId: string): Promise<QuoteItem[]> {
  const { data, error } = await supabase
    .from('quote_items')
    .select('*')
    .eq('quote_id', quoteId)
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as QuoteItem[]
}

export async function createQuoteItem(payload: QuoteItemInsert): Promise<QuoteItem> {
  const lineTotal = Math.round(payload.quantity * payload.unit_price * 100) / 100
  const { data, error } = await supabase
    .from('quote_items')
    .insert({ ...payload, line_total: lineTotal })
    .select()
    .single()
  if (error) throw new Error(error.message)
  const item = data as QuoteItem
  await recalcQuoteTotals(payload.quote_id)
  return item
}

export async function deleteQuoteItem(itemId: string, quoteId: string): Promise<void> {
  const { error } = await supabase.from('quote_items').delete().eq('id', itemId)
  if (error) throw new Error(error.message)
  await recalcQuoteTotals(quoteId)
}

export async function recalcQuoteTotals(quoteId: string): Promise<void> {
  const items = await fetchQuoteItems(quoteId)
  const subtotal = Math.round(items.reduce((s, i) => s + i.line_total, 0) * 100) / 100
  const vat      = Math.round(subtotal * 0.15 * 100) / 100
  const total    = Math.round((subtotal + vat) * 100) / 100
  const { error } = await supabase
    .from('quotes')
    .update({ subtotal, vat_amount: vat, total_amount: total })
    .eq('id', quoteId)
  if (error) throw new Error(error.message)
}
