import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, PILLARS, type Challenge, type Pillar } from '../db'
import { addDays, daysBetween, thaiShort, toKey } from '../lib/date'
import { saveSettings, useSettings } from '../lib/store'
import { Button, Card, Chip, Empty, Field, Input, SectionTitle, Select, Sheet, Textarea } from '../components/ui'

const DAY_PRESETS = [7, 14, 21, 30, 66, 90]

export default function Goals() {
  const [open, setOpen] = useState(false)
  const challenges = useLiveQuery(() => db.challenges.orderBy('startDate').reverse().toArray(), [])
  const marks = useLiveQuery(() => db.challengeDays.toArray(), [])

  const active = (challenges ?? []).filter((c) => c.status === 'active')
  const finished = (challenges ?? []).filter((c) => c.status !== 'active')

  return (
    <div className="mx-auto max-w-md px-4 pt-5">
      <header className="mb-5 flex items-end justify-between">
        <h1 className="text-[26px] font-semibold">เป้าหมาย</h1>
        <Button size="sm" onClick={() => setOpen(true)}>
          + ตั้งเป้า
        </Button>
      </header>

      {active.length === 0 && finished.length === 0 && (
        <Card>
          <Empty
            icon="🎯"
            title="ยังไม่มีเป้าหมาย"
            body="ตั้งได้ว่าจะทำกี่วัน เช่น ไม่ดื่ม 30 วัน หรือ ออกกำลังกาย 21 วันติด"
          />
          <div className="px-4 pb-4">
            <Button className="w-full" onClick={() => setOpen(true)}>
              ตั้งเป้าหมายแรก
            </Button>
          </div>
        </Card>
      )}

      {active.length > 0 && (
        <div className="mb-8 space-y-4">
          {active.map((c) => (
            <ChallengeCard key={c.id} challenge={c} marks={(marks ?? []).filter((m) => m.challengeId === c.id)} />
          ))}
        </div>
      )}

      {finished.length > 0 && (
        <>
          <SectionTitle>ที่ผ่านมา</SectionTitle>
          <div className="space-y-2.5">
            {finished.map((c) => (
              <Card key={c.id} className="flex items-center justify-between px-4 py-3.5">
                <div>
                  <p className="text-[14px] font-medium">{c.title}</p>
                  <p className="text-[12px] text-[var(--muted)]">
                    {c.days} วัน · เริ่ม {thaiShort(c.startDate)}
                  </p>
                </div>
                <span className={`text-[12px] font-semibold ${c.status === 'done' ? 'text-[var(--accent)]' : 'text-[var(--muted)]'}`}>
                  {c.status === 'done' ? 'สำเร็จ ✓' : 'เก็บเข้าคลัง'}
                </span>
              </Card>
            ))}
          </div>
        </>
      )}

      <NewChallenge open={open} onClose={() => setOpen(false)} />
    </div>
  )
}

function ChallengeCard({ challenge, marks }: { challenge: Challenge; marks: { date: string; status: string }[] }) {
  const settings = useSettings()
  const today = toKey()
  const byDate = new Map(marks.map((m) => [m.date, m.status]))
  const elapsed = daysBetween(challenge.startDate, today)
  const doneCount = marks.length
  const pct = Math.round((doneCount / challenge.days) * 100)
  const todayInRange = elapsed >= 0 && elapsed < challenge.days
  const todayMark = byDate.get(today)

  async function mark(status: 'done' | 'freeze') {
    if (status === 'freeze') {
      if (!settings || settings.freezeTokens < 1) return
      await saveSettings({ freezeTokens: settings.freezeTokens - 1 })
    }
    await db.challengeDays.add({ challengeId: challenge.id!, date: today, status })
    if (doneCount + 1 >= challenge.days) await db.challenges.update(challenge.id!, { status: 'done' })
  }

  async function unmark() {
    const row = await db.challengeDays.where({ challengeId: challenge.id!, date: today }).first()
    if (!row) return
    if (row.status === 'freeze' && settings) await saveSettings({ freezeTokens: settings.freezeTokens + 1 })
    await db.challengeDays.delete(row.id!)
  }

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[16px] leading-snug font-semibold">{challenge.title}</p>
          <p className="mt-0.5 text-[12px] text-[var(--muted)]">
            {PILLARS[challenge.pillar].icon} {challenge.criteria || `ทำให้ครบ ${challenge.days} วัน`}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="num text-2xl leading-none font-bold text-[var(--accent)]">{doneCount}</p>
          <p className="num text-[11px] text-[var(--muted)]">/ {challenge.days} วัน</p>
        </div>
      </div>

      {/* The dot grid is the point: the whole commitment visible in one glance. */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {Array.from({ length: challenge.days }, (_, i) => {
          const d = addDays(challenge.startDate, i)
          const st = byDate.get(d)
          const isToday = d === today
          const future = d > today
          return (
            <span
              key={d}
              title={thaiShort(d)}
              className={`h-4 w-4 rounded-[5px] ${
                st === 'done'
                  ? 'bg-[var(--accent)]'
                  : st === 'freeze'
                    ? 'bg-[var(--warn)]/70'
                    : future
                      ? 'bg-[var(--surface-2)]'
                      : 'bg-[var(--line)]'
              } ${isToday ? 'ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--surface)]' : ''}`}
            />
          )
        })}
      </div>

      <div className="mb-3 flex items-center justify-between text-[11.5px] text-[var(--muted)]">
        <span>ผ่านไป {pct}%</span>
        <span>เริ่ม {thaiShort(challenge.startDate)}</span>
      </div>

      {todayInRange ? (
        todayMark ? (
          <button onClick={unmark} className="w-full rounded-xl border border-[var(--accent)]/40 bg-[var(--accent-soft)] py-3 text-[13.5px] font-medium text-[var(--accent)]">
            {todayMark === 'freeze' ? 'วันนี้ใช้โล่ไว้ 🛡' : 'วันนี้ทำแล้ว ✓'} — แตะเพื่อยกเลิก
          </button>
        ) : (
          <div className="flex gap-2">
            <Button className="flex-1" onClick={() => mark('done')}>
              วันนี้ทำแล้ว
            </Button>
            <Button
              variant="outline"
              onClick={() => mark('freeze')}
              disabled={(settings?.freezeTokens ?? 0) < 1}
              title="ใช้โล่กันสตรีคขาด"
            >
              🛡 {settings?.freezeTokens ?? 0}
            </Button>
          </div>
        )
      ) : (
        <Button variant="outline" className="w-full" onClick={() => db.challenges.update(challenge.id!, { status: 'archived' })}>
          {elapsed < 0 ? `เริ่ม ${thaiShort(challenge.startDate)}` : 'ปิดเป้าหมายนี้'}
        </Button>
      )}
    </Card>
  )
}

function NewChallenge({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [title, setTitle] = useState('')
  const [days, setDays] = useState(30)
  const [criteria, setCriteria] = useState('')
  const [pillar, setPillar] = useState<Pillar>('recovery')

  async function save() {
    if (!title.trim()) return
    await db.challenges.add({
      title: title.trim(),
      days,
      startDate: toKey(),
      criteria: criteria.trim(),
      pillar,
      status: 'active',
      createdAt: Date.now(),
    })
    setTitle('')
    setCriteria('')
    setDays(30)
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title="ตั้งเป้าหมายใหม่">
      <Field label="เป้าหมาย">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="เช่น ไม่ดื่มเลย 30 วัน" />
      </Field>

      <Field label="กี่วัน">
        <div className="no-bar flex gap-2 overflow-x-auto pb-1">
          {DAY_PRESETS.map((d) => (
            <Chip key={d} active={days === d} onClick={() => setDays(d)}>
              {d} วัน
            </Chip>
          ))}
        </div>
        <Input
          type="number"
          min={1}
          max={365}
          value={days}
          onChange={(e) => setDays(Math.max(1, Math.min(365, Number(e.target.value) || 1)))}
          className="mt-2"
        />
      </Field>

      <Field label="นับว่าผ่านเมื่อไหร่" hint="เขียนให้ชัดจนไม่ต้องตีความตอนเหนื่อย">
        <Textarea rows={2} value={criteria} onChange={(e) => setCriteria(e.target.value)} placeholder="เช่น จบวันโดยไม่ดื่มแอลกอฮอล์เลย" />
      </Field>

      <Field label="ด้าน">
        <Select value={pillar} onChange={(e) => setPillar(e.target.value as Pillar)}>
          {Object.entries(PILLARS).map(([k, v]) => (
            <option key={k} value={k}>
              {v.icon} {v.label}
            </option>
          ))}
        </Select>
      </Field>

      <Button size="lg" className="mt-2 w-full" onClick={save} disabled={!title.trim()}>
        เริ่มเลย
      </Button>
    </Sheet>
  )
}
