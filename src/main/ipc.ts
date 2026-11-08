// 安全 IPC：只注册白名单通道，校验调用来源，业务错误转为可读提示
import { BrowserWindow, dialog, ipcMain, type IpcMainInvokeEvent } from 'electron'
import { readFileSync, writeFileSync } from 'fs'
import type Database from 'better-sqlite3'
import { IPC } from '../shared/api'
import { exportData, importData } from './services/backup'
import type { CoachService } from './services/coach'
import { UserError, type CourtService } from './services/court'

type Handler = (...args: never[]) => unknown

export function registerIpc(opts: {
  db: Database.Database
  court: CourtService
  coach: CoachService
  dbPath: string
  getWindow: () => BrowserWindow | null
  isTrustedUrl: (url: string) => boolean
  version: string
}): void {
  const { db, court, coach, getWindow } = opts

  const handle = (channel: string, fn: Handler): void => {
    ipcMain.handle(channel, async (event: IpcMainInvokeEvent, ...args: unknown[]) => {
      if (!opts.isTrustedUrl(event.senderFrame?.url ?? '')) return { ok: false, error: '非法调用来源' }
      try {
        return { ok: true, value: await (fn as (...a: unknown[]) => unknown)(...args) }
      } catch (e) {
        const err = e as Error
        if (!(err instanceof UserError)) console.error(`[ipc:${channel}]`, err.message)
        return { ok: false, error: err instanceof UserError ? err.message : err.message || '操作失败' }
      }
    })
  }

  const num = (v: unknown): number => {
    if (typeof v !== 'number' || !Number.isInteger(v)) throw new UserError('参数无效')
    return v
  }

  handle(IPC.bootstrap, () => ({ player: court.getPlayer(), settings: court.getSettings(), platform: process.platform, version: opts.version }))
  handle(IPC.playerCreate, (input: never) => court.createPlayer(input))
  handle(IPC.playerUpdate, (input: never) => court.updatePlayer(input))
  handle(IPC.dashboard, () => court.dashboard())
  handle(IPC.trainingList, (o: never) => court.listSessions(o ?? {}))
  handle(IPC.trainingSubmit, (input: never) => court.submitTraining(input))
  handle(IPC.trainingUpdate, (id: never, input: never) => court.updateTraining(num(id), input))
  handle(IPC.trainingRemove, (id: never) => court.removeTraining(num(id)))
  handle(IPC.questClaim, (id: never) => court.claimQuest(num(id)))
  handle(IPC.testsList, () => court.listTests())
  handle(IPC.testsSubmit, (input: never) => court.submitTest(input))
  handle(IPC.testsQuiz, (answers: never) => court.submitQuiz(answers))
  handle(IPC.testsAstTo, () => court.computeAstTo())
  handle(IPC.testsRemove, (id: never) => court.removeTest(num(id)))
  handle(IPC.badges, () => court.badges())
  handle(IPC.stats, () => court.stats())
  handle(IPC.gameAdd, (input: never) => court.addGame(input))
  handle(IPC.gameUpdate, (id: never, input: never) => court.updateGame(num(id), input))
  handle(IPC.gameRemove, (id: never) => court.removeGame(num(id)))
  handle(IPC.seasonSummary, (i: never) => court.seasonSummary(num(i)))
  handle(IPC.seasonSeen, (i: never) => void court.setSettings({ lastSeasonSeen: num(i) }))
  handle(IPC.settingsGet, () => court.getSettings())
  handle(IPC.settingsSet, (patch: never) => court.setSettings(patch ?? {}))
  handle(IPC.aiGet, () => coach.getPublicConfig())
  handle(IPC.aiSave, (input: never) => coach.saveConfig(input))
  handle(IPC.aiTest, () => coach.testConnection())
  handle(IPC.aiChat, (messages: never) => coach.chat(messages))
  handle(IPC.aiReport, (kind: never) => coach.report(kind === 'plan' ? 'plan' : 'weekly'))

  handle(IPC.dataExport, async () => {
    const win = getWindow()
    const stamp = new Date().toISOString().slice(0, 10)
    const r = await dialog.showSaveDialog(win!, { title: '导出生涯数据', defaultPath: `court-rise-${stamp}.json`, filters: [{ name: 'JSON', extensions: ['json'] }] })
    if (r.canceled || !r.filePath) return { ok: false }
    writeFileSync(r.filePath, JSON.stringify(exportData(db), null, 2), 'utf-8')
    return { ok: true, path: r.filePath }
  })
  handle(IPC.dataImport, async () => {
    const win = getWindow()
    const r = await dialog.showOpenDialog(win!, { title: '导入生涯数据', properties: ['openFile'], filters: [{ name: 'JSON', extensions: ['json'] }] })
    if (r.canceled || !r.filePaths[0]) return { ok: false, message: '已取消' }
    const confirm = await dialog.showMessageBox(win!, {
      type: 'warning',
      buttons: ['取消', '覆盖导入'],
      defaultId: 0,
      cancelId: 0,
      title: '导入数据',
      message: '导入会覆盖当前所有本地数据，建议先导出备份。确定继续吗？'
    })
    if (confirm.response !== 1) return { ok: false, message: '已取消' }
    let parsed: unknown
    try {
      parsed = JSON.parse(readFileSync(r.filePaths[0], 'utf-8'))
    } catch {
      throw new UserError('文件不是有效的 JSON')
    }
    try {
      const res = importData(db, parsed)
      if (court.getPlayer()) court.reconcile()
      return { ok: true, message: `导入成功：${res.sessions} 条训练记录` }
    } catch (e) {
      throw new UserError((e as Error).message)
    }
  })
  handle(IPC.dataBackup, async () => {
    const win = getWindow()
    const stamp = new Date().toISOString().slice(0, 10)
    const r = await dialog.showSaveDialog(win!, { title: '备份数据库', defaultPath: `court-rise-${stamp}.db`, filters: [{ name: 'SQLite', extensions: ['db'] }] })
    if (r.canceled || !r.filePath) return { ok: false }
    await db.backup(r.filePath)
    return { ok: true, path: r.filePath }
  })
  handle(IPC.dataLocation, () => opts.dbPath)

  ipcMain.on(IPC.winMin, (e) => BrowserWindow.fromWebContents(e.sender)?.minimize())
  ipcMain.on(IPC.winMax, (e) => {
    const w = BrowserWindow.fromWebContents(e.sender)
    if (w) w.isMaximized() ? w.unmaximize() : w.maximize()
  })
  ipcMain.on(IPC.winClose, (e) => BrowserWindow.fromWebContents(e.sender)?.close())
}
