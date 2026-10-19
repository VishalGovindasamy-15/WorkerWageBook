// Worker WageBook - Workers List Screen

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, typography, shadows } from '../../constants/theme';
import { Avatar, Badge, Card, TextInput, EmptyState, Button } from '../../components/ui';
import { formatCurrency } from '../../utils/helpers';
import { workerService } from '../../services/workerService';
import { categoryService } from '../../services/categoryService';
import { Worker, Category } from '../../types';

export function WorkersListScreen({ navigation }: any) {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active');

  // Trigger query whenever any filter state changes
  useEffect(() => {
    loadData();
  }, [search, selectedCategory, statusFilter]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [search, selectedCategory, statusFilter])
  );

  const loadData = async () => {
    setLoading(true);
    try {
      const isActiveParam = statusFilter === 'active' ? 1 : statusFilter === 'inactive' ? 0 : undefined;
      const [workerList, allCategories, assignedCategoryIds] = await Promise.all([
        workerService.getAll({
          search: search.trim() || undefined,
          category_id: selectedCategory || undefined,
          is_active: isActiveParam,
          sort_by: 'name',
        }),
        categoryService.getAll(),
        workerService.getAssignedCategoryIds(statusFilter === 'all' ? undefined : statusFilter === 'active'),
      ]);
      const assignedSet = new Set(assignedCategoryIds);
      const availableCategories = allCategories.filter((cat) => assignedSet.has(cat.id));
      setWorkers(workerList);
      setCategories(availableCategories);
      if (selectedCategory !== null && !assignedSet.has(selectedCategory)) {
        setSelectedCategory(null);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const getCategoryName = (categoryId: number | null): string => {
    if (!categoryId) return '';
    const cat = categories.find((c) => c.id === categoryId);
    return cat?.name || '';
  };

  const hasActiveFilters = Boolean(search.trim() || selectedCategory !== null || statusFilter !== 'active');

  // Completely empty state (no workers in DB at all)
  if (!loading && workers.length === 0 && !hasActiveFilters) {
    return (
      <View style={styles.container}>
        <EmptyState
          icon="people-outline"
          title="No workers yet"
          description="Add your first worker to start tracking attendance and payroll."
          actionLabel="Add Worker"
          onAction={() => navigation.navigate('AddWorker')}
        />
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('AddWorker')}
        >
          <Ionicons name="add" size={28} color={colors.white} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={colors.neutral[400]} style={{ marginRight: 8 }} />
          <TextInput
            placeholder="Search by name or ID..."
            value={search}
            onChangeText={setSearch}
            containerStyle={{ flex: 1, marginBottom: 0 }}
            style={{ borderWidth: 0, paddingHorizontal: 0, height: 40 }}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={20} color={colors.neutral[400]} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Chips Container */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={{ paddingHorizontal: spacing[4], alignItems: 'center' }}
      >
        {/* Status Filters */}
        <TouchableOpacity
          style={[styles.filterChip, statusFilter === 'all' && styles.filterChipActive]}
          onPress={() => setStatusFilter('all')}
        >
          <Text style={[styles.filterChipText, statusFilter === 'all' && styles.filterChipTextActive]}>
            All
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, statusFilter === 'active' && styles.filterChipActive]}
          onPress={() => setStatusFilter('active')}
        >
          <Text style={[styles.filterChipText, statusFilter === 'active' && styles.filterChipTextActive]}>
            Active
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, statusFilter === 'inactive' && styles.filterChipActive]}
          onPress={() => setStatusFilter('inactive')}
        >
          <Text style={[styles.filterChipText, statusFilter === 'inactive' && styles.filterChipTextActive]}>
            Inactive
          </Text>
        </TouchableOpacity>

        {categories.length > 0 && (
          <>
            <View style={styles.filterDivider} />
            <TouchableOpacity
              style={[styles.filterChip, selectedCategory === null && styles.filterChipActive]}
              onPress={() => setSelectedCategory(null)}
            >
              <Text style={[styles.filterChipText, selectedCategory === null && styles.filterChipTextActive]}>
                All Roles
              </Text>
            </TouchableOpacity>

            {categories.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.filterChip, isSelected && styles.filterChipActive]}
                  onPress={() => setSelectedCategory(isSelected ? null : cat.id)}
                >
                  <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </>
        )}
      </ScrollView>

      {/* Results Count / Reset bar */}
      <View style={styles.resultsBar}>
        <Text style={styles.resultsCount}>
          {workers.length} {workers.length === 1 ? 'worker' : 'workers'}
        </Text>
        {hasActiveFilters && (
          <TouchableOpacity
            onPress={() => {
              setSearch('');
              setSelectedCategory(null);
              setStatusFilter('all');
            }}
          >
            <Text style={styles.clearFilterText}>Reset Filters</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Workers List */}
      <ScrollView
        style={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {workers.length === 0 ? (
          <View style={styles.noResultsContainer}>
            <Ionicons name="search-outline" size={48} color={colors.neutral[300]} />
            <Text style={styles.noResultsTitle}>No workers match your filter</Text>
            <Text style={styles.noResultsSub}>Try changing the search query or category filter.</Text>
            <TouchableOpacity
              style={styles.resetButton}
              onPress={() => {
                setSearch('');
                setSelectedCategory(null);
                setStatusFilter('all');
              }}
            >
              <Text style={styles.resetButtonText}>Clear All Filters</Text>
            </TouchableOpacity>
          </View>
        ) : (
          workers.map((worker) => (
            <TouchableOpacity
              key={worker.id}
              style={styles.workerCard}
              onPress={() => navigation.navigate('WorkerProfile', { workerId: worker.id })}
              activeOpacity={0.7}
            >
              <Avatar name={worker.name} size="md" />
              <View style={styles.workerInfo}>
                <Text style={[styles.workerName, !worker.is_active && styles.workerNameInactive]}>
                  {worker.name}
                </Text>
                <Text style={styles.workerId}>{worker.employee_id}</Text>
                <View style={styles.workerMeta}>
                  {worker.category_id && (
                    <Badge label={getCategoryName(worker.category_id)} variant="neutral" size="sm" />
                  )}
                  <Badge
                    label={worker.is_active ? 'Active' : 'Inactive'}
                    variant={worker.is_active ? 'success' : 'neutral'}
                    size="sm"
                  />
                </View>
                {worker.daily_wage > 0 && (
                  <Text style={styles.workerWage}>
                    {formatCurrency(worker.daily_wage)}/day
                  </Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.neutral[300]} />
            </TouchableOpacity>
          ))
        )}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddWorker')}
      >
        <Ionicons name="add" size={28} color={colors.white} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  searchContainer: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    paddingBottom: spacing[2],
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral[100],
    borderRadius: 8,
    paddingHorizontal: spacing[3],
    height: 44,
  },
  filterContainer: {
    backgroundColor: colors.white,
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
    flexGrow: 0,
    maxHeight: 52,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral[100],
    borderRadius: 20,
    paddingHorizontal: spacing[3],
    height: 34,
    marginRight: spacing[2],
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterChipActive: {
    backgroundColor: colors.primary[50],
    borderColor: colors.primary[600],
  },
  filterChipText: {
    ...typography.bodySmall,
    color: colors.neutral[700],
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: colors.primary[700],
    fontWeight: '600',
  },
  filterDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.neutral[300],
    marginHorizontal: spacing[2],
  },
  resultsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  resultsCount: {
    ...typography.caption,
    color: colors.neutral[500],
  },
  clearFilterText: {
    ...typography.caption,
    color: colors.primary[600],
    fontWeight: '600',
  },
  list: {
    flex: 1,
    padding: spacing[4],
  },
  workerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: spacing[4],
    borderRadius: 12,
    marginBottom: spacing[3],
    ...shadows.sm,
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
  workerNameInactive: {
    color: colors.neutral[400],
  },
  workerId: {
    ...typography.caption,
    color: colors.neutral[500],
    marginTop: 2,
  },
  workerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginTop: spacing[2],
  },
  workerWage: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.primary[700],
    marginTop: spacing[1],
  },
  fab: {
    position: 'absolute',
    right: spacing[4],
    bottom: spacing[4],
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary[600],
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
  },
  noResultsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[12],
  },
  noResultsTitle: {
    ...typography.h3,
    color: colors.neutral[700],
    marginTop: spacing[3],
  },
  noResultsSub: {
    ...typography.bodySmall,
    color: colors.neutral[500],
    marginTop: spacing[1],
    textAlign: 'center',
  },
  resetButton: {
    marginTop: spacing[4],
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
    backgroundColor: colors.primary[50],
    borderRadius: 8,
  },
  resetButtonText: {
    ...typography.bodySmall,
    color: colors.primary[700],
    fontWeight: '600',
  },
});
