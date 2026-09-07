import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge, Button, Card, EmptyState, Input, PasswordInput } from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import { getStudentOverview } from '../utils/userStorage'
import { format, parseISO } from 'date-fns'
import { tr } from 'date-fns/locale'

function StudentPasswordRow({ password }: { password?: string }) {
  const [visible, setVisible] = useState(false)

  if (!password) {
    return <p className="text-xs text-amber-700">Şifre kayıtlı değil — sıfırlayın</p>
  }

  return (
    <div className="mt-2 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
      <span className="text-xs text-slate-500">Şifre:</span>
      <code className="min-w-0 flex-1 truncate font-mono text-sm font-semibold text-slate-800">
        {visible ? password : '•'.repeat(Math.min(password.length, 12))}
      </code>
      <button
        type="button"
        className="shrink-0 rounded-md px-2 py-1 text-sm text-slate-500 hover:bg-slate-200"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Şifreyi gizle' : 'Şifreyi göster'}
      >
        {visible ? '🙈' : '👁'}
      </button>
    </div>
  )
}

export function TeacherHomePage() {
  const { user, getStudents, createStudent, openStudent, resetPassword, removeStudent, logout, refresh } = useAuth()
  const navigate = useNavigate()
  const students = getStudents()
  const overviews = useMemo(() => students.map(getStudentOverview), [students])

  const [showForm, setShowForm] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [createdCreds, setCreatedCreds] = useState<{ username: string; password: string; name: string } | null>(null)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const result = await createStudent({ displayName, username, password })
    setLoading(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setCreatedCreds({ username: result.user.username, password, name: result.user.displayName })
    setDisplayName('')
    setUsername('')
    setPassword('')
    setShowForm(false)
  }

  const handleResetPassword = async (studentId: string, name: string) => {
    const next = window.prompt(`${name} için yeni şifre (min. 4 karakter):`)
    if (!next) return
    const result = await resetPassword(studentId, next)
    if (!result.ok) {
      alert(result.error)
      return
    }
    refresh()
    alert(`Şifre güncellendi.\nYeni şifre: ${next}`)
  }

  const handleRemove = (studentId: string, name: string) => {
    if (!confirm(`${name} hesabını kaldırmak istiyor musunuz? Veriler cihazda kalır ama giriş yapamaz.`)) return
    removeStudent(studentId)
  }

  const openAndGo = (studentId: string) => {
    openStudent(studentId)
    navigate('/')
  }

  return (
    <div className="mx-auto min-h-dvh max-w-lg bg-slate-50 pb-8">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-primary-800 px-4 py-4 text-white shadow-md">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">Öğretmen Paneli</h1>
            <p className="mt-0.5 text-sm text-blue-100">{user?.displayName}</p>
          </div>
          <Button variant="ghost" className="!text-white hover:!bg-white/20" onClick={logout}>
            Çıkış
          </Button>
        </div>
      </header>

      <main className="space-y-4 px-4 py-4">
        {createdCreds && (
          <Card className="border-green-200 bg-green-50">
            <p className="font-semibold text-green-900">Öğrenci hesabı oluşturuldu</p>
            <p className="mt-1 text-sm text-green-800">{createdCreds.name}</p>
            <p className="mt-2 font-mono text-sm text-green-900">
              Kullanıcı: <strong>{createdCreds.username}</strong>
              <br />
              Şifre: <strong>{createdCreds.password}</strong>
            </p>
            <p className="mt-2 text-xs text-green-700">Bu bilgileri öğrenciye verin. Şifreyi panelden istediğiniz zaman görebilirsiniz.</p>
            <Button className="mt-3" variant="secondary" onClick={() => setCreatedCreds(null)}>
              Tamam
            </Button>
          </Card>
        )}

        <div className="flex items-center justify-between">
          <h2 className="font-bold text-slate-800">Öğrenciler ({students.length})</h2>
          <Button onClick={() => setShowForm((v) => !v)}>{showForm ? 'İptal' : '+ Öğrenci Ekle'}</Button>
        </div>

        {showForm && (
          <Card>
            <form onSubmit={handleCreate} className="space-y-3">
              <Input label="Öğrenci adı" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required placeholder="Ad Soyad" />
              <Input label="Kullanıcı adı" value={username} onChange={(e) => setUsername(e.target.value)} required placeholder="ornek.ogrenci" />
              <PasswordInput label="Şifre" value={password} onChange={(e) => setPassword(e.target.value)} required />
              {error && <p className="text-sm font-medium text-red-600">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Kaydediliyor…' : 'Hesabı Oluştur'}
              </Button>
            </form>
          </Card>
        )}

        {overviews.length === 0 ? (
          <Card>
            <EmptyState
              icon="👥"
              title="Henüz öğrenci yok"
              description="Öğrenci ekleyerek kullanıcı adı ve şifre oluşturun"
            />
          </Card>
        ) : (
          <ul className="space-y-3">
            {overviews.map(({ user: s, testCount, mockCount, todayCompleted, todayTotal, lastActivity }) => (
              <li key={s.id}>
                <Card>
                  <button type="button" className="w-full text-left" onClick={() => openAndGo(s.id)}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-bold text-slate-900">{s.displayName}</p>
                        <p className="text-xs text-slate-500">@{s.username}</p>
                      </div>
                      <Badge color="bg-primary-50 text-primary-800">Çalışmaları gör →</Badge>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-lg bg-slate-50 py-2">
                        <p className="text-lg font-bold text-slate-800">{testCount}</p>
                        <p className="text-[10px] text-slate-500">Test</p>
                      </div>
                      <div className="rounded-lg bg-slate-50 py-2">
                        <p className="text-lg font-bold text-slate-800">{mockCount}</p>
                        <p className="text-[10px] text-slate-500">Deneme</p>
                      </div>
                      <div className="rounded-lg bg-slate-50 py-2">
                        <p className="text-lg font-bold text-slate-800">
                          {todayCompleted}/{todayTotal}
                        </p>
                        <p className="text-[10px] text-slate-500">Bugün</p>
                      </div>
                    </div>
                    {lastActivity && (
                      <p className="mt-2 text-xs text-slate-400">
                        Son aktivite:{' '}
                        {format(parseISO(lastActivity), 'd MMM yyyy', { locale: tr })}
                      </p>
                    )}
                  </button>
                  <div onClick={(e) => e.stopPropagation()}>
                    <StudentPasswordRow password={s.passwordPlain} />
                  </div>
                  <div className="mt-3 flex gap-2 border-t border-slate-100 pt-3">
                    <Button
                      variant="secondary"
                      className="flex-1 !py-2 text-xs"
                      onClick={() => handleResetPassword(s.id, s.displayName)}
                    >
                      Şifre sıfırla
                    </Button>
                    <Button
                      variant="danger"
                      className="flex-1 !py-2 text-xs"
                      onClick={() => handleRemove(s.id, s.displayName)}
                    >
                      Kaldır
                    </Button>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}

        <Card className="bg-amber-50 border-amber-100">
          <p className="text-sm text-amber-900">
            Hesaplar ve çalışmalar bu tarayıcıda saklanır. Öğrenciler aynı cihazda / tarayıcıda kendi kullanıcı adıyla giriş yapmalıdır.
          </p>
        </Card>
      </main>
    </div>
  )
}
