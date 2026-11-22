import { addDays, nextMonday, toISODate } from './dates'

/*
  Smart quick-entry syntax (all optional):
    @Name  or  @[Full Name]  or  @First_Last   -> people involved
    !urgent  !high  !medium  !low  (or !1..!4)  -> priority
    #Project  or  #[Long project name]         -> project
    ^today ^tomorrow ^fri ^nextweek ^3d ^2w ^30/11 ^2026-12-01 -> due date
*/

const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
const PRIORITY_MAP = { urgent: 'urgent', '1': 'urgent', high: 'high', '2': 'high', medium: 'medium', med: 'medium', '3': 'medium', low: 'low', '4': 'low' }

export function parseDue(token, base = new Date()) {
  const t = token.toLowerCase().replace(/[.,;]$/, '')
  if (['today', 'tod', 'leo'].includes(t)) return toISODate(base)
  if (['tomorrow', 'tmr', 'tom', 'kesho'].includes(t)) return toISODate(addDays(base, 1))
  if (['nextweek', 'nw'].includes(t)) return toISODate(nextMonday())
  if (t === 'eow') return toISODate(addDays(base, (5 - base.getDay() + 7) % 7))
  let m = t.match(/^(\d+)([dw])$/)
  if (m) return toISODate(addDays(base, Number(m[1]) * (m[2] === 'w' ? 7 : 1)))
  const wd = WEEKDAYS.findIndex((w) => t.startsWith(w))
  if (wd >= 0 && /^[a-z]+$/.test(t)) {
    const diff = ((wd - base.getDay() + 7) % 7) || 7
    return toISODate(addDays(base, diff))
  }
  m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
  m = t.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/) // dd/mm[/yyyy]
  if (m) {
    let year = m[3] ? Number(m[3]) : base.getFullYear()
    if (year < 100) year += 2000
    const d = new Date(year, Number(m[2]) - 1, Number(m[1]))
    if (!m[3] && d < addDays(base, -1)) d.setFullYear(year + 1)
    return toISODate(d)
  }
  return null
}

export function parseQuick(text, base = new Date()) {
  const people = []
  let priority = null
  let project = null
  let dueDate = null
  let rest = ` ${text} `

  rest = rest.replace(/(\s)@\[([^\]]+)\]/g, (_, sp, name) => { people.push(name.trim()); return sp })
  rest = rest.replace(/(\s)@([\p{L}\p{N}_'-]+)/gu, (_, sp, name) => { people.push(name.replace(/_/g, ' ').trim()); return sp })
  rest = rest.replace(/(\s)!(urgent|high|medium|med|low|[1-4])(?=\s)/gi, (_, sp, p) => { priority = PRIORITY_MAP[p.toLowerCase()]; return sp })
  rest = rest.replace(/(\s)#\[([^\]]+)\]/g, (_, sp, name) => { project = name.trim(); return sp })
  rest = rest.replace(/(\s)#([\p{L}\p{N}_-]+)/gu, (_, sp, name) => { project = name.replace(/_/g, ' '); return sp })
  rest = rest.replace(/(\s)\^(\S+)/g, (whole, sp, token) => {
    const d = parseDue(token, base)
    if (d) { dueDate = d; return sp }
    return whole
  })

  const uniquePeople = [...new Map(people.filter(Boolean).map((p) => [p.toLowerCase(), p])).values()]
  return { title: rest.replace(/\s+/g, ' ').trim(), people: uniquePeople, priority, project, dueDate }
}

export function hasTokens(parsed) {
  return parsed.people.length || parsed.priority || parsed.project || parsed.dueDate
}
