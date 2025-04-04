import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { useGitHub } from '../contexts/GitHubContext';
import type { Repository } from '../types/github';
import { useProject } from '../contexts/ProjectContext';
import { useTheme } from '../contexts/ThemeContext';
import { formatDistance } from 'date-fns';
import { AiOutlinePlus, AiOutlineGithub, AiOutlineFolder } from 'react-icons/ai';
import { FiChevronRight, FiChevronDown, FiFile, FiSettings } from 'react-icons/fi';
import { toast } from 'react-toastify';
import FileBrowser from '../components/FileBrowser';
import BranchManager from '../components/BranchManager';
import CommitHistoryPanel from '../components/CommitHistoryPanel';
import VersionControlPanel from '../components/VersionControlPanel';
import PullRequestPanel from '../components/PullRequestPanel';
import { githubService } from '../services/githubService';
import { BiGitBranch, BiHistory, BiGitPullRequest, BiFolder, BiCog, BiGroup, BiInfoCircle } from 'react-icons/bi';
import { AiOutlineHome, AiOutlineSetting } from 'react-icons/ai';
import SettingsPanel from '../components/SettingsPanel';

// Page layout components
const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: ${props => props.theme.colors.background};
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  padding: 1rem;
  background-color: ${props => props.theme.colors.surface};
  border-bottom: 1px solid ${props => props.theme.colors.border};
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
`;

const Title = styled.h1`
  font-size: 1.5rem;
  margin: 0;
  color: ${props => props.theme.colors.text};
`;

const ContentContainer = styled.div`
  display: flex;
  flex: 1;
  overflow: hidden;
`;

const Sidebar = styled.div`
  width: 250px;
  border-right: 1px solid ${props => props.theme.colors.border};
  background-color: ${props => props.theme.colors.surface};
  overflow-y: auto;
`;

const MainContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
`;

const RightSidebar = styled.div<{ $visible: boolean }>`
  width: 300px;
  height: 100%;
  padding: 1rem;
  border-left: 1px solid ${props => props.theme.colors.border};
  background-color: ${props => props.theme.colors.surface};
  overflow-y: auto;
  display: ${props => props.$visible ? 'block' : 'none'};
`;

// Navigation components
const NavigationList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;

const NavigationItem = styled.li<{ active: boolean }>`
  padding: 0.75rem 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border-left: 3px solid ${props => props.active ? props.theme.colors.primary : 'transparent'};
  background-color: ${props => props.active ? props.theme.colors.surface : 'transparent'};
  
  &:hover {
    background-color: ${props => props.active ? props.theme.colors.surface : props.theme.colors.hoverBackground};
  }
`;

const NavigationIcon = styled.div`
  font-size: 1.25rem;
  color: ${props => props.theme.colors.primary};
`;

const NavigationText = styled.span`
  color: ${props => props.theme.colors.text};
`;

// Repository selector components
const RepositorySelector = styled.div`
  padding: 1rem;
  border-bottom: 1px solid ${props => props.theme.colors.border};
`;

const SelectWrapper = styled.div`
  position: relative;
  width: 100%;
`;

const Select = styled.select`
  width: 100%;
  padding: 0.5rem;
  border-radius: ${props => props.theme.borderRadius.medium};
  border: 1px solid ${props => props.theme.colors.border};
  background-color: ${props => props.theme.colors.inputBackground};
  color: ${props => props.theme.colors.text};
  appearance: none;
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
  }
`;

const SelectArrow = styled.div`
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
`;

const ActionButtonsContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
`;

const ActionButton = styled.button`
  flex: 1;
  padding: 0.5rem;
  border: none;
  border-radius: ${props => props.theme.borderRadius.small};
  background-color: ${props => props.theme.colors.primary};
  color: white;
  cursor: pointer;
  
  &:hover {
    background-color: ${props => props.theme.colors.primaryDark};
  }
`;

// Dashboard components
const DashboardContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const DashboardCard = styled.div`
  padding: 1rem;
  border-radius: ${props => props.theme.borderRadius.medium};
  background-color: ${props => props.theme.colors.surface};
  border: 1px solid ${props => props.theme.colors.border};
`;

const CardTitle = styled.h3`
  margin-top: 0;
  margin-bottom: 0.5rem;
  color: ${props => props.theme.colors.text};
  font-size: 1rem;
`;

const CardContent = styled.div`
  color: ${props => props.theme.colors.textSecondary};
`;

// Stats components
const StatsList = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
`;

const StatItem = styled.div`
  flex: 1;
  padding: 1rem;
  border-radius: ${props => props.theme.borderRadius.medium};
  background-color: ${props => props.theme.colors.surface};
  border: 1px solid ${props => props.theme.colors.border};
  text-align: center;
`;

const StatValue = styled.div`
  font-size: 1.5rem;
  font-weight: bold;
  color: ${props => props.theme.colors.primary};
`;

const StatLabel = styled.div`
  font-size: 0.875rem;
  color: ${props => props.theme.colors.textSecondary};
`;

// Activity components
const ActivityList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;

const ActivityItem = styled.li`
  padding: 0.75rem 0;
  border-bottom: 1px solid ${props => props.theme.colors.border};
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  &:last-child {
    border-bottom: none;
  }
`;

const ActivityIcon = styled.div`
  font-size: 1rem;
  color: ${props => props.theme.colors.primary};
`;

const ActivityText = styled.div`
  flex: 1;
  font-size: 0.875rem;
  color: ${props => props.theme.colors.text};
`;

const ActivityTime = styled.div`
  font-size: 0.75rem;
  color: ${props => props.theme.colors.textTertiary};
`;

// Team components
const TeamList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;

const TeamMember = styled.li`
  padding: 0.75rem 0;
  border-bottom: 1px solid ${props => props.theme.colors.border};
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  &:last-child {
    border-bottom: none;
  }
`;

const Avatar = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: ${props => props.theme.colors.surface};
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  color: ${props => props.theme.colors.textSecondary};
`;

const MemberInfo = styled.div`
  flex: 1;
`;

const MemberName = styled.div`
  font-size: 0.875rem;
  color: ${props => props.theme.colors.text};
`;

const MemberRole = styled.div`
  font-size: 0.75rem;
  color: ${props => props.theme.colors.textTertiary};
`;

// Settings placeholder
const SettingsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const SettingsSection = styled.div`
  padding: 1rem;
  border-radius: ${props => props.theme.borderRadius.medium};
  background-color: ${props => props.theme.colors.surface};
  border: 1px solid ${props => props.theme.colors.border};
`;

const SectionTitle = styled.h3`
  margin-top: 0;
  margin-bottom: 1rem;
  color: ${props => props.theme.colors.text};
  font-size: 1rem;
  border-bottom: 1px solid ${props => props.theme.colors.border};
  padding-bottom: 0.5rem;
`;

// Define the navigation sections
enum NavigationSection {
  DASHBOARD = 'dashboard',
  FILES = 'files',
  GIT = 'git',
  TEAM = 'team',
  SETTINGS = 'settings',
  INFO = 'info'
}

// Placeholder components for sections that need to be implemented
const ProjectDashboard: React.FC<{ repositoryName: string }> = ({ repositoryName }) => {
  return (
    <DashboardContainer>
      <StatsList>
        <StatItem>
          <StatValue>1</StatValue>
          <StatLabel>Repositories</StatLabel>
        </StatItem>
        <StatItem>
          <StatValue>3</StatValue>
          <StatLabel>Branches</StatLabel>
        </StatItem>
        <StatItem>
          <StatValue>42</StatValue>
          <StatLabel>Files</StatLabel>
        </StatItem>
        <StatItem>
          <StatValue>15</StatValue>
          <StatLabel>Commits</StatLabel>
        </StatItem>
      </StatsList>
      
      <DashboardCard>
        <CardTitle>Recent Activity</CardTitle>
        <CardContent>
          <ActivityList>
            <ActivityItem>
              <ActivityIcon><BiGitBranch /></ActivityIcon>
              <ActivityText>Branch <strong>feature/new-ui</strong> was created</ActivityText>
              <ActivityTime>2 hours ago</ActivityTime>
            </ActivityItem>
            <ActivityItem>
              <ActivityIcon><BiHistory /></ActivityIcon>
              <ActivityText>Commit <strong>Update README.md</strong></ActivityText>
              <ActivityTime>3 hours ago</ActivityTime>
            </ActivityItem>
            <ActivityItem>
              <ActivityIcon><BiGitPullRequest /></ActivityIcon>
              <ActivityText>Pull request <strong>#12</strong> was merged</ActivityText>
              <ActivityTime>1 day ago</ActivityTime>
            </ActivityItem>
          </ActivityList>
        </CardContent>
      </DashboardCard>
      
      <DashboardCard>
        <CardTitle>Team</CardTitle>
        <CardContent>
          <TeamList>
            <TeamMember>
              <Avatar>JD</Avatar>
              <MemberInfo>
                <MemberName>John Doe</MemberName>
                <MemberRole>Owner</MemberRole>
              </MemberInfo>
            </TeamMember>
            <TeamMember>
              <Avatar>JS</Avatar>
              <MemberInfo>
                <MemberName>Jane Smith</MemberName>
                <MemberRole>Contributor</MemberRole>
              </MemberInfo>
            </TeamMember>
          </TeamList>
        </CardContent>
      </DashboardCard>
    </DashboardContainer>
  );
};

const TeamManagement: React.FC<{ repositoryName: string }> = ({ repositoryName }) => {
  return (
    <div>
      <h2>Team Management</h2>
      <p>Manage collaborators and their permissions for repository: {repositoryName}</p>
      
      <TeamList>
        <TeamMember>
          <Avatar>JD</Avatar>
          <MemberInfo>
            <MemberName>John Doe</MemberName>
            <MemberRole>Owner</MemberRole>
          </MemberInfo>
        </TeamMember>
        <TeamMember>
          <Avatar>JS</Avatar>
          <MemberInfo>
            <MemberName>Jane Smith</MemberName>
            <MemberRole>Contributor</MemberRole>
          </MemberInfo>
        </TeamMember>
        <TeamMember>
          <Avatar>RJ</Avatar>
          <MemberInfo>
            <MemberName>Robert Johnson</MemberName>
            <MemberRole>Read-only</MemberRole>
          </MemberInfo>
        </TeamMember>
      </TeamList>
    </div>
  );
};

const ProjectInfo: React.FC<{ repositoryName: string }> = ({ repositoryName }) => {
  return (
    <div>
      <h2>Project Information</h2>
      <p>View information about repository: {repositoryName}</p>
      
      <DashboardCard>
        <CardTitle>Repository Details</CardTitle>
        <CardContent>
          <p><strong>Name:</strong> {repositoryName}</p>
          <p><strong>Owner:</strong> Owner Name</p>
          <p><strong>Created:</strong> January 1, 2023</p>
          <p><strong>Last Updated:</strong> Today</p>
        </CardContent>
      </DashboardCard>
      
      <DashboardCard>
        <CardTitle>Statistics</CardTitle>
        <CardContent>
          <p><strong>Files:</strong> 42</p>
          <p><strong>Branches:</strong> 3</p>
          <p><strong>Commits:</strong> 15</p>
          <p><strong>Contributors:</strong> 3</p>
        </CardContent>
      </DashboardCard>
    </div>
  );
};

// Main Project Management Page Component
const ProjectManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, repositories } = useGitHub();
  
  const [selectedRepository, setSelectedRepository] = useState<string>('');
  const [currentSection, setCurrentSection] = useState<NavigationSection>(NavigationSection.DASHBOARD);
  const [fileList, setFileList] = useState<any[]>([]);
  const [showRightSidebar, setShowRightSidebar] = useState<boolean>(false);
  const [modifiedFiles, setModifiedFiles] = useState<any[]>([]);
  const [currentBranch, setCurrentBranch] = useState<string>('');
  
  // Redirect to GitHub page if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/github');
    }
  }, [isAuthenticated, navigate]);
  
  // Load repository data when selected repository changes
  useEffect(() => {
    if (selectedRepository) {
      loadRepositoryData();
    }
  }, [selectedRepository]);
  
  // Load repository data (files, branches, etc.)
  const loadRepositoryData = async () => {
    try {
      // Load files
      const files = await githubService.listFiles(selectedRepository, '/');
      const rootFiles = await buildFileTree(selectedRepository, '/', files);
      setFileList(rootFiles);
      
      // Load Git status
      const status = await githubService.getStatus(selectedRepository);
      setModifiedFiles(status);
      
      // Get current branch
      const branch = await githubService.getCurrentBranch(selectedRepository);
      setCurrentBranch(branch);
    } catch (error) {
      console.error('Error loading repository data:', error);
    }
  };
  
  // Build file tree from list of files
  const buildFileTree = async (
    repositoryName: string,
    currentPath: string,
    fileList: string[]
  ) => {
    // Create a map to organize files by directory
    const fileMap: Record<string, any> = {
      '/': [] // Root directory
    };
    
    // Process all files and organize them by directory
    fileList.forEach(file => {
      // Skip .git directory files
      if (file.startsWith('.git/')) return;
      
      // Parse the directory path
      const lastSlashIndex = file.lastIndexOf('/');
      const dirPath = lastSlashIndex === -1 ? '/' : `/${file.substring(0, lastSlashIndex)}`;
      const fileName = lastSlashIndex === -1 ? file : file.substring(lastSlashIndex + 1);
      
      // Initialize directory in map if it doesn't exist
      if (!fileMap[dirPath]) {
        fileMap[dirPath] = [];
      }
      
      // Add file to its directory
      fileMap[dirPath].push({
        id: uuidv4(),
        name: fileName,
        type: fileName.includes('.') ? 'file' : 'folder',
        path: `${dirPath}/${fileName}`,
        extension: fileName.includes('.') ? fileName.split('.').pop() : undefined,
        isOpen: false
      });
    });
    
    // Check if the file item type has children property before accessing it
    const processFileItems = (items: any[], currentPath: string): any[] => {
      return items.map(item => {
        if (item.type === 'folder') {
          const folderPath = item.path;
          const folderChildren = fileMap[folderPath] || [];
          return {
            ...item,
            children: processFileItems(folderChildren, folderPath)
          };
        }
        return item;
      });
    };
    
    return processFileItems(fileMap['/'] || [], '/');
  };
  
  // Handle repository change
  const handleRepositoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedRepository(e.target.value);
  };
  
  // Handle file selection
  const handleFileSelect = (file: any) => {
    // Navigate to editor page with selected file
    navigate(`/editor?repo=${selectedRepository}&file=${encodeURIComponent(file.path)}`);
  };
  
  // Handle branch change
  const handleBranchChange = async (branchName: string) => {
    try {
      await githubService.checkoutBranch(selectedRepository, branchName);
      setCurrentBranch(branchName);
      loadRepositoryData();
    } catch (error) {
      console.error('Error changing branch:', error);
    }
  };
  
  // Render current section content
  const renderSectionContent = () => {
    switch (currentSection) {
      case NavigationSection.DASHBOARD:
        return <ProjectDashboard repositoryName={selectedRepository} />;
      case NavigationSection.FILES:
        return (
          <FileBrowser
            files={fileList}
            onFileSelect={handleFileSelect}
          />
        );
      case NavigationSection.GIT:
        return (
          <VersionControlPanel
            repositoryName={selectedRepository}
            repositoryOwner={user?.login || ''}
            currentBranch={currentBranch}
            modifiedFiles={modifiedFiles}
            commitMessage=''
            onCommitMessageChange={() => {}}
            onStageFile={() => {}}
            onCommit={() => {}}
            onPush={() => {}}
            onPull={() => {}}
            onBranchChange={handleBranchChange}
            isCommitting={false}
            isPushing={false}
            isPulling={false}
            visible={true}
            onClose={() => {}}
          />
        );
      case NavigationSection.TEAM:
        return <TeamManagement repositoryName={selectedRepository} />;
      case NavigationSection.SETTINGS:
        return <SettingsPanel />;
      case NavigationSection.INFO:
        return <ProjectInfo repositoryName={selectedRepository} />;
      default:
        return <div>Select a section</div>;
    }
  };
  
  // Render right sidebar content
  const renderRightSidebar = () => {
    switch (currentSection) {
      case NavigationSection.GIT:
        return (
          <CommitHistoryPanel
            repositoryName={selectedRepository}
            currentBranch={currentBranch}
            onClose={() => setShowRightSidebar(false)}
          />
        );
      default:
        return null;
    }
  };
  
  return (
    <PageContainer>
      <Header>
        <Title>Project Management</Title>
      </Header>
      
      <ContentContainer>
        <Sidebar>
          <RepositorySelector>
            <SelectWrapper>
              <Select value={selectedRepository} onChange={handleRepositoryChange}>
                <option value="">Select Repository</option>
                {repositories.map(repo => (
                  <option key={repo.id} value={repo.name}>
                    {repo.name}
                  </option>
                ))}
              </Select>
              <SelectArrow>▼</SelectArrow>
            </SelectWrapper>
            
            <ActionButtonsContainer>
              <ActionButton onClick={() => navigate('/github')}>
                Clone New
              </ActionButton>
              <ActionButton onClick={() => navigate('/editor')}>
                New File
              </ActionButton>
            </ActionButtonsContainer>
          </RepositorySelector>
          
          <NavigationList>
            <NavigationItem 
              active={currentSection === NavigationSection.DASHBOARD}
              onClick={() => setCurrentSection(NavigationSection.DASHBOARD)}
            >
              <NavigationIcon><AiOutlineHome /></NavigationIcon>
              <NavigationText>Dashboard</NavigationText>
            </NavigationItem>
            
            <NavigationItem 
              active={currentSection === NavigationSection.FILES}
              onClick={() => setCurrentSection(NavigationSection.FILES)}
            >
              <NavigationIcon><BiFolder /></NavigationIcon>
              <NavigationText>Files</NavigationText>
            </NavigationItem>
            
            <NavigationItem 
              active={currentSection === NavigationSection.GIT}
              onClick={() => {
                setCurrentSection(NavigationSection.GIT);
                setShowRightSidebar(true);
              }}
            >
              <NavigationIcon><BiGitBranch /></NavigationIcon>
              <NavigationText>Git</NavigationText>
            </NavigationItem>
            
            <NavigationItem 
              active={currentSection === NavigationSection.TEAM}
              onClick={() => setCurrentSection(NavigationSection.TEAM)}
            >
              <NavigationIcon><BiGroup /></NavigationIcon>
              <NavigationText>Team</NavigationText>
            </NavigationItem>
            
            <NavigationItem 
              active={currentSection === NavigationSection.SETTINGS}
              onClick={() => setCurrentSection(NavigationSection.SETTINGS)}
            >
              <NavigationIcon><AiOutlineSetting /></NavigationIcon>
              <NavigationText>Settings</NavigationText>
            </NavigationItem>
            
            <NavigationItem 
              active={currentSection === NavigationSection.INFO}
              onClick={() => setCurrentSection(NavigationSection.INFO)}
            >
              <NavigationIcon><BiInfoCircle /></NavigationIcon>
              <NavigationText>Info</NavigationText>
            </NavigationItem>
          </NavigationList>
        </Sidebar>
        
        <MainContent>
          {selectedRepository ? (
            renderSectionContent()
          ) : (
            <div>
              <h2>Select a Repository</h2>
              <p>Please select a repository to manage from the dropdown in the sidebar.</p>
            </div>
          )}
        </MainContent>
        
        <RightSidebar $visible={showRightSidebar}>
          {renderRightSidebar()}
        </RightSidebar>
      </ContentContainer>
    </PageContainer>
  );
};

export default ProjectManagementPage; 