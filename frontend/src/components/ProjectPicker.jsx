import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronDown, FolderPlus, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { mutate, useQuery } from '../lib/api'
import { cx, projectColor } from '../lib/meta'
import { CREATE_PROJECT, PROJECTS } from '../lib/queries'

export default function ProjectPicker({ value, onChange }) {
  const { data } = useQuery(PROJECTS, {})
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const box = useRef(null)

  useEffect(() => {
    const onDoc = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const projects = (data?.projects || []).filter((p) => p.name.toLowerCase().includes(query.trim().toLowerCase()))
  const exact = (data?.projects || []).some((p) => p.name.toLowerCase() === query.trim().toLowerCase())

  const create = async () => {
    const d = await mutate(CREATE_PROJECT, { input: { name: query.trim() } })
    onChange(d.createProject)
    setQuery('')
    setOpen(false)
  }

  const c = value ? projectColor(value.color) : null

  return (
    <div ref={box} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} className="field flex h-10 items-center justify-between gap-2 text-left">
        {value ? (
          <span className="flex min-w-0 items-center gap-2">
            <span className={cx('h-2.5 w-2.5 shrink-0 rounded-full', c.dot)} />
            <span className="truncate">{value.name}</span>
            {!value.id && <span className="text-xs text-slate-400">(new)</span>}
          </span>
        ) : (
          <span className="text-slate-400">No project</span>
        )}
        <span className="flex items-center gap-1">
          {value && (
            <span role="button" tabIndex={-1} onClick={(e) => { e.stopPropagation(); onChange(null) }} className="rounded p-0.5 text-slate-400 hover:text-slate-700">
              <X className="h-3.5 w-3.5" />
            </span>
          )}
          <ChevronDown className="h-4 w-4 text-slate-400" />
        </span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            className="absolute z-30 mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-900"
          >
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  if (projects[0] && (exact || !query.trim())) { onChange(projects[0]); setOpen(false) }
                  else if (query.trim()) create()
                }
                if (e.key === 'Escape') { e.stopPropagation(); setOpen(false) }
              }}
              placeholder="Find or create project…"
              className="mb-1 w-full rounded-lg bg-slate-50 px-2.5 py-1.5 text-sm outline-none dark:bg-slate-800"
            />
            <div className="max-h-56 overflow-auto scroll-thin">
              {projects.map((p) => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => { onChange(p); setOpen(false); setQuery('') }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <span className={cx('h-2.5 w-2.5 rounded-full', projectColor(p.color).dot)} />
                  <span className="flex-1 truncate">{p.name}</span>
                  {value?.id === p.id && <Check className="h-4 w-4 text-indigo-500" />}
                </button>
              ))}
              {query.trim() && !exact && (
                <button type="button" onClick={create} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-indigo-600 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-indigo-500/10">
                  <FolderPlus className="h-4 w-4" /> Create “{query.trim()}”
                </button>
              )}
              {!projects.length && !query.trim() && <p className="px-3 py-2 text-xs text-slate-400">No projects yet. Type to create one.</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
