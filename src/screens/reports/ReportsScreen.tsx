// Worker WageBook - Reports Screen

import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography, shadows } from '../../constants/theme';
import { Card } from '../../components/ui';
import { useAppStore } from '../../stores/appStore';

interface ReportItem {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

export function ReportsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { isDark, themeColors } = useAppStore();
  const reports: ReportItem[] = [
    {
      id: 'weekly-statement',
      title: 'Weekly Salary Statement',
      description: 'Detailed salary breakdown for all workers',
      icon: 'document-text-outline',
      color: colors.primary[500],
    },
    {
      id: 'attendance-register',
      title: 'Attendance Register',
      description: 'Daily attendance for all workers',
      icon: 'calendar-outline',
      color: colors.success[500],
    },
    {
      id: 'outstanding-advances',
      title: 'Outstanding Advances',
      description: 'Unrecovered advance balances',
      icon: 'cash-outline',
      color: colors.warning[500],
    },
    {
      id: 'cashbook',
      title: 'Cashbook',
      description: 'All cash transactions',
      icon: 'book-outline',
      color: colors.info[500],
    },
    {
      id: 'worker-summary',
      title: 'Worker Summary',
      description: 'Complete worker profiles, roster, and history',
      icon: 'people-outline',
      color: colors.neutral[600],
    },
    {
      id: 'weekly-audit',
      title: 'Weekly Audit Trail',
      description: 'System actions, edits, and compliance audit trail',
      icon: 'shield-checkmark-outline',
      color: colors.primary[600],
    },
  ];

  const handleReportPress = (reportId: string) => {
    switch (reportId) {
      case 'weekly-statement':
        navigation.navigate('WeeklyReport');
        break;
      case 'attendance-register':
        navigation.navigate('AttendanceReport');
        break;
      case 'outstanding-advances':
        navigation.navigate('AdvancesReport');
        break;
      case 'cashbook':
        navigation.navigate('CashbookReport');
        break;
      case 'worker-summary':
        navigation.navigate('WorkerSummaryReport');
        break;
      case 'weekly-audit':
        navigation.navigate('WeeklyAuditReport');
        break;
    }
  };

  return (
    <ScrollView style={[styles.container, isDark && { backgroundColor: themeColors.background }]}>
      <View style={[styles.content, { paddingTop: Math.max(insets.top, spacing[4]) }]}>
        <Text style={[styles.pageTitle, isDark && { color: themeColors.text }]}>Reports</Text>
        <Text style={[styles.pageDescription, isDark && { color: themeColors.textSecondary }]}>
          Generate and export detailed reports for your business
        </Text>

        {reports.map((report) => (
          <TouchableOpacity
            key={report.id}
            onPress={() => handleReportPress(report.id)}
            activeOpacity={0.7}
          >
            <Card style={[styles.reportCard, isDark && { backgroundColor: themeColors.card, borderColor: themeColors.cardBorder, borderWidth: 1 }]}>
              <View style={styles.reportContent}>
                <View style={[styles.reportIcon, { backgroundColor: report.color + (isDark ? '30' : '20') }]}>
                  <Ionicons name={report.icon} size={28} color={report.color} />
                </View>
                <View style={styles.reportInfo}>
                  <Text style={[styles.reportTitle, isDark && { color: themeColors.text }]}>{report.title}</Text>
                  <Text style={[styles.reportDescription, isDark && { color: themeColors.textSecondary }]}>{report.description}</Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color={isDark ? themeColors.textMuted : colors.neutral[400]} />
              </View>
            </Card>
          </TouchableOpacity>
        ))}
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
  pageTitle: {
    ...typography.h1,
    color: colors.neutral[900],
    marginBottom: spacing[2],
  },
  pageDescription: {
    ...typography.body,
    color: colors.neutral[600],
    marginBottom: spacing[6],
  },
  reportCard: {
    marginBottom: spacing[3],
    ...shadows.sm,
  },
  reportContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reportIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[4],
  },
  reportInfo: {
    flex: 1,
  },
  reportTitle: {
    ...typography.bodyLarge,
    fontWeight: '600',
    color: colors.neutral[900],
    marginBottom: spacing[1],
  },
  reportDescription: {
    ...typography.caption,
    color: colors.neutral[600],
  },
  infoCard: {
    marginTop: spacing[6],
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.info[50],
    borderWidth: 1,
    borderColor: colors.info[500],
  },
  infoText: {
    ...typography.bodySmall,
    color: colors.info[700],
    flex: 1,
    marginLeft: spacing[3],
    lineHeight: 20,
  },
});
