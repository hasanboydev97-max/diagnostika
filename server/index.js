import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import { createServer } from 'http';
import { Result, Teacher, TelegramSubscription } from './models/index.js';
import { authMiddleware, adminMiddleware } from './middleware/auth.js';
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import { onlineTestRoutes, onlineTestResultRoutes } from './routes/onlineTestRoutes.js';
import gamesRoutes from './routes/gamesRoutes.js';
import { setupSockets } from './sockets/socketManager.js';
import { escapeRegex } from './utils/regexUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ✅ Load .env faqat bir marta — faqat shu faylda
dotenv.config({ path: join(__dirname, '../.env') });

const app = express();
app.set('trust proxy', 1); // ✅ Required for rate limiter to work behind Render/Vercel proxy

// ✅ 1. Helmet — HTTP Security Headers (XSS, Clickjacking, MIME sniffing oldini olish)
app.use(helmet({
  crossOriginEmbedderPolicy: false, // Cloudinary/CDN rasm yuklashlar uchun
  contentSecurityPolicy: false      // Yengil frontendlar uchun, zarur bo'lsa yoqing
}));

// ✅ 2. CORS — Faqat ruxsat etilgan domenlar
const allowedOrigins = [
  'https://bmdiagnostika.vercel.app',
  'https://hbdiagnostika.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000'
];

app.use(cors({
  origin: (origin, callback) => {
    // origin yo'q bo'lsa — server-to-server so'rov (Postman, curl) — ruxsat
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS: ${origin} ruxsatsiz domen`));
  },
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));

// ✅ 3. Rate Limiting — Brute Force va DDoS oldini olish
// Login uchun qat'iy limit: 15 daqiqada maksimal 10 ta urinish
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 daqiqa
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Juda ko\'p urinish. 15 daqiqadan so\'ng qayta urinib ko\'ring.' }
});

// Umumiy API uchun: 15 daqiqada 1500 ta so'rov
// (30+ o'quvchi bir vaqtda test ishlaganda rate limit muammosi bo'lmasin)
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Juda ko\'p so\'rov. Biroz kutib turing.' }
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api', generalLimiter);

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

const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf' || file.mimetype.includes('word')) {
      cb(null, true);
    } else {
      cb(new Error('Faqat rasm, PDF yoki Word fayllarini yuklash mumkin.'));
    }
  }
});

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

// ✅ 5. Telegram Bot Token — FAQAT environment variable dan o'qiladi
// Hardcoded fallback olib tashlandi (git tarixida qolgan token xavfli)
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TELEGRAM_BOT_TOKEN) {
  console.warn('⚠️ TELEGRAM_BOT_TOKEN .env da yo\'q. Telegram funksiyalari o\'chirilgan.');
}
const TELEGRAM_API_BASE = TELEGRAM_BOT_TOKEN
  ? `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`
  : null;

async function sendTelegramBotMessage(chatId, text, replyMarkup = null) {
  if (!TELEGRAM_API_BASE) return { ok: false, error: 'Token yo\'q' };
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

export async function broadcastResultToTelegram(data) {
  try {
    if (!data || !data.studentName) return;
    const cleanName = data.studentName.replace(/\s*\([^)]*\)/g, '').trim();
    // ✅ 3. ReDoS tuzatish — escapeRegex ishlatish
    const subs = await TelegramSubscription.find({ studentName: new RegExp('^' + escapeRegex(cleanName) + '$', 'i') });
    if (subs && subs.length > 0) {
      const score = data.totalScore !== undefined ? data.totalScore : (data.score || 0);
      const isPass = score >= 70;
      const statusEmoji = isPass ? '🟢' : '🔴';
      const resultLink = data.id?.startsWith('res_')
        ? `https://bmdiagnostika.vercel.app/online-tests/results/${data.id}`
        : `https://bmdiagnostika.vercel.app/summary/${data.id || data._id}`;
      const msg = `🔔 <b>YANGI NATIJA QO'SHILDI</b> 🔔\n\n👤 <b>O'quvchi:</b> ${cleanName}\n📊 <b>Natija:</b> <b>${score}/100 ball</b> ${statusEmoji}\n\n🔗 <a href="${resultLink}">Batafsil Hisobotni Ko'rish</a>`;
      for (const sub of subs) {
        await sendTelegramBotMessage(sub.chatId, msg);
      }
    }
  } catch (err) {
    console.error('Telegram broadcast error:', err);
  }
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
    const limit = parseInt(req.query.limit) || 100;
    const results = await Result.find().sort({ _id: -1 }).limit(limit).lean();
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/results/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const query = mongoose.Types.ObjectId.isValid(id)
      ? { $or: [{ _id: id }, { id: id }] }
      : { id: id };
    let result = await Result.findOne(query).lean();
    if (!result) {
      const { OnlineTestResult } = await import('./models/index.js');
      result = await OnlineTestResult.findOne(query).lean();
    }
    if (!result) return res.status(404).json({ error: 'Not found' });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Student results history endpoint for StudentDashboard
app.get('/api/student-results/:studentName', async (req, res) => {
  try {
    const { studentName } = req.params;
    const decodedName = decodeURIComponent(studentName).trim();
    // ✅ 3. ReDoS tuzatish — escapeRegex ishlatish
    const regex = new RegExp(`^${escapeRegex(decodedName)}$`, 'i');

    const diagResults = await Result.find({ studentName: regex }).lean();

    const { OnlineTestResult } = await import('./models/index.js');
    const onlineResults = await OnlineTestResult.find({ studentName: regex }).lean();

    // ✅ 9. totalScore normalizatsiyasi — foiz hisoblash izchil bo'lsin
    // score = to'g'ri javoblar soni, totalScore = savollar soni (bazada shunday)
    // Lekin frontend Dashboard'da jami foizni "totalScore" orqali ko'rsatadi, shuning uchun uni yozib yuboramiz.
    const normalizedOnline = onlineResults.map(r => ({
      ...r,
      totalScore: r.totalScore > 0 ? Math.round((r.score / r.totalScore) * 100) : (r.score || 0),
      grade: r.testTitle || 'Onlayn Test'
    }));

    const allResults = [...diagResults, ...normalizedOnline].sort(
      (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    );

    res.json(allResults);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/results', async (req, res) => {
  try {
    const data = req.body;
    await Result.findOneAndUpdate({ id: data.id }, data, { upsert: true, new: true });
    broadcastResultToTelegram(data).catch(() => {});
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Fayl yuklanmadi' });

    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      return res.status(500).json({ error: 'Cloudinary sozlamalari mavjud emas' });
    }

    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'maktab-diagnostika'
    });

    res.json({ url: result.secure_url });
  } catch (error) {
    console.error('Upload Error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (err) {
        console.error('File cleanup error:', err);
      }
    }
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
app.use('/api/games', gamesRoutes);

// --- Telegram Bot Logic ---
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
  if (!TELEGRAM_API_BASE) {
    console.warn('⚠️ Telegram polling o\'tkazib yuborildi — TELEGRAM_BOT_TOKEN yo\'q.');
    return;
  }
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

            if (text.startsWith('/obuna')) {
              const parts = text.split(' ');
              if (parts.length > 1) {
                const nameToSub = parts.slice(1).join(' ').trim();
                try {
                  await TelegramSubscription.findOneAndUpdate(
                    { chatId: String(chatId), studentName: nameToSub },
                    { chatId: String(chatId), studentName: nameToSub },
                    { upsert: true }
                  );
                  await sendTelegramBotMessage(chatId, `✅ <b>Muvaffaqiyatli!</b>\n\nSiz endi <b>${nameToSub}</b> ismli o'quvchining barcha yangi test natijalarini avtomatik ravishda qabul qilasiz.`);
                } catch (err) {
                  await sendTelegramBotMessage(chatId, '⚠️ Obuna bo\'lishda xatolik yuz berdi.');
                }
              } else {
                await sendTelegramBotMessage(chatId, '⚠️ Iltimos, ismni kiriting. Masalan:\n<code>/obuna Alisher Navoiy</code>');
              }
            } else if (text === '/start') {
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
            } else if (/^\d{5,6}$/.test(text) || text.startsWith('res_') || /^[a-f0-9]{24}$/i.test(text)) {
              try {
                const searchQuery = mongoose.Types.ObjectId.isValid(text)
                  ? { $or: [{ _id: text }, { id: text }] }
                  : { id: text };
                const { OnlineTestResult } = await import('./models/index.js');
                const found = await Result.findOne(searchQuery) || await OnlineTestResult.findOne(searchQuery);
                if (found) {
                  const summaryMsg = `🎓 <b>HB DIAGNOSTIKA NATIJASI</b> 🎓\n\n👤 <b>O'quvchi:</b> ${found.studentName}\n🏫 <b>Sinf:</b> ${found.grade || '5'}-sinf\n📊 <b>Natija:</b> ${found.totalScore}/100 ball\n\n🔗 <a href="https://bmdiagnostika.vercel.app/summary/${found.id || found._id}">Batafsil Hisobotni Ko'rish</a>`;
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

// --- WebSocket & HTTP Setup ---
const httpServer = createServer(app);
setupSockets(httpServer);

httpServer.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  startTelegramBotPolling().catch(err => console.error('Bot polling start error:', err));
});
