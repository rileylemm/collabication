# Collabication Architecture Overview

This document outlines the planned architecture for the Collabication project, an agent-native collaboration platform.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Electron Desktop Application                │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────────────┐   │
│  │  UI Layer   │◄──┤ Event       │   │ GitHub Integration  │   │
│  │             │   │ Subscribers │   │      Service        │   │
│  └─────┬───────┘   └─────▲───────┘   └──────────┬──────────┘   │
│        │                 │                      │              │
│        └────────────┬────┴──────────────┬──────┘              │
│                     │                   │                      │
│               ┌─────┴─────┐       ┌────┴────┐                 │
│               │ API Client │       │ Event   │                 │
│               │   Layer    │       │  Bus    │                 │
│               └─────┬─────┘       └────┬────┘                 │
└───────────────────┬─┴─────────────────┬┴─────────────────────┘
                    │                   │
                    ▼                   ▼
┌─────────────────────┐     ┌─────────────────────────┐
│  Local Git Repos    │     │    npcsh Adapter Layer  │
└─────────────────────┘     └────────────┬────────────┘
                                         │
                                         ▼
                            ┌────────────────────────┐
                            │     npcsh Server       │
                            │                        │
                            └────────────────────────┘
```

## Core Components

### 1. Electron Application

The Electron application serves as the primary user interface and provides the following key functionalities:

1. **Document-Driven UI**
   - File explorer with project structure visualization
   - Markdown editor with preview capabilities
   - Graph view for visualizing document connections

2. **GitHub Integration Service**
   - Automatic repository synchronization
   - File change detection and tracking
   - Automatic commit and push on changes

3. **Event Bus System**
   - Manages communication between components
   - Handles asynchronous updates and notifications
   - Ensures UI responsiveness

### 2. npcsh Integration

Rather than modifying npcsh, the application communicates with it through a custom adapter layer:

1. **npcsh Adapter Layer**
   - Translates application requests into npcsh API calls
   - Converts npcsh responses into application events
   - Handles authentication and session management

2. **npcsh Server**
   - Runs as a separate process
   - Manages AI agent configurations and interactions
   - Provides API endpoints for command execution

## Implementation Roadmap

### Phase 1: Foundation
- Create basic Electron application shell
- Set up document editor with Markdown support
- Implement basic file system operations
- Create simple GitHub authentication

### Phase 2: Agent Integration
- Implement npcsh adapter layer
- Create basic agent interface in UI
- Set up communication with npcsh server
- Implement simple agent-document interactions

### Phase 3: Collaborative Features
- Add event system for real-time updates
- Implement GitHub synchronization
- Create basic knowledge graph visualization
- Add support for agent annotations in documents

## Technology Stack

- **Frontend**: Electron, React, TypeScript
- **Backend**: Node.js, Python (for npcsh)
- **Storage**: Local file system, Git repositories
- **AI Framework**: npcsh

## Differences from Previous Approach

This implementation simplifies the initial architecture by:

1. Focusing on core document editing and agent interaction features
2. Treating npcsh as an external service from the beginning
3. Starting with a more limited scope to achieve an initial working prototype faster
4. Delaying implementation of advanced features like MCP integration

## Next Steps

1. Create detailed specifications for each core component
2. Set up development environment and build processes
3. Implement basic UI components
4. Create simple proof-of-concept for npcsh integration

This architecture will evolve as development progresses, but provides a solid foundation for the initial implementation. 