import { githubService, CommitInfo, FileStatusInfo } from './githubService';

// Define types for search results from different sources
export interface FileSearchResult {
  type: 'file';
  repository: string;
  path: string;
  line: number;
  column: number;
  text: string;
  matchedText: string;
  snippet: string;
}

export interface CommitSearchResult {
  type: 'commit';
  repository: string;
  commitId: string;
  message: string;
  author: string;
  date: number;
  matchedText: string;
}

export interface FileNameSearchResult {
  type: 'filename';
  repository: string;
  path: string;
  matchedText: string;
}

// Union type for all search result types
export type SearchResult = FileSearchResult | CommitSearchResult | FileNameSearchResult;

// Search filters
export interface SearchFilters {
  includeFiles: boolean;
  includeCommits: boolean;
  includeFileNames: boolean;
  caseSensitive: boolean;
  useRegex: boolean;
  fileExtensions?: string[];
  maxResults?: number;
}

// Default search filters
const defaultSearchFilters: SearchFilters = {
  includeFiles: true,
  includeCommits: true,
  includeFileNames: true,
  caseSensitive: false,
  useRegex: false,
  maxResults: 100,
};

class UnifiedSearchService {
  /**
   * Search across different content types in a repository
   */
  async search(
    repositoryName: string,
    query: string,
    filters: Partial<SearchFilters> = {}
  ): Promise<SearchResult[]> {
    // Merge provided filters with defaults
    const effectiveFilters: SearchFilters = {
      ...defaultSearchFilters,
      ...filters,
    };

    // Create a regex from the query string based on filters
    let searchRegex: RegExp;
    try {
      if (effectiveFilters.useRegex) {
        searchRegex = new RegExp(
          query,
          effectiveFilters.caseSensitive ? 'g' : 'gi'
        );
      } else {
        // Escape special regex characters for literal string search
        const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        searchRegex = new RegExp(
          escapedQuery,
          effectiveFilters.caseSensitive ? 'g' : 'gi'
        );
      }
    } catch (error) {
      console.error('Invalid regex pattern:', error);
      throw new Error('Invalid search pattern');
    }

    // Array to store all search results
    const results: SearchResult[] = [];

    // Perform searches based on filters
    const searchPromises: Promise<void>[] = [];

    // Search file contents
    if (effectiveFilters.includeFiles) {
      searchPromises.push(this.searchFileContents(repositoryName, searchRegex, effectiveFilters, results));
    }

    // Search file names
    if (effectiveFilters.includeFileNames) {
      searchPromises.push(this.searchFileNames(repositoryName, searchRegex, results));
    }

    // Search commits
    if (effectiveFilters.includeCommits) {
      searchPromises.push(this.searchCommits(repositoryName, searchRegex, results));
    }

    // Wait for all searches to complete
    await Promise.all(searchPromises);

    // Sort results by relevance (for now, just alphabetically by path/message)
    results.sort((a, b) => {
      if (a.type === 'file' && b.type === 'file') {
        return a.path.localeCompare(b.path);
      } else if (a.type === 'commit' && b.type === 'commit') {
        // Sort commits by date (newest first)
        return b.date - a.date;
      } else if (a.type === 'filename' && b.type === 'filename') {
        return a.path.localeCompare(b.path);
      }
      // Sort different types (files first, then filenames, then commits)
      const typeOrder = { file: 0, filename: 1, commit: 2 };
      return typeOrder[a.type] - typeOrder[b.type];
    });

    // Limit the number of results if specified
    if (effectiveFilters.maxResults && results.length > effectiveFilters.maxResults) {
      return results.slice(0, effectiveFilters.maxResults);
    }

    return results;
  }

  /**
   * Search for matches in file contents
   */
  private async searchFileContents(
    repositoryName: string,
    searchRegex: RegExp,
    filters: SearchFilters,
    results: SearchResult[]
  ): Promise<void> {
    try {
      // Get the list of all files in the repository
      const allFiles = await this.listAllFiles(repositoryName, '/');

      // Filter files by extension if specified
      const filteredFiles = filters.fileExtensions?.length
        ? allFiles.filter(file => {
            const extension = file.split('.').pop()?.toLowerCase();
            return extension && filters.fileExtensions?.includes(extension);
          })
        : allFiles;

      // Search through each file's content
      const fileSearchPromises = filteredFiles.map(async (filePath) => {
        try {
          const content = await githubService.readFile(repositoryName, filePath);
          const lines = content.split('\n');

          // Search for matches in each line
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            searchRegex.lastIndex = 0; // Reset regex for each line
            
            let match;
            while ((match = searchRegex.exec(line)) !== null) {
              // Create a snippet with context (a few lines before and after)
              const startLine = Math.max(0, i - 2);
              const endLine = Math.min(lines.length - 1, i + 2);
              const snippet = lines.slice(startLine, endLine + 1).join('\n');

              results.push({
                type: 'file',
                repository: repositoryName,
                path: filePath,
                line: i + 1, // 1-based line numbering
                column: match.index + 1, // 1-based column numbering
                text: line,
                matchedText: match[0],
                snippet,
              });
            }
          }
        } catch (error) {
          console.warn(`Could not search file ${filePath}:`, error);
        }
      });

      await Promise.all(fileSearchPromises);
    } catch (error) {
      console.error('Error searching file contents:', error);
    }
  }

  /**
   * Search for matches in file names
   */
  private async searchFileNames(
    repositoryName: string,
    searchRegex: RegExp,
    results: SearchResult[]
  ): Promise<void> {
    try {
      // Get the list of all files in the repository
      const allFiles = await this.listAllFiles(repositoryName, '/');

      // Search for matches in file names
      for (const filePath of allFiles) {
        searchRegex.lastIndex = 0; // Reset regex for each file
        
        const match = searchRegex.exec(filePath);
        if (match) {
          results.push({
            type: 'filename',
            repository: repositoryName,
            path: filePath,
            matchedText: match[0],
          });
        }
      }
    } catch (error) {
      console.error('Error searching file names:', error);
    }
  }

  /**
   * Search for matches in commit messages
   */
  private async searchCommits(
    repositoryName: string,
    searchRegex: RegExp,
    results: SearchResult[]
  ): Promise<void> {
    try {
      // Get commit history for the repository
      const commits = await githubService.getCommitHistory(repositoryName, 'HEAD', 100);

      // Search for matches in commit messages
      for (const commit of commits) {
        searchRegex.lastIndex = 0; // Reset regex for each commit
        
        const match = searchRegex.exec(commit.message);
        if (match) {
          results.push({
            type: 'commit',
            repository: repositoryName,
            commitId: commit.oid,
            message: commit.message,
            author: commit.author.name,
            date: commit.author.timestamp,
            matchedText: match[0],
          });
        }
      }
    } catch (error) {
      console.error('Error searching commits:', error);
    }
  }

  /**
   * Recursively list all files in a repository
   */
  private async listAllFiles(
    repositoryName: string,
    directory: string,
    fileList: string[] = []
  ): Promise<string[]> {
    try {
      const files = await githubService.listFiles(repositoryName, directory);

      const fileListPromises = files.map(async (file) => {
        const path = directory === '/' ? `/${file}` : `${directory}/${file}`;
        
        // Check if this is a directory
        const isDir = await githubService.isDirectory(repositoryName, path);
        
        if (isDir) {
          // Recursively list files in subdirectory
          await this.listAllFiles(repositoryName, path, fileList);
        } else {
          // Add file to the list
          fileList.push(path.startsWith('/') ? path.slice(1) : path);
        }
      });

      await Promise.all(fileListPromises);
      return fileList;
    } catch (error) {
      console.error(`Error listing files in ${directory}:`, error);
      return fileList;
    }
  }
}

// Export a singleton instance
export const unifiedSearchService = new UnifiedSearchService();
export default unifiedSearchService; 