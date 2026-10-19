// Worker WageBook - Attendance Service

import { Attendance, AttendanceStatus, AttendanceHistory, OvertimeType } from '../types';
import { runAsync, getFirstAsync, getAllAsync, withTransaction } from '../database/database';
import { auditService } from './auditService';
import { workerService } from './workerService';

export const attendanceService = {
  // Mark attendance for a single worker
  async mark(data: {
    worker_id: number;
    work_date: string;
    status: AttendanceStatus;
    leave_type?: 'paid' | 'unpaid';
    overtime_hours?: number;
    overtime_amount?: number;
    overtime_amount_type?: OvertimeType;
    notes?: string;
  }): Promise<Attendance> {
    // Get worker's current wage for snapshot
    const worker = await workerService.getById(data.worker_id);
    if (!worker) throw new Error('Worker not found');

    const dailyWageSnapshot = worker.daily_wage || 0;
    const nowIso = new Date().toISOString();

    return withTransaction(async (db) => {
      // Check if attendance already exists for this date
      const existing = await db.getFirstAsync<Attendance>(
        'SELECT * FROM attendance WHERE worker_id = ? AND work_date = ?',
        [data.worker_id, data.work_date]
      );

      if (existing) {
        // Update existing record
        await db.runAsync(
          `UPDATE attendance SET 
            status = ?, leave_type = ?, daily_wage_snapshot = ?,
            overtime_hours = ?, overtime_amount = ?, overtime_amount_type = ?,
            notes = ?, updated_at = ?
           WHERE id = ?`,
          [
            data.status,
            data.leave_type || null,
            dailyWageSnapshot,
            data.overtime_hours || 0,
            data.overtime_amount || 0,
            data.overtime_amount_type || 'calculated',
            data.notes || null,
            nowIso,
            existing.id,
          ]
        );

        // Log the edit
        await auditService.log({
          action: 'attendance_edited',
          entity_type: 'attendance',
          entity_id: existing.id,
          worker_id: data.worker_id,
          old_value: JSON.stringify({
            status: existing.status,
            overtime_hours: existing.overtime_hours,
            overtime_amount: existing.overtime_amount,
          }),
          new_value: JSON.stringify({
            status: data.status,
            overtime_hours: data.overtime_hours || 0,
            overtime_amount: data.overtime_amount || 0,
          }),
          reason: 'Attendance updated',
        });

        return { ...existing, ...data, daily_wage_snapshot: dailyWageSnapshot, updated_at: nowIso };
      } else {
        // Insert new record
        const result = await db.runAsync(
          `INSERT INTO attendance (
            worker_id, work_date, status, leave_type, daily_wage_snapshot,
            overtime_hours, overtime_amount, overtime_amount_type, notes,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            data.worker_id,
            data.work_date,
            data.status,
            data.leave_type || null,
            dailyWageSnapshot,
            data.overtime_hours || 0,
            data.overtime_amount || 0,
            data.overtime_amount_type || 'calculated',
            data.notes || null,
            nowIso,
            nowIso,
          ]
        );

        // Log the creation
        await auditService.log({
          action: 'attendance_marked',
          entity_type: 'attendance',
          entity_id: result.lastInsertRowId,
          worker_id: data.worker_id,
          new_value: JSON.stringify({
            status: data.status,
            work_date: data.work_date,
            overtime_hours: data.overtime_hours || 0,
          }),
        });

        const attendance = await db.getFirstAsync<Attendance>(
          'SELECT * FROM attendance WHERE id = ?',
          [result.lastInsertRowId]
        );
        return attendance!;
      }
    });
  },

  // Bulk mark attendance for multiple workers
  async markBulk(
    workDate: string,
    records: Array<{
      worker_id: number;
      status: AttendanceStatus;
      leave_type?: 'paid' | 'unpaid';
      overtime_hours?: number;
      overtime_amount?: number;
      overtime_amount_type?: OvertimeType;
    }>
  ): Promise<void> {
    for (const record of records) {
      await this.mark({
        ...record,
        work_date: workDate,
      });
    }
  },

  // Edit attendance with reason (for audit trail)
  async edit(
    id: number,
    data: {
      status?: AttendanceStatus;
      leave_type?: 'paid' | 'unpaid';
      overtime_hours?: number;
      overtime_amount?: number;
      overtime_amount_type?: OvertimeType;
      notes?: string;
      reason: string;
    }
  ): Promise<Attendance> {
    const existing = await this.getById(id);
    if (!existing) throw new Error('Attendance record not found');

    if (existing.is_locked) {
      throw new Error('Cannot edit locked attendance. Week is settled.');
    }

    return withTransaction(async (db) => {
      // Create history record
      await db.runAsync(
        `INSERT INTO attendance_history (
          attendance_id, old_status, new_status,
          old_overtime_hours, new_overtime_hours,
          old_overtime_amount, new_overtime_amount,
          old_daily_wage_snapshot, new_daily_wage_snapshot,
          reason, edited_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          existing.status,
          data.status || existing.status,
          existing.overtime_hours,
          data.overtime_hours ?? existing.overtime_hours,
          existing.overtime_amount,
          data.overtime_amount ?? existing.overtime_amount,
          existing.daily_wage_snapshot,
          existing.daily_wage_snapshot,
          data.reason,
          'owner',
        ]
      );

      // Update attendance record
      await db.runAsync(
        `UPDATE attendance SET 
          status = COALESCE(?, status),
          leave_type = COALESCE(?, leave_type),
          overtime_hours = COALESCE(?, overtime_hours),
          overtime_amount = COALESCE(?, overtime_amount),
          overtime_amount_type = COALESCE(?, overtime_amount_type),
          notes = COALESCE(?, notes),
          updated_at = datetime('now')
         WHERE id = ?`,
        [
          data.status || null,
          data.leave_type || null,
          data.overtime_hours ?? null,
          data.overtime_amount ?? null,
          data.overtime_amount_type || null,
          data.notes ?? null,
          id,
        ]
      );

      // Log the edit
      await auditService.log({
        action: 'attendance_edited',
        entity_type: 'attendance',
        entity_id: id,
        worker_id: existing.worker_id,
        old_value: JSON.stringify({
          status: existing.status,
          overtime_hours: existing.overtime_hours,
          overtime_amount: existing.overtime_amount,
        }),
        new_value: JSON.stringify({
          status: data.status || existing.status,
          overtime_hours: data.overtime_hours ?? existing.overtime_hours,
          overtime_amount: data.overtime_amount ?? existing.overtime_amount,
        }),
        reason: data.reason,
      });

      const updated = await db.getFirstAsync<Attendance>(
        'SELECT * FROM attendance WHERE id = ?',
        [id]
      );
      return updated!;
    });
  },

  // Get attendance by ID
  async getById(id: number): Promise<Attendance | null> {
    return getFirstAsync<Attendance>('SELECT * FROM attendance WHERE id = ?', [id]);
  },

  // Get attendance for a specific worker and date
  async getByWorkerAndDate(workerId: number, workDate: string): Promise<Attendance | null> {
    return getFirstAsync<Attendance>(
      'SELECT * FROM attendance WHERE worker_id = ? AND work_date = ?',
      [workerId, workDate]
    );
  },

  // Get all attendance for a date
  async getByDate(
    workDate: string,
    filters?: {
      worker_id?: number;
      category_id?: number;
      status?: AttendanceStatus;
    }
  ): Promise<Attendance[]> {
    let sql = 'SELECT a.* FROM attendance a';
    const params: any[] = [];

    if (filters?.category_id) {
      sql += ' INNER JOIN workers w ON a.worker_id = w.id';
    }

    sql += ' WHERE a.work_date = ?';
    params.push(workDate);

    if (filters?.worker_id) {
      sql += ' AND a.worker_id = ?';
      params.push(filters.worker_id);
    }

    if (filters?.category_id) {
      sql += ' AND w.category_id = ?';
      params.push(filters.category_id);
    }

    if (filters?.status) {
      sql += ' AND a.status = ?';
      params.push(filters.status);
    }

    sql += ' ORDER BY a.worker_id';

    return getAllAsync<Attendance>(sql, params);
  },

  // Get attendance for a worker in a date range
  async getForWorkerInRange(
    workerId: number,
    startDate: string,
    endDate: string
  ): Promise<Attendance[]> {
    return getAllAsync<Attendance>(
      `SELECT * FROM attendance 
       WHERE worker_id = ? AND work_date BETWEEN ? AND ?
       ORDER BY work_date`,
      [workerId, startDate, endDate]
    );
  },

  // Get attendance history for a specific attendance record
  async getHistory(attendanceId: number): Promise<AttendanceHistory[]> {
    return getAllAsync<AttendanceHistory>(
      'SELECT * FROM attendance_history WHERE attendance_id = ? ORDER BY created_at DESC',
      [attendanceId]
    );
  },

  // Get attendance stats for a date
  async getStatsForDate(workDate: string): Promise<{
    total: number;
    present: number;
    half_day: number;
    absent: number;
    holiday: number;
    leave: number;
    unmarked: number;
  }> {
    const stats = await getFirstAsync<any>(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present,
        SUM(CASE WHEN status = 'half_day' THEN 1 ELSE 0 END) as half_day,
        SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent,
        SUM(CASE WHEN status = 'holiday' THEN 1 ELSE 0 END) as holiday,
        SUM(CASE WHEN status = 'leave' THEN 1 ELSE 0 END) as leave
       FROM attendance WHERE work_date = ?`,
      [workDate]
    );

    const activeWorkers = await workerService.getCount(true);
    const marked = stats?.total || 0;

    return {
      total: marked,
      present: stats?.present || 0,
      half_day: stats?.half_day || 0,
      absent: stats?.absent || 0,
      holiday: stats?.holiday || 0,
      leave: stats?.leave || 0,
      unmarked: activeWorkers - marked,
    };
  },

  // Lock attendance for a settled week
  async lockForWeek(weekStart: string, weekEnd: string, workerId?: number): Promise<void> {
    let sql = `UPDATE attendance SET is_locked = 1 
               WHERE work_date BETWEEN ? AND ?`;
    const params: any[] = [weekStart, weekEnd];

    if (workerId) {
      sql += ' AND worker_id = ?';
      params.push(workerId);
    }

    await runAsync(sql, params);
  },
};
