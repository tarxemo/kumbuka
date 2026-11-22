import { useCallback, useEffect, useRef, useState } from 'react'

const BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '')
export const API_URL = `${BASE}/graphql/`
const TOKEN_KEY = 'kumbuka.token'

export const tokenStore = {
  get: () => {
    try { return localStorage.getItem(TOKEN_KEY) } catch { return null }
  },
  set: (t) => {
    try { localStorage.setItem(TOKEN_KEY, t) } catch { /* ignore */ }
  },
  clear: () => {
    try { localStorage.removeItem(TOKEN_KEY) } catch { /* ignore */ }
  },
}

/** Send one GraphQL request. Throws an Error with a friendly message on failure. */
export async function gql(query, variables = {}) {
  const token = tokenStore.get()
  let res
  try {
    res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ query, variables }),
    })
  } catch {
    throw new Error('Cannot reach the Kumbuka server. Is the backend running?')
  }
  let json
  try {
    json = await res.json()
  } catch {
    throw new Error(`Server error (${res.status}).`)
  }
  if (json.errors?.length) {
    const message = json.errors[0].message || 'Something went wrong.'
    if (/sign in to continue/i.test(message)) window.dispatchEvent(new Event('kumbuka:unauthorized'))
    throw new Error(message)
  }
  return json.data
}

/** Tell every mounted query that data changed, so they refresh quietly. */
export function notifyChange() {
  window.dispatchEvent(new Event('kumbuka:changed'))
}

/** Run a mutation and refresh the screens afterwards. */
export async function mutate(query, variables) {
  const data = await gql(query, variables)
  notifyChange()
  return data
}

/**
 * Minimal data hook: loads on mount / when variables change, and refreshes
 * silently whenever any mutation happens anywhere in the app.
 */
export function useQuery(query, variables = {}, { skip = false } = {}) {
  const key = JSON.stringify(variables)
  const [state, setState] = useState({ data: null, loading: !skip, error: null })
  const requestId = useRef(0)

  const run = useCallback(
    async (silent) => {
      const id = ++requestId.current
      if (!silent) setState((s) => ({ ...s, loading: true, error: null }))
      try {
        const data = await gql(query, JSON.parse(key))
        if (id === requestId.current) setState({ data, loading: false, error: null })
      } catch (error) {
        if (id === requestId.current) setState((s) => ({ ...s, loading: false, error }))
      }
    },
    [query, key],
  )

  useEffect(() => {
    if (!skip) run(false)
  }, [run, skip])

  useEffect(() => {
    if (skip) return undefined
    const onChange = () => run(true)
    window.addEventListener('kumbuka:changed', onChange)
    return () => window.removeEventListener('kumbuka:changed', onChange)
  }, [run, skip])

  const setData = useCallback((updater) => {
    setState((s) => ({ ...s, data: typeof updater === 'function' ? updater(s.data) : updater }))
  }, [])

  return { ...state, refetch: () => run(true), setData }
}

/** Debounce a changing value. */
export function useDebounced(value, delay = 250) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return v
}
