/**
 * HB Diagnostika — Backend Entry Point
 *
 * ARXITEKTURA:
 * - Config:     server/config/  (env, database, cloudinary, security)
 * - Services:   server/services/ (telegramBot, aiOrchestrator, cacheService)
 * - Routes:     server/routes/
 * - Controllers:server/controllers/
 * - Models:     server/models/
 * - Middleware: server/middleware/
 *
 * Senior pattern: Thin entry point — faqat app'ni yig'ish,
 * biznes mantiq boshqa joylarda.
 */

import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';

// ─── Config ──────────────────────────────────────────────────────────────────
import { validateEnv, ENV } from './config/env.js';
import { connectDatabase, getDbStatus } from './config/database.js';
import { setupCloudinary, cloudinary, upload } from './config/cloudinary.js';
import {
  helmetConfig,
  corsConfig,
  mongoSanitizeMiddleware,
  authLimiter,
  generalLimiter,
  aiLimiter,
} from './config/security.js';

// ─── Services ─────────────────────────────────────────────────────────────────
import { startTelegramPolling, sendMessage as sendTelegramMsg, broadcastResultToTelegram } from './services/telegramBot.js';

// ─── Models ───────────────────────────────────────────────────────────────────
import { Result, Teacher, TelegramSubscription } from './models/index.js';

// ─── Middleware ───────────────────────────────────────────────────────────────
import { authMiddleware, adminMiddleware } from './middleware/auth.js';

// ─── Routes ───────────────────────────────────────────────────────────────────
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import { onlineTestRoutes, onlineTestResultRoutes } from './routes/onlineTestRoutes.js';
import gamesRoutes from './routes/gamesRoutes.js';
import aiRoutes from './routes/aiRoutes.js';

// ─── Sockets ──────────────────────────────────────────────────────────────────
import { setupSockets } from './sockets/socketManager.js';

// ─── Utils ────────────────────────────────────────────────────────────────────
import { escapeRegex } from './utils/regexUtils.js';
import { requestLogger, errorLogger } from './utils/logger.js';
import mongoose from 'mongoose';

// ════════════════════════════════════════════════════════════════════════════
// 1. ENV VALIDATSIYA — Fail-fast: agar muhim ENV yo'q bo'lsa, darhol to'xtasin
// ════════════════════════════════════════════════════════════════════════════
validateEnv();

// ════════════════════════════════════════════════════════════════════════════
// 2. GLOBAL XATO USHLASH — Kutilmagan xatolardan himoya
// ════════════════════════════════════════════════════════════════════════════
process.on('uncaughtException', err => {
  console.error('[UNCAUGHT EXCEPTION]', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[UNHANDLED REJECTION]', { promise, reason });
  process.exit(1);
});

// ════════════════════════════════════════════════════════════════════════════
// 3. EXPRESS APP SOZLASH
// ════════════════════════════════════════════════════════════════════════════
const app = express();

// Reverse proxy orqasida ishlash (Render, Vercel) — rate limiter uchun kerak
app.set('trust proxy', 1);

// Security middleware'lar (tartib muhim!)
app.use(helmetConfig);
app.use(corsConfig);
app.use(mongoSanitizeMiddleware);

// Body parsing — FAQAT BIR MARTA (avval 10mb, keyin 50mb edi — bug tuzatildi)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging — barcha so'rovlar log qilinadi
app.use(requestLogger);

// Rate limiting
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/ai', aiLimiter);
app.use('/api/online-tests/generate', aiLimiter);
app.use('/api', generalLimiter);

// ════════════════════════════════════════════════════════════════════════════
// 4. INFRA ULANISHLAR
// ════════════════════════════════════════════════════════════════════════════
await connectDatabase();
setupCloudinary();

// ════════════════════════════════════════════════════════════════════════════
// 5. ASOSIY ROUTE'LAR
// ════════════════════════════════════════════════════════════════════════════
app.get('/', (_req, res) => res.send('HB Diagnostika API is running.'));

app.get('/api/ping', (_req, res) => res.json({ status: 'ok', message: 'Pong.' }));

// Health check — UptimeRobot va monitoring tizimlari uchun
app.get('/api/health', async (_req, res) => {
  const db = getDbStatus();
  const health = {
    status: db.isHealthy ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    db: db.label,
    memory: {
      rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
    },
    env: ENV.NODE_ENV,
  };
  res.status(db.isHealthy ? 200 : 503).json(health);
});

// ─── Results (Diagnostika) ────────────────────────────────────────────────────
app.get('/api/results', authMiddleware, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 100, 500);
    const filter = req.userRole === 'admin' ? {} : { teacherId: req.teacherId };
    const results = await Result.find(filter).sort({ _id: -1 }).limit(limit).lean();
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/results/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const query = mongoose.Types.ObjectId.isValid(id)
      ? { $or: [{ _id: id }, { id }] }
      : { id };

    let result = await Result.findOne(query).lean();
    if (!result) {
      const { OnlineTestResult } = await import('./models/index.js');
      result = await OnlineTestResult.findOne(query).lean();
    }
    if (!result) return res.status(404).json({ error: 'Not found' });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Student dashboard uchun natijalar tarixi
app.get('/api/student-results/:studentName', async (req, res) => {
  try {
    const decodedName = decodeURIComponent(req.params.studentName).trim();
    const regex = new RegExp(`^${escapeRegex(decodedName)}$`, 'i');

    const diagResults = await Result.find({ studentName: regex }).lean();
    const { OnlineTestResult } = await import('./models/index.js');
    const onlineResults = await OnlineTestResult.find({ studentName: regex }).lean();

    const normalizedOnline = onlineResults.map(r => ({
      ...r,
      totalScore: r.totalScore > 0 ? Math.round((r.score / r.totalScore) * 100) : (r.score || 0),
      grade: r.testTitle || 'Onlayn Test',
    }));

    const allResults = [...diagResults, ...normalizedOnline].sort(
      (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
    );
    res.json(allResults);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Diagnostika natijasini saqlash (eski frontend bilan moslik)
app.post('/api/results', async (req, res) => {
  try {
    const data = req.body;
    const internalSecret = ENV.INTERNAL_API_SECRET;
    const clientSecret = req.headers['x-internal-secret'] || req.body._secret;

    if (internalSecret && clientSecret !== internalSecret) {
      console.warn(`[/api/results POST] Ruxsatsiz urinish. IP: ${req.ip}`);
      return res.status(403).json({ error: 'Ruxsatsiz amal' });
    }

    if (!data.id) return res.status(400).json({ error: 'id maydoni talab qilinadi' });

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
      createdAt: data.createdAt || new Date(),
    };

    await Result.findOneAndUpdate({ id: safeData.id }, safeData, { upsert: true, new: true });
    broadcastResultToTelegram(safeData).catch(() => {});
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Fayl yuklash ────────────────────────────────────────────────────────────
app.post('/api/upload', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Fayl yuklanmadi' });
    if (!ENV.CLOUDINARY_CLOUD_NAME) return res.status(500).json({ error: 'Cloudinary sozlanmagan' });

    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: 'maktab-diagnostika' },
      (error, result) => {
        if (error) return res.status(500).json({ error: error.message });
        res.json({ url: result.secure_url });
      },
    );
    uploadStream.end(req.file.buffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Subscription so'rovi ─────────────────────────────────────────────────────
app.post('/api/subscription/request', authMiddleware, async (req, res) => {
  try {
    const { requestedPlan, paymentNote } = req.body;
    if (!['standard', 'premium'].includes(requestedPlan)) {
      return res.status(400).json({ error: 'Yaroqsiz tarif rejasi' });
    }
    const teacher = await Teacher.findByIdAndUpdate(
      req.teacherId,
      { requestedPlan, paymentNote: paymentNote || '', planStatus: 'pending' },
      { new: true },
    ).select('-password');
    res.json({ success: true, teacher });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Telegram API Endpointlar ─────────────────────────────────────────────────
app.post('/api/telegram/send-message', authMiddleware, async (req, res) => {
  try {
    const { chatId, message } = req.body;
    if (!chatId || !message) return res.status(400).json({ error: 'Chat ID va xabar talab qilinadi.' });
    const botRes = await sendTelegramMsg(chatId, message);
    if (botRes.ok) res.json({ success: true });
    else res.status(500).json({ error: botRes.description || 'Telegram xatosi' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/telegram/send', authMiddleware, async (req, res) => {
  try {
    const { chatId, result } = req.body;
    if (!chatId || !result) return res.status(400).json({ error: 'Chat ID va result talab qilinadi.' });

    const isPass = result.totalScore >= 70;
    const statusEmoji = isPass ? '🟢' : '🔴';
    const statusText = isPass ? "O'TDI" : 'YIQILDI';
    const summaryLink = `${ENV.FRONTEND_URL}/summary/${result.id}`;

    const msg =
      `🎓 <b>HB DIAGNOSTIKA NATIJASI</b> 🎓\n\n` +
      `👤 <b>O'quvchi:</b> ${result.studentName}\n` +
      `🏫 <b>Sinf:</b> ${result.grade || '5'}-sinf\n` +
      `📊 <b>Natija:</b> <b>${result.totalScore}/100 ball</b> ${statusEmoji} (${statusText})\n\n` +
      `🔗 <a href="${summaryLink}">Batafsil Hisobotni Ko'rish</a>`;

    const botRes = await sendTelegramMsg(chatId, msg);
    if (botRes.ok) res.json({ success: true, message: "Telegram ga yuborildi!" });
    else res.status(500).json({ error: botRes.description || 'Telegram xatosi' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Modul Route'lari ─────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/online-tests', onlineTestRoutes);
app.use('/api/online-test-results', onlineTestResultRoutes);
app.use('/api/games', gamesRoutes);
app.use('/api/ai', aiRoutes);

// ─── 404 va Global Xato Ushlash ───────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Endpoint topilmadi' }));

// Pino error logger (4 argument — muhim!)
app.use(errorLogger);

// Express error handler (4 argument — muhim!)
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  const status = err.status || err.statusCode || 500;
  res.status(status).json({ error: err.message || 'Server xatosi' });
});

// ════════════════════════════════════════════════════════════════════════════
// 6. HTTP SERVER VA WEBSOCKET
// ════════════════════════════════════════════════════════════════════════════
const httpServer = createServer(app);
setupSockets(httpServer);

httpServer.listen(ENV.PORT, () => {
  console.log(`\n🚀 Server ishlamoqda: http://localhost:${ENV.PORT}`);
  console.log(`   Muhit: ${ENV.NODE_ENV}`);
  console.log('');
  // Telegram polling — alohida async zanjir (main event loop'ni bloklamas!)
  startTelegramPolling().catch(err =>
    console.error('[TelegramBot] Ishga tushishda xatolik:', err.message),
  );
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('⏸️  SIGTERM qabul qilindi — server to\'xtatilmoqda...');
  httpServer.close(() => {
    console.log('✅ HTTP server to\'xtatildi');
    process.exit(0);
  });
});
