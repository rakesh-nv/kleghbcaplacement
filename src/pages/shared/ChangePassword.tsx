import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useData } from '@/store/DataContext'
import { useToast } from '@/contexts/ToastContext'
import { Card, Field, Input } from '@/components/ui/primitives'

const schema = z.object({
  current: z.string().min(1, 'Enter your current password'),
  next: z.string().min(8, 'At least 8 characters').regex(/[A-Z]/, 'Include an uppercase letter').regex(/\d/, 'Include a number'),
  confirm: z.string(),
}).refine(v => v.next === v.confirm, { message: 'Passwords do not match', path: ['confirm'] })
type F = z.infer<typeof schema>

export function ChangePassword() {
  const { api } = useData()
  const { run } = useToast()
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<F>({ resolver: zodResolver(schema) })
  return (
    <Card title="Change password">
      <form className="space-y-3" noValidate onSubmit={handleSubmit(async v => { if (await run(() => api.changePassword(v.current, v.next), 'Password changed')) reset() })}>
        <Field label="Current password" error={errors.current?.message}><Input type="password" autoComplete="current-password" {...register('current')} /></Field>
        <Field label="New password" error={errors.next?.message}><Input type="password" autoComplete="new-password" {...register('next')} /></Field>
        <Field label="Confirm new password" error={errors.confirm?.message}><Input type="password" autoComplete="new-password" {...register('confirm')} /></Field>
        <button className="btn-primary" disabled={isSubmitting}>Update password</button>
        <p className="text-xs text-text-secondary">Demo mode: passwords are kept in this browser only. Production uses Supabase Auth.</p>
      </form>
    </Card>
  )
}
