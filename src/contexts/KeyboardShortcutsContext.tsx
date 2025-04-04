import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useSettings } from './SettingsContext';

// Define shortcut action categories
export type ShortcutCategory = 
  | 'general'
  | 'editor'
  | 'git'
  | 'search'
  | 'navigation'
  | 'view';

// Define a shortcut action
export interface ShortcutAction {
  id: string;
  category: ShortcutCategory;
  description: string;
  defaultKeyCombination: string | string[];
  isEnabled: boolean;
  customKeyCombination?: string | string[];
}

// Define a keyboard event handler
export type ShortcutHandler = (e: KeyboardEvent) => void;

// Type for shortcut registrations
interface ShortcutRegistration {
  actionId: string;
  handler: ShortcutHandler;
}

// Format for displaying shortcuts
export const formatKeyCombination = (keyCombination: string | string[]): string => {
  if (Array.isArray(keyCombination)) {
    return keyCombination.map(formatKeyCombination).join(' / ');
  }
  
  // Replace special keys with symbols or more readable formats
  return keyCombination
    .replace('Mod', navigator.platform.includes('Mac') ? '⌘' : 'Ctrl')
    .replace('Ctrl', 'Ctrl')
    .replace('Shift', '⇧')
    .replace('Alt', navigator.platform.includes('Mac') ? '⌥' : 'Alt')
    .replace('Meta', '⌘')
    .replace('ArrowUp', '↑')
    .replace('ArrowDown', '↓')
    .replace('ArrowLeft', '←')
    .replace('ArrowRight', '→')
    .replace('Enter', '↵')
    .replace('Escape', 'Esc')
    .replace('Delete', 'Del')
    .replace('Backspace', '⌫')
    .replace(' ', 'Space')
    .replace('+', ' + ');
};

// Check if a keyboard event matches a key combination
export const matchesKeyCombination = (e: KeyboardEvent, keyCombination: string | string[]): boolean => {
  if (Array.isArray(keyCombination)) {
    return keyCombination.some(combo => matchesKeyCombination(e, combo));
  }
  
  const parts = keyCombination.split('+').map(part => part.trim());
  
  const modifiers = parts.filter(part => ['Ctrl', 'Shift', 'Alt', 'Meta', 'Mod'].includes(part));
  const key = parts.find(part => !['Ctrl', 'Shift', 'Alt', 'Meta', 'Mod'].includes(part));
  
  // Check modifiers
  const ctrlRequired = modifiers.includes('Ctrl') || (modifiers.includes('Mod') && !navigator.platform.includes('Mac'));
  const metaRequired = modifiers.includes('Meta') || (modifiers.includes('Mod') && navigator.platform.includes('Mac'));
  const shiftRequired = modifiers.includes('Shift');
  const altRequired = modifiers.includes('Alt');
  
  const modifiersMatch = (
    (ctrlRequired === e.ctrlKey) &&
    (metaRequired === e.metaKey) &&
    (shiftRequired === e.shiftKey) &&
    (altRequired === e.altKey)
  );
  
  // Check key
  const keyMatches = key && (
    e.key.toLowerCase() === key.toLowerCase() ||
    e.code === key ||
    e.code === `Key${key.toUpperCase()}`
  );
  
  return modifiersMatch && !!keyMatches;
};

// Define the default shortcuts
export const defaultShortcuts: ShortcutAction[] = [
  // General shortcuts
  {
    id: 'save',
    category: 'general',
    description: 'Save the current file',
    defaultKeyCombination: 'Mod+S',
    isEnabled: true,
  },
  {
    id: 'new_file',
    category: 'general',
    description: 'Create a new file',
    defaultKeyCombination: 'Mod+N',
    isEnabled: true,
  },
  
  // Editor shortcuts
  {
    id: 'undo',
    category: 'editor',
    description: 'Undo the last action',
    defaultKeyCombination: 'Mod+Z',
    isEnabled: true,
  },
  {
    id: 'redo',
    category: 'editor',
    description: 'Redo the last undone action',
    defaultKeyCombination: ['Mod+Shift+Z', 'Mod+Y'],
    isEnabled: true,
  },
  {
    id: 'toggle_bold',
    category: 'editor',
    description: 'Toggle bold formatting',
    defaultKeyCombination: 'Mod+B',
    isEnabled: true,
  },
  {
    id: 'toggle_italic',
    category: 'editor',
    description: 'Toggle italic formatting',
    defaultKeyCombination: 'Mod+I',
    isEnabled: true,
  },
  {
    id: 'toggle_code',
    category: 'editor',
    description: 'Toggle code formatting',
    defaultKeyCombination: 'Mod+E',
    isEnabled: true,
  },
  {
    id: 'toggle_link',
    category: 'editor',
    description: 'Toggle link formatting',
    defaultKeyCombination: 'Mod+K',
    isEnabled: true,
  },
  {
    id: 'fold_code',
    category: 'editor',
    description: 'Fold code block',
    defaultKeyCombination: 'Mod+Alt+[',
    isEnabled: true,
  },
  {
    id: 'unfold_code',
    category: 'editor',
    description: 'Unfold code block',
    defaultKeyCombination: 'Mod+Alt+]',
    isEnabled: true,
  },
  {
    id: 'fold_all_code',
    category: 'editor',
    description: 'Fold all code blocks',
    defaultKeyCombination: 'Mod+Alt+Shift+[',
    isEnabled: true,
  },
  {
    id: 'unfold_all_code',
    category: 'editor',
    description: 'Unfold all code blocks',
    defaultKeyCombination: 'Mod+Alt+Shift+]',
    isEnabled: true,
  },
  
  // Git shortcuts
  {
    id: 'git_commit',
    category: 'git',
    description: 'Commit changes',
    defaultKeyCombination: 'Mod+G Mod+C',
    isEnabled: true,
  },
  {
    id: 'git_push',
    category: 'git',
    description: 'Push changes',
    defaultKeyCombination: 'Mod+G Mod+P',
    isEnabled: true,
  },
  {
    id: 'git_pull',
    category: 'git',
    description: 'Pull changes',
    defaultKeyCombination: 'Mod+G Mod+L',
    isEnabled: true,
  },
  
  // Search shortcuts
  {
    id: 'search_file',
    category: 'search',
    description: 'Search in current file',
    defaultKeyCombination: 'Mod+F',
    isEnabled: true,
  },
  {
    id: 'search_all',
    category: 'search',
    description: 'Search across all content',
    defaultKeyCombination: 'Mod+Shift+F',
    isEnabled: true,
  },
  {
    id: 'goto_line',
    category: 'search',
    description: 'Go to line',
    defaultKeyCombination: 'Mod+G',
    isEnabled: true,
  },
  {
    id: 'find_next',
    category: 'search',
    description: 'Find next match',
    defaultKeyCombination: 'F3',
    isEnabled: true,
  },
  {
    id: 'find_previous',
    category: 'search',
    description: 'Find previous match',
    defaultKeyCombination: 'Shift+F3',
    isEnabled: true,
  },
  
  // Navigation shortcuts
  {
    id: 'next_tab',
    category: 'navigation',
    description: 'Go to next tab',
    defaultKeyCombination: 'Mod+Tab',
    isEnabled: true,
  },
  {
    id: 'previous_tab',
    category: 'navigation',
    description: 'Go to previous tab',
    defaultKeyCombination: 'Mod+Shift+Tab',
    isEnabled: true,
  },
  {
    id: 'close_tab',
    category: 'navigation',
    description: 'Close current tab',
    defaultKeyCombination: 'Mod+W',
    isEnabled: true,
  },
  
  // View shortcuts
  {
    id: 'toggle_sidebar',
    category: 'view',
    description: 'Toggle file sidebar',
    defaultKeyCombination: 'Mod+B',
    isEnabled: true,
  },
  {
    id: 'toggle_agent_panel',
    category: 'view',
    description: 'Toggle agent panel',
    defaultKeyCombination: 'Mod+J',
    isEnabled: true,
  },
  {
    id: 'toggle_minimap',
    category: 'view',
    description: 'Toggle code minimap',
    defaultKeyCombination: 'Mod+M',
    isEnabled: true,
  },
  {
    id: 'toggle_diff_view',
    category: 'view',
    description: 'Toggle diff view',
    defaultKeyCombination: 'Mod+D',
    isEnabled: true,
  },
  {
    id: 'toggle_version_control',
    category: 'view',
    description: 'Toggle version control panel',
    defaultKeyCombination: 'Mod+Shift+G',
    isEnabled: true,
  },
];

// Define the keyboard shortcuts context
interface KeyboardShortcutsContextType {
  shortcuts: ShortcutAction[];
  registerShortcut: (actionId: string, handler: ShortcutHandler) => () => void;
  unregisterShortcut: (actionId: string, handler: ShortcutHandler) => void;
  updateShortcut: (actionId: string, updates: Partial<ShortcutAction>) => void;
  getActiveShortcuts: () => ShortcutAction[];
  getShortcutsByCategory: (category: ShortcutCategory) => ShortcutAction[];
  resetToDefaults: () => void;
}

// Create the context
const KeyboardShortcutsContext = createContext<KeyboardShortcutsContextType | undefined>(undefined);

// Provider component
interface KeyboardShortcutsProviderProps {
  children: ReactNode;
}

export const KeyboardShortcutsProvider: React.FC<KeyboardShortcutsProviderProps> = ({ children }) => {
  // State for shortcuts
  const [shortcuts, setShortcuts] = useState<ShortcutAction[]>(defaultShortcuts);
  
  // State for shortcut registrations
  const [registrations, setRegistrations] = useState<ShortcutRegistration[]>([]);
  
  // Register a shortcut handler
  const registerShortcut = useCallback((actionId: string, handler: ShortcutHandler) => {
    const registration = { actionId, handler };
    
    setRegistrations(prev => [...prev, registration]);
    
    // Return an unregister function
    return () => {
      unregisterShortcut(actionId, handler);
    };
  }, []);
  
  // Unregister a shortcut handler
  const unregisterShortcut = useCallback((actionId: string, handler: ShortcutHandler) => {
    setRegistrations(prev => 
      prev.filter(r => !(r.actionId === actionId && r.handler === handler))
    );
  }, []);
  
  // Update a shortcut configuration
  const updateShortcut = useCallback((actionId: string, updates: Partial<ShortcutAction>) => {
    setShortcuts(prev => 
      prev.map(shortcut => 
        shortcut.id === actionId ? { ...shortcut, ...updates } : shortcut
      )
    );
  }, []);
  
  // Get active shortcuts
  const getActiveShortcuts = useCallback(() => {
    return shortcuts.filter(shortcut => shortcut.isEnabled);
  }, [shortcuts]);
  
  // Get shortcuts by category
  const getShortcutsByCategory = useCallback((category: ShortcutCategory) => {
    return shortcuts.filter(shortcut => shortcut.category === category);
  }, [shortcuts]);
  
  // Reset shortcuts to defaults
  const resetToDefaults = useCallback(() => {
    setShortcuts(defaultShortcuts);
  }, []);
  
  // Global keyboard event handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if the target is an input element
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target instanceof HTMLElement && e.target.isContentEditable)
      ) {
        return;
      }
      
      // Get active shortcuts
      const activeShortcuts = getActiveShortcuts();
      
      // Check each active shortcut
      for (const shortcut of activeShortcuts) {
        const keyCombination = shortcut.customKeyCombination || shortcut.defaultKeyCombination;
        
        if (matchesKeyCombination(e, keyCombination)) {
          // Find handlers for this shortcut
          const handlers = registrations
            .filter(reg => reg.actionId === shortcut.id)
            .map(reg => reg.handler);
          
          // Call handlers
          if (handlers.length > 0) {
            e.preventDefault();
            handlers.forEach(handler => handler(e));
          }
        }
      }
    };
    
    // Add event listener
    window.addEventListener('keydown', handleKeyDown);
    
    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [getActiveShortcuts, registrations]);
  
  // Load shortcuts from localStorage on mount
  useEffect(() => {
    const savedShortcuts = localStorage.getItem('keyboard-shortcuts');
    
    if (savedShortcuts) {
      try {
        const parsed = JSON.parse(savedShortcuts);
        setShortcuts(parsed);
      } catch (error) {
        console.error('Failed to parse saved shortcuts:', error);
      }
    }
  }, []);
  
  // Save shortcuts to localStorage when they change
  useEffect(() => {
    localStorage.setItem('keyboard-shortcuts', JSON.stringify(shortcuts));
  }, [shortcuts]);
  
  // Context value
  const contextValue: KeyboardShortcutsContextType = {
    shortcuts,
    registerShortcut,
    unregisterShortcut,
    updateShortcut,
    getActiveShortcuts,
    getShortcutsByCategory,
    resetToDefaults,
  };
  
  return (
    <KeyboardShortcutsContext.Provider value={contextValue}>
      {children}
    </KeyboardShortcutsContext.Provider>
  );
};

// Hook to use keyboard shortcuts
export const useKeyboardShortcuts = () => {
  const context = useContext(KeyboardShortcutsContext);
  
  if (context === undefined) {
    throw new Error('useKeyboardShortcuts must be used within a KeyboardShortcutsProvider');
  }
  
  return context;
};

// Hook to use a specific shortcut
export const useShortcut = (actionId: string, handler: ShortcutHandler) => {
  const { registerShortcut } = useKeyboardShortcuts();
  
  // Register the shortcut handler on mount
  useEffect(() => {
    const unregister = registerShortcut(actionId, handler);
    
    // Unregister on unmount
    return unregister;
  }, [actionId, handler, registerShortcut]);
};

export default KeyboardShortcutsContext; 