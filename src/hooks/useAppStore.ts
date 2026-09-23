import { useCallback, useEffect, useRef, useState } from 'react'
import { addDays, format, startOfWeek, parseISO } from 'date-fns'
import type { AppData, DailyTask, MockExam, TestResult, PlannerSettings } from '../types'
import { getTemplateById } from '../data/weeklyTemplates'
import { generateStudyPlan, applyWeekToProgram, DEFAULT_PLANNER_SETTINGS, getWeekDateRange, normalizePlannerSettings } from '../utils/autoPlanner'
import { generateId, todayStr, RESET_DATA_PASSWORD } from '../utils/calculations'
import { DEFAULT_APP_DATA, DEFAULT_SETTINGS, normalizeAppData } from '../utils/appData'
import { loadStudentAppData, persistStudentAppData } from '../utils/cloudApi'
import { cloneTouches, emptyTouches, noteDataDiff, subtractTouches, touchesEmpty, type SaveTouches } from '../utils/mergeAppData'

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
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const dataRef = useRef(data)
  const userIdRef = useRef(userId)
  const hydratedRef = useRef(false)
  const dirtyRef = useRef(false)
  const replaceRef = useRef(false)
  const saveLock = useRef(false)
  const refreshGen = useRef(0)
  const touchesRef = useRef<SaveTouches>(emptyTouches())
  const epochRef = useRef(0)
  dataRef.current = data

  const applyRemote = useCallback((next: AppData) => {
    setData(next)
  }, [])

  const saveNow = useCallback(async () => {
    if (!hydratedRef.current || !dirtyRef.current || saveLock.current) return
    saveLock.current = true
    refreshGen.current += 1
    const studentId = userIdRef.current
    const epoch = epochRef.current
    try {
      do {
        const snapshot = dataRef.current
        const touchSnap = cloneTouches(touchesRef.current)
        const replace = replaceRef.current
        const saved = await persistStudentAppData(studentId, snapshot, touchSnap, replace)
        if (epoch !== epochRef.current) return
        if (!saved.ok) {
          setSaveError(saved.error)
          return
        }
        subtractTouches(touchesRef.current, touchSnap)
        if (replace) replaceRef.current = false
        if (touchesEmpty(touchesRef.current) && !replaceRef.current) {
          dirtyRef.current = false
          setSaveError(null)
        }
      } while (dirtyRef.current)
    } finally {
      saveLock.current = false
      refreshGen.current += 1
    }
  }, [])

  const refreshFromServer = useCallback(async () => {
    if (!hydratedRef.current || dirtyRef.current || saveLock.current) return
    const gen = ++refreshGen.current
    const studentId = userIdRef.current
    const loaded = await loadStudentAppData(studentId, studentDisplayName)
    if (gen !== refreshGen.current || dirtyRef.current || saveLock.current) return
    if (!loaded.ok) return
    applyRemote(loaded.data)
  }, [applyRemote, studentDisplayName])

  useEffect(() => {
    const flush = () => {
      if (hydratedRef.current && dirtyRef.current) void saveNow()
    }
    window.addEventListener('pagehide', flush)
    return () => {
      window.removeEventListener('pagehide', flush)
      flush()
    }
  }, [saveNow, userId])

  useEffect(() => {
    userIdRef.current = userId
  }, [userId])

  useEffect(() => {
    let cancelled = false
    epochRef.current += 1
    hydratedRef.current = false
    dirtyRef.current = false
    replaceRef.current = false
    touchesRef.current = emptyTouches()
    setLoading(true)
    setLoadError(null)
    void loadStudentAppData(userId, studentDisplayName).then((loaded) => {
      if (cancelled) return
      if (!loaded.ok) {
        setLoadError(loaded.error)
        setLoading(false)
        return
      }
      setData(loaded.data)
      hydratedRef.current = true
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [userId, studentDisplayName, reloadKey])

  useEffect(() => {
    if (loading || loadError) return
    if (!dirtyRef.current) return
    const timer = setTimeout(() => {
      void saveNow()
    }, 400)
    return () => clearTimeout(timer)
  }, [data, loading, loadError, saveNow])

  useEffect(() => {
    if (loading || loadError) return
    const timer = setInterval(() => {
      if (dirtyRef.current) void saveNow()
      else void refreshFromServer()
    }, 8000)
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      if (dirtyRef.current) void saveNow()
      else void refreshFromServer()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [loading, loadError, refreshFromServer, saveNow])

  const commit = useCallback((recipe: (prev: AppData) => AppData) => {
    setData((prev) => {
      const next = recipe(prev)
      if (noteDataDiff(prev, next, touchesRef.current)) dirtyRef.current = true
      return next
    })
  }, [])

  const retryLoad = useCallback(() => {
    setReloadKey((key) => key + 1)
  }, [])

  const updateSettings = useCallback((settings: Partial<AppData['settings']>) => {
    commit((prev) => ({
      ...prev,
      settings: normalizeAppData({ ...prev, settings: { ...prev.settings, ...settings } }).settings,
    }))
  }, [commit])

  const addTestResult = useCallback((result: Omit<TestResult, 'id'>) => {
    commit((prev) => ({
      ...prev,
      testResults: [...prev.testResults, { ...result, id: generateId() }],
    }))
  }, [commit])

  const deleteTestResult = useCallback((id: string) => {
    commit((prev) => ({
      ...prev,
      testResults: prev.testResults.filter((r) => r.id !== id),
    }))
  }, [commit])

  const addDailyTask = useCallback((task: Omit<DailyTask, 'id' | 'completed'>) => {
    commit((prev) => ({
      ...prev,
      dailyTasks: [...prev.dailyTasks, { ...task, id: generateId(), completed: false }],
    }))
  }, [commit])

  const toggleTask = useCallback((id: string) => {
    commit((prev) => ({
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
  }, [commit])

  const deleteTask = useCallback((id: string) => {
    commit((prev) => ({
      ...prev,
      dailyTasks: prev.dailyTasks.filter((t) => t.id !== id),
    }))
  }, [commit])

  const addMockExam = useCallback((exam: Omit<MockExam, 'id'>) => {
    commit((prev) => ({
      ...prev,
      mockExams: [...prev.mockExams, { ...exam, id: generateId() }],
    }))
  }, [commit])

  const deleteMockExam = useCallback((id: string) => {
    commit((prev) => ({
      ...prev,
      mockExams: prev.mockExams.filter((e) => e.id !== id),
    }))
  }, [commit])

  const markTopicStudied = useCallback((topicId: string) => {
    commit((prev) => ({
      ...prev,
      topicProgress: {
        ...prev.topicProgress,
        [topicId]: { studied: true, studiedAt: new Date().toISOString() },
      },
    }))
  }, [commit])

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

    commit((prev) => ({
      ...prev,
      dailyTasks: [...prev.dailyTasks, ...newTasks],
    }))

    return newTasks.length
  }, [commit])

  const exportData = useCallback(() => JSON.stringify(data, null, 2), [data])

  const importData = useCallback((json: string): boolean => {
    try {
      const parsed = JSON.parse(json) as AppData
      if (!parsed.settings) return false
      replaceRef.current = true
      dirtyRef.current = true
      setData(normalizeAppData(parsed))
      return true
    } catch {
      return false
    }
  }, [])

  const resetAllData = useCallback((password: string): boolean => {
    if (password !== RESET_DATA_PASSWORD) return false
    replaceRef.current = true
    dirtyRef.current = true
    setData((prev) => ({
      ...DEFAULT_APP_DATA,
      settings: { ...DEFAULT_SETTINGS, ...prev.settings },
    }))
    return true
  }, [])

  const generateAndSavePlan = useCallback((settings: PlannerSettings, options: GeneratePlanOptions = {}) => {
    const normalized = normalizePlannerSettings(settings)
    const clearProgram = options.clearProgramTasks === true
    commit((prev) => {
      const plan = generateStudyPlan(normalized, prev.testResults)
      let dailyTasks = prev.dailyTasks
      if (clearProgram) {
        dailyTasks = prev.dailyTasks.filter((t) => !(t.topicId && (t.type === 'konu' || t.type === 'test')))
      }
      return { ...prev, plannerSettings: normalized, generatedPlan: plan, dailyTasks }
    })
  }, [commit])

  const savePlannerSettings = useCallback((settings: PlannerSettings) => {
    commit((prev) => ({ ...prev, plannerSettings: normalizePlannerSettings(settings) }))
  }, [commit])

  const applyPlanWeek = useCallback((weekNumber: number): ApplyPlanWeekResult => {
    let result: ApplyPlanWeekResult = { count: 0, weekStart: null, weekEnd: null }

    commit((prev) => {
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
  }, [commit])

  return {
    data,
    loading,
    loadError,
    saveError,
    retryLoad,
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
