// Worker WageBook - Weekly Salary Settlement Screen (Blueprint Section 5.9)

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Platform,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, typography, shadows, borderRadius } from '../../constants/theme';
import { Card, Button, Badge, Avatar } from '../../components/ui';
import { SalarySettlement, SettlementItem, Worker } from '../../types';
import { salaryService, SalaryCalculation } from '../../services/salaryService';
import { workerService } from '../../services/workerService';
import { pdfService } from '../../services/pdfService';
import { settingsService } from '../../services/settingsService';
import { useAppStore } from '../../stores/appStore';
import { formatCurrency, getWeekLabel } from '../../utils/helpers';

export function WeeklySalaryScreen({ navigation }: any) {
  const {
    currentWeekDate,
    currentWeek,
    weekStartsOn,
    goToPreviousWeek,
    goToNextWeek,
    showToast,
  } = useAppStore();

  const [calculations, setCalculations] = useState<SalaryCalculation[]>([]);
  const [settlements, setSettlements] = useState<SalarySettlement[]>([]);
  const [workersMap, setWorkersMap] = useState<Record<number, Worker>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedWorker, setExpandedWorker] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Status Filter: all | unsettled | settled
  const [statusFilter, setStatusFilter] = useState<'all' | 'unsettled' | 'settled'>('all');

  // Payment method selection per worker { [workerId]: 'cash' | 'upi' | 'bank_transfer' }
  const [workerPaymentMethod, setWorkerPaymentMethod] = useState<Record<number, 'cash' | 'upi' | 'bank_transfer'>>({});

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [currentWeek.start, currentWeek.end])
  );

  const loadData = async () => {
    setLoading(true);
    try {
      const [calcs, settls, allWorkers] = await Promise.all([
        salaryService.calculateForAllWorkers(currentWeek.start, currentWeek.end),
        salaryService.getForWeek(currentWeek.start, currentWeek.end),
        workerService.getAll({ sort_by: 'name' }),
      ]);

      const wMap: Record<number, Worker> = {};
      allWorkers.forEach((w) => {
        wMap[w.id] = w;
      });

      setCalculations(calcs);
      setSettlements(settls);
      setWorkersMap(wMap);
    } catch (error) {
      console.error('Failed to load salary data:', error);
      showToast('Failed to load salary data', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const weekLabel = getWeekLabel(currentWeekDate, weekStartsOn);

  const isWorkerSettled = (workerId: number): boolean => {
    return settlements.some((s) => s.worker_id === workerId);
  };

  const getSettlement = (workerId: number): SalarySettlement | undefined => {
    return settlements.find((s) => s.worker_id === workerId);
  };

  const handleSettleWorker = async (calc: SalaryCalculation) => {
    const method = workerPaymentMethod[calc.worker_id] || 'cash';
    const methodLabel = method === 'bank_transfer' ? 'Bank Transfer' : method.toUpperCase();

    const doSettle = async () => {
      try {
        await salaryService.settle(calc, method);
        showToast(`Salary settled for ${calc.worker_name}`, 'success');
        loadData();
      } catch (error: any) {
        if (Platform.OS === 'web') {
          window.alert(error.message || 'Failed to settle salary');
        } else {
          Alert.alert('Error', error.message || 'Failed to settle salary');
        }
      }
    };

    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        `Confirm Settlement for ${calc.worker_name}?\n\nNet Pay: ${formatCurrency(calc.net_pay)}\nPayment Method: ${methodLabel}`
      );
      if (confirmed) {
        await doSettle();
      }
      return;
    }

    Alert.alert(
      'Confirm Settlement',
      `Settle salary for ${calc.worker_name}?\n\nNet Pay: ${formatCurrency(calc.net_pay)}\nPayment Method: ${methodLabel}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm & Pay',
          onPress: doSettle,
        },
      ]
    );
  };

  const handleDownloadPayslip = async (calc: SalaryCalculation) => {
    try {
      const settlement = getSettlement(calc.worker_id);
      const worker = workersMap[calc.worker_id];
      const businessName = await settingsService.getBusinessName();
      await pdfService.generateWorkerPayslipPDF(
        calc,
        settlement,
        worker,
        currentWeek.start,
        currentWeek.end,
        businessName
      );
    } catch (error: any) {
      console.error('Payslip generation error:', error);
      if (Platform.OS === 'web') {
        window.alert(error.message || 'Failed to generate payslip');
      } else {
        Alert.alert('Error', error.message || 'Failed to generate payslip');
      }
    }
  };

  // Filter calculations by status and search query
  const filteredCalculations = calculations.filter((calc) => {
    const settled = isWorkerSettled(calc.worker_id);
    if (statusFilter === 'unsettled' && settled) return false;
    if (statusFilter === 'settled' && !settled) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const worker = workersMap[calc.worker_id];
      const nameMatch = calc.worker_name.toLowerCase().includes(q);
      const empIdMatch = worker?.employee_id?.toLowerCase().includes(q);
      if (!nameMatch && !empIdMatch) return false;
    }

    return true;
  });

  const totalGross = calculations.reduce((sum, c) => sum + c.gross_earnings, 0);
  const totalAdvances = calculations.reduce((sum, c) => sum + c.total_advances_recovered, 0);
  const totalNet = calculations.reduce((sum, c) => sum + c.net_pay, 0);
  const settledCount = settlements.length;

  const unsettledCalculations = calculations.filter(
    (calc) => !settlements.find((s) => s.worker_id === calc.worker_id)
  );
  const pendingNetTotal = unsettledCalculations.reduce((sum, c) => sum + c.net_pay, 0);

  return (
    <View style={styles.container}>
      {/* Week Selector Bar */}
      <View style={styles.weekSelectorWrapper}>
        <Card style={styles.weekCard} padding={spacing[3]}>
          <TouchableOpacity
            onPress={goToPreviousWeek}
            style={styles.weekArrow}
            activeOpacity={0.7}
            accessibilityLabel="Previous week"
          >
            <Ionicons name="chevron-back" size={22} color={colors.primary[600]} />
          </TouchableOpacity>
          <View style={styles.weekCenter}>
            <Text style={styles.weekLabel}>{weekLabel}</Text>
          </View>
          <TouchableOpacity
            onPress={goToNextWeek}
            style={styles.weekArrow}
            activeOpacity={0.7}
            accessibilityLabel="Next week"
          >
            <Ionicons name="chevron-forward" size={22} color={colors.primary[600]} />
          </TouchableOpacity>
        </Card>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={colors.neutral[400]} />
          <TextInput
            placeholder="Search workers by name or ID..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
            placeholderTextColor={colors.neutral[400]}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.neutral[400]} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Status Filter Chips */}
      <View style={styles.filtersSection}>
        <View style={styles.filterChipsRow}>
          <TouchableOpacity
            style={[styles.filterChip, statusFilter === 'all' && styles.filterChipActive]}
            onPress={() => setStatusFilter('all')}
          >
            <Text style={[styles.filterChipText, statusFilter === 'all' && styles.filterChipTextActive]}>
              All ({calculations.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, statusFilter === 'unsettled' && styles.filterChipActive]}
            onPress={() => setStatusFilter('unsettled')}
          >
            <Text style={[styles.filterChipText, statusFilter === 'unsettled' && styles.filterChipTextActive]}>
              Pending ({calculations.length - settledCount})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, statusFilter === 'settled' && styles.filterChipActive]}
            onPress={() => setStatusFilter('settled')}
          >
            <Text style={[styles.filterChipText, statusFilter === 'settled' && styles.filterChipTextActive]}>
              Settled ({settledCount})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: spacing[8] }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Week Summary Card */}
        <Card style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryTitle}>Week Summary</Text>
            <Badge
              label={`${settledCount}/${calculations.length} Settled`}
              variant={settledCount === calculations.length && calculations.length > 0 ? 'success' : 'info'}
              size="sm"
            />
          </View>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Earnings</Text>
              <Text style={styles.summaryValue}>{formatCurrency(totalGross)}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Advances Recovered</Text>
              <Text style={[styles.summaryValue, { color: colors.danger[600] }]}>
                -{formatCurrency(totalAdvances)}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Net Payable</Text>
              <Text style={[styles.summaryValue, { color: colors.success[700], fontWeight: '700' }]}>
                {formatCurrency(totalNet)}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Pending Payout</Text>
              <Text style={[styles.summaryValue, { color: pendingNetTotal > 0 ? colors.warning[700] : colors.neutral[500] }]}>
                {formatCurrency(pendingNetTotal)}
              </Text>
            </View>
          </View>
        </Card>

        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>WORKERS ({filteredCalculations.length})</Text>
        </View>

        {/* Empty state */}
        {filteredCalculations.length === 0 && !loading && (
          <Card style={styles.emptyCard}>
            <Ionicons name="people-outline" size={40} color={colors.neutral[300]} />
            <Text style={styles.emptyTitle}>No workers match your filter</Text>
            <Text style={styles.emptySubtitle}>Try changing the search query or status filter.</Text>
          </Card>
        )}

        {/* Workers List */}
        {filteredCalculations.map((calc) => {
          const settled = isWorkerSettled(calc.worker_id);
          const settlement = getSettlement(calc.worker_id);
          const expanded = expandedWorker === calc.worker_id;
          const worker = workersMap[calc.worker_id];
          const selectedMethod = workerPaymentMethod[calc.worker_id] || 'cash';

          return (
            <Card key={calc.worker_id} style={styles.workerCard}>
              {/* Worker Header */}
              <TouchableOpacity
                style={styles.workerHeader}
                onPress={() => setExpandedWorker(expanded ? null : calc.worker_id)}
                activeOpacity={0.7}
              >
                <Avatar name={calc.worker_name} size="md" />
                <View style={styles.workerInfo}>
                  <Text style={styles.workerName}>{calc.worker_name}</Text>
                  <Text style={styles.workerMeta}>
                    {worker?.employee_id ? `${worker.employee_id} · ` : ''}
                    {calc.days_worked}d {calc.half_days_worked > 0 ? `+ ${calc.half_days_worked}h` : ''}
                    {calc.overtime_hours > 0 ? ` · OT ${calc.overtime_hours}h` : ''}
                  </Text>
                </View>
                <View style={styles.workerAmount}>
                  <Text style={[styles.netPayAmount, settled && styles.settledAmount]}>
                    {formatCurrency(calc.net_pay)}
                  </Text>
                  {settled ? (
                    <Badge label="Settled" variant="success" size="sm" />
                  ) : (
                    <Badge label="Pending" variant="neutral" size="sm" />
                  )}
                </View>
                <Ionicons
                  name={expanded ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={colors.neutral[400]}
                />
              </TouchableOpacity>

              {/* Expanded Breakdown */}
              {expanded && (
                <View style={styles.breakdown}>
                  {/* Earnings */}
                  <View style={styles.breakdownSection}>
                    <Text style={styles.breakdownSectionTitle}>EARNINGS</Text>
                    {calc.line_items
                      .filter((item: SettlementItem) => item.amount > 0)
                      .map((item: SettlementItem, idx: number) => (
                        <View key={idx} style={styles.breakdownRow}>
                          <Text style={styles.breakdownDesc}>{item.description}</Text>
                          <Text style={[styles.breakdownAmount, { color: colors.success[600] }]}>
                            +{formatCurrency(item.amount)}
                          </Text>
                        </View>
                      ))}
                    <View style={styles.breakdownTotal}>
                      <Text style={styles.breakdownTotalLabel}>Gross Earnings</Text>
                      <Text style={styles.breakdownTotalAmount}>
                        {formatCurrency(calc.gross_earnings)}
                      </Text>
                    </View>
                  </View>

                  {/* Deductions */}
                  {calc.total_advances_recovered > 0 && (
                    <View style={styles.breakdownSection}>
                      <Text style={styles.breakdownSectionTitle}>DEDUCTIONS</Text>
                      {calc.line_items
                        .filter((item: SettlementItem) => item.amount < 0)
                        .map((item: SettlementItem, idx: number) => (
                          <View key={idx} style={styles.breakdownRow}>
                            <Text style={styles.breakdownDesc}>{item.description}</Text>
                            <Text style={[styles.breakdownAmount, { color: colors.danger[600] }]}>
                              {formatCurrency(item.amount)}
                            </Text>
                          </View>
                        ))}
                    </View>
                  )}

                  {/* Net Payable */}
                  <View style={styles.netPayRow}>
                    <Text style={styles.netPayLabel}>NET PAYABLE</Text>
                    <Text style={styles.netPayValue}>{formatCurrency(calc.net_pay)}</Text>
                  </View>

                  {/* Carry-forward Notice */}
                  {calc.carry_forward_advance > 0 && (
                    <View style={styles.carryForward}>
                      <Ionicons name="information-circle" size={16} color={colors.warning[600]} />
                      <Text style={styles.carryForwardText}>
                        Advance carry-forward: {formatCurrency(calc.carry_forward_advance)}
                      </Text>
                    </View>
                  )}

                  {/* Settlement Action or Status */}
                  {settled ? (
                    <View style={styles.settledInfoBox}>
                      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
                        <Ionicons name="checkmark-circle" size={18} color={colors.success[600]} />
                        <Text style={styles.settledInfoText}>
                          Settled on {settlement?.confirmed_at ? settlement.confirmed_at.split('T')[0] : 'Locked'} via{' '}
                          {settlement?.payment_method?.toUpperCase() || 'CASH'}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.downloadPayslipBtn}
                        onPress={() => handleDownloadPayslip(calc)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="document-text-outline" size={16} color={colors.primary[600]} />
                        <Text style={styles.downloadPayslipText}>Payslip PDF</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.settleActionBox}>
                      <Text style={styles.methodLabel}>Payment Method</Text>
                      <View style={styles.methodRow}>
                        {(['cash', 'upi', 'bank_transfer'] as const).map((method) => {
                          const isSelected = selectedMethod === method;
                          const label = method === 'bank_transfer' ? 'Bank' : method.toUpperCase();
                          return (
                            <TouchableOpacity
                              key={method}
                              style={[styles.methodChip, isSelected && styles.methodChipSelected]}
                              onPress={() =>
                                setWorkerPaymentMethod((prev) => ({
                                  ...prev,
                                  [calc.worker_id]: method,
                                }))
                              }
                            >
                              <Text style={[styles.methodChipText, isSelected && styles.methodChipTextSelected]}>
                                {label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>

                      <Button
                        title="Confirm and Pay"
                        onPress={() => handleSettleWorker(calc)}
                        fullWidth
                        style={{ marginTop: spacing[3] }}
                      />
                    </View>
                  )}
                </View>
              )}
            </Card>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  weekSelectorWrapper: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    paddingBottom: spacing[1],
  },
  weekCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderColor: colors.neutral[200],
    borderWidth: 1,
  },
  weekArrow: {
    padding: spacing[2],
    borderRadius: borderRadius.md,
  },
  weekCenter: {
    alignItems: 'center',
  },
  weekLabel: {
    ...typography.body,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  searchContainer: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    paddingBottom: spacing[1],
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: spacing[3],
    paddingVertical: Platform.OS === 'ios' ? spacing[2] : 6,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    gap: spacing[2],
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.neutral[900],
    padding: 0,
  },
  content: {
    flex: 1,
  },
  filtersSection: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
  },
  filterChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  filterChip: {
    paddingHorizontal: spacing[3],
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.neutral[300],
  },
  filterChipActive: {
    backgroundColor: colors.primary[50],
    borderColor: colors.primary[500],
  },
  filterChipText: {
    ...typography.caption,
    fontWeight: '500',
    color: colors.neutral[600],
  },
  filterChipTextActive: {
    color: colors.primary[700],
    fontWeight: '600',
  },
  summaryCard: {
    marginHorizontal: spacing[4],
    marginTop: spacing[2],
    marginBottom: spacing[2],
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  summaryTitle: {
    ...typography.h3,
    color: colors.neutral[900],
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
  },
  summaryItem: {
    flex: 1,
    minWidth: '45%',
  },
  summaryLabel: {
    ...typography.caption,
    color: colors.neutral[500],
    marginBottom: 2,
  },
  summaryValue: {
    ...typography.h3,
    color: colors.neutral[900],
  },
  sectionHeader: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    paddingBottom: spacing[1],
  },
  sectionTitle: {
    ...typography.overline,
    color: colors.neutral[500],
  },
  emptyCard: {
    marginHorizontal: spacing[4],
    padding: spacing[8],
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.neutral[700],
    marginTop: spacing[3],
  },
  emptySubtitle: {
    ...typography.bodySmall,
    color: colors.neutral[400],
    marginTop: spacing[1],
    textAlign: 'center',
  },
  workerCard: {
    marginHorizontal: spacing[4],
    marginBottom: spacing[3],
  },
  workerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
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
  workerMeta: {
    ...typography.caption,
    color: colors.neutral[500],
    marginTop: 2,
  },
  workerAmount: {
    alignItems: 'flex-end',
    marginRight: spacing[2],
  },
  netPayAmount: {
    ...typography.bodyLarge,
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: 2,
  },
  settledAmount: {
    color: colors.success[700],
  },
  breakdown: {
    marginTop: spacing[3],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
  },
  breakdownSection: {
    marginBottom: spacing[3],
  },
  breakdownSectionTitle: {
    ...typography.overline,
    color: colors.neutral[500],
    marginBottom: spacing[1],
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  breakdownDesc: {
    ...typography.bodySmall,
    color: colors.neutral[600],
  },
  breakdownAmount: {
    ...typography.bodySmall,
    fontWeight: '600',
  },
  breakdownTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  netPayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing[3],
    paddingTop: spacing[3],
    borderTopWidth: 2,
    borderTopColor: colors.neutral[300],
  },
  netPayLabel: {
    ...typography.bodyLarge,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  netPayValue: {
    ...typography.h3,
    color: colors.success[700],
    fontWeight: '700',
  },
  carryForward: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginTop: spacing[2],
    padding: spacing[2],
    backgroundColor: colors.warning[50],
    borderRadius: borderRadius.sm,
  },
  carryForwardText: {
    ...typography.caption,
    color: colors.warning[800],
    flex: 1,
  },
  settledInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing[3],
    padding: spacing[3],
    backgroundColor: colors.success[50],
    borderRadius: borderRadius.md,
    gap: spacing[2],
  },
  settledInfoText: {
    ...typography.bodySmall,
    color: colors.success[800],
    fontWeight: '500',
    flex: 1,
  },
  downloadPayslipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.white,
    paddingHorizontal: spacing[3],
    paddingVertical: 6,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary[200],
  },
  downloadPayslipText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.primary[700],
  },
  settleActionBox: {
    marginTop: spacing[3],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
  },
  methodLabel: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.neutral[600],
    marginBottom: spacing[2],
  },
  methodRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  methodChip: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.neutral[300],
    backgroundColor: colors.white,
  },
  methodChipSelected: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
  },
  methodChipText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.neutral[600],
  },
  methodChipTextSelected: {
    color: colors.primary[700],
  },
});
