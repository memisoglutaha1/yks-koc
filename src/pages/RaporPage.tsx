import { useMemo, useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts'
import { Layout, Card, StatBox, ProgressBar } from '../components/Layout'
import { useApp } from '../context/AppContext'
import { CURRICULUM } from '../data/curriculum'
import {
  computeSubjectSummaries,
  computeTopicMastery,
  formatDuration,
  calcSecondsPerQuestion,
  getRankProgress,
} from '../utils/calculations'

import { GunlukRaporView } from './GunlukRaporPage'
import { PlanProgressCard } from '../components/PlanProgressCard'
import { KonuHakimiyetRapor } from '../components/KonuHakimiyetRapor'
import { computePlanProgress } from '../utils/planProgress'

type RaporTab = 'genel' | 'gunluk'

export function RaporPage() {
  const { data } = useApp()
  const { settings, testResults, mockExams, dailyTasks } = data
  const [tab, setTab] = useState<RaporTab>('gunluk')

  const tytSummaries = computeSubjectSummaries('TYT', CURRICULUM, testResults)
  const aytSummaries = computeSubjectSummaries('AYT', CURRICULUM, testResults)

  const questionStats = useMemo(() => {
    const totalQuestions = testResults.reduce((s, r) => s + r.questionCount, 0)
    const totalCorrect = testResults.reduce((s, r) => s + r.correct, 0)
    const totalWrong = testResults.reduce((s, r) => s + r.wrong, 0)
    const totalEmpty = testResults.reduce((s, r) => s + r.empty, 0)
    const tytQuestions = testResults
      .filter((r) => CURRICULUM.find((t) => t.id === r.topicId)?.examType === 'TYT')
      .reduce((s, r) => s + r.questionCount, 0)
    const aytQuestions = testResults
      .filter((r) => CURRICULUM.find((t) => t.id === r.topicId)?.examType === 'AYT')
      .reduce((s, r) => s + r.questionCount, 0)
    return { totalQuestions, totalCorrect, totalWrong, totalEmpty, tytQuestions, aytQuestions }
  }, [testResults])

  const slowTopics = useMemo(() => {
    return testResults
      .reduce<{ name: string; sec: number; examType: string }[]>((acc, r) => {
        const topic = CURRICULUM.find((t) => t.id === r.topicId)
        if (!topic) return acc
        const sec = calcSecondsPerQuestion(r.durationMinutes, r.questionCount)
        const threshold = topic.examType === 'TYT' ? 90 : 120
        if (sec > threshold) {
          acc.push({ name: `${topic.examType} ${topic.subject} — ${topic.name}`, sec, examType: topic.examType })
        }
        return acc
      }, [])
      .slice(0, 5)
  }, [testResults])

  const denemeChartData = mockExams.map((e) => ({
    name: e.name.length > 12 ? e.name.slice(0, 12) + '…' : e.name,
    TYT: e.tytTotal ?? null,
    AYT: e.aytTotal ?? null,
    date: e.date,
  }))

  const weeklyCompletion = useMemo(() => {
    const last7 = dailyTasks.filter((t) => {
      const d = new Date(t.date)
      const now = new Date()
      const diff = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)
      return diff >= 0 && diff < 7
    })
    const total = last7.length
    const done = last7.filter((t) => t.completed).length
    return total > 0 ? Math.round((done / total) * 100) : 0
  }, [dailyTasks])

  const lastMock = mockExams.length > 0 ? mockExams[mockExams.length - 1] : null
  const estimatedRank = lastMock?.tytTotal && lastMock?.aytTotal
    ? Math.round(200000 - (lastMock.tytTotal + lastMock.aytTotal) * 1500)
    : settings.previousRank

  const rankProgress = getRankProgress(
    Math.max(estimatedRank, settings.targetRankAyt),
    settings.targetRankAyt,
    settings.previousRankAyt,
  )
  const tytRankProgress = getRankProgress(
    settings.previousRankTyt,
    settings.targetRankTyt,
    settings.previousRankTyt,
  )

  const subjectBarData = [...tytSummaries, ...aytSummaries]
    .filter((s) => s.avgPercentage > 0)
    .map((s) => ({
      name: `${s.examType.slice(0, 1)}-${s.subject.slice(0, 6)}`,
      pct: s.avgPercentage,
    }))

  const allMasteries = CURRICULUM.map((t) => computeTopicMastery(t.id, testResults)!)
  const hakimCount = allMasteries.filter((m) => m.level === 'hakim').length

  const planProgress = useMemo(() => computePlanProgress(data), [data])

  return (
    <Layout title="Raporlar" subtitle={tab === 'gunluk' ? 'Günlük · süre · konu · hakimiyet' : 'Genel ilerleme ve analiz'}>
      <div className="mb-4 flex rounded-xl bg-slate-200 p-1">
        <button
          onClick={() => setTab('gunluk')}
          className={`flex-1 rounded-lg py-2.5 text-sm font-bold ${tab === 'gunluk' ? 'bg-white text-primary-800 shadow-sm' : 'text-slate-600'}`}
        >
          📅 Günlük Rapor
        </button>
        <button
          onClick={() => setTab('genel')}
          className={`flex-1 rounded-lg py-2.5 text-sm font-bold ${tab === 'genel' ? 'bg-white text-primary-800 shadow-sm' : 'text-slate-600'}`}
        >
          📊 Genel Bakış
        </button>
      </div>

      <PlanProgressCard progress={planProgress} />

      <div className="mt-4">
        <KonuHakimiyetRapor testResults={testResults} questionStats={questionStats} />
      </div>

      {tab === 'gunluk' ? (
        <div className="mt-4">
          <GunlukRaporView />
        </div>
      ) : (
      <div className="mt-4 space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <StatBox label="TYT Hedef" value={`${(settings.targetRankTyt / 1000).toFixed(0)}K`} sub="sıralama" />
          <StatBox label="AYT Hedef" value={`${(settings.targetRankAyt / 1000).toFixed(0)}K`} sub="sıralama" />
          <StatBox label="Haftalık" value={`%${weeklyCompletion}`} sub="görev tamamlama" />
          <StatBox label="Hakim konu" value={hakimCount} sub={`/${CURRICULUM.length}`} />
        </div>

        <Card>
          <h2 className="mb-2 font-bold text-slate-800">🎯 Hedefe İlerleme</h2>
          <div className="space-y-3 text-sm text-slate-600">
            <div>
              <p className="font-medium text-blue-800">TYT</p>
              <p>
                {settings.previousRankTyt.toLocaleString('tr-TR')} → {settings.targetRankTyt.toLocaleString('tr-TR')}
              </p>
              <ProgressBar value={tytRankProgress} color="bg-blue-500" />
            </div>
            <div>
              <p className="font-medium text-purple-800">AYT</p>
              <p>
                {settings.previousRankAyt.toLocaleString('tr-TR')} → {settings.targetRankAyt.toLocaleString('tr-TR')}
              </p>
              <ProgressBar value={rankProgress} color="bg-purple-500" />
              <p className="mt-1 text-xs text-slate-500">Deneme sonuçlarına göre tahmini ilerleme: %{rankProgress}</p>
            </div>
          </div>
        </Card>

        {denemeChartData.length > 0 && (
          <Card>
            <h2 className="mb-3 font-bold text-slate-800">Deneme Net Trendi</h2>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={denemeChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="TYT" stroke="#2563eb" strokeWidth={2} dot={{ r: 4 }} connectNulls />
                <Line type="monotone" dataKey="AYT" stroke="#7c3aed" strokeWidth={2} dot={{ r: 4 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        )}

        {subjectBarData.length > 0 && (
          <Card>
            <h2 className="mb-3 font-bold text-slate-800">Ders Bazlı Hakimiyet</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={subjectBarData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="pct" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}

        {slowTopics.length > 0 && (
          <Card>
            <h2 className="mb-3 font-bold text-slate-800">⏱️ Yavaş Konular</h2>
            <ul className="space-y-2">
              {slowTopics.map((t, i) => (
                <li key={i} className="flex justify-between text-sm">
                  <span className="text-slate-700">{t.name}</span>
                  <span className="font-bold text-orange-600">{formatDuration(t.sec)}/soru</span>
                </li>
              ))}
            </ul>
          </Card>
        )}

      </div>
      )}
    </Layout>
  )
}
