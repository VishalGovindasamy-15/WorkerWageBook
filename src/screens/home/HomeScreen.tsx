// Worker WageBook - Home Screen
// Comprehensive dashboard matching Blueprint 5.1

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Image,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { colors, spacing, typography, shadows } from '../../constants/theme';
import { StatCard, Card, SectionHeader } from '../../components/ui';
import { formatCurrency, formatRelativeTime, getWeekLabel } from '../../utils/helpers';
import { workerService } from '../../services/workerService';
import { auditService } from '../../services/auditService';
import { attendanceService } from '../../services/attendanceService';
import { advanceService } from '../../services/advanceService';
import { salaryService } from '../../services/salaryService';
import { useAppStore } from '../../stores/appStore';
import { AuditLog } from '../../types';

export function HomeScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === 'web' ? spacing[3] : Math.max(insets.top, 20);
  const { currentWeekDate, currentWeek, weekStartsOn, goToNextWeek, goToPreviousWeek, isDark, themeColors } = useAppStore();
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalWorkers: 0,
    activeWorkers: 0,
    presentToday: 0,
    advancesThisWeek: 0,
    salaryPending: 0,
  });
  const [todayStats, setTodayStats] = useState({
    present: 0,
    half_day: 0,
    absent: 0,
    leave: 0,
  });
  const [recentActivity, setRecentActivity] = useState<AuditLog[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [currentWeek.start, currentWeek.end, currentWeekDate])
  );

  const loadData = async () => {
    try {
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      
      const [
        activeCount,
        totalCount,
        recent,
        todayAttendance,
        weekAdvances,
        weekSettlements,
      ] = await Promise.all([
        workerService.getCount(true),
        workerService.getCount(),
        auditService.getRecent(5),
        attendanceService.getStatsForDate(todayStr),
        advanceService.getAll({
          date_from: currentWeek.start,
          date_to: currentWeek.end,
        }),
        salaryService.getForWeek(currentWeek.start, currentWeek.end),
      ]);

      const advancesSum = weekAdvances.reduce((sum, a) => sum + (a.amount || 0), 0);

      // Calculate pending salary for unsettled workers this week
      let pendingSalarySum = 0;
      try {
        const calcs = await salaryService.calculateForAllWorkers(currentWeek.start, currentWeek.end);
        const settledIds = new Set(weekSettlements.map((s) => s.worker_id));
        pendingSalarySum = calcs
          .filter((c) => !settledIds.has(c.worker_id))
          .reduce((sum, c) => sum + Math.max(0, c.net_pay || 0), 0);
      } catch (err) {
        console.warn('Could not calculate pending salary:', err);
      }

      setStats({
        totalWorkers: totalCount,
        activeWorkers: activeCount,
        presentToday: todayAttendance.present,
        advancesThisWeek: advancesSum,
        salaryPending: pendingSalarySum,
      });

      setTodayStats({
        present: todayAttendance.present,
        half_day: todayAttendance.half_day,
        absent: todayAttendance.absent,
        leave: todayAttendance.leave,
      });

      setRecentActivity(recent);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
  };

  const weekLabel = getWeekLabel(currentWeekDate, weekStartsOn);

  const getActionIcon = (action: string): keyof typeof Ionicons.glyphMap => {
    if (action.includes('attendance')) return 'calendar';
    if (action.includes('advance')) return 'cash';
    if (action.includes('salary')) return 'wallet';
    if (action.includes('worker')) return 'person';
    if (action.includes('category')) return 'pricetag';
    return 'information-circle';
  };

  const getActionColor = (action: string): string => {
    if (action.includes('attendance')) return colors.success[500];
    if (action.includes('advance')) return colors.primary[500];
    if (action.includes('salary')) return colors.warning[500];
    if (action.includes('worker')) return colors.info[500];
    return colors.neutral[500];
  };

  const getActionLabel = (log: AuditLog): string => {
    const labels: Record<string, string> = {
      attendance_marked: 'Attendance Marked',
      attendance_edited: 'Attendance Edited',
      advance_added: 'Advance Recorded',
      advance_reversed: 'Advance Reversed',
      salary_settled: 'Salary Settled',
      worker_created: 'Worker Added',
      worker_edited: 'Worker Updated',
      worker_deactivated: 'Worker Deactivated',
      worker_reactivated: 'Worker Reactivated',
      worker_deleted: 'Worker Deleted',
      category_created: 'Category Created',
    };
    return labels[log.action] || log.action.replace(/_/g, ' ');
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      {/* App Bar */}
      <View style={[styles.appBar, { paddingTop: topPadding, backgroundColor: themeColors.headerBg, borderBottomColor: themeColors.border }]}>
        <View style={styles.appBarLeft}>
          <Image
            source={require('../../../assets/logo.png')}
            style={styles.appBarLogo}
            resizeMode="contain"
          />
          <Text style={[styles.appBarTitle, { color: themeColors.text }]}>Worker WageBook</Text>
        </View>
        <View style={styles.appBarRight}>
          <TouchableOpacity
            onPress={() => navigation.navigate('ActivityLogs')}
            style={styles.appBarButton}
            accessibilityLabel="Activity Logs"
          >
            <Ionicons name="notifications-outline" size={22} color={isDark ? themeColors.text : colors.neutral[700]} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('Settings')}
            style={styles.appBarButton}
            accessibilityLabel="Settings"
          >
            <Ionicons name="settings-outline" size={22} color={isDark ? themeColors.text : colors.neutral[700]} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Week Selector with Navigation Controls */}
        <Card style={styles.weekCard} padding={spacing[3]}>
          <TouchableOpacity
            onPress={goToPreviousWeek}
            style={[styles.weekArrow, isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.border, borderWidth: 1 }]}
            activeOpacity={0.7}
            accessibilityLabel="Previous week"
          >
            <Ionicons name="chevron-back" size={22} color={colors.primary[500]} />
          </TouchableOpacity>
          <View style={styles.weekCenter}>
            <Text style={[styles.weekLabel, { color: themeColors.text }]}>{weekLabel}</Text>
          </View>
          <TouchableOpacity
            onPress={goToNextWeek}
            style={[styles.weekArrow, isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.border, borderWidth: 1 }]}
            activeOpacity={0.7}
            accessibilityLabel="Next week"
          >
            <Ionicons name="chevron-forward" size={22} color={colors.primary[500]} />
          </TouchableOpacity>
        </Card>

        {/* Stats Grid (2x2) */}
        <View style={styles.statsGrid}>
          <View style={styles.statsRow}>
            <StatCard
              value={String(stats.activeWorkers)}
              label="Active Workers"
              accentColor={colors.primary[500]}
            />
            <View style={{ width: spacing[3] }} />
            <StatCard
              value={String(stats.presentToday)}
              label="Present Today"
              accentColor={colors.success[500]}
            />
          </View>
          <View style={{ height: spacing[3] }} />
          <View style={styles.statsRow}>
            <StatCard
              value={formatCurrency(stats.advancesThisWeek)}
              label="Week Advances"
              accentColor={colors.warning[500]}
            />
            <View style={{ width: spacing[3] }} />
            <StatCard
              value={formatCurrency(stats.salaryPending)}
              label="Salary Pending"
              accentColor={colors.danger[500]}
            />
          </View>
        </View>

        {/* Quick Actions (Blueprint 5.1) */}
        <SectionHeader title="QUICK ACTIONS" />
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={[
              styles.quickActionCard,
              isDark && { backgroundColor: themeColors.card, borderColor: themeColors.cardBorder },
            ]}
            onPress={() => navigation.navigate('AttendanceTab')}
            activeOpacity={0.7}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: isDark ? 'rgba(34, 197, 94, 0.2)' : colors.success[50] }]}>
              <Ionicons name="calendar" size={24} color={isDark ? '#4ADE80' : colors.success[600]} />
            </View>
            <View style={styles.quickActionContent}>
              <Text style={[styles.quickActionText, isDark && { color: themeColors.text }]}>Mark Attendance</Text>
              <Text style={[styles.quickActionSubtext, isDark && { color: themeColors.textSecondary }]}>Daily check-in for team</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={isDark ? themeColors.textMuted : colors.neutral[300]} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.quickActionCard,
              isDark && { backgroundColor: themeColors.card, borderColor: themeColors.cardBorder },
            ]}
            onPress={() => navigation.navigate('SalaryTab', { screen: 'RecordAdvance' })}
            activeOpacity={0.7}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : colors.primary[50] }]}>
              <Ionicons name="cash" size={24} color={isDark ? '#60A5FA' : colors.primary[600]} />
            </View>
            <View style={styles.quickActionContent}>
              <Text style={[styles.quickActionText, isDark && { color: themeColors.text }]}>Record Advance</Text>
              <Text style={[styles.quickActionSubtext, isDark && { color: themeColors.textSecondary }]}>Issue cash, UPI or bank advance</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={isDark ? themeColors.textMuted : colors.neutral[300]} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.quickActionCard,
              isDark && { backgroundColor: themeColors.card, borderColor: themeColors.cardBorder },
            ]}
            onPress={() => navigation.navigate('SalaryTab', { screen: 'WeeklySalary' })}
            activeOpacity={0.7}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: isDark ? 'rgba(234, 179, 8, 0.2)' : colors.warning[50] }]}>
              <Ionicons name="wallet" size={24} color={isDark ? '#FBBF24' : colors.warning[600]} />
            </View>
            <View style={styles.quickActionContent}>
              <Text style={[styles.quickActionText, isDark && { color: themeColors.text }]}>Settle Weekly Salary</Text>
              <Text style={[styles.quickActionSubtext, isDark && { color: themeColors.textSecondary }]}>Calculate & confirm payroll</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={isDark ? themeColors.textMuted : colors.neutral[300]} />
          </TouchableOpacity>
        </View>

        {/* Today's Summary (Blueprint 5.1) */}
        <SectionHeader title="TODAY'S SUMMARY" />
        <Card style={styles.todayCard}>
          <View style={styles.todayGrid}>
            <View style={styles.todayItem}>
              <Text style={[styles.todayLabel, isDark && { color: themeColors.textSecondary }]}>Present</Text>
              <Text style={[styles.todayValue, { color: isDark ? '#4ADE80' : colors.success[600] }]}>
                {todayStats.present}
              </Text>
            </View>
            <View style={[styles.todayDivider, isDark && { backgroundColor: themeColors.divider }]} />
            <View style={styles.todayItem}>
              <Text style={[styles.todayLabel, isDark && { color: themeColors.textSecondary }]}>Half-day</Text>
              <Text style={[styles.todayValue, { color: isDark ? '#FBBF24' : colors.warning[600] }]}>
                {todayStats.half_day}
              </Text>
            </View>
            <View style={[styles.todayDivider, isDark && { backgroundColor: themeColors.divider }]} />
            <View style={styles.todayItem}>
              <Text style={[styles.todayLabel, isDark && { color: themeColors.textSecondary }]}>Absent</Text>
              <Text style={[styles.todayValue, { color: isDark ? '#F87171' : colors.danger[600] }]}>
                {todayStats.absent}
              </Text>
            </View>
            <View style={[styles.todayDivider, isDark && { backgroundColor: themeColors.divider }]} />
            <View style={styles.todayItem}>
              <Text style={[styles.todayLabel, isDark && { color: themeColors.textSecondary }]}>Leave</Text>
              <Text style={[styles.todayValue, { color: isDark ? themeColors.textMuted : colors.neutral[600] }]}>
                {todayStats.leave}
              </Text>
            </View>
          </View>
        </Card>

        {/* Recent Activity */}
        <SectionHeader
          title="RECENT ACTIVITY"
          action="View all"
          onActionPress={() => navigation.navigate('ActivityLogs')}
        />
        <Card style={styles.activityCard}>
          {recentActivity.length === 0 ? (
            <Text style={[styles.noActivity, isDark && { color: themeColors.textMuted }]}>No activity recorded yet</Text>
          ) : (
            recentActivity.map((log, index) => (
              <View key={log.id}>
                <View style={styles.activityItem}>
                  <View
                    style={[
                      styles.activityIcon,
                      { backgroundColor: getActionColor(log.action) + (isDark ? '35' : '15') },
                    ]}
                  >
                    <Ionicons
                      name={getActionIcon(log.action)}
                      size={18}
                      color={getActionColor(log.action)}
                    />
                  </View>
                  <View style={styles.activityContent}>
                    <Text style={[styles.activityTitle, isDark && { color: themeColors.text }]}>{getActionLabel(log)}</Text>
                    <Text style={[styles.activityTime, isDark && { color: themeColors.textMuted }]}>
                      {formatRelativeTime(log.created_at)}
                    </Text>
                  </View>
                </View>
                {index < recentActivity.length - 1 && (
                  <View style={[styles.activityDivider, isDark && { backgroundColor: themeColors.divider }]} />
                )}
              </View>
            ))
          )}
        </Card>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  appBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingTop: Platform.OS === 'web' ? spacing[3] : 44,
    paddingBottom: spacing[3],
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  appBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  appBarLogo: {
    width: 32,
    height: 32,
  },
  appBarTitle: {
    ...typography.h3,
    color: colors.neutral[900],
  },
  appBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  appBarButton: {
    padding: spacing[2],
    borderRadius: 8,
  },
  content: {
    flex: 1,
  },
  weekCard: {
    marginHorizontal: spacing[4],
    marginTop: spacing[3],
    marginBottom: spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  weekArrow: {
    padding: spacing[2],
    borderRadius: 8,
    backgroundColor: colors.neutral[50],
  },
  weekCenter: {
    alignItems: 'center',
    flex: 1,
  },
  weekLabel: {
    ...typography.body,
    fontWeight: '600',
    color: colors.neutral[900],
    textAlign: 'center',
  },
  statsGrid: {
    paddingHorizontal: spacing[4],
  },
  statsRow: {
    flexDirection: 'row',
  },
  quickActions: {
    paddingHorizontal: spacing[4],
    gap: spacing[3],
  },
  quickActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing[4],
    ...shadows.sm,
    borderWidth: 1,
    borderColor: colors.neutral[100],
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[3],
  },
  quickActionContent: {
    flex: 1,
  },
  quickActionText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.neutral[900],
  },
  quickActionSubtext: {
    ...typography.caption,
    color: colors.neutral[500],
    marginTop: 2,
  },
  todayCard: {
    marginHorizontal: spacing[4],
    padding: spacing[3],
  },
  todayGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  todayItem: {
    flex: 1,
    alignItems: 'center',
  },
  todayLabel: {
    ...typography.caption,
    color: colors.neutral[500],
    marginBottom: 4,
  },
  todayValue: {
    ...typography.h3,
    fontWeight: '700',
  },
  todayDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.neutral[200],
  },
  activityCard: {
    marginHorizontal: spacing[4],
    marginBottom: spacing[4],
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[3],
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.neutral[900],
  },
  activityTime: {
    ...typography.caption,
    color: colors.neutral[400],
    marginTop: 2,
  },
  activityDivider: {
    height: 1,
    backgroundColor: colors.neutral[100],
    marginLeft: 48,
  },
  noActivity: {
    ...typography.bodySmall,
    color: colors.neutral[400],
    textAlign: 'center',
    paddingVertical: spacing[6],
  },
});
