import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, PILLARS, type Pillar } from '../db'
import { levelProgress, xpByPillar } from '../lib/xp'
import { saveSettings, useSettings, useStats } from '../lib/store'
import { Button, Card, Empty, Field, Input, Progress, SectionTitle, Sheet } from '../components/ui'

const CARD_ICON: Record<string, string> = { xp: '⚡', points: '🪙', freeze: '🛡', quote: '💬', theme: '🎨' }

export default function Rewards() {
  const settings = useSettings()
  const stats = useStats()
  const rewards = useLiveQuery(() => db.rewards.toArray(), [])
  const cards = useLiveQuery(() => db.cards.orderBy('at').reverse().limit(12).toArray(), [])
  const [adding, setAdding] = useState(false)

  const points = settings?.points ?? 0
  const shop = (rewards ?? []).filter((r) => !r.redeemedAt).sort((a, b) => a.cost - b.cost)
  const claimed = (rewards ?? []).filter((r) => r.redeemedAt)
  const pillars = xpByPillar(stats?.completions ?? [])

  async function redeem(id: number, cost: number) {
    if (points < cost) return
    await saveSettings({ points: points - cost })
    await db.rewards.update(id, { redeemedAt: Date.now() })
  }

  return (
    <div className="mx-auto max-w-md px-4 pt-5">
      <header className="mb-5">
        <h1 className="text-[26px] font-semibold">รางวัล</h1>
        <p className="mt-0.5 text-[13px] text-[var(--muted)]">รางวัลที่ตั้งเอง แลกได้เมื่ออยากแลก</p>
      </header>

      <Card className="mb-6 px-4 py-5 text-center">
        <p className="mb-1 text-[12px] text-[var(--muted)]">แต้มที่ใช้ได้</p>
        <p className="num text-4xl font-bold text-[var(--accent)]">{points.toLocaleString('th-TH')}</p>
        <p className="mt-1.5 text-[11.5px] text-[var(--muted)]">
          🛡 โล่กันสตรีคขาดเหลือ {settings?.freezeTokens ?? 0} ชิ้น · เติมทุกเดือน
        </p>
      </Card>

      <SectionTitle action={<button onClick={() => setAdding(true)} className="text-[12.5px] text-[var(--accent)]">+ เพิ่ม</button>}>
        แลกรางวัล
      </SectionTitle>
      {shop.length === 0 ? (
        <Card>
          <Empty icon="🎁" title="ยังไม่มีรางวัล" body="ตั้งรางวัลที่อยากได้จริง ๆ แล้วเก็บแต้มไปแลก" />
        </Card>
      ) : (
        <div className="space-y-2.5">
          {shop.map((r) => {
            const can = points >= r.cost
            return (
              <Card key={r.id} className="flex items-center gap-3 px-4 py-3.5">
                <div className="min-w-0 flex-1">
                  <p className="text-[14.5px] font-medium">{r.title}</p>
                  <div className="mt-1.5">
                    <Progress pct={(points / r.cost) * 100} />
                  </div>
                  <p className="num mt-1 text-[11.5px] text-[var(--muted)]">
                    {Math.min(points, r.cost).toLocaleString('th-TH')} / {r.cost.toLocaleString('th-TH')} แต้ม
                  </p>
                </div>
                <Button size="sm" disabled={!can} onClick={() => redeem(r.id!, r.cost)}>
                  แลก
                </Button>
              </Card>
            )
          })}
        </div>
      )}

      <SectionTitle>ระดับแต่ละด้าน</SectionTitle>
      <Card className="divide-y divide-[var(--line)]">
        {(Object.keys(PILLARS) as Pillar[]).map((p) => {
          const lp = levelProgress(pillars[p])
          return (
            <div key={p} className="px-4 py-3.5">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[14px]">
                  {PILLARS[p].icon} {PILLARS[p].label}
                </span>
                <span className="num text-[12.5px] font-semibold text-[var(--accent)]">Lv.{lp.level}</span>
              </div>
              <Progress pct={lp.pct} />
            </div>
          )
        })}
      </Card>

      <SectionTitle>การ์ดที่เปิดได้ล่าสุด</SectionTitle>
      {(cards ?? []).length === 0 ? (
        <Card>
          <Empty icon="🎴" title="ยังไม่มีการ์ด" body="ติ๊กงานเสร็จแล้วมีโอกาสสุ่มได้การ์ด ไม่รู้ว่าจะได้เมื่อไหร่" />
        </Card>
      ) : (
        <div className="space-y-2">
          {(cards ?? []).map((c) => (
            <Card key={c.id} className="flex items-center gap-3 px-4 py-3">
              <span className="text-lg">{CARD_ICON[c.kind]}</span>
              <span className="flex-1 text-[13.5px] leading-snug">{c.label}</span>
              {c.value > 0 && <span className="num text-[13px] font-semibold text-[var(--accent)]">+{c.value}</span>}
            </Card>
          ))}
        </div>
      )}

      {claimed.length > 0 && (
        <>
          <SectionTitle>แลกไปแล้ว</SectionTitle>
          <div className="space-y-2 pb-4">
            {claimed.map((r) => (
              <Card key={r.id} className="px-4 py-3 text-[13.5px] text-[var(--muted)]">
                {r.title} ✓
              </Card>
            ))}
          </div>
        </>
      )}

      <AddReward open={adding} onClose={() => setAdding(false)} />
    </div>
  )
}

/** Substances make poor rewards; the shop refuses to store them as goals. */
const BLOCKED = ['เหล้า', 'เบียร์', 'ไวน์', 'วิสกี้', 'สุรา', 'ดื่ม', 'ยา', 'กัญชา', 'บุหรี่', 'พอต', 'alcohol', 'beer', 'wine', 'weed', 'vape']

function AddReward({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [title, setTitle] = useState('')
  const [cost, setCost] = useState(200)
  const blocked = BLOCKED.some((w) => title.toLowerCase().includes(w))

  async function save() {
    if (!title.trim() || blocked) return
    await db.rewards.add({ title: title.trim(), cost, redeemedAt: null, createdAt: Date.now() })
    setTitle('')
    setCost(200)
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title="เพิ่มรางวัล">
      <Field label="อยากได้อะไร" hint="ยิ่งเป็นของที่อยากได้จริง ยิ่งได้ผล">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="เช่น รองเท้าคู่ที่หมายตาไว้" />
      </Field>
      {blocked && (
        <p className="mb-3 text-[12.5px] leading-relaxed text-[var(--danger)]">
          อันนี้ตั้งเป็นรางวัลไม่ได้นะ — ลองนึกถึงอย่างอื่นที่อยากได้ดู
        </p>
      )}
      <Field label="กี่แต้ม">
        <Input type="number" min={10} step={10} value={cost} onChange={(e) => setCost(Math.max(10, Number(e.target.value) || 10))} />
      </Field>
      <Button size="lg" className="mt-2 w-full" onClick={save} disabled={!title.trim() || blocked}>
        เพิ่ม
      </Button>
    </Sheet>
  )
}
