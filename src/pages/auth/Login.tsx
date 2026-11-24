import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, LogIn, ShieldCheck, GraduationCap } from 'lucide-react'
import { useData } from '@/store/DataContext'
import { Field, Input } from '@/components/ui/primitives'
import { DEMO_PASSWORDS } from '@/data/seed'
import collegeImg from '@/assets/college.webp'
import kleLogo from '@/assets/kle-logo.webp'

const schema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})
type Form = z.infer<typeof schema>

export default function Login() {
  const { login, user, db } = useData()
  const nav = useNavigate()
  const loc = useLocation()
  const [error, setError] = useState<string | null>(null)
  const [show, setShow] = useState(false)
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<Form>({ resolver: zodResolver(schema) })

  if (user) return <Navigate to={user.role === 'student' ? '/student' : '/officer'} replace />

  const onSubmit = async (f: Form) => {
    setError(null)
    try {
      const p = await login(f.email, f.password)
      const from = (loc.state as { from?: string } | null)?.from
      const home = p.role === 'student' ? '/student' : '/officer'
      nav(from && from.startsWith(home) ? from : home, { replace: true })
    } catch (e) { setError((e as Error).message) }
  }

  const demoStudent = db.accounts.find(a => a.profile_id.startsWith('stu_') && db.profiles.find(p => p.id === a.profile_id)?.full_name === 'Ananya Kulkarni')
  const fill = (email: string, pw: string) => { setValue('email', email); setValue('password', pw); setError(null) }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex relative overflow-hidden flex-col justify-between bg-primary-dark text-white p-12">
        <img src={collegeImg} alt={`${db.settings.college_name} campus building`} className="absolute inset-0 w-full h-full object-cover object-[center_60%]" />
        {/* Navy wash keeps the white text readable over the bright sky and the stone steps */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary-dark/85 via-primary-dark/35 to-primary-dark/95" aria-hidden />
        <div className="relative flex items-center gap-3">
          <div className="w-16 h-16 rounded-xl bg-white p-1.5 shadow-lg shrink-0"><img src={kleLogo} alt="KLE Society logo" className="w-full h-full object-contain" /></div>
          <div><p className="font-semibold">{db.settings.short_name}</p><p className="text-sm text-blue-200">Training & Placement Cell</p></div>
        </div>
        <div className="relative [text-shadow:0_1px_12px_rgba(15,31,51,0.6)]">
          <h1 className="text-4xl font-bold leading-tight">Placement Management System</h1>
          <p className="text-blue-50/90 mt-4 max-w-md">One place for placement officers to run drives, track applications and report outcomes — and for students to build their profile, find eligible jobs and prepare for interviews.</p>
          <p className="text-xs text-blue-100/80 mt-6">{db.settings.college_name}</p>
        </div>
      </div>
      <div className="flex flex-col bg-surface-alt">
        {/* Mobile / tablet: the campus photo as a banner above the form */}
        <div className="lg:hidden relative h-48 sm:h-60 overflow-hidden">
          <img src={collegeImg} alt={`${db.settings.college_name} campus building`} className="absolute inset-0 w-full h-full object-cover object-[center_55%]" />
          <div className="absolute inset-0 bg-gradient-to-t from-primary-dark/90 via-primary-dark/30 to-transparent" aria-hidden />
          <div className="absolute bottom-0 left-0 right-0 p-4 flex items-center gap-3 text-white">
            <div className="w-12 h-12 rounded-lg bg-white p-1 shadow shrink-0"><img src={kleLogo} alt="KLE Society logo" className="w-full h-full object-contain" /></div>
            <div className="min-w-0"><p className="font-semibold leading-tight">{db.settings.short_name}</p><p className="text-xs text-blue-100">Training & Placement Cell</p></div>
          </div>
        </div>
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md">
          <div className="card p-6 sm:p-8">
            <img src={kleLogo} alt="" aria-hidden className="hidden lg:block w-20 h-20 object-contain mx-auto mb-4" />
            <h2 className="text-xl font-bold">Sign in</h2>
            <p className="text-sm text-text-secondary mt-1">Use your institutional account. Your role is assigned by the placement cell.</p>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-6" noValidate>
              <Field label="Email" error={errors.email?.message}><Input type="email" autoComplete="username" {...register('email')} /></Field>
              <Field label="Password" error={errors.password?.message}>
                <div className="relative">
                  <Input type={show ? 'text' : 'password'} autoComplete="current-password" className="pr-10" {...register('password')} />
                  <button type="button" onClick={() => setShow(s => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-text-secondary" aria-label={show ? 'Hide password' : 'Show password'}>{show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                </div>
              </Field>
              {error && <p className="text-sm text-danger bg-red-50 border border-red-200 rounded-lg px-3 py-2" role="alert">{error}</p>}
              <button type="submit" disabled={isSubmitting} className="btn-primary w-full"><LogIn className="w-4 h-4" />{isSubmitting ? 'Signing in…' : 'Sign in'}</button>
            </form>
          </div>
          <div className="card p-4 mt-4">
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">Demo accounts (fictional data)</p>
            <div className="grid sm:grid-cols-2 gap-2">
              <button className="btn-outline justify-start" onClick={() => fill('officer@kleghbc.edu', DEMO_PASSWORDS.officer)}><ShieldCheck className="w-4 h-4 text-primary" />Placement officer</button>
              {demoStudent && <button className="btn-outline justify-start" onClick={() => fill(demoStudent.email, DEMO_PASSWORDS.student)}><GraduationCap className="w-4 h-4 text-primary" />Student</button>}
            </div>
            <p className="text-xs text-text-secondary mt-2">Every seeded student can sign in with their email and password <code className="bg-secondary px-1 rounded">{DEMO_PASSWORDS.student}</code>.</p>
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}
