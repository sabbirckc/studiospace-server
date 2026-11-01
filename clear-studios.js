import 'dotenv/config';
import { connectDB, getCollections, client } from './db.js';

async function clearStudios() {
  try {
    console.log("Connecting to MongoDB...");
    await connectDB();
    const { studiosCollection, wishlistsCollection } = getCollections();

    const countBefore = await studiosCollection.countDocuments();
    console.log(`Found ${countBefore} studio listings in the database.`);

    const deleteResult = await studiosCollection.deleteMany({});
    console.log(`Successfully deleted ${deleteResult.deletedCount} studio listings.`);

    // Also clear wishlists since referenced studios are deleted
    await wishlistsCollection.deleteMany({});
    console.log("Wishlists cleared.");

    console.log("Database studios collection is now clean and ready for your new studio additions!");
    process.exit(0);
  } catch (err) {
    console.error("Error clearing studios:", err);
    process.exit(1);
  }
}

clearStudios();
