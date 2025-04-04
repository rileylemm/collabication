import React, { useEffect, useState, useRef, useImperativeHandle, forwardRef, useCallback } from 'react';
import { Editor as TiptapEditor, useEditor, EditorContent } from '@tiptap/react';
import styled from 'styled-components';
import Editor from './Editor';
import CodeEditor, { CodeEditorRef } from './CodeEditor';
import { useTheme } from '../contexts/ThemeContext';
import { getFileType, getCodeLanguage } from '../utils/fileUtils';
import { useCollaboration } from '../contexts/CollaborationContext';
import collaborationService from '../services/collaborationService';
import * as Y from 'yjs';
import { getExtensions } from './DocumentEditorExtensions';
import { FaEye, FaEdit, FaCrown } from 'react-icons/fa';

// Export public interface for DocumentEditor
export interface DocumentEditorRef {
  setContent: (content: string) => void;
  getContent: () => string;
  getCharacterCount: () => number;
  focus: () => void;
  undo: () => void;
  redo: () => void;
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
  initialValue?: string;
  placeholder?: string;
  documentId?: string;
  readOnly?: boolean;
  onCanUndoChange?: (canUndo: boolean) => void;
  onCanRedoChange?: (canRedo: boolean) => void;
  darkMode?: boolean;
}

const EditorContainer = styled.div<{ $darkMode: boolean }>`
  position: relative;
  height: 100%;
  background-color: ${props => props.$darkMode ? props.theme.colors.surface : props.theme.colors.background};
  color: ${props => props.theme.colors.text};
  border-radius: 4px;
  
  .ProseMirror {
    min-height: 100px;
    padding: 16px;
    outline: none;
  }
  
  .ProseMirror p {
    margin: 0.5em 0;
  }
  
  .ProseMirror h1, .ProseMirror h2, .ProseMirror h3, .ProseMirror h4, .ProseMirror h5, .ProseMirror h6 {
    margin: 1em 0 0.5em;
  }
  
  .ProseMirror code {
    background-color: ${props => props.theme.colors.codeBackground};
    padding: 0.2em 0.4em;
    border-radius: 3px;
    font-family: monospace;
  }
  
  .ProseMirror pre {
    background-color: ${props => props.theme.colors.codeBackground};
    padding: 0.75em 1em;
    border-radius: 4px;
    overflow-x: auto;
  }
  
  .ProseMirror pre code {
    background: none;
    padding: 0;
  }
  
  .ProseMirror a {
    color: ${props => props.theme.colors.primary};
    text-decoration: underline;
  }
  
  /* Styles for collaboration cursors */
  .collaboration-cursor__caret {
    position: relative;
    border-left: 1px solid;
    margin-left: -1px;
    margin-right: -1px;
    pointer-events: none;
    word-break: normal;
  }
  
  .collaboration-cursor__label {
    position: absolute;
    top: -1.4em;
    left: -1px;
    font-size: 12px;
    font-style: normal;
    font-weight: 600;
    line-height: normal;
    white-space: nowrap;
    color: white;
    padding: 0.1rem 0.3rem;
    border-radius: 3px 3px 3px 0;
    user-select: none;
    pointer-events: none;
  }
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

const CollaborationInfo = styled.div`
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  gap: 4px;
`;

const UserBadge = styled.div`
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-size: 12px;
  margin-right: 5px;
`;

const PermissionIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  color: ${props => props.theme.colors.textSecondary};
  background-color: ${props => props.theme.colors.background}80;
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 10;
`;

const DocumentEditor = forwardRef<DocumentEditorRef, DocumentEditorProps>((props, ref) => {
  const {
    filename,
    content: initialContent,
    onChange,
    onEditorReady,
    isMarkdownMode = false,
    onDocumentEditorReady,
    initialValue = '<p>Start typing here...</p>',
    placeholder = 'Start typing...',
    documentId,
    readOnly = false,
    onCanUndoChange,
    onCanRedoChange,
    darkMode = false,
  } = props;

  const { theme } = useTheme();
  const [editorType, setEditorType] = useState<'text' | 'code'>('text');
  const [language, setLanguage] = useState<string>('javascript');
  const codeEditorRef = useRef<CodeEditorRef | null>(null);
  const tiptapEditorRef = useRef<TiptapEditor | null>(null);
  const [isCollaborating, setIsCollaborating] = useState(false);
  const [content, setContent] = useState(initialValue);
  
  // Get the collaboration context
  const {
    isConnected,
    connectToDocument,
    getYDoc,
    updateUserInfo,
    getYText,
    connectedUsers,
    canEdit,
    isOwner
  } = useCollaboration();

  // Get the user information from localStorage
  const getUserInfo = () => {
    const savedUser = localStorage.getItem('collabication-user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        return {
          name: parsed.name || 'Anonymous User',
          color: parsed.color || '#' + Math.floor(Math.random() * 16777215).toString(16)
        };
      } catch (e) {
        return {
          name: 'Anonymous User',
          color: '#' + Math.floor(Math.random() * 16777215).toString(16)
        };
      }
    }
    return {
      name: 'Anonymous User',
      color: '#' + Math.floor(Math.random() * 16777215).toString(16)
    };
  };

  // Get or create the Yjs document
  const getOrCreateYjsDoc = useCallback(() => {
    if (!documentId) return undefined;
    
    try {
      const doc = getYDoc(documentId);
      const yText = doc.getText('content');
      
      // If the yText is empty and we have initial content, set it
      if (yText.length === 0 && initialValue !== '<p>Start typing here...</p>') {
        // We need to use the Yjs transaction API to modify the shared document
        doc.transact(() => {
          yText.insert(0, initialValue);
        });
      }
      
      return doc;
    } catch (error) {
      console.error('Error getting Yjs document:', error);
      return undefined;
    }
  }, [documentId, getYDoc, initialValue]);

  // Determine if this document should be in read-only mode based on permissions
  const hasEditPermission = documentId ? canEdit() : true;
  const hasOwnerPermission = documentId ? isOwner() : true;
  const isReadOnly = readOnly || (isConnected && !hasEditPermission);

  // Get permission level for display
  const permissionLevel = !isConnected ? 'local' 
    : hasOwnerPermission ? 'owner'
    : hasEditPermission ? 'editor'
    : 'viewer';

  // Set up the editor with Yjs integration if needed
  const editor = useEditor(
    {
      extensions: getExtensions({
        placeholder,
        yDoc: isConnected && documentId ? getOrCreateYjsDoc() : undefined,
        user: isConnected ? getUserInfo() : undefined
      }),
      content: initialValue,
      editable: !isReadOnly,
      onUpdate: ({ editor }) => {
        const html = editor.getHTML();
        setContent(html);
        onChange && onChange(html);
      },
      onTransaction: () => {
        // Update undo/redo state
        if (editor && onCanUndoChange) {
          onCanUndoChange(editor.can().undo());
        }
        if (editor && onCanRedoChange) {
          onCanRedoChange(editor.can().redo());
        }
      },
    },
    [isConnected, documentId, isReadOnly]
  );

  // Connect to the collaboration server when the component mounts
  useEffect(() => {
    if (documentId && editor && isConnected && !isCollaborating) {
      const userInfo = getUserInfo();
      
      // Update user awareness information
      updateUserInfo({
        name: userInfo.name,
        color: userInfo.color,
        position: editor ? {
          from: editor.state.selection.anchor,
          to: editor.state.selection.head
        } : undefined
      });
      
      setIsCollaborating(true);
    }
  }, [documentId, editor, isConnected, isCollaborating, updateUserInfo]);

  // Update user cursor position on selection change
  useEffect(() => {
    if (!editor || !isConnected || !documentId) return;
    
    const updateCursorPosition = () => {
      updateUserInfo({
        position: {
          from: editor.state.selection.anchor,
          to: editor.state.selection.head
        }
      });
    };
    
    editor.on('selectionUpdate', updateCursorPosition);
    
    return () => {
      editor.off('selectionUpdate', updateCursorPosition);
    };
  }, [editor, isConnected, documentId, updateUserInfo]);

  // When switching between Markdown mode and rich text mode
  useEffect(() => {
    if (editor && isMarkdownMode) {
      // Convert HTML to Markdown here (would require a library like turndown)
      // This is a placeholder for the implementation
      console.log('Switch to Markdown mode - not fully implemented');
    } else if (editor && !isMarkdownMode) {
      // Convert Markdown to HTML (would require a library like marked or markdown-it)
      // This is a placeholder for the implementation
      console.log('Switch to Rich Text mode - not fully implemented');
    }
  }, [editor, isMarkdownMode]);

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
        setContent: (newContent: string) => {
          if (editor) {
            editor.commands.setContent(newContent);
          }
        },
        getContent: () => {
          if (editor) {
            return editor.getHTML();
          }
          return content;
        },
        getCharacterCount: () => {
          if (editor) {
            return editor.storage.characterCount.characters();
          }
          return 0;
        },
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
          }
        },
        redo: () => {
          if (editorType === 'code' && codeEditorRef.current) {
            return codeEditorRef.current.redo();
          } else if (tiptapEditorRef.current) {
            tiptapEditorRef.current.commands.redo();
          }
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
    <EditorContainer $darkMode={darkMode}>
      <FileTypeIndicator>
        {editorType === 'text' ? 'Text Document' : `Code (${language})`}
      </FileTypeIndicator>
      
      {/* Add permission indicator for collaborative documents */}
      {isConnected && documentId && (
        <PermissionIndicator>
          {permissionLevel === 'owner' && <FaCrown color="#FFD700" />}
          {permissionLevel === 'editor' && <FaEdit color="#4CAF50" />}
          {permissionLevel === 'viewer' && <FaEye color="#2196F3" />}
          <span>{permissionLevel}</span>
        </PermissionIndicator>
      )}
      
      {editorType === 'text' ? (
        <Editor
          content={content}
          onChange={onChange}
          onEditorReady={handleTiptapEditorReady}
          isMarkdownMode={isMarkdownMode}
          placeholder="Start typing here..."
          readOnly={isReadOnly}
        />
      ) : (
        <CodeEditor
          ref={codeEditorRef}
          code={content}
          language={language as any}
          onChange={onChange}
          darkMode={theme === 'dark'}
          onReady={handleCodeEditorReady}
          isCollaborative={isConnected && !!documentId}
          documentId={documentId}
          ydoc={documentId && isConnected ? getYDoc(documentId!) : undefined}
          wsProvider={documentId && isConnected ? 
            collaborationService.connect(documentId) : 
            undefined}
          user={getUserInfo()}
          readOnly={isReadOnly}
        />
      )}
      {isConnected && connectedUsers.length > 0 && (
        <CollaborationInfo>
          {connectedUsers.map((user, index) => (
            <UserBadge 
              key={`${user.name}-${index}`}
              style={{ backgroundColor: user.color }}
              title={user.name}
            >
              {user.name.charAt(0)}
            </UserBadge>
          ))}
        </CollaborationInfo>
      )}
    </EditorContainer>
  );
});

export default DocumentEditor; 