import * as SQLite from 'expo-sqlite';

export type SessionRow = {
  id: string;
  startedAt: string;
  endedAt: string | null;
  configJson: string;
};

export type PointInsert = {
  sessionId: string;
  seq: number;
  ts: string;
  lat: number;
  lon: number;
  acc: number | null;
  alt: number | null;
  altitudeAccuracy: number | null;
  speed: number | null;
  heading: number | null;
  rawJson: string;
};

const db = SQLite.openDatabaseSync('gps_tester.db');

export const initDb = (): void => {
  db.execSync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY NOT NULL,
      startedAt TEXT NOT NULL,
      endedAt TEXT,
      configJson TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS points (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sessionId TEXT NOT NULL,
      seq INTEGER NOT NULL,
      ts TEXT NOT NULL,
      lat REAL NOT NULL,
      lon REAL NOT NULL,
      acc REAL,
      alt REAL,
      altitudeAccuracy REAL,
      speed REAL,
      heading REAL,
      rawJson TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_points_session_seq ON points(sessionId, seq);
    CREATE INDEX IF NOT EXISTS idx_points_ts ON points(ts);
    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts TEXT NOT NULL,
      level TEXT NOT NULL,
      source TEXT NOT NULL,
      message TEXT NOT NULL,
      rawJson TEXT
    );
    CREATE TABLE IF NOT EXISTS kv (
      k TEXT PRIMARY KEY NOT NULL,
      v TEXT NOT NULL
    );
  `);
};

export const insertSession = (session: SessionRow): void => {
  db.runSync(
    'INSERT INTO sessions(id, startedAt, endedAt, configJson) VALUES (?, ?, ?, ?)',
    [session.id, session.startedAt, session.endedAt, session.configJson],
  );
};

export const endSession = (sessionId: string, endedAt: string): void => {
  db.runSync('UPDATE sessions SET endedAt = ? WHERE id = ?', [endedAt, sessionId]);
};

export const insertPoint = (point: PointInsert): void => {
  db.runSync(
    `INSERT INTO points(sessionId, seq, ts, lat, lon, acc, alt, altitudeAccuracy, speed, heading, rawJson)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      point.sessionId,
      point.seq,
      point.ts,
      point.lat,
      point.lon,
      point.acc,
      point.alt,
      point.altitudeAccuracy,
      point.speed,
      point.heading,
      point.rawJson,
    ],
  );
};

export const writeLog = (
  level: 'info' | 'warn' | 'error',
  source: string,
  message: string,
  rawJson?: string,
): void => {
  const ts = new Date().toISOString();
  db.runSync(
    'INSERT INTO logs(ts, level, source, message, rawJson) VALUES (?, ?, ?, ?, ?)',
    [ts, level, source, message, rawJson ?? null],
  );
  if (level === 'error') {
    db.runSync('INSERT OR REPLACE INTO kv(k, v) VALUES (?, ?)', ['lastTaskError', `${ts} | ${source} | ${message}`]);
  }
};

export const setKv = (key: string, value: string): void => {
  db.runSync('INSERT OR REPLACE INTO kv(k, v) VALUES (?, ?)', [key, value]);
};

export const getKv = (key: string): string | null => {
  const row = db.getFirstSync<{ v: string }>('SELECT v FROM kv WHERE k = ?', [key]);
  return row?.v ?? null;
};

export const getSessions = (): SessionRow[] =>
  db.getAllSync<SessionRow>('SELECT id, startedAt, endedAt, configJson FROM sessions ORDER BY startedAt DESC');

export const getSessionPointCount = (sessionId: string): number => {
  const row = db.getFirstSync<{ cnt: number }>('SELECT COUNT(*) as cnt FROM points WHERE sessionId = ?', [sessionId]);
  return row?.cnt ?? 0;
};

export const getSessionBounds = (sessionId: string): { firstTs: string | null; lastTs: string | null } => {
  const row = db.getFirstSync<{ firstTs: string | null; lastTs: string | null }>(
    'SELECT MIN(ts) as firstTs, MAX(ts) as lastTs FROM points WHERE sessionId = ?',
    [sessionId],
  );
  return row ?? { firstTs: null, lastTs: null };
};

export const getLastPoint = (sessionId?: string): { ts: string; lat: number; lon: number; acc: number | null } | null => {
  if (sessionId) {
    return (
      db.getFirstSync<{ ts: string; lat: number; lon: number; acc: number | null }>(
        'SELECT ts, lat, lon, acc FROM points WHERE sessionId = ? ORDER BY seq DESC LIMIT 1',
        [sessionId],
      ) ?? null
    );
  }
  return (
    db.getFirstSync<{ ts: string; lat: number; lon: number; acc: number | null }>(
      'SELECT ts, lat, lon, acc FROM points ORDER BY id DESC LIMIT 1',
    ) ?? null
  );
};



export const getSessionPointsChunk = (sessionId: string, limit: number, offset: number): Record<string, unknown>[] =>
  db.getAllSync<Record<string, unknown>>(
    'SELECT id, sessionId, seq, ts, lat, lon, acc, alt, altitudeAccuracy, speed, heading, rawJson FROM points WHERE sessionId = ? ORDER BY seq ASC LIMIT ? OFFSET ?',
    [sessionId, limit, offset],
  );

export const getDb = (): SQLite.SQLiteDatabase => db;
