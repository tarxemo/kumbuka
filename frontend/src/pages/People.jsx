import { motion } from 'framer-motion'
import { Plus, Search, Users } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Avatar, Button, EmptyState, ErrorBox, Field, Modal, PageHeader, PageLoader } from '../components/ui'
import { mutate, useDebounced, useQuery } from '../lib/api'
import { CREATE_PERSON, PEOPLE, UPDATE_PERSON } from '../lib/queries'

const BLANK = { name: '', role: '', organization: '', email: '', phone: '', notes: '' }

export function PersonFormModal({ open, onClose, person }) {
  const navigate = useNavigate()
  const [form, setForm] = useState(null)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const current = form || (person ? { ...BLANK, ...Object.fromEntries(Object.keys(BLANK).map((k) => [k, person[k] || ''])) } : BLANK)
  const set = (k) => (e) => setForm({ ...current, [k]: e.target.value })
  const close = () => { setForm(null); setError(null); onClose() }

  const submit = async (e) => {
    e?.preventDefault()
    setSaving(true)
    setError(null)
    try {
      if (person) {
        await mutate(UPDATE_PERSON, { id: person.id, input: current })
        close()
      } else {
        const d = await mutate(CREATE_PERSON, { input: current })
        close()
        navigate(`/people/${d.createPerson.id}`)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={close} title={person ? 'Edit person' : 'Add a person'}
      footer={<><Button variant="secondary" onClick={close}>Cancel</Button><Button onClick={submit} loading={saving}>Save</Button></>}
    >
      <form onSubmit={submit} className="space-y-4">
        {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
        <Field label="Name"><input autoFocus required value={current.name} onChange={set('name')} className="field h-10" /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Role"><input value={current.role} onChange={set('role')} placeholder="e.g. Supervisor" className="field h-10" /></Field>
          <Field label="Team / organization"><input value={current.organization} onChange={set('organization')} className="field h-10" /></Field>
          <Field label="Email"><input type="email" value={current.email} onChange={set('email')} className="field h-10" /></Field>
          <Field label="Phone"><input value={current.phone} onChange={set('phone')} className="field h-10" /></Field>
        </div>
        <Field label="Notes" hint="How they like to work, what they care about, preferred updates…">
          <textarea value={current.notes} onChange={set('notes')} rows={3} className="field resize-y" />
        </Field>
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  )
}

export default function People() {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const debounced = useDebounced(search)
  const { data, loading, error } = useQuery(PEOPLE, { search: debounced || null })
  const people = data?.people || []

  return (
    <div>
      <PageHeader icon={Users} title="People" subtitle="Everyone you work with, and what you owe each of them."
        actions={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Add person</Button>} />
      <div className="relative mb-5 max-w-md">
        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, role, team…" className="field h-10 pl-9" />
      </div>
      {loading && !data && <PageLoader />}
      <ErrorBox error={error} />
      {data && !people.length && (
        <EmptyState icon={Users} title={search ? 'No one matches' : 'No people yet'} action={<Button onClick={() => setOpen(true)}>Add someone</Button>}>
          People are also added automatically when you mention <b>@name</b> or pick them on a task.
        </EmptyState>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {people.map((p, i) => (
          <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.03, 0.3) }}>
            <Link to={`/people/${p.id}`} className="card flex items-center gap-3 p-4 transition hover:-translate-y-0.5 hover:shadow-md">
              <Avatar name={p.name} initials={p.initials} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-slate-900 dark:text-white">{p.name}</p>
                <p className="truncate text-xs text-slate-500">{[p.role, p.organization].filter(Boolean).join(' · ') || 'No role yet'}</p>
              </div>
              {p.openTaskCount > 0 && (
                <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">{p.openTaskCount} open</span>
              )}
            </Link>
          </motion.div>
        ))}
      </div>
      <PersonFormModal open={open} onClose={() => setOpen(false)} />
    </div>
  )
}
