import React, { useState } from 'react';
import styled from 'styled-components';
import GitStatusBar from './GitStatusBar';
import CommitHistoryPanel from './CommitHistoryPanel';
import BranchManager from './BranchManager';
import { BiGitBranch, BiHistory, BiCodeCurly } from 'react-icons/bi';
import { FileStatusInfo } from '../services/githubService';

interface VersionControlPanelProps {
  repositoryName: string;
  currentBranch: string;
  modifiedFiles: FileStatusInfo[];
  commitMessage: string;
  onCommitMessageChange: (message: string) => void;
  onStageFile: (filepath: string, staged: boolean) => void;
  onCommit: () => void;
  onPush: () => void;
  onPull: () => void;
  onBranchChange: (branchName: string) => void;
  isCommitting: boolean;
  isPushing: boolean;
  isPulling: boolean;
  visible: boolean;
  onClose: () => void;
}

const Panel = styled.div<{ visible: boolean }>`
  position: fixed;
  top: 0;
  right: 0;
  width: 400px;
  height: 100vh;
  background-color: ${props => props.theme.colors.background};
  border-left: 1px solid ${props => props.theme.colors.border};
  transform: translateX(${props => props.visible ? '0' : '100%'});
  transition: transform 0.3s ease;
  z-index: 100;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const PanelHeader = styled.div`
  padding: 16px;
  border-bottom: 1px solid ${props => props.theme.colors.border};
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Title = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: 500;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: ${props => props.theme.colors.textSecondary};
  
  &:hover {
    color: ${props => props.theme.colors.text};
  }
`;

const TabsContainer = styled.div`
  display: flex;
  border-bottom: 1px solid ${props => props.theme.colors.border};
`;

const Tab = styled.button<{ active: boolean }>`
  padding: 10px 16px;
  border: none;
  background: none;
  border-bottom: 2px solid ${props => props.active ? props.theme.colors.primary : 'transparent'};
  color: ${props => props.active ? props.theme.colors.primary : props.theme.colors.text};
  font-weight: ${props => props.active ? '500' : 'normal'};
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  
  &:hover {
    background-color: rgba(0, 0, 0, 0.05);
  }
`;

const TabIcon = styled.span`
  display: flex;
  align-items: center;
  font-size: 18px;
`;

const TabContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 16px;
`;

const RepoInfo = styled.div`
  display: flex;
  flex-direction: column;
`;

const RepoName = styled.span`
  font-weight: 500;
`;

const BranchName = styled.span`
  font-size: 12px;
  color: ${props => props.theme.colors.textSecondary};
`;

enum TabType {
  CHANGES = 'changes',
  HISTORY = 'history',
  BRANCHES = 'branches',
}

const VersionControlPanel: React.FC<VersionControlPanelProps> = ({
  repositoryName,
  currentBranch,
  modifiedFiles,
  commitMessage,
  onCommitMessageChange,
  onStageFile,
  onCommit,
  onPush,
  onPull,
  onBranchChange,
  isCommitting,
  isPushing,
  isPulling,
  visible,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>(TabType.CHANGES);

  const renderTabContent = () => {
    switch (activeTab) {
      case TabType.CHANGES:
        return (
          <GitStatusBar
            modifiedFiles={modifiedFiles}
            commitMessage={commitMessage}
            onCommitMessageChange={onCommitMessageChange}
            onStageFile={onStageFile}
            onCommit={onCommit}
            onPush={onPush}
            onPull={onPull}
            isCommitting={isCommitting}
            isPushing={isPushing}
            isPulling={isPulling}
            isEmbedded={true}
          />
        );
      case TabType.HISTORY:
        return (
          <CommitHistoryPanel
            repositoryName={repositoryName}
            currentBranch={currentBranch}
            onClose={() => {}} // No-op since we're handling closing at the panel level
          />
        );
      case TabType.BRANCHES:
        return (
          <BranchManager
            repositoryName={repositoryName}
            onBranchChange={onBranchChange}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Panel visible={visible}>
      <PanelHeader>
        <RepoInfo>
          <RepoName>{repositoryName}</RepoName>
          <BranchName>Branch: {currentBranch}</BranchName>
        </RepoInfo>
        <CloseButton onClick={onClose}>×</CloseButton>
      </PanelHeader>
      
      <TabsContainer>
        <Tab 
          active={activeTab === TabType.CHANGES} 
          onClick={() => setActiveTab(TabType.CHANGES)}
        >
          <TabIcon><BiCodeCurly /></TabIcon>
          Changes {modifiedFiles.length > 0 && `(${modifiedFiles.length})`}
        </Tab>
        <Tab 
          active={activeTab === TabType.HISTORY} 
          onClick={() => setActiveTab(TabType.HISTORY)}
        >
          <TabIcon><BiHistory /></TabIcon>
          History
        </Tab>
        <Tab 
          active={activeTab === TabType.BRANCHES} 
          onClick={() => setActiveTab(TabType.BRANCHES)}
        >
          <TabIcon><BiGitBranch /></TabIcon>
          Branches
        </Tab>
      </TabsContainer>
      
      <TabContent>
        {renderTabContent()}
      </TabContent>
    </Panel>
  );
};

export default VersionControlPanel; 