import React from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { Theme } from '../styles/theme';

const NotFoundContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 70vh;
  text-align: center;
  padding: 0 2rem;
`;

const NotFoundTitle = styled.h1`
  font-size: 8rem;
  margin: 0;
  color: ${props => props.theme.colors.primary};
  opacity: 0.5;
`;

const NotFoundSubtitle = styled.h2`
  font-size: 2rem;
  margin-bottom: 2rem;
  color: ${props => props.theme.colors.textSecondary};
`;

const NotFoundText = styled.p`
  font-size: 1.2rem;
  margin-bottom: 2rem;
  max-width: 500px;
`;

const HomeButton = styled(Link)`
  display: inline-block;
  padding: 0.75rem 1.5rem;
  background-color: ${props => props.theme.colors.primary};
  color: white;
  text-decoration: none;
  border-radius: ${props => props.theme.borderRadius.medium};
  font-weight: bold;
  transition: ${props => props.theme.transition};

  &:hover {
    background-color: ${props => props.theme.colors.secondary};
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }
`;

const NotFoundPage: React.FC = () => {
  return (
    <NotFoundContainer>
      <NotFoundTitle>404</NotFoundTitle>
      <NotFoundSubtitle>Page Not Found</NotFoundSubtitle>
      <NotFoundText>
        The page you are looking for might have been removed, had its name changed,
        or is temporarily unavailable.
      </NotFoundText>
      <HomeButton to="/">Return to Home</HomeButton>
    </NotFoundContainer>
  );
};

export default NotFoundPage; 