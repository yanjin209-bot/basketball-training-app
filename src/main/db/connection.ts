import Database from 'better-sqlite3'
import { migrate } from './schema'

export function openDatabase(file: string): Database.Database {
  const db = new Database(file)
  db.pragma('journal_mode = WAL')
  db.pragma('synchronous = NORMAL')
  db.pragma('foreign_keys = ON')
  migrate(db)
  return db
}
