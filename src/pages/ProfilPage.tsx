import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Layout, Card, Button, Input, Badge } from '../components/Layout'
import { RankSelect } from '../components/RankSelect'
import { useApp } from '../context/AppContext'
import { getRankProgress } from '../utils/calculations'
import { TYT_RANK_OPTIONS, AYT_RANK_OPTIONS, formatRank } from '../data/rankOptions'

export function ProfilPage() {
  const { data, updateSettings } = useApp()
  const { settings } = data
  const [name, setName] = useState(settings.studentName)
  const [targetRankTyt, setTargetRankTyt] = useState(settings.targetRankTyt)
  const [targetRankAyt, setTargetRankAyt] = useState(settings.targetRankAyt)
  const [previousRankTyt, setPreviousRankTyt] = useState(settings.previousRankTyt)
  const [previousRankAyt, setPreviousRankAyt] = useState(settings.previousRankAyt)
  const [examYear, setExamYear] = useState(String(settings.examYear))
  const [saved, setSaved] = useState(false)

  const tytProgress = getRankProgress(previousRankTyt, targetRankTyt, previousRankTyt)
  const aytProgress = getRankProgress(previousRankAyt, targetRankAyt, previousRankAyt)

  const handleSave = (ev: React.FormEvent) => {
    ev.preventDefault()
    updateSettings({
      studentName: name.trim() || 'Öğrenci',
      targetRankTyt,
      targetRankAyt,
      previousRankTyt,
      previousRankAyt,
      examYear: parseInt(examYear) || settings.examYear,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <Layout title="Öğrenci Profili" subtitle="Hedef ve kişisel bilgiler">
      <form onSubmit={handleSave} className="space-y-4">
        <Card>
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-100 text-2xl">
              👤
            </div>
            <div>
              <p className="text-lg font-bold text-slate-800">{name.trim() || 'Öğrenci'}</p>
              <p className="text-sm text-slate-500">YKS {examYear || settings.examYear}</p>
            </div>
          </div>

          <div className="space-y-3">
            <Input label="Öğrenci Adı" value={name} onChange={(e) => setName(e.target.value)} placeholder="Oğlunuzun adı" />
            <Input label="Sınav Yılı" type="number" value={examYear} onChange={(e) => setExamYear(e.target.value)} />
          </div>
        </Card>

        <Card>
          <h2 className="mb-3 font-bold text-slate-800">TYT Hedefleri</h2>
          <div className="space-y-3">
            <RankSelect label="TYT Hedef Sıralama" value={targetRankTyt} options={TYT_RANK_OPTIONS} onChange={setTargetRankTyt} />
            <Input
              label="TYT Başlangıç Sıralaması"
              type="number"
              value={String(previousRankTyt)}
              onChange={(e) => setPreviousRankTyt(parseInt(e.target.value) || previousRankTyt)}
            />
          </div>
        </Card>

        <Card>
          <h2 className="mb-3 font-bold text-slate-800">AYT Hedefleri (Sayısal)</h2>
          <div className="space-y-3">
            <RankSelect label="AYT Hedef Sıralama" value={targetRankAyt} options={AYT_RANK_OPTIONS} onChange={setTargetRankAyt} />
            <Input
              label="AYT Başlangıç Sıralaması"
              type="number"
              value={String(previousRankAyt)}
              onChange={(e) => setPreviousRankAyt(parseInt(e.target.value) || previousRankAyt)}
            />
          </div>
        </Card>

        <Card className="bg-primary-50">
          <p className="text-sm font-semibold text-primary-900">Hedef Özeti</p>
          <div className="mt-3 space-y-3">
            <div>
              <p className="text-xs font-medium text-primary-700">TYT</p>
              <p className="font-bold text-primary-900">
                {formatRank(previousRankTyt)} → {formatRank(targetRankTyt)}
              </p>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-primary-200">
                <div className="h-full rounded-full bg-blue-600" style={{ width: `${tytProgress}%` }} />
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-primary-700">AYT</p>
              <p className="font-bold text-primary-900">
                {formatRank(previousRankAyt)} → {formatRank(targetRankAyt)}
              </p>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-primary-200">
                <div className="h-full rounded-full bg-purple-600" style={{ width: `${aytProgress}%` }} />
              </div>
            </div>
          </div>
        </Card>

        <Button type="submit" className="w-full">
          {saved ? '✓ Profil Kaydedildi!' : 'Profili Kaydet'}
        </Button>
      </form>

      <Card className="mt-4">
        <h2 className="mb-2 font-bold text-slate-800">Diğer</h2>
        <Link
          to="/ayarlar"
          className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-3 text-sm font-medium text-slate-700 active:bg-slate-50"
        >
          <span>⚙️ Veri yedekleme ve sıfırlama</span>
          <span className="text-slate-400">→</span>
        </Link>
      </Card>

      <div className="mt-4 text-center">
        <Badge color="bg-slate-100 text-slate-500">Profil bu cihazda saklanır</Badge>
      </div>
    </Layout>
  )
}
