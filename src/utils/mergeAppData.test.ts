import assert from 'node:assert/strict'
import { mergeAppData, emptyTouches, noteDataDiff } from './mergeAppData'
import { DEFAULT_APP_DATA } from './appData'
import type { AppData, MockExam } from '../types'

function dataWith(exams: MockExam[], extra: Partial<AppData> = {}): AppData {
  return {
    ...DEFAULT_APP_DATA,
    ...extra,
    mockExams: exams,
    testResults: extra.testResults ?? [],
    dailyTasks: extra.dailyTasks ?? [],
  }
}

const exam = (id: string, name: string, tytTotal: number): MockExam => ({
  id,
  date: '2026-09-23',
  name,
  type: 'TYT',
  tytTotal,
})

const server = dataWith([exam('a', 'Deneme A', 70), exam('b', 'Deneme B', 80)])
const staleTeacher = dataWith([exam('a', 'Deneme A', 10)])

const touches = emptyTouches()
touches.dailyTaskIds.add('task-1')

const merged = mergeAppData(server, staleTeacher, touches)
assert.deepEqual(
  merged.mockExams.map((item) => item.id),
  ['a', 'b'],
  'stale teacher save must keep the student deneme',
)
assert.equal(merged.mockExams[0]?.tytTotal, 70, 'untouched deneme keeps the server score')

const studentTouches = emptyTouches()
studentTouches.mockExamIds.add('c')
const studentLocal = dataWith([exam('a', 'Deneme A', 70), exam('b', 'Deneme B', 80), exam('c', 'Deneme C', 90)])
const withNew = mergeAppData(server, studentLocal, studentTouches)
assert.deepEqual(withNew.mockExams.map((item) => item.id), ['a', 'b', 'c'])
assert.equal(withNew.mockExams[2]?.tytTotal, 90)

const deleteTouches = emptyTouches()
deleteTouches.removedMockExamIds.add('a')
const deleted = mergeAppData(server, dataWith([exam('b', 'Deneme B', 80)]), deleteTouches)
assert.deepEqual(deleted.mockExams.map((item) => item.id), ['b'])

const prev = dataWith([exam('a', 'Deneme A', 70)])
const next = dataWith([exam('a', 'Deneme A', 70), exam('c', 'Deneme C', 90)])
const noted = emptyTouches()
assert.equal(noteDataDiff(prev, next, noted), true)
assert.equal(noted.mockExamIds.has('c'), true)
assert.equal(noted.mockExamIds.has('a'), false)

console.log('mergeAppData tests passed')
