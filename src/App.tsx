import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { GitHubProvider } from './contexts/GitHubContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { KeyboardShortcutsProvider } from './contexts/KeyboardShortcutsContext';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import EditorPage from './pages/EditorPage';
import NotFoundPage from './pages/NotFoundPage';
import GitHubPage from './pages/GitHubPage';
import ProjectManagementPage from './pages/ProjectManagementPage';

function App() {
  return (
    <ThemeProvider>
      <SettingsProvider>
        <KeyboardShortcutsProvider>
          <GitHubProvider>
            <Router>
              <Layout>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/editor" element={<EditorPage />} />
                  <Route path="/github" element={<GitHubPage />} />
                  <Route path="/projects" element={<ProjectManagementPage />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </Layout>
            </Router>
          </GitHubProvider>
        </KeyboardShortcutsProvider>
      </SettingsProvider>
    </ThemeProvider>
  );
}

export default App; 