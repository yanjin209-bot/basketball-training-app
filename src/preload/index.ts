// 预加载层：通过 contextBridge 暴露最小 API，渲染进程拿不到 ipcRenderer 与 Node.js
import { contextBridge, ipcRenderer } from 'electron'
import { IPC, type CourtRiseApi } from '../shared/api'

async function call<T>(channel: string, ...args: unknown[]): Promise<T> {
  const res = (await ipcRenderer.invoke(channel, ...args)) as { ok: boolean; value?: T; error?: string }
  if (!res?.ok) throw new Error(res?.error ?? '操作失败')
  return res.value as T
}

const api: CourtRiseApi = {
  bootstrap: () => call(IPC.bootstrap),
  player: {
    create: (input) => call(IPC.playerCreate, input),
    update: (input) => call(IPC.playerUpdate, input)
  },
  dashboard: () => call(IPC.dashboard),
  training: {
    list: (opts) => call(IPC.trainingList, opts),
    submit: (input) => call(IPC.trainingSubmit, input),
    update: (id, input) => call(IPC.trainingUpdate, id, input),
    remove: (id) => call(IPC.trainingRemove, id)
  },
  quests: { claim: (id) => call(IPC.questClaim, id) },
  tests: {
    list: () => call(IPC.testsList),
    submit: (input) => call(IPC.testsSubmit, input),
    submitQuiz: (answers) => call(IPC.testsQuiz, answers),
    computeAstTo: () => call(IPC.testsAstTo),
    remove: (id) => call(IPC.testsRemove, id)
  },
  badges: () => call(IPC.badges),
  stats: () => call(IPC.stats),
  games: {
    add: (input) => call(IPC.gameAdd, input),
    update: (id, input) => call(IPC.gameUpdate, id, input),
    remove: (id) => call(IPC.gameRemove, id)
  },
  season: {
    summary: (i) => call(IPC.seasonSummary, i),
    markSeen: (i) => call(IPC.seasonSeen, i)
  },
  settings: {
    get: () => call(IPC.settingsGet),
    set: (patch) => call(IPC.settingsSet, patch)
  },
  ai: {
    getConfig: () => call(IPC.aiGet),
    saveConfig: (input) => call(IPC.aiSave, input),
    test: () => call(IPC.aiTest),
    chat: (messages) => call(IPC.aiChat, messages),
    report: (kind) => call(IPC.aiReport, kind)
  },
  data: {
    exportJson: () => call(IPC.dataExport),
    importJson: () => call(IPC.dataImport),
    backupDb: () => call(IPC.dataBackup),
    location: () => call(IPC.dataLocation)
  },
  win: {
    minimize: () => ipcRenderer.send(IPC.winMin),
    toggleMaximize: () => ipcRenderer.send(IPC.winMax),
    close: () => ipcRenderer.send(IPC.winClose),
    onMaximizeChange: (cb) => {
      const listener = (_: unknown, v: boolean): void => cb(v)
      ipcRenderer.on(IPC.winMaxChanged, listener)
      return () => ipcRenderer.removeListener(IPC.winMaxChanged, listener)
    }
  }
}

contextBridge.exposeInMainWorld('courtRise', api)
