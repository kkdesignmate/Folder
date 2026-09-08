import type { Completion, Pillar } from '../db'

/** Levels widen as they go: level n starts at 40*(n-1)^2 XP. */
export function levelFromXp(xp: number): number {
  return Math.floor(Math.sqrt(xp / 40)) + 1
}

export function xpForLevel(level: number): number {
  return 40 * (level - 1) ** 2
}

export function levelProgress(xp: number): { level: number; into: number; span: number; pct: number } {
  const level = levelFromXp(xp)
  const base = xpForLevel(level)
  const next = xpForLevel(level + 1)
  const span = next - base
  const into = xp - base
  return { level, into, span, pct: span ? Math.min(100, (into / span) * 100) : 0 }
}

export function xpByPillar(completions: Completion[]): Record<Pillar, number> {
  const out: Record<Pillar, number> = { recovery: 0, body: 0, mind: 0, brain: 0, craft: 0 }
  for (const c of completions) out[c.pillar] = (out[c.pillar] ?? 0) + c.xp
  return out
}

/** Points are the spendable currency of the reward shop; XP is the permanent record. */
export function pointsFor(xp: number): number {
  return Math.max(1, Math.round(xp / 5))
}
