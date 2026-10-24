// Worker WageBook - Backup and Restore Service

import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { format } from 'date-fns';
import { getAllAsync, getFirstAsync, withTransaction } from '../database/database';
import { settingsService } from './settingsService';
import { workerService } from './workerService';

export interface BackupData {
  metadata: {
    app: string;
    version: number;
    exported_at: string;
    business_name: string;
    total_workers: number;
  };
  categories: any[];
  workers: any[];
  attendance: any[];
  advances: any[];
  salary_settlements: any[];
  settlement_items: any[];
  audit_log: any[];
  settings: any[];
}

export const backupService = {
  // Export all database tables into a JSON backup
  async exportBackup(): Promise<string> {
    const [
      categories,
      workers,
      attendance,
      advances,
      salary_settlements,
      settlement_items,
      audit_log,
      settings,
      businessName,
    ] = await Promise.all([
      getAllAsync('SELECT * FROM categories'),
      getAllAsync('SELECT * FROM workers'),
      getAllAsync('SELECT * FROM attendance'),
      getAllAsync('SELECT * FROM advances'),
      getAllAsync('SELECT * FROM salary_settlements'),
      getAllAsync('SELECT * FROM settlement_items'),
      getAllAsync('SELECT * FROM audit_log'),
      getAllAsync('SELECT * FROM settings'),
      settingsService.getBusinessName(),
    ]);

    const backupData: BackupData = {
      metadata: {
        app: 'Worker WageBook',
        version: 1,
        exported_at: new Date().toISOString(),
        business_name: businessName,
        total_workers: workers.length,
      },
      categories,
      workers,
      attendance,
      advances,
      salary_settlements,
      settlement_items,
      audit_log,
      settings,
    };

    const json = JSON.stringify(backupData, null, 2);
    const filename = `WorkerWageBook_Backup_${format(new Date(), 'yyyy-MM-dd_HHmm')}.json`;

    // Web download
    if (Platform.OS === 'web') {
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      await settingsService.setLastBackupAt(new Date().toISOString());
      return filename;
    }

    // Native file save and share
    const fileUri = (FileSystem.cacheDirectory || FileSystem.documentDirectory || '') + filename;
    await FileSystem.writeAsStringAsync(fileUri, json, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: 'Save Backup File (e.g. to Google Drive / Files)',
      });
    }

    await settingsService.setLastBackupAt(new Date().toISOString());
    return filename;
  },

  // Restore database tables from a JSON backup string
  async restoreBackupFromJson(jsonString: string): Promise<{ success: boolean; message: string }> {
    try {
      const data: BackupData = JSON.parse(jsonString);

      if (!data.metadata || data.metadata.app !== 'Worker WageBook') {
        throw new Error('Invalid backup file: Unrecognized format or missing metadata.');
      }

      await withTransaction(async (db) => {
        // Clear existing tables in safe order
        await db.execAsync('DELETE FROM settlement_items;');
        await db.execAsync('DELETE FROM salary_settlements;');
        await db.execAsync('DELETE FROM advances;');
        await db.execAsync('DELETE FROM attendance;');
        await db.execAsync('DELETE FROM audit_log;');
        await db.execAsync('DELETE FROM workers;');
        await db.execAsync('DELETE FROM categories;');

        // Restore Categories
        if (data.categories?.length) {
          for (const c of data.categories) {
            await db.runAsync(
              'INSERT INTO categories (id, name, default_wage, default_overtime_rate, color, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
              [c.id, c.name, c.default_wage, c.default_overtime_rate, c.color, c.is_active, c.created_at, c.updated_at]
            );
          }
        }

        // Restore Workers
        if (data.workers?.length) {
          for (const w of data.workers) {
            await db.runAsync(
              'INSERT INTO workers (id, name, employee_id, phone, category_id, daily_wage, overtime_rate, overtime_type, is_active, joining_date, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
              [w.id, w.name, w.employee_id, w.phone, w.category_id, w.daily_wage, w.overtime_rate, w.overtime_type, w.is_active, w.joining_date, w.notes, w.created_at, w.updated_at]
            );
          }
        }

        // Restore Attendance
        if (data.attendance?.length) {
          for (const a of data.attendance) {
            await db.runAsync(
              'INSERT INTO attendance (id, worker_id, work_date, status, leave_type, daily_wage_snapshot, overtime_hours, overtime_amount, overtime_amount_type, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
              [a.id, a.worker_id, a.work_date, a.status, a.leave_type, a.daily_wage_snapshot, a.overtime_hours, a.overtime_amount, a.overtime_amount_type, a.notes, a.created_at, a.updated_at]
            );
          }
        }

        // Restore Advances
        if (data.advances?.length) {
          for (const adv of data.advances) {
            await db.runAsync(
              'INSERT INTO advances (id, worker_id, amount, advance_date, reason, recovered_amount, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
              [adv.id, adv.worker_id, adv.amount, adv.advance_date, adv.reason, adv.recovered_amount, adv.status, adv.created_at, adv.updated_at]
            );
          }
        }

        // Restore Salary Settlements
        if (data.salary_settlements?.length) {
          for (const s of data.salary_settlements) {
            await db.runAsync(
              'INSERT INTO salary_settlements (id, worker_id, week_start, week_end, days_worked, half_days_worked, overtime_hours, gross_earnings, total_advances_recovered, net_pay, carry_forward_advance, payment_method, confirmed_by, confirmed_at, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
              [s.id, s.worker_id, s.week_start, s.week_end, s.days_worked, s.half_days_worked, s.overtime_hours, s.gross_earnings, s.total_advances_recovered, s.net_pay, s.carry_forward_advance, s.payment_method, s.confirmed_by, s.confirmed_at, s.notes, s.created_at]
            );
          }
        }

        // Restore Settlement Items
        if (data.settlement_items?.length) {
          for (const item of data.settlement_items) {
            await db.runAsync(
              'INSERT INTO settlement_items (id, settlement_id, item_type, description, amount, reference_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
              [item.id, item.settlement_id, item.item_type, item.description, item.amount, item.reference_id, item.created_at]
            );
          }
        }

        // Restore Audit Log
        if (data.audit_log?.length) {
          for (const log of data.audit_log) {
            await db.runAsync(
              'INSERT INTO audit_log (id, action, entity_type, entity_id, worker_id, old_value, new_value, reason, performed_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
              [log.id, log.action, log.entity_type, log.entity_id, log.worker_id, log.old_value, log.new_value, log.reason, log.performed_by, log.created_at]
            );
          }
        }

        // Restore Settings
        if (data.settings?.length) {
          for (const st of data.settings) {
            await db.runAsync(
              'INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = ?',
              [st.key, st.value, st.updated_at, st.value, st.updated_at]
            );
          }
        }
      });

      return {
        success: true,
        message: `Restored ${data.workers?.length || 0} workers, ${data.attendance?.length || 0} attendance records, and ${data.salary_settlements?.length || 0} settlements successfully.`,
      };
    } catch (err: any) {
      console.error('Restore failed:', err);
      return {
        success: false,
        message: err.message || 'Failed to restore database.',
      };
    }
  },

  // Open file picker to restore on Native or Web
  async pickAndRestoreFile(): Promise<{ success: boolean; message: string }> {
    if (Platform.OS === 'web') {
      return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,application/json';
        input.onchange = async (e: any) => {
          const file = e.target.files?.[0];
          if (!file) {
            resolve({ success: false, message: 'No file selected' });
            return;
          }
          const reader = new FileReader();
          reader.onload = async (evt) => {
            const content = evt.target?.result as string;
            if (!content) {
              resolve({ success: false, message: 'File is empty' });
              return;
            }
            const res = await backupService.restoreBackupFromJson(content);
            resolve(res);
          };
          reader.onerror = () => {
            resolve({ success: false, message: 'Failed to read backup file' });
          };
          reader.readAsText(file);
        };
        input.click();
      });
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return { success: false, message: 'Restore cancelled' };
      }

      const fileUri = result.assets[0].uri;
      const content = await FileSystem.readAsStringAsync(fileUri);
      return await this.restoreBackupFromJson(content);
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to pick file' };
    }
  },

  // Database stats overview
  async getDatabaseStats(): Promise<{
    workers: number;
    attendance: number;
    advances: number;
    settlements: number;
    auditLogs: number;
  }> {
    const [w, att, adv, s, a] = await Promise.all([
      getAllAsync<{ count: number }>('SELECT count(*) as count FROM workers'),
      getAllAsync<{ count: number }>('SELECT count(*) as count FROM attendance'),
      getAllAsync<{ count: number }>('SELECT count(*) as count FROM advances'),
      getAllAsync<{ count: number }>('SELECT count(*) as count FROM salary_settlements'),
      getAllAsync<{ count: number }>('SELECT count(*) as count FROM audit_log'),
    ]);

    return {
      workers: w[0]?.count || 0,
      attendance: att[0]?.count || 0,
      advances: adv[0]?.count || 0,
      settlements: s[0]?.count || 0,
      auditLogs: a[0]?.count || 0,
    };
  },

  // Export workers to JSON file
  async exportWorkersJson(): Promise<string> {
    const workers = await workerService.getAll({});
    const categories = await getAllAsync('SELECT * FROM categories');
    const exportData = {
      app: 'Worker WageBook',
      export_type: 'workers',
      version: 1,
      exported_at: new Date().toISOString(),
      categories,
      workers,
    };
    const json = JSON.stringify(exportData, null, 2);
    const filename = `WorkerWageBook_Workers_${format(new Date(), 'yyyy-MM-dd')}.json`;

    if (Platform.OS === 'web') {
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return filename;
    }

    const fileUri = (FileSystem.cacheDirectory || FileSystem.documentDirectory || '') + filename;
    await FileSystem.writeAsStringAsync(fileUri, json, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: 'Export Workers (JSON)',
      });
    }

    return filename;
  },

  // Import workers from JSON string
  async importWorkersFromJson(jsonString: string): Promise<{ success: number; failed: number; skipped: number; errors: string[] }> {
    try {
      const data = JSON.parse(jsonString);
      const workersList = Array.isArray(data) ? data : data.workers;

      if (!Array.isArray(workersList) || workersList.length === 0) {
        return { success: 0, failed: 0, skipped: 0, errors: ['JSON file contains no worker records'] };
      }

      let success = 0;
      let failed = 0;
      let skipped = 0;
      const errors: string[] = [];

      for (const w of workersList) {
        try {
          if (!w.name || typeof w.name !== 'string') {
            failed++;
            errors.push('Skipped worker with missing name');
            continue;
          }

          // Check if worker with employee_id already exists
          if (w.employee_id) {
            const existing = await getFirstAsync('SELECT id FROM workers WHERE employee_id = ?', [w.employee_id]);
            if (existing) {
              skipped++;
              continue;
            }
          }

          await workerService.create({
            name: w.name,
            employee_id: w.employee_id,
            phone: w.phone || undefined,
            category_id: w.category_id || undefined,
            daily_wage: typeof w.daily_wage === 'number' ? w.daily_wage : parseFloat(w.daily_wage) || 0,
            overtime_rate: typeof w.overtime_rate === 'number' ? w.overtime_rate : parseFloat(w.overtime_rate) || 0,
            overtime_type: w.overtime_type === 'multiplier' ? 'multiplier' : 'per_hour',
            joining_date: w.joining_date || undefined,
            notes: w.notes || undefined,
          });
          success++;
        } catch (err: any) {
          failed++;
          errors.push(`Failed to import ${w.name}: ${err.message}`);
        }
      }

      return { success, failed, skipped, errors };
    } catch (err: any) {
      return { success: 0, failed: 0, skipped: 0, errors: [err.message || 'Invalid JSON format'] };
    }
  },

  // Pick and import workers JSON file
  async pickAndImportWorkersJson(): Promise<{ success: number; failed: number; skipped: number; errors: string[] }> {
    if (Platform.OS === 'web') {
      return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,application/json';
        input.onchange = async (e: any) => {
          const file = e.target.files?.[0];
          if (!file) {
            resolve({ success: 0, failed: 0, skipped: 0, errors: ['No file selected'] });
            return;
          }
          const reader = new FileReader();
          reader.onload = async (evt) => {
            const content = evt.target?.result as string;
            if (!content) {
              resolve({ success: 0, failed: 0, skipped: 0, errors: ['File is empty'] });
              return;
            }
            const res = await backupService.importWorkersFromJson(content);
            resolve(res);
          };
          reader.onerror = () => {
            resolve({ success: 0, failed: 0, skipped: 0, errors: ['Failed to read JSON file'] });
          };
          reader.readAsText(file);
        };
        input.click();
      });
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return { success: 0, failed: 0, skipped: 0, errors: ['Import cancelled'] };
      }

      const fileUri = result.assets[0].uri;
      const content = await FileSystem.readAsStringAsync(fileUri);
      return await this.importWorkersFromJson(content);
    } catch (err: any) {
      return { success: 0, failed: 0, skipped: 0, errors: [err.message || 'Failed to pick file'] };
    }
  },
};
