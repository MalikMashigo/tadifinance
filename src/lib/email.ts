export interface SendEmailPayload {
  to: string
  subject: string
  html: string
  pdfBase64: string
  pdfFilename: string
}

export async function sendEmailWithPDF(payload: SendEmailPayload): Promise<void> {
  const res = await fetch('/.netlify/functions/send-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to send email' }))
    throw new Error((err as { error?: string }).error ?? 'Failed to send email')
  }
}
