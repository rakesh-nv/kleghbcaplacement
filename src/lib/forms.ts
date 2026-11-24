import { z } from 'zod'

/** Number input that may be blank (→ null). */
export const optNum = (min: number, max: number, msg?: string) =>
  z.preprocess(v => (v === '' || v == null || (typeof v === 'number' && Number.isNaN(v)) ? null : Number(v)),
    z.number({ error: 'Must be a number' }).min(min, msg ?? `Minimum ${min}`).max(max, msg ?? `Maximum ${max}`).nullable())

export const reqNum = (min: number, max: number, label = 'Value') =>
  z.preprocess(v => (v === '' || v == null ? undefined : Number(v)),
    z.number({ error: `${label} is required` }).min(min, `${label} must be ≥ ${min}`).max(max, `${label} must be ≤ ${max}`))

export const optStr = z.string().trim().transform(v => v || null)
export const url = z.string().trim().refine(v => !v || /^https?:\/\/\S+$/.test(v), 'Must start with http:// or https://').transform(v => v || null)
