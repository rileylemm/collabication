import React, { useState, useRef, useEffect, useCallback, useContext } from 'react';
import styled from 'styled-components';
import { Editor as TiptapEditor } from '@tiptap/react';
import { useLocation, useNavigate } from 'react-router-dom';
import DocumentEditor, { DocumentEditorRef } from '../components/DocumentEditor';
import FileBrowser from '../components/FileBrowser';
import TabBar, { TabItem } from '../components/TabBar';
import { Theme } from '../styles/theme';
import { v4 as uuidv4 } from 'uuid';
import CodeEditor from '../components/CodeEditor';
import { CodeEditorRef } from '../components/CodeEditor';
import SearchPanel from '../components/SearchPanel';
import UnifiedSearchPanel from '../components/UnifiedSearchPanel';
import KeyboardShortcutsPanel from '../components/KeyboardShortcutsPanel';
import { useShortcut } from '../contexts/KeyboardShortcutsContext';
import { 
  getFileExtension, 
  isTextFile, 
  isCodeFile, 
  getLanguageFromExtension, 
  PreferredFileType,
  getDefaultPreferredType,
  convertContent,
  getExtensionForPreferredType
} from '../utils/fileUtils';
import AgentContainer from '../components/AgentContainer';
import { useGitHub } from '../contexts/GitHubContext';
import { githubService, FileStatus, FileDiff, CommitInfo, ConflictInfo, FileStatusInfo } from '../services/githubService';
import CollaborationStatus from '../components/CollaborationStatus';
import CollaborationUsersList from '../components/CollaborationUsersList';
import { CollaborationProvider } from '../contexts/CollaborationContext';
import { BiNetworkChart, BiX, BiUserCheck, BiGitCompare, BiHistory, BiGitBranch, BiGitMerge } from 'react-icons/bi';
import PermissionsPanel from '../components/PermissionsPanel';
import PullRequestPanel from '../components/PullRequestPanel';
import DiffViewer from '../components/DiffViewer';
import CommitHistoryPanel from '../components/CommitHistoryPanel';
import BranchManager from '../components/BranchManager';
import { AiOutlineRobot, AiOutlineHistory } from 'react-icons/ai';
import {
  Box,
  HStack,
  Tooltip,
  IconButton,
  Flex,
  VStack
} from '@chakra-ui/react';
// Use ChakraButtonGroup instead to avoid conflict
import { ButtonGroup as ChakraButtonGroup } from '@chakra-ui/react';
import { toast } from 'react-hot-toast';
import GitStatusBar from '../components/GitStatusBar';
import * as git from 'isomorphic-git';
import VersionControlPanel from '../components/VersionControlPanel';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useProject } from '../contexts/ProjectContext';
import GitHubContext from '../contexts/GitHubContext';
import { User, Repository } from '../types/github';

// Extend the default theme
declare module 'styled-components' {
  export interface DefaultTheme extends Theme {}
}

// File item type definition
interface FileItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  path: string;
  extension?: string;
  children?: FileItem[];
  isOpen?: boolean;
  status?: FileStatus; // Add Git status field
}

// Add content property to TabItem interface by extending it
interface ExtendedTabItem extends TabItem {
  content?: string;
  preferredType?: PreferredFileType;
}

// Update the file contents interface to include preferred type
interface FileContents {
  [id: string]: {
    content: string;
    cursorPosition?: number;
    isMarkdownMode: boolean;
    preferredType: PreferredFileType;
  };
}

const PageContainer = styled.div<{ showAgentPanel: boolean }>`
  display: flex;
  height: calc(100vh - 60px);
  overflow: hidden;
`;

const EditorContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  padding: 1rem;
  height: 100%;
  overflow-y: auto;
  position: relative;
`;

const EditorHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding: 8px 16px;
  background-color: ${props => props.theme.colors.background};
  border-bottom: 1px solid ${props => props.theme.colors.border};
`;

const DocumentTitle = styled.input`
  font-size: 1.5rem;
  border: none;
  border-bottom: 2px solid transparent;
  outline: none;
  padding: 0.5rem 0;
  background: transparent;
  color: ${props => props.theme.colors.text};
  
  &:focus {
    border-bottom: 2px solid ${props => props.theme.colors.primary};
  }
`;

const EditorToolbar = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  padding: 0.5rem;
  border-radius: ${props => props.theme.borderRadius.small};
  background-color: ${props => props.theme.colors.surface};
`;

const ToolbarButton = styled.button<{ active?: boolean }>`
  background: ${props => props.active ? props.theme.colors.primary + '20' : 'none'};
  border: none;
  padding: 0.25rem 0.5rem;
  cursor: pointer;
  border-radius: ${props => props.theme.borderRadius.small};
  color: ${props => props.active ? props.theme.colors.primary : props.theme.colors.text};
  font-weight: ${props => props.active ? 'bold' : 'normal'};
  
  &:hover {
    background-color: rgba(0, 0, 0, 0.05);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

// Add a separator for the toolbar
const ToolbarSeparator = styled.div`
  width: 1px;
  height: 24px;
  background-color: ${props => props.theme.colors.border};
  margin: 0 0.5rem;
`;

const ToolbarDropdown = styled.div`
  position: relative;
  display: inline-block;
`;

const DropdownButton = styled(ToolbarButton)`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  
  &::after {
    content: '▼';
    font-size: 0.6rem;
    margin-left: 0.25rem;
  }
`;

const DropdownContent = styled.div`
  display: none;
  position: absolute;
  background-color: ${props => props.theme.colors.background};
  min-width: 160px;
  box-shadow: 0px 8px 16px 0px rgba(0,0,0,0.2);
  z-index: 1;
  border-radius: ${props => props.theme.borderRadius.small};
  border: 1px solid ${props => props.theme.colors.border};
  
  ${ToolbarDropdown}:hover & {
    display: block;
  }
`;

const DropdownItem = styled.a`
  color: ${props => props.theme.colors.text};
  padding: 8px 12px;
  text-decoration: none;
  display: block;
  cursor: pointer;
  font-size: 0.9rem;
  
  &:hover {
    background-color: rgba(0, 0, 0, 0.05);
  }
`;

const FileNameInput = styled.input`
  border: none;
  border-bottom: 1px solid ${props => props.theme.colors.border};
  outline: none;
  padding: 0.25rem 0.5rem;
  background: transparent;
  color: ${props => props.theme.colors.text};
  font-size: 0.9rem;
  margin-right: 1rem;
  
  &:focus {
    border-bottom: 1px solid ${props => props.theme.colors.primary};
  }
`;

// Sample file structure for demo purposes
const sampleFiles: FileItem[] = [
  {
    id: 'folder-1',
    name: 'Project',
    type: 'folder',
    path: '/Project',
    isOpen: true,
    children: [
      {
        id: 'file-1',
        name: 'README.md',
        type: 'file',
        path: '/Project/README.md',
        extension: 'md'
      },
      {
        id: 'file-2',
        name: 'document.md',
        type: 'file',
        path: '/Project/document.md',
        extension: 'md'
      },
      {
        id: 'folder-2',
        name: 'src',
        type: 'folder',
        path: '/Project/src',
        isOpen: true,
        children: [
          {
            id: 'file-3',
            name: 'index.ts',
            type: 'file',
            path: '/Project/src/index.ts',
            extension: 'ts'
          },
          {
            id: 'file-4',
            name: 'App.tsx',
            type: 'file',
            path: '/Project/src/App.tsx',
            extension: 'tsx'
          },
          {
            id: 'file-5',
            name: 'style.css',
            type: 'file',
            path: '/Project/src/style.css',
            extension: 'css'
          }
        ]
      }
    ]
  }
];

// Add EditorContent styled component
const EditorContent = styled.div`
  flex: 1;
  position: relative;
  overflow: hidden;
  height: 100%;
`;

// Add AgentPanel component
const AgentPanel = styled.div<{ visible: boolean }>`
  width: ${props => props.visible ? '350px' : '0'};
  height: 100%;
  overflow: hidden;
  transition: width 0.3s ease;
  border-left: ${props => props.visible ? `1px solid ${props.theme.colors.border}` : 'none'};
`;

// Add agent toggle button
const AgentToggleButton = styled.button<{ showAgent: boolean }>`
  position: fixed;
  bottom: 1rem;
  right: ${props => props.showAgent ? '360px' : '1rem'};
  z-index: 10;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background-color: ${props => props.theme.colors.primary};
  color: white;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  cursor: pointer;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  transition: right 0.3s ease, background-color 0.2s ease;
  
  &:hover {
    background-color: ${props => props.theme.colors.primaryDark};
  }
`;

// Add Git status indicator component
const GitStatusIndicator = styled.div`
  margin-right: 1rem;
  
  span {
    color: ${props => props.theme.colors.primary};
    font-size: 1.2rem;
  }
`;

// Add Git operations toolbar
const GitToolbar = styled.div`
  display: flex;
  align-items: center;
  padding: 0.5rem;
  background-color: ${props => props.theme.colors.surface};
  border-bottom: 1px solid ${props => props.theme.colors.border};
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const Button = styled.button`
  padding: 0.3rem 0.8rem;
  border-radius: 4px;
  background-color: ${props => props.theme.colors.primary};
  color: ${props => props.theme.colors.text};
  border: none;
  cursor: pointer;
  font-size: 0.9rem;
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  &:hover:not(:disabled) {
    background-color: ${props => props.theme.colors.secondary};
  }
`;

const CollaborationSidebar = styled.div<{ $isOpen: boolean }>`
  position: fixed;
  top: 60px; /* Adjust based on header height */
  right: 0;
  width: 320px;
  height: calc(100vh - 60px);
  background-color: ${props => props.theme.colors.background};
  box-shadow: -2px 0 5px rgba(0, 0, 0, 0.1);
  z-index: 100;
  transform: translateX(${props => (props.$isOpen ? '0' : '100%')});
  transition: transform 0.3s ease;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
`;

const SidebarHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid ${props => props.theme.colors.border};
  
  h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 500;
    color: ${props => props.theme.colors.text};
  }
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: ${props => props.theme.colors.textSecondary};
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    color: ${props => props.theme.colors.text};
  }
`;

const CollaborationPanels = styled.div`
  padding: 16px;
  flex: 1;
  overflow-y: auto;
`;

const PermissionsButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
  padding: 8px 12px;
  border-radius: 4px;
  background-color: ${props => props.theme.colors.primary};
  color: white;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: background-color 0.2s ease;
  
  &:hover {
    opacity: 0.9;
  }
`;

interface ExtendedGitHubContextProps {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  repositories: Repository[];
  error: string | null;
  login: () => Promise<void>;
  logout: () => void;
  fetchRepositories: () => Promise<void>;
  clearError: () => void;
  // Additional properties
  githubService: {
    getFileContent: (repo: string, path: string, branch: string) => Promise<string>;
    listFiles: (repo: string, path?: string) => Promise<any[]>;
    getStatus: (repo: string) => Promise<FileStatusInfo[]>;
    commit: (repo: string, message: string) => Promise<void>;
    isDirectory: (repo: string, path: string) => Promise<boolean>;
    readFile: (repo: string, path: string) => Promise<string>;
    writeFile: (repo: string, path: string, content: string) => Promise<void>;
    addFile: (repo: string, path: string, content: string) => Promise<void>;
    listBranches: (repo: string) => Promise<string[]>;
    getUncommittedDiff: (repo: string, filepath: string) => Promise<FileDiff>;
    getBranchDiff: (repo: string, filepath: string, baseBranch: string, compareBranch: string) => Promise<FileDiff>;
    push: (repo: string, branch: string) => Promise<void>;
    pullWithConflictDetection: (repo: string, token: string, branch?: string) => Promise<{ success: boolean; conflictingFiles: string[] }>;
    resolveConflict: (repo: string, path: string, resolution: 'ours' | 'theirs' | 'custom', customContent?: string) => Promise<void>;
    completeConflictResolution: (repo: string, commitMessage?: string) => Promise<void>;
    getConflictInfo: (repo: string, filepath: string) => Promise<ConflictInfo | null>;
    resetFile: (repo: string, path: string) => Promise<void>;
  };
  repo: string | null;
  branch: string | null;
  fileChanges: Record<string, string>;
  setFileChanges: (changes: Record<string, string>) => void;
  isCommitting: boolean;
  setIsCommitting: (value: boolean) => void;
  commitChanges: (message: string) => Promise<void>;
}

const useGitHubExtended = (): ExtendedGitHubContextProps => {
  const context = useContext(GitHubContext);
  const [isCommitting, setIsCommitting] = useState(false);
  
  if (!context) {
    throw new Error('useGitHubExtended must be used within a GitHubProvider');
  }

  // Mock implementation for githubService
  const mockGithubService = {
    getFileContent: async (repo: string, path: string, branch: string): Promise<string> => {
      console.log('Mock getFileContent called for', repo, path, branch);
      return '';
    },
    listFiles: async (repo: string, path?: string): Promise<any[]> => {
      console.log('Mock listFiles called for', repo, path);
      return [];
    },
    getStatus: async (repo: string): Promise<FileStatusInfo[]> => {
      console.log('Mock getStatus called for', repo);
      return [];
    },
    commit: async (repo: string, message: string): Promise<void> => {
      console.log('Mock commit called for', repo, message);
    },
    // Add missing methods
    isDirectory: async (repo: string, path: string): Promise<boolean> => {
      console.log('Mock isDirectory called for', repo, path);
      return false;
    },
    readFile: async (repo: string, path: string): Promise<string> => {
      console.log('Mock readFile called for', repo, path);
      return '';
    },
    writeFile: async (repo: string, path: string, content: string): Promise<void> => {
      console.log('Mock writeFile called for', repo, path);
    },
    addFile: async (repo: string, path: string, content: string): Promise<void> => {
      console.log('Mock addFile called for', repo, path);
    },
    listBranches: async (repo: string): Promise<string[]> => {
      console.log('Mock listBranches called for', repo);
      return ['main', 'develop'];
    },
    getUncommittedDiff: async (repo: string, filepath: string): Promise<FileDiff> => {
      console.log('Mock getUncommittedDiff called for', repo, filepath);
      return {
        path: filepath,
        oldFile: '',
        newFile: '',
        changes: []
      };
    },
    getBranchDiff: async (repo: string, filepath: string, baseBranch: string, compareBranch: string): Promise<FileDiff> => {
      console.log('Mock getBranchDiff called for', repo, filepath, baseBranch, compareBranch);
      return {
        path: filepath,
        oldFile: '',
        newFile: '',
        changes: []
      };
    },
    push: async (repo: string, branch: string): Promise<void> => {
      console.log('Mock push called for', repo, branch);
    },
    pullWithConflictDetection: async (repo: string, token: string, branch: string = 'main'): Promise<{ success: boolean; conflictingFiles: string[] }> => {
      console.log('Mock pullWithConflictDetection called for', repo, token, branch);
      return { success: true, conflictingFiles: [] };
    },
    resolveConflict: async (repo: string, path: string, resolution: 'ours' | 'theirs' | 'custom', customContent?: string): Promise<void> => {
      console.log('Mock resolveConflict called for', repo, path, resolution, customContent);
    },
    completeConflictResolution: async (repo: string, commitMessage: string = 'Merge conflict resolution'): Promise<void> => {
      console.log('Mock completeConflictResolution called for', repo, commitMessage);
    },
    getConflictInfo: async (repo: string, filepath: string): Promise<ConflictInfo | null> => {
      console.log('Mock getConflictInfo called for', repo, filepath);
      return null;
    },
    resetFile: async (repo: string, path: string): Promise<void> => {
      console.log('Mock resetFile called for', repo, path);
      // This would normally reset the file to its state in the last commit
    },
  };

  const mockRepo = 'mock-repo';
  const mockBranch = 'main';
  const mockFileChanges: Record<string, string> = {};
  const mockSetFileChanges = (changes: Record<string, string>) => {
    console.log('Mock setFileChanges called with', changes);
  };

  // Mock implementation for commitChanges
  const commitChanges = async (message: string) => {
    setIsCommitting(true);
    try {
      // Implement actual commit logic
      console.log('Committing changes with message:', message);
      await mockGithubService.commit(mockRepo, message);
    } catch (error) {
      console.error('Error committing changes:', error);
    } finally {
      setIsCommitting(false);
    }
  };

  return {
    ...context,
    githubService: mockGithubService,
    repo: mockRepo,
    branch: mockBranch,
    fileChanges: mockFileChanges,
    setFileChanges: mockSetFileChanges,
    isCommitting,
    setIsCommitting,
    commitChanges
  };
};

const EditorPage: React.FC = () => {
  const theme = useTheme();
  const { user } = useAuth();
  const { 
    githubService, 
    isAuthenticated,
    repo,
    branch, 
    fileChanges,
    setFileChanges,
    isCommitting,
    setIsCommitting,
    commitChanges,
  } = useGitHubExtended();
  const { currentProject } = useProject();
  const [documentTitle, setDocumentTitle] = useState('Untitled Document');
  const [documentContent, setDocumentContent] = useState('<p>Start typing here...</p>');
  const [markdownContent, setMarkdownContent] = useState('Start typing here...');
  const [isMarkdownMode, setIsMarkdownMode] = useState(false);
  const [filename, setFilename] = useState('document.md');
  const [selectedFilePath, setSelectedFilePath] = useState('/Project/document.md');
  const editorRef = useRef<TiptapEditor | null>(null);
  const documentEditorRef = useRef<DocumentEditorRef | null>(null);
  
  // Tab management state
  const [tabs, setTabs] = useState<ExtendedTabItem[]>([
    {
      id: 'default-tab',
      path: '/Project/document.md',
      name: 'document.md',
      isDirty: false
    }
  ]);
  const [activeTabId, setActiveTabId] = useState('default-tab');
  
  // Map to store file content for each tab
  const [fileContents, setFileContents] = useState<Record<string, { 
    content: string;
    isDirty: boolean;
    isMarkdownMode: boolean;
    preferredType: PreferredFileType;
  }>>({
    'default-tab': {
      content: '<p>Start typing here...</p>',
      isDirty: false,
      isMarkdownMode: false,
      preferredType: 'automatic'
    }
  });
  
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  
  const [showSearchPanel, setShowSearchPanel] = useState(false);
  
  // Refs
  const codeEditorRef = useRef<CodeEditorRef | null>(null);
  
  // Add state for minimap visibility
  const [showMinimap, setShowMinimap] = useState(true);
  
  // Add state for agent panel
  const [showAgentPanel, setShowAgentPanel] = useState(false);
  const [showCommitHistory, setShowCommitHistory] = useState<boolean>(false);
  const [showCommitDialogue, setShowCommitDialogue] = useState<boolean>(false);
  
  // Add GitHub related state
  const [repoName, setRepoName] = useState<string>('');
  const [gitFiles, setGitFiles] = useState<FileItem[]>([]);
  const [isGitRepo, setIsGitRepo] = useState<boolean>(false);
  const [modifiedFiles, setModifiedFiles] = useState<FileStatusInfo[]>([
    { path: 'example.js', status: 'modified', staged: false }
  ]);
  const [commitMessage, setCommitMessage] = useState<string>('');
  const [isPushing, setIsPushing] = useState<boolean>(false);
  const [isPulling, setIsPulling] = useState<boolean>(false);
  const [isGitOperationInProgress, setIsGitOperationInProgress] = useState<boolean>(false);
  const [gitHubAuth, setGitHubAuth] = useState<boolean>(true); // Temporary placeholder
  
  const location = useLocation();
  const navigate = useNavigate();
  const { token } = useAuth();
  
  // Parse query params for repository
  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const repo = query.get('repo');
    
    if (repo) {
      setRepoName(repo);
      setIsGitRepo(true);
      loadGitRepository(repo);
    }
  }, [location]);
  
  // Load files from Git repository
  const loadGitRepository = async (repositoryName: string) => {
    if (!repositoryName) return;
    
    try {
      // Get file list from root
      const rootFiles = await githubService.listFiles(repositoryName);
      
      // Get status for all files
      const statusInfo = await githubService.getStatus(repositoryName);
      
      // Build file tree with status info
      const fileTree = await buildFileTree(repositoryName, '/', rootFiles, statusInfo);
      
      // Set file tree in state
      setGitFiles(fileTree);
      
      // Store modified files info
      setModifiedFiles(statusInfo);
      
      // Load branches for the repository
      await loadBranches();
    } catch (error) {
      console.error('Error loading Git repository:', error);
    }
  };
  
  // Build file tree from Git repository
  const buildFileTree = async (
    repositoryName: string,
    currentPath: string,
    fileList: string[],
    statusInfo?: Array<{ path: string; status: FileStatus }>
  ): Promise<FileItem[]> => {
    const result: FileItem[] = [];
    
    for (const fileName of fileList) {
      const fullPath = `${currentPath === '/' ? '' : currentPath}/${fileName}`;
      const relativePath = fullPath.startsWith('/') ? fullPath.substring(1) : fullPath;
      const isDir = await githubService.isDirectory(repositoryName, fullPath);
      
      if (isDir) {
        // This is a directory, recursively process its contents
        const subFiles = await githubService.listFiles(repositoryName, fullPath);
        
        const item: FileItem = {
          id: uuidv4(),
          name: fileName,
          type: 'folder',
          path: fullPath,
          isOpen: false,
          children: await buildFileTree(repositoryName, fullPath, subFiles, statusInfo)
        };
        
        result.push(item);
      } else {
        // This is a file
        const ext = getFileExtension(fileName);
        
        // Find status for this file if available
        const fileStatus = statusInfo?.find(s => s.path === relativePath)?.status;
        
        const item: FileItem = {
          id: uuidv4(),
          name: fileName,
          type: 'file',
          path: fullPath,
          extension: ext,
          status: fileStatus
        };
        
        result.push(item);
      }
    }
    
    return result;
  };
  
  // Refresh Git status and update file tree
  const refreshGitStatus = async (repoName: string) => {
    if (!repoName) return;
    
    try {
      const statusInfo = await githubService.getStatus(repoName);
      setModifiedFiles(statusInfo);
      
      // Update file list with status
      setTabs(prevTabs => prevTabs.map(tab => {
        const relativePath = tab.path.startsWith('/') ? tab.path.substring(1) : tab.path;
        return {
          ...tab,
          status: statusInfo.find(s => s.path === relativePath)?.status
        };
      }));
      
      // Also update the file tree with status information
      // First get the root files
      const rootFiles = await githubService.listFiles(repoName);
      // Then rebuild the file tree with status info
      const updatedFiles = await buildFileTree(repoName, '/', rootFiles, statusInfo);
      setGitFiles(updatedFiles);
    } catch (error) {
      console.error('Error refreshing git status:', error);
    }
  };
  
  // Update tab and file content when document changes
  useEffect(() => {
    // Skip initial render
    if (documentContent === '<p>Start typing here...</p>') return;
    
    setFileContents(prev => ({
      ...prev,
      [activeTabId]: {
        ...prev[activeTabId],
        content: documentContent,
        isDirty: true,
        isMarkdownMode
      }
    }));
    
    setTabs(prev => prev.map(tab => 
      tab.id === activeTabId 
        ? { ...tab, isDirty: true } 
        : tab
    ));
  }, [documentContent, isMarkdownMode]);

  const setEditor = (editor: TiptapEditor | null) => {
    editorRef.current = editor;
  };

  const setDocumentEditor = (editor: DocumentEditorRef) => {
    documentEditorRef.current = editor;
    updateUndoRedoState();
  };

  const handleBoldClick = () => {
    if (editorRef.current) {
      editorRef.current.chain().focus().toggleBold().run();
    }
  };

  const handleItalicClick = () => {
    if (editorRef.current) {
      editorRef.current.chain().focus().toggleItalic().run();
    }
  };

  const handleUnderlineClick = () => {
    if (editorRef.current) {
      editorRef.current.chain().focus().toggleUnderline().run();
    }
  };

  const handleCodeClick = () => {
    if (editorRef.current) {
      editorRef.current.chain().focus().toggleCode().run();
    }
  };

  const handleLinkClick = () => {
    const url = window.prompt('URL');
    if (editorRef.current && url) {
      editorRef.current.chain().focus().setLink({ href: url }).run();
    } else if (editorRef.current) {
      editorRef.current.chain().focus().unsetLink().run();
    }
  };

  const handleToggleMarkdownMode = () => {
    setIsMarkdownMode(!isMarkdownMode);
  };

  // Add method to insert code block with specified language
  const handleInsertCodeBlock = (language: string) => {
    if (editorRef.current) {
      editorRef.current.chain()
        .focus()
        .insertContent({
          type: 'codeBlock',
          attrs: { language }
        })
        .run();
    }
  };

  // Add this function to handle file type switching
  const handleFileTypeChange = (newType: PreferredFileType) => {
    if (!activeTabId) return;
    
    // Get the current tab and content
    const currentTab = tabs.find(tab => tab.id === activeTabId);
    if (!currentTab) return;
    
    // Get the current file extension and content
    const currentExtension = currentTab.extension || '';
    const currentContent = documentContent;
    
    // Get old preferred type
    const oldType = currentTab.preferredType || 'automatic';
    
    // Convert content between formats if needed
    const convertedContent = convertContent(currentContent, oldType, newType);
    
    // Get appropriate file extension for the new type
    const newExtension = getExtensionForPreferredType(newType, currentExtension);
    
    // Update the tab with new extension if needed
    if (currentExtension !== newExtension) {
      const newFilename = currentTab.name.split('.').slice(0, -1).concat(newExtension).join('.');
      
      setTabs(prev => prev.map(tab => {
        if (tab.id === activeTabId) {
          return {
            ...tab,
            name: newFilename,
            extension: newExtension,
            preferredType: newType
          };
        }
        return tab;
      }));
      
      // Also update the filename in the input
      setFilename(newFilename);
    } else {
      // Just update the preferred type
      setTabs(prev => prev.map(tab => {
        if (tab.id === activeTabId) {
          return {
            ...tab,
            preferredType: newType
          };
        }
        return tab;
      }));
    }
    
    // Update content
    setDocumentContent(convertedContent);
    
    // Update file contents
    setFileContents(prev => ({
      ...prev,
      [activeTabId]: {
        ...prev[activeTabId],
        content: convertedContent,
        preferredType: newType
      }
    }));
  };

  // Update handleTabSelect to include preferredType
  const handleTabSelect = (tabId: string) => {
    // Save current tab content
    setFileContents(prev => ({
      ...prev,
      [activeTabId]: {
        ...prev[activeTabId],
        content: documentContent,
        isMarkdownMode,
        preferredType: fileContents[tabId].preferredType || 'automatic'
      }
    }));
    
    // Switch to selected tab
    setActiveTabId(tabId);
    
    // Update current preferred type from the selected tab
    const selectedTab = tabs.find(tab => tab.id === tabId);
    if (selectedTab) {
      const preferredType = selectedTab.preferredType || 'automatic';
      setFileContents(prev => ({
        ...prev,
        [tabId]: {
          ...prev[tabId],
          preferredType
        }
      }));
    }
  };

  const handleTabClose = (tabId: string) => {
    // Prevent closing the last tab
    if (tabs.length === 1) return;
    
    // Switch to another tab if closing the active one
    if (tabId === activeTabId) {
      const index = tabs.findIndex(tab => tab.id === tabId);
      const newIndex = index === 0 ? 1 : index - 1;
      setActiveTabId(tabs[newIndex].id);
    }
    
    // Remove the tab and its content
    setTabs(prev => prev.filter(tab => tab.id !== tabId));
    setFileContents(prev => {
      const newContents = { ...prev };
      delete newContents[tabId];
      return newContents;
    });
  };

  // Update handleFileSelect to set preferred type
  const handleFileSelect = async (file: FileItem) => {
    if (file.type !== 'file') return;
    
    // Check if the file is already open
    const existingTab = tabs.find(tab => tab.path === file.path);
    
    if (existingTab) {
      setActiveTabId(existingTab.id);
      return;
    }
    
    // Get the default preferred type based on file extension
    const preferredType = getDefaultPreferredType(file.name);
    
    // Create a new tab
    const newTab: ExtendedTabItem = {
      id: file.id,
      name: file.name,
      path: file.path,
      extension: file.extension,
      isDirty: false,
      preferredType: preferredType
    };
    
    // Load file content from Git repository if in Git mode
    if (isGitRepo && repoName) {
      try {
        // The path in the file item has a leading '/', remove it for the API call
        const filePath = file.path.startsWith('/') ? file.path.substring(1) : file.path;
        const content = await githubService.readFile(repoName, filePath);
        newTab.content = content;
      } catch (error) {
        console.error('Error loading file from git:', error);
        newTab.content = '';
      }
    }
    
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTab.id);
    setFileContents(prev => ({
      ...prev,
      [newTab.id]: {
        ...prev[newTab.id],
        preferredType
      }
    }));
  };

  // Handler for undo action
  const handleUndo = () => {
    if (documentEditorRef.current) {
      documentEditorRef.current.undo();
      
      // Update undo/redo state after operation
      setTimeout(() => {
        updateUndoRedoState();
      }, 0);
    }
  };

  // Handler for redo action
  const handleRedo = () => {
    if (documentEditorRef.current) {
      documentEditorRef.current.redo();
      
      // Update undo/redo state after operation
      setTimeout(() => {
        updateUndoRedoState();
      }, 0);
    }
  };

  // Update the undo/redo state based on editor capabilities
  const updateUndoRedoState = useCallback(() => {
    if (documentEditorRef.current) {
      setCanUndo(documentEditorRef.current.canUndo());
      setCanRedo(documentEditorRef.current.canRedo());
    }
  }, []);

  // Toggle search panel
  const toggleSearchPanel = useCallback(() => {
    setShowSearchPanel(prev => !prev);
    
    // If opening the search panel and using CodeMirror, focus the editor's search
    if (!showSearchPanel && codeEditorRef.current) {
      setTimeout(() => {
        codeEditorRef.current?.openSearch();
      }, 0);
    }
  }, [showSearchPanel]);

  // Add state for unified search panel visibility
  const [showUnifiedSearchPanel, setShowUnifiedSearchPanel] = useState<boolean>(false);
  
  // Toggle unified search panel
  const toggleUnifiedSearchPanel = useCallback(() => {
    setShowUnifiedSearchPanel(prev => !prev);
  }, []);
  
  // Add state for showing keyboard shortcuts panel
  const [showKeyboardShortcutsPanel, setShowKeyboardShortcutsPanel] = useState<boolean>(false);
  
  // Handle keyboard shortcut actions
  const handleOpenKeyboardShortcuts = useCallback(() => {
    setShowKeyboardShortcutsPanel(true);
  }, []);
  
  // Register keyboard shortcuts using the new system
  useShortcut('search_file', () => toggleSearchPanel());
  useShortcut('search_all', () => toggleUnifiedSearchPanel());
  useShortcut('undo', () => handleUndo());
  useShortcut('redo', () => handleRedo());
  useShortcut('toggle_bold', () => handleBoldClick());
  useShortcut('toggle_italic', () => handleItalicClick());
  useShortcut('toggle_code', () => handleCodeClick());
  useShortcut('toggle_link', () => handleLinkClick());
  useShortcut('save', () => handleSave && handleSave());
  useShortcut('toggle_minimap', () => toggleMinimap());
  useShortcut('toggle_agent_panel', () => toggleAgentPanel());
  useShortcut('toggle_diff_view', () => toggleDiffView());
  useShortcut('toggle_version_control', () => toggleVersionControl());
  
  // Show keyboard shortcuts panel with ? key (custom shortcut not in registry)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '?' && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        handleOpenKeyboardShortcuts();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleOpenKeyboardShortcuts]);

  // Handle editor ready callback
  const handleEditorReady = useCallback((ref: CodeEditorRef) => {
    codeEditorRef.current = ref;
    updateUndoRedoState();
  }, [updateUndoRedoState]);
  
  // Add state for diff view in the EditorPage component
  const [showDiffView, setShowDiffView] = useState<boolean>(false);
  const [currentDiff, setCurrentDiff] = useState<FileDiff | null>(null);
  const [isLoadingDiff, setIsLoadingDiff] = useState<boolean>(false);
  const [diffType, setDiffType] = useState<'uncommitted' | 'branch' | 'commit'>('uncommitted');
  const [compareBranch, setCompareBranch] = useState<string>('');
  const [availableBranches, setAvailableBranches] = useState<string[]>([]);
  const [currentBranch, setCurrentBranch] = useState<string>('main');

  // Add the new dropdowns for branches
  const BranchSelector = styled.select`
    padding: 0.25rem 0.5rem;
    background-color: ${props => props.theme.colors.surface};
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.borderRadius.small};
    color: ${props => props.theme.colors.text};
    font-size: 0.9rem;
    cursor: pointer;
    
    &:focus {
      outline: none;
      border-color: ${props => props.theme.colors.primary};
    }
  `;

  const DiffTypeSelector = styled.select`
    padding: 0.25rem 0.5rem;
    background-color: ${props => props.theme.colors.surface};
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.borderRadius.small};
    color: ${props => props.theme.colors.text};
    font-size: 0.9rem;
    cursor: pointer;
    
    &:focus {
      outline: none;
      border-color: ${props => props.theme.colors.primary};
    }
  `;

  // Add function to load branches
  const loadBranches = async () => {
    if (!repoName) return;
    
    try {
      const branches = await githubService.listBranches(repoName);
      setAvailableBranches(branches);
      
      // Set current branch (in a real implementation, this would be determined from git status)
      if (branches.includes('main')) {
        setCurrentBranch('main');
      } else if (branches.length > 0) {
        setCurrentBranch(branches[0]);
      }
    } catch (error) {
      console.error('Error loading branches:', error);
    }
  };

  // Add useEffect to load branches when repo changes
  useEffect(() => {
    if (isGitRepo && repoName) {
      loadBranches();
    }
  }, [isGitRepo, repoName]);

  // Fix the loadDiff function to use correct method names and types from githubService
  const loadDiff = async () => {
    if (!repoName || !activeTabId) return;
    
    const currentTab = tabs.find(tab => tab.id === activeTabId);
    if (!currentTab || !currentTab.path) return;
    
    try {
      setIsLoadingDiff(true);
      
      // Get the file path without leading slash
      const filePath = currentTab.path.startsWith('/') 
        ? currentTab.path.substring(1) 
        : currentTab.path;
      
      let diff: FileDiff | null = null;
      
      if (diffType === 'uncommitted') {
        // Get uncommitted changes (working directory vs HEAD)
        diff = await githubService.getUncommittedDiff(repoName, filePath);
      } else if (diffType === 'branch' && compareBranch) {
        // Get changes between current branch and selected branch
        diff = await githubService.getBranchDiff(
          repoName,
          filePath,
          currentBranch,
          compareBranch
        );
      } else if (diffType === 'commit') {
        // For commit comparison, we would need to implement this method
        // This is a placeholder as it's not yet implemented
        console.warn('Commit diff type not yet implemented');
      }
      
      if (diff) {
        setCurrentDiff(diff);
      }
    } catch (error) {
      console.error('Error loading diff:', error);
    } finally {
      setIsLoadingDiff(false);
    }
  };

  // Add toggle function for diff view
  const toggleDiffView = async () => {
    if (!showDiffView) {
      await loadDiff();
    } else {
      setShowDiffView(false);
    }
  };

  // Fix the handler functions to accept the correct event types
  const handleDiffTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setDiffType(e.target.value as 'uncommitted' | 'branch' | 'commit');
  };

  const handleCompareBranchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCompareBranch(e.target.value);
  };

  // Fix renderEditor function to correctly use the CodeEditor and DocumentEditor components
  const renderEditor = () => {
    const currentTab = tabs.find(tab => tab.id === activeTabId);
    if (!currentTab) return null;
    
    // Use safe property access for content
    const fileContent = currentTab.content || '';
    const filePath = currentTab.path || '';
    const fileExtension = currentTab.extension || '';
    
    // Get the current preferred type (from tab or state)
    const preferredType = currentTab.preferredType || 'automatic';
    
    // Simplified hasEditPermission check - you'll need to adapt this based on your actual permissions system
    const hasEditPermission = true;
    
    // Use preferred type to determine which editor to show
    if (preferredType === 'code' || (preferredType === 'automatic' && isCodeFile(fileExtension))) {
      // Get language from extension, ensuring it matches what CodeEditor expects
      let language = getLanguageFromExtension(fileExtension);
      // If it's not one of the supported languages, default to JavaScript
      if (language !== 'javascript' && language !== 'typescript' && language !== 'python') {
        language = 'javascript';
      }
      
      return (
        <CodeEditor
          key={activeTabId}
          code={fileContent}
          onChange={handleCodeChange}
          language={language}
          ref={codeEditorRef}
          readOnly={!hasEditPermission}
        />
      );
    } else {
      return (
        <DocumentEditor
          key={activeTabId}
          initialValue={fileContent}
          onChange={handleDocumentChange}
          filename={currentTab.name || 'Untitled'}
          content={fileContent}
          ref={documentEditorRef}
          readOnly={!hasEditPermission}
        />
      );
    }
  };
  
  // Fix for the search function to avoid Boolean call signature issue
  const handleSearch = (query: string, caseSensitive: boolean, regex: boolean, wholeWord: boolean) => {
    if (codeEditorRef.current) {
      // For CodeMirror, we're using its built-in search panel via openSearch()
      codeEditorRef.current.openSearch();
    } else if (documentEditorRef.current) {
      // For document editor, implement search if available
      // Removing the find method call as it doesn't exist on DocumentEditorRef
      console.log('Search in document editor:', query, { caseSensitive, regex, wholeWord });
    }
  };
  
  const handleCloseSearch = () => {
    setShowSearchPanel(false);
    if (codeEditorRef.current) {
      codeEditorRef.current.closeSearch();
    }
  };

  // Add a function to toggle minimap visibility
  const toggleMinimap = () => {
    setShowMinimap(!showMinimap);
  };

  // Toggle agent panel
  const toggleAgentPanel = () => {
    setShowAgentPanel(prev => !prev);
  };

  // Add a content save handler
  const handleContentSave = (content: string) => {
    // Find current tab
    const currentTab = tabs.find(tab => tab.id === activeTabId);
    if (!currentTab || !currentTab.path) return;
    
    // Update tabs with new content
    const updatedTabs = tabs.map(tab => 
      tab.id === activeTabId ? { ...tab, content } : tab
    );
    setTabs(updatedTabs);
    
    // Save to Git if in Git mode
    if (isGitRepo && repoName) {
      // The path in the file item has a leading '/', remove it for the API call
      const filePath = currentTab.path.startsWith('/') ? currentTab.path.substring(1) : currentTab.path;
      githubService.writeFile(repoName, filePath, content);
      
      // Refresh Git status after save
      refreshGitStatus(repoName);
    }
    
    // Show success toast
    toast.success('File saved successfully');
  };

  // Handler for code editor changes
  const handleCodeChange = (code: string) => {
    setDocumentContent(code);
    
    // Update the current tab to mark as dirty
    setTabs(prev => prev.map(tab => 
      tab.id === activeTabId ? { ...tab, isDirty: true } : tab
    ));
    
    // Update file contents
    setFileContents(prev => ({
      ...prev,
      [activeTabId]: {
        ...prev[activeTabId],
        content: code,
        isDirty: true
      }
    }));
  };

  // Handler for document editor changes
  const handleDocumentChange = (content: string) => {
    setDocumentContent(content);
    
    // Update the current tab to mark as dirty
    setTabs(prev => prev.map(tab => 
      tab.id === activeTabId ? { ...tab, isDirty: true } : tab
    ));
    
    // Update file contents
    setFileContents(prev => ({
      ...prev,
      [activeTabId]: {
        ...prev[activeTabId],
        content,
        isDirty: true
      }
    }));
  };

  // Inside the EditorPage component, after the existing sidebar state
  const [showCollaboration, setShowCollaboration] = useState<boolean>(false);
  const [showPermissions, setShowPermissions] = useState<boolean>(false);
  
  // Add this after the existing toggleSidebar function
  const toggleCollaboration = () => {
    setShowCollaboration(prev => !prev);
  };
  
  // Add toggle for permissions panel
  const togglePermissions = () => {
    setShowPermissions(prev => !prev);
  };

  // Add the enhanced saveToGit function
  const saveToGit = async (filePath: string, content: string) => {
    if (!repoName) return;
    
    try {
      // Display saving notification
      toast.loading("Saving file...");
      
      // Write file content
      await githubService.writeFile(repoName, filePath, content);
      
      // Stage the file for commit
      await githubService.addFile(repoName, filePath, content);
      
      // Refresh Git status to update UI
      await refreshGitStatus(repoName);
      
      // Display success notification
      toast.success("File saved and staged for commit");
    } catch (error) {
      console.error('Error saving to git:', error);
      
      // Display error notification
      toast.error(`Save failed: ${String(error)}`);
    } finally {
      // Dismiss the loading toast
      toast.dismiss();
    }
  };

  const handleCommit = async (message: string) => {
    if (!message) return;
    
    try {
      await commitChanges(message);
      // Reset local state or perform other actions after successful commit
    } catch (error) {
      console.error('Failed to commit changes:', error);
    }
  };

  const handlePush = async () => {
    if (!repoName || !token) return;
    
    try {
      setIsPushing(true);
      // Add token parameter
      await githubService.push(repoName, token);
      await refreshGitStatus(repoName);
    } catch (error) {
      console.error('Error pushing changes:', error);
    } finally {
      setIsPushing(false);
    }
  };

  const handlePull = async () => {
    if (!repoName || !token) return;
    
    try {
      setIsPulling(true);
      
      // Use the enhanced pull with conflict detection
      const result = await githubService.pullWithConflictDetection(repoName, token, currentBranch);
      
      if (result.success) {
        // No conflicts, refresh the repository
        await loadGitRepository(repoName);
        toast.success('Pull successful');
      } else {
        // Conflicts detected
        setConflictingFiles(result.conflictingFiles);
        setShowVersionControl(true); // Show the version control panel
        toast.error(`${result.conflictingFiles.length} file(s) have merge conflicts that need resolution.`);
      }
    } catch (error) {
      console.error('Error pulling changes:', error);
      toast.error(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsPulling(false);
    }
  };

  // Add handler for resolving conflicts
  const handleResolveConflict = async (
    filepath: string, 
    resolution: 'ours' | 'theirs' | 'custom', 
    customContent?: string
  ) => {
    if (!repoName) return;
    
    try {
      setIsResolvingConflicts(true);
      await githubService.resolveConflict(repoName, filepath, resolution, customContent);
      
      // Update the list of conflicting files
      setConflictingFiles(prev => prev.filter(file => file !== filepath));
      
      toast.success(`Successfully resolved conflicts in ${filepath}`);
    } catch (error) {
      console.error('Error resolving conflict:', error);
      toast.error(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsResolvingConflicts(false);
    }
  };

  // Fix handleCompleteResolution to match the expected interface
  const handleCompleteResolution = async (commitMessage: string) => {
    if (!repoName || !user) return;
    
    try {
      setIsResolvingConflicts(true);
      
      // Complete the conflict resolution with a commit
      await githubService.completeConflictResolution(
        repoName, 
        commitMessage
      );
      
      // Clear conflict state
      setConflictingFiles([]);
      
      // Refresh the repository
      await refreshGitStatus(repoName);
      
      toast.success('All conflicts have been successfully resolved.');
    } catch (error) {
      console.error('Error completing conflict resolution:', error);
      toast.error(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsResolvingConflicts(false);
    }
  };

  // Add handler for canceling conflict resolution
  const handleCancelResolution = () => {
    setConflictingFiles([]);
  };

  // Add handler for getting conflict info for a file
  const handleGetConflictInfo = async (repositoryName: string, filepath: string) => {
    try {
      return await githubService.getConflictInfo(repositoryName, filepath);
    } catch (error) {
      console.error('Error getting conflict info:', error);
      toast.error(error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  };

  // Add a state variable for showing/hiding the PR panel
  const [showPullRequests, setShowPullRequests] = useState<boolean>(false);

  // Add toggle function for the PR panel
  const togglePullRequests = () => {
    setShowPullRequests(prev => !prev);
  };

  // Add functions to get the current selection and insert code

  // Function to get the currently selected text from the editor
  const getSelectedText = (): string => {
    if (!activeTabId) return '';
    
    const currentTab = tabs.find(tab => tab.id === activeTabId);
    const isCodeTab = currentTab?.extension && isCodeFile(currentTab.extension);
    
    if (isCodeTab && codeEditorRef.current?.getView()) {
      const view = codeEditorRef.current.getView();
      if (view) {
        const { from, to } = view.state.selection.main;
        return view.state.doc.sliceString(from, to);
      }
    } else if (editorRef.current) {
      return editorRef.current.state.doc.textBetween(
        editorRef.current.state.selection.from,
        editorRef.current.state.selection.to,
        ' '
      );
    }
    
    return '';
  };

  // Function to insert code from the agent
  const handleInsertCode = (code: string, language: string) => {
    if (!activeTabId) return;
    
    const currentTab = tabs.find(tab => tab.id === activeTabId);
    const isCodeTab = currentTab?.extension && isCodeFile(currentTab.extension);
    
    if (isCodeTab && codeEditorRef.current?.getView()) {
      const view = codeEditorRef.current.getView();
      if (view) {
        const { from, to } = view.state.selection.main;
        
        view.dispatch({
          changes: { from, to, insert: code }
        });
      }
    } else if (editorRef.current) {
      // For rich text editor, insert as a code block
      editorRef.current.commands.insertContent({
        type: 'codeBlock',
        attrs: { language },
        content: [{ type: 'text', text: code }]
      });
    }
  };

  // Function to insert text from the agent
  const handleInsertText = (text: string) => {
    if (!activeTabId) return;
    
    const currentTab = tabs.find(tab => tab.id === activeTabId);
    const isCodeTab = currentTab?.extension && isCodeFile(currentTab.extension);
    
    if (isCodeTab && codeEditorRef.current?.getView()) {
      const view = codeEditorRef.current.getView();
      if (view) {
        const { from, to } = view.state.selection.main;
        
        view.dispatch({
          changes: { from, to, insert: text }
        });
      }
    } else if (editorRef.current) {
      editorRef.current.commands.insertContent(text);
    }
  };

  // Inside the EditorPage component, add a state for showing branch manager
  const [showBranchManager, setShowBranchManager] = useState<boolean>(false);

  // Add a toggle function for branch manager
  const toggleBranchManager = () => {
    setShowBranchManager(prev => !prev);
  };

  // Update the handleBranchChange function to refresh Git status
  const handleBranchChange = async (branchName: string) => {
    // Update the current branch in state
    setCurrentBranch(branchName);
    
    // Refresh Git status for the new branch
    if (repoName) {
      await refreshGitStatus(repoName);
    }
  };

  // Add handler for staging/unstaging files
  const handleStageFile = async (filepath: string, staged: boolean) => {
    if (!repoName) return;
    
    try {
      // Update local state first
      setModifiedFiles(prev => 
        prev.map(file => 
          file.path === filepath 
            ? { ...file, staged } 
            : file
        )
      );
      
      // Then perform Git operations
      if (staged) {
        // Get the current content of the file before adding it
        const fileContent = await githubService.readFile(repoName, filepath);
        await githubService.addFile(repoName, filepath, fileContent);
      } else {
        await githubService.resetFile(repoName, filepath);
      }
      refreshGitStatus(repoName);
    } catch (error) {
      console.error('Error staging file:', error);
      toast.error(error instanceof Error ? error.message : 'Unknown error');
    }
  };

  // Add state for version control panel visibility
  const [showVersionControl, setShowVersionControl] = useState(false);

  // Add toggle function
  const toggleVersionControl = () => {
    setShowVersionControl(!showVersionControl);
  };

  // Fix the VersionControlToggleButton component
  const VersionControlToggleButton = styled.button<{ $showAgentPanel?: boolean }>`
    position: fixed;
    bottom: 1rem;
    right: ${(props) => props.$showAgentPanel ? '360px' : '70px'};
    z-index: 10;
    width: 50px;
    height: 50px;
    border-radius: 50%;
    background-color: ${props => props.theme.colors.secondary};
    color: white;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    cursor: pointer;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
    transition: right 0.3s ease;
    
    &:hover {
      background-color: ${props => props.theme.colors.secondary};
    }
  `;

  // Add state for conflict resolution
  const [conflictingFiles, setConflictingFiles] = useState<string[]>([]);
  const [isResolvingConflicts, setIsResolvingConflicts] = useState<boolean>(false);

  // Add a state for the current file's preferred type
  const [currentPreferredType, setCurrentPreferredType] = useState<PreferredFileType>('automatic');

  // Add userSettings state after other state declarations
  const [userSettings, setUserSettings] = useState<{ name?: string; email?: string }>(() => {
    // Try to load from localStorage
    const storedSettings = localStorage.getItem('userSettings');
    return storedSettings ? JSON.parse(storedSettings) : { name: '', email: '' };
  });

  // Add handleSave function near other handler functions
  const handleSave = useCallback((repoNameArg?: string, currentTabArg?: ExtendedTabItem, contentArg?: string) => {
    // If called with no arguments (via shortcut), use current active values
    const targetRepoName = repoNameArg || repoName;
    const targetTab = currentTabArg || tabs.find(tab => tab.id === activeTabId);
    const targetContent = contentArg || documentContent;
    
    if (!targetRepoName || !targetTab || !targetTab.path) return;
    
    // Save the file
    const filePath = targetTab.path.startsWith('/') ? targetTab.path.substring(1) : targetTab.path;
    saveToGit(filePath, targetContent);
    
    // Update tab state to mark as saved
    setTabs(prev => prev.map(tab => 
      tab.id === (targetTab.id) ? { ...tab, isDirty: false } : tab
    ));
  }, [repoName, tabs, activeTabId, documentContent, saveToGit]);

  // Fix the GitToolbar function to handle missing methods
  const renderGitToolbar = () => {
    if (!isAuthenticated || !repo) return null;
    
    return (
      <GitToolbar>
        <GitStatusIndicator>
          {fileHasChanges && <span>●</span>}
        </GitStatusIndicator>
        <ChakraButtonGroup>
          {fileHasChanges && (
            <Button onClick={handleSaveChanges} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          )}
          <Button 
            onClick={() => handleSaveAndCommit()} 
            disabled={isCommitting || !fileHasChanges}
          >
            {isCommitting ? 'Committing...' : 'Commit'}
          </Button>
          <Button 
            onClick={handleDiscardChanges} 
            disabled={!fileHasChanges}
          >
            Discard
          </Button>
        </ChakraButtonGroup>
      </GitToolbar>
    );
  };

  // Fix the handleDiscardChanges function
  const handleDiscardChanges = async () => {
    try {
      if (!githubService || !repo || !filePath) return;
      
      // Get the original file content from GitHub
      const originalContent = await githubService.getFileContent(repo, filePath, branch || 'main');
      
      // Reset editor content
      setEditorContent(originalContent);
      
      // Update file changes state
      const newFileChanges = { ...fileChanges };
      delete newFileChanges[filePath];
      setFileChanges(newFileChanges);
      
      setFileHasChanges(false);
    } catch (error) {
      console.error('Error discarding changes:', error);
    }
  };

  // Fix the handleSaveChanges function
  const handleSaveChanges = async () => {
    if (!githubService || !repo || !filePath) return;
    
    try {
      setIsSaving(true);
      
      // Update fileChanges in the GitHub context
      setFileChanges({
        ...fileChanges,
        [filePath]: editorContent
      });
      
      setIsSaving(false);
    } catch (error) {
      console.error('Error saving changes:', error);
      setIsSaving(false);
    }
  };

  const [filePath, setFilePath] = useState<string>('');
  const [editorContent, setEditorContent] = useState<string>('');
  const [fileHasChanges, setFileHasChanges] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const handleSaveAndCommit = async () => {
    if (!repoName) return;
    
    // Save changes first
    await handleSaveChanges();
    
    // Show commit dialogue 
    setShowCommitDialogue(true);
  };

  // Update this line to use user.name instead of user.login
  const commitInfo = `${user?.name || 'Anonymous'} - ${new Date().toLocaleString()}`;

  // Fix user token references
  const handlePullChanges = async () => {
    if (!repoName) return;
    setIsGitOperationInProgress(true);
    setIsPulling(true);
    try {
      await handlePull();
    } finally {
      setIsPulling(false);
      setIsGitOperationInProgress(false);
    }
  };

  const handlePushChanges = async () => {
    if (!repoName) return;
    setIsGitOperationInProgress(true);
    setIsPushing(true);
    try {
      // Implement push logic
      if (repo && branch) {
        await githubService.push(repo, branch);
        toast.success("Changes pushed successfully");
      }
    } catch (error) {
      console.error('Error pushing changes:', error);
      toast.error(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsPushing(false);
      setIsGitOperationInProgress(false);
    }
  };

  // Add wrapper functions to handle the signature differences between components
  const handleCommitWrapper = () => {
    if (commitMessage.trim()) {
      handleCommit(commitMessage);
    }
  };

  // Create a wrapper for the version control panel that uses the current commit message
  const handleCommitForVersionControl = () => {
    if (commitMessage.trim()) {
      handleCommit(commitMessage);
    } else {
      toast.error("Please enter a commit message");
    }
  };

  return (
    <PageContainer showAgentPanel={showAgentPanel}>
      <FileBrowser 
        files={gitFiles}
        onFileSelect={handleFileSelect}
        selectedFilePath={selectedFilePath}
      />
      
      <EditorContainer>
        {renderGitToolbar()}
        
        <TabBar 
          tabs={tabs}
          activeTabId={activeTabId}
          onTabSelect={handleTabSelect}
          onTabClose={handleTabClose}
        />
        
        <EditorHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <DocumentTitle 
              value={documentTitle}
              onChange={(e) => setDocumentTitle(e.target.value)}
              placeholder="Document Title"
            />
            <FileNameInput
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              placeholder="filename.extension"
            />
          </div>
        </EditorHeader>
        
        <EditorToolbar>
          {/* Undo/Redo buttons */}
          <ToolbarButton 
            onClick={handleUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
          >
            ↩️
          </ToolbarButton>
          <ToolbarButton 
            onClick={handleRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y or Ctrl+Shift+Z)"
          >
            ↪️
          </ToolbarButton>
          
          <ToolbarSeparator />
          
          <ToolbarButton 
            onClick={handleBoldClick}
            disabled={!isTextFile || isMarkdownMode}
            active={editorRef.current?.isActive('bold')}
          >
            Bold
          </ToolbarButton>
          <ToolbarButton 
            onClick={handleItalicClick}
            disabled={!isTextFile || isMarkdownMode}
            active={editorRef.current?.isActive('italic')}
          >
            Italic
          </ToolbarButton>
          <ToolbarButton 
            onClick={handleUnderlineClick}
            disabled={!isTextFile || isMarkdownMode}
            active={editorRef.current?.isActive('underline')}
          >
            Underline
          </ToolbarButton>
          <ToolbarButton 
            onClick={handleCodeClick}
            disabled={!isTextFile || isMarkdownMode}
            active={editorRef.current?.isActive('code')}
          >
            Code
          </ToolbarButton>
          <ToolbarButton 
            onClick={handleLinkClick}
            disabled={!isTextFile || isMarkdownMode}
            active={editorRef.current?.isActive('link')}
          >
            Link
          </ToolbarButton>
          
          <ToolbarSeparator />
          
          {/* Add Code Block Dropdown */}
          <ToolbarDropdown>
            <DropdownButton 
              disabled={!isTextFile}
              active={editorRef.current?.isActive('codeBlock')}
            >
              Code Block
            </DropdownButton>
            <DropdownContent>
              <DropdownItem onClick={() => handleInsertCodeBlock('javascript')}>JavaScript</DropdownItem>
              <DropdownItem onClick={() => handleInsertCodeBlock('typescript')}>TypeScript</DropdownItem>
              <DropdownItem onClick={() => handleInsertCodeBlock('python')}>Python</DropdownItem>
              <DropdownItem onClick={() => handleInsertCodeBlock('html')}>HTML</DropdownItem>
              <DropdownItem onClick={() => handleInsertCodeBlock('css')}>CSS</DropdownItem>
              <DropdownItem onClick={() => handleInsertCodeBlock('json')}>JSON</DropdownItem>
              <DropdownItem onClick={() => handleInsertCodeBlock('markdown')}>Markdown</DropdownItem>
              <DropdownItem onClick={() => handleInsertCodeBlock('text')}>Plain Text</DropdownItem>
            </DropdownContent>
          </ToolbarDropdown>
          
          <ToolbarSeparator />
          
          <ToolbarButton 
            onClick={handleToggleMarkdownMode}
            active={isMarkdownMode}
            disabled={!isTextFile}
          >
            {isMarkdownMode ? 'Rich Text' : 'Markdown'}
          </ToolbarButton>
          
          <ToolbarSeparator />
          
          <ToolbarButton 
            onClick={toggleSearchPanel}
            title="Find (Ctrl+F)"
          >
            🔍 Find
          </ToolbarButton>
          
          {/* Code Folding Buttons for code files */}
          {isCodeFile(getFileExtension(filename)) && (
            <>
              <ToolbarSeparator />
              <ToolbarButton 
                onClick={() => codeEditorRef.current?.foldAll()}
                title="Fold All (Ctrl+Alt+Shift+[)"
              >
                📃 Fold All
              </ToolbarButton>
              <ToolbarButton 
                onClick={() => codeEditorRef.current?.unfoldAll()}
                title="Unfold All (Ctrl+Alt+Shift+])"
              >
                📄 Unfold All
              </ToolbarButton>
              <ToolbarButton 
                onClick={() => codeEditorRef.current?.foldSelection()}
                title="Fold Selection (Ctrl+Alt+[)"
              >
                📑 Fold
              </ToolbarButton>
              <ToolbarButton 
                onClick={() => codeEditorRef.current?.unfoldSelection()}
                title="Unfold Selection (Ctrl+Alt+])"
              >
                📖 Unfold
              </ToolbarButton>
              <ToolbarSeparator />
              <ToolbarButton 
                onClick={toggleMinimap}
                active={showMinimap}
                title="Toggle Minimap"
              >
                🗺️ Minimap
              </ToolbarButton>
            </>
          )}
          <ToolbarButton 
            onClick={toggleCollaboration} 
            title="Toggle Collaboration" 
            active={showCollaboration}
          >
            <BiNetworkChart size={18} />
          </ToolbarButton>
          
          {/* GitHub-related buttons */}
          {gitHubAuth && repoName && (
            <>
              <ToolbarButton
                onClick={() => refreshGitStatus(repoName)}
                disabled={isGitOperationInProgress}
                title="Refresh Git Status"
              >
                Refresh
              </ToolbarButton>
              
              <ToolbarButton
                onClick={handlePullChanges}
                disabled={isGitOperationInProgress}
                title="Pull Latest Changes"
              >
                Pull
              </ToolbarButton>
              
              <ToolbarButton
                onClick={handlePushChanges}
                disabled={isGitOperationInProgress}
                title="Push Changes"
              >
                Push
              </ToolbarButton>
              
              <ToolbarButton
                onClick={() => setShowCommitHistory(!showCommitHistory)}
                active={showCommitHistory}
                title="Show Commit History"
              >
                <BiHistory /> History
              </ToolbarButton>

              <ToolbarButton
                onClick={toggleBranchManager}
                active={showBranchManager}
                title="Branch Manager"
              >
                <BiGitBranch /> Branches
              </ToolbarButton>
              
              <ToolbarButton
                onClick={togglePullRequests}
                active={showPullRequests}
                title="Pull Requests"
              >
                <BiGitMerge /> Pull Requests
              </ToolbarButton>
            </>
          )}
          
          {/* Add a file type switcher dropdown */}
          <FileTypeSwitcherDropdown>
            <DropdownButton>
              File Type: {currentPreferredType === 'automatic' ? 'Auto' : 
                          currentPreferredType === 'richText' ? 'Rich Text' : 
                          currentPreferredType === 'markdown' ? 'Markdown' : 'Code'}
            </DropdownButton>
            <DropdownContent>
              <DropdownItem onClick={() => handleFileTypeChange('automatic')}>
                Auto Detect
              </DropdownItem>
              <DropdownItem onClick={() => handleFileTypeChange('richText')}>
                Rich Text
              </DropdownItem>
              <DropdownItem onClick={() => handleFileTypeChange('markdown')}>
                Markdown
              </DropdownItem>
              <DropdownItem onClick={() => handleFileTypeChange('code')}>
                Code
              </DropdownItem>
            </DropdownContent>
          </FileTypeSwitcherDropdown>
        </EditorToolbar>
        
        <EditorContent>
          {renderEditor()}
          <SearchPanel 
            isVisible={showSearchPanel}
            onSearch={handleSearch}
            onClose={handleCloseSearch}
          />
          
          <UnifiedSearchPanel
            isVisible={showUnifiedSearchPanel}
            onClose={() => setShowUnifiedSearchPanel(false)}
            defaultRepository={repoName}
          />
          
          <KeyboardShortcutsPanel
            isVisible={showKeyboardShortcutsPanel}
            onClose={() => setShowKeyboardShortcutsPanel(false)}
          />
        </EditorContent>

        {/* Add GitStatusBar for GitHub integration */}
        {repoName && (
          <GitStatusBar
            modifiedFiles={modifiedFiles}
            commitMessage={commitMessage}
            onCommitMessageChange={setCommitMessage}
            onStageFile={handleStageFile}
            onCommit={handleCommitWrapper}
            onPush={handlePushChanges}
            onPull={handlePullChanges}
            isCommitting={isCommitting}
            isPushing={isPushing}
            isPulling={isPulling}
          />
        )}
      </EditorContainer>
      
      {/* Agent panel */}
      <AgentPanel visible={showAgentPanel}>
        <AgentContainer 
          files={gitFiles}
          currentFile={tabs.find(tab => tab.id === activeTabId) 
            ? { 
                id: activeTabId, 
                name: filename, 
                path: selectedFilePath, 
                type: 'file', 
                extension: getFileExtension(filename) 
              } 
            : undefined}
          currentContent={documentContent}
          selectedText={getSelectedText()}
          onInsertCode={handleInsertCode}
          onInsertText={handleInsertText}
          darkMode={theme.theme === 'dark'}
        />
      </AgentPanel>
      
      {/* Agent toggle button */}
      <AgentToggleButton 
        onClick={toggleAgentPanel}
        showAgent={showAgentPanel}
        title={showAgentPanel ? "Hide Agent" : "Show Agent"}
      >
        {showAgentPanel ? '👈' : '🤖'}
      </AgentToggleButton>
      
      {/* Collaboration sidebar */}
      <CollaborationSidebar $isOpen={showCollaboration}>
        <CollaborationProvider>
          <SidebarHeader>
            <h3>Collaboration</h3>
            <CloseButton onClick={toggleCollaboration}>
              <BiX size={20} />
            </CloseButton>
          </SidebarHeader>
          <CollaborationPanels>
            {showPermissions ? (
              <PermissionsPanel 
                documentId={activeTabId} 
                onClose={togglePermissions}
              />
            ) : (
              <>
                <CollaborationStatus documentId={activeTabId} />
                <CollaborationUsersList />
                <PermissionsButton onClick={togglePermissions}>
                  <BiUserCheck size={18} />
                  Manage Permissions
                </PermissionsButton>
              </>
            )}
          </CollaborationPanels>
        </CollaborationProvider>
      </CollaborationSidebar>
      
      {showPullRequests && isGitRepo && (
        <PRSidebar>
          <PullRequestPanel 
            repositoryOwner={user?.name || 'anonymous'}
            repositoryName={repoName || ''}
            currentBranch={currentBranch}
          />
        </PRSidebar>
      )}
      
      {showCommitHistory && repoName && (
        <div style={{ width: '600px', height: '100%', overflowY: 'auto', borderLeft: '1px solid #E2E8F0' }}>
          <CommitHistoryPanel
            repositoryName={repoName}
            currentBranch={currentBranch}
            onClose={() => setShowCommitHistory(false)}
          />
        </div>
      )}

      {showBranchManager && repoName && (
        <div style={{ width: '300px', height: '100%', overflowY: 'auto', borderLeft: '1px solid #E2E8F0' }}>
          <BranchManager
            repositoryName={repoName}
            onBranchChange={handleBranchChange}
          />
        </div>
      )}

      {/* Version control toggle button */}
      {repoName && (
        <VersionControlToggleButton 
          onClick={toggleVersionControl}
          $showAgentPanel={showAgentPanel}
        >
          <BiGitBranch size={22} />
        </VersionControlToggleButton>
      )}

      {/* Version Control Panel */}
      {repoName && (
        <VersionControlPanel
          repositoryName={repoName}
          repositoryOwner={user?.name || 'anonymous'}
          currentBranch={currentBranch}
          modifiedFiles={modifiedFiles}
          conflictingFiles={conflictingFiles}
          commitMessage={commitMessage}
          onCommitMessageChange={setCommitMessage}
          onStageFile={handleStageFile}
          onCommit={handleCommitForVersionControl}
          onPush={handlePush}
          onPull={handlePull}
          onBranchChange={handleBranchChange}
          onResolveConflict={handleResolveConflict}
          onCompleteResolution={handleCompleteResolution}
          onCancelResolution={handleCancelResolution}
          onGetConflictInfo={handleGetConflictInfo}
          isCommitting={isCommitting}
          isPushing={isPushing}
          isPulling={isPulling}
          visible={showVersionControl}
          onClose={toggleVersionControl}
        />
      )}
    </PageContainer>
  );
};

// Add styled component for the PR sidebar
const PRSidebar = styled.div`
  width: 350px;
  height: 100%;
  border-left: 1px solid ${props => props.theme.colors.border};
  background-color: ${props => props.theme.colors.background};
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

// Add styled components for diff viewing
const DiffControls = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background-color: ${props => props.theme.colors.surface};
  border-bottom: 1px solid ${props => props.theme.colors.border};
`;

const StyledSelect = styled.select`
  background-color: ${props => props.theme.colors.surface};
  color: ${props => props.theme.colors.text};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 0.875rem;
  margin-right: 8px;
  cursor: pointer;
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
  }
`;

// Add a file type switcher dropdown to the toolbar
const FileTypeSwitcherDropdown = styled(ToolbarDropdown)`
  margin-left: auto;
`;

export default EditorPage; 