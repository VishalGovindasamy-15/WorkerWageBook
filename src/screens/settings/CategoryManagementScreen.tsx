// Worker WageBook - Category Management Screen

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput as RNTextInput,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, shadows } from '../../constants/theme';
import { Card, Button } from '../../components/ui';
import { categoryService } from '../../services/categoryService';
import { Category } from '../../types';
import { useAppStore } from '../../stores/appStore';

export function CategoryManagementScreen() {
  const { isDark, themeColors } = useAppStore();
  const [categories, setCategories] = useState<(Category & { worker_count: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title ? `${title}: ` : ''}${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setLoading(true);
    const cats = await categoryService.getAllWithWorkerCount();
    setCategories(cats);
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!newCategoryName.trim()) {
      showAlert('Error', 'Please enter a category name');
      return;
    }

    try {
      await categoryService.create(newCategoryName.trim());
      setNewCategoryName('');
      setShowAddModal(false);
      loadCategories();
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to create category');
    }
  };

  const handleEdit = async (id: number) => {
    if (!editingName.trim()) {
      showAlert('Error', 'Please enter a category name');
      return;
    }

    try {
      await categoryService.rename(id, editingName.trim());
      setEditingId(null);
      setEditingName('');
      loadCategories();
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to rename category');
    }
  };

  const handleDelete = (category: Category & { worker_count: number }) => {
    if (category.worker_count > 0) {
      showAlert(
        'Cannot Delete',
        `This category has ${category.worker_count} worker(s) assigned. Please reassign them first.`
      );
      return;
    }

    if (Platform.OS === 'web') {
      if (window.confirm(`Are you sure you want to delete "${category.name}"?`)) {
        categoryService.deactivate(category.id).then(() => {
          loadCategories();
        }).catch((error: any) => {
          showAlert('Error', error.message || 'Failed to delete category');
        });
      }
      return;
    }

    Alert.alert(
      'Delete Category',
      `Are you sure you want to delete "${category.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await categoryService.deactivate(category.id);
              loadCategories();
            } catch (error: any) {
              showAlert('Error', error.message || 'Failed to delete category');
            }
          },
        },
      ]
    );
  };

  const startEdit = (category: Category) => {
    setEditingId(category.id);
    setEditingName(category.name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  if (loading) {
    return (
      <View style={[styles.container, isDark && { backgroundColor: themeColors.background }]}>
        <Text style={[styles.loadingText, isDark && { color: themeColors.textMuted }]}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, isDark && { backgroundColor: themeColors.background }]}>
      <ScrollView style={styles.scrollView}>
        <Text style={[styles.description, isDark && { color: themeColors.textSecondary }]}>
          Categories help you organize and filter workers. Create categories for different job roles
          like Mason, Carpenter, Electrician, etc.
        </Text>

        {categories.map((category) => (
          <Card key={category.id} style={styles.categoryCard}>
            {editingId === category.id ? (
              <View style={styles.editContainer}>
                <RNTextInput
                  style={[
                    styles.editInput,
                    isDark && {
                      backgroundColor: themeColors.inputBg,
                      borderColor: colors.primary[500],
                      color: themeColors.text,
                    },
                  ]}
                  value={editingName}
                  onChangeText={setEditingName}
                  autoFocus
                  placeholder="Category name"
                  placeholderTextColor={isDark ? themeColors.textMuted : colors.neutral[400]}
                />
                <View style={styles.editButtons}>
                  <TouchableOpacity
                    onPress={cancelEdit}
                    style={[styles.editButton, isDark && { backgroundColor: themeColors.cardBorder }]}
                  >
                    <Text style={[styles.editButtonText, isDark && { color: themeColors.textSecondary }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleEdit(category.id)}
                    style={[styles.editButton, styles.editButtonPrimary]}
                  >
                    <Text style={[styles.editButtonText, { color: colors.white }]}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.categoryRow}>
                <View style={styles.categoryInfo}>
                  <Text style={[styles.categoryName, isDark && { color: themeColors.text }]}>{category.name}</Text>
                  <Text style={[styles.categoryCount, isDark && { color: themeColors.textMuted }]}>
                    {category.worker_count} {category.worker_count === 1 ? 'worker' : 'workers'}
                  </Text>
                </View>
                <View style={styles.categoryActions}>
                  <TouchableOpacity
                    onPress={() => startEdit(category)}
                    style={styles.actionButton}
                  >
                    <Ionicons name="create-outline" size={20} color={isDark ? '#60A5FA' : colors.primary[600]} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDelete(category)}
                    style={styles.actionButton}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={20}
                      color={category.worker_count > 0 ? (isDark ? '#475569' : colors.neutral[300]) : (isDark ? '#F87171' : colors.danger[600])}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </Card>
        ))}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Add Category FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowAddModal(true)}
      >
        <Ionicons name="add" size={28} color={colors.white} />
      </TouchableOpacity>

      {/* Add Category Modal */}
      {showAddModal && (
        <View style={styles.modalOverlay}>
          <Card style={[styles.modalContent, isDark && { backgroundColor: themeColors.card, borderColor: themeColors.cardBorder }]}>
            <Text style={[styles.modalTitle, isDark && { color: themeColors.text }]}>Add Category</Text>
            <RNTextInput
              style={[
                styles.modalInput,
                isDark && {
                  backgroundColor: themeColors.inputBg,
                  borderColor: themeColors.inputBorder,
                  color: themeColors.text,
                },
              ]}
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              placeholder="Category name"
              placeholderTextColor={isDark ? themeColors.textMuted : colors.neutral[400]}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <Button
                title="Cancel"
                onPress={() => {
                  setShowAddModal(false);
                  setNewCategoryName('');
                }}
                variant="secondary"
                style={{ flex: 1 }}
              />
              <View style={{ width: spacing[3] }} />
              <Button
                title="Add"
                onPress={handleAdd}
                style={{ flex: 1 }}
              />
            </View>
          </Card>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  scrollView: {
    flex: 1,
    padding: spacing[4],
  },
  loadingText: {
    ...typography.body,
    color: colors.neutral[500],
    textAlign: 'center',
    marginTop: spacing[8],
  },
  description: {
    ...typography.bodySmall,
    color: colors.neutral[600],
    marginBottom: spacing[4],
    lineHeight: 20,
  },
  categoryCard: {
    marginBottom: spacing[3],
    padding: spacing[4],
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    ...typography.bodyLarge,
    fontWeight: '600',
    color: colors.neutral[900],
  },
  categoryCount: {
    ...typography.caption,
    color: colors.neutral[500],
    marginTop: 2,
  },
  categoryActions: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  actionButton: {
    padding: spacing[2],
  },
  editContainer: {
    gap: spacing[3],
  },
  editInput: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.primary[500],
    borderRadius: 8,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    fontSize: 15,
    color: colors.neutral[900],
  },
  editButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing[2],
  },
  editButton: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: 6,
    backgroundColor: colors.neutral[100],
  },
  editButtonPrimary: {
    backgroundColor: colors.primary[600],
  },
  editButtonText: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.neutral[700],
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
    ...shadows.xl,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[4],
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    padding: spacing[6],
  },
  modalTitle: {
    ...typography.h2,
    color: colors.neutral[900],
    marginBottom: spacing[4],
  },
  modalInput: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.neutral[300],
    borderRadius: 8,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    fontSize: 15,
    color: colors.neutral[900],
    marginBottom: spacing[4],
  },
  modalButtons: {
    flexDirection: 'row',
  },
});
