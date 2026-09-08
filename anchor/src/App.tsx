import { useEffect, useState } from 'react'
import { bootstrap, saveSettings, useSettings } from './lib/store'
import { DEFAULT_COPING } from './lib/seed'
import { toKey } from './lib/date'
import Today from './screens/Today'
import Goals from './screens/Goals'
import Rewards from './screens/Rewards'
import Me from './screens/Me'
import Guardian from './screens/Guardian'
import { TaskEditor } from './components/TaskEditor'
import { Button, Field, Input, Textarea } from './components/ui'

type Tab = 'today' | 'goals' | 'rewards' | 'me'

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'today', label: 'วันนี้', icon: '◎' },
  { key: 'goals', label: 'เป้าหมาย', icon: '◇' },
  { key: 'rewards', label: 'รางวัล', icon: '✧' },
  { key: 'me', label: 'ฉัน', icon: '○' },
]

export default function App() {
  const [ready, setReady] = useState(false)
  const [tab, setTab] = useState<Tab>('today')
  const [guardian, setGuardian] = useState(() => location.hash === '#/guardian')
  const [addTask, setAddTask] = useState(false)
  const settings = useSettings()

  useEffect(() => {
    bootstrap().then(() => setReady(true))
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = settings?.theme ?? 'ink'
  }, [settings?.theme])

  if (!ready || !settings) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[var(--bg)]">
        <span className="text-3xl opacity-40">⚓</span>
      </div>
    )
  }

  if (!settings.onboarded) return <Onboarding />

  if (guardian) {
    return (
      <Guardian
        onExit={() => {
          setGuardian(false)
          if (location.hash) history.replaceState(null, '', location.pathname + location.search)
        }}
      />
    )
  }

  return (
    <div className="min-h-dvh bg-[var(--bg)] pb-24">
      {tab === 'today' && <Today onOpenGuardian={() => setGuardian(true)} onAddTask={() => setAddTask(true)} />}
      {tab === 'goals' && <Goals />}
      {tab === 'rewards' && <Rewards />}
      {tab === 'me' && <Me />}

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--line)] bg-[var(--surface)]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto flex max-w-md">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 transition ${
                tab === t.key ? 'text-[var(--accent)]' : 'text-[var(--muted)]'
              }`}
            >
              <span className="text-lg leading-none">{t.icon}</span>
              <span className="text-[11px] font-medium">{t.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Reachable from every tab, not just the home screen. */}
      {tab !== 'today' && (
        <button
          onClick={() => setGuardian(true)}
          aria-label="ตอนนี้ฉันอยาก"
          className="fixed right-4 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-40 flex h-14 w-14 items-center justify-center rounded-full border border-[var(--danger)]/60 bg-[var(--surface-2)] text-2xl shadow-lg shadow-black/40"
        >
          🫱
        </button>
      )}

      <TaskEditor open={addTask} task={null} onClose={() => setAddTask(false)} />
    </div>
  )
}

/** Three screens, everything skippable — a long setup is where people quit on day one. */
function Onboarding() {
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [start, setStart] = useState(toKey())
  const [spend, setSpend] = useState('')
  const [reason, setReason] = useState('')

  async function finish() {
    await saveSettings({
      onboarded: true,
      displayName: name.trim(),
      sobrietyStart: start || null,
      dailySpendBefore: Number(spend) || 0,
      reasons: reason.trim() ? [reason.trim()] : [],
      copingActions: DEFAULT_COPING,
    })
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-10">
      {step === 0 && (
        <div className="animate-rise text-center">
          <div className="mb-6 text-5xl">⚓</div>
          <h1 className="mb-3 text-[27px] leading-snug font-semibold">Anchor</h1>
          <p className="mb-10 text-[14px] leading-loose text-[var(--muted)]">
            เช็กลิสต์รายวัน เป้าหมายที่ตั้งเองได้
            <br />
            และปุ่มที่กดได้ตอนที่ยากที่สุด
            <br />
            <br />
            ทุกอย่างเก็บอยู่ในเครื่องนี้เท่านั้น ไม่มีใครเห็น
          </p>
          <Button size="lg" className="w-full" onClick={() => setStep(1)}>
            เริ่มกันเลย
          </Button>
        </div>
      )}

      {step === 1 && (
        <div className="animate-rise">
          <h1 className="mb-2 text-[24px] font-semibold">เรียกว่าอะไรดี</h1>
          <p className="mb-7 text-[13.5px] leading-relaxed text-[var(--muted)]">ใส่ชื่อเล่นก็ได้ หรือข้ามไปเลยก็ได้</p>
          <Field label="ชื่อ">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="ชื่อเล่น" autoFocus />
          </Field>
          <Field label="เริ่มนับตั้งแต่วันไหน" hint="วันที่เริ่มไม่แตะอีก — ตั้งใหม่ได้เสมอถ้าพลาด">
            <Input type="date" max={toKey()} value={start} onChange={(e) => setStart(e.target.value)} />
          </Field>
          <Field label="เมื่อก่อนใช้เงินวันละประมาณ (บาท)" hint="ไว้คำนวณว่าประหยัดไปเท่าไหร่ ไม่ใส่ก็ได้">
            <Input type="number" min={0} value={spend} onChange={(e) => setSpend(e.target.value)} placeholder="0" />
          </Field>
          <Button size="lg" className="mt-2 w-full" onClick={() => setStep(2)}>
            ต่อไป
          </Button>
        </div>
      )}

      {step === 2 && (
        <div className="animate-rise">
          <h1 className="mb-2 text-[24px] leading-snug font-semibold">ทำไปเพื่ออะไร</h1>
          <p className="mb-7 text-[13.5px] leading-relaxed text-[var(--muted)]">
            เขียนสั้น ๆ ก็พอ ประโยคนี้จะกลับมาหานายตอนที่กำลังจะเสียหลัก
          </p>
          <Textarea
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="เช่น อยากตื่นมาแล้วจำได้ว่าเมื่อวานทำอะไรไปบ้าง"
          />
          <Button size="lg" className="mt-6 w-full" onClick={finish}>
            เข้าใช้งาน
          </Button>
          <button onClick={finish} className="mt-3 w-full py-2 text-[13px] text-[var(--muted)]">
            ข้ามไปก่อน
          </button>
        </div>
      )}
    </div>
  )
}
