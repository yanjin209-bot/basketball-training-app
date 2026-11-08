// 标准化能力测试：能力评分只由这些测试计算，普通训练不会改变评分
import type { AttrKey } from '../types'

export interface SkillTestDef {
  id: string
  attr: AttrKey
  name: string
  sub: string // 子能力名称
  unit: string
  better: 'higher' | 'lower'
  protocol: string
  inputLabel: string
  range: { min: number; max: number; step: number }
  /** 分段线性评分曲线：[原始成绩, 评分]，按原始成绩升序 */
  curve: Array<[number, number]>
  /** 由系统内置流程产生（如球商问答），不可手动输入 */
  builtIn?: 'quiz' | 'games'
}

export const SKILL_TESTS: SkillTestDef[] = [
  // 投篮
  {
    id: 'ft50', attr: 'shooting', name: '50 球罚球测试', sub: '罚球', unit: '中', better: 'higher',
    protocol: '标准罚球线连续罚球 50 次，每 10 球可休息 20 秒，记录命中数。', inputLabel: '命中数（满分 50）',
    range: { min: 0, max: 50, step: 1 }, curve: [[0, 25], [15, 40], [25, 55], [33, 67], [40, 79], [45, 89], [48, 95], [50, 99]]
  },
  {
    id: 'three50', attr: 'shooting', name: '五点三分测试', sub: '三分', unit: '中', better: 'higher',
    protocol: '五个三分点位各投 10 球（共 50 球），限时 8 分钟，自抢篮板，记录总命中。', inputLabel: '命中数（满分 50）',
    range: { min: 0, max: 50, step: 1 }, curve: [[0, 25], [8, 40], [15, 55], [20, 66], [25, 76], [30, 85], [36, 93], [42, 99]]
  },
  {
    id: 'mid50', attr: 'shooting', name: '中距离测试', sub: '中投', unit: '中', better: 'higher',
    protocol: '两侧肘区、两侧 45° 与罚球线五点各 10 球，记录总命中。', inputLabel: '命中数（满分 50）',
    range: { min: 0, max: 50, step: 1 }, curve: [[0, 25], [10, 40], [18, 55], [24, 66], [30, 77], [36, 87], [42, 95], [46, 99]]
  },
  // 运球
  {
    id: 'pound30', attr: 'dribbling', name: '30 秒强手运球', sub: '控球速度', unit: '次', better: 'higher',
    protocol: '原地强侧手低运球 30 秒，篮球不得高于膝盖，计数有效运球次数。', inputLabel: '运球次数',
    range: { min: 0, max: 200, step: 1 }, curve: [[0, 25], [40, 40], [60, 55], [75, 67], [90, 79], [105, 89], [120, 96], [135, 99]]
  },
  {
    id: 'weak30', attr: 'dribbling', name: '30 秒弱侧手运球', sub: '弱侧手', unit: '次', better: 'higher',
    protocol: '原地弱侧手低运球 30 秒，篮球不得高于膝盖，计数有效运球次数。', inputLabel: '运球次数',
    range: { min: 0, max: 200, step: 1 }, curve: [[0, 25], [30, 40], [50, 55], [65, 67], [80, 79], [95, 89], [110, 96], [125, 99]]
  },
  {
    id: 'cone_dribble', attr: 'dribbling', name: '全场绕桩运球', sub: '行进运球', unit: '秒', better: 'lower',
    protocol: '底线出发，全场 6 个标志桶（间隔 4 米）体前变向绕桩，到达对侧底线计时。', inputLabel: '用时（秒）',
    range: { min: 5, max: 60, step: 0.1 }, curve: [[8, 99], [9, 94], [10, 86], [11.5, 75], [13, 63], [15, 50], [18, 38], [24, 25]]
  },
  // 终结
  {
    id: 'layup60', attr: 'finishing', name: '60 秒连续上篮', sub: '上篮终结', unit: '中', better: 'higher',
    protocol: '左右两侧交替上篮 60 秒，自抢篮板后从三分线内重新启动，记录命中数。', inputLabel: '命中数',
    range: { min: 0, max: 40, step: 1 }, curve: [[0, 25], [6, 40], [10, 55], [13, 66], [16, 77], [19, 87], [22, 95], [25, 99]]
  },
  {
    id: 'mikan60', attr: 'finishing', name: '60 秒麦肯上篮', sub: '篮下手感', unit: '中', better: 'higher',
    protocol: '篮下左右手交替勾手上篮 60 秒，球不落地，记录命中数。', inputLabel: '命中数',
    range: { min: 0, max: 80, step: 1 }, curve: [[0, 25], [10, 40], [18, 55], [25, 67], [32, 78], [38, 88], [44, 95], [50, 99]]
  },
  // 防守
  {
    id: 'lane_agility', attr: 'defense', name: '禁区滑步测试', sub: '横移脚步', unit: '秒', better: 'lower',
    protocol: '沿禁区四角完成冲刺—横滑—后撤—横滑一圈，再反向一圈，记录总用时。', inputLabel: '用时（秒）',
    range: { min: 8, max: 40, step: 0.1 }, curve: [[10.5, 99], [11, 94], [11.8, 86], [12.6, 76], [13.5, 65], [14.8, 52], [16.5, 40], [20, 25]]
  },
  {
    id: 'slide30', attr: 'defense', name: '30 秒横向滑步', sub: '防守耐力', unit: '次', better: 'higher',
    protocol: '两条相距 3.6 米的线之间低重心横滑，脚触线计 1 次，30 秒计数。', inputLabel: '触线次数',
    range: { min: 0, max: 40, step: 1 }, curve: [[0, 25], [8, 40], [11, 55], [13, 66], [15, 77], [17, 87], [19, 95], [21, 99]]
  },
  // 体能
  {
    id: 'vertical', attr: 'athleticism', name: '原地纵跳', sub: '弹跳', unit: 'cm', better: 'higher',
    protocol: '原地双脚起跳摸高，最高点减去站立摸高，取三次最好成绩。', inputLabel: '纵跳高度（厘米）',
    range: { min: 0, max: 120, step: 1 }, curve: [[0, 25], [25, 40], [38, 55], [48, 67], [58, 79], [68, 89], [78, 96], [88, 99]]
  },
  {
    id: 'sprint34', attr: 'athleticism', name: '3/4 场冲刺', sub: '速度', unit: '秒', better: 'lower',
    protocol: '底线到对侧罚球线延长线（约 22.86 米）全力冲刺，取两次最好成绩。', inputLabel: '用时（秒）',
    range: { min: 2.5, max: 10, step: 0.01 }, curve: [[3.0, 99], [3.15, 94], [3.3, 87], [3.5, 77], [3.75, 65], [4.1, 52], [4.6, 40], [5.5, 25]]
  },
  {
    id: 'suicide', attr: 'athleticism', name: '全场折返跑', sub: '耐力', unit: '秒', better: 'lower',
    protocol: '底线出发依次折返罚球线、中线、对侧罚球线、对侧底线，回到起点计时。', inputLabel: '用时（秒）',
    range: { min: 20, max: 90, step: 0.1 }, curve: [[26, 99], [28, 93], [30, 85], [32, 76], [34.5, 65], [37.5, 52], [41, 40], [48, 25]]
  },
  // 球商
  {
    id: 'iq_quiz', attr: 'iq', name: '战术情境问答', sub: '战术理解', unit: '分', better: 'higher',
    protocol: '在应用内完成 10 道场上情境判断题，按正确率计分。', inputLabel: '正确题数',
    range: { min: 0, max: 10, step: 1 }, curve: [[0, 25], [3, 40], [5, 55], [6, 64], [7, 73], [8, 83], [9, 92], [10, 99]], builtIn: 'quiz'
  },
  {
    id: 'ast_to', attr: 'iq', name: '实战助攻失误比', sub: '比赛决策', unit: '比值', better: 'higher',
    protocol: '由最近 10 场实战记录（至少 3 场）自动计算：总助攻 ÷ 总失误。', inputLabel: '助攻失误比',
    range: { min: 0, max: 10, step: 0.01 }, curve: [[0, 30], [0.5, 42], [1, 55], [1.5, 66], [2, 76], [2.5, 85], [3, 92], [4, 99]], builtIn: 'games'
  }
]

export const SKILL_TEST_MAP: Record<string, SkillTestDef> = Object.fromEntries(SKILL_TESTS.map((t) => [t.id, t]))

export interface QuizQuestion {
  q: string
  options: string[]
  answer: number
  why: string
}

/** 原创球商情境题库，测试时随机抽取 10 道 */
export const IQ_QUESTIONS: QuizQuestion[] = [
  { q: '你持球突破，弱侧防守人补防离开了他防守的底角射手，最佳选择是？', options: ['强行上篮造犯规', '分球给底角空位射手', '回传给控卫重新组织', '急停中投'], answer: 1, why: '补防意味着有人空位，底角三分是高效率出手。' },
  { q: '挡拆中对方换防，你的大个子队友被小个子防守，你应该？', options: ['马上自己单打', '把球交给内线队友背身', '叫第二次挡拆', '投三分'], answer: 1, why: '错位优势要尽快利用，把球送进内线。' },
  { q: '比赛剩 6 秒，领先 3 分，对方持球进攻。最常见的稳妥策略是？', options: ['全场紧逼抢断', '故意犯规让对方罚球', '退防禁区', '包夹持球人'], answer: 1, why: '让对方只能拿 2 分，避免被三分追平。' },
  { q: '防守无球人时，正确的站位原则是？', options: ['紧贴对手', '人球兼顾，站在人与球之间偏篮筐一侧', '只盯球', '站在三分线外'], answer: 1, why: '“人—我—球”三角站位能兼顾协防与回位。' },
  { q: '你接到快攻传球形成 2 打 1，防守人站在罚球线犹豫，你应该？', options: ['传给队友', '直接攻筐逼他做选择', '停球等待队友', '投三分'], answer: 1, why: '让防守人做决定：他上就传，他不上就打。' },
  { q: '队友在三秒区内背身要位，防守人绕前防守，最好的传球方式是？', options: ['击地传球', '高吊球', '胸前直传', '不传'], answer: 1, why: '绕前防守留出身后空间，高吊球最有效。' },
  { q: '对方射手正在接手掉，防守端最该做的是？', options: ['放他投', '贴身盯防并提前绕前拒绝接球', '换防大个子去防', '包夹他'], answer: 1, why: '让射手难以接球比接球后再干扰更有效。' },
  { q: '3V3 半场比赛中，抢到防守篮板后通常需要？', options: ['直接投篮', '把球带出三分线（清球）', '马上传给篮下队友', '原地运球'], answer: 1, why: '多数 3V3 规则要求防守篮板后先清球。' },
  { q: '对方使用联防（2-3），最有效的进攻区域通常是？', options: ['底线篮下', '罚球线高位与底角', '中场', '左侧边线'], answer: 1, why: '高位是联防的软肋，可以中投或分球底角。' },
  { q: '你被两人包夹，正确的处理是？', options: ['低头运球突围', '护球后传给包夹留下的空位队友', '强行出手', '叫暂停以外别无他法'], answer: 1, why: '包夹必然有人空位，快速出球惩罚防守。' },
  { q: '挡拆后掩护人顺下，持球人看到弱侧防守人收缩，应该？', options: ['传给顺下的掩护人', '传给弱侧外线', '自己投篮', '回撤'], answer: 1, why: '弱侧收缩意味着外线出现空位。' },
  { q: '比赛中你连续投丢 4 球，状态不佳，最合理的调整是？', options: ['继续大量出手', '通过突破、罚球或篮下简单得分找手感', '不再进攻', '只投三分'], answer: 1, why: '用高命中率的方式重建节奏。' },
  { q: '防守持球人时，他明显只会用右手运球，你应该？', options: ['站正中间', '偏向他右手一侧，逼他用左手', '退到篮下', '伸手掏球'], answer: 1, why: '针对弱侧手是最基本的个人防守策略。' },
  { q: '进攻时间只剩 3 秒，你在三分线外接球且无人防守，应该？', options: ['运一下再投', '接球直接出手', '传给队友', '突破'], answer: 1, why: '时间不够做额外动作，空位直接出手。' }
]

export const QUIZ_LENGTH = 10
