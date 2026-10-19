// Worker WageBook - Audit Service

import { AuditLog, AuditAction } from '../types';
import { runAsync, getFirstAsync, getAllAsync } from '../database/database';

export const auditService = {
  // Log an audit entry
  async log(data: {
    action: AuditAction;
    entity_type: string;
    entity_id?: number;
    worker_id?: number;
    old_value?: string;
    new_value?: string;
    reason?: string;
    performed_by?: string;
  }): Promise<void> {
    await runAsync(
      `INSERT INTO audit_log (action, entity_type, entity_id, worker_id, 
        old_value, new_value, reason, performed_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.action,
        data.entity_type,
        data.entity_id || null,
        data.worker_id || null,
        data.old_value || null,
        data.new_value || null,
        data.reason || null,
        data.performed_by || 'owner',
      ]
    );
  },

  // Get all audit logs with filters
  async getAll(filters?: {
    action?: AuditAction;
    entity_type?: string;
    worker_id?: number;
    date_from?: string;
    date_to?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<AuditLog[]> {
    let sql = 'SELECT * FROM audit_log WHERE 1=1';
    const params: any[] = [];

    if (filters?.action) {
      sql += ' AND action = ?';
      params.push(filters.action);
    }

    if (filters?.entity_type) {
      sql += ' AND entity_type = ?';
      params.push(filters.entity_type);
    }

    if (filters?.worker_id) {
      sql += ' AND worker_id = ?';
      params.push(filters.worker_id);
    }

    if (filters?.date_from) {
      sql += ' AND created_at >= ?';
      params.push(filters.date_from);
    }

    if (filters?.date_to) {
      sql += ' AND created_at <= ?';
      params.push(filters.date_to + ' 23:59:59');
    }

    if (filters?.search) {
      sql +=
        ' AND (old_value LIKE ? OR new_value LIKE ? OR reason LIKE ? OR action LIKE ?)';
      const search = `%${filters.search}%`;
      params.push(search, search, search, search);
    }

    sql += ' ORDER BY created_at DESC';

    if (filters?.limit) {
      sql += ' LIMIT ?';
      params.push(filters.limit);
    }

    if (filters?.offset) {
      sql += ' OFFSET ?';
      params.push(filters.offset);
    }

    return getAllAsync<AuditLog>(sql, params);
  },

  // Get audit logs for a specific entity
  async getForEntity(
    entityType: string,
    entityId: number
  ): Promise<AuditLog[]> {
    return getAllAsync<AuditLog>(
      'SELECT * FROM audit_log WHERE entity_type = ? AND entity_id = ? ORDER BY created_at DESC',
      [entityType, entityId]
    );
  },

  // Get audit logs for a specific worker
  async getForWorker(workerId: number): Promise<AuditLog[]> {
    return getAllAsync<AuditLog>(
      'SELECT * FROM audit_log WHERE worker_id = ? ORDER BY created_at DESC',
      [workerId]
    );
  },

  // Get recent activity (for dashboard)
  async getRecent(limit: number = 10): Promise<AuditLog[]> {
    return getAllAsync<AuditLog>(
      'SELECT * FROM audit_log ORDER BY created_at DESC LIMIT ?',
      [limit]
    );
  },

  // Get count
  async getCount(filters?: {
    action?: AuditAction;
    worker_id?: number;
  }): Promise<number> {
    let sql = 'SELECT COUNT(*) as count FROM audit_log WHERE 1=1';
    const params: any[] = [];

    if (filters?.action) {
      sql += ' AND action = ?';
      params.push(filters.action);
    }

    if (filters?.worker_id) {
      sql += ' AND worker_id = ?';
      params.push(filters.worker_id);
    }

    const result = await getFirstAsync<{ count: number }>(sql, params);
    return result?.count ?? 0;
  },
};
