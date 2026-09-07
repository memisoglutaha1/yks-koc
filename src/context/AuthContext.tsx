import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import type { CreateStudentInput, UserAccount } from '../types/auth'
import {
  cloudUnavailableMessage,
  createStudent as createStudentApi,
  deactivateStudent as deactivateStudentApi,
  isSupabaseConfigured,
  listStudents as listStudentsApi,
  login as loginApi,
  logout as logoutApi,
  registerTeacher,
  resetStudentPassword as resetStudentPasswordApi,
  restoreSession,
  setViewingStudent as setViewingStudentApi,
} from '../utils/cloudApi'

interface AuthContextValue {
  ready: boolean
  cloudReady: boolean
  user: UserAccount | null
  viewingStudent: UserAccount | null
  activeStudentId: string | null
  isTeacher: boolean
  students: UserAccount[]
  login: (username: string, password: string) => Promise<{ ok: true } | { ok: false; error: string }>
  setupTeacher: (displayName: string, username: string, password: string) => Promise<{ ok: true } | { ok: false; error: string }>
  logout: () => Promise<void>
  createStudent: (input: CreateStudentInput) => Promise<{ ok: true; user: UserAccount } | { ok: false; error: string }>
  resetPassword: (studentId: string, newPassword: string) => Promise<{ ok: true } | { ok: false; error: string }>
  removeStudent: (studentId: string) => Promise<boolean>
  refreshStudents: () => Promise<void>
  openStudent: (studentId: string) => Promise<void>
  closeStudent: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const cloudReady = isSupabaseConfigured()
  const [ready, setReady] = useState(false)
  const [user, setUser] = useState<UserAccount | null>(null)
  const [viewingStudent, setViewingStudent] = useState<UserAccount | null>(null)
  const [students, setStudents] = useState<UserAccount[]>([])

  const refreshStudents = useCallback(async () => {
    if (!cloudReady || !user || user.role !== 'teacher') {
      setStudents([])
      return
    }
    const list = await listStudentsApi()
    setStudents(list)
  }, [cloudReady, user])

  const refresh = useCallback(async () => {
    if (!cloudReady) {
      setUser(null)
      setViewingStudent(null)
      setStudents([])
      setReady(true)
      return
    }
    const session = await restoreSession()
    setUser(session.user)
    setViewingStudent(session.viewingStudent)
    if (session.user?.role === 'teacher') {
      const list = await listStudentsApi()
      setStudents(list)
    } else {
      setStudents([])
    }
    setReady(true)
  }, [cloudReady])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const isTeacher = user?.role === 'teacher'
  const activeStudentId = user?.role === 'student' ? user.id : viewingStudent?.id ?? null

  const login = useCallback(
    async (username: string, password: string) => {
      if (!cloudReady) return { ok: false as const, error: cloudUnavailableMessage() }
      const result = await loginApi(username, password)
      if (!result.ok) return result
      await refresh()
      return { ok: true as const }
    },
    [cloudReady, refresh],
  )

  const setupTeacher = useCallback(
    async (displayName: string, username: string, password: string) => {
      if (!cloudReady) return { ok: false as const, error: cloudUnavailableMessage() }
      const result = await registerTeacher(displayName, username, password)
      if (!result.ok) return result
      await refresh()
      return { ok: true as const }
    },
    [cloudReady, refresh],
  )

  const logout = useCallback(async () => {
    await logoutApi()
    setUser(null)
    setViewingStudent(null)
    setStudents([])
  }, [])

  const createStudent = useCallback(
    async (input: CreateStudentInput) => {
      if (!user || user.role !== 'teacher') return { ok: false as const, error: 'Yetkisiz.' }
      const result = await createStudentApi(input)
      if (result.ok) await refreshStudents()
      return result
    },
    [user, refreshStudents],
  )

  const resetPassword = useCallback(
    async (studentId: string, newPassword: string) => {
      if (!user || user.role !== 'teacher') return { ok: false as const, error: 'Yetkisiz.' }
      const result = await resetStudentPasswordApi(studentId, newPassword)
      if (result.ok) await refreshStudents()
      return result
    },
    [user, refreshStudents],
  )

  const removeStudent = useCallback(
    async (studentId: string) => {
      if (!user || user.role !== 'teacher') return false
      const ok = await deactivateStudentApi(studentId)
      if (ok) {
        if (viewingStudent?.id === studentId) {
          await setViewingStudentApi(null)
          setViewingStudent(null)
        }
        await refreshStudents()
      }
      return ok
    },
    [user, viewingStudent, refreshStudents],
  )

  const openStudent = useCallback(async (studentId: string) => {
    await setViewingStudentApi(studentId)
    const session = await restoreSession()
    setViewingStudent(session.viewingStudent)
  }, [])

  const closeStudent = useCallback(async () => {
    await setViewingStudentApi(null)
    setViewingStudent(null)
  }, [])

  const value: AuthContextValue = {
    ready,
    cloudReady,
    user,
    viewingStudent,
    activeStudentId,
    isTeacher: !!isTeacher,
    students,
    login,
    setupTeacher,
    logout,
    createStudent,
    resetPassword,
    removeStudent,
    refreshStudents,
    openStudent,
    closeStudent,
    refresh,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
