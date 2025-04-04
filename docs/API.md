# Collabication API Documentation

This document provides comprehensive information about the Collabication API, which allows developers to integrate with the agent capabilities, collaboration features, and GitHub synchronization functionality of the Collabication platform.

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Base URL](#base-url)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [API Endpoints](#api-endpoints)
  - [Agent API](#agent-api)
  - [GitHub Integration API](#github-integration-api)
  - [Collaboration API](#collaboration-api)
- [Websocket Events](#websocket-events)
- [SDK and Client Libraries](#sdk-and-client-libraries)

## Overview

The Collabication API provides a RESTful interface for interacting with the various services that power the Collabication platform. The API allows developers to:

- Access the AI agent capabilities for document and code assistance
- Manage GitHub integration and synchronization
- Participate in real-time collaboration sessions
- Manage user settings and preferences

## Authentication

### JWT Authentication

The API uses JSON Web Tokens (JWT) for authentication. To authenticate with the API, you need to include the JWT token in the `Authorization` header of your HTTP requests:

```
Authorization: Bearer YOUR_JWT_TOKEN
```

### Obtaining a Token

To obtain a JWT token, you need to authenticate with the Collabication platform. This can be done through:

1. GitHub OAuth login (for GitHub integration)
2. User authentication with username/password
3. API key-based authentication for service accounts

#### Example Request

```bash
curl -X POST https://api.collabication.app/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "user@example.com", "password": "your_password"}'
```

#### Example Response

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 86400
}
```

## Base URL

The base URL for all API endpoints is:

```
https://api.collabication.app
```

For WebSocket connections:

```
wss://collab.collabication.app
```

## Error Handling

The API uses conventional HTTP response codes to indicate the success or failure of an API request. In general:

- 2xx range indicates success
- 4xx range indicates an error that failed due to the information provided
- 5xx range indicates an error with the Collabication servers

### Error Response Format

All error responses include a JSON object with the following properties:

```json
{
  "message": "A human-readable error message",
  "error": "Detailed error information (available in development mode only)",
  "code": "ERROR_CODE"
}
```

### Common Error Codes

| Status Code | Meaning |
|-------------|---------|
| 400 | Bad Request – The request was malformed or missing required parameters |
| 401 | Unauthorized – Authentication is required or failed |
| 403 | Forbidden – The authenticated user does not have permission |
| 404 | Not Found – The requested resource does not exist |
| 429 | Too Many Requests – Rate limit exceeded |
| 500 | Internal Server Error – Something went wrong on our servers |

## Rate Limiting

To protect the API from abuse, rate limiting is enforced on all endpoints. The current limits are:

- 100 requests per minute per IP address
- 1000 requests per hour per user

Rate limit information is included in the response headers:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1612345678
```

If you exceed the rate limit, you will receive a 429 Too Many Requests response.

## API Endpoints

### Agent API

The Agent API allows you to interact with the AI assistant capabilities of Collabication.

#### Process Query

Sends a prompt to the agent and receives a response.

```
POST /api/agent/query
```

**Request Body**:

```json
{
  "prompt": "Generate a React component that displays a list of items",
  "context": {
    "currentFile": "src/components/ItemList.tsx",
    "project": "my-react-app",
    "selectedText": "// Insert component here"
  },
  "tools": [
    {
      "name": "code_generation",
      "enabled": true
    }
  ]
}
```

**Response**:

```json
{
  "response": "Here's a React component that displays a list of items...",
  "toolCalls": [
    {
      "tool": "code_generation",
      "result": "import React from 'react';\n\ninterface ItemListProps {\n  items: string[];\n}\n\nexport const ItemList: React.FC<ItemListProps> = ({ items }) => {\n  return (\n    <ul className=\"item-list\">\n      {items.map((item, index) => (\n        <li key={index}>{item}</li>\n      ))}\n    </ul>\n  );\n};\n"
    }
  ]
}
```

#### Register Tools

Registers custom tools that the agent can use when processing queries.

```
POST /api/agent/tools
```

**Request Body**:

```json
{
  "tools": [
    {
      "name": "custom_code_analyzer",
      "description": "Analyzes code for potential issues",
      "parameters": {
        "code": "string",
        "language": "string"
      },
      "endpoint": "https://your-service.example.com/analyze"
    }
  ]
}
```

**Response**:

```json
{
  "results": [
    {
      "success": true,
      "tool": "custom_code_analyzer"
    }
  ]
}
```

#### Update Context

Updates the project-wide context available to the agent.

```
POST /api/agent/context
```

**Request Body**:

```json
{
  "projectId": "project-123",
  "context": {
    "files": [
      {
        "path": "src/components/App.tsx",
        "content": "import React from 'react';\n..."
      }
    ],
    "metadata": {
      "projectType": "React Application",
      "dependencies": {
        "react": "^17.0.2",
        "typescript": "^4.5.4"
      }
    }
  }
}
```

**Response**:

```json
{
  "message": "Context updated successfully"
}
```

#### Get Context

Retrieves the current context for a project.

```
GET /api/agent/context?projectId=project-123
```

**Response**:

```json
{
  "projectId": "project-123",
  "context": {
    "files": [
      {
        "path": "src/components/App.tsx",
        "content": "import React from 'react';\n..."
      }
    ],
    "metadata": {
      "projectType": "React Application",
      "dependencies": {
        "react": "^17.0.2",
        "typescript": "^4.5.4"
      }
    }
  }
}
```

### GitHub Integration API

The GitHub Integration API allows you to manage GitHub repositories, synchronization, and operations.

#### List Repositories

Retrieves a list of GitHub repositories accessible to the authenticated user.

```
GET /api/github/repositories
```

**Response**:

```json
{
  "repositories": [
    {
      "id": 123456789,
      "name": "my-project",
      "fullName": "username/my-project",
      "url": "https://github.com/username/my-project",
      "isPrivate": false,
      "description": "My awesome project",
      "defaultBranch": "main"
    }
  ]
}
```

#### Clone Repository

Clones a GitHub repository to the local workspace.

```
POST /api/github/clone
```

**Request Body**:

```json
{
  "repository": "username/my-project",
  "branch": "main",
  "path": "/projects/my-project"
}
```

**Response**:

```json
{
  "success": true,
  "repository": "username/my-project",
  "path": "/projects/my-project",
  "branch": "main"
}
```

#### Get File Status

Retrieves the Git status for files in a repository.

```
GET /api/github/status?repository=username/my-project
```

**Response**:

```json
{
  "repository": "username/my-project",
  "branch": "main",
  "files": [
    {
      "path": "src/components/App.tsx",
      "status": "modified"
    },
    {
      "path": "src/styles/main.css",
      "status": "untracked"
    }
  ]
}
```

#### Commit Changes

Creates a new commit with the specified changes.

```
POST /api/github/commit
```

**Request Body**:

```json
{
  "repository": "username/my-project",
  "message": "Update App component and styles",
  "files": [
    "src/components/App.tsx",
    "src/styles/main.css"
  ]
}
```

**Response**:

```json
{
  "success": true,
  "commitHash": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0",
  "repository": "username/my-project",
  "branch": "main"
}
```

#### Push Changes

Pushes local commits to the remote repository.

```
POST /api/github/push
```

**Request Body**:

```json
{
  "repository": "username/my-project",
  "branch": "main"
}
```

**Response**:

```json
{
  "success": true,
  "repository": "username/my-project",
  "branch": "main"
}
```

#### Pull Changes

Pulls changes from the remote repository.

```
POST /api/github/pull
```

**Request Body**:

```json
{
  "repository": "username/my-project",
  "branch": "main"
}
```

**Response**:

```json
{
  "success": true,
  "repository": "username/my-project",
  "branch": "main",
  "changes": {
    "added": ["README.md"],
    "modified": ["src/components/App.tsx"],
    "deleted": []
  }
}
```

#### Get Commit History

Retrieves the commit history for a repository.

```
GET /api/github/history?repository=username/my-project&branch=main&limit=10
```

**Response**:

```json
{
  "repository": "username/my-project",
  "branch": "main",
  "commits": [
    {
      "hash": "a1b2c3d4e5f6",
      "message": "Update App component and styles",
      "author": "User Name",
      "date": "2023-04-01T12:00:00Z",
      "files": [
        "src/components/App.tsx",
        "src/styles/main.css"
      ]
    }
  ]
}
```

#### Get Commit Details

Retrieves details for a specific commit.

```
GET /api/github/commit?repository=username/my-project&hash=a1b2c3d4e5f6
```

**Response**:

```json
{
  "repository": "username/my-project",
  "commit": {
    "hash": "a1b2c3d4e5f6",
    "message": "Update App component and styles",
    "author": "User Name",
    "date": "2023-04-01T12:00:00Z",
    "diff": {
      "src/components/App.tsx": "diff --git a/src/components/App.tsx b/src/components/App.tsx\nindex 1234567..abcdefg 100644\n--- a/src/components/App.tsx\n+++ b/src/components/App.tsx\n@@ -1,5 +1,7 @@\n import React from 'react';\n+import { ItemList } from './ItemList';\n \n function App() {\n-  return <div>Hello World</div>;\n+  const items = ['Item 1', 'Item 2', 'Item 3'];\n+  return <ItemList items={items} />;\n }\n"
    }
  }
}
```

### Collaboration API

The Collaboration API allows you to manage real-time collaboration sessions.

#### Create Collaboration Session

Creates a new collaboration session for a document.

```
POST /api/collaboration/sessions
```

**Request Body**:

```json
{
  "documentId": "doc-123",
  "title": "My Collaborative Document",
  "permissions": {
    "view": "anyone_with_link",
    "edit": "specified_users"
  }
}
```

**Response**:

```json
{
  "sessionId": "session-123",
  "documentId": "doc-123",
  "title": "My Collaborative Document",
  "creator": "user-123",
  "createdAt": "2023-04-01T12:00:00Z",
  "inviteLink": "https://collab.collabication.app/join/abc123",
  "permissions": {
    "view": "anyone_with_link",
    "edit": "specified_users"
  }
}
```

#### Join Collaboration Session

Joins an existing collaboration session.

```
POST /api/collaboration/join
```

**Request Body**:

```json
{
  "sessionId": "session-123",
  "inviteCode": "abc123"
}
```

**Response**:

```json
{
  "sessionId": "session-123",
  "documentId": "doc-123",
  "title": "My Collaborative Document",
  "role": "editor",
  "connectionUrl": "wss://collab.collabication.app/session/session-123"
}
```

#### Update Session Permissions

Updates the permissions for a collaboration session.

```
PUT /api/collaboration/sessions/session-123/permissions
```

**Request Body**:

```json
{
  "permissions": {
    "view": "specified_users",
    "edit": "specified_users",
    "users": {
      "user-456": "editor",
      "user-789": "viewer"
    }
  }
}
```

**Response**:

```json
{
  "sessionId": "session-123",
  "permissions": {
    "view": "specified_users",
    "edit": "specified_users",
    "users": {
      "user-456": "editor",
      "user-789": "viewer"
    }
  }
}
```

#### Get Session Details

Retrieves details for a collaboration session.

```
GET /api/collaboration/sessions/session-123
```

**Response**:

```json
{
  "sessionId": "session-123",
  "documentId": "doc-123",
  "title": "My Collaborative Document",
  "creator": "user-123",
  "createdAt": "2023-04-01T12:00:00Z",
  "activeUsers": [
    {
      "id": "user-123",
      "name": "User 1",
      "role": "editor"
    },
    {
      "id": "user-456",
      "name": "User 2",
      "role": "editor"
    }
  ],
  "permissions": {
    "view": "specified_users",
    "edit": "specified_users",
    "users": {
      "user-456": "editor",
      "user-789": "viewer"
    }
  }
}
```

## WebSocket Events

For real-time collaboration, the API provides WebSocket events that clients can listen to and emit.

### Connection

To connect to a collaboration session via WebSocket:

```
wss://collab.collabication.app/session/SESSION_ID?token=JWT_TOKEN
```

### Client Events

These are events that clients can emit to the server:

| Event | Description | Payload |
|-------|-------------|---------|
| `join` | Join a collaboration session | `{ userId: "user-123", userName: "User Name" }` |
| `cursor` | Update cursor position | `{ userId: "user-123", position: { line: 10, column: 5 } }` |
| `update` | Send document updates | `{ delta: [...], version: 5 }` |
| `chat` | Send chat message | `{ userId: "user-123", message: "Hello", timestamp: "2023-04-01T12:00:00Z" }` |
| `leave` | Leave the session | `{ userId: "user-123" }` |

### Server Events

These are events that the server emits to clients:

| Event | Description | Payload |
|-------|-------------|---------|
| `user_joined` | User joined the session | `{ userId: "user-123", userName: "User Name", role: "editor" }` |
| `user_left` | User left the session | `{ userId: "user-123" }` |
| `cursor_update` | Cursor position updated | `{ userId: "user-123", position: { line: 10, column: 5 } }` |
| `document_update` | Document content updated | `{ delta: [...], version: 6, userId: "user-123" }` |
| `chat_message` | Chat message received | `{ userId: "user-123", userName: "User Name", message: "Hello", timestamp: "2023-04-01T12:00:00Z" }` |
| `error` | Error occurred | `{ code: "ERROR_CODE", message: "Error message" }` |

## SDK and Client Libraries

To simplify integration with the Collabication API, we provide client libraries for various programming languages:

- JavaScript/TypeScript: [collabication-js](https://github.com/rileylemm/collabication-js)
- Python: [collabication-python](https://github.com/rileylemm/collabication-python)

### JavaScript Example

```javascript
import { CollabicationClient } from 'collabication-js';

// Initialize the client
const client = new CollabicationClient({
  apiUrl: 'https://api.collabication.app',
  token: 'YOUR_JWT_TOKEN'
});

// Send a query to the agent
const response = await client.agent.query({
  prompt: 'Generate a React component that displays a list of items',
  context: {
    currentFile: 'src/components/ItemList.tsx'
  }
});

console.log(response.toolCalls[0].result);
```

### Python Example

```python
from collabication import CollabicationClient

# Initialize the client
client = CollabicationClient(
    api_url='https://api.collabication.app',
    token='YOUR_JWT_TOKEN'
)

# Join a collaboration session
session = client.collaboration.join_session(
    session_id='session-123',
    invite_code='abc123'
)

# Send a chat message
client.collaboration.send_message(
    session_id=session.session_id,
    message='Hello everyone!'
)
```

## Versioning

The Collabication API is versioned using URI path versioning. The current version is v1.

```
https://api.collabication.app/v1/agent/query
```

## Support

If you have any questions or issues with the API, please contact our support team at api-support@collabication.app or open an issue on our [GitHub repository](https://github.com/rileylemm/collabication). 