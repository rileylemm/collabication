import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { githubService } from '../services/githubService';
import { BiGitBranch, BiPlus, BiTrash, BiRefresh } from 'react-icons/bi';
import { Theme } from '../styles/theme';

interface BranchManagerProps {
  repositoryName: string;
  onBranchChange?: (branchName: string) => void;
}

// Declare module for styled-components to use our Theme
declare module 'styled-components' {
  export interface DefaultTheme extends Theme {}
}

// Custom styled components to replace Chakra UI
const Box = styled.div``;

const Button = styled.button<{ $variant?: string; $colorScheme?: string; $isDisabled?: boolean; $isLoading?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  border-radius: ${props => props.theme.borderRadius.small};
  cursor: ${props => props.$isDisabled ? 'not-allowed' : 'pointer'};
  opacity: ${props => props.$isDisabled || props.$isLoading ? 0.6 : 1};
  background-color: ${props => {
    if (props.$variant === 'outline') return 'transparent';
    if (props.$colorScheme === 'blue') return props.theme.colors.primary;
    if (props.$colorScheme === 'red') return props.theme.colors.error;
    return props.theme.colors.surface;
  }};
  color: ${props => {
    if (props.$variant === 'outline') {
      if (props.$colorScheme === 'blue') return props.theme.colors.primary;
      if (props.$colorScheme === 'red') return props.theme.colors.error;
      return props.theme.colors.text;
    }
    return props.theme.colors.textOnPrimary;
  }};
  border: 1px solid ${props => {
    if (props.$variant === 'outline') {
      if (props.$colorScheme === 'blue') return props.theme.colors.primary;
      if (props.$colorScheme === 'red') return props.theme.colors.error;
      return props.theme.colors.border;
    }
    return 'transparent';
  }};
  margin-right: ${props => props.style?.marginRight || 0};
  
  &:hover {
    opacity: 0.8;
  }
  
  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
  
  svg {
    margin-right: 0.5rem;
  }
`;

const IconButton = styled.button<{ $isLoading?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: ${props => props.theme.borderRadius.small};
  background-color: transparent;
  border: 1px solid ${props => props.theme.colors.border};
  cursor: pointer;
  margin-right: ${props => props.style?.marginRight || 0};
  color: ${props => props.theme.colors.text};
  
  &:hover {
    background-color: ${props => props.theme.colors.backgroundHover};
  }
  
  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
`;

const Select = styled.select`
  padding: 0.5rem;
  border-radius: ${props => props.theme.borderRadius.small};
  border: 1px solid ${props => props.theme.colors.border};
  background-color: ${props => props.theme.colors.inputBackground};
  color: ${props => props.theme.colors.text};
  font-size: 0.875rem;
  margin-right: 0.5rem;
  flex: 1;
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const Input = styled.input`
  padding: 0.5rem;
  border-radius: ${props => props.theme.borderRadius.small};
  border: 1px solid ${props => props.theme.colors.border};
  background-color: ${props => props.theme.colors.inputBackground};
  color: ${props => props.theme.colors.text};
  width: 100%;
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
  }
`;

const Text = styled.p<{ $fontWeight?: string }>`
  margin: 0;
  color: ${props => props.theme.colors.text};
  font-weight: ${props => props.$fontWeight === 'bold' ? 'bold' : 'normal'};
  margin-bottom: ${props => props.style?.marginBottom ? `${props.style.marginBottom}px` : '0'};
`;

const Flex = styled.div<{ $justify?: string; $align?: string }>`
  display: flex;
  justify-content: ${props => props.$justify || 'flex-start'};
  align-items: ${props => props.$align || 'flex-start'};
  margin-bottom: ${props => props.style?.marginBottom ? `${props.style.marginBottom}px` : '0'};
`;

const Modal = styled.div<{ $isOpen: boolean }>`
  display: ${props => props.$isOpen ? 'block' : 'none'};
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1000;
`;

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 1000;
`;

const ModalContent = styled.div`
  position: relative;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: ${props => props.theme.colors.background};
  padding: 1rem;
  border-radius: ${props => props.theme.borderRadius.medium};
  max-width: 500px;
  width: 90%;
  z-index: 1001;
  box-shadow: ${props => props.theme.boxShadow.large};
`;

const ModalHeader = styled.div`
  font-weight: bold;
  font-size: 1.2rem;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid ${props => props.theme.colors.border};
  color: ${props => props.theme.colors.text};
`;

const ModalBody = styled.div`
  margin-bottom: 1rem;
`;

const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  padding-top: 0.5rem;
  border-top: 1px solid ${props => props.theme.colors.border};
`;

const FormControl = styled.div`
  margin-bottom: 1rem;
`;

const FormLabel = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  color: ${props => props.theme.colors.text};
`;

const CloseButton = styled.button`
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: ${props => props.theme.colors.textSecondary};
  
  &:hover {
    color: ${props => props.theme.colors.text};
  }
`;

const useCustomDisclosure = () => {
  const [open, setOpen] = useState(false);
  
  return {
    open,
    onOpen: () => setOpen(true),
    onClose: () => setOpen(false),
    onToggle: () => setOpen(!open),
    setOpen
  };
};

const BranchContainer = styled(Box)`
  padding: 16px;
  border-bottom: 1px solid ${props => props.theme.colors.border};
`;

const BranchManager: React.FC<BranchManagerProps> = ({ 
  repositoryName,
  onBranchChange
}) => {
  const [branches, setBranches] = useState<string[]>([]);
  const [currentBranch, setCurrentBranch] = useState<string>('');
  const [newBranchName, setNewBranchName] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const disclosure = useCustomDisclosure();
  
  // Toast-like message state
  const [toastMessage, setToastMessage] = useState<{
    title: string;
    description: string;
    status: 'success' | 'error' | 'info';
    visible: boolean;
  } | null>(null);
  
  const showToast = (title: string, description: string, status: 'success' | 'error' | 'info') => {
    setToastMessage({
      title,
      description,
      status,
      visible: true
    });
    
    setTimeout(() => {
      setToastMessage(null);
    }, 5000);
  };

  // Load branches
  const loadBranches = async () => {
    if (!repositoryName) return;
    
    try {
      setIsLoading(true);
      // Fetch available branches
      const branchList = await githubService.listBranches(repositoryName);
      setBranches(branchList);
      
      // Get current branch
      const current = await githubService.getCurrentBranch(repositoryName);
      setCurrentBranch(current);
    } catch (error) {
      console.error('Error loading branches:', error);
      showToast('Error loading branches', String(error), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Load branches when repository name changes
  useEffect(() => {
    if (repositoryName) {
      loadBranches();
    }
  }, [repositoryName]);

  // Handle branch change
  const handleBranchChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const branchName = e.target.value;
    try {
      setIsLoading(true);
      await githubService.checkoutBranch(repositoryName, branchName);
      setCurrentBranch(branchName);
      if (onBranchChange) {
        onBranchChange(branchName);
      }
      showToast('Branch changed', `Switched to branch: ${branchName}`, 'success');
    } catch (error) {
      console.error('Error changing branch:', error);
      showToast('Error changing branch', String(error), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Create a new branch
  const handleCreateBranch = async () => {
    if (!newBranchName.trim()) {
      showToast('Error creating branch', 'Branch name cannot be empty', 'error');
      return;
    }
    
    try {
      setIsLoading(true);
      await githubService.createBranch(repositoryName, newBranchName, true);
      disclosure.onClose();
      setNewBranchName('');
      
      // Refresh branch list
      await loadBranches();
      
      // Notify parent about branch change
      if (onBranchChange) {
        onBranchChange(newBranchName);
      }
      
      showToast('Branch created', `Created and switched to branch: ${newBranchName}`, 'success');
    } catch (error) {
      console.error('Error creating branch:', error);
      showToast('Error creating branch', String(error), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Delete current branch
  const handleDeleteBranch = async () => {
    if (currentBranch === 'main' || currentBranch === 'master') {
      showToast('Cannot delete branch', 'Cannot delete the main/master branch', 'error');
      return;
    }
    
    try {
      setIsLoading(true);
      // First checkout another branch
      const defaultBranch = branches.find(b => b !== currentBranch && (b === 'main' || b === 'master')) || branches[0];
      if (!defaultBranch) {
        throw new Error('Cannot delete the only branch');
      }
      
      // Switch to default branch
      await githubService.checkoutBranch(repositoryName, defaultBranch);
      
      // Delete the branch
      await githubService.deleteBranch(repositoryName, currentBranch);
      
      // Refresh branch list
      await loadBranches();
      
      // Notify parent about branch change
      if (onBranchChange) {
        onBranchChange(defaultBranch);
      }
      
      showToast('Branch deleted', `Deleted branch: ${currentBranch}`, 'success');
    } catch (error) {
      console.error('Error deleting branch:', error);
      showToast('Error deleting branch', String(error), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <BranchContainer>
      <Text $fontWeight="bold" style={{ marginBottom: 8 }}>
        Branch Management
      </Text>
      
      <Flex $align="center" style={{ marginBottom: 12 }}>
        <BiGitBranch size={18} style={{ marginRight: '8px' }} />
        <Text>Current: {currentBranch}</Text>
      </Flex>
      
      <Flex style={{ marginBottom: 12 }}>
        <Select 
          value={currentBranch}
          onChange={handleBranchChange}
          disabled={isLoading || branches.length === 0}
          style={{ marginRight: 8 }}
        >
          {branches.map(branch => (
            <option key={branch} value={branch}>
              {branch}
            </option>
          ))}
        </Select>
        
        <IconButton
          title="Refresh branches"
          onClick={loadBranches}
          $isLoading={isLoading}
          style={{ marginRight: 8 }}
        >
          <BiRefresh />
        </IconButton>
      </Flex>
      
      <Flex $justify="space-between">
        <Button
          $variant="outline"
          $colorScheme="blue"
          onClick={disclosure.onOpen}
          $isLoading={isLoading}
        >
          <BiPlus />
          New Branch
        </Button>
        
        <Button
          $variant="outline"
          $colorScheme="red"
          onClick={handleDeleteBranch}
          $isLoading={isLoading}
          $isDisabled={currentBranch === 'main' || currentBranch === 'master'}
        >
          <BiTrash />
          Delete Branch
        </Button>
      </Flex>
      
      {/* Modal for creating new branch */}
      <Modal $isOpen={disclosure.open}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Create New Branch</ModalHeader>
          <CloseButton onClick={disclosure.onClose}>×</CloseButton>
          <ModalBody>
            <FormControl>
              <FormLabel>Branch Name</FormLabel>
              <Input
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value)}
                placeholder="Enter branch name"
              />
            </FormControl>
          </ModalBody>

          <ModalFooter>
            <Button style={{ marginRight: 12 }} onClick={disclosure.onClose}>
              Cancel
            </Button>
            <Button 
              $colorScheme="blue" 
              onClick={handleCreateBranch}
              $isLoading={isLoading}
            >
              Create
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      
      {/* Toast message */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          backgroundColor: toastMessage.status === 'success' ? '#48BB78' : 
                          toastMessage.status === 'error' ? '#F56565' : '#4299E1',
          color: 'white',
          padding: '12px 20px',
          borderRadius: '4px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          zIndex: 1000
        }}>
          <strong>{toastMessage.title}</strong>
          <p>{toastMessage.description}</p>
        </div>
      )}
    </BranchContainer>
  );
};

export default BranchManager; 