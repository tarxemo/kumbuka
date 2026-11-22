import { AnimatePresence } from 'framer-motion'
import { ArrowLeft, Check, ExternalLink, Link2, ListTodo, FileText, Plus, Sparkles, StickyNote, Trash2, X, Zap } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import PersonPicker from '../components/PersonPicker'
import ProjectPicker from '../components/ProjectPicker'
import TaskRow from '../components/TaskRow'
import { useToast } from '../components/Toast'
import { Button, Confirm, ErrorBox, Kbd, PageLoader } from '../components/ui'
import { useActions } from '../lib/actions'
import { gql, mutate, useQuery } from '../lib/api'
import { fromLocalInput, timeAgo, toLocalInput } from '../lib/dates'
import { DISCUSSION_KINDS } from '../lib/meta'
import {
  ADD_CAPTURE, ADD_LINK, DELETE_DISCUSSION, DELETE_LINK, DISCUSSION, EXTRACT_ACTIONS, SAVE_NOTES, UPDATE_DISCUSSION,
} from '../lib/queries'
import { CaptureItem } from './Inbox'

function Panel({ title, icon: Icon, children, action, className }) {
  return (
    <div className={`card p-4 ${className || ''}`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold"><Icon className="h-4 w-4 text-indigo-500" /> {title}</h2>
        {action}
      </div>
      {children}
    </div>
  )
}

export default function DiscussionDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { newTask } = useActions()
  const { data, loading, error } = useQuery(DISCUSSION, { id })
  const d = data?.discussion

  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [summary, setSummary] = useState('')
  const [saveState, setSaveState] = useState('saved')
  const [action, setAction] = useState('')
  const [link, setLink] = useState({ url: '', title: '' })
  const [confirm, setConfirm] = useState(false)
  const timer = useRef(null)
  const loadedId = useRef(null)

  useEffect(() => {
    if (d && loadedId.current !== d.id) {
      loadedId.current = d.id
      setTitle(d.title)
      setNotes(d.roughNotes)
      setSummary(d.summary)
    }
  }, [d])

  useEffect(() => () => clearTimeout(timer.current), [])

  if (loading && !d) return <PageLoader />
  if (error && !d) return <ErrorBox error={error} />
  if (!d) return <p className="text-sm text-slate-500">Discussion not found.</p>

  const update = async (patch) => {
    try {
      await mutate(UPDATE_DISCUSSION, {
        id: d.id,
        input: {
          title: d.title,
          kind: d.kind,
          occurredAt: d.occurredAt,
          participantIds: d.participants.map((p) => p.id),
          projectId: d.project?.id || null,
          summary,
          ...patch,
        },
      })
    } catch (err) {
      toast(err.message, { type: 'error' })
    }
  }

  const onNotes = (value) => {
    setNotes(value)
    setSaveState('saving')
    clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      try {
        await gql(SAVE_NOTES, { id: d.id, roughNotes: value })
        setSaveState('saved')
      } catch {
        setSaveState('error')
      }
    }, 700)
  }

  const addAction = async () => {
    if (!action.trim()) return
    const text = action
    setAction('')
    try { await mutate(ADD_CAPTURE, { text, discussionId: d.id }) } catch (err) { toast(err.message, { type: 'error' }) }
  }

  const extract = async () => {
    clearTimeout(timer.current)
    await gql(SAVE_NOTES, { id: d.id, roughNotes: notes })
    setSaveState('saved')
    const r = await mutate(EXTRACT_ACTIONS, { discussionId: d.id })
    const n = r.extractActions.created
    toast(n ? `${n} action item${n > 1 ? 's' : ''} pulled from your notes` : 'No new action lines found', { type: n ? 'success' : 'info' })
  }

  const addLink = async () => {
    if (!link.url.trim()) return
    try {
      await mutate(ADD_LINK, { discussionId: d.id, url: link.url, title: link.title || null })
      setLink({ url: '', title: '' })
    } catch (err) {
      toast(err.message, { type: 'error' })
    }
  }

  const raw = d.captures.filter((c) => c.state === 'raw')
  const organized = d.captures.filter((c) => c.state !== 'raw')
  const withDiscussion = { discussion: { id: d.id, title: d.title } }

  return (
    <div>
      <Link to="/discussions" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600"><ArrowLeft className="h-4 w-4" /> Discussions</Link>

      <div className="card mb-5 p-5">
        <div className="flex flex-wrap items-start gap-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => title.trim() && title !== d.title && update({ title })}
            className="min-w-0 flex-1 bg-transparent font-display text-2xl font-bold text-slate-900 outline-none dark:text-white"
          />
          <Button variant="ghost" size="sm" onClick={() => setConfirm(true)}><Trash2 className="h-4 w-4" /></Button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-[10rem_14rem_1fr_14rem]">
          <select value={d.kind} onChange={(e) => update({ kind: e.target.value })} className="field h-10">
            {DISCUSSION_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
          </select>
          <input type="datetime-local" defaultValue={toLocalInput(d.occurredAt)} onBlur={(e) => e.target.value && update({ occurredAt: fromLocalInput(e.target.value) })} className="field h-10" />
          <PersonPicker value={d.participants} onChange={(people) => update({ participantIds: people.filter((p) => p.id).map((p) => p.id) })} placeholder="Who was there?" />
          <ProjectPicker value={d.project} onChange={(project) => update({ projectId: project?.id || null })} />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.15fr_1fr]">
        <div className="space-y-5">
          <Panel
            title="Live notes"
            icon={FileText}
            action={<span className="text-xs text-slate-400">{saveState === 'saving' ? 'Saving…' : saveState === 'error' ? 'Not saved — check connection' : 'Saved'}</span>}
          >
            <textarea
              value={notes}
              onChange={(e) => onNotes(e.target.value)}
              placeholder={'Type freely while people talk. Messy is fine.\n\nMark action lines so Kumbuka can pull them out:\n[] send the draft budget to Asha by Friday\ntodo: book the boardroom\n-> follow up with IT about access'}
              className="min-h-80 w-full resize-y rounded-xl bg-amber-50/50 p-4 font-mono text-sm leading-relaxed outline-none focus:ring-2 focus:ring-amber-300/40 dark:bg-amber-500/5"
            />
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-slate-400">Lines starting with <Kbd>[]</Kbd> <Kbd>todo:</Kbd> <Kbd>action:</Kbd> or <Kbd>-&gt;</Kbd> become action items.</p>
              <Button size="sm" variant="soft" onClick={extract}><Sparkles className="h-3.5 w-3.5" /> Pull out action items</Button>
            </div>
          </Panel>

          <Panel title="Summary & decisions" icon={Check}>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              onBlur={() => summary !== d.summary && update({ summary })}
              placeholder="After the meeting: what was decided? What does your supervisor expect?"
              className="field min-h-28 resize-y"
            />
          </Panel>

          <Panel title="Resources shared" icon={Link2}>
            <div className="space-y-1">
              {d.links.map((l) => (
                <div key={l.id} className="group flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800/60">
                  <Link2 className="h-4 w-4 text-slate-400" />
                  <a href={l.url} target="_blank" rel="noreferrer" className="flex-1 truncate text-sm font-medium hover:text-indigo-600">{l.title || l.url}</a>
                  <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                  <button onClick={() => mutate(DELETE_LINK, { id: l.id })} className="opacity-0 group-hover:opacity-100"><X className="h-3.5 w-3.5 text-slate-400" /></button>
                </div>
              ))}
            </div>
            <div className="mt-2 flex flex-col gap-1.5 sm:flex-row">
              <input value={link.url} onChange={(e) => setLink({ ...link, url: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && addLink()} placeholder="Paste a link…" className="field h-9" />
              <input value={link.title} onChange={(e) => setLink({ ...link, title: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && addLink()} placeholder="Name" className="field h-9 sm:max-w-36" />
              <Button size="sm" variant="soft" className="h-9" onClick={addLink}>Add</Button>
            </div>
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel title="Action items to organize" icon={Zap} action={raw.length > 0 && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">{raw.length}</span>}>
            <div className="mb-3 flex gap-2">
              <input
                value={action}
                onChange={(e) => setAction(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addAction()}
                placeholder="Quick action item… (Enter)"
                className="field h-10"
              />
              <Button variant="soft" className="h-10" onClick={addAction}><Plus className="h-4 w-4" /></Button>
            </div>
            <div className="space-y-2">
              <AnimatePresence mode="popLayout">
                {raw.map((c) => <CaptureItem key={c.id} capture={{ ...c, discussion: { id: d.id, title: d.title } }} showSource={false} />)}
              </AnimatePresence>
              {!raw.length && (
                <p className="flex items-center gap-2 rounded-xl border border-dashed border-slate-200 px-3 py-4 text-sm text-slate-400 dark:border-slate-700">
                  <StickyNote className="h-4 w-4" /> No rough action items waiting. Add one above or pull them from your notes.
                </p>
              )}
            </div>
            {organized.length > 0 && <p className="mt-3 text-xs text-slate-400">{organized.length} already organized or archived · last {timeAgo(organized[0].createdAt)}</p>}
          </Panel>

          <Panel
            title="Tasks from this discussion"
            icon={ListTodo}
            action={<Button size="sm" variant="ghost" onClick={() => newTask(withDiscussion)}><Plus className="h-3.5 w-3.5" /> Task</Button>}
          >
            {d.tasks.length ? (
              <div className="-mx-2">{d.tasks.map((t) => <TaskRow key={t.id} task={t} />)}</div>
            ) : (
              <p className="text-sm text-slate-400">No tasks yet. Turn the action items above into tasks.</p>
            )}
          </Panel>
        </div>
      </div>

      <Confirm
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Delete this discussion?"
        onConfirm={async () => { await mutate(DELETE_DISCUSSION, { id: d.id }); navigate('/discussions') }}
      >
        Notes and rough action items are deleted. Tasks created from it are kept.
      </Confirm>
    </div>
  )
}
