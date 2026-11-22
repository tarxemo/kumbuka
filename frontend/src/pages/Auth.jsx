import { motion } from 'framer-motion'
import { Check, ClipboardCheck, MessagesSquare, Users, Zap } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Logo } from '../components/Layout'
import { Button, Field } from '../components/ui'
import { useAuth } from '../lib/auth'

const FEATURES = [
  { icon: Zap, title: 'Capture in seconds', text: 'Rough notes during meetings — organize them later.' },
  { icon: MessagesSquare, title: 'Every discussion → clear actions', text: 'Never lose a call-to-action from a conversation.' },
  { icon: Users, title: 'Know who it is for', text: 'Track who asked, who is involved, who you wait on.' },
  { icon: ClipboardCheck, title: 'Daily review', text: 'A guided check so nothing slips through the cracks.' },
]

function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="app-bg grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-12 text-white lg:flex lg:flex-col">
        <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-fuchsia-400/20 blur-3xl" />
        <div className="relative flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M6 12.5l4 4 8-9" /></svg>
          </span>
          <span className="font-display text-2xl font-extrabold">Kumbuka</span>
        </div>
        <div className="relative mt-auto mb-auto max-w-md">
          <h2 className="font-display text-4xl leading-tight font-bold">Remember everything you have to do.</h2>
          <p className="mt-3 text-lg text-white/80">
            <i>Kumbuka</i> means “remember” in Swahili. Your personal guide for tasks, follow-ups and the details that matter.
          </p>
          <div className="mt-10 space-y-4">
            {FEATURES.map((f, i) => (
              <motion.div key={f.title} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.08 }} className="flex gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 backdrop-blur"><f.icon className="h-5 w-5" /></span>
                <div>
                  <p className="font-semibold">{f.title}</p>
                  <p className="text-sm text-white/70">{f.text}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
          <Logo className="mb-8 lg:hidden" />
          <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{title}</h1>
          <p className="mt-1 mb-8 text-sm text-slate-500">{subtitle}</p>
          {children}
          <p className="mt-6 text-center text-sm text-slate-500">{footer}</p>
        </motion.div>
      </div>
    </div>
  )
}

export function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await login(form.email, form.password)
      navigate(location.state?.from?.pathname || '/', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to see everything on your plate." footer={<>New here? <Link to="/register" className="font-semibold text-indigo-600 hover:underline">Create a free account</Link></>}>
      <form onSubmit={submit} className="space-y-4">
        {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}
        <Field label="Email">
          <input type="email" required autoFocus value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="field h-11" placeholder="you@company.com" />
        </Field>
        <Field label="Password">
          <input type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="field h-11" placeholder="••••••••" />
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={loading}>Sign in</Button>
      </form>
    </AuthShell>
  )
}

export function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ fullName: '', jobTitle: '', email: '', password: '' })
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await register(form)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const strong = form.password.length >= 8

  return (
    <AuthShell title="Create your account" subtitle="Free, private to you, ready in 20 seconds." footer={<>Already have an account? <Link to="/login" className="font-semibold text-indigo-600 hover:underline">Sign in</Link></>}>
      <form onSubmit={submit} className="space-y-4">
        {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}
        <Field label="Full name">
          <input required autoFocus value={form.fullName} onChange={set('fullName')} className="field h-11" placeholder="Amina Juma" />
        </Field>
        <Field label="Job title (optional)">
          <input value={form.jobTitle} onChange={set('jobTitle')} className="field h-11" placeholder="Analyst" />
        </Field>
        <Field label="Work email">
          <input type="email" required value={form.email} onChange={set('email')} className="field h-11" placeholder="you@company.com" />
        </Field>
        <Field label="Password">
          <input type="password" required value={form.password} onChange={set('password')} className="field h-11" placeholder="At least 8 characters" />
          {form.password && (
            <span className={`mt-1.5 flex items-center gap-1 text-xs ${strong ? 'text-emerald-600' : 'text-slate-400'}`}>
              <Check className="h-3.5 w-3.5" /> {strong ? 'Length looks good' : 'Use at least 8 characters, not only numbers'}
            </span>
          )}
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={loading}>Create account</Button>
      </form>
    </AuthShell>
  )
}
