# Collabication

An agent-native collaboration platform that seamlessly integrates humans and AI agents for knowledge work.

## Project Status

This project is currently in early MVP development. We are following a "vertical slice" approach to implementation, focusing on creating a minimal end-to-end flow before expanding features.

### Current Implementation:

- ✅ Basic project structure and configuration
- ✅ React application setup with routing
- ✅ Theme context with light/dark mode support
- ✅ Layout component with header, sidebar, and content areas
- ✅ Basic page components (Home, Editor, NotFound)
- ✅ Initial Tiptap editor integration

### Upcoming Development:

- 🔄 Complete Tiptap editor with toolbar functionality
- 🔄 File management system
- 🔄 Backend API adapter for npcsh
- 🔄 Real-time collaboration with Yjs
- 🔄 GitHub integration with isomorphic-git

## Development

To start the development server:

```bash
npm install
npm run dev
```

This will start both the React development server and Electron app.

## Architecture

Collabication uses a modern stack:

- React for the frontend UI
- Tiptap for rich text editing
- CodeMirror for code editing
- Electron for desktop application
- Express for backend services
- Socket.io and Yjs for real-time collaboration

## Contributing

This project is actively being developed. Follow the Implementation Checklist in the project documentation for guidance on what to work on next.

## Project Overview

Collabication combines document editing, agent assistance, GitHub integration, and real-time collaboration in a unified environment. It's designed to enhance knowledge work by providing contextual AI assistance within a collaborative document editor.

## Core Features

- Document editing with Markdown/rich text toggle
- Code editing with syntax highlighting
- Agent assistance for document creation and editing
- GitHub integration with background synchronization
- Real-time collaboration between users
- Project-wide context for agent assistance

## Getting Started

### Prerequisites

- Node.js (v18+)
- Docker and Docker Compose
- Git

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/collabication.git
   cd collabication
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Start the development environment
   ```bash
   docker-compose up -d
   npm run dev
   ```

## License

This project is licensed under the MIT License - see the LICENSE file for details. 