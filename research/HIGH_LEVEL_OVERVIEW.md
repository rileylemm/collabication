# Agent-Native Collaboration Platform: High-Level Overview

This document provides a comprehensive overview of the architecture and functionality of an agent-native collaboration platform built on top of the open-source npcsh project.

## 1. System Architecture

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
│  Local Git Repos    │     │    Event Adapter Layer  │
└─────────────────────┘     └────────────┬────────────┘
                                         │
                                         ▼
                            ┌────────────────────────┐
                            │  API Adapter Layer     │
                            │                        │
                            │  (Polls npcsh API and  │
                            │   converts to events)  │
                            │                        │
                            └───────────┬────────────┘
                                        │
                                        ▼
                            ┌────────────────────────┐
                            │     npcsh Server       │
                            │  (Self-hosted Python)  │
                            │                        │
                            │  ┌──────────────────┐  │
                            │  │   NPC Directory  │  │
                            │  └──────────────────┘  │
                            │  ┌──────────────────┐  │
                            │  │    Tool System   │  │
                            │  └──────────────────┘  │
                            │  ┌──────────────────┐  │
                            │  │  LLM Connectors  │  │
                            │  └──────────────────┘  │
                            └────────────────────────┘
```

## 2. Component Overview

### 2.1 Electron Application Components

#### UI Layer
```
┌─────────────────────────────────────────────────┐
│                 Electron App UI                 │
│                                                 │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐   │
│  │   File    │  │ Document  │  │  Agent    │   │
│  │ Explorer  │  │  Editor   │  │ Interface │   │
│  └───────────┘  └───────────┘  └───────────┘   │
│                                                 │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐   │
│  │  Graph    │  │ Knowledge │  │  GitHub   │   │
│  │   View    │  │   Base    │  │   Sync    │   │
│  └───────────┘  └───────────┘  └───────────┘   │
└─────────────────────────────────────────────────┘
```

#### File System & GitHub Integration
```
┌───────────────────────────────────────────────┐
│           File & Version Control              │
│                                               │
│  ┌───────────────┐       ┌────────────────┐  │
│  │ File Watcher  │──────►│ Event          │  │
│  │ (Event        │       │ Publisher      │  │
│  │  Publisher)   │       │                │  │
│  └───────┬───────┘       └────────┬───────┘  │
│          │                        │          │
│          ▼                        ▼          │
│  ┌───────────────┐       ┌────────────────┐  │
│  │ Local Storage │◄─────►│ GitHub Client  │  │
│  └───────────────┘       └────────────────┘  │
│                                               │
└───────────────────────────────────────────────┘
```

### 2.2 Adapter & Communication Layers

```
┌──────────────────────────────────────────┐
│           Event Bus System               │
│                                          │
│  ┌───────────┐       ┌───────────────┐  │
│  │ Publishers│       │ Subscribers   │  │
│  │           │       │               │  │
│  └─────┬─────┘       └───────┬───────┘  │
│        │                     │          │
│        ▼                     ▼          │
│  ┌───────────┐       ┌───────────────┐  │
│  │  Message  │◄─────►│  Event        │  │
│  │  Queue    │       │  Router       │  │
│  └───────────┘       └───────────────┘  │
│                                          │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│           API Adapter Layer              │
│                                          │
│  ┌───────────┐       ┌───────────────┐  │
│  │ npcsh API │       │ Polling       │  │
│  │ Client    │       │ Service       │  │
│  └─────┬─────┘       └───────┬───────┘  │
│        │                     │          │
│        ▼                     ▼          │
│  ┌───────────┐       ┌───────────────┐  │
│  │ Response  │◄─────►│ Event         │  │
│  │ Parser    │       │ Converter     │  │
│  └───────────┘       └───────────────┘  │
│                                          │
└──────────────────────────────────────────┘
```

## 3. Data Flow Diagram

```
┌───────────┐     ┌────────────┐     ┌────────────┐     ┌────────────┐
│ User Input│────►│ Electron UI│────►│ API Client │────►│ API Adapter│
└───────────┘     └────────────┘     └────────────┘     └──────┬─────┘
                                                               │
                                                               ▼
┌───────────┐     ┌────────────┐     ┌────────────┐     ┌────────────┐
│ Response  │◄────│ UI         │◄────│ Event      │◄────│ npcsh      │
│ to User   │     │ Subscriber │     │ Bus        │     │ Server     │
└───────────┘     └────────────┘     └────────────┘     └────────────┘
```

## 4. GitHub Sync Workflow (Event-Driven)

```
┌─────────────┐           ┌───────────┐           ┌─────────────┐
│ Local File  │──Changes─►│ Event     │──Events──►│ GitHub Sync │
│ System      │           │ Publisher │           │ Subscriber  │
└─────────────┘           └───────────┘           └──────┬──────┘
                                                         │
                                                         ▼
┌─────────────┐           ┌───────────┐           ┌─────────────┐
│ Auto-commit │◄──Git────►│ Conflict  │◄──API─────│ GitHub      │
│ & Push      │           │ Resolution│           │ Repository  │
└─────────────┘           └───────────┘           └─────────────┘
```

## 5. Detailed System Description

### 5.1 Electron Application

The Electron application serves as the primary user interface and provides the following key functionalities:

1. **Obsidian-like UI**
   - File explorer with project structure visualization
   - Markdown editor with preview capabilities
   - Graph view for visualizing document connections
   - Knowledge base organization tools

2. **GitHub Integration Service**
   - Automatic repository cloning and initialization
   - File change detection and tracking
   - Automatic commit and push on changes
   - Conflict resolution handling
   - Branch management

3. **npcsh Client**
   - Communicates with the self-hosted npcsh server
   - Sends user queries and commands to NPCs
   - Integrates agent responses into the UI
   - Manages conversations and contexts

4. **File System Manager**
   - Watches for file changes
   - Handles read/write operations
   - Manages temporary files and caching
   - Ensures data consistency

### 5.2 Self-Hosted npcsh Server

The npcsh server operates as a Python application and provides:

1. **NPC Directory**
   - Stores and manages AI agent configurations
   - Handles agent personality and directive settings
   - Manages agent-specific tools and capabilities

2. **Tool System**
   - Provides built-in tools (search, image generation, etc.)
   - Allows custom tool creation and management
   - Integrates with external systems and APIs

3. **LLM Connectors**
   - Connects to various LLM providers (OpenAI, Anthropic, local models)
   - Handles API authentication and request formatting
   - Manages model selection and configuration

4. **API Endpoints**
   - `/api/health` - Server status check
   - `/api/execute` - Execute commands
   - `/api/conversations` - List conversations
   - `/api/conversation/{id}/messages` - Get conversation messages

### 5.3 Redis Server

Acts as an intermediary cache and message broker between the Electron app and npcsh server:

1. **Caching**
   - Stores conversation history
   - Caches frequent queries and responses
   - Reduces redundant LLM calls

2. **Message Queuing**
   - Handles asynchronous command execution
   - Enables background processing
   - Improves system responsiveness

### 5.4 Pluggable Graph Engine

The knowledge graph system uses a pluggable architecture supporting multiple backends:

1. **SQLite Graph** (Default)
   - Lightweight, embedded in the application
   - Suitable for personal projects and small teams
   - No additional infrastructure requirements

2. **Neo4j Integration**
   - High-performance graph database
   - Advanced query capabilities for complex knowledge structures
   - Ideal for large-scale Graph RAG implementations

3. **In-Memory Graph**
   - Ultra-fast performance for temporary projects
   - No persistence between sessions
   - Useful for quick experiments and ephemeral workspaces

## 6. Implementation Roadmap

### Phase 1: Single-Agent Demo
- Set up Electron application shell with basic UI
- Implement file watcher and event system
- Create basic API adapter for npcsh
- Implement one complete workflow:
  * File change detection → Event → Agent processing → Result writing
- Demonstrate graph relationship visualization

### Phase 2: GitHub Integration
- Implement GitHub repository cloning and initialization
- Set up file change detection
- Create basic auto-commit and push functionality
- Handle authentication and permissions

### Phase 3: Enhanced UI
- Develop Obsidian-like markdown editing features
- Implement graph view for document relationships
- Create knowledge base organization tools
- Optimize UI performance and responsiveness

### Phase 4: Multi-Agent Workflows
- Implement agent configuration system
- Add agent handoff and collaboration protocols
- Create specialized tool integrations
- Implement agent coordination via event system

### Phase 5: MCP Integration
- Implement MCP adapter layer
- Create MCP resource and tool mappings
- Test with external MCP-compatible tools
- Document MCP extension points

## 7. Deployment Requirements

### Hardware Requirements
- Moderate CPU (4+ cores recommended)
- 8GB+ RAM
- Sufficient storage for repositories and cache

### Software Requirements
- Node.js (for Electron)
- Python 3.8+ (for npcsh)
- Redis server
- Git

### API Keys and Services
- LLM provider API keys (OpenAI, Anthropic, etc.)
- GitHub personal access token
- Optional: Image generation API keys

## 8. Security Considerations

- Local data storage for sensitive information
- Encrypted communication between components
- Secure credential storage
- Regular updates to dependencies
- Access control for multi-user scenarios

## 9. Hybrid API/Event-Driven Architecture

### 9.1 Overview of the Hybrid Approach

This platform implements a hybrid architecture that combines API-driven and event-driven approaches. Rather than modifying the npcsh server, this architecture treats it as an external service accessed through a custom adapter layer.

#### API-Driven Components

The following components use direct API calls:
- User commands to agents (requests that require immediate responses)
- Document content retrieval
- Administrative functions
- Initial data loading

#### Event-Driven Components

The following components use the event system:
- File change monitoring and propagation
- GitHub synchronization
- UI updates across the application
- Background task notifications
- Long-running operation status updates

### 9.2 Key Components

#### API Adapter Layer

The API Adapter Layer serves as the interface between the application and the unmodified npcsh server:
- Translates application requests into npcsh API calls
- Formats responses from npcsh for consumption by the application
- Handles authentication and session management
- Implements retry and error handling logic

#### Event Bus System

The Event Bus System handles all internal event-based communication:
- Publishers emit events based on state changes or external triggers
- Subscribers receive events they're interested in
- The message queue ensures reliable event delivery
- The event router directs events to the appropriate subscribers

#### Event Adapter Layer

The Event Adapter Layer bridges between the API-based npcsh server and the event-driven application components:
- Polls relevant npcsh API endpoints at configurable intervals
- Converts API responses into events when changes are detected
- Publishes system events for consumption by application components
- Reduces polling frequency when system is idle

### 9.3 Implementation Approach

#### API Client Implementation

The API Client Layer is responsible for direct communication with the npcsh server:
- Implements wrapper functions for all npcsh API endpoints
- Manages API authentication and session state
- Handles request formatting and response parsing
- Implements proper error handling and retries

#### Event System Implementation

The Event System enables asynchronous, decoupled communication between components:
- Uses a publish-subscribe pattern for event distribution
- Maintains event history for late subscribers
- Supports both immediate and delayed event processing
- Implements event filtering and routing

#### File System Monitoring

The File System Monitor watches for changes and publishes events:
- Watches project directories for file changes
- Converts file system events to application events
- Batches rapid changes to prevent event flooding
- Initiates GitHub synchronization when appropriate

### 9.4 Implementation Steps

1. **Set up Basic API Communication**:
   - Implement wrapper functions for all npcsh API endpoints
   - Create type definitions for request and response objects
   - Implement authentication and session management
   - Add error handling and retry logic

2. **Implement Event System**:
   - Build the event bus infrastructure
   - Define standard event types and formats
   - Create publisher and subscriber interfaces
   - Implement event history and replay functionality

3. **Create File System Monitoring**:
   - Implement file system watchers for project directories
   - Define file change event types
   - Build event publishers for file system events
   - Create batching logic to handle rapid changes

4. **Implement GitHub Integration**:
   - Create event subscribers for file change events
   - Implement GitHub synchronization logic
   - Add conflict detection and resolution
   - Build notification publishers for sync status

5. **Build UI Event Bindings**:
   - Create event subscribers for UI components
   - Implement UI update logic based on events
   - Add animation and transition effects for changes
   - Optimize UI performance for frequent updates

### 9.5 Benefits of the Hybrid Approach

1. **Respects npcsh Boundaries**: Works with npcsh as an external service without requiring modifications.

2. **Enhanced Reactivity**: The system responds to changes automatically without explicit polling or user action.

3. **Improved User Experience**: Real-time updates throughout the application create a more dynamic, collaborative feel.

4. **Decoupled Components**: Application modules can evolve independently as they communicate through the event bus.

5. **Scalability**: The event-driven architecture handles multi-agent collaboration more naturally.

6. **Future Compatibility**: The adapter layer isolates the application from changes in the npcsh API.

### 9.6 Agent Configuration System

The platform includes a simple YAML-based agent configuration system:

```yaml
name: ResearchBot
persona: Curious researcher who excels at finding connections
tools:
  - web_search
  - doc_summary
  - mindmap_builder
models:
  - provider: anthropic
    model: claude-3-opus
    priority: primary
  - provider: openai
    model: gpt-4o
    priority: fallback
working_style:
  autonomy: medium
  verbosity: high
  collaboration: always_ask
```

This configuration system allows users to create specialized agents without coding, while the platform handles the translation between simple configs and the npcsh backend. It provides several key benefits:

1. **Accessibility**: Non-technical users can create and customize agents without understanding the underlying systems
2. **Standardization**: Teams can share agent configurations and ensure consistent behavior
3. **Versioning**: Agent configurations can be version-controlled alongside project content
4. **Rapid Iteration**: Quick experimentation with different agent configurations and capabilities

The configuration files support:
- Multiple model configurations with fallback options
- Tool access control and permissions
- Personality and working style preferences
- Context window and token usage limitations
- Integration with specific knowledge bases or external tools

## 10. Model Context Protocol (MCP) Integration

### 10.1 What is MCP?

The Model Context Protocol (MCP) is an open standard that connects AI models to external tools and data sources. Developed as a collaborative effort led by Anthropic, MCP provides a standardized way for AI agents to interact with various sources of information and tools, similar to how USB-C standardizes device connections.

### 10.2 Integration Components

#### MCP Server Layer

The MCP Server Layer sits between the Electron application and the npcsh server, acting as an intermediary that translates between MCP standard calls and npcsh's API endpoints.

This layer consists of:
- **Resource Mappings**: Expose npcsh resources (NPCs, tools, file content) as MCP resources
- **Tool Mappings**: Expose npcsh tools as MCP tools with standardized interfaces

#### Modified Data Flow with MCP

```
┌───────────┐     ┌────────────┐     ┌────────────┐     ┌────────────┐
│ User Input│────►│ Electron UI│────►│ MCP Client │────►│ MCP Server │
└───────────┘     └────────────┘     └────────────┘     └──────┬─────┘
                                                               │
                                                               ▼
┌───────────┐     ┌────────────┐     ┌────────────┐     ┌────────────┐
│ Response  │◄────│ Processed  │◄────│ npcsh API  │◄────│ npcsh      │
│ to User   │     │ Results    │     │ Endpoints  │     │ Server     │
└───────────┘     └────────────┘     └────────────┘     └────────────┘
```

### 10.3 Implementation Approach

#### MCP Server Implementation

The MCP Server implementation should leverage a Python MCP framework like FastMCP or the official MCP Python SDK. The server would need to create two primary types of components:

1. **Resources**: These expose npcsh's data structures like NPCs, tools, and file content as MCP resources. For example, an NPC resource would allow retrieving information about an NPC agent, while a file resource would allow accessing repository content.

2. **Tools**: These expose npcsh's functionality as MCP tools. For example, an ExecuteCommand tool would allow sending commands to an NPC agent, while a FileModification tool might allow creating or modifying files in the repository.

The MCP server would communicate with the npcsh server via its API endpoints, translating between the standardized MCP protocol and npcsh's specific API format.

#### Electron App Integration

The Electron application would need to be updated to use an MCP client instead of directly communicating with the npcsh server. This would involve:

1. Incorporating an MCP client library into the Electron app
2. Creating wrapper functions for common operations like executing commands via NPCs
3. Handling errors and responses from the MCP server
4. Updating the UI to reflect the new communication path

The MCP client would establish connections with the MCP server, send requests to appropriate resources and tools, and handle the responses to display them in the UI.

### 10.4 Implementation Steps

1. **Install Required MCP Packages**:
   - Install MCP Python SDK for the server implementation
   - Install MCP client libraries for the Electron app

2. **Create MCP Server Implementation**:
   - Use FastMCP or the official SDK to create a server
   - Define resource mappings for npcsh NPCs, tools, and data
   - Implement tool mappings for npcsh functionality

3. **Update Electron Application**:
   - Replace direct npcsh client with MCP client
   - Update communication flows to work through MCP
   - Implement proper error handling for MCP communications

4. **Test and Optimize**:
   - Test individual resource and tool mappings
   - Test end-to-end workflows
   - Optimize performance

### 10.5 Benefits of MCP Integration

1. **Multi-Agent Workflows**: MCP excels at facilitating communication between multiple specialized agents, allowing for more complex collaborative workflows.

2. **Standardized Communication**: By adopting MCP, your platform uses a standardized protocol that other tools and services can easily integrate with.

3. **Extensibility**: New tools and data sources can be added to the system without modifying the core architecture.

4. **Ecosystem Compatibility**: Your platform becomes compatible with the growing ecosystem of MCP-enabled tools and services.

5. **Future-Proofing**: As MCP becomes more widely adopted, the platform will be positioned to take advantage of future developments.

## 11. Benefits and Features

### Core Benefits

- **Agent-Native Workflow**: AI agents are first-class citizens in the collaboration process
- **Semantic Understanding**: Context-aware agents that understand document relationships
- **Version-Controlled Knowledge**: All content is automatically version-controlled
- **Seamless Collaboration**: Automatic syncing removes manual Git operations
- **Extensible Platform**: Custom tools and agents can be added as needed

### Key Features

- **Document-Driven Interface**: Obsidian-like UI focused on knowledge organization
- **Multi-Agent Interactions**: Different agents for different aspects of collaboration
- **Automatic Synchronization**: Changes propagate without manual intervention
- **Knowledge Graph**: Visual representation of document relationships
- **Custom Tool Creation**: Extend functionality with specialized tools

## 12. Future Expansions

- **Multi-User Realtime Collaboration**: Google Docs-like concurrent editing
- **Agent Teams**: Specialized groups of agents working together on specific tasks
- **Integration with CI/CD**: Automated testing and deployment triggered by document changes
- **Cross-Platform Support**: Mobile and web interfaces in addition to desktop
- **LLM Fine-Tuning**: Domain-specific models trained on project knowledge

## 13. Standardized Agent Protocols

### 13.1 File-Based Communication Protocol

The platform implements a standardized file-based protocol for agent-file interactions:

#### Metadata Files

Each project includes `.collabmeta.json` files that store:
- Agent interaction history
- Document relationships
- Context and semantic tags
- Decision logs and reasoning chains

Example metadata structure:
```json
{
  "document_id": "research-plan-2023",
  "created_at": "2023-09-15T14:22:10Z",
  "last_modified_by": "research-agent",
  "semantic_tags": ["research", "planning", "q4-goals"],
  "related_documents": [
    {"id": "literature-review", "relationship": "references", "strength": 0.85},
    {"id": "budget-2023", "relationship": "depends_on", "strength": 0.72}
  ],
  "agent_interactions": [
    {
      "timestamp": "2023-09-15T14:30:22Z",
      "agent": "research-agent",
      "action": "summarize",
      "context_provided": ["previous-summary", "related-papers"]
    }
  ]
}
```

#### Agent Annotations

Agents can write back to special sections of documents:
- Dedicated annotation blocks with special syntax:
  ```
  :::agent-note
  This section contains agent observations about the document.
  The core argument could be strengthened with additional data.
  :::
  ```
- YAML frontmatter with machine-readable metadata:
  ```yaml
  ---
  title: Research Plan 2023
  agent_indexed: true
  completion_estimate: 85%
  key_missing_elements:
    - Budget justification
    - Timeline for phase 3
  ---
  ```
- Special comment syntax for inline agent suggestions:
  ```markdown
  <!-- agent:suggestion type="clarification" -->
  Consider defining this term more precisely for readers unfamiliar with the domain.
  <!-- /agent:suggestion -->
  ```

#### Event Triggers

Special markers can trigger specific agent actions:
- `@agent:summarize` - Request document summarization
- `@agent:research(topic)` - Request related research
- `@agent:connect(document)` - Create semantic connections
- `@agent:critique` - Request critical feedback on document

These markers can be placed in comments, dedicated sections, or directly in the document text, providing a simple way for users to request agent assistance while working.

### 13.2 Agent Handoff Patterns

The platform implements standard patterns for agent-user interaction handoffs:

1. **Suggestion Mode**:
   - Agent provides inline suggestions that user can accept/reject
   - Non-intrusive UI indicators show where suggestions are available
   - User maintains full control over document content

2. **Collaboration Mode**:
   - Agent actively participates in real-time as user works
   - Split-screen or side-panel shows agent thoughts and contributions
   - User can toggle agent visibility or participation level

3. **Autonomous Mode**:
   - Agent performs designated tasks independently
   - Reports results and waits for approval before major changes
   - Uses predefined criteria to determine when to seek user input

Each mode includes appropriate UI indicators to make the current state clear to the user:
- Subtle highlighting for suggestion areas
- Animated indicators for active agent work
- Clear differentiation between user and agent-generated content

### 13.3 Documentation Standards

The platform includes standardized templates for common document types:

1. **Research Notes**:
   ```yaml
   ---
   type: research-note
   topic: [topic]
   sources: [references]
   status: [draft|reviewed|final]
   ---
   ```

2. **Decision Records**:
   ```yaml
   ---
   type: decision-record
   decision: [brief description]
   status: [proposed|decided|implemented|superseded]
   stakeholders: [list]
   ---
   ```

3. **Project Plans**:
   ```yaml
   ---
   type: project-plan
   project: [name]
   timeline: [start-end]
   owner: [name]
   collaborators: [list]
   ---
   ```

These templates ensure consistent organization and make documents easily parseable by agents for semantic understanding and relationship mapping. 