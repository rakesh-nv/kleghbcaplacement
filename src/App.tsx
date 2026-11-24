import { lazy, Suspense, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { DataProvider, useData } from '@/store/DataContext'
import { ToastProvider } from '@/contexts/ToastContext'
import { ProtectedRoute, Toaster } from '@/components/ui/misc'
import { PageSkeleton } from '@/components/ui/primitives'
import { AppShell } from '@/layouts/AppShell'
import Login from '@/pages/auth/Login'

const o = {
  Dashboard: lazy(() => import('@/pages/officer/Dashboard')),
  Students: lazy(() => import('@/pages/officer/Students')),
  StudentDetail: lazy(() => import('@/pages/officer/StudentDetail')),
  ResumeAnalysis: lazy(() => import('@/pages/officer/ResumeAnalysis')),
  Companies: lazy(() => import('@/pages/officer/Companies')),
  Jobs: lazy(() => import('@/pages/officer/Jobs')),
  Eligible: lazy(() => import('@/pages/officer/EligibleStudents')),
  Applications: lazy(() => import('@/pages/officer/Applications')),
  Drives: lazy(() => import('@/pages/officer/Drives')),
  Interviews: lazy(() => import('@/pages/officer/Interviews')),
  Results: lazy(() => import('@/pages/officer/Results')),
  Messaging: lazy(() => import('@/pages/officer/Messaging')),
  Reports: lazy(() => import('@/pages/officer/Reports')),
  Settings: lazy(() => import('@/pages/officer/Settings')),
}
const s = {
  Home: lazy(() => import('@/pages/student/Home')),
  Profile: lazy(() => import('@/pages/student/Profile')),
  Academics: lazy(() => import('@/pages/student/Academics')),
  Skills: lazy(() => import('@/pages/student/Skills')),
  Resume: lazy(() => import('@/pages/student/Resume')),
  Analyzer: lazy(() => import('@/pages/student/Analyzer')),
  Recommended: lazy(() => import('@/pages/student/Recommended')),
  Jobs: lazy(() => import('@/pages/student/Jobs')),
  Applications: lazy(() => import('@/pages/student/Applications')),
  Interviews: lazy(() => import('@/pages/student/Interviews')),
  Placement: lazy(() => import('@/pages/student/Placement')),
  Learning: lazy(() => import('@/pages/student/Learning')),
  Settings: lazy(() => import('@/pages/student/Settings')),
}
const Notifications = lazy(() => import('@/pages/shared/Notifications'))

const L = ({ children }: { children: ReactNode }) => <Suspense fallback={<PageSkeleton />}>{children}</Suspense>

function RootRedirect() {
  const { user } = useData()
  return <Navigate to={!user ? '/login' : user.role === 'student' ? '/student' : '/officer'} replace />
}

export default function App() {
  return (
    <DataProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/login" element={<Login />} />
            <Route path="/officer" element={<ProtectedRoute role={['placement_officer', 'admin']}><AppShell variant="officer" /></ProtectedRoute>}>
              <Route index element={<L><o.Dashboard /></L>} />
              <Route path="students" element={<L><o.Students /></L>} />
              <Route path="students/:id" element={<L><o.StudentDetail /></L>} />
              <Route path="resume-analysis" element={<L><o.ResumeAnalysis /></L>} />
              <Route path="companies" element={<L><o.Companies /></L>} />
              <Route path="jobs" element={<L><o.Jobs /></L>} />
              <Route path="eligible" element={<L><o.Eligible /></L>} />
              <Route path="applications" element={<L><o.Applications /></L>} />
              <Route path="drives" element={<L><o.Drives /></L>} />
              <Route path="interviews" element={<L><o.Interviews /></L>} />
              <Route path="results" element={<L><o.Results /></L>} />
              <Route path="whatsapp" element={<L><o.Messaging key="whatsapp" channel="whatsapp" /></L>} />
              <Route path="email" element={<L><o.Messaging key="email" channel="email" /></L>} />
              <Route path="reports" element={<L><o.Reports /></L>} />
              <Route path="settings" element={<L><o.Settings /></L>} />
              <Route path="notifications" element={<L><Notifications /></L>} />
              <Route path="*" element={<Navigate to="/officer" replace />} />
            </Route>
            <Route path="/student" element={<ProtectedRoute role={['student']}><AppShell variant="student" /></ProtectedRoute>}>
              <Route index element={<L><s.Home /></L>} />
              <Route path="profile" element={<L><s.Profile /></L>} />
              <Route path="academics" element={<L><s.Academics /></L>} />
              <Route path="skills" element={<L><s.Skills /></L>} />
              <Route path="resume" element={<L><s.Resume /></L>} />
              <Route path="analyzer" element={<L><s.Analyzer /></L>} />
              <Route path="recommended" element={<L><s.Recommended /></L>} />
              <Route path="jobs" element={<L><s.Jobs /></L>} />
              <Route path="applications" element={<L><s.Applications /></L>} />
              <Route path="interviews" element={<L><s.Interviews /></L>} />
              <Route path="placement" element={<L><s.Placement /></L>} />
              <Route path="learning" element={<L><s.Learning /></L>} />
              <Route path="notifications" element={<L><Notifications /></L>} />
              <Route path="settings" element={<L><s.Settings /></L>} />
              <Route path="*" element={<Navigate to="/student" replace />} />
            </Route>
            <Route path="*" element={<RootRedirect />} />
          </Routes>
          <Toaster />
        </BrowserRouter>
      </ToastProvider>
    </DataProvider>
  )
}
