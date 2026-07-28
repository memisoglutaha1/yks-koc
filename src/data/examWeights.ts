import type { ExamType, PlanExamFocus } from '../types'

/** YKS sınavındaki ders bazlı soru sayısı ve SAY puan katsayısı */
export interface ExamSubjectWeight {
  examType: ExamType
  subject: string
  /** Sınavda çıkan soru sayısı */
  questionCount: number
  /**
   * SAY (sayısal) yerleştirme puanındaki AYT ders katsayı yüzdesi.
   * TYT derslerinde 0 — TYT ağırlığı ayrı hesaplanır.
   */
  sayCoefficientPct: number
}

/**
 * Resmi YKS dağılımı (sayısal odaklı):
 * TYT: 40 Türkçe + 40 Mat + 20 Fen + 20 Sosyal = 120
 * AYT SAY: Mat 40 (%30) + Fizik 14 (%10) + Kimya 13 (%10) + Biyoloji 13 (%10)
 * Yerleştirme: TYT %40 + AYT %60
 */
export const EXAM_SUBJECT_WEIGHTS: ExamSubjectWeight[] = [
  // TYT — soru sayısına göre (TYT içinde eşit puan katkısı varsayımı)
  { examType: 'TYT', subject: 'Türkçe', questionCount: 40, sayCoefficientPct: 0 },
  { examType: 'TYT', subject: 'Matematik', questionCount: 40, sayCoefficientPct: 0 },
  { examType: 'TYT', subject: 'Fizik', questionCount: 7, sayCoefficientPct: 0 },
  { examType: 'TYT', subject: 'Kimya', questionCount: 7, sayCoefficientPct: 0 },
  { examType: 'TYT', subject: 'Biyoloji', questionCount: 6, sayCoefficientPct: 0 },
  { examType: 'TYT', subject: 'Tarih', questionCount: 5, sayCoefficientPct: 0 },
  { examType: 'TYT', subject: 'Coğrafya', questionCount: 5, sayCoefficientPct: 0 },
  { examType: 'TYT', subject: 'Felsefe', questionCount: 5, sayCoefficientPct: 0 },
  { examType: 'TYT', subject: 'Din Kültürü', questionCount: 5, sayCoefficientPct: 0 },

  // AYT sayısal — soru sayısı + SAY katsayısı
  { examType: 'AYT', subject: 'Matematik', questionCount: 40, sayCoefficientPct: 30 },
  { examType: 'AYT', subject: 'Fizik', questionCount: 14, sayCoefficientPct: 10 },
  { examType: 'AYT', subject: 'Kimya', questionCount: 13, sayCoefficientPct: 10 },
  { examType: 'AYT', subject: 'Biyoloji', questionCount: 13, sayCoefficientPct: 10 },
]

export const TYT_TOTAL_QUESTIONS = 120
export const AYT_SAY_TOTAL_QUESTIONS = 80
/** Yerleştirme puanında TYT / AYT payı */
export const PLACEMENT_TYT_PCT = 40
export const PLACEMENT_AYT_PCT = 60

export function getExamWeight(examType: ExamType, subject: string): ExamSubjectWeight | undefined {
  return EXAM_SUBJECT_WEIGHTS.find((w) => w.examType === examType && w.subject === subject)
}

/**
 * Plan odağına göre dersin çalışma ağırlığı (göreli skor).
 * TYT: yalnızca soru sayısı
 * AYT: soru sayısı × SAY katsayısı
 * TYT+AYT: yerleştirme payı (TYT%40 / AYT%60) × ilgili skor
 */
export function getSubjectPlanWeight(examType: ExamType, subject: string, focus: PlanExamFocus): number {
  const w = getExamWeight(examType, subject)
  if (!w) return 1

  if (focus === 'TYT') {
    if (examType !== 'TYT') return 0
    return w.questionCount
  }

  if (focus === 'AYT') {
    if (examType !== 'AYT') return 0
    // Katsayı + soru sayısı birlikte: Mat (40×30) > Fen (13-14×10)
    return w.questionCount * Math.max(w.sayCoefficientPct, 1)
  }

  // TYT + AYT (SAY yerleştirme)
  if (examType === 'TYT') {
    // TYT'nin %40'ı, dersin TYT içindeki soru payı ile
    return PLACEMENT_TYT_PCT * (w.questionCount / TYT_TOTAL_QUESTIONS)
  }
  // AYT dersinin %60 içindeki katsayı payı
  return PLACEMENT_AYT_PCT * (w.sayCoefficientPct / PLACEMENT_AYT_PCT)
}

/** Ders için sınav soru sayısı (gösterim / hedef soru ölçeği) */
export function getSubjectQuestionCount(examType: ExamType, subject: string): number {
  return getExamWeight(examType, subject)?.questionCount ?? 20
}

/** AYT SAY katsayısı yüzdesi (yoksa 0) */
export function getSubjectSayCoefficient(examType: ExamType, subject: string): number {
  return getExamWeight(examType, subject)?.sayCoefficientPct ?? 0
}

export function getWeightsForFocus(focus: PlanExamFocus): Array<ExamSubjectWeight & { planWeight: number }> {
  return EXAM_SUBJECT_WEIGHTS
    .map((w) => ({
      ...w,
      planWeight: getSubjectPlanWeight(w.examType, w.subject, focus),
    }))
    .filter((w) => w.planWeight > 0)
    .sort((a, b) => b.planWeight - a.planWeight)
}
