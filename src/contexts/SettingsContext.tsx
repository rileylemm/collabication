import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Define the structure for each settings category
export interface EditorSettings {
  defaultPreferredType: 'automatic' | 'markdown' | 'richText' | 'code';
  autoSave: boolean;
  autoSaveInterval: number; // in milliseconds
  fontSize: number;
  tabSize: number;
  lineWrapping: boolean;
  lineNumbers: boolean;
  spellCheck: boolean;
}

export interface GitHubSettings {
  autoPush: boolean;
  autoPull: boolean;
  syncInterval: number; // in milliseconds
  defaultCommitMessage: string;
  showFileStatusIndicators: boolean;
}

export interface CollaborationSettings {
  userName: string;
  userColor: string;
  showPresenceIndicators: boolean;
  autoConnect: boolean;
  showOfflineIndicator: boolean;
}

export interface UISettings {
  theme: 'light' | 'dark' | 'system';
  sidebarWidth: number;
  rightSidebarWidth: number;
  fontSize: 'small' | 'medium' | 'large';
  showMinimap: boolean;
  showStatusBar: boolean;
}

// Define the structure for keyboard shortcut settings
export interface KeyboardShortcutSettings {
  enableShortcuts: boolean;
  showShortcutsHelp: boolean;
  customizeShortcuts: boolean;
}

export interface ApplicationSettings {
  editor: EditorSettings;
  github: GitHubSettings;
  collaboration: CollaborationSettings;
  ui: UISettings;
  keyboardShortcuts: KeyboardShortcutSettings;
}

// Default settings
const defaultEditorSettings: EditorSettings = {
  defaultPreferredType: 'automatic',
  autoSave: true,
  autoSaveInterval: 5000,
  fontSize: 14,
  tabSize: 2,
  lineWrapping: true,
  lineNumbers: true,
  spellCheck: false,
};

const defaultGitHubSettings: GitHubSettings = {
  autoPush: false,
  autoPull: true,
  syncInterval: 300000, // 5 minutes
  defaultCommitMessage: 'Update document',
  showFileStatusIndicators: true,
};

const defaultCollaborationSettings: CollaborationSettings = {
  userName: '',
  userColor: '#' + Math.floor(Math.random() * 16777215).toString(16), // Random color
  showPresenceIndicators: true,
  autoConnect: true,
  showOfflineIndicator: true,
};

const defaultUISettings: UISettings = {
  theme: 'system',
  sidebarWidth: 250,
  rightSidebarWidth: 300,
  fontSize: 'medium',
  showMinimap: true,
  showStatusBar: true,
};

// Add default keyboard shortcut settings
const defaultKeyboardShortcutSettings: KeyboardShortcutSettings = {
  enableShortcuts: true,
  showShortcutsHelp: true,
  customizeShortcuts: true,
};

// Update defaultSettings to include keyboard shortcuts
const defaultSettings: ApplicationSettings = {
  editor: defaultEditorSettings,
  github: defaultGitHubSettings,
  collaboration: defaultCollaborationSettings,
  ui: defaultUISettings,
  keyboardShortcuts: defaultKeyboardShortcutSettings,
};

// Context type definition
interface SettingsContextType {
  settings: ApplicationSettings;
  updateSettings: (category: keyof ApplicationSettings, settings: Partial<ApplicationSettings[keyof ApplicationSettings]>) => void;
  resetSettings: (category?: keyof ApplicationSettings) => void;
}

// Create context with default values
const SettingsContext = createContext<SettingsContextType>({
  settings: defaultSettings,
  updateSettings: () => {},
  resetSettings: () => {},
});

// Hook for using the settings context
export const useSettings = () => useContext(SettingsContext);

// Settings provider component props
interface SettingsProviderProps {
  children: ReactNode;
}

// Storage key for localStorage
const SETTINGS_STORAGE_KEY = 'collabication-settings';

// Settings provider component
export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  // Initialize settings from localStorage or use defaults
  const [settings, setSettings] = useState<ApplicationSettings>(() => {
    try {
      // Check if we're in a browser environment
      if (typeof window !== 'undefined' && window.localStorage) {
        const storedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
        if (storedSettings) {
          // Parse stored settings and merge with defaults to ensure all properties exist
          const parsedSettings = JSON.parse(storedSettings);
          return {
            editor: { ...defaultEditorSettings, ...parsedSettings.editor },
            github: { ...defaultGitHubSettings, ...parsedSettings.github },
            collaboration: { ...defaultCollaborationSettings, ...parsedSettings.collaboration },
            ui: { ...defaultUISettings, ...parsedSettings.ui },
            keyboardShortcuts: { ...defaultKeyboardShortcutSettings, ...parsedSettings.keyboardShortcuts },
          };
        }
      }
    } catch (error) {
      console.error('Error loading settings from localStorage:', error);
    }
    
    // Return default settings if stored settings can't be loaded
    return defaultSettings;
  });
  
  // Handle system theme preference changes for the 'system' theme setting
  useEffect(() => {
    if (settings.ui.theme === 'system' && typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      const handleChange = () => {
        // This will trigger a re-render with the updated system preference
        setSettings(prevSettings => ({ ...prevSettings }));
      };
      
      mediaQuery.addEventListener('change', handleChange);
      
      return () => {
        mediaQuery.removeEventListener('change', handleChange);
      };
    }
  }, [settings.ui.theme]);
  
  // Persist settings to localStorage whenever they change
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
      }
    } catch (error) {
      console.error('Error saving settings to localStorage:', error);
    }
  }, [settings]);
  
  // Update settings for a specific category
  const updateSettings = (
    category: keyof ApplicationSettings, 
    newSettings: Partial<ApplicationSettings[keyof ApplicationSettings]>
  ) => {
    setSettings(prevSettings => ({
      ...prevSettings,
      [category]: {
        ...prevSettings[category],
        ...newSettings,
      },
    }));
  };
  
  // Reset settings to defaults, either for a specific category or all settings
  const resetSettings = (category?: keyof ApplicationSettings) => {
    if (category) {
      setSettings(prevSettings => ({
        ...prevSettings,
        [category]: defaultSettings[category],
      }));
    } else {
      setSettings(defaultSettings);
    }
  };
  
  // Determine the effective theme based on settings and system preference
  const getEffectiveTheme = (): 'light' | 'dark' => {
    if (settings.ui.theme === 'system') {
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    }
    return settings.ui.theme;
  };
  
  // Temporary fix for ThemeContext compatibility
  // This will be removed once ThemeContext is integrated with SettingsContext
  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('theme', getEffectiveTheme());
    }
  }, [settings.ui.theme]);
  
  // Export the context values
  const contextValue: SettingsContextType = {
    settings,
    updateSettings,
    resetSettings,
  };
  
  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  );
};

export default SettingsContext; 