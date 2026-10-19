// Worker WageBook - Splash Screen
import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { colors, spacing, typography } from '../constants/theme';

export function SplashScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* Tagline */}
        <Text style={styles.tagline}>Manage wages with ease</Text>

        {/* Loading Indicator */}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary[600]} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.version}>Version 1.0.0</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing[6],
  },
  logoContainer: {
    width: 220,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  logo: {
    width: 200,
    height: 185,
  },
  appName: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: spacing[2],
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 16,
    color: colors.neutral[600],
    marginBottom: spacing[8],
  },
  loadingContainer: {
    alignItems: 'center',
    marginTop: spacing[8],
  },
  loadingText: {
    ...typography.body,
    color: colors.neutral[500],
    marginTop: spacing[3],
  },
  footer: {
    paddingBottom: spacing[8],
  },
  version: {
    ...typography.caption,
    color: colors.neutral[400],
  },
});
