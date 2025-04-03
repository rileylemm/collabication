import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { Octokit } from '@octokit/rest';

// Types for GitHub context
export interface User {
  login: string;
  id: number;
  name: string | null;
  email: string | null;
  avatarUrl: string;
}

export interface Repository {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  private: boolean;
  url: string;
  cloneUrl: string;
  defaultBranch: string;
}

interface GitHubContextProps {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  repositories: Repository[];
  error: string | null;
  login: () => Promise<void>;
  logout: () => void;
  fetchRepositories: () => Promise<void>;
  clearError: () => void;
}

// Create the context
const GitHubContext = createContext<GitHubContextProps>({
  isLoading: false,
  isAuthenticated: false,
  user: null,
  token: null,
  repositories: [],
  error: null,
  login: async () => {},
  logout: () => {},
  fetchRepositories: async () => {},
  clearError: () => {},
});

// GitHub provider props
interface GitHubProviderProps {
  children: ReactNode;
}

// Local storage keys
const TOKEN_KEY = 'github_token';
const USER_KEY = 'github_user';

// GitHub provider component
export const GitHubProvider: React.FC<GitHubProviderProps> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Initialize from local storage
  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    const storedUser = localStorage.getItem(USER_KEY);
    
    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch (err) {
        console.error('Failed to parse stored user:', err);
        // Clear invalid storage
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      }
    }
    
    setIsInitialized(true);
  }, []);
  
  // Check if user is authenticated
  const isAuthenticated = !!token && !!user;
  
  // Create Octokit instance when token changes
  const getOctokit = () => {
    if (!token) {
      throw new Error('No GitHub token available');
    }
    
    return new Octokit({ auth: token });
  };
  
  // Handle GitHub login
  const login = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // For a real OAuth flow, you'd redirect to GitHub and handle the callback
      // This is a simulated flow for demonstration
      const demoToken = prompt('Enter your GitHub token:');
      
      if (!demoToken) {
        throw new Error('Authentication cancelled');
      }
      
      // Initialize Octokit with the token
      const octokit = new Octokit({ auth: demoToken });
      
      // Get authenticated user
      const { data: userData } = await octokit.users.getAuthenticated();
      
      // Create user object
      const user: User = {
        login: userData.login,
        id: userData.id,
        name: userData.name,
        email: userData.email,
        avatarUrl: userData.avatar_url,
      };
      
      // Save to state and local storage
      setToken(demoToken);
      setUser(user);
      localStorage.setItem(TOKEN_KEY, demoToken);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      
      // Fetch repositories
      await fetchUserRepositories(octokit);
    } catch (err) {
      console.error('GitHub authentication failed:', err);
      setError(`Authentication failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle GitHub logout
  const logout = () => {
    setToken(null);
    setUser(null);
    setRepositories([]);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  };
  
  // Fetch user repositories
  const fetchUserRepositories = async (octokit?: Octokit) => {
    const client = octokit || getOctokit();
    
    try {
      const { data } = await client.repos.listForAuthenticatedUser({
        sort: 'updated',
        per_page: 100,
      });
      
      const repos: Repository[] = data.map(repo => ({
        id: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description,
        private: repo.private,
        url: repo.html_url,
        cloneUrl: repo.clone_url,
        defaultBranch: repo.default_branch,
      }));
      
      setRepositories(repos);
    } catch (err) {
      console.error('Failed to fetch repositories:', err);
      setError(`Failed to fetch repositories: ${err instanceof Error ? err.message : String(err)}`);
    }
  };
  
  // Fetch repositories for the authenticated user
  const fetchRepositories = async () => {
    if (!isAuthenticated) {
      setError('Not authenticated with GitHub');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      await fetchUserRepositories();
    } finally {
      setIsLoading(false);
    }
  };
  
  // Clear error
  const clearError = () => {
    setError(null);
  };
  
  // Context value
  const contextValue: GitHubContextProps = {
    isLoading,
    isAuthenticated,
    user,
    token,
    repositories,
    error,
    login,
    logout,
    fetchRepositories,
    clearError,
  };
  
  // Render provider
  return (
    <GitHubContext.Provider value={contextValue}>
      {isInitialized ? children : <div>Loading GitHub context...</div>}
    </GitHubContext.Provider>
  );
};

// Custom hook to use the GitHub context
export const useGitHub = () => useContext(GitHubContext);

export default GitHubContext; 