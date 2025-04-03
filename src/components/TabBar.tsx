import React from 'react';
import styled from 'styled-components';
import { Theme } from '../styles/theme';

// Extend the default theme
declare module 'styled-components' {
  export interface DefaultTheme extends Theme {}
}

// Tab item structure
export interface TabItem {
  id: string;
  path: string;
  name: string;
  isDirty?: boolean;
  extension?: string;
}

interface TabBarProps {
  tabs: TabItem[];
  activeTabId: string;
  onTabSelect: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
}

const TabBarContainer = styled.div`
  display: flex;
  background-color: ${props => props.theme.colors.surface};
  border-bottom: 1px solid ${props => props.theme.colors.border};
  overflow-x: auto;
  height: 40px;
  
  &::-webkit-scrollbar {
    height: 4px;
  }
  
  &::-webkit-scrollbar-thumb {
    background-color: ${props => props.theme.colors.border};
    border-radius: 4px;
  }
`;

const TabItem = styled.div<{ isActive: boolean }>`
  display: flex;
  align-items: center;
  padding: 0 12px;
  min-width: 100px;
  max-width: 180px;
  height: 100%;
  border-right: 1px solid ${props => props.theme.colors.border};
  background-color: ${props => props.isActive ? props.theme.colors.background : props.theme.colors.surface};
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  position: relative;
  user-select: none;
  
  ${props => props.isActive && `
    border-bottom: 2px solid ${props.theme.colors.primary};
  `}
  
  &:hover {
    background-color: ${props => props.isActive ? props.theme.colors.background : 'rgba(0, 0, 0, 0.05)'};
  }
`;

const TabText = styled.span<{ isDirty?: boolean }>`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: ${props => props.theme.fontSizes.small};
  color: ${props => props.theme.colors.text};
  flex: 1;
  ${props => props.isDirty && `
    font-style: italic;
  `}
  
  &::after {
    content: ${props => props.isDirty ? '"•"' : '""'};
    margin-left: 4px;
    color: ${props => props.theme.colors.primary};
  }
`;

const CloseButton = styled.button`
  background: transparent;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  margin-left: 6px;
  font-size: 14px;
  padding: 0;
  line-height: 1;
  color: ${props => props.theme.colors.textSecondary};
  cursor: pointer;
  
  &:hover {
    background-color: rgba(0, 0, 0, 0.1);
    color: ${props => props.theme.colors.text};
  }
`;

const FileIcon = styled.span<{ extension?: string }>`
  margin-right: 6px;
  color: ${props => {
    switch (props.extension) {
      case 'js':
      case 'jsx':
        return '#F0DB4F'; // JavaScript yellow
      case 'ts':
      case 'tsx':
        return '#3178C6'; // TypeScript blue
      case 'md':
        return '#1E88E5'; // Markdown blue
      case 'json':
        return '#F9A825'; // JSON yellow
      case 'css':
        return '#0277BD'; // CSS blue
      case 'html':
        return '#E44D26'; // HTML orange
      case 'py':
        return '#3776AB'; // Python blue
      default:
        return props.theme.colors.textSecondary;
    }
  }};
  font-size: 14px;
`;

const TabBar: React.FC<TabBarProps> = ({ tabs, activeTabId, onTabSelect, onTabClose }) => {
  return (
    <TabBarContainer>
      {tabs.map(tab => {
        const extension = tab.extension || tab.name.split('.').pop() || '';
        
        return (
          <TabItem 
            key={tab.id} 
            isActive={tab.id === activeTabId}
            onClick={() => onTabSelect(tab.id)}
          >
            <FileIcon extension={extension}>📄</FileIcon>
            <TabText isDirty={tab.isDirty}>{tab.name}</TabText>
            <CloseButton 
              onClick={(e) => {
                e.stopPropagation();
                onTabClose(tab.id);
              }}
            >
              ✕
            </CloseButton>
          </TabItem>
        );
      })}
    </TabBarContainer>
  );
};

export default TabBar; 