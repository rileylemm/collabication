# Collabication User Guide

This comprehensive guide will help you get the most out of the Collabication application, a powerful collaborative editing platform with AI assistance and GitHub integration.

## Table of Contents

- [Getting Started](#getting-started)
- [User Interface Overview](#user-interface-overview)
- [Document Editing](#document-editing)
- [Working with Git and GitHub](#working-with-git-and-github)
- [Using AI Assistance](#using-ai-assistance)
- [Real-time Collaboration](#real-time-collaboration)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Settings and Preferences](#settings-and-preferences)
- [Troubleshooting](#troubleshooting)

## Getting Started

### Installation

Please refer to the [Installation Guide](./INSTALLATION.md) for detailed setup instructions.

### First Launch

1. When you first launch Collabication, you'll be greeted with a welcome screen.
2. You'll need to sign in with your GitHub account to enable repository synchronization.
3. After signing in, you can either:
   - Create a new project
   - Open an existing project from your local machine
   - Clone a repository from GitHub

### Creating Your First Project

1. Click on "Create New Project" from the welcome screen.
2. Choose a project name and location on your machine.
3. Select a project type (document-based, code-based, or mixed).
4. Click "Create" to initialize your project.

## User Interface Overview

### Main Interface Components

Collabication's interface consists of several key areas:

1. **File Browser**: Located on the left side, shows all files in your current project.
2. **Editor Area**: The central portion where you edit your documents and code.
3. **Agent Panel**: On the right side, provides AI assistance and contextual suggestions.
4. **Git Panel**: Shows Git status, branch information, and commit history.
5. **Status Bar**: At the bottom, displays current document information, Git status, and collaboration status.

### Navigation

- Use the **File Browser** to navigate between files.
- Use the **Tabs** at the top of the editor to switch between open files.
- Use `Cmd/Ctrl+P` to quickly find and open files by name.
- Use `Cmd/Ctrl+Shift+F` to search across all files in your project.

## Document Editing

### Supported File Types

Collabication supports a wide range of file types:

- **Markdown** (.md) - With real-time preview
- **Code** (various languages with syntax highlighting)
- **Text** (.txt)
- **Rich Text** (.rtf)

### Markdown Editing

1. Create or open a Markdown file (.md extension).
2. Use the split view to see your Markdown rendered in real time:
   - Click the "Split View" button in the upper right of the editor.
   - Or use the keyboard shortcut `Cmd/Ctrl+Alt+P`.

### Code Editing

The code editor includes:

- Syntax highlighting for over 40 programming languages
- Intelligent auto-completion
- Error and warning highlighting
- Code folding
- Indentation guides

### Rich Text Features

When editing rich text documents:

1. Use the formatting toolbar to adjust text style, size, and color.
2. Insert images by dragging and dropping or using the Insert menu.
3. Add tables using the Table menu.

## Working with Git and GitHub

### Repository Setup

1. **Clone a Repository**:
   - Click "Clone Repository" from the welcome screen or File menu.
   - Enter the GitHub repository URL.
   - Choose a local directory to store the repository.

2. **Initialize Git in an Existing Project**:
   - Open the project in Collabication.
   - Click "Initialize Git Repository" from the Git menu.

### Basic Git Operations

#### Viewing File Status

- Files in the **File Browser** display icons indicating their Git status:
  - 🟢 Modified
  - 🟡 New/untracked
  - 🔴 Deleted
  - ✅ Committed

#### Committing Changes

1. Save your changes (`Cmd/Ctrl+S`).
2. Open the Git panel by clicking the Git icon in the sidebar.
3. Review changed files.
4. Enter a commit message.
5. Click "Commit" to commit your changes.

#### Branch Management

Use the Branch Manager to:

1. View the current branch.
2. Switch between branches using the dropdown.
3. Create new branches by clicking "New Branch".
4. Delete branches by selecting one and clicking "Delete".

#### Viewing Commit History

1. Open the Git panel.
2. Click the "History" tab to see a chronological list of commits.
3. Click on any commit to see the changes it introduced.
4. Use the "Compare" button to view differences between any two commits.

#### Resolving Conflicts

When conflicts occur during pulls or merges:

1. Conflict markers will appear in affected files.
2. Use the conflict resolution UI to choose which changes to keep.
3. Save the file after resolving all conflicts.
4. Commit the resolved changes.

## Using AI Assistance

### Conversational AI

1. Open the Agent panel by clicking the AI icon in the sidebar.
2. Type your questions or requests in the chat input.
3. The AI will respond with suggestions, explanations, or generated content.

### Context-Aware Help

The AI assistant is aware of your current file and project context. You can ask about:

- Code explanations
- Documentation suggestions
- Refactoring ideas
- Bug fixing assistance

### Code Generation

To generate code with the AI:

1. Describe what you need in the Agent panel.
2. The AI will suggest relevant code.
3. Click "Insert" to add the code at your current cursor position.
4. Modify as needed after insertion.

### Document Enhancement

For document improvement:

1. Select text or position your cursor where you need help.
2. Ask the AI to enhance, explain, or rewrite the content.
3. Review and accept or modify the suggestions.

## Real-time Collaboration

### Starting a Collaboration Session

1. Click the "Collaborate" button in the toolbar.
2. Choose whether to create a new session or join an existing one.
3. If creating a new session:
   - Set permissions (view-only or edit).
   - Copy the invitation link to share with collaborators.

### Collaboration Features

- **Cursor Tracking**: See where other users are working in real time.
- **Edit Synchronization**: All changes are synced instantly.
- **Chat**: Communicate with collaborators via the built-in chat panel.
- **User Presence**: See who is currently active in the session.

### Permissions and Access Control

- **Session Owner**: Can manage participants and their permissions.
- **Editor Role**: Can make changes to documents.
- **Viewer Role**: Can only view documents without editing.

## Keyboard Shortcuts

Collabication offers numerous keyboard shortcuts to enhance productivity. View all shortcuts by pressing `F1` or selecting "Keyboard Shortcuts" from the Help menu.

### General Shortcuts

| Action | Windows/Linux | macOS |
|--------|---------------|-------|
| New File | `Ctrl+N` | `Cmd+N` |
| Open File | `Ctrl+O` | `Cmd+O` |
| Save | `Ctrl+S` | `Cmd+S` |
| Save As | `Ctrl+Shift+S` | `Cmd+Shift+S` |
| Find | `Ctrl+F` | `Cmd+F` |
| Replace | `Ctrl+H` | `Cmd+H` |
| Undo | `Ctrl+Z` | `Cmd+Z` |
| Redo | `Ctrl+Y` | `Cmd+Shift+Z` |

### Git Shortcuts

| Action | Windows/Linux | macOS |
|--------|---------------|-------|
| Commit | `Ctrl+Alt+C` | `Cmd+Alt+C` |
| Pull | `Ctrl+Alt+P` | `Cmd+Alt+P` |
| Push | `Ctrl+Alt+U` | `Cmd+Alt+U` |
| Show Git Panel | `Ctrl+Shift+G` | `Cmd+Shift+G` |

### View Shortcuts

| Action | Windows/Linux | macOS |
|--------|---------------|-------|
| Toggle File Browser | `Ctrl+B` | `Cmd+B` |
| Toggle Agent Panel | `Ctrl+Shift+A` | `Cmd+Shift+A` |
| Toggle Zen Mode | `F11` | `Cmd+Shift+F` |
| Zoom In | `Ctrl+=` | `Cmd+=` |
| Zoom Out | `Ctrl+-` | `Cmd+-` |

## Settings and Preferences

### Accessing Settings

Open the Settings panel by:
- Clicking on "Settings" in the File menu.
- Using the keyboard shortcut `Ctrl+,` (Windows/Linux) or `Cmd+,` (macOS).

### Customizable Options

- **Editor Settings**: Font size, line numbers, tab size, etc.
- **Theme**: Light, dark, or custom themes.
- **Git Integration**: Default commit message templates, auto-fetch interval.
- **AI Assistant**: Response verbosity, code style preferences.
- **Keyboard Shortcuts**: Customize any keyboard shortcut.

### User Profile

Manage your user profile settings, including:
- GitHub account connection
- User display name
- Profile picture
- Time zone preferences

## Troubleshooting

### Common Issues and Solutions

#### Application Won't Start

- Verify that you have the required dependencies installed.
- Check the application logs in `~/.collabication/logs`.
- Try reinstalling the application.

#### GitHub Authentication Issues

- Ensure you have a stable internet connection.
- Verify that your GitHub credentials are correct.
- Try refreshing your authentication token in Settings.

#### Collaboration Connection Problems

- Check your network connection.
- Verify that all participants have compatible application versions.
- Try creating a new collaboration session.

### Getting Help

If you encounter problems not covered in this guide:

1. Check the [Collabication GitHub repository](https://github.com/rileylemm/collabication) for known issues.
2. Submit a new issue on GitHub if you've found a bug.
3. Contact support at support@collabication.app.

---

Thank you for using Collabication! We hope this guide helps you make the most of our collaborative editing platform. 