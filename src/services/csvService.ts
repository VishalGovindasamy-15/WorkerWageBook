// Worker WageBook - CSV Export/Import Service

import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { format, parseISO } from 'date-fns';
import { Worker, Attendance, Advance, SalarySettlement } from '../types';
import { workerService } from './workerService';
import { attendanceService } from './attendanceService';
import { advanceService } from './advanceService';

export const csvService = {
  // Export workers to CSV
  async exportWorkers(): Promise<void> {
    const workers = await workerService.getAll({});
    
    const headers = ['Employee ID', 'Name', 'Phone', 'Category', 'Daily Wage', 'Overtime Rate', 'Overtime Type', 'Status', 'Joining Date', 'Notes'];
    const rows = workers.map(w => [
      w.employee_id,
      w.name,
      w.phone || '',
      w.category_id || '',
      w.daily_wage,
      w.overtime_rate,
      w.overtime_type,
      w.is_active ? 'Active' : 'Inactive',
      w.joining_date || '',
      (w.notes || '').replace(/"/g, '""'),
    ]);

    const csv = this.arrayToCSV([headers, ...rows]);
    await this.shareCSV(csv, `Workers_Export_${format(new Date(), 'yyyy-MM-dd')}.csv`);
  },

  // Import workers from CSV
  async importWorkers(): Promise<{ success: number; failed: number; errors: string[] }> {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'text/csv',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return { success: 0, failed: 0, errors: ['No file selected'] };
      }

      const fileUri = result.assets[0].uri;
      const content = await FileSystem.readAsStringAsync(fileUri);
      const rows = this.parseCSV(content);

      if (rows.length < 2) {
        return { success: 0, failed: 0, errors: ['CSV file is empty or has no data rows'] };
      }

      const headers = rows[0].map(h => h.toLowerCase().trim());
      const nameIndex = headers.indexOf('name');
      
      if (nameIndex === -1) {
        return { success: 0, failed: 0, errors: ['CSV must have a "Name" column'] };
      }

      let success = 0;
      let failed = 0;
      const errors: string[] = [];

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.length === 0 || (row.length === 1 && row[0] === '')) continue;

        try {
          const name = row[nameIndex];
          if (!name || name.trim() === '') {
            errors.push(`Row ${i + 1}: Name is required`);
            failed++;
            continue;
          }

          const phoneIndex = headers.indexOf('phone');
          const wageIndex = headers.indexOf('daily wage');
          const otRateIndex = headers.indexOf('overtime rate');

          await workerService.create({
            name: name.trim(),
            phone: phoneIndex !== -1 && row[phoneIndex] ? row[phoneIndex].trim() : undefined,
            daily_wage: wageIndex !== -1 && row[wageIndex] ? parseFloat(row[wageIndex]) || 0 : 0,
            overtime_rate: otRateIndex !== -1 && row[otRateIndex] ? parseFloat(row[otRateIndex]) || 0 : 0,
          });

          success++;
        } catch (error: any) {
          errors.push(`Row ${i + 1}: ${error.message}`);
          failed++;
        }
      }

      return { success, failed, errors };
    } catch (error: any) {
      return { success: 0, failed: 0, errors: [error.message] };
    }
  },

  // Export attendance to CSV
  async exportAttendance(weekStart: string, weekEnd: string): Promise<void> {
    const workers = await workerService.getAll({ is_active: 1 });
    const allAttendance: Attendance[] = [];

    for (const worker of workers) {
      const attendance = await attendanceService.getForWorkerInRange(
        worker.id,
        weekStart,
        weekEnd
      );
      allAttendance.push(...attendance);
    }

    const headers = ['Date', 'Employee ID', 'Worker Name', 'Status', 'Leave Type', 'Overtime Hours', 'Overtime Amount', 'Notes'];
    const rows = allAttendance.map(a => {
      const worker = workers.find(w => w.id === a.worker_id);
      return [
        a.work_date,
        worker?.employee_id || '',
        worker?.name || '',
        a.status,
        a.leave_type || '',
        a.overtime_hours,
        a.overtime_amount,
        (a.notes || '').replace(/"/g, '""'),
      ];
    });

    const csv = this.arrayToCSV([headers, ...rows]);
    await this.shareCSV(csv, `Attendance_${weekStart}_to_${weekEnd}.csv`);
  },

  // Export advances to CSV
  async exportAdvances(weekStart: string, weekEnd: string): Promise<void> {
    const advances = await advanceService.getAll({
      date_from: weekStart,
      date_to: weekEnd,
    });

    const workers = await workerService.getAll({});
    const headers = ['Date', 'Employee ID', 'Worker Name', 'Amount', 'Payment Method', 'Reason', 'Status'];
    const rows = advances.map(a => {
      const worker = workers.find(w => w.id === a.worker_id);
      return [
        a.advance_date,
        worker?.employee_id || '',
        worker?.name || '',
        a.amount,
        a.payment_method,
        (a.reason || '').replace(/"/g, '""'),
        a.is_reversed ? 'Reversed' : 'Active',
      ];
    });

    const csv = this.arrayToCSV([headers, ...rows]);
    await this.shareCSV(csv, `Advances_${weekStart}_to_${weekEnd}.csv`);
  },

  // Export salary settlements to CSV
  async exportSettlements(weekStart: string, weekEnd: string): Promise<void> {
    const settlements = await workerService.getAll({ is_active: 1 }).then(async workers => {
      const all: SalarySettlement[] = [];
      for (const worker of workers) {
        const workerSettlements = await (await import('./salaryService')).salaryService.getForWorker(worker.id);
        const weekSettlements = workerSettlements.filter(s => 
          s.week_start === weekStart && s.week_end === weekEnd
        );
        all.push(...weekSettlements);
      }
      return all;
    });

    const workers = await workerService.getAll({});
    const headers = ['Week Start', 'Week End', 'Employee ID', 'Worker Name', 'Gross Earnings', 'Advances Recovered', 'Net Pay', 'Status'];
    const rows = settlements.map(s => {
      const worker = workers.find(w => w.id === s.worker_id);
      return [
        s.week_start,
        s.week_end,
        worker?.employee_id || '',
        worker?.name || '',
        s.gross_earnings,
        s.total_advances_recovered,
        s.net_pay,
        s.status,
      ];
    });

    const csv = this.arrayToCSV([headers, ...rows]);
    await this.shareCSV(csv, `Settlements_${weekStart}_to_${weekEnd}.csv`);
  },

  // Helper: Convert array to CSV string
  arrayToCSV(data: any[][]): string {
    return data
      .map(row => 
        row
          .map(cell => {
            const str = String(cell);
            // If cell contains comma, newline, or quote, wrap in quotes
            if (str.includes(',') || str.includes('\n') || str.includes('"')) {
              return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
          })
          .join(',')
      )
      .join('\n');
  },

  // Helper: Parse CSV string to array
  parseCSV(content: string): string[][] {
    const rows: string[][] = [];
    const lines = content.split('\n');
    
    for (const line of lines) {
      if (line.trim() === '') continue;
      
      const row: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          row.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      
      row.push(current.trim());
      rows.push(row);
    }
    
    return rows;
  },

  // Helper: Share CSV file
  async shareCSV(csv: string, filename: string): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        return;
      } catch (err) {
        console.error('Web CSV download failed:', err);
      }
    }

    const fileUri = (FileSystem.cacheDirectory || FileSystem.documentDirectory || '') + filename;
    
    await FileSystem.writeAsStringAsync(fileUri, csv, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle: 'Export Data',
      });
    } else {
      alert('Sharing is not available on this device');
    }
  },
};
