import type Database from 'better-sqlite3'
import { SKILL_TESTS } from '../../shared/config/skills'

/** 迁移按顺序执行，user_version 记录当前版本 */
const MIGRATIONS: string[] = [
  `
  CREATE TABLE players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nickname TEXT NOT NULL,
    jersey INTEGER NOT NULL,
    height_cm REAL NOT NULL,
    weight_kg REAL NOT NULL,
    hand TEXT NOT NULL,
    position TEXT NOT NULL,
    style TEXT NOT NULL,
    avatar TEXT,
    estimates_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE training_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    drill_id TEXT NOT NULL,
    date TEXT NOT NULL,
    duration_min REAL NOT NULL CHECK (duration_min > 0 AND duration_min <= 240),
    rpe INTEGER NOT NULL CHECK (rpe BETWEEN 1 AND 10),
    notes TEXT NOT NULL DEFAULT '',
    xp_raw INTEGER NOT NULL DEFAULT 0,
    xp_awarded INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX idx_sessions_player_date ON training_sessions(player_id, date);

  CREATE TABLE training_sets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL REFERENCES training_sessions(id) ON DELETE CASCADE,
    idx INTEGER NOT NULL,
    location TEXT,
    attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    makes INTEGER NOT NULL DEFAULT 0 CHECK (makes >= 0 AND makes <= attempts),
    reps INTEGER NOT NULL DEFAULT 0 CHECK (reps >= 0)
  );
  CREATE INDEX idx_sets_session ON training_sets(session_id);

  CREATE TABLE skill_definitions (
    id TEXT PRIMARY KEY,
    attr TEXT NOT NULL,
    name TEXT NOT NULL,
    unit TEXT NOT NULL,
    better TEXT NOT NULL,
    protocol TEXT NOT NULL,
    curve_json TEXT NOT NULL
  );

  CREATE TABLE skill_tests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    test_id TEXT NOT NULL REFERENCES skill_definitions(id),
    date TEXT NOT NULL,
    raw REAL NOT NULL,
    score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 99),
    notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  );
  CREATE INDEX idx_tests_player ON skill_tests(player_id, test_id, date);

  CREATE TABLE quests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    def_id TEXT NOT NULL,
    recovery INTEGER NOT NULL DEFAULT 0,
    claimed_at TEXT,
    UNIQUE (player_id, date, def_id)
  );

  CREATE TABLE xp_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    source TEXT NOT NULL,
    ref_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    amount INTEGER NOT NULL CHECK (amount >= 0),
    note TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    UNIQUE (source, ref_id)
  );
  CREATE INDEX idx_xp_player_date ON xp_transactions(player_id, date);

  CREATE TABLE achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    kind TEXT NOT NULL,
    ref TEXT NOT NULL,
    title TEXT NOT NULL,
    detail TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    UNIQUE (player_id, kind, ref)
  );

  CREATE TABLE unlocked_badges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    badge_id TEXT NOT NULL,
    tier INTEGER NOT NULL CHECK (tier BETWEEN 1 AND 4),
    unlocked_at TEXT NOT NULL,
    UNIQUE (player_id, badge_id, tier)
  );

  CREATE TABLE player_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    taken_at TEXT NOT NULL,
    reason TEXT NOT NULL,
    data_json TEXT NOT NULL
  );

  CREATE TABLE game_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    mode TEXT NOT NULL CHECK (mode IN ('3v3','5v5')),
    points INTEGER NOT NULL DEFAULT 0,
    rebounds INTEGER NOT NULL DEFAULT 0,
    assists INTEGER NOT NULL DEFAULT 0,
    steals INTEGER NOT NULL DEFAULT 0,
    blocks INTEGER NOT NULL DEFAULT 0,
    turnovers INTEGER NOT NULL DEFAULT 0,
    result TEXT,
    notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  );

  CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  `
]

export const SCHEMA_VERSION = MIGRATIONS.length

export function migrate(db: Database.Database): void {
  db.pragma('foreign_keys = ON')
  const current = db.pragma('user_version', { simple: true }) as number
  for (let v = current; v < MIGRATIONS.length; v++) {
    db.transaction(() => {
      db.exec(MIGRATIONS[v])
      db.pragma(`user_version = ${v + 1}`)
    })()
  }
  seedSkillDefinitions(db)
}

/** 测试定义每次启动同步，保证配置更新后评分规则一致 */
function seedSkillDefinitions(db: Database.Database): void {
  const upsert = db.prepare(`
    INSERT INTO skill_definitions (id, attr, name, unit, better, protocol, curve_json)
    VALUES (@id, @attr, @name, @unit, @better, @protocol, @curve)
    ON CONFLICT(id) DO UPDATE SET attr=excluded.attr, name=excluded.name, unit=excluded.unit,
      better=excluded.better, protocol=excluded.protocol, curve_json=excluded.curve_json
  `)
  db.transaction(() => {
    for (const t of SKILL_TESTS) {
      upsert.run({ id: t.id, attr: t.attr, name: t.name, unit: t.unit, better: t.better, protocol: t.protocol, curve: JSON.stringify(t.curve) })
    }
  })()
}

export const DATA_TABLES = [
  'players',
  'training_sessions',
  'training_sets',
  'skill_tests',
  'quests',
  'xp_transactions',
  'achievements',
  'unlocked_badges',
  'player_snapshots',
  'game_logs',
  'settings'
] as const
