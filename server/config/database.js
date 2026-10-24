/**
 * MongoDB ulanish konfiguratsiyasi.
 * Connection pool, timeout va reconnect sozlamalari.
 * index.js dan ajratildi — separation of concerns.
 */
import mongoose from 'mongoose';
import { ENV } from './env.js';

// Mongoose log darajasini sozlash
mongoose.set('strictQuery', true);

const MONGO_OPTIONS = {
  family: 4,
  serverSelectionTimeoutMS: 10_000,
  connectTimeoutMS: 10_000,
  socketTimeoutMS: 45_000,
  // 30+ o'qituvchi bir vaqtda ishlasa yetarli pool
  maxPoolSize: 20,
  minPoolSize: 2,
};

export async function connectDatabase() {
  if (!ENV.MONGODB_URI) {
    console.warn('⚠️  MONGODB_URI yo\'q — DB ulanishi o\'tkazib yuborildi');
    return;
  }

  try {
    await mongoose.connect(ENV.MONGODB_URI, MONGO_OPTIONS);
    console.log('✅ MongoDB ga ulandi');

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB ulanishi uzildi — reconnect amalga oshiriladi...');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB qayta ulandi');
    });

    mongoose.connection.on('error', err => {
      console.error('❌ MongoDB xatosi:', err.message);
    });
  } catch (err) {
    console.error('❌ MongoDB ulanish xatosi:', err.message);
    // Production'da DB'siz ishlamaslik — crash qilsin, PM2/Render qayta ishga tushiradi
    if (ENV.IS_PROD) process.exit(1);
  }
}

/**
 * Health check uchun DB holati
 */
export function getDbStatus() {
  const state = mongoose.connection.readyState;
  const map = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
  return { state, label: map[state] || 'unknown', isHealthy: state === 1 };
}
