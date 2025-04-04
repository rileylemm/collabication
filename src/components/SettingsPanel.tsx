import React, { useState } from 'react';
import styled from 'styled-components';
import { useSettings, ApplicationSettings } from '../contexts/SettingsContext';
import { BiReset } from 'react-icons/bi';

// Styled components for the settings panel
const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1rem;
  height: 100%;
  overflow-y: auto;
`;

const TabContainer = styled.div`
  display: flex;
  border-bottom: 1px solid ${props => props.theme.colors.border};
  margin-bottom: 1rem;
`;

const Tab = styled.button<{ active: boolean }>`
  padding: 0.5rem 1rem;
  background-color: ${props => props.active ? props.theme.colors.primary + '10' : 'transparent'};
  color: ${props => props.active ? props.theme.colors.primary : props.theme.colors.text};
  border: none;
  border-bottom: 2px solid ${props => props.active ? props.theme.colors.primary : 'transparent'};
  cursor: pointer;
  font-weight: ${props => props.active ? 'bold' : 'normal'};
  transition: all 0.2s ease;
  
  &:hover {
    background-color: ${props => props.theme.colors.primary + '10'};
  }
`;

const CategoryTitle = styled.h3`
  font-size: 1.2rem;
  margin-bottom: 1rem;
  color: ${props => props.theme.colors.text};
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const SettingGroup = styled.div`
  margin-bottom: 1.5rem;
`;

const SettingItem = styled.div`
  display: flex;
  flex-direction: column;
  margin-bottom: 1rem;
`;

const SettingRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
`;

const SettingLabel = styled.label`
  font-size: 0.9rem;
  color: ${props => props.theme.colors.text};
`;

const SettingDescription = styled.div`
  font-size: 0.8rem;
  color: ${props => props.theme.colors.textSecondary};
  margin-top: 0.25rem;
`;

const ResetButton = styled.button`
  background: none;
  border: none;
  color: ${props => props.theme.colors.primary};
  cursor: pointer;
  display: flex;
  align-items: center;
  font-size: 0.9rem;
  padding: 0.25rem 0.5rem;
  
  &:hover {
    text-decoration: underline;
  }
`;

const Select = styled.select`
  padding: 0.5rem;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.small};
  background-color: ${props => props.theme.colors.inputBackground};
  color: ${props => props.theme.colors.text};
  min-width: 150px;
`;

const Input = styled.input`
  padding: 0.5rem;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.small};
  background-color: ${props => props.theme.colors.inputBackground};
  color: ${props => props.theme.colors.text};
`;

const Checkbox = styled.input.attrs({ type: 'checkbox' })`
  width: 1rem;
  height: 1rem;
`;

const ColorInput = styled.input.attrs({ type: 'color' })`
  width: 2rem;
  height: 2rem;
  padding: 0;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.small};
`;

// Define the tab types
enum SettingsTab {
  EDITOR = 'editor',
  GITHUB = 'github',
  COLLABORATION = 'collaboration',
  UI = 'ui',
}

// Settings Panel Component
const SettingsPanel: React.FC = () => {
  const { settings, updateSettings, resetSettings } = useSettings();
  const [activeTab, setActiveTab] = useState<SettingsTab>(SettingsTab.EDITOR);
  
  // Handle input changes
  const handleInputChange = (
    category: keyof ApplicationSettings,
    key: string,
    value: any
  ) => {
    updateSettings(category, { [key]: value });
  };
  
  // Reset settings for a category
  const handleReset = (category: keyof ApplicationSettings) => {
    if (window.confirm(`Are you sure you want to reset ${category} settings to defaults?`)) {
      resetSettings(category);
    }
  };
  
  // Render the editor settings tab
  const renderEditorSettings = () => (
    <SettingGroup>
      <CategoryTitle>
        Editor Settings
        <ResetButton onClick={() => handleReset('editor')}>
          <BiReset />
          Reset
        </ResetButton>
      </CategoryTitle>
      
      <SettingItem>
        <SettingRow>
          <SettingLabel>Default File Type</SettingLabel>
          <Select
            value={settings.editor.defaultPreferredType}
            onChange={(e) => handleInputChange('editor', 'defaultPreferredType', e.target.value)}
          >
            <option value="automatic">Automatic</option>
            <option value="markdown">Markdown</option>
            <option value="richText">Rich Text</option>
            <option value="code">Code</option>
          </Select>
        </SettingRow>
        <SettingDescription>
          The default file type to use when creating new files
        </SettingDescription>
      </SettingItem>
      
      <SettingItem>
        <SettingRow>
          <SettingLabel>Auto Save</SettingLabel>
          <Checkbox
            checked={settings.editor.autoSave}
            onChange={(e) => handleInputChange('editor', 'autoSave', e.target.checked)}
          />
        </SettingRow>
        <SettingDescription>
          Automatically save documents as you type
        </SettingDescription>
      </SettingItem>
      
      {settings.editor.autoSave && (
        <SettingItem>
          <SettingRow>
            <SettingLabel>Auto Save Interval (ms)</SettingLabel>
            <Input
              type="number"
              min="1000"
              max="60000"
              value={settings.editor.autoSaveInterval}
              onChange={(e) => handleInputChange('editor', 'autoSaveInterval', Number(e.target.value))}
            />
          </SettingRow>
          <SettingDescription>
            Time in milliseconds between auto-saves (1000-60000)
          </SettingDescription>
        </SettingItem>
      )}
      
      <SettingItem>
        <SettingRow>
          <SettingLabel>Font Size</SettingLabel>
          <Input
            type="number"
            min="8"
            max="24"
            value={settings.editor.fontSize}
            onChange={(e) => handleInputChange('editor', 'fontSize', Number(e.target.value))}
          />
        </SettingRow>
        <SettingDescription>
          Font size for the editor (8-24)
        </SettingDescription>
      </SettingItem>
      
      <SettingItem>
        <SettingRow>
          <SettingLabel>Tab Size</SettingLabel>
          <Input
            type="number"
            min="2"
            max="8"
            value={settings.editor.tabSize}
            onChange={(e) => handleInputChange('editor', 'tabSize', Number(e.target.value))}
          />
        </SettingRow>
        <SettingDescription>
          Number of spaces for a tab (2-8)
        </SettingDescription>
      </SettingItem>
      
      <SettingItem>
        <SettingRow>
          <SettingLabel>Line Wrapping</SettingLabel>
          <Checkbox
            checked={settings.editor.lineWrapping}
            onChange={(e) => handleInputChange('editor', 'lineWrapping', e.target.checked)}
          />
        </SettingRow>
        <SettingDescription>
          Wrap lines to fit within the editor
        </SettingDescription>
      </SettingItem>
      
      <SettingItem>
        <SettingRow>
          <SettingLabel>Line Numbers</SettingLabel>
          <Checkbox
            checked={settings.editor.lineNumbers}
            onChange={(e) => handleInputChange('editor', 'lineNumbers', e.target.checked)}
          />
        </SettingRow>
        <SettingDescription>
          Show line numbers in the editor
        </SettingDescription>
      </SettingItem>
      
      <SettingItem>
        <SettingRow>
          <SettingLabel>Spell Check</SettingLabel>
          <Checkbox
            checked={settings.editor.spellCheck}
            onChange={(e) => handleInputChange('editor', 'spellCheck', e.target.checked)}
          />
        </SettingRow>
        <SettingDescription>
          Enable spell checking in the editor
        </SettingDescription>
      </SettingItem>
    </SettingGroup>
  );
  
  // Render the GitHub settings tab
  const renderGitHubSettings = () => (
    <SettingGroup>
      <CategoryTitle>
        GitHub Settings
        <ResetButton onClick={() => handleReset('github')}>
          <BiReset />
          Reset
        </ResetButton>
      </CategoryTitle>
      
      <SettingItem>
        <SettingRow>
          <SettingLabel>Auto Push</SettingLabel>
          <Checkbox
            checked={settings.github.autoPush}
            onChange={(e) => handleInputChange('github', 'autoPush', e.target.checked)}
          />
        </SettingRow>
        <SettingDescription>
          Automatically push changes after commits
        </SettingDescription>
      </SettingItem>
      
      <SettingItem>
        <SettingRow>
          <SettingLabel>Auto Pull</SettingLabel>
          <Checkbox
            checked={settings.github.autoPull}
            onChange={(e) => handleInputChange('github', 'autoPull', e.target.checked)}
          />
        </SettingRow>
        <SettingDescription>
          Automatically pull changes when opening a repository
        </SettingDescription>
      </SettingItem>
      
      <SettingItem>
        <SettingRow>
          <SettingLabel>Sync Interval (ms)</SettingLabel>
          <Input
            type="number"
            min="60000"
            max="3600000"
            value={settings.github.syncInterval}
            onChange={(e) => handleInputChange('github', 'syncInterval', Number(e.target.value))}
          />
        </SettingRow>
        <SettingDescription>
          Time in milliseconds between background syncs (60000-3600000)
        </SettingDescription>
      </SettingItem>
      
      <SettingItem>
        <SettingRow>
          <SettingLabel>Default Commit Message</SettingLabel>
          <Input
            type="text"
            value={settings.github.defaultCommitMessage}
            onChange={(e) => handleInputChange('github', 'defaultCommitMessage', e.target.value)}
          />
        </SettingRow>
        <SettingDescription>
          Default message used for commits
        </SettingDescription>
      </SettingItem>
      
      <SettingItem>
        <SettingRow>
          <SettingLabel>Show File Status Indicators</SettingLabel>
          <Checkbox
            checked={settings.github.showFileStatusIndicators}
            onChange={(e) => handleInputChange('github', 'showFileStatusIndicators', e.target.checked)}
          />
        </SettingRow>
        <SettingDescription>
          Show Git status indicators in file browser
        </SettingDescription>
      </SettingItem>
    </SettingGroup>
  );
  
  // Render the collaboration settings tab
  const renderCollaborationSettings = () => (
    <SettingGroup>
      <CategoryTitle>
        Collaboration Settings
        <ResetButton onClick={() => handleReset('collaboration')}>
          <BiReset />
          Reset
        </ResetButton>
      </CategoryTitle>
      
      <SettingItem>
        <SettingRow>
          <SettingLabel>Display Name</SettingLabel>
          <Input
            type="text"
            value={settings.collaboration.userName}
            onChange={(e) => handleInputChange('collaboration', 'userName', e.target.value)}
            placeholder="Your display name"
          />
        </SettingRow>
        <SettingDescription>
          Your name displayed to other users during collaboration
        </SettingDescription>
      </SettingItem>
      
      <SettingItem>
        <SettingRow>
          <SettingLabel>User Color</SettingLabel>
          <ColorInput
            value={settings.collaboration.userColor}
            onChange={(e) => handleInputChange('collaboration', 'userColor', e.target.value)}
          />
        </SettingRow>
        <SettingDescription>
          Your color displayed in collaborative editing
        </SettingDescription>
      </SettingItem>
      
      <SettingItem>
        <SettingRow>
          <SettingLabel>Show Presence Indicators</SettingLabel>
          <Checkbox
            checked={settings.collaboration.showPresenceIndicators}
            onChange={(e) => handleInputChange('collaboration', 'showPresenceIndicators', e.target.checked)}
          />
        </SettingRow>
        <SettingDescription>
          Show user cursors and selections during collaboration
        </SettingDescription>
      </SettingItem>
      
      <SettingItem>
        <SettingRow>
          <SettingLabel>Auto Connect</SettingLabel>
          <Checkbox
            checked={settings.collaboration.autoConnect}
            onChange={(e) => handleInputChange('collaboration', 'autoConnect', e.target.checked)}
          />
        </SettingRow>
        <SettingDescription>
          Automatically connect to collaboration server when opening documents
        </SettingDescription>
      </SettingItem>
      
      <SettingItem>
        <SettingRow>
          <SettingLabel>Show Offline Indicator</SettingLabel>
          <Checkbox
            checked={settings.collaboration.showOfflineIndicator}
            onChange={(e) => handleInputChange('collaboration', 'showOfflineIndicator', e.target.checked)}
          />
        </SettingRow>
        <SettingDescription>
          Show indicator when offline during collaboration
        </SettingDescription>
      </SettingItem>
    </SettingGroup>
  );
  
  // Render the UI settings tab
  const renderUISettings = () => (
    <SettingGroup>
      <CategoryTitle>
        UI Settings
        <ResetButton onClick={() => handleReset('ui')}>
          <BiReset />
          Reset
        </ResetButton>
      </CategoryTitle>
      
      <SettingItem>
        <SettingRow>
          <SettingLabel>Theme</SettingLabel>
          <Select
            value={settings.ui.theme}
            onChange={(e) => handleInputChange('ui', 'theme', e.target.value)}
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="system">System</option>
          </Select>
        </SettingRow>
        <SettingDescription>
          Application theme preference
        </SettingDescription>
      </SettingItem>
      
      <SettingItem>
        <SettingRow>
          <SettingLabel>Sidebar Width (px)</SettingLabel>
          <Input
            type="number"
            min="150"
            max="500"
            value={settings.ui.sidebarWidth}
            onChange={(e) => handleInputChange('ui', 'sidebarWidth', Number(e.target.value))}
          />
        </SettingRow>
        <SettingDescription>
          Width of the left sidebar in pixels (150-500)
        </SettingDescription>
      </SettingItem>
      
      <SettingItem>
        <SettingRow>
          <SettingLabel>Right Sidebar Width (px)</SettingLabel>
          <Input
            type="number"
            min="150"
            max="500"
            value={settings.ui.rightSidebarWidth}
            onChange={(e) => handleInputChange('ui', 'rightSidebarWidth', Number(e.target.value))}
          />
        </SettingRow>
        <SettingDescription>
          Width of the right sidebar in pixels (150-500)
        </SettingDescription>
      </SettingItem>
      
      <SettingItem>
        <SettingRow>
          <SettingLabel>Font Size</SettingLabel>
          <Select
            value={settings.ui.fontSize}
            onChange={(e) => handleInputChange('ui', 'fontSize', e.target.value)}
          >
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
          </Select>
        </SettingRow>
        <SettingDescription>
          UI font size preference
        </SettingDescription>
      </SettingItem>
      
      <SettingItem>
        <SettingRow>
          <SettingLabel>Show Minimap</SettingLabel>
          <Checkbox
            checked={settings.ui.showMinimap}
            onChange={(e) => handleInputChange('ui', 'showMinimap', e.target.checked)}
          />
        </SettingRow>
        <SettingDescription>
          Show minimap in code editor
        </SettingDescription>
      </SettingItem>
      
      <SettingItem>
        <SettingRow>
          <SettingLabel>Show Status Bar</SettingLabel>
          <Checkbox
            checked={settings.ui.showStatusBar}
            onChange={(e) => handleInputChange('ui', 'showStatusBar', e.target.checked)}
          />
        </SettingRow>
        <SettingDescription>
          Show status bar at the bottom of the window
        </SettingDescription>
      </SettingItem>
    </SettingGroup>
  );
  
  // Render the currently active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case SettingsTab.EDITOR:
        return renderEditorSettings();
      case SettingsTab.GITHUB:
        return renderGitHubSettings();
      case SettingsTab.COLLABORATION:
        return renderCollaborationSettings();
      case SettingsTab.UI:
        return renderUISettings();
      default:
        return null;
    }
  };
  
  return (
    <Container>
      <TabContainer>
        <Tab 
          active={activeTab === SettingsTab.EDITOR}
          onClick={() => setActiveTab(SettingsTab.EDITOR)}
        >
          Editor
        </Tab>
        <Tab 
          active={activeTab === SettingsTab.GITHUB}
          onClick={() => setActiveTab(SettingsTab.GITHUB)}
        >
          GitHub
        </Tab>
        <Tab 
          active={activeTab === SettingsTab.COLLABORATION}
          onClick={() => setActiveTab(SettingsTab.COLLABORATION)}
        >
          Collaboration
        </Tab>
        <Tab 
          active={activeTab === SettingsTab.UI}
          onClick={() => setActiveTab(SettingsTab.UI)}
        >
          UI
        </Tab>
      </TabContainer>
      
      {renderTabContent()}
    </Container>
  );
};

export default SettingsPanel; 