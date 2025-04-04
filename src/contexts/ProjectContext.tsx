import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Types for Project context
export interface Project {
  id: string;
  name: string;
  description?: string;
  repositoryName?: string;
  lastModified: Date;
  createdAt: Date;
}

export interface ProjectContextProps {
  projects: Project[];
  currentProject: Project | null;
  isLoading: boolean;
  error: string | null;
  createProject: (name: string, description?: string, repositoryName?: string) => Promise<Project>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<boolean>;
  deleteProject: (id: string) => Promise<boolean>;
  setCurrentProject: (project: Project | null) => void;
  clearError: () => void;
}

// Create the context
const ProjectContext = createContext<ProjectContextProps>({
  projects: [],
  currentProject: null,
  isLoading: false,
  error: null,
  createProject: async () => ({ id: '', name: '', lastModified: new Date(), createdAt: new Date() }),
  updateProject: async () => false,
  deleteProject: async () => false,
  setCurrentProject: () => {},
  clearError: () => {},
});

// Project provider props
interface ProjectProviderProps {
  children: ReactNode;
}

// Local storage key
const PROJECTS_KEY = 'projects';
const CURRENT_PROJECT_KEY = 'current_project';

// Project provider component
export const ProjectProvider: React.FC<ProjectProviderProps> = ({ children }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Initialize from local storage
  useEffect(() => {
    try {
      // Load projects
      const storedProjects = localStorage.getItem(PROJECTS_KEY);
      if (storedProjects) {
        const parsedProjects = JSON.parse(storedProjects);
        // Convert string dates to Date objects
        const projectsWithDates = parsedProjects.map((project: any) => ({
          ...project,
          lastModified: new Date(project.lastModified),
          createdAt: new Date(project.createdAt),
        }));
        setProjects(projectsWithDates);
      }
      
      // Load current project
      const storedCurrentProject = localStorage.getItem(CURRENT_PROJECT_KEY);
      if (storedCurrentProject) {
        const parsedCurrentProject = JSON.parse(storedCurrentProject);
        setCurrentProject({
          ...parsedCurrentProject,
          lastModified: new Date(parsedCurrentProject.lastModified),
          createdAt: new Date(parsedCurrentProject.createdAt),
        });
      }
    } catch (err) {
      console.error('Failed to load projects from storage:', err);
      setError(`Failed to load projects: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, []);
  
  // Save projects to local storage
  useEffect(() => {
    if (projects.length > 0) {
      localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
    }
  }, [projects]);
  
  // Save current project to local storage
  useEffect(() => {
    if (currentProject) {
      localStorage.setItem(CURRENT_PROJECT_KEY, JSON.stringify(currentProject));
    } else {
      localStorage.removeItem(CURRENT_PROJECT_KEY);
    }
  }, [currentProject]);
  
  // Create a new project
  const createProject = async (
    name: string,
    description?: string,
    repositoryName?: string
  ): Promise<Project> => {
    setIsLoading(true);
    try {
      const newProject: Project = {
        id: Date.now().toString(),
        name,
        description,
        repositoryName,
        lastModified: new Date(),
        createdAt: new Date(),
      };
      
      setProjects(prev => [...prev, newProject]);
      setCurrentProject(newProject);
      return newProject;
    } catch (err) {
      console.error('Failed to create project:', err);
      setError(`Failed to create project: ${err instanceof Error ? err.message : String(err)}`);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Update an existing project
  const updateProject = async (id: string, updates: Partial<Project>): Promise<boolean> => {
    setIsLoading(true);
    try {
      const projectIndex = projects.findIndex(p => p.id === id);
      if (projectIndex === -1) {
        throw new Error(`Project with ID ${id} not found`);
      }
      
      const updatedProject = {
        ...projects[projectIndex],
        ...updates,
        lastModified: new Date(),
      };
      
      const updatedProjects = [...projects];
      updatedProjects[projectIndex] = updatedProject;
      
      setProjects(updatedProjects);
      
      // Update current project if it's the same one
      if (currentProject && currentProject.id === id) {
        setCurrentProject(updatedProject);
      }
      
      return true;
    } catch (err) {
      console.error('Failed to update project:', err);
      setError(`Failed to update project: ${err instanceof Error ? err.message : String(err)}`);
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Delete a project
  const deleteProject = async (id: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const updatedProjects = projects.filter(p => p.id !== id);
      setProjects(updatedProjects);
      
      // Clear current project if it's the one being deleted
      if (currentProject && currentProject.id === id) {
        setCurrentProject(null);
      }
      
      return true;
    } catch (err) {
      console.error('Failed to delete project:', err);
      setError(`Failed to delete project: ${err instanceof Error ? err.message : String(err)}`);
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Clear error
  const clearError = () => {
    setError(null);
  };
  
  // Context value
  const contextValue: ProjectContextProps = {
    projects,
    currentProject,
    isLoading,
    error,
    createProject,
    updateProject,
    deleteProject,
    setCurrentProject,
    clearError,
  };
  
  return (
    <ProjectContext.Provider value={contextValue}>
      {children}
    </ProjectContext.Provider>
  );
};

// Custom hook to use the Project context
export const useProject = () => useContext(ProjectContext);

export default ProjectContext; 