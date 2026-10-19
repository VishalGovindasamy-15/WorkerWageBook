// Worker WageBook - Record Advance Screen

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { colors, spacing, typography } from '../../constants/theme';
import { TextInput, Button, Card } from '../../components/ui';
import { Worker } from '../../types';
import { workerService } from '../../services/workerService';
import { advanceService } from '../../services/advanceService';
import { useAppStore } from '../../stores/appStore';
import { formatCurrency } from '../../utils/helpers';

export function RecordAdvanceScreen({ navigation }: any) {
  const { showToast } = useAppStore();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [selectedWorkerId, setSelectedWorkerId] = useState<number | null>(null);
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'bank'>('cash');
  const [reason, setReason] = useState('');
  const [advanceDate, setAdvanceDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [saving, setSaving] = useState(false);
  const [showWorkerPicker, setShowWorkerPicker] = useState(false);
  const [outstandingBalance, setOutstandingBalance] = useState(0);

  useEffect(() => {
    loadWorkers();
  }, []);

  useEffect(() => {
    if (selectedWorkerId) {
      loadOutstandingBalance();
    }
  }, [selectedWorkerId]);

  const loadWorkers = async () => {
    const workerList = await workerService.getAll({ is_active: 1, sort_by: 'name' });
    setWorkers(workerList);
  };

  const loadOutstandingBalance = async () => {
    if (!selectedWorkerId) return;
    const balance = await advanceService.getOutstandingBalance(selectedWorkerId);
    setOutstandingBalance(balance);
  };

  const selectedWorker = workers.find((w) => w.id === selectedWorkerId);

  const handleSave = async () => {
    if (!selectedWorkerId) {
      Alert.alert('Error', 'Please select a worker');
      return;
    }

    const amountNum = parseFloat(amount);
    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    setSaving(true);
    try {
      await advanceService.create({
        worker_id: selectedWorkerId,
        amount: amountNum,
        payment_method: paymentMethod,
        reason: reason.trim() || undefined,
        advance_date: advanceDate,
      });

      showToast(`Advance of ${formatCurrency(amountNum)} recorded`, 'success');
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to record advance');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.content}>
        {/* Worker Selection */}
        <Text style={styles.sectionLabel}>WORKER</Text>
        <TouchableOpacity
          style={styles.pickerButton}
          onPress={() => setShowWorkerPicker(!showWorkerPicker)}
        >
          <View style={styles.pickerContent}>
            <Ionicons
              name="person"
              size={20}
              color={selectedWorker ? colors.neutral[900] : colors.neutral[400]}
            />
            <Text
              style={[
                styles.pickerText,
                !selectedWorker && styles.pickerPlaceholder,
              ]}
            >
              {selectedWorker
                ? `${selectedWorker.name} (${selectedWorker.employee_id})`
                : 'Select worker'}
            </Text>
          </View>
          <Ionicons
            name={showWorkerPicker ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={colors.neutral[500]}
          />
        </TouchableOpacity>

        {showWorkerPicker && (
          <Card style={styles.workerDropdown} padding={0}>
            <ScrollView style={{ maxHeight: 200 }}>
              {workers.map((worker) => (
                <TouchableOpacity
                  key={worker.id}
                  style={[
                    styles.workerOption,
                    selectedWorkerId === worker.id && styles.workerOptionSelected,
                  ]}
                  onPress={() => {
                    setSelectedWorkerId(worker.id);
                    setShowWorkerPicker(false);
                  }}
                >
                  <View>
                    <Text style={styles.workerOptionName}>{worker.name}</Text>
                    <Text style={styles.workerOptionId}>{worker.employee_id}</Text>
                  </View>
                  {selectedWorkerId === worker.id && (
                    <Ionicons name="checkmark" size={20} color={colors.primary[600]} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Card>
        )}

        {/* Outstanding Balance Display */}
        {selectedWorkerId && (
          <Card style={styles.balanceCard}>
            <View style={styles.balanceRow}>
              <Text style={styles.balanceLabel}>Current Outstanding</Text>
              <Text style={styles.balanceAmount}>
                {formatCurrency(outstandingBalance)}
              </Text>
            </View>
            {amount && !isNaN(parseFloat(amount)) && (
              <View style={styles.balanceRow}>
                <Text style={styles.balanceLabel}>After this advance</Text>
                <Text style={[styles.balanceAmount, { color: colors.danger[600] }]}>
                  {formatCurrency(outstandingBalance + parseFloat(amount))}
                </Text>
              </View>
            )}
          </Card>
        )}

        {/* Amount */}
        <Text style={[styles.sectionLabel, { marginTop: spacing[6] }]}>AMOUNT</Text>
        <TextInput
          label="Amount (Rs.)"
          placeholder="0"
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
          required
        />

        {/* Payment Method */}
        <Text style={styles.inputLabel}>Payment Method</Text>
        <View style={styles.paymentMethods}>
          {(['cash', 'upi', 'bank'] as const).map((method) => (
            <TouchableOpacity
              key={method}
              style={[
                styles.paymentMethodButton,
                paymentMethod === method && styles.paymentMethodButtonActive,
              ]}
              onPress={() => setPaymentMethod(method)}
            >
              <Ionicons
                name={
                  method === 'cash'
                    ? 'cash'
                    : method === 'upi'
                    ? 'phone-portrait'
                    : 'business'
                }
                size={20}
                color={
                  paymentMethod === method
                    ? colors.primary[600]
                    : colors.neutral[600]
                }
              />
              <Text
                style={[
                  styles.paymentMethodText,
                  paymentMethod === method && styles.paymentMethodTextActive,
                ]}
              >
                {method.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Date */}
        <TextInput
          label="Date"
          placeholder="yyyy-MM-dd"
          value={advanceDate}
          onChangeText={setAdvanceDate}
        />

        {/* Reason */}
        <TextInput
          label="Reason (optional)"
          placeholder="Why is this advance being given?"
          value={reason}
          onChangeText={setReason}
          multiline
          numberOfLines={2}
          style={{ height: 60, textAlignVertical: 'top' }}
        />

        {/* Save Button */}
        <Button
          title={saving ? 'Recording...' : 'Record Advance'}
          onPress={handleSave}
          loading={saving}
          disabled={!selectedWorkerId || !amount || saving}
          fullWidth
          style={{ marginTop: spacing[6] }}
        />

        <View style={{ height: spacing[8] }} />
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
  inputLabel: {
    ...typography.label,
    color: colors.neutral[700],
    marginBottom: spacing[2],
    marginTop: spacing[4],
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.neutral[300],
    borderRadius: 8,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    height: 52,
  },
  pickerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing[2],
  },
  pickerText: {
    ...typography.body,
    color: colors.neutral[900],
    flex: 1,
  },
  pickerPlaceholder: {
    color: colors.neutral[400],
  },
  workerDropdown: {
    marginTop: spacing[2],
    borderWidth: 1,
    borderColor: colors.neutral[200],
    maxHeight: 250,
  },
  workerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  workerOptionSelected: {
    backgroundColor: colors.primary[50],
  },
  workerOptionName: {
    ...typography.body,
    color: colors.neutral[900],
    fontWeight: '500',
  },
  workerOptionId: {
    ...typography.caption,
    color: colors.neutral[500],
    marginTop: 2,
  },
  balanceCard: {
    marginTop: spacing[3],
    backgroundColor: colors.info[50],
    borderWidth: 1,
    borderColor: colors.info[500] + '30',
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  balanceLabel: {
    ...typography.bodySmall,
    color: colors.neutral[700],
  },
  balanceAmount: {
    ...typography.body,
    color: colors.neutral[900],
    fontWeight: '600',
  },
  paymentMethods: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  paymentMethodButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[3],
    borderRadius: 8,
    backgroundColor: colors.neutral[100],
    borderWidth: 1.5,
    borderColor: colors.neutral[200],
  },
  paymentMethodButtonActive: {
    backgroundColor: colors.primary[50],
    borderColor: colors.primary[500],
  },
  paymentMethodText: {
    ...typography.bodySmall,
    color: colors.neutral[700],
    fontWeight: '500',
  },
  paymentMethodTextActive: {
    color: colors.primary[700],
    fontWeight: '600',
  },
});
