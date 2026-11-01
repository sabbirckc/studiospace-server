import express from 'express';
import { ObjectId } from 'mongodb';
import { getCollections } from '../db.js';
import { verifyJWT } from '../middleware/auth.js';

const router = express.Router();

// Get all studios with search, category filtering, sorting, and pagination/limit
router.get('/', async (req, res) => {
  try {
    const { search, category, sort, limit } = req.query;
    const { studiosCollection } = getCollections();

    const query = {};

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { title: regex },
        { location: regex },
        { overview: regex },
        { category: regex }
      ];
    }

    if (category && category.trim() && category !== 'All') {
      query.category = { $regex: new RegExp(`^${category.trim()}$`, 'i') };
    }

    let sortOptions = { createdAt: -1 };
    if (sort === 'price-asc') sortOptions = { hourlyRate: 1 };
    else if (sort === 'price-desc') sortOptions = { hourlyRate: -1 };
    else if (sort === 'rating') sortOptions = { rating: -1 };
    else if (sort === 'capacity') sortOptions = { maxCapacity: -1 };

    let cursor = studiosCollection.find(query).sort(sortOptions);

    if (limit && !isNaN(parseInt(limit))) {
      cursor = cursor.limit(parseInt(limit));
    }

    const studios = await cursor.toArray();

    return res.json({
      success: true,
      count: studios.length,
      studios
    });
  } catch (err) {
    console.error('Error fetching studios:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch studio listings.' });
  }
});

// Featured studios: 6 top-rated spaces (.limit(6))
router.get('/featured', async (req, res) => {
  try {
    const { studiosCollection } = getCollections();
    const studios = await studiosCollection
      .find({})
      .sort({ rating: -1, createdAt: -1 })
      .limit(6)
      .toArray();

    return res.json({
      success: true,
      count: studios.length,
      studios
    });
  } catch (err) {
    console.error('Error fetching featured studios:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch featured studios.' });
  }
});

// Get user-owned studios (My Studio Listings) - Protected
router.get('/my-listings', verifyJWT, async (req, res) => {
  try {
    const { studiosCollection } = getCollections();
    const userEmail = req.user.email;

    const listings = await studiosCollection
      .find({ ownerEmail: userEmail })
      .sort({ createdAt: -1 })
      .toArray();

    return res.json({
      success: true,
      count: listings.length,
      studios: listings
    });
  } catch (err) {
    console.error('Error fetching user listings:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch your studio listings.' });
  }
});

// Get single studio details by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: 'Invalid studio ID format.' });
    }

    const { studiosCollection } = getCollections();
    const studio = await studiosCollection.findOne({ _id: new ObjectId(id) });

    if (!studio) {
      return res.status(404).json({ success: false, error: 'Studio workspace not found.' });
    }

    return res.json({
      success: true,
      studio
    });
  } catch (err) {
    console.error('Error fetching studio details:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch studio details.' });
  }
});

// Add New Studio (Private Route - Challenge 1: Protected with verifyJWT)
router.post('/', verifyJWT, async (req, res) => {
  try {
    const {
      title,
      category,
      hourlyRate,
      securityDeposit,
      maxCapacity,
      location,
      imageUrl,
      gallery,
      amenities,
      overview
    } = req.body;

    if (!title || !category || !hourlyRate || !location || !imageUrl || !overview) {
      return res.status(400).json({
        success: false,
        error: 'Please fill in all required fields: title, category, hourly rate, location, image URL, and overview.'
      });
    }

    const { studiosCollection } = getCollections();

    const newStudio = {
      title: title.trim(),
      category: category.trim(),
      hourlyRate: Number(hourlyRate),
      securityDeposit: Number(securityDeposit || 0),
      maxCapacity: Number(maxCapacity || 10),
      location: location.trim(),
      imageUrl: imageUrl.trim(),
      gallery: Array.isArray(gallery) && gallery.length > 0 ? gallery : [imageUrl.trim()],
      amenities: Array.isArray(amenities) ? amenities : (amenities ? String(amenities).split(',').map(a => a.trim()) : []),
      overview: overview.trim(),
      ownerEmail: req.user.email,
      ownerName: req.user.name || 'Studio Host',
      rating: 4.9,
      reviewCount: 1,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await studiosCollection.insertOne(newStudio);

    return res.status(201).json({
      success: true,
      message: 'Creative studio listed successfully!',
      studioId: result.insertedId,
      studio: { ...newStudio, _id: result.insertedId }
    });
  } catch (err) {
    console.error('Error creating studio:', err);
    return res.status(500).json({ success: false, error: 'Failed to create studio listing.' });
  }
});

// Update Studio (Private Route - Challenge 1: Protected with verifyJWT)
router.put('/:id', verifyJWT, async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: 'Invalid studio ID.' });
    }

    const { studiosCollection } = getCollections();
    const existing = await studiosCollection.findOne({ _id: new ObjectId(id) });

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Studio not found.' });
    }

    if (existing.ownerEmail !== req.user.email) {
      return res.status(403).json({ success: false, error: 'Forbidden. You do not own this studio listing.' });
    }

    const {
      title,
      category,
      hourlyRate,
      securityDeposit,
      maxCapacity,
      location,
      imageUrl,
      gallery,
      amenities,
      overview
    } = req.body;

    const updateDoc = {
      $set: {
        title: title ? title.trim() : existing.title,
        category: category ? category.trim() : existing.category,
        hourlyRate: hourlyRate !== undefined ? Number(hourlyRate) : existing.hourlyRate,
        securityDeposit: securityDeposit !== undefined ? Number(securityDeposit) : existing.securityDeposit,
        maxCapacity: maxCapacity !== undefined ? Number(maxCapacity) : existing.maxCapacity,
        location: location ? location.trim() : existing.location,
        imageUrl: imageUrl ? imageUrl.trim() : existing.imageUrl,
        gallery: Array.isArray(gallery) ? gallery : existing.gallery,
        amenities: Array.isArray(amenities) ? amenities : (amenities ? String(amenities).split(',').map(a => a.trim()) : existing.amenities),
        overview: overview ? overview.trim() : existing.overview,
        updatedAt: new Date()
      }
    };

    await studiosCollection.updateOne({ _id: new ObjectId(id) }, updateDoc);

    return res.json({
      success: true,
      message: 'Studio listing updated successfully!'
    });
  } catch (err) {
    console.error('Error updating studio:', err);
    return res.status(500).json({ success: false, error: 'Failed to update studio.' });
  }
});

// Delete Studio (Private Route - Challenge 1: Protected with verifyJWT)
router.delete('/:id', verifyJWT, async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: 'Invalid studio ID.' });
    }

    const { studiosCollection } = getCollections();
    const existing = await studiosCollection.findOne({ _id: new ObjectId(id) });

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Studio not found.' });
    }

    if (existing.ownerEmail !== req.user.email) {
      return res.status(403).json({ success: false, error: 'Forbidden. You do not own this studio listing.' });
    }

    await studiosCollection.deleteOne({ _id: new ObjectId(id) });

    return res.json({
      success: true,
      message: 'Studio listing deleted successfully.'
    });
  } catch (err) {
    console.error('Error deleting studio:', err);
    return res.status(500).json({ success: false, error: 'Failed to delete studio.' });
  }
});

export default router;

