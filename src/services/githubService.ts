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

// Add a new interface for file differences
export interface FileDiff {
  path: string;
  oldFile: string;
  newFile: string;
  changes: Array<{
    type: 'added' | 'removed' | 'unchanged';
    content: string;
    lineNumber: {
      old: number | null;
      new: number | null;
    };
  }>;
}

// Add a new interface for commit history
export interface CommitInfo {
  oid: string;
  message: string;
  author: {
    name: string;
    email: string;
    timestamp: number;
  };
  committer: {
    name: string;
    email: string;
    timestamp: number;
  };
  files?: string[]; // Files changed in this commit
  parentSHA?: string; // The parent commit SHA
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

  // Get the diff between two strings
  private computeDiff(oldStr: string, newStr: string): Array<{
    type: 'added' | 'removed' | 'unchanged';
    content: string;
    lineNumber: { old: number | null; new: number | null };
  }> {
    // Split both strings into lines
    const oldLines = oldStr.split('\n');
    const newLines = newStr.split('\n');
    
    const changes: Array<{
      type: 'added' | 'removed' | 'unchanged';
      content: string;
      lineNumber: { old: number | null; new: number | null };
    }> = [];
    
    // Simple diff algorithm (this can be improved for better accuracy)
    let oldIndex = 0;
    let newIndex = 0;
    
    // Maximum number of lines to look ahead for finding matches
    const lookAhead = 10;
    
    while (oldIndex < oldLines.length || newIndex < newLines.length) {
      if (oldIndex < oldLines.length && newIndex < newLines.length && oldLines[oldIndex] === newLines[newIndex]) {
        // Lines are the same, mark as unchanged
        changes.push({
          type: 'unchanged',
          content: oldLines[oldIndex],
          lineNumber: {
            old: oldIndex + 1,
            new: newIndex + 1
          }
        });
        oldIndex++;
        newIndex++;
      } else {
        // Lines differ, look ahead to see if we can find a match
        let foundMatch = false;
        let oldLookAhead = 0;
        let newLookAhead = 0;
        
        // Look ahead in the new file for a match with the current old line
        for (let i = 1; i <= lookAhead && newIndex + i < newLines.length; i++) {
          if (oldLines[oldIndex] === newLines[newIndex + i]) {
            foundMatch = true;
            newLookAhead = i;
            break;
          }
        }
        
        // Look ahead in the old file for a match with the current new line
        for (let i = 1; i <= lookAhead && oldIndex + i < oldLines.length; i++) {
          if (oldLines[oldIndex + i] === newLines[newIndex]) {
            // If we already found a match in the new file, use the shorter path
            if (foundMatch && i >= newLookAhead) break;
            
            foundMatch = true;
            oldLookAhead = i;
            newLookAhead = 0;
            break;
          }
        }
        
        // Add the removed lines
        for (let i = 0; i < oldLookAhead; i++) {
          changes.push({
            type: 'removed',
            content: oldLines[oldIndex + i],
            lineNumber: {
              old: oldIndex + i + 1,
              new: null
            }
          });
        }
        
        // Add the added lines
        for (let i = 0; i < newLookAhead; i++) {
          changes.push({
            type: 'added',
            content: newLines[newIndex + i],
            lineNumber: {
              old: null,
              new: newIndex + i + 1
            }
          });
        }
        
        // Update the indices
        if (oldLookAhead > 0) {
          oldIndex += oldLookAhead;
        } else if (newLookAhead > 0) {
          newIndex += newLookAhead;
        } else {
          // If no match found, assume the line was changed
          if (oldIndex < oldLines.length) {
            changes.push({
              type: 'removed',
              content: oldLines[oldIndex],
              lineNumber: {
                old: oldIndex + 1,
                new: null
              }
            });
            oldIndex++;
          }
          
          if (newIndex < newLines.length) {
            changes.push({
              type: 'added',
              content: newLines[newIndex],
              lineNumber: {
                old: null,
                new: newIndex + 1
              }
            });
            newIndex++;
          }
        }
      }
    }
    
    return changes;
  }
  
  // Get diff between working directory and HEAD for a file
  async getUncommittedDiff(repositoryName: string, filepath: string): Promise<FileDiff> {
    try {
      // Get the file content from HEAD
      let oldContent = '';
      try {
        const result = await git.readBlob({
          fs,
          dir: `/${repositoryName}`,
          oid: 'HEAD',
          filepath
        });
        // Correctly access the blob data
        oldContent = Buffer.from(result.blob).toString('utf8');
      } catch (error) {
        // File might not exist in HEAD (new file)
        oldContent = '';
      }
      
      // Get the file content from working directory
      let newContent = '';
      try {
        newContent = await this.readFile(repositoryName, filepath);
      } catch (error) {
        // File might be deleted in working directory
        newContent = '';
      }
      
      // Compute the diff
      const changes = this.computeDiff(oldContent, newContent);
      
      return {
        path: filepath,
        oldFile: oldContent,
        newFile: newContent,
        changes
      };
    } catch (error) {
      console.error('Error getting uncommitted diff:', error);
      throw error;
    }
  }
  
  // Get diff between two commits for a file
  async getCommitDiff(
    repositoryName: string, 
    filepath: string, 
    oldCommit: string, 
    newCommit: string
  ): Promise<FileDiff> {
    try {
      // Get the file content from old commit
      let oldContent = '';
      try {
        const result = await git.readBlob({
          fs,
          dir: `/${repositoryName}`,
          oid: oldCommit,
          filepath
        });
        // Correctly access the blob data
        oldContent = Buffer.from(result.blob).toString('utf8');
      } catch (error) {
        // File might not exist in old commit
        oldContent = '';
      }
      
      // Get the file content from new commit
      let newContent = '';
      try {
        const result = await git.readBlob({
          fs,
          dir: `/${repositoryName}`,
          oid: newCommit,
          filepath
        });
        // Correctly access the blob data
        newContent = Buffer.from(result.blob).toString('utf8');
      } catch (error) {
        // File might not exist in new commit
        newContent = '';
      }
      
      // Compute the diff
      const changes = this.computeDiff(oldContent, newContent);
      
      return {
        path: filepath,
        oldFile: oldContent,
        newFile: newContent,
        changes
      };
    } catch (error) {
      console.error('Error getting commit diff:', error);
      throw error;
    }
  }
  
  // Get diff between two branches for a file
  async getBranchDiff(
    repositoryName: string,
    filepath: string,
    baseBranch: string,
    compareBranch: string
  ): Promise<FileDiff> {
    try {
      // Get the commit SHA for the base branch
      const baseRef = await git.resolveRef({
        fs,
        dir: `/${repositoryName}`,
        ref: baseBranch
      });
      
      // Get the commit SHA for the compare branch
      const compareRef = await git.resolveRef({
        fs,
        dir: `/${repositoryName}`,
        ref: compareBranch
      });
      
      // Use the commit diff method to get the diff
      return this.getCommitDiff(repositoryName, filepath, baseRef, compareRef);
    } catch (error) {
      console.error('Error getting branch diff:', error);
      throw error;
    }
  }
  
  // Get a list of files modified between two commits
  async getModifiedFiles(
    repositoryName: string,
    oldCommit: string,
    newCommit: string
  ): Promise<string[]> {
    try {
      const results = await git.walk({
        fs,
        dir: `/${repositoryName}`,
        trees: [git.TREE({ ref: oldCommit }), git.TREE({ ref: newCommit })],
        map: async (filepath, [oldTree, newTree]) => {
          // Skip directories
          if (filepath === '.') return;
          
          // If either is null or they don't match, the file was changed
          if (!oldTree || !newTree || oldTree.oid !== newTree.oid) {
            return filepath;
          }
          return;
        }
      });
      
      // Filter out undefined values and return the list of modified files
      return results.filter(Boolean) as string[];
    } catch (error) {
      console.error('Error getting modified files:', error);
      throw error;
    }
  }

  // Get commit history for a repository
  async getCommitHistory(
    repositoryName: string,
    branch: string = 'main',
    depth: number = 20,
    filePath?: string
  ): Promise<CommitInfo[]> {
    try {
      // Get the commit log
      const commits = await git.log({
        fs,
        dir: `/${repositoryName}`,
        ref: branch,
        depth,
        filepath: filePath,
      });
      
      // Get details for each commit
      const commitDetails: CommitInfo[] = [];
      
      for (const commit of commits) {
        // For each commit, get the list of files changed
        let files: string[] = [];
        
        if (commit.oid && commit.commit.parent && commit.commit.parent.length > 0) {
          try {
            // Get files changed between this commit and its parent
            const parentSha = commit.commit.parent[0];
            files = await this.getModifiedFiles(repositoryName, parentSha, commit.oid);
          } catch (error) {
            console.error('Error getting modified files for commit:', error);
          }
        }
        
        const commitInfo: CommitInfo = {
          oid: commit.oid,
          message: commit.commit.message,
          author: {
            name: commit.commit.author.name,
            email: commit.commit.author.email,
            timestamp: commit.commit.author.timestamp,
          },
          committer: {
            name: commit.commit.committer.name,
            email: commit.commit.committer.email,
            timestamp: commit.commit.committer.timestamp,
          },
          files,
          parentSHA: commit.commit.parent && commit.commit.parent.length > 0 
            ? commit.commit.parent[0] 
            : undefined,
        };
        
        commitDetails.push(commitInfo);
      }
      
      return commitDetails;
    } catch (error) {
      console.error('Error getting commit history:', error);
      throw error;
    }
  }
  
  // Get details for a specific commit
  async getCommitDetails(
    repositoryName: string,
    commitSha: string
  ): Promise<CommitInfo> {
    try {
      // Read the commit object with proper type handling
      const result = await git.readObject({
        fs,
        dir: `/${repositoryName}`,
        oid: commitSha,
        format: 'parsed',
      });
      
      // Check if the result is a commit object
      if (result.type !== 'commit') {
        throw new Error(`Object ${commitSha} is not a commit`);
      }
      
      // Use type assertion to treat the object as a CommitObject
      // This approach works because we've already verified result.type === 'commit'
      const commitObject = result.object as {
        message: string;
        author: {
          name: string;
          email: string;
          timestamp: number;
        };
        committer: {
          name: string;
          email: string;
          timestamp: number;
        };
        parent: string[];
      };
      
      // Get files changed in this commit
      let files: string[] = [];
      if (commitObject.parent && commitObject.parent.length > 0) {
        try {
          // Get files changed between this commit and its parent
          const parentSha = commitObject.parent[0];
          files = await this.getModifiedFiles(repositoryName, parentSha, commitSha);
        } catch (error) {
          console.error('Error getting modified files for commit:', error);
        }
      }
      
      return {
        oid: commitSha,
        message: commitObject.message,
        author: {
          name: commitObject.author.name,
          email: commitObject.author.email,
          timestamp: commitObject.author.timestamp,
        },
        committer: {
          name: commitObject.committer.name,
          email: commitObject.committer.email,
          timestamp: commitObject.committer.timestamp,
        },
        files,
        parentSHA: commitObject.parent && commitObject.parent.length > 0 
          ? commitObject.parent[0] 
          : undefined,
      };
    } catch (error) {
      console.error('Error getting commit details:', error);
      throw error;
    }
  }
  
  // Check out a specific commit
  async checkoutCommit(
    repositoryName: string,
    commitSha: string
  ): Promise<void> {
    try {
      await git.checkout({
        fs,
        dir: `/${repositoryName}`,
        ref: commitSha,
      });
    } catch (error) {
      console.error('Error checking out commit:', error);
      throw error;
    }
  }
  
  // Get commit message
  async getCommitMessage(
    repositoryName: string,
    commitSha: string
  ): Promise<string> {
    try {
      const commitInfo = await this.getCommitDetails(repositoryName, commitSha);
      return commitInfo.message;
    } catch (error) {
      console.error('Error getting commit message:', error);
      throw error;
    }
  }
  
  // Check out a specific branch
  async checkoutBranch(
    repositoryName: string,
    branchName: string
  ): Promise<void> {
    try {
      await git.checkout({
        fs,
        dir: `/${repositoryName}`,
        ref: branchName,
      });
    } catch (error) {
      console.error('Error checking out branch:', error);
      throw error;
    }
  }
  
  // Delete a branch
  async deleteBranch(
    repositoryName: string,
    branchName: string
  ): Promise<void> {
    try {
      await git.deleteBranch({
        fs,
        dir: `/${repositoryName}`,
        ref: branchName,
      });
    } catch (error) {
      console.error('Error deleting branch:', error);
      throw error;
    }
  }
  
  // Get current branch name
  async getCurrentBranch(
    repositoryName: string
  ): Promise<string> {
    try {
      const currentBranch = await git.currentBranch({
        fs,
        dir: `/${repositoryName}`,
        fullname: false,
      });
      
      return currentBranch || 'HEAD';
    } catch (error) {
      console.error('Error getting current branch:', error);
      throw error;
    }
  }
}

// Export a singleton instance
export const githubService = new GitHubService();

export default githubService; 