import React, { useEffect, useState, useRef, useImperativeHandle, forwardRef } from 'react';
import { Editor as TiptapEditor } from '@tiptap/react';
import styled from 'styled-components';
import Editor from './Editor';
import CodeEditor, { CodeEditorRef } from './CodeEditor';
import { useTheme } from '../contexts/ThemeContext';
import { getFileType, getCodeLanguage } from '../utils/fileUtils';

// Export public interface for DocumentEditor
export interface DocumentEditorRef {
  focus: () => void;
  undo: () => boolean;
  redo: () => boolean;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

interface DocumentEditorProps {
  filename: string;
  content: string;
  onChange?: (content: string) => void;
  onEditorReady?: (editor: TiptapEditor | null) => void;
  isMarkdownMode?: boolean;
  onDocumentEditorReady?: (ref: DocumentEditorRef) => void;
}

const EditorContainer = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
`;

const FileTypeIndicator = styled.div`
  padding: 0.25rem 0.5rem;
  background-color: ${props => props.theme.colors.surface};
  color: ${props => props.theme.colors.textSecondary};
  font-size: 0.8rem;
  border-radius: ${props => props.theme.borderRadius.small};
  margin-bottom: 0.5rem;
  display: inline-flex;
  align-items: center;
  align-self: flex-end;
`;

const DocumentEditor = forwardRef<DocumentEditorRef, DocumentEditorProps>(({
  filename,
  content,
  onChange,
  onEditorReady,
  isMarkdownMode = false,
  onDocumentEditorReady
}, ref) => {
  const { theme } = useTheme();
  const [editorType, setEditorType] = useState<'text' | 'code'>('text');
  const [language, setLanguage] = useState<string>('javascript');
  const codeEditorRef = useRef<CodeEditorRef | null>(null);
  const tiptapEditorRef = useRef<TiptapEditor | null>(null);
  
  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    focus: () => {
      if (editorType === 'code' && codeEditorRef.current) {
        codeEditorRef.current.focus();
      } else if (tiptapEditorRef.current) {
        tiptapEditorRef.current.commands.focus();
      }
    },
    undo: () => {
      if (editorType === 'code' && codeEditorRef.current) {
        return codeEditorRef.current.undo();
      } else if (tiptapEditorRef.current) {
        tiptapEditorRef.current.commands.undo();
        return true;
      }
      return false;
    },
    redo: () => {
      if (editorType === 'code' && codeEditorRef.current) {
        return codeEditorRef.current.redo();
      } else if (tiptapEditorRef.current) {
        tiptapEditorRef.current.commands.redo();
        return true;
      }
      return false;
    },
    canUndo: () => {
      if (editorType === 'code' && codeEditorRef.current) {
        return codeEditorRef.current.canUndo();
      } else if (tiptapEditorRef.current) {
        return tiptapEditorRef.current.can().undo();
      }
      return false;
    },
    canRedo: () => {
      if (editorType === 'code' && codeEditorRef.current) {
        return codeEditorRef.current.canRedo();
      } else if (tiptapEditorRef.current) {
        return tiptapEditorRef.current.can().redo();
      }
      return false;
    }
  }));
  
  // Determine the editor type and language based on the file type
  useEffect(() => {
    const fileType = getFileType(filename);
    setEditorType(fileType === 'text' ? 'text' : 'code');
    
    if (fileType === 'code') {
      const codeLanguage = getCodeLanguage(filename);
      setLanguage(codeLanguage === 'unknown' ? 'javascript' : codeLanguage);
    }
  }, [filename]);

  // Set up Tiptap editor ref
  const handleTiptapEditorReady = (editor: TiptapEditor | null) => {
    tiptapEditorRef.current = editor;
    
    if (onEditorReady) {
      onEditorReady(editor);
    }
  };

  // Set up CodeMirror editor ref
  const handleCodeEditorReady = (editor: CodeEditorRef) => {
    codeEditorRef.current = editor;
  };

  // Notify parent when our editor is ready
  useEffect(() => {
    if (onDocumentEditorReady && (tiptapEditorRef.current || codeEditorRef.current)) {
      onDocumentEditorReady({
        focus: () => {
          if (editorType === 'code' && codeEditorRef.current) {
            codeEditorRef.current.focus();
          } else if (tiptapEditorRef.current) {
            tiptapEditorRef.current.commands.focus();
          }
        },
        undo: () => {
          if (editorType === 'code' && codeEditorRef.current) {
            return codeEditorRef.current.undo();
          } else if (tiptapEditorRef.current) {
            tiptapEditorRef.current.commands.undo();
            return true;
          }
          return false;
        },
        redo: () => {
          if (editorType === 'code' && codeEditorRef.current) {
            return codeEditorRef.current.redo();
          } else if (tiptapEditorRef.current) {
            tiptapEditorRef.current.commands.redo();
            return true;
          }
          return false;
        },
        canUndo: () => {
          if (editorType === 'code' && codeEditorRef.current) {
            return codeEditorRef.current.canUndo();
          } else if (tiptapEditorRef.current) {
            return tiptapEditorRef.current.can().undo();
          }
          return false;
        },
        canRedo: () => {
          if (editorType === 'code' && codeEditorRef.current) {
            return codeEditorRef.current.canRedo();
          } else if (tiptapEditorRef.current) {
            return tiptapEditorRef.current.can().redo();
          }
          return false;
        }
      });
    }
  }, [editorType, onDocumentEditorReady, tiptapEditorRef.current, codeEditorRef.current]);

  return (
    <EditorContainer>
      <FileTypeIndicator>
        {editorType === 'text' ? 'Text Document' : `Code (${language})`}
      </FileTypeIndicator>
      
      {editorType === 'text' ? (
        <Editor
          content={content}
          onChange={onChange}
          onEditorReady={handleTiptapEditorReady}
          isMarkdownMode={isMarkdownMode}
          placeholder="Start typing here..."
        />
      ) : (
        <CodeEditor
          ref={codeEditorRef}
          code={content}
          language={language as any}
          onChange={onChange}
          darkMode={theme === 'dark'}
          onReady={handleCodeEditorReady}
        />
      )}
    </EditorContainer>
  );
});

export default DocumentEditor; 