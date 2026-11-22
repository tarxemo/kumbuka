import { motion } from 'framer-motion'
import { AlarmClock, CalendarDays, LayoutGrid, LayoutList, ListTodo, Plus, Search, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useToast } from '../components/Toast'
import TaskRow, { TaskCheck } from '../components/TaskRow'
import { AvatarStack, Button, DueChip, EmptyState, ErrorBox, PageHeader, PageLoader, ProjectChip, Section, Segmented } from '../components/ui'
import { useActions, useOpenTask } from '../lib/actions'
import { mutate, useDebounced, useQuery } from '../lib/api'
import { daysFromToday, todayISO } from '../lib/dates'
import { cx, PRIORITIES, STATUS, STATUSES } from '../lib/meta'
import { PEOPLE, PROJECTS, SET_STATUS, TASKS } from '../lib/queries'

const BUCKETS = [
  { key: 'overdue', title: 'Overdue', tone: 'rose', icon: AlarmClock, test: (d) => d !== null && d < 0 },
  { key: 'today', title: 'Today', tone: 'amber', icon: CalendarDays, test: (d) => d === 0 },
  { key: 'week', title: 'This week', tone: 'indigo', icon: CalendarDays, test: (d) => d !== null && d > 0 && d <= 7 },
  { key: 'later', title: 'Later', icon: CalendarDays, test: (d) => d !== null && d > 7 },
  { key: 'none', title: 'No due date', icon: CalendarDays, test: (d) => d === null },
]

function BoardCard({ task, onDragStart }) {
  const openTask = useOpenTask()
  const subDone = task.subtasks.filter((s) => s.done).length
  return (
    <motion.div
      layout
      draggable
      onDragStart={(e) => onDragStart(e, task)}
      onClick={() => openTask(task.id)}
      className="card cursor-grab p-3 transition hover:-translate-y-0.5 hover:shadow-md active:cursor-grabbing"
    >
      <div className="flex items-start gap-2">
        <span className="pt-0.5"><TaskCheck task={task} size="sm" /></span>
        <p className={cx('flex-1 text-sm font-medium', task.status === 'done' && 'text-slate-400 line-through')}>{task.title}</p>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <DueChip date={task.dueDate} isOpen={task.isOpen} />
        <ProjectChip project={task.project} />
        {task.subtasks.length > 0 && <span className="text-xs text-slate-400">{subDone}/{task.subtasks.length}</span>}
        <span className="ml-auto"><AvatarStack people={task.people} size="xs" /></span>
      </div>
    </motion.div>
  )
}

function Board({ tasks, setTasks }) {
  const toast = useToast()
  const [over, setOver] = useState(null)
  const columns = STATUSES.filter((s) => s.value !== 'cancelled')

  const onDragStart = (e, task) => {
    e.dataTransfer.setData('text/plain', task.id)
    e.dataTransfer.effectAllowed = 'move'
  }
  const onDrop = async (e, status) => {
    e.preventDefault()
    setOver(null)
    const id = e.dataTransfer.getData('text/plain')
    const task = tasks.find((t) => t.id === id)
    if (!task || task.status === status) return
    setTasks((list) => list.map((t) => (t.id === id ? { ...t, status, isOpen: !['done', 'cancelled'].includes(status) } : t)))
    try {
      await mutate(SET_STATUS, { id, status })
      toast(`Moved to ${STATUS[status].label}`)
    } catch (err) {
      toast(err.message, { type: 'error' })
    }
  }

  return (
    <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-4 scroll-thin">
      {columns.map((col) => {
        const items = tasks.filter((t) => t.status === col.value)
        return (
          <div
            key={col.value}
            onDragOver={(e) => { e.preventDefault(); setOver(col.value) }}
            onDragLeave={() => setOver((o) => (o === col.value ? null : o))}
            onDrop={(e) => onDrop(e, col.value)}
            className={cx('flex w-72 shrink-0 flex-col rounded-2xl bg-slate-100/70 p-2 transition dark:bg-slate-900/60', over === col.value && 'bg-indigo-100/70 ring-2 ring-indigo-400 dark:bg-indigo-500/10')}
          >
            <div className="flex items-center gap-2 px-2 py-2">
              <span className={cx('h-2 w-2 rounded-full', col.dot)} />
              <span className="text-sm font-semibold">{col.label}</span>
              <span className="text-xs text-slate-400">{items.length}</span>
            </div>
            <div className="flex min-h-24 flex-col gap-2">
              {items.map((t) => <BoardCard key={t.id} task={t} onDragStart={onDragStart} />)}
              {!items.length && <p className="rounded-xl border border-dashed border-slate-300 px-3 py-6 text-center text-xs text-slate-400 dark:border-slate-700">Drop tasks here</p>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function Tasks() {
  const [params, setParams] = useSearchParams()
  const { newTask } = useActions()
  const status = params.get('status') || 'open'
  const due = params.get('due') || ''
  const priority = params.get('priority') || ''
  const projectId = params.get('project') || ''
  const personId = params.get('person') || ''
  const [view, setView] = useState(() => { try { return localStorage.getItem('kumbuka.tasksView') || 'list' } catch { return 'list' } })
  const [search, setSearch] = useState(params.get('q') || '')
  const debounced = useDebounced(search, 250)

  useEffect(() => { try { localStorage.setItem('kumbuka.tasksView', view) } catch { /* ignore */ } }, [view])

  const setParam = (key, value) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  const vars = {
    status: view === 'board' ? 'all' : status,
    due: due || null,
    priority: priority || null,
    projectId: projectId || null,
    personId: personId || null,
    search: debounced || null,
    today: todayISO(),
  }
  const { data, loading, error, setData } = useQuery(TASKS, vars)
  const { data: projects } = useQuery(PROJECTS, {})
  const { data: people } = useQuery(PEOPLE, {})
  const tasks = data?.tasks || []
  const project = projects?.projects.find((p) => p.id === projectId)

  const grouped = useMemo(() => {
    if (status !== 'open') return null
    return BUCKETS.map((b) => ({ ...b, tasks: tasks.filter((t) => b.test(t.dueDate ? daysFromToday(t.dueDate) : null)) })).filter((b) => b.tasks.length)
  }, [tasks, status])

  const activeFilters = [due, priority, projectId, personId, debounced].filter(Boolean).length

  return (
    <div>
      <PageHeader
        icon={ListTodo}
        title={project ? project.name : 'Tasks'}
        subtitle={project?.description || 'Everything you are responsible for, in one place.'}
        actions={
          <>
            <Segmented value={view} onChange={setView} options={[{ value: 'list', label: 'List', icon: LayoutList }, { value: 'board', label: 'Board', icon: LayoutGrid }]} />
            <Button onClick={() => newTask(project ? { project } : null)}><Plus className="h-4 w-4" /> New task</Button>
          </>
        }
      />

      <div className="card mb-5 flex flex-wrap items-center gap-2 p-2">
        <div className="relative min-w-52 flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setParam('q', e.target.value) }} placeholder="Search tasks…" className="field h-9 pl-9" />
        </div>
        {view === 'list' && (
          <select value={status} onChange={(e) => setParam('status', e.target.value === 'open' ? '' : e.target.value)} className="field h-9 w-auto">
            <option value="open">All open</option>
            {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            <option value="all">Everything</option>
          </select>
        )}
        <select value={due} onChange={(e) => setParam('due', e.target.value)} className="field h-9 w-auto">
          <option value="">Any due date</option>
          <option value="overdue">Overdue</option>
          <option value="today">Due today</option>
          <option value="week">Next 7 days</option>
          <option value="upcoming">Upcoming</option>
          <option value="none">No due date</option>
        </select>
        <select value={priority} onChange={(e) => setParam('priority', e.target.value)} className="field h-9 w-auto">
          <option value="">Any priority</option>
          {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
        <select value={projectId} onChange={(e) => setParam('project', e.target.value)} className="field h-9 w-auto max-w-44">
          <option value="">All projects</option>
          {projects?.projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={personId} onChange={(e) => setParam('person', e.target.value)} className="field h-9 w-auto max-w-44">
          <option value="">Anyone</option>
          {people?.people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        {activeFilters > 0 && (
          <Button size="sm" variant="ghost" onClick={() => { setSearch(''); const n = new URLSearchParams(); if (params.get('task')) n.set('task', params.get('task')); setParams(n) }}>
            <X className="h-3.5 w-3.5" /> Clear
          </Button>
        )}
      </div>

      {loading && !data && <PageLoader />}
      <ErrorBox error={error} />

      {data && !tasks.length && (
        <EmptyState icon={ListTodo} title={activeFilters ? 'No tasks match these filters' : 'No tasks yet'} action={<Button onClick={() => newTask(project ? { project } : null)}>Add a task</Button>}>
          {activeFilters ? 'Try clearing a filter.' : 'Add the first thing you need to do. Press T anywhere for a new task.'}
        </EmptyState>
      )}

      {data && tasks.length > 0 && view === 'board' && <Board tasks={tasks.filter((t) => t.status !== 'cancelled')} setTasks={(fn) => setData((d) => ({ tasks: fn(d.tasks) }))} />}

      {data && tasks.length > 0 && view === 'list' && (grouped ? (
        grouped.map((g) => (
          <Section key={g.key} title={g.title} icon={g.icon} tone={g.tone} count={g.tasks.length}>
            <div className="card p-1.5">{g.tasks.map((t) => <TaskRow key={t.id} task={t} showProject={!projectId} />)}</div>
          </Section>
        ))
      ) : (
        <div className="card p-1.5">{tasks.map((t) => <TaskRow key={t.id} task={t} showProject={!projectId} />)}</div>
      ))}
    </div>
  )
}
