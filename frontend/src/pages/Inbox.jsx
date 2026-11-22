import { AnimatePresence, motion } from 'framer-motion'
import { Archive, ArchiveRestore, ArrowRight, Check, Inbox as InboxIcon, MessagesSquare, Pencil, Sparkles, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import MentionField from '../components/MentionField'
import { useToast } from '../components/Toast'
import { Button, EmptyState, ErrorBox, IconButton, Kbd, PageHeader, PageLoader, Segmented } from '../components/ui'
import { useActions, useOpenTask } from '../lib/actions'
import { mutate, useQuery } from '../lib/api'
import { timeAgo } from '../lib/dates'
import { ADD_CAPTURE, CAPTURES, DELETE_CAPTURE, UPDATE_CAPTURE } from '../lib/queries'

export function CaptureItem({ capture, showSource = true }) {
  const toast = useToast()
  const { organizeCapture } = useActions()
  const openTask = useOpenTask()
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(capture.text)

  const update = async (vars, msg) => {
    try {
      await mutate(UPDATE_CAPTURE, { id: capture.id, ...vars })
      if (msg) toast(msg, vars.state === 'archived' ? { action: { label: 'Undo', onClick: () => mutate(UPDATE_CAPTURE, { id: capture.id, state: 'raw' }) } } : undefined)
    } catch (err) {
      toast(err.message, { type: 'error' })
    }
  }

  return (
    <motion.div layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 30 }} className="card group flex items-start gap-3 p-4">
      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-amber-400" />
      <div className="min-w-0 flex-1">
        {editing ? (
          <textarea
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={() => { setEditing(false); if (text.trim() && text !== capture.text) update({ text }) }}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); e.currentTarget.blur() } }}
            className="field resize-none"
            rows={2}
          />
        ) : (
          <p className="text-sm whitespace-pre-wrap text-slate-800 dark:text-slate-100" onDoubleClick={() => capture.state === 'raw' && setEditing(true)}>{capture.text}</p>
        )}
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-400">
          <span>{timeAgo(capture.createdAt)}</span>
          {showSource && capture.discussion && (
            <Link to={`/discussions/${capture.discussion.id}`} className="inline-flex items-center gap-1 hover:text-indigo-600">
              <MessagesSquare className="h-3 w-3" /> {capture.discussion.title}
            </Link>
          )}
          {capture.task && (
            <button onClick={() => openTask(capture.task.id)} className="inline-flex items-center gap-1 font-medium text-emerald-600 hover:underline">
              <Check className="h-3 w-3" /> {capture.task.title}
            </button>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {capture.state === 'raw' ? (
          <>
            <Button size="sm" variant="soft" onClick={() => organizeCapture(capture)}><Sparkles className="h-3.5 w-3.5" /> Make task</Button>
            <IconButton title="Edit" onClick={() => setEditing(true)} className="opacity-60 group-hover:opacity-100"><Pencil className="h-4 w-4" /></IconButton>
            <IconButton title="Archive (just info, no action)" onClick={() => update({ state: 'archived' }, 'Archived')} className="opacity-60 group-hover:opacity-100"><Archive className="h-4 w-4" /></IconButton>
          </>
        ) : (
          <IconButton title="Move back to inbox" onClick={() => update({ state: 'raw' }, 'Back in inbox')}><ArchiveRestore className="h-4 w-4" /></IconButton>
        )}
        <IconButton title="Delete" onClick={() => mutate(DELETE_CAPTURE, { id: capture.id })} className="opacity-60 group-hover:opacity-100 hover:text-rose-500"><Trash2 className="h-4 w-4" /></IconButton>
      </div>
    </motion.div>
  )
}

export default function Inbox() {
  const toast = useToast()
  const [state, setState] = useState('raw')
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const { data, loading, error } = useQuery(CAPTURES, { state })
  const captures = data?.captures || []

  const add = async () => {
    if (!text.trim()) return
    setSaving(true)
    try {
      await mutate(ADD_CAPTURE, { text })
      setText('')
    } catch (err) {
      toast(err.message, { type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader icon={InboxIcon} title="Inbox" subtitle="Rough notes land here. Turn each one into a clear task — or archive it if it's just information." />

      <div className="card mb-6 p-2">
        <MentionField
          as="textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); add() } }}
          rows={2}
          placeholder="Write it down before you forget… (Enter to save)"
          className="w-full resize-none bg-transparent px-3 py-2 text-base outline-none placeholder:text-slate-400"
        />
        <div className="flex items-center justify-between px-3 pb-1">
          <span className="text-xs text-slate-400"><Kbd>Enter</Kbd> save · <Kbd>Shift</Kbd>+<Kbd>Enter</Kbd> new line</span>
          <Button size="sm" onClick={add} loading={saving}>Save note <ArrowRight className="h-3.5 w-3.5" /></Button>
        </div>
      </div>

      <div className="mb-4">
        <Segmented
          value={state}
          onChange={setState}
          options={[
            { value: 'raw', label: 'To organize' },
            { value: 'converted', label: 'Organized' },
            { value: 'archived', label: 'Archived' },
          ]}
        />
      </div>

      {loading && !data ? <PageLoader /> : <ErrorBox error={error} />}
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {captures.map((c) => <CaptureItem key={c.id} capture={c} />)}
        </AnimatePresence>
      </div>
      {data && !captures.length && (
        <EmptyState icon={InboxIcon} title={state === 'raw' ? 'Inbox zero!' : 'Nothing here yet'}>
          {state === 'raw' ? 'Every rough note has been organized. Press N anytime to capture something new.' : 'Notes you process will appear here.'}
        </EmptyState>
      )}
    </div>
  )
}
