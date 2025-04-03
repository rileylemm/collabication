import React, { useState, useMemo } from 'react';
import styled from 'styled-components';
import { useCollaboration } from '../contexts/CollaborationContext';
import { FaWifi, FaExclamationTriangle, FaSync, FaArrowUp, FaUserFriends } from 'react-icons/fa';
import { MdWifiOff } from 'react-icons/md';
import { UserAwarenessData } from '../services/collaborationService';
import collaborationService from '../services/collaborationService';

interface CollaborationStatusProps {
  className?: string;
  documentId: string;
}

const StatusContainer = styled.div`
  display: flex;
  align-items: center;
  font-size: 0.9rem;
  color: ${props => props.theme.colors.textSecondary};
  margin-right: 1rem;
  gap: 8px;
`;

const StatusIndicator = styled.div<{ status: 'online' | 'offline' | 'reconnecting' | 'error' | 'pendingChanges' }>`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
  cursor: ${props => props.status === 'pendingChanges' ? 'pointer' : 'default'};
  background-color: ${props => {
    switch (props.status) {
      case 'online':
        return 'rgba(52, 199, 89, 0.2)';
      case 'offline':
        return 'rgba(142, 142, 147, 0.2)';
      case 'reconnecting':
        return 'rgba(255, 204, 0, 0.2)';
      case 'error':
        return 'rgba(255, 59, 48, 0.2)';
      case 'pendingChanges':
        return 'rgba(0, 122, 255, 0.2)';
      default:
        return 'transparent';
    }
  }};
  color: ${props => {
    switch (props.status) {
      case 'online':
        return 'rgb(52, 199, 89)';
      case 'offline':
        return 'rgb(142, 142, 147)';
      case 'reconnecting':
        return 'rgb(255, 204, 0)';
      case 'error':
        return 'rgb(255, 59, 48)';
      case 'pendingChanges':
        return 'rgb(0, 122, 255)';
      default:
        return props.theme.colors.textSecondary;
    }
  }};

  &:hover {
    opacity: ${props => props.status === 'pendingChanges' ? 0.8 : 1};
  }
`;

const UsersCount = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
  background-color: rgba(52, 199, 89, 0.1);
  color: ${props => props.theme.colors.textSecondary};

  &:hover {
    background-color: rgba(52, 199, 89, 0.2);
  }
`;

const CollaborationStatus: React.FC<CollaborationStatusProps> = ({ 
  className,
  documentId 
}) => {
  const {
    isConnected,
    isConnecting,
    connectionError,
    networkStatus,
    connectedUsers,
    documentsWithOfflineChanges,
    getDocumentOfflineStatus,
    currentDocumentId,
    connectToDocument,
    disconnectFromDocument,
    updateUserInfo
  } = useCollaboration();

  const [userName, setUserName] = useState<string>(() => {
    const savedUser = localStorage.getItem('collabication-user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        return parsed.name || 'Anonymous User';
      } catch (e) {
        return 'Anonymous User';
      }
    }
    return 'Anonymous User';
  });

  const [userColor, setUserColor] = useState<string>(() => {
    const savedUser = localStorage.getItem('collabication-user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        return parsed.color || '#' + Math.floor(Math.random() * 16777215).toString(16);
      } catch (e) {
        return '#' + Math.floor(Math.random() * 16777215).toString(16);
      }
    }
    return '#' + Math.floor(Math.random() * 16777215).toString(16);
  });

  // Check if this document has offline changes
  const offlineStatus = useMemo(() => {
    return getDocumentOfflineStatus(documentId);
  }, [documentId, getDocumentOfflineStatus, documentsWithOfflineChanges]);

  // Get unique users (excluding current user)
  const uniqueOtherUsers = useMemo(() => {
    const userSet = new Set<string>();
    const otherUsers: UserAwarenessData[] = [];
    
    connectedUsers.forEach(user => {
      if (!userSet.has(user.id) && user.isCurrentUser !== true) {
        userSet.add(user.id);
        otherUsers.push(user);
      }
    });
    
    return otherUsers;
  }, [connectedUsers]);

  // Get status based on various factors
  const getStatus = useMemo(() => {
    if (connectionError) {
      return { type: 'error' as const, message: 'Connection error' };
    }
    
    if (networkStatus === 'offline') {
      return { type: 'offline' as const, message: 'Offline' };
    }
    
    if (isConnecting || networkStatus === 'reconnecting') {
      return { type: 'reconnecting' as const, message: 'Reconnecting...' };
    }
    
    if (isConnected) {
      return { type: 'online' as const, message: 'Connected' };
    }
    
    return { type: 'offline' as const, message: 'Disconnected' };
  }, [isConnected, isConnecting, connectionError, networkStatus]);

  const handleConnect = async () => {
    if (!documentId) return;
    
    // Save user info to localStorage
    localStorage.setItem('collabication-user', JSON.stringify({
      name: userName,
      color: userColor
    }));
    
    // Connect to document
    await connectToDocument(documentId);
  };

  const handleDisconnect = () => {
    disconnectFromDocument();
  };

  const handleUserNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserName(e.target.value);
  };

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserColor(e.target.value);
  };

  // Handle syncing when back online
  const handleSyncClick = () => {
    if (networkStatus === 'online' && offlineStatus.hasPendingChanges) {
      collaborationService.syncOfflineChanges(documentId);
    }
  };

  return (
    <Container className={className}>
      <Title>Real-Time Collaboration</Title>
      
      <StatusContainer>
        {/* Connection status */}
        <StatusIndicator status={getStatus.type}>
          {getStatus.type === 'online' && <FaWifi />}
          {getStatus.type === 'offline' && <MdWifiOff />}
          {getStatus.type === 'reconnecting' && <FaSync className="rotating" />}
          {getStatus.type === 'error' && <FaExclamationTriangle />}
          <span>{getStatus.message}</span>
        </StatusIndicator>
        
        {/* Pending changes indicator */}
        {offlineStatus.hasPendingChanges && networkStatus === 'online' && (
          <StatusIndicator status="pendingChanges" onClick={handleSyncClick}>
            <FaArrowUp />
            <span>Sync changes</span>
          </StatusIndicator>
        )}
        
        {/* Connected users count */}
        {isConnected && uniqueOtherUsers.length > 0 && (
          <UsersCount>
            <FaUserFriends />
            <span>{uniqueOtherUsers.length} {uniqueOtherUsers.length === 1 ? 'user' : 'users'}</span>
          </UsersCount>
        )}
      </StatusContainer>
      
      {connectionError && (
        <ErrorMessage>{connectionError}</ErrorMessage>
      )}
      
      <FieldGroup>
        <Label htmlFor="userName">Your Name</Label>
        <Input 
          id="userName"
          type="text" 
          value={userName} 
          onChange={handleUserNameChange} 
          disabled={isConnected}
        />
      </FieldGroup>
      
      <FieldGroup>
        <Label htmlFor="userColor">Your Color</Label>
        <ColorInputWrapper>
          <ColorPreview style={{ backgroundColor: userColor }} />
          <ColorInput 
            id="userColor"
            type="color" 
            value={userColor} 
            onChange={handleColorChange} 
            disabled={isConnected}
          />
        </ColorInputWrapper>
      </FieldGroup>
      
      <ButtonGroup>
        {!isConnected ? (
          <ConnectButton 
            onClick={handleConnect} 
            disabled={isConnecting || !documentId}
          >
            {isConnecting ? 'Connecting...' : 'Connect'}
          </ConnectButton>
        ) : (
          <DisconnectButton onClick={handleDisconnect}>
            Disconnect
          </DisconnectButton>
        )}
      </ButtonGroup>
      
      {isConnected && (
        <ConnectedInfo>
          <div>Document: {currentDocumentId}</div>
          <div>Users connected: {connectedUsers.length}</div>
        </ConnectedInfo>
      )}
    </Container>
  );
};

const Container = styled.div`
  padding: 16px;
  background-color: ${props => props.theme.colors.surface};
  border-radius: 8px;
  margin-bottom: 16px;
  box-shadow: ${props => props.theme.boxShadow.small};
`;

const Title = styled.h3`
  font-size: 16px;
  margin: 0 0 16px 0;
  color: ${props => props.theme.colors.text};
  font-weight: 500;
`;

const ErrorMessage = styled.div`
  color: ${props => props.theme.colors.error};
  font-size: 14px;
  margin-bottom: 16px;
  padding: 8px;
  background-color: ${props => `${props.theme.colors.error}10`};
  border-radius: 4px;
  border-left: 3px solid ${props => props.theme.colors.error};
`;

const FieldGroup = styled.div`
  margin-bottom: 12px;
`;

const Label = styled.label`
  display: block;
  font-size: 14px;
  color: ${props => props.theme.colors.textSecondary};
  margin-bottom: 4px;
`;

const Input = styled.input`
  width: 100%;
  padding: 8px 12px;
  border-radius: 4px;
  border: 1px solid ${props => props.theme.colors.border};
  background-color: ${props => props.theme.colors.inputBackground};
  color: ${props => props.theme.colors.text};
  font-size: 14px;
  
  &:disabled {
    background-color: ${props => props.theme.colors.disabledBackground};
    cursor: not-allowed;
  }
`;

const ColorInputWrapper = styled.div`
  display: flex;
  align-items: center;
`;

const ColorPreview = styled.div`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  margin-right: 8px;
  border: 1px solid ${props => props.theme.colors.border};
`;

const ColorInput = styled.input`
  width: 60px;
  height: 30px;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 16px;
`;

const Button = styled.button`
  padding: 8px 16px;
  border-radius: 4px;
  font-weight: 500;
  font-size: 14px;
  border: none;
  cursor: pointer;
  transition: ${props => props.theme.transition};
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ConnectButton = styled(Button)`
  background-color: ${props => props.theme.colors.primary};
  color: ${props => props.theme.colors.textOnPrimary};
  
  &:hover:not(:disabled) {
    background-color: ${props => props.theme.colors.primaryDark};
  }
`;

const DisconnectButton = styled(Button)`
  background-color: ${props => props.theme.colors.error};
  color: white;
  
  &:hover {
    opacity: 0.9;
  }
`;

const ConnectedInfo = styled.div`
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid ${props => props.theme.colors.border};
  font-size: 14px;
  color: ${props => props.theme.colors.textSecondary};
  
  > div {
    margin-bottom: 4px;
  }
`;

export default CollaborationStatus; 