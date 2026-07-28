import { eachDayOfInterval, format, parseISO, isValid } from 'date-fns'
import { tr } from 'date-fns/locale'
import type { AppData, ExamType, MasteryLevel, MockExam } from '../types'
import { getTopicById } from '../data/curriculum'
import { calcPercentage, getMasteryLevel, todayStr } from './calculations'

export interface TopicDayStat {
  topicId: string
  topicName: string
  subject: string
  examType: ExamType
  questions: number
  correct: number
  wrong: number
  empty: number
  studyMinutes: number
  testCount: number
  masteryPct: number
  level: MasteryLevel
}

export interface SubjectDayStat {
  subject: string
  examType: ExamType
  questions: number
  correct: number
  wrong: number
  studyMinutes: number
  testCount: number
  masteryPct: number
  topics: TopicDayStat[]
}

export interface DayReport {
  date: string
  studyMinutes: number
  questionCount: number
  correct: number
  wrong: number
  empty: number
  testCount: number
  tasksCompleted: number
  tasksTotal: number
  konuCompleted: number
  topicsStudied: { id: string; name: string; subject: string; examType: ExamType }[]
  subjects: SubjectDayStat[]
  mockExam: MockExam | null
  tests: { name: string; topicId: string; questions: number; correct: number; minutes: number }[]
}

export interface RangeReportSummary {
  startDate: string
  endDate: string
  days: DayReport[]
  totals: {
    studyMinutes: number
    questions: number
    correct: number
    wrong: number
    empty: number
    tests: number
    tasksCompleted: number
    tasksTotal: number
    konuCompleted: number
    topicsStudied: number
    activeDays: number
    avgQuestionsPerDay: number
    avgMinutesPerDay: number
  }
}

function buildSubjectStats(topicStats: TopicDayStat[]): SubjectDayStat[] {
  const map = new Map<string, SubjectDayStat>()

  for (const t of topicStats) {
    const key = `${t.examType}-${t.subject}`
    const existing = map.get(key)
    if (existing) {
      existing.questions += t.questions
      existing.correct += t.correct
      existing.wrong += t.wrong
      existing.studyMinutes += t.studyMinutes
      existing.testCount += t.testCount
      existing.topics.push(t)
    } else {
      map.set(key, {
        subject: t.subject,
        examType: t.examType,
        questions: t.questions,
        correct: t.correct,
        wrong: t.wrong,
        studyMinutes: t.studyMinutes,
        testCount: t.testCount,
        masteryPct: 0,
        topics: [t],
      })
    }
  }

  return Array.from(map.values()).map((s) => ({
    ...s,
    masteryPct: calcPercentage(s.correct, s.questions),
    topics: s.topics.sort((a, b) => b.questions - a.questions),
  }))
}

export function buildDayReport(date: string, data: AppData): DayReport {
  const dayTests = data.testResults.filter((r) => r.date === date)
  const dayTasks = data.dailyTasks.filter((t) => t.date === date)
  const mockExam = data.mockExams.find((e) => e.date === date) ?? null

  const topicMap = new Map<string, TopicDayStat>()

  for (const r of dayTests) {
    const topic = getTopicById(r.topicId)
    if (!topic) continue

    const existing = topicMap.get(r.topicId)
    if (existing) {
      existing.questions += r.questionCount
      existing.correct += r.correct
      existing.wrong += r.wrong
      existing.empty += r.empty
      existing.studyMinutes += r.durationMinutes
      existing.testCount += 1
      existing.masteryPct = calcPercentage(existing.correct, existing.questions)
      existing.level = getMasteryLevel(existing.masteryPct, existing.testCount)
    } else {
      const pct = calcPercentage(r.correct, r.questionCount)
      topicMap.set(r.topicId, {
        topicId: r.topicId,
        topicName: topic.name,
        subject: topic.subject,
        examType: topic.examType,
        questions: r.questionCount,
        correct: r.correct,
        wrong: r.wrong,
        empty: r.empty,
        studyMinutes: r.durationMinutes,
        testCount: 1,
        masteryPct: pct,
        level: getMasteryLevel(pct, 1),
      })
    }
  }

  const topicsStudied = Object.entries(data.topicProgress)
    .filter(([, p]) => p.studied && p.studiedAt?.startsWith(date))
    .map(([id]) => {
      const topic = getTopicById(id)!
      return { id, name: topic.name, subject: topic.subject, examType: topic.examType }
    })
    .filter((t) => t.name)

  const topicStats = Array.from(topicMap.values())
  const subjects = buildSubjectStats(topicStats)

  return {
    date,
    studyMinutes: Math.round(dayTests.reduce((s, r) => s + r.durationMinutes, 0)),
    questionCount: dayTests.reduce((s, r) => s + r.questionCount, 0),
    correct: dayTests.reduce((s, r) => s + r.correct, 0),
    wrong: dayTests.reduce((s, r) => s + r.wrong, 0),
    empty: dayTests.reduce((s, r) => s + r.empty, 0),
    testCount: dayTests.length,
    tasksCompleted: dayTasks.filter((t) => t.completed).length,
    tasksTotal: dayTasks.length,
    konuCompleted: dayTasks.filter((t) => t.completed && t.type === 'konu').length,
    topicsStudied,
    subjects,
    mockExam,
    tests: dayTests.map((r) => ({
      name: r.testName,
      topicId: r.topicId,
      questions: r.questionCount,
      correct: r.correct,
      minutes: r.durationMinutes,
    })),
  }
}

export function getDatesInRange(startDate: string, endDate: string): string[] {
  const start = parseISO(startDate)
  const end = parseISO(endDate)
  if (!isValid(start) || !isValid(end) || start > end) return []
  return eachDayOfInterval({ start, end }).map((d) => format(d, 'yyyy-MM-dd'))
}

export function buildRangeReport(startDate: string, endDate: string, data: AppData): RangeReportSummary {
  const dates = getDatesInRange(startDate, endDate)
  const days = dates.map((d) => buildDayReport(d, data))
  const activeDays = days.filter((d) => d.questionCount > 0 || d.tasksCompleted > 0 || d.topicsStudied.length > 0).length

  const studiedTopicIds = new Set<string>()
  for (const d of days) {
    for (const t of d.topicsStudied) studiedTopicIds.add(t.id)
  }

  const totals = days.reduce(
    (acc, d) => ({
      studyMinutes: acc.studyMinutes + d.studyMinutes,
      questions: acc.questions + d.questionCount,
      correct: acc.correct + d.correct,
      wrong: acc.wrong + d.wrong,
      empty: acc.empty + d.empty,
      tests: acc.tests + d.testCount,
      tasksCompleted: acc.tasksCompleted + d.tasksCompleted,
      tasksTotal: acc.tasksTotal + d.tasksTotal,
      konuCompleted: acc.konuCompleted + d.konuCompleted,
    }),
    { studyMinutes: 0, questions: 0, correct: 0, wrong: 0, empty: 0, tests: 0, tasksCompleted: 0, tasksTotal: 0, konuCompleted: 0 },
  )

  const dayCount = dates.length || 1

  return {
    startDate,
    endDate,
    days: days.reverse(),
    totals: {
      ...totals,
      topicsStudied: studiedTopicIds.size,
      activeDays,
      avgQuestionsPerDay: Math.round(totals.questions / dayCount),
      avgMinutesPerDay: Math.round(totals.studyMinutes / dayCount),
    },
  }
}

export function formatStudyMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} dk`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h} sa ${m} dk` : `${h} saat`
}

export function formatReportDate(date: string): string {
  return format(parseISO(date), 'd MMMM yyyy, EEEE', { locale: tr })
}

export function getWeekRange(reference = todayStr()): { start: string; end: string } {
  const d = parseISO(reference)
  const day = d.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  const monday = new Date(d)
  monday.setDate(d.getDate() + diffToMonday)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return { start: format(monday, 'yyyy-MM-dd'), end: format(sunday, 'yyyy-MM-dd') }
}

export function getMonthRange(reference = todayStr()): { start: string; end: string } {
  const d = parseISO(reference)
  const start = new Date(d.getFullYear(), d.getMonth(), 1)
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0)
  return { start: format(start, 'yyyy-MM-dd'), end: format(end, 'yyyy-MM-dd') }
}

export function addDaysToDate(dateStr: string, days: number): string {
  const d = parseISO(dateStr)
  d.setDate(d.getDate() + days)
  return format(d, 'yyyy-MM-dd')
}
