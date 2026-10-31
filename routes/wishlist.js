import express from 'express';
import { ObjectId } from 'mongodb';
import { getCollections } from '../db.js';
import { verifyJWT } from '../middleware/auth.js';

const router = express.Router();

// Get all wishlist items for logged in user (with full studio details)
router.get('/', verifyJWT, async (req, res) => {
  try {
    const { wishlistsCollection, studiosCollection } = getCollections();
    const userEmail = req.user.email;

    const wishlistEntries = await wishlistsCollection
      .find({ userEmail })
      .sort({ createdAt: -1 })
      .toArray();

    const studioIds = wishlistEntries.map(w => {
      try {
        return new ObjectId(w.studioId);
      } catch {
        return null;
      }
    }).filter(Boolean);

    const studios = await studiosCollection
      .find({ _id: { $in: studioIds } })
      .toArray();

    return res.json({
      success: true,
      count: studios.length,
      studios
    });
  } catch (err) {
    console.error('Error fetching wishlist:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch saved wishlist.' });
  }
});

// Get just the list of saved studio IDs (for fast heart state in UI)
router.get('/ids', verifyJWT, async (req, res) => {
  try {
    const { wishlistsCollection } = getCollections();
    const userEmail = req.user.email;

    const items = await wishlistsCollection
      .find({ userEmail }, { projection: { studioId: 1 } })
      .toArray();

    const ids = items.map(i => i.studioId);

    return res.json({
      success: true,
      savedStudioIds: ids
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to fetch saved ids.' });
  }
});

// Add to wishlist
router.post('/', verifyJWT, async (req, res) => {
  try {
    const { studioId } = req.body;
    if (!studioId) {
      return res.status(400).json({ success: false, error: 'studioId is required.' });
    }

    const { wishlistsCollection } = getCollections();
    const userEmail = req.user.email;

    const existing = await wishlistsCollection.findOne({ userEmail, studioId });
    if (existing) {
      return res.json({ success: true, message: 'Studio is already in your wishlist.' });
    }

    await wishlistsCollection.insertOne({
      userEmail,
      studioId,
      createdAt: new Date()
    });

    return res.status(201).json({
      success: true,
      message: 'Studio saved to your wishlist!'
    });
  } catch (err) {
    console.error('Error adding to wishlist:', err);
    return res.status(500).json({ success: false, error: 'Failed to save to wishlist.' });
  }
});

// Remove from wishlist
router.delete('/:studioId', verifyJWT, async (req, res) => {
  try {
    const { studioId } = req.params;
    const { wishlistsCollection } = getCollections();
    const userEmail = req.user.email;

    await wishlistsCollection.deleteOne({ userEmail, studioId });

    return res.json({
      success: true,
      message: 'Studio removed from your wishlist.'
    });
  } catch (err) {
    console.error('Error removing from wishlist:', err);
    return res.status(500).json({ success: false, error: 'Failed to remove from wishlist.' });
  }
});

export default router;
