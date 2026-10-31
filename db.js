import { MongoClient, ServerApiVersion } from 'mongodb';
import 'dotenv/config';

const uri = process.env.MONGODB_URL;

if (!uri) {
  throw new Error("MONGODB_URL environment variable is missing!");
}

export const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

let db;

export async function connectDB() {
  if (!db) {
    await client.connect();
    db = client.db('studiospaceDB');
    console.log("Connected successfully to MongoDB database: studiospaceDB");

    // Create unique indexes
    try {
      await db.collection('users').createIndex({ email: 1 }, { unique: true });
      await db.collection('wishlists').createIndex({ userEmail: 1, studioId: 1 }, { unique: true });
      await db.collection('bookings').createIndex({ studioId: 1, bookingDate: 1, timeSlot: 1 });
    } catch (indexErr) {
      console.log("Index setup note:", indexErr.message);
    }
  }
  return db;
}

export function getDB() {
  if (!db) {
    db = client.db('studiospaceDB');
  }
  return db;
}

export const getCollections = () => {
  const database = getDB();
  return {
    usersCollection: database.collection('users'),
    studiosCollection: database.collection('studios'),
    bookingsCollection: database.collection('bookings'),
    wishlistsCollection: database.collection('wishlists'),
  };
};
