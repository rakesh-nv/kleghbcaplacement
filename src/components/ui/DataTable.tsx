import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface Column<T> {
  key: string
  label: string
  render: (row: T) => ReactNode
  /** Provide to make the column sortable. */
  sortValue?: (row: T) => string | number | null | undefined
  className?: string
}

interface Props<T> {
  rows: T[]
  columns: Column<T>[]
  rowKey: (row: T) => string
  pageSize?: number
  loading?: boolean
  empty?: ReactNode
  onRowClick?: (row: T) => void
  actions?: (row: T) => ReactNode
  selectable?: boolean
  selected?: string[]
  onSelectedChange?: (ids: string[]) => void
  initialSort?: { key: string; dir: 'asc' | 'desc' }
}

export function DataTable<T>({ rows, columns, rowKey, pageSize = 10, loading, empty = 'No records found', onRowClick, actions, selectable, selected = [], onSelectedChange, initialSort }: Props<T>) {
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(initialSort ?? null)
  const [size, setSize] = useState(pageSize)

  const sorted = useMemo(() => {
    if (!sort) return rows
    const col = columns.find(c => c.key === sort.key)
    if (!col?.sortValue) return rows
    return [...rows].sort((a, b) => {
      const av = col.sortValue!(a), bv = col.sortValue!(b)
      if (av == null && bv == null) return 0
      if (av == null) return 1
      if (bv == null) return -1
      const r = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv), undefined, { numeric: true })
      return sort.dir === 'asc' ? r : -r
    })
  }, [rows, sort, columns])

  const pages = Math.max(1, Math.ceil(sorted.length / size))
  useEffect(() => { if (page > pages) setPage(1) }, [page, pages])
  const visible = sorted.slice((page - 1) * size, page * size)
  const allOnPage = visible.length > 0 && visible.every(r => selected.includes(rowKey(r)))

  if (loading) return <div className="card p-4 space-y-3">{[...Array(6)].map((_, i) => <div key={i} className="skeleton h-10" />)}</div>

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-border">
              {selectable && (
                <th className="w-10 px-3 py-2.5">
                  <input type="checkbox" aria-label="Select all on page" checked={allOnPage} onChange={() => {
                    const ids = visible.map(rowKey)
                    onSelectedChange?.(allOnPage ? selected.filter(s => !ids.includes(s)) : [...new Set([...selected, ...ids])])
                  }} />
                </th>
              )}
              {columns.map(c => (
                <th key={c.key} scope="col" className={cn('px-4 py-2.5 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide whitespace-nowrap', c.className)}>
                  {c.sortValue ? (
                    <button className="inline-flex items-center gap-1 hover:text-text-primary uppercase" onClick={() => setSort(s => s?.key === c.key ? { key: c.key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key: c.key, dir: 'asc' })}>
                      {c.label}
                      {sort?.key === c.key ? (sort.dir === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />) : <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />}
                    </button>
                  ) : c.label}
                </th>
              ))}
              {actions && <th className="px-4 py-2.5 text-right text-xs font-semibold text-text-secondary uppercase tracking-wide">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {visible.length === 0 ? (
              <tr><td colSpan={columns.length + (actions ? 1 : 0) + (selectable ? 1 : 0)} className="px-4 py-12 text-center text-text-secondary">{empty}</td></tr>
            ) : visible.map(r => {
              const id = rowKey(r)
              return (
                <tr key={id} className={cn('hover:bg-slate-50/70', onRowClick && 'cursor-pointer', selected.includes(id) && 'bg-blue-50/50')} onClick={() => onRowClick?.(r)}>
                  {selectable && (
                    <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" aria-label="Select row" checked={selected.includes(id)} onChange={() => onSelectedChange?.(selected.includes(id) ? selected.filter(s => s !== id) : [...selected, id])} />
                    </td>
                  )}
                  {columns.map(c => <td key={c.key} className={cn('px-4 py-2.5 align-middle', c.className)}>{c.render(r)}</td>)}
                  {actions && <td className="px-4 py-2.5 text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>{actions(r)}</td>}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {sorted.length > 0 && (
        <div className="px-4 py-2.5 border-t border-border flex flex-wrap items-center justify-between gap-2 text-sm text-text-secondary">
          <div className="flex items-center gap-2">
            <span>{(page - 1) * size + 1}–{Math.min(page * size, sorted.length)} of {sorted.length}</span>
            <select value={size} onChange={e => { setSize(Number(e.target.value)); setPage(1) }} className="border border-border rounded-md px-1.5 py-0.5 text-xs bg-white" aria-label="Rows per page">
              {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n} / page</option>)}
            </select>
          </div>
          <div className="flex items-center gap-1">
            <button className="p-1.5 rounded hover:bg-secondary disabled:opacity-40" disabled={page === 1} onClick={() => setPage(p => p - 1)} aria-label="Previous page"><ChevronLeft className="w-4 h-4" /></button>
            <span className="px-2 tabular-nums">{page} / {pages}</span>
            <button className="p-1.5 rounded hover:bg-secondary disabled:opacity-40" disabled={page === pages} onClick={() => setPage(p => p + 1)} aria-label="Next page"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      )}
    </div>
  )
}
