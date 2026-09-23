import type { AppData, DailyTask, MockExam, TestResult } from '../types'

type WithId = { id?: string }

export interface SaveTouches {
  mockExamIds: Set<string>
  removedMockExamIds: Set<string>
  testResultIds: Set<string>
  removedTestResultIds: Set<string>
  dailyTaskIds: Set<string>
  removedDailyTaskIds: Set<string>
  topicIds: Set<string>
  removedTopicIds: Set<string>
  settings: boolean
  planner: boolean
  plan: boolean
}

export function emptyTouches(): SaveTouches {
  return {
    mockExamIds: new Set(),
    removedMockExamIds: new Set(),
    testResultIds: new Set(),
    removedTestResultIds: new Set(),
    dailyTaskIds: new Set(),
    removedDailyTaskIds: new Set(),
    topicIds: new Set(),
    removedTopicIds: new Set(),
    settings: false,
    planner: false,
    plan: false,
  }
}

export function cloneTouches(touches: SaveTouches): SaveTouches {
  return {
    mockExamIds: new Set(touches.mockExamIds),
    removedMockExamIds: new Set(touches.removedMockExamIds),
    testResultIds: new Set(touches.testResultIds),
    removedTestResultIds: new Set(touches.removedTestResultIds),
    dailyTaskIds: new Set(touches.dailyTaskIds),
    removedDailyTaskIds: new Set(touches.removedDailyTaskIds),
    topicIds: new Set(touches.topicIds),
    removedTopicIds: new Set(touches.removedTopicIds),
    settings: touches.settings,
    planner: touches.planner,
    plan: touches.plan,
  }
}

export function subtractTouches(current: SaveTouches, saved: SaveTouches): void {
  for (const id of saved.mockExamIds) current.mockExamIds.delete(id)
  for (const id of saved.removedMockExamIds) current.removedMockExamIds.delete(id)
  for (const id of saved.testResultIds) current.testResultIds.delete(id)
  for (const id of saved.removedTestResultIds) current.removedTestResultIds.delete(id)
  for (const id of saved.dailyTaskIds) current.dailyTaskIds.delete(id)
  for (const id of saved.removedDailyTaskIds) current.removedDailyTaskIds.delete(id)
  for (const id of saved.topicIds) current.topicIds.delete(id)
  for (const id of saved.removedTopicIds) current.removedTopicIds.delete(id)
  if (saved.settings) current.settings = false
  if (saved.planner) current.planner = false
  if (saved.plan) current.plan = false
}

export function touchesEmpty(touches: SaveTouches): boolean {
  return (
    touches.mockExamIds.size === 0 &&
    touches.removedMockExamIds.size === 0 &&
    touches.testResultIds.size === 0 &&
    touches.removedTestResultIds.size === 0 &&
    touches.dailyTaskIds.size === 0 &&
    touches.removedDailyTaskIds.size === 0 &&
    touches.topicIds.size === 0 &&
    touches.removedTopicIds.size === 0 &&
    !touches.settings &&
    !touches.planner &&
    !touches.plan
  )
}

function recordDiff<T extends WithId>(
  prevItems: T[],
  nextItems: T[],
  touched: Set<string>,
  removed: Set<string>,
): boolean {
  let changed = false
  const prevById = new Map<string, string>()
  const nextById = new Map<string, string>()

  prevItems.forEach((item, index) => {
    prevById.set(item.id || `legacy-prev-${index}`, JSON.stringify(item))
  })
  nextItems.forEach((item, index) => {
    nextById.set(item.id || `legacy-next-${index}`, JSON.stringify(item))
  })

  for (const [id, json] of nextById) {
    if (prevById.get(id) !== json) {
      touched.add(id)
      removed.delete(id)
      changed = true
    }
  }
  for (const id of prevById.keys()) {
    if (!nextById.has(id)) {
      removed.add(id)
      touched.delete(id)
      changed = true
    }
  }
  return changed
}

export function noteDataDiff(prev: AppData, next: AppData, touches: SaveTouches): boolean {
  let changed = false
  if (recordDiff(prev.mockExams, next.mockExams, touches.mockExamIds, touches.removedMockExamIds)) changed = true
  if (recordDiff(prev.testResults, next.testResults, touches.testResultIds, touches.removedTestResultIds)) changed = true
  if (recordDiff(prev.dailyTasks, next.dailyTasks, touches.dailyTaskIds, touches.removedDailyTaskIds)) changed = true

  const prevTopics = prev.topicProgress ?? {}
  const nextTopics = next.topicProgress ?? {}
  const topicIds = new Set([...Object.keys(prevTopics), ...Object.keys(nextTopics)])
  for (const id of topicIds) {
    const before = JSON.stringify(prevTopics[id] ?? null)
    const after = JSON.stringify(nextTopics[id] ?? null)
    if (before === after) continue
    changed = true
    if (nextTopics[id] == null) {
      touches.removedTopicIds.add(id)
      touches.topicIds.delete(id)
    } else {
      touches.topicIds.add(id)
      touches.removedTopicIds.delete(id)
    }
  }

  if (JSON.stringify(prev.settings) !== JSON.stringify(next.settings)) {
    touches.settings = true
    changed = true
  }
  if (JSON.stringify(prev.plannerSettings ?? null) !== JSON.stringify(next.plannerSettings ?? null)) {
    touches.planner = true
    changed = true
  }
  if (JSON.stringify(prev.generatedPlan ?? null) !== JSON.stringify(next.generatedPlan ?? null)) {
    touches.plan = true
    changed = true
  }
  return changed
}

function mergeRecords<T extends WithId>(
  serverItems: T[] | undefined,
  localItems: T[] | undefined,
  touched: Set<string>,
  removed: Set<string>,
): T[] {
  const server = Array.isArray(serverItems) ? serverItems : []
  const local = Array.isArray(localItems) ? localItems : []
  const serverById = new Map<string, T>()
  const localById = new Map<string, T>()
  const order: string[] = []
  const seen = new Set<string>()

  const push = (item: T, index: number, side: 'server' | 'local') => {
    const id = item?.id || `legacy-${side}-${index}`
    if (removed.has(id) || seen.has(id)) return
    seen.add(id)
    order.push(id)
    if (side === 'server') serverById.set(id, item)
    else localById.set(id, item)
  }

  server.forEach((item, index) => push(item, index, 'server'))
  local.forEach((item, index) => {
    if (item?.id && serverById.has(item.id)) {
      localById.set(item.id, item)
      return
    }
    if (item?.id && !touched.has(item.id)) return
    if (!item?.id) {
      const json = JSON.stringify(item)
      const already = server.some((entry) => JSON.stringify(entry) === json)
      if (already) return
    }
    push(item, index, 'local')
  })

  return order.map((id) => {
    const localItem = localById.get(id)
    const serverItem = serverById.get(id)
    if (touched.has(id) && localItem) return localItem
    return serverItem ?? localItem!
  })
}

export function mergeAppData(server: AppData, local: AppData, touches: SaveTouches): AppData {
  const topicProgress: AppData['topicProgress'] = { ...(server.topicProgress ?? {}) }
  for (const id of touches.removedTopicIds) delete topicProgress[id]
  for (const [id, value] of Object.entries(local.topicProgress ?? {})) {
    if (touches.removedTopicIds.has(id)) continue
    if (touches.topicIds.has(id)) topicProgress[id] = value
  }

  return {
    ...server,
    ...local,
    settings: touches.settings ? local.settings : server.settings,
    plannerSettings: touches.planner ? local.plannerSettings : (server.plannerSettings ?? local.plannerSettings),
    generatedPlan: touches.plan ? local.generatedPlan : (server.generatedPlan ?? local.generatedPlan),
    mockExams: mergeRecords<MockExam>(server.mockExams, local.mockExams, touches.mockExamIds, touches.removedMockExamIds),
    testResults: mergeRecords<TestResult>(server.testResults, local.testResults, touches.testResultIds, touches.removedTestResultIds),
    dailyTasks: mergeRecords<DailyTask>(server.dailyTasks, local.dailyTasks, touches.dailyTaskIds, touches.removedDailyTaskIds),
    topicProgress,
  }
}
