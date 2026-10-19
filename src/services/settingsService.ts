// Worker WageBook - Settings Service

import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { getFirstAsync, runAsync } from '../database/database';

const PIN_KEY = 'workerwagebook_pin';

async function setSecureItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function getSecureItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
    return null;
  }
  return SecureStore.getItemAsync(key);
}

async function deleteSecureItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
    }
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export const settingsService = {
  // PIN Management
  async setPin(pin: string): Promise<void> {
    await setSecureItem(PIN_KEY, pin);
    await this.setSetting('pin_set', 'true');
  },

  async getPin(): Promise<string | null> {
    return getSecureItem(PIN_KEY);
  },

  async isPinSet(): Promise<boolean> {
    const pin = await this.getPin();
    return pin !== null && pin.length > 0;
  },

  async verifyPin(pin: string): Promise<boolean> {
    const storedPin = await this.getPin();
    return storedPin === pin;
  },

  async changePin(oldPin: string, newPin: string): Promise<boolean> {
    const isValid = await this.verifyPin(oldPin);
    if (!isValid) return false;
    await this.setPin(newPin);
    return true;
  },

  async clearPin(): Promise<void> {
    await deleteSecureItem(PIN_KEY);
    await this.setSetting('pin_set', 'false');
  },

  // General Settings
  async getSetting(key: string): Promise<string | null> {
    const result = await getFirstAsync<{ value: string }>(
      'SELECT value FROM settings WHERE key = ?',
      [key]
    );
    return result?.value ?? null;
  },

  async setSetting(key: string, value: string): Promise<void> {
    await runAsync(
      `INSERT INTO settings (key, value, updated_at) 
       VALUES (?, ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = datetime('now')`,
      [key, value, value]
    );
  },

  async getAllSettings(): Promise<Record<string, string>> {
    const { getAllAsync } = await import('../database/database');
    const rows = await getAllAsync<{ key: string; value: string }>(
      'SELECT key, value FROM settings'
    );
    const settings: Record<string, string> = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }
    return settings;
  },

  // Business Settings
  async getBusinessName(): Promise<string> {
    return (await this.getSetting('business_name')) || 'My Business';
  },

  async setBusinessName(name: string): Promise<void> {
    await this.setSetting('business_name', name);
  },

  async getWeekStartDay(): Promise<string> {
    return (await this.getSetting('week_start_day')) || 'monday';
  },

  async setWeekStartDay(day: string): Promise<void> {
    await this.setSetting('week_start_day', day);
  },

  // Backup Settings
  async getLastBackupAt(): Promise<string | null> {
    return this.getSetting('last_backup_at');
  },

  async setLastBackupAt(date: string): Promise<void> {
    await this.setSetting('last_backup_at', date);
  },

  async getAutoBackupSchedule(): Promise<string> {
    return (await this.getSetting('auto_backup_schedule')) || 'weekly';
  },

  async setAutoBackupSchedule(schedule: string): Promise<void> {
    await this.setSetting('auto_backup_schedule', schedule);
  },

  // Theme Settings
  async getThemeMode(): Promise<'light' | 'dark' | 'system'> {
    return ((await this.getSetting('theme_mode')) as any) || 'system';
  },

  async setThemeMode(mode: 'light' | 'dark' | 'system'): Promise<void> {
    await this.setSetting('theme_mode', mode);
  },
};
