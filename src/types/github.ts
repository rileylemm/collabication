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

export type FileStatus = 'added' | 'modified' | 'deleted' | 'renamed' | 'unchanged';

export interface FileChange {
  path: string;
  content: string;
}

export interface CommitInfo {
  sha: string;
  message: string;
  date: string;
  author: {
    name: string;
    email: string;
    avatarUrl?: string;
  };
}

export interface BranchInfo {
  name: string;
  isDefault: boolean;
  lastCommitSha: string;
}

export interface PullRequestInfo {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed' | 'merged';
  createdAt: string;
  updatedAt: string;
  author: {
    login: string;
    avatarUrl: string;
  };
} 