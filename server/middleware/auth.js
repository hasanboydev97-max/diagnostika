import jwt from 'jsonwebtoken';
// ✅ 14. dotenv.config() olib tashlandi — faqat server/index.js da bir marta chaqiriladi

let warnedJwt = false;
const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret && !warnedJwt) {
    warnedJwt = true;
    console.warn('⚠️ WARNING: JWT_SECRET is not set in environment variables. Using default fallback key.');
  }
  return secret || 'hb-diagnostika-secure-jwt-key-2026-production';
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
    res.status(401).json({ error: 'Yaroqsiz yoki muddati o\'tgan token' });
  }
};

export const adminMiddleware = (req, res, next) => {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ error: 'Ruxsat etilmadi. Faqat admin uchun.' });
  }
  next();
};
