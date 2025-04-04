import * as git from 'isomorphic-git';
import http from 'isomorphic-git/http/web';
import { Octokit } from '@octokit/rest';
import FS from '@isomorphic-git/lightning-fs';
import { Repository } from '../contexts/GitHubContext';

// Create a local filesystem for isomorphic-git
const fs = new FS('collabication-git');

// Define file status types
export type FileStatus = 'unmodified' | 'modified' | 'added' | 'deleted' | 'untracked';

export interface FileStatusInfo {
  path: string;
  status: FileStatus;
}

export interface CommitResult {
  oid: string;
  commit: {
    message: string;
    author: {
      name: string;
      email: string;
    };
    committer: {
      name: string;
      email: string;
    };
  };
}

// Pull Request types
export interface PullRequest {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed' | 'merged';
  created_at: string;
  updated_at: string;
  html_url: string;
  user: {
    login: string;
    avatar_url: string;
  };
  head: {
    ref: string;
    sha: string;
  };
  base: {
    ref: string;
    sha: string;
  };
  mergeable: boolean | null;
  merged: boolean;
  draft: boolean;
}

export interface PullRequestComment {
  id: number;
  body: string;
  created_at: string;
  updated_at: string;
  user: {
    login: string;
    avatar_url: string;
  };
}

// Helper function to initialize git configuration
const initGitConfig = async (userName: string, userEmail: string) => {
  await git.setConfig({
    fs,
    dir: '/',
    path: 'user.name',
    value: userName,
  });
  
  await git.setConfig({
    fs,
    dir: '/',
    path: 'user.email',
    value: userEmail,
  });
};

class GitHubService {
  private octokit: Octokit | null = null;
  
  // Set Octokit instance with a GitHub token
  setToken(token: string) {
    this.octokit = new Octokit({
      auth: token
    });
  }
  
  // Clear the Octokit instance when logging out
  clearToken() {
    this.octokit = null;
  }
  
  // Check if service has a valid token
  isAuthenticated(): boolean {
    return this.octokit !== null;
  }
  
  // Clone a repository from GitHub
  async cloneRepository(
    repository: Repository,
    userName: string,
    userEmail: string,
    depth: number = 1
  ): Promise<void> {
    if (!repository.cloneUrl) {
      throw new Error('Repository clone URL is not specified');
    }
    
    try {
      // Initialize git configuration
      await initGitConfig(userName, userEmail);
      
      // Create repository directory if it doesn't exist
      try {
        await fs.promises.mkdir(`/${repository.name}`);
      } catch (err) {
        // Directory might already exist
        console.log('Directory exists or error:', err);
      }
      
      // Clone the repository
      await git.clone({
        fs,
        http,
        dir: `/${repository.name}`,
        url: repository.cloneUrl,
        singleBranch: true,
        depth,
        onProgress: (progress) => {
          console.log('Clone progress:', progress);
        },
      });
      
      // Log successful clone
      console.log(`Repository ${repository.name} cloned successfully`);
    } catch (error) {
      console.error('Error cloning repository:', error);
      throw error;
    }
  }
  
  // Get repository status (modified, added, deleted files)
  async getStatus(repositoryName: string): Promise<FileStatusInfo[]> {
    try {
      const statusMatrix = await git.statusMatrix({
        fs,
        dir: `/${repositoryName}`,
      });
      
      // Map status matrix to file status information
      const result: FileStatusInfo[] = statusMatrix.map(([filepath, headStatus, workdirStatus, stageStatus]) => {
        let status: FileStatus = 'unmodified';
        
        // Using explicit number comparisons instead of type-specific comparisons
        // 0 = absent, 1 = identical to HEAD, 2 = different from HEAD
        if (Number(headStatus) === 0 && Number(workdirStatus) === 2) {
          status = 'added';
        } else if (Number(headStatus) === 0 && Number(workdirStatus) === 0) {
          status = 'deleted';
        } else if (Number(headStatus) === 2 && Number(workdirStatus) === 0) {
          status = 'deleted';
        } else if (Number(headStatus) === 2 && Number(workdirStatus) === 2 && Number(stageStatus) !== Number(workdirStatus)) {
          status = 'modified';
        } else if (Number(headStatus) === 0 && Number(workdirStatus) === 0 && Number(stageStatus) === 0) {
          status = 'untracked';
        }
        
        return {
          path: filepath,
          status,
        };
      });
      
      return result;
    } catch (error) {
      console.error('Error getting repository status:', error);
      throw error;
    }
  }
  
  // Stage a file for commit
  async addFile(repositoryName: string, filepath: string): Promise<void> {
    try {
      await git.add({
        fs,
        dir: `/${repositoryName}`,
        filepath,
      });
    } catch (error) {
      console.error('Error adding file:', error);
      throw error;
    }
  }
  
  // Commit changes to the repository
  async commit(
    repositoryName: string,
    message: string,
    author: { name: string; email: string }
  ): Promise<CommitResult> {
    try {
      const result = await git.commit({
        fs,
        dir: `/${repositoryName}`,
        message,
        author,
        committer: author,
      });
      
      return {
        oid: result,
        commit: {
          message,
          author,
          committer: author
        }
      };
    } catch (error) {
      console.error('Error committing changes:', error);
      throw error;
    }
  }
  
  // Push changes to GitHub
  async push(
    repositoryName: string,
    token: string,
    branch: string = 'main'
  ): Promise<void> {
    try {
      await git.push({
        fs,
        http,
        dir: `/${repositoryName}`,
        remote: 'origin',
        ref: branch,
        onAuth: () => ({
          username: token,
        }),
        onProgress: (progress) => {
          console.log('Push progress:', progress);
        },
      });
    } catch (error) {
      console.error('Error pushing changes:', error);
      throw error;
    }
  }
  
  // Pull latest changes from GitHub
  async pull(
    repositoryName: string,
    token: string,
    branch: string = 'main'
  ): Promise<void> {
    try {
      await git.pull({
        fs,
        http,
        dir: `/${repositoryName}`,
        remote: 'origin',
        ref: branch,
        onAuth: () => ({
          username: token,
        }),
        fastForwardOnly: true,
        onProgress: (progress) => {
          console.log('Pull progress:', progress);
        },
      });
    } catch (error) {
      console.error('Error pulling changes:', error);
      throw error;
    }
  }
  
  // Create a new branch
  async createBranch(
    repositoryName: string,
    branchName: string,
    checkout: boolean = true
  ): Promise<void> {
    try {
      await git.branch({
        fs,
        dir: `/${repositoryName}`,
        ref: branchName,
        checkout
      });
    } catch (error) {
      console.error('Error creating branch:', error);
      throw error;
    }
  }
  
  // List all branches in the repository
  async listBranches(repositoryName: string): Promise<string[]> {
    try {
      const branches = await git.listBranches({
        fs,
        dir: `/${repositoryName}`,
      });
      
      return branches;
    } catch (error) {
      console.error('Error listing branches:', error);
      throw error;
    }
  }
  
  // Read a file from the repository
  async readFile(repositoryName: string, filepath: string): Promise<string> {
    try {
      const content = await fs.promises.readFile(
        `/${repositoryName}/${filepath}`,
        { encoding: 'utf8' }
      );
      
      return content.toString();
    } catch (error) {
      console.error('Error reading file:', error);
      throw error;
    }
  }
  
  // Write content to a file in the repository
  async writeFile(
    repositoryName: string,
    filepath: string,
    content: string
  ): Promise<void> {
    try {
      // Ensure directory exists
      const directory = filepath.split('/').slice(0, -1).join('/');
      if (directory) {
        try {
          // Try to create directory without recursive option
          await fs.promises.mkdir(`/${repositoryName}/${directory}`);
        } catch (err) {
          // Directory might already exist
          console.log('Directory exists or error:', err);
        }
      }
      
      // Write file
      await fs.promises.writeFile(
        `/${repositoryName}/${filepath}`,
        content
      );
    } catch (error) {
      console.error('Error writing file:', error);
      throw error;
    }
  }
  
  // Delete a file from the repository
  async deleteFile(repositoryName: string, filepath: string): Promise<void> {
    try {
      await fs.promises.unlink(`/${repositoryName}/${filepath}`);
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }
  
  // List files in a directory
  async listFiles(repositoryName: string, directory: string = '/'): Promise<string[]> {
    try {
      const files = await fs.promises.readdir(`/${repositoryName}${directory}`);
      return files;
    } catch (error) {
      console.error('Error listing files:', error);
      throw error;
    }
  }
  
  // Check if a path is a directory
  async isDirectory(repositoryName: string, path: string): Promise<boolean> {
    try {
      const stats = await fs.promises.stat(`/${repositoryName}/${path}`);
      return stats.isDirectory();
    } catch (error) {
      console.error('Error checking if path is directory:', error);
      throw error;
    }
  }

  // Create a pull request
  async createPullRequest(
    repoOwner: string, 
    repoName: string, 
    title: string, 
    body: string, 
    head: string, 
    base: string = 'main'
  ): Promise<PullRequest> {
    if (!this.octokit) {
      throw new Error('Not authenticated with GitHub');
    }

    try {
      const { data } = await this.octokit.pulls.create({
        owner: repoOwner,
        repo: repoName,
        title,
        body,
        head,
        base,
      });

      // Use type assertion to avoid property errors
      return {
        id: data.id,
        number: data.number,
        title: data.title,
        body: data.body,
        state: data.state as 'open' | 'closed' | 'merged',
        created_at: data.created_at,
        updated_at: data.updated_at,
        html_url: data.html_url,
        user: {
          login: data.user?.login || 'unknown',
          avatar_url: data.user?.avatar_url || '',
        },
        head: {
          ref: data.head.ref,
          sha: data.head.sha,
        },
        base: {
          ref: data.base.ref,
          sha: data.base.sha,
        },
        // Use null for properties that might not exist in the response
        mergeable: null,
        merged: false,
        draft: Boolean(data.draft),
      };
    } catch (error) {
      console.error('Error creating pull request:', error);
      throw error;
    }
  }

  // List pull requests for a repository
  async listPullRequests(
    repoOwner: string, 
    repoName: string, 
    state: 'open' | 'closed' | 'all' = 'open'
  ): Promise<PullRequest[]> {
    if (!this.octokit) {
      throw new Error('Not authenticated with GitHub');
    }

    try {
      const { data } = await this.octokit.pulls.list({
        owner: repoOwner,
        repo: repoName,
        state,
        sort: 'updated',
        direction: 'desc',
      });

      return data.map(pr => ({
        id: pr.id,
        number: pr.number,
        title: pr.title,
        body: pr.body,
        state: pr.state as 'open' | 'closed' | 'merged',
        created_at: pr.created_at,
        updated_at: pr.updated_at,
        html_url: pr.html_url,
        user: {
          login: pr.user?.login || 'unknown',
          avatar_url: pr.user?.avatar_url || '',
        },
        head: {
          ref: pr.head.ref,
          sha: pr.head.sha,
        },
        base: {
          ref: pr.base.ref,
          sha: pr.base.sha,
        },
        // Use null for properties that might not exist in the response
        mergeable: null, 
        merged: false,
        draft: Boolean(pr.draft),
      }));
    } catch (error) {
      console.error('Error listing pull requests:', error);
      throw error;
    }
  }

  // Get details of a specific pull request
  async getPullRequestDetails(
    repoOwner: string, 
    repoName: string, 
    pullNumber: number
  ): Promise<PullRequest> {
    if (!this.octokit) {
      throw new Error('Not authenticated with GitHub');
    }

    try {
      const { data } = await this.octokit.pulls.get({
        owner: repoOwner,
        repo: repoName,
        pull_number: pullNumber,
      });

      // Here we can use the proper properties since this API returns the full PR details
      return {
        id: data.id,
        number: data.number,
        title: data.title,
        body: data.body,
        state: data.state as 'open' | 'closed' | 'merged',
        created_at: data.created_at,
        updated_at: data.updated_at,
        html_url: data.html_url,
        user: {
          login: data.user?.login || 'unknown',
          avatar_url: data.user?.avatar_url || '',
        },
        head: {
          ref: data.head.ref,
          sha: data.head.sha,
        },
        base: {
          ref: data.base.ref,
          sha: data.base.sha,
        },
        mergeable: data.mergeable ?? null,
        merged: Boolean(data.merged_at), // Use merged_at as indicator
        draft: Boolean(data.draft),
      };
    } catch (error) {
      console.error('Error getting pull request details:', error);
      throw error;
    }
  }

  // Get the list of files changed in a pull request
  async getPullRequestFiles(
    repoOwner: string, 
    repoName: string, 
    pullNumber: number
  ): Promise<{ filename: string; status: string; additions: number; deletions: number; }[]> {
    if (!this.octokit) {
      throw new Error('Not authenticated with GitHub');
    }

    try {
      const { data } = await this.octokit.pulls.listFiles({
        owner: repoOwner,
        repo: repoName,
        pull_number: pullNumber,
      });

      return data.map(file => ({
        filename: file.filename,
        status: file.status,
        additions: file.additions,
        deletions: file.deletions,
      }));
    } catch (error) {
      console.error('Error getting pull request files:', error);
      throw error;
    }
  }

  // Update a pull request
  async updatePullRequest(
    repoOwner: string, 
    repoName: string, 
    pullNumber: number, 
    title?: string, 
    body?: string,
    state?: 'open' | 'closed'
  ): Promise<PullRequest> {
    if (!this.octokit) {
      throw new Error('Not authenticated with GitHub');
    }

    try {
      const updateData: any = {};
      if (title !== undefined) updateData.title = title;
      if (body !== undefined) updateData.body = body;
      if (state !== undefined) updateData.state = state;

      const { data } = await this.octokit.pulls.update({
        owner: repoOwner,
        repo: repoName,
        pull_number: pullNumber,
        ...updateData,
      });

      return {
        id: data.id,
        number: data.number,
        title: data.title,
        body: data.body,
        state: data.state as 'open' | 'closed' | 'merged',
        created_at: data.created_at,
        updated_at: data.updated_at,
        html_url: data.html_url,
        user: {
          login: data.user?.login || 'unknown',
          avatar_url: data.user?.avatar_url || '',
        },
        head: {
          ref: data.head.ref,
          sha: data.head.sha,
        },
        base: {
          ref: data.base.ref,
          sha: data.base.sha,
        },
        mergeable: null,
        merged: Boolean(data.merged_at), // Use merged_at as indicator
        draft: Boolean(data.draft),
      };
    } catch (error) {
      console.error('Error updating pull request:', error);
      throw error;
    }
  }

  // Merge a pull request
  async mergePullRequest(
    repoOwner: string, 
    repoName: string, 
    pullNumber: number, 
    commitMessage?: string,
    mergeMethod: 'merge' | 'squash' | 'rebase' = 'merge'
  ): Promise<{ merged: boolean; message: string }> {
    if (!this.octokit) {
      throw new Error('Not authenticated with GitHub');
    }

    try {
      const { data } = await this.octokit.pulls.merge({
        owner: repoOwner,
        repo: repoName,
        pull_number: pullNumber,
        commit_message: commitMessage,
        merge_method: mergeMethod,
      });

      return {
        merged: data.merged,
        message: data.message,
      };
    } catch (error) {
      console.error('Error merging pull request:', error);
      throw error;
    }
  }

  // Add a comment to a pull request
  async addPullRequestComment(
    repoOwner: string, 
    repoName: string, 
    pullNumber: number, 
    body: string
  ): Promise<PullRequestComment> {
    if (!this.octokit) {
      throw new Error('Not authenticated with GitHub');
    }

    try {
      const { data } = await this.octokit.issues.createComment({
        owner: repoOwner,
        repo: repoName,
        issue_number: pullNumber,
        body,
      });

      return {
        id: data.id,
        body: data.body || '',
        created_at: data.created_at,
        updated_at: data.updated_at,
        user: {
          login: data.user?.login || 'unknown',
          avatar_url: data.user?.avatar_url || '',
        },
      };
    } catch (error) {
      console.error('Error adding pull request comment:', error);
      throw error;
    }
  }

  // List comments on a pull request
  async listPullRequestComments(
    repoOwner: string, 
    repoName: string, 
    pullNumber: number
  ): Promise<PullRequestComment[]> {
    if (!this.octokit) {
      throw new Error('Not authenticated with GitHub');
    }

    try {
      const { data } = await this.octokit.issues.listComments({
        owner: repoOwner,
        repo: repoName,
        issue_number: pullNumber,
      });

      return data.map(comment => ({
        id: comment.id,
        body: comment.body || '',
        created_at: comment.created_at,
        updated_at: comment.updated_at,
        user: {
          login: comment.user?.login || 'unknown',
          avatar_url: comment.user?.avatar_url || '',
        },
      }));
    } catch (error) {
      console.error('Error listing pull request comments:', error);
      throw error;
    }
  }
}

// Export a singleton instance
export const githubService = new GitHubService();

export default githubService; 