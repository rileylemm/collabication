# Guidance for Cursor Agent: Collabication MVP Implementation

## Current Status Overview

Based on the code review of the repository, the project is in the early stages of implementation with the following components in place:

1. **Project Structure**: Well-organized with separate directories for backend, frontend, docker, and research
2. **Configuration Files**: Basic configuration files for ESLint, Prettier, TypeScript, and package.json
3. **Electron Setup**: Initial main.js and preload.js files with basic configuration
4. **React Application**: Basic App.tsx with routing and theme context
5. **Docker Configuration**: Dockerfile templates for the different services

However, there is minimal actual implementation of the core features:
- No editor components (Tiptap or CodeMirror)
- No agent integration with npcsh
- No GitHub integration
- No real-time collaboration client implementation

## Implementation Priorities

To make the most progress toward a functional MVP, focus on these priorities in order:

### Priority 1: Complete Backend API Adapter for npcsh

The backend directory structure exists, but needs implementation of the actual API adapter:

```javascript
// Example implementation for /api/server.js
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { connectToNpcsh } = require('../services/npcsh-service');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Middleware
app.use(cors());
app.use(express.json());

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (token == null) return res.sendStatus(401);
  
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// API endpoints
app.post('/agent/query', authenticateToken, async (req, res) => {
  try {
    const { prompt, context } = req.body;
    const npcsh = await connectToNpcsh();
    const response = await npcsh.query(prompt, context);
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/agent/tools', authenticateToken, async (req, res) => {
  try {
    const { tools } = req.body;
    const npcsh = await connectToNpcsh();
    const response = await npcsh.registerTools(tools);
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/agent/context', authenticateToken, async (req, res) => {
  try {
    const { context } = req.body;
    const npcsh = await connectToNpcsh();
    const response = await npcsh.setContext(context);
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// WebSocket for streaming responses
wss.on('connection', (ws) => {
  ws.on('message', async (message) => {
    try {
      const { type, data } = JSON.parse(message);
      
      if (type === 'stream') {
        const npcsh = await connectToNpcsh();
        const stream = npcsh.streamQuery(data.prompt, data.context);
        
        stream.on('data', (chunk) => {
          ws.send(JSON.stringify({ type: 'data', data: chunk }));
        });
        
        stream.on('end', () => {
          ws.send(JSON.stringify({ type: 'end' }));
        });
        
        stream.on('error', (error) => {
          ws.send(JSON.stringify({ type: 'error', error: error.message }));
        });
      }
    } catch (error) {
      ws.send(JSON.stringify({ type: 'error', error: error.message }));
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

### Priority 2: Implement React Components

The React application has a basic structure with App.tsx, but needs component implementation:

```tsx
// Example implementation for Layout.tsx
import React from 'react';
import styled from 'styled-components';
import { useTheme } from '../contexts/ThemeContext';

const LayoutContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: ${props => props.theme.background};
  color: ${props => props.theme.text};
`;

const Header = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1rem;
  height: 3rem;
  background-color: ${props => props.theme.primary};
  color: ${props => props.theme.primaryText};
`;

const Main = styled.main`
  display: flex;
  flex: 1;
  overflow: hidden;
`;

const Sidebar = styled.aside`
  width: 250px;
  background-color: ${props => props.theme.sidebar};
  border-right: 1px solid ${props => props.theme.border};
  overflow-y: auto;
`;

const Content = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
`;

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { theme, toggleTheme } = useTheme();
  
  return (
    <LayoutContainer>
      <Header>
        <h1>Collabication</h1>
        <button onClick={toggleTheme}>
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </Header>
      <Main>
        <Sidebar>
          {/* File browser will go here */}
        </Sidebar>
        <Content>
          {children}
        </Content>
      </Main>
    </LayoutContainer>
  );
};

export default Layout;
```

### Priority 3: Integrate Editors

Implement the editor components, which are core to the MVP:

```tsx
// Example implementation for EditorPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { lowlight } from 'lowlight/lib/core';
import styled from 'styled-components';

// Register languages for syntax highlighting
import javascript from 'highlight.js/lib/languages/javascript';
import python from 'highlight.js/lib/languages/python';
import typescript from 'highlight.js/lib/languages/typescript';

lowlight.registerLanguage('javascript', javascript);
lowlight.registerLanguage('python', python);
lowlight.registerLanguage('typescript', typescript);

const EditorContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
`;

const EditorToolbar = styled.div`
  display: flex;
  padding: 0.5rem;
  background-color: ${props => props.theme.toolbar};
  border-bottom: 1px solid ${props => props.theme.border};
`;

const EditorContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  
  .ProseMirror {
    min-height: 100%;
    outline: none;
    
    p {
      margin: 0.5em 0;
    }
    
    pre {
      background-color: ${props => props.theme.codeBackground};
      color: ${props => props.theme.codeText};
      padding: 0.75em;
      border-radius: 0.25em;
      
      code {
        font-family: 'Fira Code', monospace;
      }
    }
  }
`;

const EditorPage: React.FC = () => {
  const { documentId } = useParams<{ documentId?: string }>();
  const [isMarkdown, setIsMarkdown] = useState(false);
  
  const editor = useEditor({
    extensions: [
      StarterKit,
      CodeBlockLowlight.configure({
        lowlight,
      }),
    ],
    content: '<p>Start typing here...</p>',
  });
  
  useEffect(() => {
    // Load document content if documentId is provided
    if (documentId) {
      // TODO: Load document from API
    }
  }, [documentId]);
  
  const toggleEditorMode = () => {
    setIsMarkdown(!isMarkdown);
    // TODO: Convert content between rich text and markdown
  };
  
  return (
    <EditorContainer>
      <EditorToolbar>
        <button onClick={toggleEditorMode}>
          {isMarkdown ? 'Rich Text' : 'Markdown'}
        </button>
        {/* Add more toolbar buttons here */}
      </EditorToolbar>
      <EditorContent>
        <EditorContent editor={editor} />
      </EditorContent>
    </EditorContainer>
  );
};

export default EditorPage;
```

### Priority 4: Implement Agent UI

Create the agent interaction UI similar to Claude in Cursor:

```tsx
// Example implementation for AgentPanel.tsx
import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import ReactMarkdown from 'react-markdown';

const AgentContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  border-left: 1px solid ${props => props.theme.border};
  width: 300px;
`;

const AgentHeader = styled.div`
  padding: 0.5rem;
  background-color: ${props => props.theme.primary};
  color: ${props => props.theme.primaryText};
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const AgentMessages = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
`;

const Message = styled.div<{ isUser: boolean }>`
  margin-bottom: 0.5rem;
  padding: 0.5rem;
  border-radius: 0.25rem;
  max-width: 80%;
  align-self: ${props => props.isUser ? 'flex-end' : 'flex-start'};
  background-color: ${props => props.isUser ? props.theme.userMessage : props.theme.agentMessage};
`;

const AgentInput = styled.div`
  display: flex;
  padding: 0.5rem;
  border-top: 1px solid ${props => props.theme.border};
`;

const Input = styled.textarea`
  flex: 1;
  padding: 0.5rem;
  border: 1px solid ${props => props.theme.border};
  border-radius: 0.25rem;
  resize: none;
  font-family: inherit;
`;

const SendButton = styled.button`
  margin-left: 0.5rem;
  padding: 0.5rem;
  background-color: ${props => props.theme.primary};
  color: ${props => props.theme.primaryText};
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
`;

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

const AgentPanel: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: 'Hello! I\'m your AI assistant. How can I help you today?',
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const handleSend = async () => {
    if (!input.trim()) return;
    
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      isUser: true,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsStreaming(true);
    
    // TODO: Send to API and handle streaming response
    // For now, simulate a response
    setTimeout(() => {
      const agentMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'I received your message: "' + input + '". This is a placeholder response.',
        isUser: false,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, agentMessage]);
      setIsStreaming(false);
    }, 1000);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  return (
    <AgentContainer>
      <AgentHeader>
        <h3>AI Assistant</h3>
        <button>Settings</button>
      </AgentHeader>
      <AgentMessages>
        {messages.map(message => (
          <Message key={message.id} isUser={message.isUser}>
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </Message>
        ))}
        {isStreaming && (
          <Message isUser={false}>
            <div>Thinking...</div>
          </Message>
        )}
        <div ref={messagesEndRef} />
      </AgentMessages>
      <AgentInput>
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask me anything..."
          rows={3}
        />
        <SendButton onClick={handleSend} disabled={isStreaming}>
          Send
        </SendButton>
      </AgentInput>
    </AgentContainer>
  );
};

export default AgentPanel;
```

### Priority 5: Implement GitHub Integration

Add GitHub authentication and synchronization:

```tsx
// Example implementation for GitHubService.ts
import { Octokit } from '@octokit/rest';
import * as isomorphicGit from 'isomorphic-git';
import http from 'isomorphic-git/http/web';
import LightningFS from '@isomorphic-git/lightning-fs';

// Initialize file system
const fs = new LightningFS('collabication');

class GitHubService {
  private octokit: Octokit | null = null;
  private token: string | null = null;
  
  async authenticate(token: string): Promise<void> {
    this.token = token;
    this.octokit = new Octokit({ auth: token });
    
    // Test authentication
    await this.octokit.users.getAuthenticated();
  }
  
  async getRepositories(): Promise<any[]> {
    if (!this.octokit) throw new Error('Not authenticated');
    
    const { data } = await this.octokit.repos.listForAuthenticatedUser();
    return data;
  }
  
  async cloneRepository(repoUrl: string, dir: string): Promise<void> {
    if (!this.token) throw new Error('Not authenticated');
    
    await isomorphicGit.clone({
      fs,
      http,
      dir,
      url: repoUrl,
      onAuth: () => ({ username: this.token! }),
      depth: 1,
    });
  }
  
  async commitAndPush(dir: string, message: string): Promise<void> {
    if (!this.token) throw new Error('Not authenticated');
    
    // Add all changes
    await isomorphicGit.add({ fs, dir, filepath: '.' });
    
    // Commit
    await isomorphicGit.commit({
      fs,
      dir,
      message,
      author: {
        name: 'Collabication User',
        email: 'user@collabication.app',
      },
    });
    
    // Push
    await isomorphicGit.push({
      fs,
      http,
      dir,
      remote: 'origin',
      onAuth: () => ({ username: this.token! }),
    });
  }
}

export default new GitHubService();
```

## Vertical Slice Approach

To make the most progress quickly, implement a vertical slice that includes:

1. Basic document editing with Tiptap
2. Simple agent interaction for document assistance
3. Local file saving (before GitHub integration)
4. Basic UI with theme support

This will give you a working prototype that you can then enhance with additional features.

## Technical Recommendations

1. **State Management**: Use Redux Toolkit for global state management, as the application will have complex state requirements.

2. **API Design**: Implement a RESTful API with proper error handling and authentication.

3. **Testing**: Add Jest configuration and start writing tests early, especially for the API adapter.

4. **TypeScript Types**: Create shared type definitions for data structures used across frontend and backend.

5. **Error Handling**: Implement a comprehensive error handling strategy, especially for API calls and WebSocket connections.

6. **Component Structure**: Follow atomic design principles for React components (atoms, molecules, organisms, templates, pages).

7. **Docker Configuration**: Complete the Dockerfile implementations with proper base images and configuration.

## Next Steps

1. Implement the backend API adapter for npcsh
2. Create the basic React components (Layout, HomePage, EditorPage)
3. Integrate Tiptap for rich text editing
4. Add the agent UI panel
5. Implement local file saving
6. Add GitHub authentication and synchronization
7. Implement real-time collaboration with Yjs

By following this guidance, you'll be able to make significant progress toward a functional MVP within the 2-week timeline.
