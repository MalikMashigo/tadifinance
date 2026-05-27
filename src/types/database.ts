export type ClientType  = 'retail' | 'stylist' | 'custom' | 'made_to_order'
export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'declined'
export type SizeSystem  = 'S-XXL' | 'EU' | 'US'
export type OrderType   = 'bespoke' | 'outsourcing' | 'alteration'

export type OrderStatus =
  | 'consult'
  | 'service'
  | 'complete'
  | 'delivery'

export type InvoiceStatus =
  | 'draft'
  | 'sent'
  | 'partially_paid'
  | 'paid'
  | 'overdue'

export type PaymentMethod = 'EFT' | 'cash' | 'card' | 'PayShap'

export type ExpenseSubsection =
  | 'clients'
  | 'collections'
  | 'shoots'
  | 'studio'
  | 'cmt'
  | 'passion_projects'

export type ExpenseCategory =
  | 'fabric'
  | 'trims'
  | 'labour'
  | 'accessories'
  | 'packaging'
  | 'shipping'

export type ExpenseUnitType = 'unit' | 'metre' | 'hour'

export interface Client {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  country: string
  client_type: ClientType
  size_system: SizeSystem | null
  clothing_size: string | null
  notes: string | null
  style_preferences: string | null
  created_at: string
}

export interface Measurement {
  id: string
  client_id: string
  bust: number | null
  waist: number | null
  hips: number | null
  shoulder_width: number | null
  sleeve_length: number | null
  wrist: number | null
  bicep: number | null
  waist_to_knee: number | null
  waist_to_ankle: number | null
  waist_to_hip: number | null
  inseam: number | null
  notes: string | null
  measured_at: string
}

export interface Order {
  id: string
  client_id: string
  order_number: string
  order_type: OrderType
  status: OrderStatus
  collection_name: string | null
  description: string | null
  due_date: string | null
  delivery_date: string | null
  total_amount: number
  deposit_amount: number
  balance_due: number
  notes: string | null
  created_at: string
}

export interface OrderItem {
  id: string
  order_id: string
  garment_name: string
  garment_type: string | null
  fabric: string | null
  colour: string | null
  size: string | null
  quantity: number
  unit_price: number
  line_total: number
  notes: string | null
}

export interface Invoice {
  id: string
  client_id: string
  order_id: string | null
  invoice_number: string
  status: InvoiceStatus
  issue_date: string
  due_date: string
  subtotal: number
  vat_amount: number
  total_amount: number
  amount_paid: number
  balance_due: number
  notes: string | null
  sent_at: string | null
  created_at: string
}

export interface Payment {
  id: string
  invoice_id: string
  amount: number
  payment_method: PaymentMethod
  reference: string | null
  payment_date: string
  notes: string | null
  created_at: string
}

export interface Expense {
  id: string
  order_id: string | null
  category: ExpenseCategory
  description: string
  supplier: string | null
  amount: number
  expense_date: string
  receipt_url: string | null
  created_at: string
}

export interface ExpenseLog {
  id: string
  subsection: ExpenseSubsection
  log_date: string
  reference_name: string | null
  notes: string | null
  total_amount: number
  created_at: string
}

export interface ExpenseItem {
  id: string
  log_id: string
  category: ExpenseCategory
  description: string
  unit_type: ExpenseUnitType
  unit_quantity: number | null
  unit_price: number | null
  amount: number
  supplier: string | null
  notes: string | null
  created_at: string
}

export interface Quote {
  id: string
  client_id: string
  quote_number: string
  status: QuoteStatus
  issue_date: string
  subtotal: number
  vat_amount: number
  total_amount: number
  notes: string | null
  sent_at: string | null
  created_at: string
}

export interface QuoteItem {
  id: string
  quote_id: string
  description: string
  quantity: number
  unit_price: number
  line_total: number
  notes: string | null
  created_at: string
}

// Joined types used across the app
export interface InvoiceWithClient extends Invoice {
  clients: Pick<Client, 'full_name' | 'email'>
}

export interface OrderWithClient extends Order {
  clients: Pick<Client, 'full_name'>
}
