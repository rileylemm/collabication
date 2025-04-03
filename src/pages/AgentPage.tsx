import React from 'react';
import styled from 'styled-components';
import AgentContainer from '../components/AgentContainer';
import { useParams } from 'react-router-dom';

const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: calc(100vh - 60px);
  padding: 1rem;
  background-color: ${props => props.theme.colors.background};
`;

const Header = styled.div`
  margin-bottom: 1rem;
`;

const Title = styled.h1`
  font-size: 1.5rem;
  color: ${props => props.theme.colors.text};
  margin: 0;
`;

const Description = styled.p`
  font-size: 0.9rem;
  color: ${props => props.theme.colors.textSecondary};
  margin: 0.5rem 0 0 0;
`;

const AgentContent = styled.div`
  flex: 1;
  display: flex;
  border-radius: ${props => props.theme.borderRadius.medium};
  overflow: hidden;
  background-color: ${props => props.theme.colors.surface};
  border: 1px solid ${props => props.theme.colors.border};
`;

const AgentPage: React.FC = () => {
  // Get project ID from URL params if needed
  const { projectId } = useParams<{ projectId?: string }>();
  
  return (
    <PageContainer>
      <Header>
        <Title>Agent Assistant</Title>
        <Description>
          Chat with your AI assistant to help with coding, writing, and problem-solving.
        </Description>
      </Header>
      
      <AgentContent>
        <AgentContainer />
      </AgentContent>
    </PageContainer>
  );
};

export default AgentPage; 