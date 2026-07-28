import { useState } from 'react'
import { Layout, Card, Button, Input, Select, Badge, EmptyState } from '../components/Layout'
import { useApp } from '../context/AppContext'
import { todayStr, getMockExamSosyalTotal, hasSplitSosyalScores, getMockExamFenTotal, hasSplitFenScores } from '../utils/calculations'

export function DenemelerPage() {
  const { data, addMockExam, deleteMockExam } = useApp()
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [type, setType] = useState<'TYT' | 'AYT' | 'TYT_AYT'>('TYT_AYT')
  const [date, setDate] = useState(todayStr())
  const [turkce, setTurkce] = useState('')
  const [mat, setMat] = useState('')
  const [tytFizik, setTytFizik] = useState('')
  const [tytKimya, setTytKimya] = useState('')
  const [tytBiyoloji, setTytBiyoloji] = useState('')
  const [tarih, setTarih] = useState('')
  const [cografya, setCografya] = useState('')
  const [felsefe, setFelsefe] = useState('')
  const [din, setDin] = useState('')
  const [aytMat, setAytMat] = useState('')
  const [fizik, setFizik] = useState('')
  const [kimya, setKimya] = useState('')
  const [biyoloji, setBiyoloji] = useState('')
  const [duration, setDuration] = useState('165')
  const [saved, setSaved] = useState(false)

  const tytTotal =
    type !== 'AYT'
      ? [turkce, mat, tytFizik, tytKimya, tytBiyoloji, tarih, cografya, felsefe, din].reduce(
          (s, v) => s + (parseFloat(v) || 0),
          0,
        )
      : undefined
  const aytTotal =
    type !== 'TYT'
      ? [aytMat, fizik, kimya, biyoloji].reduce((s, v) => s + (parseFloat(v) || 0), 0)
      : undefined

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!name.trim()) return
    addMockExam({
      date,
      name: name.trim(),
      type,
      turkce: turkce ? parseFloat(turkce) : undefined,
      mat: mat ? parseFloat(mat) : undefined,
      tytFizik: tytFizik ? parseFloat(tytFizik) : undefined,
      tytKimya: tytKimya ? parseFloat(tytKimya) : undefined,
      tytBiyoloji: tytBiyoloji ? parseFloat(tytBiyoloji) : undefined,
      tarih: tarih ? parseFloat(tarih) : undefined,
      cografya: cografya ? parseFloat(cografya) : undefined,
      felsefe: felsefe ? parseFloat(felsefe) : undefined,
      din: din ? parseFloat(din) : undefined,
      tytTotal,
      aytMat: aytMat ? parseFloat(aytMat) : undefined,
      fizik: fizik ? parseFloat(fizik) : undefined,
      kimya: kimya ? parseFloat(kimya) : undefined,
      biyoloji: biyoloji ? parseFloat(biyoloji) : undefined,
      aytTotal,
      durationMinutes: duration ? parseFloat(duration) : undefined,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    setShowForm(false)
    setName('')
  }

  const exams = [...data.mockExams].reverse()

  return (
    <Layout
      title="Denemeler"
      subtitle="TYT ve AYT deneme sonuçları"
      action={
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-lg bg-white/20 px-3 py-1.5 text-sm font-semibold"
        >
          {showForm ? 'İptal' : '+ Deneme'}
        </button>
      }
    >
      {showForm && (
        <Card className="mb-4">
          <form onSubmit={handleSubmit} className="space-y-3">
            <Input label="Deneme Adı" value={name} onChange={(e) => setName(e.target.value)} placeholder="Örn: 3D Genel 12" required />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Tarih" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              <Select label="Tür" value={type} onChange={(e) => setType(e.target.value as typeof type)}>
                <option value="TYT">TYT</option>
                <option value="AYT">AYT</option>
                <option value="TYT_AYT">TYT + AYT</option>
              </Select>
            </div>

            {type !== 'AYT' && (
              <div>
                <p className="mb-2 text-sm font-bold text-slate-700">TYT Netleri</p>
                <div className="grid grid-cols-2 gap-2">
                  <Input label="Türkçe" type="number" step="0.25" value={turkce} onChange={(e) => setTurkce(e.target.value)} />
                  <Input label="Matematik" type="number" step="0.25" value={mat} onChange={(e) => setMat(e.target.value)} />
                </div>
                <p className="mb-2 mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Fen Bilimleri</p>
                <div className="grid grid-cols-2 gap-2">
                  <Input label="Fizik" type="number" step="0.25" value={tytFizik} onChange={(e) => setTytFizik(e.target.value)} />
                  <Input label="Kimya" type="number" step="0.25" value={tytKimya} onChange={(e) => setTytKimya(e.target.value)} />
                  <Input label="Biyoloji" type="number" step="0.25" value={tytBiyoloji} onChange={(e) => setTytBiyoloji(e.target.value)} />
                </div>
                <p className="mb-2 mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Sosyal Bilimler</p>
                <div className="grid grid-cols-2 gap-2">
                  <Input label="Tarih" type="number" step="0.25" value={tarih} onChange={(e) => setTarih(e.target.value)} />
                  <Input label="Coğrafya" type="number" step="0.25" value={cografya} onChange={(e) => setCografya(e.target.value)} />
                  <Input label="Felsefe" type="number" step="0.25" value={felsefe} onChange={(e) => setFelsefe(e.target.value)} />
                  <Input label="Din Kültürü" type="number" step="0.25" value={din} onChange={(e) => setDin(e.target.value)} />
                </div>
                {tytTotal !== undefined && tytTotal > 0 && (
                  <p className="mt-2 text-center text-sm font-bold text-primary-700">TYT Toplam: {tytTotal.toFixed(1)} net</p>
                )}
              </div>
            )}

            {type !== 'TYT' && (
              <div>
                <p className="mb-2 text-sm font-bold text-slate-700">AYT Netleri (Sayısal)</p>
                <div className="grid grid-cols-2 gap-2">
                  <Input label="Matematik" type="number" step="0.25" value={aytMat} onChange={(e) => setAytMat(e.target.value)} />
                  <Input label="Fizik" type="number" step="0.25" value={fizik} onChange={(e) => setFizik(e.target.value)} />
                  <Input label="Kimya" type="number" step="0.25" value={kimya} onChange={(e) => setKimya(e.target.value)} />
                  <Input label="Biyoloji" type="number" step="0.25" value={biyoloji} onChange={(e) => setBiyoloji(e.target.value)} />
                </div>
                {aytTotal !== undefined && aytTotal > 0 && (
                  <p className="mt-2 text-center text-sm font-bold text-primary-700">AYT Toplam: {aytTotal.toFixed(1)} net</p>
                )}
              </div>
            )}

            <Input label="Süre (dk)" type="number" value={duration} onChange={(e) => setDuration(e.target.value)} />

            <Button type="submit" className="w-full">{saved ? '✓ Kaydedildi!' : 'Deneme Kaydet'}</Button>
          </form>
        </Card>
      )}

      {exams.length === 0 ? (
        <EmptyState icon="📝" title="Henüz deneme yok" description="İlk deneme sonucunuzu girin" />
      ) : (
        <ul className="space-y-3">
          {exams.map((exam, idx) => {
            const prev = exams[idx + 1]
            const tytDiff = exam.tytTotal && prev?.tytTotal ? exam.tytTotal - prev.tytTotal : null
            const aytDiff = exam.aytTotal && prev?.aytTotal ? exam.aytTotal - prev.aytTotal : null
            return (
              <li key={exam.id}>
                <Card>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-bold text-slate-800">{exam.name}</p>
                      <p className="text-xs text-slate-500">{exam.date} · {exam.type.replace('_', ' + ')}</p>
                    </div>
                    <button onClick={() => deleteMockExam(exam.id)} className="text-xs text-red-400">Sil</button>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {exam.tytTotal !== undefined && (
                      <div className="rounded-lg bg-blue-50 p-2 text-center">
                        <p className="text-xs text-slate-500">TYT Net</p>
                        <p className="text-xl font-bold text-blue-800">{exam.tytTotal.toFixed(1)}</p>
                        {tytDiff !== null && (
                          <p className={`text-xs font-medium ${tytDiff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {tytDiff >= 0 ? '+' : ''}{tytDiff.toFixed(1)}
                          </p>
                        )}
                      </div>
                    )}
                    {exam.aytTotal !== undefined && (
                      <div className="rounded-lg bg-purple-50 p-2 text-center">
                        <p className="text-xs text-slate-500">AYT Net</p>
                        <p className="text-xl font-bold text-purple-800">{exam.aytTotal.toFixed(1)}</p>
                        {aytDiff !== null && (
                          <p className={`text-xs font-medium ${aytDiff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {aytDiff >= 0 ? '+' : ''}{aytDiff.toFixed(1)}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  {exam.type !== 'AYT' && exam.mat !== undefined && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {exam.turkce !== undefined && <Badge color="bg-slate-100">TR: {exam.turkce}</Badge>}
                      {exam.mat !== undefined && <Badge color="bg-slate-100">Mat: {exam.mat}</Badge>}
                      {hasSplitFenScores(exam) ? (
                        <>
                          {exam.tytFizik !== undefined && <Badge color="bg-slate-100">Fiz: {exam.tytFizik}</Badge>}
                          {exam.tytKimya !== undefined && <Badge color="bg-slate-100">Kim: {exam.tytKimya}</Badge>}
                          {exam.tytBiyoloji !== undefined && <Badge color="bg-slate-100">Bio: {exam.tytBiyoloji}</Badge>}
                        </>
                      ) : (
                        getMockExamFenTotal(exam) > 0 && (
                          <Badge color="bg-slate-100">Fen: {getMockExamFenTotal(exam)}</Badge>
                        )
                      )}
                      {hasSplitSosyalScores(exam) ? (
                        <>
                          {exam.tarih !== undefined && <Badge color="bg-slate-100">Tar: {exam.tarih}</Badge>}
                          {exam.cografya !== undefined && <Badge color="bg-slate-100">Coğ: {exam.cografya}</Badge>}
                          {exam.felsefe !== undefined && <Badge color="bg-slate-100">Fel: {exam.felsefe}</Badge>}
                          {exam.din !== undefined && <Badge color="bg-slate-100">Din: {exam.din}</Badge>}
                        </>
                      ) : (
                        getMockExamSosyalTotal(exam) > 0 && (
                          <Badge color="bg-slate-100">Sos: {getMockExamSosyalTotal(exam)}</Badge>
                        )
                      )}
                    </div>
                  )}
                </Card>
              </li>
            )
          })}
        </ul>
      )}
    </Layout>
  )
}
