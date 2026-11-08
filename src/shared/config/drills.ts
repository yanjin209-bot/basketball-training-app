// 现实训练项目定义：表单字段、合理范围与 XP 规则
import type { AttrKey } from '../types'

export type DrillCategory = 'shooting' | 'handles' | 'finishing' | 'defense' | 'conditioning' | 'recovery'
export type DrillMetric = 'shots' | 'reps' | 'time'
export type Intensity = 'low' | 'mid' | 'high'

export interface DrillDef {
  id: string
  name: string
  en: string
  category: DrillCategory
  attr: AttrKey
  metric: DrillMetric
  intensity: Intensity
  description: string
  goal: string
  steps: string[]
  defaultMinutes: number
  locations?: string[]
  repsLabel?: string
  /** 每分钟最多合理出手数 / 次数，用于校验 */
  maxPerMinute?: number
}

export const CATEGORY_META: Record<DrillCategory, { name: string; en: string }> = {
  shooting: { name: '投篮', en: 'SHOOTING' },
  handles: { name: '控球', en: 'HANDLES' },
  finishing: { name: '终结', en: 'FINISHING' },
  defense: { name: '防守', en: 'DEFENSE' },
  conditioning: { name: '体能', en: 'CONDITIONING' },
  recovery: { name: '恢复', en: 'RECOVERY' }
}

export const INTENSITY_META: Record<Intensity, { name: string; xpPerMin: number }> = {
  low: { name: '低强度', xpPerMin: 1.5 },
  mid: { name: '中强度', xpPerMin: 2.5 },
  high: { name: '高强度', xpPerMin: 3.2 }
}

const SPOTS = ['左底角', '左侧45°', '罚球线', '右侧45°', '右底角', '左肘区', '右肘区', '篮下']
const THREES = ['左底角三分', '左侧45°三分', '弧顶三分', '右侧45°三分', '右底角三分']

export const DRILLS: DrillDef[] = [
  {
    id: 'spot_shooting', name: '定点投篮', en: 'SPOT SHOOTING', category: 'shooting', attr: 'shooting', metric: 'shots', intensity: 'mid',
    description: '固定点位重复出手，打磨出手节奏与稳定性。', goal: '每个点位 20–30 次出手，命中率稳定在 45% 以上',
    steps: ['选择 3–5 个中距离点位', '每个点位连续出手并记录命中', '保持同样的出手节奏与跟随动作'],
    defaultMinutes: 20, locations: SPOTS, maxPerMinute: 14
  },
  {
    id: 'free_throw', name: '罚球训练', en: 'FREE THROWS', category: 'shooting', attr: 'shooting', metric: 'shots', intensity: 'low',
    description: '建立固定的罚球前程序，稳定关键分。', goal: '每组 10 球，累计 50 球以上',
    steps: ['固定罚球前程序（运球次数、呼吸）', '每组 10 球后记录命中', '组间休息 30 秒模拟比赛节奏'],
    defaultMinutes: 15, locations: ['罚球线'], maxPerMinute: 10
  },
  {
    id: 'three_point', name: '三分训练', en: 'THREE POINT', category: 'shooting', attr: 'shooting', metric: 'shots', intensity: 'mid',
    description: '五个三分点位轮转，提升远距离稳定性。', goal: '五点各 10–20 球',
    steps: ['从左底角开始依次轮转五个点位', '每点出手后记录命中', '注意下肢发力，避免只用手臂'],
    defaultMinutes: 25, locations: THREES, maxPerMinute: 12
  },
  {
    id: 'ball_handling', name: '控球训练', en: 'BALL HANDLING', category: 'handles', attr: 'dribbling', metric: 'time', intensity: 'mid',
    description: '原地组合运球：高低运、胯下、背后，强化手感。', goal: '连续 10–15 分钟不丢球',
    steps: ['高运 / 低运各 60 秒', '胯下、背后组合各 60 秒', '抬头运球，视线离开篮球'],
    defaultMinutes: 15, repsLabel: '失误次数（可选）'
  },
  {
    id: 'weak_hand', name: '左右手运球', en: 'WEAK HAND', category: 'handles', attr: 'dribbling', metric: 'time', intensity: 'mid',
    description: '专项强化弱侧手，消除防守针对的短板。', goal: '弱侧手训练时长 ≥ 总时长的 60%',
    steps: ['弱侧手原地运球 3×60 秒', '弱侧手行进间运球往返', '双手交替运球收尾'],
    defaultMinutes: 12
  },
  {
    id: 'crossover', name: '变向训练', en: 'CROSSOVER', category: 'handles', attr: 'dribbling', metric: 'reps', intensity: 'high',
    description: '体前、胯下、背后变向结合启动，练习摆脱。', goal: '每种变向 20 次以上',
    steps: ['放置标志桶模拟防守人', '变向后立刻加速两步', '记录完成的有效变向次数'],
    defaultMinutes: 15, repsLabel: '有效变向次数', maxPerMinute: 40
  },
  {
    id: 'layup', name: '上篮训练', en: 'LAYUPS', category: 'finishing', attr: 'finishing', metric: 'shots', intensity: 'high',
    description: '左右手上篮、反手、抛投，提升篮下终结。', goal: '左右手各 30 次，命中率 70%+',
    steps: ['正手上篮左右各 15 次', '反手上篮 / 抛投各 10 次', '记录总出手与命中'],
    defaultMinutes: 15, locations: ['右手上篮', '左手上篮', '反手上篮', '抛投', '强起'], maxPerMinute: 12
  },
  {
    id: 'def_slides', name: '防守脚步', en: 'DEFENSIVE SLIDES', category: 'defense', attr: 'defense', metric: 'reps', intensity: 'high',
    description: '低重心滑步、撤步、关闭跑，打造防守基础。', goal: '每组 30 秒 × 8 组',
    steps: ['罚球区宽度横向滑步', '45° 撤步 + 关闭跑', '记录完成组数'],
    defaultMinutes: 12, repsLabel: '完成组数', maxPerMinute: 6
  },
  {
    id: 'agility', name: '敏捷训练', en: 'AGILITY', category: 'conditioning', attr: 'athleticism', metric: 'reps', intensity: 'high',
    description: '绳梯、标志桶折返、反应启动。', goal: '6–10 组高质量重复',
    steps: ['绳梯步法 4 组', 'T 字折返 4 组', '记录完成组数'],
    defaultMinutes: 15, repsLabel: '完成组数', maxPerMinute: 6
  },
  {
    id: 'conditioning', name: '体能训练', en: 'CONDITIONING', category: 'conditioning', attr: 'athleticism', metric: 'time', intensity: 'high',
    description: '折返跑、间歇冲刺与核心力量。', goal: '20–30 分钟，心率进入高强度区间',
    steps: ['动态热身 5 分钟', '全场折返 / 间歇冲刺', '核心与下肢力量收尾'],
    defaultMinutes: 25
  },
  {
    id: 'recovery', name: '恢复训练', en: 'RECOVERY', category: 'recovery', attr: 'athleticism', metric: 'time', intensity: 'low',
    description: '拉伸、泡沫轴、轻量投篮，让身体真正恢复。', goal: '10–30 分钟低强度活动',
    steps: ['全身动态拉伸', '泡沫轴放松小腿与大腿', '可选：轻量罚球找手感'],
    defaultMinutes: 20
  }
]

export const DRILL_MAP: Record<string, DrillDef> = Object.fromEntries(DRILLS.map((d) => [d.id, d]))

export const TRAINING_LIMITS = {
  durationMin: { min: 1, max: 240 },
  rpe: { min: 1, max: 10 },
  setsMax: 20,
  attemptsPerSet: 600,
  repsPerSet: 3000,
  notesMax: 500
}
