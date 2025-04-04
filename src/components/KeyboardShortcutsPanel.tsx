import React, { useState, ChangeEvent } from 'react';
import styled from 'styled-components';
import { 
  useKeyboardShortcuts, 
  ShortcutCategory, 
  ShortcutAction,
  formatKeyCombination
} from '../contexts/KeyboardShortcutsContext';

// Props for the KeyboardShortcutsPanel component
interface KeyboardShortcutsPanelProps {
  isVisible: boolean;
  onClose: () => void;
}

// Styled components
const PanelContainer = styled.div<{ isVisible: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: ${props => props.isVisible ? 'flex' : 'none'};
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const Panel = styled.div`
  width: 80%;
  max-width: 900px;
  max-height: 80vh;
  background-color: ${props => props.theme.colors.background};
  border-radius: ${props => props.theme.borderRadius.medium};
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const PanelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  border-bottom: 1px solid ${props => props.theme.colors.border};
`;

const PanelTitle = styled.h2`
  margin: 0;
  font-size: 1.2rem;
  color: ${props => props.theme.colors.text};
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: ${props => props.theme.colors.textSecondary};
  font-size: 1.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    color: ${props => props.theme.colors.text};
  }
`;

const PanelContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
`;

const CategoryTabs = styled.div`
  display: flex;
  border-bottom: 1px solid ${props => props.theme.colors.border};
  margin-bottom: 1rem;
  overflow-x: auto;
`;

const CategoryTab = styled.button<{ isActive: boolean }>`
  padding: 0.5rem 1rem;
  background: none;
  border: none;
  border-bottom: 2px solid ${props => props.isActive ? props.theme.colors.primary : 'transparent'};
  color: ${props => props.isActive ? props.theme.colors.primary : props.theme.colors.textSecondary};
  font-weight: ${props => props.isActive ? 'bold' : 'normal'};
  cursor: pointer;
  
  &:hover {
    color: ${props => props.theme.colors.primary};
  }
`;

const ShortcutsTable = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const ShortcutsTableHeader = styled.thead`
  background-color: ${props => props.theme.colors.surface};
  
  th {
    padding: 0.75rem;
    text-align: left;
    color: ${props => props.theme.colors.textSecondary};
    font-weight: 500;
    border-bottom: 1px solid ${props => props.theme.colors.border};
  }
`;

const ShortcutsTableBody = styled.tbody`
  tr {
    &:hover {
      background-color: ${props => props.theme.colors.surface};
    }
  }
  
  td {
    padding: 0.75rem;
    border-bottom: 1px solid ${props => props.theme.colors.border};
    color: ${props => props.theme.colors.text};
  }
`;

const ActionCell = styled.td`
  width: 40%;
`;

const ShortcutCell = styled.td`
  width: 40%;
`;

const EnabledCell = styled.td`
  width: 20%;
  text-align: center;
`;

const ShortcutInput = styled.input`
  width: 100%;
  padding: 0.5rem;
  background-color: ${props => props.theme.colors.inputBackground};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.small};
  color: ${props => props.theme.colors.text};
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
  }
`;

const EnabledCheckbox = styled.input.attrs({ type: 'checkbox' })`
  cursor: pointer;
`;

const PanelFooter = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 1rem;
  border-top: 1px solid ${props => props.theme.colors.border};
`;

const ResetButton = styled.button`
  padding: 0.5rem 1rem;
  background-color: ${props => props.theme.colors.error};
  color: white;
  border: none;
  border-radius: ${props => props.theme.borderRadius.small};
  cursor: pointer;
  
  &:hover {
    opacity: 0.9;
  }
`;

const SaveButton = styled.button`
  padding: 0.5rem 1rem;
  background-color: ${props => props.theme.colors.primary};
  color: white;
  border: none;
  border-radius: ${props => props.theme.borderRadius.small};
  cursor: pointer;
  
  &:hover {
    opacity: 0.9;
  }
`;

// Category labels for display
const categoryLabels: Record<ShortcutCategory, string> = {
  general: 'General',
  editor: 'Editor',
  git: 'Git',
  search: 'Search',
  navigation: 'Navigation',
  view: 'View',
};

// Recording input component for capturing key combinations
interface ShortcutRecordingInputProps {
  value: string | string[];
  onChange: (value: string | string[]) => void;
}

const ShortcutRecordingInput: React.FC<ShortcutRecordingInputProps> = ({ value, onChange }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedKeys, setRecordedKeys] = useState<string[]>([]);
  
  // Displayed value
  const displayValue = isRecording 
    ? 'Press keys...' 
    : formatKeyCombination(value);
  
  // Handle key down when recording
  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.preventDefault();
    
    if (isRecording) {
      const keys: string[] = [];
      
      if (e.ctrlKey) keys.push('Ctrl');
      if (e.metaKey) keys.push('Meta');
      if (e.altKey) keys.push('Alt');
      if (e.shiftKey) keys.push('Shift');
      
      // Add main key (if not a modifier)
      if (!['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) {
        keys.push(e.key);
      }
      
      // Only record if there's a non-modifier key
      if (keys.length > 0 && keys.some(k => !['Ctrl', 'Meta', 'Alt', 'Shift'].includes(k))) {
        setRecordedKeys(keys);
        setIsRecording(false);
        
        // Create key combination string
        const keyCombination = keys.join('+');
        onChange(keyCombination);
      }
    }
  };
  
  return (
    <ShortcutInput
      value={displayValue}
      onFocus={() => setIsRecording(true)}
      onBlur={() => setIsRecording(false)}
      onKeyDown={handleKeyDown}
      placeholder="Click to record shortcut"
      readOnly
    />
  );
};

const KeyboardShortcutsPanel: React.FC<KeyboardShortcutsPanelProps> = ({
  isVisible,
  onClose,
}) => {
  const { 
    shortcuts, 
    updateShortcut, 
    getShortcutsByCategory, 
    resetToDefaults 
  } = useKeyboardShortcuts();
  
  // State for selected category
  const [selectedCategory, setSelectedCategory] = useState<ShortcutCategory>('general');
  
  // Get shortcuts for the selected category
  const categoryShortcuts = getShortcutsByCategory(selectedCategory);
  
  // Handle shortcut update
  const handleShortcutChange = (
    actionId: string, 
    field: 'customKeyCombination' | 'isEnabled', 
    value: string | string[] | boolean
  ) => {
    updateShortcut(actionId, { [field]: value });
  };
  
  // Reset shortcuts to defaults
  const handleResetShortcuts = () => {
    if (window.confirm('Are you sure you want to reset all keyboard shortcuts to defaults?')) {
      resetToDefaults();
    }
  };
  
  return (
    <PanelContainer isVisible={isVisible} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <Panel onClick={(e) => e.stopPropagation()}>
        <PanelHeader>
          <PanelTitle>Keyboard Shortcuts</PanelTitle>
          <CloseButton onClick={onClose}>×</CloseButton>
        </PanelHeader>
        
        <CategoryTabs>
          {Object.entries(categoryLabels).map(([category, label]) => (
            <CategoryTab
              key={category}
              isActive={selectedCategory === category}
              onClick={() => setSelectedCategory(category as ShortcutCategory)}
            >
              {label}
            </CategoryTab>
          ))}
        </CategoryTabs>
        
        <PanelContent>
          <ShortcutsTable>
            <ShortcutsTableHeader>
              <tr>
                <th>Action</th>
                <th>Shortcut</th>
                <th>Enabled</th>
              </tr>
            </ShortcutsTableHeader>
            <ShortcutsTableBody>
              {categoryShortcuts.map(shortcut => (
                <tr key={shortcut.id}>
                  <ActionCell>{shortcut.description}</ActionCell>
                  <ShortcutCell>
                    <ShortcutRecordingInput
                      value={shortcut.customKeyCombination || shortcut.defaultKeyCombination}
                      onChange={(value) => handleShortcutChange(shortcut.id, 'customKeyCombination', value)}
                    />
                  </ShortcutCell>
                  <EnabledCell>
                    <EnabledCheckbox
                      checked={shortcut.isEnabled}
                      onChange={(e) => handleShortcutChange(shortcut.id, 'isEnabled', e.target.checked)}
                    />
                  </EnabledCell>
                </tr>
              ))}
            </ShortcutsTableBody>
          </ShortcutsTable>
        </PanelContent>
        
        <PanelFooter>
          <ResetButton onClick={handleResetShortcuts}>
            Reset to Defaults
          </ResetButton>
          <SaveButton onClick={onClose}>
            Save
          </SaveButton>
        </PanelFooter>
      </Panel>
    </PanelContainer>
  );
};

export default KeyboardShortcutsPanel; 