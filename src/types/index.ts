// Worker WageBook - Type Definitions

export interface Category {
  id: number;
  name: string;
  is_default: number;
  is_active: number;
  created_at: string;
}

export interface Worker {
  id: number;
  employee_id: string;
  name: string;
  phone: string | null;
  photo_uri: string | null;
  category_id: number | null;
  daily_wage: number;
  overtime_rate: number;
  overtime_type: 'per_hour' | 'multiplier';
  payment_frequency: string;
  is_active: number;
  joining_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type AttendanceStatus = 'present' | 'half_day' | 'absent' | 'holiday' | 'leave';
export type LeaveType = 'paid' | 'unpaid';
export type OvertimeType = 'calculated' | 'manual';

export interface Attendance {
  id: number;
  worker_id: number;
  work_date: string;
  status: AttendanceStatus;
  leave_type: LeaveType | null;
  daily_wage_snapshot: number;
  overtime_hours: number;
  overtime_amount: number;
  overtime_amount_type: OvertimeType;
  notes: string | null;
  marked_by: string;
  is_locked: number;
  created_at: string;
  updated_at: string;
}

export interface AttendanceHistory {
  id: number;
  attendance_id: number;
  old_status: string | null;
  new_status: string;
  old_overtime_hours: number | null;
  new_overtime_hours: number | null;
  old_overtime_amount: number | null;
  new_overtime_amount: number | null;
  old_daily_wage_snapshot: number | null;
  new_daily_wage_snapshot: number | null;
  reason: string;
  edited_by: string;
  created_at: string;
}

export interface Advance {
  id: number;
  worker_id: number;
  amount: number;
  payment_method: 'cash' | 'upi' | 'bank';
  reason: string | null;
  advance_date: string;
  is_reversed: number;
  reversed_by: number | null;
  reversal_reason: string | null;
  is_locked: number;
  created_at: string;
  updated_at: string;
}

export interface AdvanceRecovery {
  id: number;
  advance_id: number;
  settlement_id: number;
  worker_id: number;
  amount: number;
  recovery_date: string;
  is_reversed: number;
  reversal_reason: string | null;
  created_at: string;
}

export type SettlementStatus = 'draft' | 'confirmed' | 'adjusted';

export interface SalarySettlement {
  id: number;
  worker_id: number;
  week_start: string;
  week_end: string;
  daily_wage_snapshot: number;
  status: SettlementStatus;
  days_worked: number;
  half_days_worked: number;
  overtime_hours: number;
  overtime_earnings: number;
  gross_earnings: number;
  total_advances_recovered: number;
  outstanding_advance_after: number;
  other_deductions: number;
  bonuses: number;
  net_pay: number;
  carry_forward_advance: number;
  payment_method: string;
  settled_by: string;
  is_locked: number;
  confirmed_at: string | null;
  created_at: string;
  updated_at: string;
}

export type SettlementItemType = 'earning' | 'advance' | 'deduction' | 'bonus';

export interface SettlementItem {
  id: number;
  settlement_id: number;
  item_type: SettlementItemType;
  description: string;
  amount: number;
  reference_id: number | null;
  reference_type: 'attendance' | 'advance' | 'manual' | null;
}

export type AuditAction =
  | 'attendance_marked'
  | 'attendance_edited'
  | 'advance_added'
  | 'advance_reversed'
  | 'salary_settled'
  | 'adjustment_created'
  | 'worker_created'
  | 'worker_edited'
  | 'worker_deactivated'
  | 'worker_deleted'
  | 'category_created'
  | 'category_renamed'
  | 'backup_created'
  | 'restore_performed';

export interface AuditLog {
  id: number;
  action: AuditAction;
  entity_type: string;
  entity_id: number | null;
  worker_id: number | null;
  old_value: string | null;
  new_value: string | null;
  reason: string | null;
  performed_by: string;
  created_at: string;
}

export interface WageChangeHistory {
  id: number;
  worker_id: number;
  old_daily_wage: number;
  new_daily_wage: number;
  effective_date: string;
  reason: string | null;
  changed_by: string;
  created_at: string;
}

export interface SalaryCalculationRules {
  id: number;
  half_day_multiplier: number;
  holiday_pay_multiplier: number;
  weekly_off_day: string;
  weekly_off_pay_multiplier: number;
  paid_leave_allowed_per_month: number;
  overtime_default_multiplier: number;
  overtime_rounding: 'nearest_half' | 'nearest_hour' | 'exact';
  advance_recovery_mode: 'full' | 'partial';
  advance_recovery_max_percent: number;
  carry_forward_unrecovered_advances: number;
  monetary_rounding: 'paisa' | 'rupee';
  updated_at: string;
}

export interface BackupHistory {
  id: number;
  backup_type: 'manual' | 'auto';
  file_name: string;
  file_size: number;
  drive_file_id: string | null;
  status: 'success' | 'failed';
  created_at: string;
}

// UI Types
export interface FilterOption {
  label: string;
  value: string;
}

export interface WeekRange {
  start: string;
  end: string;
  label: string;
}

// Navigation Types
export type RootTabParamList = {
  HomeTab: undefined;
  WorkersTab: undefined;
  AttendanceTab: undefined;
  SalaryTab: undefined;
  ReportsTab: undefined;
};

export type HomeStackParamList = {
  Home: undefined;
  ActivityLogs: undefined;
};

export type WorkersStackParamList = {
  WorkersList: undefined;
  AddWorker: undefined;
  EditWorker: { workerId: number };
  WorkerProfile: { workerId: number };
  CategoryManagement: undefined;
};

export type AttendanceStackParamList = {
  AttendanceList: undefined;
  MarkAttendance: { date?: string };
};

export type AdvancesStackParamList = {
  AdvancesList: undefined;
  RecordAdvance: undefined;
};

export type SalaryStackParamList = {
  WeeklySalary: undefined;
  SettlementDetail: { settlementId: number };
};

export type ReportsStackParamList = {
  ReportsList: undefined;
  ReportDetail: { reportType: string };
};

export type SettingsStackParamList = {
  Settings: undefined;
  BusinessProfile: undefined;
  ManageCategories: undefined;
  ChangePin: undefined;
  GoogleDriveBackup: undefined;
  SalaryRules: undefined;
};

export type AuthStackParamList = {
  PinLock: undefined;
  SetupPin: undefined;
};
