import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, highlightActiveLineGutter, highlightSpecialChars, drawSelection, lineNumbers } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, undo, redo, historyField } from '@codemirror/commands';
import { indentOnInput, syntaxHighlighting, defaultHighlightStyle, bracketMatching, foldGutter, foldKeymap } from '@codemirror/language';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { oneDark } from '@codemirror/theme-one-dark';
import styled from 'styled-components';

// Define a public API for the editor
export interface CodeEditorRef {
  focus: () => void;
  undo: () => boolean;
  redo: () => boolean;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

interface CodeEditorProps {
  code: string;
  language?: 'javascript' | 'typescript' | 'python';
  onChange?: (code: string) => void;
  darkMode?: boolean;
  onReady?: (ref: CodeEditorRef) => void;
}

const EditorContainer = styled.div`
  height: 100%;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.medium};
  overflow: hidden;
  font-family: monospace;
  
  .cm-editor {
    height: 100%;
  }
  
  .cm-content {
    font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
  }
  
  .cm-gutters {
    border-right: 1px solid ${props => props.theme.colors.border};
  }
`;

const CodeEditor = forwardRef<CodeEditorRef, CodeEditorProps>(({ 
  code = '', 
  language = 'javascript', 
  onChange, 
  darkMode = false,
  onReady
}, ref) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [editorState, setEditorState] = useState<EditorState | null>(null);

  // Expose public methods to parent component
  useImperativeHandle(ref, () => ({
    focus: () => {
      viewRef.current?.focus();
    },
    undo: () => {
      if (viewRef.current) {
        return undo({ state: viewRef.current.state, dispatch: viewRef.current.dispatch });
      }
      return false;
    },
    redo: () => {
      if (viewRef.current) {
        return redo({ state: viewRef.current.state, dispatch: viewRef.current.dispatch });
      }
      return false;
    },
    canUndo: () => {
      if (viewRef.current) {
        // Use simpler approach to check undo availability
        try {
          return undo({ state: viewRef.current.state, dispatch: () => {} });
        } catch (e) {
          return false;
        }
      }
      return false;
    },
    canRedo: () => {
      if (viewRef.current) {
        // Use simpler approach to check redo availability
        try {
          return redo({ state: viewRef.current.state, dispatch: () => {} });
        } catch (e) {
          return false;
        }
      }
      return false;
    }
  }));

  // Get the language extension based on the specified language
  const getLanguageExtension = () => {
    switch (language) {
      case 'typescript':
      case 'javascript':
        return javascript();
      case 'python':
        return python();
      default:
        return javascript();
    }
  };

  // Set up the editor state with extensions
  useEffect(() => {
    if (!editorRef.current) return;

    const theme = darkMode ? oneDark : [];

    const state = EditorState.create({
      doc: code,
      extensions: [
        // Basic editor setup
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightSpecialChars(),
        history(),
        foldGutter(),
        drawSelection(),
        bracketMatching(),
        indentOnInput(),
        syntaxHighlighting(defaultHighlightStyle),
        keymap.of([...defaultKeymap, ...historyKeymap, ...foldKeymap]),
        
        // Language support
        getLanguageExtension(),
        
        // Theme
        theme,
        
        // Update listener
        EditorView.updateListener.of(update => {
          if (update.docChanged && onChange) {
            onChange(update.state.doc.toString());
          }
        }),
      ],
    });

    setEditorState(state);

    return () => {
      setEditorState(null);
    };
  }, [code, language, darkMode, onChange]);

  // Create or update the editor view when the state changes
  useEffect(() => {
    if (!editorRef.current || !editorState) return;

    if (viewRef.current) {
      viewRef.current.destroy();
    }

    viewRef.current = new EditorView({
      state: editorState,
      parent: editorRef.current,
    });

    // Notify parent about the editor being ready
    if (onReady && viewRef.current) {
      const editorRef: CodeEditorRef = {
        focus: () => viewRef.current?.focus(),
        undo: () => undo({ state: viewRef.current!.state, dispatch: viewRef.current!.dispatch }),
        redo: () => redo({ state: viewRef.current!.state, dispatch: viewRef.current!.dispatch }),
        canUndo: () => {
          try {
            return undo({ state: viewRef.current!.state, dispatch: () => {} });
          } catch (e) {
            return false;
          }
        },
        canRedo: () => {
          try {
            return redo({ state: viewRef.current!.state, dispatch: () => {} });
          } catch (e) {
            return false;
          }
        }
      };
      onReady(editorRef);
    }

    return () => {
      if (viewRef.current) {
        viewRef.current.destroy();
        viewRef.current = null;
      }
    };
  }, [editorState, onReady]);

  return <EditorContainer ref={editorRef} />;
});

export default CodeEditor; 