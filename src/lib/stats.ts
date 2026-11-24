import type { DB, Profile } from '@/types/models'
import { checkEligibility, isJobOpen } from './eligibility'
import { APPLICATION_STATUSES } from './placementStatus'
import { labelize, pct } from './utils'

export interface StatFilter { batch?: number | null; department?: string | null; from?: string | null; to?: string | null }

export function filterStudents(db: DB, f: StatFilter): Profile[] {
  return db.profiles.filter(p => p.role === 'student' && (f.batch == null || p.batch === f.batch) && (!f.department || p.department === f.department))
}

const inRange = (iso: string | null | undefined, f: StatFilter) => {
  if (!iso) return !f.from && !f.to
  const d = iso.slice(0, 10)
  return (!f.from || d >= f.from) && (!f.to || d <= f.to)
}

/** A student counts as eligible for placements if active and eligible for at least one job targeting their batch. */
export function isPlacementEligible(db: DB, p: Profile): boolean {
  if (!p.is_active) return false
  return db.jobs.some(j => j.status !== 'draft' && checkEligibility(p, j, db.rules.find(r => r.job_id === j.id), db.skills.filter(s => s.student_id === p.id)).eligible)
}

export function computeStats(db: DB, f: StatFilter) {
  const students = filterStudents(db, f)
  const ids = new Set(students.map(s => s.id))
  const apps = db.applications.filter(a => ids.has(a.student_id) && inRange(a.created_at, f))
  const results = db.results.filter(r => ids.has(r.student_id) && inRange(r.offer_date, f))
  const placedIds = new Set(results.filter(r => r.status === 'accepted').map(r => r.student_id))
  const eligible = students.filter(s => isPlacementEligible(db, s))
  return {
    students, apps, results,
    totalStudents: students.length,
    eligibleStudents: eligible.length,
    totalCompanies: db.companies.length,
    activeCompanies: db.companies.filter(c => c.is_active).length,
    activeJobs: db.jobs.filter(isJobOpen).length,
    totalApplications: apps.length,
    placed: placedIds.size,
    notPlaced: students.length - placedIds.size,
    placementPct: pct(placedIds.size, students.length),
    placedIds,
  }
}

export function monthlyPlacements(db: DB, f: StatFilter, months = 12) {
  const students = new Set(filterStudents(db, f).map(s => s.id))
  const now = new Date()
  const buckets = Array.from({ length: months }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1)
    return { key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, name: d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }), offers: 0, accepted: 0 }
  })
  for (const r of db.results) {
    if (!students.has(r.student_id) || !r.offer_date) continue
    const b = buckets.find(x => x.key === r.offer_date!.slice(0, 7))
    if (!b) continue
    b.offers++
    if (r.status === 'accepted') b.accepted++
  }
  return buckets.map(({ name, offers, accepted }) => ({ name, offers, accepted }))
}

export function departmentStats(db: DB, f: StatFilter) {
  const s = computeStats(db, f)
  return db.settings.departments.map(dep => {
    const list = s.students.filter(x => x.department === dep)
    const placed = list.filter(x => s.placedIds.has(x.id)).length
    return { name: dep, placed, notPlaced: list.length - placed, total: list.length, pct: pct(placed, list.length) }
  }).filter(r => r.total > 0)
}

export function companyStats(db: DB, f: StatFilter) {
  const s = computeStats(db, f)
  return db.companies.map(c => {
    const apps = s.apps.filter(a => db.jobs.find(j => j.id === a.job_id)?.company_id === c.id)
    const appIds = new Set(apps.map(a => a.id))
    const res = s.results.filter(r => r.company_id === c.id)
    return {
      id: c.id, name: c.name.replace(/ (Pvt\. Ltd\.|Co\.)$/, ''), fullName: c.name,
      jobs: db.jobs.filter(j => j.company_id === c.id).length,
      applications: apps.length,
      interviews: db.interviews.filter(i => appIds.has(i.application_id) && i.status !== 'cancelled').length,
      offers: res.length,
      placements: res.filter(r => r.status === 'accepted').length,
    }
  })
}

export function statusDistribution(db: DB, f: StatFilter) {
  const s = computeStats(db, f)
  return APPLICATION_STATUSES.map(st => ({ name: labelize(st), count: s.apps.filter(a => a.status === st).length })).filter(r => r.count > 0)
}

export function batchTrend(db: DB, f: StatFilter) {
  const batches = [...new Set(db.profiles.filter(p => p.role === 'student' && p.batch).map(p => p.batch!))].sort()
  return batches.map(b => {
    const s = computeStats(db, { ...f, batch: b })
    return { name: String(b), placed: s.placed, total: s.totalStudents, pct: s.placementPct }
  })
}

export function packageStats(values: number[]) {
  if (!values.length) return { count: 0, highest: 0, lowest: 0, average: 0, median: 0 }
  const v = [...values].sort((a, b) => a - b)
  const mid = Math.floor(v.length / 2)
  return {
    count: v.length, highest: v[v.length - 1], lowest: v[0],
    average: Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 100) / 100,
    median: v.length % 2 ? v[mid] : Math.round(((v[mid - 1] + v[mid]) / 2) * 100) / 100,
  }
}
