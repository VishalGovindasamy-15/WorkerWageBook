// Worker WageBook - Global State Store

import { create } from 'zustand';
import { Appearance } from 'react-native';
import { WeekRange, Category, SalaryCalculationRules } from '../types';
import { getWeekRange, getWeekLabel } from '../utils/helpers';
import { ThemeMode, ThemeColors, lightTheme, darkTheme } from '../constants/theme';
import { settingsService } from '../services/settingsService';

interface AppState {
  // Theme
  themeMode: ThemeMode;
  isDark: boolean;
  themeColors: ThemeColors;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  initTheme: () => Promise<void>;

  // Authentication
  isUnlocked: boolean;
  pinSetupRequired: boolean;
  setUnlocked: (unlocked: boolean) => void;
  setPinSetupRequired: (required: boolean) => void;

  // Current week selection
  currentWeekDate: Date;
  currentWeek: WeekRange;
  setCurrentWeekDate: (date: Date) => void;
  goToNextWeek: () => void;
  goToPreviousWeek: () => void;

  // Categories cache
  categories: Category[];
  setCategories: (categories: Category[]) => void;

  // Salary rules cache
  salaryRules: SalaryCalculationRules | null;
  setSalaryRules: (rules: SalaryCalculationRules) => void;

  // Week start day
  weekStartsOn: 0 | 1;
  setWeekStartsOn: (day: 0 | 1) => void;

  // Loading states
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;

  // Toast messages
  toast: { message: string; type: 'success' | 'error' | 'info' } | null;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  hideToast: () => void;
}

export const useAppStore = create<AppState>((set, get) => {
  const initialScheme = Appearance.getColorScheme();
  const initialIsDark = initialScheme === 'dark';

  return {
    // Theme
    themeMode: 'system',
    isDark: initialIsDark,
    themeColors: initialIsDark ? darkTheme : lightTheme,
    setThemeMode: async (mode) => {
      await settingsService.setThemeMode(mode);
      const isDark =
        mode === 'dark' ||
        (mode === 'system' && Appearance.getColorScheme() === 'dark');
      set({
        themeMode: mode,
        isDark,
        themeColors: isDark ? darkTheme : lightTheme,
      });
    },
    initTheme: async () => {
      const saved = await settingsService.getThemeMode();
      const isDark =
        saved === 'dark' ||
        (saved === 'system' && Appearance.getColorScheme() === 'dark');
      set({
        themeMode: saved,
        isDark,
        themeColors: isDark ? darkTheme : lightTheme,
      });
    },

    // Authentication
    isUnlocked: false,
    pinSetupRequired: false,
    setUnlocked: (unlocked) => set({ isUnlocked: unlocked }),
    setPinSetupRequired: (required) => set({ pinSetupRequired: required }),

  // Current week
  currentWeekDate: new Date(),
  currentWeek: (() => {
    const { start, end } = getWeekRange(new Date(), 1);
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
      label: getWeekLabel(new Date(), 1),
    };
  })(),
  setCurrentWeekDate: (date) => {
    const weekStartsOn = get().weekStartsOn;
    const { start, end } = getWeekRange(date, weekStartsOn);
    set({
      currentWeekDate: date,
      currentWeek: {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0],
        label: getWeekLabel(date, weekStartsOn),
      },
    });
  },
  goToNextWeek: () => {
    const current = get().currentWeekDate;
    const next = new Date(current);
    next.setDate(next.getDate() + 7);
    get().setCurrentWeekDate(next);
  },
  goToPreviousWeek: () => {
    const current = get().currentWeekDate;
    const prev = new Date(current);
    prev.setDate(prev.getDate() - 7);
    get().setCurrentWeekDate(prev);
  },

  // Categories
  categories: [],
  setCategories: (categories) => set({ categories }),

  // Salary rules
  salaryRules: null,
  setSalaryRules: (rules) => set({ salaryRules: rules }),

  // Week start day
  weekStartsOn: 1, // Monday
  setWeekStartsOn: (day) => set({ weekStartsOn: day }),

  // Loading
  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),

  // Toast
  toast: null,
  showToast: (message, type = 'info') => {
    set({ toast: { message, type } });
    setTimeout(() => {
      set({ toast: null });
    }, 3000);
  },
  hideToast: () => set({ toast: null }),
  };
});
