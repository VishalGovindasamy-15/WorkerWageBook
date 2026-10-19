// Worker WageBook - PIN Lock Screen

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Vibration, Image, TextInput as RNTextInput, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, shadows } from '../../constants/theme';
import { settingsService } from '../../services/settingsService';
import { useAppStore } from '../../stores/appStore';

export function PinLockScreen({ navigation }: any) {
  const { setUnlocked, setPinSetupRequired, isDark, themeColors } = useAppStore();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [cooldown, setCooldown] = useState(0);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    checkPinSetup();
  }, []);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const checkPinSetup = async () => {
    const isSet = await settingsService.isPinSet();
    if (!isSet) {
      navigation.replace('SetupPin');
    }
  };

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handlePress = async (digit: string) => {
    if (cooldown > 0 || pin.length >= 4) return;

    const newPin = pin + digit;
    setPin(newPin);
    setError('');

    if (newPin.length === 4) {
      const isValid = await settingsService.verifyPin(newPin);
      if (isValid) {
        setUnlocked(true);
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        shake();
        Vibration.vibrate(200);

        if (newAttempts >= 5) {
          setCooldown(30);
          setAttempts(0);
          setError('Too many attempts. Try again in 30 seconds.');
        } else {
          setError('Wrong PIN. Try again.');
        }

        setTimeout(() => setPin(''), 500);
      }
    }
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
    setError('');
  };

  return (
    <View style={[styles.container, isDark && { backgroundColor: themeColors.background }]}>
      <View style={styles.header}>
        <Image
          source={require('../../../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={[styles.appName, isDark && { color: themeColors.text }]}>Worker WageBook</Text>
      </View>

      <Text style={[styles.instruction, isDark && { color: themeColors.textSecondary }]}>Enter PIN to unlock</Text>

      <Animated.View style={[styles.dotsContainer, { transform: [{ translateX: shakeAnim }] }]}>
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={[
              styles.dot,
              isDark && { backgroundColor: themeColors.cardBorder },
              pin.length > i && styles.dotFilled,
              error && pin.length > i && styles.dotError,
            ]}
          />
        ))}
      </Animated.View>

      {error ? <Text style={styles.error}>{error}</Text> : <View style={{ height: 20 }} />}

      {cooldown > 0 && (
        <Text style={styles.cooldown}>Try again in {cooldown}s</Text>
      )}

      <View style={styles.keypad}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <TouchableOpacity
            key={num}
            style={[
              styles.key,
              isDark && { backgroundColor: themeColors.card, borderColor: themeColors.cardBorder, borderWidth: 1 },
              cooldown > 0 && styles.keyDisabled,
            ]}
            onPress={() => handlePress(String(num))}
            activeOpacity={0.6}
            disabled={cooldown > 0}
          >
            <Text style={[styles.keyText, isDark && { color: themeColors.text }]}>{num}</Text>
          </TouchableOpacity>
        ))}
        <View style={styles.key} />
        <TouchableOpacity
          style={[
            styles.key,
            isDark && { backgroundColor: themeColors.card, borderColor: themeColors.cardBorder, borderWidth: 1 },
            cooldown > 0 && styles.keyDisabled,
          ]}
          onPress={() => handlePress('0')}
          activeOpacity={0.6}
          disabled={cooldown > 0}
        >
          <Text style={[styles.keyText, isDark && { color: themeColors.text }]}>0</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.key,
            isDark && { backgroundColor: themeColors.card, borderColor: themeColors.cardBorder, borderWidth: 1 },
          ]}
          onPress={handleBackspace}
          activeOpacity={0.6}
          disabled={cooldown > 0}
        >
          <Ionicons name="backspace-outline" size={28} color={isDark ? themeColors.textSecondary : colors.neutral[600]} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export function SetupPinScreen({ navigation }: any) {
  const { setUnlocked, isDark, themeColors } = useAppStore();
  const [step, setStep] = useState<'business' | 'enter' | 'confirm'>('business');
  const [businessName, setBusinessName] = useState('');
  const [firstPin, setFirstPin] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    (async () => {
      const existing = await settingsService.getBusinessName();
      if (existing && existing !== 'My Business') {
        setBusinessName(existing);
      }
    })();
  }, []);

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handlePress = (digit: string) => {
    if (pin.length >= 4) return;
    const newPin = pin + digit;
    setPin(newPin);
    setError('');
  };

  const handleBusinessContinue = () => {
    if (!businessName.trim()) {
      setError('Please enter your business or contractor name');
      return;
    }
    setError('');
    setStep('enter');
  };

  const handleSubmit = async () => {
    if (pin.length !== 4) return;

    if (step === 'enter') {
      setFirstPin(pin);
      setPin('');
      setStep('confirm');
    } else if (step === 'confirm') {
      if (pin === firstPin) {
        if (businessName.trim()) {
          await settingsService.setBusinessName(businessName.trim());
        }
        await settingsService.setPin(pin);
        setUnlocked(true);
      } else {
        shake();
        Vibration.vibrate(200);
        setError('PINs do not match. Try again.');
        setStep('enter');
        setFirstPin('');
        setPin('');
      }
    }
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
    setError('');
  };

  return (
    <ScrollView 
      contentContainerStyle={[styles.scrollContainer, isDark && { backgroundColor: themeColors.background }]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Image
          source={require('../../../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={[styles.appName, isDark && { color: themeColors.text }]}>Worker WageBook</Text>
      </View>

      {step === 'business' ? (
        <View style={styles.businessContainer}>
          <Text style={[styles.setupTitle, isDark && { color: themeColors.text }]}>Set Up Your Business</Text>
          <Text style={[styles.setupSubtitle, isDark && { color: themeColors.textSecondary }]}>
            Enter your contractor or business name to appear on salary slips, attendance records, and reports.
          </Text>

          <View style={styles.inputWrapper}>
            <Text style={[styles.inputLabel, isDark && { color: themeColors.textSecondary }]}>Business / Contractor Name *</Text>
            <RNTextInput
              style={[
                styles.businessInput,
                isDark && {
                  backgroundColor: themeColors.inputBg,
                  borderColor: themeColors.inputBorder,
                  color: themeColors.text,
                },
                error ? styles.inputErrorBorder : null,
              ]}
              placeholder="e.g. Royal Builders, SK Interiors..."
              placeholderTextColor={isDark ? themeColors.textMuted : colors.neutral[400]}
              value={businessName}
              onChangeText={(val) => {
                setBusinessName(val);
                setError('');
              }}
              autoFocus
            />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : <View style={{ height: 16 }} />}

          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleBusinessContinue}
            activeOpacity={0.7}
          >
            <Text style={styles.submitButtonText}>Continue to Set PIN</Text>
            <Ionicons name="arrow-forward" size={20} color={colors.white} />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.pinContainer}>
          {businessName.trim() ? (
            <TouchableOpacity 
              style={[styles.businessBadge, isDark && { backgroundColor: 'rgba(59, 130, 246, 0.15)', borderColor: 'rgba(59, 130, 246, 0.3)' }]}
              onPress={() => {
                setStep('business');
                setError('');
              }}
            >
              <Ionicons name="business-outline" size={14} color={isDark ? '#60A5FA' : colors.primary[600]} />
              <Text style={[styles.businessBadgeText, isDark && { color: '#60A5FA' }]}>{businessName}</Text>
              <Ionicons name="pencil" size={12} color={isDark ? '#60A5FA' : colors.primary[500]} />
            </TouchableOpacity>
          ) : null}

          <Text style={[styles.instruction, isDark && { color: themeColors.textSecondary }]}>
            {step === 'enter' ? 'Create a 4-digit PIN' : 'Confirm your PIN'}
          </Text>

          <Animated.View style={[styles.dotsContainer, { transform: [{ translateX: shakeAnim }] }]}>
            {[0, 1, 2, 3].map((i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  isDark && { backgroundColor: themeColors.cardBorder },
                  pin.length > i && styles.dotFilled,
                  error && pin.length > i && styles.dotError,
                ]}
              />
            ))}
          </Animated.View>

          {error ? <Text style={styles.error}>{error}</Text> : <View style={{ height: 20 }} />}

          <View style={styles.keypad}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <TouchableOpacity
                key={num}
                style={[
                  styles.key,
                  isDark && { backgroundColor: themeColors.card, borderColor: themeColors.cardBorder, borderWidth: 1 },
                ]}
                onPress={() => handlePress(String(num))}
                activeOpacity={0.6}
              >
                <Text style={[styles.keyText, isDark && { color: themeColors.text }]}>{num}</Text>
              </TouchableOpacity>
            ))}
            <View style={styles.key} />
            <TouchableOpacity
              style={[
                styles.key,
                isDark && { backgroundColor: themeColors.card, borderColor: themeColors.cardBorder, borderWidth: 1 },
              ]}
              onPress={() => handlePress('0')}
              activeOpacity={0.6}
            >
              <Text style={[styles.keyText, isDark && { color: themeColors.text }]}>0</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.key,
                isDark && { backgroundColor: themeColors.card, borderColor: themeColors.cardBorder, borderWidth: 1 },
              ]}
              onPress={handleBackspace}
              activeOpacity={0.6}
            >
              <Ionicons name="backspace-outline" size={28} color={isDark ? themeColors.textSecondary : colors.neutral[600]} />
            </TouchableOpacity>
          </View>

          {/* Submit Button */}
          {pin.length === 4 && (
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmit}
              activeOpacity={0.7}
            >
              <Text style={styles.submitButtonText}>
                {step === 'enter' ? 'Continue' : 'Save & Open WageBook'}
              </Text>
              <Ionicons 
                name={step === 'enter' ? 'arrow-forward' : 'checkmark'} 
                size={20} 
                color={colors.white} 
              />
            </TouchableOpacity>
          )}

          {step === 'confirm' && (
            <TouchableOpacity
              onPress={() => {
                setStep('enter');
                setPin('');
                setFirstPin('');
                setError('');
              }}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={16} color={isDark ? themeColors.textSecondary : colors.neutral[600]} />
              <Text style={[styles.backButtonText, isDark && { color: themeColors.textSecondary }]}>Re-enter PIN</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
    alignItems: 'center',
    paddingTop: 80,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing[6],
  },
  logo: {
    width: 90,
    height: 85,
    marginBottom: spacing[2],
  },
  appName: {
    ...typography.h1,
    color: colors.neutral[900],
    marginTop: spacing[1],
  },
  instruction: {
    ...typography.bodyLarge,
    color: colors.neutral[600],
    marginBottom: spacing[6],
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: spacing[4],
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.neutral[200],
  },
  dotFilled: {
    backgroundColor: colors.primary[500],
  },
  dotError: {
    backgroundColor: colors.danger[500],
  },
  error: {
    ...typography.bodySmall,
    color: colors.danger[500],
    marginBottom: spacing[3],
  },
  cooldown: {
    ...typography.bodySmall,
    color: colors.warning[600],
    marginBottom: spacing[3],
  },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    width: 280,
    marginTop: spacing[6],
  },
  key: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
    margin: 8,
  },
  keyDisabled: {
    opacity: 0.4,
  },
  keyText: {
    ...typography.h2,
    color: colors.neutral[900],
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary[600],
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[8],
    borderRadius: 12,
    marginTop: spacing[6],
    minWidth: 200,
    shadowColor: colors.primary[500],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  submitButtonText: {
    ...typography.bodyLarge,
    color: colors.white,
    fontWeight: '600',
    marginRight: spacing[2],
  },
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: colors.white,
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: spacing[4],
  },
  businessContainer: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    marginTop: spacing[2],
  },
  pinContainer: {
    width: '100%',
    alignItems: 'center',
  },
  setupTitle: {
    ...typography.h2,
    color: colors.neutral[900],
    textAlign: 'center',
    marginBottom: spacing[2],
  },
  setupSubtitle: {
    ...typography.bodySmall,
    color: colors.neutral[600],
    textAlign: 'center',
    marginBottom: spacing[6],
    paddingHorizontal: spacing[4],
  },
  inputWrapper: {
    width: '100%',
    marginBottom: spacing[3],
  },
  inputLabel: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.neutral[700],
    marginBottom: spacing[1],
  },
  businessInput: {
    width: '100%',
    height: 48,
    borderWidth: 1,
    borderColor: colors.neutral[300],
    borderRadius: 10,
    paddingHorizontal: spacing[4],
    backgroundColor: colors.neutral[50],
    fontSize: 16,
    color: colors.neutral[900],
  },
  inputErrorBorder: {
    borderColor: colors.danger[500],
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary[600],
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[8],
    borderRadius: 12,
    marginTop: spacing[2],
    width: '100%',
    shadowColor: colors.primary[500],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  businessBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary[50],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: spacing[4],
    borderWidth: 1,
    borderColor: colors.primary[200],
  },
  businessBadgeText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.primary[700],
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing[4],
    padding: spacing[2],
  },
  backButtonText: {
    ...typography.bodySmall,
    color: colors.neutral[600],
  },
});
