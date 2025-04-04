import React, { useState } from 'react';
import styled from 'styled-components';
import { FileStatusInfo } from '../services/githubService';

interface GitStatusBarProps {
  modifiedFiles: FileStatusInfo[];
  commitMessage: string;
  onCommitMessageChange: (message: string) => void;
  onStageFile: (filepath: string, staged: boolean) => void;
  onCommit: () => void;
  onPush: () => void;
  onPull: () => void;
  isCommitting: boolean;
  isPushing: boolean;
  isPulling: boolean;
}

const StatusBarContainer = styled.div`
  border-top: 1px solid ${props => props.theme.colors.border};
  background-color: ${props => props.theme.colors.surface};
  padding: 8px;
`;

const FlexContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
`;

const ButtonGroup = styled.div`
  display: flex;
  align-items: center;
`;

const Button = styled.button<{ primary?: boolean; loading?: boolean }>`
  padding: 6px 12px;
  margin-right: 8px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: ${props => props.loading ? 'not-allowed' : 'pointer'};
  background-color: ${props => props.primary ? props.theme.colors.primary : '#f0f0f0'};
  color: ${props => props.primary ? 'white' : 'inherit'};
  border: none;
  opacity: ${props => props.loading ? 0.7 : 1};
  position: relative;
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  &:last-child {
    margin-right: 0;
  }
`;

const Input = styled.input`
  padding: 6px 10px;
  border-radius: 4px;
  border: 1px solid #e2e8f0;
  margin-right: 8px;
  font-size: 14px;
  width: 300px;
`;

const FileItem = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 4px 8px;
  border-radius: 4px;
  &:hover {
    background-color: rgba(0, 0, 0, 0.05);
  }
`;

const FlexRow = styled.div`
  display: flex;
  align-items: center;
`;

const Text = styled.span<{ bold?: boolean; small?: boolean; muted?: boolean }>`
  font-weight: ${props => props.bold ? 'bold' : 'normal'};
  font-size: ${props => props.small ? '12px' : '14px'};
  color: ${props => props.muted ? '#718096' : 'inherit'};
  margin-left: ${props => props.muted ? '16px' : '0'};
`;

const StatusIndicator = styled.span<{ status: string }>`
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 8px;
  background-color: ${props => {
    switch (props.status) {
      case 'modified':
        return '#F9A825'; // Yellow for modified
      case 'added':
        return '#4CAF50'; // Green for added
      case 'deleted':
        return '#F44336'; // Red for deleted
      case 'untracked':
        return '#9E9E9E'; // Gray for untracked
      default:
        return 'transparent';
    }
  }};
`;

const CollapsibleSection = styled.div<{ isOpen: boolean }>`
  display: ${props => props.isOpen ? 'block' : 'none'};
  margin-top: 8px;
  margin-bottom: 8px;
`;

const Divider = styled.hr`
  margin: 8px 0;
  border: 0;
  border-top: 1px solid #e2e8f0;
`;

const CheckboxContainer = styled.label`
  display: flex;
  align-items: center;
  cursor: pointer;
`;

const CheckboxInput = styled.input`
  margin-right: 6px;
`;

const Checkbox = ({ isChecked, onChange, children }: { 
  isChecked: boolean; 
  onChange: () => void; 
  children?: React.ReactNode 
}) => (
  <CheckboxContainer>
    <CheckboxInput type="checkbox" checked={isChecked} onChange={onChange} />
    {children}
  </CheckboxContainer>
);

const GitStatusBar: React.FC<GitStatusBarProps> = ({
  modifiedFiles,
  commitMessage,
  onCommitMessageChange,
  onStageFile,
  onCommit,
  onPush,
  onPull,
  isCommitting,
  isPushing,
  isPulling,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [allStaged, setAllStaged] = useState(false);

  const handleToggleAllStaged = () => {
    const newState = !allStaged;
    setAllStaged(newState);
    modifiedFiles.forEach(file => {
      onStageFile(file.path, newState);
    });
  };

  const toggleOpen = () => {
    setIsOpen(!isOpen);
  };

  const stagedFiles = modifiedFiles.filter(file => file.staged);
  const unstagedFiles = modifiedFiles.filter(file => !file.staged);

  return (
    <StatusBarContainer>
      <FlexContainer>
        <ButtonGroup>
          <Button onClick={toggleOpen}>
            {isOpen ? 'Hide Changes' : `${modifiedFiles.length} Changed Files`}
          </Button>
        </ButtonGroup>
        <ButtonGroup>
          <Input
            placeholder="Commit message"
            value={commitMessage}
            onChange={(e) => onCommitMessageChange(e.target.value)}
          />
          <Button
            primary
            disabled={stagedFiles.length === 0 || !commitMessage.trim()}
            loading={isCommitting}
            onClick={onCommit}
          >
            Commit
          </Button>
          <Button
            primary
            loading={isPushing}
            onClick={onPush}
          >
            Push
          </Button>
          <Button
            primary
            loading={isPulling}
            onClick={onPull}
          >
            Pull
          </Button>
        </ButtonGroup>
      </FlexContainer>

      <CollapsibleSection isOpen={isOpen}>
        <div>
          <FlexContainer>
            <Text bold>Staged Changes</Text>
            <Checkbox isChecked={allStaged} onChange={handleToggleAllStaged}>
              Stage All
            </Checkbox>
          </FlexContainer>
          
          {stagedFiles.length > 0 ? (
            stagedFiles.map(file => (
              <FileItem key={file.path}>
                <FlexRow>
                  <StatusIndicator status={file.status} />
                  <Text>{file.path}</Text>
                </FlexRow>
                <Checkbox
                  isChecked={true}
                  onChange={() => onStageFile(file.path, false)}
                />
              </FileItem>
            ))
          ) : (
            <Text small muted>No staged changes</Text>
          )}

          <Divider />
          
          <Text bold>Unstaged Changes</Text>
          {unstagedFiles.length > 0 ? (
            unstagedFiles.map(file => (
              <FileItem key={file.path}>
                <FlexRow>
                  <StatusIndicator status={file.status} />
                  <Text>{file.path}</Text>
                </FlexRow>
                <Checkbox
                  isChecked={false}
                  onChange={() => onStageFile(file.path, true)}
                />
              </FileItem>
            ))
          ) : (
            <Text small muted>No unstaged changes</Text>
          )}
        </div>
      </CollapsibleSection>
    </StatusBarContainer>
  );
};

export default GitStatusBar; 