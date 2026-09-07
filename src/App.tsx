import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { AppProvider } from './context/AppContext'
import { DashboardPage } from './pages/DashboardPage'
import { KonularPage } from './pages/KonularPage'
import { TestPage } from './pages/TestPage'
import { ProgramPage } from './pages/ProgramPage'
import { DenemelerPage } from './pages/DenemelerPage'
import { RaporPage } from './pages/RaporPage'
import { OtomatikPlanPage } from './pages/OtomatikPlanPage'
import { AyarlarPage } from './pages/AyarlarPage'
import { ProfilPage } from './pages/ProfilPage'
import { LoginPage } from './pages/LoginPage'
import { SetupTeacherPage } from './pages/SetupTeacherPage'
import { TeacherHomePage } from './pages/TeacherHomePage'
import type { ReactNode } from 'react'

function StudentAppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/konular" element={<KonularPage />} />
      <Route path="/test" element={<TestPage />} />
      <Route path="/program" element={<ProgramPage />} />
      <Route path="/plan" element={<OtomatikPlanPage />} />
      <Route path="/denemeler" element={<DenemelerPage />} />
      <Route path="/rapor" element={<RaporPage />} />
      <Route path="/gunluk-rapor" element={<RaporPage />} />
      <Route path="/profil" element={<ProfilPage />} />
      <Route path="/ayarlar" element={<AyarlarPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function TeacherViewBanner() {
  const { viewingStudent, closeStudent } = useAuth()
  const navigate = useNavigate()
  if (!viewingStudent) return null

  return (
    <div className="sticky top-0 z-50 border-b border-amber-200 bg-amber-100 px-4 py-2">
      <div className="mx-auto flex max-w-lg items-center justify-between gap-2">
        <p className="min-w-0 truncate text-sm font-medium text-amber-950">
          Öğrenci: <strong>{viewingStudent.displayName}</strong>
        </p>
        <button
          type="button"
          className="shrink-0 rounded-lg bg-amber-800 px-3 py-1.5 text-xs font-semibold text-white"
          onClick={() => {
            closeStudent()
            navigate('/ogretmen')
          }}
        >
          Panele dön
        </button>
      </div>
    </div>
  )
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, needsSetup } = useAuth()
  if (!user) return <Navigate to={needsSetup ? '/kurulum' : '/giris'} replace />
  return children
}

function AppRoutes() {
  const { user, isTeacher, viewingStudent, activeStudentId } = useAuth()

  if (!user) {
    return (
      <Routes>
        <Route path="/giris" element={<LoginPage />} />
        <Route path="/kurulum" element={<SetupTeacherPage />} />
        <Route path="*" element={<Navigate to="/giris" replace />} />
      </Routes>
    )
  }

  if (isTeacher && !viewingStudent) {
    return (
      <Routes>
        <Route
          path="/ogretmen"
          element={
            <RequireAuth>
              <TeacherHomePage />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/ogretmen" replace />} />
      </Routes>
    )
  }

  if (!activeStudentId) {
    return <Navigate to={isTeacher ? '/ogretmen' : '/giris'} replace />
  }

  const displayName = viewingStudent?.displayName ?? user.displayName

  return (
    <AppProvider userId={activeStudentId} studentDisplayName={displayName}>
      <TeacherViewBanner />
      <StudentAppRoutes />
    </AppProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}
