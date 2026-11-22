import { KeyRound, Moon, Settings as SettingsIcon, Sun, User } from 'lucide-react'
import { useState } from 'react'
import { useToast } from '../components/Toast'
import { Avatar, Button, Field, Kbd, PageHeader } from '../components/ui'
import { gql } from '../lib/api'
import { useAuth, useTheme } from '../lib/auth'
import { CHANGE_PASSWORD, UPDATE_PROFILE } from '../lib/queries'

const SHORTCUTS = [
  ['N', 'Quick capture (rough note or task)'],
  ['T', 'New task with all details'],
  ['Ctrl K  or  /', 'Search & jump anywhere'],
  ['Esc', 'Close a panel or dialog'],
]

const SYNTAX = [
  ['@Asha  or  @[Asha Mwita]', 'Person involved (created if new)'],
  ['!urgent  !high  !low', 'Priority'],
  ['#Finance  or  #[Q4 Budget]', 'Project (created if new)'],
  ['^today ^tomorrow ^fri ^3d ^nextweek ^30/11', 'Due date'],
]

export default function Settings() {
  const { user, setUser } = useAuth()
  const { dark, toggle } = useTheme()
  const toast = useToast()
  const [profile, setProfile] = useState({ fullName: user.fullName, jobTitle: user.jobTitle || '' })
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' })
  const [busy, setBusy] = useState(null)

  const saveProfile = async (e) => {
    e.preventDefault()
    setBusy('profile')
    try {
      const d = await gql(UPDATE_PROFILE, profile)
      setUser(d.updateProfile)
      toast('Profile updated')
    } catch (err) {
      toast(err.message, { type: 'error' })
    } finally {
      setBusy(null)
    }
  }

  const savePassword = async (e) => {
    e.preventDefault()
    setBusy('pw')
    try {
      await gql(CHANGE_PASSWORD, pw)
      setPw({ currentPassword: '', newPassword: '' })
      toast('Password changed. Other devices were signed out.')
    } catch (err) {
      toast(err.message, { type: 'error' })
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader icon={SettingsIcon} title="Settings" />

      <form onSubmit={saveProfile} className="card p-5">
        <h2 className="mb-4 flex items-center gap-2 font-semibold"><User className="h-4 w-4 text-indigo-500" /> Profile</h2>
        <div className="mb-4 flex items-center gap-3">
          <Avatar name={user.fullName} initials={user.initials} size="lg" />
          <div><p className="font-medium">{user.email}</p><p className="text-xs text-slate-400">Member since {new Date(user.dateJoined).toLocaleDateString()}</p></div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name"><input value={profile.fullName} onChange={(e) => setProfile({ ...profile, fullName: e.target.value })} className="field h-10" /></Field>
          <Field label="Job title"><input value={profile.jobTitle} onChange={(e) => setProfile({ ...profile, jobTitle: e.target.value })} className="field h-10" /></Field>
        </div>
        <div className="mt-4 flex justify-end"><Button type="submit" loading={busy === 'profile'}>Save profile</Button></div>
      </form>

      <div className="card flex items-center justify-between p-5">
        <div>
          <h2 className="flex items-center gap-2 font-semibold">{dark ? <Moon className="h-4 w-4 text-indigo-500" /> : <Sun className="h-4 w-4 text-indigo-500" />} Appearance</h2>
          <p className="text-sm text-slate-500">Currently {dark ? 'dark' : 'light'} mode.</p>
        </div>
        <Button variant="secondary" onClick={toggle}>Switch to {dark ? 'light' : 'dark'}</Button>
      </div>

      <form onSubmit={savePassword} className="card p-5">
        <h2 className="mb-4 flex items-center gap-2 font-semibold"><KeyRound className="h-4 w-4 text-indigo-500" /> Change password</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Current password"><input type="password" required value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} className="field h-10" /></Field>
          <Field label="New password"><input type="password" required value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} className="field h-10" /></Field>
        </div>
        <div className="mt-4 flex justify-end"><Button type="submit" variant="secondary" loading={busy === 'pw'}>Update password</Button></div>
      </form>

      <div className="card p-5">
        <h2 className="mb-3 font-semibold">Keyboard shortcuts</h2>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {SHORTCUTS.map(([k, v]) => <div key={k} className="flex items-center justify-between py-2 text-sm"><span className="text-slate-600 dark:text-slate-300">{v}</span><Kbd>{k}</Kbd></div>)}
        </div>
        <h2 className="mt-6 mb-3 font-semibold">Smart typing (quick capture &amp; task titles)</h2>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {SYNTAX.map(([k, v]) => <div key={k} className="flex items-center justify-between gap-4 py-2 text-sm"><code className="rounded bg-slate-100 px-2 py-0.5 text-xs dark:bg-slate-800">{k}</code><span className="text-right text-slate-500">{v}</span></div>)}
        </div>
      </div>
    </div>
  )
}
