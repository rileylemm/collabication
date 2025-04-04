import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { ThemeProvider as StyledThemeProvider } from 'styled-components';
import { useTheme } from './contexts/ThemeContext';
import { darkTheme, lightTheme } from './styles/theme';
import GlobalStyle from './styles/GlobalStyle';

// Import pages
import HomePage from './pages/HomePage';
import EditorPage from './pages/EditorPage';
import NotFoundPage from './pages/NotFoundPage';

// Import components
import Layout from './components/Layout';

const App: React.FC = () => {
  const { theme } = useTheme();
  const currentTheme = theme === 'dark' ? darkTheme : lightTheme;

  return (
    <StyledThemeProvider theme={currentTheme}>
      <GlobalStyle theme={currentTheme} />
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/editor/:documentId?" element={<EditorPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Layout>
    </StyledThemeProvider>
  );
};

export default App; 