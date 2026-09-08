import { useMemo, useState } from 'react'
import { PILLARS, REQUIRED_BY_ENERGY, type CardDraw, type Energy, type Task } from '../db'
import { daysBetween, greeting, thaiDate, toKey } from '../lib/date'
import { levelProgress } from '../lib/xp'
import { pickWildcard, variantForDay } from '../lib/rotation'
import { completeTask, patchDayLog, useCompletions, useDayLog, useSettings, useStats, useTasks } from '../lib/store'
import { Button, Card, Empty, Progress, Sheet } from '../components/ui'

const ENERGY: { key: Energy; label: string; sub: string; icon: string }[] = [
  { key: 'easy', label: 'วันนี้ไหวแค่นิดเดียว', sub: `ทำ ${REQUIRED_BY_ENERGY.easy} อย่างก็ผ่าน`, icon: '🌙' },
  { key: 'normal', label: 'ปกติ', sub: `ทำ ${REQUIRED_BY_ENERGY.normal} อย่าง`, icon: '☀️' },
  { key: 'hard', label: 'วันนี้พร้อมอัด', sub: `ทำ ${REQUIRED_BY_ENERGY.hard} อย่าง`, icon: '🔥' },
]

export default function Today({ onOpenGuardian, onAddTask }: { onOpenGuardian: () => void; onAddTask: () => void }) {
  const date = toKey()
  const settings = useSettings()
  const tasks = useTasks()
  const log = useDayLog(date)
  const done = useCompletions(date)
  const stats = useStats()
  const [card, setCard] = useState<CardDraw | null>(null)
  const [showMenu, setShowMenu] = useState(false)

  const doneIds = useMemo(() => new Set((done ?? []).map((c) => c.taskId)), [done])

  const core = (tasks ?? []).filter((t) => t.kind === 'core' && t.active)
  const menu = (tasks ?? []).filter((t) => t.kind === 'menu' && t.active)
  const wildcard = useMemo(() => pickWildcard(menu, date), [menu, date])

  const need = Math.min(core.length, REQUIRED_BY_ENERGY[log?.energy ?? 'normal'])
  const coreDone = (done ?? []).filter((c) => c.kind === 'core').length
  const earned = need > 0 && coreDone >= need

  async function tick(task: Task) {
    const res = await completeTask(task, date)
    if (res.card) setCard(res.card)
  }

  const soberDays = settings?.sobrietyStart ? daysBetween(settings.sobrietyStart, date) : null
  const saved = soberDays !== null && settings ? soberDays * settings.dailySpendBefore : null
  const lp = levelProgress(stats?.totalXp ?? 0)

  return (
    <div className="mx-auto max-w-md px-4 pt-5">
      <header className="mb-5">
        <p className="text-[13px] text-[var(--muted)]">{thaiDate(date)}</p>
        <h1 className="mt-0.5 text-[26px] leading-tight font-semibold">
          {greeting()}
          {settings?.displayName ? `, ${settings.displayName}` : ''}
        </h1>
      </header>

      {/* Streak, level and the sober counter — the three numbers worth seeing daily. */}
      <Card className="mb-4 p-4">
        <div className="flex items-stretch divide-x divide-[var(--line)]">
          <Stat label="สตรีค" value={stats?.streak ?? 0} unit="วัน" accent />
          <Stat label="เลเวล" value={lp.level} unit="" />
          <Stat label="แต้มสะสม" value={settings?.points ?? 0} unit="" />
        </div>
        <div className="mt-4">
          <div className="mb-1.5 flex justify-between text-[11.5px] text-[var(--muted)]">
            <span>Lv.{lp.level}</span>
            <span className="num">
              {lp.into}/{lp.span} XP
            </span>
          </div>
          <Progress pct={lp.pct} />
        </div>
      </Card>

      {soberDays !== null && (
        <Card className="mb-4 flex items-center justify-between px-4 py-3.5">
          <div>
            <p className="text-[12px] text-[var(--muted)]">ไม่แตะมา</p>
            <p className="num text-xl font-semibold text-[var(--accent)]">
              {soberDays === 0 ? 'วันนี้คือวันแรก' : `${soberDays} วัน`}
            </p>
          </div>
          {!!saved && (
            <div className="text-right">
              <p className="text-[12px] text-[var(--muted)]">ประหยัดไปแล้ว</p>
              <p className="num text-xl font-semibold">{saved.toLocaleString('th-TH')} ฿</p>
            </div>
          )}
        </Card>
      )}

      {/* The panic button lives above the fold on the main screen, always. */}
      <button
        onClick={onOpenGuardian}
        className="mb-6 flex w-full items-center gap-3 rounded-2xl border border-[var(--danger)]/40 bg-[var(--danger-soft)] px-4 py-4 text-left transition active:scale-[0.99]"
      >
        <span className="text-2xl">🫱</span>
        <span className="flex-1">
          <span className="block text-[15px] font-semibold">ตอนนี้ฉันอยาก…</span>
          <span className="block text-[12.5px] text-[var(--muted)]">กดก่อนตัดสินใจ ใช้เวลาด้วยกัน 2 นาที</span>
        </span>
        <span className="text-[var(--muted)]">›</span>
      </button>

      {/* Energy mode: the escape valve that keeps a bad day from breaking the streak. */}
      <div className="mb-6">
        <p className="mb-2 px-1 text-[13px] font-semibold tracking-wide text-[var(--muted)] uppercase">วันนี้พลังเท่าไหร่</p>
        <div className="grid grid-cols-3 gap-2">
          {ENERGY.map((e) => {
            const on = (log?.energy ?? 'normal') === e.key
            return (
              <button
                key={e.key}
                onClick={() => patchDayLog(date, { energy: e.key })}
                className={`rounded-2xl border px-2 py-3 text-center transition ${
                  on ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : 'border-[var(--line)] bg-[var(--surface)]'
                }`}
              >
                <div className="mb-1 text-lg">{e.icon}</div>
                <div className="text-[11.5px] leading-tight font-medium">{e.label}</div>
              </button>
            )
          })}
        </div>
      </div>

      <div className="mb-2.5 flex items-end justify-between px-1">
        <h2 className="text-[13px] font-semibold tracking-wide text-[var(--muted)] uppercase">วันนี้ต้องทำ</h2>
        <span className={`num text-[13px] font-semibold ${earned ? 'text-[var(--accent)]' : 'text-[var(--muted)]'}`}>
          {coreDone}/{need || '—'}
        </span>
      </div>

      {core.length === 0 ? (
        <Card>
          <Empty icon="🌱" title="ยังไม่มีงานหลัก" body="เพิ่มสัก 2-3 อย่างที่อยากทำให้ได้ทุกวัน" />
          <div className="px-4 pb-4">
            <Button className="w-full" onClick={onAddTask}>
              เพิ่มงานแรก
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {core.map((t) => (
            <TaskRow key={t.id} task={t} date={date} done={doneIds.has(t.id!)} onTick={() => tick(t)} />
          ))}
        </div>
      )}

      {earned && (
        <Card className="animate-rise mt-4 border-[var(--accent)]/40 bg-[var(--accent-soft)] px-4 py-3.5 text-center text-[13.5px] font-medium">
          วันนี้ผ่านแล้ว สตรีคปลอดภัย ✓
        </Card>
      )}

      {/* One surprise task a day, instead of a long optional list nobody reads. */}
      {wildcard && (
        <div className="mt-7">
          <p className="mb-2.5 px-1 text-[13px] font-semibold tracking-wide text-[var(--muted)] uppercase">
            ภารกิจสุ่มของวันนี้
          </p>
          <TaskRow task={wildcard} date={date} done={doneIds.has(wildcard.id!)} onTick={() => tick(wildcard)} wild />
        </div>
      )}

      {menu.length > 0 && (
        <div className="mt-7">
          <button
            onClick={() => setShowMenu((v) => !v)}
            className="mb-2.5 flex w-full items-center justify-between px-1 text-[13px] font-semibold tracking-wide text-[var(--muted)] uppercase"
          >
            <span>เมนูเสริม ({menu.length})</span>
            <span>{showMenu ? '−' : '+'}</span>
          </button>
          {showMenu && (
            <div className="animate-rise space-y-2.5">
              {menu.map((t) => (
                <TaskRow key={t.id} task={t} date={date} done={doneIds.has(t.id!)} onTick={() => tick(t)} />
              ))}
            </div>
          )}
        </div>
      )}

      <button
        onClick={onAddTask}
        className="mt-5 w-full rounded-2xl border border-dashed border-[var(--line)] py-3.5 text-[13px] text-[var(--muted)]"
      >
        + เพิ่มงาน
      </button>

      <CardReveal card={card} onClose={() => setCard(null)} />
    </div>
  )
}

function Stat({ label, value, unit, accent }: { label: string; value: number; unit: string; accent?: boolean }) {
  return (
    <div className="flex-1 px-1 text-center">
      <p className="mb-0.5 text-[11.5px] text-[var(--muted)]">{label}</p>
      <p className={`num text-2xl leading-none font-bold ${accent ? 'text-[var(--accent)]' : ''}`}>
        {value}
        {unit && <span className="ml-0.5 text-[12px] font-medium text-[var(--muted)]">{unit}</span>}
      </p>
    </div>
  )
}

function TaskRow({
  task,
  date,
  done,
  onTick,
  wild,
}: {
  task: Task
  date: string
  done: boolean
  onTick: () => void
  wild?: boolean
}) {
  const variant = variantForDay(task, date)
  return (
    <button
      onClick={onTick}
      className={`flex w-full items-start gap-3 rounded-2xl border px-4 py-3.5 text-left transition active:scale-[0.99] ${
        done
          ? 'border-[var(--accent)]/30 bg-[var(--accent-soft)]'
          : wild
            ? 'border-dashed border-[var(--accent)]/50 bg-[var(--surface)]'
            : 'border-[var(--line)] bg-[var(--surface)]'
      }`}
    >
      <span
        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-[13px] ${
          done
            ? 'animate-pop border-[var(--accent)] bg-[var(--accent)] text-[var(--on-accent)]'
            : 'border-[var(--line)]'
        }`}
      >
        {done ? '✓' : ''}
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block text-[15px] font-medium ${done ? 'text-[var(--muted)] line-through' : ''}`}>
          {task.title}
        </span>
        {variant && <span className="mt-0.5 block text-[12.5px] leading-snug text-[var(--muted)]">{variant}</span>}
        <span className="mt-1.5 flex items-center gap-2 text-[11px] text-[var(--muted)]">
          <span>
            {PILLARS[task.pillar].icon} {PILLARS[task.pillar].label}
          </span>
          {task.minutes && <span>· {task.minutes} นาที</span>}
          <span className="num">· {task.xp} XP</span>
        </span>
      </span>
    </button>
  )
}

function CardReveal({ card, onClose }: { card: CardDraw | null; onClose: () => void }) {
  const icon = { xp: '⚡', points: '🪙', freeze: '🛡', quote: '💬', theme: '🎨' }[card?.kind ?? 'quote']
  return (
    <Sheet open={!!card} onClose={onClose}>
      {card && (
        <div className="py-4 text-center">
          <div className="animate-pop mb-4 text-5xl">{icon}</div>
          <p className="mb-2 text-[13px] tracking-wide text-[var(--muted)] uppercase">การ์ดสุ่ม</p>
          <p className="mb-1 text-[19px] leading-snug font-semibold">{card.label}</p>
          {card.value > 0 && card.kind !== 'freeze' && (
            <p className="num text-2xl font-bold text-[var(--accent)]">+{card.value}</p>
          )}
          <Button size="lg" className="mt-7 w-full" onClick={onClose}>
            รับไว้
          </Button>
        </div>
      )}
    </Sheet>
  )
}
