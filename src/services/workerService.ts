// Worker WageBook - Worker Service

import { Worker } from '../types';
import { runAsync, getFirstAsync, getAllAsync, withTransaction } from '../database/database';
import { auditService } from './auditService';

export const workerService = {
  // Generate next employee ID
  async generateEmployeeId(): Promise<string> {
    const row = await getFirstAsync<{ next_val: number }>(
      'SELECT next_val FROM id_sequence WHERE entity = ?',
      ['worker']
    );
    const nextVal = row?.next_val ?? 1;
    const employeeId = `W-${String(nextVal).padStart(3, '0')}`;
    await runAsync(
      'UPDATE id_sequence SET next_val = ? WHERE entity = ?',
      [nextVal + 1, 'worker']
    );
    return employeeId;
  },

  // Get current counter value for preview
  async getNextEmployeeIdPreview(): Promise<string> {
    const row = await getFirstAsync<{ next_val: number }>(
      'SELECT next_val FROM id_sequence WHERE entity = ?',
      ['worker']
    );
    const nextVal = row?.next_val ?? 1;
    return `W-${String(nextVal).padStart(3, '0')}`;
  },

  // Create a new worker
  async create(data: {
    name: string;
    employee_id?: string;
    phone?: string;
    photo_uri?: string;
    category_id?: number;
    daily_wage?: number;
    overtime_rate?: number;
    overtime_type?: 'per_hour' | 'multiplier';
    joining_date?: string;
    notes?: string;
  }): Promise<Worker> {
    const employeeId = data.employee_id || (await this.generateEmployeeId());

    const result = await runAsync(
      `INSERT INTO workers (employee_id, name, phone, photo_uri, category_id, 
        daily_wage, overtime_rate, overtime_type, is_active, joining_date, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [
        employeeId,
        data.name,
        data.phone || null,
        data.photo_uri || null,
        data.category_id || null,
        data.daily_wage || 0,
        data.overtime_rate || 0,
        data.overtime_type || 'per_hour',
        data.joining_date || null,
        data.notes || null,
      ]
    );

    const worker = await this.getById(result.lastInsertRowId);
    if (!worker) throw new Error('Failed to create worker');

    await auditService.log({
      action: 'worker_created',
      entity_type: 'worker',
      entity_id: worker.id,
      worker_id: worker.id,
      new_value: JSON.stringify(worker),
    });

    return worker;
  },

  // Update a worker
  async update(
    id: number,
    data: Partial<Omit<Worker, 'id' | 'created_at'>>
  ): Promise<Worker> {
    const existing = await this.getById(id);
    if (!existing) throw new Error('Worker not found');

    const fields: string[] = [];
    const values: any[] = [];

    const allowedFields = [
      'name', 'phone', 'photo_uri', 'category_id', 'daily_wage',
      'overtime_rate', 'overtime_type', 'payment_frequency',
      'is_active', 'joining_date', 'notes',
    ];

    for (const field of allowedFields) {
      if (field in data) {
        fields.push(`${field} = ?`);
        values.push((data as any)[field]);
      }
    }

    if (fields.length === 0) return existing;

    fields.push('updated_at = datetime("now")');
    values.push(id);

    await runAsync(
      `UPDATE workers SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    const updated = await this.getById(id);
    if (!updated) throw new Error('Failed to update worker');

    // Track changes
    const changes: Record<string, { old: any; new: any }> = {};
    for (const key of Object.keys(data)) {
      if ((existing as any)[key] !== (data as any)[key]) {
        changes[key] = { old: (existing as any)[key], new: (data as any)[key] };
      }
    }

    await auditService.log({
      action: 'worker_edited',
      entity_type: 'worker',
      entity_id: id,
      worker_id: id,
      old_value: JSON.stringify(changes),
      new_value: JSON.stringify(updated),
    });

    return updated;
  },

  // Deactivate a worker (soft delete)
  async deactivate(id: number): Promise<void> {
    await this.update(id, { is_active: 0 });
    await auditService.log({
      action: 'worker_deactivated',
      entity_type: 'worker',
      entity_id: id,
      worker_id: id,
    });
  },

  // Reactivate a worker
  async reactivate(id: number): Promise<void> {
    await this.update(id, { is_active: 1 });
  },

  // Permanently delete a worker and all associated records
  async delete(id: number): Promise<void> {
    const worker = await this.getById(id);
    await withTransaction(async (db) => {
      // 1. Delete attendance edit history for this worker's attendance records
      await db.runAsync(
        `DELETE FROM attendance_history WHERE attendance_id IN (SELECT id FROM attendance WHERE worker_id = ?)`,
        [id]
      );

      // 2. Delete attendance records
      await db.runAsync(`DELETE FROM attendance WHERE worker_id = ?`, [id]);

      // 3. Delete advance recoveries
      await db.runAsync(`DELETE FROM advance_recoveries WHERE worker_id = ?`, [id]);

      // 4. Delete advances
      await db.runAsync(`DELETE FROM advances WHERE worker_id = ?`, [id]);

      // 5. Delete wage change history
      await db.runAsync(`DELETE FROM wage_change_history WHERE worker_id = ?`, [id]);

      // 6. Delete settlement items & adjustments
      await db.runAsync(
        `DELETE FROM settlement_items WHERE settlement_id IN (SELECT id FROM salary_settlements WHERE worker_id = ?)`,
        [id]
      );
      await db.runAsync(
        `DELETE FROM settlement_adjustments WHERE settlement_id IN (SELECT id FROM salary_settlements WHERE worker_id = ?)`,
        [id]
      );

      // 7. Delete salary settlements
      await db.runAsync(`DELETE FROM salary_settlements WHERE worker_id = ?`, [id]);

      // 8. Delete the worker record
      await db.runAsync(`DELETE FROM workers WHERE id = ?`, [id]);
    });

    await auditService.log({
      action: 'worker_deleted',
      entity_type: 'worker',
      entity_id: id,
      worker_id: id,
      reason: worker ? `Permanently deleted worker ${worker.name} (${worker.employee_id})` : undefined,
    });
  },

  // Get worker by ID
  async getById(id: number): Promise<Worker | null> {
    return getFirstAsync<Worker>('SELECT * FROM workers WHERE id = ?', [id]);
  },

  // Get worker by employee ID
  async getByEmployeeId(employeeId: string): Promise<Worker | null> {
    return getFirstAsync<Worker>(
      'SELECT * FROM workers WHERE employee_id = ?',
      [employeeId]
    );
  },

  // Get all workers with optional filters
  async getAll(filters?: {
    search?: string;
    category_id?: number;
    is_active?: number;
    sort_by?: 'name' | 'employee_id' | 'daily_wage' | 'created_at';
    sort_order?: 'ASC' | 'DESC';
  }): Promise<Worker[]> {
    let sql = 'SELECT * FROM workers WHERE 1=1';
    const params: any[] = [];

    if (filters?.search) {
      sql += ' AND (name LIKE ? OR employee_id LIKE ?)';
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    if (filters?.category_id !== undefined) {
      sql += ' AND category_id = ?';
      params.push(filters.category_id);
    }

    if (filters?.is_active !== undefined) {
      if (filters.is_active === 1) {
        sql += ' AND (is_active = 1 OR is_active IS NULL)';
      } else {
        sql += ' AND is_active = 0';
      }
    }

    const sortBy = filters?.sort_by || 'name';
    const sortOrder = filters?.sort_order || 'ASC';
    sql += ` ORDER BY ${sortBy} ${sortOrder}`;

    return getAllAsync<Worker>(sql, params);
  },

  // Get worker count
  async getCount(isActive?: boolean): Promise<number> {
    let sql = 'SELECT COUNT(*) as count FROM workers';
    const params: any[] = [];

    if (isActive !== undefined) {
      sql += ' WHERE is_active = ?';
      params.push(isActive ? 1 : 0);
    }

    const result = await getFirstAsync<{ count: number }>(sql, params);
    return result?.count ?? 0;
  },

  // Get outstanding advance balance for a worker
  async getOutstandingAdvance(workerId: number): Promise<number> {
    const result = await getFirstAsync<{ balance: number }>(
      `SELECT COALESCE(SUM(CASE 
        WHEN a.is_reversed = 1 THEN -a.amount
        ELSE a.amount
       END), 0) - COALESCE((
        SELECT SUM(ar.amount) FROM advance_recoveries ar 
        WHERE ar.worker_id = ? AND ar.is_reversed = 0
       ), 0) as balance
       FROM advances a WHERE a.worker_id = ?`,
      [workerId, workerId]
    );
    return result?.balance ?? 0;
  },

  // Get category IDs that have at least one worker assigned
  async getAssignedCategoryIds(isActive?: boolean): Promise<number[]> {
    let sql = 'SELECT DISTINCT category_id FROM workers WHERE category_id IS NOT NULL';
    const params: any[] = [];
    if (isActive !== undefined) {
      sql += ' AND is_active = ?';
      params.push(isActive ? 1 : 0);
    }
    const rows = await getAllAsync<{ category_id: number }>(sql, params);
    return rows.map((r) => r.category_id);
  },
};
