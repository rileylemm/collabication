import React, { useState } from 'react';
import styled from 'styled-components';
import { useCollaboration } from '../contexts/CollaborationContext';

interface CollaborationStatusProps {
  className?: string;
  documentId?: string;
}

const CollaborationStatus: React.FC<CollaborationStatusProps> = ({ 
  className, 
  documentId 
}) => {
  const { 
    isConnected, 
    isConnecting, 
    connectionError, 
    connectedUsers, 
    currentDocumentId,
    connectToDocument,
    disconnectFromDocument
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

  return (
    <Container className={className}>
      <Title>Real-Time Collaboration</Title>
      
      <StatusIndicator $isConnected={isConnected} $isConnecting={isConnecting}>
        {isConnecting ? 'Connecting...' : isConnected ? 'Connected' : 'Disconnected'}
      </StatusIndicator>
      
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

const StatusIndicator = styled.div<{ $isConnected: boolean; $isConnecting: boolean }>`
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 14px;
  font-weight: 500;
  display: inline-block;
  margin-bottom: 16px;
  color: white;
  background-color: ${props => {
    if (props.$isConnecting) return props.theme.colors.warning;
    return props.$isConnected ? props.theme.colors.success : props.theme.colors.error;
  }};
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