import { create } from 'zustand'
import type { AppSettings, Dashboard, GameEvent, Player } from '@shared/types'
import { api } from '../lib/api'
import { errMsg } from '../lib/format'

export type PageId = 'career' | 'player' | 'training' | 'attributes' | 'badges' | 'stats' | 'coach' | 'settings'

export interface Toast {
  id: number
  tone: 'xp' | 'success' | 'error' | 'info' | 'gold'
  title: string
  detail?: string
  big?: string
}

/** 需要全屏播放的庆祝动画 */
export type Celebration = Extract<GameEvent, { type: 'levelUp' | 'badge' | 'pb' }> & { key: number }

interface AppState {
  ready: boolean
  player: Player | null
  settings: AppSettings
  page: PageId
  pageIntent: string | null
  dashboard: Dashboard | null
  toasts: Toast[]
  celebrations: Celebration[]
  version: string
  bootstrap: () => Promise<void>
  setPlayer: (p: Player) => void
  go: (page: PageId, intent?: string) => void
  consumeIntent: () => string | null
  refresh: () => Promise<void>
  toast: (t: Omit<Toast, 'id'>) => void
  dismissToast: (id: number) => void
  playEvents: (events: GameEvent[]) => void
  shiftCelebration: () => void
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>
}

let seq = 1

export const useApp = create<AppState>((set, get) => ({
  ready: false,
  player: null,
  settings: { reducedMotion: 'system', backgroundFx: true, lastSeasonSeen: 0 },
  page: 'career',
  pageIntent: null,
  dashboard: null,
  toasts: [],
  celebrations: [],
  version: '',

  bootstrap: async () => {
    const b = await api.bootstrap()
    set({ player: b.player, settings: b.settings, version: b.version, ready: true })
    if (b.player) await get().refresh()
  },
  setPlayer: (p) => set({ player: p }),
  go: (page, intent) => set({ page, pageIntent: intent ?? null }),
  consumeIntent: () => {
    const i = get().pageIntent
    if (i) set({ pageIntent: null })
    return i
  },
  refresh: async () => {
    try {
      const d = await api.dashboard()
      set({ dashboard: d, player: d.player })
    } catch (e) {
      get().toast({ tone: 'error', title: '数据加载失败', detail: errMsg(e) })
    }
  },
  toast: (t) => set((s) => ({ toasts: [...s.toasts.slice(-3), { ...t, id: seq++ }] })),
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  playEvents: (events) => {
    const celebrations: Celebration[] = []
    for (const e of events) {
      if (e.type === 'xp') {
        if (e.amount > 0) get().toast({ tone: 'xp', big: `+${e.amount}`, title: '获得经验值 XP', detail: e.capped ? '今日训练 XP 已达上限，超出部分不计入' : undefined })
        else if (e.amount < 0) get().toast({ tone: 'info', big: `${e.amount}`, title: 'XP 已按修改后的记录重新计算' })
        else if (e.capped) get().toast({ tone: 'info', title: '今日训练 XP 已达上限', detail: '记录已保存，适度训练才能走得更远' })
      } else if (e.type === 'questComplete') {
        get().toast({ tone: 'success', title: '任务完成', detail: `${e.title} · 去生涯大厅领取奖励` })
      } else if (e.type === 'achievement') {
        get().toast({ tone: 'gold', title: e.title, detail: e.detail })
      } else {
        celebrations.push({ ...e, key: seq++ })
      }
    }
    // 同一批事件：升级 → 徽章 → 纪录，按重要性排序依次播放
    const order = { levelUp: 0, badge: 1, pb: 2 }
    celebrations.sort((a, b) => order[a.type] - order[b.type])
    if (celebrations.length) set((s) => ({ celebrations: [...s.celebrations, ...celebrations] }))
  },
  shiftCelebration: () => set((s) => ({ celebrations: s.celebrations.slice(1) })),
  updateSettings: async (patch) => {
    const settings = await api.settings.set(patch)
    set({ settings })
  }
}))

/** 统一的写操作包装：执行 → 播放事件 → 刷新仪表盘 */
export async function mutate<T>(fn: () => Promise<{ data: T; events: GameEvent[] }>, successMsg?: string): Promise<T | null> {
  const s = useApp.getState()
  try {
    const r = await fn()
    s.playEvents(r.events)
    if (successMsg) s.toast({ tone: 'success', title: successMsg })
    await s.refresh()
    return r.data
  } catch (e) {
    s.toast({ tone: 'error', title: '操作未完成', detail: errMsg(e) })
    return null
  }
}
