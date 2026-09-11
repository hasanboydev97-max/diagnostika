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
import aiRoutes from './routes/aiRoutes.js';
import { setupSockets } from './sockets/socketManager.js';
import { escapeRegex } from './utils/regexUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ✅ Load .env faqat bir marta — faqat shu faylda
dotenv.config({ path: join(__dirname, '../.env') });

const app = express();
app.set('trust proxy', 1); // ✅ Required for rate limiter to work behind Render/Vercel proxy

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! Shutting down...', err);
  // 0.5 FIX: process.exit(1) — PM2/Docker avtomatik restart qiladi
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION at:', promise, 'reason:', reason);
  // 0.5 FIX: process.exit(1) — buzilgan holatda davom etish o'rniga qayta ishga tushish
  process.exit(1);
});

// ✅ 1. Helmet — HTTP Security Headers
// 2.8 FIX: contentSecurityPolicy: false o'rniga minimal, ishlaydigan CSP
app.use(helmet({
  crossOriginEmbedderPolicy: false, // Cloudinary/CDN rasm yuklashlar uchun
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:", "https://res.cloudinary.com", "https://*.cloudinary.com"],
      connectSrc: [
        "'self'",
        "https://bmdiagnostika.vercel.app",
        "https://hbdiagnostika.vercel.app",
        "https://generativelanguage.googleapis.com",
        "https://api.groq.com",
        "https://api.anthropic.com",
        "wss:",
        "ws:"
      ],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
    }
  }
}));

// 2.4 FIX: NoSQL injection sanitizatsiyasi (express-mongo-sanitize analog)
// Foydalanuvchi kiritgan ma'lumotlardan MongoDB operatorlarini tozalaydi ($gt, $ne, ...)
const mongoSanitize = (obj) => {
  if (obj && typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      if (key.startsWith('$') || key.includes('.')) {
        delete obj[key];
      } else {
        mongoSanitize(obj[key]);
      }
    }
  }
  return obj;
};
app.use((req, _res, next) => {
  if (req.body) mongoSanitize(req.body);
  if (req.query) mongoSanitize(req.query);
  if (req.params) mongoSanitize(req.params);
  next();
});

// ✅ 2. CORS — Faqat ruxsat etilgan domenlar
const allowedOrigins = [
  'https://bmdiagnostika.vercel.app',
  'https://hbdiagnostika.vercel.app',
  'https://diagnostika-3jdz.onrender.com',
  'http://localhost:5173',
  'http://localhost:3000'
];

app.use(cors({
  origin: (origin, callback) => {
    // origin yo'q bo'lsa — server-to-server so'rov (Postman, curl) — ruxsat
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    // Vercel preview URL lari uchun (har deploy da yangi URL bo'lishi mumkin)
    if (origin && origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }
    console.warn(`[CORS BLOCKED] Origin: ${origin}`);
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
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Juda ko\'p so\'rov. Biroz kutib turing.' }
});

// 1.2 FIX: AI endpointlar uchun alohida, qat'iy limit (qimmat operatsiyalar)
// Daqiqasiga 10 ta AI so'rov — DDoS va kutilmagan xarajatdan himoya
const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 daqiqa
  max: 50, // 50-100 kishi (ayniqsa bir xil maktab IP-sidan) kirganda bloklanmasligi uchun oshirildi
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'AI so\'rov limiti. 1 daqiqadan so\'ng qayta urinib ko\'ring.' }
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
// AI va eksport endpointlari — avval qat'iy limit, keyin umumiy
app.use('/api/ai', aiLimiter);
app.use('/api/online-tests/generate', aiLimiter);
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
  storage: multer.memoryStorage(),
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
    serverSelectionTimeoutMS: 10000,
    // 1.3 FIX: Connection pool sozlamalari — 30+ o'qituvchi bir vaqtda ishlasa yetarli
    maxPoolSize: 20,        // Parallel ulanishlar soni (default: 5 — yetarli emas)
    minPoolSize: 2,         // Doim ochiq bo'ladigan minimal ulanishlar
    connectTimeoutMS: 10000,
    socketTimeoutMS: 45000,
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
      const score = (data.totalScore && data.totalScore > 0)
        ? Math.round((data.score / data.totalScore) * 100)
        : (data.score || 0);
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

// Eski /api/ping — orqaga moslik uchun saqlab qolindi
app.get('/api/ping', (req, res) => {
  res.json({ status: 'ok', message: 'Pong. API is awake.' });
});

// 1.4 FIX: Kengaytirilgan health check — DB holati, uptime, memory
// UptimeRobot va boshqa monitoring tizimlari shu endpoint orqali serverning holatini tekshiradi
app.get('/api/health', async (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatusMap = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
  const isHealthy = dbState === 1;

  const health = {
    status: isHealthy ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    db: dbStatusMap[dbState] || 'unknown',
    memory: {
      rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
    },
  };

  res.status(isHealthy ? 200 : 503).json(health);
});

// KRITIK-5 FIX: /api/results endpointlariga authMiddleware qo'shildi.
// O'qituvchilar faqat o'z o'quvchilarining natijalarini, adminlar barchani ko'ra oladi.
app.get('/api/results', authMiddleware, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 100, 500); // max 500
    // Admin barcha natijalarni ko'ra oladi, o'qituvchi faqat o'zinikini
    const filter = req.userRole === 'admin' ? {} : { teacherId: req.teacherId };
    const results = await Result.find(filter).sort({ _id: -1 }).limit(limit).lean();
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// /api/results/:id — natija umumiy ko'rinish (summary) uchun ochiq qoladi
// O'quvchi o'z natijasini ko'rishi uchun auth shart emas (QR kod orqali kiradi)
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

// ✅ FIX: Eski diagnostika natijalarini yozish uchun ichki secret tekshiruvi qo'shildi.
// Bu endpoint eski frontend (Diagnostika testi) tomonidan ishlatiladi.
// Secret kaliti bo'lmasa yoki noto'g'ri bo'lsa — 403 qaytariladi.
app.post('/api/results', async (req, res) => {
  try {
    const data = req.body;
    
    // Ichki secret tekshiruvi — soxta yozishlarni oldini olish
    const internalSecret = process.env.INTERNAL_API_SECRET;
    const clientSecret = req.headers['x-internal-secret'] || req.body._secret;
    
    if (internalSecret && clientSecret !== internalSecret) {
      // Eski frontend bilan mosligi: secret yo'q bo'lsa ham — faqat warn, block qilmaymiz
      // Lekin INTERNAL_API_SECRET .env da sozlangan bo'lsa — qat'iy tekshiruv
      console.warn(`[/api/results POST] Ruxsatsiz urinish. IP: ${req.ip}`);
      return res.status(403).json({ error: 'Ruxsatsiz amal' });
    }
    
    if (!data.id) {
      return res.status(400).json({ error: 'id maydoni talab qilinadi' });
    }
    
    // Xavfsiz: faqat ruxsat etilgan maydonlarni saqlaymiz
    const safeData = {
      id: data.id,
      pin: data.pin,
      studentName: data.studentName,
      grade: data.grade,
      blueprintSnapshot: data.blueprintSnapshot,
      scores: data.scores,
      totalScore: data.totalScore,
      questionResults: data.questionResults,
      aiSummaryText: data.aiSummaryText,
      aiAdviceText: data.aiAdviceText,
      aiRoadmap: data.aiRoadmap,
      createdAt: data.createdAt || new Date()
    };
    
    await Result.findOneAndUpdate({ id: safeData.id }, safeData, { upsert: true, new: true });
    broadcastResultToTelegram(safeData).catch(() => {});
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

    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: 'maktab-diagnostika' },
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          return res.status(500).json({ error: error.message });
        }
        res.json({ url: result.secure_url });
      }
    );
    uploadStream.end(req.file.buffer);
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
app.use('/api/games', gamesRoutes);
app.use('/api/ai', aiRoutes);

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
                  // ✅ FIX: score to'g'ri foiz sifatida ko'rsatilsin
                  const displayScore = (found.totalScore && found.totalScore > 0 && found.totalScore !== found.score)
                    ? `${found.score}/${found.totalScore} (${Math.round((found.score / found.totalScore) * 100)}%)`
                    : `${found.totalScore ?? found.score}/100`;
                  const summaryMsg = `🎓 <b>HB DIAGNOSTIKA NATIJASI</b> 🎓\n\n👤 <b>O'quvchi:</b> ${found.studentName}\n🏫 <b>Sinf:</b> ${found.grade || '—'}\n📊 <b>Natija:</b> <b>${displayScore}</b>\n\n🔗 <a href="https://bmdiagnostika.vercel.app/summary/${found.id || found._id}">Batafsil Hisobotni Ko'rish</a>`;
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
      // ✅ FIX: Bo'sh update bo'lganda ham kichik delay — CPU ortiq yuklanmasin
      // Long-polling timeout=25s server tomonda kutadi, lekin loop darhol qayta ketishini oldini olish uchun
      await new Promise(r => setTimeout(r, 200));
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
