import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

export function exportPdf(opts: { title: string; subtitle: string; institution: string; rows: Record<string, unknown>[]; filename: string }) {
  const cols = opts.rows.length ? Object.keys(opts.rows[0]) : []
  const doc = new jsPDF({ orientation: cols.length > 6 ? 'landscape' : 'portrait' })
  doc.setFontSize(9); doc.setTextColor(100)
  doc.text(opts.institution, 14, 12)
  doc.setFontSize(15); doc.setTextColor(30, 58, 95)
  doc.text(opts.title, 14, 21)
  doc.setFontSize(9); doc.setTextColor(100)
  doc.text(`${opts.subtitle} · Generated ${new Date().toLocaleString('en-IN')}`, 14, 27)
  autoTable(doc, {
    startY: 32,
    head: [cols.map(c => c.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()))],
    body: opts.rows.map(r => cols.map(c => { const v = r[c]; return Array.isArray(v) ? v.join(', ') : v == null ? '' : String(v) })),
    styles: { fontSize: 8, cellPadding: 1.8 },
    headStyles: { fillColor: [30, 58, 95] },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    didDrawPage: () => {
      const h = doc.internal.pageSize.getHeight()
      doc.setFontSize(8); doc.setTextColor(140)
      doc.text(`Page ${doc.getNumberOfPages()} · Confidential – for placement cell use`, 14, h - 6)
    },
  })
  doc.save(`${opts.filename}_${new Date().toISOString().slice(0, 10)}.pdf`)
}
