import { motion } from 'framer-motion'
import {
  AlarmClock, ArrowRight, CalendarDays, CheckCheck, ClipboardCheck, Hourglass, Inbox, ListTodo, MessagesSquare, Pin, Play,
  Sparkles, Sun,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { TaskList } from '../components/TaskRow'
import { AvatarStack, Button, EmptyState, ErrorBox, PageLoader, Section, StatCard } from '../components/ui'
import { useActions } from '../lib/actions'
import { useQuery } from '../lib/api'
import { useAuth } from '../lib/auth'
import { formatDateTime, greeting, todayISO } from '../lib/dates'
import { DASHBOARD } from '../lib/queries'

export default function Today() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { newTask, quickCapture } = useActions()
  const { data, loading, error } = useQuery(DASHBOARD, { today: todayISO() })
  const d = data?.dashboard

  if (loading && !d) return <PageLoader />
  if (error && !d) return <ErrorBox error={error} />

  const focusIds = new Set(d.focus.map((t) => t.id))
  const notFocus = (list) => list.filter((t) => !focusIds.has(t.id))
  const overdue = notFocus(d.overdue)
  const dueToday = notFocus(d.dueToday)
  const inProgress = notFocus(d.inProgress).filter((t) => !t.dueDate || t.dueDate > d.today)
  const waiting = notFocus(d.waiting)
  const upcoming = notFocus(d.upcoming).filter((t) => t.status !== 'waiting')
  const nothing = !d.openCount && !d.inboxCount
  const dateLabel = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })
  const firstName = user?.fullName?.split(' ')[0]

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="flex items-center gap-1.5 text-sm font-medium text-indigo-600 dark:text-indigo-400"><Sun className="h-4 w-4" />{dateLabel}</p>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{greeting()}, {firstName}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {d.overdue.length > 0
              ? `${d.overdue.length} overdue and ${d.dueToday.length} due today. Start with the red ones.`
              : d.dueToday.length > 0
                ? `You have ${d.dueToday.length} thing${d.dueToday.length > 1 ? 's' : ''} due today. You've got this.`
                : 'Nothing is overdue. A good moment to plan ahead.'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => navigate('/review')}><ClipboardCheck className="h-4 w-4" /> Daily review</Button>
          <Button onClick={() => newTask()}>New task</Button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Open tasks" value={d.openCount} icon={ListTodo} onClick={() => navigate('/tasks')} />
        <StatCard label="Overdue" value={d.overdue.length} icon={AlarmClock} tone="rose" onClick={() => navigate('/tasks?due=overdue')} />
        <StatCard label="Due today" value={d.dueToday.length} icon={CalendarDays} tone="amber" onClick={() => navigate('/tasks?due=today')} />
        <StatCard label="Notes to organize" value={d.inboxCount} icon={Inbox} tone="sky" onClick={() => navigate('/inbox')} />
        <StatCard label="Done this week" value={d.doneThisWeek} icon={CheckCheck} tone="emerald" hint={d.doneToday ? `${d.doneToday} today` : null} onClick={() => navigate('/tasks?status=done')} />
      </div>

      {d.inboxCount > 0 && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <Link to="/inbox" className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3 text-sm text-amber-900 transition hover:shadow-md dark:border-amber-500/20 dark:from-amber-500/10 dark:to-orange-500/5 dark:text-amber-200">
            <Sparkles className="h-5 w-5 shrink-0 text-amber-500" />
            <span><b>{d.inboxCount} rough note{d.inboxCount > 1 ? 's' : ''}</b> waiting to be organized into clear tasks. Do it while the details are fresh.</span>
            <ArrowRight className="ml-auto h-4 w-4 shrink-0" />
          </Link>
        </motion.div>
      )}

      {nothing ? (
        <EmptyState
          icon={Sparkles}
          title="A clean slate"
          action={<div className="flex gap-2"><Button onClick={() => quickCapture()}>Capture something</Button><Button variant="secondary" onClick={() => navigate('/discussions')}>Log a discussion</Button></div>}
        >
          Write down every task you've been given — even roughly. Press <b>N</b> anywhere to capture.
        </EmptyState>
      ) : (
        <div className="grid gap-x-6 lg:grid-cols-[1fr_20rem]">
          <div>
            {d.focus.length > 0 && <Section title="Today's focus" icon={Pin} tone="indigo" count={d.focus.length}><TaskList tasks={d.focus} /></Section>}
            {overdue.length > 0 && <Section title="Overdue" icon={AlarmClock} tone="rose" count={overdue.length}><TaskList tasks={overdue} /></Section>}
            {dueToday.length > 0 && <Section title="Due today" icon={CalendarDays} tone="amber" count={dueToday.length}><TaskList tasks={dueToday} /></Section>}
            {inProgress.length > 0 && <Section title="In progress" icon={Play} tone="sky" count={inProgress.length}><TaskList tasks={inProgress} /></Section>}
            {upcoming.length > 0 && <Section title="Next 7 days" icon={CalendarDays} count={upcoming.length}><TaskList tasks={upcoming} /></Section>}
            {!d.focus.length && !overdue.length && !dueToday.length && !inProgress.length && !upcoming.length && (
              <EmptyState icon={CheckCheck} title="Nothing urgent">
                No tasks are due this week.{d.noDueDateCount > 0 && <> {d.noDueDateCount} open task{d.noDueDateCount > 1 ? 's have' : ' has'} no due date — <Link className="text-indigo-600 underline" to="/tasks?due=none">give them one</Link>.</>}
              </EmptyState>
            )}
          </div>
          <div>
            <Section title="Waiting on others" icon={Hourglass} tone="amber" count={waiting.length}>
              {waiting.length ? <TaskList tasks={waiting} compact /> : <p className="card px-4 py-3 text-sm text-slate-400">Not waiting on anyone. 🎉</p>}
            </Section>
            <Section title="Recent discussions" icon={MessagesSquare} action={<Link to="/discussions" className="text-xs font-medium text-indigo-600 hover:underline">All</Link>}>
              <div className="card divide-y divide-slate-100 dark:divide-slate-800">
                {d.recentDiscussions.length === 0 && <p className="px-4 py-3 text-sm text-slate-400">No discussions logged yet.</p>}
                {d.recentDiscussions.map((x) => (
                  <Link key={x.id} to={`/discussions/${x.id}`} className="flex items-center gap-3 px-4 py-3 transition hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{x.title}</p>
                      <p className="text-xs text-slate-400">{x.kindLabel} · {formatDateTime(x.occurredAt)}</p>
                    </div>
                    {x.rawCaptureCount > 0 && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">{x.rawCaptureCount}</span>}
                    <AvatarStack people={x.participants} max={2} size="xs" />
                  </Link>
                ))}
              </div>
            </Section>
          </div>
        </div>
      )}
    </div>
  )
}
