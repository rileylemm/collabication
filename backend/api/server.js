const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const { connectToDatabase } = require('../utils/db');
const logger = require('../utils/logger');
require('dotenv').config();

// Routes
const agentRoutes = require('./routes/agent');

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

// Routes
app.use('/api/agent', agentRoutes);

// Default route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Collabication npcsh API adapter' });
});

// Socket.io connection for streaming responses
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).json({
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Start server
const PORT = process.env.PORT || 4000;

const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectToDatabase();
    
    server.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    logger.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

startServer(); 