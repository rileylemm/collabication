import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import collaborationService, { UserAwarenessData, NetworkStatus, Permission, PermissionRole } from '../services/collaborationService';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

// Type definitions for the collaboration context
interface CollaborationContextType {
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;
  networkStatus: NetworkStatus;
  
  // Document info
  currentDocumentId: string | null;
  connectedUsers: UserAwarenessData[];
  documentsWithOfflineChanges: string[];
  
  // Permissions
  documentPermissions: Permission[];
  currentUserPermission: Permission | null;
  
  // Actions
  connectToDocument: (documentId: string, initialContent?: string) => Promise<void>;
  disconnectFromDocument: () => void;
  updateUserInfo: (data: Partial<UserAwarenessData>) => void;
  getYDoc: (documentId: string) => Y.Doc;
  getYText: (documentId: string) => Y.Text;
  updateDocumentMetadata: (metadata: Record<string, any>) => void;
  getDocumentOfflineStatus: (documentId: string) => { hasPendingChanges: boolean, timestamp?: number };
  
  // Permission methods
  hasPermission: (requiredRole: PermissionRole) => boolean;
  isOwner: () => boolean;
  canEdit: () => boolean;
  canView: () => boolean;
  getDocumentPermissions: () => Permission[];
  setUserPermission: (userPermission: Permission) => boolean;
  removeUserPermission: (userId: string) => boolean;
  transferOwnership: (newOwnerId: string) => boolean;
}

// Default context value
const defaultContextValue: CollaborationContextType = {
  isConnected: false,
  isConnecting: false,
  connectionError: null,
  networkStatus: 'online',
  currentDocumentId: null,
  connectedUsers: [],
  documentsWithOfflineChanges: [],
  documentPermissions: [],
  currentUserPermission: null,
  connectToDocument: async () => {},
  disconnectFromDocument: () => {},
  updateUserInfo: () => {},
  getYDoc: () => new Y.Doc(),
  getYText: () => new Y.Doc().getText('content'),
  updateDocumentMetadata: () => {},
  getDocumentOfflineStatus: () => ({ hasPendingChanges: false }),
  hasPermission: () => false,
  isOwner: () => false,
  canEdit: () => false,
  canView: () => false,
  getDocumentPermissions: () => [],
  setUserPermission: () => false,
  removeUserPermission: () => false,
  transferOwnership: () => false,
};

// Create the context
export const CollaborationContext = createContext<CollaborationContextType>(defaultContextValue);

// Custom hook for using the collaboration context
export const useCollaboration = () => useContext(CollaborationContext);

// Provider component
export const CollaborationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // State for connection status
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>(
    collaborationService.getNetworkStatus()
  );
  
  // Document state
  const [currentDocumentId, setCurrentDocumentId] = useState<string | null>(null);
  const [connectedUsers, setConnectedUsers] = useState<UserAwarenessData[]>([]);
  const [documentsWithOfflineChanges, setDocumentsWithOfflineChanges] = useState<string[]>([]);
  
  // Permissions state
  const [documentPermissions, setDocumentPermissions] = useState<Permission[]>([]);
  const [currentUserPermission, setCurrentUserPermission] = useState<Permission | null>(null);

  // Refs to store provider information for cleanup
  const providerRef = useRef<WebsocketProvider | null>(null);
  const eventHandlersRef = useRef<{
    onStatusChange: ((event: any) => void) | null;
    onConnectionError: ((error: Error) => void) | null;
    onAwarenessChange: (() => void) | null;
    onNetworkStatusChange: ((status: NetworkStatus) => void) | null;
    onPermissionsChange: ((data: any) => void) | null;
  }>({
    onStatusChange: null,
    onConnectionError: null,
    onAwarenessChange: null,
    onNetworkStatusChange: null,
    onPermissionsChange: null,
  });

  // Initialize the collaboration service
  useEffect(() => {
    collaborationService.init({
      serverUrl: process.env.REACT_APP_WS_SERVER_URL || 'wss://collabication-ws.example.com',
      roomPrefix: 'collabication-',
      localStorageId: 'collabication-user',
      autoReconnect: true,
    });

    // Set up network status change listener
    const unregisterNetworkListener = collaborationService.onNetworkStatusChange((status) => {
      console.log(`Network status updated in context: ${status}`);
      setNetworkStatus(status);
      
      // Update the list of documents with offline changes
      const docsWithChanges = collaborationService.getDocumentsWithOfflineChanges();
      setDocumentsWithOfflineChanges(docsWithChanges);
      
      // Update connection state based on network status
      if (status === 'online') {
        // We might be reconnecting automatically, don't update isConnected yet
        // The WebSocket provider will trigger a status change when connected
      } else if (status === 'offline') {
        setIsConnected(false);
        setIsConnecting(false);
      } else if (status === 'reconnecting') {
        setIsConnected(false);
        setIsConnecting(true);
      }
    });
    
    // Set up permissions change listener
    const unregisterPermissionsListener = collaborationService.onPermissionsChange((data) => {
      console.log(`Permissions updated for document ${data.documentId}`);
      
      // Only update if it's the current document
      if (data.documentId === currentDocumentId) {
        setDocumentPermissions(data.permissions);
        
        // Update current user's permission
        if (currentDocumentId) {
          const userPermission = collaborationService.getCurrentUserPermission(currentDocumentId);
          setCurrentUserPermission(userPermission);
        }
      }
    });
    
    // Store the handlers for cleanup
    eventHandlersRef.current.onNetworkStatusChange = unregisterNetworkListener;
    eventHandlersRef.current.onPermissionsChange = unregisterPermissionsListener;
    
    // Initial check for offline changes
    setDocumentsWithOfflineChanges(collaborationService.getDocumentsWithOfflineChanges());

    return () => {
      unregisterNetworkListener();
      unregisterPermissionsListener();
    };
  }, [currentDocumentId]);

  // Function to set up event listeners
  const setupEventListeners = useCallback((provider: WebsocketProvider) => {
    // Create event handlers
    const onStatusChange = (event: { status: 'connecting' | 'connected' | 'disconnected' }) => {
      if (event.status === 'connected') {
        setIsConnected(true);
        setIsConnecting(false);
        setConnectionError(null);
      } else if (event.status === 'connecting') {
        setIsConnected(false);
        setIsConnecting(true);
      } else {
        setIsConnected(false);
        setIsConnecting(false);
      }
    };
    
    const onConnectionError = (error: Error) => {
      setConnectionError(error.message);
      setIsConnecting(false);
      setIsConnected(false);
      
      // Update offline changes list - the error might have triggered offline mode
      setDocumentsWithOfflineChanges(collaborationService.getDocumentsWithOfflineChanges());
    };
    
    // Track connected users
    const awareness = provider.awareness;
    const onAwarenessChange = () => {
      const states = awareness.getStates();
      const users: UserAwarenessData[] = [];
      
      states.forEach((state) => {
        if (state.user) {
          users.push(state.user as UserAwarenessData);
        }
      });
      
      setConnectedUsers(users);
    };
    
    // Add listeners
    provider.on('status', onStatusChange);
    provider.on('connection-error', onConnectionError);
    awareness.on('change', onAwarenessChange);
    
    // Store references for cleanup
    providerRef.current = provider;
    eventHandlersRef.current = {
      ...eventHandlersRef.current,
      onStatusChange,
      onConnectionError,
      onAwarenessChange,
    };
    
    // Initial awareness update
    onAwarenessChange();
  }, []);

  // Function to clean up event listeners
  const cleanupEventListeners = useCallback(() => {
    const provider = providerRef.current;
    if (!provider) return;
    
    const handlers = eventHandlersRef.current;
    if (handlers.onStatusChange) {
      provider.off('status', handlers.onStatusChange);
    }
    
    if (handlers.onConnectionError) {
      provider.off('connection-error', handlers.onConnectionError);
    }
    
    const awareness = provider.awareness;
    if (awareness && handlers.onAwarenessChange) {
      awareness.off('change', handlers.onAwarenessChange);
    }
    
    // Reset refs (except network status handler and permissions handler)
    providerRef.current = null;
    eventHandlersRef.current = {
      ...eventHandlersRef.current,
      onStatusChange: null,
      onConnectionError: null,
      onAwarenessChange: null,
    };
  }, []);

  // Connect to a document
  const connectToDocument = useCallback(async (documentId: string, initialContent?: string): Promise<void> => {
    try {
      // Clean up previous connection if any
      cleanupEventListeners();
      
      setIsConnecting(true);
      setConnectionError(null);
      
      // Create or get the document
      collaborationService.createCollaborativeDocument(documentId, initialContent);
      
      // Connect to the WebSocket provider
      const provider = collaborationService.connect(documentId);
      
      // Set up event listeners
      setupEventListeners(provider);
      
      // Set the current document ID
      setCurrentDocumentId(documentId);
      
      // Get document permissions
      const permissions = collaborationService.getDocumentPermissions(documentId);
      setDocumentPermissions(permissions);
      
      // Get current user's permission
      const userPermission = collaborationService.getCurrentUserPermission(documentId);
      setCurrentUserPermission(userPermission);
      
      // Check if we have offline changes for this document
      if (documentsWithOfflineChanges.includes(documentId)) {
        console.log(`Document ${documentId} has offline changes that will be synced`);
      }
    } catch (error) {
      setConnectionError(error instanceof Error ? error.message : String(error));
      setIsConnecting(false);
      setIsConnected(false);
    }
  }, [cleanupEventListeners, setupEventListeners, documentsWithOfflineChanges]);

  // Disconnect from the current document
  const disconnectFromDocument = useCallback(() => {
    if (currentDocumentId) {
      // Clean up event listeners
      cleanupEventListeners();
      
      // Disconnect from the collaboration service
      collaborationService.disconnect(currentDocumentId);
      
      // Reset state
      setCurrentDocumentId(null);
      setIsConnected(false);
      setConnectedUsers([]);
      setDocumentPermissions([]);
      setCurrentUserPermission(null);
    }
  }, [currentDocumentId, cleanupEventListeners]);

  // Update user information
  const updateUserInfo = useCallback((data: Partial<UserAwarenessData>) => {
    if (currentDocumentId) {
      collaborationService.updateUserAwareness(currentDocumentId, data);
    }
  }, [currentDocumentId]);

  // Get the Y.Doc for a document
  const getYDoc = useCallback((documentId: string) => {
    return collaborationService.getYDoc(documentId);
  }, []);

  // Get the Y.Text for a document
  const getYText = useCallback((documentId: string) => {
    return collaborationService.getSharedText(documentId);
  }, []);

  // Update document metadata
  const updateDocumentMetadata = useCallback((metadata: Record<string, any>) => {
    if (currentDocumentId) {
      collaborationService.updateDocumentMetadata(currentDocumentId, metadata);
    }
  }, [currentDocumentId]);

  // Get offline status for a document
  const getDocumentOfflineStatus = useCallback((documentId: string) => {
    return collaborationService.getDocumentOfflineStatus(documentId);
  }, []);

  // Check if the current user has a specific permission
  const hasPermission = useCallback((requiredRole: PermissionRole): boolean => {
    if (!currentDocumentId) return false;
    return collaborationService.hasPermission(currentDocumentId, requiredRole);
  }, [currentDocumentId]);

  // Check if the current user is the owner
  const isOwner = useCallback((): boolean => {
    if (!currentDocumentId) return false;
    return collaborationService.isOwner(currentDocumentId);
  }, [currentDocumentId]);

  // Check if the current user can edit
  const canEdit = useCallback((): boolean => {
    if (!currentDocumentId) return false;
    return collaborationService.canEdit(currentDocumentId);
  }, [currentDocumentId]);

  // Check if the current user can view
  const canView = useCallback((): boolean => {
    if (!currentDocumentId) return false;
    return collaborationService.canView(currentDocumentId);
  }, [currentDocumentId]);

  // Get all permissions for the current document
  const getDocumentPermissions = useCallback((): Permission[] => {
    if (!currentDocumentId) return [];
    return collaborationService.getDocumentPermissions(currentDocumentId);
  }, [currentDocumentId]);

  // Set a user's permission
  const setUserPermission = useCallback((userPermission: Permission): boolean => {
    if (!currentDocumentId) return false;
    return collaborationService.setUserPermission(currentDocumentId, userPermission);
  }, [currentDocumentId]);

  // Remove a user's permission
  const removeUserPermission = useCallback((userId: string): boolean => {
    if (!currentDocumentId) return false;
    return collaborationService.removeUserPermission(currentDocumentId, userId);
  }, [currentDocumentId]);

  // Transfer document ownership
  const transferOwnership = useCallback((newOwnerId: string): boolean => {
    if (!currentDocumentId) return false;
    return collaborationService.transferOwnership(currentDocumentId, newOwnerId);
  }, [currentDocumentId]);

  // Update offline changes list periodically
  useEffect(() => {
    const checkOfflineChanges = () => {
      const docs = collaborationService.getDocumentsWithOfflineChanges();
      if (JSON.stringify(docs) !== JSON.stringify(documentsWithOfflineChanges)) {
        setDocumentsWithOfflineChanges(docs);
      }
    };
    
    // Check every 5 seconds
    const interval = setInterval(checkOfflineChanges, 5000);
    
    return () => {
      clearInterval(interval);
    };
  }, [documentsWithOfflineChanges]);

  // Clean up when component unmounts
  useEffect(() => {
    return () => {
      disconnectFromDocument();
    };
  }, [disconnectFromDocument]);

  // Context value
  const contextValue: CollaborationContextType = {
    isConnected,
    isConnecting,
    connectionError,
    networkStatus,
    currentDocumentId,
    connectedUsers,
    documentsWithOfflineChanges,
    documentPermissions,
    currentUserPermission,
    connectToDocument,
    disconnectFromDocument,
    updateUserInfo,
    getYDoc,
    getYText,
    updateDocumentMetadata,
    getDocumentOfflineStatus,
    hasPermission,
    isOwner,
    canEdit,
    canView,
    getDocumentPermissions,
    setUserPermission,
    removeUserPermission,
    transferOwnership,
  };

  return (
    <CollaborationContext.Provider value={contextValue}>
      {children}
    </CollaborationContext.Provider>
  );
};

export default CollaborationProvider; 