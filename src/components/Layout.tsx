import React, { ReactNode } from 'react';
import styled from 'styled-components';
import { useTheme } from '../contexts/ThemeContext';
import { Theme } from '../styles/theme';
import { Link, useLocation } from 'react-router-dom';

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

const Navigation = styled.nav`
  padding: 1rem;
`;

const NavList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;

const NavItem = styled.li`
  margin-bottom: 0.5rem;
`;

const NavLink = styled(Link)<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  padding: 0.5rem;
  color: ${props => props.$active ? props.theme.colors.primary : props.theme.colors.text};
  text-decoration: none;
  border-radius: ${props => props.theme.borderRadius.small};
  background-color: ${props => props.$active ? props.theme.colors.surfaceHighlight : 'transparent'};
  
  &:hover {
    background-color: ${props => props.theme.colors.surfaceHighlight};
  }
`;

const NavIcon = styled.span`
  margin-right: 0.5rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
`;

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
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
          <Navigation>
            <NavList>
              <NavItem>
                <NavLink to="/" $active={location.pathname === '/'}>
                  <NavIcon>🏠</NavIcon>
                  Home
                </NavLink>
              </NavItem>
              <NavItem>
                <NavLink to="/editor" $active={location.pathname.startsWith('/editor')}>
                  <NavIcon>📝</NavIcon>
                  Editor
                </NavLink>
              </NavItem>
              <NavItem>
                <NavLink to="/agent" $active={location.pathname.startsWith('/agent')}>
                  <NavIcon>🤖</NavIcon>
                  Agent
                </NavLink>
              </NavItem>
            </NavList>
          </Navigation>
        </Sidebar>
        <Content>{children}</Content>
      </Main>
    </LayoutContainer>
  );
};

export default Layout; 