import { AnimatePresence, motion } from 'framer-motion'
import { CalendarDays, Check, Flag, FolderKanban, ListTodo, StickyNote, User, Zap } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { mutate } from '../lib/api'
import { dueInfo } from '../lib/dates'
import { cx, PRIORITY } from '../lib/meta'
import { hasTokens, parseQuick } from '../lib/parse'
import { ADD_CAPTURE, CREATE_TASK } from '../lib/queries'
import { useToast } from './Toast'
import { Kbd, Segmented } from './ui'

/** Super fast entry: type, press Enter, keep going. */
export default function QuickCapture({ open, onClose, initialText = '' }) {
  const toast = useToast()
  const [text, setText] = useState('')
  const [mode, setMode] = useState(() => { try { return localStorage.getItem('kumbuka.captureMode') || 'note' } catch { return 'note' } })
  const [added, setAdded] = useState([])
  const [busy, setBusy] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (open) { setText(initialText); setAdded([]); setTimeout(() => ref.current?.focus(), 50) }
  }, [open, initialText])

  useEffect(() => {
    try { localStorage.setItem('kumbuka.captureMode', mode) } catch { /* ignore */ }
  }, [mode])

  const parsed = parseQuick(text)

  const submit = async () => {
    const value = text.trim()
    if (!value || busy) return
    setBusy(true)
    try {
      if (mode === 'note') {
        await mutate(ADD_CAPTURE, { text: value })
      } else {
        await mutate(CREATE_TASK, {
          input: {
            title: parsed.title || value,
            peopleNames: parsed.people,
            priority: parsed.priority || 'medium',
            projectName: parsed.project,
            dueDate: parsed.dueDate,
          },
        })
      }
      setAdded((a) => [{ text: mode === 'task' ? parsed.title || value : value, mode }, ...a].slice(0, 5))
      setText('')
    } catch (err) {
      toast(err.message, { type: 'error' })
    } finally {
      setBusy(false)
      ref.current?.focus()
    }
  }

  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() }
    if (e.key === 'Escape') onClose()
    if (e.key === 'Tab') { e.preventDefault(); setMode((m) => (m === 'note' ? 'task' : 'note')) }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div data-modal-open="" className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[14vh]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between gap-3 px-5 pt-4">
              <span className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                <Zap className="h-4 w-4 text-amber-500" /> Quick capture
              </span>
              <Segmented
                size="sm"
                value={mode}
                onChange={setMode}
                options={[{ value: 'note', label: 'Rough note', icon: StickyNote }, { value: 'task', label: 'Task', icon: ListTodo }]}
              />
            </div>
            <textarea
              ref={ref}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={onKey}
              rows={2}
              placeholder={mode === 'note'
                ? 'Jot it down fast — organize it later from your Inbox…'
                : 'e.g. Prepare cash-flow report for @Asha ^fri !high #Finance'}
              className="w-full resize-none bg-transparent px-5 py-3 text-lg outline-none placeholder:text-slate-400"
            />
            {mode === 'task' && hasTokens(parsed) && (
              <div className="flex flex-wrap gap-1.5 px-5 pb-3">
                {parsed.people.map((p) => <Chip key={p} icon={User}>{p}</Chip>)}
                {parsed.dueDate && <Chip icon={CalendarDays}>{dueInfo(parsed.dueDate).label}</Chip>}
                {parsed.priority && <Chip icon={Flag} className={PRIORITY[parsed.priority].chip}>{PRIORITY[parsed.priority].label}</Chip>}
                {parsed.project && <Chip icon={FolderKanban}>{parsed.project}</Chip>}
              </div>
            )}
            <AnimatePresence>
              {added.length > 0 && (
                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} className="border-t border-slate-100 px-5 py-2 dark:border-slate-800">
                  {added.map((a, i) => (
                    <motion.p key={`${a.text}-${i}`} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2 py-1 text-sm text-slate-500">
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                      <span className="truncate">{a.text}</span>
                      <span className="ml-auto shrink-0 text-xs text-slate-400">{a.mode === 'note' ? 'to Inbox' : 'task added'}</span>
                    </motion.p>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-100 bg-slate-50/70 px-5 py-2.5 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-800/40">
              <span><Kbd>Enter</Kbd> save &amp; keep typing</span>
              <span><Kbd>Shift</Kbd>+<Kbd>Enter</Kbd> new line</span>
              <span><Kbd>Tab</Kbd> switch note/task</span>
              {mode === 'task' && <span className="text-slate-400">@person !high #project ^tomorrow</span>}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function Chip({ icon: Icon, children, className }) {
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-200', className)}>
      <Icon className="h-3 w-3" /> {children}
    </span>
  )
}
