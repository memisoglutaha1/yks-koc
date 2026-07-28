import { addDays, format, getDay } from 'date-fns'
import { tr } from 'date-fns/locale'
import type { PlannerSettings, PlannedTopicItem, SubjectWeekPlan, WeeklyPlan, GeneratedPlan, DailyTask, Topic, TestResult, ExamType, PlanExamFocus } from '../types'
import { CURRICULUM } from '../data/curriculum'
import {
  getSubjectPlanWeight,
  getSubjectQuestionCount,
  getSubjectSayCoefficient,
  getWeightsForFocus,
} from '../data/examWeights'
import { generateId, isTopicMastered, computeTopicMastery, MASTERY_COMPLETE_THRESHOLD } from './calculations'

function parseSubjectKey(key: string): { examType: ExamType; subject: string } {
  const idx = key.indexOf('-')
  return { examType: key.slice(0, idx) as ExamType, subject: key.slice(idx + 1) }
}

/** Sınav ağırlığına göre konu çalışma süresi ve soru hedefi */
function getTopicEstimate(
  topic: Topic,
  focus: PlanExamFocus,
): { studyHours: number; questions: number; testHours: number } {
  const qCount = getSubjectQuestionCount(topic.examType, topic.subject)
  const weight = getSubjectPlanWeight(topic.examType, topic.subject, focus)
  const focusWeights = getWeightsForFocus(focus)
  const maxW = Math.max(...focusWeights.map((w) => w.planWeight), 1)
  const relative = Math.max(0.15, weight / maxW)

  // Yüksek soru/katsayılı derslere daha fazla saat
  const studyHours = Math.round((0.9 + relative * 2.1) * 4) / 4
  const testHours = Math.round((0.35 + relative * 0.85) * 4) / 4
  // Soru hedefi: sınav soru sayısıyla orantılı pratik hacmi
  const questions = Math.max(15, Math.round(12 + qCount * 0.55 + relative * 18))

  return { studyHours, questions, testHours }
}

/** Ağırlığı yüksek ders önce (negatif = yüksek öncelik) */
function topicPriority(topic: Topic, focus: PlanExamFocus): number {
  return -getSubjectPlanWeight(topic.examType, topic.subject, focus)
}

function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function eachLocalDay(start: Date, end: Date): Date[] {
  const days: Date[] = []
  let current = start
  while (current <= end) {
    days.push(current)
    current = addDays(current, 1)
  }
  return days
}
function isWeekend(date: Date): boolean {
  const day = getDay(date)
  return day === 0 || day === 6
}

function matchesExamFocus(examType: ExamType, focus: PlanExamFocus): boolean {
  if (focus === 'TYT_AYT') return true
  return examType === focus
}

export function normalizePlannerSettings(settings: Partial<PlannerSettings> = {}): PlannerSettings {
  const topicCompletionWeeks =
    settings.topicCompletionWeeks ??
    (settings.topicCompletionMonths ? settings.topicCompletionMonths * 4 : 24)

  return {
    startDate: settings.startDate ?? format(new Date(), 'yyyy-MM-dd'),
    topicCompletionWeeks,
    weekdayHours: settings.weekdayHours ?? 8,
    weekendHours: settings.weekendHours ?? 4,
    includeCompletedTopics: settings.includeCompletedTopics ?? false,
    examFocus: settings.examFocus ?? 'TYT_AYT',
  }
}

export const PLAN_EXAM_FOCUS_LABELS: Record<PlanExamFocus, string> = {
  TYT: 'TYT',
  AYT: 'AYT',
  TYT_AYT: 'TYT + AYT',
}

function getDayHours(date: Date, settings: PlannerSettings): number {
  return isWeekend(date) ? settings.weekendHours : settings.weekdayHours
}

function getTopicMasteryScore(topicId: string, testResults: TestResult[]): number {
  const mastery = computeTopicMastery(topicId, testResults)
  if (!mastery || mastery.testCount === 0) return -1
  return mastery.recentPercentage ?? mastery.overallPercentage
}

function getRemainingTopics(
  testResults: TestResult[],
  includeCompleted: boolean,
  examFocus: PlanExamFocus,
): PlannedTopicItem[] {
  return CURRICULUM.filter(
    (t) => matchesExamFocus(t.examType, examFocus) && (includeCompleted || !isTopicMastered(t.id, testResults)),
  )
    .sort((a, b) => {
      const priorityDiff = topicPriority(a, examFocus) - topicPriority(b, examFocus)
      if (priorityDiff !== 0) return priorityDiff
      const scoreDiff = getTopicMasteryScore(a.id, testResults) - getTopicMasteryScore(b.id, testResults)
      if (scoreDiff !== 0) return scoreDiff
      return a.order - b.order
    })
    .map((t) => {
      const est = getTopicEstimate(t, examFocus)
      return {
        topicId: t.id,
        examType: t.examType,
        subject: t.subject,
        topicName: t.name,
        studyHours: est.studyHours,
        questionTarget: est.questions,
        testHours: est.testHours,
      }
    })
}

function subjectKey(t: PlannedTopicItem): string {
  return `${t.examType}-${t.subject}`
}

/** Konuları ders ders kuyruklara ayırır; her ders içinde sıra korunur */
function buildSubjectQueues(topics: PlannedTopicItem[]): Map<string, PlannedTopicItem[]> {
  const queues = new Map<string, PlannedTopicItem[]>()
  for (const t of topics) {
    const key = subjectKey(t)
    if (!queues.has(key)) queues.set(key, [])
    queues.get(key)!.push(t)
  }
  return queues
}

function getKeyWeight(key: string, focus: PlanExamFocus): number {
  const { examType, subject } = parseSubjectKey(key)
  return getSubjectPlanWeight(examType, subject, focus)
}

function sortedSubjectKeysByWeight(queues: Map<string, PlannedTopicItem[]>, focus: PlanExamFocus): string[] {
  return Array.from(queues.keys()).sort((a, b) => getKeyWeight(b, focus) - getKeyWeight(a, focus))
}

/**
 * Haftayı sınav ağırlığına göre doldur:
 * TYT → soru sayısı payı, AYT → soru × SAY katsayısı, karma → yerleştirme %40/%60
 */
function fillWeekByWeight(
  queues: Map<string, PlannedTopicItem[]>,
  cursors: Map<string, number>,
  availableHours: number,
  focus: PlanExamFocus,
): PlannedTopicItem[] {
  const weekTopics: PlannedTopicItem[] = []
  const buffer = availableHours * 0.92

  const activeKeys = sortedSubjectKeysByWeight(queues, focus).filter(
    (key) => (cursors.get(key) ?? 0) < (queues.get(key)?.length ?? 0),
  )
  if (activeKeys.length === 0) return weekTopics

  const rawWeights = activeKeys.map((key) => Math.max(getKeyWeight(key, focus), 0.01))
  const totalWeight = rawWeights.reduce((s, w) => s + w, 0)

  const budgets = new Map<string, number>()
  activeKeys.forEach((key, i) => {
    budgets.set(key, (buffer * rawWeights[i]) / totalWeight)
  })

  // Her derse ağırlık bütçesi kadar konu/test ekle
  for (const key of activeKeys) {
    let used = 0
    const budget = budgets.get(key) ?? 0
    const queue = queues.get(key)!

    while (used < budget - 0.2) {
      const cursor = cursors.get(key) ?? 0
      if (cursor >= queue.length) break
      const t = queue[cursor]
      const needed = t.studyHours + t.testHours
      // İlk konu bütçeyi aşsa bile en az bir konu al (küçük dersler için)
      if (used > 0 && used + needed > budget * 1.15) break
      weekTopics.push(t)
      cursors.set(key, cursor + 1)
      used += needed
    }
  }

  // Kalan saatleri ağırlık sırasıyla doldur
  let usedHours = weekTopics.reduce((s, t) => s + t.studyHours + t.testHours, 0)
  let added = true
  while (usedHours < buffer && added) {
    added = false
    for (const key of activeKeys) {
      if (usedHours >= buffer) break
      const queue = queues.get(key)!
      const cursor = cursors.get(key) ?? 0
      if (cursor >= queue.length) continue
      const t = queue[cursor]
      const needed = t.studyHours + t.testHours
      if (usedHours + needed > buffer && weekTopics.length > 0) continue
      weekTopics.push(t)
      cursors.set(key, cursor + 1)
      usedHours += needed
      added = true
    }
  }

  return weekTopics
}

function groupBySubject(topics: PlannedTopicItem[], focus: PlanExamFocus): SubjectWeekPlan[] {
  const map = new Map<string, SubjectWeekPlan>()
  for (const t of topics) {
    const key = `${t.examType}-${t.subject}`
    const existing = map.get(key)
    if (existing) {
      existing.topics.push(t)
      existing.totalHours += t.studyHours + t.testHours
      existing.totalQuestions += t.questionTarget
    } else {
      map.set(key, {
        subject: t.subject,
        examType: t.examType,
        totalHours: t.studyHours + t.testHours,
        totalQuestions: t.questionTarget,
        topics: [t],
      })
    }
  }
  return Array.from(map.values()).sort(
    (a, b) =>
      getSubjectPlanWeight(b.examType, b.subject, focus) -
      getSubjectPlanWeight(a.examType, a.subject, focus),
  )
}

export function generateStudyPlan(
  settings: PlannerSettings,
  testResults: TestResult[],
): GeneratedPlan {
  const normalized = normalizePlannerSettings(settings)
  const start = parseLocalDate(normalized.startDate)
  const end = addDays(start, normalized.topicCompletionWeeks * 7)

  const weeks: WeeklyPlan[] = []
  let weekStart = start
  let weekNumber = 1

  while (weekStart < end) {
    const weekEnd = addDays(weekStart, 6)
    const weekDays = eachLocalDay(weekStart, weekEnd < end ? weekEnd : addDays(end, -1))
    const availableHours = weekDays.reduce((s, d) => s + getDayHours(d, normalized), 0)
    weeks.push({
      weekNumber,
      weekStart: format(weekStart, 'yyyy-MM-dd'),
      weekEnd: format(weekDays[weekDays.length - 1], 'yyyy-MM-dd'),
      totalHours: 0,
      totalQuestions: 0,
      availableHours: Math.round(availableHours * 10) / 10,
      subjects: [],
    })
    weekStart = addDays(weekStart, 7)
    weekNumber++
  }

  const topics = getRemainingTopics(testResults, normalized.includeCompletedTopics, normalized.examFocus)
  const queues = buildSubjectQueues(topics)
  const cursors = new Map<string, number>()

  for (const week of weeks) {
    const weekTopics = fillWeekByWeight(queues, cursors, week.availableHours, normalized.examFocus)

    week.subjects = groupBySubject(weekTopics, normalized.examFocus)
    week.totalHours = Math.round(weekTopics.reduce((s, t) => s + t.studyHours + t.testHours, 0) * 10) / 10
    week.totalQuestions = weekTopics.reduce((s, t) => s + t.questionTarget, 0)
  }

  const assignedWeeks = weeks.filter((w) => w.subjects.length > 0)

  return {
    createdAt: new Date().toISOString(),
    settings: normalized,
    totalWeeks: assignedWeeks.length,
    totalTopics: topics.length,
    totalHours: Math.round(assignedWeeks.reduce((s, w) => s + w.totalHours, 0) * 10) / 10,
    totalQuestions: assignedWeeks.reduce((s, w) => s + w.totalQuestions, 0),
    weeks: assignedWeeks,
  }
}

type WorkBlock = PlannedTopicItem & { type: 'konu' | 'test'; hours: number; questions: number }

/** Günlük görevleri dersler arası karma sırayla oluştur */
function buildInterleavedBlocks(week: WeeklyPlan): WorkBlock[] {
  const subjectBlocks: WorkBlock[][] = week.subjects.map((s) =>
    s.topics.flatMap((t) => [
      { ...t, type: 'konu' as const, hours: t.studyHours, questions: t.questionTarget },
      { ...t, type: 'test' as const, hours: t.testHours, questions: t.questionTarget },
    ]),
  )

  const result: WorkBlock[] = []
  let added = true
  while (added) {
    added = false
    for (const blocks of subjectBlocks) {
      if (blocks.length > 0) {
        result.push(blocks.shift()!)
        added = true
      }
    }
  }
  return result
}

export function weekPlanToDailyTasks(
  week: WeeklyPlan,
  settings: PlannerSettings,
): Omit<DailyTask, 'id' | 'completed'>[] {
  const tasks: Omit<DailyTask, 'id' | 'completed'>[] = []
  const weekStart = parseLocalDate(week.weekStart)
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const topicQueue = buildInterleavedBlocks(week)

  let topicIdx = 0
  const startHour = 9

  for (let dayIdx = 0; dayIdx < 7 && topicIdx < topicQueue.length; dayIdx++) {
    const day = weekDays[dayIdx]
    let remaining = getDayHours(day, settings)
    let hour = startHour
    let minute = 0

    while (remaining > 0.25 && topicIdx < topicQueue.length) {
      const item = topicQueue[topicIdx]
      const blockHours = Math.min(item.hours, remaining)
      if (blockHours < 0.25) {
        topicIdx++
        continue
      }

      const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
      const hoursLabel = blockHours >= 1 ? `${blockHours} sa` : `${Math.round(blockHours * 60)} dk`

      if (item.type === 'konu') {
        tasks.push({
          date: format(day, 'yyyy-MM-dd'),
          title: `${item.examType} ${item.subject} — ${item.topicName} (${hoursLabel} · ${item.questions} soru hedefi)`,
          type: 'konu',
          examType: item.examType,
          subject: item.subject,
          topicId: item.topicId,
          scheduledTime: timeStr,
        })
      } else {
        tasks.push({
          date: format(day, 'yyyy-MM-dd'),
          title: `${item.examType} ${item.subject} — ${item.topicName} Test (~${item.questions} soru · ${hoursLabel})`,
          type: 'test',
          examType: item.examType,
          subject: item.subject,
          topicId: item.topicId,
          scheduledTime: timeStr,
        })
      }

      const totalMinutes = hour * 60 + minute + Math.round(blockHours * 60)
      hour = Math.floor(totalMinutes / 60)
      minute = totalMinutes % 60
      remaining -= blockHours

      if (blockHours >= item.hours - 0.01) topicIdx++
    }
  }

  return tasks
}

export function applyWeekToProgram(
  week: WeeklyPlan,
  settings: PlannerSettings,
): DailyTask[] {
  return weekPlanToDailyTasks(week, settings).map((t) => ({
    ...t,
    id: generateId(),
    completed: false,
  }))
}

export function formatWeekLabel(weekStart: string): string {
  const start = parseLocalDate(weekStart)
  const end = addDays(start, 6)
  return `${format(start, 'd MMM', { locale: tr })} – ${format(end, 'd MMM yyyy', { locale: tr })}`
}

export { parseLocalDate }

export function getWeekDateRange(weekStart: string): string[] {
  const start = parseLocalDate(weekStart)
  return Array.from({ length: 7 }, (_, i) => format(addDays(start, i), 'yyyy-MM-dd'))
}

export const DEFAULT_PLANNER_SETTINGS: PlannerSettings = normalizePlannerSettings({
  topicCompletionWeeks: 24,
  weekdayHours: 8,
  weekendHours: 4,
  includeCompletedTopics: false,
  examFocus: 'TYT_AYT',
})

export function getWeakTopicsForPlan(
  testResults: TestResult[],
  examFocus: PlanExamFocus = 'TYT_AYT',
  limit = 8,
): PlannedTopicItem[] {
  return CURRICULUM.filter((t) => matchesExamFocus(t.examType, examFocus))
    .map((t) => {
      const est = getTopicEstimate(t, examFocus)
      return {
        topicId: t.id,
        examType: t.examType,
        subject: t.subject,
        topicName: t.name,
        studyHours: est.studyHours,
        questionTarget: est.questions,
        testHours: est.testHours,
        score: getTopicMasteryScore(t.id, testResults),
        weight: getSubjectPlanWeight(t.examType, t.subject, examFocus),
      }
    })
    .filter((t) => t.score < MASTERY_COMPLETE_THRESHOLD)
    .sort((a, b) => a.score - b.score || b.weight - a.weight)
    .slice(0, limit)
    .map(({ score: _score, weight: _weight, ...item }) => item)
}

export { MASTERY_COMPLETE_THRESHOLD, getWeightsForFocus, getSubjectQuestionCount, getSubjectSayCoefficient }

export function getSubjectSummaryText(plan: SubjectWeekPlan): string {
  const topicList = plan.topics
    .map((t) => `${t.topicName} (${t.studyHours + t.testHours} sa · ${t.questionTarget} soru)`)
    .join(', ')
  return `${plan.examType} ${plan.subject}: ${plan.totalHours} saat · ${plan.totalQuestions} soru — ${topicList}`
}
