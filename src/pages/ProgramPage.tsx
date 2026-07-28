import { useState } from 'react'
import { format, addDays, startOfWeek, parseISO } from 'date-fns'
import { tr } from 'date-fns/locale'
import { useSearchParams } from 'react-router-dom'
import { Layout, Card, Button, Input, Select, Badge, EmptyState } from '../components/Layout'
import { useApp } from '../context/AppContext'
import { CURRICULUM, getSubjects } from '../data/curriculum'
import { WEEKLY_TEMPLATES } from '../data/weeklyTemplates'
import { TASK_TYPE_LABELS, todayStr } from '../utils/calculations'
import type { ExamType, TaskType } from '../types'

export function ProgramPage() {
  const [searchParams] = useSearchParams()
  const initialDate = searchParams.get('date') ?? todayStr()
  const { addDailyTask, toggleTask, deleteTask, getTasksForDate, applyWeeklyTemplate } = useApp()
  const [selectedDate, setSelectedDate] = useState(initialDate)
  const [showForm, setShowForm] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [title, setTitle] = useState('')
  const [type, setType] = useState<TaskType>('konu')
  const [scheduledTime, setScheduledTime] = useState('09:00')
  const [examType, setExamType] = useState<ExamType>('TYT')
  const [subject, setSubject] = useState('')

  const weekStart = startOfWeek(parseISO(selectedDate), { weekStartsOn: 1 })
  const weekStartStr = format(weekStart, 'yyyy-MM-dd')
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const dayTasks = getTasksForDate(selectedDate)
  const completed = dayTasks.filter((t) => t.completed).length

  const handleAdd = (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!title.trim()) return
    addDailyTask({
      date: selectedDate,
      title: title.trim(),
      type,
      scheduledTime,
      examType: examType || undefined,
      subject: subject || undefined,
    })
    setTitle('')
    setShowForm(false)
  }

  const quickAddTopic = (topicName: string, subj: string, exType: ExamType) => {
    addDailyTask({
      date: selectedDate,
      title: `${exType} ${subj} — ${topicName}`,
      type: 'konu',
      scheduledTime: '09:00',
      examType: exType,
      subject: subj,
    })
  }

  const applyTemplate = (templateId: string) => {
    const count = applyWeeklyTemplate(templateId, weekStartStr)
    setShowTemplates(false)
    alert(`${count} görev bu haftaya eklendi!`)
  }

  return (
    <Layout
      title="Program"
      subtitle="Günlük ve haftalık görev planı"
      action={
        <div className="flex gap-1">
          <button
            onClick={() => { setShowTemplates(!showTemplates); setShowForm(false) }}
            className="rounded-lg bg-white/20 px-2 py-1.5 text-xs font-semibold"
          >
            Şablon
          </button>
          <button
            onClick={() => { setShowForm(!showForm); setShowTemplates(false) }}
            className="rounded-lg bg-white/20 px-2 py-1.5 text-xs font-semibold"
          >
            {showForm ? 'İptal' : '+ Görev'}
          </button>
        </div>
      }
    >
      <div className="mb-4 flex gap-1 overflow-x-auto pb-1">
        {weekDays.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd')
          const isSelected = dateStr === selectedDate
          const isToday = dateStr === todayStr()
          const taskCount = getTasksForDate(dateStr).length
          const doneCount = getTasksForDate(dateStr).filter((t) => t.completed).length
          return (
            <button
              key={dateStr}
              onClick={() => setSelectedDate(dateStr)}
              className={`flex min-w-[52px] flex-col items-center rounded-xl px-2 py-2 text-center transition-colors ${
                isSelected ? 'bg-primary-700 text-white' : 'bg-white text-slate-700 border border-slate-200'
              }`}
            >
              <span className="text-[10px] font-medium uppercase">
                {format(day, 'EEE', { locale: tr })}
              </span>
              <span className="text-lg font-bold">{format(day, 'd')}</span>
              {taskCount > 0 && (
                <span className={`text-[10px] ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                  {doneCount}/{taskCount}
                </span>
              )}
              {isToday && !isSelected && <span className="mt-0.5 h-1 w-1 rounded-full bg-primary-600" />}
            </button>
          )
        })}
      </div>

      <p className="mb-3 text-sm font-medium text-slate-600">
        {format(parseISO(selectedDate), 'd MMMM yyyy, EEEE', { locale: tr })}
        {dayTasks.length > 0 && ` · ${completed}/${dayTasks.length} tamamlandı`}
      </p>

      {showTemplates && (
        <Card className="mb-4">
          <h2 className="mb-2 font-bold text-slate-800">Haftalık Şablon Uygula</h2>
          <p className="mb-3 text-xs text-slate-500">
            Seçili haftaya ({format(weekStart, 'd MMM', { locale: tr })} başlangıç) görevler eklenir.
          </p>
          <div className="space-y-2">
            {WEEKLY_TEMPLATES.map((tpl) => (
              <button
                key={tpl.id}
                onClick={() => applyTemplate(tpl.id)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-left active:bg-slate-100"
              >
                <p className="font-semibold text-slate-800">{tpl.name}</p>
                <p className="mt-0.5 text-xs text-slate-500">{tpl.description}</p>
                <p className="mt-1 text-xs font-medium text-primary-700">{tpl.tasks.length} görev</p>
              </button>
            ))}
          </div>
        </Card>
      )}

      {showForm && (
        <Card className="mb-4">
          <form onSubmit={handleAdd} className="space-y-3">
            <Input label="Görev" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Örn: TYT Mat Problemler Test 2" required />
            <div className="grid grid-cols-2 gap-3">
              <Select label="Tür" value={type} onChange={(e) => setType(e.target.value as TaskType)}>
                {Object.entries(TASK_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </Select>
              <Input label="Saat" type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Select label="Sınav" value={examType} onChange={(e) => setExamType(e.target.value as ExamType)}>
                <option value="TYT">TYT</option>
                <option value="AYT">AYT</option>
              </Select>
              <Select label="Ders" value={subject} onChange={(e) => setSubject(e.target.value)}>
                <option value="">Seçin</option>
                {getSubjects(examType).map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </Select>
            </div>
            <Button type="submit" className="w-full">Görev Ekle</Button>
          </form>
        </Card>
      )}

      {dayTasks.length === 0 ? (
        <EmptyState icon="📋" title="Bu gün görev yok" description="Yukarıdan görev ekleyin veya hızlı ekle kullanın" />
      ) : (
        <ul className="space-y-2">
          {dayTasks.map((task) => (
            <li key={task.id}>
              <Card className={`!p-3 border-l-4 ${
                task.type === 'konu' ? 'border-l-blue-500' :
                task.type === 'test' ? 'border-l-green-500' :
                task.type === 'deneme' ? 'border-l-purple-500' :
                task.type === 'tekrar' ? 'border-l-orange-500' : 'border-l-slate-400'
              }`}>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleTask(task.id)}
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${
                      task.completed ? 'border-green-500 bg-green-500 text-white' : 'border-slate-300'
                    }`}
                  >
                    {task.completed ? '✓' : ''}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1">
                      {task.scheduledTime && (
                        <span className="text-sm font-bold text-primary-700">{task.scheduledTime}</span>
                      )}
                      <Badge color="bg-slate-100 text-slate-600">{TASK_TYPE_LABELS[task.type]}</Badge>
                    </div>
                    <p className={`mt-0.5 text-sm font-medium ${task.completed ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                      {task.title}
                    </p>
                  </div>
                  <button onClick={() => deleteTask(task.id)} className="text-xs text-red-400">Sil</button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Card className="mt-4">
        <h2 className="mb-2 text-sm font-bold text-slate-700">Hızlı Ekle — TYT Matematik</h2>
        <div className="flex flex-wrap gap-2">
          {CURRICULUM.filter((t) => t.examType === 'TYT' && t.subject === 'Matematik')
            .slice(0, 6)
            .map((t) => (
              <button
                key={t.id}
                onClick={() => quickAddTopic(t.name, t.subject, t.examType)}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 active:bg-slate-100"
              >
                + {t.name}
              </button>
            ))}
        </div>
      </Card>
    </Layout>
  )
}
