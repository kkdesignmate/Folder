import type { Task } from '../db'

/** Deterministic per-day hash, so a task shows the same variant all day but a new one tomorrow. */
function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/**
 * The anti-boredom core: the same commitment shown as a different concrete action
 * each day, drawn from the variants the user wrote for that task.
 */
export function variantForDay(task: Task, date: string): string | null {
  if (!task.variants.length) return null
  return task.variants[hash(`${task.id}:${date}`) % task.variants.length]
}

/** One optional task per day, surfaced as a surprise rather than sitting in a list. */
export function pickWildcard(menu: Task[], date: string): Task | null {
  const pool = menu.filter((t) => t.active)
  if (!pool.length) return null
  return pool[hash(`wild:${date}`) % pool.length]
}
