import { db, type Task } from '../db'

/**
 * Starter tasks. Every one is editable or deletable — they exist so the first
 * screen is never an empty list, which is where habit apps usually lose people.
 */
const STARTER: Omit<Task, 'id'>[] = [
  {
    title: 'เช็กอินใจตัวเอง',
    pillar: 'recovery',
    kind: 'core',
    xp: 15,
    minutes: 5,
    variants: [
      'เขียน 3 บรรทัด: วันนี้รู้สึกยังไง เพราะอะไร',
      'นั่งเงียบ 5 นาที ไม่ต้องทำอะไร',
      'ทบทวน: วันนี้อะไรที่เกือบทำให้เสียหลัก',
      'ส่งข้อความหาคนที่ไว้ใจ 1 คน',
    ],
    active: true,
    order: 0,
    createdAt: Date.now(),
  },
  {
    title: 'ขยับร่างกาย',
    pillar: 'body',
    kind: 'core',
    xp: 20,
    minutes: 30,
    variants: [
      'ยิม / เวทเทรนนิ่ง',
      'วิ่ง หรือ ปั่น',
      'เล่นกีฬาที่ชอบ',
      'ยืดเหยียด + คอร์ 20 นาที',
      'เดินเร็ว 40 นาทีแบบไม่ฟังอะไรเลย',
    ],
    active: true,
    order: 1,
    createdAt: Date.now(),
  },
  {
    title: 'เติมความรู้ธุรกิจ',
    pillar: 'craft',
    kind: 'core',
    xp: 20,
    minutes: 25,
    variants: [
      'อ่านหนังสือธุรกิจ 20 นาที',
      'ฟังพอดแคสต์ 1 ตอน แล้วสรุป 3 บรรทัด',
      'แกะเคสแบรนด์ที่ชอบ 1 แบรนด์',
      'อ่านงบ/ตัวเลขของธุรกิจจริง 1 อัน',
      'เขียนไอเดียธุรกิจ 5 ข้อ แบบไม่ต้องดี',
    ],
    active: true,
    order: 2,
    createdAt: Date.now(),
  },
  {
    title: 'ภาษา',
    pillar: 'brain',
    kind: 'core',
    xp: 15,
    minutes: 15,
    variants: [
      'แอปเรียนภาษา 15 นาที',
      'ดูคลิปซับภาษาเป้าหมาย 1 คลิป',
      'จดศัพท์ใหม่ 10 คำ แล้วแต่งประโยคเอง',
      'พูดอัดเสียงตัวเอง 3 นาที',
    ],
    active: true,
    order: 3,
    createdAt: Date.now(),
  },
  {
    title: 'ฝึกงานออกแบบ',
    pillar: 'craft',
    kind: 'menu',
    xp: 20,
    minutes: 30,
    variants: ['รีดีไซน์ของที่เห็นวันนี้ 1 ชิ้น', 'ฝึกเครื่องมือใหม่ 30 นาที', 'เก็บ reference 20 ชิ้นแล้วจัดหมวด'],
    active: true,
    order: 4,
    createdAt: Date.now(),
  },
  {
    title: 'เดินเรื่องเรียนต่อ ป.โท',
    pillar: 'brain',
    kind: 'menu',
    xp: 25,
    minutes: 30,
    variants: ['หามหาลัย/หลักสูตร 1 ที่ แล้วจดเดดไลน์', 'เขียน SOP 1 ย่อหน้า', 'ฝึกข้อสอบภาษา 30 นาที', 'จัด portfolio 1 หน้า'],
    active: true,
    order: 5,
    createdAt: Date.now(),
  },
  {
    title: 'พักสมองแบบไม่ใช่ฟีด',
    pillar: 'mind',
    kind: 'menu',
    xp: 10,
    minutes: 20,
    variants: ['อ่านหนังสือกระดาษ', 'ออกไปเดินข้างนอก', 'ทำอาหารเอง', 'ฟังเพลงเต็มอัลบั้มโดยไม่จับมือถือ'],
    active: true,
    order: 6,
    createdAt: Date.now(),
  },
  {
    title: 'นอนให้ตรงเวลา',
    pillar: 'body',
    kind: 'menu',
    xp: 15,
    minutes: null,
    variants: ['วางมือถือนอกห้อง', 'ปิดจอก่อนนอน 45 นาที'],
    active: true,
    order: 7,
    createdAt: Date.now(),
  },
]

export const DEFAULT_COPING = [
  'ออกไปเดิน/วิ่ง 20 นาที',
  'อาบน้ำเย็น',
  'โทรหาคนที่ไว้ใจ',
  'กินอะไรให้อิ่มก่อน',
  'ไปยิมหรือต่อยกระสอบ',
  'ขับรถออกจากบริเวณนั้นทันที',
]

export const DEFAULT_REWARDS = [
  { title: 'ดูหนังโรงที่อยากดู', cost: 120 },
  { title: 'กินร้านที่อยากลอง', cost: 200 },
  { title: 'ของเล่นดีไซน์ชิ้นใหม่', cost: 600 },
  { title: 'ทริปสุดสัปดาห์', cost: 2000 },
]

export async function seedIfEmpty(): Promise<void> {
  if ((await db.tasks.count()) === 0) await db.tasks.bulkAdd(STARTER as Task[])
  if ((await db.rewards.count()) === 0) {
    await db.rewards.bulkAdd(DEFAULT_REWARDS.map((r) => ({ ...r, redeemedAt: null, createdAt: Date.now() })))
  }
}
