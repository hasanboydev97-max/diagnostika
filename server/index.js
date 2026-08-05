import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import { GoogleGenerativeAI } from '@google/generative-ai';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from parent directory
dotenv.config({ path: join(__dirname, '../.env') });

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;

// Cloudinary
if (process.env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
}

const upload = multer({ dest: 'uploads/' });

// Mongoose Schema
const ResultSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  pin: String,
  studentName: String,
  grade: String,
  blueprintSnapshot: Array,
  scores: Object,
  totalScore: Number,
  questionResults: Object,
  aiSummaryText: String,
  aiAdviceText: String,
  createdAt: String
}, { strict: false });

const Result = mongoose.model('Result', ResultSchema);

const OnlineTestSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  teacherId: { type: String, required: true },
  title: String,
  subject: String,
  questions: Array,
  startTime: String,
  endTime: String,
  createdAt: String
}, { strict: false });
const OnlineTest = mongoose.model('OnlineTest', OnlineTestSchema);

const OnlineTestResultSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  testId: String,
  studentName: String,
  answers: Object,
  score: Number,
  totalScore: Number,
  aiFeedback: String,
  createdAt: String
}, { strict: false });
const OnlineTestResult = mongoose.model('OnlineTestResult', OnlineTestResultSchema);

// Teacher Schema for Auth
const TeacherSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  subject: { type: String, required: true }
});
const Teacher = mongoose.model('Teacher', TeacherSchema);

const JWT_SECRET = process.env.JWT_SECRET || 'maktab-test-super-secret-key';

// Middleware for protecting routes
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Ruxsat etilmadi (Token yo\'q)' });
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.teacherId = decoded.id;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Yaroqsiz token' });
  }
};


// Connect to MongoDB
if (MONGODB_URI) {
  mongoose.connect(MONGODB_URI, {
    family: 4, // Use IPv4 (fixes some local DNS/SRV issues)
    serverSelectionTimeoutMS: 10000
  })
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));
} else {
  console.warn('⚠️ MONGODB_URI is missing in .env');
}

// Routes
app.get('/', (req, res) => {
  res.send('API is running...');
});

app.get('/api/ping', (req, res) => {
  res.json({ status: 'ok', message: 'Pong. API is awake.' });
});

app.get('/api/results', async (req, res) => {
  try {
    const results = await Result.find().sort({ _id: -1 });
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/results/:id', async (req, res) => {
  try {
    const result = await Result.findOne({ id: req.params.id });
    if (!result) return res.status(404).json({ error: 'Not found' });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/results', async (req, res) => {
  try {
    const data = req.body;
    await Result.findOneAndUpdate({ id: data.id }, data, { upsert: true, new: true });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'maktab-diagnostika'
    });
    
    // Clean up local temp file
    fs.unlinkSync(req.file.path);
    
    res.json({ url: result.secure_url });
  } catch (error) {
    console.error('Upload Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// --- Auth Routes ---
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, subject } = req.body;
    const existing = await Teacher.findOne({ email });
    if (existing) return res.status(400).json({ error: 'Ushbu email allaqachon ro\'yxatdan o\'tgan.' });
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const teacher = new Teacher({ name, email, password: hashedPassword, subject });
    await teacher.save();
    
    const token = jwt.sign({ id: teacher._id }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, teacher: { id: teacher._id, name, email, subject } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const teacher = await Teacher.findOne({ email });
    if (!teacher) return res.status(400).json({ error: 'Email yoki parol xato.' });
    
    const isMatch = await bcrypt.compare(password, teacher.password);
    if (!isMatch) return res.status(400).json({ error: 'Email yoki parol xato.' });
    
    const token = jwt.sign({ id: teacher._id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, teacher: { id: teacher._id, name: teacher.name, email, subject: teacher.subject } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.teacherId).select('-password');
    if (!teacher) return res.status(404).json({ error: 'Topilmadi' });
    res.json(teacher);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Online Tests Routes ---

app.get('/api/online-tests', authMiddleware, async (req, res) => {
  try {
    const tests = await OnlineTest.find({ teacherId: req.teacherId }).sort({ createdAt: -1 });
    res.json(tests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/online-tests/:id', async (req, res) => {
  try {
    const test = await OnlineTest.findOne({ id: req.params.id });
    if (!test) return res.status(404).json({ error: 'Not found' });
    res.json(test);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET all results for a specific test (Protected)
app.get('/api/online-tests/:id/results', authMiddleware, async (req, res) => {
  try {
    // Check if test belongs to this teacher
    const test = await OnlineTest.findOne({ id: req.params.id, teacherId: req.teacherId });
    if (!test) return res.status(403).json({ error: 'Forbidden' });
    
    const results = await OnlineTestResult.find({ testId: req.params.id }).sort({ createdAt: -1 });
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/online-tests', authMiddleware, async (req, res) => {
  try {
    const test = new OnlineTest({ ...req.body, teacherId: req.teacherId });
    await test.save();
    res.status(201).json({ message: 'Test created successfully', id: test.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/online-test-results', async (req, res) => {
  try {
    const data = req.body;
    
    // Verify time limit on backend to prevent bypassing
    const test = await OnlineTest.findOne({ id: data.testId });
    if (test) {
      const now = new Date();
      if (test.startTime && now < new Date(test.startTime)) {
        return res.status(403).json({ error: 'Test hasn\'t started yet.' });
      }
      if (test.endTime && now > new Date(test.endTime)) {
        return res.status(403).json({ error: 'Test is closed.' });
      }
    }

    // Attempt AI Generation safely
    let aiFeedback = "Ajoyib natija! AI tizimi hozirda band bo'lgani sababli batafsil xulosa berolmadi, ammo yechimlaringiz muvaffaqiyatli saqlandi.";
    try {
      const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
      if (apiKey && test && data.questions) {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
        
        const prompt = `O'quvchi test ishladi. 
Test nomi: ${test.title}
O'quvchi: ${data.studentName}
Natija: ${data.score} / ${data.totalScore}

Savollar va o'quvchining javoblari:
${JSON.stringify(data.questions.map((q, i) => ({
  savol: q.questionText,
  togri_javob: q.correctOption,
  oquvchi_javobi: (data.answers || {})[i] || 'Javob berilmagan'
})), null, 2)}

Ushbu natijalarga asosan o'quvchiga o'zbek tilida qisqa (2-3 ta gap) dalda beruvchi va qaysi mavzularda e'tiborli bo'lishi kerakligi haqida maslahat (feedback) yozing. Hech qanday JSON yozmang, faqat matn.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        aiFeedback = response.text();
      }
    } catch (aiError) {
      console.error('AI Feedback skipped/failed:', aiError.message);
    }

    data.aiFeedback = aiFeedback;

    // Securely save to MongoDB FIRST before sending success response
    const resultDoc = new OnlineTestResult(data);
    await resultDoc.save();
    
    res.status(201).json({ message: 'Result saved successfully', aiFeedback });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/online-tests/:id', authMiddleware, async (req, res) => {
  try {
    const testId = req.params.id;
    // Delete the test itself IF it belongs to the teacher
    const deletedTest = await OnlineTest.findOneAndDelete({ id: testId, teacherId: req.teacherId });
    if (!deletedTest) {
      return res.status(404).json({ error: 'Test not found or unauthorized' });
    }
    // Delete all results associated with this test
    await OnlineTestResult.deleteMany({ testId });
    
    res.json({ message: 'Test and associated results deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/online-test-results/:id', async (req, res) => {
  try {
    const result = await OnlineTestResult.findOne({ id: req.params.id });
    if (!result) return res.status(404).json({ error: 'Not found' });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/online-tests/generate', authMiddleware, async (req, res) => {
  try {
    const { topic, questionCount, subject } = req.body;
    const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ error: 'Gemini API key is missing' });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

    const prompt = `Siz malakali ${subject} o'qituvchisisiz. Quyidagi mavzuda maktab o'quvchilari uchun test savollari tuzing:
Mavzu: ${topic}
Savollar soni: ${questionCount || 5}

Faqat valid JSON formatida javob qaytar. Har bir savol obyekti quydagi maydonlarga ega bo'lsin:
- questionText (string)
- options (array of strings, 4 ta variant)
- correctOption (string, options ichidagi bitta qiymat bilan aynan bir xil bo'lishi kerak)
- type (string, "multiple_choice")
- subtopic (string, ushbu savol qaysi aniq qoidaga/kichik mavzuga doir ekanligi, masalan "Kasrlarni qo'shish", qisqa 1-2 so'z)

JSON dan boshqa hech qanday izoh yoki markdown yozma. Array qaytar.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const questions = JSON.parse(text);
    res.json({ questions });
  } catch (error) {
    console.error('AI Gen Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Old API check endpoint removed to favor the atomic save logic

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
