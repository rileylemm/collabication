const WebSocket = require('ws');
const http = require('http');
const { MongodbPersistence } = require('y-mongodb-provider');
const Y = require('yjs');
const { setupWSConnection, pingTimeout } = require('y-websocket/bin/utils');
const url = require('url');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
require('dotenv').config();

// Configuration
const port = process.env.PORT || 1234;
const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/collabication';
const JWT_SECRET = process.env.JWT_SECRET || 'collabication-secret-key';
const PING_TIMEOUT = 30000; // 30 seconds ping timeout

// Create a MongoDB persistence provider
const mongodbPersistence = new MongodbPersistence(mongoURI);

// Track active connections and rooms
const activeConnections = new Map();
const activeRooms = new Map();

// Create HTTP server with a basic API for health checks and stats
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Health check endpoint
  if (pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: Date.now()
    }));
    return;
  }

  // Stats endpoint
  if (pathname === '/stats') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      activeConnections: activeConnections.size,
      activeRooms: Array.from(activeRooms.keys()),
      usersPerRoom: Array.from(activeRooms.entries()).map(([room, users]) => ({
        room,
        users: users.size
      }))
    }));
    return;
  }

  // Default response
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Collabication Collaboration Server');
});

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Verify JWT token
const verifyToken = (token) => {
  try {
    if (!token) return null;
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    logger.error('JWT verification error:', error);
    return null;
  }
};

// Extract authentication data from request
const extractAuth = (req) => {
  // Get token from query params or auth header
  const query = url.parse(req.url, true).query;
  const authHeader = req.headers.authorization;
  
  let token = query.token;
  if (!token && authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }
  
  if (!token) {
    // Allow anonymous access with generated user info
    return {
      authenticated: false,
      userId: `anon-${Math.floor(Math.random() * 1000000)}`,
      name: 'Anonymous User',
      color: `#${Math.floor(Math.random() * 16777215).toString(16)}`
    };
  }
  
  const user = verifyToken(token);
  if (!user) {
    return {
      authenticated: false,
      userId: `anon-${Math.floor(Math.random() * 1000000)}`,
      name: 'Anonymous User',
      color: `#${Math.floor(Math.random() * 16777215).toString(16)}`
    };
  }
  
  return {
    authenticated: true,
    userId: user.id || user.sub,
    name: user.name || 'Authenticated User',
    color: user.color || `#${Math.floor(Math.random() * 16777215).toString(16)}`,
    email: user.email
  };
};

// Keep track of room participants
const addUserToRoom = (roomName, userId, userData) => {
  if (!activeRooms.has(roomName)) {
    activeRooms.set(roomName, new Map());
  }
  
  const room = activeRooms.get(roomName);
  room.set(userId, userData);
  
  logger.info(`User ${userData.name} (${userId}) joined room ${roomName}. Total users: ${room.size}`);
};

const removeUserFromRoom = (roomName, userId) => {
  if (!activeRooms.has(roomName)) return;
  
  const room = activeRooms.get(roomName);
  const userData = room.get(userId);
  
  room.delete(userId);
  
  if (room.size === 0) {
    activeRooms.delete(roomName);
    logger.info(`Room ${roomName} is now empty and has been cleaned up`);
  } else {
    logger.info(`User ${userData?.name || userId} left room ${roomName}. Remaining users: ${room.size}`);
  }
};

// WebSocket connection handler
wss.on('connection', (conn, req) => {
  try {
    // Extract room name from URL (e.g., /documents/123)
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname.slice(1);
    
    // Extract user information
    const auth = extractAuth(req);
    const { userId, name, color, authenticated } = auth;
    
    // Log connection
    logger.info(`Connection established: ${pathname} by user ${name} (${userId}), authenticated: ${authenticated}`);
    
    // Store connection data
    const connectionData = {
      id: userId,
      name,
      color,
      authenticated,
      roomName: pathname,
      conn
    };
    
    activeConnections.set(conn, connectionData);
    addUserToRoom(pathname, userId, { name, color, authenticated });
    
    // Set up WebSocket connection with persistence and awareness
    setupWSConnection(
      conn,
      req,
      {
        docName: pathname,
        gc: true,
        // Add authentication info to the connection
        auth: { userId, name, color, authenticated }
      },
      async (documentName, doc) => {
        try {
          // Load document from database when it's requested
          const persistedYdoc = await mongodbPersistence.getYDoc(documentName);
          
          // Apply changes to the new document
          Y.applyUpdate(doc, Y.encodeStateAsUpdate(persistedYdoc));
          
          // Listen for changes and persist them
          doc.on('update', async (update) => {
            try {
              await mongodbPersistence.storeUpdate(documentName, update);
            } catch (error) {
              logger.error(`Error storing document update for ${documentName}:`, error);
            }
          });
        } catch (error) {
          logger.error(`Error loading document ${documentName}:`, error);
        }
      }
    );
    
    // Set up ping timeout to detect disconnected clients
    const pingTimeoutObj = pingTimeout(conn, PING_TIMEOUT);
    
    // Handle disconnection
    conn.on('close', () => {
      // Clear ping timeout
      clearTimeout(pingTimeoutObj);
      
      // Get connection data
      const data = activeConnections.get(conn);
      if (data) {
        // Remove user from room
        removeUserFromRoom(data.roomName, data.id);
        // Remove connection
        activeConnections.delete(conn);
        
        logger.info(`Connection closed: ${data.roomName} by user ${data.name} (${data.id})`);
      }
    });
  } catch (error) {
    logger.error('Error handling WebSocket connection:', error);
    conn.close();
  }
});

// Handle server errors
server.on('error', (error) => {
  logger.error('Server error:', error);
});

// Handle process termination
process.on('SIGINT', async () => {
  logger.info('Server shutting down...');
  
  // Close all WebSocket connections
  wss.clients.forEach((client) => {
    client.close();
  });
  
  // Close HTTP server
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

// Start the server
server.listen(port, () => {
  logger.info(`Collaboration server listening on port ${port}`);
  logger.info(`MongoDB persistence using ${mongoURI}`);
}); 