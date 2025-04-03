import { createGlobalStyle } from 'styled-components';
import { Theme } from './theme';

// Define global styles for the application
const GlobalStyle = createGlobalStyle<{ theme: Theme }>`
  /* CSS Reset */
  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  /* Set base font for better consistency */
  html {
    font-size: 16px;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  /* Body styles */
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    line-height: 1.5;
    color: ${({ theme }) => theme.colors.text};
    background-color: ${({ theme }) => theme.colors.background};
    transition: ${({ theme }) => theme.transition};
    min-height: 100vh;
    width: 100%;
    overflow-x: hidden;
  }

  /* Basic element styling */
  h1, h2, h3, h4, h5, h6 {
    margin-bottom: ${({ theme }) => theme.spacing.medium};
    line-height: 1.2;
    font-weight: 600;
  }

  h1 {
    font-size: ${({ theme }) => theme.fontSizes.xxlarge};
  }

  h2 {
    font-size: ${({ theme }) => theme.fontSizes.xlarge};
  }

  h3 {
    font-size: ${({ theme }) => theme.fontSizes.large};
  }

  p {
    margin-bottom: ${({ theme }) => theme.spacing.medium};
  }

  a {
    color: ${({ theme }) => theme.colors.primary};
    text-decoration: none;
    transition: ${({ theme }) => theme.transition};

    &:hover {
      text-decoration: underline;
    }
  }

  /* Form elements */
  input, textarea, select, button {
    font-family: inherit;
    font-size: inherit;
    color: inherit;
  }

  button {
    cursor: pointer;
    border: none;
    background: none;
    
    &:disabled {
      cursor: not-allowed;
      opacity: 0.7;
    }
  }

  /* List styling */
  ul, ol {
    margin-bottom: ${({ theme }) => theme.spacing.medium};
    padding-left: ${({ theme }) => theme.spacing.large};
  }

  /* Code styling */
  code, pre {
    font-family: 'Fira Code', 'JetBrains Mono', 'Cascadia Code', Menlo, Monaco, 'Courier New', monospace;
  }

  /* Helper classes */
  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
  }

  /* Scrollbar styling */
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  ::-webkit-scrollbar-track {
    background: ${({ theme }) => theme.colors.surface};
  }

  ::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.border};
    border-radius: ${({ theme }) => theme.borderRadius.small};
  }

  ::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) => theme.colors.textSecondary};
  }
`;

export default GlobalStyle; 