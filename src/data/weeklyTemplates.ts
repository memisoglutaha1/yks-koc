import type { ExamType, TaskType } from '../types'

export interface WeeklyTemplateTask {
  dayOfWeek: number // 0=Pazartesi ... 6=Pazar
  title: string
  type: TaskType
  examType?: ExamType
  subject?: string
  scheduledTime?: string
}

export interface WeeklyTemplate {
  id: string
  name: string
  description: string
  tasks: WeeklyTemplateTask[]
}

/** Sayısal MF — standart evde hazırlık haftası (hedef: ilk 20K) */
export const WEEKLY_TEMPLATES: WeeklyTemplate[] = [
  {
    id: 'sayisal-standart',
    name: 'Sayısal Standart Hafta',
    description: 'TYT ağırlıklı, AYT destekli günlük 6-7 saat program',
    tasks: [
      // Pazartesi
      { dayOfWeek: 0, scheduledTime: '09:00', type: 'konu', examType: 'TYT', subject: 'Matematik', title: 'TYT Matematik — Problemler konu çalışması' },
      { dayOfWeek: 0, scheduledTime: '10:30', type: 'test', examType: 'TYT', subject: 'Matematik', title: 'TYT Matematik — Problemler Test 1' },
      { dayOfWeek: 0, scheduledTime: '14:00', type: 'konu', examType: 'TYT', subject: 'Fizik', title: 'TYT Fizik — Hareket konu çalışması' },
      { dayOfWeek: 0, scheduledTime: '15:30', type: 'test', examType: 'TYT', subject: 'Fizik', title: 'TYT Fizik — Hareket Test 1' },
      { dayOfWeek: 0, scheduledTime: '17:00', type: 'konu', examType: 'TYT', subject: 'Türkçe', title: 'TYT Türkçe — Paragraf (30 soru)' },
      { dayOfWeek: 0, scheduledTime: '19:00', type: 'tekrar', title: 'Günün yanlışlarını tekrar et' },

      // Salı
      { dayOfWeek: 1, scheduledTime: '09:00', type: 'konu', examType: 'TYT', subject: 'Matematik', title: 'TYT Matematik — Fonksiyonlar konu çalışması' },
      { dayOfWeek: 1, scheduledTime: '10:30', type: 'test', examType: 'TYT', subject: 'Matematik', title: 'TYT Matematik — Fonksiyonlar Test 1' },
      { dayOfWeek: 1, scheduledTime: '14:00', type: 'konu', examType: 'TYT', subject: 'Kimya', title: 'TYT Kimya — Atom ve Periyodik Sistem' },
      { dayOfWeek: 1, scheduledTime: '15:30', type: 'test', examType: 'TYT', subject: 'Kimya', title: 'TYT Kimya — Atom Test 1' },
      { dayOfWeek: 1, scheduledTime: '17:00', type: 'konu', examType: 'AYT', subject: 'Matematik', title: 'AYT Matematik — Trigonometri konu' },
      { dayOfWeek: 1, scheduledTime: '19:00', type: 'tekrar', title: 'Günün yanlışlarını tekrar et' },

      // Çarşamba
      { dayOfWeek: 2, scheduledTime: '09:00', type: 'konu', examType: 'TYT', subject: 'Matematik', title: 'TYT Matematik — Permütasyon-Kombinasyon-Olasılık' },
      { dayOfWeek: 2, scheduledTime: '10:30', type: 'test', examType: 'TYT', subject: 'Matematik', title: 'TYT Mat — PKO Test 1' },
      { dayOfWeek: 2, scheduledTime: '14:00', type: 'konu', examType: 'TYT', subject: 'Biyoloji', title: 'TYT Biyoloji — Hücre' },
      { dayOfWeek: 2, scheduledTime: '15:30', type: 'test', examType: 'TYT', subject: 'Biyoloji', title: 'TYT Biyoloji — Hücre Test 1' },
      { dayOfWeek: 2, scheduledTime: '17:00', type: 'konu', examType: 'TYT', subject: 'Tarih', title: 'TYT Tarih — Osmanlı Dönemi' },
      { dayOfWeek: 2, scheduledTime: '19:00', type: 'tekrar', title: 'Günün yanlışlarını tekrar et' },

      // Perşembe
      { dayOfWeek: 3, scheduledTime: '09:00', type: 'konu', examType: 'AYT', subject: 'Matematik', title: 'AYT Matematik — Limit konu çalışması' },
      { dayOfWeek: 3, scheduledTime: '10:30', type: 'test', examType: 'AYT', subject: 'Matematik', title: 'AYT Mat — Limit Test 1' },
      { dayOfWeek: 3, scheduledTime: '14:00', type: 'konu', examType: 'AYT', subject: 'Fizik', title: 'AYT Fizik — Newton Yasaları' },
      { dayOfWeek: 3, scheduledTime: '15:30', type: 'test', examType: 'AYT', subject: 'Fizik', title: 'AYT Fizik — Newton Test 1' },
      { dayOfWeek: 3, scheduledTime: '17:00', type: 'konu', examType: 'TYT', subject: 'Coğrafya', title: 'TYT Coğrafya — İklim' },
      { dayOfWeek: 3, scheduledTime: '19:00', type: 'tekrar', title: 'Günün yanlışlarını tekrar et' },

      // Cuma
      { dayOfWeek: 4, scheduledTime: '09:00', type: 'konu', examType: 'AYT', subject: 'Kimya', title: 'AYT Kimya — Kimyasal Denge' },
      { dayOfWeek: 4, scheduledTime: '10:30', type: 'test', examType: 'AYT', subject: 'Kimya', title: 'AYT Kimya — Denge Test 1' },
      { dayOfWeek: 4, scheduledTime: '14:00', type: 'konu', examType: 'AYT', subject: 'Biyoloji', title: 'AYT Biyoloji — Sinir Sistemi' },
      { dayOfWeek: 4, scheduledTime: '15:30', type: 'test', examType: 'AYT', subject: 'Biyoloji', title: 'AYT Biyoloji — Sinir Test 1' },
      { dayOfWeek: 4, scheduledTime: '17:00', type: 'konu', examType: 'TYT', subject: 'Türkçe', title: 'TYT Türkçe — Dil bilgisi + 20 paragraf' },
      { dayOfWeek: 4, scheduledTime: '19:00', type: 'tekrar', title: 'Haftalık tekrar — zayıf konular' },

      // Cumartesi — Deneme günü
      { dayOfWeek: 5, scheduledTime: '09:00', type: 'deneme', title: 'TYT Denemesi (tam süre)' },
      { dayOfWeek: 5, scheduledTime: '14:00', type: 'tekrar', title: 'Deneme analizi — yanlış/boş konuları listele' },
      { dayOfWeek: 5, scheduledTime: '16:00', type: 'konu', title: 'Denemeden çıkan eksik konuları çalış' },

      // Pazar — hafif gün
      { dayOfWeek: 6, scheduledTime: '10:00', type: 'tekrar', title: 'Haftalık genel tekrar (2 saat)' },
      { dayOfWeek: 6, scheduledTime: '14:00', type: 'test', examType: 'TYT', subject: 'Matematik', title: 'TYT Mat — karma test (zayıf konulardan)' },
      { dayOfWeek: 6, scheduledTime: '16:00', type: 'mola', title: 'Dinlenme — haftaya hazırlık' },
    ],
  },
  {
    id: 'deneme-haftasi',
    name: 'Deneme Haftası',
    description: '2 deneme + analiz odaklı yoğun hafta',
    tasks: [
      { dayOfWeek: 0, scheduledTime: '09:00', type: 'tekrar', title: 'Geçen hafta deneme analizi' },
      { dayOfWeek: 0, scheduledTime: '14:00', type: 'konu', examType: 'TYT', subject: 'Matematik', title: 'Eksik TYT Mat konuları' },
      { dayOfWeek: 1, scheduledTime: '09:00', type: 'deneme', title: 'TYT Denemesi' },
      { dayOfWeek: 1, scheduledTime: '14:00', type: 'tekrar', title: 'TYT deneme analizi' },
      { dayOfWeek: 2, scheduledTime: '09:00', type: 'konu', examType: 'AYT', subject: 'Matematik', title: 'Eksik AYT Mat konuları' },
      { dayOfWeek: 3, scheduledTime: '09:00', type: 'deneme', title: 'AYT Denemesi (Sayısal)' },
      { dayOfWeek: 3, scheduledTime: '14:00', type: 'tekrar', title: 'AYT deneme analizi' },
      { dayOfWeek: 4, scheduledTime: '09:00', type: 'test', title: 'Zayıf konulardan testler' },
      { dayOfWeek: 5, scheduledTime: '09:00', type: 'deneme', title: 'TYT+AYT Full Deneme' },
      { dayOfWeek: 5, scheduledTime: '15:00', type: 'tekrar', title: 'Full deneme analizi' },
      { dayOfWeek: 6, scheduledTime: '10:00', type: 'mola', title: 'Dinlenme günü' },
    ],
  },
]

export function getTemplateById(id: string): WeeklyTemplate | undefined {
  return WEEKLY_TEMPLATES.find((t) => t.id === id)
}
