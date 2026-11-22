import { ArrowLeft, Building2, CheckCheck, Mail, MessagesSquare, Pencil, Phone, Plus, Trash2, UserCheck, Users } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { TaskList } from '../components/TaskRow'
import { Avatar, Button, Confirm, ErrorBox, PageLoader, Section } from '../components/ui'
import { useActions } from '../lib/actions'
import { mutate, useQuery } from '../lib/api'
import { formatDateTime } from '../lib/dates'
import { DELETE_PERSON, PERSON } from '../lib/queries'
import { NewDiscussionModal } from './Discussions'
import { PersonFormModal } from './People'

export default function PersonDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { newTask } = useActions()
  const { data, loading, error } = useQuery(PERSON, { id })
  const [edit, setEdit] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [discussion, setDiscussion] = useState(false)
  const p = data?.person

  if (loading && !p) return <PageLoader />
  if (error && !p) return <ErrorBox error={error} />
  if (!p) return <p className="text-sm text-slate-500">Person not found.</p>

  const ref = { id: p.id, name: p.name, initials: p.initials }
  const requestedIds = new Set(p.requestedOpenTasks.map((t) => t.id))
  const involved = p.openTasks.filter((t) => !requestedIds.has(t.id))

  return (
    <div>
      <Link to="/people" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600"><ArrowLeft className="h-4 w-4" /> People</Link>
      <div className="card mb-6 flex flex-wrap items-center gap-5 p-6">
        <Avatar name={p.name} initials={p.initials} size="xl" />
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">{p.name}</h1>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
            {p.role && <span className="inline-flex items-center gap-1.5"><UserCheck className="h-4 w-4" />{p.role}</span>}
            {p.organization && <span className="inline-flex items-center gap-1.5"><Building2 className="h-4 w-4" />{p.organization}</span>}
            {p.email && <a href={`mailto:${p.email}`} className="inline-flex items-center gap-1.5 hover:text-indigo-600"><Mail className="h-4 w-4" />{p.email}</a>}
            {p.phone && <a href={`tel:${p.phone}`} className="inline-flex items-center gap-1.5 hover:text-indigo-600"><Phone className="h-4 w-4" />{p.phone}</a>}
          </div>
          {p.notes && <p className="mt-3 max-w-2xl text-sm whitespace-pre-wrap text-slate-600 dark:text-slate-300">{p.notes}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setDiscussion(true)}><MessagesSquare className="h-4 w-4" /> Log discussion</Button>
          <Button onClick={() => newTask({ people: [ref] })}><Plus className="h-4 w-4" /> Task</Button>
          <Button variant="ghost" onClick={() => setEdit(true)} title="Edit"><Pencil className="h-4 w-4" /></Button>
          <Button variant="ghost" onClick={() => setConfirm(true)} title="Delete"><Trash2 className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div>
          <Section title={`What ${p.name.split(' ')[0]} asked you to do`} icon={UserCheck} tone="indigo" count={p.requestedOpenTasks.length}
            action={<Button size="sm" variant="ghost" onClick={() => newTask({ requestedBy: ref })}><Plus className="h-3.5 w-3.5" /> Add</Button>}>
            <TaskList tasks={p.requestedOpenTasks} empty={<p className="card px-4 py-3 text-sm text-slate-400">Nothing open that {p.name.split(' ')[0]} requested.</p>} />
          </Section>
          <Section title="Other open tasks involving them" icon={Users} count={involved.length}>
            <TaskList tasks={involved} empty={<p className="card px-4 py-3 text-sm text-slate-400">None.</p>} />
          </Section>
          {p.doneTasks.length > 0 && (
            <Section title="Recently completed" icon={CheckCheck} tone="emerald" count={p.doneTasks.length}>
              <TaskList tasks={p.doneTasks} compact />
            </Section>
          )}
        </div>
        <Section title="Discussions" icon={MessagesSquare}>
          <div className="card divide-y divide-slate-100 dark:divide-slate-800">
            {!p.recentDiscussions.length && <p className="px-4 py-3 text-sm text-slate-400">No discussions with them yet.</p>}
            {p.recentDiscussions.map((x) => (
              <Link key={x.id} to={`/discussions/${x.id}`} className="block px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <p className="truncate text-sm font-medium">{x.title}</p>
                <p className="text-xs text-slate-400">{x.kindLabel} · {formatDateTime(x.occurredAt)}</p>
              </Link>
            ))}
          </div>
        </Section>
      </div>

      <PersonFormModal open={edit} onClose={() => setEdit(false)} person={p} />
      <NewDiscussionModal open={discussion} onClose={() => setDiscussion(false)} initialPeople={[ref]} />
      <Confirm open={confirm} onClose={() => setConfirm(false)} title={`Remove ${p.name}?`}
        onConfirm={async () => { await mutate(DELETE_PERSON, { id: p.id }); navigate('/people') }}>
        They'll be removed from tasks and discussions. The tasks themselves are kept.
      </Confirm>
    </div>
  )
}
