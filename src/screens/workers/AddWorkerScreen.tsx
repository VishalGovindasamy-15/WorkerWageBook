// Worker WageBook - Add / Edit Worker Screen

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '../../constants/theme';
import { TextInput, Card, Button } from '../../components/ui';
import { workerService } from '../../services/workerService';
import { categoryService } from '../../services/categoryService';
import { useAppStore } from '../../stores/appStore';
import { Category } from '../../types';

export function AddWorkerScreen({ route, navigation }: any) {
  const { showToast, isDark, themeColors } = useAppStore();
  const workerId = route?.params?.workerId;
  const isEditMode = Boolean(workerId);

  const [name, setName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [employeeIdPreview, setEmployeeIdPreview] = useState('');
  const [phone, setPhone] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [dailyWage, setDailyWage] = useState('');
  const [overtimeRate, setOvertimeRate] = useState('');
  const [notes, setNotes] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingWorker, setLoadingWorker] = useState(isEditMode);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isEditMode) {
      navigation.setOptions({ title: 'Edit Worker' });
      loadExistingWorker();
    } else {
      loadPreview();
    }
    loadCategories();
  }, [workerId]);

  const loadExistingWorker = async () => {
    setLoadingWorker(true);
    try {
      const w = await workerService.getById(workerId);
      if (w) {
        setName(w.name || '');
        setEmployeeId(w.employee_id || '');
        setPhone(w.phone || '');
        setCategoryId(w.category_id || null);
        setDailyWage(w.daily_wage > 0 ? String(w.daily_wage) : '');
        setOvertimeRate(w.overtime_rate > 0 ? String(w.overtime_rate) : '');
        setNotes(w.notes || '');
      } else {
        Alert.alert('Error', 'Worker not found');
        navigation.goBack();
      }
    } catch (err) {
      console.error('Failed to load worker:', err);
    } finally {
      setLoadingWorker(false);
    }
  };

  const loadPreview = async () => {
    const preview = await workerService.getNextEmployeeIdPreview();
    setEmployeeIdPreview(preview);
  };

  const loadCategories = async () => {
    const cats = await categoryService.getAll();
    setCategories(cats);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Name is required';
    } else if (name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (phone && !/^\d{10}$/.test(phone.replace(/\D/g, ''))) {
      newErrors.phone = 'Enter a valid 10-digit phone number';
    }

    if (dailyWage && (isNaN(Number(dailyWage)) || Number(dailyWage) < 0)) {
      newErrors.dailyWage = 'Enter a valid amount';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setSaving(true);
    try {
      if (isEditMode) {
        await workerService.update(workerId, {
          name: name.trim(),
          employee_id: employeeId.trim() || undefined,
          phone: phone.trim() || undefined,
          category_id: categoryId || undefined,
          daily_wage: dailyWage ? Number(dailyWage) : 0,
          overtime_rate: overtimeRate ? Number(overtimeRate) : 0,
          notes: notes.trim() || undefined,
        });
        showToast('Worker updated successfully', 'success');
      } else {
        await workerService.create({
          name: name.trim(),
          employee_id: employeeId.trim() || undefined,
          phone: phone.trim() || undefined,
          category_id: categoryId || undefined,
          daily_wage: dailyWage ? Number(dailyWage) : 0,
          overtime_rate: overtimeRate ? Number(overtimeRate) : 0,
          notes: notes.trim() || undefined,
        });
        showToast('Worker created successfully', 'success');
      }

      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.message || (isEditMode ? 'Failed to update worker' : 'Failed to create worker'));
    } finally {
      setSaving(false);
    }
  };

  const selectedCategory = categories.find((c) => c.id === categoryId);

  return (
    <ScrollView style={[styles.container, isDark && { backgroundColor: themeColors.background }]} keyboardShouldPersistTaps="handled">
      <View style={styles.content}>
        {/* Required Section */}
        <Text style={[styles.sectionLabel, isDark && { color: themeColors.textMuted }]}>REQUIRED</Text>

        <TextInput
          label="Name"
          placeholder="Enter worker's full name"
          value={name}
          onChangeText={(text) => {
            setName(text);
            if (errors.name) setErrors({ ...errors, name: '' });
          }}
          error={errors.name}
          required
          autoFocus={!isEditMode}
        />

        {/* Optional Details Section */}
        <Text style={[styles.sectionLabel, { marginTop: spacing[6] }, isDark && { color: themeColors.textMuted }]}>OPTIONAL DETAILS</Text>

        <TextInput
          label="Employee ID"
          placeholder={employeeIdPreview ? employeeIdPreview + ' (auto-generated)' : 'e.g. W-001'}
          value={employeeId}
          onChangeText={setEmployeeId}
          helperText="Leave blank to auto-generate or keep existing"
        />

        {/* Category Picker */}
        <View style={styles.inputContainer}>
          <Text style={[styles.inputLabel, isDark && { color: themeColors.textSecondary }]}>Category</Text>
          <TouchableOpacity
            style={[
              styles.pickerButton,
              isDark && {
                backgroundColor: themeColors.inputBg,
                borderColor: themeColors.inputBorder,
              },
            ]}
            onPress={() => setShowCategoryPicker(!showCategoryPicker)}
          >
            <Text
              style={[
                selectedCategory ? styles.pickerText : styles.pickerPlaceholder,
                isDark && { color: selectedCategory ? themeColors.text : themeColors.textMuted },
              ]}
            >
              {selectedCategory?.name || 'Select category'}
            </Text>
            <Ionicons
              name={showCategoryPicker ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={isDark ? themeColors.textMuted : colors.neutral[500]}
            />
          </TouchableOpacity>
          <Text style={[styles.inputHelper, isDark && { color: themeColors.textMuted }]}>For filtering and grouping</Text>

          {showCategoryPicker && (
            <Card style={[styles.categoryDropdown, isDark && { borderColor: themeColors.cardBorder }]} padding={0}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryOption,
                    isDark && { borderBottomColor: themeColors.border },
                    categoryId === cat.id && (isDark ? { backgroundColor: 'rgba(59, 130, 246, 0.15)' } : styles.categoryOptionSelected),
                  ]}
                  onPress={() => {
                    setCategoryId(cat.id);
                    setShowCategoryPicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.categoryOptionText,
                      isDark && { color: themeColors.text },
                      categoryId === cat.id && (isDark ? { color: '#60A5FA', fontWeight: '600' } : styles.categoryOptionTextSelected),
                    ]}
                  >
                    {cat.name}
                  </Text>
                  {categoryId === cat.id && (
                    <Ionicons name="checkmark" size={20} color={isDark ? '#60A5FA' : colors.primary[600]} />
                  )}
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[styles.addCategoryOption, isDark && { borderTopColor: themeColors.border }]}
                onPress={() => {
                  setShowCategoryPicker(false);
                  Alert.prompt
                    ? Alert.prompt('New Category', 'Enter category name', [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Add',
                          onPress: async (text) => {
                            if (text?.trim()) {
                              const newCat = await categoryService.create(text.trim());
                              await loadCategories();
                              setCategoryId(newCat.id);
                            }
                          },
                        },
                      ])
                    : Alert.alert('Add Category', 'Category management is available in Settings');
                }}
              >
                <Ionicons name="add-circle-outline" size={20} color={isDark ? '#60A5FA' : colors.primary[600]} />
                <Text style={[styles.addCategoryText, isDark && { color: '#60A5FA' }]}>Add new category</Text>
              </TouchableOpacity>
            </Card>
          )}
        </View>

        <TextInput
          label="Phone"
          placeholder="Enter phone number"
          value={phone}
          onChangeText={(text) => {
            setPhone(text);
            if (errors.phone) setErrors({ ...errors, phone: '' });
          }}
          keyboardType="phone-pad"
          error={errors.phone}
        />

        {/* Payment Section */}
        <Text style={[styles.sectionLabel, { marginTop: spacing[6] }, isDark && { color: themeColors.textMuted }]}>PAYMENT</Text>

        <TextInput
          label="Daily Wage (Rs.)"
          placeholder="0"
          value={dailyWage}
          onChangeText={(text) => {
            setDailyWage(text);
            if (errors.dailyWage) setErrors({ ...errors, dailyWage: '' });
          }}
          keyboardType="numeric"
          error={errors.dailyWage}
        />

        <TextInput
          label="Overtime Rate (Rs./hour)"
          placeholder="0"
          value={overtimeRate}
          onChangeText={setOvertimeRate}
          keyboardType="numeric"
          helperText="Leave blank to use default rate from settings"
        />

        {/* Other Section */}
        <Text style={[styles.sectionLabel, { marginTop: spacing[6] }, isDark && { color: themeColors.textMuted }]}>OTHER</Text>

        <TextInput
          label="Notes"
          placeholder="Any additional notes..."
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
          style={{ height: 80, textAlignVertical: 'top' }}
        />

        {/* Save Button */}
        <Button
          title={saving ? 'Saving...' : isEditMode ? 'Save Changes' : 'Save Worker'}
          onPress={handleSave}
          loading={saving}
          disabled={!name.trim() || saving || loadingWorker}
          fullWidth
          style={{ marginTop: spacing[6], marginBottom: spacing[8] }}
        />
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
  sectionLabel: {
    ...typography.overline,
    color: colors.neutral[500],
    marginBottom: spacing[2],
  },
  inputContainer: {
    marginBottom: spacing[4],
  },
  inputLabel: {
    ...typography.label,
    color: colors.neutral[700],
    marginBottom: spacing[1],
  },
  inputHelper: {
    ...typography.caption,
    color: colors.neutral[500],
    marginTop: spacing[1],
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.neutral[300],
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[4],
    height: 48,
  },
  pickerText: {
    ...typography.body,
    color: colors.neutral[900],
  },
  pickerPlaceholder: {
    ...typography.body,
    color: colors.neutral[400],
  },
  categoryDropdown: {
    marginTop: spacing[2],
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  categoryOptionSelected: {
    backgroundColor: colors.primary[50],
  },
  categoryOptionText: {
    ...typography.body,
    color: colors.neutral[900],
  },
  categoryOptionTextSelected: {
    color: colors.primary[700],
    fontWeight: '600',
  },
  addCategoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    gap: spacing[2],
  },
  addCategoryText: {
    ...typography.body,
    color: colors.primary[600],
    fontWeight: '500',
  },
});
