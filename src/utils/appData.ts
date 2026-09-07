import type { AppData, AppSettings } from '../types'
import { DEFAULT_PLANNER_SETTINGS, normalizePlannerSettings } from './autoPlanner'

function normalizeSettings(settings: Partial<AppSettings> = {}): AppSettings {
  const targetRankTyt = settings.targetRankTyt ?? settings.targetRank ?? 20000
  const targetRankAyt = settings.targetRankAyt ?? settings.targetRank ?? 20000
  const previousRank = settings.previousRank ?? 363000
  return {
    studentName: settings.studentName ?? 'Öğrenci',
    targetRank: Math.min(targetRankTyt, targetRankAyt),
    targetRankTyt,
    targetRankAyt,
    previousRank,
    previousRankTyt: settings.previousRankTyt ?? previousRank,
    previousRankAyt: settings.previousRankAyt ?? previousRank,
    examYear: settings.examYear ?? 2027,
  }
}

export const DEFAULT_SETTINGS: AppSettings = normalizeSettings({
  studentName: 'Öğrenci',
  targetRank: 20000,
  targetRankTyt: 50000,
  targetRankAyt: 20000,
  previousRank: 363000,
  previousRankTyt: 363000,
  previousRankAyt: 363000,
  examYear: 2027,
})

export const DEFAULT_APP_DATA: AppData = {
  settings: DEFAULT_SETTINGS,
  testResults: [],
  dailyTasks: [],
  mockExams: [],
  topicProgress: {},
  plannerSettings: DEFAULT_PLANNER_SETTINGS,
  generatedPlan: null,
}

export function normalizeAppData(parsed: Partial<AppData> | null | undefined, studentName?: string): AppData {
  const base = parsed ?? {}
  return {
    ...DEFAULT_APP_DATA,
    ...base,
    settings: normalizeSettings({
      ...DEFAULT_SETTINGS,
      ...base.settings,
      ...(studentName ? { studentName } : {}),
    }),
    plannerSettings: normalizePlannerSettings({
      ...DEFAULT_PLANNER_SETTINGS,
      ...base.plannerSettings,
    }),
    generatedPlan: base.generatedPlan ?? null,
    testResults: base.testResults ?? [],
    dailyTasks: base.dailyTasks ?? [],
    mockExams: base.mockExams ?? [],
    topicProgress: base.topicProgress ?? {},
  }
}
