import { motion } from 'framer-motion'
import { Check, Flag, Hourglass, Link2, ListChecks, MessagesSquare, Pin } from 'lucide-react'
import { useState } from 'react'
import { mutate } from '../lib/api'
import { useOpenTask } from '../lib/actions'
import { cx, PRIORITY } from '../lib/meta'
import { SET_STATUS } from '../lib/queries'
import { AvatarStack, DueChip, ProjectChip } from './ui'
import { useToast } from './Toast'

export function TaskCheck({ task, size = 'md' }) {
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const done = task.status === 'done'
  const toggle = async (e) => {
    e.stopPropagation()
    if (busy) return
    setBusy(true)
    try {
      await mutate(SET_STATUS, { id: task.id, status: done ? 'todo' : 'done' })
      if (!done) {
        toast('Nice — task completed', {
          action: { label: 'Undo', onClick: () => mutate(SET_STATUS, { id: task.id, status: task.status }) },
        })
      }
    } catch (err) {
      toast(err.message, { type: 'error' })
    } finally {
      setBusy(false)
    }
  }
  const ring = {
    urgent: 'border-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10',
    high: 'border-orange-400 hover:bg-orange-50 dark:hover:bg-orange-500/10',
    medium: 'border-slate-300 hover:bg-indigo-50 dark:border-slate-600 dark:hover:bg-indigo-500/10',
    low: 'border-slate-300 hover:bg-slate-50 dark:border-slate-600',
  }
  return (
    <button
      onClick={toggle}
      title={done ? 'Mark as not done' : 'Mark as done'}
      className={cx(
        'flex shrink-0 items-center justify-center rounded-full border-2 transition',
        size === 'sm' ? 'h-4 w-4' : 'h-5 w-5',
        done ? 'animate-pop border-emerald-500 bg-emerald-500 text-white' : ring[task.priority] || ring.medium,
        busy && 'opacity-50',
      )}
    >
      {done && <Check className="h-3 w-3" strokeWidth={3} />}
    </button>
  )
}

export default function TaskRow({ task, showProject = true, compact = false }) {
  const openTask = useOpenTask()
  const subDone = task.subtasks?.filter((s) => s.done).length || 0
  const subTotal = task.subtasks?.length || 0
  const done = task.status === 'done' || task.status === 'cancelled'
  const priority = PRIORITY[task.priority]

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -10 }}
      onClick={() => openTask(task.id)}
      className={cx(
        'group flex cursor-pointer items-start gap-3 rounded-xl border border-transparent px-3 transition hover:border-slate-200 hover:bg-white hover:shadow-sm dark:hover:border-slate-700 dark:hover:bg-slate-800/60',
        compact ? 'py-2' : 'py-2.5',
      )}
    >
      <span className="pt-0.5"><TaskCheck task={task} /></span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className={cx('truncate text-sm font-medium', done ? 'text-slate-400 line-through' : 'text-slate-800 dark:text-slate-100')}>
            {task.title}
          </p>
          {task.pinned && <Pin className="h-3.5 w-3.5 shrink-0 fill-indigo-500 text-indigo-500" />}
        </div>
        {!compact && (
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            {task.status === 'in_progress' && <span className="rounded-full bg-sky-50 px-2 py-0.5 font-medium text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">In progress</span>}
            {task.status === 'waiting' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                <Hourglass className="h-3 w-3" /> Waiting
              </span>
            )}
            <DueChip date={task.dueDate} isOpen={task.isOpen} />
            {showProject && <ProjectChip project={task.project} />}
            {task.requestedBy && <span className="truncate">from <b className="font-medium text-slate-600 dark:text-slate-300">{task.requestedBy.name}</b></span>}
            {task.discussion && (
              <span className="inline-flex max-w-44 items-center gap-1 truncate"><MessagesSquare className="h-3 w-3 shrink-0" /><span className="truncate">{task.discussion.title}</span></span>
            )}
            {subTotal > 0 && (
              <span className={cx('inline-flex items-center gap-1', subDone === subTotal && 'text-emerald-600')}>
                <ListChecks className="h-3 w-3" /> {subDone}/{subTotal}
              </span>
            )}
            {task.links?.length > 0 && <span className="inline-flex items-center gap-1"><Link2 className="h-3 w-3" />{task.links.length}</span>}
          </div>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2 pt-0.5">
        {(task.priority === 'high' || task.priority === 'urgent') && !done && (
          <Flag className={cx('h-4 w-4', priority.text)} fill="currentColor" />
        )}
        <AvatarStack people={task.people} />
      </div>
    </motion.div>
  )
}

export function TaskList({ tasks, empty, ...rest }) {
  if (!tasks?.length) return empty || null
  return (
    <div className="card p-1.5">
      {tasks.map((t) => <TaskRow key={t.id} task={t} {...rest} />)}
    </div>
  )
}
