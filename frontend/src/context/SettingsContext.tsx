import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as settingsApi from '../api/settingsApi';

export interface SystemSetting {
  id: string;
  setting_key: string;
  setting_value: string;
  category: string;
  description: string;
  is_encrypted: boolean;
  created_at: string;
  updated_at: string;
  updated_by?: string;
}

interface SettingsContextType {
  settings: SystemSetting[];
  loading: boolean;
  error: string | null;
  getSetting: (key: string, defaultValue?: string) => string;
  getSettingsByCategory: (category: string) => SystemSetting[];
  updateSetting: (key: string, value: string) => Promise<void>;
  updateMultipleSettings: (updates: { key: string; value: string }[]) => Promise<void>;
  refreshSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await settingsApi.list();
      setSettings(data);
    } catch (err) {
      console.error(err);
      setError('Settings unavailable');
      setSettings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const getSetting = (key: string, defaultValue: string = ''): string => {
    const setting = settings.find((s) => s.setting_key === key);
    return setting?.setting_value || defaultValue;
  };

  const getSettingsByCategory = (category: string): SystemSetting[] => {
    return settings.filter((s) => s.category === category);
  };

  const updateSetting = async (key: string, value: string): Promise<void> => {
    try {
      const updated = await settingsApi.update(key, value);
      setSettings((prev) => {
        const next = [...prev];
        const idx = next.findIndex((s) => s.setting_key === key);
        if (idx >= 0) {
          next[idx] = updated;
        } else {
          next.push(updated);
        }
        return next;
      });
    } catch (err) {
      console.error('Failed to update setting:', err);
      throw err;
    }
  };

  const updateMultipleSettings = async (
    updates: { key: string; value: string }[]
  ): Promise<void> => {
    try {
      if (updates.length === 0) return;
      await settingsApi.updateBatch(updates);
      // Refresh all to be safe and consistent
      await loadSettings();
    } catch (err) {
      console.error('Failed to update multiple settings:', err);
      throw err;
    }
  };

  const refreshSettings = async (): Promise<void> => {
    await loadSettings();
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        loading,
        error,
        getSetting,
        getSettingsByCategory,
        updateSetting,
        updateMultipleSettings,
        refreshSettings,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSystemSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSystemSettings must be used within a SettingsProvider');
  }
  return context;
}
