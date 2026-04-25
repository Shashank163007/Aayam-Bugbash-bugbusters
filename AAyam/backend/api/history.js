const jwt = require('jsonwebtoken');
const { connectToDatabase, Scan } = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_dev_only';

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    return res.status(200).json({});
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (e) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    await connectToDatabase();
    const path = req.url.split('?')[0];

    if (req.method === 'GET' && path.endsWith('/list')) {
      const scans = await Scan.find({ userId: decoded.userId }).sort({ timestamp: -1 });
      return res.status(200).json(scans);
    }

    if (req.method === 'DELETE' && path.endsWith('/clear')) {
      await Scan.deleteMany({ userId: decoded.userId });
      return res.status(200).json({ success: true });
    }

    return res.status(404).json({ error: 'Not found' });
  } catch (error) {
    console.error("History error:", error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};