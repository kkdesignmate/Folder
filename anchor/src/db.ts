import Dexie, { type Table } from 'dexie'

/** The five areas of life the app tracks separately, so progress is visible per area. */
export type Pillar = 'recovery' | 'body' | 'mind' | 'brain' | 'craft'

export const PILLARS: Record<Pillar, { label: string; icon: string }> = {
  recovery: { label: 'ใจที่มั่นคง', icon: '⚓' },
  body: { label: 'ร่างกาย', icon: '🏃' },
  mind: { label: 'จิตใจ', icon: '🌤' },
  brain: { label: 'สมอง', icon: '🧠' },
  craft: { label: 'อาชีพ', icon: '🛠' },
}

export type Energy = 'easy' | 'normal' | 'hard'

/** How many core tasks a day needs before it counts toward the streak. */
export const REQUIRED_BY_ENERGY: Record<Energy, number> = { easy: 1, normal: 3, hard: 4 }

export interface Settings {
  id: 1
  onboarded: boolean
  displayName: string
  sobrietyStart: string | null
  dailySpendBefore: number
  emergencyContacts: { name: string; phone: string }[]
  futureLetter: string
  copingActions: string[]
  reasons: string[]
  aiKey: string
  aiModel: string
  coachPersona: string
  theme: string
  unlockedThemes: string[]
  points: number
  freezeTokens: number
  freezeMonth: string
  createdAt: number
}

export interface Task {
  id?: number
  title: string
  pillar: Pillar
  /** core = counts toward the streak, menu = optional pool the wildcard draws from */
  kind: 'core' | 'menu'
  xp: number
  /** Different ways to do the same thing — rotated daily so routine stays fresh. */
  variants: string[]
  minutes: number | null
  active: boolean
  order: number
  createdAt: number
}

export interface Completion {
  id?: number
  taskId: number
  date: string
  title: string
  pillar: Pillar
  kind: 'core' | 'menu'
  xp: number
  at: number
}

export interface DayLog {
  id?: number
  date: string
  energy: Energy | null
  mood: number | null
  note: string
  feedOpens: number
  wildcardTaskId: number | null
  frozen: boolean
}

export interface Challenge {
  id?: number
  title: string
  days: number
  startDate: string
  criteria: string
  pillar: Pillar
  status: 'active' | 'done' | 'archived'
  createdAt: number
}

export interface ChallengeDay {
  id?: number
  challengeId: number
  date: string
  status: 'done' | 'freeze'
}

export interface Craving {
  id?: number
  at: number
  intensityBefore: number
  intensityAfter: number | null
  halt: string[]
  trigger: string
  note: string
  outcome: 'passed' | 'used' | 'unknown'
  waitedSec: number
}

export interface Reward {
  id?: number
  title: string
  cost: number
  redeemedAt: number | null
  createdAt: number
}

export type CardKind = 'xp' | 'points' | 'freeze' | 'quote' | 'theme'

export interface CardDraw {
  id?: number
  at: number
  date: string
  kind: CardKind
  label: string
  value: number
}

class AnchorDB extends Dexie {
  settings!: Table<Settings, number>
  tasks!: Table<Task, number>
  completions!: Table<Completion, number>
  dayLogs!: Table<DayLog, number>
  challenges!: Table<Challenge, number>
  challengeDays!: Table<ChallengeDay, number>
  cravings!: Table<Craving, number>
  rewards!: Table<Reward, number>
  cards!: Table<CardDraw, number>

  constructor() {
    super('anchor')
    this.version(1).stores({
      settings: 'id',
      tasks: '++id, kind, pillar, active, order',
      completions: '++id, date, taskId, pillar, [date+taskId]',
      dayLogs: '++id, &date',
      challenges: '++id, status, startDate',
      challengeDays: '++id, challengeId, date, [challengeId+date]',
      cravings: '++id, at, outcome',
      rewards: '++id, redeemedAt',
      cards: '++id, at, date',
    })
  }
}

export const db = new AnchorDB()

export const DEFAULT_SETTINGS: Settings = {
  id: 1,
  onboarded: false,
  displayName: '',
  sobrietyStart: null,
  dailySpendBefore: 0,
  emergencyContacts: [],
  futureLetter: '',
  copingActions: [],
  reasons: [],
  aiKey: '',
  aiModel: 'claude-opus-5',
  coachPersona: 'friend',
  theme: 'ink',
  unlockedThemes: ['ink'],
  points: 0,
  freezeTokens: 2,
  freezeMonth: '',
  createdAt: Date.now(),
}
