import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ThemeProvider } from './contexts/ThemeContext';
import { GitHubProvider } from './contexts/GitHubContext';
import './styles/index.css';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <GitHubProvider>
          <App />
        </GitHubProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
); 