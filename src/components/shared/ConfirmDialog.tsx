import type { ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Modal } from './Modal'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning' | 'info'
  onConfirm: () => void
  onCancel: () => void
  children?: ReactNode
  confirmDisabled?: boolean
}

export function ConfirmDialog({ isOpen, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', variant = 'danger', onConfirm, onCancel, children, confirmDisabled }: ConfirmDialogProps) {
  const tone = variant === 'danger' ? 'bg-red-100 text-red-600' : variant === 'warning' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-primary'
  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title} size="sm"
      footer={<><button onClick={onCancel} className="btn-secondary">{cancelLabel}</button><button onClick={onConfirm} disabled={confirmDisabled} className={variant === 'danger' ? 'btn-danger' : 'btn-primary'}>{confirmLabel}</button></>}>
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-full shrink-0 ${tone}`}><AlertTriangle className="w-5 h-5" /></div>
        <div className="text-sm text-text-secondary flex-1">{message}</div>
      </div>
      {children && <div className="mt-4">{children}</div>}
    </Modal>
  )
}
