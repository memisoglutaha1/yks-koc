export type ExamType = 'TYT' | 'AYT'

export type TaskType = 'konu' | 'test' | 'tekrar' | 'deneme' | 'mola'

export type MasteryLevel = 'baslanmadi' | 'gelisiyor' | 'hakim' | 'tekrar'

export interface Topic {
  id: string
  examType: ExamType
  subject: string
  name: string
  order: number
}

export interface TestTemplate {
  id: string
  topicId: string
  name: string
  questionCount: number
  durationMinutes: number
}

export interface TestResult {
  id: string
  topicId: string
  testName: string
  date: string
  questionCount: number
  correct: number
  wrong: number
  empty: number
  durationMinutes: number
  note?: string
}

export interface DailyTask {
  id: string
  date: string
  title: string
  type: TaskType
  examType?: ExamType
  subject?: string
  topicId?: string
  scheduledTime?: string
  completed: boolean
  completedAt?: string
}

export interface WeeklyTemplate {
  id: string
  name: string
  tasks: Omit<DailyTask, 'id' | 'date' | 'completed' | 'completedAt'>[]
}

export interface MockExam {
  id: string
  date: string
  name: string
  type: 'TYT' | 'AYT' | 'TYT_AYT'
  turkce?: number
  mat?: number
  /** @deprecated Eski kayıtlar — yeni girişlerde tytFizik/tytKimya/tytBiyoloji kullanılır */
  fen?: number
  tytFizik?: number
  tytKimya?: number
  tytBiyoloji?: number
  /** @deprecated Eski kayıtlar — yeni girişlerde tarih/cografya/felsefe/din kullanılır */
  sosyal?: number
  tarih?: number
  cografya?: number
  felsefe?: number
  din?: number
  tytTotal?: number
  aytMat?: number
  fizik?: number
  kimya?: number
  biyoloji?: number
  aytTotal?: number
  durationMinutes?: number
  note?: string
}

export interface AppSettings {
  studentName: string
  /** @deprecated targetRankTyt / targetRankAyt kullanın */
  targetRank: number
  targetRankTyt: number
  targetRankAyt: number
  /** @deprecated previousRankTyt / previousRankAyt kullanın */
  previousRank: number
  previousRankTyt: number
  previousRankAyt: number
  examYear: number
}

export type PlanExamFocus = 'TYT' | 'AYT' | 'TYT_AYT'

export interface PlannerSettings {
  startDate: string
  topicCompletionWeeks: number
  /** @deprecated topicCompletionWeeks kullanın */
  topicCompletionMonths?: number
  weekdayHours: number
  weekendHours: number
  includeCompletedTopics: boolean
  examFocus: PlanExamFocus
}

export interface PlannedTopicItem {
  topicId: string
  examType: ExamType
  subject: string
  topicName: string
  studyHours: number
  questionTarget: number
  testHours: number
}

export interface SubjectWeekPlan {
  subject: string
  examType: ExamType
  totalHours: number
  totalQuestions: number
  topics: PlannedTopicItem[]
}

export interface WeeklyPlan {
  weekNumber: number
  weekStart: string
  weekEnd: string
  totalHours: number
  totalQuestions: number
  availableHours: number
  subjects: SubjectWeekPlan[]
}

export interface GeneratedPlan {
  createdAt: string
  settings: PlannerSettings
  totalWeeks: number
  totalTopics: number
  totalHours: number
  totalQuestions: number
  weeks: WeeklyPlan[]
}

export interface AppData {
  settings: AppSettings
  testResults: TestResult[]
  dailyTasks: DailyTask[]
  mockExams: MockExam[]
  topicProgress: Record<string, { studied: boolean; studiedAt?: string }>
  plannerSettings?: PlannerSettings
  generatedPlan?: GeneratedPlan | null
}

export interface TopicMastery {
  topicId: string
  topic: Topic
  testCount: number
  totalQuestions: number
  totalCorrect: number
  /** Son 5 test veya genel — geriye dönük uyumluluk */
  percentage: number
  overallPercentage: number
  recentPercentage: number | null
  bestRecentPercentage: number | null
  recentTestCount: number
  level: MasteryLevel
  avgSecondsPerQuestion: number | null
}

export interface SubjectSummary {
  subject: string
  examType: ExamType
  topics: TopicMastery[]
  avgPercentage: number
}
