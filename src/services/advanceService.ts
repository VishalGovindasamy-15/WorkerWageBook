// Worker WageBook - Advance Service

import { Advance, AdvanceRecovery } from '../types';
import { runAsync, getFirstAsync, getAllAsync, withTransaction } from '../database/database';
import { auditService } from './auditService';

export const advanceService = {
  // Record a new advance
  async create(data: {
    worker_id: number;
    amount: number;
    payment_method: 'cash' | 'upi' | 'bank';
    reason?: string;
    advance_date: string;
  }): Promise<Advance> {
    return withTransaction(async (db) => {
      const result = await db.runAsync(
        `INSERT INTO advances (worker_id, amount, payment_method, reason, advance_date)
         VALUES (?, ?, ?, ?, ?)`,
        [
          data.worker_id,
          data.amount,
          data.payment_method,
          data.reason || null,
          data.advance_date,
        ]
      );

      const advance = await db.getFirstAsync<Advance>(
        'SELECT * FROM advances WHERE id = ?',
        [result.lastInsertRowId]
      );

      await auditService.log({
        action: 'advance_added',
        entity_type: 'advance',
        entity_id: result.lastInsertRowId,
        worker_id: data.worker_id,
        new_value: JSON.stringify({
          amount: data.amount,
          payment_method: data.payment_method,
          reason: data.reason,
          advance_date: data.advance_date,
        }),
      });

      return advance!;
    });
  },

  // Reverse an advance
  async reverse(id: number, reason: string): Promise<void> {
    const advance = await this.getById(id);
    if (!advance) throw new Error('Advance not found');

    if (advance.is_reversed) {
      throw new Error('Advance already reversed');
    }

    return withTransaction(async (db) => {
      await db.runAsync(
        `UPDATE advances SET is_reversed = 1, reversal_reason = ?, updated_at = datetime('now')
         WHERE id = ?`,
        [reason, id]
      );

      await auditService.log({
        action: 'advance_reversed',
        entity_type: 'advance',
        entity_id: id,
        worker_id: advance.worker_id,
        old_value: JSON.stringify({ amount: advance.amount, is_reversed: 0 }),
        new_value: JSON.stringify({ amount: advance.amount, is_reversed: 1 }),
        reason,
      });
    });
  },

  // Get advance by ID
  async getById(id: number): Promise<Advance | null> {
    return getFirstAsync<Advance>('SELECT * FROM advances WHERE id = ?', [id]);
  },

  // Get all advances for a worker
  async getForWorker(
    workerId: number,
    options?: { includeReversed?: boolean }
  ): Promise<Advance[]> {
    let sql = 'SELECT * FROM advances WHERE worker_id = ?';
    const params: any[] = [workerId];

    if (!options?.includeReversed) {
      sql += ' AND is_reversed = 0';
    }

    sql += ' ORDER BY advance_date DESC, created_at DESC';

    return getAllAsync<Advance>(sql, params);
  },

  // Get all advances with filters
  async getAll(filters?: {
    worker_id?: number;
    category_id?: number;
    payment_method?: string;
    date_from?: string;
    date_to?: string;
    include_reversed?: boolean;
  }): Promise<Advance[]> {
    let sql = 'SELECT a.* FROM advances a';
    const params: any[] = [];

    if (filters?.category_id) {
      sql += ' INNER JOIN workers w ON a.worker_id = w.id';
    }

    sql += ' WHERE 1=1';

    if (!filters?.include_reversed) {
      sql += ' AND a.is_reversed = 0';
    }

    if (filters?.worker_id) {
      sql += ' AND a.worker_id = ?';
      params.push(filters.worker_id);
    }

    if (filters?.category_id) {
      sql += ' AND w.category_id = ?';
      params.push(filters.category_id);
    }

    if (filters?.payment_method) {
      sql += ' AND a.payment_method = ?';
      params.push(filters.payment_method);
    }

    if (filters?.date_from) {
      sql += ' AND a.advance_date >= ?';
      params.push(filters.date_from);
    }

    if (filters?.date_to) {
      sql += ' AND a.advance_date <= ?';
      params.push(filters.date_to);
    }

    sql += ' ORDER BY a.advance_date DESC, a.created_at DESC';

    return getAllAsync<Advance>(sql, params);
  },

  // Get all advances with worker details joined
  async getAllWithWorkers(filters?: {
    worker_id?: number;
    category_id?: number;
    payment_method?: string;
    date_from?: string;
    date_to?: string;
    include_reversed?: boolean;
  }): Promise<(Advance & { worker_name: string; employee_id: string; worker_phone: string | null })[]> {
    let sql = `
      SELECT a.*, w.name as worker_name, w.employee_id, w.phone as worker_phone
      FROM advances a
      INNER JOIN workers w ON a.worker_id = w.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (!filters?.include_reversed) {
      sql += ' AND a.is_reversed = 0';
    }

    if (filters?.worker_id) {
      sql += ' AND a.worker_id = ?';
      params.push(filters.worker_id);
    }

    if (filters?.category_id) {
      sql += ' AND w.category_id = ?';
      params.push(filters.category_id);
    }

    if (filters?.payment_method) {
      sql += ' AND a.payment_method = ?';
      params.push(filters.payment_method);
    }

    if (filters?.date_from) {
      sql += ' AND a.advance_date >= ?';
      params.push(filters.date_from);
    }

    if (filters?.date_to) {
      sql += ' AND a.advance_date <= ?';
      params.push(filters.date_to);
    }

    sql += ' ORDER BY a.advance_date DESC, a.created_at DESC';

    return getAllAsync<Advance & { worker_name: string; employee_id: string; worker_phone: string | null }>(sql, params);
  },

  // Get outstanding advance balance for a worker
  async getOutstandingBalance(workerId: number): Promise<number> {
    const result = await getFirstAsync<{ balance: number }>(
      `SELECT COALESCE(
        (SELECT SUM(amount) FROM advances WHERE worker_id = ? AND is_reversed = 0)
        - (SELECT COALESCE(SUM(amount), 0) FROM advance_recoveries WHERE worker_id = ? AND is_reversed = 0)
      , 0) as balance`,
      [workerId, workerId]
    );
    return result?.balance || 0;
  },

  // Get remaining balance for a specific advance
  async getAdvanceBalance(advanceId: number): Promise<number> {
    const result = await getFirstAsync<{ balance: number }>(
      `SELECT COALESCE(
        (SELECT amount FROM advances WHERE id = ? AND is_reversed = 0)
        - (SELECT COALESCE(SUM(amount), 0) FROM advance_recoveries WHERE advance_id = ? AND is_reversed = 0)
      , 0) as balance`,
      [advanceId, advanceId]
    );
    return result?.balance || 0;
  },

  // Get advances for a specific week (for salary calculation)
  async getForWeek(
    workerId: number,
    weekStart: string,
    weekEnd: string
  ): Promise<Advance[]> {
    return getAllAsync<Advance>(
      `SELECT * FROM advances 
       WHERE worker_id = ? AND advance_date BETWEEN ? AND ? AND is_reversed = 0
       ORDER BY advance_date`,
      [workerId, weekStart, weekEnd]
    );
  },

  // Get total outstanding across all workers
  async getTotalOutstanding(): Promise<number> {
    const result = await getFirstAsync<{ total: number }>(
      `SELECT COALESCE(SUM(
        (SELECT SUM(amount) FROM advances WHERE worker_id = w.id AND is_reversed = 0)
        - (SELECT COALESCE(SUM(amount), 0) FROM advance_recoveries WHERE worker_id = w.id AND is_reversed = 0)
      ), 0) as total
       FROM workers w WHERE w.is_active = 1`
    );
    return result?.total || 0;
  },

  // Create advance recovery (during settlement)
  async createRecovery(data: {
    advance_id: number;
    settlement_id: number;
    worker_id: number;
    amount: number;
    recovery_date: string;
  }): Promise<AdvanceRecovery> {
    const result = await runAsync(
      `INSERT INTO advance_recoveries (advance_id, settlement_id, worker_id, amount, recovery_date)
       VALUES (?, ?, ?, ?, ?)`,
      [
        data.advance_id,
        data.settlement_id,
        data.worker_id,
        data.amount,
        data.recovery_date,
      ]
    );

    const recovery = await getFirstAsync<AdvanceRecovery>(
      'SELECT * FROM advance_recoveries WHERE id = ?',
      [result.lastInsertRowId]
    );

    return recovery!;
  },

  // Get recoveries for a settlement
  async getRecoveriesForSettlement(settlementId: number): Promise<AdvanceRecovery[]> {
    return getAllAsync<AdvanceRecovery>(
      'SELECT * FROM advance_recoveries WHERE settlement_id = ? AND is_reversed = 0',
      [settlementId]
    );
  },
};
