import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { Link } from 'react-router-dom'
import { Layout, Card, Badge, ProgressBar, StatBox, EmptyState } from '../components/Layout'
import { useApp } from '../context/AppContext'
import { CURRICULUM } from '../data/curriculum'
import { computeSubjectSummaries, getRankProgress } from '../utils/calculations'

export function DashboardPage() {
  const { data, getTodayTasks, toggleTask } = useApp()
  const { settings, testResults, mockExams } = data
  const todayTasks = getTodayTasks()
  const completed = todayTasks.filter((t) => t.completed).length
  const total = todayTasks.length
  const completionPct = total > 0 ? Math.round((completed / total) * 100) : 0

  const tytSummaries = computeSubjectSummaries('TYT', CURRICULUM, testResults)
  const aytSummaries = computeSubjectSummaries('AYT', CURRICULUM, testResults)
  const weakSubjects = [...tytSummaries, ...aytSummaries]
    .filter((s) => s.avgPercentage > 0 && s.avgPercentage < 60)
    .slice(0, 3)

  const lastMock = mockExams.length > 0 ? mockExams[mockExams.length - 1] : null
  const latestRank = lastMock
    ? lastMock.tytTotal && lastMock.aytTotal
      ? Math.round((lastMock.tytTotal * 0.4 + lastMock.aytTotal * 0.6) * 1000)
      : settings.previousRank
    : settings.previousRank

  const rankProgress = getRankProgress(latestRank, settings.targetRankAyt, settings.previousRankAyt)
  const today = format(new Date(), 'd MMMM yyyy, EEEE', { locale: tr })

  return (
    <Layout title="YKS Koçu" subtitle={`Merhaba ${settings.studentName} · ${today}`}>
      <div className="space-y-4">
        <Card>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-medium text-slate-500">TYT Hedef</p>
              <p className="text-xl font-bold text-blue-800">İlk {settings.targetRankTyt.toLocaleString('tr-TR')}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">AYT Hedef</p>
              <p className="text-xl font-bold text-purple-800">İlk {settings.targetRankAyt.toLocaleString('tr-TR')}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-slate-500">Tahmini sıralama</span>
            <span className="font-bold text-slate-800">~{latestRank.toLocaleString('tr-TR')}</span>
          </div>
          <div className="mt-3">
            <div className="mb-1 flex justify-between text-xs text-slate-500">
              <span>AYT hedefe ilerleme</span>
              <span>%{rankProgress}</span>
            </div>
            <ProgressBar value={rankProgress} color="bg-green-500" />
          </div>
        </Card>

        <div className="grid grid-cols-3 gap-2">
          <StatBox label="Bugün" value={`${completed}/${total}`} sub="görev" />
          <StatBox label="Test" value={testResults.length} sub="çözüldü" />
          <StatBox label="Deneme" value={mockExams.length} sub="girildi" />
        </div>

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold text-slate-800">Bugünkü Görevler</h2>
            <Link to="/program" className="text-sm font-medium text-primary-700">
              Program →
            </Link>
          </div>
          {todayTasks.length === 0 ? (
            <EmptyState icon="📅" title="Bugün görev yok" description="Program sayfasından görev ekleyin" />
          ) : (
            <ul className="space-y-2">
              {todayTasks.map((task) => (
                <li
                  key={task.id}
                  className={`flex items-center gap-3 rounded-lg border border-slate-100 border-l-4 bg-slate-50 p-3 ${
                    task.type === 'konu'
                      ? 'border-l-blue-500'
                      : task.type === 'test'
                        ? 'border-l-green-500'
                        : task.type === 'deneme'
                          ? 'border-l-purple-500'
                          : 'border-l-slate-400'
                  }`}
                >
                  <button
                    onClick={() => toggleTask(task.id)}
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs ${
                      task.completed ? 'border-green-500 bg-green-500 text-white' : 'border-slate-300 bg-white'
                    }`}
                  >
                    {task.completed ? '✓' : ''}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-sm font-medium ${task.completed ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                      {task.scheduledTime && <span className="mr-2 text-primary-600">{task.scheduledTime}</span>}
                      {task.title}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {total > 0 && (
            <div className="mt-3">
              <ProgressBar value={completionPct} />
              <p className="mt-1 text-center text-xs text-slate-500">%{completionPct} tamamlandı</p>
            </div>
          )}
        </Card>

        {weakSubjects.length > 0 && (
          <Card>
            <h2 className="mb-3 font-bold text-slate-800">⚠️ Zayıf Dersler</h2>
            <ul className="space-y-2">
              {weakSubjects.map((s) => (
                <li key={`${s.examType}-${s.subject}`} className="flex items-center justify-between text-sm">
                  <span>
                    <Badge color="bg-blue-100 text-blue-800">{s.examType}</Badge>{' '}
                    <span className="font-medium">{s.subject}</span>
                  </span>
                  <span className="font-bold text-red-600">%{s.avgPercentage}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Link
            to="/test"
            className="flex items-center justify-center rounded-xl bg-primary-700 py-4 text-sm font-bold text-white shadow-md active:bg-primary-800"
          >
            ✏️ Test Gir
          </Link>
          <Link
            to="/denemeler"
            className="flex items-center justify-center rounded-xl border-2 border-primary-700 py-4 text-sm font-bold text-primary-700 active:bg-primary-50"
          >
            📝 Deneme Gir
          </Link>
          <Link
            to="/program"
            className="flex items-center justify-center rounded-xl border border-slate-300 py-3 text-sm font-semibold text-slate-700 active:bg-slate-50"
          >
            📅 Program
          </Link>
          <Link
            to="/profil"
            className="flex items-center justify-center rounded-xl border border-slate-300 py-3 text-sm font-semibold text-slate-700 active:bg-slate-50"
          >
            👤 Profil
          </Link>
        </div>
      </div>
    </Layout>
  )
}
