import { useCallback, useEffect, useRef, useState } from 'react'
import { addDays, format, startOfWeek, parseISO } from 'date-fns'
import type { AppData, DailyTask, MockExam, TestResult, PlannerSettings } from '../types'
import { getTemplateById } from '../data/weeklyTemplates'
import { generateStudyPlan, applyWeekToProgram, DEFAULT_PLANNER_SETTINGS, getWeekDateRange, normalizePlannerSettings } from '../utils/autoPlanner'
import { generateId, todayStr, RESET_DATA_PASSWORD } from '../utils/calculations'
import { DEFAULT_APP_DATA, DEFAULT_SETTINGS, normalizeAppData } from '../utils/appData'
import { fetchStudentAppData, persistStudentAppData } from '../utils/cloudApi'

export interface ApplyPlanWeekResult {
  count: number
  weekStart: string | null
  weekEnd: string | null
}

export interface GeneratePlanOptions {
  clearProgramTasks?: boolean
}

export function useAppStore(userId: string, studentDisplayName?: string) {
  const [data, setData] = useState<AppData>(DEFAULT_APP_DATA)
  const [loading, setLoading] = useState(true)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const skipNextSave = useRef(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    skipNextSave.current = true
    void fetchStudentAppData(userId, studentDisplayName).then((loaded) => {
      if (cancelled) return
      setData(loaded)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [userId, studentDisplayName])

  useEffect(() => {
    if (loading) return
    if (skipNextSave.current) {
      skipNextSave.current = false
      return
    }
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      void persistStudentAppData(userId, data)
    }, 400)
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [data, userId, loading])

  const updateSettings = useCallback((settings: Partial<AppData['settings']>) => {
    setData((prev) => ({
      ...prev,
      settings: normalizeAppData({ ...prev, settings: { ...prev.settings, ...settings } }).settings,
    }))
  }, [])

  const addTestResult = useCallback((result: Omit<TestResult, 'id'>) => {
    setData((prev) => ({
      ...prev,
      testResults: [...prev.testResults, { ...result, id: generateId() }],
    }))
  }, [])

  const deleteTestResult = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      testResults: prev.testResults.filter((r) => r.id !== id),
    }))
  }, [])

  const addDailyTask = useCallback((task: Omit<DailyTask, 'id' | 'completed'>) => {
    setData((prev) => ({
      ...prev,
      dailyTasks: [...prev.dailyTasks, { ...task, id: generateId(), completed: false }],
    }))
  }, [])

  const toggleTask = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      dailyTasks: prev.dailyTasks.map((t) =>
        t.id === id
          ? {
              ...t,
              completed: !t.completed,
              completedAt: !t.completed ? new Date().toISOString() : undefined,
            }
          : t,
      ),
    }))
  }, [])

  const deleteTask = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      dailyTasks: prev.dailyTasks.filter((t) => t.id !== id),
    }))
  }, [])

  const addMockExam = useCallback((exam: Omit<MockExam, 'id'>) => {
    setData((prev) => ({
      ...prev,
      mockExams: [...prev.mockExams, { ...exam, id: generateId() }],
    }))
  }, [])

  const deleteMockExam = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      mockExams: prev.mockExams.filter((e) => e.id !== id),
    }))
  }, [])

  const markTopicStudied = useCallback((topicId: string) => {
    setData((prev) => ({
      ...prev,
      topicProgress: {
        ...prev.topicProgress,
        [topicId]: { studied: true, studiedAt: new Date().toISOString() },
      },
    }))
  }, [])

  const getTasksForDate = useCallback(
    (date: string) =>
      data.dailyTasks.filter((t) => t.date === date).sort((a, b) => (a.scheduledTime ?? '').localeCompare(b.scheduledTime ?? '')),
    [data.dailyTasks],
  )

  const getTodayTasks = useCallback(() => getTasksForDate(todayStr()), [getTasksForDate])

  const applyWeeklyTemplate = useCallback((templateId: string, weekStartDate?: string) => {
    const template = getTemplateById(templateId)
    if (!template) return 0

    const baseDate = weekStartDate ?? format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
    const weekStart = parseISO(baseDate)

    const newTasks: DailyTask[] = template.tasks.map((t) => ({
      id: generateId(),
      date: format(addDays(weekStart, t.dayOfWeek), 'yyyy-MM-dd'),
      title: t.title,
      type: t.type,
      examType: t.examType,
      subject: t.subject,
      scheduledTime: t.scheduledTime,
      completed: false,
    }))

    setData((prev) => ({
      ...prev,
      dailyTasks: [...prev.dailyTasks, ...newTasks],
    }))

    return newTasks.length
  }, [])

  const exportData = useCallback(() => JSON.stringify(data, null, 2), [data])

  const importData = useCallback((json: string): boolean => {
    try {
      const parsed = JSON.parse(json) as AppData
      if (!parsed.settings) return false
      setData(normalizeAppData(parsed))
      return true
    } catch {
      return false
    }
  }, [])

  const resetAllData = useCallback((password: string): boolean => {
    if (password !== RESET_DATA_PASSWORD) return false
    setData((prev) => ({
      ...DEFAULT_APP_DATA,
      settings: { ...DEFAULT_SETTINGS, ...prev.settings },
    }))
    return true
  }, [])

  const generateAndSavePlan = useCallback((settings: PlannerSettings, options: GeneratePlanOptions = {}) => {
    const normalized = normalizePlannerSettings(settings)
    const clearProgram = options.clearProgramTasks === true
    setData((prev) => {
      const plan = generateStudyPlan(normalized, prev.testResults)
      let dailyTasks = prev.dailyTasks
      if (clearProgram) {
        dailyTasks = prev.dailyTasks.filter((t) => !(t.topicId && (t.type === 'konu' || t.type === 'test')))
      }
      return { ...prev, plannerSettings: normalized, generatedPlan: plan, dailyTasks }
    })
  }, [])

  const savePlannerSettings = useCallback((settings: PlannerSettings) => {
    setData((prev) => ({ ...prev, plannerSettings: normalizePlannerSettings(settings) }))
  }, [])

  const applyPlanWeek = useCallback((weekNumber: number): ApplyPlanWeekResult => {
    let result: ApplyPlanWeekResult = { count: 0, weekStart: null, weekEnd: null }

    setData((prev) => {
      const plan = prev.generatedPlan
      const plannerSettings = prev.plannerSettings ?? DEFAULT_PLANNER_SETTINGS
      if (!plan) return prev

      const week = plan.weeks.find((w) => w.weekNumber === weekNumber)
      if (!week) return prev

      const newTasks = applyWeekToProgram(week, plannerSettings)
      result = {
        count: newTasks.length,
        weekStart: week.weekStart,
        weekEnd: week.weekEnd,
      }

      if (newTasks.length === 0) return prev

      const weekDates = new Set(getWeekDateRange(week.weekStart))
      return {
        ...prev,
        dailyTasks: [...prev.dailyTasks.filter((t) => !weekDates.has(t.date)), ...newTasks],
      }
    })

    return result
  }, [])

  return {
    data,
    loading,
    updateSettings,
    addTestResult,
    deleteTestResult,
    addDailyTask,
    toggleTask,
    deleteTask,
    addMockExam,
    deleteMockExam,
    markTopicStudied,
    getTasksForDate,
    getTodayTasks,
    applyWeeklyTemplate,
    exportData,
    importData,
    resetAllData,
    savePlannerSettings,
    generateAndSavePlan,
    applyPlanWeek,
  }
}

export type AppStore = ReturnType<typeof useAppStore>
