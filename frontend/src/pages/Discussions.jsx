import { motion } from 'framer-motion'
import { MessagesSquare, Plus, Search, StickyNote } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PersonPicker from '../components/PersonPicker'
import ProjectPicker from '../components/ProjectPicker'
import { AvatarStack, Button, EmptyState, ErrorBox, Field, Modal, PageHeader, PageLoader, ProjectChip } from '../components/ui'
import { mutate, useDebounced, useQuery } from '../lib/api'
import { formatDateTime, fromLocalInput, toLocalInput } from '../lib/dates'
import { DISCUSSION_KINDS } from '../lib/meta'
import { CREATE_DISCUSSION, DISCUSSIONS } from '../lib/queries'

export function NewDiscussionModal({ open, onClose, initialPeople = [] }) {
  const navigate = useNavigate()
  const [form, setForm] = useState(null)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const current = form || { title: '', kind: 'meeting', occurredAt: toLocalInput(), people: initialPeople, project: null }
  const set = (k) => (v) => setForm({ ...current, [k]: v })

  const close = () => { setForm(null); setError(null); onClose() }

  const submit = async (e) => {
    e?.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const d = await mutate(CREATE_DISCUSSION, {
        input: {
          title: current.title,
          kind: current.kind,
          occurredAt: fromLocalInput(current.occurredAt),
          participantIds: current.people.filter((p) => p.id).map((p) => p.id),
          participantNames: current.people.filter((p) => !p.id).map((p) => p.name),
          projectId: current.project?.id || null,
        },
      })
      close()
      navigate(`/discussions/${d.createDiscussion.id}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={close} title="Start a discussion"
      footer={<><Button variant="secondary" onClick={close}>Cancel</Button><Button onClick={submit} loading={saving}>Start taking notes</Button></>}
    >
      <form onSubmit={submit} className="space-y-4">
        {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
        <Field label="What is it about?">
          <input autoFocus value={current.title} onChange={(e) => set('title')(e.target.value)} placeholder="e.g. Weekly sync with supervisor" className="field h-11" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Type">
            <select value={current.kind} onChange={(e) => set('kind')(e.target.value)} className="field h-10">
              {DISCUSSION_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
            </select>
          </Field>
          <Field label="When">
            <input type="datetime-local" value={current.occurredAt} onChange={(e) => set('occurredAt')(e.target.value)} className="field h-10" />
          </Field>
        </div>
        <Field label="Who was there">
          <PersonPicker value={current.people} onChange={set('people')} />
        </Field>
        <Field label="Project (optional)">
          <ProjectPicker value={current.project} onChange={set('project')} />
        </Field>
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  )
}

export default function Discussions() {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const debounced = useDebounced(search)
  const { data, loading, error } = useQuery(DISCUSSIONS, { search: debounced || null })
  const list = data?.discussions || []

  return (
    <div>
      <PageHeader
        icon={MessagesSquare}
        title="Discussions"
        subtitle="Meetings, calls and chats — with every call-to-action captured."
        actions={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> New discussion</Button>}
      />
      <div className="relative mb-5 max-w-md">
        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search titles and notes…" className="field h-10 pl-9" />
      </div>
      {loading && !data && <PageLoader />}
      <ErrorBox error={error} />
      {data && !list.length && (
        <EmptyState icon={MessagesSquare} title="No discussions yet" action={<Button onClick={() => setOpen(true)}>Log your first one</Button>}>
          Before a meeting starts, create a discussion and type rough notes as people talk. Afterwards, turn the action items into tasks.
        </EmptyState>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        {list.map((d, i) => (
          <motion.div key={d.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.03, 0.3) }}>
            <Link to={`/discussions/${d.id}`} className="card block p-4 transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400">{d.kindLabel} · {formatDateTime(d.occurredAt)}</p>
                  <p className="mt-1 truncate font-display font-semibold text-slate-900 dark:text-white">{d.title}</p>
                </div>
                <AvatarStack people={d.participants} />
              </div>
              {d.summary && <p className="mt-2 line-clamp-2 text-sm text-slate-500">{d.summary}</p>}
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <ProjectChip project={d.project} />
                {d.rawCaptureCount > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                    <StickyNote className="h-3 w-3" /> {d.rawCaptureCount} to organize
                  </span>
                )}
                {d.openTaskCount > 0 && <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">{d.openTaskCount} open task{d.openTaskCount > 1 ? 's' : ''}</span>}
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
      <NewDiscussionModal open={open} onClose={() => setOpen(false)} />
    </div>
  )
}
