// Worker WageBook - Placeholder Screens for Phase 1

import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, shadows } from '../constants/theme';
import { Card, EmptyState, Button } from '../components/ui';

// ============================================================
// ATTENDANCE SCREEN
// ============================================================
export function AttendanceScreen() {
  return (
    <View style={styles.container}>
      <EmptyState
        icon="calendar-outline"
        title="Attendance Module"
        description="Mark daily attendance for all workers. Coming in Phase 2."
        actionLabel="Go to Workers"
        onAction={() => {}}
      />
    </View>
  );
}

// ============================================================
// SALARY SCREEN
// ============================================================
export function SalaryScreen() {
  return (
    <View style={styles.container}>
      <EmptyState
        icon="wallet-outline"
        title="Salary Module"
        description="Calculate and settle weekly salary. Coming in Phase 2."
      />
    </View>
  );
}

// ============================================================
// REPORTS SCREEN (with Settings access)
// ============================================================
export function ReportsScreen({ navigation }: any) {
  const reports = [
    { icon: 'document-text', title: 'Weekly Salary Statement', desc: 'Per-worker breakdown', color: colors.primary[500] },
    { icon: 'receipt', title: 'Salary Payout Summary', desc: 'All workers, date range', color: colors.primary[500] },
    { icon: 'calendar', title: 'Daily Attendance Register', desc: 'Date-wise full team', color: colors.success[500] },
    { icon: 'people', title: 'Worker Attendance Summary', desc: 'Monthly per worker', color: colors.success[500] },
    { icon: 'cash', title: 'Outstanding Advances', desc: 'All unpaid balances', color: colors.warning[500] },
    { icon: 'book', title: 'Cashbook', desc: 'All transactions', color: colors.warning[500] },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>PAYROLL REPORTS</Text>
      </View>
      {reports.slice(0, 2).map((report, i) => (
        <TouchableOpacity key={i} style={styles.reportCard}>
          <View style={[styles.reportIcon, { backgroundColor: report.color + '15' }]}>
            <Ionicons name={report.icon as any} size={22} color={report.color} />
          </View>
          <View style={styles.reportInfo}>
            <Text style={styles.reportTitle}>{report.title}</Text>
            <Text style={styles.reportDesc}>{report.desc}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.neutral[300]} />
        </TouchableOpacity>
      ))}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>ATTENDANCE REPORTS</Text>
      </View>
      {reports.slice(2, 4).map((report, i) => (
        <TouchableOpacity key={i} style={styles.reportCard}>
          <View style={[styles.reportIcon, { backgroundColor: report.color + '15' }]}>
            <Ionicons name={report.icon as any} size={22} color={report.color} />
          </View>
          <View style={styles.reportInfo}>
            <Text style={styles.reportTitle}>{report.title}</Text>
            <Text style={styles.reportDesc}>{report.desc}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.neutral[300]} />
        </TouchableOpacity>
      ))}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>FINANCIAL REPORTS</Text>
      </View>
      {reports.slice(4).map((report, i) => (
        <TouchableOpacity key={i} style={styles.reportCard}>
          <View style={[styles.reportIcon, { backgroundColor: report.color + '15' }]}>
            <Ionicons name={report.icon as any} size={22} color={report.color} />
          </View>
          <View style={styles.reportInfo}>
            <Text style={styles.reportTitle}>{report.title}</Text>
            <Text style={styles.reportDesc}>{report.desc}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.neutral[300]} />
        </TouchableOpacity>
      ))}

      {/* Settings Button */}
      <View style={{ padding: spacing[4], marginTop: spacing[4] }}>
        <Button
          title="Settings"
          onPress={() => navigation.navigate('Settings')}
          variant="secondary"
          fullWidth
          icon="settings-outline"
        />
      </View>

      <View style={{ height: 80 }} />
    </ScrollView>
  );
}

// ============================================================
// SETTINGS SCREEN
// ============================================================
export function SettingsScreen({ navigation }: any) {
  const settingGroups = [
    {
      title: 'BUSINESS',
      items: [
        { label: 'Business Name', value: 'My Business', action: () => {} },
        { label: 'Default Wage Rate', value: 'Not set', action: () => {} },
        { label: 'Week Starts On', value: 'Monday', action: () => {} },
        { label: 'Overtime Default Rate', value: 'Not set', action: () => {} },
      ],
    },
    {
      title: 'CATEGORIES',
      items: [
        { label: 'Manage Worker Categories', value: '', action: () => navigation.navigate('CategoryManagement') },
      ],
    },
    {
      title: 'SECURITY',
      items: [
        { label: 'App Lock (PIN)', value: 'Enabled', action: () => {} },
        { label: 'Change PIN', value: '', action: () => {} },
      ],
    },
    {
      title: 'BACKUP AND RESTORE',
      items: [
        { label: 'Backup to Google Drive', value: 'Not connected', action: () => {} },
        { label: 'Restore from Google Drive', value: '', action: () => {} },
        { label: 'Auto-backup', value: 'Weekly', action: () => {} },
      ],
    },
    {
      title: 'DATA',
      items: [
        { label: 'Export All Data (CSV)', value: '', action: () => {} },
        { label: 'Import Workers (CSV)', value: '', action: () => {} },
      ],
    },
    {
      title: 'ABOUT',
      items: [
        { label: 'Version', value: '1.0.0', action: () => {} },
      ],
    },
  ];

  return (
    <ScrollView style={styles.container}>
      {settingGroups.map((group, gi) => (
        <View key={gi}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{group.title}</Text>
          </View>
          <Card style={styles.settingsCard} padding={0}>
            {group.items.map((item, ii) => (
              <TouchableOpacity
                key={ii}
                style={styles.settingsItem}
                onPress={item.action}
                activeOpacity={0.6}
              >
                <View>
                  <Text style={styles.settingsLabel}>{item.label}</Text>
                  {item.value ? (
                    <Text style={styles.settingsValue}>{item.value}</Text>
                  ) : null}
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.neutral[300]} />
              </TouchableOpacity>
            ))}
          </Card>
        </View>
      ))}
      <View style={{ height: 80 }} />
    </ScrollView>
  );
}

// ============================================================
// CATEGORY MANAGEMENT SCREEN
// ============================================================
export function CategoryManagementScreen() {
  return (
    <ScrollView style={styles.container}>
      <View style={{ padding: spacing[4] }}>
        <Text style={styles.infoText}>
          Categories help you classify and filter workers throughout the app.
        </Text>
        <Card style={{ marginTop: spacing[4] }}>
          <Text style={styles.comingSoon}>Category management UI coming in Phase 2</Text>
          <Text style={styles.infoSubtext}>
            Default categories: Mason, Sithal, Painter, Plumber, Electrician, Carpenter, Helper, Other
          </Text>
        </Card>
      </View>
    </ScrollView>
  );
}

// ============================================================
// SHARED STYLES
// ============================================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  sectionHeader: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    paddingBottom: spacing[2],
  },
  sectionTitle: {
    ...typography.overline,
    color: colors.neutral[500],
  },
  reportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    marginHorizontal: spacing[4],
    marginBottom: spacing[3],
    borderRadius: 12,
    padding: spacing[4],
    ...shadows.md,
  },
  reportIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[3],
  },
  reportInfo: {
    flex: 1,
  },
  reportTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.neutral[900],
  },
  reportDesc: {
    ...typography.caption,
    color: colors.neutral[500],
    marginTop: 2,
  },
  settingsCard: {
    marginHorizontal: spacing[4],
    marginBottom: spacing[3],
  },
  settingsItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  settingsLabel: {
    ...typography.body,
    color: colors.neutral[900],
  },
  settingsValue: {
    ...typography.bodySmall,
    color: colors.neutral[500],
    marginTop: 2,
  },
  infoText: {
    ...typography.bodySmall,
    color: colors.neutral[600],
  },
  infoSubtext: {
    ...typography.caption,
    color: colors.neutral[500],
    marginTop: spacing[2],
  },
  comingSoon: {
    ...typography.body,
    fontWeight: '600',
    color: colors.neutral[900],
  },
});
