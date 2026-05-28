exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  let payload
  try {
    payload = JSON.parse(event.body ?? '{}')
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) }
  }

  const { to, subject, html, pdfBase64, pdfFilename } = payload

  if (!to || !subject || !pdfBase64) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields: to, subject, pdfBase64' }) }
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Email service not configured (RESEND_API_KEY missing)' }) }
  }

  const from = process.env.RESEND_FROM_EMAIL || 'TADI wa NASHE <noreply@tadifinance.com>'

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html,
      attachments: [{ filename: pdfFilename, content: pdfBase64 }],
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    return { statusCode: 500, body: JSON.stringify({ error: text }) }
  }

  return { statusCode: 200, body: JSON.stringify({ success: true }) }
}
