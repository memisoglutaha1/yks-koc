import { Card, Badge, ProgressBar } from '../components/Layout'
import type { PlanProgressReport } from '../utils/planProgress'
import { formatPlanDate } from '../utils/planProgress'

export function PlanProgressCard({ progress }: { progress: PlanProgressReport }) {
  if (!progress.hasPlan) {
    return (
      <Card>
        <h2 className="mb-2 font-bold text-slate-800">📋 Konu Bitirme Planı</h2>
        <p className="text-sm text-slate-500">Plan sekmesinden otomatik plan oluşturun — ilerleme burada görünür.</p>
      </Card>
    )
  }

  const statusColor =
    progress.status === 'onde'
      ? 'bg-green-100 text-green-800'
      : progress.status === 'geride'
        ? 'bg-red-100 text-red-800'
        : 'bg-blue-100 text-blue-800'

  const barColor =
    progress.completedTopics >= progress.expectedTopics ? 'bg-green-500' : 'bg-orange-500'

  return (
    <Card>
      <div className="mb-3 flex items-start justify-between gap-2">
        <h2 className="font-bold text-slate-800">📋 Konu Bitirme Planı</h2>
        <Badge color={statusColor}>{progress.statusLabel}</Badge>
      </div>

      <div className="mb-2 flex justify-between text-sm">
        <span className="text-slate-600">
          {progress.completedTopics}/{progress.totalTopics} konu tamamlandı
        </span>
        <span className="font-bold">%{progress.topicProgressPct}</span>
      </div>
      <ProgressBar value={progress.topicProgressPct} color={barColor} />

      <div className="mt-2 flex justify-between text-xs text-slate-500">
        <span>Beklenen: {progress.expectedTopics} konu (%{progress.expectedProgressPct})</span>
        <span>Kalan: {progress.remainingTopics} konu</span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-lg bg-slate-50 p-2">
          <p className="text-[10px] text-slate-500">Planlanan bitiş</p>
          <p className="font-semibold text-slate-800">{formatPlanDate(progress.originalEndDate)}</p>
        </div>
        <div
          className={`rounded-lg p-2 ${
            progress.daysDifference > 0 ? 'bg-red-50' : progress.daysDifference < 0 ? 'bg-green-50' : 'bg-slate-50'
          }`}
        >
          <p className="text-[10px] text-slate-500">Tahmini bitiş</p>
          <p
            className={`font-semibold ${
              progress.daysDifference > 0 ? 'text-red-700' : progress.daysDifference < 0 ? 'text-green-700' : 'text-slate-800'
            }`}
          >
            {formatPlanDate(progress.projectedEndDate)}
          </p>
        </div>
      </div>

      <p
        className={`mt-2 text-center text-xs font-medium ${
          progress.daysDifference > 0 ? 'text-red-600' : progress.daysDifference < 0 ? 'text-green-600' : 'text-slate-500'
        }`}
      >
        {progress.daysDifferenceLabel}
      </p>

      <div className="mt-3 border-t border-slate-100 pt-3">
        <div className="flex justify-between text-sm">
          <span className="text-slate-600">Bu hafta görev uyumu</span>
          <span className="font-bold">%{progress.taskAdherencePct}</span>
        </div>
        <p className="mt-0.5 text-xs text-slate-500">
          {progress.tasksCompletedThisWeek}/{progress.tasksTotalThisWeek} görev · Hafta {progress.currentWeekNumber} (etkin: {progress.effectiveWeekNumber})
        </p>
        <ProgressBar value={progress.taskAdherencePct} color="bg-purple-500" />
      </div>
    </Card>
  )
}
