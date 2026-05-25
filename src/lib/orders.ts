import { supabase } from './supabase'
import type { Order, OrderItem, OrderStatus } from '../types/database'

export type OrderInsert = Omit<Order, 'id' | 'created_at' | 'order_number'>
export type OrderUpdate = Partial<OrderInsert>
export type OrderItemInsert = Omit<OrderItem, 'id'>
export type OrderItemUpdate = Partial<OrderItemInsert>

export interface OrderWithClient extends Order {
  clients: { full_name: string }
}

export async function generateOrderNumber(): Promise<string> {
  const { data, error } = await supabase.rpc('generate_order_number')
  if (error) throw error
  return data as string
}

export async function fetchOrders(): Promise<OrderWithClient[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*, clients(full_name)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as OrderWithClient[]
}

export async function fetchOrder(id: string): Promise<OrderWithClient> {
  const { data, error } = await supabase
    .from('orders')
    .select('*, clients(full_name)')
    .eq('id', id)
    .single()
  if (error) throw error
  return data as OrderWithClient
}

export async function createOrder(payload: OrderInsert): Promise<Order> {
  const orderNumber = await generateOrderNumber()
  const { data, error } = await supabase
    .from('orders')
    .insert({ ...payload, order_number: orderNumber })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateOrder(id: string, payload: OrderUpdate): Promise<Order> {
  const { data, error } = await supabase
    .from('orders')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateOrderStatus(id: string, status: OrderStatus): Promise<void> {
  const { error } = await supabase.from('orders').update({ status }).eq('id', id)
  if (error) throw error
}

export async function deleteOrder(id: string): Promise<void> {
  const { error } = await supabase.from('orders').delete().eq('id', id)
  if (error) throw error
}

export async function fetchOrderItems(orderId: string): Promise<OrderItem[]> {
  const { data, error } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', orderId)
    .order('garment_name')
  if (error) throw error
  return data
}

export async function createOrderItem(payload: OrderItemInsert): Promise<OrderItem> {
  const lineTotal = payload.quantity * payload.unit_price
  const { data, error } = await supabase
    .from('order_items')
    .insert({ ...payload, line_total: lineTotal })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteOrderItem(id: string): Promise<void> {
  const { error } = await supabase.from('order_items').delete().eq('id', id)
  if (error) throw error
}
