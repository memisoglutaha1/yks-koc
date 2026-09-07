import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Card, Input, PasswordInput } from '../components/Layout'
import { useAuth } from '../context/AuthContext'

export function LoginPage() {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const result = await login(username, password)
    setLoading(false)
    if (!result.ok) setError(result.error)
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center bg-slate-50 px-4 py-8">
      <div className="mb-8 text-center">
        <p className="text-4xl">🎓</p>
        <h1 className="mt-3 text-2xl font-bold text-primary-800">YKS Koçu</h1>
        <p className="mt-1 text-sm text-slate-500">Öğretmen ve öğrenci girişi · tüm cihazlar</p>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            label="Kullanıcı adı"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
          />
          <PasswordInput
            label="Şifre"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
          {error && <p className="text-sm font-medium text-red-600">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Giriş yapılıyor…' : 'Giriş Yap'}
          </Button>
        </form>
      </Card>

      <p className="mt-6 text-center text-sm text-slate-600">
        Öğretmen misiniz?{' '}
        <Link to="/kurulum" className="font-semibold text-primary-700">
          Hesap oluşturun
        </Link>
      </p>
    </div>
  )
}
