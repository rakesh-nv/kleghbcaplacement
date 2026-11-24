import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import Papa from 'papaparse'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function uid(prefix = ''): string {
  const r = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36)
  return prefix ? `${prefix}_${r}` : r
}

export const nowISO = () => new Date().toISOString()

export function formatDate(date: string | Date | null | undefined, format: 'short' | 'long' | 'relative' = 'short'): string {
  if (!date) return '—'
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return '—'
  if (format === 'short') return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  if (format === 'long') return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  const diff = Date.now() - d.getTime()
  const abs = Math.abs(diff)
  const mins = Math.floor(abs / 60000), hours = Math.floor(mins / 60), days = Math.floor(hours / 24)
  const sfx = diff >= 0 ? ' ago' : ''
  const pfx = diff < 0 ? 'in ' : ''
  if (days > 7) return formatDate(date, 'short')
  if (days > 0) return `${pfx}${days}d${sfx}`
  if (hours > 0) return `${pfx}${hours}h${sfx}`
  if (mins > 0) return `${pfx}${mins}m${sfx}`
  return 'Just now'
}

export function formatTime(date: string | Date): string {
  return new Date(date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}

/** Packages are stored in LPA (lakhs per annum). */
export function formatLPA(min: number | null | undefined, max?: number | null): string {
  if (min == null && max == null) return 'Not disclosed'
  if (min != null && max != null && max !== min) return `₹${min}–${max} LPA`
  return `₹${min ?? max} LPA`
}

export function getInitials(name: string): string {
  return name.split(/\s+/).filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export function labelize(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

export function downloadBlob(blob: Blob, filename: string) {
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(link.href), 1000)
}

export function exportCSV(rows: Record<string, unknown>[], filename: string): boolean {
  if (rows.length === 0) return false
  const csv = Papa.unparse(rows.map(r => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, Array.isArray(v) ? v.join('; ') : v ?? '']))))
  downloadBlob(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }), `${filename}_${new Date().toISOString().slice(0, 10)}.csv`)
  return true
}

export function truncate(str: string, length: number): string {
  return str.length <= length ? str : str.slice(0, length) + '…'
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(2)} MB`
}

export function toLocalInput(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function startOfWeek(d = new Date()): string {
  const x = new Date(d)
  const day = (x.getDay() + 6) % 7
  x.setDate(x.getDate() - day)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`
}

export function isPast(iso: string | null | undefined): boolean {
  return !!iso && new Date(iso).getTime() < Date.now()
}

export function pct(n: number, d: number): number {
  return d === 0 ? 0 : Math.round((n / d) * 1000) / 10
}

export function splitList(s: string): string[] {
  return s.split(/[,;\n]/).map(x => x.trim()).filter(Boolean)
}
