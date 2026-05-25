import { useState, useEffect, useCallback } from 'react'
import {
  fetchExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  type ExpenseInsert,
  type ExpenseUpdate,
  type ExpenseWithOrder,
} from '../lib/expenses'

export function useExpenses() {
  const [expenses, setExpenses] = useState<ExpenseWithOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setExpenses(await fetchExpenses())
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function addExpense(payload: ExpenseInsert) {
    const created = await createExpense(payload)
    await load()
    return created
  }

  async function editExpense(id: string, payload: ExpenseUpdate) {
    const updated = await updateExpense(id, payload)
    setExpenses((prev) => prev.map((e) => (e.id === id ? { ...e, ...updated } : e)))
    return updated
  }

  async function removeExpense(id: string) {
    await deleteExpense(id)
    setExpenses((prev) => prev.filter((e) => e.id !== id))
  }

  return { expenses, loading, error, reload: load, addExpense, editExpense, removeExpense }
}
