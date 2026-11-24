import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { Camera, Lock, Trash2 } from 'lucide-react'
import { useData } from '@/store/DataContext'
import { useToast } from '@/contexts/ToastContext'
import { useStudent } from '@/hooks/useStudent'
import { Avatar, Card, Field, Input, KV, PageHeader, TagInput, Textarea } from '@/components/ui/primitives'
import { url } from '@/lib/forms'

const schema = z.object({
  full_name: z.string().trim().min(2, 'Name is required'),
  phone: z.string().trim().refine(v => !v || /^\+?[\d\s-]{10,15}$/.test(v), 'Enter a valid phone number').transform(v => v || null),
  career_objective: z.string().trim().max(600, 'Keep it under 600 characters').transform(v => v || null),
  linkedin_url: url,
  github_url: url,
})
type In = z.input<typeof schema>
type Out = z.output<typeof schema>
const INTEREST_SUGGESTIONS = ['Web Development', 'Mobile Apps', 'Data Analytics', 'Databases', 'Cloud', 'Cyber Security', 'Accounting', 'Banking', 'Marketing', 'Sales', 'Teaching', 'Design']

export default function Profile() {
  const { api } = useData()
  const { run } = useToast()
  const { me } = useStudent()
  const [interests, setInterests] = useState<string[]>(me.interests)
  const { register, handleSubmit, formState: { errors, isDirty, isSubmitting } } = useForm<In, unknown, Out>({
    resolver: zodResolver(schema),
    defaultValues: { full_name: me.full_name, phone: me.phone ?? '', career_objective: me.career_objective ?? '', linkedin_url: me.linkedin_url ?? '', github_url: me.github_url ?? '' },
  })
  const interestsDirty = JSON.stringify(interests) !== JSON.stringify(me.interests)

  return (
    <div className="max-w-5xl">
      <PageHeader title="My Profile" description="Keep your details current — recruiters see this information with your applications." />
      <div className="grid lg:grid-cols-[280px_1fr] gap-4 items-start">
        <Card>
          <div className="flex flex-col items-center text-center">
            <Avatar name={me.full_name} photo={me.profile_photo_url} size="xl" />
            <div className="flex gap-2 mt-3">
              <label className="btn-outline btn-sm cursor-pointer"><Camera className="w-3.5 h-3.5" />{me.profile_photo_url ? 'Change' : 'Upload'} photo<input type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) run(() => api.uploadPhoto(f), 'Photo updated') }} /></label>
              {me.profile_photo_url && <button className="btn-ghost btn-sm" onClick={() => run(() => api.updateMyProfile({ profile_photo_url: null }), 'Photo removed')} aria-label="Remove photo"><Trash2 className="w-3.5 h-3.5" /></button>}
            </div>
            <p className="text-xs text-text-secondary mt-2">JPG or PNG, under 2 MB</p>
          </div>
          <div className="mt-5 pt-4 border-t border-border">
            <p className="text-xs font-semibold text-text-secondary uppercase flex items-center gap-1 mb-3"><Lock className="w-3.5 h-3.5" />Verified by placement cell</p>
            <dl className="space-y-3"><KV label="USN">{me.usn}</KV><KV label="Email">{me.email}</KV><KV label="Degree & department">{me.degree} · {me.department}</KV><KV label="Graduation year">{me.batch}</KV><KV label="Semester">{me.semester}</KV></dl>
            <p className="text-xs text-text-secondary mt-3">Contact the placement cell to correct these.</p>
          </div>
        </Card>
        <div className="space-y-4">
          <Card title="Personal & contact details">
            <form noValidate className="grid sm:grid-cols-2 gap-4" onSubmit={handleSubmit(v => run(() => api.updateMyProfile(v), 'Profile saved'))}>
              <Field label="Full name" required error={errors.full_name?.message}><Input {...register('full_name')} /></Field>
              <Field label="Phone (used for WhatsApp alerts)" error={errors.phone?.message}><Input {...register('phone')} /></Field>
              <Field label="LinkedIn URL" error={errors.linkedin_url?.message}><Input {...register('linkedin_url')} placeholder="https://linkedin.com/in/…" /></Field>
              <Field label="GitHub / portfolio URL" error={errors.github_url?.message}><Input {...register('github_url')} placeholder="https://" /></Field>
              <Field label="Career objective" className="sm:col-span-2" error={errors.career_objective?.message}><Textarea {...register('career_objective')} placeholder="2–3 lines about the role you want and what you bring" /></Field>
              <div className="sm:col-span-2"><button className="btn-primary" disabled={!isDirty || isSubmitting}>Save details</button></div>
            </form>
          </Card>
          <Card title="Technical & professional interests">
            <p className="text-sm text-text-secondary mb-3">Used to personalise job recommendations.</p>
            <TagInput value={interests} onChange={setInterests} placeholder="Add an interest" suggestions={INTEREST_SUGGESTIONS} />
            <button className="btn-primary mt-3" disabled={!interestsDirty} onClick={() => run(() => api.updateMyProfile({ interests }), 'Interests saved')}>Save interests</button>
          </Card>
        </div>
      </div>
    </div>
  )
}
