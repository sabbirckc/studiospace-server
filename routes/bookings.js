import express from 'express';
import { ObjectId } from 'mongodb';
import { getCollections } from '../db.js';
import { verifyJWT } from '../middleware/auth.js';

const router = express.Router();

// Helper to convert "HH:MM" to minutes from midnight
function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

// Challenge 2: Booking double-booking collision check
// Overlap condition between [startA, endA] and [startB, endB]:
// (startA < endB) && (endA > startB)
async function checkBookingCollision(studioId, bookingDate, newStart, newEnd) {
  const { bookingsCollection } = getCollections();

  // Find existing bookings on the same date for the same studio that are "Confirmed" (or "Pending")
  const existingBookings = await bookingsCollection.find({
    studioId: studioId.toString(),
    bookingDate: bookingDate,
    status: { $in: ['Confirmed', 'Pending'] }
  }).toArray();

  const newStartMin = timeToMinutes(newStart);
  const newEndMin = timeToMinutes(newEnd);

  for (const b of existingBookings) {
    const existingStartMin = timeToMinutes(b.startTime);
    const existingEndMin = timeToMinutes(b.endTime);

    // If times overlap
    if (newStartMin < existingEndMin && newEndMin > existingStartMin) {
      return {
        hasCollision: true,
        conflictingBooking: b
      };
    }
  }

  return { hasCollision: false };
}

// Create New Booking (Private Route - Challenge 1 & 2)
router.post('/', verifyJWT, async (req, res) => {
  try {
    const {
      studioId,
      studioTitle,
      studioCategory,
      studioLocation,
      studioImage,
      hourlyRate,
      bookingDate,
      startTime,
      endTime,
      shootHours,
      totalAmount,
      guestCount,
      specialNotes
    } = req.body;

    if (!studioId || !bookingDate || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        error: 'Studio ID, booking date, start time, and end time are required.'
      });
    }

    if (timeToMinutes(startTime) >= timeToMinutes(endTime)) {
      return res.status(400).json({
        success: false,
        error: 'End time must be later than start time.'
      });
    }

    // Challenge 2: Double-Booking Prevention check
    const collisionCheck = await checkBookingCollision(studioId, bookingDate, startTime, endTime);
    if (collisionCheck.hasCollision) {
      return res.status(409).json({
        success: false,
        error: `Schedule Conflict: This studio space is already booked from ${collisionCheck.conflictingBooking.startTime} to ${collisionCheck.conflictingBooking.endTime} on ${bookingDate}. Please select another hour or date.`
      });
    }

    const { bookingsCollection } = getCollections();

    const hours = shootHours || Math.max(1, (timeToMinutes(endTime) - timeToMinutes(startTime)) / 60);
    const calculatedTotal = totalAmount || (Number(hourlyRate) * hours);

    const newBooking = {
      bookingReference: `ST-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
      studioId: studioId.toString(),
      studioTitle: studioTitle || 'Creative Production Studio',
      studioCategory: studioCategory || 'Production Studio',
      studioLocation: studioLocation || 'Creative Arts District',
      studioImage: studioImage || '',
      hourlyRate: Number(hourlyRate || 0),
      bookingDate,
      startTime,
      endTime,
      shootHours: hours,
      totalAmount: calculatedTotal,
      guestCount: Number(guestCount || 1),
      specialNotes: specialNotes ? specialNotes.trim() : '',
      userEmail: req.user.email,
      userName: req.user.name || 'Studio Creator',
      status: 'Pending', // Initial status required
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await bookingsCollection.insertOne(newBooking);

    return res.status(201).json({
      success: true,
      message: 'Studio booking requested successfully! Status is Pending.',
      booking: { ...newBooking, _id: result.insertedId }
    });
  } catch (err) {
    console.error('Error creating booking:', err);
    return res.status(500).json({ success: false, error: 'Failed to create booking reservation.' });
  }
});

// Get User's Bookings (My Bookings - Private Route)
router.get('/my-bookings', verifyJWT, async (req, res) => {
  try {
    const { bookingsCollection } = getCollections();
    const userEmail = req.user.email;

    const bookings = await bookingsCollection
      .find({ userEmail })
      .sort({ createdAt: -1 })
      .toArray();

    return res.json({
      success: true,
      count: bookings.length,
      bookings
    });
  } catch (err) {
    console.error('Error fetching user bookings:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch bookings.' });
  }
});

// Get Single Booking (for PDF Invoice receipt)
router.get('/:id', verifyJWT, async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: 'Invalid booking ID.' });
    }

    const { bookingsCollection } = getCollections();
    const booking = await bookingsCollection.findOne({ _id: new ObjectId(id) });

    if (!booking) {
      return res.status(404).json({ success: false, error: 'Booking reservation not found.' });
    }

    if (booking.userEmail !== req.user.email) {
      return res.status(403).json({ success: false, error: 'Unauthorized view of this booking.' });
    }

    return res.json({
      success: true,
      booking
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to fetch booking details.' });
  }
});

// Cancel Booking (Pending slots only)
router.patch('/:id/cancel', verifyJWT, async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: 'Invalid booking ID.' });
    }

    const { bookingsCollection } = getCollections();
    const booking = await bookingsCollection.findOne({ _id: new ObjectId(id) });

    if (!booking) {
      return res.status(404).json({ success: false, error: 'Booking not found.' });
    }

    if (booking.userEmail !== req.user.email) {
      return res.status(403).json({ success: false, error: 'Unauthorized to cancel this booking.' });
    }

    if (booking.status !== 'Pending') {
      return res.status(400).json({
        success: false,
        error: `Only Pending bookings can be cancelled. Current status is ${booking.status}.`
      });
    }

    await bookingsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: 'Cancelled', updatedAt: new Date() } }
    );

    return res.json({
      success: true,
      message: 'Booking slot has been cancelled successfully.'
    });
  } catch (err) {
    console.error('Error cancelling booking:', err);
    return res.status(500).json({ success: false, error: 'Failed to cancel booking.' });
  }
});

// Confirm Booking (Test / Host confirmation helper)
router.patch('/:id/status', verifyJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['Pending', 'Confirmed', 'Completed', 'Cancelled'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid booking status.' });
    }

    const { bookingsCollection } = getCollections();
    await bookingsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status, updatedAt: new Date() } }
    );

    return res.json({
      success: true,
      message: `Booking status updated to ${status}.`
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to update booking status.' });
  }
});

export default router;
