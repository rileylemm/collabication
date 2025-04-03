# Collabication

An agent-native collaboration platform that seamlessly integrates humans and AI agents for knowledge work through a document-centric interface.

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

## Architecture

Collabication uses a multi-container Docker Compose setup:

- **Frontend Container**: Electron application with React
- **npcsh API Container**: API adapter for agent capabilities
- **Database Container**: MongoDB for document and metadata storage
- **Collaboration Server Container**: Yjs server for real-time collaboration

## License

This project is licensed under the MIT License - see the LICENSE file for details. 