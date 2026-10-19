// Worker WageBook - Attendance Marking Screen

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { format } from 'date-fns';
import { colors, spacing, typography, shadows } from '../../constants/theme';
import { Avatar, Card, TextInput } from '../../components/ui';
import { AttendanceStatus, Worker } from '../../types';
import { workerService } from '../../services/workerService';
import { attendanceService } from '../../services/attendanceService';
import { parseDbTimestamp } from '../../utils/helpers';
import { useAppStore } from '../../stores/appStore';

interface WorkerAttendance {
  worker: Worker;
  status: AttendanceStatus | null;
  leave_type?: 'paid' | 'unpaid';
  overtime_hours: string;
  overtime_amount: string;
  overtime_type: 'calculated' | 'manual';
  marked_at?: string;
}

export function AttendanceScreen({ navigation }: any) {
  const { showToast } = useAppStore();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [workers, setWorkers] = useState<WorkerAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'unmarked'>('active');
  const [searchQuery, setSearchQuery] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [selectedDate, filter])
  );

  const loadData = async () => {
    setLoading(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const allWorkers = await workerService.getAll({
        is_active: filter === 'unmarked' ? undefined : 1,
        sort_by: 'name',
      });

      const workersWithAttendance = await Promise.all(
        allWorkers.map(async (worker) => {
          const attendance = await attendanceService.getByWorkerAndDate(
            worker.id,
            dateStr
          );

          return {
            worker,
            status: attendance?.status || null,
            leave_type: attendance?.leave_type || undefined,
            overtime_hours: attendance?.overtime_hours ? String(attendance.overtime_hours) : '',
            overtime_amount: attendance?.overtime_amount ? String(attendance.overtime_amount) : '',
            overtime_type: attendance?.overtime_amount_type || 'calculated',
            marked_at: attendance?.updated_at || attendance?.created_at,
          };
        })
      );

      // Filter unmarked if needed
      const filtered =
        filter === 'unmarked'
          ? workersWithAttendance.filter((w) => !w.status)
          : workersWithAttendance;

      setWorkers(filtered);
    } catch (error) {
      console.error('Failed to load attendance:', error);
      showToast('Failed to load attendance data', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Auto-save single worker on tapping status (P, H, A, HOL, L)
  const handleStatusSelect = async (workerId: number, status: AttendanceStatus) => {
    const nowIso = new Date().toISOString();
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const workerItem = workers.find((w) => w.worker.id === workerId);
    const leaveType = status === 'leave' ? (workerItem?.leave_type || 'unpaid') : undefined;

    // 1. Immediately update UI state with status & current local timestamp
    setWorkers((prev) =>
      prev.map((w) =>
        w.worker.id === workerId
          ? {
              ...w,
              status,
              leave_type: leaveType,
              marked_at: nowIso,
            }
          : w
      )
    );

    // 2. Auto-save instantly to database
    try {
      await attendanceService.mark({
        worker_id: workerId,
        work_date: dateStr,
        status,
        leave_type: leaveType,
        overtime_hours: workerItem?.overtime_hours ? parseFloat(workerItem.overtime_hours) : 0,
        overtime_amount: workerItem?.overtime_amount ? parseFloat(workerItem.overtime_amount) : 0,
        overtime_amount_type: workerItem?.overtime_type || 'calculated',
      });
    } catch (err: any) {
      console.error('Failed to auto-save attendance:', err);
      showToast('Failed to save attendance', 'error');
    }
  };

  // Auto-save when overtime or leave details change
  const handleWorkerUpdate = async (
    workerId: number,
    updates: Partial<WorkerAttendance>
  ) => {
    const nowIso = new Date().toISOString();
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    let updatedWorker: WorkerAttendance | undefined;

    setWorkers((prev) =>
      prev.map((w) => {
        if (w.worker.id === workerId) {
          updatedWorker = { ...w, ...updates, marked_at: nowIso };
          return updatedWorker;
        }
        return w;
      })
    );

    if (updatedWorker && updatedWorker.status) {
      try {
        await attendanceService.mark({
          worker_id: workerId,
          work_date: dateStr,
          status: updatedWorker.status,
          leave_type: updatedWorker.leave_type,
          overtime_hours: updatedWorker.overtime_hours ? parseFloat(updatedWorker.overtime_hours) : 0,
          overtime_amount: updatedWorker.overtime_amount ? parseFloat(updatedWorker.overtime_amount) : 0,
          overtime_amount_type: updatedWorker.overtime_type || 'calculated',
        });
      } catch (err: any) {
        console.error('Failed to auto-save attendance update:', err);
      }
    }
  };

  // Bulk mark all active workers and auto-save
  const markAllAs = async (status: AttendanceStatus) => {
    const nowIso = new Date().toISOString();
    const dateStr = format(selectedDate, 'yyyy-MM-dd');

    setWorkers((prev) =>
      prev.map((w) => ({
        ...w,
        status: w.worker.is_active ? status : w.status,
        marked_at: w.worker.is_active ? nowIso : w.marked_at,
      }))
    );

    try {
      const activeWorkers = workers.filter((w) => w.worker.is_active);
      await attendanceService.markBulk(
        dateStr,
        activeWorkers.map((w) => ({
          worker_id: w.worker.id,
          status,
          overtime_hours: w.overtime_hours ? parseFloat(w.overtime_hours) : 0,
          overtime_amount: w.overtime_amount ? parseFloat(w.overtime_amount) : 0,
          overtime_amount_type: w.overtime_type,
        }))
      );
      showToast(`Marked all as ${status}`, 'success');
    } catch (err: any) {
      console.error('Failed to auto-save bulk attendance:', err);
    }
  };

  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  const getStatusColor = (status: AttendanceStatus | null): string => {
    if (!status) return colors.neutral[300];
    const colorMap: Record<AttendanceStatus, string> = {
      present: colors.success[500],
      half_day: colors.warning[500],
      absent: colors.danger[500],
      holiday: colors.info[500],
      leave: colors.neutral[500],
    };
    return colorMap[status];
  };

  const getStatusLabel = (status: AttendanceStatus): string => {
    const labels: Record<AttendanceStatus, string> = {
      present: 'P',
      half_day: 'H',
      absent: 'A',
      holiday: 'HOL',
      leave: 'L',
    };
    return labels[status];
  };

  const markedCount = workers.filter((w) => w.status).length;
  const unmarkedCount = workers.filter((w) => !w.status).length;

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchBarContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={colors.neutral[400]} style={{ marginRight: 8 }} />
          <TextInput
            placeholder="Search workers by name or ID..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            containerStyle={{ flex: 1, marginBottom: 0 }}
            style={{ borderWidth: 0, paddingHorizontal: 0, height: 38 }}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.neutral[400]} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Date Selector */}
      <Card style={styles.dateSelector}>
        <TouchableOpacity onPress={() => changeDate(-1)} style={styles.dateArrow}>
          <Ionicons name="chevron-back" size={24} color={colors.primary[600]} />
        </TouchableOpacity>
        <View style={styles.dateContent}>
          <Text style={styles.dateText}>{format(selectedDate, 'EEE, MMM d, yyyy')}</Text>
          <Text style={styles.dateSubtext}>
            {format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
              ? 'Today'
              : format(selectedDate, 'yyyy-MM-dd') ===
                format(new Date(Date.now() - 86400000), 'yyyy-MM-dd')
              ? 'Yesterday'
              : ''}
          </Text>
        </View>
        <TouchableOpacity onPress={() => changeDate(1)} style={styles.dateArrow}>
          <Ionicons name="chevron-forward" size={24} color={colors.primary[600]} />
        </TouchableOpacity>
      </Card>

      {/* Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={{ paddingHorizontal: spacing[4] }}
      >
        {(['all', 'active', 'unmarked'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterChipText, filter === f && styles.filterChipTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <Text style={styles.quickActionsLabel}>Mark all as:</Text>
        <View style={styles.quickActionButtons}>
          <TouchableOpacity
            style={[styles.quickActionButton, { backgroundColor: colors.success[50] }]}
            onPress={() => markAllAs('present')}
          >
            <Text style={[styles.quickActionText, { color: colors.success[700] }]}>Present</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickActionButton, { backgroundColor: colors.danger[50] }]}
            onPress={() => markAllAs('absent')}
          >
            <Text style={[styles.quickActionText, { color: colors.danger[700] }]}>Absent</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickActionButton, { backgroundColor: colors.info[50] }]}
            onPress={() => markAllAs('holiday')}
          >
            <Text style={[styles.quickActionText, { color: colors.info[700] }]}>Holiday</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <Text style={styles.statsText}>
          {markedCount} marked · {unmarkedCount} unmarked
        </Text>
      </View>

      {/* Workers List */}
      <ScrollView
        style={styles.workersList}
        contentContainerStyle={{ paddingBottom: spacing[8] }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {workers
          .filter(
            (item) =>
              !searchQuery.trim() ||
              item.worker.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              item.worker.employee_id.toLowerCase().includes(searchQuery.toLowerCase())
          )
          .map((item) => (
          <WorkerAttendanceCard
            key={item.worker.id}
            item={item}
            onSelectStatus={handleStatusSelect}
            onUpdate={handleWorkerUpdate}
            getStatusColor={getStatusColor}
            getStatusLabel={getStatusLabel}
          />
        ))}
      </ScrollView>
    </View>
  );
}

// Worker Attendance Card Component
function WorkerAttendanceCard({
  item,
  onSelectStatus,
  onUpdate,
  getStatusColor,
  getStatusLabel,
}: {
  item: WorkerAttendance;
  onSelectStatus: (workerId: number, status: AttendanceStatus) => void;
  onUpdate: (workerId: number, updates: Partial<WorkerAttendance>) => void;
  getStatusColor: (status: AttendanceStatus | null) => string;
  getStatusLabel: (status: AttendanceStatus) => string;
}) {
  // Overtime is completely hidden by default
  const [showOvertime, setShowOvertime] = useState(false);

  const statuses: AttendanceStatus[] = ['present', 'half_day', 'absent', 'holiday', 'leave'];

  return (
    <Card style={styles.workerCard}>
      <View style={styles.workerHeader}>
        <Avatar name={item.worker.name} size="md" />
        <View style={styles.workerInfo}>
          <Text style={styles.workerName}>{item.worker.name}</Text>
          <Text style={styles.workerId}>{item.worker.employee_id}</Text>
        </View>
        {item.marked_at && (
          <View style={styles.timestampBadge}>
            <Ionicons name="time-outline" size={12} color={colors.success[700]} />
            <Text style={styles.timestampText}>
              Marked {format(parseDbTimestamp(item.marked_at), 'h:mm a')}
            </Text>
          </View>
        )}
      </View>

      {/* Status Buttons - Auto-save immediately on press */}
      <View style={styles.statusButtons}>
        {statuses.map((status) => (
          <TouchableOpacity
            key={status}
            style={[
              styles.statusButton,
              item.status === status && {
                backgroundColor: getStatusColor(status) + '20',
                borderColor: getStatusColor(status),
                borderWidth: 2,
              },
            ]}
            onPress={() => onSelectStatus(item.worker.id, status)}
          >
            <Text
              style={[
                styles.statusButtonText,
                {
                  color:
                    item.status === status
                      ? getStatusColor(status)
                      : colors.neutral[600],
                  fontWeight: item.status === status ? '700' : '500',
                },
              ]}
            >
              {getStatusLabel(status)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Leave Type (if leave selected) */}
      {item.status === 'leave' && (
        <View style={styles.leaveTypeContainer}>
          <Text style={styles.leaveTypeLabel}>Leave Type:</Text>
          <View style={styles.leaveTypeButtons}>
            <TouchableOpacity
              style={[
                styles.leaveTypeButton,
                item.leave_type === 'paid' && styles.leaveTypeButtonActive,
              ]}
              onPress={() => onUpdate(item.worker.id, { leave_type: 'paid' })}
            >
              <Text
                style={[
                  styles.leaveTypeText,
                  item.leave_type === 'paid' && styles.leaveTypeTextActive,
                ]}
              >
                Paid
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.leaveTypeButton,
                item.leave_type === 'unpaid' && styles.leaveTypeButtonActive,
              ]}
              onPress={() => onUpdate(item.worker.id, { leave_type: 'unpaid' })}
            >
              <Text
                style={[
                  styles.leaveTypeText,
                  item.leave_type === 'unpaid' && styles.leaveTypeTextActive,
                ]}
              >
                Unpaid
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Overtime Toggle Button (Hidden by default) */}
      {(item.status === 'present' || item.status === 'half_day') && (
        <TouchableOpacity
          style={styles.toggleOtButton}
          onPress={() => setShowOvertime(!showOvertime)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={showOvertime ? 'chevron-up-circle-outline' : 'add-circle-outline'}
            size={16}
            color={colors.primary[600]}
          />
          <Text style={styles.toggleOtText}>
            {showOvertime
              ? 'Hide Overtime'
              : item.overtime_hours && parseFloat(item.overtime_hours) > 0
              ? 'Overtime: ' + item.overtime_hours + 'h'
              : '+ Add Overtime (optional)'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Overtime Container (Only shown when explicitly toggled open) */}
      {(item.status === 'present' || item.status === 'half_day') && showOvertime && (
        <View style={styles.overtimeContainer}>
          <View style={styles.overtimeHeader}>
            <Text style={styles.overtimeLabel}>Overtime (optional)</Text>
            <TouchableOpacity onPress={() => setShowOvertime(false)}>
              <Ionicons name="close-circle" size={20} color={colors.neutral[400]} />
            </TouchableOpacity>
          </View>
          <View style={styles.overtimeInputs}>
            <View style={styles.overtimeInput}>
              <Text style={styles.overtimeInputLabel}>Hours</Text>
              <TextInput
                value={item.overtime_hours}
                onChangeText={(text) =>
                  onUpdate(item.worker.id, { overtime_hours: text })
                }
                placeholder="0"
                keyboardType="numeric"
                style={{ height: 40 }}
                containerStyle={{ marginBottom: 0, flex: 1 }}
              />
            </View>
            <View style={styles.overtimeInput}>
              <Text style={styles.overtimeInputLabel}>Amount</Text>
              <TextInput
                value={item.overtime_amount}
                onChangeText={(text) =>
                  onUpdate(item.worker.id, { overtime_amount: text })
                }
                placeholder="Auto"
                keyboardType="numeric"
                style={{ height: 40 }}
                containerStyle={{ marginBottom: 0, flex: 1 }}
              />
            </View>
          </View>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    margin: spacing[4],
    padding: spacing[3],
  },
  dateArrow: {
    padding: spacing[2],
  },
  dateContent: {
    alignItems: 'center',
  },
  dateText: {
    ...typography.bodyLarge,
    fontWeight: '600',
    color: colors.neutral[900],
  },
  dateSubtext: {
    ...typography.caption,
    color: colors.primary[600],
    marginTop: 2,
  },
  filterContainer: {
    maxHeight: 50,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
    backgroundColor: colors.white,
  },
  filterChip: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    marginRight: spacing[2],
    borderRadius: 8,
    backgroundColor: colors.neutral[100],
  },
  filterChipActive: {
    backgroundColor: colors.primary[50],
    borderWidth: 1,
    borderColor: colors.primary[500],
  },
  filterChipText: {
    ...typography.bodySmall,
    color: colors.neutral[700],
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: colors.primary[700],
  },
  quickActions: {
    padding: spacing[4],
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  quickActionsLabel: {
    ...typography.caption,
    color: colors.neutral[600],
    marginBottom: spacing[2],
  },
  quickActionButtons: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  quickActionButton: {
    flex: 1,
    paddingVertical: spacing[2],
    alignItems: 'center',
    borderRadius: 8,
  },
  quickActionText: {
    ...typography.caption,
    fontWeight: '600',
  },
  statsBar: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    backgroundColor: colors.neutral[100],
  },
  statsText: {
    ...typography.caption,
    color: colors.neutral[600],
  },
  workersList: {
    flex: 1,
    padding: spacing[4],
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
  statusButtons: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  statusButton: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    backgroundColor: colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  statusButtonText: {
    fontSize: 16,
  },
  leaveTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing[3],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
  },
  leaveTypeLabel: {
    ...typography.caption,
    color: colors.neutral[600],
  },
  leaveTypeButtons: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  leaveTypeButton: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: 6,
    backgroundColor: colors.neutral[100],
  },
  leaveTypeButtonActive: {
    backgroundColor: colors.primary[50],
    borderWidth: 1,
    borderColor: colors.primary[500],
  },
  leaveTypeText: {
    ...typography.caption,
    color: colors.neutral[600],
  },
  leaveTypeTextActive: {
    color: colors.primary[700],
    fontWeight: '600',
  },
  overtimeContainer: {
    marginTop: spacing[3],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
  },
  overtimeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  overtimeLabel: {
    ...typography.caption,
    color: colors.neutral[600],
  },
  overtimeInputs: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  overtimeInput: {
    flex: 1,
  },
  overtimeInputLabel: {
    ...typography.caption,
    color: colors.neutral[500],
    marginBottom: spacing[1],
  },
  searchBarContainer: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    paddingBottom: spacing[1],
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral[100],
    borderRadius: 8,
    paddingHorizontal: spacing[3],
    height: 40,
  },
  timestampBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.success[50],
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.success[200],
  },
  timestampText: {
    fontSize: 11,
    color: colors.success[800],
    fontWeight: '500',
  },
  toggleOtButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing[2],
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: colors.primary[50],
  },
  toggleOtText: {
    fontSize: 12,
    color: colors.primary[700],
    fontWeight: '600',
  },
});
