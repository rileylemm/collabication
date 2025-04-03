import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useGitHub, Repository } from '../contexts/GitHubContext';
import { githubService } from '../services/githubService';

// Styled components for GitHub page
const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: calc(100vh - 60px);
  padding: 1rem;
  background-color: ${props => props.theme.colors.background};
`;

const Header = styled.div`
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  font-size: 1.8rem;
  color: ${props => props.theme.colors.text};
  margin: 0 0 0.5rem 0;
`;

const Description = styled.p`
  font-size: 0.95rem;
  color: ${props => props.theme.colors.textSecondary};
  margin: 0;
`;

const AuthSection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin: 2rem 0;
  padding: 2rem;
  background-color: ${props => props.theme.colors.surface};
  border-radius: ${props => props.theme.borderRadius.medium};
  border: 1px solid ${props => props.theme.colors.border};
`;

const GitHubButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background-color: #24292e;
  color: white;
  border: none;
  border-radius: ${props => props.theme.borderRadius.medium};
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: #2c3137;
  }
  
  &:disabled {
    background-color: #6a737d;
    cursor: not-allowed;
  }
`;

const GitHubIcon = styled.div`
  font-size: 1.5rem;
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

const UserAvatar = styled.img`
  width: 60px;
  height: 60px;
  border-radius: 50%;
  border: 2px solid ${props => props.theme.colors.primary};
`;

const UserDetails = styled.div`
  display: flex;
  flex-direction: column;
`;

const UserName = styled.h3`
  margin: 0;
  font-size: 1.2rem;
  color: ${props => props.theme.colors.text};
`;

const UserLogin = styled.span`
  font-size: 0.9rem;
  color: ${props => props.theme.colors.textSecondary};
`;

const RepositoriesSection = styled.div`
  flex: 1;
  overflow-y: auto;
`;

const RepositoryList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const RepositoryItem = styled.div`
  display: flex;
  flex-direction: column;
  padding: 1rem;
  background-color: ${props => props.theme.colors.surface};
  border-radius: ${props => props.theme.borderRadius.medium};
  border: 1px solid ${props => props.theme.colors.border};
`;

const RepositoryHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
`;

const RepositoryName = styled.h3`
  margin: 0;
  font-size: 1.1rem;
  color: ${props => props.theme.colors.text};
`;

const RepositoryPrivate = styled.span`
  padding: 0.25rem 0.5rem;
  background-color: ${props => props.theme.colors.primary}20;
  color: ${props => props.theme.colors.primary};
  border-radius: ${props => props.theme.borderRadius.small};
  font-size: 0.7rem;
  text-transform: uppercase;
`;

const RepositoryDescription = styled.p`
  margin: 0 0 1rem 0;
  font-size: 0.9rem;
  color: ${props => props.theme.colors.textSecondary};
`;

const RepositoryActions = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const RepositoryButton = styled.button`
  padding: 0.5rem 1rem;
  background-color: ${props => props.theme.colors.primary};
  color: white;
  border: none;
  border-radius: ${props => props.theme.borderRadius.small};
  font-size: 0.9rem;
  cursor: pointer;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: ${props => props.theme.colors.primaryDark};
  }
  
  &:disabled {
    background-color: ${props => props.theme.colors.disabledBackground};
    color: ${props => props.theme.colors.textTertiary};
    cursor: not-allowed;
  }
`;

const SecondaryButton = styled(RepositoryButton)`
  background-color: transparent;
  color: ${props => props.theme.colors.primary};
  border: 1px solid ${props => props.theme.colors.primary};
  
  &:hover {
    background-color: ${props => props.theme.colors.primary}10;
  }
`;

const LoadingIndicator = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  font-size: 1rem;
  color: ${props => props.theme.colors.textSecondary};
`;

const ErrorMessage = styled.div`
  padding: 1rem;
  background-color: ${props => props.theme.colors.error}10;
  color: ${props => props.theme.colors.error};
  border-radius: ${props => props.theme.borderRadius.medium};
  margin-bottom: 1.5rem;
  font-size: 0.9rem;
`;

const RefreshButton = styled.button`
  background-color: transparent;
  border: none;
  color: ${props => props.theme.colors.primary};
  padding: 0.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.9rem;
  
  &:hover {
    text-decoration: underline;
  }
`;

const GitHubPage: React.FC = () => {
  const { 
    isAuthenticated, 
    isLoading, 
    user, 
    token,
    repositories, 
    error,
    login, 
    logout, 
    fetchRepositories,
    clearError
  } = useGitHub();
  
  const [clonedRepos, setClonedRepos] = useState<string[]>([]);
  const [activeCloning, setActiveCloning] = useState<string | null>(null);
  const [cloneError, setCloneError] = useState<string | null>(null);
  
  const navigate = useNavigate();
  
  useEffect(() => {
    if (isAuthenticated && repositories.length === 0) {
      fetchRepositories();
    }
  }, [isAuthenticated, repositories.length, fetchRepositories]);
  
  // Handle login button click
  const handleLogin = async () => {
    try {
      await login();
    } catch (err) {
      console.error('Login failed:', err);
    }
  };
  
  // Handle clone repository button click
  const handleCloneRepository = async (repository: Repository) => {
    if (!user || !token) return;
    
    setActiveCloning(repository.name);
    setCloneError(null);
    
    try {
      await githubService.cloneRepository(
        repository,
        user.name || user.login,
        user.email || `${user.login}@users.noreply.github.com`
      );
      
      // Add to cloned repositories list
      setClonedRepos(prev => [...prev, repository.name]);
      
      // Navigate to editor with this repository
      navigate(`/editor?repo=${repository.name}`);
    } catch (err) {
      console.error('Failed to clone repository:', err);
      setCloneError(`Failed to clone repository: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setActiveCloning(null);
    }
  };
  
  // Handle open repository button click
  const handleOpenRepository = (repository: Repository) => {
    navigate(`/editor?repo=${repository.name}`);
  };
  
  return (
    <PageContainer>
      <Header>
        <Title>GitHub Integration</Title>
        <Description>
          Connect to GitHub, browse your repositories, and collaborate on projects.
        </Description>
      </Header>
      
      {error && (
        <ErrorMessage>
          {error}
          <button onClick={clearError}>Dismiss</button>
        </ErrorMessage>
      )}
      
      {cloneError && (
        <ErrorMessage>
          {cloneError}
          <button onClick={() => setCloneError(null)}>Dismiss</button>
        </ErrorMessage>
      )}
      
      {!isAuthenticated ? (
        <AuthSection>
          <h2>Connect to GitHub</h2>
          <p>Authorize this application to access your GitHub repositories.</p>
          <GitHubButton onClick={handleLogin} disabled={isLoading}>
            <GitHubIcon>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
              </svg>
            </GitHubIcon>
            {isLoading ? 'Connecting...' : 'Connect with GitHub'}
          </GitHubButton>
        </AuthSection>
      ) : (
        <>
          {user && (
            <UserInfo>
              <UserAvatar src={user.avatarUrl} alt={user.login} />
              <UserDetails>
                <UserName>{user.name || user.login}</UserName>
                <UserLogin>@{user.login}</UserLogin>
              </UserDetails>
              
              <div style={{ marginLeft: 'auto' }}>
                <SecondaryButton onClick={logout}>Disconnect</SecondaryButton>
                <RefreshButton onClick={fetchRepositories}>
                  ↻ Refresh Repositories
                </RefreshButton>
              </div>
            </UserInfo>
          )}
          
          <RepositoriesSection>
            <h2>Your Repositories</h2>
            
            {isLoading ? (
              <LoadingIndicator>Loading repositories...</LoadingIndicator>
            ) : repositories.length === 0 ? (
              <p>No repositories found.</p>
            ) : (
              <RepositoryList>
                {repositories.map(repo => (
                  <RepositoryItem key={repo.id}>
                    <RepositoryHeader>
                      <RepositoryName>{repo.name}</RepositoryName>
                      {repo.private && <RepositoryPrivate>Private</RepositoryPrivate>}
                    </RepositoryHeader>
                    
                    {repo.description && (
                      <RepositoryDescription>{repo.description}</RepositoryDescription>
                    )}
                    
                    <RepositoryActions>
                      {clonedRepos.includes(repo.name) ? (
                        <RepositoryButton onClick={() => handleOpenRepository(repo)}>
                          Open Repository
                        </RepositoryButton>
                      ) : (
                        <RepositoryButton 
                          onClick={() => handleCloneRepository(repo)}
                          disabled={activeCloning === repo.name}
                        >
                          {activeCloning === repo.name ? 'Cloning...' : 'Clone Repository'}
                        </RepositoryButton>
                      )}
                      
                      <SecondaryButton
                        onClick={() => window.open(repo.cloneUrl.replace('.git', ''), '_blank')}
                      >
                        View on GitHub
                      </SecondaryButton>
                    </RepositoryActions>
                  </RepositoryItem>
                ))}
              </RepositoryList>
            )}
          </RepositoriesSection>
        </>
      )}
    </PageContainer>
  );
};

export default GitHubPage; 