import React, { useState, useRef, useEffect, useCallback } from 'react';
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
import { getFileExtension, isTextFile, isCodeFile } from '../utils/fileUtils';
import AgentContainer from '../components/AgentContainer';
import { useGitHub } from '../contexts/GitHubContext';
import { githubService, FileStatus, FileDiff, CommitInfo, ConflictInfo } from '../services/githubService';
import CollaborationStatus from '../components/CollaborationStatus';
import CollaborationUsersList from '../components/CollaborationUsersList';
import { CollaborationProvider } from '../contexts/CollaborationContext';
import { BiNetworkChart, BiX, BiUserCheck, BiGitCompare, BiHistory, BiGitBranch, BiGitMerge } from 'react-icons/bi';
import PermissionsPanel from '../components/PermissionsPanel';
import PullRequestPanel from '../components/PullRequestPanel';
import DiffViewer from '../components/DiffViewer';
import AgentPanel from '../components/AgentPanel';
import FileTreeView from '../components/FileTreeView';
import CommitHistoryPanel from '../components/CommitHistoryPanel';
import BranchManager from '../components/BranchManager';
import { AiOutlineRobot, AiOutlineHistory } from 'react-icons/ai';
import {
  Box,
  HStack,
  ButtonGroup,
  Tooltip,
  IconButton,
  Flex,
  VStack
} from '@chakra-ui/react';
import { toast } from 'react-hot-toast';
import GitStatusBar from '../components/GitStatusBar';
import * as git from 'isomorphic-git';
import VersionControlPanel from '../components/VersionControlPanel';

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
const GitStatusIndicator = styled.span<{ status: FileStatus }>`
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: 5px;
  background-color: ${props => {
    switch (props.status) {
      case 'added':
        return props.theme.colors.success;
      case 'modified':
        return props.theme.colors.warning;
      case 'deleted':
        return props.theme.colors.error;
      default:
        return 'transparent';
    }
  }};
`;

// Add Git operations toolbar
const GitToolbar = styled.div`
  display: flex;
  gap: 0.5rem;
  padding: 0.5rem;
  background-color: ${props => props.theme.colors.surface};
  border-bottom: 1px solid ${props => props.theme.colors.border};
  margin-bottom: 0.5rem;
`;

const GitStatusBadge = styled.div<{ count: number }>`
  display: ${props => props.count > 0 ? 'flex' : 'none'};
  align-items: center;
  justify-content: center;
  background-color: ${props => props.theme.colors.warning};
  color: white;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  font-size: 0.7rem;
  margin-left: 5px;
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

const EditorPage: React.FC = () => {
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
  }>>({
    'default-tab': {
      content: '<p>Start typing here...</p>',
      isDirty: false,
      isMarkdownMode: false
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
  
  // Add GitHub related state
  const [repoName, setRepoName] = useState<string>('');
  const [gitFiles, setGitFiles] = useState<FileItem[]>([]);
  const [isGitRepo, setIsGitRepo] = useState<boolean>(false);
  const [modifiedFiles, setModifiedFiles] = useState<Array<{ path: string; status: FileStatus }>>([]);
  const [commitMessage, setCommitMessage] = useState<string>('');
  const [isCommitting, setIsCommitting] = useState<boolean>(false);
  const [isPushing, setIsPushing] = useState<boolean>(false);
  const [isPulling, setIsPulling] = useState<boolean>(false);
  
  const location = useLocation();
  const navigate = useNavigate();
  const { token, user } = useGitHub();
  
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

  const handleTabSelect = (tabId: string) => {
    // Save current tab content
    setFileContents(prev => ({
      ...prev,
      [activeTabId]: {
        ...prev[activeTabId],
        content: documentContent,
        isMarkdownMode
      }
    }));
    
    // Switch to selected tab
    setActiveTabId(tabId);
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

  const handleFileSelect = async (file: FileItem) => {
    if (file.type !== 'file') return;
    
    // Check if the file is already open
    const existingTab = tabs.find(tab => tab.path === file.path);
    
    if (existingTab) {
      setActiveTabId(existingTab.id);
      return;
    }
    
    // Create a new tab
    const newTab: ExtendedTabItem = {
      id: file.id,
      name: file.name,
      path: file.path,
      extension: file.extension,
      isDirty: false
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

  // Set up keyboard shortcut handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for undo: Ctrl+Z or Cmd+Z
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      
      // Check for redo: Ctrl+Y or Cmd+Shift+Z
      if (((e.ctrlKey || e.metaKey) && e.key === 'y') || 
          ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z')) {
        e.preventDefault();
        handleRedo();
      }
    };
    
    // Add event listener
    document.addEventListener('keydown', handleKeyDown);
    
    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Update undo/redo state whenever editor changes
  useEffect(() => {
    if (editorRef.current) {
      updateUndoRedoState();
      
      // Also update when the editor content changes
      const updateListener = () => {
        updateUndoRedoState();
      };
      
      editorRef.current.on('transaction', updateListener);
      
      return () => {
        editorRef.current?.off('transaction', updateListener);
      };
    }
  }, [editorRef.current, updateUndoRedoState]);

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

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+F or Cmd+F to toggle search
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        toggleSearchPanel();
      }
      
      // Ctrl+Z or Cmd+Z for undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      
      // Ctrl+Shift+Z or Cmd+Shift+Z or Cmd+Y for redo
      if (((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) || 
          ((e.ctrlKey || e.metaKey) && e.key === 'y')) {
        e.preventDefault();
        handleRedo();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, toggleSearchPanel]);

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

  // Fix missing utility function
  const getLanguageForExtension = (extension: string): string => {
    switch (extension) {
      case 'js':
      case 'jsx':
        return 'javascript';
      case 'ts':
      case 'tsx':
        return 'typescript';
      case 'py':
        return 'python';
      case 'html':
        return 'html';
      case 'css':
        return 'css';
      case 'json':
        return 'json';
      case 'md':
        return 'markdown';
      default:
        return 'plaintext';
    }
  };

  // Fix renderEditor function to correctly use the CodeEditor and DocumentEditor components
  const renderEditor = () => {
    if (!activeTabId) return null;
    
    const currentTab = tabs.find(tab => tab.id === activeTabId);
    if (!currentTab) return null;
    
    // If showing diff view, render the diff viewer instead
    if (showDiffView) {
      return (
        <EditorContainer>
          <DiffControls>
            <div>
              <label>Diff type:</label>
              <StyledSelect 
                value={diffType} 
                onChange={handleDiffTypeChange}
              >
                <option value="uncommitted">Uncommitted Changes</option>
                <option value="branch">Branch Comparison</option>
                <option value="commit">Commit Comparison</option>
              </StyledSelect>
              
              {diffType === 'branch' && (
                <>
                  <label>Compare with:</label>
                  <StyledSelect 
                    value={compareBranch} 
                    onChange={handleCompareBranchChange}
                  >
                    {availableBranches.map(branch => (
                      <option key={branch} value={branch}>{branch}</option>
                    ))}
                  </StyledSelect>
                </>
              )}
            </div>
            
            <ToolbarButton onClick={loadDiff} disabled={isLoadingDiff}>
              {isLoadingDiff ? 'Loading...' : 'Refresh Diff'}
            </ToolbarButton>
            
            <ToolbarButton onClick={() => setShowDiffView(false)}>
              Back to Editor
            </ToolbarButton>
          </DiffControls>
          
          {currentDiff && (
            <DiffViewer 
              diff={currentDiff}
              title={currentTab.path || 'Unknown File'}
              showLineNumbers
              viewMode="split"
            />
          )}
        </EditorContainer>
      );
    }
    
    // Use safe property access for content
    const fileContent = currentTab.content || '';
    const filePath = currentTab.path || '';
    const fileExtension = currentTab.extension || '';
    
    // Simplified hasEditPermission check - you'll need to adapt this based on your actual permissions system
    const hasEditPermission = true; // This should be replaced with actual permission check
    
    if (isCodeFile(fileExtension)) {
      return (
        <CodeEditor
          key={activeTabId}
          code={fileContent}
          onChange={handleCodeChange}
          language={getLanguageForExtension(fileExtension)}
          path={filePath}
          onSave={handleSave}
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
          onSave={handleSave}
          ref={editorRef}
          path={filePath}
          showToolbar={true}
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
      saveToGit(currentTab.path, content);
    }
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
      await githubService.addFile(repoName, filePath);
      
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

  const handleCommit = async () => {
    if (!repoName || !commitMessage || !user) return;
    
    try {
      setIsCommitting(true);
      // Add author parameter with user information
      await githubService.commit(repoName, commitMessage, {
        name: user.name || user.login,
        email: `${user.login}@github.com` // Use github username as email if real email not available
      });
      setCommitMessage('');
      await refreshGitStatus(repoName);
    } catch (error) {
      console.error('Error committing changes:', error);
    } finally {
      setIsCommitting(false);
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
        toast({
          title: 'Pull successful',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } else {
        // Conflicts detected
        setConflictingFiles(result.conflictingFiles);
        setShowVersionControl(true); // Show the version control panel
        toast({
          title: 'Merge conflicts detected',
          description: `${result.conflictingFiles.length} file(s) have merge conflicts that need resolution.`,
          status: 'warning',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Error pulling changes:', error);
      toast({
        title: 'Error pulling changes',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
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
      
      toast({
        title: 'Conflict resolved',
        description: `Successfully resolved conflicts in ${filepath}`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error resolving conflict:', error);
      toast({
        title: 'Error resolving conflict',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsResolvingConflicts(false);
    }
  };

  // Add handler for completing conflict resolution
  const handleCompleteResolution = async (commitMessage: string) => {
    if (!repoName || !user) return;
    
    try {
      setIsResolvingConflicts(true);
      
      // Complete the conflict resolution with a commit
      await githubService.completeConflictResolution(
        repoName, 
        commitMessage,
        {
          name: user.name || user.login,
          email: `${user.login}@github.com`
        }
      );
      
      // Clear conflict state
      setConflictingFiles([]);
      
      // Refresh the repository
      await refreshGitStatus(repoName);
      
      toast({
        title: 'Conflicts resolved',
        description: 'All conflicts have been successfully resolved.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error completing conflict resolution:', error);
      toast({
        title: 'Error completing conflict resolution',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
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
      toast({
        title: 'Error getting conflict info',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
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

  const handleGitCommit = async () => {
    if (!selectedRepository || !selectedBranch) {
      toast({
        title: 'Repository not selected',
        description: 'Please select a repository and branch to commit changes',
        status: 'error',
      });
      return;
    }

    try {
      setIsGitOperationInProgress(true);
      await githubService.commitChanges(
        selectedRepository,
        commitMessage || 'Update file(s)',
        userSettings.gitConfig?.name || 'Anonymous',
        userSettings.gitConfig?.email || 'anonymous@example.com'
      );
      toast({
        title: 'Changes committed',
        description: 'Your changes have been committed to the local repository',
        status: 'success',
      });
      setCommitMessage('');
      refreshGitStatus();
    } catch (error) {
      console.error('Error committing changes:', error);
      toast({
        title: 'Commit failed',
        description: 'Failed to commit changes. Please try again.',
        status: 'error',
      });
    } finally {
      setIsGitOperationInProgress(false);
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
      if (staged) {
        await githubService.addFile(repoName, filepath);
      } else {
        await githubService.unstageFile(repoName, filepath);
      }
      refreshGitStatus();
    } catch (error) {
      console.error('Error staging file:', error);
      toast({
        title: 'Failed to stage file',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  // Add state for version control panel visibility
  const [showVersionControl, setShowVersionControl] = useState(false);

  // Add toggle function
  const toggleVersionControl = () => {
    setShowVersionControl(!showVersionControl);
  };

  // Add styled component for toggle button
  const VersionControlToggleButton = styled.button`
    position: fixed;
    bottom: 1rem;
    right: ${props => props.showAgentPanel ? '360px' : '70px'};
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
      background-color: ${props => props.theme.colors.secondaryDark};
    }
  `;

  // Add state for conflict resolution
  const [conflictingFiles, setConflictingFiles] = useState<string[]>([]);
  const [isResolvingConflicts, setIsResolvingConflicts] = useState<boolean>(false);

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
        </EditorToolbar>
        
        <EditorContent>
          {renderEditor()}
          <SearchPanel 
            isVisible={showSearchPanel}
            onSearch={handleSearch}
            onClose={handleCloseSearch}
            onNext={codeEditorRef.current?.openSearch}
            onPrevious={codeEditorRef.current?.openSearch}
            onReplace={undefined}
            onReplaceAll={undefined}
          />
        </EditorContent>

        {/* Add GitStatusBar for GitHub integration */}
        {repoName && (
          <GitStatusBar
            modifiedFiles={modifiedFiles}
            commitMessage={commitMessage}
            onCommitMessageChange={setCommitMessage}
            onStageFile={handleStageFile}
            onCommit={handleCommit}
            onPush={handlePush}
            onPull={handlePull}
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
          darkMode={theme === 'dark'}
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
            repositoryOwner={user?.login || ''}
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
          showAgentPanel={showAgentPanel}
        >
          <BiGitBranch />
        </VersionControlToggleButton>
      )}

      {/* Version Control Panel */}
      {repoName && (
        <VersionControlPanel
          repositoryName={repoName}
          repositoryOwner={user?.login || ''}
          currentBranch={currentBranch}
          modifiedFiles={modifiedFiles}
          conflictingFiles={conflictingFiles}
          commitMessage={commitMessage}
          onCommitMessageChange={setCommitMessage}
          onStageFile={handleStageFile}
          onCommit={handleCommit}
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

export default EditorPage; 