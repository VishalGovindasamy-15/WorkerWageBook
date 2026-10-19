// Worker WageBook - Activity Logs Screen
// Full implementation matching Blueprint 5.11

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  TextInput as RNTextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { colors, spacing, typography, shadows } from '../../constants/theme';
import { Card, Badge, EmptyState } from '../../components/ui';
import { auditService } from '../../services/auditService';
import { AuditLog } from '../../types';
import { formatRelativeTime } from '../../utils/helpers';

type ActionFilter = 'all' | 'attendance' | 'advance' | 'salary' | 'worker';

export function ActivityLogsScreen() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<ActionFilter>('all');

  useFocusEffect(
    useCallback(() => {
      loadLogs();
    }, [])
  );

  const loadLogs = async () => {
    setLoading(true);
    try {
      const allLogs = await auditService.getAll({ limit: 150 });
      setLogs(allLogs);
    } catch (error) {
      console.error('Failed to load activity logs:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadLogs();
  };

  // Filter logs based on search and action type
  useEffect(() => {
    let result = [...logs];

    if (activeFilter !== 'all') {
      result = result.filter((log) => {
        if (activeFilter === 'attendance') return log.action.includes('attendance');
        if (activeFilter === 'advance') return log.action.includes('advance');
        if (activeFilter === 'salary') return log.action.includes('salary');
        if (activeFilter === 'worker') return log.action.includes('worker');
        return true;
      });
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (log) =>
          log.action.toLowerCase().includes(q) ||
          log.reason?.toLowerCase().includes(q) ||
          log.old_value?.toLowerCase().includes(q) ||
          log.new_value?.toLowerCase().includes(q)
      );
    }

    setFilteredLogs(result);
  }, [logs, search, activeFilter]);

  const getActionIcon = (action: string): keyof typeof Ionicons.glyphMap => {
    if (action.includes('attendance')) return 'checkmark-circle';
    if (action.includes('advance')) return 'cash';
    if (action.includes('salary')) return 'lock-closed';
    if (action.includes('worker')) return 'person';
    if (action.includes('category')) return 'pricetag';
    return 'information-circle';
  };

  const getActionColor = (action: string): string => {
    if (action.includes('attendance')) return colors.success[600];
    if (action.includes('advance')) return colors.primary[600];
    if (action.includes('salary')) return colors.warning[600];
    if (action.includes('worker')) return colors.info[600];
    return colors.neutral[600];
  };

  const getActionBg = (action: string): string => {
    if (action.includes('attendance')) return colors.success[50];
    if (action.includes('advance')) return colors.primary[50];
    if (action.includes('salary')) return colors.warning[50];
    if (action.includes('worker')) return colors.info[50];
    return colors.neutral[100];
  };

  const getActionTitle = (log: AuditLog): string => {
    const titles: Record<string, string> = {
      attendance_marked: 'Attendance Marked',
      attendance_edited: 'Attendance Edited',
      advance_added: 'Advance Recorded',
      advance_reversed: 'Advance Reversed',
      salary_settled: 'Salary Settled',
      worker_created: 'Worker Added',
      worker_edited: 'Worker Updated',
      worker_deactivated: 'Worker Deactivated',
      worker_reactivated: 'Worker Reactivated',
      category_created: 'Category Created',
      category_renamed: 'Category Renamed',
      category_deactivated: 'Category Removed',
    };
    return titles[log.action] || log.action.replace(/_/g, ' ');
  };

  // Group logs by date
  const groupedLogs = filteredLogs.reduce((groups, log) => {
    let dateGroup = 'Older';
    try {
      const date = parseISO(log.created_at);
      if (isToday(date)) {
        dateGroup = 'Today, ' + format(date, 'MMM d');
      } else if (isYesterday(date)) {
        dateGroup = 'Yesterday, ' + format(date, 'MMM d');
      } else {
        dateGroup = format(date, 'EEEE, MMM d, yyyy');
      }
    } catch {
      dateGroup = 'Recent';
    }

    if (!groups[dateGroup]) {
      groups[dateGroup] = [];
    }
    groups[dateGroup].push(log);
    return groups;
  }, {} as Record<string, AuditLog[]>);

  const renderDetails = (log: AuditLog) => {
    try {
      if (log.new_value) {
        const parsed = JSON.parse(log.new_value);
        if (parsed.status) {
          return `Status: ${parsed.status.toUpperCase()}`;
        }
        if (parsed.amount) {
          return `Amount: ₹${parsed.amount}${parsed.payment_method ? ` via ${parsed.payment_method.toUpperCase()}` : ''}`;
        }
        if (parsed.net_pay) {
          return `Net Pay: ₹${parsed.net_pay}`;
        }
      }
    } catch {
      // ignore
    }
    return null;
  };

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchBarContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={colors.neutral[400]} />
          <RNTextInput
            style={styles.searchInput}
            placeholder="Search logs by action or reason..."
            placeholderTextColor={colors.neutral[400]}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={colors.neutral[400]} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterBar}
        contentContainerStyle={styles.filterContent}
      >
        {[
          { key: 'all', label: 'All Types' },
          { key: 'attendance', label: 'Attendance' },
          { key: 'advance', label: 'Advances' },
          { key: 'salary', label: 'Salary' },
          { key: 'worker', label: 'Workers' },
        ].map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[
              styles.filterChip,
              activeFilter === f.key && styles.filterChipActive,
            ]}
            onPress={() => setActiveFilter(f.key as ActionFilter)}
          >
            <Text
              style={[
                styles.filterChipText,
                activeFilter === f.key && styles.filterChipTextActive,
              ]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Activity Feed */}
      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {filteredLogs.length === 0 ? (
          <EmptyState
            icon="document-text-outline"
            title="No activity logs"
            description={search ? "No logs match your search" : "All marked attendance, advances, and payroll events will appear here."}
          />
        ) : (
          Object.entries(groupedLogs).map(([groupTitle, groupItems]) => (
            <View key={groupTitle} style={styles.groupContainer}>
              <Text style={styles.groupHeader}>{groupTitle.toUpperCase()}</Text>
              {groupItems.map((log) => {
                const detail = renderDetails(log);
                const color = getActionColor(log.action);
                const bg = getActionBg(log.action);

                return (
                  <Card key={log.id} style={styles.logCard}>
                    <View style={styles.logItem}>
                      <View style={[styles.iconContainer, { backgroundColor: bg }]}>
                        <Ionicons name={getActionIcon(log.action)} size={20} color={color} />
                      </View>
                      <View style={styles.logDetails}>
                        <View style={styles.logTopRow}>
                          <Text style={styles.logTitle}>{getActionTitle(log)}</Text>
                          <Text style={styles.logTime}>
                            {formatRelativeTime(log.created_at)}
                          </Text>
                        </View>
                        {detail && <Text style={styles.logMeta}>{detail}</Text>}
                        {log.reason && (
                          <Text style={styles.logReason}>Reason: {log.reason}</Text>
                        )}
                        <Text style={styles.logOperator}>By: {log.performed_by}</Text>
                      </View>
                    </View>
                  </Card>
                );
              })}
            </View>
          ))
        )}
        <View style={{ height: 80 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  searchBarContainer: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    paddingBottom: spacing[2],
    backgroundColor: colors.white,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral[100],
    borderRadius: 8,
    paddingHorizontal: spacing[3],
    height: 42,
    gap: spacing[2],
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.neutral[900],
    paddingVertical: 0,
  },
  filterBar: {
    maxHeight: 52,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  filterContent: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    gap: spacing[2],
  },
  filterChip: {
    paddingHorizontal: spacing[3],
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.neutral[100],
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  filterChipActive: {
    backgroundColor: colors.primary[50],
    borderColor: colors.primary[500],
  },
  filterChipText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.neutral[600],
  },
  filterChipTextActive: {
    color: colors.primary[700],
  },
  content: {
    flex: 1,
    padding: spacing[4],
  },
  groupContainer: {
    marginBottom: spacing[4],
  },
  groupHeader: {
    ...typography.overline,
    color: colors.neutral[500],
    marginBottom: spacing[2],
    paddingLeft: spacing[1],
  },
  logCard: {
    marginBottom: spacing[2],
    padding: spacing[3],
  },
  logItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
  },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logDetails: {
    flex: 1,
  },
  logTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  logTitle: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.neutral[900],
  },
  logTime: {
    ...typography.caption,
    color: colors.neutral[400],
  },
  logMeta: {
    ...typography.caption,
    color: colors.neutral[700],
    fontWeight: '500',
    marginTop: 2,
  },
  logReason: {
    ...typography.caption,
    color: colors.neutral[500],
    fontStyle: 'italic',
    marginTop: 2,
  },
  logOperator: {
    ...typography.caption,
    color: colors.neutral[400],
    fontSize: 11,
    marginTop: 3,
  },
});
