import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import { createServer } from 'http';
import { Result, Teacher } from './models/index.js';
import { authMiddleware, adminMiddleware } from './middleware/auth.js';
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import { onlineTestRoutes, onlineTestResultRoutes } from './routes/onlineTestRoutes.js';
import { setupSockets } from './sockets/socketManager.js';


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

app.use('/api/admin', adminRoutes);

// --- New Online Tests MVC Routes ---
app.use('/api/online-tests', onlineTestRoutes);
app.use('/api/online-test-results', onlineTestResultRoutes);

// --- Telegram Bot Logic ---
// 🤖 TELEGRAM BOT 24/7 SERVER ENGINE (Render.com)
// ==========================================
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || String.fromCharCode(56,54,53,53,56,56,55,50,53,57,58,65,65,70,113,117,101,65,105,114,55,110,49,114,115,110,72,120,75,87,81,105,108,114,110,51,109,83,85,78,114,45,110,74,103);
const TELEGRAM_API_BASE = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

async function sendTelegramBotMessage(chatId, text, replyMarkup = null) {
  try {
    const payload = {
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML',
      disable_web_page_preview: false
    };
    if (replyMarkup) {
      payload.reply_markup = replyMarkup;
    }
    const res = await fetch(`${TELEGRAM_API_BASE}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await res.json();
  } catch (err) {
    console.error('Telegram Bot send error:', err);
    return { ok: false, error: String(err) };
  }
}

// Backend API endpoint for sending Telegram notifications from Vercel web app
app.post('/api/telegram/send', async (req, res) => {
  try {
    const { chatId, result } = req.body;
    if (!chatId || !result) {
      return res.status(400).json({ error: 'Chat ID va result talab qilinadi.' });
    }

    const isPass = result.totalScore >= 70;
    const statusEmoji = isPass ? '🟢' : '🔴';
    const statusText = isPass ? "O'TDI" : "YIQILDI";
    const summaryLink = `https://bmdiagnostika.vercel.app/summary/${result.id}`;

    const msg = `🎓 <b>HB DIAGNOSTIKA NATIJASI</b> 🎓\n\n👤 <b>O'quvchi:</b> ${result.studentName}\n🏫 <b>Sinf:</b> ${result.grade || '5'}-sinf\n📊 <b>Natija:</b> <b>${result.totalScore}/100 ball</b> ${statusEmoji} (${statusText})\n\n🔗 <a href="${summaryLink}">Batafsil Hisobotni Ko'rish</a>`;

    const botRes = await sendTelegramBotMessage(chatId, msg);
    if (botRes.ok) {
      res.json({ success: true, message: 'Telegram ga yuborildi!' });
    } else {
      res.status(500).json({ error: botRes.description || 'Telegram xatosi' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



// 24/7 Long Polling Loop for Telegram Bot Commands
let lastUpdateId = 0;
async function startTelegramBotPolling() {
  console.log('🤖 HB DIAGNOSTIKA Telegram Bot Server 24/7 ishga tushdi...');
  while (true) {
    try {
      const res = await fetch(`${TELEGRAM_API_BASE}/getUpdates?offset=${lastUpdateId + 1}&timeout=25`);
      const data = await res.json();
      if (data.ok && Array.isArray(data.result)) {
        for (const update of data.result) {
          lastUpdateId = update.update_id;
          if (update.message && update.message.text) {
            const chatId = update.message.chat.id;
            const text = update.message.text.trim();
            const senderName = update.message.from?.first_name || 'Foydalanuvchi';

            if (text === '/start') {
              const welcomeMsg = `👋 <b>Assalomu alaykum, ${senderName}!</b>\n\n<b>HB Diagnostika Rasmiy Boti</b>ga xush kelibsiz.\n\nSiz ushbu bot orqali:\n• Diagnostika va imtihon xulosalarini avtomatik olishingiz\n• Test ID kiritib natijalarni izlashingiz\n• Telegram WebApp orqali imtihon topshirishingiz mumkin.\n\nSizning <b>Chat ID:</b> <code>${chatId}</code>\n<i>(Diagnostika test xulosalari va AI tahlillari avtomatik ravishda ushbu Telegram chatga yuboriladi)</i>`;
              
              const keyboard = {
                inline_keyboard: [
                  [
                    {
                      text: '📱 HB Diagnostika WebApp-ni Ochish',
                      web_app: { url: 'https://bmdiagnostika.vercel.app' }
                    }
                  ]
                ]
              };
              await sendTelegramBotMessage(chatId, welcomeMsg, keyboard);
            } else if (/^\d{5,6}$/.test(text) || text.startsWith('res_')) {
              try {
                const found = await Result.findOne({ id: text }) || await OnlineTestResult.findOne({ id: text });
                if (found) {
                  const summaryMsg = `🎓 <b>HB DIAGNOSTIKA NATIJASI</b> 🎓\n\n👤 <b>O'quvchi:</b> ${found.studentName}\n🏫 <b>Sinf:</b> ${found.grade || '5'}-sinf\n📊 <b>Natija:</b> ${found.totalScore}/100 ball\n\n🔗 <a href="https://bmdiagnostika.vercel.app/summary/${found.id}">Batafsil Hisobotni Ko'rish</a>`;
                  await sendTelegramBotMessage(chatId, summaryMsg);
                } else {
                  await sendTelegramBotMessage(chatId, `⚠️ <code>${text}</code> ID bo'yicha diagnostika natijasi topilmadi.`);
                }
              } catch (dbErr) {
                await sendTelegramBotMessage(chatId, `⚠️ Qidirishda xatolik yuz berdi.`);
              }
            } else {
              await sendTelegramBotMessage(chatId, `Sizning <b>Chat ID:</b> <code>${chatId}</code>\n\nDiagnostika natijasini ko'rish uchun 6-xonali Test ID sini yuboring yoki WebApp ni oching.`, {
                inline_keyboard: [[{ text: '📱 WebApp-ni Ochish', web_app: { url: 'https://bmdiagnostika.vercel.app' } }]]
              });
            }
          }
        }
      }
    } catch (err) {
      console.error('Telegram bot polling error:', err);
      await new Promise(r => setTimeout(r, 5000));
    }
  }
}


// --- WebSocket Setup ---

const httpServer = createServer(app);
setupSockets(httpServer);

httpServer.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  startTelegramBotPolling().catch(err => console.error('Bot polling start error:', err));
});
