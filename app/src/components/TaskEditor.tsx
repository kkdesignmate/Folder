import { useEffect, useState } from 'react'
import { db, PILLARS, type Pillar, type Task } from '../db'
import { Button, Card, Chip, Field, Input, Sheet, Textarea } from './ui'

const XP_CHOICES = [10, 15, 20, 25, 30]

export function TaskEditor({
  open,
  task,
  onClose,
}: {
  open: boolean
  task: Task | null
  onClose: () => void
}) {
  const [title, setTitle] = useState('')
  const [pillar, setPillar] = useState<Pillar>('body')
  const [kind, setKind] = useState<'core' | 'menu'>('core')
  const [xp, setXp] = useState(20)
  const [minutes, setMinutes] = useState('')
  const [variants, setVariants] = useState('')

  useEffect(() => {
    if (!open) return
    setTitle(task?.title ?? '')
    setPillar(task?.pillar ?? 'body')
    setKind(task?.kind ?? 'core')
    setXp(task?.xp ?? 20)
    setMinutes(task?.minutes ? String(task.minutes) : '')
    setVariants((task?.variants ?? []).join('\n'))
  }, [open, task])

  async function save() {
    if (!title.trim()) return
    const payload = {
      title: title.trim(),
      pillar,
      kind,
      xp,
      minutes: minutes ? Number(minutes) : null,
      variants: variants
        .split('\n')
        .map((v) => v.trim())
        .filter(Boolean),
      active: true,
    }
    if (task?.id) await db.tasks.update(task.id, payload)
    else await db.tasks.add({ ...payload, order: await db.tasks.count(), createdAt: Date.now() })
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title={task ? 'แก้ไขงาน' : 'เพิ่มงาน'}>
      <Field label="ชื่องาน">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="เช่น อ่านหนังสือธุรกิจ" />
      </Field>

      <Field label="ประเภท">
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              { k: 'core' as const, t: 'งานหลัก', s: 'นับสตรีค' },
              { k: 'menu' as const, t: 'เมนูเสริม', s: 'ทำเมื่ออยาก' },
            ]
          ).map((o) => (
            <button
              key={o.k}
              onClick={() => setKind(o.k)}
              className={`rounded-xl border px-3 py-3 text-left ${
                kind === o.k ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : 'border-[var(--line)]'
              }`}
            >
              <div className="text-[13.5px] font-medium">{o.t}</div>
              <div className="text-[11.5px] text-[var(--muted)]">{o.s}</div>
            </button>
          ))}
        </div>
      </Field>

      <Field label="ด้าน">
        <div className="no-bar flex gap-2 overflow-x-auto pb-1">
          {(Object.keys(PILLARS) as Pillar[]).map((p) => (
            <Chip key={p} active={pillar === p} onClick={() => setPillar(p)}>
              {PILLARS[p].icon} {PILLARS[p].label}
            </Chip>
          ))}
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="XP">
          <div className="no-bar flex gap-2 overflow-x-auto pb-1">
            {XP_CHOICES.map((v) => (
              <Chip key={v} active={xp === v} onClick={() => setXp(v)}>
                {v}
              </Chip>
            ))}
          </div>
        </Field>
        <Field label="กี่นาที">
          <Input type="number" min={0} value={minutes} onChange={(e) => setMinutes(e.target.value)} placeholder="ไม่ระบุ" />
        </Field>
      </div>

      <Field
        label="วิธีทำแบบต่าง ๆ (บรรทัดละ 1 อย่าง)"
        hint="ใส่ไว้หลายแบบ แล้วแอปจะสลับให้แต่ละวัน เพื่อไม่ให้ซ้ำจนเบื่อ"
      >
        <Textarea
          rows={5}
          value={variants}
          onChange={(e) => setVariants(e.target.value)}
          placeholder={'อ่านหนังสือ 20 นาที\nฟังพอดแคสต์ 1 ตอน\nแกะเคส 1 แบรนด์'}
        />
      </Field>

      <Button size="lg" className="mt-1 w-full" onClick={save} disabled={!title.trim()}>
        บันทึก
      </Button>
    </Sheet>
  )
}

export function TaskManager({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [editing, setEditing] = useState<Task | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [tasks, setTasks] = useState<Task[]>([])

  useEffect(() => {
    if (!open && !editorOpen) return
    db.tasks.toArray().then((t) => setTasks(t.sort((a, b) => a.order - b.order)))
  }, [open, editorOpen])

  async function remove(id: number) {
    await db.tasks.delete(id)
    setTasks(await db.tasks.toArray().then((t) => t.sort((a, b) => a.order - b.order)))
  }

  async function toggleActive(t: Task) {
    await db.tasks.update(t.id!, { active: !t.active })
    setTasks(await db.tasks.toArray().then((x) => x.sort((a, b) => a.order - b.order)))
  }

  return (
    <>
      <Sheet open={open} onClose={onClose} title="จัดการงานทั้งหมด">
        <div className="space-y-2">
          {tasks.map((t) => (
            <Card key={t.id} className="flex items-center gap-2 px-3 py-2.5">
              <button onClick={() => toggleActive(t)} className="text-lg" title={t.active ? 'ปิดใช้' : 'เปิดใช้'}>
                {t.active ? '👁' : '🚫'}
              </button>
              <button
                onClick={() => {
                  setEditing(t)
                  setEditorOpen(true)
                }}
                className="min-w-0 flex-1 text-left"
              >
                <span className={`block truncate text-[14px] ${t.active ? '' : 'text-[var(--muted)] line-through'}`}>
                  {t.title}
                </span>
                <span className="block text-[11.5px] text-[var(--muted)]">
                  {PILLARS[t.pillar].icon} {t.kind === 'core' ? 'งานหลัก' : 'เมนูเสริม'} · {t.variants.length} แบบ
                </span>
              </button>
              <button onClick={() => remove(t.id!)} className="px-1.5 text-[var(--muted)]" title="ลบ">
                ✕
              </button>
            </Card>
          ))}
        </div>
        <Button
          className="mt-4 w-full"
          onClick={() => {
            setEditing(null)
            setEditorOpen(true)
          }}
        >
          + เพิ่มงานใหม่
        </Button>
      </Sheet>

      <TaskEditor open={editorOpen} task={editing} onClose={() => setEditorOpen(false)} />
    </>
  )
}
