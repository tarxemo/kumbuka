import { AnimatePresence, motion } from 'framer-motion'
import {
  CalendarDays, ClipboardCheck, FolderKanban, Inbox, ListTodo, LogOut, Menu, MessagesSquare, Moon, Plus, Search,
  Settings, Sun, Users, X, Zap,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { mutate, useQuery } from '../lib/api'
import { ActionsContext, useOpenTask } from '../lib/actions'
import { useAuth, useTheme } from '../lib/auth'
import { cx, projectColor } from '../lib/meta'
import { ADD_CAPTURE, INBOX_COUNT, PROJECTS } from '../lib/queries'
import CommandPalette from './CommandPalette'
import QuickCapture from './QuickCapture'
import TaskDrawer from './TaskDrawer'
import TaskForm from './TaskForm'
import { useToast } from './Toast'
import { Avatar, Kbd } from './ui'

const NAV = [
  { to: '/', label: 'Today', icon: CalendarDays, end: true },
  { to: '/inbox', label: 'Inbox', icon: Inbox, badge: 'inbox' },
  { to: '/tasks', label: 'Tasks', icon: ListTodo },
  { to: '/discussions', label: 'Discussions', icon: MessagesSquare },
  { to: '/people', label: 'People', icon: Users },
  { to: '/projects', label: 'Projects', icon: FolderKanban },
  { to: '/review', label: 'Daily review', icon: ClipboardCheck },
]

export function Logo({ className }) {
  return (
    <div className={cx('flex items-center gap-2.5', className)}>
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M6 12.5l4 4 8-9" /></svg>
      </span>
      <span className="font-display text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">Kumbuka</span>
    </div>
  )
}

function Sidebar({ onNavigate, onCapture }) {
  const { user, logout } = useAuth()
  const { dark, toggle } = useTheme()
  const navigate = useNavigate()
  const { data: inbox } = useQuery(INBOX_COUNT)
  const { data: projects } = useQuery(PROJECTS, {})
  const inboxCount = inbox?.captures?.length || 0

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <Logo className="px-2 pt-1" />
      <button
        onClick={onCapture}
        className="group flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-3 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:brightness-110"
      >
        <Zap className="h-4 w-4" /> Quick capture
        <span className="ml-auto rounded-md bg-white/20 px-1.5 text-[11px]">N</span>
      </button>
      <nav className="space-y-0.5">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) => cx(
              'relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition',
              isActive ? 'text-indigo-700 dark:text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-slate-100',
            )}
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span layoutId="nav-active" className="absolute inset-0 rounded-xl bg-indigo-50 dark:bg-indigo-500/15" transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }} />
                )}
                <item.icon className="relative h-4.5 w-4.5" />
                <span className="relative">{item.label}</span>
                {item.badge === 'inbox' && inboxCount > 0 && (
                  <span className="relative ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">{inboxCount}</span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {projects?.projects?.length > 0 && (
        <div className="min-h-0 flex-1 overflow-y-auto scroll-thin">
          <p className="px-3 pb-1 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">Projects</p>
          {projects.projects.slice(0, 12).map((p) => (
            <NavLink
              key={p.id}
              to={`/tasks?project=${p.id}`}
              onClick={onNavigate}
              className="flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/70"
            >
              <span className={cx('h-2 w-2 rounded-full', projectColor(p.color).dot)} />
              <span className="flex-1 truncate">{p.name}</span>
              {p.openTaskCount > 0 && <span className="text-xs text-slate-400">{p.openTaskCount}</span>}
            </NavLink>
          ))}
        </div>
      )}
      {!(projects?.projects?.length > 0) && <div className="flex-1" />}

      <div className="rounded-2xl border border-slate-200/80 p-2 dark:border-slate-800">
        <div className="flex items-center gap-2.5 px-1 py-1">
          <Avatar name={user?.fullName} initials={user?.initials} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{user?.fullName}</p>
            <p className="truncate text-xs text-slate-400">{user?.jobTitle || user?.email}</p>
          </div>
        </div>
        <div className="mt-1 flex gap-1">
          <button onClick={toggle} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" title="Toggle theme">
            {dark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />} {dark ? 'Light' : 'Dark'}
          </button>
          <button onClick={() => { navigate('/settings'); onNavigate?.() }} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
            <Settings className="h-3.5 w-3.5" /> Settings
          </button>
          <button onClick={logout} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10" title="Sign out">
            <LogOut className="h-3.5 w-3.5" /> Out
          </button>
        </div>
      </div>
    </div>
  )
}

const isTyping = (e) => {
  const el = e.target
  return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)
}

export default function Layout() {
  const toast = useToast()
  const location = useLocation()
  const openTask = useOpenTask()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [capture, setCapture] = useState({ open: false, text: '' })
  const [taskForm, setTaskForm] = useState({ open: false, initial: null, capture: null })

  useEffect(() => setMobileOpen(false), [location.pathname])

  const newTask = useCallback((initial = null) => setTaskForm({ open: true, initial, capture: null }), [])
  const organizeCapture = useCallback((c, initial = null) => setTaskForm({ open: true, initial, capture: c }), [])
  const quickCapture = useCallback((text = '') => setCapture({ open: true, text }), [])
  const search = useCallback(() => setPaletteOpen(true), [])

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPaletteOpen((o) => !o); return }
      if (isTyping(e) || e.metaKey || e.ctrlKey || e.altKey || document.querySelector('[data-modal-open]')) return
      if (e.key === 'n' || e.key === 'c') { e.preventDefault(); quickCapture() }
      if (e.key === 't') { e.preventDefault(); newTask() }
      if (e.key === '/') { e.preventDefault(); setPaletteOpen(true) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [newTask, quickCapture])

  const actions = useMemo(() => ({ newTask, organizeCapture, quickCapture, search }), [newTask, organizeCapture, quickCapture, search])

  const saveNoteFromPalette = async (text) => {
    try {
      await mutate(ADD_CAPTURE, { text })
      toast('Saved to Inbox')
    } catch (err) {
      toast(err.message, { type: 'error' })
    }
  }

  return (
    <ActionsContext.Provider value={actions}>
      <div className="app-bg flex min-h-full">
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-200/70 bg-white/60 backdrop-blur-xl lg:block dark:border-slate-800 dark:bg-slate-900/50">
          <Sidebar onCapture={() => quickCapture()} />
        </aside>

        <AnimatePresence>
          {mobileOpen && (
            <>
              <motion.div className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileOpen(false)} />
              <motion.aside
                className="fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-2xl lg:hidden dark:bg-slate-900"
                initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              >
                <button className="absolute top-5 right-4 text-slate-400" onClick={() => setMobileOpen(false)}><X className="h-5 w-5" /></button>
                <Sidebar onNavigate={() => setMobileOpen(false)} onCapture={() => { setMobileOpen(false); quickCapture() }} />
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
          <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200/60 bg-slate-50/70 px-4 py-3 backdrop-blur-xl sm:px-6 dark:border-slate-800/60 dark:bg-slate-950/60">
            <button className="rounded-lg p-1.5 text-slate-500 lg:hidden" onClick={() => setMobileOpen(true)}><Menu className="h-5 w-5" /></button>
            <Logo className="lg:hidden" />
            <button
              onClick={() => setPaletteOpen(true)}
              className="ml-auto flex h-10 w-full max-w-md items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-400 shadow-sm transition hover:border-indigo-300 lg:ml-0 dark:border-slate-700 dark:bg-slate-900"
            >
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">Search or jump to…</span>
              <span className="ml-auto hidden gap-1 sm:flex"><Kbd>Ctrl</Kbd><Kbd>K</Kbd></span>
            </button>
            <div className="ml-auto hidden items-center gap-2 sm:flex">
              <button
                onClick={() => newTask()}
                className="flex h-10 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
              >
                <Plus className="h-4 w-4" /> New task <span className="rounded bg-white/15 px-1.5 text-[11px] dark:bg-slate-900/10">T</span>
              </button>
            </div>
          </header>

          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 pb-28 sm:px-6 lg:py-8">
            <motion.div key={location.pathname} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
              <Outlet />
            </motion.div>
          </main>
        </div>

        {/* Mobile floating action button */}
        <button
          onClick={() => quickCapture()}
          className="fixed right-5 bottom-5 z-30 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-xl shadow-indigo-500/40 lg:hidden"
          aria-label="Quick capture"
        >
          <Zap className="h-6 w-6" />
        </button>
      </div>

      <TaskDrawer />
      <QuickCapture open={capture.open} initialText={capture.text} onClose={() => setCapture({ open: false, text: '' })} />
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onNewTask={newTask}
        onCapture={saveNoteFromPalette}
        openTask={openTask}
      />
      <TaskForm
        open={taskForm.open}
        initial={taskForm.initial}
        capture={taskForm.capture}
        onClose={() => setTaskForm((f) => ({ ...f, open: false }))}
      />
    </ActionsContext.Provider>
  )
}
