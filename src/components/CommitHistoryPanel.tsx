import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { format } from 'date-fns';
import { BiGitCompare, BiGitCommit, BiDetail, BiChevronDown, BiChevronRight } from 'react-icons/bi';
import { githubService, CommitInfo } from '../services/githubService';
import DiffViewer from './DiffViewer';

interface CommitHistoryPanelProps {
  repositoryName: string;
  currentBranch?: string;
  onClose?: () => void;
}

const CommitHistoryPanel: React.FC<CommitHistoryPanelProps> = ({
  repositoryName,
  currentBranch = 'main',
  onClose
}) => {
  const [commits, setCommits] = useState<CommitInfo[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [expandedCommit, setExpandedCommit] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState<boolean>(false);
  const [selectedCommits, setSelectedCommits] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileDiff, setFileDiff] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Load commit history when component mounts or repository/branch changes
  useEffect(() => {
    if (repositoryName) {
      loadCommitHistory();
    }
  }, [repositoryName, currentBranch]);

  // Load the repository's commit history
  const loadCommitHistory = async () => {
    if (!repositoryName) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const commitHistory = await githubService.getCommitHistory(
        repositoryName,
        currentBranch,
        30 // Load up to 30 commits
      );
      
      setCommits(commitHistory);
    } catch (error) {
      console.error('Error loading commit history:', error);
      setError('Failed to load commit history. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle expanded state for a commit
  const toggleCommitExpanded = (commitId: string) => {
    if (expandedCommit === commitId) {
      setExpandedCommit(null);
    } else {
      setExpandedCommit(commitId);
    }
    
    // Reset selected file when toggling commits
    setSelectedFile(null);
    setFileDiff(null);
  };

  // Toggle commit selection for comparison
  const toggleCommitSelected = (commitId: string) => {
    if (selectedCommits.includes(commitId)) {
      setSelectedCommits(selectedCommits.filter(id => id !== commitId));
    } else {
      // Only allow selecting up to 2 commits for comparison
      if (selectedCommits.length < 2) {
        setSelectedCommits([...selectedCommits, commitId]);
      } else {
        // Replace the oldest selected commit
        setSelectedCommits([selectedCommits[1], commitId]);
      }
    }
    
    // Reset selected file when changing selection
    setSelectedFile(null);
    setFileDiff(null);
  };

  // Toggle comparison mode
  const toggleCompareMode = () => {
    setCompareMode(!compareMode);
    
    // Clear selections when toggling mode
    setSelectedCommits([]);
    setSelectedFile(null);
    setFileDiff(null);
  };

  // Format timestamp to readable date
  const formatDate = (timestamp: number) => {
    return format(new Date(timestamp * 1000), 'MMM dd, yyyy HH:mm');
  };

  // Get files changed in a commit
  const getUniqueFiles = () => {
    if (compareMode && selectedCommits.length === 2) {
      // In compare mode, get common files between two commits
      const commit1 = commits.find(c => c.oid === selectedCommits[0]);
      const commit2 = commits.find(c => c.oid === selectedCommits[1]);
      
      if (commit1?.files && commit2?.files) {
        // Get files that appear in either commit
        return [...new Set([...commit1.files, ...commit2.files])].sort();
      }
      
      return [];
    } else if (expandedCommit) {
      // In single commit view, get files for the expanded commit
      const commit = commits.find(c => c.oid === expandedCommit);
      return commit?.files || [];
    }
    
    return [];
  };

  // Load diff for a file between two commits
  const loadFileDiff = async (filepath: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (compareMode && selectedCommits.length === 2) {
        // Compare the file between two selected commits
        const diff = await githubService.getCommitDiff(
          repositoryName,
          filepath,
          selectedCommits[0],
          selectedCommits[1]
        );
        
        setFileDiff(diff);
        setSelectedFile(filepath);
      } else if (expandedCommit) {
        // Compare the file between the commit and its parent
        const commit = commits.find(c => c.oid === expandedCommit);
        
        if (commit && commit.parentSHA) {
          const diff = await githubService.getCommitDiff(
            repositoryName,
            filepath,
            commit.parentSHA,
            expandedCommit
          );
          
          setFileDiff(diff);
          setSelectedFile(filepath);
        } else {
          setError('Cannot get diff for this commit (no parent commit found)');
        }
      }
    } catch (error) {
      console.error('Error loading file diff:', error);
      setError('Failed to load file diff. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container>
      <Header>
        <h2>Commit History</h2>
        {onClose && (
          <CloseButton onClick={onClose}>×</CloseButton>
        )}
      </Header>
      
      <ToolBar>
        <RefreshButton onClick={loadCommitHistory} disabled={isLoading}>
          {isLoading ? 'Loading...' : 'Refresh'}
        </RefreshButton>
        
        <CompareButton 
          onClick={toggleCompareMode}
          active={compareMode}
        >
          <BiGitCompare size={16} />
          {compareMode ? 'Exit Compare' : 'Compare Commits'}
        </CompareButton>
        
        {compareMode && selectedCommits.length === 2 && (
          <CompareInfo>
            Comparing {selectedCommits.length}/2 commits
          </CompareInfo>
        )}
      </ToolBar>
      
      {error && (
        <ErrorMessage>{error}</ErrorMessage>
      )}
      
      <ContentContainer>
        <CommitsList>
          {commits.map((commit) => (
            <CommitItem key={commit.oid}>
              <CommitHeader>
                {compareMode ? (
                  <CommitCheckbox
                    type="checkbox"
                    checked={selectedCommits.includes(commit.oid)}
                    onChange={() => toggleCommitSelected(commit.oid)}
                  />
                ) : (
                  <ExpandButton onClick={() => toggleCommitExpanded(commit.oid)}>
                    {expandedCommit === commit.oid ? <BiChevronDown /> : <BiChevronRight />}
                  </ExpandButton>
                )}
                
                <CommitIcon>
                  <BiGitCommit />
                </CommitIcon>
                
                <CommitDetails>
                  <CommitMessage title={commit.message}>
                    {commit.message.split('\n')[0]}
                  </CommitMessage>
                  
                  <CommitMeta>
                    <CommitAuthor>{commit.author.name}</CommitAuthor>
                    <CommitDate>{formatDate(commit.author.timestamp)}</CommitDate>
                  </CommitMeta>
                </CommitDetails>
                
                <CommitSha title={commit.oid}>
                  {commit.oid.substring(0, 7)}
                </CommitSha>
              </CommitHeader>
              
              {expandedCommit === commit.oid && !compareMode && (
                <CommitExpandedInfo>
                  <CommitDescription>
                    {commit.message.split('\n').slice(1).join('\n')}
                  </CommitDescription>
                  
                  <FilesSection>
                    <FilesHeader>
                      Files changed ({commit.files?.length || 0})
                    </FilesHeader>
                    
                    <FilesList>
                      {commit.files?.map((file) => (
                        <FileItem 
                          key={file}
                          onClick={() => loadFileDiff(file)}
                          selected={selectedFile === file}
                        >
                          {file}
                        </FileItem>
                      ))}
                    </FilesList>
                  </FilesSection>
                </CommitExpandedInfo>
              )}
            </CommitItem>
          ))}
          
          {commits.length === 0 && !isLoading && (
            <EmptyState>No commits found in this repository.</EmptyState>
          )}
          
          {isLoading && commits.length === 0 && (
            <LoadingState>Loading commit history...</LoadingState>
          )}
        </CommitsList>
        
        {(compareMode && selectedCommits.length === 2) && (
          <FileCompareSection>
            <FilesHeader>
              Files in Selected Commits
            </FilesHeader>
            
            <FilesList>
              {getUniqueFiles().map((file) => (
                <FileItem 
                  key={file}
                  onClick={() => loadFileDiff(file)}
                  selected={selectedFile === file}
                >
                  {file}
                </FileItem>
              ))}
            </FilesList>
          </FileCompareSection>
        )}
        
        {fileDiff && (
          <DiffContainer>
            <DiffHeader>
              <DiffTitle>{selectedFile}</DiffTitle>
            </DiffHeader>
            
            <DiffContent>
              <DiffViewer 
                diff={fileDiff}
                title={selectedFile || undefined}
                showLineNumbers={true}
                viewMode="split"
              />
            </DiffContent>
          </DiffContainer>
        )}
      </ContentContainer>
    </Container>
  );
};

// Styled Components
const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
  background-color: ${props => props.theme.colors.background};
  border-left: 1px solid ${props => props.theme.colors.border};
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background-color: ${props => props.theme.colors.surface};
  border-bottom: 1px solid ${props => props.theme.colors.border};
  
  h2 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 500;
    color: ${props => props.theme.colors.text};
  }
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 1.5rem;
  color: ${props => props.theme.colors.textSecondary};
  cursor: pointer;
  
  &:hover {
    color: ${props => props.theme.colors.text};
  }
`;

const ToolBar = styled.div`
  display: flex;
  align-items: center;
  padding: 0.5rem 1rem;
  border-bottom: 1px solid ${props => props.theme.colors.border};
  background-color: ${props => props.theme.colors.surface};
`;

const RefreshButton = styled.button`
  background: ${props => props.theme.colors.background};
  border: 1px solid ${props => props.theme.colors.border};
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  color: ${props => props.theme.colors.text};
  cursor: pointer;
  font-size: 0.875rem;
  
  &:hover {
    background: ${props => props.theme.colors.hoverBackground};
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const CompareButton = styled.button<{ active: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: ${props => props.active ? props.theme.colors.primary + '20' : props.theme.colors.background};
  border: 1px solid ${props => props.active ? props.theme.colors.primary : props.theme.colors.border};
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  color: ${props => props.active ? props.theme.colors.primary : props.theme.colors.text};
  cursor: pointer;
  font-size: 0.875rem;
  margin-left: 0.5rem;
  
  &:hover {
    background: ${props => props.active ? props.theme.colors.primary + '30' : props.theme.colors.hoverBackground};
  }
`;

const CompareInfo = styled.div`
  margin-left: 0.5rem;
  font-size: 0.875rem;
  color: ${props => props.theme.colors.textSecondary};
`;

const ContentContainer = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
  
  @media (min-width: 768px) {
    flex-direction: row;
  }
`;

const CommitsList = styled.div`
  flex: 0 0 100%;
  padding: 0.5rem 0;
  overflow-y: auto;
  
  @media (min-width: 768px) {
    flex: 0 0 350px;
    border-right: 1px solid ${props => props.theme.colors.border};
  }
`;

const CommitItem = styled.div`
  margin: 0.25rem 0;
  border-bottom: 1px solid ${props => props.theme.colors.border};
  
  &:last-child {
    border-bottom: none;
  }
`;

const CommitHeader = styled.div`
  display: flex;
  align-items: center;
  padding: 0.5rem 1rem;
  cursor: pointer;
  
  &:hover {
    background-color: ${props => props.theme.colors.hoverBackground};
  }
`;

const ExpandButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  color: ${props => props.theme.colors.textSecondary};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  margin-right: 0.5rem;
`;

const CommitCheckbox = styled.input`
  margin-right: 0.5rem;
`;

const CommitIcon = styled.div`
  display: flex;
  color: ${props => props.theme.colors.primary};
  font-size: 1.25rem;
  margin-right: 0.5rem;
`;

const CommitDetails = styled.div`
  flex: 1;
  min-width: 0;
`;

const CommitMessage = styled.div`
  font-weight: 500;
  color: ${props => props.theme.colors.text};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const CommitMeta = styled.div`
  display: flex;
  font-size: 0.75rem;
  color: ${props => props.theme.colors.textSecondary};
`;

const CommitAuthor = styled.div`
  margin-right: 0.5rem;
`;

const CommitDate = styled.div`
  white-space: nowrap;
`;

const CommitSha = styled.div`
  font-family: monospace;
  color: ${props => props.theme.colors.textSecondary};
  font-size: 0.75rem;
  padding: 0.125rem 0.25rem;
  background-color: ${props => props.theme.colors.surface};
  border-radius: 4px;
  margin-left: 0.5rem;
`;

const CommitExpandedInfo = styled.div`
  padding: 0.5rem 1rem 1rem;
  background-color: ${props => props.theme.colors.surface};
  font-size: 0.875rem;
`;

const CommitDescription = styled.div`
  margin-bottom: 1rem;
  white-space: pre-wrap;
  color: ${props => props.theme.colors.text};
`;

const FilesSection = styled.div`
  margin-top: 0.5rem;
`;

const FileCompareSection = styled.div`
  flex: 0 0 250px;
  border-right: 1px solid ${props => props.theme.colors.border};
  overflow-y: auto;
  
  @media (max-width: 767px) {
    display: none;
  }
`;

const FilesHeader = styled.div`
  font-weight: 500;
  margin-bottom: 0.5rem;
  padding: 0.5rem 1rem;
  border-bottom: 1px solid ${props => props.theme.colors.border};
  color: ${props => props.theme.colors.text};
`;

const FilesList = styled.div`
  padding: 0 0.5rem;
`;

const FileItem = styled.div<{ selected?: boolean }>`
  padding: 0.25rem 0.5rem;
  cursor: pointer;
  border-radius: 4px;
  margin-bottom: 0.25rem;
  font-family: monospace;
  font-size: 0.75rem;
  background-color: ${props => props.selected ? props.theme.colors.primary + '20' : 'transparent'};
  color: ${props => props.selected ? props.theme.colors.primary : props.theme.colors.textSecondary};
  
  &:hover {
    background-color: ${props => props.selected ? props.theme.colors.primary + '30' : props.theme.colors.hoverBackground};
  }
`;

const DiffContainer = styled.div`
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  
  @media (max-width: 767px) {
    display: none;
  }
`;

const DiffHeader = styled.div`
  padding: 0.5rem 1rem;
  background-color: ${props => props.theme.colors.surface};
  border-bottom: 1px solid ${props => props.theme.colors.border};
  font-weight: 500;
`;

const DiffTitle = styled.div`
  font-family: monospace;
  color: ${props => props.theme.colors.text};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const DiffContent = styled.div`
  flex: 1;
  overflow: auto;
  padding: 1rem;
`;

const ErrorMessage = styled.div`
  padding: 0.75rem 1rem;
  color: ${props => props.theme.colors.error};
  background-color: ${props => props.theme.colors.error}10;
  border-bottom: 1px solid ${props => props.theme.colors.error}30;
`;

const EmptyState = styled.div`
  padding: 2rem 1rem;
  text-align: center;
  color: ${props => props.theme.colors.textSecondary};
`;

const LoadingState = styled.div`
  padding: 2rem 1rem;
  text-align: center;
  color: ${props => props.theme.colors.textSecondary};
`;

export default CommitHistoryPanel; 