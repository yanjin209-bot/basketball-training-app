// better-sqlite3 API 的最小兼容层（仅用于本沙箱无法安装原生模块时验证逻辑）
import { DatabaseSync } from 'node:sqlite'
export default class Database {
  constructor(file) { this.db = new DatabaseSync(file); this.depth = 0 }
  prepare(sql) { return this.db.prepare(sql) }
  exec(sql) { this.db.exec(sql); return this }
  pragma(s, opts) {
    const rows = this.db.prepare(`PRAGMA ${s}`).all()
    if (opts?.simple) { const r = rows[0]; return r ? Object.values(r)[0] : undefined }
    return rows
  }
  transaction(fn) {
    return (...args) => {
      const sp = `sp${this.depth}`
      this.db.exec(this.depth === 0 ? 'BEGIN' : `SAVEPOINT ${sp}`)
      this.depth++
      try {
        const r = fn(...args)
        this.depth--
        this.db.exec(this.depth === 0 ? 'COMMIT' : `RELEASE ${sp}`)
        return r
      } catch (e) {
        this.depth--
        this.db.exec(this.depth === 0 ? 'ROLLBACK' : `ROLLBACK TO ${sp}`)
        throw e
      }
    }
  }
  close() { this.db.close() }
}
