import React, { useEffect, useState } from 'react';
import { Editor as TiptapEditor } from '@tiptap/react';
import styled from 'styled-components';
import Editor from './Editor';
import CodeEditor from './CodeEditor';
import { useTheme } from '../contexts/ThemeContext';
import { getFileType, getCodeLanguage } from '../utils/fileUtils';

interface DocumentEditorProps {
  filename: string;
  content: string;
  onChange?: (content: string) => void;
  onEditorReady?: (editor: TiptapEditor | null) => void;
  isMarkdownMode?: boolean;
}

const EditorContainer = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
`;

const FileTypeIndicator = styled.div`
  padding: 0.25rem 0.5rem;
  background-color: ${props => props.theme.colors.backgroundAlt};
  color: ${props => props.theme.colors.textSecondary};
  font-size: 0.8rem;
  border-radius: ${props => props.theme.borderRadius.small};
  margin-bottom: 0.5rem;
  display: inline-flex;
  align-items: center;
  align-self: flex-end;
`;

const DocumentEditor: React.FC<DocumentEditorProps> = ({
  filename,
  content,
  onChange,
  onEditorReady,
  isMarkdownMode = false
}) => {
  const { theme } = useTheme();
  const [editorType, setEditorType] = useState<'text' | 'code'>('text');
  const [language, setLanguage] = useState<string>('javascript');
  
  // Determine the editor type and language based on the file type
  useEffect(() => {
    const fileType = getFileType(filename);
    setEditorType(fileType === 'text' ? 'text' : 'code');
    
    if (fileType === 'code') {
      const codeLanguage = getCodeLanguage(filename);
      setLanguage(codeLanguage === 'unknown' ? 'javascript' : codeLanguage);
    }
  }, [filename]);

  return (
    <EditorContainer>
      <FileTypeIndicator>
        {editorType === 'text' ? 'Text Document' : `Code (${language})`}
      </FileTypeIndicator>
      
      {editorType === 'text' ? (
        <Editor
          content={content}
          onChange={onChange}
          onEditorReady={onEditorReady}
          isMarkdownMode={isMarkdownMode}
          placeholder="Start typing here..."
        />
      ) : (
        <CodeEditor
          code={content}
          language={language as any}
          onChange={onChange}
          darkMode={theme === 'dark'}
        />
      )}
    </EditorContainer>
  );
};

export default DocumentEditor; 