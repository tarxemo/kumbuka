import { AnimatePresence, motion } from 'framer-motion'
import { Check, Plus, UserPlus, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { gql, useDebounced } from '../lib/api'
import { cx } from '../lib/meta'
import { GET_OR_CREATE_PERSON, PEOPLE } from '../lib/queries'
import { Avatar } from './ui'

/**
 * Search existing people, pick them, or create a new one on the fly.
 * value: array of {id, name} (multi) or a single {id, name} / null (single).
 */
export default function PersonPicker({ value, onChange, multiple = true, placeholder = 'Search or add a person…', autoFocus }) {
  const selected = multiple ? value || [] : value ? [value] : []
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [results, setResults] = useState([])
  const [active, setActive] = useState(0)
  const [busy, setBusy] = useState(false)
  const debounced = useDebounced(query, 150)
  const box = useRef(null)
  const input = useRef(null)

  useEffect(() => {
    if (!open) return
    let alive = true
    gql(PEOPLE, { search: debounced || null, limit: 8 })
      .then((d) => { if (alive) setResults(d.people) })
      .catch(() => {})
    return () => { alive = false }
  }, [debounced, open])

  useEffect(() => {
    const onDoc = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const isSelected = (p) => selected.some((s) => (s.id && s.id === p.id) || s.name.toLowerCase() === p.name.toLowerCase())
  const trimmed = query.trim()
  const exact = results.find((r) => r.name.toLowerCase() === trimmed.toLowerCase())
  const options = [...results.map((r) => ({ type: 'person', person: r }))]
  if (trimmed && !exact) options.push({ type: 'create', name: trimmed })

  const pick = (person) => {
    if (multiple) {
      onChange(isSelected(person) ? selected.filter((s) => s.id !== person.id) : [...selected, person])
    } else {
      onChange(person)
      setOpen(false)
    }
    setQuery('')
    setActive(0)
    input.current?.focus()
  }

  const create = async (name) => {
    setBusy(true)
    try {
      const d = await gql(GET_OR_CREATE_PERSON, { name })
      pick(d.getOrCreatePerson)
    } finally {
      setBusy(false)
    }
  }

  const choose = (opt) => (opt.type === 'create' ? create(opt.name) : pick(opt.person))

  const remove = (p) => onChange(multiple ? selected.filter((s) => s !== p) : null)

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((a) => Math.min(a + 1, options.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)) }
    else if (e.key === 'Enter') {
      if (open && options[active]) { e.preventDefault(); choose(options[active]) }
    } else if (e.key === 'Backspace' && !query && selected.length) {
      remove(selected[selected.length - 1])
    } else if (e.key === 'Escape') {
      if (open) { e.stopPropagation(); setOpen(false) }
    }
  }

  return (
    <div ref={box} className="relative">
      <div
        onClick={() => { setOpen(true); input.current?.focus() }}
        className="field flex min-h-10 cursor-text flex-wrap items-center gap-1.5 py-1.5"
      >
        {selected.map((p) => (
          <span key={p.id || p.name} className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 py-0.5 pr-1 pl-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-200">
            <Avatar name={p.name} initials={p.initials} size="xs" className="ring-0" />
            {p.name}
            {!p.id && <span className="text-[10px] opacity-60">(new)</span>}
            <button type="button" onClick={(e) => { e.stopPropagation(); remove(p) }} className="rounded-full p-0.5 hover:bg-indigo-100 dark:hover:bg-indigo-500/20">
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        {(multiple || !selected.length) && (
          <input
            ref={input}
            autoFocus={autoFocus}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); setActive(0) }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder={selected.length ? '' : placeholder}
            className="min-w-24 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
          />
        )}
      </div>
      <AnimatePresence>
        {open && (options.length > 0 || !trimmed) && (
          <motion.div
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            className="absolute z-30 mt-1.5 max-h-64 w-full overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl scroll-thin dark:border-slate-700 dark:bg-slate-900"
          >
            {options.length === 0 && (
              <p className="px-3 py-2 text-xs text-slate-400">Type a name to find or add someone.</p>
            )}
            {options.map((opt, i) => (
              <button
                type="button"
                key={opt.type === 'create' ? '__create' : opt.person.id}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(opt)}
                className={cx(
                  'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm',
                  i === active ? 'bg-slate-100 dark:bg-slate-800' : '',
                )}
              >
                {opt.type === 'create' ? (
                  <>
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300">
                      {busy ? <Plus className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
                    </span>
                    <span>Add <b>“{opt.name}”</b> as a new person</span>
                  </>
                ) : (
                  <>
                    <Avatar name={opt.person.name} initials={opt.person.initials} size="sm" className="ring-0" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{opt.person.name}</span>
                      {(opt.person.role || opt.person.organization) && (
                        <span className="block truncate text-xs text-slate-400">
                          {[opt.person.role, opt.person.organization].filter(Boolean).join(' · ')}
                        </span>
                      )}
                    </span>
                    {isSelected(opt.person) && <Check className="h-4 w-4 text-indigo-500" />}
                  </>
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
