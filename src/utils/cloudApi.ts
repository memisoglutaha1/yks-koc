import type { AppData } from '../types'
import type { CreateStudentInput, UserAccount } from '../types/auth'
import { getSupabase, isSupabaseConfigured } from '../lib/supabase'
import { DEFAULT_APP_DATA, normalizeAppData } from './appData'

const TOKEN_KEY = 'yks-kocu-session-token'
const VIEW_KEY = 'yks-kocu-viewing-student'

export { isSupabaseConfigured }

type RpcOk<T> = { ok: true } & T
type RpcErr = { ok: false; error: string }
type RpcResult<T> = RpcOk<T> | RpcErr

function mapUser(raw: Record<string, unknown>): UserAccount {
  return {
    id: String(raw.id),
    username: String(raw.username),
    displayName: String(raw.displayName),
    role: raw.role as UserAccount['role'],
    passwordHash: '',
    salt: '',
    passwordPlain: (raw.passwordPlain as string | null) ?? undefined,
    teacherId: (raw.teacherId as string | null) ?? undefined,
    createdAt: String(raw.createdAt ?? new Date().toISOString()),
    active: Boolean(raw.active ?? true),
  }
}

async function rpc<T extends Record<string, unknown>>(
  name: string,
  args: Record<string, unknown>,
): Promise<RpcResult<T>> {
  const { data, error } = await getSupabase().rpc(name, args)
  if (error) return { ok: false, error: error.message }
  const payload = data as RpcResult<T>
  if (!payload || typeof payload !== 'object') return { ok: false, error: 'Sunucu yanıtı geçersiz.' }
  return payload
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setStoredToken(token: string | null): void {
  if (!token) localStorage.removeItem(TOKEN_KEY)
  else localStorage.setItem(TOKEN_KEY, token)
}

export function getLocalViewingStudentId(): string | null {
  return localStorage.getItem(VIEW_KEY)
}

export function setLocalViewingStudentId(id: string | null): void {
  if (!id) localStorage.removeItem(VIEW_KEY)
  else localStorage.setItem(VIEW_KEY, id)
}

export async function registerTeacher(
  displayName: string,
  username: string,
  password: string,
): Promise<{ ok: true; user: UserAccount } | { ok: false; error: string }> {
  const result = await rpc<{ token: string; user: Record<string, unknown> }>('register_teacher', {
    p_display_name: displayName,
    p_username: username,
    p_password: password,
  })
  if (!result.ok) return result
  setStoredToken(result.token)
  setLocalViewingStudentId(null)
  return { ok: true, user: mapUser(result.user) }
}

export async function login(
  username: string,
  password: string,
): Promise<{ ok: true; user: UserAccount } | { ok: false; error: string }> {
  const result = await rpc<{ token: string; user: Record<string, unknown> }>('login', {
    p_username: username,
    p_password: password,
  })
  if (!result.ok) return result
  setStoredToken(result.token)
  setLocalViewingStudentId(null)
  return { ok: true, user: mapUser(result.user) }
}

export async function logout(): Promise<void> {
  const token = getStoredToken()
  if (token) {
    await rpc('logout', { p_token: token }).catch(() => undefined)
  }
  setStoredToken(null)
  setLocalViewingStudentId(null)
}

export async function restoreSession(): Promise<{
  user: UserAccount | null
  viewingStudent: UserAccount | null
}> {
  const token = getStoredToken()
  if (!token) return { user: null, viewingStudent: null }

  const result = await rpc<{
    user: Record<string, unknown>
    viewingStudent: Record<string, unknown> | null
  }>('get_session', { p_token: token })

  if (!result.ok) {
    setStoredToken(null)
    setLocalViewingStudentId(null)
    return { user: null, viewingStudent: null }
  }

  const viewing = result.viewingStudent ? mapUser(result.viewingStudent) : null
  if (viewing) setLocalViewingStudentId(viewing.id)
  else setLocalViewingStudentId(null)

  return { user: mapUser(result.user), viewingStudent: viewing }
}

export async function createStudent(
  input: CreateStudentInput,
): Promise<{ ok: true; user: UserAccount } | { ok: false; error: string }> {
  const token = getStoredToken()
  if (!token) return { ok: false, error: 'Oturum yok.' }
  const result = await rpc<{ user: Record<string, unknown> }>('create_student', {
    p_token: token,
    p_display_name: input.displayName,
    p_username: input.username,
    p_password: input.password,
  })
  if (!result.ok) return result
  return { ok: true, user: mapUser(result.user) }
}

export async function listStudents(): Promise<UserAccount[]> {
  const token = getStoredToken()
  if (!token) return []
  const result = await rpc<{ students: Record<string, unknown>[] }>('list_students', { p_token: token })
  if (!result.ok) return []
  return (result.students ?? []).map(mapUser)
}

export async function resetStudentPassword(
  studentId: string,
  newPassword: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const token = getStoredToken()
  if (!token) return { ok: false, error: 'Oturum yok.' }
  return rpc('reset_student_password', {
    p_token: token,
    p_student_id: studentId,
    p_new_password: newPassword,
  })
}

export async function deactivateStudent(studentId: string): Promise<boolean> {
  const token = getStoredToken()
  if (!token) return false
  const result = await rpc('deactivate_student', { p_token: token, p_student_id: studentId })
  return result.ok
}

export async function setViewingStudent(studentId: string | null): Promise<void> {
  const token = getStoredToken()
  if (!token) return
  await rpc('set_viewing_student', {
    p_token: token,
    p_student_id: studentId,
  })
  setLocalViewingStudentId(studentId)
}

export async function fetchStudentAppData(
  studentId: string | null,
  displayName?: string,
): Promise<AppData> {
  const token = getStoredToken()
  if (!token) return normalizeAppData(null, displayName)

  const result = await rpc<{ data: Partial<AppData> }>('get_student_data', {
    p_token: token,
    p_student_id: studentId,
  })
  if (!result.ok) return normalizeAppData(null, displayName)
  return normalizeAppData(result.data ?? null, displayName)
}

export async function persistStudentAppData(studentId: string | null, data: AppData): Promise<void> {
  const token = getStoredToken()
  if (!token) return
  await rpc('save_student_data', {
    p_token: token,
    p_data: data,
    p_student_id: studentId,
  })
}

export interface StudentOverviewRemote {
  user: UserAccount
  testCount: number
  mockCount: number
  todayCompleted: number
  todayTotal: number
  lastActivity: string | null
}

export async function fetchStudentOverviews(): Promise<StudentOverviewRemote[]> {
  const token = getStoredToken()
  if (!token) return []
  const result = await rpc<{ overviews: Array<Record<string, unknown>> }>('get_student_overview', {
    p_token: token,
  })
  if (!result.ok) return []
  return (result.overviews ?? []).map((row) => ({
    user: mapUser(row.user as Record<string, unknown>),
    testCount: Number(row.testCount ?? 0),
    mockCount: Number(row.mockCount ?? 0),
    todayCompleted: Number(row.todayCompleted ?? 0),
    todayTotal: Number(row.todayTotal ?? 0),
    lastActivity: (row.lastActivity as string | null) ?? null,
  }))
}

export function cloudUnavailableMessage(): string {
  return 'Bulut bağlantısı yok. VITE_SUPABASE_URL ve VITE_SUPABASE_ANON_KEY ayarlayın.'
}

// Keep DEFAULT exports reachable for store
export { DEFAULT_APP_DATA, normalizeAppData }
