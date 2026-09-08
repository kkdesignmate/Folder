import { useEffect, useMemo, useRef, useState } from 'react'
import { db, type Craving } from '../db'
import { fmtDuration } from '../lib/date'
import { useSettings } from '../lib/store'
import { Button, Card, Chip, Sheet, Textarea } from '../components/ui'

/** Steps of the pause. The order matters: body first, then thinking, then time. */
type Step = 'start' | 'breathe' | 'halt' | 'rate' | 'letter' | 'wait' | 'after' | 'done'

const HALT = [
  { key: 'hungry', label: 'หิว', icon: '🍚' },
  { key: 'angry', label: 'โกรธ / หงุดหงิด', icon: '🔥' },
  { key: 'lonely', label: 'เหงา', icon: '🌑' },
  { key: 'tired', label: 'ล้า / อดนอน', icon: '😮‍💨' },
  { key: 'bored', label: 'เบื่อ', icon: '🌀' },
  { key: 'celebrate', label: 'อยากฉลอง', icon: '🎉' },
]

const TRIGGERS = ['อยู่คนเดียว', 'เพื่อนชวน', 'เครียดงาน', 'ผ่านร้าน', 'เห็นในฟีด', 'หลังเลิกงาน', 'ทะเลาะกับคน', 'ไม่รู้เหมือนกัน']

const WAIT_OPTIONS = [
  { min: 5, label: '5 นาที' },
  { min: 15, label: '15 นาที' },
  { min: 30, label: '30 นาที' },
]

const HOTLINES = [
  { name: 'สายด่วนยาเสพติด', phone: '1165' },
  { name: 'สายด่วนสุขภาพจิต', phone: '1323' },
  { name: 'เจ็บป่วยฉุกเฉิน', phone: '1669' },
]

/** Survives an app close mid-craving — the moment it's most likely to be closed. */
interface Session {
  step: Step
  startedAt: number
  intensityBefore: number
  halt: string[]
  trigger: string
  note: string
  waitEndAt: number | null
  waitMinutes: number
}

const KEY = 'anchor.guardian'

function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Session) : null
  } catch {
    return null
  }
}

function blank(): Session {
  return {
    step: 'start',
    startedAt: Date.now(),
    intensityBefore: 5,
    halt: [],
    trigger: '',
    note: '',
    waitEndAt: null,
    waitMinutes: 15,
  }
}

export default function Guardian({ onExit }: { onExit: () => void }) {
  const settings = useSettings()
  const [s, setS] = useState<Session>(() => loadSession() ?? blank())
  const [sos, setSos] = useState(false)
  const [after, setAfter] = useState(4)

  useEffect(() => {
    if (s.step === 'done') localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, JSON.stringify(s))
  }, [s])

  const set = (patch: Partial<Session>) => setS((prev) => ({ ...prev, ...patch }))

  async function finish(outcome: Craving['outcome'], intensityAfter: number | null) {
    await db.cravings.add({
      at: s.startedAt,
      intensityBefore: s.intensityBefore,
      intensityAfter,
      halt: s.halt,
      trigger: s.trigger,
      note: s.note,
      outcome,
      waitedSec: Math.round((Date.now() - s.startedAt) / 1000),
    })
    set({ step: 'done' })
  }

  const coping = settings?.copingActions ?? []

  return (
    <div className="min-h-dvh bg-[var(--bg)] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--line)] bg-[var(--bg)]/95 px-4 py-3 backdrop-blur">
        <button onClick={onExit} className="text-sm text-[var(--muted)]">
          ← ออก
        </button>
        <span className="text-[13px] font-semibold tracking-wide">โหมดเพื่อนเตือน</span>
        <button onClick={() => setSos(true)} className="text-[13px] font-semibold text-[var(--danger)]">
          ขอความช่วยเหลือ
        </button>
      </header>

      <div className="mx-auto max-w-md px-4 py-6">
        {s.step === 'start' && <StartStep onNext={() => set({ step: 'breathe', startedAt: Date.now() })} onExit={onExit} />}

        {s.step === 'breathe' && <BreatheStep onDone={() => set({ step: 'halt' })} />}

        {s.step === 'halt' && (
          <StepShell
            title="ก่อนอื่น เช็กร่างกายก่อน"
            body="ความอยากส่วนใหญ่ไม่ได้มาจากของสิ่งนั้นจริง ๆ แต่มาจากสี่อย่างนี้ เลือกได้หลายข้อ"
          >
            <div className="grid grid-cols-2 gap-2.5">
              {HALT.map((h) => {
                const on = s.halt.includes(h.key)
                return (
                  <button
                    key={h.key}
                    onClick={() => set({ halt: on ? s.halt.filter((x) => x !== h.key) : [...s.halt, h.key] })}
                    className={`rounded-2xl border px-3 py-4 text-left transition ${
                      on ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : 'border-[var(--line)] bg-[var(--surface)]'
                    }`}
                  >
                    <div className="mb-1 text-xl">{h.icon}</div>
                    <div className="text-[13px] font-medium">{h.label}</div>
                  </button>
                )
              })}
            </div>
            {s.halt.length > 0 && (
              <Card className="mt-4 p-4 text-[13px] leading-relaxed text-[var(--muted)]">
                มีอย่างน้อยหนึ่งอย่างที่แก้ได้ก่อน — {haltAdvice(s.halt)}
              </Card>
            )}
            <Button size="lg" className="mt-5 w-full" onClick={() => set({ step: 'rate' })}>
              ต่อไป
            </Button>
          </StepShell>
        )}

        {s.step === 'rate' && (
          <StepShell title="ตอนนี้ความอยากแรงแค่ไหน" body="ไม่ต้องตอบให้ดูดี ตอบตามจริงเพื่อให้เห็นแพตเทิร์นของตัวเอง">
            <div className="mb-2 text-center">
              <span className="num text-6xl font-bold text-[var(--accent)]">{s.intensityBefore}</span>
              <span className="num text-2xl text-[var(--muted)]">/10</span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              value={s.intensityBefore}
              onChange={(e) => set({ intensityBefore: Number(e.target.value) })}
              className="w-full"
            />
            <div className="mb-6 flex justify-between text-[11px] text-[var(--muted)]">
              <span>พอทนได้</span>
              <span>แรงมาก</span>
            </div>

            <p className="mb-2 text-[13px] font-medium text-[var(--muted)]">อะไรจุดมันขึ้นมา</p>
            <div className="mb-4 flex flex-wrap gap-2">
              {TRIGGERS.map((t) => (
                <Chip key={t} active={s.trigger === t} onClick={() => set({ trigger: t })}>
                  {t}
                </Chip>
              ))}
            </div>
            <Textarea
              rows={2}
              placeholder="อยากเขียนอะไรเพิ่มไหม (ไม่บังคับ)"
              value={s.note}
              onChange={(e) => set({ note: e.target.value })}
            />

            {s.intensityBefore >= 8 && (
              <Card className="mt-4 border-[var(--danger)]/40 bg-[var(--danger-soft)] p-4">
                <p className="text-[13px] leading-relaxed">
                  ระดับนี้อย่าสู้คนเดียว กดปุ่มขอความช่วยเหลือด้านบน หรือโทรหาคนที่ไว้ใจตอนนี้เลย
                </p>
                <Button variant="danger" size="sm" className="mt-3" onClick={() => setSos(true)}>
                  เปิดรายชื่อติดต่อ
                </Button>
              </Card>
            )}

            <Button size="lg" className="mt-5 w-full" onClick={() => set({ step: 'letter' })}>
              ต่อไป
            </Button>
          </StepShell>
        )}

        {s.step === 'letter' && (
          <StepShell title="ข้อความจากตัวนายเอง" body="เขียนไว้ตอนที่หัวโล่ง เพื่ออ่านตอนนี้">
            <Card className="p-5">
              {settings?.futureLetter ? (
                <p className="text-[15px] leading-loose whitespace-pre-wrap">{settings.futureLetter}</p>
              ) : (
                <p className="text-[13px] leading-relaxed text-[var(--muted)]">
                  ยังไม่ได้เขียนไว้ — พอผ่านช่วงนี้ไปได้ ไปเขียนเก็บไว้ที่หน้าตั้งค่า แล้วครั้งหน้ามันจะอยู่ตรงนี้
                </p>
              )}
            </Card>
            {(settings?.reasons?.length ?? 0) > 0 && (
              <div className="mt-4">
                <p className="mb-2 px-1 text-[13px] font-medium text-[var(--muted)]">เหตุผลที่เริ่มทำ</p>
                <div className="space-y-2">
                  {settings!.reasons.map((r, i) => (
                    <Card key={i} className="px-4 py-3 text-[14px]">
                      {r}
                    </Card>
                  ))}
                </div>
              </div>
            )}
            <Button size="lg" className="mt-5 w-full" onClick={() => set({ step: 'wait' })}>
              ต่อไป
            </Button>
          </StepShell>
        )}

        {s.step === 'wait' && (
          <WaitStep
            session={s}
            coping={coping}
            onSetWait={(min) => set({ waitMinutes: min, waitEndAt: Date.now() + min * 60_000 })}
            onDone={() => set({ step: 'after' })}
          />
        )}

        {s.step === 'after' && (
          <StepShell title="ผ่านมาแล้ว ตอนนี้เป็นไง" body="เทียบกับตอนเริ่ม ความอยากขึ้นหรือลง">
            <div className="mb-2 text-center">
              <span className="num text-6xl font-bold text-[var(--accent)]">{after}</span>
              <span className="num text-2xl text-[var(--muted)]">/10</span>
            </div>
            <input type="range" min={0} max={10} value={after} onChange={(e) => setAfter(Number(e.target.value))} className="w-full" />
            <p className="mt-2 mb-6 text-center text-[13px] text-[var(--muted)]">
              ตอนเริ่มอยู่ที่ {s.intensityBefore}/10
            </p>
            <Button size="lg" className="w-full" onClick={() => finish('passed', after)}>
              ผ่านมาได้ 💪
            </Button>
            <button
              onClick={() => finish('used', after)}
              className="mt-3 w-full py-3 text-[13px] text-[var(--muted)] underline underline-offset-4"
            >
              จริง ๆ แล้วฉันใช้ไปแล้ว
            </button>
          </StepShell>
        )}

        {s.step === 'done' && <DoneStep session={s} onExit={onExit} onRestart={() => setS(blank())} />}
      </div>

      <Sheet open={sos} onClose={() => setSos(false)} title="ขอความช่วยเหลือตอนนี้">
        <p className="mb-4 text-[13px] leading-relaxed text-[var(--muted)]">
          ไม่ต้องอธิบายอะไรมาก แค่โทรออกก็พอ
        </p>
        {(settings?.emergencyContacts ?? []).map((c, i) => (
          <a
            key={i}
            href={`tel:${c.phone}`}
            className="mb-2.5 flex items-center justify-between rounded-2xl border border-[var(--accent)] bg-[var(--accent-soft)] px-4 py-3.5"
          >
            <span className="text-sm font-semibold">{c.name}</span>
            <span className="num text-sm text-[var(--accent)]">{c.phone}</span>
          </a>
        ))}
        <div className="mt-4 mb-2 text-[12px] font-medium text-[var(--muted)]">สายด่วน 24 ชั่วโมง</div>
        {HOTLINES.map((h) => (
          <a
            key={h.phone}
            href={`tel:${h.phone}`}
            className="mb-2.5 flex items-center justify-between rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] px-4 py-3.5"
          >
            <span className="text-sm">{h.name}</span>
            <span className="num text-sm font-semibold">{h.phone}</span>
          </a>
        ))}
      </Sheet>
    </div>
  )
}

function haltAdvice(halt: string[]): string {
  if (halt.includes('hungry')) return 'ลองกินอะไรให้อิ่มก่อน แล้วค่อยตัดสินใจอีกที'
  if (halt.includes('tired')) return 'ร่างกายกำลังขอพัก ไม่ใช่ขอของ ลองนอนก่อน 20 นาที'
  if (halt.includes('lonely')) return 'ทักหาใครสักคนก่อน แค่คุยเรื่องอะไรก็ได้'
  if (halt.includes('angry')) return 'ระบายออกทางร่างกายก่อน เดินเร็ว ๆ หรือต่อยกระสอบ'
  if (halt.includes('bored')) return 'ความเบื่อผ่านได้ด้วยการเปลี่ยนที่ ลองออกจากห้องนี้ก่อน'
  return 'การฉลองไม่จำเป็นต้องมาในรูปแบบเดิม ลองคิดว่าจะฉลองแบบไหนได้อีก'
}

function StepShell({ title, body, children }: { title: string; body?: string; children: React.ReactNode }) {
  return (
    <div className="animate-rise">
      <h1 className="mb-1.5 text-[22px] leading-snug font-semibold">{title}</h1>
      {body && <p className="mb-6 text-[13.5px] leading-relaxed text-[var(--muted)]">{body}</p>}
      {children}
    </div>
  )
}

function StartStep({ onNext, onExit }: { onNext: () => void; onExit: () => void }) {
  return (
    <div className="animate-rise pt-6 text-center">
      <div className="mb-6 text-5xl">⚓</div>
      <h1 className="mb-3 text-[24px] leading-snug font-semibold">โอเค อยู่ตรงนี้ก่อน</h1>
      <p className="mb-8 text-[14px] leading-loose text-[var(--muted)]">
        นายยังไม่ได้ตัดสินใจอะไรทั้งนั้น แค่กดเข้ามาก็คือชนะไปครึ่งทางแล้ว
        <br />
        ใช้เวลาสัก 2 นาทีด้วยกันก่อน
      </p>
      <Button size="lg" className="w-full" onClick={onNext}>
        เริ่มเลย
      </Button>
      <button onClick={onExit} className="mt-4 w-full py-2 text-[13px] text-[var(--muted)]">
        ไว้ก่อน
      </button>
    </div>
  )
}

function BreatheStep({ onDone }: { onDone: () => void }) {
  const TOTAL = 60
  const [left, setLeft] = useState(TOTAL)

  useEffect(() => {
    const id = setInterval(() => setLeft((v) => Math.max(0, v - 1)), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="animate-rise pt-4 text-center">
      <h1 className="mb-2 text-[20px] font-semibold">หายใจตามวงกลม</h1>
      <p className="mb-10 text-[13px] text-[var(--muted)]">ขยาย = หายใจเข้า · หด = หายใจออก</p>

      <div className="relative mx-auto mb-10 flex h-64 w-64 items-center justify-center">
        <div
          className="absolute h-56 w-56 rounded-full"
          style={{ background: 'var(--glow)', animation: 'breathe 8s ease-in-out infinite' }}
        />
        <div
          className="absolute h-40 w-40 rounded-full border-2 border-[var(--accent)]"
          style={{ animation: 'breathe 8s ease-in-out infinite' }}
        />
        <span className="num relative text-3xl font-semibold">{left}</span>
      </div>

      {left > 0 ? (
        <p className="text-[13px] text-[var(--muted)]">อีก {left} วินาที</p>
      ) : (
        <Button size="lg" className="w-full" onClick={onDone}>
          ต่อไป
        </Button>
      )}
      {left > 0 && left < 45 && (
        <button onClick={onDone} className="mt-6 w-full py-2 text-[12px] text-[var(--muted)]/70">
          ข้ามไปก่อน
        </button>
      )}
    </div>
  )
}

function WaitStep({
  session,
  coping,
  onSetWait,
  onDone,
}: {
  session: Session
  coping: string[]
  onSetWait: (min: number) => void
  onDone: () => void
}) {
  const [now, setNow] = useState(Date.now())
  const beep = useRef(false)

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(id)
  }, [])

  const left = session.waitEndAt ? Math.max(0, Math.round((session.waitEndAt - now) / 1000)) : null
  const total = session.waitMinutes * 60
  const pct = left === null ? 0 : ((total - left) / total) * 100

  useEffect(() => {
    if (left === 0 && !beep.current) {
      beep.current = true
      if ('vibrate' in navigator) navigator.vibrate?.([200, 100, 200])
    }
  }, [left])

  if (left === null) {
    return (
      <StepShell
        title="หน่วงเวลาไว้ก่อน"
        body="ความอยากมาเป็นคลื่น ไม่ใช่เส้นตรง ส่วนใหญ่จะพีคแล้วลงเองภายใน 20 นาที ถ้าไม่เติมเชื้อ"
      >
        <div className="grid grid-cols-3 gap-2.5">
          {WAIT_OPTIONS.map((o) => (
            <button
              key={o.min}
              onClick={() => onSetWait(o.min)}
              className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] py-5 text-center transition active:border-[var(--accent)]"
            >
              <div className="num text-2xl font-semibold">{o.min}</div>
              <div className="text-[11px] text-[var(--muted)]">นาที</div>
            </button>
          ))}
        </div>
        <p className="mt-5 text-center text-[12.5px] leading-relaxed text-[var(--muted)]">
          ปิดแอปไปทำอย่างอื่นได้เลย นาฬิกาจะเดินต่อ
        </p>
      </StepShell>
    )
  }

  return (
    <div className="animate-rise">
      <div className="mb-8 text-center">
        <p className="mb-2 text-[13px] text-[var(--muted)]">{left > 0 ? 'ยังเหลือ' : 'ครบแล้ว'}</p>
        <div className="num mb-5 text-6xl font-bold tracking-tight">{fmtDuration(left)}</div>
        <div className="mx-auto h-1.5 w-48 overflow-hidden rounded-full bg-[var(--surface-2)]">
          <div className="h-full rounded-full bg-[var(--accent)] transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {left > 0 ? (
        <>
          <p className="mb-3 px-1 text-[13px] font-medium text-[var(--muted)]">ระหว่างนี้ ทำอันไหนก็ได้</p>
          <div className="space-y-2.5">
            {(coping.length ? coping : ['ออกไปเดิน 10 นาที', 'อาบน้ำ', 'โทรหาใครสักคน']).map((c, i) => (
              <Card key={i} className="flex items-center gap-3 px-4 py-4">
                <span className="num w-5 text-center text-[13px] text-[var(--muted)]">{i + 1}</span>
                <span className="text-[14px]">{c}</span>
              </Card>
            ))}
          </div>
          <button onClick={onDone} className="mt-6 w-full py-3 text-[13px] text-[var(--muted)] underline underline-offset-4">
            ข้ามการรอ
          </button>
        </>
      ) : (
        <Button size="lg" className="w-full" onClick={onDone}>
          หมดเวลาแล้ว ไปต่อ
        </Button>
      )}
    </div>
  )
}

function DoneStep({ session, onExit, onRestart }: { session: Session; onExit: () => void; onRestart: () => void }) {
  const passed = useMemo(() => Math.round((Date.now() - session.startedAt) / 60000), [session.startedAt])
  return (
    <div className="animate-rise pt-8 text-center">
      <div className="animate-pop mb-6 text-5xl">🌊</div>
      <h1 className="mb-3 text-[24px] font-semibold">บันทึกไว้แล้ว</h1>
      <p className="mb-8 text-[14px] leading-loose text-[var(--muted)]">
        นายอยู่กับมันมา {passed || 1} นาที โดยไม่ทำอะไรเลย
        <br />
        ทุกครั้งที่ทำแบบนี้ ครั้งต่อไปมันจะง่ายขึ้นจริง ๆ
      </p>
      <Button size="lg" className="w-full" onClick={onExit}>
        กลับหน้าหลัก
      </Button>
      <button onClick={onRestart} className="mt-4 w-full py-2 text-[13px] text-[var(--muted)]">
        ยังไม่หาย เริ่มรอบใหม่
      </button>
    </div>
  )
}
