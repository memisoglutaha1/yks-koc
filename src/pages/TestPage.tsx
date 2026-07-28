import { useState } from 'react'
import { Layout, Card, Button, Input, Select, Badge } from '../components/Layout'
import { useApp } from '../context/AppContext'
import { CURRICULUM, getSubjects, getTopicsBySubject } from '../data/curriculum'
import {
  calcNet,
  calcPercentage,
  calcSecondsPerQuestion,
  formatDuration,
  todayStr,
} from '../utils/calculations'
import type { ExamType } from '../types'

export function TestPage() {
  const { data, addTestResult, deleteTestResult } = useApp()
  const [examType, setExamType] = useState<ExamType>('TYT')
  const [subject, setSubject] = useState('')
  const [topicId, setTopicId] = useState('')
  const [testName, setTestName] = useState('')
  const [questionCount, setQuestionCount] = useState('20')
  const [durationMinutes, setDurationMinutes] = useState('30')
  const [correct, setCorrect] = useState('')
  const [wrong, setWrong] = useState('')
  const [empty, setEmpty] = useState('')
  const [note, setNote] = useState('')
  const [saved, setSaved] = useState(false)

  const subjects = getSubjects(examType)
  const topics = subject ? getTopicsBySubject(examType, subject) : []
  const selectedTopic = CURRICULUM.find((t) => t.id === topicId)

  const q = parseInt(questionCount) || 0
  const c = parseInt(correct) || 0
  const w = parseInt(wrong) || 0
  const e = parseInt(empty) || 0
  const dur = parseFloat(durationMinutes) || 0
  const net = calcNet(c, w)
  const pct = calcPercentage(c, q)
  const secPerQ = q > 0 ? calcSecondsPerQuestion(dur, q) : 0

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!topicId || !testName || q === 0) return
    addTestResult({
      topicId,
      testName,
      date: todayStr(),
      questionCount: q,
      correct: c,
      wrong: w,
      empty: e,
      durationMinutes: dur,
      note: note || undefined,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    setCorrect('')
    setWrong('')
    setEmpty('')
    setNote('')
  }

  const recentResults = [...data.testResults].reverse().slice(0, 10)

  return (
    <Layout title="Test Girişi" subtitle="Doğru, yanlış ve süre kaydı">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <div className="mb-3 flex rounded-lg bg-slate-100 p-1">
            {(['TYT', 'AYT'] as ExamType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => {
                  setExamType(type)
                  setSubject('')
                  setTopicId('')
                }}
                className={`flex-1 rounded-md py-2 text-sm font-bold ${
                  examType === type ? 'bg-white text-primary-800 shadow-sm' : 'text-slate-600'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            <Select
              label="Ders"
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value)
                setTopicId('')
              }}
              required
            >
              <option value="">Seçin</option>
              {subjects.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>

            <Select
              label="Konu"
              value={topicId}
              onChange={(e) => {
                setTopicId(e.target.value)
                const t = CURRICULUM.find((x) => x.id === e.target.value)
                if (t) setTestName(`${t.name} - Test`)
              }}
              required
              disabled={!subject}
            >
              <option value="">Seçin</option>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>

            <Input
              label="Test Adı"
              value={testName}
              onChange={(e) => setTestName(e.target.value)}
              placeholder="Örn: 3D TYT Mat Test 1"
              required
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Soru Sayısı"
                type="number"
                min={1}
                value={questionCount}
                onChange={(e) => setQuestionCount(e.target.value)}
                required
              />
              <Input
                label="Süre (dk)"
                type="number"
                min={1}
                step={0.5}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Input label="Doğru" type="number" min={0} value={correct} onChange={(e) => setCorrect(e.target.value)} required />
              <Input label="Yanlış" type="number" min={0} value={wrong} onChange={(e) => setWrong(e.target.value)} />
              <Input label="Boş" type="number" min={0} value={empty} onChange={(e) => setEmpty(e.target.value)} />
            </div>

            <Input label="Not (opsiyonel)" value={note} onChange={(e) => setNote(e.target.value)} />

            {q > 0 && c + w + e > 0 && (
              <div className="rounded-lg bg-primary-50 p-3">
                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                  <div>
                    <p className="text-slate-500">Net</p>
                    <p className="font-bold text-primary-800">{net.toFixed(1)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Başarı</p>
                    <p className="font-bold text-primary-800">%{pct}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Soru/dk</p>
                    <p className="font-bold text-primary-800">{formatDuration(secPerQ)}</p>
                  </div>
                </div>
                {selectedTopic && (
                  <p className="mt-2 text-center text-xs text-slate-500">
                    Hedef: {examType === 'TYT' ? '~1.5 dk/soru' : '~2 dk/soru'}
                    {secPerQ > (examType === 'TYT' ? 90 : 120) && ' · ⚠️ Yavaş'}
                  </p>
                )}
              </div>
            )}
          </div>
        </Card>

        <Button type="submit" className="w-full" disabled={!topicId || !testName}>
          {saved ? '✓ Kaydedildi!' : 'Test Sonucunu Kaydet'}
        </Button>
      </form>

      {recentResults.length > 0 && (
        <Card className="mt-4">
          <h2 className="mb-3 font-bold text-slate-800">Son Testler</h2>
          <ul className="space-y-2">
            {recentResults.map((r) => {
              const topic = CURRICULUM.find((t) => t.id === r.topicId)
              return (
                <li key={r.id} className="flex items-center justify-between rounded-lg bg-slate-50 p-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-800">{r.testName}</p>
                    <p className="text-xs text-slate-500">
                      {topic?.examType} · {topic?.subject} · {r.date}
                    </p>
                    <div className="mt-1 flex gap-2">
                      <Badge color="bg-green-100 text-green-800">{r.correct}D</Badge>
                      <Badge color="bg-red-100 text-red-800">{r.wrong}Y</Badge>
                      <Badge color="bg-slate-100 text-slate-600">{formatDuration(calcSecondsPerQuestion(r.durationMinutes, r.questionCount))}/s</Badge>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteTestResult(r.id)}
                    className="ml-2 shrink-0 text-xs text-red-500"
                  >
                    Sil
                  </button>
                </li>
              )
            })}
          </ul>
        </Card>
      )}
    </Layout>
  )
}
