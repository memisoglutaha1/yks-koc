import type { TestResult, Topic, MasteryLevel, TopicMastery, SubjectSummary, MockExam } from '../types'
import { getTopicById } from '../data/curriculum'

export function calcNet(correct: number, wrong: number): number {
  return Math.max(0, correct - wrong / 4)
}

export function calcPercentage(correct: number, total: number): number {
  if (total === 0) return 0
  return Math.round((correct / total) * 100)
}

export function calcSecondsPerQuestion(durationMinutes: number, questionCount: number): number {
  if (questionCount === 0) return 0
  return Math.round((durationMinutes * 60) / questionCount)
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} sn`
  const min = Math.floor(seconds / 60)
  const sec = seconds % 60
  return sec > 0 ? `${min} dk ${sec} sn` : `${min} dk`
}

export const MASTERY_COMPLETE_THRESHOLD = 85
export const RECENT_TEST_WINDOW = 5
export const RESET_DATA_PASSWORD = '12344321'

function percentageFromResults(results: TestResult[]): number {
  const totalQuestions = results.reduce((s, r) => s + r.questionCount, 0)
  const totalCorrect = results.reduce((s, r) => s + r.correct, 0)
  return calcPercentage(totalCorrect, totalQuestions)
}

function bestTestPercentage(results: TestResult[]): number | null {
  if (results.length === 0) return null
  return Math.max(...results.map((r) => calcPercentage(r.correct, r.questionCount)))
}

export function getMasteryLevel(percentage: number, testCount: number): MasteryLevel {
  if (testCount === 0) return 'baslanmadi'
  if (percentage >= MASTERY_COMPLETE_THRESHOLD) return 'hakim'
  if (percentage >= 70) return 'gelisiyor'
  return 'tekrar'
}

export function isTopicMastered(topicId: string, results: TestResult[]): boolean {
  const mastery = computeTopicMastery(topicId, results)
  if (!mastery || mastery.testCount === 0) return false
  const score = mastery.recentPercentage ?? mastery.overallPercentage
  return score >= MASTERY_COMPLETE_THRESHOLD
}

export const MASTERY_LABELS: Record<MasteryLevel, string> = {
  baslanmadi: 'Başlanmadı',
  gelisiyor: 'Gelişiyor',
  hakim: 'Hakim',
  tekrar: 'Tekrar Gerekli',
}

export const MASTERY_COLORS: Record<MasteryLevel, string> = {
  baslanmadi: 'bg-slate-200 text-slate-600',
  gelisiyor: 'bg-yellow-100 text-yellow-800',
  hakim: 'bg-green-100 text-green-800',
  tekrar: 'bg-red-100 text-red-800',
}

export function computeTopicMastery(topicId: string, results: TestResult[]): TopicMastery | null {
  const topic = getTopicById(topicId)
  if (!topic) return null

  const topicResults = results.filter((r) => r.topicId === topicId)
  if (topicResults.length === 0) {
    return {
      topicId,
      topic,
      testCount: 0,
      totalQuestions: 0,
      totalCorrect: 0,
      percentage: 0,
      overallPercentage: 0,
      recentPercentage: null,
      bestRecentPercentage: null,
      recentTestCount: 0,
      level: 'baslanmadi',
      avgSecondsPerQuestion: null,
    }
  }

  const recentResults = topicResults.slice(-RECENT_TEST_WINDOW)
  const overallPercentage = percentageFromResults(topicResults)
  const recentPercentage = percentageFromResults(recentResults)
  const bestRecentPercentage = bestTestPercentage(recentResults)
  const percentage = recentPercentage

  const totalQuestions = topicResults.reduce((s, r) => s + r.questionCount, 0)
  const totalCorrect = topicResults.reduce((s, r) => s + r.correct, 0)
  const totalDuration = topicResults.reduce((s, r) => s + r.durationMinutes, 0)
  const avgSeconds = calcSecondsPerQuestion(totalDuration, totalQuestions)

  return {
    topicId,
    topic,
    testCount: topicResults.length,
    totalQuestions,
    totalCorrect,
    percentage,
    overallPercentage,
    recentPercentage,
    bestRecentPercentage,
    recentTestCount: recentResults.length,
    level: getMasteryLevel(percentage, topicResults.length),
    avgSecondsPerQuestion: avgSeconds,
  }
}

export function computeSubjectSummaries(
  examType: 'TYT' | 'AYT',
  topics: Topic[],
  results: TestResult[],
): SubjectSummary[] {
  const subjects = [...new Set(topics.filter((t) => t.examType === examType).map((t) => t.subject))]

  return subjects.map((subject) => {
    const subjectTopics = topics.filter((t) => t.examType === examType && t.subject === subject)
    const masteries = subjectTopics
      .map((t) => computeTopicMastery(t.id, results))
      .filter((m): m is TopicMastery => m !== null)

    const withTests = masteries.filter((m) => m.testCount > 0)
    const avgPercentage =
      withTests.length > 0
        ? Math.round(withTests.reduce((s, m) => s + m.percentage, 0) / withTests.length)
        : 0

    return { subject, examType, topics: masteries, avgPercentage }
  })
}

export function estimateRankFromNets(tytNet: number, aytNet: number): number {
  const combined = tytNet * 0.4 + aytNet * 0.6
  if (combined >= 110) return 5000
  if (combined >= 100) return 15000
  if (combined >= 90) return 25000
  if (combined >= 80) return 50000
  if (combined >= 70) return 100000
  if (combined >= 60) return 200000
  return 350000
}

export function getRankProgress(currentRank: number, targetRank: number, startRank = 363000): number {
  if (currentRank <= targetRank) return 100
  if (startRank <= targetRank) return 0
  const progress = ((startRank - currentRank) / (startRank - targetRank)) * 100
  return Math.min(100, Math.max(0, Math.round(progress)))
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

export const DAY_NAMES = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi']

export const TASK_TYPE_LABELS: Record<string, string> = {
  konu: 'Konu',
  test: 'Test',
  tekrar: 'Tekrar',
  deneme: 'Deneme',
  mola: 'Mola',
}

export const TASK_TYPE_COLORS: Record<string, string> = {
  konu: 'border-l-blue-500',
  test: 'border-l-green-500',
  tekrar: 'border-l-orange-500',
  deneme: 'border-l-purple-500',
  mola: 'border-l-slate-400',
}

export function getMockExamSosyalTotal(exam: Pick<MockExam, 'tarih' | 'cografya' | 'felsefe' | 'din' | 'sosyal'>): number {
  const splitTotal = (exam.tarih ?? 0) + (exam.cografya ?? 0) + (exam.felsefe ?? 0) + (exam.din ?? 0)
  if (splitTotal > 0) return splitTotal
  return exam.sosyal ?? 0
}

export function hasSplitSosyalScores(exam: Pick<MockExam, 'tarih' | 'cografya' | 'felsefe' | 'din'>): boolean {
  return [exam.tarih, exam.cografya, exam.felsefe, exam.din].some((value) => value !== undefined)
}

export function getMockExamFenTotal(exam: Pick<MockExam, 'tytFizik' | 'tytKimya' | 'tytBiyoloji' | 'fen'>): number {
  const splitTotal = (exam.tytFizik ?? 0) + (exam.tytKimya ?? 0) + (exam.tytBiyoloji ?? 0)
  if (splitTotal > 0) return splitTotal
  return exam.fen ?? 0
}

export function hasSplitFenScores(exam: Pick<MockExam, 'tytFizik' | 'tytKimya' | 'tytBiyoloji'>): boolean {
  return [exam.tytFizik, exam.tytKimya, exam.tytBiyoloji].some((value) => value !== undefined)
}
