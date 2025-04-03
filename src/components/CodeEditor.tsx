import React, { useEffect, useRef, useState } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, highlightActiveLineGutter, highlightSpecialChars, drawSelection, lineNumbers } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { indentOnInput, syntaxHighlighting, defaultHighlightStyle, bracketMatching, foldGutter, foldKeymap } from '@codemirror/language';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { oneDark } from '@codemirror/theme-one-dark';
import styled from 'styled-components';

interface CodeEditorProps {
  code: string;
  language?: 'javascript' | 'typescript' | 'python';
  onChange?: (code: string) => void;
  darkMode?: boolean;
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

const CodeEditor: React.FC<CodeEditorProps> = ({ 
  code = '', 
  language = 'javascript', 
  onChange, 
  darkMode = false 
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [editorState, setEditorState] = useState<EditorState | null>(null);

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

    return () => {
      if (viewRef.current) {
        viewRef.current.destroy();
        viewRef.current = null;
      }
    };
  }, [editorState]);

  return <EditorContainer ref={editorRef} />;
};

export default CodeEditor; 