import { useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { tr } from 'date-fns/locale'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Layout, Card, Badge, ProgressBar, EmptyState } from '../components/Layout'
import { useApp } from '../context/AppContext'
import {
  buildDayReport,
  buildRangeReport,
  formatReportDate,
  formatStudyMinutes,
  getWeekRange,
  getMonthRange,
  addDaysToDate,
  type DayReport,
} from '../utils/dailyReport'
import { MASTERY_COLORS, MASTERY_LABELS, todayStr } from '../utils/calculations'

type ViewMode = 'day' | 'range'

function StatCard({ label, value, sub, color = 'bg-white' }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className={`rounded-xl border border-slate-200 p-3 text-center shadow-sm ${color}`}>
      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-slate-900">{value}</p>
      {sub && <p className="mt-0.5 text-[10px] text-slate-400">{sub}</p>}
    </div>
  )
}

function DayDetail({ report }: { report: DayReport }) {
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null)
  const taskPct = report.tasksTotal > 0 ? Math.round((report.tasksCompleted / report.tasksTotal) * 100) : 0
  const masteryPct = report.questionCount > 0 ? Math.round((report.correct / report.questionCount) * 100) : 0

  const hasActivity =
    report.questionCount > 0 || report.tasksCompleted > 0 || report.topicsStudied.length > 0 || report.mockExam

  if (!hasActivity) {
    return <EmptyState icon="😴" title="Bu gün kayıt yok" description="Test veya görev girilmemiş" />
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatCard label="Çalışma" value={formatStudyMinutes(report.studyMinutes)} color="bg-blue-50" />
        <StatCard label="Soru" value={report.questionCount} sub={`${report.correct}D ${report.wrong}Y ${report.empty}B`} color="bg-green-50" />
        <StatCard label="Hakimiyet" value={`%${masteryPct}`} sub={`${report.testCount} test`} color="bg-yellow-50" />
        <StatCard label="Görevler" value={`${report.tasksCompleted}/${report.tasksTotal}`} sub={`${report.konuCompleted} konu`} color="bg-purple-50" />
      </div>

      {report.tasksTotal > 0 && (
        <Card>
          <div className="mb-1 flex justify-between text-sm">
            <span className="font-medium text-slate-700">Görev Tamamlama</span>
            <span className="font-bold">%{taskPct}</span>
          </div>
          <ProgressBar value={taskPct} color="bg-purple-500" />
        </Card>
      )}

      {report.mockExam && (
        <Card className="border-purple-200 bg-purple-50">
          <p className="font-bold text-purple-900">📝 Deneme: {report.mockExam.name}</p>
          <div className="mt-2 flex gap-3 text-sm">
            {report.mockExam.tytTotal !== undefined && (
              <span>TYT: <strong>{report.mockExam.tytTotal.toFixed(1)}</strong> net</span>
            )}
            {report.mockExam.aytTotal !== undefined && (
              <span>AYT: <strong>{report.mockExam.aytTotal.toFixed(1)}</strong> net</span>
            )}
          </div>
        </Card>
      )}

      {report.topicsStudied.length > 0 && (
        <Card>
          <h3 className="mb-2 text-sm font-bold text-slate-800">📖 Okunan Konular ({report.topicsStudied.length})</h3>
          <div className="flex flex-wrap gap-1">
            {report.topicsStudied.map((t) => (
              <Badge key={t.id} color="bg-blue-100 text-blue-800">
                {t.examType} {t.subject}: {t.name}
              </Badge>
            ))}
          </div>
        </Card>
      )}

      {report.subjects.length > 0 && (
        <Card className="!p-0 overflow-hidden">
          <div className="border-b border-slate-100 p-3">
            <h3 className="font-bold text-slate-800">Ders Bazlı Detay</h3>
            <p className="text-xs text-slate-500">Derse tıklayın — konu konu soru ve hakimiyet</p>
          </div>
          {report.subjects.map((s) => {
            const key = `${s.examType}-${s.subject}`
            const isOpen = expandedSubject === key
            return (
              <div key={key} className="border-b border-slate-100 last:border-0">
                <button
                  onClick={() => setExpandedSubject(isOpen ? null : key)}
                  className="flex w-full items-center justify-between p-3 text-left active:bg-slate-50"
                >
                  <div>
                    <div className="flex items-center gap-1">
                      <Badge color="bg-slate-100 text-slate-700">{s.examType}</Badge>
                      <span className="font-semibold text-slate-800">{s.subject}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {formatStudyMinutes(s.studyMinutes)} · {s.questions} soru · {s.testCount} test
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary-700">%{s.masteryPct}</p>
                    <span className="text-slate-400">{isOpen ? '▲' : '▼'}</span>
                  </div>
                </button>
                {isOpen && (
                  <ul className="bg-slate-50 px-3 pb-2">
                    {s.topics.map((t) => (
                      <li key={t.topicId} className="flex items-center justify-between border-t border-slate-100 py-2 text-sm">
                        <div>
                          <p className="font-medium text-slate-800">{t.topicName}</p>
                          <div className="mt-0.5 flex gap-1">
                            <Badge color={MASTERY_COLORS[t.level]}>{MASTERY_LABELS[t.level]}</Badge>
                            <span className="text-xs text-slate-500">{t.correct}/{t.questions} · {formatStudyMinutes(t.studyMinutes)}</span>
                          </div>
                        </div>
                        <span className="font-bold text-slate-700">{t.questions} soru</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })}
        </Card>
      )}

      {report.tests.length > 0 && (
        <Card>
          <h3 className="mb-2 text-sm font-bold text-slate-800">Çözülen Testler</h3>
          <ul className="space-y-2">
            {report.tests.map((t, i) => (
              <li key={i} className="flex justify-between rounded-lg bg-slate-50 p-2 text-sm">
                <span className="font-medium text-slate-700">{t.name}</span>
                <span className="text-slate-500">{t.correct}/{t.questions} · {t.minutes} dk</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}

export function GunlukRaporView() {
  const { data } = useApp()
  const [viewMode, setViewMode] = useState<ViewMode>('day')
  const [selectedDate, setSelectedDate] = useState(todayStr())
  const [startDate, setStartDate] = useState(() => getWeekRange().start)
  const [endDate, setEndDate] = useState(todayStr())
  const [selectedDayInRange, setSelectedDayInRange] = useState<string | null>(null)

  const dayReport = useMemo(() => buildDayReport(selectedDate, data), [selectedDate, data])

  const rangeReport = useMemo(
    () => buildRangeReport(startDate, endDate, data),
    [startDate, endDate, data],
  )

  const chartData = useMemo(
    () =>
      [...rangeReport.days].reverse().map((d) => ({
        label: format(parseISO(d.date), 'd MMM', { locale: tr }),
        soru: d.questionCount,
        dakika: d.studyMinutes,
        hakimiyet: d.questionCount > 0 ? Math.round((d.correct / d.questionCount) * 100) : 0,
        date: d.date,
      })),
    [rangeReport.days],
  )

  const applyQuick = (type: 'today' | 'yesterday' | 'week' | 'month' | 'last7') => {
    const today = todayStr()
    if (viewMode === 'day') {
      if (type === 'today') setSelectedDate(today)
      if (type === 'yesterday') setSelectedDate(addDaysToDate(today, -1))
      return
    }
    if (type === 'today') { setStartDate(today); setEndDate(today) }
    if (type === 'yesterday') { const y = addDaysToDate(today, -1); setStartDate(y); setEndDate(y) }
    if (type === 'week') { const w = getWeekRange(); setStartDate(w.start); setEndDate(w.end) }
    if (type === 'month') { const m = getMonthRange(); setStartDate(m.start); setEndDate(m.end) }
    if (type === 'last7') { setStartDate(addDaysToDate(today, -6)); setEndDate(today) }
    setSelectedDayInRange(null)
  }

  const detailReport = selectedDayInRange ? buildDayReport(selectedDayInRange, data) : null

  return (
    <div className="space-y-4">
      {/* Mod seçici */}
      <div className="flex rounded-xl bg-slate-200 p-1">
        <button
          onClick={() => setViewMode('day')}
          className={`flex-1 rounded-lg py-2.5 text-sm font-bold ${viewMode === 'day' ? 'bg-white text-primary-800 shadow-sm' : 'text-slate-600'}`}
        >
          Tek Gün
        </button>
        <button
          onClick={() => setViewMode('range')}
          className={`flex-1 rounded-lg py-2.5 text-sm font-bold ${viewMode === 'range' ? 'bg-white text-primary-800 shadow-sm' : 'text-slate-600'}`}
        >
          Tarih Aralığı
        </button>
      </div>

      {/* Hızlı seçimler */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'today' as const, label: 'Bugün' },
          { id: 'yesterday' as const, label: 'Dün' },
          ...(viewMode === 'range'
            ? [
                { id: 'week' as const, label: 'Bu Hafta' },
                { id: 'last7' as const, label: 'Son 7 Gün' },
                { id: 'month' as const, label: 'Bu Ay' },
              ]
            : []),
        ].map((q) => (
          <button
            key={q.id}
            onClick={() => applyQuick(q.id)}
            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 active:bg-primary-50 active:text-primary-800"
          >
            {q.label}
          </button>
        ))}
      </div>

      {viewMode === 'day' ? (
        <>
          <Card>
            <label className="block text-sm font-medium text-slate-700">Tarih Seç</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
            />
            <p className="mt-2 text-center text-sm font-semibold text-primary-800">{formatReportDate(selectedDate)}</p>
          </Card>
          <DayDetail report={dayReport} />
        </>
      ) : (
        <>
          <Card>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Başlangıç</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); setSelectedDayInRange(null) }}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Bitiş</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => { setEndDate(e.target.value); setSelectedDayInRange(null) }}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
            </div>
          </Card>

          {/* Aralık toplamları */}
          <Card className="bg-slate-800 text-white">
            <h3 className="font-bold">Dönem Özeti</h3>
            <p className="mt-0.5 text-xs text-slate-300">
              {format(parseISO(rangeReport.startDate), 'd MMM', { locale: tr })} —{' '}
              {format(parseISO(rangeReport.endDate), 'd MMM yyyy', { locale: tr })} · {rangeReport.totals.activeDays} aktif gün
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-lg bg-white/10 p-2 text-center">
                <p className="text-[10px] text-slate-300">Toplam Süre</p>
                <p className="font-bold">{formatStudyMinutes(rangeReport.totals.studyMinutes)}</p>
              </div>
              <div className="rounded-lg bg-white/10 p-2 text-center">
                <p className="text-[10px] text-slate-300">Toplam Soru</p>
                <p className="font-bold">{rangeReport.totals.questions.toLocaleString('tr-TR')}</p>
              </div>
              <div className="rounded-lg bg-white/10 p-2 text-center">
                <p className="text-[10px] text-slate-300">Hakimiyet</p>
                <p className="font-bold">
                  %{rangeReport.totals.questions > 0 ? Math.round((rangeReport.totals.correct / rangeReport.totals.questions) * 100) : 0}
                </p>
              </div>
              <div className="rounded-lg bg-white/10 p-2 text-center">
                <p className="text-[10px] text-slate-300">Konu Okuma</p>
                <p className="font-bold">{rangeReport.totals.topicsStudied}</p>
              </div>
            </div>
            <p className="mt-2 text-center text-xs text-slate-400">
              Günlük ort: {rangeReport.totals.avgQuestionsPerDay} soru · {formatStudyMinutes(rangeReport.totals.avgMinutesPerDay)} ·{' '}
              {rangeReport.totals.correct}D {rangeReport.totals.wrong}Y · {rangeReport.totals.tasksCompleted}/{rangeReport.totals.tasksTotal} görev
            </p>
          </Card>

          {chartData.some((d) => d.soru > 0) && (
            <Card>
              <h3 className="mb-3 font-bold text-slate-800">Günlük Soru Grafiği</h3>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="soru" fill="#2563eb" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}

          {chartData.some((d) => d.dakika > 0) && (
            <Card>
              <h3 className="mb-3 font-bold text-slate-800">Günlük Çalışma Süresi (dk)</h3>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="dakika" fill="#7c3aed" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* Gün gün liste */}
          <Card className="!p-0 overflow-hidden">
            <div className="border-b border-slate-100 p-3">
              <h3 className="font-bold text-slate-800">Gün Gün Liste</h3>
              <p className="text-xs text-slate-500">Detay için güne tıklayın</p>
            </div>
            <ul>
              {rangeReport.days.map((d) => {
                const hasData = d.questionCount > 0 || d.tasksCompleted > 0 || d.topicsStudied.length > 0
                const pct = d.questionCount > 0 ? Math.round((d.correct / d.questionCount) * 100) : 0
                const isSelected = selectedDayInRange === d.date
                return (
                  <li key={d.date} className="border-b border-slate-50 last:border-0">
                    <button
                      onClick={() => setSelectedDayInRange(isSelected ? null : d.date)}
                      className={`flex w-full items-center justify-between p-3 text-left ${isSelected ? 'bg-primary-50' : hasData ? 'active:bg-slate-50' : 'opacity-40'}`}
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          {format(parseISO(d.date), 'd MMM, EEE', { locale: tr })}
                        </p>
                        {hasData ? (
                          <p className="text-xs text-slate-500">
                            {formatStudyMinutes(d.studyMinutes)} · {d.questionCount} soru · {d.tasksCompleted}/{d.tasksTotal} görev
                          </p>
                        ) : (
                          <p className="text-xs text-slate-400">Kayıt yok</p>
                        )}
                      </div>
                      {hasData && (
                        <div className="text-right">
                          <p className="font-bold text-primary-700">%{pct}</p>
                          <span className="text-slate-400">{isSelected ? '▲' : '▼'}</span>
                        </div>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          </Card>

          {detailReport && selectedDayInRange && (
            <Card>
              <h3 className="mb-3 font-bold text-slate-800">
                {formatReportDate(selectedDayInRange)} — Detay
              </h3>
              <DayDetail report={detailReport} />
            </Card>
          )}
        </>
      )}
    </div>
  )
}

export function GunlukRaporPage() {
  return (
    <Layout title="Günlük Rapor" subtitle="Süre · konu · hakimiyet · soru">
      <GunlukRaporView />
    </Layout>
  )
}
