import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import i18n from '../i18n';

export interface AppSettings {
  // 界面设置
  theme: 'dark' | 'light' | 'auto';
  fontSize: 'small' | 'medium' | 'large';
  maxLogLines: number;
  autoSave: boolean;
  
  // 默认串口参数
  defaultBaudRate: number;
  defaultDataBits: number;
  defaultParity: string;
  defaultStopBits: number;
  
  // 自动发送设置
  defaultAutoSendInterval: number;
  
  // 显示设置
  showTimestamp: boolean;
  autoScroll: boolean;
  displayFormat: 'utf8' | 'hex';
  
  // 快捷键设置
  shortcuts: {
    saveConfig: string;
    refreshPorts: string;
    toggleFormat: string;
    clearLogs: string;
    sendData: string;
  };
  
  // 语言设置
  language: 'zh-CN' | 'en-US';
}

export const defaultSettings: AppSettings = {
  theme: 'auto',
  fontSize: 'medium',
  maxLogLines: 1000,
  autoSave: true,
  
  defaultBaudRate: 115200,
  defaultDataBits: 8,
  defaultParity: 'none',
  defaultStopBits: 1,
  
  defaultAutoSendInterval: 1000,
  
  showTimestamp: true,
  autoScroll: true,
  displayFormat: 'utf8',
  
  shortcuts: {
    saveConfig: 'Ctrl+S',
    refreshPorts: 'Ctrl+R',
    toggleFormat: 'Ctrl+T',
    clearLogs: 'Ctrl+L',
    sendData: 'Enter'
  },
  
  language: 'zh-CN'
};

interface SettingsContextType {
  settings: AppSettings;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  saveSettings: () => Promise<boolean>;
  resetSettings: () => void;
  exportSettings: () => void;
  importSettings: () => Promise<boolean>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

interface SettingsProviderProps {
  children: ReactNode;
}

const SETTINGS_KEY = 'serialTool_settings';

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  
  // Track theme listener cleanup to prevent leaks
  const themeCleanupRef = useRef<(() => void) | null>(null);

  // 应用主题设置
  const applyTheme = (theme: AppSettings['theme']) => {
    const root = document.documentElement;
    
    // Clean up previous listener
    if (themeCleanupRef.current) {
      themeCleanupRef.current();
      themeCleanupRef.current = null;
    }
    
    if (theme === 'auto') {
      // 监听系统主题变化
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const applySystemTheme = () => {
        root.classList.toggle('dark', mediaQuery.matches);
      };
      
      applySystemTheme();
      mediaQuery.addEventListener('change', applySystemTheme);
      
      // Store cleanup function
      themeCleanupRef.current = () => mediaQuery.removeEventListener('change', applySystemTheme);
    } else {
      root.classList.toggle('dark', theme === 'dark');
    }
  };
  
  // Apply language setting
  const applyLanguage = (language: AppSettings['language']) => {
    i18n.changeLanguage(language);
    document.documentElement.lang = language;
  };

  // 应用字体大小设置
  const applyFontSize = (fontSize: AppSettings['fontSize']) => {
    const fontSizeMap = {
      small: '12px',
      medium: '14px',
      large: '16px'
    };
    
    document.documentElement.style.setProperty('--app-font-size', fontSizeMap[fontSize]);
  };

  // 加载设置
  const loadSettings = () => {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const mergedSettings = { ...defaultSettings, ...parsed };
        setSettings(mergedSettings);
        
        // 立即应用设置
        applyTheme(mergedSettings.theme);
        applyFontSize(mergedSettings.fontSize);
        applyLanguage(mergedSettings.language);
        
        console.log('Settings loaded and applied:', mergedSettings);
        return mergedSettings;
      }
    } catch (error) {
      console.error('加载设置失败:', error);
      // 使用默认设置并立即应用
      applyTheme(defaultSettings.theme);
      applyFontSize(defaultSettings.fontSize);
      applyLanguage(defaultSettings.language);
    }
    
    return defaultSettings;
  };

  // 初始化设置
  useEffect(() => {
    loadSettings();
    
    // Cleanup theme listener on unmount
    return () => {
      if (themeCleanupRef.current) {
        themeCleanupRef.current();
      }
    };
  }, []);

  // 更新设置
  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings(prev => {
      const newSettings = { ...prev, [key]: value };
      
      // 立即应用特定设置
      if (key === 'theme') {
        applyTheme(value as AppSettings['theme']);
      } else if (key === 'fontSize') {
        applyFontSize(value as AppSettings['fontSize']);
      } else if (key === 'language') {
        applyLanguage(value as AppSettings['language']);
      }
      
      // 自动保存
      if (prev.autoSave) {
        setTimeout(() => {
          try {
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
            console.log('Settings auto-saved:', { [key]: value });
          } catch (error) {
            console.error('自动保存设置失败:', error);
          }
        }, 100);
      }
      
      return newSettings;
    });
  };

  // 手动保存设置
  const saveSettings = async (): Promise<boolean> => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      console.log('Settings manually saved:', settings);
      return true;
    } catch (error) {
      console.error('保存设置失败:', error);
      return false;
    }
  };

  // 重置设置
  const resetSettings = () => {
    setSettings(defaultSettings);
    
    // 立即应用默认设置
    applyTheme(defaultSettings.theme);
    applyFontSize(defaultSettings.fontSize);
    applyLanguage(defaultSettings.language);
    
    // 保存到本地存储
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(defaultSettings));
      console.log('Settings reset to defaults');
    } catch (error) {
      console.error('重置设置时保存失败:', error);
    }
  };

  // 导出设置
  const exportSettings = () => {
    const dataStr = JSON.stringify(settings, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `serial-tool-settings-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 导入设置
  const importSettings = (): Promise<boolean> => {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) {
          resolve(false);
          return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const imported = JSON.parse(event.target?.result as string);
            const mergedSettings = { ...defaultSettings, ...imported };
            
            setSettings(mergedSettings);
            
            // 立即应用导入的设置
            applyTheme(mergedSettings.theme);
            applyFontSize(mergedSettings.fontSize);
            applyLanguage(mergedSettings.language);
            
            // 保存到本地存储
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(mergedSettings));
            
            console.log('Settings imported and applied:', mergedSettings);
            resolve(true);
          } catch (error) {
            console.error('导入设置失败:', error);
            resolve(false);
          }
        };
        
        reader.readAsText(file);
      };

      input.click();
    });
  };

  const contextValue = {
    settings,
    updateSetting,
    saveSettings,
    resetSettings,
    exportSettings,
    importSettings
  };

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};