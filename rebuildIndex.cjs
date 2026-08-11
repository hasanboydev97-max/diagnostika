const fs = require('fs');
const code = fs.readFileSync('server/index.js', 'utf8');

const topPart = code.substring(0, 150); 
// We need to inject the imports for our new routes and sockets near line 51

const beforeRoutes = topPart; 
// Let's just manually construct the top part up to the authRoutes.
const topLines = code.split('\n');
const topCut = topLines.slice(0, 150).join('\n'); // Up to `app.use('/api/admin', adminRoutes);`

const botEngineStartLine = topLines.findIndex(l => l.includes('🤖 TELEGRAM BOT 24/7 SERVER ENGINE'));
const analysisEndLine = topLines.findIndex(l => l.includes('// 24/7 Long Polling Loop for Telegram Bot Commands'));
const serverEnd = topLines.findIndex(l => l.includes('const httpServer = createServer(app);'));

const botCodeTop = topLines.slice(botEngineStartLine, botEngineStartLine + 56).join('\n'); // Roughly to end of /api/telegram/send
const botCodeBottom = topLines.slice(analysisEndLine, serverEnd).join('\n');

const newIndexContent = `import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import { createServer } from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from parent directory
dotenv.config({ path: join(__dirname, '../.env') });

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;

// Cloudinary
if (process.env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
}

const upload = multer({ dest: 'uploads/' });

import { Result, Teacher } from './models/index.js';
import { authMiddleware, adminMiddleware } from './middleware/auth.js';

// Connect to MongoDB
if (MONGODB_URI) {
  mongoose.connect(MONGODB_URI, {
    family: 4,
    serverSelectionTimeoutMS: 10000
  })
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));
} else {
  console.warn('⚠️ MONGODB_URI is missing in .env');
}

// Routes
app.get('/', (req, res) => {
  res.send('API is running...');
});

app.get('/api/ping', (req, res) => {
  res.json({ status: 'ok', message: 'Pong. API is awake.' });
});

app.get('/api/results', async (req, res) => {
  try {
    const results = await Result.find().sort({ _id: -1 });
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/results/:id', async (req, res) => {
  try {
    const result = await Result.findOne({ id: req.params.id });
    if (!result) return res.status(404).json({ error: 'Not found' });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/results', async (req, res) => {
  try {
    const data = req.body;
    await Result.findOneAndUpdate({ id: data.id }, data, { upsert: true, new: true });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'maktab-diagnostika'
    });
    
    fs.unlinkSync(req.file.path);
    res.json({ url: result.secure_url });
  } catch (error) {
    console.error('Upload Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// --- Auth Routes ---
import authRoutes from './routes/authRoutes.js';
app.use('/api/auth', authRoutes);

// --- Subscription Endpoints ---
app.post('/api/subscription/request', authMiddleware, async (req, res) => {
  try {
    const { requestedPlan, paymentNote } = req.body;
    if (!['standard', 'premium'].includes(requestedPlan)) {
      return res.status(400).json({ error: 'Yaroqsiz tarif rejasi' });
    }

    const teacher = await Teacher.findByIdAndUpdate(
      req.teacherId,
      {
        requestedPlan,
        paymentNote: paymentNote || '',
        planStatus: 'pending'
      },
      { new: true }
    ).select('-password');

    res.json({ success: true, teacher });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

import adminRoutes from './routes/adminRoutes.js';
app.use('/api/admin', adminRoutes);

// --- New Online Tests MVC Routes ---
import { onlineTestRoutes, onlineTestResultRoutes } from './routes/onlineTestRoutes.js';
app.use('/api/online-tests', onlineTestRoutes);
app.use('/api/online-test-results', onlineTestResultRoutes);

// --- Telegram Bot Logic ---
${botCodeTop}

${botCodeBottom}

// --- WebSocket Setup ---
import { setupSockets } from './sockets/socketManager.js';

const httpServer = createServer(app);
setupSockets(httpServer);

httpServer.listen(PORT, () => {
  console.log(\`✅ Server running on http://localhost:\${PORT}\`);
  startTelegramBotPolling().catch(err => console.error('Bot polling start error:', err));
});
`;

fs.writeFileSync('server/index.js', newIndexContent);
console.log('Successfully refactored index.js');
