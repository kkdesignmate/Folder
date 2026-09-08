import { useLiveQuery } from 'dexie-react-hooks'
import {
  db,
  DEFAULT_SETTINGS,
  REQUIRED_BY_ENERGY,
  type Completion,
  type DayLog,
  type Settings,
  type Task,
} from '../db'
import { addDays, monthKey, toKey } from './date'
import { maybeDrawCard } from './cards'
import { pointsFor } from './xp'
import { seedIfEmpty } from './seed'

/** Runs once on boot: seed starter content and refill this month's streak shields. */
export async function bootstrap(): Promise<void> {
  const existing = await db.settings.get(1)
  if (!existing) await db.settings.add({ ...DEFAULT_SETTINGS, freezeMonth: monthKey() })
  else if (existing.freezeMonth !== monthKey()) {
    await db.settings.update(1, { freezeTokens: Math.max(existing.freezeTokens, 2), freezeMonth: monthKey() })
  }
  await seedIfEmpty()
}

export function useSettings(): Settings | undefined {
  return useLiveQuery(() => db.settings.get(1), [])
}

export async function saveSettings(patch: Partial<Settings>): Promise<void> {
  await db.settings.update(1, patch)
}

export function useTasks(): Task[] | undefined {
  return useLiveQuery(async () => (await db.tasks.toArray()).sort((a, b) => a.order - b.order), [])
}

export function useDayLog(date: string): DayLog | undefined {
  return useLiveQuery(() => db.dayLogs.where('date').equals(date).first(), [date])
}

export function useCompletions(date: string): Completion[] | undefined {
  return useLiveQuery(() => db.completions.where('date').equals(date).toArray(), [date])
}

export async function ensureDayLog(date: string): Promise<DayLog> {
  const found = await db.dayLogs.where('date').equals(date).first()
  if (found) return found
  const fresh: DayLog = {
    date,
    energy: null,
    mood: null,
    note: '',
    feedOpens: 0,
    wildcardTaskId: null,
    frozen: false,
  }
  const id = await db.dayLogs.add(fresh)
  return { ...fresh, id }
}

export async function patchDayLog(date: string, patch: Partial<DayLog>): Promise<void> {
  const log = await ensureDayLog(date)
  await db.dayLogs.update(log.id!, patch)
}

/**
 * Ticking a task off is the app's most-used action, so it does everything at once:
 * record it, pay out points, and roll for a surprise card.
 */
export async function completeTask(task: Task, date: string) {
  const already = await db.completions.where({ date, taskId: task.id! }).first()
  if (already) {
    await db.completions.delete(already.id!)
    const s = await db.settings.get(1)
    if (s) await db.settings.update(1, { points: Math.max(0, s.points - pointsFor(task.xp)) })
    return { undone: true, card: null }
  }

  await db.completions.add({
    taskId: task.id!,
    date,
    title: task.title,
    pillar: task.pillar,
    kind: task.kind,
    xp: task.xp,
    at: Date.now(),
  })

  const s = await db.settings.get(1)
  if (s) await db.settings.update(1, { points: s.points + pointsFor(task.xp) })

  return { undone: false, card: await maybeDrawCard() }
}

export function requiredToday(energy: DayLog['energy'], coreCount: number): number {
  return Math.min(coreCount, REQUIRED_BY_ENERGY[energy ?? 'normal'])
}

/** A day counts if the required number of core tasks got done, or a shield was spent. */
export function dayCounts(
  date: string,
  logs: Map<string, DayLog>,
  completionsByDate: Map<string, Completion[]>,
  coreCount: number
): boolean {
  const log = logs.get(date)
  if (log?.frozen) return true
  const done = (completionsByDate.get(date) ?? []).filter((c) => c.kind === 'core').length
  const need = requiredToday(log?.energy ?? null, coreCount)
  return need > 0 && done >= need
}

export function computeStreak(
  today: string,
  logs: Map<string, DayLog>,
  completionsByDate: Map<string, Completion[]>,
  coreCount: number
): number {
  // Today still being open shouldn't read as a broken streak, so start from yesterday
  // unless today is already earned.
  let cursor = dayCounts(today, logs, completionsByDate, coreCount) ? today : addDays(today, -1)
  let streak = 0
  for (let i = 0; i < 3650; i++) {
    if (!dayCounts(cursor, logs, completionsByDate, coreCount)) break
    streak++
    cursor = addDays(cursor, -1)
  }
  return streak
}

export interface Stats {
  streak: number
  totalXp: number
  bonusXp: number
  completions: Completion[]
  logs: Map<string, DayLog>
  byDate: Map<string, Completion[]>
  coreCount: number
}

export function useStats(): Stats | undefined {
  return useLiveQuery(async () => {
    const [completions, dayLogs, cards, tasks] = await Promise.all([
      db.completions.toArray(),
      db.dayLogs.toArray(),
      db.cards.toArray(),
      db.tasks.toArray(),
    ])

    const byDate = new Map<string, Completion[]>()
    for (const c of completions) {
      const list = byDate.get(c.date)
      if (list) list.push(c)
      else byDate.set(c.date, [c])
    }

    const logs = new Map(dayLogs.map((l) => [l.date, l]))
    const coreCount = tasks.filter((t) => t.kind === 'core' && t.active).length
    const bonusXp = cards.filter((c) => c.kind === 'xp').reduce((s, c) => s + c.value, 0)

    return {
      streak: computeStreak(toKey(), logs, byDate, coreCount),
      totalXp: completions.reduce((s, c) => s + c.xp, 0) + bonusXp,
      bonusXp,
      completions,
      logs,
      byDate,
      coreCount,
    }
  }, [])
}
