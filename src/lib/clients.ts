import { supabase } from './supabase'
import type { Client, Measurement } from '../types/database'

export type ClientInsert = Omit<Client, 'id' | 'created_at'>
export type ClientUpdate = Partial<ClientInsert>
export type MeasurementInsert = Omit<Measurement, 'id' | 'measured_at'>

export async function fetchClients(): Promise<Client[]> {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('full_name', { ascending: true })
  if (error) throw error
  return data
}

export async function fetchClient(id: string): Promise<Client> {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function createClient(payload: ClientInsert): Promise<Client> {
  const { data, error } = await supabase
    .from('clients')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateClient(id: string, payload: ClientUpdate): Promise<Client> {
  const { data, error } = await supabase
    .from('clients')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteClient(id: string): Promise<void> {
  const { error } = await supabase.from('clients').delete().eq('id', id)
  if (error) throw error
}

export async function searchClients(query: string): Promise<Client[]> {
  if (!query.trim()) return []
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .ilike('full_name', `%${query}%`)
    .order('full_name')
    .limit(5)
  if (error) throw error
  return data
}

export async function fetchMeasurements(clientId: string): Promise<Measurement[]> {
  const { data, error } = await supabase
    .from('measurements')
    .select('*')
    .eq('client_id', clientId)
    .order('measured_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createMeasurement(payload: MeasurementInsert): Promise<Measurement> {
  const { data, error } = await supabase
    .from('measurements')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data
}
