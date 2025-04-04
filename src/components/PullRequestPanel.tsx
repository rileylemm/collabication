import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useGitHub } from '../contexts/GitHubContext';
import { githubService, PullRequest, PullRequestComment } from '../services/githubService';
import { formatDistanceToNow } from 'date-fns';
import ReactMarkdown from 'react-markdown';

// View types for the panel
type PanelView = 'list' | 'create' | 'detail';

// Props for the component
interface PullRequestPanelProps {
  repositoryOwner: string;
  repositoryName: string;
  currentBranch: string;
}

// Styled components
const PanelContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: ${props => props.theme.colors.surface};
  border-radius: ${props => props.theme.borderRadius.medium};
  border: 1px solid ${props => props.theme.colors.border};
  overflow: hidden;
`;

const PanelHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background-color: ${props => props.theme.colors.surface};
  border-bottom: 1px solid ${props => props.theme.colors.border};
`;

const PanelTitle = styled.h2`
  margin: 0;
  font-size: 1.2rem;
  color: ${props => props.theme.colors.text};
`;

const PanelContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
`;

const PanelFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  padding: 1rem;
  border-top: 1px solid ${props => props.theme.colors.border};
  gap: 0.5rem;
`;

const Button = styled.button<{ $primary?: boolean; $danger?: boolean }>`
  padding: 0.5rem 1rem;
  background-color: ${props => props.$danger 
    ? props.theme.colors.error 
    : props.$primary 
      ? props.theme.colors.primary 
      : 'transparent'};
  color: ${props => props.$danger || props.$primary 
    ? 'white' 
    : props.theme.colors.primary};
  border: ${props => props.$danger || props.$primary 
    ? 'none' 
    : `1px solid ${props.theme.colors.primary}`};
  border-radius: ${props => props.theme.borderRadius.small};
  font-size: 0.9rem;
  cursor: pointer;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: ${props => props.$danger 
      ? props.theme.colors.error 
      : props.$primary 
        ? props.theme.colors.primary 
        : props.theme.colors.primary + '10'};
    opacity: 0.8;
  }
  
  &:disabled {
    background-color: ${props => props.theme.colors.disabledBackground};
    color: ${props => props.theme.colors.textTertiary};
    border-color: ${props => props.theme.colors.disabledBackground};
    cursor: not-allowed;
  }
`;

const FilterBar = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
`;

const FilterButton = styled.button<{ $active: boolean }>`
  padding: 0.25rem 0.75rem;
  background-color: ${props => props.$active 
    ? props.theme.colors.primary 
    : 'transparent'};
  color: ${props => props.$active 
    ? 'white' 
    : props.theme.colors.text};
  border: ${props => props.$active 
    ? 'none' 
    : `1px solid ${props.theme.colors.border}`};
  border-radius: ${props => props.theme.borderRadius.small};
  font-size: 0.9rem;
  cursor: pointer;
  
  &:hover {
    background-color: ${props => props.$active 
      ? props.theme.colors.primary 
      : props.theme.colors.background};
    opacity: ${props => props.$active ? 0.8 : 1};
  }
`;

const PullRequestList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const PullRequestItem = styled.div`
  padding: 1rem;
  background-color: ${props => props.theme.colors.background};
  border-radius: ${props => props.theme.borderRadius.medium};
  border: 1px solid ${props => props.theme.colors.border};
  cursor: pointer;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: ${props => props.theme.colors.background};
    opacity: 0.8;
  }
`;

const PullRequestTitle = styled.h3`
  margin: 0 0 0.5rem 0;
  font-size: 1.1rem;
  color: ${props => props.theme.colors.text};
`;

const PullRequestMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: ${props => props.theme.colors.textSecondary};
`;

const PullRequestAuthor = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
`;

const Avatar = styled.img`
  width: 20px;
  height: 20px;
  border-radius: 50%;
`;

const StatusBadge = styled.span<{ $status: 'open' | 'closed' | 'merged' }>`
  padding: 0.25rem 0.5rem;
  border-radius: ${props => props.theme.borderRadius.small};
  font-size: 0.7rem;
  text-transform: uppercase;
  font-weight: bold;
  
  background-color: ${props => 
    props.$status === 'open' ? props.theme.colors.success + '20' : 
    props.$status === 'closed' ? props.theme.colors.error + '20' : 
    props.theme.colors.primary + '20'};
  
  color: ${props => 
    props.$status === 'open' ? props.theme.colors.success : 
    props.$status === 'closed' ? props.theme.colors.error : 
    props.theme.colors.primary};
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  font-size: 0.9rem;
  color: ${props => props.theme.colors.textSecondary};
`;

const Input = styled.input`
  padding: 0.75rem;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.small};
  background-color: ${props => props.theme.colors.background};
  color: ${props => props.theme.colors.text};
  font-size: 0.9rem;
  
  &:focus {
    border-color: ${props => props.theme.colors.primary};
    outline: none;
  }
`;

const TextArea = styled.textarea`
  padding: 0.75rem;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.small};
  background-color: ${props => props.theme.colors.background};
  color: ${props => props.theme.colors.text};
  font-size: 0.9rem;
  min-height: 150px;
  resize: vertical;
  
  &:focus {
    border-color: ${props => props.theme.colors.primary};
    outline: none;
  }
`;

const Select = styled.select`
  padding: 0.75rem;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.small};
  background-color: ${props => props.theme.colors.background};
  color: ${props => props.theme.colors.text};
  font-size: 0.9rem;
  
  &:focus {
    border-color: ${props => props.theme.colors.primary};
    outline: none;
  }
`;

const ErrorMessage = styled.div`
  padding: 0.75rem;
  background-color: ${props => props.theme.colors.error}10;
  color: ${props => props.theme.colors.error};
  border-radius: ${props => props.theme.borderRadius.small};
  font-size: 0.9rem;
  margin-bottom: 1rem;
`;

const LoadingIndicator = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 2rem;
  color: ${props => props.theme.colors.textSecondary};
`;

const PullRequestDetailHeader = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid ${props => props.theme.colors.border};
`;

const PullRequestDetailTitle = styled.h2`
  margin: 0;
  font-size: 1.3rem;
  color: ${props => props.theme.colors.text};
`;

const PullRequestDescription = styled.div`
  margin-bottom: 1.5rem;
  padding: 1rem;
  background-color: ${props => props.theme.colors.background};
  border-radius: ${props => props.theme.borderRadius.medium};
  border: 1px solid ${props => props.theme.colors.border};
  color: ${props => props.theme.colors.text};
  font-size: 0.9rem;
`;

const PullRequestComments = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const CommentItem = styled.div`
  padding: 1rem;
  background-color: ${props => props.theme.colors.background};
  border-radius: ${props => props.theme.borderRadius.medium};
  border: 1px solid ${props => props.theme.colors.border};
`;

const CommentHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  font-size: 0.85rem;
  color: ${props => props.theme.colors.textSecondary};
`;

const CommentBody = styled.div`
  font-size: 0.9rem;
  color: ${props => props.theme.colors.text};
`;

const SectionTitle = styled.h3`
  margin: 1.5rem 0 0.5rem 0;
  font-size: 1rem;
  color: ${props => props.theme.colors.text};
`;

const FileList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
`;

const FileItem = styled.div`
  padding: 0.75rem;
  background-color: ${props => props.theme.colors.background};
  border-radius: ${props => props.theme.borderRadius.small};
  border: 1px solid ${props => props.theme.colors.border};
  font-size: 0.9rem;
  color: ${props => props.theme.colors.text};
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const FileChanges = styled.div`
  display: flex;
  gap: 0.5rem;
  font-size: 0.8rem;
`;

const Addition = styled.span`
  color: ${props => props.theme.colors.success};
`;

const Deletion = styled.span`
  color: ${props => props.theme.colors.error};
`;

// Main component
const PullRequestPanel: React.FC<PullRequestPanelProps> = ({
  repositoryOwner,
  repositoryName,
  currentBranch,
}) => {
  const { token, user } = useGitHub();
  const [view, setView] = useState<PanelView>('list');
  const [pullRequests, setPullRequests] = useState<PullRequest[]>([]);
  const [selectedPR, setSelectedPR] = useState<PullRequest | null>(null);
  const [prDetails, setPRDetails] = useState<PullRequest | null>(null);
  const [prFiles, setPRFiles] = useState<{ filename: string; status: string; additions: number; deletions: number }[]>([]);
  const [prComments, setPRComments] = useState<PullRequestComment[]>([]);
  const [branches, setBranches] = useState<string[]>([]);
  const [filterState, setFilterState] = useState<'open' | 'closed' | 'all'>('open');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form state for creating a PR
  const [prTitle, setPRTitle] = useState('');
  const [prBody, setPRBody] = useState('');
  const [headBranch, setHeadBranch] = useState(currentBranch);
  const [baseBranch, setBaseBranch] = useState('main');
  const [commentText, setCommentText] = useState('');
  
  // Load pull requests
  const loadPullRequests = async () => {
    if (!token) {
      setError('Not authenticated with GitHub');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const prs = await githubService.listPullRequests(
        repositoryOwner,
        repositoryName,
        filterState
      );
      
      setPullRequests(prs);
    } catch (err) {
      console.error('Error loading pull requests:', err);
      setError(`Failed to load pull requests: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Load branches
  const loadBranches = async () => {
    setIsLoading(true);
    
    try {
      const branchList = await githubService.listBranches(repositoryName);
      setBranches(branchList);
      setHeadBranch(currentBranch);
    } catch (err) {
      console.error('Error loading branches:', err);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Load PR details
  const loadPRDetails = async (prNumber: number) => {
    if (!token) {
      setError('Not authenticated with GitHub');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Get PR details
      const details = await githubService.getPullRequestDetails(
        repositoryOwner,
        repositoryName,
        prNumber
      );
      
      setPRDetails(details);
      
      // Get PR files
      const files = await githubService.getPullRequestFiles(
        repositoryOwner,
        repositoryName,
        prNumber
      );
      
      setPRFiles(files);
      
      // Get PR comments
      const comments = await githubService.listPullRequestComments(
        repositoryOwner,
        repositoryName,
        prNumber
      );
      
      setPRComments(comments);
      
    } catch (err) {
      console.error('Error loading PR details:', err);
      setError(`Failed to load PR details: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle create PR
  const handleCreatePR = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token || !user) {
      setError('Not authenticated with GitHub');
      return;
    }
    
    if (!prTitle.trim()) {
      setError('Title is required');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      await githubService.createPullRequest(
        repositoryOwner,
        repositoryName,
        prTitle,
        prBody,
        headBranch,
        baseBranch
      );
      
      // Reset form and go back to list view
      setPRTitle('');
      setPRBody('');
      setView('list');
      loadPullRequests();
    } catch (err) {
      console.error('Error creating pull request:', err);
      setError(`Failed to create pull request: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle add comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token || !selectedPR) {
      return;
    }
    
    if (!commentText.trim()) {
      setError('Comment cannot be empty');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      await githubService.addPullRequestComment(
        repositoryOwner,
        repositoryName,
        selectedPR.number,
        commentText
      );
      
      // Reset form and reload comments
      setCommentText('');
      loadPRDetails(selectedPR.number);
    } catch (err) {
      console.error('Error adding comment:', err);
      setError(`Failed to add comment: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle merge PR
  const handleMergePR = async () => {
    if (!token || !selectedPR) {
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      await githubService.mergePullRequest(
        repositoryOwner,
        repositoryName,
        selectedPR.number
      );
      
      // Go back to list view and reload PRs
      setView('list');
      loadPullRequests();
    } catch (err) {
      console.error('Error merging pull request:', err);
      setError(`Failed to merge pull request: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle close PR
  const handleClosePR = async () => {
    if (!token || !selectedPR) {
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      await githubService.updatePullRequest(
        repositoryOwner,
        repositoryName,
        selectedPR.number,
        undefined,
        undefined,
        'closed'
      );
      
      // Go back to list view and reload PRs
      setView('list');
      loadPullRequests();
    } catch (err) {
      console.error('Error closing pull request:', err);
      setError(`Failed to close pull request: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Load PRs on first render and filter change
  useEffect(() => {
    if (token) {
      loadPullRequests();
    }
  }, [filterState, token, repositoryOwner, repositoryName]);
  
  // Load branches when entering create view
  useEffect(() => {
    if (view === 'create' && token) {
      loadBranches();
    }
  }, [view, token, repositoryName]);
  
  // Render list view
  const renderListView = () => (
    <>
      <FilterBar>
        <FilterButton 
          $active={filterState === 'open'} 
          onClick={() => setFilterState('open')}
        >
          Open
        </FilterButton>
        <FilterButton 
          $active={filterState === 'closed'} 
          onClick={() => setFilterState('closed')}
        >
          Closed
        </FilterButton>
        <FilterButton 
          $active={filterState === 'all'} 
          onClick={() => setFilterState('all')}
        >
          All
        </FilterButton>
      </FilterBar>
      
      {isLoading ? (
        <LoadingIndicator>Loading pull requests...</LoadingIndicator>
      ) : pullRequests.length === 0 ? (
        <div>No pull requests found</div>
      ) : (
        <PullRequestList>
          {pullRequests.map(pr => (
            <PullRequestItem 
              key={pr.id} 
              onClick={() => {
                setSelectedPR(pr);
                loadPRDetails(pr.number);
                setView('detail');
              }}
            >
              <PullRequestTitle>
                #{pr.number} {pr.title}
              </PullRequestTitle>
              <PullRequestMeta>
                <StatusBadge $status={pr.state}>{pr.state}</StatusBadge>
                <PullRequestAuthor>
                  <Avatar src={pr.user.avatar_url} alt={pr.user.login} />
                  <span>{pr.user.login}</span>
                </PullRequestAuthor>
                <span>
                  {pr.state === 'open' 
                    ? `Opened ${formatDistanceToNow(new Date(pr.created_at))} ago` 
                    : `${pr.state === 'merged' ? 'Merged' : 'Closed'} ${formatDistanceToNow(new Date(pr.updated_at))} ago`
                  }
                </span>
              </PullRequestMeta>
            </PullRequestItem>
          ))}
        </PullRequestList>
      )}
    </>
  );
  
  // Render create view
  const renderCreateView = () => (
    <Form onSubmit={handleCreatePR}>
      <FormGroup>
        <Label htmlFor="pr-title">Title</Label>
        <Input 
          id="pr-title"
          value={prTitle}
          onChange={e => setPRTitle(e.target.value)}
          placeholder="Enter a title for your pull request"
          required
        />
      </FormGroup>
      
      <FormGroup>
        <Label htmlFor="pr-body">Description</Label>
        <TextArea 
          id="pr-body"
          value={prBody}
          onChange={e => setPRBody(e.target.value)}
          placeholder="Describe the changes in this pull request"
        />
      </FormGroup>
      
      <FormGroup>
        <Label htmlFor="head-branch">Source Branch</Label>
        <Select 
          id="head-branch"
          value={headBranch}
          onChange={e => setHeadBranch(e.target.value)}
        >
          {branches.map(branch => (
            <option key={branch} value={branch}>{branch}</option>
          ))}
        </Select>
      </FormGroup>
      
      <FormGroup>
        <Label htmlFor="base-branch">Target Branch</Label>
        <Select 
          id="base-branch"
          value={baseBranch}
          onChange={e => setBaseBranch(e.target.value)}
        >
          {branches.map(branch => (
            <option key={branch} value={branch}>{branch}</option>
          ))}
        </Select>
      </FormGroup>
      
      <Button type="submit" $primary disabled={isLoading}>
        {isLoading ? 'Creating...' : 'Create Pull Request'}
      </Button>
    </Form>
  );
  
  // Render detail view
  const renderDetailView = () => {
    if (!prDetails) {
      return <LoadingIndicator>Loading pull request details...</LoadingIndicator>;
    }
    
    return (
      <>
        <PullRequestDetailHeader>
          <PullRequestDetailTitle>
            #{prDetails.number} {prDetails.title}
          </PullRequestDetailTitle>
          <PullRequestMeta>
            <StatusBadge $status={prDetails.state}>{prDetails.state}</StatusBadge>
            <PullRequestAuthor>
              <Avatar src={prDetails.user.avatar_url} alt={prDetails.user.login} />
              <span>{prDetails.user.login}</span>
            </PullRequestAuthor>
            <span>
              {prDetails.state === 'open' 
                ? `Opened ${formatDistanceToNow(new Date(prDetails.created_at))} ago` 
                : `${prDetails.state === 'merged' ? 'Merged' : 'Closed'} ${formatDistanceToNow(new Date(prDetails.updated_at))} ago`
              }
            </span>
          </PullRequestMeta>
        </PullRequestDetailHeader>
        
        {prDetails.body && (
          <PullRequestDescription>
            <ReactMarkdown>{prDetails.body}</ReactMarkdown>
          </PullRequestDescription>
        )}
        
        <SectionTitle>Files Changed ({prFiles.length})</SectionTitle>
        <FileList>
          {prFiles.map(file => (
            <FileItem key={file.filename}>
              <span>{file.filename}</span>
              <FileChanges>
                <Addition>+{file.additions}</Addition>
                <Deletion>-{file.deletions}</Deletion>
              </FileChanges>
            </FileItem>
          ))}
        </FileList>
        
        <SectionTitle>Comments ({prComments.length})</SectionTitle>
        <PullRequestComments>
          {prComments.map(comment => (
            <CommentItem key={comment.id}>
              <CommentHeader>
                <Avatar src={comment.user.avatar_url} alt={comment.user.login} />
                <span>{comment.user.login}</span>
                <span>
                  {formatDistanceToNow(new Date(comment.created_at))} ago
                </span>
              </CommentHeader>
              <CommentBody>
                <ReactMarkdown>{comment.body}</ReactMarkdown>
              </CommentBody>
            </CommentItem>
          ))}
        </PullRequestComments>
        
        {prDetails.state === 'open' && (
          <>
            <SectionTitle>Add a Comment</SectionTitle>
            <Form onSubmit={handleAddComment}>
              <FormGroup>
                <TextArea 
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  placeholder="Leave a comment"
                />
              </FormGroup>
              <Button type="submit" $primary disabled={isLoading || !commentText.trim()}>
                {isLoading ? 'Submitting...' : 'Submit Comment'}
              </Button>
            </Form>
          </>
        )}
      </>
    );
  };
  
  return (
    <PanelContainer>
      <PanelHeader>
        <PanelTitle>
          {view === 'list' && 'Pull Requests'}
          {view === 'create' && 'Create Pull Request'}
          {view === 'detail' && selectedPR && `Pull Request #${selectedPR.number}`}
        </PanelTitle>
        {view === 'list' && (
          <Button onClick={() => setView('create')}>New Pull Request</Button>
        )}
        {(view === 'create' || view === 'detail') && (
          <Button onClick={() => setView('list')}>Back to List</Button>
        )}
      </PanelHeader>
      
      <PanelContent>
        {error && <ErrorMessage>{error}</ErrorMessage>}
        
        {view === 'list' && renderListView()}
        {view === 'create' && renderCreateView()}
        {view === 'detail' && renderDetailView()}
      </PanelContent>
      
      {view === 'detail' && selectedPR && selectedPR.state === 'open' && (
        <PanelFooter>
          <Button onClick={handleClosePR} $danger disabled={isLoading}>
            Close PR
          </Button>
          <Button 
            onClick={handleMergePR} 
            $primary 
            disabled={isLoading || selectedPR.mergeable === false}
          >
            Merge PR
          </Button>
        </PanelFooter>
      )}
    </PanelContainer>
  );
};

export default PullRequestPanel; 