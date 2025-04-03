# Open Source Inspiration

This document catalogs open source projects we're drawing inspiration from while building our collaborative application.

## Projects

### Aegis Framework

**Repository:** [BuildSomethingAI/aegis-framework](https://github.com/BuildSomethingAI/aegis-framework)

Aegis is a powerful framework combining AI capabilities with structured project management to help teams build better software. It implements AI-assisted planning and execution, structured task management, an intelligent memory system, state tracking, and validation - all supported by comprehensive documentation.

The framework is built on a collaborative philosophy where humans and AI work together with a shared understanding of principles and practices. The documentation serves both as a guide for AI behavior and as a reference for human collaboration, creating an environment where both operate from the same playbook.

### Assistant UI

**Repository:** [assistant-ui/assistant-ui](https://github.com/assistant-ui/assistant-ui)

Assistant UI is an open source TypeScript/React library for AI chat interfaces. It provides primitive components that can be fully customized rather than a monolithic chat component, with an API inspired by libraries like shadcn/ui and cmdk.

The library handles essential chat features like auto-scrolling, accessibility, and real-time updates, while offering easy integration with LangGraph, AI SDK, and custom backends. It supports a wide range of model providers including OpenAI, Anthropic, Mistral, Perplexity, AWS Bedrock, Azure, Google Gemini, and others.

Key features include streaming, Markdown support, code highlighting, file attachments, keyboard shortcuts, generative UI components, frontend tool calls, and human tool calls.

### NPCSH

**Repository:** [cagostino/npcsh](https://github.com/cagostino/npcsh)

NPCSH is an AI toolkit for AI developers that provides a smart command-line interpreter leveraging LLMs to understand natural language commands and questions. It enables executing tasks, answering queries, and retrieving information from local files and the web.

Key features include:
- Extensible Python package for interacting with various LLM providers (Ollama, Anthropic, OpenAI, Gemini, Deepseek)
- Macros for common LLM tasks like voice control, image generation, screenshot analysis, and retrieval augmented generation
- Built-in tools for tasks like web search, document summarization, and computer interaction

Our platform is designed to be built on top of NPCSH, using it as the core agent backend while extending it with a custom Electron UI, event-driven architecture, GitHub integration, and knowledge graph visualization. Our implementation treats NPCSH as an external service accessed through a custom adapter layer rather than modifying it directly.

### SpongeCake

**Repository:** [aditya-nadkarni/spongecake](https://github.com/aditya-nadkarni/spongecake)

SpongeCake is described as "the easiest way to launch computer use agents" - AI agents that interact with graphical user interfaces (GUIs) on computers and mobile devices. While specific implementation details are limited, this framework appears to focus on enabling AI agents to complete digital tasks by directly interacting with computer interfaces.

This aligns with our project's needs for agents that can interact with our Electron application UI. SpongeCake may provide valuable patterns for implementing the agent-UI interactions described in our architecture, particularly for the agent handoff patterns and UI integration components.

## Integration with Our Architecture

Our collaborative platform incorporates elements from these projects in the following ways:

### NPCSH Integration

Our HIGH_LEVEL_OVERVIEW.md explicitly describes our platform as being "built on top of the open-source npcsh project." The architecture includes:

1. **Self-hosted NPCSH Server**: Provides the core agent functionality including:
   - NPC Directory for managing AI agent configurations
   - Tool System for built-in and custom tools
   - LLM Connectors for various AI providers

2. **API Adapter Layer**: 
   - Translates between our application and NPCSH's API endpoints
   - Implements polling and event conversion
   - Handles authentication and error management

3. **Agent Configuration System**:
   - YAML-based configuration for creating specialized agents
   - Translations between simple configs and the NPCSH backend
   - Support for multiple model configurations, tool access control, and working style preferences

### MCP Integration

Our architecture includes a Model Context Protocol (MCP) Server Layer that sits between our Electron application and the NPCSH server. This layer:

1. **Exposes NPCSH Resources as MCP Resources**:
   - NPCs, tools, and file content are mapped to standardized MCP resources
   - NPCSH functionality is exposed through MCP tool interfaces

2. **Enables Multi-Agent Workflows**:
   - Facilitates communication between specialized agents
   - Standardizes the protocol for agent interactions
   - Makes our platform compatible with the MCP ecosystem

3. **Future-Proofs the Platform**:
   - As MCP adoption grows, our platform will be positioned to take advantage of developments
   - New tools and data sources can be added without modifying the core architecture

### UI and Interaction Design

From Assistant UI and potentially SpongeCake, we're drawing inspiration for:

1. **Document-Driven Interface**:
   - Obsidian-like UI focused on knowledge organization
   - Markdown editing with preview capabilities
   - Graph visualization for document relationships

2. **Agent-UI Interactions**:
   - Different interaction modes (suggestion, collaboration, autonomous)
   - UI indicators for agent activity and suggestions
   - Split-screen views for agent collaboration

3. **Event-Driven Updates**:
   - Real-time UI updates based on events
   - Animated indicators for changes
   - Optimized performance for frequent updates

## Planned Implementation Approach

Our implementation roadmap draws from these projects in a phased approach:

1. **Phase 1**: Single-Agent Demo with basic NPCSH integration and UI
2. **Phase 2**: GitHub integration for version control
3. **Phase 3**: Enhanced UI with Obsidian-like features
4. **Phase 4**: Multi-agent workflows and specialized tools
5. **Phase 5**: MCP integration for standardized agent communication

This document will be updated as we identify more specific features and approaches we want to incorporate from each project. 