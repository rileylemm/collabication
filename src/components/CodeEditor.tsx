import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, highlightActiveLineGutter, highlightSpecialChars, drawSelection, lineNumbers } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, undo, redo } from '@codemirror/commands';
import { 
  indentOnInput, 
  syntaxHighlighting, 
  defaultHighlightStyle, 
  bracketMatching, 
  foldGutter, 
  foldKeymap,
  foldCode,
  unfoldCode,
  foldAll,
  unfoldAll
} from '@codemirror/language';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { oneDark } from '@codemirror/theme-one-dark';
import { search, searchKeymap, openSearchPanel, closeSearchPanel } from '@codemirror/search';
import styled from 'styled-components';
import { Decoration } from '@codemirror/view';
import Minimap from './Minimap';

// Define a public API for the editor
export interface CodeEditorRef {
  focus: () => void;
  undo: () => boolean;
  redo: () => boolean;
  canUndo: () => boolean;
  canRedo: () => boolean;
  // Search methods
  openSearch: () => void;
  closeSearch: () => void;
  getView: () => EditorView | null;
  // Code folding methods
  foldSelection: () => boolean;
  unfoldSelection: () => boolean;
  foldAll: () => boolean;
  unfoldAll: () => boolean;
}

interface CodeEditorProps {
  code: string;
  language?: 'javascript' | 'typescript' | 'python';
  onChange?: (code: string) => void;
  darkMode?: boolean;
  onReady?: (ref: CodeEditorRef) => void;
  showMinimap?: boolean;
}

const EditorContainer = styled.div`
  height: 100%;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.medium};
  overflow: hidden;
  font-family: monospace;
  position: relative;
  
  .cm-editor {
    height: 100%;
  }
  
  .cm-content {
    font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
  }
  
  .cm-gutters {
    border-right: 1px solid ${props => props.theme.colors.border};
  }
  
  /* Style for search match highlights */
  .cm-selectionMatch {
    background-color: rgba(115, 170, 100, 0.2);
  }
  .cm-searchMatch {
    background-color: rgba(250, 200, 100, 0.3);
    border-bottom: 1px solid rgba(250, 200, 100, 0.7);
  }
  .cm-searchMatch.cm-searchMatch-selected {
    background-color: rgba(250, 150, 50, 0.4);
    border-bottom: 1px solid rgba(250, 150, 50, 0.8);
  }
  
  /* Line numbers and gutters */
  .cm-lineNumbers {
    font-size: 12px;
    color: rgba(128, 128, 128, 0.8);
    padding-right: 8px;
  }
  
  /* Enhanced fold indicators */
  .cm-foldGutter {
    padding-right: 5px;
    cursor: pointer;
  }
  
  .cm-foldGutter span {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 14px;
    height: 14px;
    border-radius: 2px;
    background-color: rgba(128, 128, 128, 0.1);
    transition: background-color 0.2s ease;
  }
  
  .cm-foldGutter:hover span {
    background-color: rgba(128, 128, 128, 0.2);
  }
  
  .cm-foldPlaceholder {
    background-color: rgba(128, 128, 128, 0.1);
    border: 1px solid rgba(128, 128, 128, 0.3);
    border-radius: 3px;
    color: rgba(128, 128, 128, 0.9);
    font-size: 85%;
    padding: 0 6px;
    margin: 0 6px;
    cursor: pointer;
    transition: background-color 0.2s ease;
    
    &:hover {
      background-color: rgba(128, 128, 128, 0.2);
    }
  }
  
  .cm-activeLineGutter {
    background-color: rgba(128, 128, 128, 0.1);
  }
`;

// Adjust the editor padding when minimap is shown
const EditorWithMinimap = styled.div<{ showMinimap: boolean }>`
  .cm-editor .cm-scroller {
    padding-right: ${props => props.showMinimap ? '80px' : '0'};
  }
`;

const CodeEditor = forwardRef<CodeEditorRef, CodeEditorProps>(({ 
  code = '', 
  language = 'javascript', 
  onChange, 
  darkMode = false,
  onReady,
  showMinimap = true
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
    },
    openSearch: () => {
      if (viewRef.current) {
        openSearchPanel(viewRef.current);
      }
    },
    closeSearch: () => {
      if (viewRef.current) {
        closeSearchPanel(viewRef.current);
      }
    },
    getView: () => viewRef.current,
    foldSelection: () => {
      if (viewRef.current) {
        return foldCode(viewRef.current);
      }
      return false;
    },
    unfoldSelection: () => {
      if (viewRef.current) {
        return unfoldCode(viewRef.current);
      }
      return false;
    },
    foldAll: () => {
      if (viewRef.current) {
        return foldAll(viewRef.current);
      }
      return false;
    },
    unfoldAll: () => {
      if (viewRef.current) {
        return unfoldAll(viewRef.current);
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

    // Custom fold gutter markers with better styling
    const foldGutterConfig = {
      openText: "▼",
      closedText: "►",
      markerDOM: (open: boolean) => {
        const marker = document.createElement("span");
        marker.textContent = open ? "▼" : "►";
        marker.title = open ? "Click to fold" : "Click to unfold";
        return marker;
      }
    };

    const state = EditorState.create({
      doc: code,
      extensions: [
        // Basic editor setup
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightSpecialChars(),
        history(),
        foldGutter(foldGutterConfig),
        drawSelection(),
        bracketMatching(),
        indentOnInput(),
        syntaxHighlighting(defaultHighlightStyle),
        
        // Search extension
        search({
          top: true
        }),
        
        // Keymaps
        keymap.of([
          ...defaultKeymap, 
          ...historyKeymap, 
          ...foldKeymap,
          ...searchKeymap,
          // Add custom fold/unfold keyboard shortcuts
          { key: "Ctrl-Alt-[", run: foldCode },
          { key: "Cmd-Alt-[", run: foldCode },
          { key: "Ctrl-Alt-]", run: unfoldCode },
          { key: "Cmd-Alt-]", run: unfoldCode },
          { key: "Ctrl-Alt-Shift-[", run: foldAll },
          { key: "Cmd-Alt-Shift-[", run: foldAll },
          { key: "Ctrl-Alt-Shift-]", run: unfoldAll },
          { key: "Cmd-Alt-Shift-]", run: unfoldAll }
        ]),
        
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
        },
        openSearch: () => {
          if (viewRef.current) {
            openSearchPanel(viewRef.current);
          }
        },
        closeSearch: () => {
          if (viewRef.current) {
            closeSearchPanel(viewRef.current);
          }
        },
        getView: () => viewRef.current,
        foldSelection: () => {
          if (viewRef.current) {
            return foldCode(viewRef.current);
          }
          return false;
        },
        unfoldSelection: () => {
          if (viewRef.current) {
            return unfoldCode(viewRef.current);
          }
          return false;
        },
        foldAll: () => {
          if (viewRef.current) {
            return foldAll(viewRef.current);
          }
          return false;
        },
        unfoldAll: () => {
          if (viewRef.current) {
            return unfoldAll(viewRef.current);
          }
          return false;
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

  return (
    <EditorContainer>
      <EditorWithMinimap ref={editorRef} showMinimap={showMinimap} />
      {showMinimap && viewRef.current && (
        <Minimap 
          mainEditor={viewRef.current} 
          code={code}
          language={language}
          darkMode={darkMode}
        />
      )}
    </EditorContainer>
  );
});

export default CodeEditor; 