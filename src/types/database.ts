export type ClientType = 'retail' | 'stylist' | 'media' | 'wholesale'

export type OrderType = 'bespoke' | 'collection' | 'alteration'

export type OrderStatus =
  | 'consult'
  | 'pattern'
  | 'cutting'
  | 'sewing'
  | 'fitting'
  | 'complete'
  | 'delivered'

export type InvoiceStatus =
  | 'draft'
  | 'sent'
  | 'partially_paid'
  | 'paid'
  | 'overdue'

export type PaymentMethod = 'EFT' | 'cash' | 'card' | 'PayShap'

export type ExpenseCategory =
  | 'fabric'
  | 'trims'
  | 'labour'
  | 'packaging'
  | 'shipping'
  | 'show'

export interface Client {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  country: string
  client_type: ClientType
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
  torso_length: number | null
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

// Joined types used across the app
export interface InvoiceWithClient extends Invoice {
  clients: Pick<Client, 'full_name' | 'email'>
}

export interface OrderWithClient extends Order {
  clients: Pick<Client, 'full_name'>
}
