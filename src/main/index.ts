import { app, BrowserWindow, net, safeStorage, shell } from 'electron'
import { join } from 'path'
import { mkdirSync } from 'fs'
import { IPC } from '../shared/api'
import { openDatabase } from './db/connection'
import { CoachService, type FetchLike } from './services/coach'
import { CourtService } from './services/court'
import { registerIpc } from './ipc'
import appIcon from '../../build/icon.png?asset'

const isDev = !app.isPackaged && !!process.env['ELECTRON_RENDERER_URL']
let mainWindow: BrowserWindow | null = null

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })
}

function isTrustedUrl(url: string): boolean {
  if (isDev && process.env['ELECTRON_RENDERER_URL']) return url.startsWith(process.env['ELECTRON_RENDERER_URL'])
  return url.startsWith('file://')
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1180,
    minHeight: 720,
    show: false,
    frame: false,
    backgroundColor: '#090B0F',
    title: 'COURT//RISE 球场生涯',
    icon: appIcon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      spellcheck: false
    }
  })

  mainWindow.once('ready-to-show', () => mainWindow?.show())
  const sendMax = (): void => mainWindow?.webContents.send(IPC.winMaxChanged, mainWindow.isMaximized())
  mainWindow.on('maximize', sendMax)
  mainWindow.on('unmaximize', sendMax)
  mainWindow.on('closed', () => (mainWindow = null))

  // 禁止页面跳转与新窗口，外部链接交给系统浏览器
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\//.test(url)) void shell.openExternal(url)
    return { action: 'deny' }
  })
  mainWindow.webContents.on('will-navigate', (e, url) => {
    if (!isTrustedUrl(url)) e.preventDefault()
  })

  if (isDev) void mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']!)
  else void mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
}

app.whenReady().then(() => {
  app.setAppUserModelId('com.courtrise.app')
  const dataDir = app.getPath('userData')
  mkdirSync(dataDir, { recursive: true })
  const dbPath = join(dataDir, 'court-rise.db')
  const db = openDatabase(dbPath)
  const court = new CourtService(db)
  const coach = new CoachService(
    court,
    {
      available: () => safeStorage.isEncryptionAvailable(),
      encrypt: (plain) => safeStorage.encryptString(plain).toString('base64'),
      decrypt: (enc) => safeStorage.decryptString(Buffer.from(enc, 'base64'))
    },
    ((url, init) => net.fetch(url, init)) as FetchLike
  )
  registerIpc({ db, court, coach, dbPath, getWindow: () => mainWindow, isTrustedUrl, version: app.getVersion() })
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
  app.on('before-quit', () => {
    try {
      db.close()
    } catch {
      /* 已关闭 */
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
