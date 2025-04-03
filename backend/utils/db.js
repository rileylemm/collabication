const mongoose = require('mongoose');
const logger = require('./logger');

/**
 * Connect to MongoDB database
 */
const connectToDatabase = async () => {
  try {
    const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/collabication';
    
    await mongoose.connect(mongoURI);
    
    logger.info('Connected to MongoDB');
  } catch (error) {
    logger.error(`MongoDB connection error: ${error.message}`);
    throw error;
  }
};

/**
 * Close the MongoDB connection
 */
const closeDatabaseConnection = async () => {
  try {
    await mongoose.connection.close();
    logger.info('Closed MongoDB connection');
  } catch (error) {
    logger.error(`Error closing MongoDB connection: ${error.message}`);
    throw error;
  }
};

module.exports = {
  connectToDatabase,
  closeDatabaseConnection,
}; 