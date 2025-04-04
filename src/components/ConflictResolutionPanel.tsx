import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { ConflictInfo } from '../services/githubService';

interface ConflictResolutionPanelProps {
  repositoryName: string;
  conflictingFiles: string[];
  onResolveConflict: (filepath: string, resolution: 'ours' | 'theirs' | 'custom', customContent?: string) => Promise<void>;
  onCompleteResolution: (commitMessage: string) => Promise<void>;
  onCancel: () => void;
  onGetConflictInfo: (repositoryName: string, filepath: string) => Promise<ConflictInfo | null>;
}

const Panel = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
`;

const FileList = styled.div`
  width: 100%;
  padding: 16px;
  border-bottom: 1px solid ${props => props.theme.colors.border};
`;

const FileItem = styled.div<{ isSelected: boolean }>`
  padding: 8px 12px;
  cursor: pointer;
  background-color: ${props => props.isSelected ? props.theme.colors.primary + '20' : 'transparent'};
  border-radius: 4px;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  
  &:hover {
    background-color: ${props => props.isSelected ? props.theme.colors.primary + '30' : 'rgba(0, 0, 0, 0.05)'};
  }
`;

const ConflictIcon = styled.span`
  color: ${props => props.theme.colors.error};
  font-size: 16px;
  margin-right: 8px;
`;

const ResolvedIcon = styled.span`
  color: ${props => props.theme.colors.success};
  font-size: 16px;
  margin-right: 8px;
`;

const ConflictContent = styled.div`
  flex: 1;
  padding: 16px;
  overflow-y: auto;
`;

const ConflictHeader = styled.div`
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid ${props => props.theme.colors.border};
`;

const ConflictActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
`;

const Button = styled.button<{ primary?: boolean; danger?: boolean }>`
  padding: 8px 16px;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  background-color: ${props => {
    if (props.primary) return props.theme.colors.primary;
    if (props.danger) return props.theme.colors.error;
    return '#f0f0f0';
  }};
  color: ${props => (props.primary || props.danger) ? 'white' : 'inherit'};
  border: none;
  
  &:hover {
    opacity: 0.9;
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ConflictBlock = styled.div`
  margin-bottom: 24px;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 4px;
  overflow: hidden;
`;

const ConflictBlockHeader = styled.div`
  padding: 8px 12px;
  background-color: ${props => props.theme.colors.surface};
  border-bottom: 1px solid ${props => props.theme.colors.border};
  font-weight: 500;
`;

const DiffContainer = styled.div`
  display: flex;
  border-bottom: 1px solid ${props => props.theme.colors.border};
`;

const DiffPanel = styled.div<{ side: 'ours' | 'theirs' }>`
  flex: 1;
  padding: 12px;
  background-color: ${props => props.side === 'ours' 
    ? 'rgba(232, 245, 233, 0.5)' 
    : 'rgba(255, 235, 238, 0.5)'};
  border-right: ${props => props.side === 'ours' 
    ? `1px solid ${props.theme.colors.border}` 
    : 'none'};
  white-space: pre-wrap;
  font-family: monospace;
`;

const DiffHeader = styled.div`
  padding: 4px 12px;
  font-size: 12px;
  background-color: ${props => props.theme.colors.surface};
  border-bottom: 1px solid ${props => props.theme.colors.border};
  display: flex;
  justify-content: space-between;
`;

const CustomEditor = styled.textarea`
  width: 100%;
  padding: 12px;
  border: none;
  border-top: 1px solid ${props => props.theme.colors.border};
  min-height: 100px;
  font-family: monospace;
  resize: vertical;
`;

const CommitMessageInput = styled.input`
  width: 100%;
  padding: 8px 12px;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 4px;
  margin-bottom: 16px;
`;

const FullPanel = styled.div`
  padding: 16px;
  display: flex;
  flex-direction: column;
`;

const ConflictResolutionPanel: React.FC<ConflictResolutionPanelProps> = ({
  repositoryName,
  conflictingFiles,
  onResolveConflict,
  onCompleteResolution,
  onCancel,
  onGetConflictInfo,
}) => {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [resolvedFiles, setResolvedFiles] = useState<Set<string>>(new Set());
  const [conflictInfo, setConflictInfo] = useState<ConflictInfo | null>(null);
  const [customEdits, setCustomEdits] = useState<Record<number, string>>({});
  const [resolutionMethod, setResolutionMethod] = useState<'ours' | 'theirs' | 'custom'>('custom');
  const [commitMessage, setCommitMessage] = useState('Resolve merge conflicts');
  const [isResolving, setIsResolving] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  useEffect(() => {
    if (conflictingFiles.length > 0 && !selectedFile) {
      setSelectedFile(conflictingFiles[0]);
    }
  }, [conflictingFiles, selectedFile]);

  useEffect(() => {
    const loadConflictInfo = async () => {
      if (selectedFile) {
        const info = await onGetConflictInfo(repositoryName, selectedFile);
        setConflictInfo(info);
        
        // Initialize custom edits for each conflict
        if (info) {
          const edits: Record<number, string> = {};
          info.conflicts.forEach((conflict, index) => {
            edits[index] = conflict.ours + '\n' + conflict.theirs;
          });
          setCustomEdits(edits);
        }
      }
    };
    
    loadConflictInfo();
  }, [selectedFile, repositoryName, onGetConflictInfo]);

  const handleResolveFile = async () => {
    if (!selectedFile || !conflictInfo) return;
    
    setIsResolving(true);
    try {
      if (resolutionMethod === 'custom') {
        // For custom resolution, we need to build a custom content string
        const lines = conflictInfo.content.split('\n');
        const newLines = [...lines];
        
        // Apply custom edits for each conflict, starting from the end to avoid index shifts
        for (let i = conflictInfo.conflicts.length - 1; i >= 0; i--) {
          const conflict = conflictInfo.conflicts[i];
          newLines.splice(
            conflict.marker.start,
            conflict.marker.end - conflict.marker.start + 1,
            customEdits[i] || ''
          );
        }
        
        await onResolveConflict(selectedFile, 'custom', newLines.join('\n'));
      } else {
        await onResolveConflict(selectedFile, resolutionMethod);
      }
      
      // Mark this file as resolved
      setResolvedFiles(prev => new Set([...prev, selectedFile]));
      
      // Select the next unresolved file if available
      const unresolvedFiles = conflictingFiles.filter(file => !resolvedFiles.has(file) && file !== selectedFile);
      if (unresolvedFiles.length > 0) {
        setSelectedFile(unresolvedFiles[0]);
      }
    } catch (error) {
      console.error('Error resolving conflict:', error);
    } finally {
      setIsResolving(false);
    }
  };

  const handleCompleteResolution = async () => {
    setIsCompleting(true);
    try {
      await onCompleteResolution(commitMessage);
      // After completion, we'll typically want to refresh the repository status
    } catch (error) {
      console.error('Error completing conflict resolution:', error);
    } finally {
      setIsCompleting(false);
    }
  };

  const handleCustomEditChange = (index: number, value: string) => {
    setCustomEdits(prev => ({
      ...prev,
      [index]: value
    }));
  };

  const allResolved = conflictingFiles.every(file => resolvedFiles.has(file));

  return (
    <Panel>
      <FileList>
        <h3>Conflicting Files</h3>
        {conflictingFiles.map(file => (
          <FileItem 
            key={file}
            isSelected={file === selectedFile}
            onClick={() => setSelectedFile(file)}
          >
            {resolvedFiles.has(file) ? (
              <ResolvedIcon>✓</ResolvedIcon>
            ) : (
              <ConflictIcon>!</ConflictIcon>
            )}
            {file}
          </FileItem>
        ))}
      </FileList>
      
      {selectedFile && conflictInfo ? (
        <ConflictContent>
          <ConflictHeader>
            <h3>Resolving conflicts in {selectedFile}</h3>
            <div>
              <label>
                <input 
                  type="radio" 
                  name="resolution" 
                  checked={resolutionMethod === 'ours'} 
                  onChange={() => setResolutionMethod('ours')} 
                />
                Use our changes
              </label>
              <label style={{ marginLeft: '16px' }}>
                <input 
                  type="radio" 
                  name="resolution" 
                  checked={resolutionMethod === 'theirs'} 
                  onChange={() => setResolutionMethod('theirs')} 
                />
                Use their changes
              </label>
              <label style={{ marginLeft: '16px' }}>
                <input 
                  type="radio" 
                  name="resolution" 
                  checked={resolutionMethod === 'custom'} 
                  onChange={() => setResolutionMethod('custom')} 
                />
                Custom resolution
              </label>
            </div>
          </ConflictHeader>
          
          {conflictInfo.conflicts.map((conflict, index) => (
            <ConflictBlock key={index}>
              <ConflictBlockHeader>Conflict #{index + 1}</ConflictBlockHeader>
              <DiffContainer>
                <div style={{ flex: 1 }}>
                  <DiffHeader>Your Changes</DiffHeader>
                  <DiffPanel side="ours">
                    {conflict.ours || '(No content)'}
                  </DiffPanel>
                </div>
                <div style={{ flex: 1 }}>
                  <DiffHeader>Their Changes</DiffHeader>
                  <DiffPanel side="theirs">
                    {conflict.theirs || '(No content)'}
                  </DiffPanel>
                </div>
              </DiffContainer>
              {resolutionMethod === 'custom' && (
                <>
                  <DiffHeader>Custom Resolution</DiffHeader>
                  <CustomEditor
                    value={customEdits[index] || ''}
                    onChange={(e) => handleCustomEditChange(index, e.target.value)}
                  />
                </>
              )}
            </ConflictBlock>
          ))}
          
          <ConflictActions>
            <Button onClick={onCancel}>Cancel</Button>
            <Button 
              primary 
              onClick={handleResolveFile}
              disabled={isResolving}
            >
              {isResolving ? 'Resolving...' : 'Resolve File'}
            </Button>
          </ConflictActions>
        </ConflictContent>
      ) : allResolved ? (
        <FullPanel>
          <h3>All conflicts resolved!</h3>
          <p>You've resolved all conflicting files. Complete the merge by committing your changes.</p>
          <CommitMessageInput
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
            placeholder="Enter commit message"
          />
          <ConflictActions>
            <Button onClick={onCancel}>Cancel</Button>
            <Button 
              primary 
              onClick={handleCompleteResolution}
              disabled={isCompleting || !commitMessage.trim()}
            >
              {isCompleting ? 'Completing...' : 'Complete Merge'}
            </Button>
          </ConflictActions>
        </FullPanel>
      ) : (
        <FullPanel>
          <h3>Select a file to resolve conflicts</h3>
          <p>Click on a file from the list on the left to start resolving conflicts.</p>
        </FullPanel>
      )}
    </Panel>
  );
};

export default ConflictResolutionPanel; 