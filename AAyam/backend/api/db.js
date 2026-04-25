const mongoose = require('mongoose');

let isConnected;

const connectToDatabase = async () => {
  if (isConnected) {
    return;
  }

  const dbUri = process.env.MONGODB_URI;
  if (!dbUri) {
    throw new Error('Please define the MONGODB_URI environment variable');
  }

  const db = await mongoose.connect(dbUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  isConnected = db.connections[0].readyState;
};

// Schemas
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String }, // null for Google OAuth
  googleId: { type: String }, // null for email auth
  createdAt: { type: Date, default: Date.now }
});

const scanSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  timestamp: { type: Date, default: Date.now },
  sender: String,
  senderName: String,
  subject: String,
  riskLevel: String, // HIGH/MEDIUM/LOW
  riskScore: Number, // 0-100
  verdict: String,
  findings: Array,
  fullReport: Object
});

// Avoid OverwriteModelError in serverless environments
const User = mongoose.models.User || mongoose.model('User', userSchema);
const Scan = mongoose.models.Scan || mongoose.model('Scan', scanSchema);

module.exports = { connectToDatabase, User, Scan };