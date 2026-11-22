import { FolderKanban, User } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { cx, projectColor } from '../lib/meta'
import { loadMentionables, matchMentions, mentionToken, useMentionables } from '../lib/mentions'
import { Avatar } from './ui'

// Token being typed right before the caret: "@kir", "#fin", "@[Kirsten Mo"
const BRACKET = /(^|\s)([@#])\[([^\]\n]*)$/u
const PLAIN = /(^|\s)([@#])([\p{L}\p{N}_'-]*)$/u

export function findTrigger(value, caret) {
  const before = value.slice(0, caret)
  const m = before.match(BRACKET) || before.match(PLAIN)
  if (!m) return null
  const bracket = m[0].trimStart().charAt(1) === '['
  const start = m.index + m[1].length
  // Also replace the rest of the word (or bracket) after the caret, so picking mid-word works.
  const rest = value.slice(caret)
  const tail = bracket ? (rest.match(/^[^\]\n]*\]/)?.[0] ?? '') : rest.match(/^[\p{L}\p{N}_'-]*/u)[0]
  return { trigger: m[2], query: m[3], start, end: caret + tail.length }
}

/**
 * <input>/<textarea> with @person and #project autocomplete from the shared
 * cache (lib/mentions.js). Drop-in: takes value/onChange/onKeyDown/etc.
 *
 * inline: render the menu in normal flow (for containers with overflow-hidden).
 */
export default function MentionField({ as: Tag = 'input', value, onChange, onKeyDown, onFocus, onBlur, inline = false, wrapperClassName, ref, ...rest }) {
  const { people, projects } = useMentionables()
  const inner = useRef(null)
  const [trig, setTrig] = useState(null)
  const [active, setActive] = useState(0)
  const [dismissedAt, setDismissedAt] = useState(null) // Esc hides the menu until the token changes

  const setRefs = useCallback((el) => {
    inner.current = el
    if (typeof ref === 'function') ref(el)
    else if (ref) ref.current = el
  }, [ref])

  const sync = () => {
    const el = inner.current
    if (!el || document.activeElement !== el) return setTrig(null)
    setTrig(findTrigger(el.value, el.selectionStart ?? el.value.length))
  }

  // Re-check after every value change (typing, programmatic resets).
  useEffect(sync, [value])

  const key = trig ? `${trig.start}:${trig.trigger}${trig.query}` : null
  useEffect(() => { setActive(0) }, [key])

  const list = trig ? (trig.trigger === '@' ? people : projects) : []
  const items = trig && dismissedAt !== key ? matchMentions(list, trig.query) : []
  const open = items.length > 0

  const pick = (item) => {
    const token = `${mentionToken(trig.trigger, item.name)} `
    const next = value.slice(0, trig.start) + token + value.slice(trig.end).replace(/^ /, '')
    const caret = trig.start + token.length
    onChange({ target: { value: next } })
    setTrig(null)
    requestAnimationFrame(() => {
      const el = inner.current
      if (el) { el.focus(); el.setSelectionRange(caret, caret) }
    })
  }

  const handleKeyDown = (e) => {
    if (open) {
      const stop = () => { e.preventDefault(); e.stopPropagation() }
      if (e.key === 'ArrowDown') { stop(); setActive((a) => (a + 1) % items.length); return }
      if (e.key === 'ArrowUp') { stop(); setActive((a) => (a - 1 + items.length) % items.length); return }
      if ((e.key === 'Enter' && !e.shiftKey) || e.key === 'Tab') { stop(); pick(items[Math.min(active, items.length - 1)]); return }
      if (e.key === 'Escape') { stop(); setDismissedAt(key); return }
    }
    onKeyDown?.(e)
  }

  const menu = open && (
    <div
      role="listbox"
      className={cx(
        'z-40 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 text-left shadow-xl dark:border-slate-700 dark:bg-slate-900',
        inline ? 'mx-3 mb-2' : 'absolute top-full right-0 left-0 mt-1.5',
      )}
    >
      <p className="flex items-center gap-1.5 px-2.5 pt-1 pb-1.5 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
        {trig.trigger === '@' ? <><User className="h-3 w-3" /> People</> : <><FolderKanban className="h-3 w-3" /> Projects</>}
        <span className="ml-auto font-normal tracking-normal normal-case">↑↓ · Enter / Tab · Esc</span>
      </p>
      {items.map((item, i) => (
        <button
          type="button"
          role="option"
          aria-selected={i === active}
          key={item.id}
          onMouseDown={(e) => e.preventDefault()} // keep focus in the field
          onMouseEnter={() => setActive(i)}
          onClick={() => pick(item)}
          className={cx('flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm', i === active && 'bg-indigo-50 text-indigo-900 dark:bg-indigo-500/15 dark:text-indigo-100')}
        >
          {trig.trigger === '@'
            ? <Avatar name={item.name} initials={item.initials} size="sm" className="ring-0" />
            : <span className={cx('mx-1.5 h-2.5 w-2.5 shrink-0 rounded-full', projectColor(item.color).dot)} />}
          <span className="min-w-0 flex-1 truncate font-medium">{item.name}</span>
          {(item.role || item.organization) && (
            <span className="truncate text-xs text-slate-400">{[item.role, item.organization].filter(Boolean).join(' · ')}</span>
          )}
        </button>
      ))}
    </div>
  )

  return (
    <div className={cx(!inline && 'relative', wrapperClassName)}>
      <Tag
        ref={setRefs}
        value={value}
        onChange={onChange}
        onKeyDown={handleKeyDown}
        onKeyUp={(e) => { if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) sync() }}
        onClick={sync}
        onFocus={(e) => { loadMentionables(); sync(); onFocus?.(e) }}
        onBlur={(e) => { setTrig(null); onBlur?.(e) }}
        autoComplete="off"
        {...rest}
      />
      {menu}
    </div>
  )
}
