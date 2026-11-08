// 数据导出 / 导入（JSON），API Key 不会被导出
import type Database from 'better-sqlite3'
import { DATA_TABLES, SCHEMA_VERSION } from '../db/schema'

export interface ExportFile {
  app: 'court-rise'
  schema: number
  exportedAt: string
  tables: Record<string, Array<Record<string, unknown>>>
}

const SECRET_KEYS = new Set(['ai.key.enc'])

export function exportData(db: Database.Database): ExportFile {
  const tables: ExportFile['tables'] = {}
  for (const t of DATA_TABLES) {
    let rows = db.prepare(`SELECT * FROM ${t}`).all() as Array<Record<string, unknown>>
    if (t === 'settings') rows = rows.filter((r) => !SECRET_KEYS.has(String(r.key)))
    tables[t] = rows
  }
  return { app: 'court-rise', schema: SCHEMA_VERSION, exportedAt: new Date().toISOString(), tables }
}

export function importData(db: Database.Database, file: unknown): { players: number; sessions: number } {
  const f = file as ExportFile
  if (!f || f.app !== 'court-rise' || typeof f.tables !== 'object' || f.tables === null) throw new Error('不是有效的 COURT//RISE 备份文件')
  if (typeof f.schema !== 'number' || f.schema > SCHEMA_VERSION) throw new Error('备份文件版本高于当前程序，请先升级程序')
  if (!Array.isArray(f.tables.players) || f.tables.players.length === 0) throw new Error('备份文件中没有球员数据')

  db.transaction(() => {
    const preservedKey = db.prepare("SELECT value FROM settings WHERE key='ai.key.enc'").get() as { value: string } | undefined
    for (const t of [...DATA_TABLES].reverse()) db.prepare(`DELETE FROM ${t}`).run()
    for (const t of DATA_TABLES) {
      const rows = f.tables[t]
      if (!Array.isArray(rows) || rows.length === 0) continue
      const cols = (db.prepare(`PRAGMA table_info(${t})`).all() as Array<{ name: string }>).map((c) => c.name)
      for (const row of rows) {
        if (typeof row !== 'object' || row === null) throw new Error(`表 ${t} 中有无效记录`)
        const use = cols.filter((c) => c in row)
        if (t === 'settings' && SECRET_KEYS.has(String((row as Record<string, unknown>).key))) continue
        db.prepare(`INSERT INTO ${t} (${use.join(',')}) VALUES (${use.map(() => '?').join(',')})`).run(...use.map((c) => (row as Record<string, unknown>)[c] as never))
      }
    }
    if (preservedKey) db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('ai.key.enc', ?)").run(preservedKey.value)
    const fk = db.pragma('foreign_key_check') as unknown[]
    if (fk.length) throw new Error('备份文件数据关联不完整，已取消导入')
  })()
  return {
    players: (db.prepare('SELECT COUNT(*) c FROM players').get() as { c: number }).c,
    sessions: (db.prepare('SELECT COUNT(*) c FROM training_sessions').get() as { c: number }).c
  }
}
