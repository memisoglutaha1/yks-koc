import type { AppData, AppSettings } from '../types'
import type { AuthSession, CreateStudentInput, UserAccount } from '../types/auth'
import { DEFAULT_PLANNER_SETTINGS, normalizePlannerSettings } from './autoPlanner'
import { createSalt, hashPassword, verifyPassword } from './password'
import { generateId } from './calculations'

const USERS_KEY = 'yks-kocu-users'
const SESSION_KEY = 'yks-kocu-session'
const LEGACY_DATA_KEY = 'yks-kocu-data'

export function studentDataKey(userId: string): string {
  return `yks-kocu-data-${userId}`
}

function normalizeSettings(settings: Partial<AppSettings> = {}): AppSettings {
  const targetRankTyt = settings.targetRankTyt ?? settings.targetRank ?? 20000
  const targetRankAyt = settings.targetRankAyt ?? settings.targetRank ?? 20000
  const previousRank = settings.previousRank ?? 363000
  return {
    studentName: settings.studentName ?? 'Öğrenci',
    targetRank: Math.min(targetRankTyt, targetRankAyt),
    targetRankTyt,
    targetRankAyt,
    previousRank,
    previousRankTyt: settings.previousRankTyt ?? previousRank,
    previousRankAyt: settings.previousRankAyt ?? previousRank,
    examYear: settings.examYear ?? 2027,
  }
}

export const DEFAULT_SETTINGS: AppSettings = normalizeSettings({
  studentName: 'Öğrenci',
  targetRank: 20000,
  targetRankTyt: 50000,
  targetRankAyt: 20000,
  previousRank: 363000,
  previousRankTyt: 363000,
  previousRankAyt: 363000,
  examYear: 2027,
})

export const DEFAULT_APP_DATA: AppData = {
  settings: DEFAULT_SETTINGS,
  testResults: [],
  dailyTasks: [],
  mockExams: [],
  topicProgress: {},
  plannerSettings: DEFAULT_PLANNER_SETTINGS,
  generatedPlan: null,
}

export function normalizeAppData(parsed: Partial<AppData> | null | undefined, studentName?: string): AppData {
  const base = parsed ?? {}
  return {
    ...DEFAULT_APP_DATA,
    ...base,
    settings: normalizeSettings({
      ...DEFAULT_SETTINGS,
      ...base.settings,
      ...(studentName ? { studentName } : {}),
    }),
    plannerSettings: normalizePlannerSettings({
      ...DEFAULT_PLANNER_SETTINGS,
      ...base.plannerSettings,
    }),
    generatedPlan: base.generatedPlan ?? null,
  }
}

export function loadUsers(): UserAccount[] {
  try {
    const raw = localStorage.getItem(USERS_KEY)
    if (!raw) return []
    return JSON.parse(raw) as UserAccount[]
  } catch {
    return []
  }
}

function saveUsers(users: UserAccount[]): void {
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
}

export function hasTeacherAccount(): boolean {
  return loadUsers().some((u) => u.role === 'teacher' && u.active)
}

export function loadSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    return JSON.parse(raw) as AuthSession
  } catch {
    return null
  }
}

export function saveSession(session: AuthSession | null): void {
  if (!session) {
    localStorage.removeItem(SESSION_KEY)
    return
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function getUserById(id: string): UserAccount | undefined {
  return loadUsers().find((u) => u.id === id)
}

export function getUserByUsername(username: string): UserAccount | undefined {
  const normalized = username.trim().toLowerCase()
  return loadUsers().find((u) => u.username === normalized)
}

export function loadStudentAppData(userId: string, displayName?: string): AppData {
  try {
    const raw = localStorage.getItem(studentDataKey(userId))
    if (!raw) return normalizeAppData(null, displayName)
    return normalizeAppData(JSON.parse(raw) as AppData, displayName)
  } catch {
    return normalizeAppData(null, displayName)
  }
}

export function saveStudentAppData(userId: string, data: AppData): void {
  localStorage.setItem(studentDataKey(userId), JSON.stringify(data))
}

export function initStudentData(userId: string, studentName: string): void {
  const legacy = localStorage.getItem(LEGACY_DATA_KEY)
  if (legacy && !localStorage.getItem(studentDataKey(userId))) {
    try {
      const parsed = JSON.parse(legacy) as AppData
      saveStudentAppData(userId, normalizeAppData(parsed, studentName))
      return
    } catch {
      /* fall through */
    }
  }
  if (!localStorage.getItem(studentDataKey(userId))) {
    saveStudentAppData(userId, normalizeAppData(null, studentName))
  }
}

export async function registerTeacher(displayName: string, username: string, password: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (hasTeacherAccount()) return { ok: false, error: 'Bu cihazda zaten bir öğretmen hesabı var.' }
  const normalized = username.trim().toLowerCase()
  if (!normalized || normalized.length < 3) return { ok: false, error: 'Kullanıcı adı en az 3 karakter olmalı.' }
  if (password.length < 4) return { ok: false, error: 'Şifre en az 4 karakter olmalı.' }
  if (getUserByUsername(normalized)) return { ok: false, error: 'Bu kullanıcı adı alınmış.' }

  const salt = createSalt()
  const passwordHash = await hashPassword(password, salt)
  const teacher: UserAccount = {
    id: generateId(),
    username: normalized,
    displayName: displayName.trim() || 'Öğretmen',
    role: 'teacher',
    passwordHash,
    salt,
    createdAt: new Date().toISOString(),
    active: true,
  }
  saveUsers([teacher])
  saveSession({ userId: teacher.id })
  return { ok: true }
}

export async function login(username: string, password: string): Promise<{ ok: true; user: UserAccount } | { ok: false; error: string }> {
  const user = getUserByUsername(username)
  if (!user || !user.active) return { ok: false, error: 'Kullanıcı adı veya şifre hatalı.' }
  const valid = await verifyPassword(password, user.salt, user.passwordHash)
  if (!valid) return { ok: false, error: 'Kullanıcı adı veya şifre hatalı.' }
  saveSession({ userId: user.id })
  return { ok: true, user }
}

export function logout(): void {
  saveSession(null)
}

export async function createStudent(
  teacherId: string,
  input: CreateStudentInput,
): Promise<{ ok: true; user: UserAccount } | { ok: false; error: string }> {
  const normalized = input.username.trim().toLowerCase()
  if (!input.displayName.trim()) return { ok: false, error: 'Öğrenci adı gerekli.' }
  if (!normalized || normalized.length < 3) return { ok: false, error: 'Kullanıcı adı en az 3 karakter olmalı.' }
  if (input.password.length < 4) return { ok: false, error: 'Şifre en az 4 karakter olmalı.' }
  if (getUserByUsername(normalized)) return { ok: false, error: 'Bu kullanıcı adı alınmış.' }

  const salt = createSalt()
  const passwordHash = await hashPassword(input.password, salt)
  const student: UserAccount = {
    id: generateId(),
    username: normalized,
    displayName: input.displayName.trim(),
    role: 'student',
    passwordHash,
    salt,
    passwordPlain: input.password,
    teacherId,
    createdAt: new Date().toISOString(),
    active: true,
  }

  const users = loadUsers()
  users.push(student)
  saveUsers(users)
  initStudentData(student.id, student.displayName)
  return { ok: true, user: student }
}

export async function resetStudentPassword(
  teacherId: string,
  studentId: string,
  newPassword: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (newPassword.length < 4) return { ok: false, error: 'Şifre en az 4 karakter olmalı.' }
  const users = loadUsers()
  const idx = users.findIndex((u) => u.id === studentId && u.role === 'student' && u.teacherId === teacherId)
  if (idx < 0) return { ok: false, error: 'Öğrenci bulunamadı.' }
  const salt = createSalt()
  const passwordHash = await hashPassword(newPassword, salt)
  users[idx] = { ...users[idx], salt, passwordHash, passwordPlain: newPassword }
  saveUsers(users)
  return { ok: true }
}

export function deactivateStudent(teacherId: string, studentId: string): boolean {
  const users = loadUsers()
  const idx = users.findIndex((u) => u.id === studentId && u.role === 'student' && u.teacherId === teacherId)
  if (idx < 0) return false
  users[idx] = { ...users[idx], active: false }
  saveUsers(users)
  return true
}

export function listStudentsForTeacher(teacherId: string): UserAccount[] {
  return loadUsers()
    .filter((u) => u.role === 'student' && u.teacherId === teacherId && u.active)
    .sort((a, b) => a.displayName.localeCompare(b.displayName, 'tr'))
}

export function setViewingStudent(studentId: string | null): void {
  const session = loadSession()
  if (!session) return
  saveSession({ ...session, viewingStudentId: studentId })
}

export interface StudentOverview {
  user: UserAccount
  testCount: number
  mockCount: number
  todayCompleted: number
  todayTotal: number
  lastActivity: string | null
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

export function getStudentOverview(student: UserAccount): StudentOverview {
  const data = loadStudentAppData(student.id, student.displayName)
  const today = todayStr()
  const todayTasks = data.dailyTasks.filter((t) => t.date === today)
  const dates = [
    ...data.testResults.map((t) => t.date),
    ...data.mockExams.map((m) => m.date),
    ...data.dailyTasks.filter((t) => t.completedAt).map((t) => t.completedAt!.slice(0, 10)),
  ].sort()
  return {
    user: student,
    testCount: data.testResults.length,
    mockCount: data.mockExams.length,
    todayCompleted: todayTasks.filter((t) => t.completed).length,
    todayTotal: todayTasks.length,
    lastActivity: dates.length > 0 ? dates[dates.length - 1] : null,
  }
}
