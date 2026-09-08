import { useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Craving, type Settings } from '../db'
import { THEME_LABELS } from '../lib/cards'
import { toKey } from '../lib/date'
import { saveSettings, useSettings } from '../lib/store'
import { TaskManager } from '../components/TaskEditor'
import { Button, Card, Empty, Field, Input, SectionTitle, Sheet, Textarea } from '../components/ui'

const HOTLINES = [
  { name: 'สายด่วนยาเสพติด', phone: '1165' },
  { name: 'สายด่วนสุขภาพจิต', phone: '1323' },
  { name: 'เจ็บป่วยฉุกเฉิน', phone: '1669' },
]

export default function Me() {
  const settings = useSettings()
  const cravings = useLiveQuery(() => db.cravings.orderBy('at').reverse().toArray(), [])
  const [sheet, setSheet] = useState<string | null>(null)

  if (!settings) return null

  return (
    <div className="mx-auto max-w-md px-4 pt-5 pb-4">
      <header>
        <h1 className="text-[26px] font-semibold">ฉัน</h1>
        <p className="mt-0.5 text-[13px] text-[var(--muted)]">ข้อมูลทั้งหมดเก็บอยู่ในเครื่องนี้เท่านั้น</p>
      </header>

      <SectionTitle>สิ่งที่ผ่านมาได้</SectionTitle>
      <CravingInsight cravings={cravings ?? []} />

      <SectionTitle>ตัวช่วยตอนอยาก</SectionTitle>
      <Card className="divide-y divide-[var(--line)]">
        <Row label="ข้อความจากตัวเอง" value={settings.futureLetter ? 'เขียนไว้แล้ว' : 'ยังไม่ได้เขียน'} onClick={() => setSheet('letter')} />
        <Row label="เหตุผลที่เริ่มทำ" value={`${settings.reasons.length} ข้อ`} onClick={() => setSheet('reasons')} />
        <Row label="ทางเลือกตอนอยาก" value={`${settings.copingActions.length} อย่าง`} onClick={() => setSheet('coping')} />
        <Row label="เบอร์คนที่ไว้ใจ" value={`${settings.emergencyContacts.length} คน`} onClick={() => setSheet('contacts')} />
      </Card>

      <SectionTitle>การตั้งค่า</SectionTitle>
      <Card className="divide-y divide-[var(--line)]">
        <Row label="ชื่อและวันเริ่มต้น" value={settings.displayName || 'ยังไม่ได้ตั้ง'} onClick={() => setSheet('profile')} />
        <Row label="จัดการงานทั้งหมด" value="" onClick={() => setSheet('tasks')} />
        <Row label="ธีม" value={THEME_LABELS[settings.theme]?.split(' — ')[0] ?? settings.theme} onClick={() => setSheet('theme')} />
        <Row label="ผู้ช่วย AI" value={settings.aiKey ? 'ต่อไว้แล้ว' : 'ยังไม่ได้ต่อ'} onClick={() => setSheet('ai')} />
        <Row label="สำรอง / กู้คืนข้อมูล" value="" onClick={() => setSheet('data')} />
      </Card>

      <SectionTitle>ขอความช่วยเหลือ</SectionTitle>
      <Card className="divide-y divide-[var(--line)]">
        {HOTLINES.map((h) => (
          <a key={h.phone} href={`tel:${h.phone}`} className="flex items-center justify-between px-4 py-3.5">
            <span className="text-[14px]">{h.name}</span>
            <span className="num text-[14px] font-semibold text-[var(--accent)]">{h.phone}</span>
          </a>
        ))}
      </Card>
      <p className="mt-3 px-1 text-[11.5px] leading-relaxed text-[var(--muted)]">
        แอปนี้เป็นเครื่องมือช่วยประคองตัวเอง ไม่ใช่การรักษา ถ้ามีอาการถอนรุนแรง เช่น มือสั่นมาก ชัก เห็นภาพหลอน
        หรือคิดทำร้ายตัวเอง ให้ติดต่อแพทย์หรือโทร 1669 ทันที
      </p>

      <ProfileSheet open={sheet === 'profile'} onClose={() => setSheet(null)} settings={settings} />
      <TextSheet
        open={sheet === 'letter'}
        onClose={() => setSheet(null)}
        title="ข้อความจากตัวเอง"
        hint="เขียนตอนหัวโล่ง เพื่อให้ตัวเองตอนที่กำลังอยากได้อ่าน — เขียนแบบที่พูดกับตัวเองจริง ๆ"
        value={settings.futureLetter}
        rows={8}
        onSave={(v) => saveSettings({ futureLetter: v })}
      />
      <ListSheet
        open={sheet === 'reasons'}
        onClose={() => setSheet(null)}
        title="เหตุผลที่เริ่มทำ"
        placeholder="เช่น อยากจำวันที่ลูกโตได้ครบทุกวัน"
        items={settings.reasons}
        onSave={(reasons) => saveSettings({ reasons })}
      />
      <ListSheet
        open={sheet === 'coping'}
        onClose={() => setSheet(null)}
        title="ทางเลือกตอนอยาก"
        placeholder="เช่น ออกไปวิ่ง 20 นาที"
        items={settings.copingActions}
        onSave={(copingActions) => saveSettings({ copingActions })}
      />
      <ContactSheet open={sheet === 'contacts'} onClose={() => setSheet(null)} settings={settings} />
      <TaskManager open={sheet === 'tasks'} onClose={() => setSheet(null)} />
      <ThemeSheet open={sheet === 'theme'} onClose={() => setSheet(null)} settings={settings} />
      <AiSheet open={sheet === 'ai'} onClose={() => setSheet(null)} settings={settings} />
      <DataSheet open={sheet === 'data'} onClose={() => setSheet(null)} />
    </div>
  )
}

function Row({ label, value, onClick }: { label: string; value: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center justify-between px-4 py-3.5 text-left">
      <span className="text-[14px]">{label}</span>
      <span className="flex items-center gap-2 text-[13px] text-[var(--muted)]">
        {value}
        <span>›</span>
      </span>
    </button>
  )
}

function CravingInsight({ cravings }: { cravings: Craving[] }) {
  const s = useMemo(() => {
    if (!cravings.length) return null
    const passed = cravings.filter((c) => c.outcome === 'passed').length
    const drops = cravings.filter((c) => c.intensityAfter !== null).map((c) => c.intensityBefore - c.intensityAfter!)
    const avgDrop = drops.length ? drops.reduce((a, b) => a + b, 0) / drops.length : 0

    const hours = new Array(24).fill(0) as number[]
    for (const c of cravings) hours[new Date(c.at).getHours()]++
    const peak = hours.indexOf(Math.max(...hours))

    const trig = new Map<string, number>()
    for (const c of cravings) if (c.trigger) trig.set(c.trigger, (trig.get(c.trigger) ?? 0) + 1)
    const topTrigger = [...trig.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

    return { passed, total: cravings.length, avgDrop, hours, peak, topTrigger, max: Math.max(...hours) }
  }, [cravings])

  if (!s) {
    return (
      <Card>
        <Empty icon="🌊" title="ยังไม่มีบันทึก" body="ทุกครั้งที่กดปุ่มเพื่อนเตือน มันจะถูกเก็บไว้ตรงนี้ เพื่อให้เห็นแพตเทิร์นของตัวเอง" />
      </Card>
    )
  }

  return (
    <Card className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[12px] text-[var(--muted)]">ผ่านมาได้</p>
          <p className="num text-3xl leading-none font-bold text-[var(--accent)]">
            {s.passed}
            <span className="text-lg text-[var(--muted)]">/{s.total}</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-[12px] text-[var(--muted)]">ความอยากลดเฉลี่ย</p>
          <p className="num text-3xl leading-none font-bold">−{s.avgDrop.toFixed(1)}</p>
        </div>
      </div>

      <p className="mb-1.5 text-[11.5px] text-[var(--muted)]">ช่วงเวลาที่มักจะอยาก</p>
      <div className="mb-2 flex h-14 items-end gap-[2px]">
        {s.hours.map((v, h) => (
          <div
            key={h}
            title={`${h}:00 — ${v} ครั้ง`}
            className={`flex-1 rounded-sm ${h === s.peak && v > 0 ? 'bg-[var(--accent)]' : 'bg-[var(--surface-2)]'}`}
            style={{ height: `${s.max ? Math.max(6, (v / s.max) * 100) : 6}%` }}
          />
        ))}
      </div>
      <div className="flex justify-between text-[10.5px] text-[var(--muted)]">
        <span>00</span>
        <span>06</span>
        <span>12</span>
        <span>18</span>
        <span>23</span>
      </div>

      <div className="mt-4 space-y-1.5 border-t border-[var(--line)] pt-3.5 text-[13px] leading-relaxed">
        <p>
          ช่วงที่ต้องระวังที่สุดคือประมาณ <b className="num text-[var(--accent)]">{String(s.peak).padStart(2, '0')}:00</b> — ลองวางอะไรไว้ทำในช่วงนั้นล่วงหน้า
        </p>
        {s.topTrigger && (
          <p>
            ตัวจุดที่เจอบ่อยสุดคือ <b>{s.topTrigger}</b>
          </p>
        )}
      </div>
    </Card>
  )
}

function ProfileSheet({ open, onClose, settings }: { open: boolean; onClose: () => void; settings: Settings }) {
  const [name, setName] = useState(settings.displayName)
  const [start, setStart] = useState(settings.sobrietyStart ?? '')
  const [spend, setSpend] = useState(String(settings.dailySpendBefore || ''))

  async function save() {
    await saveSettings({
      displayName: name.trim(),
      sobrietyStart: start || null,
      dailySpendBefore: Number(spend) || 0,
    })
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title="ชื่อและวันเริ่มต้น">
      <Field label="เรียกว่าอะไรดี">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="ชื่อเล่นก็ได้" />
      </Field>
      <Field label="วันที่เริ่มนับ" hint="ถ้าเคยพลาด ตั้งใหม่ได้เสมอ ไม่ได้แปลว่าที่ผ่านมาสูญเปล่า">
        <Input type="date" max={toKey()} value={start} onChange={(e) => setStart(e.target.value)} />
      </Field>
      <Field label="เมื่อก่อนใช้เงินวันละประมาณ (บาท)" hint="ใช้คำนวณว่าประหยัดไปเท่าไหร่แล้ว">
        <Input type="number" min={0} value={spend} onChange={(e) => setSpend(e.target.value)} placeholder="0" />
      </Field>
      <Button size="lg" className="mt-1 w-full" onClick={save}>
        บันทึก
      </Button>
    </Sheet>
  )
}

function TextSheet({
  open,
  onClose,
  title,
  hint,
  value,
  rows,
  onSave,
}: {
  open: boolean
  onClose: () => void
  title: string
  hint: string
  value: string
  rows: number
  onSave: (v: string) => Promise<void> | void
}) {
  const [text, setText] = useState(value)
  const seeded = useRef(false)
  if (open && !seeded.current) {
    seeded.current = true
    if (text !== value) setText(value)
  }
  if (!open && seeded.current) seeded.current = false

  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <p className="mb-3 text-[12.5px] leading-relaxed text-[var(--muted)]">{hint}</p>
      <Textarea rows={rows} value={text} onChange={(e) => setText(e.target.value)} />
      <Button
        size="lg"
        className="mt-4 w-full"
        onClick={async () => {
          await onSave(text)
          onClose()
        }}
      >
        บันทึก
      </Button>
    </Sheet>
  )
}

function ListSheet({
  open,
  onClose,
  title,
  placeholder,
  items,
  onSave,
}: {
  open: boolean
  onClose: () => void
  title: string
  placeholder: string
  items: string[]
  onSave: (items: string[]) => Promise<void> | void
}) {
  const [draft, setDraft] = useState('')

  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <div className="mb-3 space-y-2">
        {items.map((it, i) => (
          <Card key={i} className="flex items-center gap-2 px-3.5 py-2.5">
            <span className="flex-1 text-[14px]">{it}</span>
            <button onClick={() => onSave(items.filter((_, x) => x !== i))} className="text-[var(--muted)]">
              ✕
            </button>
          </Card>
        ))}
      </div>
      <div className="flex gap-2">
        <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={placeholder} />
        <Button
          onClick={() => {
            if (!draft.trim()) return
            onSave([...items, draft.trim()])
            setDraft('')
          }}
        >
          เพิ่ม
        </Button>
      </div>
    </Sheet>
  )
}

function ContactSheet({ open, onClose, settings }: { open: boolean; onClose: () => void; settings: Settings }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const list = settings.emergencyContacts

  return (
    <Sheet open={open} onClose={onClose} title="เบอร์คนที่ไว้ใจ">
      <p className="mb-3 text-[12.5px] leading-relaxed text-[var(--muted)]">
        คนที่โทรหาได้ตอนตีสองโดยไม่ต้องอธิบายอะไรมาก
      </p>
      <div className="mb-3 space-y-2">
        {list.map((c, i) => (
          <Card key={i} className="flex items-center gap-2 px-3.5 py-2.5">
            <span className="flex-1 text-[14px]">{c.name}</span>
            <span className="num text-[13px] text-[var(--muted)]">{c.phone}</span>
            <button onClick={() => saveSettings({ emergencyContacts: list.filter((_, x) => x !== i) })} className="text-[var(--muted)]">
              ✕
            </button>
          </Card>
        ))}
      </div>
      <Field label="ชื่อ">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น พี่ชาย" />
      </Field>
      <Field label="เบอร์">
        <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08x-xxx-xxxx" />
      </Field>
      <Button
        size="lg"
        className="w-full"
        disabled={!name.trim() || !phone.trim()}
        onClick={() => {
          saveSettings({ emergencyContacts: [...list, { name: name.trim(), phone: phone.trim() }] })
          setName('')
          setPhone('')
        }}
      >
        เพิ่มคนนี้
      </Button>
    </Sheet>
  )
}

function ThemeSheet({ open, onClose, settings }: { open: boolean; onClose: () => void; settings: Settings }) {
  return (
    <Sheet open={open} onClose={onClose} title="ธีม">
      <p className="mb-3 text-[12.5px] leading-relaxed text-[var(--muted)]">
        ธีมใหม่ปลดล็อกได้จากการ์ดสุ่มตอนทำงานเสร็จ
      </p>
      <div className="space-y-2">
        {Object.entries(THEME_LABELS).map(([key, label]) => {
          const unlocked = settings.unlockedThemes.includes(key)
          const active = settings.theme === key
          return (
            <button
              key={key}
              disabled={!unlocked}
              onClick={() => saveSettings({ theme: key })}
              className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3.5 text-left ${
                active ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : 'border-[var(--line)]'
              } ${unlocked ? '' : 'opacity-40'}`}
            >
              <span className="text-[14px]">{label}</span>
              <span className="text-[12.5px] text-[var(--muted)]">{unlocked ? (active ? 'ใช้อยู่' : 'เลือก') : '🔒'}</span>
            </button>
          )
        })}
      </div>
    </Sheet>
  )
}

function AiSheet({ open, onClose, settings }: { open: boolean; onClose: () => void; settings: Settings }) {
  const [key, setKey] = useState(settings.aiKey)

  return (
    <Sheet open={open} onClose={onClose} title="ผู้ช่วย AI">
      <p className="mb-4 text-[12.5px] leading-relaxed text-[var(--muted)]">
        คีย์นี้เก็บอยู่ในเครื่องนี้เท่านั้น ไม่ถูกส่งไปที่ไหน ใช้สำหรับให้ AI ช่วยวางแผนสัปดาห์และสรุปสิ่งที่ผ่านมา
        (ฟีเจอร์นี้กำลังจะมาในเฟสถัดไป)
      </p>
      <Field label="Anthropic API key">
        <Input type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder="sk-ant-..." autoComplete="off" />
      </Field>
      <Button
        size="lg"
        className="w-full"
        onClick={async () => {
          await saveSettings({ aiKey: key.trim() })
          onClose()
        }}
      >
        บันทึก
      </Button>
    </Sheet>
  )
}

const TABLES = ['settings', 'tasks', 'completions', 'dayLogs', 'challenges', 'challengeDays', 'cravings', 'rewards', 'cards'] as const

function DataSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState('')

  async function exportAll() {
    const dump: Record<string, unknown[]> = {}
    for (const t of TABLES) dump[t] = await db.table(t).toArray()
    const blob = new Blob([JSON.stringify({ version: 1, exportedAt: Date.now(), data: dump }, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `anchor-backup-${toKey()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function importAll(file: File) {
    try {
      const parsed = JSON.parse(await file.text()) as { data?: Record<string, unknown[]> }
      if (!parsed.data) throw new Error('รูปแบบไฟล์ไม่ถูกต้อง')
      await db.transaction('rw', TABLES.map((t) => db.table(t)), async () => {
        for (const t of TABLES) {
          if (!parsed.data![t]) continue
          await db.table(t).clear()
          await db.table(t).bulkAdd(parsed.data![t])
        }
      })
      setMsg('กู้คืนข้อมูลเรียบร้อย')
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'กู้คืนไม่สำเร็จ')
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="สำรอง / กู้คืนข้อมูล">
      <p className="mb-4 text-[12.5px] leading-relaxed text-[var(--muted)]">
        ข้อมูลอยู่ในเครื่องนี้เท่านั้น ถ้าล้างข้อมูลเบราว์เซอร์หรือเปลี่ยนเครื่อง จะหายไป — สำรองเก็บไว้เป็นระยะ
      </p>
      <Button size="lg" className="mb-3 w-full" onClick={exportAll}>
        ดาวน์โหลดไฟล์สำรอง
      </Button>
      <Button variant="outline" size="lg" className="w-full" onClick={() => fileRef.current?.click()}>
        เลือกไฟล์เพื่อกู้คืน
      </Button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) importAll(f)
        }}
      />
      {msg && <p className="mt-3 text-center text-[13px] text-[var(--accent)]">{msg}</p>}
    </Sheet>
  )
}
