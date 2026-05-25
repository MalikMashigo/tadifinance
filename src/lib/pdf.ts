import jsPDF from 'jspdf'
import type { InvoiceWithClient } from './invoices'
import type { OrderItem, Payment } from '../types/database'
import { formatCurrency, formatDate, VAT_RATE } from '../utils/format'

const BRAND = 'TADI wa NASHE'
const TAGLINE = '"Tadi wa Nashe" — We belong to God'
type RGB = [number, number, number]
const INK: RGB    = [26, 26, 24]
const MUTED: RGB  = [107, 104, 96]
const ACCENT: RGB = [184, 132, 90]
const BORDER: RGB = [229, 227, 222]

function drawHRule(doc: jsPDF, y: number, x1 = 14, x2 = 196, colour: RGB = BORDER) {
  doc.setDrawColor(...colour)
  doc.setLineWidth(0.3)
  doc.line(x1, y, x2, y)
}

function cell(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  w: number,
  align: 'left' | 'right' | 'center' = 'left',
) {
  doc.text(text, align === 'right' ? x + w : align === 'center' ? x + w / 2 : x, y, { align })
}

export function generateInvoicePDF(
  invoice: InvoiceWithClient,
  items: OrderItem[],
  payments: Payment[],
): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = 210
  const margin = 14
  let y = 18

  // ── Brand header ──────────────────────────────────────────────────────────
  doc.setFont('times', 'normal')
  doc.setFontSize(20)
  doc.setTextColor(...INK)
  doc.text(BRAND, margin, y)

  doc.setFontSize(8)
  doc.setTextColor(...ACCENT)
  doc.text(TAGLINE, margin, y + 5)

  // INVOICE label (right)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.setTextColor(...INK)
  doc.text('INVOICE', W - margin, y, { align: 'right' })

  y += 12
  drawHRule(doc, y, margin, W - margin, ACCENT)
  y += 7

  // ── Invoice meta (right column) ───────────────────────────────────────────
  const metaX = W - margin - 60
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)

  const meta = [
    ['Invoice no.', invoice.invoice_number],
    ['Issue date', formatDate(invoice.issue_date)],
    ['Due date', formatDate(invoice.due_date)],
    ['Status', invoice.status.replace('_', ' ').toUpperCase()],
  ]

  meta.forEach(([label, value], i) => {
    doc.setTextColor(...MUTED)
    doc.text(label, metaX, y + i * 5.5)
    doc.setTextColor(...INK)
    doc.setFont('helvetica', 'bold')
    doc.text(value, W - margin, y + i * 5.5, { align: 'right' })
    doc.setFont('helvetica', 'normal')
  })

  // ── Bill to (left column) ─────────────────────────────────────────────────
  doc.setFontSize(8)
  doc.setTextColor(...MUTED)
  doc.setFont('helvetica', 'bold')
  doc.text('BILL TO', margin, y)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...INK)
  doc.text(invoice.clients.full_name, margin, y + 6)

  if (invoice.clients.email) {
    doc.setFontSize(9)
    doc.setTextColor(...MUTED)
    doc.text(invoice.clients.email, margin, y + 11)
  }

  y += meta.length * 5.5 + 8
  drawHRule(doc, y)
  y += 8

  // ── Line items table ──────────────────────────────────────────────────────
  const cols = { item: margin, details: margin + 68, qty: margin + 120, price: margin + 145, total: W - margin }

  // Table header
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...MUTED)
  doc.text('ITEM', cols.item, y)
  doc.text('DETAILS', cols.details, y)
  cell(doc, 'QTY', cols.qty, y, 25, 'right')
  cell(doc, 'UNIT PRICE', cols.price, y, 31, 'right')
  cell(doc, 'TOTAL', cols.total, y, 0, 'right')

  y += 3
  drawHRule(doc, y)
  y += 5

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...INK)

  if (items.length === 0) {
    // Standalone invoice — show a single line for the total amount
    const sub = invoice.subtotal
    doc.text(invoice.notes ?? 'Professional services', cols.item, y)
    cell(doc, '1', cols.qty, y, 25, 'right')
    cell(doc, formatCurrency(sub), cols.price, y, 31, 'right')
    cell(doc, formatCurrency(sub), cols.total, y, 0, 'right')
    y += 7
  } else {
    items.forEach((item) => {
      if (y > 245) {
        doc.addPage()
        y = 18
      }
      doc.setFont('helvetica', 'bold')
      doc.text(item.garment_name, cols.item, y)
      doc.setFont('helvetica', 'normal')

      const details = [item.garment_type, item.fabric, item.colour, item.size]
        .filter(Boolean).join(', ')
      doc.setFontSize(8)
      doc.setTextColor(...MUTED)
      doc.text(details.substring(0, 42), cols.details, y)

      doc.setFontSize(9)
      doc.setTextColor(...INK)
      cell(doc, String(item.quantity), cols.qty, y, 25, 'right')
      cell(doc, formatCurrency(item.unit_price), cols.price, y, 31, 'right')
      cell(doc, formatCurrency(item.line_total), cols.total, y, 0, 'right')
      y += 7
    })
  }

  drawHRule(doc, y)
  y += 6

  // ── Totals ────────────────────────────────────────────────────────────────
  const totalsLabelX = W - margin - 70
  const totalsValueX = W - margin

  function totalsRow(label: string, value: string, bold = false, colour: RGB = INK) {
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setFontSize(bold ? 10 : 9)
    doc.setTextColor(...MUTED)
    doc.text(label, totalsLabelX, y)
    doc.setTextColor(...colour)
    doc.text(value, totalsValueX, y, { align: 'right' })
    y += bold ? 7 : 5.5
  }

  totalsRow('Subtotal', formatCurrency(invoice.subtotal))
  totalsRow(`VAT (${(VAT_RATE * 100).toFixed(0)}%)`, formatCurrency(invoice.vat_amount))

  drawHRule(doc, y - 2, totalsLabelX, W - margin)
  y += 1

  totalsRow('TOTAL', formatCurrency(invoice.total_amount), true)

  if (invoice.amount_paid > 0) {
    totalsRow('Amount paid', `− ${formatCurrency(invoice.amount_paid)}`, false, [74, 124, 89] as RGB)
    drawHRule(doc, y - 2, totalsLabelX, W - margin)
    y += 1
    totalsRow('BALANCE DUE', formatCurrency(invoice.balance_due), true)
  }

  y += 6

  // ── Payment history ───────────────────────────────────────────────────────
  if (payments.length > 0) {
    drawHRule(doc, y)
    y += 6

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...MUTED)
    doc.text('PAYMENT HISTORY', margin, y)
    y += 5

    payments.forEach((p) => {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(...MUTED)
      doc.text(`${formatDate(p.payment_date)}  ·  ${p.payment_method}${p.reference ? `  ·  Ref: ${p.reference}` : ''}`, margin, y)
      doc.setTextColor(...INK)
      doc.text(formatCurrency(p.amount), W - margin, y, { align: 'right' })
      y += 5.5
    })

    y += 4
  }

  // ── Banking details ───────────────────────────────────────────────────────
  y = Math.max(y, 200)
  drawHRule(doc, y, margin, W - margin, ACCENT)
  y += 6

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...ACCENT)
  doc.text('BANKING DETAILS', margin, y)
  y += 5

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...MUTED)
  doc.text('Please use your invoice number as the payment reference.', margin, y)

  // ── Footer ────────────────────────────────────────────────────────────────
  y = 280
  drawHRule(doc, y, margin, W - margin, BORDER)
  y += 5

  doc.setFont('times', 'italic')
  doc.setFontSize(8)
  doc.setTextColor(...MUTED)
  doc.text(TAGLINE, W / 2, y, { align: 'center' })

  // ── Save ──────────────────────────────────────────────────────────────────
  doc.save(`${invoice.invoice_number}.pdf`)
}

export function buildEmailBody(
  invoice: InvoiceWithClient,
  items: OrderItem[],
): string {
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
      <div style="font-size:11px;color:#b8845a;margin-top:4px;letter-spacing:0.06em">We belong to God</div>
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
