// Worker WageBook - Report Sub-Screens

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, Share, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { colors, spacing, typography, shadows, borderRadius } from '../../constants/theme';
import { Card, Button, Badge, Avatar } from '../../components/ui';
import { salaryService } from '../../services/salaryService';
import { attendanceService } from '../../services/attendanceService';
import { workerService } from '../../services/workerService';
import { advanceService } from '../../services/advanceService';
import { categoryService } from '../../services/categoryService';
import { auditService } from '../../services/auditService';
import { pdfService } from '../../services/pdfService';
import { settingsService } from '../../services/settingsService';
import { useAppStore } from '../../stores/appStore';
import { formatCurrency, getWeekLabel } from '../../utils/helpers';
import { SalarySettlement, SettlementItem, Attendance, Worker, Advance, Category, AuditLog } from '../../types';

// ============================================================
// WEEKLY SALARY REPORT
// ============================================================
export function WeeklyReportScreen({ navigation }: any) {
  const { currentWeekDate, currentWeek, weekStartsOn, goToPreviousWeek, goToNextWeek, isDark, themeColors } = useAppStore();
  const weekLabel = getWeekLabel(currentWeekDate, weekStartsOn);
  const [settlements, setSettlements] = useState<SalarySettlement[]>([]);
  const [lineItems, setLineItems] = useState<Record<number, SettlementItem[]>>({});
  const [workers, setWorkers] = useState<Record<number, Worker>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReport();
  }, [currentWeek]);

  const loadReport = async () => {
    setLoading(true);
    try {
      const settls = await salaryService.getForWeek(currentWeek.start, currentWeek.end);
      setSettlements(settls);

      // Load line items and workers for each settlement
      const items: Record<number, SettlementItem[]> = {};
      const workerMap: Record<number, Worker> = {};

      for (const settlement of settls) {
        items[settlement.id] = await salaryService.getLineItems(settlement.id);
        if (!workerMap[settlement.worker_id]) {
          const worker = await workerService.getById(settlement.worker_id);
          if (worker) workerMap[settlement.worker_id] = worker;
        }
      }

      setLineItems(items);
      setWorkers(workerMap);
    } catch (error) {
      console.error('Failed to load report:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      let reportText = `Weekly Salary Report\n`;
      reportText += `Period: ${currentWeek.label}\n\n`;

      for (const settlement of settlements) {
        const worker = workers[settlement.worker_id];
        reportText += `${worker?.name || 'Unknown'}\n`;
        reportText += `  Gross: ${formatCurrency(settlement.gross_earnings)}\n`;
        reportText += `  Advances: -${formatCurrency(settlement.total_advances_recovered)}\n`;
        reportText += `  Net Pay: ${formatCurrency(settlement.net_pay)}\n\n`;
      }

      const totalNet = settlements.reduce((sum, s) => sum + s.net_pay, 0);
      reportText += `Total Net Pay: ${formatCurrency(totalNet)}\n`;

      await Share.share({
        message: reportText,
        title: 'Weekly Salary Report',
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share report');
    }
  };

  const [exporting, setExporting] = useState(false);

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const businessName = await settingsService.getBusinessName();
      await pdfService.generateWeeklySalaryReport(
        settlements,
        lineItems,
        workers,
        currentWeek.start,
        currentWeek.end,
        businessName
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to export PDF');
    } finally {
      setExporting(false);
    }
  };

  const totalGross = settlements.reduce((sum, s) => sum + s.gross_earnings, 0);
  const totalAdvances = settlements.reduce((sum, s) => sum + s.total_advances_recovered, 0);
  const totalNet = settlements.reduce((sum, s) => sum + s.net_pay, 0);

  if (loading) {
    return (
      <View style={[styles.container, isDark && { backgroundColor: themeColors.background }]}>
        <Text style={[styles.loadingText, isDark && { color: themeColors.textMuted }]}>Loading report...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, isDark && { backgroundColor: themeColors.background }]}>
      <View style={styles.content}>
        {/* Week Selector Bar */}
        <Card style={[styles.weekCard, isDark && { backgroundColor: themeColors.card, borderColor: themeColors.cardBorder }]} padding={spacing[3]}>
          <TouchableOpacity
            onPress={goToPreviousWeek}
            style={styles.weekArrow}
            activeOpacity={0.7}
            accessibilityLabel="Previous week"
          >
            <Ionicons name="chevron-back" size={22} color={isDark ? '#60A5FA' : colors.primary[600]} />
          </TouchableOpacity>
          <View style={styles.weekCenter}>
            <Text style={[styles.weekLabel, isDark && { color: themeColors.text }]}>{weekLabel}</Text>
          </View>
          <TouchableOpacity
            onPress={goToNextWeek}
            style={styles.weekArrow}
            activeOpacity={0.7}
            accessibilityLabel="Next week"
          >
            <Ionicons name="chevron-forward" size={22} color={isDark ? '#60A5FA' : colors.primary[600]} />
          </TouchableOpacity>
        </Card>

        {/* Report Header */}
        <Card style={[styles.headerCard, isDark && { backgroundColor: 'rgba(59, 130, 246, 0.12)', borderColor: 'rgba(59, 130, 246, 0.25)' }]}>
          <Text style={[styles.reportTitle, isDark && { color: themeColors.text }]}>Weekly Salary Statement</Text>
          <Text style={[styles.reportPeriod, isDark && { color: '#60A5FA' }]}>{currentWeek.label}</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, isDark && { color: themeColors.textSecondary }]}>Gross</Text>
              <Text style={[styles.summaryValue, isDark && { color: themeColors.text }]}>{formatCurrency(totalGross)}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, isDark && { color: themeColors.textSecondary }]}>Advances</Text>
              <Text style={[styles.summaryValue, { color: isDark ? '#F87171' : colors.danger[600] }]}>
                -{formatCurrency(totalAdvances)}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, isDark && { color: themeColors.textSecondary }]}>Net Pay</Text>
              <Text style={[styles.summaryValue, { color: isDark ? '#4ADE80' : colors.success[600] }]}>
                {formatCurrency(totalNet)}
              </Text>
            </View>
          </View>
        </Card>

        {/* Worker Breakdowns */}
        {settlements.map((settlement) => {
          const worker = workers[settlement.worker_id];
          const items = lineItems[settlement.id] || [];

          return (
            <Card key={settlement.id} style={styles.workerCard}>
              <View style={styles.workerHeader}>
                <Avatar name={worker?.name || 'Unknown'} size="md" />
                <View style={styles.workerInfo}>
                  <Text style={[styles.workerName, isDark && { color: themeColors.text }]}>{worker?.name || 'Unknown'}</Text>
                  <Text style={[styles.workerId, isDark && { color: themeColors.textMuted }]}>{worker?.employee_id}</Text>
                </View>
                <Text style={[styles.netPay, isDark && { color: '#4ADE80' }]}>{formatCurrency(settlement.net_pay)}</Text>
              </View>

              <View style={[styles.breakdown, isDark && { borderTopColor: themeColors.border }]}>
                <Text style={[styles.breakdownTitle, isDark && { color: themeColors.textMuted }]}>Earnings</Text>
                {items
                  .filter((item) => item.amount > 0)
                  .map((item, idx) => (
                    <View key={idx} style={styles.breakdownRow}>
                      <Text style={[styles.breakdownDesc, isDark && { color: themeColors.textSecondary }]}>{item.description}</Text>
                      <Text style={[styles.breakdownAmount, { color: isDark ? '#4ADE80' : colors.success[600] }]}>
                        +{formatCurrency(item.amount)}
                      </Text>
                    </View>
                  ))}

                <View style={[styles.breakdownTotal, isDark && { borderTopColor: themeColors.border }]}>
                  <Text style={[styles.breakdownTotalLabel, isDark && { color: themeColors.text }]}>Gross</Text>
                  <Text style={[styles.breakdownTotalAmount, isDark && { color: themeColors.text }]}>
                    {formatCurrency(settlement.gross_earnings)}
                  </Text>
                </View>

                {settlement.total_advances_recovered > 0 && (
                  <>
                    <Text style={[styles.breakdownTitle, { marginTop: spacing[3] }, isDark && { color: themeColors.textMuted }]}>
                      Deductions
                    </Text>
                    {items
                      .filter((item) => item.amount < 0)
                      .map((item, idx) => (
                        <View key={idx} style={styles.breakdownRow}>
                          <Text style={[styles.breakdownDesc, isDark && { color: themeColors.textSecondary }]}>{item.description}</Text>
                          <Text style={[styles.breakdownAmount, { color: isDark ? '#F87171' : colors.danger[600] }]}>
                            {formatCurrency(item.amount)}
                          </Text>
                        </View>
                      ))}
                  </>
                )}
              </View>
            </Card>
          );
        })}

        {settlements.length === 0 && (
          <Card style={styles.emptyCard}>
            <Ionicons name="document-text-outline" size={48} color={isDark ? themeColors.textMuted : colors.neutral[300]} />
            <Text style={[styles.emptyText, isDark && { color: themeColors.textMuted }]}>No settlements for this week</Text>
          </Card>
        )}

        {/* Action Buttons */}
        {settlements.length > 0 && (
          <View style={{ flexDirection: 'row', gap: spacing[3], marginTop: spacing[4], marginBottom: spacing[8] }}>
            <Button
              title="Share"
              onPress={handleShare}
              icon="share-outline"
              variant="secondary"
              style={{ flex: 1 }}
            />
            <Button
              title={exporting ? "Exporting..." : "Export PDF"}
              onPress={handleExportPDF}
              icon={exporting ? undefined : "document-text-outline"}
              disabled={exporting}
              style={{ flex: 1 }}
            />
          </View>
        )}
      </View>
    </ScrollView>
  );
}

// ============================================================
// ATTENDANCE REPORT
// ============================================================
export function AttendanceReportScreen() {
  const { currentWeekDate, currentWeek, weekStartsOn, goToPreviousWeek, goToNextWeek, isDark, themeColors } = useAppStore();
  const weekLabel = getWeekLabel(currentWeekDate, weekStartsOn);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [attendance, setAttendance] = useState<Record<number, Attendance[]>>({});
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadReport();
  }, [currentWeek]);

  const loadReport = async () => {
    setLoading(true);
    try {
      const workerList = await workerService.getAll({ is_active: 1, sort_by: 'name' });
      setWorkers(workerList);

      const attendanceMap: Record<number, Attendance[]> = {};
      for (const worker of workerList) {
        attendanceMap[worker.id] = await attendanceService.getForWorkerInRange(
          worker.id,
          currentWeek.start,
          currentWeek.end
        );
      }
      setAttendance(attendanceMap);
    } catch (error) {
      console.error('Failed to load report:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present':
        return { name: 'checkmark-circle' as const, color: colors.success[500] };
      case 'half_day':
        return { name: 'remove-circle' as const, color: colors.warning[500] };
      case 'absent':
        return { name: 'close-circle' as const, color: colors.danger[500] };
      case 'holiday':
        return { name: 'sunny' as const, color: colors.info[500] };
      case 'leave':
        return { name: 'calendar' as const, color: colors.neutral[500] };
      default:
        return { name: 'help-circle' as const, color: colors.neutral[400] };
    }
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const businessName = await settingsService.getBusinessName();
      await pdfService.generateAttendanceReport(
        workers,
        attendance,
        currentWeek.start,
        currentWeek.end,
        businessName
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to export PDF');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, isDark && { backgroundColor: themeColors.background }]}>
        <Text style={[styles.loadingText, isDark && { color: themeColors.textMuted }]}>Loading report...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, isDark && { backgroundColor: themeColors.background }]}>
      <View style={styles.content}>
        {/* Week Selector Bar */}
        <Card style={[styles.weekCard, isDark && { backgroundColor: themeColors.card, borderColor: themeColors.cardBorder }]} padding={spacing[3]}>
          <TouchableOpacity
            onPress={goToPreviousWeek}
            style={styles.weekArrow}
            activeOpacity={0.7}
            accessibilityLabel="Previous week"
          >
            <Ionicons name="chevron-back" size={22} color={isDark ? '#60A5FA' : colors.primary[600]} />
          </TouchableOpacity>
          <View style={styles.weekCenter}>
            <Text style={[styles.weekLabel, isDark && { color: themeColors.text }]}>{weekLabel}</Text>
          </View>
          <TouchableOpacity
            onPress={goToNextWeek}
            style={styles.weekArrow}
            activeOpacity={0.7}
            accessibilityLabel="Next week"
          >
            <Ionicons name="chevron-forward" size={22} color={isDark ? '#60A5FA' : colors.primary[600]} />
          </TouchableOpacity>
        </Card>

        <Card style={[styles.headerCard, isDark && { backgroundColor: 'rgba(59, 130, 246, 0.12)', borderColor: 'rgba(59, 130, 246, 0.25)' }]}>
          <Text style={[styles.reportTitle, isDark && { color: themeColors.text }]}>Attendance Register</Text>
          <Text style={[styles.reportPeriod, isDark && { color: '#60A5FA' }]}>{currentWeek.label}</Text>
        </Card>

        {workers.map((worker) => {
          const workerAttendance = attendance[worker.id] || [];

          return (
            <Card key={worker.id} style={styles.workerCard}>
              <View style={styles.workerHeader}>
                <Avatar name={worker.name} size="md" />
                <View style={styles.workerInfo}>
                  <Text style={[styles.workerName, isDark && { color: themeColors.text }]}>{worker.name}</Text>
                  <Text style={[styles.workerId, isDark && { color: themeColors.textMuted }]}>{worker.employee_id}</Text>
                </View>
              </View>

              <View style={styles.attendanceGrid}>
                {workerAttendance.map((att) => {
                  const icon = getStatusIcon(att.status);
                  return (
                    <View
                      key={att.id}
                      style={[
                        styles.attendanceDay,
                        isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.border, borderWidth: 1 },
                      ]}
                    >
                      <Text style={[styles.dayDate, isDark && { color: themeColors.textSecondary }]}>{format(new Date(att.work_date), 'dd')}</Text>
                      <Ionicons name={icon.name} size={20} color={icon.color} />
                      {att.overtime_hours > 0 && (
                        <Text style={[styles.overtimeText, isDark && { color: '#60A5FA' }]}>+{att.overtime_hours}h</Text>
                      )}
                    </View>
                  );
                })}
              </View>

              {workerAttendance.length === 0 && (
                <Text style={[styles.noAttendance, isDark && { color: themeColors.textMuted }]}>No attendance records</Text>
              )}
            </Card>
          );
        })}

        {workers.length > 0 && (
          <View style={{ marginTop: spacing[4], marginBottom: spacing[8] }}>
            <Button
              title={exporting ? "Exporting..." : "Export PDF"}
              onPress={handleExportPDF}
              icon={exporting ? undefined : "document-text-outline"}
              disabled={exporting}
            />
          </View>
        )}
      </View>
    </ScrollView>
  );
}

// ============================================================
// OUTSTANDING ADVANCES REPORT
// ============================================================
export function AdvancesReportScreen() {
  const { isDark, themeColors } = useAppStore();
  const [workers, setWorkers] = useState<(Worker & { outstanding: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadReport();
  }, []);

  const loadReport = async () => {
    setLoading(true);
    try {
      const workerList = await workerService.getAll({ is_active: 1, sort_by: 'name' });
      const workersWithBalance = await Promise.all(
        workerList.map(async (worker) => {
          const outstanding = await advanceService.getOutstandingBalance(worker.id);
          return { ...worker, outstanding };
        })
      );

      // Filter to only show workers with outstanding advances
      setWorkers(workersWithBalance.filter((w) => w.outstanding > 0));
    } catch (error) {
      console.error('Failed to load report:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const businessName = await settingsService.getBusinessName();
      await pdfService.generateAdvancesReport(workers, businessName);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to export PDF');
    } finally {
      setExporting(false);
    }
  };

  const totalOutstanding = workers.reduce((sum, w) => sum + w.outstanding, 0);

  if (loading) {
    return (
      <View style={[styles.container, isDark && { backgroundColor: themeColors.background }]}>
        <Text style={[styles.loadingText, isDark && { color: themeColors.textMuted }]}>Loading report...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, isDark && { backgroundColor: themeColors.background }]}>
      <View style={styles.content}>
        <Card style={[styles.headerCard, isDark && { backgroundColor: 'rgba(59, 130, 246, 0.12)', borderColor: 'rgba(59, 130, 246, 0.25)' }]}>
          <Text style={[styles.reportTitle, isDark && { color: themeColors.text }]}>Outstanding Advances</Text>
          <Text style={[styles.reportPeriod, isDark && { color: '#60A5FA' }]}>As of {format(new Date(), 'MMM dd, yyyy')}</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, isDark && { color: themeColors.textSecondary }]}>Total Outstanding</Text>
              <Text style={[styles.summaryValue, { color: isDark ? '#FBBF24' : colors.warning[600] }]}>
                {formatCurrency(totalOutstanding)}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, isDark && { color: themeColors.textSecondary }]}>Workers</Text>
              <Text style={[styles.summaryValue, isDark && { color: themeColors.text }]}>{workers.length}</Text>
            </View>
          </View>
        </Card>

        {workers.map((worker) => (
          <Card key={worker.id} style={styles.workerCard}>
            <View style={styles.workerHeader}>
              <Avatar name={worker.name} size="md" />
              <View style={styles.workerInfo}>
                <Text style={[styles.workerName, isDark && { color: themeColors.text }]}>{worker.name}</Text>
                <Text style={[styles.workerId, isDark && { color: themeColors.textMuted }]}>{worker.employee_id}</Text>
              </View>
              <Text style={[styles.netPay, { color: isDark ? '#FBBF24' : colors.warning[600] }]}>
                {formatCurrency(worker.outstanding)}
              </Text>
            </View>
          </Card>
        ))}

        {workers.length === 0 && (
          <Card style={styles.emptyCard}>
            <Ionicons name="checkmark-circle-outline" size={48} color={isDark ? '#4ADE80' : colors.success[500]} />
            <Text style={[styles.emptyText, isDark && { color: themeColors.textMuted }]}>No outstanding advances</Text>
          </Card>
        )}

        {workers.length > 0 && (
          <View style={{ marginTop: spacing[4], marginBottom: spacing[8] }}>
            <Button
              title={exporting ? "Exporting..." : "Export PDF"}
              onPress={handleExportPDF}
              icon={exporting ? undefined : "document-text-outline"}
              disabled={exporting}
            />
          </View>
        )}
      </View>
    </ScrollView>
  );
}

// ============================================================
// ADVANCES GIVEN REPORT (DISBURSEMENTS)
// ============================================================
export function AdvancesGivenReportScreen() {
  const { isDark, themeColors, weekStartsOn } = useAppStore();
  const [advances, setAdvances] = useState<(Advance & { worker_name: string; employee_id: string; worker_phone: string | null })[]>([]);
  const [filterPeriod, setFilterPeriod] = useState<'all' | 'month' | 'week'>('all');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const getDateRange = () => {
    const today = new Date();
    if (filterPeriod === 'week') {
      const start = format(startOfWeek(today, { weekStartsOn: weekStartsOn as any }), 'yyyy-MM-dd');
      const end = format(endOfWeek(today, { weekStartsOn: weekStartsOn as any }), 'yyyy-MM-dd');
      return { start, end, label: 'Current Week' };
    }
    if (filterPeriod === 'month') {
      const start = format(startOfMonth(today), 'yyyy-MM-dd');
      const end = format(endOfMonth(today), 'yyyy-MM-dd');
      return { start, end, label: format(today, 'MMMM yyyy') };
    }
    return { label: 'All Time' };
  };

  const loadReport = async () => {
    setLoading(true);
    try {
      const range = getDateRange();
      const list = await advanceService.getAllWithWorkers({
        date_from: range.start,
        date_to: range.end,
      });
      setAdvances(list);
    } catch (error) {
      console.error('Failed to load advances given report:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [filterPeriod]);

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const businessName = await settingsService.getBusinessName();
      const range = getDateRange();
      await pdfService.generateAdvancesGivenReport(advances, range, businessName);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to export PDF');
    } finally {
      setExporting(false);
    }
  };

  const totalGiven = advances.reduce((sum, a) => sum + a.amount, 0);
  const uniqueWorkersCount = new Set(advances.map((a) => a.worker_id)).size;

  return (
    <ScrollView style={[styles.container, isDark && { backgroundColor: themeColors.background }]}>
      <View style={styles.content}>
        {/* Filter Pills */}
        <View style={styles.filterPillsContainer}>
          <TouchableOpacity
            style={[
              styles.filterPill,
              filterPeriod === 'all' && styles.filterPillActive,
              isDark && filterPeriod !== 'all' && { backgroundColor: themeColors.card, borderColor: themeColors.cardBorder },
            ]}
            onPress={() => setFilterPeriod('all')}
          >
            <Text style={[styles.filterPillText, filterPeriod === 'all' && styles.filterPillTextActive, isDark && filterPeriod !== 'all' && { color: themeColors.textSecondary }]}>
              All Time
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterPill,
              filterPeriod === 'month' && styles.filterPillActive,
              isDark && filterPeriod !== 'month' && { backgroundColor: themeColors.card, borderColor: themeColors.cardBorder },
            ]}
            onPress={() => setFilterPeriod('month')}
          >
            <Text style={[styles.filterPillText, filterPeriod === 'month' && styles.filterPillTextActive, isDark && filterPeriod !== 'month' && { color: themeColors.textSecondary }]}>
              This Month
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterPill,
              filterPeriod === 'week' && styles.filterPillActive,
              isDark && filterPeriod !== 'week' && { backgroundColor: themeColors.card, borderColor: themeColors.cardBorder },
            ]}
            onPress={() => setFilterPeriod('week')}
          >
            <Text style={[styles.filterPillText, filterPeriod === 'week' && styles.filterPillTextActive, isDark && filterPeriod !== 'week' && { color: themeColors.textSecondary }]}>
              This Week
            </Text>
          </TouchableOpacity>
        </View>

        {/* Header Summary Card */}
        <Card style={[styles.headerCard, isDark && { backgroundColor: 'rgba(217, 119, 6, 0.12)', borderColor: 'rgba(217, 119, 6, 0.25)' }]}>
          <Text style={[styles.reportTitle, isDark && { color: themeColors.text }]}>Advances Given Report</Text>
          <Text style={[styles.reportPeriod, isDark && { color: '#FBBF24' }]}>
            {getDateRange().label} · {advances.length} disbursement{advances.length === 1 ? '' : 's'}
          </Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, isDark && { color: themeColors.textSecondary }]}>Total Given</Text>
              <Text style={[styles.summaryValue, { color: isDark ? '#FBBF24' : colors.warning[600] }]}>
                {formatCurrency(totalGiven)}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, isDark && { color: themeColors.textSecondary }]}>Transactions</Text>
              <Text style={[styles.summaryValue, isDark && { color: themeColors.text }]}>{advances.length}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, isDark && { color: themeColors.textSecondary }]}>Workers</Text>
              <Text style={[styles.summaryValue, isDark && { color: themeColors.text }]}>{uniqueWorkersCount}</Text>
            </View>
          </View>
        </Card>

        {/* Loading State */}
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary[500]} style={{ marginTop: spacing[8] }} />
        ) : advances.length === 0 ? (
          <Card style={[styles.emptyCard, isDark && { backgroundColor: themeColors.card, borderColor: themeColors.cardBorder }]}>
            <Ionicons name="cash-outline" size={48} color={isDark ? themeColors.textMuted : colors.neutral[400]} />
            <Text style={[styles.emptyText, isDark && { color: themeColors.textMuted }]}>
              No advances given in this period
            </Text>
          </Card>
        ) : (
          advances.map((advance) => (
            <Card key={advance.id} style={[styles.workerCard, isDark && { backgroundColor: themeColors.card, borderColor: themeColors.cardBorder, borderWidth: 1 }]}>
              <View style={styles.workerHeader}>
                <Avatar name={advance.worker_name} size="md" />
                <View style={styles.workerInfo}>
                  <Text style={[styles.workerName, isDark && { color: themeColors.text }]}>{advance.worker_name}</Text>
                  <Text style={[styles.workerId, isDark && { color: themeColors.textMuted }]}>
                    ID: {advance.employee_id} · {format(parseISO(advance.advance_date), 'dd MMM yyyy')}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.netPay, { color: isDark ? '#FBBF24' : colors.warning[600] }]}>
                    {formatCurrency(advance.amount)}
                  </Text>
                  <View style={{ marginTop: 4 }}>
                    <Badge
                      label={advance.payment_method?.toUpperCase() || 'CASH'}
                      variant={advance.payment_method === 'cash' ? 'success' : advance.payment_method === 'upi' ? 'info' : 'neutral'}
                      size="sm"
                    />
                  </View>
                </View>
              </View>
              {advance.reason ? (
                <View style={[styles.advanceReasonBox, isDark && { backgroundColor: 'rgba(255, 255, 255, 0.05)' }]}>
                  <Text style={[styles.advanceReasonText, isDark && { color: themeColors.textSecondary }]}>
                    Note: {advance.reason}
                  </Text>
                </View>
              ) : null}
            </Card>
          ))
        )}

        {/* Export PDF Button */}
        {!loading && advances.length > 0 && (
          <View style={{ marginTop: spacing[4], marginBottom: spacing[8] }}>
            <Button
              title={exporting ? 'Generating PDF...' : 'Export Advances Given PDF'}
              onPress={handleExportPDF}
              icon={exporting ? undefined : 'document-text-outline'}
              disabled={exporting}
              fullWidth
            />
          </View>
        )}
      </View>
    </ScrollView>
  );
}

// ============================================================
// CASHBOOK REPORT
// ============================================================
export function CashbookScreen() {
  const { currentWeek, isDark, themeColors } = useAppStore();
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [settlements, setSettlements] = useState<SalarySettlement[]>([]);
  const [workers, setWorkers] = useState<Record<number, Worker>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReport();
  }, [currentWeek]);

  const loadReport = async () => {
    setLoading(true);
    try {
      const [advs, settls] = await Promise.all([
        advanceService.getAll({
          date_from: currentWeek.start,
          date_to: currentWeek.end,
        }),
        salaryService.getForWeek(currentWeek.start, currentWeek.end),
      ]);

      setAdvances(advs);
      setSettlements(settls);

      // Load workers
      const workerIds = new Set([
        ...advs.map((a) => a.worker_id),
        ...settls.map((s) => s.worker_id),
      ]);

      const workerMap: Record<number, Worker> = {};
      for (const id of workerIds) {
        const worker = await workerService.getById(id);
        if (worker) workerMap[id] = worker;
      }
      setWorkers(workerMap);
    } catch (error) {
      console.error('Failed to load report:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalAdvances = advances.reduce((sum, a) => sum + a.amount, 0);
  const totalSettlements = settlements.reduce((sum, s) => sum + s.net_pay, 0);
  const totalOutflow = totalAdvances + totalSettlements;

  if (loading) {
    return (
      <View style={[styles.container, isDark && { backgroundColor: themeColors.background }]}>
        <Text style={[styles.loadingText, isDark && { color: themeColors.textMuted }]}>Loading report...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, isDark && { backgroundColor: themeColors.background }]}>
      <View style={styles.content}>
        <Card style={[styles.headerCard, isDark && { backgroundColor: 'rgba(59, 130, 246, 0.12)', borderColor: 'rgba(59, 130, 246, 0.25)' }]}>
          <Text style={[styles.reportTitle, isDark && { color: themeColors.text }]}>Cashbook</Text>
          <Text style={[styles.reportPeriod, isDark && { color: '#60A5FA' }]}>{currentWeek.label}</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, isDark && { color: themeColors.textSecondary }]}>Advances</Text>
              <Text style={[styles.summaryValue, { color: isDark ? '#F87171' : colors.danger[600] }]}>
                -{formatCurrency(totalAdvances)}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, isDark && { color: themeColors.textSecondary }]}>Salaries</Text>
              <Text style={[styles.summaryValue, { color: isDark ? '#F87171' : colors.danger[600] }]}>
                -{formatCurrency(totalSettlements)}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, isDark && { color: themeColors.textSecondary }]}>Total Outflow</Text>
              <Text style={[styles.summaryValue, { color: isDark ? '#F87171' : colors.danger[600] }]}>
                -{formatCurrency(totalOutflow)}
              </Text>
            </View>
          </View>
        </Card>

        {/* Advances */}
        {advances.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, isDark && { color: themeColors.textMuted }]}>ADVANCES</Text>
            {advances.map((advance) => {
              const worker = workers[advance.worker_id];
              return (
                <Card key={advance.id} style={styles.transactionCard}>
                  <View style={styles.transactionHeader}>
                    <View style={[styles.transactionIcon, { backgroundColor: isDark ? 'rgba(234, 179, 8, 0.15)' : colors.warning[50] }]}>
                      <Ionicons name="cash-outline" size={24} color={isDark ? '#FBBF24' : colors.warning[600]} />
                    </View>
                    <View style={styles.transactionInfo}>
                      <Text style={[styles.transactionTitle, isDark && { color: themeColors.text }]}>
                        Advance - {worker?.name || 'Unknown'}
                      </Text>
                      <Text style={[styles.transactionDate, isDark && { color: themeColors.textMuted }]}>
                        {format(new Date(advance.advance_date), 'MMM dd, yyyy')}
                      </Text>
                    </View>
                    <Text style={[styles.transactionAmount, { color: isDark ? '#F87171' : colors.danger[600] }]}>
                      -{formatCurrency(advance.amount)}
                    </Text>
                  </View>
                  {advance.reason && (
                    <Text style={[styles.transactionNote, isDark && { color: themeColors.textSecondary }]}>{advance.reason}</Text>
                  )}
                </Card>
              );
            })}
          </>
        )}

        {/* Settlements */}
        {settlements.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, isDark && { color: themeColors.textMuted }]}>SALARY PAYMENTS</Text>
            {settlements.map((settlement) => {
              const worker = workers[settlement.worker_id];
              return (
                <Card key={settlement.id} style={styles.transactionCard}>
                  <View style={styles.transactionHeader}>
                    <View style={[styles.transactionIcon, { backgroundColor: isDark ? 'rgba(34, 197, 94, 0.15)' : colors.success[50] }]}>
                      <Ionicons name="wallet-outline" size={24} color={isDark ? '#4ADE80' : colors.success[600]} />
                    </View>
                    <View style={styles.transactionInfo}>
                      <Text style={[styles.transactionTitle, isDark && { color: themeColors.text }]}>
                        Salary - {worker?.name || 'Unknown'}
                      </Text>
                      <Text style={[styles.transactionDate, isDark && { color: themeColors.textMuted }]}>
                        {format(new Date(settlement.confirmed_at || settlement.created_at), 'MMM dd, yyyy')}
                      </Text>
                    </View>
                    <Text style={[styles.transactionAmount, { color: isDark ? '#F87171' : colors.danger[600] }]}>
                      -{formatCurrency(settlement.net_pay)}
                    </Text>
                  </View>
                </Card>
              );
            })}
          </>
        )}

        {advances.length === 0 && settlements.length === 0 && (
          <Card style={styles.emptyCard}>
            <Ionicons name="book-outline" size={48} color={isDark ? themeColors.textMuted : colors.neutral[300]} />
            <Text style={[styles.emptyText, isDark && { color: themeColors.textMuted }]}>No transactions this week</Text>
          </Card>
        )}
      </View>
    </ScrollView>
  );
}


// ============================================================
// WORKER SUMMARY REPORT SCREEN
// ============================================================
export function WorkerSummaryReportScreen({ navigation }: any) {
  const { isDark, themeColors } = useAppStore();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [categories, setCategories] = useState<Record<number, string>>({});
  const [balances, setBalances] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allWorkers, allCats] = await Promise.all([
        workerService.getAll({ sort_by: 'name' }),
        categoryService.getAll(),
      ]);

      const catMap: Record<number, string> = {};
      allCats.forEach((c) => {
        catMap[c.id] = c.name;
      });

      const balMap: Record<number, number> = {};
      await Promise.all(
        allWorkers.map(async (w) => {
          balMap[w.id] = await advanceService.getOutstandingBalance(w.id);
        })
      );

      setWorkers(allWorkers);
      setCategories(catMap);
      setBalances(balMap);
    } catch (err) {
      console.error('Failed to load worker summary data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const businessName = await settingsService.getBusinessName();
      await pdfService.generateWorkerRosterPDF(workers, categories, businessName);
    } catch (err: any) {
      if (Platform.OS === 'web') window.alert(err.message || 'Failed to export PDF');
      else Alert.alert('Error', err.message || 'Failed to export PDF');
    } finally {
      setExporting(false);
    }
  };

  const activeCount = workers.filter((w) => w.is_active).length;
  const totalAdvances = Object.values(balances).reduce((sum, b) => sum + b, 0);

  if (loading) {
    return (
      <View style={[styles.container, isDark && { backgroundColor: themeColors.background }]}>
        <ActivityIndicator size="large" color={colors.primary[600]} style={{ marginTop: 40 }} />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, isDark && { backgroundColor: themeColors.background }]} contentContainerStyle={{ paddingBottom: spacing[8] }}>
      <View style={styles.content}>
        <Card style={[styles.headerCard, isDark && { backgroundColor: themeColors.card, borderColor: themeColors.cardBorder }]}>
          <Text style={[styles.reportTitle, isDark && { color: themeColors.text }]}>Worker Roster & Profiles</Text>
          <Text style={[styles.reportPeriod, isDark && { color: '#60A5FA' }]}>Master Employee Registry</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, isDark && { color: themeColors.textMuted }]}>Total Workforce</Text>
              <Text style={[styles.summaryValue, isDark && { color: themeColors.text }]}>{workers.length}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, isDark && { color: themeColors.textMuted }]}>Active Workers</Text>
              <Text style={[styles.summaryValue, { color: isDark ? '#4ADE80' : colors.success[700] }]}>{activeCount}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, isDark && { color: themeColors.textMuted }]}>Total Advances</Text>
              <Text style={[styles.summaryValue, { color: isDark ? '#FBBF24' : colors.warning[700] }]}>
                {formatCurrency(totalAdvances)}
              </Text>
            </View>
          </View>
        </Card>

        {workers.map((worker) => {
          const roleName = worker.category_id ? categories[worker.category_id] : 'General';
          const bal = balances[worker.id] || 0;

          return (
            <TouchableOpacity
              key={worker.id}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('WorkerProfile', { workerId: worker.id })}
            >
              <Card style={styles.workerCard}>
                <View style={styles.workerHeader}>
                  <Avatar name={worker.name} size="md" />
                  <View style={styles.workerInfo}>
                    <Text style={[styles.workerName, isDark && { color: themeColors.text }]}>{worker.name}</Text>
                    <Text style={[styles.workerId, isDark && { color: themeColors.textMuted }]}>
                      {worker.employee_id || 'ID Pending'} · {roleName}
                    </Text>
                  </View>
                  <Badge
                    label={worker.is_active ? 'Active' : 'Inactive'}
                    variant={worker.is_active ? 'success' : 'neutral'}
                    size="sm"
                  />
                </View>

                <View style={[styles.workerSummaryMetaRow, isDark && { borderTopColor: themeColors.cardBorder }]}>
                  <View>
                    <Text style={[styles.metaLabelSmall, isDark && { color: themeColors.textMuted }]}>Daily Wage</Text>
                    <Text style={[styles.metaValBold, isDark && { color: themeColors.text }]}>{formatCurrency(worker.daily_wage)}/day</Text>
                  </View>
                  <View>
                    <Text style={[styles.metaLabelSmall, isDark && { color: themeColors.textMuted }]}>Overtime Rate</Text>
                    <Text style={[styles.metaValBold, isDark && { color: themeColors.text }]}>
                      {worker.overtime_rate > 0 ? formatCurrency(worker.overtime_rate) + '/hr' : 'Standard'}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.metaLabelSmall, isDark && { color: themeColors.textMuted }]}>Advance Balance</Text>
                    <Text style={[styles.metaValBold, { color: bal > 0 ? (isDark ? '#FBBF24' : colors.warning[700]) : (isDark ? themeColors.textMuted : colors.neutral[600]) }]}>
                      {formatCurrency(bal)}
                    </Text>
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          );
        })}

        <View style={{ marginTop: spacing[4], marginBottom: spacing[8] }}>
          <Button
            title={exporting ? 'Generating PDF...' : 'Export Worker Directory (PDF)'}
            onPress={handleExportPDF}
            icon={exporting ? undefined : 'document-text-outline'}
            disabled={exporting}
            fullWidth
          />
        </View>
      </View>
    </ScrollView>
  );
}

// ============================================================
// WEEKLY AUDIT REPORT SCREEN
// ============================================================
export function WeeklyAuditReportScreen() {
  const { isDark, themeColors, currentWeekDate, currentWeek, weekStartsOn, goToPreviousWeek, goToNextWeek } = useAppStore();
  const weekLabel = getWeekLabel(currentWeekDate, weekStartsOn);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadLogs();
  }, [currentWeek.start, currentWeek.end]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await auditService.getAll({
        date_from: currentWeek.start,
        date_to: currentWeek.end,
      });
      setLogs(data);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const businessName = await settingsService.getBusinessName();
      await pdfService.generateWeeklyAuditReportPDF(
        logs,
        currentWeek.start,
        currentWeek.end,
        businessName
      );
    } catch (err: any) {
      if (Platform.OS === 'web') window.alert(err.message || 'Failed to export audit PDF');
      else Alert.alert('Error', err.message || 'Failed to export audit PDF');
    } finally {
      setExporting(false);
    }
  };

  const attendanceCount = logs.filter((l) => l.entity_type === 'attendance').length;
  const advanceCount = logs.filter((l) => l.entity_type === 'advance').length;
  const salaryCount = logs.filter((l) => l.entity_type === 'salary_settlement').length;

  return (
    <ScrollView style={[styles.container, isDark && { backgroundColor: themeColors.background }]} contentContainerStyle={{ paddingBottom: spacing[8] }}>
      <View style={styles.content}>
        {/* Week Selector Bar */}
        <Card style={[styles.weekCard, isDark && { backgroundColor: themeColors.card, borderColor: themeColors.cardBorder }]} padding={spacing[3]}>
          <TouchableOpacity
            onPress={goToPreviousWeek}
            style={styles.weekArrow}
            activeOpacity={0.7}
            accessibilityLabel="Previous week"
          >
            <Ionicons name="chevron-back" size={22} color={isDark ? '#60A5FA' : colors.primary[600]} />
          </TouchableOpacity>
          <View style={styles.weekCenter}>
            <Text style={[styles.weekLabel, isDark && { color: themeColors.text }]}>{weekLabel}</Text>
          </View>
          <TouchableOpacity
            onPress={goToNextWeek}
            style={styles.weekArrow}
            activeOpacity={0.7}
            accessibilityLabel="Next week"
          >
            <Ionicons name="chevron-forward" size={22} color={isDark ? '#60A5FA' : colors.primary[600]} />
          </TouchableOpacity>
        </Card>

        {/* Audit Header */}
        <Card style={[styles.headerCard, isDark && { backgroundColor: themeColors.card, borderColor: themeColors.cardBorder }]}>
          <Text style={[styles.reportTitle, isDark && { color: themeColors.text }]}>Weekly Audit & Compliance Trail</Text>
          <Text style={[styles.reportPeriod, isDark && { color: '#60A5FA' }]}>{currentWeek.label}</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, isDark && { color: themeColors.textMuted }]}>Total Events</Text>
              <Text style={[styles.summaryValue, isDark && { color: themeColors.text }]}>{logs.length}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, isDark && { color: themeColors.textMuted }]}>Attendance Logs</Text>
              <Text style={[styles.summaryValue, { color: isDark ? '#4ADE80' : colors.success[700] }]}>{attendanceCount}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, isDark && { color: themeColors.textMuted }]}>Advances</Text>
              <Text style={[styles.summaryValue, { color: isDark ? '#FBBF24' : colors.warning[700] }]}>{advanceCount}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, isDark && { color: themeColors.textMuted }]}>Settlements</Text>
              <Text style={[styles.summaryValue, { color: isDark ? '#60A5FA' : colors.primary[700] }]}>{salaryCount}</Text>
            </View>
          </View>
        </Card>

        {loading ? (
          <ActivityIndicator size="large" color={colors.primary[600]} style={{ marginTop: 20 }} />
        ) : logs.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Ionicons name="shield-checkmark-outline" size={48} color={isDark ? themeColors.textMuted : colors.neutral[300]} />
            <Text style={[styles.emptyText, isDark && { color: themeColors.textMuted }]}>No activity recorded for this week</Text>
          </Card>
        ) : (
          logs.map((log) => (
            <Card key={log.id} style={styles.transactionCard}>
              <View style={styles.transactionHeader}>
                <View style={[styles.transactionIcon, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : colors.primary[50] }]}>
                  <Ionicons name="time-outline" size={20} color={isDark ? '#60A5FA' : colors.primary[600]} />
                </View>
                <View style={styles.transactionInfo}>
                  <Text style={[styles.transactionTitle, isDark && { color: themeColors.text }]}>
                    {log.action.replace(/_/g, ' ').toUpperCase()}
                  </Text>
                  <Text style={[styles.transactionDate, isDark && { color: themeColors.textMuted }]}>
                    {log.created_at ? format(parseISO(log.created_at), 'dd MMM yyyy, h:mm a') : '-'} · By {log.performed_by || 'Owner'}
                  </Text>
                </View>
                {log.worker_id && (
                  <Badge label={`Worker #${log.worker_id}`} variant="neutral" size="sm" />
                )}
              </View>
              {(log.old_value || log.new_value) && (
                <View style={[styles.auditDetailsBox, isDark && { backgroundColor: themeColors.background }]}>
                  {log.old_value && (
                    <Text style={[styles.auditChangeText, isDark && { color: themeColors.textMuted }]}>
                      <Text style={{ fontWeight: '700' }}>Old: </Text>{log.old_value}
                    </Text>
                  )}
                  {log.new_value && (
                    <Text style={[styles.auditChangeText, isDark && { color: themeColors.textMuted }]}>
                      <Text style={{ fontWeight: '700', color: isDark ? '#60A5FA' : colors.primary[700] }}>New: </Text>{log.new_value}
                    </Text>
                  )}
                </View>
              )}
              {log.reason && <Text style={[styles.transactionNote, isDark && { color: themeColors.textMuted }]}>{log.reason}</Text>}
            </Card>
          ))
        )}

        {logs.length > 0 && (
          <View style={{ marginTop: spacing[4], marginBottom: spacing[8] }}>
            <Button
              title={exporting ? 'Generating Audit PDF...' : 'Export Weekly Audit Report (PDF)'}
              onPress={handleExportPDF}
              icon={exporting ? undefined : 'document-text-outline'}
              disabled={exporting}
              fullWidth
            />
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  content: {
    padding: spacing[4],
  },
  loadingText: {
    ...typography.body,
    color: colors.neutral[500],
    textAlign: 'center',
    marginTop: spacing[8],
  },
  headerCard: {
    marginBottom: spacing[4],
    padding: spacing[4],
    backgroundColor: colors.primary[50],
    borderWidth: 1,
    borderColor: colors.primary[100],
  },
  reportTitle: {
    ...typography.h2,
    color: colors.primary[900],
    marginBottom: spacing[1],
  },
  reportPeriod: {
    ...typography.body,
    color: colors.primary[700],
    marginBottom: spacing[4],
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    flex: 1,
  },
  summaryLabel: {
    ...typography.caption,
    color: colors.neutral[600],
    marginBottom: spacing[1],
  },
  summaryValue: {
    ...typography.amountSmall,
    color: colors.neutral[900],
  },
  workerCard: {
    marginBottom: spacing[3],
    padding: spacing[4],
  },
  workerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  workerInfo: {
    flex: 1,
    marginLeft: spacing[3],
  },
  workerName: {
    ...typography.bodyLarge,
    fontWeight: '600',
    color: colors.neutral[900],
  },
  workerId: {
    ...typography.caption,
    color: colors.neutral[500],
    marginTop: 2,
  },
  netPay: {
    ...typography.amount,
    color: colors.success[600],
  },
  breakdown: {
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
  },
  breakdownTitle: {
    ...typography.overline,
    color: colors.neutral[500],
    marginBottom: spacing[2],
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing[1],
  },
  breakdownDesc: {
    ...typography.bodySmall,
    color: colors.neutral[700],
  },
  breakdownAmount: {
    ...typography.bodySmall,
    fontWeight: '600',
  },
  breakdownTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing[2],
    paddingTop: spacing[2],
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
  },
  breakdownTotalLabel: {
    ...typography.body,
    fontWeight: '600',
    color: colors.neutral[900],
  },
  breakdownTotalAmount: {
    ...typography.body,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  attendanceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  attendanceDay: {
    alignItems: 'center',
    padding: spacing[2],
    backgroundColor: colors.neutral[50],
    borderRadius: 8,
    minWidth: 60,
  },
  dayDate: {
    ...typography.caption,
    color: colors.neutral[600],
    marginBottom: spacing[1],
  },
  overtimeText: {
    ...typography.caption,
    color: colors.primary[600],
    fontWeight: '600',
    marginTop: spacing[1],
  },
  noAttendance: {
    ...typography.bodySmall,
    color: colors.neutral[500],
    textAlign: 'center',
    paddingVertical: spacing[4],
  },
  emptyCard: {
    padding: spacing[8],
    alignItems: 'center',
  },
  emptyText: {
    ...typography.body,
    color: colors.neutral[500],
    marginTop: spacing[3],
  },
  sectionTitle: {
    ...typography.overline,
    color: colors.neutral[500],
    marginTop: spacing[4],
    marginBottom: spacing[2],
  },
  transactionCard: {
    marginBottom: spacing[3],
    padding: spacing[4],
  },
  transactionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transactionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[3],
  },
  transactionInfo: {
    flex: 1,
  },
  transactionTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.neutral[900],
  },
  transactionDate: {
    ...typography.caption,
    color: colors.neutral[500],
    marginTop: 2,
  },
  transactionAmount: {
    ...typography.amountSmall,
  },
  transactionNote: {
    ...typography.bodySmall,
    color: colors.neutral[600],
    marginTop: spacing[2],
    fontStyle: 'italic',
  },
  weekCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[3],
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  weekArrow: {
    padding: spacing[2],
  },
  weekCenter: {
    alignItems: 'center',
  },
  weekLabel: {
    ...typography.body,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  workerSummaryMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing[3],
    marginTop: spacing[2],
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
  },
  metaLabelSmall: {
    ...typography.caption,
    fontSize: 10,
    color: colors.neutral[500],
    textTransform: 'uppercase',
  },
  metaValBold: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: colors.neutral[800],
    marginTop: 1,
  },
  auditDetailsBox: {
    backgroundColor: colors.neutral[50],
    padding: spacing[2],
    borderRadius: 6,
    marginTop: spacing[2],
  },
  auditChangeText: {
    ...typography.caption,
    color: colors.neutral[700],
    marginVertical: 1,
  },
  filterPillsContainer: {
    flexDirection: 'row',
    gap: spacing[2],
    marginBottom: spacing[4],
  },
  filterPill: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
    borderRadius: borderRadius.full,
    backgroundColor: colors.neutral[100],
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  filterPillActive: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[600],
  },
  filterPillText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.neutral[700],
  },
  filterPillTextActive: {
    color: colors.white,
  },
  advanceReasonBox: {
    backgroundColor: colors.neutral[50],
    padding: spacing[2],
    borderRadius: 6,
    marginTop: spacing[2],
  },
  advanceReasonText: {
    ...typography.caption,
    color: colors.neutral[600],
    fontStyle: 'italic',
  },
});
