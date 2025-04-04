import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { githubService } from '../services/githubService';
import { 
  Box, 
  Button, 
  Select, 
  Input, 
  FormControl,
  FormLabel,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Text,
  Flex,
  IconButton,
  Tooltip,
  useToast
} from '@chakra-ui/react';
import { BiGitBranch, BiPlus, BiTrash, BiRefresh } from 'react-icons/bi';

interface BranchManagerProps {
  repositoryName: string;
  onBranchChange?: (branchName: string) => void;
}

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
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

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
      toast({
        title: 'Error loading branches',
        description: String(error),
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
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
      toast({
        title: 'Branch changed',
        description: `Switched to branch: ${branchName}`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error changing branch:', error);
      toast({
        title: 'Error changing branch',
        description: String(error),
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Create a new branch
  const handleCreateBranch = async () => {
    if (!newBranchName.trim()) {
      toast({
        title: 'Error creating branch',
        description: 'Branch name cannot be empty',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    try {
      setIsLoading(true);
      await githubService.createBranch(repositoryName, newBranchName, true);
      onClose();
      setNewBranchName('');
      
      // Refresh branch list
      await loadBranches();
      
      // Notify parent about branch change
      if (onBranchChange) {
        onBranchChange(newBranchName);
      }
      
      toast({
        title: 'Branch created',
        description: `Created and switched to branch: ${newBranchName}`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error creating branch:', error);
      toast({
        title: 'Error creating branch',
        description: String(error),
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Delete current branch
  const handleDeleteBranch = async () => {
    if (currentBranch === 'main' || currentBranch === 'master') {
      toast({
        title: 'Cannot delete branch',
        description: 'Cannot delete the main/master branch',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
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
      
      toast({
        title: 'Branch deleted',
        description: `Deleted branch: ${currentBranch}`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error deleting branch:', error);
      toast({
        title: 'Error deleting branch',
        description: String(error),
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <BranchContainer>
      <Text fontWeight="bold" mb={2}>
        Branch Management
      </Text>
      
      <Flex align="center" mb={3}>
        <BiGitBranch size={18} style={{ marginRight: '8px' }} />
        <Text>Current: {currentBranch}</Text>
      </Flex>
      
      <Flex mb={3}>
        <Select 
          value={currentBranch}
          onChange={handleBranchChange}
          disabled={isLoading || branches.length === 0}
          mr={2}
          size="sm"
        >
          {branches.map(branch => (
            <option key={branch} value={branch}>
              {branch}
            </option>
          ))}
        </Select>
        
        <Tooltip label="Refresh branches">
          <IconButton
            aria-label="Refresh branches"
            icon={<BiRefresh />}
            size="sm"
            onClick={loadBranches}
            isLoading={isLoading}
            mr={2}
          />
        </Tooltip>
      </Flex>
      
      <Flex justify="space-between">
        <Button
          leftIcon={<BiPlus />}
          size="sm"
          onClick={onOpen}
          isLoading={isLoading}
          colorScheme="blue"
          variant="outline"
        >
          New Branch
        </Button>
        
        <Button
          leftIcon={<BiTrash />}
          size="sm"
          onClick={handleDeleteBranch}
          isLoading={isLoading}
          colorScheme="red"
          variant="outline"
          isDisabled={currentBranch === 'main' || currentBranch === 'master'}
        >
          Delete Branch
        </Button>
      </Flex>
      
      {/* Modal for creating new branch */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Create New Branch</ModalHeader>
          <ModalCloseButton />
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
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button 
              colorScheme="blue" 
              onClick={handleCreateBranch}
              isLoading={isLoading}
            >
              Create
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </BranchContainer>
  );
};

export default BranchManager; 