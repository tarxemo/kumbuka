import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRight, CalendarDays, ClipboardCheck, FolderKanban, Inbox, ListTodo, MessagesSquare, Plus, Search, StickyNote, Users,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { gql, useDebounced } from '../lib/api'
import { cx, projectColor, STATUS } from '../lib/meta'
import { SEARCH } from '../lib/queries'
import { Avatar, Kbd, Spinner } from './ui'

const PAGES = [
  { label: 'Today', to: '/', icon: CalendarDays },
  { label: 'Inbox — rough notes', to: '/inbox', icon: Inbox },
  { label: 'All tasks', to: '/tasks', icon: ListTodo },
  { label: 'Discussions', to: '/discussions', icon: MessagesSquare },
  { label: 'People', to: '/people', icon: Users },
  { label: 'Projects', to: '/projects', icon: FolderKanban },
  { label: 'Daily review', to: '/review', icon: ClipboardCheck },
]

export default function CommandPalette({ open, onClose, onNewTask, onCapture, openTask }) {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [res, setRes] = useState(null)
  const [loading, setLoading] = useState(false)
  const [active, setActive] = useState(0)
  const debounced = useDebounced(q, 180)

  useEffect(() => {
    if (open) { setQ(''); setRes(null); setActive(0) }
  }, [open])

  useEffect(() => {
    if (!debounced.trim()) { setRes(null); return }
    let alive = true
    setLoading(true)
    gql(SEARCH, { q: debounced })
      .then((d) => { if (alive) setRes(d.search) })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [debounced])

  const items = useMemo(() => {
    const list = []
    const query = q.trim().toLowerCase()
    if (q.trim()) {
      list.push({ group: 'Create', icon: Plus, label: `New task “${q.trim()}”`, run: () => onNewTask({ title: q.trim() }) })
      list.push({ group: 'Create', icon: StickyNote, label: `Save as rough note “${q.trim()}”`, run: () => onCapture(q.trim()) })
    }
    if (res) {
      res.tasks.forEach((t) => list.push({
        group: 'Tasks', label: t.title, run: () => openTask(t.id),
        left: <span className={cx('h-2 w-2 rounded-full', STATUS[t.status]?.dot)} />,
        right: t.project && <span className="text-xs text-slate-400">{t.project.name}</span>,
      }))
      res.people.forEach((p) => list.push({
        group: 'People', label: p.name, sub: p.role, run: () => navigate(`/people/${p.id}`),
        left: <Avatar name={p.name} initials={p.initials} size="xs" className="ring-0" />,
      }))
      res.discussions.forEach((d) => list.push({ group: 'Discussions', icon: MessagesSquare, label: d.title, sub: d.kindLabel, run: () => navigate(`/discussions/${d.id}`) }))
      res.projects.forEach((p) => list.push({
        group: 'Projects', label: p.name, run: () => navigate(`/tasks?project=${p.id}`),
        left: <span className={cx('h-2.5 w-2.5 rounded-full', projectColor(p.color).dot)} />,
      }))
      res.captures.forEach((c) => list.push({ group: 'Rough notes', icon: StickyNote, label: c.text, run: () => navigate('/inbox') }))
    }
    PAGES.filter((p) => !query || p.label.toLowerCase().includes(query)).forEach((p) =>
      list.push({ group: 'Go to', icon: p.icon, label: p.label, run: () => navigate(p.to) }))
    return list
  }, [q, res, navigate, onNewTask, onCapture, openTask])

  const choose = (item) => { onClose(); setTimeout(item.run, 0) }

  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, items.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)) }
    if (e.key === 'Enter' && items[active]) { e.preventDefault(); choose(items[active]) }
    if (e.key === 'Escape') onClose()
  }

  let lastGroup = null
  return (
    <AnimatePresence>
      {open && (
        <motion.div data-modal-open="" className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[12vh]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97 }}
            className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="flex items-center gap-3 border-b border-slate-100 px-4 dark:border-slate-800">
              {loading ? <Spinner className="h-5 w-5 text-indigo-500" /> : <Search className="h-5 w-5 text-slate-400" />}
              <input
                autoFocus
                value={q}
                onChange={(e) => { setQ(e.target.value); setActive(0) }}
                onKeyDown={onKey}
                placeholder="Search tasks, people, discussions… or type to create"
                className="h-14 flex-1 bg-transparent text-base outline-none placeholder:text-slate-400"
              />
              <Kbd>Esc</Kbd>
            </div>
            <div className="max-h-[55vh] overflow-y-auto p-2 scroll-thin">
              {items.map((item, i) => {
                const header = item.group !== lastGroup ? item.group : null
                lastGroup = item.group
                return (
                  <div key={`${item.group}-${i}`}>
                    {header && <p className="px-3 pt-3 pb-1 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">{header}</p>}
                    <button
                      onMouseEnter={() => setActive(i)}
                      onClick={() => choose(item)}
                      className={cx('flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm', active === i && 'bg-indigo-50 text-indigo-900 dark:bg-indigo-500/15 dark:text-indigo-100')}
                    >
                      <span className="flex h-5 w-5 items-center justify-center text-slate-400">
                        {item.left || (item.icon && <item.icon className="h-4 w-4" />)}
                      </span>
                      <span className="min-w-0 flex-1 truncate">
                        {item.label}
                        {item.sub && <span className="ml-2 text-xs text-slate-400">{item.sub}</span>}
                      </span>
                      {item.right}
                      {active === i && <ArrowRight className="h-4 w-4 text-indigo-500" />}
                    </button>
                  </div>
                )
              })}
              {q.trim() && res && !loading && res.tasks.length + res.people.length + res.discussions.length === 0 && (
                <p className="px-3 py-2 text-xs text-slate-400">No matches — you can create it above.</p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
