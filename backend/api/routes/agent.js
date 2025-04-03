const express = require('express');
const agentController = require('../controllers/agent');

const router = express.Router();

// Route for sending queries to the agent
router.post('/query', agentController.processQuery);

// Route for registering available tools
router.post('/tools', agentController.registerTools);

// Route for managing project-wide context
router.post('/context', agentController.updateContext);
router.get('/context', agentController.getContext);

module.exports = router; 