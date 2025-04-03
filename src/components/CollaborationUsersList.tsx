import React from 'react';
import styled from 'styled-components';
import { useCollaboration } from '../contexts/CollaborationContext';
import { UserAwarenessData } from '../services/collaborationService';

interface CollaborationUsersListProps {
  className?: string;
}

const CollaborationUsersList: React.FC<CollaborationUsersListProps> = ({ className }) => {
  const { connectedUsers, isConnected } = useCollaboration();
  
  if (!isConnected || connectedUsers.length === 0) {
    return (
      <Container className={className}>
        <EmptyState>
          {!isConnected ? 'Not connected to collaboration' : 'No other users connected'}
        </EmptyState>
      </Container>
    );
  }
  
  return (
    <Container className={className}>
      <Title>Connected Users ({connectedUsers.length})</Title>
      <UserList>
        {connectedUsers.map((user, index) => (
          <UserItem key={`${user.name}-${index}`}>
            <UserAvatar style={{ backgroundColor: user.color }}>
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} />
              ) : (
                user.name.charAt(0).toUpperCase()
              )}
            </UserAvatar>
            <UserName>{user.name}</UserName>
          </UserItem>
        ))}
      </UserList>
    </Container>
  );
};

const Container = styled.div`
  padding: 10px;
  background-color: ${props => props.theme.colors.surface};
  border-radius: 8px;
  margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
`;

const Title = styled.h3`
  font-size: 14px;
  margin: 0 0 10px 0;
  color: ${props => props.theme.colors.text};
  font-weight: 500;
`;

const UserList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;

const UserItem = styled.li`
  display: flex;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid ${props => props.theme.colors.border};
  
  &:last-child {
    border-bottom: none;
  }
`;

const UserAvatar = styled.div`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 12px;
  font-weight: bold;
  overflow: hidden;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const UserName = styled.span`
  margin-left: 10px;
  font-size: 14px;
  color: ${props => props.theme.colors.text};
`;

const EmptyState = styled.div`
  padding: 15px 0;
  text-align: center;
  color: ${props => props.theme.colors.textSecondary};
  font-size: 14px;
`;

export default CollaborationUsersList; 