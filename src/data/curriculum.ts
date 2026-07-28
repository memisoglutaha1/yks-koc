import type { Topic, TestTemplate } from '../types'

export const SUBJECTS = {
  TYT: ['Türkçe', 'Matematik', 'Fizik', 'Kimya', 'Biyoloji', 'Tarih', 'Coğrafya', 'Felsefe', 'Din Kültürü'],
  AYT: ['Matematik', 'Fizik', 'Kimya', 'Biyoloji'],
} as const

const tytTopics: { subject: string; topics: string[] }[] = [
  {
    subject: 'Matematik',
    topics: [
      'Temel Kavramlar',
      'Sayılar',
      'Bölünebilme',
      'EBOB-EKOK',
      'Rasyonel Sayılar',
      'Basit Eşitsizlikler',
      'Mutlak Değer',
      'Üslü Sayılar',
      'Köklü Sayılar',
      'Çarpanlara Ayırma',
      'Oran-Orantı',
      'Denklem Çözme',
      'Problemler',
      'Kümeler',
      'Fonksiyonlar',
      'Polinomlar',
      '2. Dereceden Denklemler',
      'Permütasyon-Kombinasyon-Olasılık',
      'Veri-Yorum',
    ],
  },
  {
    subject: 'Fizik',
    topics: ['Fizik Bilimine Giriş', 'Madde ve Özellikleri', 'Hareket', 'Kuvvet', 'Enerji', 'Isı', 'Elektrostatik', 'Optik'],
  },
  {
    subject: 'Kimya',
    topics: ['Kimya Bilimi', 'Atom ve Periyodik Sistem', 'Kimyasal Türler', 'Maddenin Halleri', 'Karışımlar', 'Asit-Baz', 'Kimya ve Enerji'],
  },
  {
    subject: 'Biyoloji',
    topics: ['Canlıların Ortak Özellikleri', 'Hücre', 'Canlıların Sınıflandırılması', 'Kalıtım', 'Ekosistem'],
  },
  {
    subject: 'Türkçe',
    topics: ['Paragraf', 'Cümlede Anlam', 'Sözcükte Anlam', 'Yazım Kuralları', 'Noktalama', 'Ses Bilgisi', 'Sözel Mantık'],
  },
  {
    subject: 'Tarih',
    topics: ['Tarih Bilimine Giriş', 'İlk Türk Devletleri', 'Osmanlı Kuruluş', 'Osmanlı Yükselme', 'Osmanlı Gerileme', '20. Yüzyıl'],
  },
  {
    subject: 'Coğrafya',
    topics: ['Doğa ve İnsan', 'Harita Bilgisi', 'İklim', 'Yerşekilleri', 'Nüfus', 'Türkiye Coğrafyası'],
  },
  {
    subject: 'Felsefe',
    topics: ['Felsefeye Giriş', 'Bilgi Felsefesi', 'Varlık Felsefesi', 'Ahlak Felsefesi', 'Sanat Felsefesi'],
  },
  {
    subject: 'Din Kültürü',
    topics: ['İnanç', 'İbadet', 'Hz. Muhammed', 'Kur\'an', 'Ahlak'],
  },
]

const aytTopics: { subject: string; topics: string[] }[] = [
  {
    subject: 'Matematik',
    topics: [
      'Trigonometri',
      'Logaritma',
      'Diziler',
      'Limit',
      'Türev',
      'İntegral',
      'Analitik Geometri',
      'Karmaşık Sayılar',
      'Permütasyon-Kombinasyon-Olasılık',
    ],
  },
  {
    subject: 'Fizik',
    topics: ['Vektörler', 'Bağıl Hareket', 'Newton Yasaları', 'İş-Güç-Enerji', 'İtme-Momentum', 'Elektrik Alan', 'Manyetizma', 'Dalgalar', 'Modern Fizik'],
  },
  {
    subject: 'Kimya',
    topics: ['Modern Atom Teorisi', 'Gazlar', 'Sıvı Çözeltiler', 'Kimyasal Tepkimeler', 'Kimyasal Denge', 'Asit-Baz Dengesi', 'Elektrokimya', 'Organik Kimya'],
  },
  {
    subject: 'Biyoloji',
    topics: ['Sinir Sistemi', 'Endokrin Sistem', 'Duyu Organları', 'Destek-Hareket', 'Sindirim', 'Dolaşım', 'Solunum', 'Boşaltım', 'Üreme', 'Komünite-Ekoloji'],
  },
]

function buildTopics(
  examType: 'TYT' | 'AYT',
  data: { subject: string; topics: string[] }[],
): Topic[] {
  const topics: Topic[] = []
  let order = 0
  for (const { subject, topics: names } of data) {
    for (const name of names) {
      topics.push({
        id: `${examType}-${subject}-${name}`.replace(/\s+/g, '-').toLowerCase(),
        examType,
        subject,
        name,
        order: order++,
      })
    }
  }
  return topics
}

export const CURRICULUM: Topic[] = [
  ...buildTopics('TYT', tytTopics),
  ...buildTopics('AYT', aytTopics),
]

export function getTopicsByExam(examType: 'TYT' | 'AYT'): Topic[] {
  return CURRICULUM.filter((t) => t.examType === examType)
}

export function getTopicsBySubject(examType: 'TYT' | 'AYT', subject: string): Topic[] {
  return CURRICULUM.filter((t) => t.examType === examType && t.subject === subject)
}

export function getTopicById(id: string): Topic | undefined {
  return CURRICULUM.find((t) => t.id === id)
}

export function getDefaultTestsForTopic(topic: Topic): TestTemplate[] {
  return [1, 2, 3].map((n) => ({
    id: `${topic.id}-test-${n}`,
    topicId: topic.id,
    name: `${topic.name} - Test ${n}`,
    questionCount: topic.examType === 'TYT' ? 20 : 15,
    durationMinutes: topic.examType === 'TYT' ? 30 : 35,
  }))
}

export function getSubjects(examType: 'TYT' | 'AYT'): string[] {
  const subjects = new Set(getTopicsByExam(examType).map((t) => t.subject))
  return Array.from(subjects)
}
