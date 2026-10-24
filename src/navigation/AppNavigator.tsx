// Worker WageBook - Navigation Setup

import React from 'react';
import { Platform } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme, createNavigationContainerRef } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/theme';
import { useAppStore } from '../stores/appStore';

export const navigationRef = createNavigationContainerRef();

// Screens (barrel import)
import {
  HomeScreen,
  ActivityLogsScreen,
  WorkersListScreen,
  AddWorkerScreen,
  WorkerProfileScreen,
  AttendanceScreen,
  RecordAdvanceScreen,
  WeeklySalaryScreen,
  ReportsScreen,
  WeeklyReportScreen,
  AttendanceReportScreen,
  AdvancesReportScreen,
  AdvancesGivenReportScreen,
  CashbookScreen,
  WorkerSummaryReportScreen,
  WeeklyAuditReportScreen,
  SettingsScreen,
  BusinessProfileScreen,
  ChangePinScreen,
  SalaryRulesScreen,
  CategoryManagementScreen,
  GoogleDriveBackupScreen,
  PinLockScreen,
  SetupPinScreen,
} from '../screens';

const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator();
const WorkersStack = createNativeStackNavigator();
const AttendanceStack = createNativeStackNavigator();
const SalaryStack = createNativeStackNavigator();
const ReportsStack = createNativeStackNavigator();
const SettingsStack = createNativeStackNavigator();
const AuthStack = createNativeStackNavigator();

function useDynamicScreenOptions() {
  const { themeColors } = useAppStore();
  return {
    headerStyle: { backgroundColor: themeColors.headerBg },
    headerTintColor: themeColors.headerText,
    headerTitleStyle: { fontWeight: '600' as const, fontSize: 18 },
    headerShadowVisible: false,
    headerBackTitleVisible: false,
  };
}

function HomeStackNavigator() {
  const screenOptions = useDynamicScreenOptions();
  return (
    <HomeStack.Navigator screenOptions={screenOptions}>
      <HomeStack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <HomeStack.Screen name="ActivityLogs" component={ActivityLogsScreen} options={{ title: 'Activity Logs' }} />
      <HomeStack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
      <HomeStack.Screen name="BusinessProfile" component={BusinessProfileScreen} options={{ title: 'Business Profile' }} />
      <HomeStack.Screen name="ChangePin" component={ChangePinScreen} options={{ title: 'Change PIN' }} />
      <HomeStack.Screen name="SalaryRules" component={SalaryRulesScreen} options={{ title: 'Salary Calculation Rules' }} />
      <HomeStack.Screen name="CategoryManagement" component={CategoryManagementScreen} options={{ title: 'Manage Categories' }} />
      <HomeStack.Screen name="GoogleDriveBackup" component={GoogleDriveBackupScreen} options={{ title: 'Google Drive Backup' }} />
    </HomeStack.Navigator>
  );
}

function WorkersStackNavigator() {
  const screenOptions = useDynamicScreenOptions();
  return (
    <WorkersStack.Navigator screenOptions={screenOptions}>
      <WorkersStack.Screen name="WorkersList" component={WorkersListScreen} options={{ title: 'Workers' }} />
      <WorkersStack.Screen name="AddWorker" component={AddWorkerScreen} options={{ title: 'Add Worker' }} />
      <WorkersStack.Screen name="WorkerProfile" component={WorkerProfileScreen} options={{ title: 'Worker Profile' }} />
    </WorkersStack.Navigator>
  );
}

function AttendanceStackNavigator() {
  const screenOptions = useDynamicScreenOptions();
  return (
    <AttendanceStack.Navigator screenOptions={screenOptions}>
      <AttendanceStack.Screen 
        name="AttendanceList" 
        component={AttendanceScreen} 
        options={{ title: 'Mark Attendance' }} 
      />
    </AttendanceStack.Navigator>
  );
}

function SalaryStackNavigator() {
  const screenOptions = useDynamicScreenOptions();
  return (
    <SalaryStack.Navigator screenOptions={screenOptions}>
      <SalaryStack.Screen 
        name="WeeklySalary" 
        component={WeeklySalaryScreen} 
        options={{ title: 'Weekly Salary' }} 
      />
      <SalaryStack.Screen 
        name="RecordAdvance" 
        component={RecordAdvanceScreen} 
        options={{ title: 'Record Advance' }} 
      />
    </SalaryStack.Navigator>
  );
}

function ReportsStackNavigator() {
  const screenOptions = useDynamicScreenOptions();
  return (
    <ReportsStack.Navigator screenOptions={screenOptions}>
      <ReportsStack.Screen 
        name="ReportsList" 
        component={ReportsScreen} 
        options={{ headerShown: false }} 
      />
      <ReportsStack.Screen 
        name="WeeklyReport" 
        component={WeeklyReportScreen} 
        options={{ title: 'Weekly Salary Report' }} 
      />
      <ReportsStack.Screen 
        name="AttendanceReport" 
        component={AttendanceReportScreen} 
        options={{ title: 'Attendance Register' }} 
      />
      <ReportsStack.Screen 
        name="AdvancesReport" 
        component={AdvancesReportScreen} 
        options={{ title: 'Outstanding Advances' }} 
      />
      <ReportsStack.Screen 
        name="AdvancesGivenReport" 
        component={AdvancesGivenReportScreen} 
        options={{ title: 'Advances Given Report' }} 
      />
      <ReportsStack.Screen 
        name="CashbookReport" 
        component={CashbookScreen} 
        options={{ title: 'Cashbook' }} 
      />
      <ReportsStack.Screen 
        name="WorkerSummaryReport" 
        component={WorkerSummaryReportScreen} 
        options={{ title: 'Worker Summary' }} 
      />
      <ReportsStack.Screen 
        name="WeeklyAuditReport" 
        component={WeeklyAuditReportScreen} 
        options={{ title: 'Weekly Audit Trail' }} 
      />
      <ReportsStack.Screen 
        name="WorkerProfile" 
        component={WorkerProfileScreen} 
        options={{ title: 'Worker Profile' }} 
      />
    </ReportsStack.Navigator>
  );
}

function SettingsStackNavigator() {
  const screenOptions = useDynamicScreenOptions();
  return (
    <SettingsStack.Navigator screenOptions={screenOptions}>
      <SettingsStack.Screen 
        name="Settings" 
        component={SettingsScreen} 
        options={{ title: 'Settings' }} 
      />
      <SettingsStack.Screen 
        name="BusinessProfile" 
        component={BusinessProfileScreen} 
        options={{ title: 'Business Profile' }} 
      />
      <SettingsStack.Screen 
        name="ChangePin" 
        component={ChangePinScreen} 
        options={{ title: 'Change PIN' }} 
      />
      <SettingsStack.Screen 
        name="SalaryRules" 
        component={SalaryRulesScreen} 
        options={{ title: 'Salary Calculation Rules' }} 
      />
      <SettingsStack.Screen 
        name="CategoryManagement" 
        component={CategoryManagementScreen} 
        options={{ title: 'Manage Categories' }} 
      />
      <SettingsStack.Screen 
        name="GoogleDriveBackup" 
        component={GoogleDriveBackupScreen} 
        options={{ title: 'Google Drive Backup' }} 
      />
    </SettingsStack.Navigator>
  );
}

function AuthStackNavigator() {
  const screenOptions = useDynamicScreenOptions();
  return (
    <AuthStack.Navigator screenOptions={{ ...screenOptions, headerShown: false }}>
      <AuthStack.Screen name="PinLock" component={PinLockScreen} />
      <AuthStack.Screen name="SetupPin" component={SetupPinScreen} />
    </AuthStack.Navigator>
  );
}

const TAB_ICONS: Record<string, { focused: keyof typeof Ionicons.glyphMap; unfocused: keyof typeof Ionicons.glyphMap }> = {
  HomeTab: { focused: 'home', unfocused: 'home-outline' },
  WorkersTab: { focused: 'people', unfocused: 'people-outline' },
  AttendanceTab: { focused: 'calendar', unfocused: 'calendar-outline' },
  SalaryTab: { focused: 'wallet', unfocused: 'wallet-outline' },
  ReportsTab: { focused: 'bar-chart', unfocused: 'bar-chart-outline' },
};

const TAB_ROOT_SCREENS: Record<string, string> = {
  HomeTab: 'Home',
  WorkersTab: 'WorkersList',
  AttendanceTab: 'AttendanceList',
  SalaryTab: 'WeeklySalary',
  ReportsTab: 'ReportsList',
};

export function AppNavigator() {
  const { isUnlocked, isDark, themeColors } = useAppStore();
  const insets = useSafeAreaInsets();

  const navTheme = isDark
    ? {
        ...DarkTheme,
        colors: {
          ...DarkTheme.colors,
          primary: colors.primary[500],
          background: themeColors.background,
          card: themeColors.surface,
          text: themeColors.text,
          border: themeColors.border,
        },
      }
    : {
        ...DefaultTheme,
        colors: {
          ...DefaultTheme.colors,
          primary: colors.primary[600],
          background: themeColors.background,
          card: themeColors.surface,
          text: themeColors.text,
          border: themeColors.border,
        },
      };

  if (!isUnlocked) {
    return (
      <NavigationContainer theme={navTheme}>
        <AuthStackNavigator />
      </NavigationContainer>
    );
  }

  // Calculate dynamic bottom padding to support Android 3-button navigation bar,
  // Android gesture navigation bar, and iOS Home indicator bar.
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'web' ? 6 : 8);

  return (
    <NavigationContainer ref={navigationRef} theme={navTheme}>
      <Tab.Navigator
        backBehavior="firstRoute"
        screenListeners={({ navigation, route }) => ({
          tabPress: (e) => {
            const rootScreen = TAB_ROOT_SCREENS[route.name];
            if (rootScreen) {
              e.preventDefault();
              navigation.navigate(route.name, {
                screen: rootScreen,
                pop: true,
              });
            }
          },
        })}
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarIcon: ({ focused, color, size }) => {
            const icons = TAB_ICONS[route.name];
            const iconName = focused ? icons.focused : icons.unfocused;
            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: colors.primary[500],
          tabBarInactiveTintColor: isDark ? themeColors.textMuted : colors.neutral[400],
          tabBarStyle: {
            backgroundColor: themeColors.tabBarBg,
            borderTopColor: themeColors.tabBarBorder,
            height: 56 + bottomInset,
            paddingBottom: bottomInset,
            paddingTop: 6,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '500',
          },
        })}
      >
        <Tab.Screen name="HomeTab" component={HomeStackNavigator} options={{ tabBarLabel: 'Home' }} />
        <Tab.Screen name="WorkersTab" component={WorkersStackNavigator} options={{ tabBarLabel: 'Workers' }} />
        <Tab.Screen name="AttendanceTab" component={AttendanceStackNavigator} options={{ tabBarLabel: 'Attendance' }} />
        <Tab.Screen name="SalaryTab" component={SalaryStackNavigator} options={{ tabBarLabel: 'Salary' }} />
        <Tab.Screen name="ReportsTab" component={ReportsStackNavigator} options={{ tabBarLabel: 'Reports' }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
