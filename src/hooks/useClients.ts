import { useState, useEffect, useCallback } from 'react'
import {
  fetchClients,
  fetchClient,
  createClient,
  updateClient,
  deleteClient,
  fetchMeasurements,
  createMeasurement,
  type ClientInsert,
  type ClientUpdate,
  type MeasurementInsert,
} from '../lib/clients'
import type { Client, Measurement } from '../types/database'

export function useClients() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setClients(await fetchClients())
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function addClient(payload: ClientInsert) {
    const created = await createClient(payload)
    setClients((prev) => [...prev, created].sort((a, b) => a.full_name.localeCompare(b.full_name)))
    return created
  }

  async function editClient(id: string, payload: ClientUpdate) {
    const updated = await updateClient(id, payload)
    setClients((prev) => prev.map((c) => (c.id === id ? updated : c)))
    return updated
  }

  async function removeClient(id: string) {
    await deleteClient(id)
    setClients((prev) => prev.filter((c) => c.id !== id))
  }

  return { clients, loading, error, reload: load, addClient, editClient, removeClient }
}

export function useClient(id: string) {
  const [client, setClient] = useState<Client | null>(null)
  const [measurements, setMeasurements] = useState<Measurement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [c, m] = await Promise.all([fetchClient(id), fetchMeasurements(id)])
      setClient(c)
      setMeasurements(m)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  async function updateClientData(payload: ClientUpdate) {
    if (!client) return
    const updated = await updateClient(client.id, payload)
    setClient(updated)
    return updated
  }

  async function addMeasurement(payload: Omit<MeasurementInsert, 'client_id'>) {
    const created = await createMeasurement({ ...payload, client_id: id })
    setMeasurements((prev) => [created, ...prev])
    return created
  }

  return { client, measurements, loading, error, updateClientData, addMeasurement }
}
