// config/db.js
const { MongoClient } = require('mongodb');

let db = null;
let clientInstance = null;

const connectDB = async () => {
  if (db) return db; // already connected
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) throw new Error('MONGO_URI not set in .env');

    const client = new MongoClient(uri);
    await client.connect();
    clientInstance = client;
    db = client.db(process.env.DB_NAME || 'finance_tracker');
    console.log('MongoDB connected:', db.databaseName);

    // ensure collections exist (optional)
    const collections = await db.listCollections().toArray();
    const names = collections.map(c => c.name);
    if (!names.includes('users')) await db.createCollection('users');
    if (!names.includes('transactions')) await db.createCollection('transactions');
    if (!names.includes('budgets')) await db.createCollection('budgets');

    return db;
  } catch (err) {
    console.error('DB connect error:', err);
    throw err;
  }
};

const getDB = () => {
  if (!db) throw new Error('DB not initialized. Call connectDB() first.');
  return db;
};

const closeDB = async () => {
  if (clientInstance) {
    await clientInstance.close();
    db = null;
    clientInstance = null;
  }
};

module.exports = { connectDB, getDB, closeDB };
