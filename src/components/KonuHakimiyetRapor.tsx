import { useState } from 'react'
import { Card, Badge, ProgressBar, EmptyState } from '../components/Layout'
import { CURRICULUM } from '../data/curriculum'
import {
  computeSubjectSummaries,
  MASTERY_COLORS,
  MASTERY_LABELS,
  formatDuration,
  MASTERY_COMPLETE_THRESHOLD,
  RECENT_TEST_WINDOW,
} from '../utils/calculations'
import type { TestResult } from '../types'

/** 70 altı kırmızı, 70-85 sarı, 85+ yeşil */
function getMasteryBarColor(pct: number): string {
  if (pct >= 85) return 'bg-green-500'
  if (pct >= 70) return 'bg-yellow-500'
  return 'bg-red-500'
}

function MasteryBar({ pct, showLabel = true }: { pct: number; showLabel?: boolean }) {
  return (
    <div className="mt-1.5">
      {showLabel && (
        <div className="mb-0.5 flex justify-between text-[10px] text-slate-500">
          <span>Hakimiyet</span>
          <span className="font-semibold text-slate-700">%{pct}</span>
        </div>
      )}
      <ProgressBar value={pct} color={getMasteryBarColor(pct)} />
    </div>
  )
}

interface KonuHakimiyetRaporProps {
  testResults: TestResult[]
  questionStats: {
    totalQuestions: number
    totalCorrect: number
    totalWrong: number
    totalEmpty: number
    tytQuestions: number
    aytQuestions: number
  }
}

export function KonuHakimiyetRapor({ testResults, questionStats }: KonuHakimiyetRaporProps) {
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null)

  const tytSummaries = computeSubjectSummaries('TYT', CURRICULUM, testResults)
  const aytSummaries = computeSubjectSummaries('AYT', CURRICULUM, testResults)

  return (
    <div className="space-y-4">
      {testResults.length > 0 && (
        <Card>
          <h2 className="mb-3 font-bold text-slate-800">📊 Çözülen Soru Özeti</h2>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-primary-50 p-3">
              <p className="text-xs text-slate-500">Toplam Soru</p>
              <p className="text-2xl font-bold text-primary-800">{questionStats.totalQuestions.toLocaleString('tr-TR')}</p>
            </div>
            <div className="rounded-lg bg-blue-50 p-3">
              <p className="text-xs text-slate-500">TYT</p>
              <p className="text-2xl font-bold text-blue-800">{questionStats.tytQuestions.toLocaleString('tr-TR')}</p>
            </div>
            <div className="rounded-lg bg-purple-50 p-3">
              <p className="text-xs text-slate-500">AYT</p>
              <p className="text-2xl font-bold text-purple-800">{questionStats.aytQuestions.toLocaleString('tr-TR')}</p>
            </div>
          </div>
          <div className="mt-2 flex justify-center gap-4 text-xs text-slate-500">
            <span className="text-green-700">{questionStats.totalCorrect} doğru</span>
            <span className="text-red-600">{questionStats.totalWrong} yanlış</span>
            <span>{questionStats.totalEmpty} boş</span>
          </div>
        </Card>
      )}

      <Card>
        <h2 className="mb-1 font-bold text-slate-800">Konu Hakimiyeti</h2>
        <p className="mb-3 text-xs text-slate-500">Derse tıklayın — konu konu hakimiyet ve soru sayısı</p>
        {testResults.length === 0 ? (
          <EmptyState icon="📊" title="Henüz veri yok" description="Test çözdükçe raporlar dolacak" />
        ) : (
          <div className="space-y-2">
            {[...tytSummaries, ...aytSummaries].map((s) => {
              const key = `${s.examType}-${s.subject}`
              const isOpen = expandedSubject === key
              const subjectQuestions = s.topics.reduce((sum, t) => sum + t.totalQuestions, 0)
              const subjectCorrect = s.topics.reduce((sum, t) => sum + t.totalCorrect, 0)
              const topicsWithTests = s.topics.filter((t) => t.testCount > 0)

              return (
                <div key={key} className="overflow-hidden rounded-xl border border-slate-200">
                  <button
                    onClick={() => setExpandedSubject(isOpen ? null : key)}
                    className="flex w-full items-center justify-between bg-white p-3 text-left active:bg-slate-50"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1">
                        <Badge color="bg-blue-100 text-blue-800">{s.examType}</Badge>
                        <span className="font-semibold text-slate-800">{s.subject}</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {topicsWithTests.length} konu · {subjectQuestions.toLocaleString('tr-TR')} soru · {subjectCorrect} doğru
                      </p>
                      {s.avgPercentage > 0 && (
                        <MasteryBar pct={s.avgPercentage} />
                      )}
                    </div>
                    <div className="ml-3 shrink-0 text-right">
                      {s.avgPercentage > 0 && <p className="font-bold text-slate-800">%{s.avgPercentage}</p>}
                      <p className="text-lg font-bold text-primary-700">{subjectQuestions.toLocaleString('tr-TR')}</p>
                      <p className="text-[10px] text-slate-400">soru</p>
                      <span className="text-slate-400">{isOpen ? '▲' : '▼'}</span>
                    </div>
                  </button>

                  {isOpen && (
                    <ul className="border-t border-slate-100 bg-slate-50">
                      {s.topics.map((t) => (
                        <li
                          key={t.topicId}
                          className={`border-b border-slate-100 px-3 py-2.5 last:border-0 ${t.testCount === 0 ? 'opacity-50' : ''}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-slate-800">{t.topic.name}</p>
                              {t.testCount > 0 ? (
                                <>
                                  <div className="mt-1 flex flex-wrap gap-1">
                                    <Badge color={MASTERY_COLORS[t.level]}>{MASTERY_LABELS[t.level]}</Badge>
                                    <Badge color="bg-slate-100 text-slate-600">{t.testCount} test</Badge>
                                    {t.overallPercentage < MASTERY_COMPLETE_THRESHOLD &&
                                      (t.recentPercentage ?? 0) >= MASTERY_COMPLETE_THRESHOLD && (
                                        <Badge color="bg-green-100 text-green-800">📈 Son testlerde başarılı</Badge>
                                      )}
                                  </div>
                                  <div className="mt-2 space-y-2">
                                    <div>
                                      <div className="mb-0.5 flex justify-between text-[10px] text-slate-500">
                                        <span>Genel</span>
                                        <span className="font-semibold text-slate-700">%{t.overallPercentage}</span>
                                      </div>
                                      <MasteryBar pct={t.overallPercentage} showLabel={false} />
                                    </div>
                                    <div>
                                      <div className="mb-0.5 flex justify-between text-[10px] text-slate-500">
                                        <span>Son {RECENT_TEST_WINDOW} test</span>
                                        <span className="font-semibold text-slate-700">%{t.recentPercentage ?? 0}</span>
                                      </div>
                                      <MasteryBar pct={t.recentPercentage ?? 0} showLabel={false} />
                                    </div>
                                    {t.bestRecentPercentage !== null && (
                                      <p className="text-[10px] font-medium text-primary-700">
                                        En iyi test (son {RECENT_TEST_WINDOW}): %{t.bestRecentPercentage}
                                      </p>
                                    )}
                                  </div>
                                  <p className="mt-1 text-xs text-slate-500">
                                    {t.totalCorrect} doğru / {t.totalQuestions} soru
                                    {t.avgSecondsPerQuestion !== null && ` · ${formatDuration(t.avgSecondsPerQuestion)}/soru`}
                                  </p>
                                </>
                              ) : (
                                <p className="mt-0.5 text-xs text-slate-400">Henüz test girilmedi</p>
                              )}
                            </div>
                            <div className="shrink-0 text-right">
                              {t.testCount > 0 ? (
                                <>
                                  <p className="text-lg font-bold text-primary-700">{t.totalQuestions.toLocaleString('tr-TR')}</p>
                                  <p className="text-[10px] text-slate-400">soru</p>
                                  <p className="text-xs font-semibold text-slate-500">Genel %{t.overallPercentage}</p>
                                  <p className="text-sm font-semibold text-slate-800">Son {RECENT_TEST_WINDOW}: %{t.recentPercentage ?? 0}</p>
                                  {t.bestRecentPercentage !== null && (
                                    <p className="text-[10px] font-medium text-green-700">En iyi: %{t.bestRecentPercentage}</p>
                                  )}
                                </>
                              ) : (
                                <p className="text-sm text-slate-300">—</p>
                              )}
                            </div>
                          </div>
                        </li>
                      ))}
                      <li className="bg-primary-50 px-3 py-2.5">
                        <div className="flex justify-between text-sm font-bold text-primary-800">
                          <span>{s.subject} Toplam</span>
                          <span>
                            {subjectQuestions.toLocaleString('tr-TR')} soru · {subjectCorrect} doğru · %{s.avgPercentage}
                          </span>
                        </div>
                        {s.avgPercentage > 0 && <MasteryBar pct={s.avgPercentage} showLabel={false} />}
                      </li>
                    </ul>
                  )}
                </div>
              )
            })}

            <div className="rounded-xl bg-slate-800 p-3 text-white">
              <div className="flex items-center justify-between">
                <span className="font-bold">GENEL TOPLAM</span>
                <span className="text-xl font-bold">{questionStats.totalQuestions.toLocaleString('tr-TR')} soru</span>
              </div>
              {questionStats.totalQuestions > 0 && (
                <div className="mt-2">
                  <div className="mb-0.5 flex justify-between text-[10px] text-slate-300">
                    <span>Genel Hakimiyet</span>
                    <span className="font-semibold">
                      %{Math.round((questionStats.totalCorrect / questionStats.totalQuestions) * 100)}
                    </span>
                  </div>
                  <ProgressBar
                    value={Math.round((questionStats.totalCorrect / questionStats.totalQuestions) * 100)}
                    color={getMasteryBarColor(Math.round((questionStats.totalCorrect / questionStats.totalQuestions) * 100))}
                  />
                </div>
              )}
              <p className="mt-2 text-xs text-slate-300">
                TYT: {questionStats.tytQuestions.toLocaleString('tr-TR')} · AYT: {questionStats.aytQuestions.toLocaleString('tr-TR')} ·{' '}
                {questionStats.totalCorrect} doğru · {questionStats.totalWrong} yanlış · {questionStats.totalEmpty} boş
              </p>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
