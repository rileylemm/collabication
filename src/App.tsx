import React from 'react';
import { BrowserRouter as Router, Routes, Route, Outlet } from 'react-router-dom';
import { ThemeProvider as StyledThemeProvider } from 'styled-components';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { darkTheme, lightTheme, Theme } from './styles/theme';
import GlobalStyle from './styles/GlobalStyle';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import EditorPage from './pages/EditorPage';
import GitHubPage from './pages/GitHubPage';
import NotFoundPage from './pages/NotFoundPage';
import { GitHubProvider } from './contexts/GitHubContext';

const AppContent = () => {
  const { theme } = useTheme();
  const currentTheme: Theme = theme === 'dark' ? darkTheme : lightTheme;

  return (
    <StyledThemeProvider theme={currentTheme}>
      <GlobalStyle />
      <Routes>
        <Route path="/" element={<Layout><Outlet /></Layout>}>
          <Route index element={<HomePage />} />
          <Route path="editor" element={<EditorPage />} />
          <Route path="github" element={<GitHubPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </StyledThemeProvider>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <GitHubProvider>
        <Router>
          <AppContent />
        </Router>
      </GitHubProvider>
    </ThemeProvider>
  );
};

export default App; 