export type UserRole = 'teacher' | 'student'

export interface UserAccount {
  id: string
  username: string
  displayName: string
  role: UserRole
  passwordHash: string
  salt: string
  /** Öğretmenin görebilmesi için öğrenci şifresi (düz metin) */
  passwordPlain?: string
  /** Öğrencinin bağlı olduğu öğretmen */
  teacherId?: string
  createdAt: string
  active: boolean
}

export interface AuthSession {
  userId: string
  /** Öğretmen bir öğrencinin hesabını incelerken */
  viewingStudentId?: string | null
}

export interface CreateStudentInput {
  displayName: string
  username: string
  password: string
}
