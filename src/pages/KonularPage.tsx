import { useState } from 'react'
import { Layout, Card, Badge, ProgressBar } from '../components/Layout'
import { useApp } from '../context/AppContext'
import { CURRICULUM, getSubjects } from '../data/curriculum'
import {
  computeTopicMastery,
  MASTERY_COLORS,
  MASTERY_LABELS,
  formatDuration,
} from '../utils/calculations'
import type { ExamType } from '../types'

export function KonularPage() {
  const { data, markTopicStudied } = useApp()
  const [examType, setExamType] = useState<ExamType>('TYT')
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null)

  const subjects = getSubjects(examType)

  return (
    <Layout title="Konular" subtitle="TYT ve AYT konu hakimiyeti">
      <div className="mb-4 flex rounded-xl bg-slate-200 p-1">
        {(['TYT', 'AYT'] as ExamType[]).map((type) => (
          <button
            key={type}
            onClick={() => {
              setExamType(type)
              setExpandedSubject(null)
            }}
            className={`flex-1 rounded-lg py-2.5 text-sm font-bold transition-colors ${
              examType === type ? 'bg-white text-primary-800 shadow-sm' : 'text-slate-600'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {subjects.map((subject) => {
          const topics = CURRICULUM.filter((t) => t.examType === examType && t.subject === subject)
          const masteries = topics.map((t) => computeTopicMastery(t.id, data.testResults)!)
          const withTests = masteries.filter((m) => m.testCount > 0)
          const avgPct =
            withTests.length > 0
              ? Math.round(withTests.reduce((s, m) => s + m.percentage, 0) / withTests.length)
              : 0
          const studiedCount = topics.filter((t) => data.topicProgress[t.id]?.studied).length
          const isOpen = expandedSubject === subject

          return (
            <Card key={subject} className="!p-0 overflow-hidden">
              <button
                onClick={() => setExpandedSubject(isOpen ? null : subject)}
                className="flex w-full items-center justify-between p-4 text-left"
              >
                <div className="flex-1">
                  <p className="font-bold text-slate-800">{subject}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {topics.length} konu · {studiedCount} çalışıldı · {withTests.length} test girildi
                  </p>
                  {withTests.length > 0 && (
                    <div className="mt-2">
                      <ProgressBar value={avgPct} color={avgPct >= 71 ? 'bg-green-500' : avgPct >= 41 ? 'bg-yellow-500' : 'bg-red-500'} />
                    </div>
                  )}
                </div>
                <div className="ml-3 text-right">
                  {withTests.length > 0 && (
                    <p className="text-lg font-bold text-slate-800">%{avgPct}</p>
                  )}
                  <span className="text-slate-400">{isOpen ? '▲' : '▼'}</span>
                </div>
              </button>

              {isOpen && (
                <ul className="border-t border-slate-100">
                  {masteries.map((m) => {
                    const studied = data.topicProgress[m.topicId]?.studied
                    return (
                      <li key={m.topicId} className="border-b border-slate-50 px-4 py-3 last:border-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-slate-800">{m.topic.name}</p>
                            <div className="mt-1 flex flex-wrap gap-1">
                              <Badge color={MASTERY_COLORS[m.level]}>{MASTERY_LABELS[m.level]}</Badge>
                              {studied && <Badge color="bg-blue-100 text-blue-700">Konu okundu</Badge>}
                            </div>
                            {m.testCount > 0 && (
                              <p className="mt-1 text-xs text-slate-500">
                                {m.testCount} test · {m.totalCorrect}/{m.totalQuestions} doğru
                                {m.avgSecondsPerQuestion !== null &&
                                  ` · ${formatDuration(m.avgSecondsPerQuestion)}/soru`}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            {m.testCount > 0 && (
                              <span className="text-sm font-bold text-slate-700">%{m.percentage}</span>
                            )}
                            {!studied && (
                              <button
                                onClick={() => markTopicStudied(m.topicId)}
                                className="text-xs font-medium text-primary-700"
                              >
                                Okundu ✓
                              </button>
                            )}
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </Card>
          )
        })}
      </div>
    </Layout>
  )
}
