import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getCollections } from '../db.js';
import { verifyJWT } from '../middleware/auth.js';

const router = express.Router();

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
};

// Password validator: Uppercase, Lowercase, at least 6 characters
function validatePassword(password) {
  if (!password || password.length < 6) {
    return 'Password must be at least 6 characters long.';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter.';
  }
  if (!/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter.';
  }
  return null;
}

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, photoURL, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: 'Name, email, and password are required.' });
    }

    const passError = validatePassword(password);
    if (passError) {
      return res.status(400).json({ success: false, error: passError });
    }

    const { usersCollection } = getCollections();
    const existing = await usersCollection.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ success: false, error: 'An account with this email already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      photoURL: photoURL?.trim() || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
      password: hashedPassword,
      role: 'creator',
      createdAt: new Date()
    };

    const result = await usersCollection.insertOne(newUser);

    const token = jwt.sign(
      { userId: result.insertedId, email: newUser.email, name: newUser.name },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('token', token, COOKIE_OPTIONS);

    return res.status(201).json({
      success: true,
      message: 'Registration successful!',
      user: {
        id: result.insertedId,
        name: newUser.name,
        email: newUser.email,
        photoURL: newUser.photoURL,
        role: newUser.role
      },
      token
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error during registration.' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required.' });
    }

    const { usersCollection } = getCollections();
    const user = await usersCollection.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('token', token, COOKIE_OPTIONS);

    return res.json({
      success: true,
      message: 'Logged in successfully!',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        photoURL: user.photoURL,
        role: user.role || 'creator'
      },
      token
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error during login.' });
  }
});

// Social Login (Google)
router.post('/social-login', async (req, res) => {
  try {
    let { name, email, photoURL, credential, access_token } = req.body;

    // 1. If Google ID token (credential) is passed, verify with Google
    if (credential) {
      try {
        const verifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
        if (verifyRes.ok) {
          const payload = await verifyRes.json();
          email = payload.email || email;
          name = payload.name || name || payload.given_name;
          photoURL = payload.picture || photoURL;
        }
      } catch (tokenErr) {
        console.warn('Google token verification fallback:', tokenErr.message);
      }
    }

    // 2. If Google OAuth2 access_token is passed, fetch user info from Google
    if (access_token && !email) {
      try {
        const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${access_token}` }
        });
        if (userInfoRes.ok) {
          const profile = await userInfoRes.json();
          email = profile.email || email;
          name = profile.name || name;
          photoURL = profile.picture || photoURL;
        }
      } catch (userErr) {
        console.warn('Google userinfo fetch fallback:', userErr.message);
      }
    }

    if (!email) {
      return res.status(400).json({ success: false, error: 'Valid Google email is required for social login.' });
    }

    const { usersCollection } = getCollections();
    let user = await usersCollection.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      const newUser = {
        name: name || email.split('@')[0],
        email: email.toLowerCase().trim(),
        photoURL: photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
        authProvider: 'google',
        role: 'creator',
        createdAt: new Date()
      };
      const result = await usersCollection.insertOne(newUser);
      user = { ...newUser, _id: result.insertedId };
    } else {
      // Update photo or authProvider if not set
      await usersCollection.updateOne(
        { _id: user._id },
        { 
          $set: { 
            authProvider: 'google',
            ...(photoURL && { photoURL }),
            ...(name && { name })
          } 
        }
      );
      if (name) user.name = name;
      if (photoURL) user.photoURL = photoURL;
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('token', token, COOKIE_OPTIONS);

    return res.json({
      success: true,
      message: 'Authenticated with Google successfully!',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        photoURL: user.photoURL,
        role: user.role || 'creator'
      },
      token
    });
  } catch (err) {
    console.error('Social login error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error during social authentication.' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  res.clearCookie('token', COOKIE_OPTIONS);
  return res.json({ success: true, message: 'Logged out successfully.' });
});

// Get current user profile (Me) - for persistent reload authentication
router.get('/me', verifyJWT, async (req, res) => {
  try {
    const { usersCollection } = getCollections();
    const user = await usersCollection.findOne({ email: req.user.email });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User profile not found.' });
    }

    return res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        photoURL: user.photoURL,
        role: user.role || 'creator'
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Error fetching profile.' });
  }
});

export default router;

