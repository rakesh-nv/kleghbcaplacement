import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

export interface Toast { id: string; type: 'success' | 'error' | 'warning' | 'info'; title: string; message?: string }

interface Ctx {
  toasts: Toast[]
  toast: (t: Omit<Toast, 'id'>) => void
  dismiss: (id: string) => void
  /** Runs an async action, showing a success toast or the error message. Returns true on success. */
  run: (fn: () => Promise<unknown>, success?: string) => Promise<boolean>
}

const ToastContext = createContext<Ctx | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const dismiss = useCallback((id: string) => setToasts(p => p.filter(t => t.id !== id)), [])
  const toast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2)
    setToasts(p => [...p.slice(-3), { ...t, id }])
    setTimeout(() => dismiss(id), t.type === 'error' ? 7000 : 4000)
  }, [dismiss])
  const run = useCallback(async (fn: () => Promise<unknown>, success?: string) => {
    try {
      await fn()
      if (success) toast({ type: 'success', title: success })
      return true
    } catch (e) {
      toast({ type: 'error', title: 'Action failed', message: (e as Error).message })
      return false
    }
  }, [toast])
  return <ToastContext.Provider value={{ toasts, toast, dismiss, run }}>{children}</ToastContext.Provider>
}

export function useToast() {
  const c = useContext(ToastContext)
  if (!c) throw new Error('useToast must be used inside ToastProvider')
  return c
}
