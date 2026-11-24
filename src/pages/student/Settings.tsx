import { useData } from '@/store/DataContext'
import { useStudent } from '@/hooks/useStudent'
import { Card, KV, PageHeader } from '@/components/ui/primitives'
import { ChangePassword } from '@/pages/shared/ChangePassword'
import { useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'

export default function StudentSettings() {
  const { logout } = useData()
  const { me } = useStudent()
  const nav = useNavigate()
  return (
    <div className="max-w-4xl">
      <PageHeader title="Settings" description="Account security and how the placement cell reaches you." />
      <div className="grid lg:grid-cols-2 gap-4">
        <ChangePassword />
        <div className="space-y-4">
          <Card title="Notification channels">
            <dl className="space-y-3">
              <KV label="In-app notifications">Always on</KV>
              <KV label="Email">{me.email}</KV>
              <KV label="WhatsApp">{me.phone ?? 'Add a phone number on My Profile to receive WhatsApp alerts'}</KV>
            </dl>
            <p className="text-xs text-text-secondary mt-3">Email and WhatsApp are sent by the placement cell when those integrations are configured.</p>
          </Card>
          <Card title="Account">
            <dl className="space-y-3 mb-4"><KV label="Role">Student (assigned by the placement cell)</KV><KV label="USN">{me.usn}</KV></dl>
            <button className="btn-outline text-danger" onClick={() => { logout(); nav('/login') }}><LogOut className="w-4 h-4" />Sign out</button>
          </Card>
        </div>
      </div>
    </div>
  )
}
