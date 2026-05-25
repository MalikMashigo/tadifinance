export async function sendInvoiceEmail({
  to,
  subject,
  html,
  pdfBase64,
  invoiceNumber,
}: {
  to: string
  subject: string
  html: string
  pdfBase64: string
  invoiceNumber: string
}): Promise<void> {
  const apiKey = import.meta.env.VITE_RESEND_API_KEY
  if (!apiKey) throw new Error('VITE_RESEND_API_KEY is not set.')

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'TADI wa NASHE <invoices@tadifinance.com>',
      to: [to],
      subject,
      html,
      attachments: [{ filename: `${invoiceNumber}.pdf`, content: pdfBase64 }],
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { message?: string }).message ?? `Email failed (${res.status})`)
  }
}
