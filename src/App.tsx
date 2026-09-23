import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { AppProvider, useApp } from './context/AppContext'
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
            void closeStudent().then(() => navigate('/ogretmen'))
          }}
        >
          Panele dön
        </button>
      </div>
    </div>
  )
}

function StudentDataGate({ children }: { children: ReactNode }) {
  const { loading, loadError, saveError, retryLoad } = useApp()

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-50 text-sm text-slate-500">
        Veriler yükleniyor…
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center bg-slate-50 px-4">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-950">
          <p className="font-semibold">Veriler alınamadı</p>
          <p className="mt-2">Kayıtlar değiştirilmedi. {loadError}</p>
          <button
            type="button"
            className="mt-3 rounded-lg bg-red-800 px-3 py-2 text-xs font-semibold text-white"
            onClick={retryLoad}
          >
            Tekrar dene
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      {saveError && (
        <div className="bg-red-100 px-4 py-2 text-center text-xs font-medium text-red-950">
          Buluta kaydedilemedi. Bu ekrandaki giriş duruyor ve tekrar denenecek. Sayfayı kapatmayın.
        </div>
      )}
      {children}
    </>
  )
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/giris" replace />
  return children
}

function AppRoutes() {
  const { ready, cloudReady, user, isTeacher, viewingStudent, activeStudentId } = useAuth()

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-50 text-sm text-slate-500">
        Yükleniyor…
      </div>
    )
  }

  if (!cloudReady) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center bg-slate-50 px-4 py-8">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <p className="font-semibold">Bulut ayarı gerekli</p>
          <p className="mt-2">
            Farklı cihazlardan takip için Supabase anahtarlarını ekleyin. Ayrıntılar: <code>README.md</code> ve{' '}
            <code>supabase/schema.sql</code>
          </p>
        </div>
      </div>
    )
  }

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
      <StudentDataGate>
        <StudentAppRoutes />
      </StudentDataGate>
    </AppProvider>
  )
}

const routerBasename = import.meta.env.BASE_URL.replace(/\/$/, '') || undefined

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter basename={routerBasename}>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}
