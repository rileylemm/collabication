import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useCollaboration } from '../contexts/CollaborationContext';
import { Permission } from '../services/collaborationService';
import type { PermissionRole } from '../services/collaborationService';
import { FaUserPlus, FaTimes, FaExchangeAlt, FaEdit, FaCheck, FaTrash } from 'react-icons/fa';

interface PermissionsPanelProps {
  documentId?: string;
  onClose?: () => void;
}

const PermissionsPanel: React.FC<PermissionsPanelProps> = ({ documentId, onClose }) => {
  const {
    currentDocumentId,
    documentPermissions,
    currentUserPermission,
    isOwner,
    getDocumentPermissions,
    setUserPermission,
    removeUserPermission,
    transferOwnership,
    connectedUsers
  } = useCollaboration();
  
  // Local state
  const [newUserDetails, setNewUserDetails] = useState({
    userId: '',
    userEmail: '',
    userName: '',
    role: 'viewer' as PermissionRole
  });
  
  const [editingPermission, setEditingPermission] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<PermissionRole>('viewer');
  const [transferToUser, setTransferToUser] = useState<string>('');
  const [showTransferConfirm, setShowTransferConfirm] = useState(false);
  
  // Check if we can find a connected user to pre-fill new user form
  useEffect(() => {
    if (connectedUsers.length > 0 && newUserDetails.userId === '') {
      // Find users that don't already have permissions
      const usersWithPermissions = new Set(documentPermissions.map(p => p.userId));
      const userWithoutPermission = connectedUsers.find(user => 
        !usersWithPermissions.has(user.id) && user.isCurrentUser !== true
      );
      
      if (userWithoutPermission) {
        setNewUserDetails({
          userId: userWithoutPermission.id,
          userName: userWithoutPermission.name,
          userEmail: '',
          role: 'viewer'
        });
      }
    }
  }, [connectedUsers, documentPermissions, newUserDetails.userId]);
  
  // Handle adding a new user
  const handleAddUser = () => {
    if (!newUserDetails.userId || !newUserDetails.userName) {
      alert('User ID and name are required');
      return;
    }
    
    const newPermission: Permission = {
      userId: newUserDetails.userId,
      userName: newUserDetails.userName,
      userEmail: newUserDetails.userEmail,
      role: newUserDetails.role,
      grantedBy: currentUserPermission?.userId || '',
      grantedAt: new Date().toISOString()
    };
    
    const success = setUserPermission(newPermission);
    
    if (success) {
      // Reset form
      setNewUserDetails({
        userId: '',
        userEmail: '',
        userName: '',
        role: 'viewer'
      });
    } else {
      alert('Failed to add permission. Make sure you have owner permissions.');
    }
  };
  
  // Handle editing an existing permission
  const handleEditPermission = (userId: string) => {
    if (editingPermission === userId) {
      // Save the edit
      const permission = documentPermissions.find(p => p.userId === userId);
      if (!permission) return;
      
      const updatedPermission: Permission = {
        ...permission,
        role: editRole
      };
      
      const success = setUserPermission(updatedPermission);
      
      if (success) {
        setEditingPermission(null);
      } else {
        alert('Failed to update permission. Make sure you have owner permissions.');
      }
    } else {
      // Start editing
      const permission = documentPermissions.find(p => p.userId === userId);
      if (!permission) return;
      
      setEditRole(permission.role);
      setEditingPermission(userId);
    }
  };
  
  // Handle removing a permission
  const handleRemovePermission = (userId: string) => {
    if (window.confirm('Are you sure you want to remove this user\'s access?')) {
      const success = removeUserPermission(userId);
      
      if (!success) {
        alert('Failed to remove permission. Make sure you have owner permissions and are not trying to remove the owner.');
      }
    }
  };
  
  // Handle ownership transfer
  const handleInitiateTransfer = () => {
    setShowTransferConfirm(true);
  };
  
  const handleConfirmTransfer = () => {
    if (!transferToUser) {
      alert('Please select a user to transfer ownership to');
      return;
    }
    
    if (window.confirm(`Are you sure you want to transfer ownership to this user? You will lose owner privileges.`)) {
      const success = transferOwnership(transferToUser);
      
      if (success) {
        setShowTransferConfirm(false);
        setTransferToUser('');
      } else {
        alert('Failed to transfer ownership. Make sure the user has permission to access the document.');
      }
    }
  };
  
  const cancelTransfer = () => {
    setShowTransferConfirm(false);
    setTransferToUser('');
  };
  
  // Get the document ID to use
  const activeDocumentId = documentId || currentDocumentId;
  
  // If there's no document, show a message
  if (!activeDocumentId) {
    return (
      <Container>
        <Header>
          <h3>Document Permissions</h3>
          {onClose && <CloseButton onClick={onClose}><FaTimes /></CloseButton>}
        </Header>
        <EmptyMessage>No document is currently open</EmptyMessage>
      </Container>
    );
  }
  
  return (
    <Container>
      <Header>
        <h3>Document Permissions</h3>
        {onClose && <CloseButton onClick={onClose}><FaTimes /></CloseButton>}
      </Header>
      
      {/* User's own permission level */}
      <Section>
        <SectionTitle>Your Access</SectionTitle>
        <UserPermission>
          <PermissionRole $role={currentUserPermission?.role || 'viewer'}>
            {currentUserPermission?.role || 'No Access'}
          </PermissionRole>
          <p>
            {isOwner() 
              ? 'You are the document owner and can manage all permissions.' 
              : `You have ${currentUserPermission?.role || 'no'} access to this document.`}
          </p>
        </UserPermission>
      </Section>
      
      {/* Permissions list */}
      <Section>
        <SectionTitle>Who has access</SectionTitle>
        {documentPermissions.length === 0 ? (
          <EmptyMessage>No permissions have been set yet</EmptyMessage>
        ) : (
          <PermissionsList>
            {documentPermissions.map(permission => (
              <PermissionItem key={permission.userId}>
                <UserInfo>
                  <UserName>{permission.userName || permission.userId}</UserName>
                  {permission.userEmail && <UserEmail>{permission.userEmail}</UserEmail>}
                </UserInfo>
                
                {editingPermission === permission.userId ? (
                  <EditControls>
                    <RoleSelect 
                      value={editRole} 
                      onChange={e => setEditRole(e.target.value as PermissionRole)}
                      disabled={permission.role === 'owner'}
                    >
                      <option value="viewer">Viewer</option>
                      <option value="editor">Editor</option>
                      <option value="owner">Owner</option>
                    </RoleSelect>
                    <ActionButton onClick={() => handleEditPermission(permission.userId)}>
                      <FaCheck />
                    </ActionButton>
                  </EditControls>
                ) : (
                  <ActionControls>
                    <PermissionRole $role={permission.role}>
                      {permission.role}
                    </PermissionRole>
                    
                    {isOwner() && currentUserPermission?.userId !== permission.userId && (
                      <>
                        <ActionButton onClick={() => handleEditPermission(permission.userId)}>
                          <FaEdit />
                        </ActionButton>
                        <ActionButton onClick={() => handleRemovePermission(permission.userId)}>
                          <FaTrash />
                        </ActionButton>
                      </>
                    )}
                  </ActionControls>
                )}
              </PermissionItem>
            ))}
          </PermissionsList>
        )}
      </Section>
      
      {/* Add new user form - only shown to owners */}
      {isOwner() && (
        <Section>
          <SectionTitle>Add People</SectionTitle>
          <AddUserForm>
            <FormField>
              <Label htmlFor="userName">Name</Label>
              <Input 
                id="userName"
                value={newUserDetails.userName}
                onChange={e => setNewUserDetails({...newUserDetails, userName: e.target.value})}
                placeholder="User's name"
              />
            </FormField>
            
            <FormField>
              <Label htmlFor="userId">User ID</Label>
              <Input 
                id="userId"
                value={newUserDetails.userId}
                onChange={e => setNewUserDetails({...newUserDetails, userId: e.target.value})}
                placeholder="Unique user identifier"
              />
            </FormField>
            
            <FormField>
              <Label htmlFor="userEmail">Email (optional)</Label>
              <Input 
                id="userEmail"
                value={newUserDetails.userEmail}
                onChange={e => setNewUserDetails({...newUserDetails, userEmail: e.target.value})}
                placeholder="user@example.com"
              />
            </FormField>
            
            <FormField>
              <Label htmlFor="userRole">Permission</Label>
              <RoleSelect 
                id="userRole"
                value={newUserDetails.role}
                onChange={e => setNewUserDetails({...newUserDetails, role: e.target.value as PermissionRole})}
              >
                <option value="viewer">Viewer</option>
                <option value="editor">Editor</option>
              </RoleSelect>
            </FormField>
            
            <AddButton onClick={handleAddUser}>
              <FaUserPlus />
              Add User
            </AddButton>
          </AddUserForm>
        </Section>
      )}
      
      {/* Transfer ownership section - only shown to owners */}
      {isOwner() && (
        <Section>
          <SectionTitle>Transfer Ownership</SectionTitle>
          
          {showTransferConfirm ? (
            <TransferConfirm>
              <p>Select a user to transfer ownership to:</p>
              <RoleSelect 
                value={transferToUser} 
                onChange={e => setTransferToUser(e.target.value)}
              >
                <option value="">Select a user</option>
                {documentPermissions
                  .filter(p => p.userId !== currentUserPermission?.userId)
                  .map(p => (
                    <option key={p.userId} value={p.userId}>
                      {p.userName || p.userId}
                    </option>
                  ))
                }
              </RoleSelect>
              
              <ButtonGroup>
                <Button $secondary onClick={cancelTransfer}>Cancel</Button>
                <Button onClick={handleConfirmTransfer}>Transfer Ownership</Button>
              </ButtonGroup>
            </TransferConfirm>
          ) : (
            <TransferButton onClick={handleInitiateTransfer}>
              <FaExchangeAlt />
              Transfer Ownership
            </TransferButton>
          )}
        </Section>
      )}
    </Container>
  );
};

// Styled components
const Container = styled.div`
  background-color: ${props => props.theme.colors.background};
  border-radius: 8px;
  border: 1px solid ${props => props.theme.colors.border};
  width: 100%;
  max-width: 600px;
  box-shadow: ${props => props.theme.boxShadow.medium};
  overflow: hidden;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid ${props => props.theme.colors.border};
  
  h3 {
    margin: 0;
    font-size: 18px;
    color: ${props => props.theme.colors.text};
  }
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: ${props => props.theme.colors.textSecondary};
  cursor: pointer;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border-radius: 4px;
  
  &:hover {
    background-color: ${props => props.theme.colors.background};
    opacity: 0.8;
  }
`;

const Section = styled.div`
  padding: 16px;
  border-bottom: 1px solid ${props => props.theme.colors.border};
  
  &:last-child {
    border-bottom: none;
  }
`;

const SectionTitle = styled.h4`
  margin: 0 0 16px 0;
  font-size: 16px;
  color: ${props => props.theme.colors.text};
`;

const EmptyMessage = styled.p`
  color: ${props => props.theme.colors.textSecondary};
  font-style: italic;
  margin: 16px 0;
`;

const UserPermission = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  
  p {
    margin: 0;
    color: ${props => props.theme.colors.textSecondary};
  }
`;

const PermissionRole = styled.span<{ $role: string }>`
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  text-transform: capitalize;
  
  background-color: ${props => {
    switch (props.$role) {
      case 'owner':
        return 'rgba(246, 153, 63, 0.2)';
      case 'editor':
        return 'rgba(52, 199, 89, 0.2)';
      case 'viewer':
      default:
        return 'rgba(90, 200, 250, 0.2)';
    }
  }};
  
  color: ${props => {
    switch (props.$role) {
      case 'owner':
        return 'rgb(246, 153, 63)';
      case 'editor':
        return 'rgb(52, 199, 89)';
      case 'viewer':
      default:
        return 'rgb(90, 200, 250)';
    }
  }};
`;

const PermissionsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const PermissionItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border-radius: 6px;
  background-color: ${props => props.theme.colors.background};
  opacity: 0.9;
`;

const UserInfo = styled.div`
  display: flex;
  flex-direction: column;
`;

const UserName = styled.span`
  font-weight: 500;
  color: ${props => props.theme.colors.text};
`;

const UserEmail = styled.span`
  font-size: 12px;
  color: ${props => props.theme.colors.textSecondary};
`;

const ActionControls = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const EditControls = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ActionButton = styled.button`
  background: none;
  border: none;
  color: ${props => props.theme.colors.textSecondary};
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    background-color: ${props => props.theme.colors.background};
    opacity: 0.8;
    color: ${props => props.theme.colors.primary};
  }
`;

const AddUserForm = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const FormField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const Label = styled.label`
  font-size: 14px;
  color: ${props => props.theme.colors.textSecondary};
`;

const Input = styled.input`
  padding: 8px 12px;
  border-radius: 4px;
  border: 1px solid ${props => props.theme.colors.border};
  background-color: ${props => props.theme.colors.inputBackground};
  color: ${props => props.theme.colors.text};
  font-size: 14px;
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
    box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
  }
`;

const RoleSelect = styled.select`
  padding: 8px 12px;
  border-radius: 4px;
  border: 1px solid ${props => props.theme.colors.border};
  background-color: ${props => props.theme.colors.inputBackground};
  color: ${props => props.theme.colors.text};
  font-size: 14px;
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
    box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const AddButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 4px;
  background-color: ${props => props.theme.colors.primary};
  color: white;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: background-color 0.2s ease;
  
  &:hover {
    background-color: ${props => props.theme.colors.primaryDark};
  }
`;

const TransferButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 4px;
  background-color: ${props => props.theme.colors.warning};
  color: white;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: background-color 0.2s ease;
  
  &:hover {
    background-color: ${props => props.theme.colors.warning};
    opacity: 0.8;
  }
`;

const TransferConfirm = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  
  p {
    margin: 0;
    color: ${props => props.theme.colors.text};
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 8px;
`;

const Button = styled.button<{ $secondary?: boolean }>`
  padding: 8px 16px;
  border-radius: 4px;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: background-color 0.2s ease;
  
  background-color: ${props => props.$secondary 
    ? props.theme.colors.background
    : props.theme.colors.warning};
  color: ${props => props.$secondary 
    ? props.theme.colors.text 
    : 'white'};
  
  &:hover {
    opacity: 0.9;
  }
`;

export default PermissionsPanel; 