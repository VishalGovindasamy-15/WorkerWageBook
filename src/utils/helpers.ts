// Worker WageBook - Utility Functions

import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, parseISO, isToday, isYesterday, differenceInDays } from 'date-fns';

// Currency formatting
export function formatCurrency(amount: number, showSign: boolean = false): string {
  const absAmount = Math.abs(amount);
  const formatted = absAmount.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  
  const prefix = showSign ? (amount >= 0 ? '+' : '-') : (amount < 0 ? '-' : '');
  return `${prefix}₹${formatted}`;
}

// Parse DB timestamp correctly converting UTC SQLite strings to local Date
export function parseDbTimestamp(date: string | Date | null | undefined): Date {
  if (!date) return new Date();
  if (date instanceof Date) return date;
  const s = String(date).trim();
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(s)) {
    return new Date(s.replace(' ', 'T') + 'Z');
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(s)) {
    return new Date(s + 'Z');
  }
  return new Date(s);
}

// Date formatting
export function formatDate(date: string | Date, formatStr: string = 'MMM dd, yyyy'): string {
  const d = parseDbTimestamp(date);
  return format(d, formatStr);
}

export function formatTime(date: string | Date): string {
  const d = parseDbTimestamp(date);
  return format(d, 'h:mm a');
}

export function formatDateTime(date: string | Date): string {
  const d = parseDbTimestamp(date);
  return format(d, 'MMM dd, yyyy h:mm a');
}

// Relative time (for activity logs)
export function formatRelativeTime(date: string | Date): string {
  const d = parseDbTimestamp(date);
  const days = differenceInDays(new Date(), d);
  
  if (isToday(d)) {
    return `Today, ${format(d, 'h:mm a')}`;
  } else if (isYesterday(d)) {
    return `Yesterday, ${format(d, 'h:mm a')}`;
  } else if (days < 7) {
    return `${days} days ago`;
  } else {
    return formatDate(d);
  }
}

// Week helpers
export function getWeekRange(date: Date = new Date(), weekStartsOn: 0 | 1 = 1): { start: Date; end: Date } {
  const start = startOfWeek(date, { weekStartsOn });
  const end = endOfWeek(date, { weekStartsOn });
  return { start, end };
}

export function getWeekLabel(date: Date = new Date(), weekStartsOn: 0 | 1 = 1): string {
  const { start, end } = getWeekRange(date, weekStartsOn);
  return `${format(start, 'MMM dd')} - ${format(end, 'MMM dd, yyyy')}`;
}

export function getNextWeek(date: Date = new Date()): Date {
  return addWeeks(date, 1);
}

export function getPreviousWeek(date: Date = new Date()): Date {
  return subWeeks(date, 1);
}

// Attendance status helpers
export function getAttendanceStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    present: 'Present',
    half_day: 'Half-day',
    absent: 'Absent',
    holiday: 'Holiday',
    leave: 'Leave',
  };
  return labels[status] || status;
}

export function getAttendanceStatusColor(status: string): string {
  const colors: Record<string, string> = {
    present: '#10B981',
    half_day: '#F59E0B',
    absent: '#EF4444',
    holiday: '#9CA3AF',
    leave: '#6B7280',
  };
  return colors[status] || '#6B7280';
}

// Payment method helpers
export function getPaymentMethodLabel(method: string): string {
  const labels: Record<string, string> = {
    cash: 'Cash',
    upi: 'UPI',
    bank: 'Bank Transfer',
  };
  return labels[method] || method;
}

// Get initials from name
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Validation helpers
export function isValidPhone(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length === 10;
}

export function isValidPin(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}

// Group array by date
export function groupByDate<T>(items: T[], dateField: keyof T): Record<string, T[]> {
  return items.reduce((groups, item) => {
    const date = String(item[dateField]).split(' ')[0];
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(item);
    return groups;
  }, {} as Record<string, T[]>);
}
