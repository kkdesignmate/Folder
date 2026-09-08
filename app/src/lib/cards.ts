import { db, type CardDraw, type CardKind } from '../db'
import { toKey } from './date'

/**
 * Variable reward. A fixed reward stops registering after a week; an unpredictable
 * one keeps its pull — which is the whole point for someone who bores quickly.
 */
const DRAW_CHANCE = 0.28

const QUOTES = [
  'วันนี้ที่ทำได้ ไม่ได้มาจากแรงบันดาลใจ แต่มาจากการที่นายลงมือ',
  'ความอยากมันมาเป็นคลื่น ไม่ใช่เส้นตรง — มันจะลงเสมอ',
  'ไม่ต้องชนะทั้งปี แค่ชนะวันนี้พอ',
  'คนที่นายอยากเป็นในอีก 5 ปี ถูกสร้างจากสิ่งที่นายทำในชั่วโมงนี้',
  'พลาดหนึ่งวันคือหนึ่งวัน ไม่ใช่ทั้งหมดที่ผ่านมา',
  'ร่างกายที่ขยับ ช่วยสมองคิดได้ดีกว่าที่นั่งคิดเฉย ๆ',
  'ไม่มีใครเห็นวันที่นายทำเงียบ ๆ แต่ผลลัพธ์จะเห็นแทนนาย',
  'อยากเลิกเบื่อ ให้เปลี่ยนวิธี ไม่ใช่เปลี่ยนเป้าหมาย',
]

type Recipe = { kind: CardKind; weight: number; make: () => { label: string; value: number } }

const RECIPES: Recipe[] = [
  { kind: 'xp', weight: 34, make: () => ({ label: 'โบนัส XP', value: 10 + Math.floor(Math.random() * 4) * 5 }) },
  { kind: 'points', weight: 30, make: () => ({ label: 'แต้มโบนัส', value: 5 + Math.floor(Math.random() * 4) * 5 }) },
  { kind: 'quote', weight: 24, make: () => ({ label: QUOTES[Math.floor(Math.random() * QUOTES.length)], value: 0 }) },
  { kind: 'freeze', weight: 8, make: () => ({ label: 'โล่กันสตรีคขาด +1', value: 1 }) },
  { kind: 'theme', weight: 4, make: () => ({ label: 'ปลดล็อกธีมใหม่', value: 1 }) },
]

const THEME_ORDER = ['forest', 'ember', 'dawn']

/** Rolls for a card. Returns the drawn card, or null when the roll comes up empty. */
export async function maybeDrawCard(): Promise<CardDraw | null> {
  if (Math.random() > DRAW_CHANCE) return null

  const settings = await db.settings.get(1)
  if (!settings) return null

  const locked = THEME_ORDER.filter((t) => !settings.unlockedThemes.includes(t))
  const pool = RECIPES.filter((r) => r.kind !== 'theme' || locked.length > 0)
  const total = pool.reduce((s, r) => s + r.weight, 0)

  let roll = Math.random() * total
  const recipe = pool.find((r) => (roll -= r.weight) <= 0) ?? pool[0]
  const { label, value } = recipe.make()

  const card: CardDraw = { at: Date.now(), date: toKey(), kind: recipe.kind, label, value }

  if (recipe.kind === 'points') {
    await db.settings.update(1, { points: settings.points + value })
  } else if (recipe.kind === 'freeze') {
    await db.settings.update(1, { freezeTokens: settings.freezeTokens + value })
  } else if (recipe.kind === 'theme') {
    const theme = locked[0]
    card.label = `ปลดล็อกธีม "${THEME_LABELS[theme] ?? theme}"`
    await db.settings.update(1, { unlockedThemes: [...settings.unlockedThemes, theme] })
  }

  const id = await db.cards.add(card)
  return { ...card, id }
}

export const THEME_LABELS: Record<string, string> = {
  ink: 'Ink — น้ำเงินหมึก',
  forest: 'Forest — เขียวป่า',
  ember: 'Ember — ส้มถ่านไฟ',
  dawn: 'Dawn — สว่างเช้า',
}
