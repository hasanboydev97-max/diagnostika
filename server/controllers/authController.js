import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Teacher } from '../models/index.js';
import { escapeRegex } from '../utils/regexUtils.js';
// ✅ 14. dotenv.config() olib tashlandi — faqat server/index.js da bir marta chaqiriladi

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      'CRITICAL: JWT_SECRET environment variable is not set! ' +
      'Render/hosting Environment Variables bo\'limida JWT_SECRET ni o\'rnating.'
    );
  }
  return secret;
};

export const register = async (req, res) => {
  try {
    const { name, password, subject } = req.body;
    const email = req.body.email?.toLowerCase().trim();

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Barcha maydonlarni to\'ldiring.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Parol kamida 6 ta belgidan iborat bo\'lishi kerak.' });
    }
    
    // ✅ 3. ReDoS tuzatish — escapeRegex ishlatish
    const existing = await Teacher.findOne({ email: new RegExp(`^${escapeRegex(email)}$`, 'i') });
    if (existing) return res.status(400).json({ error: 'Ushbu email allaqachon ro\'yxatdan o\'tgan.' });
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const role = 'teacher';
    const teacher = new Teacher({ name, email, password: hashedPassword, subject, role, plan: 'free', planStatus: 'active' });
    await teacher.save();
    
    const token = jwt.sign({ id: teacher._id, role: teacher.role }, getJwtSecret(), { expiresIn: '7d' });
    res.status(201).json({ token, teacher: { id: teacher._id, name, email, subject, role: teacher.role, plan: teacher.plan, planStatus: teacher.planStatus, avatar: teacher.avatar } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { password } = req.body;
    const rawEmail = req.body.email?.trim();

    if (!rawEmail || !password) {
      return res.status(400).json({ error: 'Email va parolni kiriting.' });
    }
    
    // ✅ 3. ReDoS tuzatish — escapeRegex ishlatish
    // Case-insensitive lookup so accounts created with uppercase or lowercase emails match reliably
    const teacher = await Teacher.findOne({ email: new RegExp(`^${escapeRegex(rawEmail)}$`, 'i') });
    if (!teacher) return res.status(400).json({ error: 'Email yoki parol xato.' });
    
    const isMatch = await bcrypt.compare(password, teacher.password);
    if (!isMatch) return res.status(400).json({ error: 'Email yoki parol xato.' });
    
    const token = jwt.sign({ id: teacher._id, role: teacher.role || 'teacher' }, getJwtSecret(), { expiresIn: '7d' });
    res.json({ token, teacher: { id: teacher._id, name: teacher.name, email: teacher.email, subject: teacher.subject, role: teacher.role || 'teacher', plan: teacher.plan || 'free', planStatus: teacher.planStatus || 'active', requestedPlan: teacher.requestedPlan, paymentNote: teacher.paymentNote, planExpiresAt: teacher.planExpiresAt, avatar: teacher.avatar } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getMe = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.teacherId).select('-password');
    if (!teacher) return res.status(404).json({ error: 'Topilmadi' });
    res.json(teacher);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { name, subject, schoolName, schoolLogo, avatar, phone } = req.body;
    const teacher = await Teacher.findByIdAndUpdate(
      req.teacherId,
      {
        ...(name ? { name } : {}),
        ...(subject ? { subject } : {}),
        schoolName: schoolName !== undefined ? schoolName : '',
        schoolLogo: schoolLogo !== undefined ? schoolLogo : '',
        avatar: avatar !== undefined ? avatar : '',
        phone: phone !== undefined ? phone : ''
      },
      { new: true }
    ).select('-password');

    res.json({ success: true, teacher });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Joriy va yangi parolni kiriting' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Yangi parol kamida 6 ta belgidan iborat bo\'lishi kerak' });
    }

    const teacher = await Teacher.findById(req.teacherId);
    if (!teacher) return res.status(404).json({ error: 'O\'qituvchi topilmadi' });

    const isMatch = await bcrypt.compare(currentPassword, teacher.password);
    if (!isMatch) return res.status(400).json({ error: 'Joriy parol xato kiritildi' });

    teacher.password = await bcrypt.hash(newPassword, 10);
    await teacher.save();

    res.json({ success: true, message: 'Parol muvaffaqiyatli yangilandi' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 2.6 FIX: Forgot Password
export const forgotPassword = async (req, res) => {
  try {
    const email = req.body.email?.toLowerCase().trim();
    if (!email) {
      return res.status(400).json({ error: 'Emailni kiriting' });
    }

    const teacher = await Teacher.findOne({ email });
    if (!teacher) {
      // Xavfsizlik: email bor yoki yo'qligini oshkor qilmaslik
      return res.json({ message: 'Agar kiritilgan email tizimda mavjud bo\'lsa, parolni tiklash havolasi yuborildi.' });
    }

    // 15 daqiqalik yaroqli token
    const resetToken = jwt.sign(
      { id: teacher._id, purpose: 'password_reset' },
      getJwtSecret(),
      { expiresIn: '15m' }
    );

    // Nodemailer orqali jo'natish (agar ulangan bo'lsa)
    const frontendUrl = process.env.FRONTEND_URL || 'https://bmdiagnostika.vercel.app';
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      // nodemailer'ni dinamik yuklash
      const nodemailer = await import('nodemailer');
      const transporter = nodemailer.default.createTransport({
        service: process.env.EMAIL_SERVICE || 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });
      await transporter.sendMail({
        from: `"Maktab Diagnostika" <${process.env.EMAIL_USER}>`,
        to: teacher.email,
        subject: 'Parolni tiklash so\'rovi',
        html: `<h3>Parolni tiklash</h3><p>Siz (yoki kimdir) parolingizni tiklashni so'radi. Buni amalga oshirish uchun quyidagi havolaga bosing:</p><a href="${resetUrl}">Parolni tiklash</a>`
      });
    } else {
      console.warn('⚠️ [Forgot Password]: EMAIL_USER yoki EMAIL_PASS yo\'q. Token:', resetUrl);
    }

    res.json({ message: 'Agar kiritilgan email tizimda mavjud bo\'lsa, parolni tiklash havolasi yuborildi.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Serverda xatolik yuz berdi.' });
  }
};

// 2.6 FIX: Reset Password
export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ error: 'Barcha maydonlarni to\'ldiring' });
    if (newPassword.length < 6) return res.status(400).json({ error: 'Parol kamida 6 ta belgidan iborat bo\'lishi kerak' });

    let decoded;
    try {
      decoded = jwt.verify(token, getJwtSecret());
    } catch (err) {
      return res.status(400).json({ error: 'Yaroqsiz yoki muddati o\'tgan havola.' });
    }

    if (decoded.purpose !== 'password_reset') return res.status(400).json({ error: 'Noto\'g\'ri token.' });

    const teacher = await Teacher.findById(decoded.id);
    if (!teacher) return res.status(404).json({ error: 'Foydalanuvchi topilmadi.' });

    teacher.password = await bcrypt.hash(newPassword, 10);
    await teacher.save();

    res.json({ success: true, message: 'Parol muvaffaqiyatli yangilandi.' });
  } catch (error) {
    res.status(500).json({ error: 'Server xatosi.' });
  }
};
