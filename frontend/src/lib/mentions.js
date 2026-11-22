import { useEffect, useState } from 'react'
import { gql, tokenStore } from './api'
import { MENTIONABLES } from './queries'

/*
  Shared cache of people + projects for @ / # autocomplete.

  - Loaded with ONE query, once, and shared by every input in the app.
  - After any mutation ('kumbuka:changed') the cache is only marked stale — it
    is NOT refetched then. It reloads once, the next time an input is focused.
  - Typing never hits the backend; matching is done locally.
*/

let cache = { people: [], projects: [] }
let loadedFor = null // token the cache belongs to (so switching accounts never shows old data)
let stale = true
let inflight = null
const listeners = new Set()

const emit = () => listeners.forEach((fn) => fn(cache))

if (typeof window !== 'undefined') {
  window.addEventListener('kumbuka:changed', () => { stale = true })
  window.addEventListener('kumbuka:unauthorized', () => { cache = { people: [], projects: [] }; loadedFor = null; stale = true; emit() })
}

/** Load if missing or stale. Cheap to call often: deduped, and a no-op when fresh. */
export function loadMentionables() {
  const token = tokenStore.get()
  if (!token) return Promise.resolve(cache)
  if (!stale && loadedFor === token) return Promise.resolve(cache)
  if (inflight) return inflight
  inflight = gql(MENTIONABLES)
    .then((d) => {
      cache = { people: d.people, projects: d.projects }
      loadedFor = token
      stale = false
      emit()
      return cache
    })
    .catch(() => cache)
    .finally(() => { inflight = null })
  return inflight
}

export function useMentionables() {
  const [data, setData] = useState(cache)
  useEffect(() => {
    listeners.add(setData)
    if (loadedFor === tokenStore.get()) setData(cache)
    return () => { listeners.delete(setData) }
  }, [])
  return data
}

/** Find an existing record by exact (case-insensitive) name. */
export function findByName(list, name) {
  const n = (name || '').trim().toLowerCase()
  return n ? list.find((x) => x.name.toLowerCase() === n) : undefined
}

/** Rank: name starts with query > a word starts with it > contains it (also role/org for people). */
export function matchMentions(list, query, limit = 6) {
  const q = query.trim().toLowerCase()
  if (!q) return list.slice(0, limit)
  const scored = []
  for (const item of list) {
    const name = item.name.toLowerCase()
    let score = -1
    if (name.startsWith(q)) score = 0
    else if (name.split(/\s+/).some((w) => w.startsWith(q))) score = 1
    else if (name.includes(q)) score = 2
    else if ([item.role, item.organization].some((v) => v && v.toLowerCase().includes(q))) score = 3
    if (score >= 0) scored.push([score, item])
  }
  return scored.sort((a, b) => a[0] - b[0] || a[1].name.localeCompare(b[1].name)).slice(0, limit).map((s) => s[1])
}

/** Text to insert for a picked record, in a form lib/parse.js understands. */
export function mentionToken(trigger, name) {
  // Same single-word character sets as lib/parse.js (projects don't allow apostrophes).
  const simple = trigger === '@' ? /^[\p{L}\p{N}_'-]+$/u : /^[\p{L}\p{N}_-]+$/u
  return simple.test(name) ? `${trigger}${name}` : `${trigger}[${name}]`
}
