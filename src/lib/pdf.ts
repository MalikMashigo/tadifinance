import jsPDF from 'jspdf'
import tadiLogoUrl from '../assets/tadi.jpg'
import type { InvoiceWithClient } from './invoices'
import type { OrderItem, Payment, QuoteItem } from '../types/database'
import type { QuoteWithClient } from './quotes'
import { getBankingDetails } from './settings'
import { formatCurrency, formatDate, VAT_RATE } from '../utils/format'

type RGB = [number, number, number]
const INK: RGB    = [26, 26, 24]
const MUTED: RGB  = [107, 104, 96]
const ACCENT: RGB = [184, 132, 90]
const BORDER: RGB = [229, 227, 222]
const GREEN: RGB  = [74, 124, 89]

const W      = 210
const M      = 14
const RIGHT  = W - M  // 196

function hr(doc: jsPDF, y: number, colour: RGB = BORDER) {
  doc.setDrawColor(...colour)
  doc.setLineWidth(0.3)
  doc.line(M, y, RIGHT, y)
}

function trunc(s: string, max: number) {
  return s.length > max ? s.slice(0, max - 1) + '…' : s
}

function loadLogo(): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const c = document.createElement('canvas')
      c.width = img.width
      c.height = img.height
      c.getContext('2d')!.drawImage(img, 0, 0)
      resolve(c.toDataURL('image/jpeg'))
    }
    img.onerror = () => resolve('')
    img.src = tadiLogoUrl
  })
}

const QTY_EDGE   = 138
const PRICE_EDGE = 170
const TOTAL_EDGE = RIGHT
const TOTAL_LABEL_X = M + 95

function addDocFooter(doc: jsPDF, y: number, refNumber: string): void {
  const banking = getBankingDetails()
  const MID = W / 2 + 8  // ~113mm — divides banking (left) from contact (right)

  y = Math.max(y, 210)
  hr(doc, y, ACCENT)
  y += 6

  // Banking details — left column
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...ACCENT)
  doc.text('BANKING DETAILS', M, y)

  // Contact — right column
  doc.text('CONTACT', MID, y)

  y += 5
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...MUTED)

  const bankLines: string[] = []
  if (banking.bankName)      bankLines.push(`Bank: ${banking.bankName}`)
  if (banking.accountName)   bankLines.push(`Account name: ${banking.accountName}`)
  if (banking.accountNumber) bankLines.push(`Account no: ${banking.accountNumber}`)
  if (banking.branchCode)    bankLines.push(`Branch code: ${banking.branchCode}`)

  if (bankLines.length === 0) {
    doc.text('Not configured — add via Invoices → settings', M, y)
  } else {
    bankLines.forEach((line, i) => {
      doc.text(line, M, y + i * 5)
    })
  }

  doc.text('+27 73 928 0572', MID, y)
  doc.text('tadiwanashekaparipari@outlook.com', MID, y + 5)

  y += Math.max(bankLines.length * 5, 10) + 6

  doc.setFontSize(7.5)
  doc.text(`Please use ${refNumber} as your payment reference.`, M, y)
}

async function buildInvoiceDoc(
  invoice: InvoiceWithClient,
  items: OrderItem[],
  payments: Payment[],
): Promise<jsPDF> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  let y = M

  const logoData = await loadLogo()
  const LOGO = 26

  if (logoData) {
    doc.addImage(logoData, 'JPEG', M, y, LOGO, LOGO)
  } else {
    doc.setFont('times', 'normal')
    doc.setFontSize(16)
    doc.setTextColor(...INK)
    doc.text('TADI wa NASHE', M, y + 10)
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(26)
  doc.setTextColor(...INK)
  doc.text('INVOICE', RIGHT, y + 9, { align: 'right' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...MUTED)
  doc.text(invoice.invoice_number, RIGHT, y + 16, { align: 'right' })

  y += LOGO + 8
  hr(doc, y, ACCENT)
  y += 8

  const META_X = M + 110

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...MUTED)
  doc.text('BILL TO', M, y)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...INK)
  doc.text(trunc(invoice.clients.full_name, 34), M, y + 6)

  if (invoice.clients.email) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...MUTED)
    doc.text(trunc(invoice.clients.email, 38), M, y + 12)
  }

  const metaRows: [string, string][] = [
    ['Issue date', formatDate(invoice.issue_date)],
    ['Due date',   formatDate(invoice.due_date)],
    ['Status',     invoice.status.replace(/_/g, ' ').toUpperCase()],
  ]

  metaRows.forEach(([label, value], i) => {
    const ry = y + i * 6.5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...MUTED)
    doc.text(label, META_X, ry)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...INK)
    doc.text(value, RIGHT, ry, { align: 'right' })
  })

  y += 26
  hr(doc, y)
  y += 8

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...MUTED)
  doc.text('DESCRIPTION', M, y)
  doc.text('QTY',        QTY_EDGE,   y, { align: 'right' })
  doc.text('UNIT PRICE', PRICE_EDGE, y, { align: 'right' })
  doc.text('TOTAL',      TOTAL_EDGE, y, { align: 'right' })

  y += 3
  hr(doc, y)
  y += 5

  if (items.length === 0) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...INK)
    doc.text(trunc(invoice.notes ?? 'Professional services', 52), M, y)
    doc.setFont('helvetica', 'bold')
    doc.text('1',                                QTY_EDGE,   y, { align: 'right' })
    doc.text(formatCurrency(invoice.subtotal),   PRICE_EDGE, y, { align: 'right' })
    doc.text(formatCurrency(invoice.subtotal),   TOTAL_EDGE, y, { align: 'right' })
    y += 9
  } else {
    items.forEach((item) => {
      if (y > 242) { doc.addPage(); y = M + 10 }

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(...INK)
      doc.text(trunc(item.garment_name, 48), M, y)
      doc.text(String(item.quantity),             QTY_EDGE,   y, { align: 'right' })
      doc.text(formatCurrency(item.unit_price),   PRICE_EDGE, y, { align: 'right' })
      doc.text(formatCurrency(item.line_total),   TOTAL_EDGE, y, { align: 'right' })

      const details = [item.garment_type, item.fabric, item.colour, item.size]
        .filter(Boolean).join(' · ')
      if (details) {
        y += 5
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7.5)
        doc.setTextColor(...MUTED)
        doc.text(trunc(details, 58), M, y)
      }

      y += 7
      hr(doc, y - 1, BORDER)
    })
  }

  y += 5

  function totalsRow(
    label: string,
    value: string,
    opts: { bold?: boolean; colour?: RGB; lineAbove?: boolean } = {},
  ) {
    if (opts.lineAbove) {
      hr(doc, y - 2, BORDER)
      y += 2
    }
    doc.setFont('helvetica', opts.bold ? 'bold' : 'normal')
    doc.setFontSize(opts.bold ? 10 : 9)
    doc.setTextColor(...MUTED)
    doc.text(label, TOTAL_LABEL_X, y)
    doc.setFont('helvetica', opts.bold ? 'bold' : 'normal')
    doc.setTextColor(...(opts.colour ?? INK))
    doc.text(value, TOTAL_EDGE, y, { align: 'right' })
    y += opts.bold ? 7 : 5.5
  }

  totalsRow('Subtotal', formatCurrency(invoice.subtotal))
  totalsRow(`VAT (${(VAT_RATE * 100).toFixed(0)}%)`, formatCurrency(invoice.vat_amount))
  totalsRow('TOTAL', formatCurrency(invoice.total_amount), { bold: true, lineAbove: true })

  if (invoice.amount_paid > 0) {
    totalsRow(`Amount paid`, `– ${formatCurrency(invoice.amount_paid)}`, { colour: GREEN })
    totalsRow('BALANCE DUE', formatCurrency(invoice.balance_due), { bold: true, lineAbove: true })
  }

  y += 8

  if (payments.length > 0) {
    if (y > 242) { doc.addPage(); y = M + 10 }
    hr(doc, y)
    y += 7

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(...MUTED)
    doc.text('PAYMENT HISTORY', M, y)
    y += 5

    payments.forEach((p) => {
      const ref = p.reference ? `  ·  Ref: ${p.reference}` : ''
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.5)
      doc.setTextColor(...MUTED)
      doc.text(`${formatDate(p.payment_date)}  ·  ${p.payment_method}${ref}`, M, y)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...GREEN)
      doc.text(formatCurrency(p.amount), RIGHT, y, { align: 'right' })
      y += 6
    })

    y += 4
  }

  addDocFooter(doc, y, invoice.invoice_number)
  return doc
}

async function buildQuoteDoc(
  quote: QuoteWithClient,
  items: QuoteItem[],
): Promise<jsPDF> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  let y = M

  const logoData = await loadLogo()
  const LOGO = 26

  if (logoData) {
    doc.addImage(logoData, 'JPEG', M, y, LOGO, LOGO)
  } else {
    doc.setFont('times', 'normal')
    doc.setFontSize(16)
    doc.setTextColor(...INK)
    doc.text('TADI wa NASHE', M, y + 10)
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(26)
  doc.setTextColor(...INK)
  doc.text('QUOTE', RIGHT, y + 9, { align: 'right' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...MUTED)
  doc.text(quote.quote_number, RIGHT, y + 16, { align: 'right' })

  y += LOGO + 8
  hr(doc, y, ACCENT)
  y += 8

  const META_X = M + 110

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...MUTED)
  doc.text('PREPARED FOR', M, y)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...INK)
  doc.text(trunc(quote.clients.full_name, 34), M, y + 6)

  if (quote.clients.email) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...MUTED)
    doc.text(trunc(quote.clients.email, 38), M, y + 12)
  }

  const metaRows: [string, string][] = [
    ['Quote date', formatDate(quote.issue_date)],
    ['Status',     quote.status.toUpperCase()],
  ]

  metaRows.forEach(([label, value], i) => {
    const ry = y + i * 6.5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...MUTED)
    doc.text(label, META_X, ry)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...INK)
    doc.text(value, RIGHT, ry, { align: 'right' })
  })

  y += 26
  hr(doc, y)
  y += 8

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...MUTED)
  doc.text('DESCRIPTION', M, y)
  doc.text('QTY',        QTY_EDGE,   y, { align: 'right' })
  doc.text('UNIT PRICE', PRICE_EDGE, y, { align: 'right' })
  doc.text('TOTAL',      TOTAL_EDGE, y, { align: 'right' })

  y += 3
  hr(doc, y)
  y += 5

  if (items.length === 0) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...MUTED)
    doc.text('No items added yet.', M, y)
    y += 9
  } else {
    items.forEach((item) => {
      if (y > 242) { doc.addPage(); y = M + 10 }

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(...INK)
      doc.text(trunc(item.description, 52), M, y)
      doc.text(String(item.quantity),             QTY_EDGE,   y, { align: 'right' })
      doc.text(formatCurrency(item.unit_price),   PRICE_EDGE, y, { align: 'right' })
      doc.text(formatCurrency(item.line_total),   TOTAL_EDGE, y, { align: 'right' })

      if (item.notes) {
        y += 5
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7.5)
        doc.setTextColor(...MUTED)
        doc.text(trunc(item.notes, 58), M, y)
      }

      y += 7
      hr(doc, y - 1, BORDER)
    })
  }

  y += 5

  function totalsRow(
    label: string,
    value: string,
    opts: { bold?: boolean; lineAbove?: boolean } = {},
  ) {
    if (opts.lineAbove) {
      hr(doc, y - 2, BORDER)
      y += 2
    }
    doc.setFont('helvetica', opts.bold ? 'bold' : 'normal')
    doc.setFontSize(opts.bold ? 10 : 9)
    doc.setTextColor(...MUTED)
    doc.text(label, TOTAL_LABEL_X, y)
    doc.setFont('helvetica', opts.bold ? 'bold' : 'normal')
    doc.setTextColor(...INK)
    doc.text(value, TOTAL_EDGE, y, { align: 'right' })
    y += opts.bold ? 7 : 5.5
  }

  totalsRow('Subtotal', formatCurrency(quote.subtotal))
  totalsRow(`VAT (${(VAT_RATE * 100).toFixed(0)}%)`, formatCurrency(quote.vat_amount))
  totalsRow('TOTAL', formatCurrency(quote.total_amount), { bold: true, lineAbove: true })

  if (quote.notes) {
    y += 6
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(8.5)
    doc.setTextColor(...MUTED)
    const noteLines = doc.splitTextToSize(quote.notes, RIGHT - M)
    doc.text(noteLines, M, y)
    y += noteLines.length * 5
  }

  y += 8
  addDocFooter(doc, y, quote.quote_number)
  return doc
}

export async function generateInvoicePDF(
  invoice: InvoiceWithClient,
  items: OrderItem[],
  payments: Payment[],
): Promise<void> {
  const doc = await buildInvoiceDoc(invoice, items, payments)
  doc.save(`${invoice.invoice_number}.pdf`)
}

export async function getInvoicePDFBlob(
  invoice: InvoiceWithClient,
  items: OrderItem[],
  payments: Payment[],
): Promise<Blob> {
  const doc = await buildInvoiceDoc(invoice, items, payments)
  return new Blob([doc.output('arraybuffer')], { type: 'application/pdf' })
}

export async function getInvoicePDFBase64(
  invoice: InvoiceWithClient,
  items: OrderItem[],
  payments: Payment[],
): Promise<string> {
  const doc = await buildInvoiceDoc(invoice, items, payments)
  return doc.output('datauristring').split(',')[1]
}

export async function getQuotePDFBase64(
  quote: QuoteWithClient,
  items: QuoteItem[],
): Promise<string> {
  const doc = await buildQuoteDoc(quote, items)
  return doc.output('datauristring').split(',')[1]
}

export async function generateQuotePDF(
  quote: QuoteWithClient,
  items: QuoteItem[],
): Promise<void> {
  const doc = await buildQuoteDoc(quote, items)
  doc.save(`${quote.quote_number}.pdf`)
}

export async function getQuotePDFBlob(
  quote: QuoteWithClient,
  items: QuoteItem[],
): Promise<Blob> {
  const doc = await buildQuoteDoc(quote, items)
  return new Blob([doc.output('arraybuffer')], { type: 'application/pdf' })
}

export function buildEmailBody(invoice: InvoiceWithClient, items: OrderItem[]): string {
  const itemRows = items.length > 0
    ? items.map((i) =>
        `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e3de">${i.garment_name}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e3de;text-align:center">${i.quantity}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e3de;text-align:right">${formatCurrency(i.unit_price)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e3de;text-align:right"><strong>${formatCurrency(i.line_total)}</strong></td>
        </tr>`
      ).join('')
    : `<tr><td colspan="4" style="padding:8px 12px;color:#a09d97">See attached invoice for details.</td></tr>`

  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#fafaf8;font-family:Georgia,serif;color:#1a1a18">
  <div style="max-width:600px;margin:32px auto;background:#fff;border:1px solid #e5e3de;border-radius:8px;overflow:hidden">
    <div style="background:#1a1a18;padding:28px 32px">
      <div style="font-size:18px;letter-spacing:0.1em;text-transform:uppercase;color:#f0eee9">TADI wa NASHE</div>
    </div>
    <div style="padding:32px">
      <p style="font-size:15px;margin:0 0 8px">Dear ${invoice.clients.full_name},</p>
      <p style="font-size:14px;color:#6b6860;margin:0 0 24px;line-height:1.6">
        Please find your invoice below. Payment is due by <strong>${formatDate(invoice.due_date)}</strong>.
      </p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
        <thead>
          <tr style="background:#f4f3f0">
            <th style="padding:10px 12px;text-align:left;font-size:11px;letter-spacing:0.06em;color:#a09d97;text-transform:uppercase">Item</th>
            <th style="padding:10px 12px;text-align:center;font-size:11px;letter-spacing:0.06em;color:#a09d97;text-transform:uppercase">Qty</th>
            <th style="padding:10px 12px;text-align:right;font-size:11px;letter-spacing:0.06em;color:#a09d97;text-transform:uppercase">Price</th>
            <th style="padding:10px 12px;text-align:right;font-size:11px;letter-spacing:0.06em;color:#a09d97;text-transform:uppercase">Total</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>
      <div style="border-top:2px solid #1a1a18;padding-top:16px;text-align:right">
        <div style="font-size:12px;color:#6b6860;margin-bottom:4px">Subtotal: ${formatCurrency(invoice.subtotal)}</div>
        <div style="font-size:12px;color:#6b6860;margin-bottom:8px">VAT (15%): ${formatCurrency(invoice.vat_amount)}</div>
        <div style="font-size:18px;font-weight:bold">Total: ${formatCurrency(invoice.total_amount)}</div>
        ${invoice.balance_due < invoice.total_amount ? `<div style="font-size:14px;color:#4a7c59;margin-top:4px">Balance due: ${formatCurrency(invoice.balance_due)}</div>` : ''}
      </div>
      ${invoice.notes ? `<p style="margin-top:24px;font-size:13px;color:#6b6860;line-height:1.6">${invoice.notes}</p>` : ''}
      <p style="margin-top:32px;font-size:14px">Thank you,<br><strong>Tadiwanashe</strong><br><span style="color:#b8845a;font-size:12px">TADI wa NASHE</span></p>
    </div>
    <div style="background:#f4f3f0;padding:16px 32px;font-size:11px;color:#a09d97;text-align:center;border-top:1px solid #e5e3de">
      Invoice ${invoice.invoice_number} · Please use the invoice number as your payment reference.
    </div>
  </div>
</body>
</html>`
}

export function buildQuoteEmailBody(quote: QuoteWithClient, items: QuoteItem[]): string {
  const itemRows = items.length > 0
    ? items.map((i) =>
        `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e3de">${i.description}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e3de;text-align:center">${i.quantity}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e3de;text-align:right">${formatCurrency(i.unit_price)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e3de;text-align:right"><strong>${formatCurrency(i.line_total)}</strong></td>
        </tr>`
      ).join('')
    : `<tr><td colspan="4" style="padding:8px 12px;color:#a09d97">See attached quote for details.</td></tr>`

  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#fafaf8;font-family:Georgia,serif;color:#1a1a18">
  <div style="max-width:600px;margin:32px auto;background:#fff;border:1px solid #e5e3de;border-radius:8px;overflow:hidden">
    <div style="background:#1a1a18;padding:28px 32px">
      <div style="font-size:18px;letter-spacing:0.1em;text-transform:uppercase;color:#f0eee9">TADI wa NASHE</div>
    </div>
    <div style="padding:32px">
      <p style="font-size:15px;margin:0 0 8px">Dear ${quote.clients.full_name},</p>
      <p style="font-size:14px;color:#6b6860;margin:0 0 24px;line-height:1.6">
        Please find your quote below. Don't hesitate to reach out with any questions.
      </p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
        <thead>
          <tr style="background:#f4f3f0">
            <th style="padding:10px 12px;text-align:left;font-size:11px;letter-spacing:0.06em;color:#a09d97;text-transform:uppercase">Description</th>
            <th style="padding:10px 12px;text-align:center;font-size:11px;letter-spacing:0.06em;color:#a09d97;text-transform:uppercase">Qty</th>
            <th style="padding:10px 12px;text-align:right;font-size:11px;letter-spacing:0.06em;color:#a09d97;text-transform:uppercase">Price</th>
            <th style="padding:10px 12px;text-align:right;font-size:11px;letter-spacing:0.06em;color:#a09d97;text-transform:uppercase">Total</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>
      <div style="border-top:2px solid #1a1a18;padding-top:16px;text-align:right">
        <div style="font-size:12px;color:#6b6860;margin-bottom:4px">Subtotal: ${formatCurrency(quote.subtotal)}</div>
        <div style="font-size:12px;color:#6b6860;margin-bottom:8px">VAT (15%): ${formatCurrency(quote.vat_amount)}</div>
        <div style="font-size:18px;font-weight:bold">Total: ${formatCurrency(quote.total_amount)}</div>
      </div>
      ${quote.notes ? `<p style="margin-top:24px;font-size:13px;color:#6b6860;line-height:1.6">${quote.notes}</p>` : ''}
      <p style="margin-top:32px;font-size:14px">Thank you,<br><strong>Tadiwanashe</strong><br><span style="color:#b8845a;font-size:12px">TADI wa NASHE</span></p>
    </div>
    <div style="background:#f4f3f0;padding:16px 32px;font-size:11px;color:#a09d97;text-align:center;border-top:1px solid #e5e3de">
      Quote ${quote.quote_number} · tadiwanashekaparipari@outlook.com · +27 73 928 0572
    </div>
  </div>
</body>
</html>`
}
