// Worker WageBook - Worker Profile Screen (with Weekly Strip & Monthly Calendar)

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
} from 'date-fns';
import { colors, spacing, typography, borderRadius, shadows } from '../../constants/theme';
import { Avatar, Badge, Card, StatCard, Divider, Button, TextInput } from '../../components/ui';
import { formatCurrency, formatDate, formatRelativeTime } from '../../utils/helpers';
import { workerService } from '../../services/workerService';
import { categoryService } from '../../services/categoryService';
import { auditService } from '../../services/auditService';
import { attendanceService } from '../../services/attendanceService';
import { salaryService, SalaryCalculation } from '../../services/salaryService';
import { pdfService } from '../../services/pdfService';
import { settingsService } from '../../services/settingsService';
import { useAppStore } from '../../stores/appStore';
import { Worker, Category, AuditLog, Attendance, SalarySettlement } from '../../types';

export function WorkerProfileScreen({ route, navigation }: any) {
  const { workerId } = route.params;
  const { currentWeek, weekStartsOn, showToast, isDark, themeColors } = useAppStore();

  const [worker, setWorker] = useState<Worker | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [outstandingAdvance, setOutstandingAdvance] = useState(0);
  const [weeklyCalc, setWeeklyCalc] = useState<SalaryCalculation | null>(null);
  const [weeklySettlement, setWeeklySettlement] = useState<SalarySettlement | undefined>(undefined);
  const [recentActivity, setRecentActivity] = useState<AuditLog[]>([]);

  // Delete worker PIN modal state
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deletePin, setDeletePin] = useState('');
  const [deletePinError, setDeletePinError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Weekly attendance records
  const [weeklyAttendance, setWeeklyAttendance] = useState<Record<string, Attendance>>({});

  // Monthly calendar state
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [monthlyAttendance, setMonthlyAttendance] = useState<Record<string, Attendance>>({});
  const [monthlyLoading, setMonthlyLoading] = useState(false);

  // PDF export loading
  const [exportingPayslip, setExportingPayslip] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadWorker();
      loadWeeklyAttendance();
    }, [workerId, currentWeek.start, currentWeek.end])
  );

  useEffect(() => {
    loadMonthlyAttendance();
  }, [workerId, calendarMonth]);

  const loadWorker = async () => {
    try {
      const w = await workerService.getById(workerId);
      if (w) {
        setWorker(w);
        if (w.category_id) {
          const cat = await categoryService.getById(w.category_id);
          setCategory(cat);
        } else {
          setCategory(null);
        }
        const balance = await workerService.getOutstandingAdvance(w.id);
        setOutstandingAdvance(balance);
        const activity = await auditService.getForWorker(w.id);
        setRecentActivity(activity.slice(0, 5));

        // Load weekly calculation and settlement status
        try {
          const [calc, settls] = await Promise.all([
            salaryService.calculateForWorker(w.id, currentWeek.start, currentWeek.end),
            salaryService.getForWeek(currentWeek.start, currentWeek.end),
          ]);
          setWeeklyCalc(calc);
          const foundSettlement = settls.find((s) => s.worker_id === w.id);
          setWeeklySettlement(foundSettlement);
        } catch (calcErr) {
          console.warn('Failed to calculate weekly stats for worker:', calcErr);
        }
      }
    } catch (err) {
      console.error('Failed to load worker profile:', err);
    }
  };

  const loadWeeklyAttendance = async () => {
    try {
      const records = await attendanceService.getForWorkerInRange(
        workerId,
        currentWeek.start,
        currentWeek.end
      );
      const map: Record<string, Attendance> = {};
      records.forEach((r) => {
        map[r.work_date] = r;
      });
      setWeeklyAttendance(map);
    } catch (err) {
      console.warn('Failed to load weekly attendance:', err);
    }
  };

  const loadMonthlyAttendance = async () => {
    setMonthlyLoading(true);
    try {
      const mStart = format(startOfMonth(calendarMonth), 'yyyy-MM-dd');
      const mEnd = format(endOfMonth(calendarMonth), 'yyyy-MM-dd');
      const records = await attendanceService.getForWorkerInRange(workerId, mStart, mEnd);
      const map: Record<string, Attendance> = {};
      records.forEach((r) => {
        map[r.work_date] = r;
      });
      setMonthlyAttendance(map);
    } catch (err) {
      console.warn('Failed to load monthly attendance:', err);
    } finally {
      setMonthlyLoading(false);
    }
  };

  const handleDownloadPayslip = async () => {
    if (!worker || !weeklyCalc) return;
    setExportingPayslip(true);
    try {
      const businessName = await settingsService.getBusinessName();
      await pdfService.generateWorkerPayslipPDF(
        weeklyCalc,
        weeklySettlement,
        worker,
        currentWeek.start,
        currentWeek.end,
        businessName
      );
    } catch (error: any) {
      if (Platform.OS === 'web') {
        window.alert(error.message || 'Failed to download payslip');
      } else {
        Alert.alert('Error', error.message || 'Failed to download payslip');
      }
    } finally {
      setExportingPayslip(false);
    }
  };

  const handleDeleteWorkerClick = () => {
    setDeletePin('');
    setDeletePinError('');
    setDeleteModalVisible(true);
  };

  const handleConfirmDeleteWithPin = async () => {
    if (deletePin.length !== 4) {
      setDeletePinError('Please enter your 4-digit App PIN');
      return;
    }
    const isValid = await settingsService.verifyPin(deletePin);
    if (!isValid) {
      setDeletePinError('Incorrect PIN. Please try again.');
      return;
    }
    setDeleteModalVisible(false);
    await executeDeleteWorker();
  };

  const executeDeleteWorker = async () => {
    setIsDeleting(true);
    try {
      await workerService.delete(workerId);
      showToast('Worker deleted permanently', 'success');
      navigation.goBack();
    } catch (err) {
      console.error('Failed to delete worker:', err);
      Alert.alert('Error', 'Failed to delete worker. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!worker) return null;

  const daysWorkedDisplay = weeklyCalc
    ? `${weeklyCalc.days_worked + weeklyCalc.half_days_worked * 0.5}d`
    : '0d';
  const earnedDisplay = weeklyCalc ? formatCurrency(weeklyCalc.gross_earnings) : formatCurrency(0);

  // Partial / Full settlement aware net pay calculation
  const alreadyPaidWeekly = weeklySettlement ? weeklySettlement.net_pay : 0;
  const remainingNetDue = weeklyCalc ? Math.max(0, weeklyCalc.net_pay - alreadyPaidWeekly) : 0;
  const isFullySettledWeekly = weeklySettlement ? remainingNetDue === 0 : false;
  const isPartiallySettledWeekly = weeklySettlement ? remainingNetDue > 0 : false;

  const netPayDisplay = formatCurrency(isFullySettledWeekly ? 0 : remainingNetDue);
  const netPayLabel = isFullySettledWeekly ? 'Net Payable (Settled)' : isPartiallySettledWeekly ? 'Net Due (Remaining)' : 'Net Payable';

  // Generate 7 days for the weekly strip
  const weekStartObj = parseISO(currentWeek.start);
  const weekEndObj = parseISO(currentWeek.end);
  const weekDays = eachDayOfInterval({ start: weekStartObj, end: weekEndObj });

  // Generate days for monthly grid
  const monthStart = startOfMonth(calendarMonth);
  const monthEnd = endOfMonth(calendarMonth);
  const calendarGridStart = startOfWeek(monthStart, { weekStartsOn: weekStartsOn as 0 | 1 });
  const calendarGridEnd = endOfWeek(monthEnd, { weekStartsOn: weekStartsOn as 0 | 1 });
  const calendarDays = eachDayOfInterval({ start: calendarGridStart, end: calendarGridEnd });

  // Group days into strict 7-day weeks for reliable grid layout
  const calendarWeeks: Date[][] = [];
  for (let i = 0; i < calendarDays.length; i += 7) {
    calendarWeeks.push(calendarDays.slice(i, i + 7));
  }

  // Weekday header labels matching weekStartsOn
  const weekDayHeaders = weekStartsOn === 0
    ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Monthly statistics
  let monthP = 0;
  let monthH = 0;
  let monthA = 0;
  let monthOT = 0;
  Object.values(monthlyAttendance).forEach((att) => {
    if (att.status === 'present') monthP++;
    else if (att.status === 'half_day') monthH++;
    else if (att.status === 'absent') monthA++;
    if (att.overtime_hours > 0) monthOT += att.overtime_hours;
  });

  return (
    <ScrollView style={[styles.container, isDark && { backgroundColor: themeColors.background }]} contentContainerStyle={{ paddingBottom: spacing[8] }}>
      {/* Profile Header */}
      <View style={[styles.profileHeader, isDark && { backgroundColor: themeColors.surface, borderBottomColor: themeColors.border }]}>
        <Avatar name={worker.name} size="lg" />
        <Text style={[styles.workerName, isDark && { color: themeColors.text }]}>{worker.name}</Text>
        <View style={styles.workerMeta}>
          <Text style={[styles.workerId, isDark && { color: themeColors.textMuted }]}>{worker.employee_id || 'ID Pending'}</Text>
          {category && <Text style={[styles.workerCategory, isDark && { color: themeColors.textSecondary }]}> · {category.name}</Text>}
        </View>
        <View style={styles.badgeWrapper}>
          <Badge
            label={worker.is_active ? 'Active' : 'Inactive'}
            variant={worker.is_active ? 'success' : 'neutral'}
            size="md"
          />
        </View>
        {worker.phone && (
          <TouchableOpacity style={styles.phoneLink}>
            <Ionicons name="call" size={16} color={colors.primary[500]} />
            <Text style={[styles.phoneText, isDark && { color: '#60A5FA' }]}>{worker.phone}</Text>
          </TouchableOpacity>
        )}
        {worker.joining_date && (
          <Text style={[styles.joiningDate, isDark && { color: themeColors.textMuted }]}>Joined {formatDate(worker.joining_date, 'MMM yyyy')}</Text>
        )}

        {/* Download Payslip Button */}
        <View style={{ marginTop: spacing[3], width: '85%' }}>
          <Button
            title={exportingPayslip ? 'Generating Payslip...' : 'Download Weekly Wage Bill (PDF)'}
            onPress={handleDownloadPayslip}
            icon={exportingPayslip ? undefined : 'document-text-outline'}
            variant="secondary"
            disabled={exportingPayslip || !weeklyCalc}
            fullWidth
          />
        </View>
      </View>

      {/* Weekly Stats */}
      <Text style={[styles.sectionTitle, isDark && { color: themeColors.textSecondary }]}>THIS WEEK ({currentWeek.label})</Text>
      <View style={styles.statsGrid}>
        <View style={styles.statsRow}>
          <StatCard value={daysWorkedDisplay} label="Days Worked" />
          <View style={{ width: spacing[3] }} />
          <StatCard value={earnedDisplay} label="Earned" />
        </View>
        <View style={{ height: spacing[3] }} />
        <View style={styles.statsRow}>
          <StatCard
            value={formatCurrency(outstandingAdvance)}
            label="Total Advance"
            accentColor={outstandingAdvance > 0 ? colors.warning[500] : undefined}
          />
          <View style={{ width: spacing[3] }} />
          <StatCard
            value={netPayDisplay}
            label={netPayLabel}
            accentColor={isFullySettledWeekly ? (isDark ? themeColors.textMuted : colors.neutral[500]) : colors.success[600]}
          />
        </View>
      </View>

      {/* WEEKLY ATTENDANCE STRIP */}
      <Text style={[styles.sectionTitle, isDark && { color: themeColors.textSecondary }]}>WEEKLY ATTENDANCE STRIP</Text>
      <Card style={styles.stripCard}>
        <View style={styles.stripRow}>
          {weekDays.map((day) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const record = weeklyAttendance[dateStr];
            const dayName = format(day, 'EEE');
            const dayNum = format(day, 'dd');
            const isTodayDate = isSameDay(day, new Date());

            let badgeText = '-';
            let badgeBg = isDark ? themeColors.surface : colors.neutral[100];
            let badgeColor = isDark ? themeColors.textMuted : colors.neutral[400];

            if (record) {
              if (record.status === 'present') {
                badgeText = 'P';
                badgeBg = isDark ? 'rgba(74, 222, 128, 0.2)' : colors.success[200];
                badgeColor = isDark ? '#4ADE80' : colors.success[800];
              } else if (record.status === 'half_day') {
                badgeText = '½';
                badgeBg = isDark ? 'rgba(251, 191, 36, 0.2)' : colors.warning[200];
                badgeColor = isDark ? '#FBBF24' : colors.warning[800];
              } else if (record.status === 'absent') {
                badgeText = 'A';
                badgeBg = isDark ? 'rgba(248, 113, 113, 0.2)' : colors.danger[200];
                badgeColor = isDark ? '#F87171' : colors.danger[700];
              } else if (record.status === 'holiday') {
                badgeText = 'HOL';
                badgeBg = isDark ? 'rgba(96, 165, 250, 0.2)' : colors.primary[100];
                badgeColor = isDark ? '#60A5FA' : colors.primary[800];
              } else if (record.status === 'leave') {
                badgeText = 'L';
                badgeBg = isDark ? themeColors.border : colors.neutral[200];
                badgeColor = isDark ? themeColors.textSecondary : colors.neutral[700];
              }
            }

            return (
              <View key={dateStr} style={[
                styles.stripDayItem,
                isTodayDate && (isDark ? { backgroundColor: 'rgba(59, 130, 246, 0.2)', borderWidth: 1, borderColor: colors.primary[500] } : styles.stripToday),
              ]}>
                <Text style={[styles.stripDayName, isDark && { color: themeColors.textMuted }]}>{dayName}</Text>
                <Text style={[styles.stripDayNum, isDark && { color: themeColors.text }]}>{dayNum}</Text>
                <View style={[styles.statusBadge, { backgroundColor: badgeBg }]}>
                  <Text style={[styles.statusBadgeText, { color: badgeColor }]}>{badgeText}</Text>
                </View>
                {record?.overtime_hours ? (
                  <Text style={[styles.otBadge, isDark && { color: '#60A5FA' }]}>+{record.overtime_hours}h</Text>
                ) : (
                  <View style={{ height: 14 }} />
                )}
              </View>
            );
          })}
        </View>
      </Card>

      {/* MONTHLY CALENDAR GRID */}
      <Text style={[styles.sectionTitle, isDark && { color: themeColors.textSecondary }]}>MONTHLY ATTENDANCE CALENDAR</Text>
      <Card style={styles.calendarCard}>
        {/* Month Selector Bar */}
        <View style={[styles.monthHeader, isDark && { borderBottomColor: themeColors.border }]}>
          <TouchableOpacity
            onPress={() => setCalendarMonth(subMonths(calendarMonth, 1))}
            style={styles.monthArrow}
          >
            <Ionicons name="chevron-back" size={20} color={colors.primary[500]} />
          </TouchableOpacity>
          <Text style={[styles.monthTitle, isDark && { color: themeColors.text }]}>{format(calendarMonth, 'MMMM yyyy')}</Text>
          <TouchableOpacity
            onPress={() => setCalendarMonth(addMonths(calendarMonth, 1))}
            style={styles.monthArrow}
          >
            <Ionicons name="chevron-forward" size={20} color={colors.primary[500]} />
          </TouchableOpacity>
        </View>

        {/* Monthly Summary Badges */}
        <View style={styles.monthlySummaryRow}>
          <View style={[styles.summaryPill, { backgroundColor: isDark ? 'rgba(74, 222, 128, 0.15)' : colors.success[50] }]}>
            <Text style={[styles.summaryPillVal, { color: isDark ? '#4ADE80' : colors.success[700] }]}>{monthP}</Text>
            <Text style={[styles.summaryPillLbl, isDark && { color: themeColors.textMuted }]}>Present</Text>
          </View>
          <View style={[styles.summaryPill, { backgroundColor: isDark ? 'rgba(251, 191, 36, 0.15)' : colors.warning[50] }]}>
            <Text style={[styles.summaryPillVal, { color: isDark ? '#FBBF24' : colors.warning[700] }]}>{monthH}</Text>
            <Text style={[styles.summaryPillLbl, isDark && { color: themeColors.textMuted }]}>Half-Day</Text>
          </View>
          <View style={[styles.summaryPill, { backgroundColor: isDark ? 'rgba(248, 113, 113, 0.15)' : colors.danger[50] }]}>
            <Text style={[styles.summaryPillVal, { color: isDark ? '#F87171' : colors.danger[700] }]}>{monthA}</Text>
            <Text style={[styles.summaryPillLbl, isDark && { color: themeColors.textMuted }]}>Absent</Text>
          </View>
          <View style={[styles.summaryPill, { backgroundColor: isDark ? 'rgba(96, 165, 250, 0.15)' : colors.primary[50] }]}>
            <Text style={[styles.summaryPillVal, { color: isDark ? '#60A5FA' : colors.primary[700] }]}>{monthOT}h</Text>
            <Text style={[styles.summaryPillLbl, isDark && { color: themeColors.textMuted }]}>Overtime</Text>
          </View>
        </View>

        {/* Days of Week Header */}
        <View style={styles.calendarWeekRow}>
          {weekDayHeaders.map((dayInitial) => (
            <Text key={dayInitial} style={[styles.calendarWeekHeader, isDark && { color: themeColors.textMuted }]}>
              {dayInitial}
            </Text>
          ))}
        </View>

        {/* Grid Days */}
        {monthlyLoading ? (
          <ActivityIndicator size="small" color={colors.primary[500]} style={{ marginVertical: 20 }} />
        ) : (
          <View style={styles.calendarGrid}>
            {calendarWeeks.map((week, wIdx) => (
              <View key={wIdx} style={styles.calendarWeekRow}>
                {week.map((d) => {
                  const dateKey = format(d, 'yyyy-MM-dd');
                  const inMonth = isSameMonth(d, calendarMonth);
                  const rec = monthlyAttendance[dateKey];
                  const isToday = isSameDay(d, new Date());

                  let dotColor: string | null = null;
                  if (rec) {
                    if (rec.status === 'present') dotColor = isDark ? '#4ADE80' : colors.success[500];
                    else if (rec.status === 'half_day') dotColor = isDark ? '#FBBF24' : colors.warning[500];
                    else if (rec.status === 'absent') dotColor = isDark ? '#F87171' : colors.danger[500];
                    else if (rec.status === 'holiday') dotColor = isDark ? '#60A5FA' : colors.primary[500];
                    else if (rec.status === 'leave') dotColor = isDark ? themeColors.textMuted : colors.neutral[500];
                  }

                  return (
                    <View
                      key={dateKey}
                      style={[
                        styles.calendarDayCell,
                        isToday && (isDark ? { backgroundColor: 'rgba(59, 130, 246, 0.2)', borderWidth: 1, borderColor: colors.primary[500] } : styles.todayCell),
                      ]}
                    >
                      <Text
                        style={[
                          styles.calendarDayNum,
                          isDark && { color: themeColors.text },
                          !inMonth && (isDark ? { color: themeColors.textMuted, opacity: 0.3 } : styles.dayNumDimmed),
                          isToday && (isDark ? { color: '#60A5FA' } : styles.todayNumText),
                        ]}
                      >
                        {format(d, 'd')}
                      </Text>
                      {inMonth && dotColor && (
                        <View style={[styles.statusDot, { backgroundColor: dotColor }]} />
                      )}
                      {inMonth && !dotColor && <View style={styles.emptyDot} />}
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        )}
      </Card>

      {/* Details */}
      <Text style={[styles.sectionTitle, isDark && { color: themeColors.textSecondary }]}>DETAILS</Text>
      <Card style={styles.detailsCard}>
        <DetailRow
          label="Daily Wage"
          value={worker.daily_wage > 0 ? formatCurrency(worker.daily_wage) + '/day' : 'Not set'}
        />
        <Divider style={{ marginVertical: spacing[2] }} />
        <DetailRow
          label="Overtime Rate"
          value={worker.overtime_rate > 0 ? formatCurrency(worker.overtime_rate) + '/hour' : 'Standard'}
        />
        <Divider style={{ marginVertical: spacing[2] }} />
        <DetailRow
          label="Overtime Type"
          value={worker.overtime_type === 'per_hour' ? 'Per Hour' : 'Multiplier'}
        />
        <Divider style={{ marginVertical: spacing[2] }} />
        <DetailRow label="Payment Settlement" value="Weekly" />
        {worker.notes && (
          <>
            <Divider style={{ marginVertical: spacing[2] }} />
            <DetailRow label="Notes" value={worker.notes} />
          </>
        )}
      </Card>

      {/* Recent Activity */}
      <Text style={[styles.sectionTitle, isDark && { color: themeColors.textSecondary }]}>RECENT ACTIVITY</Text>
      <Card style={styles.detailsCard}>
        {recentActivity.length === 0 ? (
          <Text style={[styles.noActivity, isDark && { color: themeColors.textMuted }]}>No activity yet</Text>
        ) : (
          recentActivity.map((log, index) => (
            <View key={log.id}>
              <View style={styles.activityItem}>
                <View style={[styles.activityDot, isDark && { backgroundColor: colors.primary[500] }]} />
                <View style={styles.activityContent}>
                  <Text style={[styles.activityAction, isDark && { color: themeColors.text }]}>{log.action.replace(/_/g, ' ')}</Text>
                  <Text style={[styles.activityTime, isDark && { color: themeColors.textMuted }]}>{formatRelativeTime(log.created_at)}</Text>
                </View>
              </View>
              {index < recentActivity.length - 1 && <Divider style={{ marginLeft: 20 }} />}
            </View>
          ))
        )}
      </Card>

      {/* Actions */}
      <View style={styles.actions}>
        <Button
          title="Edit Worker Profile"
          onPress={() => navigation.navigate('AddWorker', { workerId: worker.id })}
          variant="secondary"
          fullWidth
          icon="pencil"
          style={{ marginBottom: spacing[3] }}
        />
        <Button
          title="Delete Worker"
          onPress={handleDeleteWorkerClick}
          variant="danger"
          fullWidth
          icon="trash-outline"
        />
      </View>

      {/* Delete Worker PIN Confirmation Modal */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setDeleteModalVisible(false)}
          />
          <View style={[styles.modalContent, { maxWidth: 360 }, isDark && { backgroundColor: themeColors.card }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="trash" size={24} color={colors.danger[500]} />
                <Text style={[styles.modalTitle, { color: colors.danger[500] }]}>Delete Worker</Text>
              </View>
              <TouchableOpacity onPress={() => setDeleteModalVisible(false)}>
                <Ionicons name="close" size={24} color={isDark ? themeColors.textSecondary : colors.neutral[500]} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalDesc, isDark && { color: themeColors.textSecondary }]}>
              This will permanently delete {worker.name} and all associated attendance records, advances, and salary history. Enter your 4-digit App PIN to confirm.
            </Text>

            <TextInput
              label="Enter 4-Digit App PIN"
              placeholder="••••"
              value={deletePin}
              onChangeText={(t) => {
                setDeletePin(t);
                setDeletePinError('');
              }}
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
              autoFocus
              error={deletePinError}
              containerStyle={{ marginBottom: spacing[4] }}
            />

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Button
                title="Cancel"
                variant="secondary"
                onPress={() => setDeleteModalVisible(false)}
                style={{ flex: 1 }}
              />
              <Button
                title={isDeleting ? 'Deleting...' : 'Delete Worker'}
                variant="danger"
                onPress={handleConfirmDeleteWithPin}
                disabled={deletePin.length !== 4 || isDeleting}
                loading={isDeleting}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  const { isDark, themeColors } = useAppStore();
  return (
    <View style={styles.detailRow}>
      <Text style={[styles.detailLabel, isDark && { color: themeColors.textSecondary }]}>{label}</Text>
      <Text style={[styles.detailValue, isDark && { color: themeColors.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: spacing[5],
    paddingHorizontal: spacing[4],
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  workerName: {
    ...typography.h2,
    color: colors.neutral[900],
    marginTop: spacing[3],
  },
  workerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[1],
    marginBottom: spacing[2],
  },
  workerId: {
    ...typography.caption,
    color: colors.neutral[500],
    fontWeight: '600',
  },
  workerCategory: {
    ...typography.caption,
    color: colors.neutral[500],
  },
  badgeWrapper: {
    marginBottom: spacing[2],
  },
  phoneLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    marginTop: spacing[1],
  },
  phoneText: {
    ...typography.bodySmall,
    color: colors.primary[600],
    fontWeight: '500',
  },
  joiningDate: {
    ...typography.caption,
    color: colors.neutral[400],
    marginTop: spacing[1],
  },
  sectionTitle: {
    ...typography.overline,
    color: colors.neutral[500],
    marginHorizontal: spacing[4],
    marginTop: spacing[6],
    marginBottom: spacing[2],
  },
  statsGrid: {
    paddingHorizontal: spacing[4],
  },
  statsRow: {
    flexDirection: 'row',
  },
  stripCard: {
    marginHorizontal: spacing[4],
    padding: spacing[3],
  },
  stripRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stripDayItem: {
    alignItems: 'center',
    flex: 1,
    paddingVertical: 4,
    borderRadius: borderRadius.md,
  },
  stripToday: {
    backgroundColor: colors.primary[50],
    borderWidth: 1,
    borderColor: colors.primary[200],
  },
  stripDayName: {
    ...typography.caption,
    fontSize: 10,
    color: colors.neutral[500],
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  stripDayNum: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: colors.neutral[800],
    marginVertical: 2,
  },
  statusBadge: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  otBadge: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.primary[600],
    marginTop: 2,
  },
  calendarCard: {
    marginHorizontal: spacing[4],
    padding: spacing[3],
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  monthArrow: {
    padding: spacing[2],
    borderRadius: borderRadius.sm,
  },
  monthTitle: {
    ...typography.body,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  monthlySummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: spacing[3],
    gap: spacing[2],
  },
  summaryPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: borderRadius.md,
  },
  summaryPillVal: {
    fontSize: 14,
    fontWeight: '800',
  },
  summaryPillLbl: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.neutral[500],
    textTransform: 'uppercase',
    marginTop: 1,
  },
  calendarWeekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  calendarWeekHeader: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: colors.neutral[400],
  },
  calendarGrid: {
    width: '100%',
  },
  calendarDayCell: {
    flex: 1,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 1,
    marginVertical: 2,
    borderRadius: 6,
  },
  todayCell: {
    borderWidth: 1,
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
  },
  calendarDayNum: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.neutral[800],
  },
  dayNumDimmed: {
    color: colors.neutral[300],
  },
  todayNumText: {
    color: colors.primary[700],
    fontWeight: '700',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 3,
  },
  emptyDot: {
    width: 6,
    height: 6,
    marginTop: 3,
  },
  detailsCard: {
    marginHorizontal: spacing[4],
    padding: spacing[4],
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[1],
  },
  detailLabel: {
    ...typography.bodySmall,
    color: colors.neutral[500],
  },
  detailValue: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.neutral[900],
    maxWidth: '60%',
    textAlign: 'right',
  },
  noActivity: {
    ...typography.caption,
    color: colors.neutral[400],
    textAlign: 'center',
    paddingVertical: spacing[4],
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[2],
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary[500],
    marginRight: spacing[3],
  },
  activityContent: {
    flex: 1,
  },
  activityAction: {
    ...typography.bodySmall,
    color: colors.neutral[900],
    textTransform: 'capitalize',
  },
  activityTime: {
    ...typography.caption,
    color: colors.neutral[400],
  },
  actions: {
    paddingHorizontal: spacing[4],
    marginTop: spacing[6],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[4],
  },
  modalContent: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    ...shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  modalTitle: {
    ...typography.h3,
    color: colors.neutral[900],
  },
  modalDesc: {
    ...typography.bodySmall,
    color: colors.neutral[600],
    marginBottom: spacing[3],
  },
});
