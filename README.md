# Worker WageBook

A professional mobile application for managing worker wages, attendance, advances, and salary settlements. Built with React Native and Expo for small-to-medium businesses that employ daily-wage or weekly-wage workers.

## Features

### Core Modules

- **Worker Management** — Create, edit, and manage worker profiles with auto-generated Employee IDs (W-001, W-002...), categories, photos, wage rates, and joining dates
- **Attendance Tracking** — Mark daily attendance with statuses: Present, Half Day, Absent, Holiday, Leave. Overtime tracking per-entry (auto-calculated or manual amount). Attendance editable within current unsettled week with mandatory reason and full edit history
- **Advance Tracking** — Record advances with optional reason/notes. Outstanding balance tracked per worker. Advances carry forward across weeks until fully recovered
- **Salary Calculation & Settlement** — Automated weekly salary computation with detailed breakdown. Configurable rules for half-day pay, holiday pay, overtime multipliers, and advance recovery. Net pay never goes negative. Duplicate settlement prevention with DB-enforced unique constraints

### Reports & Export

- **Weekly Salary Report** — Detailed breakdown of earnings, deductions, and net pay per worker with PDF export
- **Attendance Report** — Weekly attendance register with status icons and overtime hours
- **Outstanding Advances Report** — All workers with unpaid advance balances
- **Cashbook Report** — Weekly cash outflow summary (advances + salary payments)
- **PDF Export** — Professional HTML-to-PDF reports using expo-print with business branding
- **CSV Export/Import** — Export workers to CSV, import workers from CSV with validation

### Settings & Configuration

- **Business Profile** — Set business name, owner name, phone, address
- **Salary Calculation Rules** — Configurable multipliers for half-day, holiday, weekly off, overtime. Advance recovery mode (full/partial with max percentage). Overtime rounding options. Monetary rounding settings
- **Category Management** — Full CRUD for worker categories with default wage rates
- **Week Configuration** — Set week start day (Monday/Sunday/Saturday)
- **Data Backup** — Auto-backup scheduling (daily/weekly/monthly/off), Google Drive integration placeholder
- **Security** — PIN lock with setup, change, and clear functionality

### Security

- **PIN Lock** — 4-digit PIN with setup, change, and clear options. No biometric authentication
- **Audit Trail** — All changes logged with old/new values, timestamp, and editor context
- **Wage Snapshots** — Wage changes have effective dates; past attendance records retain original wage

## Tech Stack

- **Framework**: React Native with Expo SDK 54
- **Language**: TypeScript
- **Database**: SQLite via expo-sqlite
- **Navigation**: React Navigation v7 (bottom tabs + stack)
- **State Management**: Zustand
- **Date Handling**: date-fns
- **PDF Generation**: expo-print
- **File Sharing**: expo-sharing
- **File Picking**: expo-document-picker
- **UI Components**: Custom design system (Material Design inspired)

## Project Structure

```
worker-wagebook/
├── App.tsx                          # Entry point with GestureHandlerRootView + DB init
├── app.json                         # Expo configuration
├── package.json                     # Dependencies and scripts
├── tsconfig.json                    # TypeScript configuration
├── src/
│   ├── constants/
│   │   ├── theme.ts                 # Design tokens (colors, spacing, typography, shadows)
│   │   └── helpers.ts               # Utility functions (formatCurrency, date helpers, etc.)
│   ├── database/
│   │   ├── database.ts              # SQLite connection, schema, migrations, seed data
│   │   └── schema.ts                # Table definitions and types
│   ├── services/
│   │   ├── workerService.ts         # Worker CRUD operations
│   │   ├── attendanceService.ts     # Attendance marking, editing, history
│   │   ├── advanceService.ts        # Advance recording, balance tracking
│   │   ├── salaryService.ts         # Salary calculation engine with all rules
│   │   ├── settingsService.ts       # App settings and salary rules management
│   │   ├── categoryService.ts       # Worker category CRUD
│   │   ├── pdfService.ts            # PDF export with professional HTML templates
│   │   └── csvService.ts            # CSV export/import with validation
│   ├── stores/
│   │   └── appStore.ts              # Zustand store (current week, PIN state, etc.)
│   ├── types/
│   │   └── index.ts                 # TypeScript interfaces and types
│   ├── utils/
│   │   └── helpers.ts               # Shared utility functions
│   ├── components/
│   │   └── ui/
│   │       └── index.tsx            # Reusable UI components (Card, Button, Badge, Avatar, etc.)
│   ├── screens/
│   │   ├── index.ts                 # Barrel exports for all screens
│   │   ├── auth/
│   │   │   └── PinLockScreen.tsx    # PIN entry/setup screen
│   │   ├── home/
│   │   │   └── HomeScreen.tsx       # Dashboard with week overview and quick actions
│   │   ├── workers/
│   │   │   ├── WorkersListScreen.tsx    # Workers list with search/filter
│   │   │   ├── AddWorkerScreen.tsx      # Add/edit worker form
│   │   │   └── WorkerProfileScreen.tsx  # Worker detail with tabs
│   │   ├── attendance/
│   │   │   └── AttendanceScreen.tsx     # Daily attendance marking
│   │   ├── advances/
│   │   │   └── RecordAdvanceScreen.tsx  # Record new advance
│   │   ├── salary/
│   │   │   └── WeeklySalaryScreen.tsx   # Salary settlement with preview/confirm
│   │   ├── reports/
│   │   │   ├── ReportsScreen.tsx        # Reports menu
│   │   │   └── ReportSubScreens.tsx     # Weekly, Attendance, Advances, Cashbook reports
│   │   └── settings/
│   │       ├── SettingsScreen.tsx       # Settings menu
│   │       ├── SettingsSubScreens.tsx   # Business profile, Change PIN, Salary rules, Backup
│   │       └── CategoryManagementScreen.tsx  # Category CRUD
│   └── navigation/
│       └── AppNavigator.tsx         # Tab + Stack navigation setup
```

## Database Schema

### Core Tables

| Table | Purpose |
|-------|---------|
| `workers` | Worker profiles with name, employee_id, category, wage, photo |
| `worker_categories` | Custom categories with default wage rates |
| `attendance` | Daily attendance records with status, overtime, wage snapshot |
| `attendance_edits` | Edit history with old/new values and reason |
| `advances` | Advance records with amount, reason, recovery tracking |
| `salary_settlements` | Weekly salary records (draft/locked) with gross/net amounts |
| `settlement_items` | Line-by-line breakdown of each settlement |
| `salary_calculation_rules` | Configurable calculation parameters |
| `settings` | Key-value app settings |
| `audit_log` | System-wide audit trail for all data changes |

### Key Constraints

- **Settlement Uniqueness**: `UNIQUE(worker_id, week_start, week_end) WHERE is_locked=1` prevents duplicate confirmed settlements
- **Wage Snapshots**: Attendance records store `daily_wage` at time of marking; future wage changes don't affect past records
- **Advance Balance**: Outstanding balance computed from advances minus recoveries in locked settlements
- **Audit Logging**: All mutations create audit_log entries with old/new values

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)

### Installation

```bash
cd worker-wagebook
npm install
```

### Run Development Server

```bash
# Web (recommended for development)
npx expo start --web --port 8081

# Mobile (requires Expo Go app or simulator)
npx expo start
```

### Build for Production

```bash
# Android APK
eas build --platform android --profile preview

# iOS (requires Apple Developer account)
eas build --platform ios

# Web
npx expo export --platform web
```

## Salary Calculation Rules

The salary engine supports configurable rules stored in the `salary_calculation_rules` table:

| Rule | Default | Description |
|------|---------|-------------|
| `half_day_multiplier` | 0.5 | Fraction of daily wage for half-day work |
| `holiday_pay_multiplier` | 1.0 | Fraction of daily wage paid on holidays |
| `weekly_off_day` | sunday | Day of the week for weekly off |
| `weekly_off_pay_multiplier` | 1.0 | Fraction of daily wage paid on weekly off |
| `paid_leave_allowed_per_month` | 2 | Number of paid leaves per month |
| `overtime_default_multiplier` | 1.5 | Default overtime rate multiplier |
| `overtime_rounding` | none | Rounding mode: none, nearest_half, nearest_hour |
| `advance_recovery_mode` | full | Recovery mode: full or partial |
| `advance_recovery_max_percent` | 50 | Max % of gross earnings recoverable (partial mode) |
| `carry_forward_unrecovered_advances` | 1 | Whether to carry forward unpaid advance balance |
| `monetary_rounding` | none | Rounding for final amounts: none, rupee, paisa |

### Salary Calculation Flow

1. **Load attendance** for the worker in the given week
2. **Calculate daily earnings** per attendance record using snapshot wage and status multipliers
3. **Add overtime** earnings (additive to base wage, not a replacement status)
4. **Sum gross earnings** across all attendance days
5. **Calculate advance recovery**: `min(outstanding_balance, max_recovery)` where `max_recovery` depends on recovery mode
6. **Ensure net pay >= 0**: If deductions exceed earnings, reduce recovery amount
7. **Create settlement** with line items for each earning/deduction component

## Design Principles

- **No emojis in UI** — Uses MaterialIcons throughout
- **Functional, data-dense** — No decorative gradients or AI-generated feel
- **Professional quality** — Inspired by Cred, Khatabook, Linear design standards
- **English only** — No Tamil or multilingual support
- **PIN lock only** — No biometric authentication

## License

Private — All rights reserved.
