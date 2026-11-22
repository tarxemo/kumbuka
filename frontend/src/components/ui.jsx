import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { avatarColor, cx, PRIORITY, projectColor, STATUS } from '../lib/meta'
import { dueInfo } from '../lib/dates'
import { CalendarDays } from 'lucide-react'

export function Button({ variant = 'primary', size = 'md', className, loading, children, ...props }) {
  const variants = {
    primary: 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/20 hover:shadow-lg hover:shadow-indigo-500/30 hover:brightness-110',
    secondary: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800',
    ghost: 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
    danger: 'bg-rose-600 text-white hover:bg-rose-500',
    soft: 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:bg-indigo-500/20',
  }
  const sizes = { sm: 'h-8 px-3 text-xs gap-1.5', md: 'h-10 px-4 text-sm gap-2', lg: 'h-11 px-5 text-sm gap-2' }
  return (
    <button
      className={cx(
        'inline-flex shrink-0 items-center justify-center rounded-xl font-semibold transition-all active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50',
        variants[variant], sizes[size], className,
      )}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  )
}

export function IconButton({ className, children, title, active, ...props }) {
  return (
    <button
      title={title}
      aria-label={title}
      className={cx(
        'inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100',
        active && 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export function Spinner({ className }) {
  return <span className={cx('inline-block animate-spin rounded-full border-2 border-current border-t-transparent', className || 'h-5 w-5')} />
}

export function PageLoader() {
  return (
    <div className="flex h-64 items-center justify-center text-indigo-500">
      <Spinner className="h-7 w-7" />
    </div>
  )
}

export function ErrorBox({ error }) {
  if (!error) return null
  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
      {error.message || String(error)}
    </div>
  )
}

export function Avatar({ name = '?', initials, size = 'md', className }) {
  const sizes = { xs: 'h-5 w-5 text-[9px]', sm: 'h-6 w-6 text-[10px]', md: 'h-8 w-8 text-xs', lg: 'h-12 w-12 text-base', xl: 'h-16 w-16 text-xl' }
  const text = initials || name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase()
  return (
    <span
      title={name}
      className={cx('inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-semibold text-white ring-2 ring-white dark:ring-slate-900', avatarColor(name), sizes[size], className)}
    >
      {text || '?'}
    </span>
  )
}

export function AvatarStack({ people = [], max = 3, size = 'sm' }) {
  if (!people.length) return null
  return (
    <span className="flex -space-x-1.5">
      {people.slice(0, max).map((p) => <Avatar key={p.id || p.name} name={p.name} initials={p.initials} size={size} />)}
      {people.length > max && (
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-[10px] font-semibold text-slate-600 ring-2 ring-white dark:bg-slate-700 dark:text-slate-200 dark:ring-slate-900">
          +{people.length - max}
        </span>
      )}
    </span>
  )
}

export function StatusChip({ status, className }) {
  const s = STATUS[status] || STATUS.todo
  return (
    <span className={cx('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium', s.chip, className)}>
      <span className={cx('h-1.5 w-1.5 rounded-full', s.dot)} />
      {s.label}
    </span>
  )
}

export function PriorityChip({ priority }) {
  const p = PRIORITY[priority] || PRIORITY.medium
  return <span className={cx('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', p.chip)}>{p.label}</span>
}

export function ProjectChip({ project }) {
  if (!project) return null
  const c = projectColor(project.color)
  return (
    <span className={cx('inline-flex max-w-40 items-center gap-1.5 truncate rounded-full px-2 py-0.5 text-xs font-medium', c.soft)}>
      <span className={cx('h-1.5 w-1.5 shrink-0 rounded-full', c.dot)} />
      <span className="truncate">{project.name}</span>
    </span>
  )
}

export function DueChip({ date, isOpen = true }) {
  const info = dueInfo(date, isOpen)
  if (!info) return null
  const tones = {
    overdue: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300',
    today: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
    soon: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300',
    neutral: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  }
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', tones[info.tone])}>
      <CalendarDays className="h-3 w-3" />
      {info.label}
    </span>
  )
}

export function Kbd({ children }) {
  return (
    <kbd className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-sans text-[10px] font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
      {children}
    </kbd>
  )
}

export function EmptyState({ icon: Icon, title, children, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 px-6 py-10 text-center dark:border-slate-800">
      {Icon && (
        <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500 dark:bg-indigo-500/10">
          <Icon className="h-6 w-6" />
        </span>
      )}
      <p className="font-display font-semibold text-slate-800 dark:text-slate-100">{title}</p>
      {children && <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function PageHeader({ title, subtitle, icon: Icon, actions }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="flex items-center gap-3">
        {Icon && (
          <span className="hidden h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/20 sm:flex">
            <Icon className="h-5 w-5" />
          </span>
        )}
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Section({ title, count, icon: Icon, tone, action, children }) {
  const tones = {
    rose: 'text-rose-600 dark:text-rose-400',
    amber: 'text-amber-600 dark:text-amber-400',
    indigo: 'text-indigo-600 dark:text-indigo-400',
    sky: 'text-sky-600 dark:text-sky-400',
    emerald: 'text-emerald-600 dark:text-emerald-400',
  }
  return (
    <section className="mb-6">
      <div className="mb-2 flex items-center justify-between px-1">
        <h2 className={cx('flex items-center gap-2 text-sm font-semibold', tones[tone] || 'text-slate-700 dark:text-slate-200')}>
          {Icon && <Icon className="h-4 w-4" />}
          {title}
          {count != null && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">{count}</span>
          )}
        </h2>
        {action}
      </div>
      {children}
    </section>
  )
}

export function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  const widths = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl' }
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div data-modal-open="" className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 pt-[8vh]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            className={cx('relative w-full rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900', widths[size])}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ type: 'spring', duration: 0.3, bounce: 0.15 }}
          >
            {title && (
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
                <IconButton title="Close" onClick={onClose}><X className="h-4 w-4" /></IconButton>
              </div>
            )}
            <div className="px-5 py-4">{children}</div>
            {footer && <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3 dark:border-slate-800">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

export function Field({ label, hint, children, className }) {
  return (
    <label className={cx('block', className)}>
      {label && <span className="label">{label}</span>}
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  )
}

export function Segmented({ value, onChange, options, size = 'md' }) {
  return (
    <div className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800/80">
      {options.map((o) => (
        <button
          type="button"
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            'relative flex items-center gap-1.5 rounded-lg font-medium transition',
            size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm',
            value === o.value
              ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200',
          )}
        >
          {o.icon && <o.icon className="h-3.5 w-3.5" />}
          {o.label}
          {o.count != null && <span className="text-xs opacity-60">{o.count}</span>}
        </button>
      ))}
    </div>
  )
}

export function Confirm({ open, onClose, onConfirm, title, children, confirmLabel = 'Delete', loading }) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm"
      footer={<>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="danger" onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
      </>}
    >
      <p className="text-sm text-slate-600 dark:text-slate-300">{children}</p>
    </Modal>
  )
}

export function StatCard({ label, value, icon: Icon, tone = 'indigo', onClick, hint }) {
  const tones = {
    indigo: 'from-indigo-500 to-violet-500',
    rose: 'from-rose-500 to-pink-500',
    amber: 'from-amber-500 to-orange-500',
    emerald: 'from-emerald-500 to-teal-500',
    sky: 'from-sky-500 to-cyan-500',
  }
  return (
    <motion.button
      whileHover={{ y: -2 }}
      onClick={onClick}
      className="card flex items-center gap-3 p-4 text-left transition hover:shadow-md"
    >
      <span className={cx('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md', tones[tone])}>
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block font-display text-2xl font-bold leading-none text-slate-900 dark:text-white">{value}</span>
        <span className="mt-1 block truncate text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
        {hint && <span className="block truncate text-[11px] text-slate-400">{hint}</span>}
      </span>
    </motion.button>
  )
}
