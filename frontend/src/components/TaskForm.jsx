import { Link2, ListChecks, MessagesSquare, Plus, Sparkles, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { mutate } from '../lib/api'
import { addDays, nextMonday, toISODate } from '../lib/dates'
import { cx, PRIORITIES, STATUSES } from '../lib/meta'
import { hasTokens, parseQuick } from '../lib/parse'
import { CONVERT_CAPTURE, CREATE_TASK } from '../lib/queries'
import PersonPicker from './PersonPicker'
import ProjectPicker from './ProjectPicker'
import { useToast } from './Toast'
import { Button, Field, Modal } from './ui'

const EMPTY = {
  title: '', description: '', status: 'todo', priority: 'medium', dueDate: '', people: [], requestedBy: null,
  project: null, discussion: null, pinned: false,
}

function mergeParsed(form, parsed) {
  const names = new Set(form.people.map((p) => p.name.toLowerCase()))
  return {
    ...form,
    title: parsed.title || form.title,
    people: [...form.people, ...parsed.people.filter((n) => !names.has(n.toLowerCase())).map((name) => ({ name }))],
    priority: parsed.priority || form.priority,
    project: parsed.project ? { name: parsed.project } : form.project,
    dueDate: parsed.dueDate || form.dueDate,
  }
}

export function DueQuickPicks({ value, onChange }) {
  const picks = [
    { label: 'Today', date: toISODate(new Date()) },
    { label: 'Tomorrow', date: toISODate(addDays(new Date(), 1)) },
    { label: 'Next week', date: toISODate(nextMonday()) },
  ]
  return (
    <div className="mt-1.5 flex flex-wrap gap-1">
      {picks.map((p) => (
        <button
          type="button"
          key={p.label}
          onClick={() => onChange(p.date)}
          className={cx(
            'rounded-lg px-2 py-0.5 text-xs font-medium transition',
            value === p.date ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300',
          )}
        >
          {p.label}
        </button>
      ))}
      {value && (
        <button type="button" onClick={() => onChange('')} className="rounded-lg px-2 py-0.5 text-xs text-slate-400 hover:text-slate-600">Clear</button>
      )}
    </div>
  )
}

export default function TaskForm({ open, onClose, initial, capture, onCreated }) {
  const toast = useToast()
  const [form, setForm] = useState(EMPTY)
  const [subtasks, setSubtasks] = useState([])
  const [subDraft, setSubDraft] = useState('')
  const [links, setLinks] = useState([])
  const [linkDraft, setLinkDraft] = useState({ url: '', title: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open) return
    let start = { ...EMPTY, ...(initial || {}) }
    if (capture) {
      const [firstLine, ...more] = capture.text.split('\n')
      const parsed = parseQuick(firstLine)
      start = mergeParsed({ ...start, title: '' }, parsed)
      start.title = parsed.title || firstLine
      if (more.length) start.description = more.join('\n').trim()
      if (capture.discussion) start.discussion = capture.discussion
    }
    setForm(start)
    setSubtasks([])
    setLinks([])
    setSubDraft('')
    setLinkDraft({ url: '', title: '' })
    setError(null)
  }, [open, initial, capture])

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }))
  const parsedPreview = parseQuick(form.title)

  const applyTokens = () => {
    if (hasTokens(parsedPreview)) setForm((f) => mergeParsed(f, parseQuick(f.title)))
  }

  const submit = async (e) => {
    e?.preventDefault()
    const f = hasTokens(parseQuick(form.title)) ? mergeParsed(form, parseQuick(form.title)) : form
    if (!f.title.trim()) { setError('Give the task a short, clear title.'); return }
    const pendingSubs = subDraft.trim() ? [...subtasks, subDraft.trim()] : subtasks
    const pendingLinks = linkDraft.url.trim() ? [...links, linkDraft] : links
    const input = {
      title: f.title.trim(),
      description: f.description,
      status: f.status,
      priority: f.priority,
      dueDate: f.dueDate || null,
      peopleIds: f.people.filter((p) => p.id).map((p) => p.id),
      peopleNames: f.people.filter((p) => !p.id).map((p) => p.name),
      requestedById: f.requestedBy?.id || null,
      requestedByName: f.requestedBy && !f.requestedBy.id ? f.requestedBy.name : null,
      projectId: f.project?.id || null,
      projectName: f.project && !f.project.id ? f.project.name : null,
      discussionId: f.discussion?.id || null,
      pinned: f.pinned,
      subtasks: pendingSubs,
      links: pendingLinks.map((l) => ({ url: l.url.trim(), title: l.title?.trim() || null })),
    }
    setSaving(true)
    setError(null)
    try {
      const d = capture
        ? await mutate(CONVERT_CAPTURE, { id: capture.id, input })
        : await mutate(CREATE_TASK, { input })
      const task = capture ? d.convertCapture : d.createTask
      toast(capture ? 'Organized into a task' : 'Task created')
      onCreated?.(task)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={capture ? 'Organize note into a task' : 'New task'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={saving}>{capture ? 'Create task' : 'Add task'}</Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        {capture && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
            <span className="text-xs font-semibold tracking-wide uppercase opacity-70">Your rough note</span>
            <p className="mt-0.5 whitespace-pre-wrap">{capture.text}</p>
          </div>
        )}
        {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}

        <div>
          <input
            autoFocus
            value={form.title}
            onChange={(e) => set('title')(e.target.value)}
            onBlur={applyTokens}
            placeholder="What needs to be done? e.g. Send report to @Asha ^fri !high"
            className="w-full bg-transparent font-display text-xl font-semibold text-slate-900 outline-none placeholder:font-sans placeholder:text-base placeholder:font-normal placeholder:text-slate-400 dark:text-white"
          />
          {hasTokens(parsedPreview) ? (
            <p className="mt-1 flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-300">
              <Sparkles className="h-3 w-3" /> Smart details found — they'll be filled in below.
            </p>
          ) : (
            <p className="mt-1 text-xs text-slate-400">Tip: type <b>@name</b> <b>!high</b> <b>#project</b> <b>^tomorrow</b> to fill details fast.</p>
          )}
        </div>

        <Field label="Details">
          <textarea
            value={form.description}
            onChange={(e) => set('description')(e.target.value)}
            rows={3}
            placeholder="What exactly is expected? Any detail your supervisor mentioned…"
            className="field resize-y"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Status">
            <select value={form.status} onChange={(e) => set('status')(e.target.value)} className="field h-10">
              {STATUSES.filter((s) => s.value !== 'cancelled').map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </Field>
          <Field label="Priority">
            <div className="grid grid-cols-4 gap-1">
              {PRIORITIES.map((p) => (
                <button
                  type="button"
                  key={p.value}
                  onClick={() => set('priority')(p.value)}
                  className={cx('h-10 rounded-xl text-xs font-semibold transition', form.priority === p.value ? cx(p.chip, 'ring-2 ring-current/30') : 'bg-slate-50 text-slate-500 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-400')}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Due date">
            <input type="date" value={form.dueDate || ''} onChange={(e) => set('dueDate')(e.target.value)} className="field h-10" />
            <DueQuickPicks value={form.dueDate} onChange={set('dueDate')} />
          </Field>
          <Field label="Project">
            <ProjectPicker value={form.project} onChange={set('project')} />
          </Field>
          <Field label="People involved" className="sm:col-span-2">
            <PersonPicker value={form.people} onChange={set('people')} />
          </Field>
          <Field label="Requested by" hint="Who asked you to do this? Helps you report back.">
            <PersonPicker value={form.requestedBy} onChange={set('requestedBy')} multiple={false} placeholder="e.g. your supervisor" />
          </Field>
          <Field label="Focus">
            <label className="flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm dark:border-slate-700">
              <input type="checkbox" checked={form.pinned} onChange={(e) => set('pinned')(e.target.checked)} className="h-4 w-4 accent-indigo-600" />
              Pin to Today's focus
            </label>
          </Field>
        </div>

        {form.discussion && (
          <p className="flex items-center gap-2 text-xs text-slate-500">
            <MessagesSquare className="h-3.5 w-3.5" /> From discussion: <b className="text-slate-700 dark:text-slate-200">{form.discussion.title}</b>
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <span className="label flex items-center gap-1.5"><ListChecks className="h-3.5 w-3.5" /> Checklist</span>
            <div className="space-y-1">
              {subtasks.map((s, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5 text-sm dark:bg-slate-800">
                  <span className="h-3.5 w-3.5 rounded border border-slate-300" />
                  <span className="flex-1 truncate">{s}</span>
                  <button type="button" onClick={() => setSubtasks(subtasks.filter((_, j) => j !== i))}><X className="h-3.5 w-3.5 text-slate-400" /></button>
                </div>
              ))}
              <input
                value={subDraft}
                onChange={(e) => setSubDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    if (subDraft.trim()) { setSubtasks([...subtasks, subDraft.trim()]); setSubDraft('') }
                  }
                }}
                placeholder="Add a step and press Enter"
                className="field"
              />
            </div>
          </div>
          <div>
            <span className="label flex items-center gap-1.5"><Link2 className="h-3.5 w-3.5" /> Resources</span>
            <div className="space-y-1">
              {links.map((l, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5 text-sm dark:bg-slate-800">
                  <Link2 className="h-3.5 w-3.5 text-slate-400" />
                  <span className="flex-1 truncate">{l.title || l.url}</span>
                  <button type="button" onClick={() => setLinks(links.filter((_, j) => j !== i))}><X className="h-3.5 w-3.5 text-slate-400" /></button>
                </div>
              ))}
              <div className="flex gap-1">
                <input value={linkDraft.url} onChange={(e) => setLinkDraft({ ...linkDraft, url: e.target.value })} placeholder="https://…" className="field" />
                <Button
                  type="button"
                  variant="secondary"
                  className="h-auto px-2.5"
                  onClick={() => { if (linkDraft.url.trim()) { setLinks([...links, linkDraft]); setLinkDraft({ url: '', title: '' }) } }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <input value={linkDraft.title} onChange={(e) => setLinkDraft({ ...linkDraft, title: e.target.value })} placeholder="Link name (optional)" className="field" />
            </div>
          </div>
        </div>
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  )
}
