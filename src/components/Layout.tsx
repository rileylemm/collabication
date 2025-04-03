import React, { ReactNode } from 'react';
import styled from 'styled-components';
import { useTheme } from '../contexts/ThemeContext';
import { Theme } from '../styles/theme';

interface LayoutProps {
  children: ReactNode;
}

const LayoutContainer = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: ${(props: { theme: Theme }) => props.theme.colors.background};
  color: ${(props: { theme: Theme }) => props.theme.colors.text};
`;

const Header = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background-color: ${(props: { theme: Theme }) => props.theme.colors.surface};
  border-bottom: 1px solid ${(props: { theme: Theme }) => props.theme.colors.border};
`;

const AppTitle = styled.h1`
  font-size: 1.5rem;
  margin: 0;
  color: ${(props: { theme: Theme }) => props.theme.colors.primary};
`;

const Main = styled.main`
  display: flex;
  flex: 1;
`;

const Sidebar = styled.aside`
  width: 250px;
  padding: 1rem;
  background-color: ${(props: { theme: Theme }) => props.theme.colors.surface};
  border-right: 1px solid ${(props: { theme: Theme }) => props.theme.colors.border};
`;

const Content = styled.section`
  flex: 1;
  padding: 1rem;
  overflow-y: auto;
`;

const ThemeToggleButton = styled.button`
  background-color: transparent;
  border: 1px solid ${(props: { theme: Theme }) => props.theme.colors.border};
  color: ${(props: { theme: Theme }) => props.theme.colors.text};
  padding: 0.5rem 1rem;
  border-radius: ${(props: { theme: Theme }) => props.theme.borderRadius.medium};
  cursor: pointer;
  transition: ${(props: { theme: Theme }) => props.theme.transition};

  &:hover {
    background-color: ${(props: { theme: Theme }) => props.theme.colors.primary};
    color: white;
  }
`;

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <LayoutContainer>
      <Header>
        <AppTitle>Collabication</AppTitle>
        <ThemeToggleButton onClick={toggleTheme}>
          {theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}
        </ThemeToggleButton>
      </Header>
      <Main>
        <Sidebar>
          {/* Sidebar content will be added later */}
          <p>Sidebar placeholder</p>
        </Sidebar>
        <Content>{children}</Content>
      </Main>
    </LayoutContainer>
  );
};

export default Layout; 