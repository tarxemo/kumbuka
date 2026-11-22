import { AnimatePresence, motion } from 'framer-motion'
import {
  Check, Clock, ExternalLink, Link2, ListChecks, MessageSquarePlus, MessagesSquare, Pin, PinOff, Plus, Trash2, X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { gql, mutate, useQuery } from '../lib/api'
import { formatDateTime, timeAgo } from '../lib/dates'
import { cx, PRIORITIES, STATUSES, taskToInput } from '../lib/meta'
import {
  ADD_LINK, ADD_NOTE, ADD_SUBTASK, DELETE_ACTIVITY, DELETE_LINK, DELETE_SUBTASK, DELETE_TASK, SET_STATUS, TASK,
  TOGGLE_PIN, UPDATE_SUBTASK, UPDATE_TASK,
} from '../lib/queries'
import PersonPicker from './PersonPicker'
import ProjectPicker from './ProjectPicker'
import { DueQuickPicks } from './TaskForm'
import { useToast } from './Toast'
import { Button, Confirm, IconButton, PageLoader, Spinner } from './ui'

function Prop({ label, children }) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] items-start gap-3 py-1.5">
      <span className="pt-2.5 text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

function faviconFor(url) {
  try {
    return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=32`
  } catch {
    return null
  }
}

function TaskBody({ id, onClose }) {
  const toast = useToast()
  const { data, loading, error, setData } = useQuery(TASK, { id })
  const task = data?.task
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [subDraft, setSubDraft] = useState('')
  const [link, setLink] = useState({ url: '', title: '' })
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (task) {
      setTitle(task.title)
      setDescription(task.description)
    }
  }, [task?.id, task?.title, task?.description]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading && !task) return <PageLoader />
  if (error) return <p className="p-6 text-sm text-rose-600">{error.message}</p>
  if (!task) return <p className="p-6 text-sm text-slate-500">This task no longer exists.</p>

  const run = async (fn, okMsg) => {
    setSaving(true)
    try {
      await fn()
      if (okMsg) toast(okMsg)
    } catch (err) {
      toast(err.message, { type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const save = (patch) =>
    run(async () => {
      const d = await mutate(UPDATE_TASK, { id: task.id, input: taskToInput(task, patch) })
      setData({ task: { ...task, ...d.updateTask } })
    })

  const setStatus = (status) => run(() => mutate(SET_STATUS, { id: task.id, status }))

  const addSubtask = async () => {
    if (!subDraft.trim()) return
    const t = subDraft
    setSubDraft('')
    await run(() => mutate(ADD_SUBTASK, { taskId: task.id, title: t }))
  }

  const addLink = async () => {
    if (!link.url.trim()) return
    await run(async () => {
      await mutate(ADD_LINK, { taskId: task.id, url: link.url, title: link.title || null })
      setLink({ url: '', title: '' })
    }, 'Resource attached')
  }

  const addNote = async () => {
    if (!note.trim()) return
    await run(async () => {
      await mutate(ADD_NOTE, { taskId: task.id, message: note })
      setNote('')
    })
  }

  const subDone = task.subtasks.filter((s) => s.done).length

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3 dark:border-slate-800">
        <div className="flex flex-1 flex-wrap gap-1">
          {STATUSES.map((s) => (
            <button
              key={s.value}
              onClick={() => setStatus(s.value)}
              className={cx(
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition',
                task.status === s.value ? cx(s.chip, 'ring-2', s.ring) : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800',
              )}
            >
              <span className={cx('h-1.5 w-1.5 rounded-full', s.dot)} />
              {s.label}
            </button>
          ))}
        </div>
        {saving && <Spinner className="h-4 w-4 text-indigo-500" />}
        <IconButton title={task.pinned ? 'Remove from focus' : "Pin to Today's focus"} active={task.pinned} onClick={() => run(() => mutate(TOGGLE_PIN, { id: task.id }))}>
          {task.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
        </IconButton>
        <IconButton title="Delete task" onClick={() => setConfirmDelete(true)}><Trash2 className="h-4 w-4" /></IconButton>
        <IconButton title="Close (Esc)" onClick={onClose}><X className="h-4 w-4" /></IconButton>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5 scroll-thin">
        {/* Title & description */}
        <div>
          <textarea
            value={title}
            rows={1}
            onChange={(e) => setTitle(e.target.value.replace(/\n/g, ''))}
            onBlur={() => title.trim() && title !== task.title && save({ title })}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur() } }}
            className={cx('w-full resize-none bg-transparent font-display text-2xl font-bold leading-tight outline-none', task.status === 'done' ? 'text-slate-400 line-through' : 'text-slate-900 dark:text-white')}
            style={{ fieldSizing: 'content' }}
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() => description !== task.description && save({ description })}
            placeholder="Add details: what exactly is expected, acceptance criteria, context…"
            className="mt-2 min-h-20 w-full resize-y rounded-xl bg-slate-50 p-3 text-sm leading-relaxed outline-none focus:ring-2 focus:ring-indigo-500/20 dark:bg-slate-800/60"
          />
        </div>

        {/* Properties */}
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          <Prop label="Priority">
            <div className="flex gap-1">
              {PRIORITIES.map((p) => (
                <button
                  key={p.value}
                  onClick={() => p.value !== task.priority && save({ priority: p.value })}
                  className={cx('rounded-lg px-2.5 py-1.5 text-xs font-semibold transition', task.priority === p.value ? p.chip : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800')}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </Prop>
          <Prop label="Due date">
            <input type="date" value={task.dueDate || ''} onChange={(e) => save({ dueDate: e.target.value || null })} className="field h-9 max-w-48" />
            <DueQuickPicks value={task.dueDate} onChange={(d) => save({ dueDate: d || null })} />
          </Prop>
          <Prop label="People involved">
            <PersonPicker value={task.people} onChange={(people) => save({ people })} />
          </Prop>
          <Prop label="Requested by">
            <PersonPicker value={task.requestedBy} onChange={(requestedBy) => save({ requestedBy })} multiple={false} placeholder="Who asked for this?" />
          </Prop>
          <Prop label="Project">
            <ProjectPicker value={task.project} onChange={(project) => save({ project })} />
          </Prop>
          {task.discussion && (
            <Prop label="From discussion">
              <Link to={`/discussions/${task.discussion.id}`} onClick={onClose} className="inline-flex items-center gap-1.5 pt-2 text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-300">
                <MessagesSquare className="h-4 w-4" /> {task.discussion.title}
              </Link>
            </Prop>
          )}
        </div>

        {/* Checklist */}
        <div>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <ListChecks className="h-4 w-4 text-indigo-500" /> Checklist
            {task.subtasks.length > 0 && <span className="text-xs font-normal text-slate-400">{subDone}/{task.subtasks.length} done</span>}
          </h3>
          {task.subtasks.length > 0 && (
            <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <motion.div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500" animate={{ width: `${(subDone / task.subtasks.length) * 100}%` }} />
            </div>
          )}
          <div className="space-y-0.5">
            {task.subtasks.map((s) => (
              <div key={s.id} className="group flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800/60">
                <button
                  onClick={() => run(() => mutate(UPDATE_SUBTASK, { id: s.id, done: !s.done }))}
                  className={cx('flex h-4 w-4 items-center justify-center rounded border-2 transition', s.done ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 dark:border-slate-600')}
                >
                  {s.done && <Check className="h-3 w-3" strokeWidth={3} />}
                </button>
                <span className={cx('flex-1 text-sm', s.done && 'text-slate-400 line-through')}>{s.title}</span>
                <button onClick={() => run(() => mutate(DELETE_SUBTASK, { id: s.id }))} className="opacity-0 transition group-hover:opacity-100">
                  <X className="h-3.5 w-3.5 text-slate-400 hover:text-rose-500" />
                </button>
              </div>
            ))}
          </div>
          <div className="mt-1 flex items-center gap-2 px-2">
            <Plus className="h-4 w-4 text-slate-400" />
            <input
              value={subDraft}
              onChange={(e) => setSubDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addSubtask()}
              placeholder="Add a step, press Enter"
              className="flex-1 bg-transparent py-1.5 text-sm outline-none placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Resources */}
        <div>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold"><Link2 className="h-4 w-4 text-indigo-500" /> Resources & links</h3>
          <div className="space-y-1">
            {task.links.map((l) => (
              <div key={l.id} className="group flex items-center gap-2.5 rounded-xl border border-slate-100 px-3 py-2 dark:border-slate-800">
                {faviconFor(l.url) ? <img src={faviconFor(l.url)} alt="" className="h-4 w-4 rounded" /> : <Link2 className="h-4 w-4" />}
                <a href={l.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700 hover:text-indigo-600 dark:text-slate-200">
                  {l.title || l.url}
                  {l.title && <span className="ml-2 text-xs font-normal text-slate-400">{new URL(l.url).hostname}</span>}
                </a>
                <a href={l.url} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-indigo-500"><ExternalLink className="h-3.5 w-3.5" /></a>
                <button onClick={() => run(() => mutate(DELETE_LINK, { id: l.id }))} className="opacity-0 group-hover:opacity-100">
                  <X className="h-3.5 w-3.5 text-slate-400 hover:text-rose-500" />
                </button>
              </div>
            ))}
          </div>
          <div className="mt-2 flex flex-col gap-1.5 sm:flex-row">
            <input value={link.url} onChange={(e) => setLink({ ...link, url: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && addLink()} placeholder="Paste a link…" className="field h-9" />
            <input value={link.title} onChange={(e) => setLink({ ...link, title: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && addLink()} placeholder="Name (optional)" className="field h-9 sm:max-w-40" />
            <Button size="sm" variant="soft" className="h-9" onClick={addLink}>Attach</Button>
          </div>
        </div>

        {/* Activity */}
        <div>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold"><Clock className="h-4 w-4 text-indigo-500" /> Updates & history</h3>
          <div className="flex gap-2">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) addNote() }}
              rows={2}
              placeholder="Log progress, a decision, or feedback… (Ctrl+Enter)"
              className="field resize-none"
            />
            <Button variant="soft" className="h-auto" onClick={addNote} title="Add update"><MessageSquarePlus className="h-4 w-4" /></Button>
          </div>
          <ol className="relative mt-4 space-y-3 border-l border-slate-200 pl-4 dark:border-slate-800">
            {task.activities.map((a) => (
              <li key={a.id} className="group relative">
                <span className={cx('absolute top-1.5 -left-[21px] h-2.5 w-2.5 rounded-full ring-4 ring-white dark:ring-slate-900', a.kind === 'note' ? 'bg-indigo-500' : a.kind === 'created' ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600')} />
                {a.kind === 'note' ? (
                  <div className="rounded-xl bg-indigo-50/70 px-3 py-2 text-sm whitespace-pre-wrap text-slate-700 dark:bg-indigo-500/10 dark:text-slate-200">{a.message}</div>
                ) : (
                  <p className="text-sm text-slate-600 dark:text-slate-300">{a.message}</p>
                )}
                <p className="mt-0.5 flex items-center gap-2 text-xs text-slate-400" title={formatDateTime(a.createdAt)}>
                  {timeAgo(a.createdAt)}
                  {a.kind === 'note' && (
                    <button onClick={() => run(() => mutate(DELETE_ACTIVITY, { id: a.id }))} className="opacity-0 group-hover:opacity-100 hover:text-rose-500">remove</button>
                  )}
                </p>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-xs text-slate-400">Created {formatDateTime(task.createdAt)}{task.completedAt ? ` · Completed ${formatDateTime(task.completedAt)}` : ''}</p>
        </div>
      </div>

      <Confirm
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete this task?"
        onConfirm={async () => {
          await gql(DELETE_TASK, { id: task.id })
          setConfirmDelete(false)
          onClose()
          window.dispatchEvent(new Event('kumbuka:changed'))
          toast('Task deleted')
        }}
      >
        “{task.title}” and its checklist, links and history will be removed permanently. If it's just no longer needed, consider marking it Cancelled instead.
      </Confirm>
    </div>
  )
}

export default function TaskDrawer() {
  const [params, setParams] = useSearchParams()
  const id = params.get('task')
  const close = () => {
    const next = new URLSearchParams(params)
    next.delete('task')
    setParams(next)
  }

  useEffect(() => {
    if (!id) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape' && !document.querySelector('[data-modal-open]')) close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <AnimatePresence>
      {id && (
        <>
          <motion.div key="backdrop" className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close} />
          <motion.aside
            key="drawer"
            className="fixed inset-y-0 right-0 z-40 w-full max-w-xl border-l border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            <TaskBody key={id} id={id} onClose={close} />
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
