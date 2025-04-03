import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { Editor as TiptapEditor } from '@tiptap/react';
import DocumentEditor from '../components/DocumentEditor';
import FileBrowser from '../components/FileBrowser';
import TabBar, { TabItem } from '../components/TabBar';
import { Theme } from '../styles/theme';
import { v4 as uuidv4 } from 'uuid';

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
}

const PageContainer = styled.div`
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
`;

const EditorHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
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

const EditorPage: React.FC = () => {
  const [documentTitle, setDocumentTitle] = useState('Untitled Document');
  const [documentContent, setDocumentContent] = useState('<p>Start typing here...</p>');
  const [markdownContent, setMarkdownContent] = useState('Start typing here...');
  const [isMarkdownMode, setIsMarkdownMode] = useState(false);
  const [filename, setFilename] = useState('document.md');
  const [selectedFilePath, setSelectedFilePath] = useState('/Project/document.md');
  const editorRef = useRef<TiptapEditor | null>(null);
  
  // Tab management state
  const [tabs, setTabs] = useState<TabItem[]>([
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
  
  // Update editor content when active tab changes
  useEffect(() => {
    const activeFile = fileContents[activeTabId];
    if (activeFile) {
      setDocumentContent(activeFile.content);
      setIsMarkdownMode(activeFile.isMarkdownMode);
      
      const activeTab = tabs.find(tab => tab.id === activeTabId);
      if (activeTab) {
        setFilename(activeTab.name);
        setSelectedFilePath(activeTab.path);
        setDocumentTitle(activeTab.name.split('.')[0]);
      }
    }
  }, [activeTabId]);

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

  const handleFileSelect = (file: FileItem) => {
    if (file.type !== 'file') return;
    
    // Check if file is already open in a tab
    const existingTab = tabs.find(tab => tab.path === file.path);
    
    if (existingTab) {
      // Switch to existing tab
      setActiveTabId(existingTab.id);
      return;
    }
    
    // Create a new tab
    const newTabId = uuidv4();
    const extension = file.name.split('.').pop() || '';
    
    // Generate sample content based on file type
    let newContent = '<p>Content of ' + file.name + '</p>';
    let newIsMarkdownMode = false;
    
    if (extension === 'ts' || extension === 'tsx' || extension === 'js' || extension === 'jsx' || extension === 'css') {
      newContent = '<p>// Code content for ' + file.name + '</p>';
      newIsMarkdownMode = true;
    }
    
    // Add new tab
    setTabs(prev => [...prev, {
      id: newTabId,
      path: file.path,
      name: file.name,
      isDirty: false,
      extension
    }]);
    
    // Add file content
    setFileContents(prev => ({
      ...prev,
      [newTabId]: {
        content: newContent,
        isDirty: false,
        isMarkdownMode: newIsMarkdownMode
      }
    }));
    
    // Switch to new tab
    setActiveTabId(newTabId);
  };

  // Determine if the current file is a text file that supports rich text editing
  const isTextFile = filename.endsWith('.md') || 
                    filename.endsWith('.txt') || 
                    filename.endsWith('.html');

  return (
    <PageContainer>
      <FileBrowser 
        files={sampleFiles}
        onFileSelect={handleFileSelect}
        selectedFilePath={selectedFilePath}
      />
      
      <EditorContainer>
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
        </EditorToolbar>
        
        <DocumentEditor 
          filename={filename}
          content={documentContent}
          onChange={setDocumentContent}
          onEditorReady={setEditor}
          isMarkdownMode={isMarkdownMode}
        />
      </EditorContainer>
    </PageContainer>
  );
};

export default EditorPage; 