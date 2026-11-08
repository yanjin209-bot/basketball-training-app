// 每日任务池与恢复日规则
import type { DrillCategory } from './drills'

export type QuestKind = 'attempts' | 'minutes' | 'test' | 'games'

export interface QuestDef {
  id: string
  title: string
  kind: QuestKind
  target: number
  reward: number
  unit: string
  filter?: { category?: DrillCategory; drillId?: string }
  group: 'shooting' | 'skill' | 'bonus' | 'recovery'
}

export const QUEST_POOL: QuestDef[] = [
  { id: 'shots30', title: '完成 30 次投篮出手', kind: 'attempts', target: 30, reward: 25, unit: '次', filter: { category: 'shooting' }, group: 'shooting' },
  { id: 'shots60', title: '完成 60 次投篮出手', kind: 'attempts', target: 60, reward: 35, unit: '次', filter: { category: 'shooting' }, group: 'shooting' },
  { id: 'ft20', title: '完成 20 次罚球', kind: 'attempts', target: 20, reward: 25, unit: '次', filter: { drillId: 'free_throw' }, group: 'shooting' },
  { id: 'three30', title: '完成 30 次三分出手', kind: 'attempts', target: 30, reward: 30, unit: '次', filter: { drillId: 'three_point' }, group: 'shooting' },
  { id: 'handle10', title: '完成 10 分钟运球训练', kind: 'minutes', target: 10, reward: 25, unit: '分钟', filter: { category: 'handles' }, group: 'skill' },
  { id: 'layup20', title: '完成 20 次上篮', kind: 'attempts', target: 20, reward: 25, unit: '次', filter: { drillId: 'layup' }, group: 'skill' },
  { id: 'defense8', title: '完成 8 分钟防守脚步', kind: 'minutes', target: 8, reward: 25, unit: '分钟', filter: { drillId: 'def_slides' }, group: 'skill' },
  { id: 'cond15', title: '完成 15 分钟体能 / 敏捷训练', kind: 'minutes', target: 15, reward: 30, unit: '分钟', filter: { category: 'conditioning' }, group: 'skill' },
  { id: 'test1', title: '完成一次能力测试', kind: 'test', target: 1, reward: 40, unit: '次', group: 'bonus' },
  { id: 'rec15', title: '完成 15 分钟恢复训练', kind: 'minutes', target: 15, reward: 25, unit: '分钟', filter: { drillId: 'recovery' }, group: 'recovery' },
  { id: 'ftlight', title: '轻量找手感：10 次罚球', kind: 'attempts', target: 10, reward: 15, unit: '次', filter: { drillId: 'free_throw' }, group: 'recovery' },
  { id: 'gamelog', title: '记录一场实战数据与心得', kind: 'games', target: 1, reward: 20, unit: '场', group: 'recovery' }
]

export const QUEST_MAP: Record<string, QuestDef> = Object.fromEntries(QUEST_POOL.map((q) => [q.id, q]))

export const RECOVERY_RULES = {
  /** 连续 N 天有非恢复训练 → 今日为恢复日 */
  consecutiveDays: 3,
  /** 昨日训练负荷（分钟 × RPE）超过该值 → 今日为恢复日 */
  heavyLoad: 700,
  /** 最近几天做过能力测试则不再派发测试任务 */
  testCooldownDays: 6
}
