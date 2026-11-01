import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { connectDB, getCollections } from './db.js';

export const PREFERRED_STUDIOS = [
  {
    title: 'Aperture One — Daylight Cyclorama Studio',
    category: 'Photo Studio',
    hourlyRate: 120,
    securityDeposit: 250,
    maxCapacity: 25,
    location: 'DUMBO Creative Quarter, Brooklyn, NY',
    imageUrl: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=1200&q=80'
    ],
    amenities: [
      'Two-Wall Infinity Cyclorama',
      'Profoto B10X Strobe Kit',
      '14ft North-Facing Windows',
      'Hair & Makeup Vanity Station',
      'Private Client Lounge',
      'High-Speed 1Gbps Fiber Wi-Fi'
    ],
    overview: 'A premier 2,400 sq ft daylight studio featuring a pristine two-wall corner cyclorama. Designed specifically for high-fashion editorial, commercial lookbooks, and celebrity portraiture with soaring 16ft industrial ceilings and dedicated styling areas.',
    ownerEmail: 'host.sarah@studiospace.io',
    ownerName: 'Sarah Jenkins (Apex Visuals)',
    rating: 4.95,
    reviewCount: 38,
    createdAt: new Date('2026-10-15T10:00:00Z')
  },
  {
    title: 'The Industrial Loft — Modular Photo & Content Studio',
    category: 'Photo Studio',
    hourlyRate: 110,
    securityDeposit: 200,
    maxCapacity: 20,
    location: 'West Loop Industrial Corridor, Chicago, IL',
    imageUrl: 'https://images.unsplash.com/photo-1527061011665-3652c757a4d4?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1527061011665-3652c757a4d4?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80'
    ],
    amenities: [
      'Exposed Vintage Cream Brick Walls',
      'Modular Rolling Prop Partitions',
      'Full Color Godox Continuous LEDs',
      '9ft Seamless Paper Roll System',
      'Espresso Bar & Craft Kitchenette',
      'Freight Elevator Direct Load-In'
    ],
    overview: 'Versatile 1,800 sq ft creative studio balancing warm exposed industrial brick with clean contemporary shooting vignettes. Perfect for product photography, editorial portrait shoots, video interviews, and brand activations.',
    ownerEmail: 'examiner@studiospace.io',
    ownerName: 'Harry Cat (Examiner)',
    rating: 4.94,
    reviewCount: 35,
    createdAt: new Date('2026-10-26T08:00:00Z')
  },
  {
    title: 'SoundStage 4 — Acoustic Film Production Bay',
    category: 'Film Stage',
    hourlyRate: 250,
    securityDeposit: 500,
    maxCapacity: 60,
    location: 'Arts District Production Hub, Los Angeles, CA',
    imageUrl: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1518133910546-b6c2fb7d79e3?auto=format&fit=crop&w=1200&q=80'
    ],
    amenities: [
      'STC-60 Soundproofing',
      'Pre-Rigged ARRI SkyPanel Grid',
      'Drive-In Elephant Doors',
      'Chroma Key Green Screen Bay',
      'Production Office & Green Room',
      '3-Phase 400A Camlock Power'
    ],
    overview: 'Fully sound-isolated cinema stage certified STC-60 for live-action narrative features, commercial shoots, and music videos. Complete with silent HVAC, DMX-controlled motorized lighting truss, and vehicle roll-in access.',
    ownerEmail: 'host.marcus@studiospace.io',
    ownerName: 'Marcus Vance Studios',
    rating: 4.98,
    reviewCount: 52,
    createdAt: new Date('2026-10-18T14:30:00Z')
  },
  {
    title: 'Prism Stage — LED Volume & Virtual Production Stage',
    category: 'Film Stage',
    hourlyRate: 320,
    securityDeposit: 750,
    maxCapacity: 45,
    location: 'Midtown Innovation Hub, Atlanta, GA',
    imageUrl: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=1200&q=80'
    ],
    amenities: [
      'ROE Visual 2.6mm Curved LED Wall',
      'Unreal Engine 5 In-Camera VFX Rig',
      'OptiTrack Real-Time Camera Tracking',
      'Motorized Overhead Ceiling Panels',
      'Dedicated DIT & Grading Suite',
      'On-site Virtual Production Engineer'
    ],
    overview: 'Cutting-edge in-camera VFX virtual production volume with high refresh rate curved LED displays powered by Unreal Engine 5. Eliminate green spill and achieve in-camera photorealistic lighting and parallax in real-time.',
    ownerEmail: 'host.marcus@studiospace.io',
    ownerName: 'Marcus Vance Studios',
    rating: 4.99,
    reviewCount: 68,
    createdAt: new Date('2026-10-29T15:00:00Z')
  },
  {
    title: 'The Broadcast Suite — Multi-Cam 4K Podcast Lounge',
    category: 'Podcast Room',
    hourlyRate: 95,
    securityDeposit: 150,
    maxCapacity: 8,
    location: 'SoHo Broadcast Commons, New York, NY',
    imageUrl: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?auto=format&fit=crop&w=1200&q=80'
    ],
    amenities: [
      '4x Shure SM7B Broadcast Mics',
      'Rødecaster Pro II Integrated Board',
      '3x Sony FX3 4K PTZ Camera Setup',
      'Acoustic Slat-Wood Treatment',
      'Custom Neon Sign & LED Lighting',
      'Live Twitch / YouTube Stream Rig'
    ],
    overview: 'Turnkey high-end vodcasting suite. Walk in with an SD card or hard drive and leave with broadcast-ready 4K multi-angle ISO video recordings and pristine multi-track audio. Acoustic treatment engineered for warm broadcast vocal depth.',
    ownerEmail: 'host.elena@studiospace.io',
    ownerName: 'Elena Rostova',
    rating: 4.92,
    reviewCount: 44,
    createdAt: new Date('2026-10-20T09:15:00Z')
  },
  {
    title: 'AudioLab One — Turnkey Vodcast & Talk Studio',
    category: 'Podcast Room',
    hourlyRate: 85,
    securityDeposit: 120,
    maxCapacity: 6,
    location: 'West End Media Park, Nashville, TN',
    imageUrl: 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?auto=format&fit=crop&w=1200&q=80'
    ],
    amenities: [
      'Cloudlifter CL-4 Mic Activator',
      'Blackmagic ATEM Mini Pro ISO',
      'Softbox Overhead Studio Lighting',
      'Leather Club Chairs & Custom Table',
      'Acoustic Bass Trap Treatment'
    ],
    overview: 'Comfortable conversation lounge optimized for interviews, video podcasts, and audiobooks. High-fidelity signal chain with warm analog warmth and broadcast isolation.',
    ownerEmail: 'examiner@studiospace.io',
    ownerName: 'Harry Cat (Examiner)',
    rating: 4.91,
    reviewCount: 31,
    createdAt: new Date('2026-10-25T11:00:00Z')
  },
  {
    title: 'Resonance Studio — Dolby Atmos Music & Mixing Suite',
    category: 'Music Suite',
    hourlyRate: 165,
    securityDeposit: 300,
    maxCapacity: 12,
    location: 'East Austin Creative Belt, Austin, TX',
    imageUrl: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1200&q=80'
    ],
    amenities: [
      'Genelec 7.1.4 Dolby Atmos Rig',
      'Universal Audio Apollo X16 Array',
      'Neumann U87 Ai & vintage C414',
      'Analog Synth Wall (Moog, Prophet)',
      'Floating Floor Vocal Iso Booth',
      'Pro Tools Ultimate + Logic Pro 11'
    ],
    overview: 'Purpose-built mixing, mastering, and production sanctuary tuned to perfection with floating acoustic floors. Features genuine analog outboard mastering gear alongside an immersive 7.1.4 spatial audio monitoring environment.',
    ownerEmail: 'host.david@studiospace.io',
    ownerName: 'David Sterling Sound',
    rating: 4.97,
    reviewCount: 61,
    createdAt: new Date('2026-10-22T11:45:00Z')
  },
  {
    title: 'Velvet Sound — Acoustic Voiceover & Foley Lab',
    category: 'Music Suite',
    hourlyRate: 140,
    securityDeposit: 200,
    maxCapacity: 6,
    location: 'Capitol Hill Arts Quarter, Seattle, WA',
    imageUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80'
    ],
    amenities: [
      'Double-Walled WhisperRoom Iso Booth',
      'Sennheiser MKH 416 Boom Mic',
      'Pro Tools HDX with C|24 Console',
      'Source-Connect Pro Certified',
      '4K Video Sync Monitor for ADR',
      'Foley Pit with Variable Surfaces'
    ],
    overview: 'Ultra-quiet acoustic laboratory specializing in ADR, animation voiceover, commercial narration, and tactile Foley recording. Ultra-low noise floor with world-class mic preamps and Source-Connect remote connectivity.',
    ownerEmail: 'examiner@studiospace.io',
    ownerName: 'Harry Cat (Examiner)',
    rating: 4.96,
    reviewCount: 41,
    createdAt: new Date('2026-10-28T12:00:00Z')
  },
  {
    title: 'Atelier Terracotta — Skylit Ceramic & Sculpting Lab',
    category: 'Art Workshop',
    hourlyRate: 85,
    securityDeposit: 100,
    maxCapacity: 18,
    location: 'Mission District Arts District, San Francisco, CA',
    imageUrl: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=1200&q=80'
    ],
    amenities: [
      '6x Shimpo Pottery Wheels',
      'Cone 10 Skutt Electric Kiln',
      'Double Deep Clay Slurry Sink',
      'North-Facing Sawtooth Skylights',
      'Reclaimed Maple Workbenches',
      'Tool Racks & Clay Drying Shelves'
    ],
    overview: 'Sun-drenched fine arts studio drenched in diffused natural daylight from original 1920s sawtooth industrial skylights. Equipped with pottery wheels, clay preparation counters, heavy-duty easels, and high-capacity ventilation.',
    ownerEmail: 'host.claire@studiospace.io',
    ownerName: 'Claire Laurent Art Collective',
    rating: 4.89,
    reviewCount: 29,
    createdAt: new Date('2026-10-24T16:20:00Z')
  },
  {
    title: "L'Atelier Lumière — Natural Light Painting & Printmaking Studio",
    category: 'Art Workshop',
    hourlyRate: 75,
    securityDeposit: 100,
    maxCapacity: 16,
    location: 'Beacon Arts Loft, Boston, MA',
    imageUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1582560475093-ba66accbc424?auto=format&fit=crop&w=1200&q=80'
    ],
    amenities: [
      'Heavy-Duty French Master Easels',
      'Takach Professional Etching Press',
      '16ft High Glass Factory Windows',
      'Solvent Extraction Fume Hood',
      'Mobile Canvas Drying Racks',
      'Dedicated Cleanup Washbasins'
    ],
    overview: 'Airy European-inspired artist atelier featuring north-facing factory glass windows, etching press facilities, and expansive easels. Tailored for oil painters, printmakers, and sculptors.',
    ownerEmail: 'host.claire@studiospace.io',
    ownerName: 'Claire Laurent Art Collective',
    rating: 4.93,
    reviewCount: 33,
    createdAt: new Date('2026-10-27T14:00:00Z')
  }
];

async function seedDatabase() {
  try {
    console.log("Connecting to MongoDB for preferred studio seed...");
    await connectDB();
    const { usersCollection, studiosCollection, bookingsCollection } = getCollections();

    // 1. Seed Examiner User
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('Password123!', salt);

    const examinerUser = {
      name: 'Harry Cat (Examiner)',
      email: 'examiner@studiospace.io',
      photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
      password: hashedPassword,
      role: 'examiner',
      createdAt: new Date()
    };

    await usersCollection.updateOne(
      { email: examinerUser.email },
      { $set: examinerUser },
      { upsert: true }
    );
    console.log("Examiner test account seeded: examiner@studiospace.io / Password123!");

    // 2. Insert curated studios
    await studiosCollection.deleteMany({});
    const insertRes = await studiosCollection.insertMany(PREFERRED_STUDIOS);
    console.log(`Successfully populated ${insertRes.insertedCount} preferred creative studios!`);

    // 3. Seed sample Confirmed booking for collision testing
    const testStudio = await studiosCollection.findOne({ category: 'Photo Studio' });
    if (testStudio) {
      const sampleBooking = {
        bookingReference: 'ST-RESERVED-SAMPLE',
        studioId: testStudio._id.toString(),
        studioTitle: testStudio.title,
        studioCategory: testStudio.category,
        studioLocation: testStudio.location,
        studioImage: testStudio.imageUrl,
        hourlyRate: testStudio.hourlyRate,
        bookingDate: '2026-11-15',
        startTime: '10:00',
        endTime: '14:00',
        shootHours: 4,
        totalAmount: testStudio.hourlyRate * 4,
        guestCount: 4,
        specialNotes: 'Commercial fashion lookbook shoot (Reserved slot for collision testing)',
        userEmail: 'examiner@studiospace.io',
        userName: 'Harry Cat (Examiner)',
        status: 'Confirmed',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await bookingsCollection.updateOne(
        { bookingReference: sampleBooking.bookingReference },
        { $set: sampleBooking },
        { upsert: true }
      );
      console.log(`Sample Confirmed booking created on 2026-11-15 for ${testStudio.title} for collision detection.`);
    }

    console.log("Database successfully populated with preferred studio cards!");
    process.exit(0);
  } catch (err) {
    console.error("Seeding failed:", err);
    process.exit(1);
  }
}

seedDatabase();
