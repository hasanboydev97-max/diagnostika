/**
 * ENV Validatsiya — Server ishga tushishda barcha kerakli o'zgaruvchilarni tekshiradi.
 * "Fail-fast" pattern: Agar muhim ENV yo'q bo'lsa, server darhol to'xtaydi.
 * Bu production'da soatlab izlanadigan xatolarni oldini oladi.
 */

const REQUIRED = ['MONGODB_URI', 'JWT_SECRET'];

const OPTIONAL = [
  'TELEGRAM_BOT_TOKEN',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'GEMINI_PAID_API_KEY',
  'GEMINI_API_KEY',
  'GROQ_API_KEY',
  'ANTHROPIC_API_KEY',
  'INTERNAL_API_SECRET',
  'EMAIL_USER',
  'EMAIL_PASS',
  'SENTRY_DSN',
  'FRONTEND_URL',
];

export function validateEnv() {
  const missing = REQUIRED.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error('');
    console.error('╔══════════════════════════════════════════════════════╗');
    console.error('║  ❌  KRITIK XATO: Majburiy ENV o\'zgaruvchilar yo\'q  ║');
    console.error('╚══════════════════════════════════════════════════════╝');
    missing.forEach(key => console.error(`   • ${key}`));
    console.error('');
    console.error('  Render/Vercel dashboard → Environment Variables bo\'limida o\'rnating.');
    console.error('');
    process.exit(1);
  }

  const warnings = OPTIONAL.filter(key => !process.env[key]);
  if (warnings.length > 0) {
    console.warn(`\n⚠️  Ixtiyoriy ENV lar yo'q (ba'zi funksiyalar o'chiq):`);
    warnings.forEach(key => console.warn(`   • ${key}`));
    console.warn('');
  }

  console.log('✅ ENV validatsiya muvaffaqiyatli o\'tdi');
}

export const ENV = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  IS_PROD: process.env.NODE_ENV === 'production',
  MONGODB_URI: process.env.MONGODB_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  FRONTEND_URL: process.env.FRONTEND_URL || 'https://bmdiagnostika.vercel.app',
  INTERNAL_API_SECRET: process.env.INTERNAL_API_SECRET,
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
};
