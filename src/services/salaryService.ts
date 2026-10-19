// Worker WageBook - Salary Calculation Engine
// Implements all 6 financial fixes from the blueprint

import { SalarySettlement, SettlementItem, SalaryCalculationRules, Attendance, Advance } from '../types';
import { runAsync, getFirstAsync, getAllAsync, withTransaction } from '../database/database';
import { auditService } from './auditService';
import { attendanceService } from './attendanceService';
import { advanceService } from './advanceService';
import { workerService } from './workerService';

export interface SalaryCalculation {
  worker_id: number;
  worker_name: string;
  week_start: string;
  week_end: string;
  daily_wage_snapshot: number;
  line_items: SettlementItem[];
  base_wages: number;
  overtime_earnings: number;
  bonuses: number;
  gross_earnings: number;
  total_advances_recovered: number;
  other_deductions: number;
  net_pay: number;
  outstanding_advance_after: number;
  carry_forward_advance: number;
  days_worked: number;
  half_days_worked: number;
  overtime_hours: number;
}

export const salaryService = {
  // Get salary calculation rules
  async getRules(): Promise<SalaryCalculationRules> {
    const rules = await getFirstAsync<SalaryCalculationRules>(
      'SELECT * FROM salary_calculation_rules WHERE id = 1'
    );
    if (!rules) throw new Error('Salary calculation rules not found');
    return rules;
  },

  // Update salary calculation rules
  async updateRules(updates: Partial<SalaryCalculationRules>): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];

    const allowedFields = [
      'half_day_multiplier',
      'holiday_pay_multiplier',
      'weekly_off_day',
      'weekly_off_pay_multiplier',
      'paid_leave_allowed_per_month',
      'overtime_default_multiplier',
      'overtime_rounding',
      'advance_recovery_mode',
      'advance_recovery_max_percent',
      'carry_forward_unrecovered_advances',
      'monetary_rounding',
    ];

    for (const field of allowedFields) {
      if (field in updates) {
        fields.push(`${field} = ?`);
        values.push((updates as any)[field]);
      }
    }

    if (fields.length === 0) return;

    fields.push("updated_at = datetime('now')");
    values.push(1);

    await runAsync(
      `UPDATE salary_calculation_rules SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  },

  // Calculate salary for a single worker
  async calculateForWorker(
    workerId: number,
    weekStart: string,
    weekEnd: string
  ): Promise<SalaryCalculation> {
    const rules = await this.getRules();
    const worker = await workerService.getById(workerId);
    if (!worker) throw new Error('Worker not found');

    // Get attendance for the week
    const attendanceRecords = await attendanceService.getForWorkerInRange(
      workerId,
      weekStart,
      weekEnd
    );

    // Get outstanding advances
    const outstandingAdvance = await advanceService.getOutstandingBalance(workerId);

    // Get advances taken this week
    const weekAdvances = await advanceService.getForWeek(workerId, weekStart, weekEnd);

    const lineItems: SettlementItem[] = [];
    let baseWages = 0;
    let overtimeEarnings = 0;
    let daysWorked = 0;
    let halfDaysWorked = 0;
    let totalOvertimeHours = 0;

    // Step 1: Calculate base wages from attendance
    for (const att of attendanceRecords) {
      const dailyWage = att.daily_wage_snapshot || worker.daily_wage || 0;
      let dayEarnings = 0;

      switch (att.status) {
        case 'present':
          dayEarnings = dailyWage;
          daysWorked += 1;
          lineItems.push({
            id: 0,
            settlement_id: 0,
            item_type: 'earning',
            description: `Present - ${att.work_date}`,
            amount: dayEarnings,
            reference_id: att.id,
            reference_type: 'attendance',
          });
          break;

        case 'half_day':
          dayEarnings = dailyWage * rules.half_day_multiplier;
          halfDaysWorked += 1;
          lineItems.push({
            id: 0,
            settlement_id: 0,
            item_type: 'earning',
            description: `Half-day - ${att.work_date}`,
            amount: dayEarnings,
            reference_id: att.id,
            reference_type: 'attendance',
          });
          break;

        case 'holiday':
          dayEarnings = dailyWage * rules.holiday_pay_multiplier;
          if (dayEarnings > 0) {
            lineItems.push({
              id: 0,
              settlement_id: 0,
              item_type: 'earning',
              description: `Holiday - ${att.work_date}`,
              amount: dayEarnings,
              reference_id: att.id,
              reference_type: 'attendance',
            });
          }
          break;

        case 'leave':
          if (att.leave_type === 'paid') {
            dayEarnings = dailyWage;
            lineItems.push({
              id: 0,
              settlement_id: 0,
              item_type: 'earning',
              description: `Paid Leave - ${att.work_date}`,
              amount: dayEarnings,
              reference_id: att.id,
              reference_type: 'attendance',
            });
          }
          break;

        case 'absent':
          dayEarnings = 0;
          break;
      }

      baseWages += dayEarnings;

      // Step 2: Calculate overtime earnings (always additive)
      if (att.overtime_hours > 0) {
        let otEarnings = 0;

        if (att.overtime_amount_type === 'manual' && att.overtime_amount > 0) {
          otEarnings = att.overtime_amount;
        } else {
          // Calculate based on worker's overtime type
          if (worker.overtime_type === 'per_hour') {
            otEarnings = att.overtime_hours * (worker.overtime_rate || 0);
          } else {
            // Multiplier mode
            const hourlyWage = dailyWage / 8;
            otEarnings = att.overtime_hours * hourlyWage * rules.overtime_default_multiplier;
          }
        }

        // Apply rounding if configured
        if (rules.overtime_rounding === 'nearest_half') {
          otEarnings = Math.round(otEarnings * 2) / 2;
        } else if (rules.overtime_rounding === 'nearest_hour') {
          otEarnings = Math.round(otEarnings);
        }

        overtimeEarnings += otEarnings;
        totalOvertimeHours += att.overtime_hours;

        lineItems.push({
          id: 0,
          settlement_id: 0,
          item_type: 'earning',
          description: `Overtime - ${att.work_date} (${att.overtime_hours}h)`,
          amount: otEarnings,
          reference_id: att.id,
          reference_type: 'attendance',
        });
      }
    }

    // Step 3: Calculate gross earnings
    const grossEarnings = baseWages + overtimeEarnings;

    // Step 4: Calculate advance recovery
    let maxRecovery = grossEarnings;
    if (rules.advance_recovery_mode === 'partial') {
      maxRecovery = grossEarnings * (rules.advance_recovery_max_percent / 100);
    }

    const actualRecovery = Math.min(outstandingAdvance, maxRecovery);

    // Add advance recovery line items - properly distributed across advances
    let remainingRecovery = actualRecovery;
    for (const advance of weekAdvances) {
      if (remainingRecovery <= 0) break;
      
      // Get remaining balance for this specific advance
      const advanceBalance = await advanceService.getAdvanceBalance(advance.id);
      const recoveryFromThisAdvance = Math.min(advanceBalance, remainingRecovery);
      
      if (recoveryFromThisAdvance > 0) {
        lineItems.push({
          id: 0,
          settlement_id: 0,
          item_type: 'advance',
          description: `Advance Recovery - ${advance.advance_date} (ID: ${advance.id})`,
          amount: -recoveryFromThisAdvance,
          reference_id: advance.id,
          reference_type: 'advance',
        });
        remainingRecovery -= recoveryFromThisAdvance;
      }
    }

    // Step 5: Calculate net pay (never negative)
    let netPay = grossEarnings - actualRecovery;
    let finalRecovery = actualRecovery;

    if (netPay < 0) {
      finalRecovery = grossEarnings;
      netPay = 0;
    }

    // Step 6: Calculate remaining advance
    const outstandingAfter = outstandingAdvance - finalRecovery;
    const carryForward = rules.carry_forward_unrecovered_advances ? outstandingAfter : 0;

    // Apply monetary rounding to net pay
    let finalNetPay = netPay;
    if (rules.monetary_rounding === 'rupee') {
      finalNetPay = Math.round(netPay);
    } else {
      finalNetPay = Math.round(netPay * 100) / 100;
    }

    return {
      worker_id: workerId,
      worker_name: worker.name,
      week_start: weekStart,
      week_end: weekEnd,
      daily_wage_snapshot: worker.daily_wage || 0,
      line_items: lineItems,
      base_wages: baseWages,
      overtime_earnings: overtimeEarnings,
      bonuses: 0,
      gross_earnings: grossEarnings,
      total_advances_recovered: finalRecovery,
      other_deductions: 0,
      net_pay: finalNetPay,
      outstanding_advance_after: outstandingAfter,
      carry_forward_advance: carryForward,
      days_worked: daysWorked,
      half_days_worked: halfDaysWorked,
      overtime_hours: totalOvertimeHours,
    };
  },

  // Calculate salary for all active workers
  async calculateForAllWorkers(
    weekStart: string,
    weekEnd: string
  ): Promise<SalaryCalculation[]> {
    const workers = await workerService.getAll({ is_active: 1 });
    const calculations: SalaryCalculation[] = [];

    for (const worker of workers) {
      const calc = await this.calculateForWorker(worker.id, weekStart, weekEnd);
      calculations.push(calc);
    }

    return calculations;
  },

  // Settle salary for a single worker (with duplicate prevention and incremental settlement)
  async settle(
    calculation: SalaryCalculation,
    paymentMethod: string = 'cash'
  ): Promise<SalarySettlement> {
    return withTransaction(async (db) => {
      // Check for existing settlement (idempotency & incremental settlement)
      const existing = await db.getFirstAsync<SalarySettlement>(
        `SELECT * FROM salary_settlements 
         WHERE worker_id = ? AND week_start = ? AND week_end = ? AND is_locked = 1`,
        [calculation.worker_id, calculation.week_start, calculation.week_end]
      );

      if (existing) {
        // If calculation.net_pay hasn't increased, return existing settlement (idempotent)
        if (calculation.net_pay <= existing.net_pay) {
          return existing;
        }

        // New days or overtime were marked mid-week after the previous settlement!
        // Update the existing settlement with the new weekly total and lock new attendance
        const additionalPaid = calculation.net_pay - existing.net_pay;
        await db.runAsync(
          `UPDATE salary_settlements SET
            daily_wage_snapshot = ?, days_worked = ?, half_days_worked = ?,
            overtime_hours = ?, overtime_earnings = ?, gross_earnings = ?,
            total_advances_recovered = ?, outstanding_advance_after = ?,
            other_deductions = ?, bonuses = ?, net_pay = ?,
            carry_forward_advance = ?, payment_method = ?,
            confirmed_at = datetime('now'), updated_at = datetime('now')
           WHERE id = ?`,
          [
            calculation.daily_wage_snapshot,
            calculation.days_worked,
            calculation.half_days_worked,
            calculation.overtime_hours,
            calculation.overtime_earnings,
            calculation.gross_earnings,
            calculation.total_advances_recovered,
            calculation.outstanding_advance_after,
            calculation.other_deductions,
            calculation.bonuses,
            calculation.net_pay,
            calculation.carry_forward_advance,
            paymentMethod,
            existing.id,
          ]
        );

        // Delete old line items and insert updated ones
        await db.runAsync('DELETE FROM settlement_items WHERE settlement_id = ?', [existing.id]);
        for (const item of calculation.line_items) {
          await db.runAsync(
            `INSERT INTO settlement_items (settlement_id, item_type, description, amount, reference_id, reference_type)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              existing.id,
              item.item_type,
              item.description,
              item.amount,
              item.reference_id,
              item.reference_type,
            ]
          );
        }

        // Lock all attendance records for this week
        await db.runAsync(
          `UPDATE attendance SET is_locked = 1 
           WHERE worker_id = ? AND work_date BETWEEN ? AND ?`,
          [calculation.worker_id, calculation.week_start, calculation.week_end]
        );

        // Log the incremental settlement
        await auditService.log({
          action: 'salary_settled',
          entity_type: 'settlement',
          entity_id: existing.id,
          worker_id: calculation.worker_id,
          new_value: JSON.stringify({
            week: `${calculation.week_start} to ${calculation.week_end}`,
            additional_paid: additionalPaid,
            total_net_pay: calculation.net_pay,
            advances_recovered: calculation.total_advances_recovered,
          }),
        });

        const updated = await db.getFirstAsync<SalarySettlement>(
          'SELECT * FROM salary_settlements WHERE id = ?',
          [existing.id]
        );
        return updated!;
      }

      // Check for draft settlement and update it, or create new
      let draft = await db.getFirstAsync<SalarySettlement>(
        `SELECT * FROM salary_settlements 
         WHERE worker_id = ? AND week_start = ? AND week_end = ? AND is_locked = 0`,
        [calculation.worker_id, calculation.week_start, calculation.week_end]
      );

      let settlementId: number;

      if (draft) {
        // Update existing draft
        await db.runAsync(
          `UPDATE salary_settlements SET
            daily_wage_snapshot = ?, days_worked = ?, half_days_worked = ?,
            overtime_hours = ?, overtime_earnings = ?, gross_earnings = ?,
            total_advances_recovered = ?, outstanding_advance_after = ?,
            other_deductions = ?, bonuses = ?, net_pay = ?,
            carry_forward_advance = ?, payment_method = ?,
            status = 'confirmed', is_locked = 1,
            confirmed_at = datetime('now'), updated_at = datetime('now')
           WHERE id = ?`,
          [
            calculation.daily_wage_snapshot,
            calculation.days_worked,
            calculation.half_days_worked,
            calculation.overtime_hours,
            calculation.overtime_earnings,
            calculation.gross_earnings,
            calculation.total_advances_recovered,
            calculation.outstanding_advance_after,
            calculation.other_deductions,
            calculation.bonuses,
            calculation.net_pay,
            calculation.carry_forward_advance,
            paymentMethod,
            draft.id,
          ]
        );
        settlementId = draft.id;

        // Delete old line items
        await db.runAsync('DELETE FROM settlement_items WHERE settlement_id = ?', [settlementId]);
      } else {
        // Create new settlement
        const result = await db.runAsync(
          `INSERT INTO salary_settlements (
            worker_id, week_start, week_end, daily_wage_snapshot,
            status, days_worked, half_days_worked, overtime_hours,
            overtime_earnings, gross_earnings, total_advances_recovered,
            outstanding_advance_after, other_deductions, bonuses,
            net_pay, carry_forward_advance, payment_method,
            is_locked, confirmed_at
          ) VALUES (?, ?, ?, ?, 'confirmed', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'))`,
          [
            calculation.worker_id,
            calculation.week_start,
            calculation.week_end,
            calculation.daily_wage_snapshot,
            calculation.days_worked,
            calculation.half_days_worked,
            calculation.overtime_hours,
            calculation.overtime_earnings,
            calculation.gross_earnings,
            calculation.total_advances_recovered,
            calculation.outstanding_advance_after,
            calculation.other_deductions,
            calculation.bonuses,
            calculation.net_pay,
            calculation.carry_forward_advance,
            paymentMethod,
          ]
        );
        settlementId = result.lastInsertRowId;
      }

      // Insert line items
      for (const item of calculation.line_items) {
        await db.runAsync(
          `INSERT INTO settlement_items (settlement_id, item_type, description, amount, reference_id, reference_type)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            settlementId,
            item.item_type,
            item.description,
            item.amount,
            item.reference_id,
            item.reference_type,
          ]
        );
      }

      // Create advance recovery records for each advance deduction
      if (calculation.total_advances_recovered > 0) {
        const advanceItems = calculation.line_items.filter(
          item => item.item_type === 'advance' && item.amount < 0
        );
        
        for (const item of advanceItems) {
          if (item.reference_id === null) continue; // Skip if no reference
          
          await advanceService.createRecovery({
            advance_id: item.reference_id,
            settlement_id: settlementId,
            worker_id: calculation.worker_id,
            amount: Math.abs(item.amount),
            recovery_date: calculation.week_end,
          });
        }
      }

      // Lock attendance records for this week
      await db.runAsync(
        `UPDATE attendance SET is_locked = 1 
         WHERE worker_id = ? AND work_date BETWEEN ? AND ?`,
        [calculation.worker_id, calculation.week_start, calculation.week_end]
      );

      // Log the settlement
      await auditService.log({
        action: 'salary_settled',
        entity_type: 'settlement',
        entity_id: settlementId,
        worker_id: calculation.worker_id,
        new_value: JSON.stringify({
          week: `${calculation.week_start} to ${calculation.week_end}`,
          gross_earnings: calculation.gross_earnings,
          net_pay: calculation.net_pay,
          advances_recovered: calculation.total_advances_recovered,
        }),
      });

      const settlement = await db.getFirstAsync<SalarySettlement>(
        'SELECT * FROM salary_settlements WHERE id = ?',
        [settlementId]
      );

      return settlement!;
    });
  },

  // Bulk settle all workers
  async settleAll(
    calculations: SalaryCalculation[],
    paymentMethod: string = 'cash'
  ): Promise<SalarySettlement[]> {
    const settlements: SalarySettlement[] = [];
    for (const calc of calculations) {
      const settlement = await this.settle(calc, paymentMethod);
      settlements.push(settlement);
    }
    return settlements;
  },

  // Get settlement by ID
  async getById(id: number): Promise<SalarySettlement | null> {
    return getFirstAsync<SalarySettlement>(
      'SELECT * FROM salary_settlements WHERE id = ?',
      [id]
    );
  },

  // Get line items for a settlement
  async getLineItems(settlementId: number): Promise<SettlementItem[]> {
    return getAllAsync<SettlementItem>(
      'SELECT * FROM settlement_items WHERE settlement_id = ? ORDER BY id',
      [settlementId]
    );
  },

  // Get all settlements for a week
  async getForWeek(weekStart: string, weekEnd: string): Promise<SalarySettlement[]> {
    return getAllAsync<SalarySettlement>(
      `SELECT * FROM salary_settlements 
       WHERE week_start = ? AND week_end = ? AND is_locked = 1
       ORDER BY worker_id`,
      [weekStart, weekEnd]
    );
  },

  // Get settlements for a worker
  async getForWorker(workerId: number): Promise<SalarySettlement[]> {
    return getAllAsync<SalarySettlement>(
      `SELECT * FROM salary_settlements 
       WHERE worker_id = ? AND is_locked = 1
       ORDER BY week_start DESC`,
      [workerId]
    );
  },

  // Get total salary pending (unsettled + remaining balance for partially settled workers for current week)
  async getTotalPending(weekStart: string, weekEnd: string): Promise<number> {
    const [calculations, settlements] = await Promise.all([
      this.calculateForAllWorkers(weekStart, weekEnd),
      this.getForWeek(weekStart, weekEnd),
    ]);
    const settlementMap = new Map<number, number>();
    settlements.forEach((s) => settlementMap.set(s.worker_id, s.net_pay));

    return calculations.reduce((sum, calc) => {
      const alreadyPaid = settlementMap.get(calc.worker_id) || 0;
      return sum + Math.max(0, calc.net_pay - alreadyPaid);
    }, 0);
  },
};
