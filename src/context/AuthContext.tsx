import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { CreateStudentInput, UserAccount } from '../types/auth'
import {
  createStudent as createStudentAccount,
  deactivateStudent,
  getUserById,
  hasTeacherAccount,
  listStudentsForTeacher,
  loadSession,
  login as loginUser,
  logout as logoutUser,
  registerTeacher,
  resetStudentPassword,
  saveSession,
  setViewingStudent as persistViewingStudent,
} from '../utils/userStorage'

interface AuthContextValue {
  user: UserAccount | null
  viewingStudent: UserAccount | null
  /** Veri yüklenecek hesap (öğrenci veya öğretmenin incelediği öğrenci) */
  activeStudentId: string | null
  isTeacher: boolean
  needsSetup: boolean
  login: (username: string, password: string) => Promise<{ ok: true } | { ok: false; error: string }>
  setupTeacher: (displayName: string, username: string, password: string) => Promise<{ ok: true } | { ok: false; error: string }>
  logout: () => void
  createStudent: (input: CreateStudentInput) => Promise<{ ok: true; user: UserAccount } | { ok: false; error: string }>
  resetPassword: (studentId: string, newPassword: string) => Promise<{ ok: true } | { ok: false; error: string }>
  removeStudent: (studentId: string) => boolean
  getStudents: () => UserAccount[]
  openStudent: (studentId: string) => void
  closeStudent: () => void
  refresh: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function resolveUser(): { user: UserAccount | null; viewingStudent: UserAccount | null } {
  const session = loadSession()
  if (!session) return { user: null, viewingStudent: null }
  const user = getUserById(session.userId) ?? null
  if (!user || !user.active) {
    logoutUser()
    return { user: null, viewingStudent: null }
  }
  const viewingStudent =
    user.role === 'teacher' && session.viewingStudentId
      ? (getUserById(session.viewingStudentId) ?? null)
      : null
  return { user, viewingStudent }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [tick, setTick] = useState(0)
  const refresh = useCallback(() => setTick((t) => t + 1), [])

  const { user, viewingStudent } = useMemo(() => resolveUser(), [tick])

  const needsSetup = !hasTeacherAccount()
  const isTeacher = user?.role === 'teacher'
  const activeStudentId =
    user?.role === 'student' ? user.id : viewingStudent?.id ?? null

  const login = useCallback(
    async (username: string, password: string) => {
      const result = await loginUser(username, password)
      if (!result.ok) return result
      refresh()
      return { ok: true as const }
    },
    [refresh],
  )

  const setupTeacher = useCallback(
    async (displayName: string, username: string, password: string) => {
      const result = await registerTeacher(displayName, username, password)
      if (!result.ok) return result
      refresh()
      return { ok: true as const }
    },
    [refresh],
  )

  const logout = useCallback(() => {
    logoutUser()
    refresh()
  }, [refresh])

  const createStudent = useCallback(
    async (input: CreateStudentInput) => {
      if (!user || user.role !== 'teacher') return { ok: false as const, error: 'Yetkisiz.' }
      const result = await createStudentAccount(user.id, input)
      if (result.ok) refresh()
      return result
    },
    [user, refresh],
  )

  const resetPassword = useCallback(
    async (studentId: string, newPassword: string) => {
      if (!user || user.role !== 'teacher') return { ok: false as const, error: 'Yetkisiz.' }
      const result = await resetStudentPassword(user.id, studentId, newPassword)
      if (result.ok) refresh()
      return result
    },
    [user, refresh],
  )

  const removeStudent = useCallback(
    (studentId: string) => {
      if (!user || user.role !== 'teacher') return false
      const ok = deactivateStudent(user.id, studentId)
      if (ok) {
        const session = loadSession()
        if (session?.viewingStudentId === studentId) {
          saveSession({ ...session, viewingStudentId: null })
        }
        refresh()
      }
      return ok
    },
    [user, refresh],
  )

  const getStudents = useCallback(() => {
    if (!user || user.role !== 'teacher') return []
    return listStudentsForTeacher(user.id)
  }, [user, tick])

  const openStudent = useCallback(
    (studentId: string) => {
      persistViewingStudent(studentId)
      refresh()
    },
    [refresh],
  )

  const closeStudent = useCallback(() => {
    persistViewingStudent(null)
    refresh()
  }, [refresh])

  const value: AuthContextValue = {
    user,
    viewingStudent,
    activeStudentId,
    isTeacher: !!isTeacher,
    needsSetup,
    login,
    setupTeacher,
    logout,
    createStudent,
    resetPassword,
    removeStudent,
    getStudents,
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
