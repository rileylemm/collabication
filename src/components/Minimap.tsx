import React, { useEffect, useRef } from 'react';
import styled from 'styled-components';
import { EditorView } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { markdown } from '@codemirror/lang-markdown';

// Styled components for the minimap
const MinimapContainer = styled.div`
  position: absolute;
  top: 0;
  right: 0;
  width: 120px;
  height: 100%;
  overflow: hidden;
  border-left: 1px solid ${props => props.theme.colors.border};
  opacity: 0.6;
  transition: opacity 0.3s ease;
  
  &:hover {
    opacity: 0.8;
  }
`;

const MinimapInner = styled.div`
  width: 100%;
  height: 100%;
  
  .cm-editor {
    height: 100%;
    font-size: 2px !important;
    line-height: 3px !important;
  }
  
  .cm-content {
    cursor: pointer;
    pointer-events: all;
  }
  
  .cm-gutters {
    display: none;
  }
  
  .cm-activeLineGutter, .cm-activeLine {
    background: transparent !important;
  }
  
  .cm-cursor {
    display: none !important;
  }
`;

const MinimapHighlight = styled.div`
  position: absolute;
  right: 0;
  width: 100%;
  background-color: ${props => props.theme.colors.primary}20;
  border: 1px solid ${props => props.theme.colors.primary};
  pointer-events: none;
`;

interface MinimapProps {
  code: string;
  language: 'javascript' | 'typescript' | 'python' | 'markdown';
  mainEditor: EditorView | null;
  darkMode?: boolean;
}

const Minimap: React.FC<MinimapProps> = ({ code, language, mainEditor, darkMode = false }) => {
  const minimapRef = useRef<HTMLDivElement>(null);
  const minimapViewRef = useRef<EditorView | null>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  
  // Set up the minimap editor and handle cleanup
  useEffect(() => {
    if (!minimapRef.current) return;
    
    // Clean up previous instance if it exists
    if (minimapViewRef.current) {
      minimapViewRef.current.destroy();
      minimapViewRef.current = null;
    }
    
    // Create extensions for syntax highlighting
    const extensions = [
      EditorView.editable.of(false), // Make it read-only
      EditorView.contentAttributes.of({ 'aria-hidden': 'true' }), // Hide from screen readers
      EditorView.theme({
        '&': { 
          height: '100%'
        },
        '.cm-scroller': { 
          overflow: 'hidden'
        },
        '.cm-content': {
          fontSize: '2px',
          lineHeight: '3px'
        }
      })
    ];
    
    // Add language support
    switch (language) {
      case 'typescript':
      case 'javascript':
        extensions.push(javascript());
        break;
      case 'python':
        extensions.push(python());
        break;
      case 'markdown':
        extensions.push(markdown());
        break;
    }
    
    // Create the minimap editor
    const state = EditorState.create({
      doc: code,
      extensions
    });
    
    minimapViewRef.current = new EditorView({
      state,
      parent: minimapRef.current
    });
    
    // Setup cleanup for when component unmounts
    return () => {
      if (minimapViewRef.current) {
        minimapViewRef.current.destroy();
        minimapViewRef.current = null;
      }
    };
  }, [code, language]); // Re-create when code or language changes
  
  // Update highlight based on main editor's viewport
  useEffect(() => {
    if (!mainEditor || !minimapRef.current || !highlightRef.current) return;
    
    const updateHighlight = () => {
      if (!mainEditor || !minimapRef.current || !highlightRef.current) return;
      
      const mainScroller = mainEditor.scrollDOM;
      const mainContent = mainEditor.contentDOM;
      
      if (!mainScroller || !mainContent) return;
      
      // Calculate minimap highlight position and size
      const contentHeight = mainContent.scrollHeight;
      const visibleHeight = mainScroller.clientHeight;
      const scrollPosition = mainScroller.scrollTop;
      
      if (contentHeight <= 0) return;
      
      // Calculate ratios and dimensions
      const visibleRatio = Math.min(1.0, visibleHeight / contentHeight);
      const scrollRatio = contentHeight <= visibleHeight 
        ? 0 
        : scrollPosition / (contentHeight - visibleHeight);
      
      const minimapHeight = minimapRef.current.clientHeight;
      const highlightHeight = Math.max(30, minimapHeight * visibleRatio);
      const maxTop = minimapHeight - highlightHeight;
      const highlightTop = scrollRatio * maxTop;
      
      // Update the highlight element
      highlightRef.current.style.height = `${highlightHeight}px`;
      highlightRef.current.style.top = `${highlightTop}px`;
    };
    
    // Do initial update
    updateHighlight();
    
    // Add scroll listener to main editor
    const mainScroller = mainEditor.scrollDOM;
    mainScroller.addEventListener('scroll', updateHighlight);
    
    // Update on window resize too
    window.addEventListener('resize', updateHighlight);
    
    return () => {
      mainScroller.removeEventListener('scroll', updateHighlight);
      window.removeEventListener('resize', updateHighlight);
    };
  }, [mainEditor]);
  
  // Handle click on minimap to scroll main editor
  const handleMinimapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!mainEditor || !minimapRef.current) return;
    
    const { top, height } = minimapRef.current.getBoundingClientRect();
    const clickPosition = (e.clientY - top) / height;
    
    const mainScroller = mainEditor.scrollDOM;
    const mainContent = mainEditor.contentDOM;
    
    if (!mainScroller || !mainContent) return;
    
    const scrollTarget = clickPosition * (mainContent.scrollHeight - mainScroller.clientHeight);
    mainScroller.scrollTop = scrollTarget;
  };
  
  return (
    <MinimapContainer onClick={handleMinimapClick}>
      <MinimapInner ref={minimapRef} />
      <MinimapHighlight ref={highlightRef} />
    </MinimapContainer>
  );
};

export default Minimap; 