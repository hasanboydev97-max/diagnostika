import jwt from 'jsonwebtoken';
// dotenv.config() faqat server/index.js da bir marta chaqiriladi

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    // KRITIK-4 FIX: Fallback kalit ishlatish o'chirildi.
    // JWT_SECRET o'rnatilmagan bo'lsa — server ishga tushmasligi kerak (fail-fast).
    // Production'da bu to'g'ri: sirni o'rnatmasdan ishlash xavfliroq.
    throw new Error(
      'CRITICAL: JWT_SECRET environment variable is not set! ' +
      'Server production\'da ishga tushishi uchun JWT_SECRET ni Render/hosting Environment Variables bo\'limida o\'rnating.'
    );
  }
  return secret;
};

export const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Ruxsat etilmadi (Token yo\'q)' });

  try {
    const decoded = jwt.verify(token, getJwtSecret());
    req.teacherId = decoded.id;
    req.userRole = decoded.role || 'teacher';
    next();
  } catch (error) {
    // JWT_SECRET yo'q bo'lsa — server xatosi (500), token xato bo'lsa — 401
    if (error.message.startsWith('CRITICAL:')) {
      console.error(error.message);
      return res.status(500).json({ error: 'Server konfiguratsiya xatosi. Admin bilan bog\'laning.' });
    }
    res.status(401).json({ error: 'Yaroqsiz yoki muddati o\'tgan token' });
  }
};

export const adminMiddleware = (req, res, next) => {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ error: 'Ruxsat etilmadi. Faqat admin uchun.' });
  }
  next();
};
