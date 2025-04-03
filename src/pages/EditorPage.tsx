import React, { useState, useRef } from 'react';
import styled from 'styled-components';
import { Editor as TiptapEditor } from '@tiptap/react';
import Editor from '../components/Editor';

const EditorContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
  padding: 1rem;
  height: calc(100vh - 120px);
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
  background-color: ${props => props.theme.colors.backgroundAlt};
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
    background-color: ${props => props.theme.colors.backgroundHover};
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

const EditorPage: React.FC = () => {
  const [documentTitle, setDocumentTitle] = useState('Untitled Document');
  const [documentContent, setDocumentContent] = useState('<p>Start typing here...</p>');
  const [markdownContent, setMarkdownContent] = useState('Start typing here...');
  const [isMarkdownMode, setIsMarkdownMode] = useState(false);
  const editorRef = useRef<TiptapEditor | null>(null);

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

  return (
    <EditorContainer>
      <EditorHeader>
        <DocumentTitle 
          value={documentTitle}
          onChange={(e) => setDocumentTitle(e.target.value)}
          placeholder="Document Title"
        />
      </EditorHeader>
      
      <EditorToolbar>
        <ToolbarButton 
          onClick={handleBoldClick}
          disabled={isMarkdownMode}
          active={editorRef.current?.isActive('bold')}
        >
          Bold
        </ToolbarButton>
        <ToolbarButton 
          onClick={handleItalicClick}
          disabled={isMarkdownMode}
          active={editorRef.current?.isActive('italic')}
        >
          Italic
        </ToolbarButton>
        <ToolbarButton 
          onClick={handleUnderlineClick}
          disabled={isMarkdownMode}
          active={editorRef.current?.isActive('underline')}
        >
          Underline
        </ToolbarButton>
        <ToolbarButton 
          onClick={handleCodeClick}
          disabled={isMarkdownMode}
          active={editorRef.current?.isActive('code')}
        >
          Code
        </ToolbarButton>
        <ToolbarButton 
          onClick={handleLinkClick}
          disabled={isMarkdownMode}
          active={editorRef.current?.isActive('link')}
        >
          Link
        </ToolbarButton>
        
        <ToolbarSeparator />
        
        <ToolbarButton 
          onClick={handleToggleMarkdownMode}
          active={isMarkdownMode}
        >
          {isMarkdownMode ? 'Rich Text' : 'Markdown'}
        </ToolbarButton>
      </EditorToolbar>
      
      <Editor 
        content={documentContent}
        onChange={setDocumentContent}
        onChangeMarkdown={setMarkdownContent}
        isMarkdownMode={isMarkdownMode}
        placeholder="Start typing here..."
        onEditorReady={setEditor}
      />
    </EditorContainer>
  );
};

export default EditorPage; 