import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { DB, Profile } from '@/types/models'
import { buildSeed, SEED_VERSION } from '@/data/seed'
import { createApi, type Api } from '@/services/api'
import { derivePlacementStatus } from '@/lib/placementStatus'
import { clearFiles } from '@/lib/fileStore'

const DB_KEY = 'kleghbc-demo-db'
const SESSION_KEY = 'kleghbc-demo-session'

function loadDb(): DB {
  try {
    const raw = localStorage.getItem(DB_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as DB
      if (parsed.version === SEED_VERSION) return parsed
    }
  } catch { /* fall through to seed */ }
  return buildSeed()
}

function saveDb(db: DB) {
  try { localStorage.setItem(DB_KEY, JSON.stringify(db)) } catch (e) { console.warn('Could not persist demo data', e) }
}

interface Ctx {
  db: DB
  api: Api
  user: Profile | null
  ready: boolean
  login: (email: string, password: string) => Promise<Profile>
  logout: () => void
  resetDemoData: () => Promise<void>
}

const DataContext = createContext<Ctx | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<DB>(loadDb)
  const [sessionId, setSessionId] = useState<string | null>(() => { try { return localStorage.getItem(SESSION_KEY) } catch { return null } })
  const [ready, setReady] = useState(false)
  const dbRef = useRef(db)
  const sessionRef = useRef(sessionId)
  dbRef.current = db
  sessionRef.current = sessionId

  useEffect(() => { saveDb(db) }, [db])
  useEffect(() => { const t = setTimeout(() => setReady(true), 150); return () => clearTimeout(t) }, [])

  const commit = useCallback((fn: (d: DB) => void) => {
    const draft = structuredClone(dbRef.current)
    fn(draft) // throws → draft discarded, state unchanged
    for (const p of draft.profiles) if (p.role === 'student') p.placement_status = derivePlacementStatus(draft, p.id)
    dbRef.current = draft
    setDb(draft)
  }, [])

  const api = useMemo(() => createApi(
    () => dbRef.current,
    commit,
    () => dbRef.current.profiles.find(p => p.id === sessionRef.current) ?? null,
  ), [commit])

  const user = useMemo(() => {
    const p = db.profiles.find(x => x.id === sessionId) ?? null
    return p && p.is_active ? p : null
  }, [db.profiles, sessionId])

  const login = useCallback(async (email: string, password: string) => {
    const p = await api.login(email, password)
    sessionRef.current = p.id
    setSessionId(p.id)
    try { localStorage.setItem(SESSION_KEY, p.id) } catch { /* ignore */ }
    return p
  }, [api])

  const logout = useCallback(() => {
    sessionRef.current = null
    setSessionId(null)
    try { localStorage.removeItem(SESSION_KEY) } catch { /* ignore */ }
  }, [])

  const resetDemoData = useCallback(async () => {
    const fresh = buildSeed()
    await clearFiles().catch(() => undefined)
    dbRef.current = fresh
    setDb(fresh)
  }, [])

  return <DataContext.Provider value={{ db, api, user, ready, login, logout, resetDemoData }}>{children}</DataContext.Provider>
}

export function useData() {
  const c = useContext(DataContext)
  if (!c) throw new Error('useData must be used inside DataProvider')
  return c
}

/** The signed-in user. Pages under ProtectedRoute can rely on it being non-null. */
export function useMe(): Profile {
  const { user } = useData()
  if (!user) throw new Error('Not signed in')
  return user
}
