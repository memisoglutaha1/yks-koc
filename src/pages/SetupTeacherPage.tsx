import { useState } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { Button, Card, Input, PasswordInput } from '../components/Layout'
import { useAuth } from '../context/AuthContext'

export function SetupTeacherPage() {
  const { setupTeacher, user } = useAuth()
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (user) return <Navigate to="/" replace />

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password !== password2) {
      setError('Şifreler eşleşmiyor.')
      return
    }
    setLoading(true)
    const result = await setupTeacher(displayName, username, password)
    setLoading(false)
    if (!result.ok) setError(result.error)
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center bg-slate-50 px-4 py-8">
      <div className="mb-6 text-center">
        <p className="text-4xl">👩‍🏫</p>
        <h1 className="mt-3 text-2xl font-bold text-primary-800">Öğretmen Hesabı</h1>
        <p className="mt-1 text-sm text-slate-500">Öğrencilerinizi buluttan yönetmek için hesabınızı oluşturun</p>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input label="Adınız" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required placeholder="Örn. Ayşe Öğretmen" />
          <Input label="Kullanıcı adı" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required placeholder="ayse.ogretmen" />
          <PasswordInput label="Şifre" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required />
          <PasswordInput label="Şifre tekrar" value={password2} onChange={(e) => setPassword2(e.target.value)} autoComplete="new-password" required />
          {error && <p className="text-sm font-medium text-red-600">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Oluşturuluyor…' : 'Hesabı Oluştur'}
          </Button>
        </form>
      </Card>

      <p className="mt-4 text-center text-xs text-slate-500">
        Hesap ve veriler bulutta saklanır. Öğrenciler herhangi bir cihazdan giriş yapabilir.
      </p>
      <p className="mt-2 text-center text-sm">
        <Link to="/giris" className="text-primary-700">
          Giriş sayfasına dön
        </Link>
      </p>
    </div>
  )
}
