const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { connectToDatabase, User } = require('./db');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_dev_only';

// Common CORS headers for manual preflight handling
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'OPTIONS, POST',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    return res.status(200).json({});
  }

  try {
    await connectToDatabase();
    const path = req.url.split('?')[0];

    if (req.method === 'POST') {
      if (path.endsWith('/signup')) {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

        const existing = await User.findOne({ email });
        if (existing) return res.status(400).json({ error: 'Email already exists' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ email, password: hashedPassword });
        await user.save();

        const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '30d' });
        return res.status(201).json({ token });
      }

      if (path.endsWith('/login')) {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

        const user = await User.findOne({ email });
        if (!user || !user.password) return res.status(400).json({ error: 'Invalid credentials' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

        const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '30d' });
        return res.status(200).json({ token });
      }

      if (path.endsWith('/google')) {
        const { token } = req.body;
        if (!token) return res.status(400).json({ error: 'Token required' });

        // Verify Google token
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        const { email, sub: googleId } = payload;

        let user = await User.findOne({ email });
        if (!user) {
          user = new User({ email, googleId });
          await user.save();
        } else if (!user.googleId) {
          // Link existing email to Google account
          user.googleId = googleId;
          await user.save();
        }

        const appToken = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '30d' });
        return res.status(200).json({ token: appToken });
      }
    }

    return res.status(404).json({ error: 'Not found' });
  } catch (error) {
    console.error("Auth error:", error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};