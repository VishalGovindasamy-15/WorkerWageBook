// Worker WageBook - Main App Entry Point

import React, { useEffect, useState } from 'react';
import { StatusBar, LogBox, Platform, View, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './src/navigation/AppNavigator';
import { SplashScreen } from './src/screens/SplashScreen';
import { initializeDatabase } from './src/database/database';
import { seedService } from './src/services/seedService';
import { workerService } from './src/services/workerService';
import { attendanceService } from './src/services/attendanceService';
import { salaryService } from './src/services/salaryService';
import { settingsService } from './src/services/settingsService';
import { colors } from './src/constants/theme';
import { useAppStore } from './src/stores/appStore';

// Suppress specific warnings in development
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
]);

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const { isDark, themeColors, initTheme } = useAppStore();

  useEffect(() => {
    async function init() {
      try {
        await initializeDatabase();
        console.log('[App] Database initialized');
        await initTheme();
      } catch (error) {
        console.error('[App] Database initialization failed:', error);
      } finally {
        setIsReady(true);
      }
    }
    init();

    // Show splash screen for at least 2 seconds
    const splashTimer = setTimeout(() => {
      setShowSplash(false);
    }, 2000);

    return () => clearTimeout(splashTimer);
  }, []);

  // Show splash screen while loading or for minimum 2 seconds
  if (!isReady || showSplash) {
    return (
      <View style={styles.root}>
        <View style={styles.mobileContainer}>
          <SplashScreen />
        </View>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
    <GestureHandlerRootView style={[styles.root, { backgroundColor: isDark ? '#020617' : (Platform.OS === 'web' ? '#f1f5f9' : colors.white) }]}>
      <StatusBar 
        barStyle={isDark ? "light-content" : "dark-content"} 
        {...(Platform.OS !== 'web' && { backgroundColor: isDark ? themeColors.background : colors.white })} 
      />
      <View style={[styles.mobileContainer, { backgroundColor: themeColors.background }]}>
        <AppNavigator />
      </View>
    </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Platform.OS === 'web' ? '#f1f5f9' : colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileContainer: {
    flex: 1,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 480 : undefined,
    height: '100%',
    backgroundColor: colors.white,
    overflow: 'hidden',
    ...(Platform.OS === 'web' && {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 16,
    }),
  },
});
