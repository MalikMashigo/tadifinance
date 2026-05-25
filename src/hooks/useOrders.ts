import { useState, useEffect, useCallback } from 'react'
import {
  fetchOrders,
  fetchOrder,
  createOrder,
  updateOrder,
  updateOrderStatus,
  deleteOrder,
  fetchOrderItems,
  createOrderItem,
  deleteOrderItem,
  type OrderInsert,
  type OrderUpdate,
  type OrderItemInsert,
  type OrderWithClient,
} from '../lib/orders'
import type { OrderItem, OrderStatus } from '../types/database'

export function useOrders() {
  const [orders, setOrders] = useState<OrderWithClient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setOrders(await fetchOrders())
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function addOrder(payload: OrderInsert) {
    const created = await createOrder(payload)
    await load()
    return created
  }

  async function editOrder(id: string, payload: OrderUpdate) {
    const updated = await updateOrder(id, payload)
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, ...updated } : o)))
    return updated
  }

  async function removeOrder(id: string) {
    await deleteOrder(id)
    setOrders((prev) => prev.filter((o) => o.id !== id))
  }

  return { orders, loading, error, reload: load, addOrder, editOrder, removeOrder }
}

export function useOrder(id: string) {
  const [order, setOrder] = useState<OrderWithClient | null>(null)
  const [items, setItems] = useState<OrderItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [o, i] = await Promise.all([fetchOrder(id), fetchOrderItems(id)])
      setOrder(o)
      setItems(i)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  async function setStatus(status: OrderStatus) {
    await updateOrderStatus(id, status)
    setOrder((prev) => prev ? { ...prev, status } : prev)
  }

  async function updateOrderData(payload: OrderUpdate) {
    const updated = await updateOrder(id, payload)
    setOrder((prev) => prev ? { ...prev, ...updated } : prev)
    return updated
  }

  async function addItem(payload: Omit<OrderItemInsert, 'order_id'>) {
    const created = await createOrderItem({ ...payload, order_id: id })
    setItems((prev) => [...prev, created])
    // Recalculate order totals
    const newSubtotal = [...items, created].reduce((s, i) => s + i.line_total, 0)
    const newTotal = Math.round(newSubtotal * 1.15 * 100) / 100
    await updateOrder(id, {
      total_amount: newTotal,
      balance_due: Math.round((newTotal - (order?.deposit_amount ?? 0)) * 100) / 100,
    })
    setOrder((prev) => prev ? { ...prev, total_amount: newTotal } : prev)
    return created
  }

  async function removeItem(itemId: string) {
    await deleteOrderItem(itemId)
    const remaining = items.filter((i) => i.id !== itemId)
    setItems(remaining)
    const newSubtotal = remaining.reduce((s, i) => s + i.line_total, 0)
    const newTotal = Math.round(newSubtotal * 1.15 * 100) / 100
    await updateOrder(id, {
      total_amount: newTotal,
      balance_due: Math.round((newTotal - (order?.deposit_amount ?? 0)) * 100) / 100,
    })
    setOrder((prev) => prev ? { ...prev, total_amount: newTotal } : prev)
  }

  return { order, items, loading, error, setStatus, updateOrderData, addItem, removeItem }
}
