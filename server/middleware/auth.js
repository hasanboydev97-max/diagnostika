import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'maktab-test-super-secret-key';

export const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Ruxsat etilmadi (Token yo\'q)' });
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.teacherId = decoded.id;
    req.userRole = decoded.role || 'teacher';
    next();
  } catch (error) {
    res.status(401).json({ error: 'Yaroqsiz token' });
  }
};

export const adminMiddleware = (req, res, next) => {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ error: 'Ruxsat etilmadi. Faqat admin uchun.' });
  }
  next();
};
