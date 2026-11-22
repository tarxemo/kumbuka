import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { gql, tokenStore } from './api'
import { LOGIN, LOGOUT, ME, REGISTER } from './queries'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let alive = true
    if (!tokenStore.get()) {
      setReady(true)
      return undefined
    }
    gql(ME)
      .then((d) => { if (alive) setUser(d.me) })
      .catch(() => {})
      .finally(() => { if (alive) setReady(true) })
    return () => { alive = false }
  }, [])

  useEffect(() => {
    const onUnauthorized = () => {
      tokenStore.clear()
      setUser(null)
    }
    window.addEventListener('kumbuka:unauthorized', onUnauthorized)
    return () => window.removeEventListener('kumbuka:unauthorized', onUnauthorized)
  }, [])

  const login = useCallback(async (email, password) => {
    const d = await gql(LOGIN, { email, password })
    tokenStore.set(d.login.token)
    setUser(d.login.user)
  }, [])

  const register = useCallback(async (values) => {
    const d = await gql(REGISTER, values)
    tokenStore.set(d.register.token)
    setUser(d.register.user)
  }, [])

  const logout = useCallback(async () => {
    try { await gql(LOGOUT) } catch { /* ignore */ }
    tokenStore.clear()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, setUser, ready, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

export function useTheme() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))
  const toggle = useCallback(() => {
    setDark((d) => {
      const next = !d
      document.documentElement.classList.toggle('dark', next)
      try { localStorage.setItem('kumbuka.theme', next ? 'dark' : 'light') } catch { /* ignore */ }
      return next
    })
  }, [])
  return { dark, toggle }
}
