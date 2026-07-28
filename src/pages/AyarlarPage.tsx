import { Layout, Card, Button, Badge } from '../components/Layout'
import { useApp } from '../context/AppContext'
import { useState } from 'react'
import { Link } from 'react-router-dom'

export function AyarlarPage() {
  const { exportData, importData, resetAllData } = useApp()
  const [importText, setImportText] = useState('')
  const [resetPassword, setResetPassword] = useState('')
  const [resetError, setResetError] = useState('')

  const handleExport = () => {
    const json = exportData()
    navigator.clipboard.writeText(json).catch(() => {})
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `yks-kocu-yedek-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = () => {
    if (!importText.trim()) return
    const ok = importData(importText)
    if (ok) {
      alert('Veriler başarıyla yüklendi!')
      setImportText('')
    } else {
      alert('Geçersiz yedek dosyası.')
    }
  }

  const handleReset = () => {
    setResetError('')
    if (!resetPassword.trim()) {
      setResetError('Sıfırlama şifresini girin.')
      return
    }
    if (!confirm('Tüm test, plan ve program verileri silinecek. Emin misiniz?')) return
    const ok = resetAllData(resetPassword.trim())
    if (!ok) {
      setResetError('Şifre hatalı. Veriler silinmedi.')
      return
    }
    setResetPassword('')
    alert('Veriler sıfırlandı. Profil bilgileriniz korundu.')
  }

  return (
    <Layout title="Ayarlar" subtitle="Yedekleme ve veri yönetimi">
      <Card>
        <p className="mb-3 text-sm text-slate-600">
          Hedef sıralama ve profil bilgileri için{' '}
          <Link to="/profil" className="font-semibold text-primary-700 underline">
            Öğrenci Profili
          </Link>{' '}
          sekmesini kullanın.
        </p>
      </Card>

      <Card className="mt-4">
        <h2 className="mb-3 font-bold text-slate-800">Veri Yedekleme</h2>
        <p className="mb-3 text-sm text-slate-600">
          Tüm test, deneme ve program verilerinizi yedekleyin veya geri yükleyin.
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleExport} className="flex-1">
            📥 Yedek İndir
          </Button>
        </div>
        <div className="mt-3">
          <label className="mb-1 block text-sm font-medium text-slate-700">Yedekten Geri Yükle</label>
          <textarea
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono"
            rows={4}
            placeholder='{"settings":...} JSON yapıştırın'
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
          />
          <Button variant="secondary" onClick={handleImport} className="mt-2 w-full">
            Yedeği Yükle
          </Button>
        </div>
      </Card>

      <Card className="mt-4">
        <h2 className="mb-2 font-bold text-red-700">Tehlikeli Bölge</h2>
        <p className="mb-3 text-sm text-slate-600">
          Tüm test, plan ve program verilerini siler. Profil bilgileri korunur. Geri alınamaz.
        </p>
        <label className="mb-1 block text-sm font-medium text-slate-700">Sıfırlama Şifresi</label>
        <input
          type="password"
          className="mb-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          placeholder="Şifreyi girin"
          value={resetPassword}
          onChange={(e) => {
            setResetPassword(e.target.value)
            setResetError('')
          }}
        />
        {resetError && <p className="mb-2 text-sm text-red-600">{resetError}</p>}
        <Button variant="danger" className="w-full" onClick={handleReset}>
          Tüm Verileri Sıfırla
        </Button>
      </Card>

      <div className="mt-4 text-center text-xs text-slate-400">
        <Badge color="bg-slate-100 text-slate-500">YKS Koçu v1.0</Badge>
        <p className="mt-1">Veriler bu cihazda saklanır</p>
      </div>
    </Layout>
  )
}
