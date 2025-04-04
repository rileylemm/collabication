import React, { useState } from 'react';
import styled from 'styled-components';
import { FileDiff } from '../services/githubService';

interface DiffViewerProps {
  diff: FileDiff;
  title?: string;
  showLineNumbers?: boolean;
  viewMode?: 'split' | 'unified';
  maxHeight?: string;
  showControls?: boolean;
}

// Styled components for the diff viewer
const DiffContainer = styled.div`
  display: flex;
  flex-direction: column;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.medium};
  background-color: ${props => props.theme.colors.background};
  font-family: monospace;
  font-size: 0.9rem;
  overflow: hidden;
`;

const DiffHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background-color: ${props => props.theme.colors.surface};
  border-bottom: 1px solid ${props => props.theme.colors.border};
`;

const DiffTitle = styled.div`
  font-weight: 500;
  color: ${props => props.theme.colors.text};
`;

const DiffControls = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const DiffControlButton = styled.button<{ active?: boolean }>`
  background: ${props => props.active ? props.theme.colors.primary + '20' : props.theme.colors.surface};
  border: 1px solid ${props => props.active ? props.theme.colors.primary : props.theme.colors.border};
  color: ${props => props.active ? props.theme.colors.primary : props.theme.colors.text};
  padding: 0.25rem 0.5rem;
  border-radius: ${props => props.theme.borderRadius.small};
  font-size: 0.8rem;
  cursor: pointer;
  
  &:hover {
    background-color: ${props => props.active ? props.theme.colors.primary + '30' : props.theme.colors.hoverBackground};
  }
`;

const DiffContent = styled.div<{ maxHeight?: string }>`
  overflow: auto;
  max-height: ${props => props.maxHeight || '500px'};
`;

// Split view components
const SplitView = styled.div`
  display: flex;
  width: 100%;
`;

const SplitPane = styled.div`
  flex: 1;
  overflow: hidden;
  border-right: 1px solid ${props => props.theme.colors.border};
  
  &:last-child {
    border-right: none;
  }
`;

const SplitPaneHeader = styled.div`
  padding: 0.5rem;
  background-color: ${props => props.theme.colors.surface};
  border-bottom: 1px solid ${props => props.theme.colors.border};
  font-weight: 500;
  text-align: center;
  color: ${props => props.theme.colors.textSecondary};
`;

const LineRow = styled.div<{ type?: 'added' | 'removed' | 'unchanged' }>`
  display: flex;
  min-width: max-content;
  background-color: ${props => {
    switch (props.type) {
      case 'added':
        return props.theme.colors.success + '15';
      case 'removed':
        return props.theme.colors.error + '15';
      default:
        return 'transparent';
    }
  }};
`;

const LineNumber = styled.div`
  color: ${props => props.theme.colors.textTertiary};
  text-align: right;
  padding: 0 0.5rem;
  min-width: 3rem;
  user-select: none;
  border-right: 1px solid ${props => props.theme.colors.border};
`;

const LineContent = styled.div<{ type?: 'added' | 'removed' | 'unchanged' }>`
  padding: 0 0.5rem;
  white-space: pre;
  color: ${props => props.theme.colors.text};
  
  &::before {
    content: ${props => props.type === 'added' ? '"+ "' : props.type === 'removed' ? '"- "' : '" "'};
    color: ${props => {
      switch (props.type) {
        case 'added':
          return props.theme.colors.success;
        case 'removed':
          return props.theme.colors.error;
        default:
          return 'transparent';
      }
    }};
  }
`;

// Unified view components
const UnifiedLineRow = styled.div<{ type?: 'added' | 'removed' | 'unchanged' }>`
  display: flex;
  min-width: max-content;
  background-color: ${props => {
    switch (props.type) {
      case 'added':
        return props.theme.colors.success + '15';
      case 'removed':
        return props.theme.colors.error + '15';
      default:
        return 'transparent';
    }
  }};
`;

const UnifiedLineNumbers = styled.div`
  display: flex;
  color: ${props => props.theme.colors.textTertiary};
  user-select: none;
  border-right: 1px solid ${props => props.theme.colors.border};
`;

const OldLineNumber = styled.div`
  text-align: right;
  padding: 0 0.25rem;
  min-width: 3rem;
  color: ${props => props.theme.colors.textTertiary};
`;

const NewLineNumber = styled.div`
  text-align: right;
  padding: 0 0.25rem;
  min-width: 3rem;
  border-left: 1px solid ${props => props.theme.colors.border};
  color: ${props => props.theme.colors.textTertiary};
`;

const UnifiedLineContent = styled.div<{ type?: 'added' | 'removed' | 'unchanged' }>`
  padding: 0 0.5rem;
  white-space: pre;
  color: ${props => props.theme.colors.text};
  
  &::before {
    content: ${props => props.type === 'added' ? '"+ "' : props.type === 'removed' ? '"- "' : '" "'};
    color: ${props => {
      switch (props.type) {
        case 'added':
          return props.theme.colors.success;
        case 'removed':
          return props.theme.colors.error;
        default:
          return 'transparent';
      }
    }};
  }
`;

const EmptyDiffMessage = styled.div`
  padding: 2rem;
  text-align: center;
  color: ${props => props.theme.colors.textSecondary};
`;

const DiffViewer: React.FC<DiffViewerProps> = ({
  diff,
  title,
  showLineNumbers = true,
  viewMode: initialViewMode = 'split',
  maxHeight,
  showControls = true
}) => {
  const [viewMode, setViewMode] = useState<'split' | 'unified'>(initialViewMode);
  
  // Handle empty diff
  if (!diff.changes || diff.changes.length === 0) {
    return (
      <DiffContainer>
        <DiffHeader>
          <DiffTitle>{title || diff.path}</DiffTitle>
        </DiffHeader>
        <EmptyDiffMessage>No changes found</EmptyDiffMessage>
      </DiffContainer>
    );
  }
  
  const renderSplitView = () => {
    // Separate changes into old and new
    const oldChanges = diff.changes.filter(change => change.type !== 'added');
    const newChanges = diff.changes.filter(change => change.type !== 'removed');
    
    return (
      <SplitView>
        <SplitPane>
          <SplitPaneHeader>Original</SplitPaneHeader>
          {oldChanges.map((change, index) => (
            <LineRow key={`old-${index}`} type={change.type}>
              {showLineNumbers && (
                <LineNumber>{change.lineNumber.old || ''}</LineNumber>
              )}
              <LineContent type={change.type}>{change.content}</LineContent>
            </LineRow>
          ))}
        </SplitPane>
        
        <SplitPane>
          <SplitPaneHeader>Modified</SplitPaneHeader>
          {newChanges.map((change, index) => (
            <LineRow key={`new-${index}`} type={change.type}>
              {showLineNumbers && (
                <LineNumber>{change.lineNumber.new || ''}</LineNumber>
              )}
              <LineContent type={change.type}>{change.content}</LineContent>
            </LineRow>
          ))}
        </SplitPane>
      </SplitView>
    );
  };
  
  const renderUnifiedView = () => {
    return (
      <div>
        {diff.changes.map((change, index) => (
          <UnifiedLineRow key={`unified-${index}`} type={change.type}>
            {showLineNumbers && (
              <UnifiedLineNumbers>
                <OldLineNumber>{change.lineNumber.old || ''}</OldLineNumber>
                <NewLineNumber>{change.lineNumber.new || ''}</NewLineNumber>
              </UnifiedLineNumbers>
            )}
            <UnifiedLineContent type={change.type}>{change.content}</UnifiedLineContent>
          </UnifiedLineRow>
        ))}
      </div>
    );
  };
  
  return (
    <DiffContainer>
      <DiffHeader>
        <DiffTitle>{title || diff.path}</DiffTitle>
        
        {showControls && (
          <DiffControls>
            <DiffControlButton 
              active={viewMode === 'split'} 
              onClick={() => setViewMode('split')}
            >
              Split View
            </DiffControlButton>
            <DiffControlButton 
              active={viewMode === 'unified'} 
              onClick={() => setViewMode('unified')}
            >
              Unified View
            </DiffControlButton>
          </DiffControls>
        )}
      </DiffHeader>
      
      <DiffContent maxHeight={maxHeight}>
        {viewMode === 'split' ? renderSplitView() : renderUnifiedView()}
      </DiffContent>
    </DiffContainer>
  );
};

export default DiffViewer; 