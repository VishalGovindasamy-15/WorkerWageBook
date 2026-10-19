// Worker WageBook - Demo Seed Service
// Automatically populates realistic demo data for testing and demonstration

import { workerService } from './workerService';
import { attendanceService } from './attendanceService';
import { advanceService } from './advanceService';
import { auditService } from './auditService';
import { format, subDays } from 'date-fns';
import { getFirstAsync, runAsync } from '../database/database';

export const seedService = {
  async hasWorkers(): Promise<boolean> {
    try {
      const res = await getFirstAsync<{ count: number }>('SELECT count(*) as count FROM workers');
      return (res?.count ?? 0) > 0;
    } catch {
      return false;
    }
  },

  async seedDemoData(force = false): Promise<{ workersCount: number; attendanceCount: number }> {
    const hasData = await this.hasWorkers();
    if (!force && hasData) {
      return { workersCount: 3, attendanceCount: 0 };
    }

    if (force) {
      try {
        await runAsync('DELETE FROM attendance');
        await runAsync('DELETE FROM advances');
        await runAsync('DELETE FROM salary_settlements');
        await runAsync('DELETE FROM settlement_line_items');
        await runAsync('DELETE FROM workers');
        await runAsync('UPDATE id_sequence SET next_val = 1 WHERE entity = ?', ['worker']);
      } catch (e) {
        console.warn('[Seed] Clear tables error:', e);
      }
    }

    console.log('[Seed] Seeding sample demo data...');

    // 1. Create Workers
    const w1 = await workerService.create({
      name: 'Ramesh Kumar',
      phone: '9876543210',
      category_id: 1, // Mason
      daily_wage: 850,
      overtime_rate: 120,
      notes: 'Master mason, leading site masonry works',
    });

    const w2 = await workerService.create({
      name: 'Suresh Patel',
      phone: '9876543211',
      category_id: 2, // Sithal
      daily_wage: 550,
      overtime_rate: 80,
      notes: 'Skilled assistant, material coordination',
    });

    const w3 = await workerService.create({
      name: 'Priya Sharma',
      phone: '9876543212',
      category_id: 3, // Painter
      daily_wage: 750,
      overtime_rate: 100,
      notes: 'Finishing and interior specialist',
    });

    // 2. Add Attendance for the past 14 days up to today
    const today = new Date();
    let attCount = 0;

    for (let i = 13; i >= 0; i--) {
      const d = subDays(today, i);
      const dateStr = format(d, 'yyyy-MM-dd');
      const dayOfWeek = d.getDay(); // 0 is Sunday, 6 is Saturday

      // Ramesh: Present most days, Sunday Holiday, Sat halfday
      if (dayOfWeek === 0) {
        await attendanceService.mark({
          worker_id: w1.id,
          work_date: dateStr,
          status: 'holiday',
          notes: 'Sunday weekly off',
        });
      } else if (dayOfWeek === 6) {
        await attendanceService.mark({
          worker_id: w1.id,
          work_date: dateStr,
          status: 'half_day',
          overtime_hours: 0,
          notes: 'Saturday half shift',
        });
      } else {
        const ot = (dayOfWeek === 2 || dayOfWeek === 4) ? 2 : 0;
        await attendanceService.mark({
          worker_id: w1.id,
          work_date: dateStr,
          status: 'present',
          overtime_hours: ot,
          notes: ot > 0 ? 'Overtime on concrete casting' : undefined,
        });
      }
      attCount++;

      // Suresh: Present all weekdays, Sunday Holiday
      if (dayOfWeek === 0) {
        await attendanceService.mark({
          worker_id: w2.id,
          work_date: dateStr,
          status: 'holiday',
        });
      } else {
        const ot = dayOfWeek === 3 ? 3 : 0;
        await attendanceService.mark({
          worker_id: w2.id,
          work_date: dateStr,
          status: 'present',
          overtime_hours: ot,
        });
      }
      attCount++;

      // Priya: Present 4 days, Absent or Leave on some
      if (dayOfWeek === 0) {
        await attendanceService.mark({
          worker_id: w3.id,
          work_date: dateStr,
          status: 'holiday',
        });
      } else if (dayOfWeek === 5) {
        await attendanceService.mark({
          worker_id: w3.id,
          work_date: dateStr,
          status: 'absent',
          notes: 'Personal work',
        });
      } else if (dayOfWeek === 1 && i > 6) {
        await attendanceService.mark({
          worker_id: w3.id,
          work_date: dateStr,
          status: 'leave',
          leave_type: 'paid',
          notes: 'Approved sick leave',
        });
      } else {
        await attendanceService.mark({
          worker_id: w3.id,
          work_date: dateStr,
          status: 'present',
          overtime_hours: 0,
        });
      }
      attCount++;
    }

    // 3. Add Advances
    await advanceService.create({
      worker_id: w1.id,
      amount: 1500,
      payment_method: 'cash',
      advance_date: format(subDays(today, 5), 'yyyy-MM-dd'),
      reason: 'Medical emergency advance',
    });

    await advanceService.create({
      worker_id: w2.id,
      amount: 500,
      payment_method: 'upi',
      advance_date: format(subDays(today, 3), 'yyyy-MM-dd'),
      reason: 'Festival grocery advance',
    });

    // 4. Audit Log
    await auditService.log({
      action: 'worker_created',
      entity_type: 'worker',
      entity_id: w1.id,
      worker_id: w1.id,
      new_value: JSON.stringify(w1),
      reason: 'Demo seed data created',
    });

    console.log('[Seed] Demo data seeding completed successfully!');
    return { workersCount: 3, attendanceCount: attCount };
  },
};
