import React from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { Theme } from '../styles/theme';

const HomeContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem;
  max-width: 800px;
  margin: 0 auto;
`;

const Title = styled.h1`
  font-size: 2.5rem;
  margin-bottom: 1rem;
  color: ${(props: { theme: Theme }) => props.theme.colors.primary};
`;

const Subtitle = styled.h2`
  font-size: 1.5rem;
  margin-bottom: 2rem;
  color: ${(props: { theme: Theme }) => props.theme.colors.textSecondary};
  text-align: center;
`;

const FeatureList = styled.ul`
  list-style-type: none;
  padding: 0;
  width: 100%;
`;

const FeatureItem = styled.li`
  margin-bottom: 1rem;
  padding: 1rem;
  border-radius: ${(props: { theme: Theme }) => props.theme.borderRadius.medium};
  background-color: ${(props: { theme: Theme }) => props.theme.colors.surface};
  border: 1px solid ${(props: { theme: Theme }) => props.theme.colors.border};

  h3 {
    color: ${(props: { theme: Theme }) => props.theme.colors.primary};
    margin-top: 0;
  }
`;

const ActionButton = styled(Link)`
  display: inline-block;
  margin-top: 2rem;
  padding: 0.75rem 1.5rem;
  background-color: ${(props: { theme: Theme }) => props.theme.colors.primary};
  color: white;
  text-decoration: none;
  border-radius: ${(props: { theme: Theme }) => props.theme.borderRadius.medium};
  font-weight: bold;
  transition: ${(props: { theme: Theme }) => props.theme.transition};

  &:hover {
    background-color: ${(props: { theme: Theme }) => props.theme.colors.secondary};
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }
`;

const HomePage: React.FC = () => {
  return (
    <HomeContainer>
      <Title>Welcome to Collabication</Title>
      <Subtitle>
        An agent-native collaboration platform that seamlessly integrates humans and AI agents for knowledge work
      </Subtitle>
      
      <FeatureList>
        <FeatureItem>
          <h3>Document Editing</h3>
          <p>Create and edit documents with Markdown or rich text formatting.</p>
        </FeatureItem>
        <FeatureItem>
          <h3>Code Editing</h3>
          <p>Write and format code with syntax highlighting for multiple languages.</p>
        </FeatureItem>
        <FeatureItem>
          <h3>AI Assistance</h3>
          <p>Get help from AI agents while creating and editing your documents.</p>
        </FeatureItem>
        <FeatureItem>
          <h3>Real-time Collaboration</h3>
          <p>Work together with your team in real-time on documents and code.</p>
        </FeatureItem>
        <FeatureItem>
          <h3>GitHub Integration</h3>
          <p>Seamlessly sync your work with GitHub repositories.</p>
        </FeatureItem>
      </FeatureList>
      
      <ActionButton to="/editor">Create New Document</ActionButton>
    </HomeContainer>
  );
};

export default HomePage; 