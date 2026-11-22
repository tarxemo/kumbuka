// Visual metadata for statuses, priorities, colors. Full class names are
// written out so Tailwind can find them.

export const STATUSES = [
  { value: 'todo', label: 'To do', dot: 'bg-slate-400', chip: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300', ring: 'ring-slate-300' },
  { value: 'in_progress', label: 'In progress', dot: 'bg-sky-500', chip: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300', ring: 'ring-sky-300' },
  { value: 'waiting', label: 'Waiting', dot: 'bg-amber-500', chip: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300', ring: 'ring-amber-300' },
  { value: 'done', label: 'Done', dot: 'bg-emerald-500', chip: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300', ring: 'ring-emerald-300' },
  { value: 'cancelled', label: 'Cancelled', dot: 'bg-zinc-400', chip: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400', ring: 'ring-zinc-300' },
]
export const STATUS = Object.fromEntries(STATUSES.map((s) => [s.value, s]))

export const PRIORITIES = [
  { value: 'low', label: 'Low', text: 'text-slate-400', chip: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
  { value: 'medium', label: 'Medium', text: 'text-sky-500', chip: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300' },
  { value: 'high', label: 'High', text: 'text-orange-500', chip: 'bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300' },
  { value: 'urgent', label: 'Urgent', text: 'text-rose-500', chip: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300' },
]
export const PRIORITY = Object.fromEntries(PRIORITIES.map((p) => [p.value, p]))

export const PROJECT_COLORS = {
  indigo: { dot: 'bg-indigo-500', soft: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300', bar: 'bg-indigo-500' },
  violet: { dot: 'bg-violet-500', soft: 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300', bar: 'bg-violet-500' },
  sky: { dot: 'bg-sky-500', soft: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300', bar: 'bg-sky-500' },
  emerald: { dot: 'bg-emerald-500', soft: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300', bar: 'bg-emerald-500' },
  amber: { dot: 'bg-amber-500', soft: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300', bar: 'bg-amber-500' },
  rose: { dot: 'bg-rose-500', soft: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300', bar: 'bg-rose-500' },
  teal: { dot: 'bg-teal-500', soft: 'bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300', bar: 'bg-teal-500' },
  slate: { dot: 'bg-slate-500', soft: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300', bar: 'bg-slate-500' },
}
export const projectColor = (c) => PROJECT_COLORS[c] || PROJECT_COLORS.indigo

const AVATAR_COLORS = [
  'from-indigo-500 to-violet-500', 'from-sky-500 to-cyan-500', 'from-emerald-500 to-teal-500',
  'from-amber-500 to-orange-500', 'from-rose-500 to-pink-500', 'from-fuchsia-500 to-purple-500',
]
export function avatarColor(name = '') {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

export const DISCUSSION_KINDS = [
  { value: 'meeting', label: 'Meeting' },
  { value: 'one_on_one', label: '1:1' },
  { value: 'call', label: 'Call' },
  { value: 'chat', label: 'Chat' },
  { value: 'email', label: 'Email thread' },
  { value: 'other', label: 'Other' },
]

export function cx(...parts) {
  return parts.filter(Boolean).join(' ')
}

/** Build a full TaskInput from a task object plus changes. */
export function taskToInput(task, patch = {}) {
  const merged = { ...task, ...patch }
  return {
    title: merged.title,
    description: merged.description || '',
    priority: merged.priority,
    dueDate: merged.dueDate || null,
    peopleIds: (merged.people || []).filter((p) => p.id).map((p) => p.id),
    peopleNames: (merged.people || []).filter((p) => !p.id).map((p) => p.name),
    requestedById: merged.requestedBy?.id || null,
    requestedByName: merged.requestedBy && !merged.requestedBy.id ? merged.requestedBy.name : null,
    projectId: merged.project?.id || null,
    projectName: merged.project && !merged.project.id ? merged.project.name : null,
    discussionId: merged.discussion?.id || null,
    pinned: !!merged.pinned,
  }
}
