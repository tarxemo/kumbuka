import { motion } from 'framer-motion'
import { Archive, ArchiveRestore, FolderKanban, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Confirm, EmptyState, ErrorBox, Field, IconButton, Modal, PageHeader, PageLoader } from '../components/ui'
import { mutate, useQuery } from '../lib/api'
import { cx, PROJECT_COLORS, projectColor } from '../lib/meta'
import { CREATE_PROJECT, DELETE_PROJECT, PROJECTS, UPDATE_PROJECT } from '../lib/queries'

function ProjectModal({ open, onClose, project }) {
  const [form, setForm] = useState(null)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const current = form || { name: project?.name || '', description: project?.description || '', color: project?.color || 'indigo' }
  const close = () => { setForm(null); setError(null); onClose() }

  const submit = async (e) => {
    e?.preventDefault()
    setSaving(true)
    setError(null)
    try {
      if (project) await mutate(UPDATE_PROJECT, { id: project.id, input: current })
      else await mutate(CREATE_PROJECT, { input: current })
      close()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={close} title={project ? 'Edit project' : 'New project'} size="sm"
      footer={<><Button variant="secondary" onClick={close}>Cancel</Button><Button onClick={submit} loading={saving}>Save</Button></>}>
      <form onSubmit={submit} className="space-y-4">
        {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
        <Field label="Name"><input autoFocus value={current.name} onChange={(e) => setForm({ ...current, name: e.target.value })} className="field h-10" /></Field>
        <Field label="Description"><textarea rows={2} value={current.description} onChange={(e) => setForm({ ...current, description: e.target.value })} className="field resize-y" /></Field>
        <Field label="Color">
          <div className="flex flex-wrap gap-2">
            {Object.keys(PROJECT_COLORS).map((c) => (
              <button type="button" key={c} onClick={() => setForm({ ...current, color: c })}
                className={cx('h-8 w-8 rounded-full transition', PROJECT_COLORS[c].dot, current.color === c ? 'ring-4 ring-offset-2 ring-slate-300 dark:ring-slate-600 dark:ring-offset-slate-900' : 'opacity-70 hover:opacity-100')} />
            ))}
          </div>
        </Field>
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  )
}

export default function Projects() {
  const [showArchived, setShowArchived] = useState(false)
  const { data, loading, error } = useQuery(PROJECTS, { includeArchived: showArchived })
  const [modal, setModal] = useState({ open: false, project: null })
  const [toDelete, setToDelete] = useState(null)
  const projects = data?.projects || []

  return (
    <div>
      <PageHeader icon={FolderKanban} title="Projects" subtitle="Group related tasks and discussions. Optional, but helpful when work piles up."
        actions={<>
          <Button variant="ghost" size="sm" onClick={() => setShowArchived((s) => !s)}>{showArchived ? 'Hide archived' : 'Show archived'}</Button>
          <Button onClick={() => setModal({ open: true, project: null })}><Plus className="h-4 w-4" /> New project</Button>
        </>} />
      {loading && !data && <PageLoader />}
      <ErrorBox error={error} />
      {data && !projects.length && (
        <EmptyState icon={FolderKanban} title="No projects yet" action={<Button onClick={() => setModal({ open: true, project: null })}>Create a project</Button>}>
          Tip: typing <b>#ProjectName</b> in quick capture creates one automatically.
        </EmptyState>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((p, i) => {
          const c = projectColor(p.color)
          const total = p.openTaskCount + p.doneTaskCount
          const pct = total ? Math.round((p.doneTaskCount / total) * 100) : 0
          return (
            <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.04, 0.3) }}
              className={cx('card group relative overflow-hidden p-5', p.archived && 'opacity-60')}>
              <span className={cx('absolute inset-x-0 top-0 h-1', c.bar)} />
              <div className="flex items-start justify-between gap-2">
                <Link to={`/tasks?project=${p.id}`} className="min-w-0">
                  <p className="truncate font-display text-lg font-semibold text-slate-900 hover:text-indigo-600 dark:text-white">{p.name}</p>
                  {p.description && <p className="mt-0.5 line-clamp-2 text-sm text-slate-500">{p.description}</p>}
                </Link>
                <div className="flex opacity-0 transition group-hover:opacity-100">
                  <IconButton title="Edit" onClick={() => setModal({ open: true, project: p })}><Pencil className="h-4 w-4" /></IconButton>
                  <IconButton title={p.archived ? 'Restore' : 'Archive'} onClick={() => mutate(UPDATE_PROJECT, { id: p.id, input: { name: p.name, archived: !p.archived } })}>
                    {p.archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                  </IconButton>
                  <IconButton title="Delete" onClick={() => setToDelete(p)}><Trash2 className="h-4 w-4" /></IconButton>
                </div>
              </div>
              <div className="mt-5 flex items-end justify-between text-sm">
                <span><b className="font-display text-2xl text-slate-900 dark:text-white">{p.openTaskCount}</b> <span className="text-slate-500">open</span></span>
                <span className="text-xs text-slate-400">{p.doneTaskCount} done · {pct}%</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <motion.div className={cx('h-full rounded-full', c.bar)} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6 }} />
              </div>
            </motion.div>
          )
        })}
      </div>
      <ProjectModal key={modal.project?.id || 'new'} open={modal.open} project={modal.project} onClose={() => setModal({ open: false, project: null })} />
      <Confirm open={!!toDelete} onClose={() => setToDelete(null)} title={`Delete ${toDelete?.name}?`}
        onConfirm={async () => { await mutate(DELETE_PROJECT, { id: toDelete.id }); setToDelete(null) }}>
        Tasks and discussions in this project are kept, just without a project.
      </Confirm>
    </div>
  )
}
