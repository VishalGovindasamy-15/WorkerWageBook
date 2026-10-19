// Worker WageBook - Database Service
// Handles all database initialization and operations

import * as SQLite from 'expo-sqlite';
import {
  CREATE_TABLES_SQL,
  CREATE_INDEXES_SQL,
  CREATE_UNIQUE_INDEXES_SQL,
  SEED_DATA_SQL,
} from './schema';

let db: SQLite.SQLiteDatabase | null = null;
let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;
let initPromise: Promise<void> | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  if (!dbPromise) {
    dbPromise = (async () => {
      const database = await SQLite.openDatabaseAsync('workerwagebook.db');
      db = database;
      return database;
    })();
  }
  return dbPromise;
}

export async function initializeDatabase(): Promise<void> {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const database = await getDatabase();

    // Enable WAL mode for better concurrent access
    try {
      await database.execAsync('PRAGMA journal_mode = WAL;');
      await database.execAsync('PRAGMA foreign_keys = ON;');
    } catch (e) {
      console.warn('[DB] PRAGMA failed (may be unsupported in some web VFS):', e);
    }

    // Create all tables
    await database.execAsync(CREATE_TABLES_SQL);

    // Create indexes
    await database.execAsync(CREATE_INDEXES_SQL);

    // Create unique indexes (for duplicate settlement prevention)
    await database.execAsync(CREATE_UNIQUE_INDEXES_SQL);

    // Seed default data
    await database.execAsync(SEED_DATA_SQL);

    console.log('[DB] Database initialized successfully');
  })().catch((err) => {
    initPromise = null;
    throw err;
  });
  return initPromise;
}

// Flush WAL before backup
export async function flushWAL(): Promise<void> {
  await initializeDatabase();
  const database = await getDatabase();
  await database.execAsync('PRAGMA wal_checkpoint(FULL);');
}

// Generic query helpers
export async function runAsync(
  sql: string,
  params: any[] = []
): Promise<SQLite.SQLiteRunResult> {
  await initializeDatabase();
  const database = await getDatabase();
  return await database.runAsync(sql, params);
}

export async function getFirstAsync<T>(
  sql: string,
  params: any[] = []
): Promise<T | null> {
  await initializeDatabase();
  const database = await getDatabase();
  const result = await database.getFirstAsync<T>(sql, params);
  return result ?? null;
}

export async function getAllAsync<T>(
  sql: string,
  params: any[] = []
): Promise<T[]> {
  await initializeDatabase();
  const database = await getDatabase();
  return await database.getAllAsync<T>(sql, params);
}

// Transaction support
export async function withTransaction<T>(
  fn: (db: SQLite.SQLiteDatabase) => Promise<T>
): Promise<T> {
  await initializeDatabase();
  const database = await getDatabase();
  try {
    await database.execAsync('BEGIN TRANSACTION;');
    const result = await fn(database);
    await database.execAsync('COMMIT;');
    return result;
  } catch (error) {
    await database.execAsync('ROLLBACK;');
    throw error;
  }
}

// Factory Reset: wipe all tables and re-initialize fresh schema
export async function factoryResetDatabase(): Promise<void> {
  const database = await getDatabase();
  await database.execAsync(`
    PRAGMA foreign_keys = OFF;
    DROP TABLE IF EXISTS attendance_history;
    DROP TABLE IF EXISTS attendance;
    DROP TABLE IF EXISTS advance_recoveries;
    DROP TABLE IF EXISTS advances;
    DROP TABLE IF EXISTS settlement_items;
    DROP TABLE IF EXISTS settlement_adjustments;
    DROP TABLE IF EXISTS salary_settlements;
    DROP TABLE IF EXISTS wage_change_history;
    DROP TABLE IF EXISTS workers;
    DROP TABLE IF EXISTS categories;
    DROP TABLE IF EXISTS id_sequence;
    DROP TABLE IF EXISTS audit_log;
    DROP TABLE IF EXISTS settings;
    DROP TABLE IF EXISTS salary_calculation_rules;
    DROP TABLE IF EXISTS backup_history;
    PRAGMA foreign_keys = ON;
  `);
  initPromise = null;
  await initializeDatabase();
}
