// Worker WageBook - Reusable UI Components

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput as RNTextInput,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TextInputProps as RNTextInputProps,
  StyleProp,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, shadows, typography } from '../../constants/theme';
import { getInitials } from '../../utils/helpers';
import { useAppStore } from '../../stores/appStore';

// ============================================================
// BUTTON
// ============================================================
interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'text' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  fullWidth?: boolean;
  style?: ViewStyle;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  fullWidth = false,
  style,
}: ButtonProps) {
  const { isDark } = useAppStore();

  const sizeStyles = {
    sm: { paddingVertical: 8, paddingHorizontal: 16, height: 36 },
    md: { paddingVertical: 12, paddingHorizontal: 24, height: 48 },
    lg: { paddingVertical: 14, paddingHorizontal: 28, height: 52 },
  };

  const textSizes = {
    sm: { fontSize: 13 },
    md: { fontSize: 15 },
    lg: { fontSize: 16 },
  };

  const variantStyles = {
    primary: {
      container: { backgroundColor: colors.primary[600], borderRadius: borderRadius.md },
      text: { color: colors.white },
    },
    secondary: {
      container: {
        backgroundColor: isDark ? 'transparent' : colors.white,
        borderRadius: borderRadius.md,
        borderWidth: 1.5,
        borderColor: isDark ? colors.primary[500] : colors.primary[500],
      },
      text: { color: isDark ? '#60A5FA' : colors.primary[600] },
    },
    text: {
      container: { backgroundColor: 'transparent' },
      text: { color: isDark ? '#60A5FA' : colors.primary[600] },
    },
    danger: {
      container: { backgroundColor: colors.danger[600], borderRadius: borderRadius.md },
      text: { color: colors.white },
    },
  };

  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
      style={[
        styles.buttonBase,
        sizeStyles[size],
        variantStyles[variant].container,
        fullWidth && { width: '100%' },
        isDisabled && { opacity: 0.5 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' || variant === 'danger' ? colors.white : colors.primary[600]}
          size="small"
        />
      ) : (
        <View style={styles.buttonContent}>
          {icon && (
            <Ionicons
              name={icon}
              size={size === 'sm' ? 16 : 20}
              color={variantStyles[variant].text.color}
              style={{ marginRight: spacing[2] }}
            />
          )}
          <Text style={[typography.button, textSizes[size], variantStyles[variant].text]}>
            {title}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ============================================================
// CARD
// ============================================================
interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padding?: number;
  noShadow?: boolean;
}

export function Card({ children, style, padding = spacing[4], noShadow = false }: CardProps) {
  const { isDark, themeColors } = useAppStore();
  return (
    <View
      style={[
        styles.card,
        isDark && { backgroundColor: themeColors.card, borderColor: themeColors.cardBorder },
        { padding },
        !noShadow && shadows.md,
        style,
      ]}
    >
      {children}
    </View>
  );
}

// ============================================================
// TEXT INPUT
// ============================================================
interface TextInputProps extends RNTextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  containerStyle?: ViewStyle;
}

export function TextInput({
  label,
  error,
  helperText,
  required,
  containerStyle,
  ...props
}: TextInputProps) {
  const { isDark, themeColors } = useAppStore();
  const [isFocused, setIsFocused] = React.useState(false);

  return (
    <View style={[styles.inputContainer, containerStyle]}>
      {label && (
        <Text style={[styles.inputLabel, isDark && { color: themeColors.textSecondary }]}>
          {label}
          {required && <Text style={{ color: colors.danger[500] }}> *</Text>}
        </Text>
      )}
      <RNTextInput
        {...props}
        onFocus={(e) => {
          setIsFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          props.onBlur?.(e);
        }}
        style={[
          styles.textInput,
          isDark && {
            backgroundColor: themeColors.inputBg,
            borderColor: themeColors.inputBorder,
            color: themeColors.text,
          },
          isFocused && styles.textInputFocused,
          error && styles.textInputError,
          props.editable === false && styles.textInputDisabled,
          props.style as any,
        ]}
        placeholderTextColor={isDark ? themeColors.textMuted : colors.neutral[400]}
      />
      {error && <Text style={styles.inputError}>{error}</Text>}
      {helperText && !error && (
        <Text style={[styles.inputHelper, isDark && { color: themeColors.textMuted }]}>{helperText}</Text>
      )}
    </View>
  );
}

// ============================================================
// AVATAR
// ============================================================
interface AvatarProps {
  name: string;
  photoUri?: string | null;
  size?: 'sm' | 'md' | 'lg';
}

export function Avatar({ name, size = 'md' }: AvatarProps) {
  const { isDark, themeColors } = useAppStore();
  const sizes = {
    sm: { width: 32, height: 32, fontSize: 12 },
    md: { width: 48, height: 48, fontSize: 16 },
    lg: { width: 72, height: 72, fontSize: 24 },
  };

  const initials = getInitials(name);

  return (
    <View
      style={[
        styles.avatar,
        isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.border, borderWidth: 1 },
        {
          width: sizes[size].width,
          height: sizes[size].height,
          borderRadius: sizes[size].width / 2,
        },
      ]}
    >
      <Text style={[styles.avatarText, isDark && { color: themeColors.text }, { fontSize: sizes[size].fontSize }]}>
        {initials}
      </Text>
    </View>
  );
}

// ============================================================
// BADGE
// ============================================================
interface BadgeProps {
  label: string;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  size?: 'sm' | 'md';
}

export function Badge({ label, variant = 'neutral', size = 'sm' }: BadgeProps) {
  const { isDark } = useAppStore();
  const lightVariantStyles = {
    success: { bg: colors.success[50], text: colors.success[700] },
    warning: { bg: colors.warning[50], text: colors.warning[700] },
    danger: { bg: colors.danger[50], text: colors.danger[700] },
    info: { bg: colors.info[50], text: colors.info[700] },
    neutral: { bg: colors.neutral[100], text: colors.neutral[700] },
  };

  const darkVariantStyles = {
    success: { bg: 'rgba(34, 197, 94, 0.2)', text: '#4ADE80' },
    warning: { bg: 'rgba(234, 179, 8, 0.2)', text: '#FBBF24' },
    danger: { bg: 'rgba(239, 68, 68, 0.2)', text: '#F87171' },
    info: { bg: 'rgba(59, 130, 246, 0.2)', text: '#60A5FA' },
    neutral: { bg: 'rgba(255, 255, 255, 0.1)', text: '#E2E8F0' },
  };

  const variantStyles = isDark ? darkVariantStyles : lightVariantStyles;

  const sizeStyles = {
    sm: { paddingVertical: 2, paddingHorizontal: 8, height: 20 },
    md: { paddingVertical: 4, paddingHorizontal: 12, height: 24 },
  };

  return (
    <View
      style={[
        styles.badge,
        sizeStyles[size],
        { backgroundColor: variantStyles[variant].bg },
      ]}
    >
      <Text
        style={[
          styles.badgeText,
          { color: variantStyles[variant].text, fontWeight: '600' },
          size === 'sm' ? { fontSize: 11 } : { fontSize: 13 },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

// ============================================================
// STAT CARD
// ============================================================
interface StatCardProps {
  value: string;
  label: string;
  accentColor?: string;
  style?: ViewStyle;
}

export function StatCard({ value, label, accentColor, style }: StatCardProps) {
  const { isDark, themeColors } = useAppStore();
  return (
    <View
      style={[
        styles.statCard,
        isDark && { backgroundColor: themeColors.statCardBg, borderColor: themeColors.cardBorder },
        accentColor && { borderLeftColor: accentColor, borderLeftWidth: 4 },
        style,
      ]}
    >
      <Text style={[styles.statValue, isDark && { color: themeColors.text }]} numberOfLines={1}>{value}</Text>
      <Text style={[styles.statLabel, isDark && { color: themeColors.textSecondary }]}>{label}</Text>
    </View>
  );
}

// ============================================================
// SECTION HEADER
// ============================================================
interface SectionHeaderProps {
  title: string;
  action?: string;
  onActionPress?: () => void;
}

export function SectionHeader({ title, action, onActionPress }: SectionHeaderProps) {
  const { isDark, themeColors } = useAppStore();
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, isDark && { color: themeColors.textSecondary }]}>{title}</Text>
      {action && (
        <TouchableOpacity onPress={onActionPress}>
          <Text style={[styles.sectionAction, isDark && { color: colors.primary[500] }]}>{action}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ============================================================
// EMPTY STATE
// ============================================================
interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon = 'file-tray-outline',
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const { isDark, themeColors } = useAppStore();
  return (
    <View style={styles.emptyState}>
      <Ionicons name={icon} size={80} color={isDark ? themeColors.textMuted : colors.neutral[300]} />
      <Text style={[styles.emptyTitle, isDark && { color: themeColors.text }]}>{title}</Text>
      {description && <Text style={[styles.emptyDescription, isDark && { color: themeColors.textSecondary }]}>{description}</Text>}
      {actionLabel && onAction && (
        <Button title={actionLabel} onPress={onAction} style={{ marginTop: spacing[4] }} />
      )}
    </View>
  );
}

// ============================================================
// DIVIDER
// ============================================================
interface DividerProps {
  style?: ViewStyle;
}

export function Divider({ style }: DividerProps) {
  const { isDark, themeColors } = useAppStore();
  return <View style={[styles.divider, isDark && { backgroundColor: themeColors.divider }, style]} />;
}

// ============================================================
// STYLES
// ============================================================
const styles = StyleSheet.create({
  // Button
  buttonBase: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Card
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
  },

  // Text Input
  inputContainer: {
    marginBottom: spacing[4],
  },
  inputLabel: {
    ...typography.label,
    color: colors.neutral[700],
    marginBottom: spacing[1],
  },
  textInput: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.neutral[300],
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    fontSize: 15,
    color: colors.neutral[900],
    height: 48,
  },
  textInputFocused: {
    borderColor: colors.primary[500],
    shadowColor: colors.primary[500],
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  textInputError: {
    borderColor: colors.danger[500],
  },
  textInputDisabled: {
    backgroundColor: colors.neutral[100],
    borderColor: colors.neutral[200],
    color: colors.neutral[500],
  },
  inputError: {
    ...typography.caption,
    color: colors.danger[500],
    marginTop: spacing[1],
  },
  inputHelper: {
    ...typography.caption,
    color: colors.neutral[500],
    marginTop: spacing[1],
  },

  // Avatar
  avatar: {
    backgroundColor: colors.neutral[200],
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontWeight: '600',
    color: colors.neutral[700],
  },

  // Badge
  badge: {
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontWeight: '600',
  },

  // Stat Card
  statCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    ...shadows.md,
    flex: 1,
  },
  statValue: {
    ...typography.amountLarge,
    color: colors.neutral[900],
  },
  statLabel: {
    ...typography.caption,
    color: colors.neutral[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing[1],
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    marginVertical: spacing[3],
  },
  sectionTitle: {
    ...typography.overline,
    color: colors.neutral[500],
  },
  sectionAction: {
    ...typography.bodySmall,
    color: colors.primary[600],
    fontWeight: '600',
  },

  // Empty State
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[12],
  },
  emptyTitle: {
    ...typography.h2,
    color: colors.neutral[900],
    marginTop: spacing[4],
    textAlign: 'center',
  },
  emptyDescription: {
    ...typography.body,
    color: colors.neutral[500],
    textAlign: 'center',
    marginTop: spacing[2],
    maxWidth: 280,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: colors.neutral[200],
  },
});
