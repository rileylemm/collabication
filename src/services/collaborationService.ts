import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { IndexeddbPersistence } from 'y-indexeddb';
import { Editor } from '@tiptap/core';
import { Awareness } from 'y-protocols/awareness';
import { v4 as uuidv4 } from 'uuid';

// Configuration options for the collaboration service
export interface CollaborationConfig {
  serverUrl: string;
  roomPrefix: string;
  localStorageId: string;
  autoReconnect: boolean;
}

// Network status type
export type NetworkStatus = 'online' | 'offline' | 'reconnecting';

// Permission roles
export type PermissionRole = 'owner' | 'editor' | 'viewer';

// Permission object type
export interface Permission {
  userId: string;  // Unique user identifier
  userEmail?: string; // Optional user email
  userName?: string;  // Optional user name
  role: PermissionRole; // User's role for this document
  grantedBy: string;   // ID of user who granted the permission
  grantedAt: string;   // ISO date when permission was granted
}

// Types of events that can be listened to
export type CollaborationEventType = 
  | 'awareness'
  | 'status'
  | 'update'
  | 'networkStatus'
  | 'permissions';

// User awareness data type
export interface UserAwarenessData {
  id: string;
  name: string;
  color: string;
  avatar?: string;
  position?: {
    from: number;
    to: number;
  };
  isCurrentUser?: boolean;
}

// Item for offline change queue
export interface OfflineChangeQueueItem {
  documentId: string;
  timestamp: number;
  type: 'update' | 'awareness';
  data?: any;
}

// Default configuration
const DEFAULT_CONFIG: CollaborationConfig = {
  serverUrl: 'wss://demos.yjs.dev',
  roomPrefix: 'collabication-',
  localStorageId: 'collabication-user',
  autoReconnect: true,
};

/**
 * Collaboration service for managing real-time document collaboration using Yjs
 */
class CollaborationService {
  private config: CollaborationConfig = DEFAULT_CONFIG;
  private docs: Map<string, Y.Doc> = new Map();
  private providers: Map<string, WebsocketProvider> = new Map();
  private offlineChanges: Map<string, OfflineChangeQueueItem[]> = new Map();
  private currentUserId: string = '';
  private networkStatus: NetworkStatus = 'online';
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private reconnectDelay: number = 1000;
  private reconnectBackoffFactor: number = 1.5;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private eventListeners: Map<CollaborationEventType, Function[]> = new Map();
  
  /**
   * Initialize the collaboration service with configuration options
   */
  init(config: Partial<CollaborationConfig> = {}): void {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Generate or retrieve user ID
    this.currentUserId = this.getCurrentUserId();
    
    // Set up network status listeners
    this.setupNetworkListeners();
  }
  
  /**
   * Set up listeners for network status changes
   */
  private setupNetworkListeners(): void {
    if (typeof window !== 'undefined') {
      // Set initial network status
      this.networkStatus = navigator.onLine ? 'online' : 'offline';
      
      // Add event listeners for online/offline events
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
    }
  }
  
  /**
   * Handle the browser going online
   */
  private handleOnline = (): void => {
    console.log('Browser is online');
    const previousStatus = this.networkStatus;
    this.networkStatus = 'online';
    
    // Notify listeners of network status change
    this.emitEvent('networkStatus', this.networkStatus);
    
    // If we were offline, try to reconnect to open documents
    if (previousStatus === 'offline') {
      this.attemptReconnectToAllDocuments();
    }
    
    // Clear the reconnect timeout if it exists
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    // Reset reconnect attempts
    this.reconnectAttempts = 0;
  };
  
  /**
   * Handle the browser going offline
   */
  private handleOffline = (): void => {
    console.log('Browser is offline');
    this.networkStatus = 'offline';
    
    // Notify listeners of network status change
    this.emitEvent('networkStatus', this.networkStatus);
    
    // Store unsaved changes for all open documents
    this.docs.forEach((doc, documentId) => {
      this.markDocumentForSync(documentId);
    });
  };
  
  /**
   * Get the current network status
   */
  getNetworkStatus(): NetworkStatus {
    return this.networkStatus;
  }
  
  /**
   * Register a listener for network status changes
   */
  onNetworkStatusChange(callback: (status: NetworkStatus) => void): () => void {
    return this.on('networkStatus', callback);
  }
  
  /**
   * Attempt to reconnect to all open documents
   */
  private attemptReconnectToAllDocuments(): void {
    if (this.networkStatus !== 'online') {
      return;
    }
    
    this.networkStatus = 'reconnecting';
    this.emitEvent('networkStatus', this.networkStatus);
    
    // Reconnect to all open documents
    const reconnectPromises = Array.from(this.docs.keys()).map(documentId => {
      return this.reconnectToDocument(documentId)
        .catch(error => {
          console.error(`Failed to reconnect to document ${documentId}:`, error);
          return false;
        });
    });
    
    Promise.all(reconnectPromises)
      .then(results => {
        const allSuccessful = results.every(success => success === true);
        if (allSuccessful) {
          this.networkStatus = 'online';
          this.emitEvent('networkStatus', this.networkStatus);
          
          // Sync offline changes for all documents
          this.syncAllOfflineChanges();
        } else {
          // Some connections failed, retry with backoff
          this.startAutoReconnect();
        }
      });
  }
  
  /**
   * Reconnect to a specific document
   */
  private async reconnectToDocument(documentId: string): Promise<boolean> {
    try {
      const existingProvider = this.providers.get(documentId);
      if (existingProvider) {
        // Disconnect the existing provider
        existingProvider.disconnect();
        this.providers.delete(documentId);
      }
      
      // Create a new provider and connect
      const doc = this.docs.get(documentId);
      if (!doc) {
        throw new Error(`Document ${documentId} not found`);
      }
      
      const provider = new WebsocketProvider(
        this.config.serverUrl,
        `${this.config.roomPrefix}${documentId}`,
        doc
      );
      
      // Wait for connection
      return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          provider.off('status', statusHandler);
          reject(new Error('Connection timeout'));
        }, 5000);
        
        const statusHandler = ({ status }: { status: string }) => {
          if (status === 'connected') {
            provider.off('status', statusHandler);
            clearTimeout(timeoutId);
            this.providers.set(documentId, provider);
            resolve(true);
          }
        };
        
        provider.on('status', statusHandler);
      });
    } catch (error) {
      console.error(`Error reconnecting to document ${documentId}:`, error);
      return false;
    }
  }
  
  /**
   * Start auto reconnect with exponential backoff
   */
  private startAutoReconnect(): void {
    // If auto reconnect is disabled, don't try to reconnect
    if (!this.config.autoReconnect) {
      this.networkStatus = 'offline';
      this.emitEvent('networkStatus', this.networkStatus);
      return;
    }
    
    // If we've reached the maximum number of attempts, stop trying
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn(`Maximum reconnect attempts (${this.maxReconnectAttempts}) reached`);
      this.networkStatus = 'offline';
      this.emitEvent('networkStatus', this.networkStatus);
      return;
    }
    
    // Calculate delay with exponential backoff
    const delay = this.reconnectDelay * Math.pow(this.reconnectBackoffFactor, this.reconnectAttempts);
    this.reconnectAttempts++;
    
    console.log(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);
    
    // Clear any existing timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    
    // Set a new timeout
    this.reconnectTimeout = setTimeout(() => {
      this.attemptReconnectToAllDocuments();
    }, delay);
  }
  
  /**
   * Mark a document for synchronization when it comes back online
   */
  private markDocumentForSync(documentId: string): void {
    const doc = this.docs.get(documentId);
    if (!doc) {
      return;
    }
    
    // Add to the offline changes queue
    if (!this.offlineChanges.has(documentId)) {
      this.offlineChanges.set(documentId, []);
    }
    
    // Add a change item if there isn't already one
    const changes = this.offlineChanges.get(documentId)!;
    if (!changes.some(change => change.type === 'update')) {
      changes.push({
        documentId,
        timestamp: Date.now(),
        type: 'update'
      });
    }
  }
  
  /**
   * Get a list of document IDs that have pending offline changes
   */
  getDocumentsWithOfflineChanges(): string[] {
    return Array.from(this.offlineChanges.keys());
  }
  
  /**
   * Get the offline status of a document
   */
  getDocumentOfflineStatus(documentId: string): { hasPendingChanges: boolean, timestamp?: number } {
    const changes = this.offlineChanges.get(documentId);
    if (!changes || changes.length === 0) {
      return { hasPendingChanges: false };
    }
    
    // Find the latest timestamp
    const latestChange = changes.reduce((latest, current) => {
      return latest.timestamp > current.timestamp ? latest : current;
    });
    
    return {
      hasPendingChanges: true,
      timestamp: latestChange.timestamp
    };
  }
  
  /**
   * Sync offline changes for all documents
   */
  private syncAllOfflineChanges(): void {
    const documents = this.getDocumentsWithOfflineChanges();
    documents.forEach(docId => {
      this.syncOfflineChanges(docId);
    });
  }
  
  /**
   * Sync offline changes for a specific document
   */
  syncOfflineChanges(documentId: string): void {
    if (this.networkStatus !== 'online') {
      console.warn('Cannot sync offline changes while offline');
      return;
    }
    
    const changes = this.offlineChanges.get(documentId);
    if (!changes || changes.length === 0) {
      return;
    }
    
    console.log(`Syncing ${changes.length} offline changes for document ${documentId}`);
    
    // The Y.js CRDT algorithm will handle the merging of changes automatically
    // We just need to make sure the provider is connected and then clear the sync flag
    const provider = this.providers.get(documentId);
    if (!provider) {
      console.warn(`Cannot sync document ${documentId}: provider not found`);
      return;
    }
    
    if (provider.wsconnected) {
      // Clear the offline changes for this document
      this.offlineChanges.delete(documentId);
      console.log(`Synced changes for document ${documentId}`);
    } else {
      // Try to reconnect
      this.reconnectToDocument(documentId)
        .then(success => {
          if (success) {
            this.offlineChanges.delete(documentId);
            console.log(`Synced changes for document ${documentId} after reconnect`);
          }
        })
        .catch(error => {
          console.error(`Failed to sync document ${documentId}:`, error);
        });
    }
  }
  
  /**
   * Generate or retrieve the current user ID
   */
  private getCurrentUserId(): string {
    // Check if we have a user ID in local storage
    if (typeof window !== 'undefined' && window.localStorage) {
      const storedId = localStorage.getItem(`${this.config.localStorageId}-userId`);
      if (storedId) {
        return storedId;
      }
      
      // Generate a new ID
      const newId = uuidv4();
      localStorage.setItem(`${this.config.localStorageId}-userId`, newId);
      return newId;
    }
    
    // Fallback for non-browser environments
    return uuidv4();
  }
  
  /**
   * Get the current user's awareness data
   */
  getCurrentUserAwarenessData(): UserAwarenessData {
    // Check if we have user data in local storage
    let name = 'Anonymous';
    let color = '#' + Math.floor(Math.random() * 16777215).toString(16);
    
    if (typeof window !== 'undefined' && window.localStorage) {
      const storedName = localStorage.getItem(`${this.config.localStorageId}-name`);
      const storedColor = localStorage.getItem(`${this.config.localStorageId}-color`);
      
      if (storedName) {
        name = storedName;
      }
      
      if (storedColor) {
        color = storedColor;
      }
    }
    
    return {
      id: this.currentUserId,
      name,
      color,
      isCurrentUser: true
    };
  }
  
  /**
   * Create a collaborative document or get an existing one
   */
  createCollaborativeDocument(documentId: string, initialContent?: string): Y.Doc {
    // Check if we already have this document
    if (this.docs.has(documentId)) {
      return this.docs.get(documentId)!;
    }
    
    // Create a new Y.Doc
    const doc = new Y.Doc();
    this.docs.set(documentId, doc);
    
    // If there's initial content, set it
    if (initialContent && initialContent.length > 0) {
      const yText = doc.getText('content');
      if (yText.toString() === '') {
        yText.insert(0, initialContent);
      }
    }
    
    // Initialize permissions for the document
    this.initializeDocumentPermissions(documentId, doc);
    
    return doc;
  }
  
  /**
   * Initialize permissions for a new document
   * Sets the current user as the owner
   */
  private initializeDocumentPermissions(documentId: string, doc: Y.Doc): void {
    const permissionsMap = doc.getMap('permissions');
    
    // If permissions are already set, don't initialize again
    if (permissionsMap.size > 0) {
      return;
    }
    
    // Set the current user as the owner
    const currentUser = this.getCurrentUserAwarenessData();
    const ownerPermission: Permission = {
      userId: currentUser.id,
      userName: currentUser.name,
      role: 'owner',
      grantedBy: currentUser.id,
      grantedAt: new Date().toISOString()
    };
    
    // Store permissions in the Yjs document
    permissionsMap.set(currentUser.id, ownerPermission);
    
    // Set document metadata
    const metadata = doc.getMap('metadata');
    metadata.set('createdBy', currentUser.id);
    metadata.set('createdAt', new Date().toISOString());
    metadata.set('ownerId', currentUser.id);
  }

  /**
   * Get the permissions for a document
   */
  getDocumentPermissions(documentId: string): Permission[] {
    const doc = this.getYDoc(documentId);
    const permissionsMap = doc.getMap('permissions');
    const permissions: Permission[] = [];
    
    permissionsMap.forEach((permission) => {
      permissions.push(permission as Permission);
    });
    
    return permissions;
  }
  
  /**
   * Get the permission for a specific user in a document
   */
  getUserPermission(documentId: string, userId: string): Permission | null {
    const doc = this.getYDoc(documentId);
    const permissionsMap = doc.getMap('permissions');
    
    if (permissionsMap.has(userId)) {
      return permissionsMap.get(userId) as Permission;
    }
    
    return null;
  }
  
  /**
   * Get the current user's permission for a document
   */
  getCurrentUserPermission(documentId: string): Permission | null {
    return this.getUserPermission(documentId, this.currentUserId);
  }
  
  /**
   * Check if the current user has a specific permission role or higher
   */
  hasPermission(documentId: string, requiredRole: PermissionRole): boolean {
    const permission = this.getCurrentUserPermission(documentId);
    
    if (!permission) {
      return false;
    }
    
    // Define role hierarchy
    const roleHierarchy: { [key in PermissionRole]: number } = {
      'owner': 3,
      'editor': 2,
      'viewer': 1
    };
    
    // Check if the user's role is equal to or higher than the required role
    return roleHierarchy[permission.role] >= roleHierarchy[requiredRole];
  }
  
  /**
   * Set a permission for a user in a document
   */
  setUserPermission(documentId: string, userPermission: Permission): boolean {
    // Check if the current user has permission to set permissions
    if (!this.hasPermission(documentId, 'owner')) {
      console.error('Current user does not have permission to set permissions');
      return false;
    }
    
    const doc = this.getYDoc(documentId);
    const permissionsMap = doc.getMap('permissions');
    
    // Update the permission with the current user as grantor
    const updatedPermission: Permission = {
      ...userPermission,
      grantedBy: this.currentUserId,
      grantedAt: new Date().toISOString()
    };
    
    // Store the permission
    permissionsMap.set(userPermission.userId, updatedPermission);
    
    // Emit a permissions change event
    this.emitEvent('permissions', {
      documentId,
      permissions: this.getDocumentPermissions(documentId)
    });
    
    return true;
  }
  
  /**
   * Remove a user's permission from a document
   */
  removeUserPermission(documentId: string, userId: string): boolean {
    // Check if the current user has permission to remove permissions
    if (!this.hasPermission(documentId, 'owner')) {
      console.error('Current user does not have permission to remove permissions');
      return false;
    }
    
    // Cannot remove the owner's permission
    const doc = this.getYDoc(documentId);
    const metadata = doc.getMap('metadata');
    const ownerId = metadata.get('ownerId') as string;
    
    if (userId === ownerId) {
      console.error('Cannot remove the owner\'s permission');
      return false;
    }
    
    const permissionsMap = doc.getMap('permissions');
    
    // Remove the permission
    permissionsMap.delete(userId);
    
    // Emit a permissions change event
    this.emitEvent('permissions', {
      documentId,
      permissions: this.getDocumentPermissions(documentId)
    });
    
    return true;
  }
  
  /**
   * Transfer document ownership to another user
   */
  transferOwnership(documentId: string, newOwnerId: string): boolean {
    // Check if the current user is the owner
    if (!this.hasPermission(documentId, 'owner')) {
      console.error('Only the document owner can transfer ownership');
      return false;
    }
    
    const doc = this.getYDoc(documentId);
    const permissionsMap = doc.getMap('permissions');
    const metadata = doc.getMap('metadata');
    
    // Check if the new owner has permission
    if (!permissionsMap.has(newOwnerId)) {
      console.error('The new owner must already have permission to access the document');
      return false;
    }
    
    // Get the current permission for the new owner
    const newOwnerPermission = permissionsMap.get(newOwnerId) as Permission;
    
    // Update to owner role
    const updatedPermission: Permission = {
      ...newOwnerPermission,
      role: 'owner',
      grantedBy: this.currentUserId,
      grantedAt: new Date().toISOString()
    };
    
    // Get the current owner
    const currentOwnerId = metadata.get('ownerId') as string;
    const currentOwnerPermission = permissionsMap.get(currentOwnerId) as Permission;
    
    // Downgrade current owner to editor
    const downgradePermission: Permission = {
      ...currentOwnerPermission,
      role: 'editor',
      grantedBy: this.currentUserId,
      grantedAt: new Date().toISOString()
    };
    
    // Update permissions
    permissionsMap.set(newOwnerId, updatedPermission);
    permissionsMap.set(currentOwnerId, downgradePermission);
    
    // Update metadata
    metadata.set('ownerId', newOwnerId);
    
    // Emit a permissions change event
    this.emitEvent('permissions', {
      documentId,
      permissions: this.getDocumentPermissions(documentId)
    });
    
    return true;
  }
  
  /**
   * Check if the current user can edit a document
   */
  canEdit(documentId: string): boolean {
    return this.hasPermission(documentId, 'editor');
  }
  
  /**
   * Check if the current user can view a document
   */
  canView(documentId: string): boolean {
    return this.hasPermission(documentId, 'viewer');
  }
  
  /**
   * Check if the current user is the owner of a document
   */
  isOwner(documentId: string): boolean {
    return this.hasPermission(documentId, 'owner');
  }
  
  /**
   * Register a permission change listener
   */
  onPermissionsChange(callback: (data: { documentId: string, permissions: Permission[] }) => void): () => void {
    return this.on('permissions', callback);
  }
  
  /**
   * Get a Y.Doc for a document ID
   */
  getYDoc(documentId: string): Y.Doc {
    if (!this.docs.has(documentId)) {
      this.createCollaborativeDocument(documentId);
    }
    
    return this.docs.get(documentId)!;
  }
  
  /**
   * Get the shared text for a document
   */
  getSharedText(documentId: string): Y.Text {
    const doc = this.getYDoc(documentId);
    return doc.getText('content');
  }
  
  /**
   * Connect to a document and return the WebsocketProvider
   */
  connect(documentId: string): WebsocketProvider {
    // If we're offline, don't try to connect
    if (this.networkStatus === 'offline') {
      throw new Error('Cannot connect while offline');
    }
    
    // Check if we already have a provider for this document
    if (this.providers.has(documentId)) {
      return this.providers.get(documentId)!;
    }
    
    // Get the Y.Doc
    const doc = this.getYDoc(documentId);
    
    // Create a new WebsocketProvider
    const provider = new WebsocketProvider(
      this.config.serverUrl,
      `${this.config.roomPrefix}${documentId}`,
      doc
    );
    
    // Set up awareness with the current user's data
    const awareness = provider.awareness;
    awareness.setLocalState({
      user: this.getCurrentUserAwarenessData()
    });
    
    // Store the provider
    this.providers.set(documentId, provider);
    
    return provider;
  }
  
  /**
   * Disconnect from a document
   */
  disconnect(documentId: string): void {
    const provider = this.providers.get(documentId);
    if (provider) {
      provider.disconnect();
      this.providers.delete(documentId);
    }
  }
  
  /**
   * Update the user's awareness in a document
   */
  updateUserAwareness(documentId: string, data: Partial<UserAwarenessData>): void {
    const provider = this.providers.get(documentId);
    if (!provider) {
      console.warn(`Cannot update awareness for document ${documentId}: provider not found`);
      return;
    }
    
    const awareness = provider.awareness;
    const currentState = awareness.getLocalState() || {};
    const currentUser = currentState.user || this.getCurrentUserAwarenessData();
    
    // Update the user data
    const updatedUser = {
      ...currentUser,
      ...data,
      id: this.currentUserId, // Ensure ID doesn't change
      isCurrentUser: true // Ensure this flag doesn't change
    };
    
    // Save name and color to local storage for future sessions
    if (typeof window !== 'undefined' && window.localStorage) {
      if (data.name) {
        localStorage.setItem(`${this.config.localStorageId}-name`, data.name);
      }
      
      if (data.color) {
        localStorage.setItem(`${this.config.localStorageId}-color`, data.color);
      }
    }
    
    // Update the awareness state
    awareness.setLocalState({
      ...currentState,
      user: updatedUser
    });
    
    // If we're offline, mark the document for sync
    if (this.networkStatus === 'offline') {
      this.markDocumentForSync(documentId);
    }
  }
  
  /**
   * Update metadata for a document
   */
  updateDocumentMetadata(documentId: string, metadata: Record<string, any>): void {
    const doc = this.getYDoc(documentId);
    const metaMap = doc.getMap('metadata');
    
    // Update each metadata field
    Object.entries(metadata).forEach(([key, value]) => {
      metaMap.set(key, value);
    });
    
    // If we're offline, mark the document for sync
    if (this.networkStatus === 'offline') {
      this.markDocumentForSync(documentId);
    }
  }
  
  /**
   * Register an event listener
   */
  on(eventType: CollaborationEventType, callback: Function): () => void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    
    const listeners = this.eventListeners.get(eventType)!;
    listeners.push(callback);
    
    // Return a function to remove the listener
    return () => {
      const index = listeners.indexOf(callback);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    };
  }
  
  /**
   * Emit an event to registered listeners
   */
  private emitEvent(eventType: CollaborationEventType, ...args: any[]): void {
    const listeners = this.eventListeners.get(eventType);
    if (!listeners) {
      return;
    }
    
    // Call all registered listeners with the provided arguments
    listeners.forEach(callback => {
      try {
        callback(...args);
      } catch (error) {
        console.error(`Error in ${eventType} event listener:`, error);
      }
    });
  }
  
  /**
   * Clean up and dispose of resources
   */
  dispose(): void {
    // Disconnect all providers
    this.providers.forEach(provider => {
      provider.disconnect();
    });
    
    // Clear all maps
    this.docs.clear();
    this.providers.clear();
    this.eventListeners.clear();
    
    // Remove network listeners
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
    }
    
    // Clear any reconnect timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }
}

// Create and export a singleton instance
const collaborationService = new CollaborationService();
export default collaborationService; 