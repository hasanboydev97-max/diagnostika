/**
 * CORS & Security konfiguratsiyasi — index.js dan ajratildi.
 */
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

// ─── Ruxsat etilgan domenlar ─────────────────────────────────────────────────
export const ALLOWED_ORIGINS = [
  'https://bmdiagnostika.vercel.app',
  'https://hbdiagnostika.vercel.app',
  'https://diagnostika-3jdz.onrender.com',
  'http://localhost:5173',
  'http://localhost:3000',
];

// ─── Helmet ──────────────────────────────────────────────────────────────────
export const helmetConfig = helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'blob:', 'https://res.cloudinary.com', 'https://*.cloudinary.com'],
      connectSrc: [
        "'self'",
        'https://bmdiagnostika.vercel.app',
        'https://hbdiagnostika.vercel.app',
        'https://generativelanguage.googleapis.com',
        'https://api.groq.com',
        'https://api.anthropic.com',
        'wss:',
        'ws:',
      ],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
    },
  },
});

// ─── CORS ────────────────────────────────────────────────────────────────────
export const corsConfig = cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    if (origin?.endsWith('.vercel.app')) return callback(null, true);
    console.warn(`[CORS BLOCKED] Origin: ${origin}`);
    return callback(new Error(`CORS: ${origin} ruxsatsiz domen`));
  },
  credentials: true,
});

// ─── Rate Limiters ────────────────────────────────────────────────────────────
// Login: 15 daqiqada max 10 urinish — brute force himoyasi
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Juda ko'p urinish. 15 daqiqadan so'ng qayta urinib ko'ring." },
});

// Umumiy API: 15 daqiqada 1500 so'rov
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Juda ko'p so'rov. Biroz kutib turing." },
});

// AI: 1 daqiqada 50 so'rov (qimmat operatsiya)
export const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "AI so'rov limiti. 1 daqiqadan so'ng qayta urinib ko'ring." },
});

// ─── NoSQL Injection Sanitizer ────────────────────────────────────────────────
function sanitizeObject(obj) {
  if (obj && typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      if (key.startsWith('$') || key.includes('.')) {
        delete obj[key];
      } else {
        sanitizeObject(obj[key]);
      }
    }
  }
  return obj;
}

export function mongoSanitizeMiddleware(req, _res, next) {
  if (req.body) sanitizeObject(req.body);
  if (req.query) sanitizeObject(req.query);
  if (req.params) sanitizeObject(req.params);
  next();
}
