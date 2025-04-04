import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { getFileName } from '../utils/fileUtils';
import { Theme } from '../styles/theme';
import { FileStatus } from '../services/githubService';

// Extend the default theme
declare module 'styled-components' {
  export interface DefaultTheme extends Theme {}
}

// File system types
interface FileItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  path: string;
  extension?: string;
  children?: FileItem[];
  isOpen?: boolean;
  status?: FileStatus;
}

interface FileBrowserProps {
  files: FileItem[];
  onFileSelect: (file: FileItem) => void;
  selectedFilePath?: string;
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  border-right: 1px solid ${props => props.theme.colors.border};
  background-color: ${props => props.theme.colors.surface};
  width: 250px;
  overflow-y: auto;
`;

const Header = styled.div`
  padding: 12px;
  border-bottom: 1px solid ${props => props.theme.colors.border};
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Title = styled.h3`
  margin: 0;
  font-size: ${props => props.theme.fontSizes.medium};
  color: ${props => props.theme.colors.text};
`;

const ActionButton = styled.button`
  background: transparent;
  border: none;
  cursor: pointer;
  color: ${props => props.theme.colors.primary};
  font-size: 18px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: ${props => props.theme.borderRadius.small};
  
  &:hover {
    background-color: rgba(0, 0, 0, 0.05);
  }
`;

const FileList = styled.div`
  padding: 8px 0;
  flex: 1;
`;

const FileItemContainer = styled.div<{ level: number, isSelected: boolean }>`
  padding: 6px 8px 6px ${props => 8 + props.level * 16}px;
  display: flex;
  align-items: center;
  cursor: pointer;
  user-select: none;
  background-color: ${props => props.isSelected ? props.theme.colors.primary + '20' : 'transparent'};
  
  &:hover {
    background-color: ${props => props.isSelected ? props.theme.colors.primary + '30' : 'rgba(0, 0, 0, 0.05)'};
  }
`;

const FolderIcon = styled.span`
  margin-right: 6px;
  color: ${props => props.theme.colors.textSecondary};
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
`;

const FileName = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: ${props => props.theme.colors.text};
  font-size: ${props => props.theme.fontSizes.small};
  flex: 1;
`;

const StatusIndicator = styled.span<{ status: FileStatus }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-left: 6px;
  background-color: ${props => {
    switch (props.status) {
      case 'modified':
        return '#F9A825'; // Yellow for modified
      case 'added':
        return '#4CAF50'; // Green for added
      case 'deleted':
        return '#F44336'; // Red for deleted
      case 'untracked':
        return '#9E9E9E'; // Gray for untracked
      default:
        return 'transparent';
    }
  }};
`;

const StatusLabel = styled.span<{ status: FileStatus }>`
  font-size: 10px;
  margin-left: 4px;
  padding: 1px 4px;
  border-radius: 3px;
  background-color: ${props => {
    switch (props.status) {
      case 'modified':
        return '#FFF8E1'; // Light yellow background for modified
      case 'added':
        return '#E8F5E9'; // Light green background for added
      case 'deleted':
        return '#FFEBEE'; // Light red background for deleted
      case 'untracked':
        return '#F5F5F5'; // Light gray background for untracked
      default:
        return 'transparent';
    }
  }};
  color: ${props => {
    switch (props.status) {
      case 'modified':
        return '#F57F17'; // Dark yellow for modified
      case 'added':
        return '#2E7D32'; // Dark green for added
      case 'deleted':
        return '#C62828'; // Dark red for deleted
      case 'untracked':
        return '#616161'; // Dark gray for untracked
      default:
        return 'inherit';
    }
  }};
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 20px;
  color: ${props => props.theme.colors.textSecondary};
  text-align: center;
`;

// Get short status label
const getStatusLabel = (status?: FileStatus): string => {
  switch (status) {
    case 'modified':
      return 'M';
    case 'added':
      return 'A';
    case 'deleted':
      return 'D';
    case 'untracked':
      return 'U';
    default:
      return '';
  }
};

const FileTreeItem: React.FC<{
  item: FileItem;
  level: number;
  selectedFilePath?: string;
  onFileSelect: (file: FileItem) => void;
  onToggleFolder: (folderId: string) => void;
}> = ({ item, level, selectedFilePath, onFileSelect, onToggleFolder }) => {
  const isSelected = item.path === selectedFilePath;
  const extension = item.extension || item.name.split('.').pop() || '';
  
  const handleClick = () => {
    if (item.type === 'file') {
      onFileSelect(item);
    } else {
      onToggleFolder(item.id);
    }
  };
  
  // Check if any children in a folder have status
  const hasFolderStatus = (): boolean => {
    if (item.type !== 'folder' || !item.children) return false;
    return item.children.some(child => 
      child.status || 
      (child.type === 'folder' && child.children && child.children.some(c => c.status))
    );
  };
  
  return (
    <>
      <FileItemContainer 
        level={level} 
        isSelected={isSelected}
        onClick={handleClick}
      >
        {item.type === 'folder' ? (
          <FolderIcon>
            {item.isOpen ? (hasFolderStatus() ? '📂*' : '📂') : (hasFolderStatus() ? '📁*' : '📁')}
          </FolderIcon>
        ) : (
          <FileIcon extension={extension}>📄</FileIcon>
        )}
        <FileName>{item.name}</FileName>
        
        {/* Display status indicator for files */}
        {item.type === 'file' && item.status && (
          <>
            <StatusIndicator status={item.status} />
            <StatusLabel status={item.status}>
              {getStatusLabel(item.status)}
            </StatusLabel>
          </>
        )}
      </FileItemContainer>
      
      {item.type === 'folder' && item.isOpen && item.children && (
        <>
          {item.children.map(child => (
            <FileTreeItem
              key={child.id}
              item={child}
              level={level + 1}
              selectedFilePath={selectedFilePath}
              onFileSelect={onFileSelect}
              onToggleFolder={onToggleFolder}
            />
          ))}
        </>
      )}
    </>
  );
};

const FileBrowser: React.FC<FileBrowserProps> = ({
  files,
  onFileSelect,
  selectedFilePath
}) => {
  const [fileTree, setFileTree] = useState<FileItem[]>(files || []);
  
  useEffect(() => {
    setFileTree(files);
  }, [files]);
  
  const handleToggleFolder = (folderId: string) => {
    const updateFolderState = (items: FileItem[]): FileItem[] => {
      return items.map(item => {
        if (item.id === folderId) {
          return { ...item, isOpen: !item.isOpen };
        }
        
        if (item.children) {
          return {
            ...item,
            children: updateFolderState(item.children)
          };
        }
        
        return item;
      });
    };
    
    setFileTree(prevTree => updateFolderState(prevTree));
  };
  
  return (
    <Container>
      <Header>
        <Title>Files</Title>
        <div>
          <ActionButton title="New File">+</ActionButton>
          <ActionButton title="New Folder">📁+</ActionButton>
        </div>
      </Header>
      
      <FileList>
        {fileTree.length > 0 ? (
          fileTree.map(item => (
            <FileTreeItem
              key={item.id}
              item={item}
              level={0}
              selectedFilePath={selectedFilePath}
              onFileSelect={onFileSelect}
              onToggleFolder={handleToggleFolder}
            />
          ))
        ) : (
          <EmptyState>
            <p>No files found</p>
            <p>Click the + button to create a new file</p>
          </EmptyState>
        )}
      </FileList>
    </Container>
  );
};

export default FileBrowser; 