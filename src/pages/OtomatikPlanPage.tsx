import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { useNavigate } from 'react-router-dom'
import { Layout, Card, Button, Input, Badge, EmptyState } from '../components/Layout'
import { RankSelect } from '../components/RankSelect'
import { PlanProgressCard } from '../components/PlanProgressCard'
import { useApp } from '../context/AppContext'
import { formatWeekLabel, DEFAULT_PLANNER_SETTINGS, getWeakTopicsForPlan, MASTERY_COMPLETE_THRESHOLD, PLAN_EXAM_FOCUS_LABELS, normalizePlannerSettings, getWeightsForFocus, getSubjectQuestionCount, getSubjectSayCoefficient } from '../utils/autoPlanner'
import {
  computePlanProgress,
  getCurrentWeek,
  getWeekForDate,
  getDailyPlanItems,
} from '../utils/planProgress'
import { todayStr, computeTopicMastery, isTopicMastered } from '../utils/calculations'
import { TYT_RANK_OPTIONS, AYT_RANK_OPTIONS, formatRank } from '../data/rankOptions'
import { parseLocalDate } from '../utils/autoPlanner'
import type { WeeklyPlan, PlanExamFocus, ExamType } from '../types'
import { CURRICULUM } from '../data/curriculum'

type PlanView = 'gunluk' | 'haftalik' | 'tum'
type ExamViewFilter = 'all' | ExamType

function filterWeekSubjects(week: WeeklyPlan, filter: ExamViewFilter): WeeklyPlan {
  if (filter === 'all') return week
  const subjects = week.subjects.filter((s) => s.examType === filter)
  return {
    ...week,
    subjects,
    totalHours: Math.round(subjects.reduce((s, item) => s + item.totalHours, 0) * 10) / 10,
    totalQuestions: subjects.reduce((s, item) => s + item.totalQuestions, 0),
  }
}

function ExamFocusPicker({
  value,
  onChange,
}: {
  value: PlanExamFocus
  onChange: (value: PlanExamFocus) => void
}) {
  const options: { id: PlanExamFocus; label: string; desc: string }[] = [
    { id: 'TYT', label: 'TYT', desc: 'Temel Yeterlilik' },
    { id: 'AYT', label: 'AYT', desc: 'Alan Yeterlilik' },
    { id: 'TYT_AYT', label: 'TYT + AYT', desc: 'Karma program' },
  ]

  return (
    <div>
      <p className="mb-2 text-sm font-medium text-slate-700">Çalışma Odağı</p>
      <div className="grid grid-cols-3 gap-2">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={`rounded-xl border px-2 py-3 text-center transition-colors ${
              value === option.id
                ? 'border-primary-600 bg-primary-50 text-primary-800 ring-2 ring-primary-200'
                : 'border-slate-200 bg-white text-slate-600 active:bg-slate-50'
            }`}
          >
            <p className="text-sm font-bold">{option.label}</p>
            <p className="mt-0.5 text-[10px]">{option.desc}</p>
          </button>
        ))}
      </div>
    </div>
  )
}

function ExamViewFilterBar({
  value,
  onChange,
}: {
  value: ExamViewFilter
  onChange: (value: ExamViewFilter) => void
}) {
  return (
    <div className="mb-3 flex rounded-lg bg-white/70 p-1">
      {([
        ['all', 'Tümü'],
        ['TYT', 'TYT'],
        ['AYT', 'AYT'],
      ] as const).map(([id, label]) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={`flex-1 rounded-md py-1.5 text-xs font-bold ${
            value === id ? 'bg-white text-primary-800 shadow-sm' : 'text-slate-600'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

function WeekSubjectsDetail({ week, onApply }: { week: WeeklyPlan; onApply: () => void }) {
  return (
    <>
      <div className="space-y-2">
        {week.subjects.map((s) => {
          const qCount = getSubjectQuestionCount(s.examType, s.subject)
          const coef = getSubjectSayCoefficient(s.examType, s.subject)
          return (
            <div key={`${s.examType}-${s.subject}`} className="rounded-lg border border-slate-100 bg-white p-2">
              <div className="flex flex-wrap items-center justify-between gap-1">
                <p className="text-sm font-bold text-slate-800">
                  {s.examType} {s.subject}: {s.totalHours} sa · {s.totalQuestions} soru
                </p>
                <div className="flex gap-1">
                  <Badge color="bg-slate-100 text-slate-600">{qCount} snv soru</Badge>
                  {coef > 0 && <Badge color="bg-purple-100 text-purple-800">SAY %{coef}</Badge>}
                </div>
              </div>
              <ul className="mt-1 space-y-0.5">
                {s.topics.map((t) => (
                  <li key={t.topicId} className="text-xs text-slate-600">
                    • {t.topicName} — {t.studyHours} sa konu + {t.testHours} sa test · {t.questionTarget} soru
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
      <Button onClick={onApply} className="mt-3 w-full">
        Bu Haftayı Programa Aktar →
      </Button>
    </>
  )
}

function WeekCard({
  week,
  isSelected,
  onSelect,
  onApply,
}: {
  week: WeeklyPlan
  isSelected: boolean
  onSelect: () => void
  onApply: () => void
}) {
  return (
    <Card className={`!p-0 overflow-hidden ${isSelected ? 'ring-2 ring-primary-500' : ''}`}>
      <button onClick={onSelect} className="w-full p-3 text-left active:bg-slate-50">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-slate-800">Hafta {week.weekNumber}</p>
            <p className="text-xs text-slate-500">{formatWeekLabel(week.weekStart)}</p>
          </div>
          <div className="text-right">
            <p className="font-bold text-primary-700">{week.totalHours} sa</p>
            <p className="text-xs text-slate-500">{week.totalQuestions} soru</p>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {week.subjects.map((s) => (
            <Badge key={`${s.examType}-${s.subject}`} color="bg-blue-100 text-blue-800">
              {s.examType} {s.subject}
            </Badge>
          ))}
        </div>
      </button>
      {isSelected && (
        <div className="border-t border-slate-100 bg-slate-50 p-3">
          <WeekSubjectsDetail week={week} onApply={onApply} />
        </div>
      )}
    </Card>
  )
}

export function OtomatikPlanPage() {
  const navigate = useNavigate()
  const { data, savePlannerSettings, generateAndSavePlan, applyPlanWeek, updateSettings } = useApp()
  const saved = normalizePlannerSettings(data.plannerSettings ?? DEFAULT_PLANNER_SETTINGS)
  const { settings } = data

  const [showSettings, setShowSettings] = useState(!data.generatedPlan)
  const [planView, setPlanView] = useState<PlanView>('gunluk')
  const [weeks, setWeeks] = useState(String(saved.topicCompletionWeeks))
  const [weekdayH, setWeekdayH] = useState(String(saved.weekdayHours))
  const [weekendH, setWeekendH] = useState(String(saved.weekendHours))
  const [startDate, setStartDate] = useState(saved.startDate)
  const [includeDone, setIncludeDone] = useState(saved.includeCompletedTopics)
  const [examFocus, setExamFocus] = useState<PlanExamFocus>(saved.examFocus)
  const [examViewFilter, setExamViewFilter] = useState<ExamViewFilter>('all')
  const [targetRankTyt, setTargetRankTyt] = useState(settings.targetRankTyt)
  const [targetRankAyt, setTargetRankAyt] = useState(settings.targetRankAyt)
  const [selectedWeekNum, setSelectedWeekNum] = useState<number>(() => {
    const cw = data.generatedPlan ? getCurrentWeek(data.generatedPlan)?.weekNumber : 1
    return cw ?? 1
  })
  const [selectedDate, setSelectedDate] = useState(todayStr())
  const [showReplaceDialog, setShowReplaceDialog] = useState(false)

  const plan = data.generatedPlan
  const planExamFocus = plan?.settings.examFocus ?? examFocus
  const showExamViewFilter = planExamFocus === 'TYT_AYT'
  const progress = useMemo(() => computePlanProgress(data), [data])
  const weakTopics = useMemo(
    () => getWeakTopicsForPlan(data.testResults, examFocus),
    [data.testResults, examFocus],
  )
  const weightRows = useMemo(() => getWeightsForFocus(examFocus), [examFocus])
  const weightTotal = useMemo(
    () => weightRows.reduce((s, w) => s + w.planWeight, 0) || 1,
    [weightRows],
  )
  const masteredCount = useMemo(
    () =>
      CURRICULUM.filter(
        (t) =>
          (examFocus === 'TYT_AYT' || t.examType === examFocus) && isTopicMastered(t.id, data.testResults),
      ).length,
    [data.testResults, examFocus],
  )

  const currentWeek = plan ? getCurrentWeek(plan) : undefined
  const viewWeek = plan
    ? plan.weeks.find((w) => w.weekNumber === selectedWeekNum) ?? currentWeek ?? plan.weeks[0]
    : undefined

  const dailyItems = useMemo(() => {
    if (!plan) return []
    const items = getDailyPlanItems(plan, data, selectedDate)
    if (!showExamViewFilter || examViewFilter === 'all') return items
    return items.filter((item) => item.examType === examViewFilter)
  }, [plan, data, selectedDate, showExamViewFilter, examViewFilter])

  const filteredViewWeek = useMemo(() => {
    if (!viewWeek) return undefined
    if (!showExamViewFilter || examViewFilter === 'all') return viewWeek
    return filterWeekSubjects(viewWeek, examViewFilter)
  }, [viewWeek, showExamViewFilter, examViewFilter])

  const buildPlannerSettings = () =>
    normalizePlannerSettings({
      startDate,
      topicCompletionWeeks: parseInt(weeks) || 24,
      weekdayHours: parseFloat(weekdayH) || 8,
      weekendHours: parseFloat(weekendH) || 4,
      includeCompletedTopics: includeDone,
      examFocus,
    })

  const applyNewPlan = (clearProgramTasks: boolean) => {
    const plannerSettings = buildPlannerSettings()
    savePlannerSettings(plannerSettings)
    updateSettings({ targetRankTyt, targetRankAyt })
    generateAndSavePlan(plannerSettings, { clearProgramTasks })
    setExamViewFilter(examFocus === 'TYT' ? 'TYT' : examFocus === 'AYT' ? 'AYT' : 'all')
    setSelectedWeekNum(1)
    setShowSettings(false)
    setShowReplaceDialog(false)
    setPlanView('haftalik')
  }

  const handleGenerate = () => {
    if (plan) {
      setShowReplaceDialog(true)
      return
    }
    applyNewPlan(false)
  }

  const handleApplyWeek = (weekNumber: number) => {
    const result = applyPlanWeek(weekNumber)
    if (result.count > 0 && result.weekStart) {
      alert(`${result.count} görev Programa aktarıldı!\n${result.weekStart} – ${result.weekEnd}`)
      navigate(`/program?date=${result.weekStart}`)
      return
    }
    alert('Bu hafta için aktarılacak görev bulunamadı. Planı yeniden oluşturmayı deneyin.')
  }

  return (
    <Layout
      title="Otomatik Plan"
      subtitle="Günlük · haftalık program"
      action={
        plan ? (
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="rounded-lg bg-white/20 px-2 py-1.5 text-xs font-semibold"
          >
            {showSettings ? 'Plan' : 'Hedef'}
          </button>
        ) : undefined
      }
    >
      <div className="space-y-4">
        <PlanProgressCard progress={progress} />

        <Card className="border-amber-200 bg-amber-50">
          <h2 className="font-bold text-amber-900">🎯 Test Sonuçlarına Göre Öneriler</h2>
          <p className="mt-1 text-xs text-amber-800">
            Konular %{MASTERY_COMPLETE_THRESHOLD} başarıya ulaşana kadar plandan düşmez. Zayıf konular önceliklendirilir.
          </p>
          <p className="mt-2 text-sm text-amber-900">
            {masteredCount} konu tamamlandı · {weakTopics.length > 0 ? `${weakTopics.length}+ konu öncelikli` : 'Öncelikli zayıf konu yok'}
          </p>
          {weakTopics.length > 0 ? (
            <ul className="mt-2 space-y-1">
              {weakTopics.slice(0, 5).map((t) => {
                const mastery = computeTopicMastery(t.topicId, data.testResults)
                const score = mastery?.recentPercentage ?? mastery?.overallPercentage ?? 0
                return (
                  <li key={t.topicId} className="flex items-center justify-between rounded-lg bg-white/70 px-2 py-1.5 text-xs">
                    <span className="font-medium text-slate-800">
                      {t.examType} {t.subject} — {t.topicName}
                    </span>
                    <Badge color={score >= 70 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}>
                      %{score}
                    </Badge>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-amber-700">Test girdikçe zayıf konular burada listelenir.</p>
          )}
        </Card>

        {(showSettings || !plan) && (
          <Card>
            <h2 className="mb-3 font-bold text-slate-800">🎯 Hedeflerini Belirle</h2>
            <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-blue-800">Sıralama Hedefleri</p>
              <div className="space-y-3">
                <RankSelect
                  label="TYT Hedef Sıralama"
                  value={targetRankTyt}
                  options={TYT_RANK_OPTIONS}
                  onChange={setTargetRankTyt}
                />
                <RankSelect
                  label="AYT Hedef Sıralama"
                  value={targetRankAyt}
                  options={AYT_RANK_OPTIONS}
                  onChange={setTargetRankAyt}
                />
              </div>
              <p className="mt-2 text-xs text-blue-700">
                TYT: {formatRank(targetRankTyt)} · AYT: {formatRank(targetRankAyt)}
              </p>
            </div>
            <ExamFocusPicker value={examFocus} onChange={setExamFocus} />

            <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                {examFocus === 'TYT' && 'TYT — Soru sayısına göre ağırlık'}
                {examFocus === 'AYT' && 'AYT — Soru sayısı × SAY katsayısı'}
                {examFocus === 'TYT_AYT' && 'TYT+AYT — Yerleştirme %40 / %60 + ders ağırlıkları'}
              </p>
              <ul className="mt-2 space-y-1.5">
                {weightRows.map((w) => {
                  const pct = Math.round((w.planWeight / weightTotal) * 100)
                  return (
                    <li key={`${w.examType}-${w.subject}`}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-700">
                          {w.examType} {w.subject}
                        </span>
                        <span className="text-slate-500">
                          {w.questionCount} soru
                          {w.sayCoefficientPct > 0 ? ` · SAY %${w.sayCoefficientPct}` : ''}
                          {' · '}
                          <strong className="text-primary-700">%{pct}</strong>
                        </span>
                      </div>
                      <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-slate-200">
                        <div className="h-full rounded-full bg-primary-600" style={{ width: `${pct}%` }} />
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>

            <div className="mt-3 space-y-3">
              <Input label="Başlangıç Tarihi" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              <Input
                label="Konuları bitirme süresi (hafta)"
                type="number"
                min={4}
                max={52}
                value={weeks}
                onChange={(e) => setWeeks(e.target.value)}
              />
              <p className="text-xs text-slate-500">
                {PLAN_EXAM_FOCUS_LABELS[examFocus]} konuları {weeks || 24} haftada tamamlama hedefi
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Hafta içi (saat/gün)" type="number" min={1} max={14} step={0.5} value={weekdayH} onChange={(e) => setWeekdayH(e.target.value)} />
                <Input label="Hafta sonu (saat/gün)" type="number" min={1} max={14} step={0.5} value={weekendH} onChange={(e) => setWeekendH(e.target.value)} />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={includeDone} onChange={(e) => setIncludeDone(e.target.checked)} className="h-4 w-4 rounded" />
                %{MASTERY_COMPLETE_THRESHOLD}+ başarılı konuları da dahil et
              </label>
            </div>
            <Button onClick={handleGenerate} className="mt-3 w-full">
              {plan ? 'Planı Yeniden Oluştur' : 'Plan Oluştur'}
            </Button>
          </Card>
        )}

        {showReplaceDialog && (
          <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-4 sm:items-center">
            <Card className="w-full max-w-md shadow-xl">
              <h2 className="text-lg font-bold text-slate-800">Mevcut plan var</h2>
              <p className="mt-2 text-sm text-slate-600">
                Eski planı silip yenisini mi oluşturalım, yoksa yeni planı üzerine mi yazalım?
              </p>
              <p className="mt-2 text-xs text-slate-500">
                <strong>Sil:</strong> Eski otomatik plan ve programa aktarılmış konu/test görevleri silinir, temiz yeni plan oluşur.
                <br />
                <strong>Üzerine yaz:</strong> Programdaki mevcut görevler kalır, sadece otomatik plan yenilenir.
              </p>
              <div className="mt-4 space-y-2">
                <Button className="w-full" variant="danger" onClick={() => applyNewPlan(true)}>
                  Eski planı sil, yenisini oluştur
                </Button>
                <Button className="w-full" onClick={() => applyNewPlan(false)}>
                  Üzerine yaz (program kalsın)
                </Button>
                <Button className="w-full" variant="secondary" onClick={() => setShowReplaceDialog(false)}>
                  İptal
                </Button>
              </div>
            </Card>
          </div>
        )}

        {!plan ? (
          <EmptyState icon="🤖" title="Henüz plan yok" description="Hedeflerini gir ve plan oluştur" />
        ) : (
          <>
            <Card className="border-primary-200 bg-primary-50">
              <p className="text-sm font-semibold text-primary-900">
                Plan odağı: {PLAN_EXAM_FOCUS_LABELS[planExamFocus]}
              </p>
              <p className="mt-1 text-xs text-primary-700">
                {plan.totalWeeks} hafta · {plan.totalTopics} konu · {plan.settings.topicCompletionWeeks} haftalık hedef
              </p>
            </Card>

            <div className="flex rounded-xl bg-slate-200 p-1">
              {([
                ['gunluk', '📅 Günlük'],
                ['haftalik', '📆 Haftalık'],
                ['tum', '🗓️ Tüm Plan'],
              ] as const).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setPlanView(id)}
                  className={`flex-1 rounded-lg py-2 text-[11px] font-bold sm:text-xs ${
                    planView === id ? 'bg-white text-primary-800 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {planView === 'gunluk' && (
              <Card>
                {showExamViewFilter && (
                  <ExamViewFilterBar value={examViewFilter} onChange={setExamViewFilter} />
                )}
                <Input label="Gün Seç" type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
                <p className="mt-2 text-center text-sm font-semibold text-primary-800">
                  {format(parseLocalDate(selectedDate), 'd MMMM yyyy, EEEE', { locale: tr })}
                </p>
                {!getWeekForDate(plan, selectedDate) ? (
                  <EmptyState icon="📭" title="Bu gün planda yok" description="Başka bir gün seçin" />
                ) : dailyItems.length === 0 ? (
                  <EmptyState icon="😴" title="Bu gün için görev yok" description="Haftalık planda bu güne düşen konu yok" />
                ) : (
                  <ul className="mt-3 space-y-2">
                    {dailyItems.map((item, i) => (
                      <li
                        key={i}
                        className={`flex items-center gap-3 rounded-lg border border-slate-100 border-l-4 p-3 ${
                          item.type === 'konu' ? 'border-l-blue-500' : 'border-l-green-500'
                        } ${item.completed ? 'bg-green-50 opacity-80' : 'bg-slate-50'}`}
                      >
                        <span
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${
                            item.completed ? 'bg-green-500 text-white' : 'border-2 border-slate-300'
                          }`}
                        >
                          {item.completed ? '✓' : ''}
                        </span>
                        <div className="min-w-0 flex-1">
                          {item.scheduledTime && (
                            <span className="text-xs font-bold text-primary-700">{item.scheduledTime} </span>
                          )}
                          <Badge color={item.examType === 'AYT' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}>
                            {item.examType}
                          </Badge>
                          <Badge color={item.type === 'konu' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}>
                            {item.type === 'konu' ? 'Konu' : 'Test'}
                          </Badge>
                          <p className={`mt-0.5 text-sm ${item.completed ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                            {item.title}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                {viewWeek && getWeekForDate(plan, selectedDate) && (
                  <Button variant="secondary" onClick={() => handleApplyWeek(viewWeek.weekNumber)} className="mt-3 w-full">
                    Haftayı Programa Aktar
                  </Button>
                )}
              </Card>
            )}

            {planView === 'haftalik' && viewWeek && (
              <Card className="border-green-200 bg-green-50">
                {showExamViewFilter && (
                  <ExamViewFilterBar value={examViewFilter} onChange={setExamViewFilter} />
                )}
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-green-900">Hafta {viewWeek.weekNumber}</h3>
                    <p className="text-xs text-green-700">{formatWeekLabel(viewWeek.weekStart)}</p>
                  </div>
                  <select
                    value={selectedWeekNum}
                    onChange={(e) => setSelectedWeekNum(parseInt(e.target.value))}
                    className="rounded-lg border border-green-200 bg-white px-2 py-1 text-sm"
                  >
                    {plan.weeks.map((w) => (
                      <option key={w.weekNumber} value={w.weekNumber}>
                        Hafta {w.weekNumber}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-sm text-green-800">
                  {(filteredViewWeek ?? viewWeek).totalHours} saat · {(filteredViewWeek ?? viewWeek).totalQuestions} soru ·{' '}
                  {(filteredViewWeek ?? viewWeek).subjects.length} ders
                </p>
                <div className="mt-3">
                  {(filteredViewWeek ?? viewWeek).subjects.length > 0 ? (
                    <WeekSubjectsDetail
                      week={filteredViewWeek ?? viewWeek}
                      onApply={() => handleApplyWeek(viewWeek.weekNumber)}
                    />
                  ) : (
                    <EmptyState icon="📭" title="Bu filtrede ders yok" description="TYT veya AYT seçimini değiştirin" />
                  )}
                </div>
              </Card>
            )}

            {planView === 'tum' && (
              <>
                <Card className="bg-slate-800 text-white">
                  <h3 className="font-bold">Genel Özet</h3>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
                    <div className="rounded-lg bg-white/10 p-2">
                      <p className="text-[10px] text-slate-300">Hafta</p>
                      <p className="font-bold">{plan.totalWeeks}</p>
                    </div>
                    <div className="rounded-lg bg-white/10 p-2">
                      <p className="text-[10px] text-slate-300">Konu</p>
                      <p className="font-bold">{plan.totalTopics}</p>
                    </div>
                    <div className="rounded-lg bg-white/10 p-2">
                      <p className="text-[10px] text-slate-300">Saat</p>
                      <p className="font-bold">{plan.totalHours}</p>
                    </div>
                    <div className="rounded-lg bg-white/10 p-2">
                      <p className="text-[10px] text-slate-300">Soru</p>
                      <p className="font-bold">{plan.totalQuestions.toLocaleString('tr-TR')}</p>
                    </div>
                  </div>
                </Card>
                <div className="space-y-2">
                  {plan.weeks.map((week) => (
                    <WeekCard
                      key={week.weekNumber}
                      week={week}
                      isSelected={selectedWeekNum === week.weekNumber}
                      onSelect={() => setSelectedWeekNum(week.weekNumber)}
                      onApply={() => handleApplyWeek(week.weekNumber)}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </Layout>
  )
}
