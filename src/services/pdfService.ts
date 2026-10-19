// Worker WageBook - PDF Export Service (Formal Business-Grade Reports)

import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { format, parseISO, eachDayOfInterval } from 'date-fns';
import { SalarySettlement, SettlementItem, Worker, Attendance, AuditLog } from '../types';
import { SalaryCalculation } from './salaryService';
import { attendanceService } from './attendanceService';
import { formatCurrency } from '../utils/helpers';

export const pdfService = {
  // 1. Generate and share Weekly Salary Statement PDF (Formal Wage Sheet)
  async generateWeeklySalaryReport(
    settlements: SalarySettlement[],
    lineItems: Record<number, SettlementItem[]>,
    workers: Record<number, Worker>,
    weekStart: string,
    weekEnd: string,
    businessName: string
  ): Promise<void> {
    const totalGross = settlements.reduce((sum, s) => sum + s.gross_earnings, 0);
    const totalAdvances = settlements.reduce((sum, s) => sum + s.total_advances_recovered, 0);
    const totalNet = settlements.reduce((sum, s) => sum + s.net_pay, 0);

    const formattedStart = format(parseISO(weekStart), 'dd MMM yyyy');
    const formattedEnd = format(parseISO(weekEnd), 'dd MMM yyyy');
    const printTime = format(new Date(), 'dd MMM yyyy, h:mm a');

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Weekly Wage Sheet - ${businessName}</title>
          <style>
            @page {
              size: landscape;
              margin: 10mm;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
              color: #0f172a;
              margin: 0;
              padding: 16px;
              font-size: 11px;
            }
            .header-table {
              width: 100%;
              border-bottom: 2px solid #2563eb;
              padding-bottom: 8px;
              margin-bottom: 12px;
            }
            .biz-title {
              font-size: 22px;
              font-weight: 800;
              color: #1e3a8a;
              letter-spacing: 0.5px;
            }
            .report-title {
              font-size: 14px;
              font-weight: 700;
              color: #334155;
              text-transform: uppercase;
              margin-top: 4px;
            }
            .meta-text {
              font-size: 11px;
              color: #64748b;
              text-align: right;
            }
            .summary-cards {
              display: flex;
              gap: 12px;
              margin-bottom: 14px;
            }
            .summary-card {
              flex: 1;
              background: #f8fafc;
              border: 1px solid #cbd5e1;
              border-radius: 6px;
              padding: 8px 12px;
            }
            .summary-card.accent {
              background: #eff6ff;
              border-color: #93c5fd;
            }
            .summary-label {
              font-size: 10px;
              text-transform: uppercase;
              color: #64748b;
              font-weight: 600;
            }
            .summary-value {
              font-size: 16px;
              font-weight: 800;
              color: #0f172a;
              margin-top: 2px;
            }
            .table {
              width: 100%;
              border-collapse: collapse;
              font-size: 11px;
            }
            .table th {
              background: #f1f5f9;
              color: #334155;
              font-weight: 700;
              text-align: left;
              padding: 7px 6px;
              border: 1px solid #cbd5e1;
              font-size: 10px;
              text-transform: uppercase;
            }
            .table td {
              padding: 6px 6px;
              border: 1px solid #e2e8f0;
              color: #1e293b;
            }
            .table tr:nth-child(even) {
              background: #fbfcfd;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-bold { font-weight: 700; }
            .badge {
              display: inline-block;
              padding: 2px 6px;
              border-radius: 4px;
              font-size: 9px;
              font-weight: 700;
            }
            .badge-success { background: #dcfce7; color: #166534; }
            .badge-pending { background: #fef3c7; color: #92400e; }
            .sign-cell {
              height: 32px;
              min-width: 90px;
            }
            .footer-signatures {
              margin-top: 28px;
              display: flex;
              justify-content: space-between;
              padding: 0 20px;
              page-break-inside: avoid;
            }
            .sign-line {
              width: 180px;
              border-top: 1px dashed #64748b;
              text-align: center;
              padding-top: 5px;
              font-size: 11px;
              color: #475569;
              font-weight: 600;
            }
            .audit-watermark {
              margin-top: 16px;
              text-align: center;
              font-size: 9px;
              color: #94a3b8;
            }
          </style>
        </head>
        <body>
          <table class="header-table">
            <tr>
              <td>
                <div class="biz-title">${businessName}</div>
                <div class="report-title">Weekly Wage Sheet & Salary Register</div>
              </td>
              <td class="meta-text">
                <div><strong>Wage Period:</strong> ${formattedStart} – ${formattedEnd}</div>
                <div><strong>Generated:</strong> ${printTime}</div>
                <div><strong>Workers:</strong> ${settlements.length} Settled</div>
              </td>
            </tr>
          </table>

          <div class="summary-cards">
            <div class="summary-card">
              <div class="summary-label">Total Gross Earnings</div>
              <div class="summary-value">${formatCurrency(totalGross)}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">Advances Deducted</div>
              <div class="summary-value" style="color: #dc2626;">-${formatCurrency(totalAdvances)}</div>
            </div>
            <div class="summary-card accent">
              <div class="summary-label">Net Salary Disbursed</div>
              <div class="summary-value" style="color: #16a34a;">${formatCurrency(totalNet)}</div>
            </div>
          </div>

          <table class="table">
            <thead>
              <tr>
                <th class="text-center" style="width: 25px;">#</th>
                <th style="width: 60px;">Emp ID</th>
                <th>Worker Name</th>
                <th class="text-right" style="width: 65px;">Daily Wage</th>
                <th class="text-right" style="width: 75px;">Days Worked</th>
                <th class="text-right" style="width: 80px;">Gross Earnings</th>
                <th class="text-right" style="width: 75px;">Advance Ded.</th>
                <th class="text-right" style="width: 85px;">Net Payable</th>
                <th class="text-center" style="width: 60px;">Mode</th>
                <th class="text-center" style="width: 60px;">Status</th>
                <th class="text-center" style="width: 100px;">Signature / Thumb</th>
              </tr>
            </thead>
            <tbody>
              ${settlements.map((s, idx) => {
                const w = workers[s.worker_id];
                return `
                  <tr>
                    <td class="text-center">${idx + 1}</td>
                    <td class="font-bold">${w?.employee_id || '-'}</td>
                    <td><strong>${w?.name || 'Worker #' + s.worker_id}</strong></td>
                    <td class="text-right">${formatCurrency(w?.daily_wage || 0)}</td>
                    <td class="text-right">${s.days_worked}d ${s.half_days_worked > 0 ? `+ ${s.half_days_worked}h` : ''}</td>
                    <td class="text-right font-bold">${formatCurrency(s.gross_earnings)}</td>
                    <td class="text-right" style="color: #dc2626;">-${formatCurrency(s.total_advances_recovered)}</td>
                    <td class="text-right font-bold" style="color: #15803d; font-size: 12px;">${formatCurrency(s.net_pay)}</td>
                    <td class="text-center uppercase" style="font-size: 9px; font-weight: 600;">${s.payment_method || 'CASH'}</td>
                    <td class="text-center"><span class="badge badge-success">PAID</span></td>
                    <td class="sign-cell"></td>
                  </tr>
                `;
              }).join('')}
              <tr style="background: #f1f5f9; font-weight: bold; border-top: 2px solid #94a3b8;">
                <td colspan="5" class="text-right font-bold">TOTALS (${settlements.length} Workers):</td>
                <td class="text-right font-bold">${formatCurrency(totalGross)}</td>
                <td class="text-right font-bold" style="color: #dc2626;">-${formatCurrency(totalAdvances)}</td>
                <td class="text-right font-bold" style="color: #15803d; font-size: 12px;">${formatCurrency(totalNet)}</td>
                <td colspan="3"></td>
              </tr>
            </tbody>
          </table>

          <div class="footer-signatures">
            <div class="sign-line">Prepared By (Timekeeper)</div>
            <div class="sign-line">Accountant / Cashier</div>
            <div class="sign-line">Authorized Signatory / Proprietor</div>
          </div>

          <div class="audit-watermark">
            Worker WageBook Payroll System · Official Wage Register · Printed on ${printTime}
          </div>
        </body>
      </html>
    `;

    await this.generateAndSharePDF(html, `Wage_Sheet_${weekStart}_to_${weekEnd}.pdf`);
  },

  // 2. Generate and share Attendance Register PDF (Authentic Muster Roll Table)
  async generateAttendanceReport(
    workers: Worker[],
    attendance: Record<number, Attendance[]>,
    weekStart: string,
    weekEnd: string,
    businessName: string
  ): Promise<void> {
    const startDate = parseISO(weekStart);
    const endDate = parseISO(weekEnd);
    const daysInterval = eachDayOfInterval({ start: startDate, end: endDate });

    const formattedStart = format(startDate, 'dd MMM yyyy');
    const formattedEnd = format(endDate, 'dd MMM yyyy');
    const printTime = format(new Date(), 'dd MMM yyyy, h:mm a');

    // Totals across all workers
    let totalPresentDays = 0;
    let totalHalfDays = 0;
    let totalAbsentDays = 0;
    let totalOvertimeHours = 0;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Attendance Register - ${businessName}</title>
          <style>
            @page {
              size: landscape;
              margin: 10mm;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
              color: #0f172a;
              margin: 0;
              padding: 16px;
              font-size: 11px;
            }
            .header-table {
              width: 100%;
              border-bottom: 2px solid #059669;
              padding-bottom: 8px;
              margin-bottom: 12px;
            }
            .biz-title {
              font-size: 22px;
              font-weight: 800;
              color: #065f46;
              letter-spacing: 0.5px;
            }
            .report-title {
              font-size: 14px;
              font-weight: 700;
              color: #334155;
              text-transform: uppercase;
              margin-top: 4px;
            }
            .meta-text {
              font-size: 11px;
              color: #64748b;
              text-align: right;
            }
            .table {
              width: 100%;
              border-collapse: collapse;
              font-size: 10px;
            }
            .table th {
              background: #f0fdf4;
              color: #065f46;
              font-weight: 700;
              text-align: center;
              padding: 6px 4px;
              border: 1px solid #cbd5e1;
              text-transform: uppercase;
            }
            .table td {
              padding: 6px 4px;
              border: 1px solid #e2e8f0;
              color: #1e293b;
            }
            .table tr:nth-child(even) {
              background: #f8fafc;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-bold { font-weight: 700; }
            .day-th {
              min-width: 44px;
            }
            .day-sub {
              font-size: 9px;
              color: #64748b;
              font-weight: normal;
            }
            .badge-status {
              display: inline-block;
              width: 20px;
              height: 20px;
              line-height: 20px;
              text-align: center;
              border-radius: 4px;
              font-weight: 800;
              font-size: 10px;
            }
            .badge-p { background: #dcfce7; color: #15803d; }
            .badge-h { background: #fef3c7; color: #b45309; }
            .badge-a { background: #fee2e2; color: #b91c1c; }
            .badge-l { background: #f1f5f9; color: #475569; }
            .badge-hol { background: #e0f2fe; color: #0369a1; font-size: 8px; width: auto; padding: 0 4px; }
            .badge-none { color: #cbd5e1; }
            .ot-tag {
              display: block;
              font-size: 8px;
              font-weight: 700;
              color: #2563eb;
              margin-top: 1px;
            }
            .sign-cell {
              min-width: 80px;
            }
            .legend-bar {
              display: flex;
              gap: 16px;
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 6px;
              padding: 6px 12px;
              margin-bottom: 12px;
              font-size: 10px;
              align-items: center;
            }
            .legend-item {
              display: flex;
              align-items: center;
              gap: 6px;
            }
            .footer-signatures {
              margin-top: 24px;
              display: flex;
              justify-content: space-between;
              padding: 0 20px;
              page-break-inside: avoid;
            }
            .sign-line {
              width: 180px;
              border-top: 1px dashed #64748b;
              text-align: center;
              padding-top: 5px;
              font-size: 11px;
              color: #475569;
              font-weight: 600;
            }
            .audit-watermark {
              margin-top: 16px;
              text-align: center;
              font-size: 9px;
              color: #94a3b8;
            }
          </style>
        </head>
        <body>
          <table class="header-table">
            <tr>
              <td>
                <div class="biz-title">${businessName}</div>
                <div class="report-title">Muster Roll & Attendance Register</div>
              </td>
              <td class="meta-text">
                <div><strong>Period:</strong> ${formattedStart} – ${formattedEnd}</div>
                <div><strong>Generated:</strong> ${printTime}</div>
                <div><strong>Total Workers:</strong> ${workers.length}</div>
              </td>
            </tr>
          </table>

          <div class="legend-bar">
            <strong>Key:</strong>
            <div class="legend-item"><span class="badge-status badge-p">P</span> Present</div>
            <div class="legend-item"><span class="badge-status badge-h">½</span> Half-Day</div>
            <div class="legend-item"><span class="badge-status badge-a">A</span> Absent</div>
            <div class="legend-item"><span class="badge-status badge-l">L</span> Leave</div>
            <div class="legend-item"><span class="badge-status badge-hol">HOL</span> Holiday</div>
            <div class="legend-item"><span style="color:#2563eb; font-weight: bold;">+2h</span> Overtime Hours</div>
          </div>

          <table class="table">
            <thead>
              <tr>
                <th style="width: 25px;">#</th>
                <th style="width: 55px; text-align: left;">Emp ID</th>
                <th style="text-align: left; min-width: 110px;">Worker Name</th>
                ${daysInterval.map(d => `
                  <th class="day-th">
                    ${format(d, 'EEE')}<br/>
                    <span class="day-sub">${format(d, 'dd MMM')}</span>
                  </th>
                `).join('')}
                <th style="width: 30px;">P</th>
                <th style="width: 30px;">½</th>
                <th style="width: 30px;">A</th>
                <th style="width: 38px;">OT</th>
                <th class="sign-cell">Signature / Thumb</th>
              </tr>
            </thead>
            <tbody>
              ${workers.map((w, idx) => {
                const list = attendance[w.id] || [];
                const attMap: Record<string, Attendance> = {};
                list.forEach(a => {
                  attMap[a.work_date] = a;
                });

                let pCount = 0;
                let hCount = 0;
                let aCount = 0;
                let otTotal = 0;

                const dayCells = daysInterval.map(d => {
                  const dateStr = format(d, 'yyyy-MM-dd');
                  const rec = attMap[dateStr];
                  if (!rec) return '<td class="text-center"><span class="badge-status badge-none">-</span></td>';

                  if (rec.status === 'present') pCount++;
                  else if (rec.status === 'half_day') hCount++;
                  else if (rec.status === 'absent') aCount++;

                  if (rec.overtime_hours > 0) otTotal += rec.overtime_hours;

                  let badge = '<span class="badge-status badge-none">-</span>';
                  if (rec.status === 'present') badge = '<span class="badge-status badge-p">P</span>';
                  else if (rec.status === 'half_day') badge = '<span class="badge-status badge-h">½</span>';
                  else if (rec.status === 'absent') badge = '<span class="badge-status badge-a">A</span>';
                  else if (rec.status === 'leave') badge = '<span class="badge-status badge-l">L</span>';
                  else if (rec.status === 'holiday') badge = '<span class="badge-status badge-hol">HOL</span>';

                  const ot = rec.overtime_hours > 0 ? `<span class="ot-tag">+${rec.overtime_hours}h</span>` : '';
                  return `<td class="text-center">${badge}${ot}</td>`;
                }).join('');

                totalPresentDays += pCount;
                totalHalfDays += hCount;
                totalAbsentDays += aCount;
                totalOvertimeHours += otTotal;

                return `
                  <tr>
                    <td class="text-center">${idx + 1}</td>
                    <td class="font-bold">${w.employee_id || '-'}</td>
                    <td><strong>${w.name}</strong></td>
                    ${dayCells}
                    <td class="text-center font-bold" style="color: #15803d;">${pCount}</td>
                    <td class="text-center font-bold" style="color: #b45309;">${hCount}</td>
                    <td class="text-center font-bold" style="color: #b91c1c;">${aCount}</td>
                    <td class="text-center font-bold" style="color: #2563eb;">${otTotal > 0 ? `${otTotal}h` : '-'}</td>
                    <td class="sign-cell"></td>
                  </tr>
                `;
              }).join('')}
              <tr style="background: #f0fdf4; font-weight: bold; border-top: 2px solid #86efac;">
                <td colspan="3" class="text-right font-bold">TOTALS:</td>
                ${daysInterval.map(() => '<td class="text-center"></td>').join('')}
                <td class="text-center font-bold" style="color: #15803d;">${totalPresentDays}</td>
                <td class="text-center font-bold" style="color: #b45309;">${totalHalfDays}</td>
                <td class="text-center font-bold" style="color: #b91c1c;">${totalAbsentDays}</td>
                <td class="text-center font-bold" style="color: #2563eb;">${totalOvertimeHours}h</td>
                <td></td>
              </tr>
            </tbody>
          </table>

          <div class="footer-signatures">
            <div class="sign-line">Timekeeper / Site Supervisor</div>
            <div class="sign-line">Project Manager</div>
            <div class="sign-line">Proprietor / Authorized Officer</div>
          </div>

          <div class="audit-watermark">
            Worker WageBook Attendance System · Official Muster Roll · Printed on ${printTime}
          </div>
        </body>
      </html>
    `;

    await this.generateAndSharePDF(html, `Attendance_Muster_Roll_${weekStart}_to_${weekEnd}.pdf`);
  },

  // 3. Generate and share Outstanding Advances Report PDF
  async generateAdvancesReport(
    workers: (Worker & { outstanding: number })[],
    businessName: string
  ): Promise<void> {
    const totalOutstanding = workers.reduce((sum, w) => sum + w.outstanding, 0);
    const printTime = format(new Date(), 'dd MMM yyyy, h:mm a');

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Outstanding Advances - ${businessName}</title>
          <style>
            @page { size: portrait; margin: 12mm; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
              color: #0f172a;
              margin: 0;
              padding: 16px;
              font-size: 11px;
            }
            .header-table {
              width: 100%;
              border-bottom: 2px solid #d97706;
              padding-bottom: 8px;
              margin-bottom: 14px;
            }
            .biz-title {
              font-size: 22px;
              font-weight: 800;
              color: #92400e;
            }
            .report-title {
              font-size: 14px;
              font-weight: 700;
              color: #334155;
              text-transform: uppercase;
              margin-top: 4px;
            }
            .summary-box {
              background: #fffbeb;
              border: 1px solid #fde68a;
              border-radius: 8px;
              padding: 12px 16px;
              margin-bottom: 16px;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .summary-item { text-align: left; }
            .summary-label { font-size: 10px; color: #92400e; text-transform: uppercase; font-weight: 700; }
            .summary-value { font-size: 20px; font-weight: 800; color: #b45309; }
            .table {
              width: 100%;
              border-collapse: collapse;
              font-size: 11px;
            }
            .table th {
              background: #fef3c7;
              color: #92400e;
              font-weight: 700;
              padding: 8px 8px;
              border: 1px solid #fde68a;
              text-align: left;
              text-transform: uppercase;
              font-size: 10px;
            }
            .table td {
              padding: 8px 8px;
              border: 1px solid #e2e8f0;
            }
            .table tr:nth-child(even) { background: #fffdf5; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-bold { font-weight: 700; }
            .sign-line {
              width: 200px;
              border-top: 1px dashed #64748b;
              text-align: center;
              padding-top: 5px;
              font-size: 11px;
              margin-top: 40px;
              margin-left: auto;
            }
          </style>
        </head>
        <body>
          <table class="header-table">
            <tr>
              <td>
                <div class="biz-title">${businessName}</div>
                <div class="report-title">Outstanding Advances Ledger</div>
              </td>
              <td style="text-align: right; color: #64748b;">
                <div><strong>As of:</strong> ${format(new Date(), 'dd MMM yyyy')}</div>
                <div><strong>Printed:</strong> ${printTime}</div>
              </td>
            </tr>
          </table>

          <div class="summary-box">
            <div class="summary-item">
              <div class="summary-label">Total Outstanding Advances</div>
              <div class="summary-value">${formatCurrency(totalOutstanding)}</div>
            </div>
            <div class="summary-item" style="text-align: right;">
              <div class="summary-label">Active Workers with Advance</div>
              <div class="summary-value" style="font-size: 18px; color: #334155;">${workers.length} Workers</div>
            </div>
          </div>

          <table class="table">
            <thead>
              <tr>
                <th class="text-center" style="width: 30px;">#</th>
                <th style="width: 70px;">Emp ID</th>
                <th>Worker Name</th>
                <th style="width: 90px;">Contact</th>
                <th class="text-right" style="width: 90px;">Daily Wage</th>
                <th class="text-right" style="width: 110px;">Outstanding Balance</th>
                <th class="text-center" style="width: 90px;">Worker Sign</th>
              </tr>
            </thead>
            <tbody>
              ${workers.map((w, idx) => `
                <tr>
                  <td class="text-center">${idx + 1}</td>
                  <td class="font-bold">${w.employee_id || '-'}</td>
                  <td><strong>${w.name}</strong></td>
                  <td>${w.phone || '-'}</td>
                  <td class="text-right">${formatCurrency(w.daily_wage || 0)}</td>
                  <td class="text-right font-bold" style="color: #b45309; font-size: 12px;">${formatCurrency(w.outstanding)}</td>
                  <td style="height: 28px;"></td>
                </tr>
              `).join('')}
              <tr style="background: #fef3c7; font-weight: bold; border-top: 2px solid #f59e0b;">
                <td colspan="5" class="text-right font-bold">TOTAL OUTSTANDING:</td>
                <td class="text-right font-bold" style="color: #b45309; font-size: 13px;">${formatCurrency(totalOutstanding)}</td>
                <td></td>
              </tr>
            </tbody>
          </table>

          <div class="sign-line">Authorized Signatory / Cashier</div>
        </body>
      </html>
    `;

    await this.generateAndSharePDF(html, `Outstanding_Advances_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  },

  // 4. Generate and share Complete Individual Worker Payslip / Wage Bill PDF
  async generateWorkerPayslipPDF(
    calc: SalaryCalculation,
    settlement?: SalarySettlement,
    worker?: Worker,
    weekStart?: string,
    weekEnd?: string,
    businessName: string = 'Worker WageBook'
  ): Promise<void> {
    const startStr = weekStart || calc.week_start;
    const endStr = weekEnd || calc.week_end;
    const formattedStart = format(parseISO(startStr), 'dd MMM yyyy');
    const formattedEnd = format(parseISO(endStr), 'dd MMM yyyy');
    const printTime = format(new Date(), 'dd MMM yyyy, h:mm a');

    // Fetch daily attendance breakdown for this worker in this week
    let dailyRecords: Attendance[] = [];
    try {
      dailyRecords = await attendanceService.getForWorkerInRange(calc.worker_id, startStr, endStr);
    } catch (e) {
      console.warn('Could not load worker daily attendance for payslip:', e);
    }

    const earningsItems = calc.line_items.filter(item => item.amount > 0);
    const deductionItems = calc.line_items.filter(item => item.amount < 0);

    const isPaid = !!settlement;
    const paidMethod = (settlement?.payment_method || 'CASH').toUpperCase();
    const paidDate = settlement?.confirmed_at ? format(parseISO(settlement.confirmed_at), 'dd MMM yyyy') : 'Pending';

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Payslip - ${calc.worker_name}</title>
          <style>
            @page { size: portrait; margin: 12mm; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
              color: #0f172a;
              margin: 0;
              padding: 16px;
              font-size: 11px;
            }
            .bill-box {
              border: 2px solid #1e293b;
              border-radius: 8px;
              padding: 16px;
            }
            .bill-header {
              text-align: center;
              border-bottom: 2px solid #e2e8f0;
              padding-bottom: 12px;
              margin-bottom: 14px;
            }
            .biz-title {
              font-size: 22px;
              font-weight: 800;
              color: #1e3a8a;
              letter-spacing: 0.5px;
            }
            .slip-title {
              font-size: 14px;
              font-weight: 700;
              color: #475569;
              text-transform: uppercase;
              margin-top: 4px;
            }
            .period-badge {
              display: inline-block;
              background: #eff6ff;
              color: #1d4ed8;
              font-weight: 700;
              padding: 4px 12px;
              border-radius: 20px;
              margin-top: 6px;
              font-size: 11px;
            }
            .worker-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 8px 16px;
              background: #f8fafc;
              border: 1px solid #cbd5e1;
              border-radius: 6px;
              padding: 10px 14px;
              margin-bottom: 14px;
            }
            .w-item { font-size: 11px; }
            .w-label { color: #64748b; font-weight: 600; text-transform: uppercase; font-size: 9px; }
            .w-val { color: #0f172a; font-weight: 700; font-size: 12px; margin-top: 1px; }
            .section-title {
              font-size: 11px;
              font-weight: 800;
              text-transform: uppercase;
              color: #334155;
              margin-bottom: 6px;
              margin-top: 12px;
            }
            .table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 12px;
            }
            .table th {
              background: #f1f5f9;
              border: 1px solid #cbd5e1;
              padding: 6px 8px;
              font-size: 10px;
              text-align: left;
              text-transform: uppercase;
            }
            .table td {
              border: 1px solid #e2e8f0;
              padding: 6px 8px;
              font-size: 11px;
            }
            .table tr:nth-child(even) { background: #fafafa; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .font-bold { font-weight: 700; }
            .split-container {
              display: flex;
              gap: 12px;
              margin-bottom: 12px;
            }
            .split-col {
              flex: 1;
            }
            .net-banner {
              background: #ecfdf5;
              border: 2px solid #059669;
              border-radius: 8px;
              padding: 12px 16px;
              margin-top: 8px;
              margin-bottom: 14px;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .net-label {
              font-size: 12px;
              font-weight: 800;
              color: #065f46;
              text-transform: uppercase;
            }
            .net-amount {
              font-size: 24px;
              font-weight: 900;
              color: #047857;
            }
            .status-pill {
              display: inline-block;
              padding: 3px 8px;
              border-radius: 4px;
              font-size: 10px;
              font-weight: 800;
            }
            .status-paid { background: #dcfce7; color: #166534; }
            .status-unpaid { background: #fef3c7; color: #92400e; }
            .cf-note {
              background: #fffbeb;
              border: 1px solid #fde68a;
              border-radius: 6px;
              padding: 6px 10px;
              font-size: 11px;
              color: #92400e;
              margin-bottom: 14px;
            }
            .signatures {
              margin-top: 36px;
              display: flex;
              justify-content: space-between;
              padding: 0 20px;
            }
            .sig-line {
              width: 170px;
              border-top: 1px dashed #64748b;
              text-align: center;
              padding-top: 5px;
              font-size: 10px;
              font-weight: 700;
              color: #475569;
            }
          </style>
        </head>
        <body>
          <div class="bill-box">
            <div class="bill-header">
              <div class="biz-title">${businessName}</div>
              <div class="slip-title">Official Worker Payslip & Wage Receipt</div>
              <div class="period-badge">Wage Period: ${formattedStart} – ${formattedEnd}</div>
            </div>

            <div class="worker-grid">
              <div class="w-item">
                <div class="w-label">Worker Name</div>
                <div class="w-val">${calc.worker_name}</div>
              </div>
              <div class="w-item">
                <div class="w-label">Employee ID</div>
                <div class="w-val">${worker?.employee_id || '-'}</div>
              </div>
              <div class="w-item">
                <div class="w-label">Daily Wage Rate</div>
                <div class="w-val">${formatCurrency(worker?.daily_wage || 0)} / day</div>
              </div>
              <div class="w-item">
                <div class="w-label">Overtime Rate</div>
                <div class="w-val">${worker?.overtime_rate ? formatCurrency(worker.overtime_rate) + ' / hr' : 'Standard'}</div>
              </div>
            </div>

            <!-- Attendance Days Summary -->
            ${dailyRecords.length > 0 ? `
              <div class="section-title">Weekly Attendance Breakdown</div>
              <table class="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Day</th>
                    <th class="text-center">Status</th>
                    <th class="text-center">Overtime</th>
                    <th class="text-right">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  ${dailyRecords.map(r => `
                    <tr>
                      <td>${format(parseISO(r.work_date), 'dd MMM yyyy')}</td>
                      <td>${format(parseISO(r.work_date), 'EEEE')}</td>
                      <td class="text-center font-bold" style="text-transform: capitalize;">${r.status.replace('_', ' ')}</td>
                      <td class="text-center">${r.overtime_hours > 0 ? `+${r.overtime_hours} hrs` : '-'}</td>
                      <td class="text-right" style="color: #64748b;">${r.notes || '-'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : ''}

            <!-- Earnings and Deductions split -->
            <div class="split-container">
              <div class="split-col">
                <div class="section-title">Earnings Breakdown</div>
                <table class="table">
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th class="text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${earningsItems.map(item => `
                      <tr>
                        <td>${item.description}</td>
                        <td class="text-right font-bold" style="color: #166534;">+${formatCurrency(item.amount)}</td>
                      </tr>
                    `).join('')}
                    <tr style="background: #f1f5f9; font-weight: bold;">
                      <td>Total Gross Earnings</td>
                      <td class="text-right">${formatCurrency(calc.gross_earnings)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div class="split-col">
                <div class="section-title">Deductions (Advances)</div>
                <table class="table">
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th class="text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${deductionItems.length > 0 ? deductionItems.map(item => `
                      <tr>
                        <td>${item.description}</td>
                        <td class="text-right font-bold" style="color: #dc2626;">${formatCurrency(item.amount)}</td>
                      </tr>
                    `).join('') : `
                      <tr>
                        <td colspan="2" style="color: #94a3b8; text-align: center;">No deductions this week</td>
                      </tr>
                    `}
                    <tr style="background: #f1f5f9; font-weight: bold;">
                      <td>Total Advances Recovered</td>
                      <td class="text-right" style="color: #dc2626;">-${formatCurrency(calc.total_advances_recovered)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Net Payable Banner -->
            <div class="net-banner">
              <div>
                <div class="net-label">Net Take-Home Salary</div>
                <div style="font-size: 11px; color: #475569; margin-top: 3px;">
                  Payment Mode: <strong>${paidMethod}</strong> · Status: 
                  <span class="status-pill ${isPaid ? 'status-paid' : 'status-unpaid'}">
                    ${isPaid ? 'PAID ON ' + paidDate : 'PENDING APPROVAL'}
                  </span>
                </div>
              </div>
              <div class="net-amount">${formatCurrency(calc.net_pay)}</div>
            </div>

            ${calc.carry_forward_advance > 0 ? `
              <div class="cf-note">
                <strong>Notice:</strong> An advance balance of <strong>${formatCurrency(calc.carry_forward_advance)}</strong> remains unrecovered and has been carried forward to next week.
              </div>
            ` : ''}

            <div class="signatures">
              <div class="sig-line">Worker Signature / Thumb</div>
              <div class="sig-line">Employer / Authorized Stamp</div>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.generateAndSharePDF(html, `Payslip_${calc.worker_name.replace(/\s+/g, '_')}_${startStr}.pdf`);
  },

  // 5. Generate and share Whole-Week Audit Log Report PDF
  async generateWeeklyAuditReportPDF(
    logs: AuditLog[],
    weekStart: string,
    weekEnd: string,
    businessName: string
  ): Promise<void> {
    const formattedStart = format(parseISO(weekStart), 'dd MMM yyyy');
    const formattedEnd = format(parseISO(weekEnd), 'dd MMM yyyy');
    const printTime = format(new Date(), 'dd MMM yyyy, h:mm a');

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Weekly Audit Trail - ${businessName}</title>
          <style>
            @page { size: landscape; margin: 10mm; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
              color: #0f172a;
              margin: 0;
              padding: 16px;
              font-size: 10px;
            }
            .header-table {
              width: 100%;
              border-bottom: 2px solid #475569;
              padding-bottom: 8px;
              margin-bottom: 12px;
            }
            .biz-title {
              font-size: 20px;
              font-weight: 800;
              color: #1e293b;
            }
            .report-title {
              font-size: 13px;
              font-weight: 700;
              color: #475569;
              text-transform: uppercase;
              margin-top: 3px;
            }
            .table {
              width: 100%;
              border-collapse: collapse;
              font-size: 10px;
            }
            .table th {
              background: #f1f5f9;
              color: #1e293b;
              font-weight: 700;
              text-align: left;
              padding: 6px 8px;
              border: 1px solid #cbd5e1;
              text-transform: uppercase;
              font-size: 9px;
            }
            .table td {
              padding: 6px 8px;
              border: 1px solid #e2e8f0;
            }
            .table tr:nth-child(even) { background: #f8fafc; }
            .font-bold { font-weight: 700; }
            .badge-action {
              display: inline-block;
              padding: 2px 5px;
              border-radius: 3px;
              font-size: 9px;
              font-weight: 700;
              background: #e2e8f0;
              color: #334155;
            }
          </style>
        </head>
        <body>
          <table class="header-table">
            <tr>
              <td>
                <div class="biz-title">${businessName}</div>
                <div class="report-title">Weekly System Audit & Compliance Ledger</div>
              </td>
              <td style="text-align: right; color: #64748b;">
                <div><strong>Period:</strong> ${formattedStart} – ${formattedEnd}</div>
                <div><strong>Printed:</strong> ${printTime}</div>
                <div><strong>Total Events:</strong> ${logs.length} Actions Logged</div>
              </td>
            </tr>
          </table>

          <table class="table">
            <thead>
              <tr>
                <th style="width: 25px;">#</th>
                <th style="width: 110px;">Timestamp</th>
                <th style="width: 90px;">Action</th>
                <th style="width: 70px;">Entity</th>
                <th style="width: 65px;">Worker ID</th>
                <th>Details / Previous vs New State</th>
                <th style="width: 90px;">Performed By</th>
              </tr>
            </thead>
            <tbody>
              ${logs.map((log, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td>${log.created_at ? format(parseISO(log.created_at), 'dd MMM yyyy, HH:mm') : '-'}</td>
                  <td><span class="badge-action">${log.action.replace(/_/g, ' ')}</span></td>
                  <td>${log.entity_type}</td>
                  <td>${log.worker_id ? 'Worker #' + log.worker_id : '-'}</td>
                  <td>
                    ${log.old_value ? `<strong>Old:</strong> ${log.old_value} ` : ''}
                    ${log.new_value ? `<strong>New:</strong> ${log.new_value} ` : ''}
                    ${log.reason ? `<br/><em>Reason:</em> ${log.reason}` : ''}
                  </td>
                  <td>${log.performed_by || 'Owner'}</td>
                </tr>
              `).join('')}
              ${logs.length === 0 ? '<tr><td colspan="7" style="text-align: center; padding: 20px; color: #94a3b8;">No audit logs recorded for this period.</td></tr>' : ''}
            </tbody>
          </table>
        </body>
      </html>
    `;

    await this.generateAndSharePDF(html, `Audit_Trail_${weekStart}_to_${weekEnd}.pdf`);
  },

  // 6. Generate and share Worker Master Roster PDF
  async generateWorkerRosterPDF(
    workers: Worker[],
    categories: Record<number, string>,
    businessName: string
  ): Promise<void> {
    const printTime = format(new Date(), 'dd MMM yyyy, h:mm a');
    const activeCount = workers.filter(w => w.is_active).length;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Worker Master Roster - ${businessName}</title>
          <style>
            @page { size: landscape; margin: 10mm; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
              color: #0f172a;
              margin: 0;
              padding: 16px;
              font-size: 11px;
            }
            .header-table {
              width: 100%;
              border-bottom: 2px solid #2563eb;
              padding-bottom: 8px;
              margin-bottom: 12px;
            }
            .biz-title {
              font-size: 22px;
              font-weight: 800;
              color: #1e3a8a;
            }
            .report-title {
              font-size: 14px;
              font-weight: 700;
              color: #334155;
              text-transform: uppercase;
              margin-top: 4px;
            }
            .table {
              width: 100%;
              border-collapse: collapse;
              font-size: 11px;
            }
            .table th {
              background: #f1f5f9;
              color: #334155;
              font-weight: 700;
              text-align: left;
              padding: 7px 8px;
              border: 1px solid #cbd5e1;
              text-transform: uppercase;
              font-size: 10px;
            }
            .table td {
              padding: 7px 8px;
              border: 1px solid #e2e8f0;
            }
            .table tr:nth-child(even) { background: #fbfcfd; }
            .badge-active { background: #dcfce7; color: #166534; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 9px; }
            .badge-inactive { background: #f1f5f9; color: #64748b; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 9px; }
          </style>
        </head>
        <body>
          <table class="header-table">
            <tr>
              <td>
                <div class="biz-title">${businessName}</div>
                <div class="report-title">Worker Master Directory & Summary</div>
              </td>
              <td style="text-align: right; color: #64748b;">
                <div><strong>Total Workers:</strong> ${workers.length} (${activeCount} Active)</div>
                <div><strong>Printed:</strong> ${printTime}</div>
              </td>
            </tr>
          </table>

          <table class="table">
            <thead>
              <tr>
                <th style="width: 30px;">#</th>
                <th style="width: 70px;">Emp ID</th>
                <th>Worker Name</th>
                <th>Role / Category</th>
                <th>Phone Number</th>
                <th style="text-align: right;">Daily Wage</th>
                <th style="text-align: right;">Overtime Rate</th>
                <th style="text-align: center;">Status</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              ${workers.map((w, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td><strong>${w.employee_id || '-'}</strong></td>
                  <td><strong>${w.name}</strong></td>
                  <td>${(w.category_id && categories[w.category_id]) || 'General'}</td>
                  <td>${w.phone || '-'}</td>
                  <td style="text-align: right; font-weight: 700;">${formatCurrency(w.daily_wage || 0)}</td>
                  <td style="text-align: right;">${w.overtime_rate > 0 ? formatCurrency(w.overtime_rate) + '/hr' : 'Standard'}</td>
                  <td style="text-align: center;">
                    <span class="${w.is_active ? 'badge-active' : 'badge-inactive'}">
                      ${w.is_active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </td>
                  <td>${w.joining_date ? format(parseISO(w.joining_date), 'dd MMM yyyy') : '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;

    await this.generateAndSharePDF(html, `Worker_Roster_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  },

  // 7. Helper function to generate PDF and share / print
  async generateAndSharePDF(html: string, filename: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(html);
          printWindow.document.close();
          printWindow.focus();
          setTimeout(() => {
            printWindow.print();
          }, 300);
          return;
        }
      }

      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Share Report',
          UTI: 'com.adobe.pdf',
        });
      } else {
        alert('Sharing is not available on this device');
      }
    } catch (error) {
      console.error('PDF generation failed:', error);
      throw error;
    }
  },
};
