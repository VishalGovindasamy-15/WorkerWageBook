// Worker WageBook - Database Schema
// All SQL statements for creating tables

export const SCHEMA_VERSION = 1;

export const CREATE_TABLES_SQL = `
-- Worker Categories (managed list to prevent spelling issues)
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  is_default INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Auto-increment counter for Employee IDs
CREATE TABLE IF NOT EXISTS id_sequence (
  entity TEXT PRIMARY KEY,
  next_val INTEGER NOT NULL DEFAULT 1
);

-- Workers
CREATE TABLE IF NOT EXISTS workers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  photo_uri TEXT,
  category_id INTEGER REFERENCES categories(id),
  daily_wage REAL DEFAULT 0,
  overtime_rate REAL DEFAULT 0,
  overtime_type TEXT DEFAULT 'per_hour',
  payment_frequency TEXT DEFAULT 'weekly',
  is_active INTEGER DEFAULT 1,
  joining_date TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Attendance
CREATE TABLE IF NOT EXISTS attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  worker_id INTEGER NOT NULL REFERENCES workers(id),
  work_date TEXT NOT NULL,
  status TEXT NOT NULL,
  leave_type TEXT,
  daily_wage_snapshot REAL NOT NULL DEFAULT 0,
  overtime_hours REAL DEFAULT 0,
  overtime_amount REAL DEFAULT 0,
  overtime_amount_type TEXT DEFAULT 'calculated',
  notes TEXT,
  marked_by TEXT DEFAULT 'owner',
  is_locked INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(worker_id, work_date)
);

-- Attendance Edit History (every change is preserved)
CREATE TABLE IF NOT EXISTS attendance_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  attendance_id INTEGER NOT NULL REFERENCES attendance(id),
  old_status TEXT,
  new_status TEXT NOT NULL,
  old_overtime_hours REAL,
  new_overtime_hours REAL,
  old_overtime_amount REAL,
  new_overtime_amount REAL,
  old_daily_wage_snapshot REAL,
  new_daily_wage_snapshot REAL,
  reason TEXT NOT NULL,
  edited_by TEXT DEFAULT 'owner',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Advances
CREATE TABLE IF NOT EXISTS advances (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  worker_id INTEGER NOT NULL REFERENCES workers(id),
  amount REAL NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  reason TEXT,
  advance_date TEXT NOT NULL,
  is_reversed INTEGER DEFAULT 0,
  reversed_by INTEGER REFERENCES advances(id),
  reversal_reason TEXT,
  is_locked INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Advance Recoveries
CREATE TABLE IF NOT EXISTS advance_recoveries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  advance_id INTEGER NOT NULL REFERENCES advances(id),
  settlement_id INTEGER NOT NULL REFERENCES salary_settlements(id),
  worker_id INTEGER NOT NULL REFERENCES workers(id),
  amount REAL NOT NULL,
  recovery_date TEXT NOT NULL,
  is_reversed INTEGER DEFAULT 0,
  reversal_reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Wage Change History
CREATE TABLE IF NOT EXISTS wage_change_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  worker_id INTEGER NOT NULL REFERENCES workers(id),
  old_daily_wage REAL NOT NULL,
  new_daily_wage REAL NOT NULL,
  effective_date TEXT NOT NULL,
  reason TEXT,
  changed_by TEXT DEFAULT 'owner',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Salary Settlements
CREATE TABLE IF NOT EXISTS salary_settlements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  worker_id INTEGER NOT NULL REFERENCES workers(id),
  week_start TEXT NOT NULL,
  week_end TEXT NOT NULL,
  daily_wage_snapshot REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  days_worked REAL NOT NULL DEFAULT 0,
  half_days_worked REAL DEFAULT 0,
  overtime_hours REAL DEFAULT 0,
  overtime_earnings REAL DEFAULT 0,
  gross_earnings REAL NOT NULL DEFAULT 0,
  total_advances_recovered REAL NOT NULL DEFAULT 0,
  outstanding_advance_after REAL DEFAULT 0,
  other_deductions REAL DEFAULT 0,
  bonuses REAL DEFAULT 0,
  net_pay REAL NOT NULL DEFAULT 0,
  carry_forward_advance REAL DEFAULT 0,
  payment_method TEXT DEFAULT 'cash',
  settled_by TEXT DEFAULT 'owner',
  is_locked INTEGER DEFAULT 0,
  confirmed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Settlement Line Items
CREATE TABLE IF NOT EXISTS settlement_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  settlement_id INTEGER NOT NULL REFERENCES salary_settlements(id),
  item_type TEXT NOT NULL,
  description TEXT NOT NULL,
  amount REAL NOT NULL,
  reference_id INTEGER,
  reference_type TEXT
);

-- Settlement Adjustments
CREATE TABLE IF NOT EXISTS settlement_adjustments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  settlement_id INTEGER NOT NULL REFERENCES salary_settlements(id),
  adjustment_type TEXT NOT NULL,
  description TEXT NOT NULL,
  amount REAL NOT NULL,
  reason TEXT NOT NULL,
  created_by TEXT DEFAULT 'owner',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Audit Log
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id INTEGER,
  worker_id INTEGER,
  old_value TEXT,
  new_value TEXT,
  reason TEXT,
  performed_by TEXT DEFAULT 'owner',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- App Settings
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Salary Calculation Rules
CREATE TABLE IF NOT EXISTS salary_calculation_rules (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  half_day_multiplier REAL NOT NULL DEFAULT 0.5,
  holiday_pay_multiplier REAL NOT NULL DEFAULT 0.0,
  weekly_off_day TEXT NOT NULL DEFAULT 'sunday',
  weekly_off_pay_multiplier REAL NOT NULL DEFAULT 0.0,
  paid_leave_allowed_per_month INTEGER NOT NULL DEFAULT 0,
  overtime_default_multiplier REAL NOT NULL DEFAULT 1.0,
  overtime_rounding TEXT NOT NULL DEFAULT 'exact',
  advance_recovery_mode TEXT NOT NULL DEFAULT 'full',
  advance_recovery_max_percent REAL DEFAULT 100.0,
  carry_forward_unrecovered_advances INTEGER NOT NULL DEFAULT 1,
  monetary_rounding TEXT NOT NULL DEFAULT 'paisa',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Backup History
CREATE TABLE IF NOT EXISTS backup_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  backup_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  drive_file_id TEXT,
  status TEXT NOT NULL DEFAULT 'success',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

export const CREATE_INDEXES_SQL = `
CREATE INDEX IF NOT EXISTS idx_attendance_worker_date ON attendance(worker_id, work_date);
CREATE INDEX IF NOT EXISTS idx_attendance_work_date ON attendance(work_date);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance(status);
CREATE INDEX IF NOT EXISTS idx_attendance_history_att ON attendance_history(attendance_id);
CREATE INDEX IF NOT EXISTS idx_advances_worker ON advances(worker_id);
CREATE INDEX IF NOT EXISTS idx_advances_date ON advances(advance_date);
CREATE INDEX IF NOT EXISTS idx_advance_recoveries_advance ON advance_recoveries(advance_id);
CREATE INDEX IF NOT EXISTS idx_advance_recoveries_settlement ON advance_recoveries(settlement_id);
CREATE INDEX IF NOT EXISTS idx_advance_recoveries_worker ON advance_recoveries(worker_id);
CREATE INDEX IF NOT EXISTS idx_wage_change_worker ON wage_change_history(worker_id);
CREATE INDEX IF NOT EXISTS idx_wage_change_effective ON wage_change_history(effective_date);
CREATE INDEX IF NOT EXISTS idx_settlements_worker_week ON salary_settlements(worker_id, week_start);
CREATE INDEX IF NOT EXISTS idx_settlements_status ON salary_settlements(status);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_worker ON audit_log(worker_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_workers_category ON workers(category_id);
CREATE INDEX IF NOT EXISTS idx_workers_active ON workers(is_active);
`;

// Unique index for duplicate settlement prevention
export const CREATE_UNIQUE_INDEXES_SQL = `
CREATE UNIQUE INDEX IF NOT EXISTS idx_settlement_worker_week_locked
  ON salary_settlements(worker_id, week_start, week_end)
  WHERE is_locked = 1;
`;

export const SEED_DATA_SQL = `
-- Seed default categories
INSERT OR IGNORE INTO categories (name, is_default) VALUES ('Mason', 1);
INSERT OR IGNORE INTO categories (name, is_default) VALUES ('Sithal', 1);
INSERT OR IGNORE INTO categories (name, is_default) VALUES ('Painter', 1);
INSERT OR IGNORE INTO categories (name, is_default) VALUES ('Plumber', 1);
INSERT OR IGNORE INTO categories (name, is_default) VALUES ('Electrician', 1);
INSERT OR IGNORE INTO categories (name, is_default) VALUES ('Carpenter', 1);
INSERT OR IGNORE INTO categories (name, is_default) VALUES ('Helper', 1);
INSERT OR IGNORE INTO categories (name, is_default) VALUES ('Other', 1);

-- Seed ID sequence
INSERT OR IGNORE INTO id_sequence (entity, next_val) VALUES ('worker', 1);

-- Seed default salary calculation rules
INSERT OR IGNORE INTO salary_calculation_rules (id) VALUES (1);

-- Seed default settings
INSERT OR IGNORE INTO settings (key, value) VALUES ('business_name', 'My Business');
INSERT OR IGNORE INTO settings (key, value) VALUES ('week_start_day', 'monday');
INSERT OR IGNORE INTO settings (key, value) VALUES ('pin_set', 'false');
INSERT OR IGNORE INTO settings (key, value) VALUES ('google_drive_connected', 'false');
INSERT OR IGNORE INTO settings (key, value) VALUES ('auto_backup_schedule', 'weekly');
INSERT OR IGNORE INTO settings (key, value) VALUES ('last_backup_at', '');
INSERT OR IGNORE INTO settings (key, value) VALUES ('schema_version', '1');
`;
