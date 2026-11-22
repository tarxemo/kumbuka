const DAY = 86400000

export function toISODate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayISO() {
  return toISODate(new Date())
}

/** Parse 'YYYY-MM-DD' as a local date (not UTC). */
export function parseISODate(s) {
  if (!s) return null
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

export function startOfDay(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export function daysFromToday(iso) {
  const d = parseISODate(iso)
  if (!d) return null
  return Math.round((startOfDay(d) - startOfDay(new Date())) / DAY)
}

/** Friendly due label + tone. */
export function dueInfo(iso, isOpen = true) {
  if (!iso) return null
  const diff = daysFromToday(iso)
  const d = parseISODate(iso)
  let label
  if (diff === 0) label = 'Today'
  else if (diff === 1) label = 'Tomorrow'
  else if (diff === -1) label = 'Yesterday'
  else if (diff > 1 && diff < 7) label = d.toLocaleDateString(undefined, { weekday: 'long' })
  else label = d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', ...(d.getFullYear() !== new Date().getFullYear() ? { year: 'numeric' } : {}) })
  let tone = 'neutral'
  if (isOpen) {
    if (diff < 0) tone = 'overdue'
    else if (diff === 0) tone = 'today'
    else if (diff <= 2) tone = 'soon'
  }
  if (isOpen && diff < -1) label = `${label} · ${Math.abs(diff)}d late`
  return { label, tone, diff }
}

export function timeAgo(isoDateTime) {
  if (!isoDateTime) return ''
  const then = new Date(isoDateTime)
  const s = Math.round((Date.now() - then.getTime()) / 1000)
  if (s < 45) return 'just now'
  const m = Math.round(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.round(h / 24)
  if (d < 7) return `${d}d ago`
  return then.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: d > 300 ? 'numeric' : undefined })
}

export function formatDateTime(isoDateTime) {
  if (!isoDateTime) return ''
  return new Date(isoDateTime).toLocaleString(undefined, {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

/** Value for <input type="datetime-local"> from an ISO string (local time). */
export function toLocalInput(isoDateTime) {
  const d = isoDateTime ? new Date(isoDateTime) : new Date()
  const off = d.getTimezoneOffset()
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16)
}

export function fromLocalInput(value) {
  return value ? new Date(value).toISOString() : null
}

export function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export function nextMonday() {
  const d = new Date()
  const add = ((8 - d.getDay()) % 7) || 7
  return addDays(d, add)
}
