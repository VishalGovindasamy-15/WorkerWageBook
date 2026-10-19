import { backupService } from '../../services/backupService';
import { format, parseISO } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { Platform, ActivityIndicator } from 'react-native';
// Worker WageBook - Settings Sub-Screens

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { colors, spacing, typography } from '../../constants/theme';
import { TextInput, Button, Card } from '../../components/ui';
import { settingsService } from '../../services/settingsService';
import { salaryService } from '../../services/salaryService';
import { SalaryCalculationRules } from '../../types';
import { useAppStore } from '../../stores/appStore';

// ============================================================
// BUSINESS PROFILE SCREEN
// ============================================================
export function BusinessProfileScreen({ navigation }: any) {
  const { isDark, themeColors } = useAppStore();
  const [businessName, setBusinessName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setBusinessName(await settingsService.getBusinessName());
  };

  const handleSave = async () => {
    if (!businessName.trim()) {
      Alert.alert('Error', 'Please enter a business name');
      return;
    }

    setSaving(true);
    try {
      await settingsService.setBusinessName(businessName.trim());
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={[styles.container, isDark && { backgroundColor: themeColors.background }]} keyboardShouldPersistTaps="handled">
      <View style={styles.content}>
        <TextInput
          label="Business Name"
          value={businessName}
          onChangeText={setBusinessName}
          placeholder="Enter your business name"
          required
        />

        <Button
          title={saving ? 'Saving...' : 'Save'}
          onPress={handleSave}
          loading={saving}
          disabled={!businessName.trim() || saving}
          fullWidth
          style={{ marginTop: spacing[6] }}
        />
      </View>
    </ScrollView>
  );
}

// ============================================================
// CHANGE PIN SCREEN
// ============================================================
export function ChangePinScreen({ navigation }: any) {
  const { isDark, themeColors } = useAppStore();
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [saving, setSaving] = useState(false);

  const handleChange = async () => {
    if (!currentPin || currentPin.length !== 4) {
      Alert.alert('Error', 'Please enter your current 4-digit PIN');
      return;
    }

    if (!newPin || newPin.length !== 4) {
      Alert.alert('Error', 'Please enter a new 4-digit PIN');
      return;
    }

    if (newPin !== confirmPin) {
      Alert.alert('Error', 'New PIN and confirmation do not match');
      return;
    }

    setSaving(true);
    try {
      const success = await settingsService.changePin(currentPin, newPin);
      if (success) {
        Alert.alert('Success', 'PIN changed successfully', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert('Error', 'Current PIN is incorrect');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to change PIN');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={[styles.container, isDark && { backgroundColor: themeColors.background }]} keyboardShouldPersistTaps="handled">
      <View style={styles.content}>
        <TextInput
          label="Current PIN"
          value={currentPin}
          onChangeText={setCurrentPin}
          placeholder="Enter current 4-digit PIN"
          keyboardType="number-pad"
          maxLength={4}
          secureTextEntry
        />

        <TextInput
          label="New PIN"
          value={newPin}
          onChangeText={setNewPin}
          placeholder="Enter new 4-digit PIN"
          keyboardType="number-pad"
          maxLength={4}
          secureTextEntry
        />

        <TextInput
          label="Confirm New PIN"
          value={confirmPin}
          onChangeText={setConfirmPin}
          placeholder="Re-enter new PIN"
          keyboardType="number-pad"
          maxLength={4}
          secureTextEntry
        />

        <Button
          title={saving ? 'Changing...' : 'Change PIN'}
          onPress={handleChange}
          loading={saving}
          disabled={saving}
          fullWidth
          style={{ marginTop: spacing[6] }}
        />
      </View>
    </ScrollView>
  );
}

// ============================================================
// SALARY RULES SCREEN
// ============================================================
export function SalaryRulesScreen({ navigation }: any) {
  const { isDark, themeColors } = useAppStore();
  const [rules, setRules] = useState<SalaryCalculationRules | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    setLoading(true);
    const r = await salaryService.getRules();
    setRules(r);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!rules) return;

    setSaving(true);
    try {
      await salaryService.updateRules(rules);
      Alert.alert('Success', 'Salary calculation rules updated');
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save rules');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !rules) {
    return (
      <View style={[styles.container, isDark && { backgroundColor: themeColors.background }]}>
        <Text style={[styles.loadingText, isDark && { color: themeColors.textMuted }]}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, isDark && { backgroundColor: themeColors.background }]} keyboardShouldPersistTaps="handled">
      <View style={styles.content}>
        <Text style={[styles.sectionTitle, isDark && { color: themeColors.textMuted }]}>ATTENDANCE</Text>

        <TextInput
          label="Half-day Multiplier"
          value={rules.half_day_multiplier.toString()}
          onChangeText={(text) =>
            setRules({ ...rules, half_day_multiplier: parseFloat(text) || 0 })
          }
          keyboardType="numeric"
          helperText="0.5 = half of daily wage, 1.0 = full wage"
        />

        <TextInput
          label="Holiday Pay Multiplier"
          value={rules.holiday_pay_multiplier.toString()}
          onChangeText={(text) =>
            setRules({ ...rules, holiday_pay_multiplier: parseFloat(text) || 0 })
          }
          keyboardType="numeric"
          helperText="0.0 = no pay on holidays, 1.0 = full pay"
        />

        <TextInput
          label="Weekly Off Day"
          value={rules.weekly_off_day}
          onChangeText={(text) => setRules({ ...rules, weekly_off_day: text })}
          helperText="e.g., sunday, monday"
        />

        <TextInput
          label="Weekly Off Pay Multiplier"
          value={rules.weekly_off_pay_multiplier.toString()}
          onChangeText={(text) =>
            setRules({ ...rules, weekly_off_pay_multiplier: parseFloat(text) || 0 })
          }
          keyboardType="numeric"
          helperText="0.0 = no pay, 1.0 = full pay"
        />

        <TextInput
          label="Paid Leave Allowed Per Month"
          value={rules.paid_leave_allowed_per_month.toString()}
          onChangeText={(text) =>
            setRules({ ...rules, paid_leave_allowed_per_month: parseInt(text) || 0 })
          }
          keyboardType="number-pad"
          helperText="0 = all leave is unpaid"
        />

        <Text style={[styles.sectionTitle, { marginTop: spacing[6] }, isDark && { color: themeColors.textMuted }]}>OVERTIME</Text>

        <TextInput
          label="Overtime Default Multiplier"
          value={rules.overtime_default_multiplier.toString()}
          onChangeText={(text) =>
            setRules({ ...rules, overtime_default_multiplier: parseFloat(text) || 0 })
          }
          keyboardType="numeric"
          helperText="Multiplier for hourly wage (used in multiplier mode)"
        />

        <TextInput
          label="Overtime Rounding"
          value={rules.overtime_rounding}
          onChangeText={(text) =>
            setRules({ ...rules, overtime_rounding: text as any })
          }
          helperText="Options: exact, nearest_half, nearest_hour"
        />

        <Text style={[styles.sectionTitle, { marginTop: spacing[6] }, isDark && { color: themeColors.textMuted }]}>ADVANCE RECOVERY</Text>

        <TextInput
          label="Recovery Mode"
          value={rules.advance_recovery_mode}
          onChangeText={(text) =>
            setRules({ ...rules, advance_recovery_mode: text as any })
          }
          helperText="Options: full (deduct all), partial (deduct up to %)"
        />

        <TextInput
          label="Max Recovery Percent"
          value={rules.advance_recovery_max_percent.toString()}
          onChangeText={(text) =>
            setRules({ ...rules, advance_recovery_max_percent: parseFloat(text) || 0 })
          }
          keyboardType="numeric"
          helperText="Max % of earnings to deduct (for partial mode)"
        />

        <TextInput
          label="Carry Forward Unrecovered"
          value={rules.carry_forward_unrecovered_advances.toString()}
          onChangeText={(text) =>
            setRules({ ...rules, carry_forward_unrecovered_advances: parseInt(text) || 0 })
          }
          keyboardType="number-pad"
          helperText="1 = yes, carry to next week; 0 = no, write off"
        />

        <Text style={[styles.sectionTitle, { marginTop: spacing[6] }, isDark && { color: themeColors.textMuted }]}>ROUNDING</Text>

        <TextInput
          label="Monetary Rounding"
          value={rules.monetary_rounding}
          onChangeText={(text) => setRules({ ...rules, monetary_rounding: text as any })}
          helperText="Options: paisa (2 decimals), rupee (0 decimals)"
        />

        <Button
          title={saving ? 'Saving...' : 'Save Rules'}
          onPress={handleSave}
          loading={saving}
          disabled={saving}
          fullWidth
          style={{ marginTop: spacing[6], marginBottom: spacing[8] }}
        />
      </View>
    </ScrollView>
  );
}

// ============================================================
// GOOGLE DRIVE BACKUP SCREEN (Placeholder)
// ============================================================
export function GoogleDriveBackupScreen() {
  const { isDark, themeColors } = useAppStore();
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [stats, setStats] = useState<{
    workers: number;
    attendance: number;
    advances: number;
    settlements: number;
  }>({ workers: 0, attendance: 0, advances: 0, settlements: 0 });
  const [exporting, setExporting] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    loadBackupInfo();
  }, []);

  const loadBackupInfo = async () => {
    try {
      const lb = await settingsService.getLastBackupAt();
      setLastBackup(lb);
      const st = await backupService.getDatabaseStats();
      setStats(st);
    } catch (e) {
      console.warn('Failed to load backup info:', e);
    }
  };

  const handleExportBackup = async () => {
    setExporting(true);
    try {
      const filename = await backupService.exportBackup();
      const msg = `Backup created successfully (${filename}). You can now store this file in Google Drive or local storage.`;
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Backup Complete', msg);
      }
      loadBackupInfo();
    } catch (error: any) {
      if (Platform.OS === 'web') {
        window.alert(error.message || 'Failed to create backup');
      } else {
        Alert.alert('Backup Error', error.message || 'Failed to create backup');
      }
    } finally {
      setExporting(false);
    }
  };

  const handleRestoreBackup = async () => {
    const doRestore = async () => {
      setRestoring(true);
      try {
        const res = await backupService.pickAndRestoreFile();
        if (res.success) {
          if (Platform.OS === 'web') {
            window.alert('Success: ' + res.message);
          } else {
            Alert.alert('Restore Complete', res.message);
          }
          loadBackupInfo();
        } else if (res.message !== 'Restore cancelled' && res.message !== 'No file selected') {
          if (Platform.OS === 'web') {
            window.alert('Restore Failed: ' + res.message);
          } else {
            Alert.alert('Restore Failed', res.message);
          }
        }
      } catch (err: any) {
        if (Platform.OS === 'web') {
          window.alert(err.message || 'Failed to restore');
        } else {
          Alert.alert('Error', err.message || 'Failed to restore');
        }
      } finally {
        setRestoring(false);
      }
    };

    if (Platform.OS === 'web') {
      const confirm = window.confirm(
        'Restoring will replace all current workers, attendance, advances, and settlements with the backup data. Do you want to proceed?'
      );
      if (confirm) {
        await doRestore();
      }
      return;
    }

    Alert.alert(
      'Restore Database',
      'Restoring will overwrite current data with the selected backup file. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Select File', style: 'destructive', onPress: doRestore },
      ]
    );
  };

  return (
    <ScrollView style={[styles.container, isDark && { backgroundColor: themeColors.background }]} contentContainerStyle={{ paddingBottom: spacing[8] }}>
      <View style={styles.content}>
        {/* Status Card */}
        <Card style={[styles.backupStatusCard, isDark && { backgroundColor: 'rgba(59, 130, 246, 0.12)', borderColor: 'rgba(59, 130, 246, 0.3)' }]}>
          <View style={styles.backupStatusHeader}>
            <View style={[styles.backupIconBox, isDark && { backgroundColor: themeColors.surface, borderColor: 'rgba(59, 130, 246, 0.3)' }]}>
              <Ionicons name="cloud-done" size={28} color={isDark ? '#60A5FA' : colors.primary[600]} />
            </View>
            <View style={{ flex: 1, marginLeft: spacing[3] }}>
              <Text style={[styles.backupStatusTitle, isDark && { color: themeColors.text }]}>Database & Cloud Backup</Text>
              <Text style={[styles.backupStatusSub, isDark && { color: themeColors.textSecondary }]}>
                {lastBackup
                  ? `Last Backup: ${format(parseISO(lastBackup), 'dd MMM yyyy, h:mm a')}`
                  : 'No backup taken yet'}
              </Text>
            </View>
          </View>

          <View style={[styles.backupStatsGrid, isDark && { borderTopColor: themeColors.border }]}>
            <View style={styles.backupStatItem}>
              <Text style={[styles.backupStatVal, isDark && { color: themeColors.text }]}>{stats.workers}</Text>
              <Text style={[styles.backupStatLbl, isDark && { color: themeColors.textMuted }]}>Workers</Text>
            </View>
            <View style={styles.backupStatItem}>
              <Text style={[styles.backupStatVal, isDark && { color: themeColors.text }]}>{stats.attendance}</Text>
              <Text style={[styles.backupStatLbl, isDark && { color: themeColors.textMuted }]}>Attendance</Text>
            </View>
            <View style={styles.backupStatItem}>
              <Text style={[styles.backupStatVal, isDark && { color: themeColors.text }]}>{stats.advances}</Text>
              <Text style={[styles.backupStatLbl, isDark && { color: themeColors.textMuted }]}>Advances</Text>
            </View>
            <View style={styles.backupStatItem}>
              <Text style={[styles.backupStatVal, isDark && { color: themeColors.text }]}>{stats.settlements}</Text>
              <Text style={[styles.backupStatLbl, isDark && { color: themeColors.textMuted }]}>Settlements</Text>
            </View>
          </View>
        </Card>

        {/* Action 1: Export */}
        <Card style={styles.actionCard}>
          <View style={styles.actionHeader}>
            <Ionicons name="download-outline" size={24} color={isDark ? '#60A5FA' : colors.primary[600]} />
            <Text style={[styles.actionTitle, isDark && { color: themeColors.text }]}>Create Full Database Backup</Text>
          </View>
          <Text style={[styles.actionDesc, isDark && { color: themeColors.textSecondary }]}>
            Generates a complete, secure snapshot of all workers, attendance history, advance ledgers, and salary settlements into a portable JSON backup file.
          </Text>
          <Button
            title={exporting ? 'Exporting...' : 'Save / Share Backup (.json)'}
            onPress={handleExportBackup}
            icon={exporting ? undefined : 'cloud-upload-outline'}
            disabled={exporting || restoring}
            fullWidth
            style={{ marginTop: spacing[3] }}
          />
        </Card>

        {/* Action 2: Restore */}
        <Card style={styles.actionCard}>
          <View style={styles.actionHeader}>
            <Ionicons name="refresh-circle-outline" size={24} color={isDark ? '#FBBF24' : colors.warning[600]} />
            <Text style={[styles.actionTitle, isDark && { color: themeColors.text }]}>Restore from Backup</Text>
          </View>
          <Text style={[styles.actionDesc, isDark && { color: themeColors.textSecondary }]}>
            Load a previously saved Worker WageBook .json backup file to restore your entire database state on this device.
          </Text>
          <Button
            title={restoring ? 'Restoring Database...' : 'Select Backup File to Restore'}
            onPress={handleRestoreBackup}
            variant="secondary"
            icon={restoring ? undefined : 'folder-open-outline'}
            disabled={exporting || restoring}
            fullWidth
            style={{ marginTop: spacing[3] }}
          />
        </Card>

        {/* Cloud Info */}
        <Card style={[styles.infoCard, isDark && { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
          <Text style={[styles.infoTitle, isDark && { color: '#60A5FA' }]}>Google Drive & Cloud Storage</Text>
          <Text style={[styles.infoText, isDark && { color: themeColors.textSecondary }]}>
            When you tap "Save / Share Backup", on Android & iOS your device will offer you the option to save directly to your Google Drive account, iCloud, or Files. On Web, the backup file is instantly downloaded to your Downloads folder.
          </Text>
        </Card>
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
  loadingText: {
    ...typography.body,
    color: colors.neutral[500],
    textAlign: 'center',
    marginTop: spacing[8],
  },
  sectionTitle: {
    ...typography.overline,
    color: colors.neutral[500],
    marginTop: spacing[4],
    marginBottom: spacing[2],
  },
  infoCard: {
    backgroundColor: colors.info[50],
    borderWidth: 1,
    borderColor: colors.info[500] + '30',
    marginBottom: spacing[4],
  },
  infoTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.info[700],
    marginBottom: spacing[2],
  },
  infoText: {
    ...typography.bodySmall,
    color: colors.info[700],
    lineHeight: 20,
  },
  comingSoonTitle: {
    ...typography.h2,
    color: colors.neutral[900],
    marginBottom: spacing[3],
  },
  comingSoonText: {
    ...typography.body,
    color: colors.neutral[600],
    lineHeight: 22,
  },
  backupStatusCard: {
    padding: spacing[4],
    marginBottom: spacing[4],
    backgroundColor: colors.primary[50],
    borderColor: colors.primary[200],
    borderWidth: 1,
  },
  backupStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  backupIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primary[200],
  },
  backupStatusTitle: {
    ...typography.bodyLarge,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  backupStatusSub: {
    ...typography.caption,
    color: colors.neutral[600],
    marginTop: 2,
  },
  backupStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.primary[100],
  },
  backupStatItem: {
    alignItems: 'center',
  },
  backupStatVal: {
    ...typography.body,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  backupStatLbl: {
    ...typography.caption,
    fontSize: 10,
    color: colors.neutral[500],
    textTransform: 'uppercase',
  },
  actionCard: {
    padding: spacing[4],
    marginBottom: spacing[4],
  },
  actionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[1],
  },
  actionTitle: {
    ...typography.bodyLarge,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  actionDesc: {
    ...typography.bodySmall,
    color: colors.neutral[600],
    lineHeight: 18,
    marginTop: 4,
  },

});
