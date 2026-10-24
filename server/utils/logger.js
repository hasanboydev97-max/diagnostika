/**
 * Logger — Pino asosida production-grade logging.
 *
 * Nima uchun `console.log` yetarli emas:
 * - JSON format yo'q → log aggregator (Datadog, Loki) parse qila olmaydi
 * - Log darajasi (level) yo'q → debug va critical bir xil ko'rinadi
 * - Timestamp yo'q → vaqt bo'yicha qidirish qiyin
 * - Performance → Pino console.log'dan 5x tezroq
 *
 * Production'da: JSON format → Render logs yoki Datadog
 * Development'da: chiroyli, rangli format
 */
import pino from 'pino';
import { ENV } from '../config/env.js';

export const logger = pino({
  level: ENV.IS_PROD ? 'info' : 'debug',

  // Production: JSON (log aggregator uchun)
  // Development: Chiroyli format
  transport: ENV.IS_PROD
    ? undefined
    : {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:HH:MM:ss',
          ignore: 'pid,hostname',
        },
      },

  // Barcha log yozuvlariga qo'shiladigan maydonlar
  base: {
    service: 'hb-diagnostika-api',
    env: ENV.NODE_ENV,
  },

  // Sensitive ma'lumotlarni yashirish
  redact: ['req.headers.authorization', 'body.password', 'body.currentPassword', 'body.newPassword'],
});

// Express uchun request logger middleware
export function requestLogger(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';

    logger[level]({
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.headers['user-agent']?.slice(0, 100),
    }, `${req.method} ${req.url} ${res.statusCode}`);
  });

  next();
}

// Xato logger
export function errorLogger(err, req, _res, next) {
  logger.error({
    err,
    method: req.method,
    url: req.url,
    body: req.body,
  }, `Express error: ${err.message}`);
  next(err);
}
