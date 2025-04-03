const WebSocket = require('ws');
const http = require('http');
const { MongodbPersistence } = require('y-mongodb-provider');
const Y = require('yjs');
const { setupWSConnection } = require('y-websocket/bin/utils');
const logger = require('../utils/logger');
require('dotenv').config();

const port = process.env.PORT || 1234;
const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/collabication';

// Create a MongoDB persistence provider
const mongodbPersistence = new MongodbPersistence(mongoURI);

// Create HTTP server
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Collabication Collaboration Server');
});

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// WebSocket connection handler
wss.on('connection', (conn, req) => {
  // Extract room name from URL (e.g., /documents/123)
  const url = new URL(req.url, 'http://localhost');
  const pathname = url.pathname.slice(1);
  
  // Log connection
  logger.info(`Connection established: ${pathname}`);
  
  // Set up WebSocket connection with persistence
  setupWSConnection(
    conn,
    req,
    {
      docName: pathname,
      gc: true,
    },
    async (documentName, doc) => {
      // Load document from database when it's requested
      const persistedYdoc = await mongodbPersistence.getYDoc(documentName);
      
      // Apply changes to the new document
      Y.applyUpdate(doc, Y.encodeStateAsUpdate(persistedYdoc));
      
      // Listen for changes and persist them
      doc.on('update', async (update) => {
        await mongodbPersistence.storeUpdate(documentName, update);
      });
    }
  );
});

// Start the server
server.listen(port, () => {
  logger.info(`Collaboration server listening on port ${port}`);
}); 