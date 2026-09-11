import mongoose from 'mongoose';

// Mongoose Schema
const ResultSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  pin: String,
  studentName: String,
  grade: String,
  blueprintSnapshot: Array,
  scores: mongoose.Schema.Types.Mixed,
  totalScore: Number,
  questionResults: mongoose.Schema.Types.Mixed,
  aiSummaryText: String,
  aiAdviceText: String,
  aiRoadmap: mongoose.Schema.Types.Mixed,
  // ✅ 13. createdAt String emas Date — sort va date comparison to'g'ri ishlaydi
  createdAt: { type: Date, default: Date.now }
}); // strict true bo'ldi (yaxshiroq xavfsizlik)


export const Result = mongoose.model('Result', ResultSchema);

const OnlineTestSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  teacherId: { type: String, required: true, index: true },
  title: String,
  subject: String,
  // ✅ FIX: questions strukturasi aniqlandi
  questions: [mongoose.Schema.Types.Mixed],
  startTime: String,
  endTime: String,
  durationMinutes: Number,
  isDiagnostic: Boolean,
  grade: String,
  createdAt: { type: Date, default: Date.now }
});


OnlineTestSchema.index({ teacherId: 1, createdAt: -1 });

export const OnlineTest = mongoose.model('OnlineTest', OnlineTestSchema);

const OnlineTestResultSchema = new mongoose.Schema({
  // 1.5 FIX: id maydoni unique va required — Result schema bilan izchillik
  id: { type: String, required: true, unique: true, index: true },
  testId: { type: String, required: true, index: true },
  studentName: { type: String, required: true, trim: true },
  testTitle: String,
  answers: mongoose.Schema.Types.Mixed,
  questions: [mongoose.Schema.Types.Mixed], // saqlangan snapshot
  score: { type: Number, default: 0 },
  totalScore: { type: Number, default: 0 },
  aiFeedback: String,
  createdAt: { type: Date, default: Date.now }
});


OnlineTestResultSchema.index({ testId: 1, createdAt: -1 });

export const OnlineTestResult = mongoose.model('OnlineTestResult', OnlineTestResultSchema);

// Teacher Schema for Auth
const TeacherSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true },
  password: { type: String, required: true },
  subject: { type: String, required: true },
  role: { type: String, enum: ['teacher', 'admin'], default: 'teacher' },
  plan: { type: String, enum: ['free', 'standard', 'premium'], default: 'free' },
  planStatus: { type: String, enum: ['active', 'pending', 'expired'], default: 'active' },
  requestedPlan: { type: String, enum: ['standard', 'premium', null], default: null },
  paymentNote: { type: String, default: '' },
  planExpiresAt: { type: Date, default: null },
  dailyAiCount: { type: Number, default: 0 },
  lastAiGenDate: { type: String, default: '' },
  schoolName: { type: String, default: '' },
  schoolLogo: { type: String, default: '' },
  avatar: { type: String, default: '' },
  phone: { type: String, default: '' }
}, { timestamps: true });

export const Teacher = mongoose.model('Teacher', TeacherSchema);

// Telegram Subscription Schema
const TelegramSubscriptionSchema = new mongoose.Schema({
  chatId: { type: String, required: true },
  studentName: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});
TelegramSubscriptionSchema.index({ chatId: 1, studentName: 1 }, { unique: true });
export const TelegramSubscription = mongoose.model('TelegramSubscription', TelegramSubscriptionSchema);

