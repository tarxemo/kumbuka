import { motion } from 'framer-motion'
import { AlarmClock, ArrowRight, Check, ClipboardCheck, Hourglass, Inbox, Pin, PinOff, Sparkles, CalendarDays } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { TaskCheck } from '../components/TaskRow'
import { useToast } from '../components/Toast'
import { AvatarStack, Button, DueChip, PageHeader, PageLoader } from '../components/ui'
import { useOpenTask } from '../lib/actions'
import { mutate, useQuery } from '../lib/api'
import { addDays, nextMonday, toISODate, todayISO } from '../lib/dates'
import { cx, taskToInput } from '../lib/meta'
import { CAPTURES, TASKS, TOGGLE_PIN, UPDATE_TASK } from '../lib/queries'

function ReviewRow({ task, children }) {
  const openTask = useOpenTask()
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50">
      <TaskCheck task={task} />
      <button onClick={() => openTask(task.id)} className="min-w-0 flex-1 text-left">
        <p className="truncate text-sm font-medium">{task.title}</p>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-400">
          <DueChip date={task.dueDate} isOpen={task.isOpen} />
          {task.requestedBy && <span>from {task.requestedBy.name}</span>}
        </div>
      </button>
      <AvatarStack people={task.people} />
      <div className="flex gap-1">{children}</div>
    </div>
  )
}

function Reschedule({ task }) {
  const toast = useToast()
  const set = async (date, label) => {
    await mutate(UPDATE_TASK, { id: task.id, input: taskToInput(task, { dueDate: date }) })
    toast(`Moved to ${label}`)
  }
  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => set(todayISO(), 'today')}>Today</Button>
      <Button size="sm" variant="secondary" onClick={() => set(toISODate(addDays(new Date(), 1)), 'tomorrow')}>Tomorrow</Button>
      <Button size="sm" variant="secondary" onClick={() => set(toISODate(nextMonday()), 'next week')}>Next week</Button>
    </>
  )
}

function Step({ n, title, icon: Icon, done, description, children }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: n * 0.05 }} className="card overflow-hidden">
      <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
        <span className={cx('flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold', done ? 'bg-emerald-500 text-white' : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300')}>
          {done ? <Check className="h-4 w-4" strokeWidth={3} /> : n}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="flex items-center gap-2 font-display font-semibold text-slate-900 dark:text-white"><Icon className="h-4 w-4 text-slate-400" /> {title}</h2>
          <p className="text-xs text-slate-500">{description}</p>
        </div>
      </div>
      <div className="p-2">{children}</div>
    </motion.div>
  )
}

export default function Review() {
  const today = todayISO()
  const inbox = useQuery(CAPTURES, { state: 'raw' })
  const overdue = useQuery(TASKS, { status: 'open', due: 'overdue', today })
  const waiting = useQuery(TASKS, { status: 'waiting', today })
  const noDate = useQuery(TASKS, { status: 'open', due: 'none', today })
  const upcoming = useQuery(TASKS, { status: 'open', due: 'week', today })
  const [showAllUpcoming, setShowAllUpcoming] = useState(false)

  if ([inbox, overdue, waiting, noDate, upcoming].some((q) => q.loading && !q.data)) return <PageLoader />

  const inboxCount = inbox.data?.captures.length || 0
  const overdueTasks = overdue.data?.tasks || []
  const waitingTasks = waiting.data?.tasks || []
  const noDateTasks = noDate.data?.tasks || []
  const upcomingTasks = upcoming.data?.tasks || []
  const steps = [inboxCount === 0, overdueTasks.length === 0, true, noDateTasks.length === 0, upcomingTasks.some((t) => t.pinned)]
  const progress = Math.round((steps.filter(Boolean).length / steps.length) * 100)

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader icon={ClipboardCheck} title="Daily review" subtitle="10 minutes at the end of each day. This is how you stop missing details." />

      <div className="card mb-6 p-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-semibold">Review progress</span>
          <span className="text-slate-500">{progress}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <motion.div className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-emerald-500" animate={{ width: `${progress}%` }} />
        </div>
        {progress === 100 && <p className="mt-3 flex items-center gap-2 text-sm font-medium text-emerald-600"><Sparkles className="h-4 w-4" /> All clear. You know exactly what tomorrow holds.</p>}
      </div>

      <div className="space-y-4">
        <Step n={1} title="Empty your inbox" icon={Inbox} done={inboxCount === 0} description="Turn each rough note into a clear task, or archive it.">
          {inboxCount ? (
            <Link to="/inbox" className="flex items-center justify-between rounded-xl px-3 py-3 text-sm font-medium text-indigo-600 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-indigo-500/10">
              {inboxCount} note{inboxCount > 1 ? 's' : ''} to organize <ArrowRight className="h-4 w-4" />
            </Link>
          ) : <p className="px-3 py-3 text-sm text-slate-400">Inbox is empty. </p>}
        </Step>

        <Step n={2} title="Deal with overdue tasks" icon={AlarmClock} done={!overdueTasks.length} description="Finish it, reschedule it honestly, or tell the person it will be late.">
          {overdueTasks.length ? overdueTasks.map((t) => <ReviewRow key={t.id} task={t}><Reschedule task={t} /></ReviewRow>) : <p className="px-3 py-3 text-sm text-slate-400">Nothing overdue.</p>}
        </Step>

        <Step n={3} title="Follow up on what you're waiting for" icon={Hourglass} done description="Has anyone not responded? Send a quick nudge and log it as an update.">
          {waitingTasks.length ? waitingTasks.map((t) => <ReviewRow key={t.id} task={t} />) : <p className="px-3 py-3 text-sm text-slate-400">You're not waiting on anyone.</p>}
        </Step>

        <Step n={4} title="Give every task a due date" icon={CalendarDays} done={!noDateTasks.length} description="Tasks without dates are the ones that get forgotten.">
          {noDateTasks.length ? noDateTasks.map((t) => <ReviewRow key={t.id} task={t}><Reschedule task={t} /></ReviewRow>) : <p className="px-3 py-3 text-sm text-slate-400">Every open task has a date.</p>}
        </Step>

        <Step n={5} title="Pick tomorrow's focus" icon={Pin} done={upcomingTasks.some((t) => t.pinned)} description="Pin the 1–3 tasks that matter most. They'll be at the top of Today.">
          {upcomingTasks.length ? (
            <>
              {(showAllUpcoming ? upcomingTasks : upcomingTasks.slice(0, 8)).map((t) => (
                <ReviewRow key={t.id} task={t}>
                  <Button size="sm" variant={t.pinned ? 'soft' : 'secondary'} onClick={() => mutate(TOGGLE_PIN, { id: t.id })}>
                    {t.pinned ? <><PinOff className="h-3.5 w-3.5" /> Unpin</> : <><Pin className="h-3.5 w-3.5" /> Focus</>}
                  </Button>
                </ReviewRow>
              ))}
              {upcomingTasks.length > 8 && !showAllUpcoming && <button className="px-3 py-2 text-xs text-indigo-600" onClick={() => setShowAllUpcoming(true)}>Show all {upcomingTasks.length}</button>}
            </>
          ) : <p className="px-3 py-3 text-sm text-slate-400">No tasks due in the next 7 days.</p>}
        </Step>
      </div>
    </div>
  )
}
