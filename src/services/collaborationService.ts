import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { IndexeddbPersistence } from 'y-indexeddb';
import { Editor } from '@tiptap/core';
import { Awareness } from 'y-protocols/awareness';

// Type for user awareness data
export interface UserAwarenessData {
  name: string;
  color: string;
  avatar?: string;
  cursor?: {
    anchor: number;
    head: number;
  };
  selection?: {
    ranges: Array<{
      anchor: number;
      head: number;
    }>;
  };
}

// Singleton state to track active providers and documents
const state = {
  documents: new Map<string, Y.Doc>(),
  providers: new Map<string, WebsocketProvider>(),
  indexedDBProviders: new Map<string, IndexeddbPersistence>(),
  editors: new Map<string, Editor>(),
};

// Configuration for the collaboration service
interface CollaborationConfig {
  serverUrl: string;
  roomPrefix: string;
  localStorageId: string;
  userColor: string;
  userName: string;
  userAvatar?: string;
}

// Default configuration
const defaultConfig: CollaborationConfig = {
  serverUrl: 'wss://collabication-ws.example.com',
  roomPrefix: 'collabication-',
  localStorageId: 'collabication-user',
  userColor: '#' + Math.floor(Math.random() * 16777215).toString(16),
  userName: 'Anonymous User',
};

// Current configuration
let currentConfig: CollaborationConfig = { ...defaultConfig };

/**
 * Initialize the collaboration service with custom configuration
 */
export const initCollaboration = (config: Partial<CollaborationConfig>) => {
  currentConfig = { ...defaultConfig, ...config };

  // Check if we have a user in local storage, otherwise create one
  const savedUser = localStorage.getItem(currentConfig.localStorageId);
  if (!savedUser) {
    const newUser = {
      name: currentConfig.userName,
      color: currentConfig.userColor,
      avatar: currentConfig.userAvatar,
    };
    localStorage.setItem(currentConfig.localStorageId, JSON.stringify(newUser));
  } else {
    const user = JSON.parse(savedUser);
    currentConfig.userName = user.name;
    currentConfig.userColor = user.color;
    currentConfig.userAvatar = user.avatar;
  }
};

/**
 * Create or get a Y.Doc for a specific document ID
 */
export const getYDoc = (documentId: string): Y.Doc => {
  if (!state.documents.has(documentId)) {
    const doc = new Y.Doc();
    state.documents.set(documentId, doc);

    // Setup persistence with IndexedDB
    const indexeddbProvider = new IndexeddbPersistence(
      `${currentConfig.roomPrefix}${documentId}`,
      doc
    );
    state.indexedDBProviders.set(documentId, indexeddbProvider);

    // Log when the document is loaded from IndexedDB
    indexeddbProvider.on('synced', () => {
      console.log(`Document ${documentId} loaded from IndexedDB`);
    });
  }

  return state.documents.get(documentId)!;
};

/**
 * Connect to the collaboration server for a specific document
 */
export const connectToDocument = (documentId: string): WebsocketProvider => {
  const doc = getYDoc(documentId);

  if (!state.providers.has(documentId)) {
    // Create a WebSocket provider
    const provider = new WebsocketProvider(
      currentConfig.serverUrl,
      `${currentConfig.roomPrefix}${documentId}`,
      doc,
      { connect: true }
    );

    // Set awareness (user presence) data
    const awareness = provider.awareness;
    awareness.setLocalStateField('user', {
      name: currentConfig.userName,
      color: currentConfig.userColor,
      avatar: currentConfig.userAvatar,
    });

    // Store the provider
    state.providers.set(documentId, provider);

    // Event listeners for connection status
    provider.on('status', (event: { status: 'connecting' | 'connected' | 'disconnected' }) => {
      console.log(`Connection status for ${documentId}: ${event.status}`);
    });

    // Handle connection errors
    provider.on('connection-error', (error: Error) => {
      console.error(`Connection error for ${documentId}:`, error);
    });

    // Handle awareness updates
    awareness.on('change', () => {
      // Get all users currently in the document
      const states = awareness.getStates();
      const users: UserAwarenessData[] = [];

      states.forEach((state, clientId) => {
        if (state.user) {
          users.push({
            ...state.user,
            clientId,
          } as unknown as UserAwarenessData);
        }
      });

      console.log(`Users in document ${documentId}:`, users);
    });
  }

  return state.providers.get(documentId)!;
};

/**
 * Disconnect from a document
 */
export const disconnectFromDocument = (documentId: string): void => {
  const provider = state.providers.get(documentId);
  if (provider) {
    provider.disconnect();
    state.providers.delete(documentId);
  }

  const doc = state.documents.get(documentId);
  if (doc) {
    doc.destroy();
    state.documents.delete(documentId);
  }

  const indexeddbProvider = state.indexedDBProviders.get(documentId);
  if (indexeddbProvider) {
    indexeddbProvider.destroy();
    state.indexedDBProviders.delete(documentId);
  }
};

/**
 * Register a text editor with a document
 */
export const registerEditor = (documentId: string, editor: Editor): void => {
  state.editors.set(documentId, editor);
};

/**
 * Unregister a text editor
 */
export const unregisterEditor = (documentId: string): void => {
  state.editors.delete(documentId);
};

/**
 * Update the user's awareness (presence) data
 */
export const updateUserAwareness = (
  documentId: string,
  data: Partial<UserAwarenessData>
): void => {
  const provider = state.providers.get(documentId);
  if (!provider) return;

  const awareness = provider.awareness;
  const currentState = awareness.getLocalState() || {};
  
  awareness.setLocalStateField('user', {
    ...currentState.user,
    ...data,
  });
};

/**
 * Get all users currently connected to a document
 */
export const getConnectedUsers = (documentId: string): UserAwarenessData[] => {
  const provider = state.providers.get(documentId);
  if (!provider) return [];

  const awareness = provider.awareness;
  const states = awareness.getStates();
  const users: UserAwarenessData[] = [];

  states.forEach((state) => {
    if (state.user) {
      users.push(state.user as UserAwarenessData);
    }
  });

  return users;
};

/**
 * Get the shared text for a document
 */
export const getSharedText = (documentId: string): Y.Text => {
  const doc = getYDoc(documentId);
  return doc.getText('content');
};

/**
 * Get the shared map for document metadata
 */
export const getSharedMetadata = (documentId: string): Y.Map<any> => {
  const doc = getYDoc(documentId);
  return doc.getMap('metadata');
};

/**
 * Observe changes to the shared text
 */
export const observeSharedText = (
  documentId: string,
  callback: (event: Y.YTextEvent) => void
): void => {
  const text = getSharedText(documentId);
  text.observe(callback);
};

/**
 * Observe changes to the shared metadata
 */
export const observeSharedMetadata = (
  documentId: string,
  callback: (event: Y.YMapEvent<any>) => void
): void => {
  const metadata = getSharedMetadata(documentId);
  metadata.observe(callback);
};

/**
 * Update document metadata
 */
export const updateDocumentMetadata = (
  documentId: string,
  metadata: Record<string, any>
): void => {
  const sharedMetadata = getSharedMetadata(documentId);
  
  // Use a transaction to batch updates
  const doc = getYDoc(documentId);
  doc.transact(() => {
    for (const [key, value] of Object.entries(metadata)) {
      sharedMetadata.set(key, value);
    }
  });
};

/**
 * Add a collaborative cursor to a CodeMirror instance
 * This is a placeholder and would need to be implemented with specific CodeMirror integration
 */
export const addCollaborativeCursors = (documentId: string): void => {
  // This would need implementation specific to CodeMirror or other editor
  console.log(`Adding collaborative cursors to ${documentId}`);
};

/**
 * Create a new collaborative document
 */
export const createCollaborativeDocument = (
  documentId: string,
  initialContent: string = ''
): Y.Doc => {
  const doc = getYDoc(documentId);
  const text = doc.getText('content');
  
  // Only set initial content if the text is empty
  if (text.length === 0 && initialContent) {
    text.insert(0, initialContent);
  }
  
  // Set initial metadata
  const metadata = doc.getMap('metadata');
  if (metadata.size === 0) {
    metadata.set('createdAt', new Date().toISOString());
    metadata.set('createdBy', currentConfig.userName);
  }
  
  return doc;
};

/**
 * Get the collaboration status for a document
 */
export const getCollaborationStatus = (documentId: string): {
  connected: boolean;
  usersCount: number;
  synced: boolean;
} => {
  const provider = state.providers.get(documentId);
  if (!provider) {
    return { connected: false, usersCount: 0, synced: false };
  }
  
  const awareness = provider.awareness;
  return {
    connected: provider.wsconnected,
    usersCount: awareness.getStates().size,
    synced: provider.synced,
  };
};

// Export the collaboration service as a singleton
export const collaborationService = {
  init: initCollaboration,
  connect: connectToDocument,
  disconnect: disconnectFromDocument,
  getYDoc,
  getSharedText,
  getSharedMetadata,
  updateDocumentMetadata,
  registerEditor,
  unregisterEditor,
  updateUserAwareness,
  getConnectedUsers,
  observeSharedText,
  observeSharedMetadata,
  createCollaborativeDocument,
  getCollaborationStatus,
};

export default collaborationService; 