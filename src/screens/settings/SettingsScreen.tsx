// Worker WageBook - Settings Screen

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  Platform,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, shadows, borderRadius } from '../../constants/theme';
import { Card, Button, TextInput } from '../../components/ui';
import { settingsService } from '../../services/settingsService';
import { csvService } from '../../services/csvService';
import { factoryResetDatabase } from '../../database/database';
import { useAppStore } from '../../stores/appStore';

interface SettingItem {
  label: string;
  value?: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  danger?: boolean;
}

interface SettingGroup {
  title: string;
  items: SettingItem[];
}

const WEEK_CYCLES = [
  { id: 'monday', label: 'Monday – Sunday', start: 'Monday', end: 'Sunday', dayNum: 1 },
  { id: 'sunday', label: 'Sunday – Saturday', start: 'Sunday', end: 'Saturday', dayNum: 0 },
  { id: 'saturday', label: 'Saturday – Friday', start: 'Saturday', end: 'Friday', dayNum: 6 },
  { id: 'friday', label: 'Friday – Thursday', start: 'Friday', end: 'Thursday', dayNum: 5 },
  { id: 'thursday', label: 'Thursday – Wednesday', start: 'Thursday', end: 'Wednesday', dayNum: 4 },
  { id: 'wednesday', label: 'Wednesday – Tuesday', start: 'Wednesday', end: 'Tuesday', dayNum: 3 },
  { id: 'tuesday', label: 'Tuesday – Monday', start: 'Tuesday', end: 'Monday', dayNum: 2 },
];

const AUTO_BACKUP_OPTIONS = [
  { id: 'off', label: 'Off (Manual only)' },
  { id: 'daily', label: 'Daily Backup' },
  { id: 'weekly', label: 'Weekly Backup' },
];

export function SettingsScreen({ navigation }: any) {
  const { setWeekStartsOn, setUnlocked, setPinSetupRequired } = useAppStore();
  const [businessName, setBusinessName] = useState('My Business');
  const [weekStartDay, setWeekStartDay] = useState('monday');
  const [autoBackup, setAutoBackup] = useState('weekly');
  const [pinEnabled, setPinEnabled] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  // Modals for selection
  const [weekModalVisible, setWeekModalVisible] = useState(false);
  const [backupModalVisible, setBackupModalVisible] = useState(false);
  const [factoryResetModalVisible, setFactoryResetModalVisible] = useState(false);
  const [resetPin, setResetPin] = useState('');
  const [resetPinError, setResetPinError] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setBusinessName(await settingsService.getBusinessName());
    const wDay = await settingsService.getWeekStartDay();
    setWeekStartDay(wDay);
    setAutoBackup(await settingsService.getAutoBackupSchedule());
    setPinEnabled(await settingsService.isPinSet());
  };

  const handleSelectWeekCycle = async (cycle: typeof WEEK_CYCLES[0]) => {
    setWeekStartDay(cycle.id);
    await settingsService.setWeekStartDay(cycle.id);
    setWeekStartsOn(cycle.dayNum === 0 ? 0 : 1);
    setWeekModalVisible(false);
  };

  const handleSelectAutoBackup = async (schedId: string) => {
    setAutoBackup(schedId);
    await settingsService.setAutoBackupSchedule(schedId);
    setBackupModalVisible(false);
  };

  const handleLogout = () => {
    const doClear = async () => {
      await settingsService.clearPin();
      setPinEnabled(false);
    };

    if (Platform.OS === 'web') {
      if (window.confirm('This will remove your PIN and require you to set up a new one. Continue?')) {
        doClear();
      }
      return;
    }

    Alert.alert(
      'Clear PIN',
      'This will remove your PIN and require you to set up a new one. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear PIN', style: 'destructive', onPress: doClear },
      ]
    );
  };

  const handleExportCSV = async () => {
    if (exporting) return;
    const doExport = async () => {
      setExporting(true);
      try {
        await csvService.exportWorkers();
        if (Platform.OS === 'web') {
          window.alert('Workers data exported successfully');
        } else {
          Alert.alert('Success', 'Workers data exported successfully');
        }
      } catch (error: any) {
        if (Platform.OS === 'web') {
          window.alert(error.message || 'Failed to export data');
        } else {
          Alert.alert('Error', error.message || 'Failed to export data');
        }
      } finally {
        setExporting(false);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('This will export your worker records to a CSV spreadsheet. Continue?')) {
        await doExport();
      }
      return;
    }

    Alert.alert(
      'Export Data',
      'This will export all your worker records to CSV. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Export', onPress: doExport },
      ]
    );
  };

  const handleImportCSV = async () => {
    if (importing) return;
    const doImport = async () => {
      setImporting(true);
      try {
        const result = await csvService.importWorkers();
        if (result.success > 0) {
          const msg = `Successfully imported ${result.success} worker(s).${result.failed > 0 ? `\nFailed: ${result.failed}` : ''}`;
          if (Platform.OS === 'web') window.alert(msg);
          else Alert.alert('Import Complete', msg);
        } else if (result.failed > 0) {
          const msg = `Failed to import ${result.failed} worker(s). ${result.errors.slice(0, 3).join('\n')}`;
          if (Platform.OS === 'web') window.alert(msg);
          else Alert.alert('Import Failed', msg);
        } else {
          if (Platform.OS === 'web') window.alert('No workers were imported from the file');
          else Alert.alert('No Data', 'No workers were imported from the file');
        }
      } catch (error: any) {
        if (Platform.OS === 'web') window.alert(error.message || 'Failed to import data');
        else Alert.alert('Error', error.message || 'Failed to import data');
      } finally {
        setImporting(false);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Import workers from a CSV file? Existing workers with identical Employee IDs will be skipped.')) {
        await doImport();
      }
      return;
    }

    Alert.alert(
      'Import Workers',
      'This will import workers from a CSV file. Existing workers with the same Employee ID will be skipped. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Import', onPress: doImport },
      ]
    );
  };

  const handleFactoryResetClick = async () => {
    const isSet = await settingsService.isPinSet();
    if (isSet) {
      setResetPin('');
      setResetPinError('');
      setFactoryResetModalVisible(true);
    } else {
      if (Platform.OS === 'web') {
        if (window.confirm('⚠️ FACTORY RESET: This will permanently delete all workers, attendance, advances, and settings. Are you sure?')) {
          await executeFactoryReset();
        }
      } else {
        Alert.alert(
          'Factory Reset',
          'This will permanently delete all workers, attendance records, advances, and settings. This cannot be undone.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Erase Everything', style: 'destructive', onPress: executeFactoryReset },
          ]
        );
      }
    }
  };

  const handleConfirmResetWithPin = async () => {
    if (resetPin.length !== 4) {
      setResetPinError('Please enter your 4-digit App PIN');
      return;
    }
    const isValid = await settingsService.verifyPin(resetPin);
    if (!isValid) {
      setResetPinError('Incorrect PIN. Please try again.');
      return;
    }
    setFactoryResetModalVisible(false);
    await executeFactoryReset();
  };

  const executeFactoryReset = async () => {
    setIsResetting(true);
    try {
      await settingsService.clearPin();
      await factoryResetDatabase();
      setUnlocked(false);
      setPinSetupRequired(true);
      if (Platform.OS === 'web') {
        window.alert('Factory reset complete. The app will now reload.');
        window.location.reload();
      } else {
        Alert.alert(
          'Factory Reset Complete',
          'All local data has been erased. The app has been reset to its initial state.',
          [
            {
              text: 'OK',
              onPress: () => {
                navigation.replace('SetupPin');
              },
            },
          ]
        );
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to perform factory reset');
    } finally {
      setIsResetting(false);
    }
  };

  const currentCycle = WEEK_CYCLES.find((c) => c.id === weekStartDay) || WEEK_CYCLES[0];

  const settingGroups: SettingGroup[] = [
    {
      title: 'BUSINESS & WORK WEEK',
      items: [
        {
          label: 'Business Name',
          value: businessName,
          icon: 'business-outline',
          onPress: () => navigation.navigate('BusinessProfile'),
        },
        {
          label: 'Week Starts On & Ends On',
          value: currentCycle.label,
          icon: 'calendar-outline',
          onPress: () => setWeekModalVisible(true),
        },
      ],
    },
    {
      title: 'WORKERS & CATEGORIES',
      items: [
        {
          label: 'Manage Categories & Roles',
          icon: 'pricetags-outline',
          onPress: () => navigation.navigate('CategoryManagement'),
        },
      ],
    },
    {
      title: 'SALARY CALCULATION',
      items: [
        {
          label: 'Calculation Rules & Multipliers',
          icon: 'calculator-outline',
          onPress: () => navigation.navigate('SalaryRules'),
        },
      ],
    },
    {
      title: 'SECURITY',
      items: [
        {
          label: 'App Lock (PIN)',
          value: pinEnabled ? 'Enabled' : 'Disabled',
          icon: 'lock-closed-outline',
          onPress: () => {
            if (pinEnabled) {
              navigation.navigate('ChangePin');
            } else {
              navigation.navigate('SetupPin');
            }
          },
        },
        ...(pinEnabled
          ? [
              {
                label: 'Clear PIN',
                icon: 'trash-outline' as keyof typeof Ionicons.glyphMap,
                onPress: handleLogout,
                danger: true,
              },
            ]
          : []),
      ],
    },
    {
      title: 'BACKUP & RESTORE',
      items: [
        {
          label: 'Google Drive & Database Backup',
          value: 'Active',
          icon: 'cloud-upload-outline',
          onPress: () => navigation.navigate('GoogleDriveBackup'),
        },
        {
          label: 'Auto-backup Schedule',
          value: autoBackup.charAt(0).toUpperCase() + autoBackup.slice(1),
          icon: 'sync-outline',
          onPress: () => setBackupModalVisible(true),
        },
      ],
    },
    {
      title: 'DATA MANAGEMENT',
      items: [
        {
          label: exporting ? 'Exporting...' : 'Export Workers (CSV)',
          icon: 'download-outline',
          onPress: handleExportCSV,
        },
        {
          label: importing ? 'Importing...' : 'Import Workers (CSV)',
          icon: 'cloud-upload-outline',
          onPress: handleImportCSV,
        },
      ],
    },
    {
      title: 'DANGER ZONE',
      items: [
        {
          label: 'Factory Reset',
          value: 'Erase all data & reset app',
          icon: 'trash-outline' as keyof typeof Ionicons.glyphMap,
          danger: true,
          onPress: handleFactoryResetClick,
        },
      ],
    },
    {
      title: 'ABOUT',
      items: [
        {
          label: 'Version',
          value: '1.0.0 (Build 1)',
          icon: 'information-circle-outline',
          onPress: () => {},
        },
      ],
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: spacing[8] }}>
      <View style={styles.content}>
        {/* App Branding Header */}
        <View style={styles.brandingCard}>
          <Image
            source={require('../../../assets/icon.png')}
            style={styles.appIcon}
            resizeMode="contain"
          />
          <View style={{ flex: 1, marginLeft: spacing[3] }}>
            <Text style={styles.appName}>Worker WageBook</Text>
            <Text style={styles.appSub}>{businessName}</Text>
          </View>
        </View>

        {settingGroups.map((group, groupIdx) => (
          <View key={groupIdx} style={styles.groupContainer}>
            <Text style={styles.groupTitle}>{group.title}</Text>
            <Card style={styles.groupCard}>
              {group.items.map((item, itemIdx) => (
                <View key={itemIdx}>
                  <TouchableOpacity
                    style={styles.settingItem}
                    onPress={item.onPress}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.iconContainer,
                        item.danger && { backgroundColor: colors.danger[50] },
                      ]}
                    >
                      <Ionicons
                        name={item.icon}
                        size={20}
                        color={item.danger ? colors.danger[600] : colors.primary[600]}
                      />
                    </View>
                    <View style={styles.itemTextContainer}>
                      <Text
                        style={[
                          styles.itemLabel,
                          item.danger && { color: colors.danger[600] },
                        ]}
                      >
                        {item.label}
                      </Text>
                      {item.value && (
                        <Text style={styles.itemValue}>{item.value}</Text>
                      )}
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color={colors.neutral[400]}
                    />
                  </TouchableOpacity>
                  {itemIdx < group.items.length - 1 && (
                    <View style={styles.divider} />
                  )}
                </View>
              ))}
            </Card>
          </View>
        ))}
      </View>

      {/* Week Cycle Selection Modal */}
      <Modal
        visible={weekModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setWeekModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setWeekModalVisible(false)}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Work Week Cycle</Text>
              <TouchableOpacity onPress={() => setWeekModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.neutral[500]} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalDesc}>
              Choose the start and end days for your weekly payroll and attendance cycle:
            </Text>

            <ScrollView style={{ maxHeight: 320 }}>
              {WEEK_CYCLES.map((cycle) => {
                const isSelected = cycle.id === weekStartDay;
                return (
                  <TouchableOpacity
                    key={cycle.id}
                    style={[styles.modalOption, isSelected && styles.modalOptionSelected]}
                    onPress={() => handleSelectWeekCycle(cycle)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.modalOptionTitle, isSelected && styles.modalOptionTitleSelected]}>
                        {cycle.label}
                      </Text>
                      <Text style={styles.modalOptionSub}>
                        Starts on {cycle.start} · Closes on {cycle.end}
                      </Text>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={22} color={colors.primary[600]} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Auto Backup Schedule Modal */}
      <Modal
        visible={backupModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setBackupModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setBackupModalVisible(false)}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Auto-Backup Schedule</Text>
              <TouchableOpacity onPress={() => setBackupModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.neutral[500]} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalDesc}>
              How often should Worker WageBook remind or perform backup snapshots:
            </Text>

            {AUTO_BACKUP_OPTIONS.map((opt) => {
              const isSelected = opt.id === autoBackup;
              return (
                <TouchableOpacity
                  key={opt.id}
                  style={[styles.modalOption, isSelected && styles.modalOptionSelected]}
                  onPress={() => handleSelectAutoBackup(opt.id)}
                >
                  <Text style={[styles.modalOptionTitle, isSelected && styles.modalOptionTitleSelected]}>
                    {opt.label}
                  </Text>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={22} color={colors.primary[600]} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>

      {/* Factory Reset PIN Confirmation Modal */}
      <Modal
        visible={factoryResetModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFactoryResetModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setFactoryResetModalVisible(false)}
          />
          <View style={[styles.modalContent, { maxWidth: 360 }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="warning" size={24} color={colors.danger[500]} />
                <Text style={[styles.modalTitle, { color: colors.danger[600] }]}>Factory Reset</Text>
              </View>
              <TouchableOpacity onPress={() => setFactoryResetModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.neutral[500]} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDesc}>
              This will permanently delete all workers, attendance logs, advances, salary history, and settings. Enter your 4-digit App PIN to confirm.
            </Text>

            <TextInput
              label="Enter 4-Digit App PIN"
              placeholder="••••"
              value={resetPin}
              onChangeText={(t) => {
                setResetPin(t);
                setResetPinError('');
              }}
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
              autoFocus
              error={resetPinError}
              containerStyle={{ marginBottom: spacing[4] }}
            />

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Button
                title="Cancel"
                variant="secondary"
                onPress={() => setFactoryResetModalVisible(false)}
                style={{ flex: 1 }}
              />
              <Button
                title={isResetting ? 'Resetting...' : 'Erase All'}
                variant="danger"
                onPress={handleConfirmResetWithPin}
                disabled={resetPin.length !== 4 || isResetting}
                loading={isResetting}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
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
  brandingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    marginBottom: spacing[4],
    ...shadows.sm,
  },
  appIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
  },
  appName: {
    ...typography.h3,
    color: colors.neutral[900],
  },
  appSub: {
    ...typography.caption,
    color: colors.neutral[500],
    marginTop: 2,
  },
  groupContainer: {
    marginBottom: spacing[4],
  },
  groupTitle: {
    ...typography.overline,
    color: colors.neutral[500],
    marginBottom: spacing[2],
    marginLeft: spacing[1],
  },
  groupCard: {
    padding: 0,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[3],
  },
  itemTextContainer: {
    flex: 1,
  },
  itemLabel: {
    ...typography.body,
    fontWeight: '500',
    color: colors.neutral[900],
  },
  itemValue: {
    ...typography.caption,
    color: colors.neutral[500],
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.neutral[100],
    marginLeft: spacing[4] + 36 + spacing[3],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[4],
  },
  modalContent: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    ...shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  modalTitle: {
    ...typography.h3,
    color: colors.neutral[900],
  },
  modalDesc: {
    ...typography.bodySmall,
    color: colors.neutral[600],
    marginBottom: spacing[3],
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[3],
    borderRadius: borderRadius.md,
    marginBottom: spacing[2],
    backgroundColor: colors.neutral[50],
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  modalOptionSelected: {
    backgroundColor: colors.primary[50],
    borderColor: colors.primary[500],
  },
  modalOptionTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.neutral[800],
  },
  modalOptionTitleSelected: {
    color: colors.primary[700],
  },
  modalOptionSub: {
    ...typography.caption,
    color: colors.neutral[500],
    marginTop: 2,
  },
});
