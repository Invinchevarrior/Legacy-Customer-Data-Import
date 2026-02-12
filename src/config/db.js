const mongoose = require('mongoose');

/**
 * Database Connection Configuration
 * 
 * Connects to MongoDB with support for transactions and sessions
 * Transactions ensure ACID compliance for multi-document operations
 */
const connectDB = async () => {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/legacy_import';
  return mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    retryWrites: true, // Enable retry for transient failures
    w: 'majority' // Majority write concern for data durability
  });
};

/**
 * Start Database Session
 * 
 * Sessions enable transactions for multi-document ACID operations
 * 
 * @returns {Promise<ClientSession>} MongoDB session
 */
const startSession = async () => {
  return mongoose.startSession();
};

/**
 * Execute with Transaction
 * 
 * Executes callback function within a transaction
 * Automatically commits on success, aborts on error
 * 
 * @param {Function} callback - Async function to execute within transaction
 * @returns {Promise<*>} Result of callback
 */
const withTransaction = async (callback) => {
  const session = await startSession();
  session.startTransaction();

  try {
    const result = await callback(session);
    await session.commitTransaction();
    return result;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
};

module.exports = { 
  connectDB,
  startSession,
  withTransaction
};
