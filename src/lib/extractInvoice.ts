const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY as string

export interface ExtractedInvoice {
  client_name: string | null
  client_email: string | null
  invoice_number: string | null
  issue_date: string | null        // YYYY-MM-DD
  due_date: string | null          // YYYY-MM-DD
  subtotal: number | null
  vat_amount: number | null
  total_amount: number | null
  amount_paid: number
  notes: string | null
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'partially_paid'
}

const PROMPT = `Extract invoice data from this document and return ONLY valid JSON with this exact structure (no markdown fences, no commentary):
{
  "client_name": "full name of the client or customer",
  "client_email": "email address if visible, otherwise null",
  "invoice_number": "invoice number as a string",
  "issue_date": "YYYY-MM-DD",
  "due_date": "YYYY-MM-DD",
  "subtotal": numeric amount before tax,
  "vat_amount": numeric tax/VAT amount,
  "total_amount": numeric final total,
  "amount_paid": numeric amount already paid (0 if not specified),
  "notes": "any visible payment terms or notes, otherwise null",
  "status": one of "draft"|"sent"|"paid"|"overdue"|"partially_paid"
}
Use null for any field you cannot confidently determine. For status: use "paid" if the invoice shows full payment, "partially_paid" if partial, "overdue" if past due with balance, otherwise "sent".`

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(',')[1])
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export async function extractInvoiceFromFile(file: File): Promise<ExtractedInvoice> {
  if (!API_KEY) throw new Error('VITE_ANTHROPIC_API_KEY is not set.')

  const isPdf = file.type === 'application/pdf'
  const isImage = file.type.startsWith('image/')
  if (!isPdf && !isImage) throw new Error('Upload a PDF or image file (JPG, PNG, WEBP).')

  const base64 = await fileToBase64(file)

  const contentBlock = isPdf
    ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } }
    : { type: 'image', source: { type: 'base64', media_type: file.type, data: base64 } }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-allow-browser': 'true',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: [contentBlock, { type: 'text', text: PROMPT }] }],
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } }
    throw new Error(err?.error?.message ?? `Anthropic API error ${res.status}`)
  }

  const result = await res.json() as { content: { text: string }[] }
  const text = result.content?.[0]?.text ?? ''

  try {
    return JSON.parse(text) as ExtractedInvoice
  } catch {
    const match = text.match(/\{[\s\S]*\}/)
    if (match) return JSON.parse(match[0]) as ExtractedInvoice
    throw new Error('Could not parse the extracted invoice data. Try a clearer image.')
  }
}
