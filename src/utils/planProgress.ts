import { addWeeks, differenceInCalendarDays, format } from 'date-fns'
import { tr } from 'date-fns/locale'
import type { AppData, GeneratedPlan, WeeklyPlan } from '../types'
import { weekPlanToDailyTasks, formatWeekLabel, parseLocalDate } from './autoPlanner'
import { todayStr, isTopicMastered } from './calculations'

export interface PlanProgressReport {
  hasPlan: boolean
  completedTopics: number
  expectedTopics: number
  totalTopics: number
  topicProgressPct: number
  expectedProgressPct: number
  weeksAheadBehind: number
  status: 'onde' | 'geride' | 'tam-zamaninda'
  statusLabel: string
  originalEndDate: string
  projectedEndDate: string
  daysDifference: number
  daysDifferenceLabel: string
  currentWeekNumber: number
  effectiveWeekNumber: number
  taskAdherencePct: number
  tasksCompletedThisWeek: number
  tasksTotalThisWeek: number
  remainingTopics: number
}

function getCompletedTopicIds(data: AppData): Set<string> {
  const ids = new Set<string>()
  const topicIds = new Set([
    ...Object.keys(data.topicProgress),
    ...data.testResults.map((r) => r.topicId),
  ])
  for (const id of topicIds) {
    if (isTopicMastered(id, data.testResults)) ids.add(id)
  }
  return ids
}

export function getWeekForDate(plan: GeneratedPlan, date: string): WeeklyPlan | undefined {
  return plan.weeks.find((w) => w.weekStart <= date && w.weekEnd >= date)
}

export function getCurrentWeek(plan: GeneratedPlan, reference = todayStr()): WeeklyPlan | undefined {
  return getWeekForDate(plan, reference)
}

export interface DailyPlanItem {
  date: string
  scheduledTime?: string
  title: string
  type: string
  examType?: string
  subject?: string
  topicId?: string
  completed: boolean
}

export function getDailyPlanItems(
  plan: GeneratedPlan,
  data: AppData,
  date: string,
): DailyPlanItem[] {
  const week = getWeekForDate(plan, date)
  if (!week) return []

  const settings = plan.settings
  const plannedTasks = weekPlanToDailyTasks(week, settings).filter((t) => t.date === date)
  const actualTasks = data.dailyTasks.filter((t) => t.date === date)

  return plannedTasks.map((pt) => {
    const match = actualTasks.find(
      (at) =>
        at.topicId === pt.topicId &&
        at.type === pt.type &&
        (at.scheduledTime === pt.scheduledTime || at.title.includes(pt.title.slice(0, 20))),
    )
    const completedByTopic =
      pt.topicId &&
      (data.topicProgress[pt.topicId]?.studied ||
        data.testResults.some((r) => r.topicId === pt.topicId && r.date <= date))

    return {
      date: pt.date,
      scheduledTime: pt.scheduledTime,
      title: pt.title,
      type: pt.type,
      examType: pt.examType,
      subject: pt.subject,
      topicId: pt.topicId,
      completed:
        match?.completed ??
        (pt.type === 'konu'
          ? !!completedByTopic
          : pt.topicId
            ? data.testResults.some((r) => r.topicId === pt.topicId && r.date === date)
            : false),
    }
  })
}

function getExpectedTopicIdsByDate(
  plan: GeneratedPlan,
  date: string,
): Set<string> {
  const ids = new Set<string>()
  for (const week of plan.weeks) {
    if (week.weekStart > date) break
    const tasks = weekPlanToDailyTasks(week, plan.settings)
    for (const t of tasks) {
      if (t.date <= date && t.topicId) ids.add(t.topicId)
    }
  }
  return ids
}

function countTopicsInWeek(week: WeeklyPlan): number {
  const ids = new Set<string>()
  for (const s of week.subjects) {
    for (const t of s.topics) ids.add(t.topicId)
  }
  return ids.size
}

export function computePlanProgress(data: AppData, reference = todayStr()): PlanProgressReport {
  const plan = data.generatedPlan
  if (!plan) {
    return {
      hasPlan: false,
      completedTopics: 0,
      expectedTopics: 0,
      totalTopics: 0,
      topicProgressPct: 0,
      expectedProgressPct: 0,
      weeksAheadBehind: 0,
      status: 'tam-zamaninda',
      statusLabel: 'Plan oluşturulmadı',
      originalEndDate: '',
      projectedEndDate: '',
      daysDifference: 0,
      daysDifferenceLabel: '',
      currentWeekNumber: 0,
      effectiveWeekNumber: 0,
      taskAdherencePct: 0,
      tasksCompletedThisWeek: 0,
      tasksTotalThisWeek: 0,
      remainingTopics: 0,
    }
  }

  const completedIds = getCompletedTopicIds(data)

  const allPlanTopicIds = new Set<string>()
  for (const w of plan.weeks) {
    for (const s of w.subjects) {
      for (const t of s.topics) allPlanTopicIds.add(t.topicId)
    }
  }

  const completedInPlan = [...completedIds].filter((id) => allPlanTopicIds.has(id)).length
  const expectedIds = getExpectedTopicIdsByDate(plan, reference)
  const expectedTopics = expectedIds.size
  const totalTopics = plan.totalTopics

  const currentWeek = getCurrentWeek(plan, reference)
  const currentWeekNumber = currentWeek?.weekNumber ?? plan.weeks.length

  let effectiveWeekNumber = 1
  let cumulative = 0
  for (const week of plan.weeks) {
    cumulative += countTopicsInWeek(week)
    effectiveWeekNumber = week.weekNumber
    if (completedInPlan <= cumulative) break
  }
  if (completedInPlan > cumulative) effectiveWeekNumber = plan.weeks.length

  const weeksAheadBehind = effectiveWeekNumber - currentWeekNumber

  let status: PlanProgressReport['status'] = 'tam-zamaninda'
  let statusLabel = 'Plana uygun gidiyorsun'
  if (weeksAheadBehind >= 2) {
    status = 'onde'
    statusLabel = `${weeksAheadBehind} hafta öndesin`
  } else if (weeksAheadBehind === 1) {
    status = 'onde'
    statusLabel = '1 hafta öndesin'
  } else if (weeksAheadBehind <= -2) {
    status = 'geride'
    statusLabel = `${Math.abs(weeksAheadBehind)} hafta geridesin`
  } else if (weeksAheadBehind === -1) {
    status = 'geride'
    statusLabel = '1 hafta geridesin'
  }

  const originalEndDate = plan.weeks[plan.weeks.length - 1]?.weekEnd ?? plan.settings.startDate

  const start = parseLocalDate(plan.settings.startDate)
  const ref = parseLocalDate(reference)
  const daysElapsed = Math.max(1, differenceInCalendarDays(ref, start))
  const weeksElapsed = Math.max(1, daysElapsed / 7)
  const pace = completedInPlan / weeksElapsed
  const remaining = totalTopics - completedInPlan
  const weeksRemaining = pace > 0 ? remaining / pace : plan.totalWeeks
  const projectedEnd = addWeeks(ref, Math.ceil(weeksRemaining))
  const projectedEndDate = format(projectedEnd, 'yyyy-MM-dd')
  const daysDifference = differenceInCalendarDays(projectedEnd, parseLocalDate(originalEndDate))

  let daysDifferenceLabel = 'Planlanan bitiş tarihindesin'
  if (daysDifference > 7) {
    daysDifferenceLabel = `Konular ${daysDifference} gün geç bitecek`
  } else if (daysDifference > 0) {
    daysDifferenceLabel = `Konular ${daysDifference} gün geç bitecek`
  } else if (daysDifference < -7) {
    daysDifferenceLabel = `Konular ${Math.abs(daysDifference)} gün erken bitecek`
  } else if (daysDifference < 0) {
    daysDifferenceLabel = `Konular ${Math.abs(daysDifference)} gün erken bitecek`
  }

  const weekTasks = data.dailyTasks.filter(
    (t) => currentWeek && t.date >= currentWeek.weekStart && t.date <= currentWeek.weekEnd,
  )
  const tasksTotalThisWeek = weekTasks.length
  const tasksCompletedThisWeek = weekTasks.filter((t) => t.completed).length
  const taskAdherencePct =
    tasksTotalThisWeek > 0 ? Math.round((tasksCompletedThisWeek / tasksTotalThisWeek) * 100) : 0

  return {
    hasPlan: true,
    completedTopics: completedInPlan,
    expectedTopics,
    totalTopics,
    topicProgressPct: totalTopics > 0 ? Math.round((completedInPlan / totalTopics) * 100) : 0,
    expectedProgressPct: totalTopics > 0 ? Math.round((expectedTopics / totalTopics) * 100) : 0,
    weeksAheadBehind,
    status,
    statusLabel,
    originalEndDate,
    projectedEndDate,
    daysDifference,
    daysDifferenceLabel,
    currentWeekNumber,
    effectiveWeekNumber,
    taskAdherencePct,
    tasksCompletedThisWeek,
    tasksTotalThisWeek,
    remainingTopics: remaining,
  }
}

export function formatPlanDate(date: string): string {
  return format(parseLocalDate(date), 'd MMMM yyyy', { locale: tr })
}

export { formatWeekLabel }
