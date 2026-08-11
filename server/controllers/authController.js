import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Teacher } from '../models/index.js';
import dotenv from 'dotenv';
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'maktab-test-super-secret-key';

export const register = async (req, res) => {
  try {
    const { name, password, subject } = req.body;
    const email = req.body.email?.toLowerCase().trim();
    
    const existing = await Teacher.findOne({ email });
    if (existing) return res.status(400).json({ error: 'Ushbu email allaqachon ro\'yxatdan o\'tgan.' });
    
    const hashedPassword = await bcrypt.hash(password, 10);
    // Hardcoded logic: Make admin@maktab.uz an admin automatically
    const role = email === 'admin@maktab.uz' ? 'admin' : 'teacher';
    const teacher = new Teacher({ name, email, password: hashedPassword, subject, role, plan: 'free', planStatus: 'active' });
    await teacher.save();
    
    const token = jwt.sign({ id: teacher._id, role: teacher.role }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, teacher: { id: teacher._id, name, email, subject, role: teacher.role, plan: teacher.plan, planStatus: teacher.planStatus, avatar: teacher.avatar } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { password } = req.body;
    // Tizimda allaqachon katta harf bilan saqlangan (Admin@...) akkauntlarga kiritish uchun
    // login paytida toLowerCase() qilinmaydi.
    const email = req.body.email?.trim();
    
    // Agar foydalanuvchi "Admin@maktab.uz" va "admin@maktab.uz" qilib 2 ta ochgan bo'lsa, 
    // u qanday harf bilan yozsa, o'sha akkauntiga kiradi.
    const teacher = await Teacher.findOne({ email });
    if (!teacher) return res.status(400).json({ error: 'Email yoki parol xato.' });
    
    const isMatch = await bcrypt.compare(password, teacher.password);
    if (!isMatch) return res.status(400).json({ error: 'Email yoki parol xato.' });
    
    const token = jwt.sign({ id: teacher._id, role: teacher.role || 'teacher' }, JWT_SECRET, { expiresIn: '7d' });
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
