// IPC 契约：渲染进程只能通过这些方法访问主进程，不接触 Node.js
import type {
  AiConfigInput,
  AiConfigPublic,
  AppSettings,
  BadgeProgress,
  ChatMessage,
  CoachReply,
  Dashboard,
  GameLog,
  GameLogInput,
  MutationResult,
  Player,
  PlayerInput,
  SeasonSummary,
  SkillTestRecord,
  StatsBundle,
  TrainingInput,
  TrainingSession
} from './types'

export interface QuizAnswer {
  question: string
  chosen: string
}

export type ApiResult<T> = { ok: true; value: T } | { ok: false; error: string }

export interface CourtRiseApi {
  bootstrap(): Promise<{ player: Player | null; settings: AppSettings; platform: string; version: string }>
  player: {
    create(input: PlayerInput): Promise<MutationResult<Player>>
    update(input: PlayerInput): Promise<MutationResult<Player>>
  }
  dashboard(): Promise<Dashboard>
  training: {
    list(opts?: { limit?: number; drillId?: string }): Promise<TrainingSession[]>
    submit(input: TrainingInput): Promise<MutationResult<TrainingSession>>
    update(id: number, input: TrainingInput): Promise<MutationResult<TrainingSession>>
    remove(id: number): Promise<MutationResult<null>>
  }
  quests: {
    claim(id: number): Promise<MutationResult<null>>
  }
  tests: {
    list(): Promise<SkillTestRecord[]>
    submit(input: { testId: string; raw: number; date: string; notes?: string }): Promise<MutationResult<SkillTestRecord>>
    submitQuiz(answers: QuizAnswer[]): Promise<MutationResult<SkillTestRecord>>
    computeAstTo(): Promise<MutationResult<SkillTestRecord>>
    remove(id: number): Promise<MutationResult<null>>
  }
  badges(): Promise<BadgeProgress[]>
  stats(): Promise<StatsBundle>
  games: {
    add(input: GameLogInput): Promise<MutationResult<GameLog>>
    update(id: number, input: GameLogInput): Promise<MutationResult<GameLog>>
    remove(id: number): Promise<MutationResult<null>>
  }
  season: {
    summary(index: number): Promise<SeasonSummary>
    markSeen(index: number): Promise<void>
  }
  settings: {
    get(): Promise<AppSettings>
    set(patch: Partial<AppSettings>): Promise<AppSettings>
  }
  ai: {
    getConfig(): Promise<AiConfigPublic>
    saveConfig(input: AiConfigInput): Promise<AiConfigPublic>
    test(): Promise<{ ok: boolean; message: string; latencyMs?: number }>
    chat(messages: ChatMessage[]): Promise<CoachReply>
    report(kind: 'weekly' | 'plan'): Promise<CoachReply>
  }
  data: {
    exportJson(): Promise<{ ok: boolean; path?: string }>
    importJson(): Promise<{ ok: boolean; message: string }>
    backupDb(): Promise<{ ok: boolean; path?: string }>
    location(): Promise<string>
  }
  win: {
    minimize(): void
    toggleMaximize(): void
    close(): void
    onMaximizeChange(cb: (maximized: boolean) => void): () => void
  }
}

/** 主进程把业务错误包装成 { __error } 传给渲染进程，预加载层再抛出可读错误 */
export const IPC = {
  bootstrap: 'app:bootstrap',
  playerCreate: 'player:create',
  playerUpdate: 'player:update',
  dashboard: 'dashboard:get',
  trainingList: 'training:list',
  trainingSubmit: 'training:submit',
  trainingUpdate: 'training:update',
  trainingRemove: 'training:remove',
  questClaim: 'quest:claim',
  testsList: 'tests:list',
  testsSubmit: 'tests:submit',
  testsQuiz: 'tests:quiz',
  testsAstTo: 'tests:astto',
  testsRemove: 'tests:remove',
  badges: 'badges:get',
  stats: 'stats:get',
  gameAdd: 'game:add',
  gameUpdate: 'game:update',
  gameRemove: 'game:remove',
  seasonSummary: 'season:summary',
  seasonSeen: 'season:seen',
  settingsGet: 'settings:get',
  settingsSet: 'settings:set',
  aiGet: 'ai:get',
  aiSave: 'ai:save',
  aiTest: 'ai:test',
  aiChat: 'ai:chat',
  aiReport: 'ai:report',
  dataExport: 'data:export',
  dataImport: 'data:import',
  dataBackup: 'data:backup',
  dataLocation: 'data:location',
  winMin: 'win:min',
  winMax: 'win:max',
  winClose: 'win:close',
  winMaxChanged: 'win:max-changed'
} as const
