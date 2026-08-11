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
import katex from 'katex';
import PDFDocument from 'pdfkit';
import { Document, Paragraph, TextRun, Packer, HeadingLevel, AlignmentType, ImportedXmlComponent } from 'docx';
import * as mml2ommlModule from 'mathml2omml';
const { mml2omml } = mml2ommlModule;
import { Server } from 'socket.io';
import { createServer } from 'http';

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
  durationMinutes: Number,
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
const Teacher = mongoose.model('Teacher', TeacherSchema);

const JWT_SECRET = process.env.JWT_SECRET || 'maktab-test-super-secret-key';

// Middleware for protecting routes
const authMiddleware = (req, res, next) => {
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

const adminMiddleware = (req, res, next) => {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ error: 'Ruxsat etilmadi. Faqat admin uchun.' });
  }
  next();
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
    // Hardcoded logic: Make admin@maktab.uz an admin automatically
    const role = email.toLowerCase() === 'admin@maktab.uz' ? 'admin' : 'teacher';
    const teacher = new Teacher({ name, email, password: hashedPassword, subject, role, plan: 'free', planStatus: 'active' });
    await teacher.save();
    
    const token = jwt.sign({ id: teacher._id, role: teacher.role }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, teacher: { id: teacher._id, name, email, subject, role: teacher.role, plan: teacher.plan, planStatus: teacher.planStatus } });
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
    
    const token = jwt.sign({ id: teacher._id, role: teacher.role || 'teacher' }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, teacher: { id: teacher._id, name: teacher.name, email: teacher.email, subject: teacher.subject, role: teacher.role || 'teacher', plan: teacher.plan || 'free', planStatus: teacher.planStatus || 'active', requestedPlan: teacher.requestedPlan, paymentNote: teacher.paymentNote, planExpiresAt: teacher.planExpiresAt } });
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

// Update Teacher Profile Info
app.put('/api/auth/profile', authMiddleware, async (req, res) => {
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
});

// Change Teacher Password
app.put('/api/auth/change-password', authMiddleware, async (req, res) => {
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
});

// --- Subscription Endpoints ---
app.post('/api/subscription/request', authMiddleware, async (req, res) => {
  try {
    const { requestedPlan, paymentNote } = req.body;
    if (!['standard', 'premium'].includes(requestedPlan)) {
      return res.status(400).json({ error: 'Yaroqsiz tarif rejasi' });
    }

    const teacher = await Teacher.findByIdAndUpdate(
      req.teacherId,
      {
        requestedPlan,
        paymentNote: paymentNote || '',
        planStatus: 'pending'
      },
      { new: true }
    ).select('-password');

    res.json({ success: true, teacher });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/subscriptions', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const teachers = await Teacher.find().select('-password').sort({ updatedAt: -1 });
    res.json(teachers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/subscriptions/update-plan', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { teacherId, plan, status, durationDays } = req.body;
    if (!teacherId || !['free', 'standard', 'premium'].includes(plan)) {
      return res.status(400).json({ error: 'Ma\'lumotlar to\'liq emas' });
    }

    let planExpiresAt = null;
    if (plan !== 'free') {
      const days = parseInt(durationDays, 10) || 30;
      const now = new Date();
      now.setDate(now.getDate() + days);
      planExpiresAt = now;
    }

    const updatedTeacher = await Teacher.findByIdAndUpdate(
      teacherId,
      {
        plan,
        planStatus: status || 'active',
        requestedPlan: null,
        planExpiresAt
      },
      { new: true }
    ).select('-password');

    res.json({ success: true, teacher: updatedTeacher });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Admin Routes ---
app.get('/api/admin/stats', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const totalTeachers = await Teacher.countDocuments();
    const totalOnlineTests = await OnlineTest.countDocuments();
    const totalOnlineResults = await OnlineTestResult.countDocuments();
    const totalOfflineResults = await Result.countDocuments();
    
    res.json({
      teachers: totalTeachers,
      tests: totalOnlineTests,
      results: totalOnlineResults + totalOfflineResults
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/teachers', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const teachers = await Teacher.find().select('-password').sort({ _id: -1 });
    
    // Annotate with their test count
    const teachersWithStats = await Promise.all(teachers.map(async (t) => {
      const testCount = await OnlineTest.countDocuments({ teacherId: t._id });
      return { ...t.toObject(), testCount };
    }));
    
    res.json(teachersWithStats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/tests', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    // Populate teacher info manually since we don't have refs set up perfectly
    const tests = await OnlineTest.find().sort({ createdAt: -1 }).lean();
    
    const testsWithTeachers = await Promise.all(tests.map(async (test) => {
      let teacher = null;
      if (test.teacherId) {
        teacher = await Teacher.findById(test.teacherId).select('name email subject').lean();
      }
      return { ...test, teacher };
    }));
    
    res.json(testsWithTeachers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/results', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    // Get recent online test results
    const results = await OnlineTestResult.find().sort({ createdAt: -1 }).limit(100).lean();
    
    const resultsWithTestInfo = await Promise.all(results.map(async (res) => {
      const test = await OnlineTest.findOne({ id: res.testId }).select('title subject teacherId').lean();
      let teacher = null;
      if (test && test.teacherId) {
        teacher = await Teacher.findById(test.teacherId).select('name').lean();
      }
      return { ...res, test, teacher };
    }));
    
    res.json(resultsWithTestInfo);
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
    const test = await OnlineTest.findOne({ id: req.params.id }).lean();
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

function escapeXml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function isTextWord(word) {
  const cleanWord = word.replace(/^[.,!?:;()]+|[.,!?:;()]+$/g, '');
  if (cleanWord.length < 2) return false;
  for (let i = 0; i < cleanWord.length; i++) {
    const c = cleanWord[i];
    if ("0123456789+*/=<>|[]{}^_-\\".includes(c)) return false;
  }
  return /^[a-zA-Z'oEʻgEʻ]+$/i.test(cleanWord);
}

function cleanMathForText(text) {
  if (!text) return '';
  let str = String(text);

  // Convert LaTeX math to readable Unicode symbols for display in PDF
  // (requires a Unicode-capable font — we use DejaVu Sans on the server)
  str = str
    // Handle nested sqrt: \sqrt{...\sqrt{...}...}
    .replace(/\\sqrt\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g, '\u221a($1)')
    .replace(/\\sqrt/g, '\u221a')
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)')
    .replace(/\\times/g, '\u00d7')
    .replace(/\\div/g, '\u00f7')
    .replace(/\\pm/g, '\u00b1')
    .replace(/\\leq/g, '\u2264')
    .replace(/\\geq/g, '\u2265')
    .replace(/\\neq/g, '\u2260')
    .replace(/\\approx/g, '\u2248')
    .replace(/\\infty/g, '\u221e')
    .replace(/\\cdot/g, '\u00b7')
    .replace(/\\circ/g, '\u00b0')
    .replace(/\\alpha/g, '\u03b1')
    .replace(/\\beta/g, '\u03b2')
    .replace(/\\gamma/g, '\u03b3')
    .replace(/\\delta/g, '\u03b4')
    .replace(/\\pi/g, '\u03c0')
    .replace(/\\theta/g, '\u03b8')
    .replace(/\\sin/g, 'sin')
    .replace(/\\cos/g, 'cos')
    .replace(/\\tan/g, 'tan')
    .replace(/\\log/g, 'log')
    .replace(/\\ln/g, 'ln')
    .replace(/\\sum/g, '\u03a3')
    .replace(/\\int/g, '\u222b')
    .replace(/\^\{([^}]+)\}/g, '\u207f')
    .replace(/\^2/g, '\u00b2')
    .replace(/\^3/g, '\u00b3')
    .replace(/\^\{2\}/g, '\u00b2')
    .replace(/\^\{3\}/g, '\u00b3')
    .replace(/\^{([^}]+)}/g, '^($1)')
    .replace(/_{([^}]+)}/g, '_($1)')
    .replace(/<[^>]*>/g, '')
    .replace(/\$/g, '')
    .replace(/\\/g, '')
    .replace(/\{|\}/g, '');

  return str.trim();
}

function latexToOmml(latex) {
  try {
    // Sanitize input: strip any XML-unsafe characters before parsing
    const safeLaTeX = latex.trim()
      .replace(/&(?!amp;|lt;|gt;|quot;|apos;)/g, '&amp;');
    const mathml = katex.renderToString(safeLaTeX, { output: 'mathml', displayMode: false, throwOnError: false });
    const mathMatch = mathml.match(/<math[\s\S]*?<\/math>/);
    if (!mathMatch) return null;
    // Strip annotation tags which can contain LaTeX with unsafe XML characters
    let mathStr = mathMatch[0]
      .replace(/<semantics>([\s\S]*?)<\/semantics>/g, (_, inner) => {
        // Only keep non-annotation children
        return inner.replace(/<annotation[^>]*>[\s\S]*?<\/annotation>/g, '');
      })
      .replace(/<annotation[^>]*>[\s\S]*?<\/annotation>/g, '')
      .replace(/<semantics>/g, '').replace(/<\/semantics>/g, '');
    let omml = mml2omml(mathStr);
    return omml;
  } catch (e) {
    return null;
  }
}

function buildDocxChildren(content, options = {}) {
  if (!content) return [new TextRun('')];
  
  // Format HTML/AI tags first
  let text = String(content)
    .replace(/<\s*code\s*>/gi, '`')
    .replace(/<\s*\/\s*code\s*>/gi, '`')
    .replace(/<[^>]*>/g, '');
    
  // Normalize $$ to $ for split
  text = text.replace(/\$\$\s*=\s*/g, '$$').replace(/\$\s*=\s*\\frac/g, '$\\frac');
  text = text.replace(/\$\$([\s\S]*?)\$\$/g, '$$$1$$');

  const parts = text.split('$');
  const children = [];

  parts.forEach((part, index) => {
    if (index % 2 === 0) {
      if (part) children.push(new TextRun({ text: part, ...options }));
    } else {
      if (!part.trim()) return;
      
      let cleanMath = part.trim();
      if (cleanMath.startsWith('=\\')) {
        cleanMath = cleanMath.substring(1);
      }

      const omml = latexToOmml(cleanMath);
      if (omml) {
        try {
          const parsed = ImportedXmlComponent.fromXmlString(omml);
          if (parsed && parsed.root && parsed.root.length > 0) {
            children.push(parsed.root[0]);
          } else {
            // Fallback: render as unicode text
            children.push(new TextRun({ text: cleanMathForText(cleanMath), ...options }));
          }
        } catch {
          // XML parse failed — fallback to unicode text
          children.push(new TextRun({ text: cleanMathForText(cleanMath), ...options }));
        }
      } else {
        // latexToOmml returned null — fallback to unicode text
        children.push(new TextRun({ text: cleanMathForText(cleanMath), ...options }));
      }
    }
  });

  return children;
}

async function buildDocxBuffer(title, subject, questions) {
  const children = [
    // Title
    new Paragraph({
      text: title || 'Test',
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 }
    }),
    // Subject
    new Paragraph({
      children: [
        new TextRun({ text: `Fan: ${subject || ''}`, italic: true, size: 24 })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 }
    })
  ];

  const optionLetters = ['A', 'B', 'C', 'D'];
  (questions || []).forEach((q, index) => {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: `${index + 1}. `, bold: true, size: 24 }),
          ...buildDocxChildren(q.questionText || '', { bold: true, size: 24 })
        ],
        spacing: { before: 240, after: 120 }
      })
    );

    (q.options || []).forEach((opt, oi) => {
      const letter = optionLetters[oi] || `${oi + 1}`;
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `    ${letter}) `, bold: true, size: 22 }),
            ...buildDocxChildren(opt || '', { size: 22 })
          ],
          spacing: { after: 80 }
        })
      );
    });
  });

  // Answer Key Section
  children.push(
    new Paragraph({
      text: 'Kalit Javoblar:',
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 400, after: 200 }
    })
  );

  const answerRuns = (questions || []).map((q, index) => {
    const correctIdx = (q.options || []).findIndex(o => o === q.correctOption);
    const letter = correctIdx >= 0 ? optionLetters[correctIdx] : (q.correctOption || '?');
    return new TextRun({ text: `${index + 1}.${letter}   `, bold: true, size: 22 });
  });

  children.push(
    new Paragraph({
      children: answerRuns,
      spacing: { after: 200 }
    })
  );

  const doc = new Document({
    sections: [{
      properties: {},
      children
    }]
  });

  return await Packer.toBuffer(doc);
}

// GET DOCX Export — Official docx package generator
app.get('/api/online-tests/:id/export/docx', async (req, res) => {
  try {
    const test = await OnlineTest.findOne({ id: req.params.id });
    if (!test) return res.status(404).json({ error: 'Test not found' });

    const buffer = await buildDocxBuffer(test.title, test.subject, test.questions);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(test.title || 'Test')}.docx"`);
    res.send(buffer);
  } catch (error) {
    console.error("DOCX Export Error:", error.message, error.stack);
    res.status(500).json({ error: 'Server error generating DOCX', detail: error.message });
  }
});


// GET Excel/CSV Export — Available for Standard and Premium plans
app.get('/api/online-tests/:id/export/excel', async (req, res) => {
  try {
    const test = await OnlineTest.findOne({ id: req.params.id });
    if (!test) return res.status(404).json({ error: 'Test topilmadi' });

    const results = await OnlineTestResult.find({ testId: req.params.id }).sort({ createdAt: -1 });

    let csvContent = '\uFEFF'; // UTF-8 BOM for Excel Uzbek characters
    csvContent += 'O\'quvchi F.I.SH,Ball,Maksimal Ball,Foiz,Sana\n';

    results.forEach(r => {
      const percent = Math.round((r.score / (r.totalScore || 1)) * 100);
      const dateStr = r.createdAt ? new Date(r.createdAt).toLocaleString() : '';
      csvContent += `"${r.studentName || ''}",${r.score || 0},${r.totalScore || 0},${percent}%,${dateStr}\n`;
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(test.title || 'Test')}_Natijalar.csv"`);
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

function sanitizePdfText(text) {
  if (!text) return '';
  let str = String(text);

  // Convert Cyrillic Uzbek/Russian characters to clean Latin equivalents if any exist in string
  const cyrillicToLatinMap = {
    'А':'A', 'а':'a', 'Б':'B', 'б':'b', 'В':'V', 'в':'v', 'Г':'G', 'г':'g', 'Д':'D', 'д':'d',
    'Е':'E', 'е':'e', 'Ё':'Yo', 'ё':'yo', 'Ж':'Zh', 'ж':'zh', 'З':'Z', 'з':'z', 'И':'I', 'и':'i',
    'Й':'Y', 'й':'y', 'К':'K', 'к':'k', 'Л':'L', 'л':'l', 'М':'M', 'м':'m', 'Н':'N', 'н':'n',
    'О':'O', 'о':'o', 'П':'P', 'п':'p', 'Р':'R', 'р':'r', 'С':'S', 'с':'s', 'Т':'T', 'т':'t',
    'У':'U', 'у':'u', 'Ф':'F', 'ф':'f', 'Х':'X', 'х':'x', 'Ц':'Ts', 'ц':'ts', 'Ч':'Ch', 'ч':'ch',
    'Ш':'Sh', 'ш':'sh', 'Щ':'Shch', 'щ':'shch', 'Ъ':'', 'ъ':'', 'Ы':'Y', 'ы':'y', 'Ь':'', 'ь':'',
    'Э':'E', 'э':'e', 'Ю':'Yu', 'ю':'yu', 'Я':'Ya', 'я':'ya', 'Ў':'O\'', 'ў':'o\'', 'Қ':'Q', 'қ':'q',
    'Ғ':'G\'', 'ғ':'g\'', 'Ҳ':'H', 'ҳ':'h'
  };

  str = str.replace(/[А-яЁёЎўҚқҒғҲҳ]/g, m => cyrillicToLatinMap[m] || m);

  // Replace non-WinAnsi typographical quotes/dashes/accents with clean ASCII equivalents
  str = str
    .replace(/[ʻ’'`ʼ]/g, "'")
    .replace(/[“”"]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/«/g, '"')
    .replace(/»/g, '"')
    .replace(/\s+/g, ' ');

  return cleanMathForText(str);
}

// GET PDF Export — pure JS pdfkit (works everywhere, no Chrome needed)
app.get('/api/online-tests/:id/export/pdf', async (req, res) => {
  try {
    const test = await OnlineTest.findOne({ id: req.params.id });
    if (!test) return res.status(404).json({ error: 'Test not found' });

    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 56, bottom: 56, left: 70, right: 56 },
      bufferPages: true,
    });

    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));

    // Try to load a Unicode-capable font (DejaVu Sans supports √ ² α π etc.)
    // Available on Render.com (Ubuntu) and most Linux servers
    const UNICODE_FONT_PATHS = [
      '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
      '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
      '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
      '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
      '/usr/share/fonts/truetype/ubuntu/Ubuntu-R.ttf',
      '/usr/share/fonts/truetype/ubuntu/Ubuntu-B.ttf',
    ];

    let regularFont = 'Helvetica';
    let boldFont = 'Helvetica-Bold';

    try {
      if (fs.existsSync(UNICODE_FONT_PATHS[0])) {
        doc.registerFont('UniRegular', UNICODE_FONT_PATHS[0]);
        regularFont = 'UniRegular';
      }
      if (fs.existsSync(UNICODE_FONT_PATHS[1])) {
        doc.registerFont('UniBold', UNICODE_FONT_PATHS[1]);
        boldFont = 'UniBold';
      } else if (fs.existsSync(UNICODE_FONT_PATHS[2])) {
        doc.registerFont('UniRegular', UNICODE_FONT_PATHS[2]);
        regularFont = 'UniRegular';
      }
    } catch { /* fallback to Helvetica */ }

    const optionLetters = ['A', 'B', 'C', 'D'];

    // Title
    doc.font(boldFont).fontSize(18)
      .text(sanitizePdfText(test.title || 'Test'), { align: 'center' });
    doc.font(regularFont).fontSize(12)
      .text(`Fan: ${sanitizePdfText(test.subject || '')}`, { align: 'center' });
    doc.moveDown(1);

    // Questions
    (test.questions || []).forEach((q, i) => {
      doc.moveDown(0.4);

      // Question text
      const qText = `${i + 1}. ${sanitizePdfText(q.questionText || '')}`;

      // Check if near bottom — manual page break
      if (doc.y > 720) doc.addPage();

      doc.font(boldFont).fontSize(11).text(qText, { lineGap: 2 });

      // Options
      (q.options || []).forEach((opt, oi) => {
        const letterLabel = optionLetters[oi] || `${oi + 1}`;
        const optText = `   ${letterLabel}) ${sanitizePdfText(opt || '')}`;
        doc.font(regularFont).fontSize(11).text(optText, { lineGap: 1 });
      });
    });

    // Answer key section
    doc.moveDown(1.5);
    if (doc.y > 700) doc.addPage();
    doc.font(boldFont).fontSize(13).text('Kalit javoblar:', { underline: false });
    doc.moveDown(0.3);

    // Grid layout for answers
    const answersPerRow = 5;
    const answers = (test.questions || []).map((q, i) => {
      const correctIdx = (q.options || []).findIndex(o => o === q.correctOption);
      const letter = correctIdx >= 0 ? optionLetters[correctIdx] : (q.correctOption || '?');
      return `${i + 1}. ${letter}`;
    });

    for (let row = 0; row < Math.ceil(answers.length / answersPerRow); row++) {
      const rowItems = answers.slice(row * answersPerRow, (row + 1) * answersPerRow);
      doc.font(regularFont).fontSize(11).text(rowItems.join('    '), { lineGap: 3 });
    }

    doc.end();

    await new Promise(resolve => doc.on('end', resolve));
    const pdfBuffer = Buffer.concat(chunks);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(test.title)}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('PDF Export Error:', error);
    res.status(500).json({ error: 'Server error generating PDF: ' + error.message });
  }
});



app.post('/api/online-tests', authMiddleware, async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.teacherId);
    if (teacher && teacher.plan === 'free') {
      const activeCount = await OnlineTest.countDocuments({ teacherId: req.teacherId });
      if (activeCount >= 2) {
        return res.status(403).json({
          error: 'Free (Bepul) tarifda maksimal 2 ta aktiv test saqlashingiz mumkin. Cheksiz testlar yaratish uchun Standard yoki Premium tarifiga o\'ting.'
        });
      }
    }

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

      // Check max students limit based on teacher plan
      if (test.teacherId) {
        const creator = await Teacher.findById(test.teacherId);
        if (creator) {
          const studentCount = await OnlineTestResult.countDocuments({ testId: data.testId });
          const maxStudents = creator.plan === 'premium' ? Infinity : (creator.plan === 'standard' ? 50 : 15);
          if (studentCount >= maxStudents) {
            return res.status(403).json({
              error: `Ushbu test uchun o'quvchilar limiti (${maxStudents} ta) to'lgan. Ustozingiz tarifini oshirishi kerak.`
            });
          }
        }
      }
    }

    // Attempt AI Generation safely
    let aiFeedback = "Ajoyib natija! AI tizimi hozirda band bo'lgani sababli batafsil xulosa berolmadi, ammo yechimlaringiz muvaffaqiyatli saqlandi.";
    try {
      const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
      if (apiKey && test && data.questions) {
        const genAI = new GoogleGenerativeAI(apiKey);
        const modelsToTry = ['gemini-3.6-flash', 'gemini-3.5-flash-lite', 'gemini-2.5-flash', 'gemini-flash-latest'];
        
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

        for (const modelName of modelsToTry) {
          try {
            console.log(`AI Feedback uchun model sinab ko'rilmoqda: ${modelName}...`);
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent(prompt);
            const response = await result.response;
            aiFeedback = response.text();
            console.log(`Muvaffaqiyatli! ${modelName} orqali javob olindi.`);
            break;
          } catch (modelError) {
            console.warn(`Model xatosi (${modelName}):`, modelError.message);
          }
        }
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

    // --- Tier Limit Guard ---
    const teacher = await Teacher.findById(req.teacherId);
    if (!teacher) return res.status(404).json({ error: 'O\'qituvchi topilmadi' });

    const todayStr = new Date().toISOString().split('T')[0];
    let dailyCount = teacher.lastAiGenDate === todayStr ? (teacher.dailyAiCount || 0) : 0;
    const maxAllowed = teacher.plan === 'premium' ? Infinity : (teacher.plan === 'standard' ? 25 : 3);

    if (dailyCount >= maxAllowed) {
      return res.status(403).json({
        error: `Sizning ${teacher.plan.toUpperCase()} tarifingiz bo'yicha kunlik AI test yaratish limiti (${maxAllowed} ta) to'lgan. Davom etish uchun tarifni oshiring.`
      });
    }

    const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ error: 'Gemini API key is missing' });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const modelsToTry = ['gemini-3.6-flash', 'gemini-3.5-flash-lite', 'gemini-2.5-flash', 'gemini-flash-latest'];

    // ═══════════════════════════════════════════════════════════════
    // FAN-AWARE PROMPT BUILDER — har bir fan turi uchun alohida qoida
    // ═══════════════════════════════════════════════════════════════
    function buildTestPrompt({ topic, subject, questionCount = 5, difficulty = 'aralash' }) {
      const s = (subject || '').toLowerCase();
      const isExactScience = /matematika|fizika|kimyo|algebra|geometriya|trigonometriya|analitik/i.test(s);
      const isLanguage     = /ingliz|rus|nemis|o.zbek tili|ona tili|adabiyot|fransuz|arab/i.test(s);
      const isInformatics  = /informatika|dasturlash|excel|python|javascript|algoritmlar/i.test(s);

      let formatRules, examples;

      if (isExactScience) {
        formatRules = `
LaTeX YOZISH QOIDALARI:
- Alohida formula: $$...$$   |   Matn ichida: $...$
- Kasr: $$\\\\frac{a}{b}$$   |   Daraja: $x^{2}$   |   Ildiz: $\\\\sqrt{x}$, $\\\\sqrt[3]{8}$
- Indeks: $x_{1}$, $a_{n}$   |   Trigonometriya: $\\\\sin\\\\alpha$, $\\\\cos x$, $\\\\tan\\\\beta$
- Gradus: $60^{\\\\circ}$
- Tenglamalar sistemasi: $$\\\\begin{cases} x+y=5\\\\\\\\ x-y=1 \\\\end{cases}$$
- Fizika birliklari oddiy matnda: "5 m/s", "10 N", "220 V"
MAJBURIY: questionText ichida to'liq, aniq son/formula bo'lsin. Hech qachon "___" yoki bo'sh joy qoldirmang.`;

        examples = `{"questionText":"Hisoblang: $$\\\\sqrt{144}-\\\\sqrt{49}+\\\\sqrt{25}$$","options":["$10$","$8$","$12$","$14$"],"correctOption":"$10$","type":"multiple_choice","subtopic":"Ildizlar","difficulty":"oson"}
{"questionText":"Tenglamani yeching: $$x^{2}-5x+6=0$$","options":["$x_1=1,\\\\, x_2=6$","$x_1=2,\\\\, x_2=3$","$x_1=-2,\\\\, x_2=-3$","$x_1=3,\\\\, x_2=4$"],"correctOption":"$x_1=2,\\\\, x_2=3$","type":"multiple_choice","subtopic":"Kvadrat tenglamalar","difficulty":"o'rta"}
{"questionText":"Soddalashtiring: $$\\\\sin^{2}\\\\alpha+\\\\cos^{2}\\\\alpha$$","options":["$1$","$0$","$2\\\\sin\\\\alpha$","$\\\\sin\\\\alpha\\\\cos\\\\alpha$"],"correctOption":"$1$","type":"multiple_choice","subtopic":"Trigonometrik ayniyatlar","difficulty":"oson"}
{"questionText":"Kasrning maxrajini irratsionallikdan qutqaring: $$\\\\frac{1}{\\\\sqrt{5}-\\\\sqrt{2}}$$","options":["$\\\\sqrt{5}+\\\\sqrt{2}$","$\\\\frac{\\\\sqrt{5}+\\\\sqrt{2}}{3}$","$\\\\sqrt{5}-\\\\sqrt{2}$","$3$"],"correctOption":"$\\\\frac{\\\\sqrt{5}+\\\\sqrt{2}}{3}$","type":"multiple_choice","subtopic":"Irratsional ifodalar","difficulty":"qiyin"}
{"questionText":"Viyet teoremasiga ko'ra, $$x^{2}-5x+6=0$$ tenglamaning ildizlari yig'indisi va ko'paytmasini toping.","options":["Yig'indisi: $5$, Ko'paytmasi: $6$","Yig'indisi: $-5$, Ko'paytmasi: $6$","Yig'indisi: $6$, Ko'paytmasi: $5$","Yig'indisi: $5$, Ko'paytmasi: $-6$"],"correctOption":"Yig'indisi: $5$, Ko'paytmasi: $6$","type":"multiple_choice","subtopic":"Viyet teoremasi","difficulty":"o'rta"}
{"questionText":"$$[0^{\\\\circ}, 90^{\\\\circ}]$$ oralig'idagi $$2\\\\sin x-\\\\sqrt{3}=0$$ tenglamaning ildizini toping.","options":["$60^{\\\\circ}$","$30^{\\\\circ}$","$45^{\\\\circ}$","$90^{\\\\circ}$"],"correctOption":"$60^{\\\\circ}$","type":"multiple_choice","subtopic":"Trigonometrik tenglamalar","difficulty":"o'rta"}`;

      } else if (isLanguage) {
        formatRules = `
QOIDA: Formula kerak emas. Har bir savol aniq gap, so'z yoki matn parchasi ustida qurilsin.
- Grammatika: to'liq gapni keltiring — "Choose the correct form: She ___ to school every day."
- Matn tushunish: qisqa (3-5 gapli) parcha keltirib, keyin savol bering.
- Lug'at/tarjima: so'zni aniq tirnoq ichida ko'rsating.
MAJBURIY: savol matnida bo'sh joy yoki noaniqlik qoldirmang — hamma narsa aniq va to'liq yozilsin.`;

        examples = `{"questionText":"Choose the correct form: 'She ___ to school every day.'","options":["go","goes","going","gone"],"correctOption":"goes","type":"multiple_choice","subtopic":"Present Simple","difficulty":"oson"}
{"questionText":"'Bright' so'ziga eng yaqin ma'nodagi sinonimni tanlang.","options":["dull","shiny","dark","quiet"],"correctOption":"shiny","type":"multiple_choice","subtopic":"Vocabulary","difficulty":"o'rta"}
{"questionText":"Quyidagi gapda qaysi so'z noto'g'ri ishlatilgan? 'Yesterday I have seen a good film.'","options":["Yesterday","have seen","good","film"],"correctOption":"have seen","type":"multiple_choice","subtopic":"Past Simple vs Present Perfect","difficulty":"qiyin"}`;

      } else if (isInformatics) {
        formatRules = `
QOIDA: Kod yoki Excel formulasi backtick (\`) ichida yoziladi, LaTeX EMAS.
- Excel: \`=SUM(A1:B5)\`, \`=IF(A1>10,"Katta","Kichik")\`
- Kod: \`for i in range(10): print(i)\`
MAJBURIY: savol ichida aniq formula/kod bo'lsin — "quyidagi formula" deb umumiy yozmang, formulaning o'zini keltiring.`;

        examples = `{"questionText":"Quyidagi \`=IF(A1>50,\\"O'tdi\\",\\"Yiqildi\\")\` formulasi A1=60 bo'lganda qanday natija beradi?","options":["O'tdi","Yiqildi","60","Xato"],"correctOption":"O'tdi","type":"multiple_choice","subtopic":"Excel IF funksiyasi","difficulty":"o'rta"}
{"questionText":"Python'da \`len([1, 2, 3, 4, 5])\` ifodasi qanday natija qaytaradi?","options":["4","5","6","Xato"],"correctOption":"5","type":"multiple_choice","subtopic":"Python ro'yxatlar","difficulty":"oson"}`;

      } else {
        // Tarix, Biologiya, Geografiya, Iqtisod, Huquq va boshqalar
        formatRules = `
QOIDA: Formula kerak emas. Savolda aniq fakt, sana, atama yoki tushuncha bo'lsin.
- Sanalar aniq yozilsin: "1991-yil 1-sentyabr", "milodiy III asr"
- Atama va tushunchalar to'liq, bo'sh joysiz yozilsin.
MAJBURIY: savol o'zida barcha kerakli faktni to'liq saqlasin — tashqi kontekstga muhtoj bo'lmasin.`;

        examples = `{"questionText":"O'zbekiston Respublikasi qachon mustaqillikka erishdi?","options":["1991-yil 1-sentyabr","1990-yil 20-iyun","1992-yil 8-dekabr","1989-yil 21-oktyabr"],"correctOption":"1991-yil 1-sentyabr","type":"multiple_choice","subtopic":"Yangi tarix","difficulty":"oson"}
{"questionText":"Inson tanasidagi eng katta bez qaysi?","options":["Jigar","Buyrak","Me'da osti bezi","Qalqonsimon bez"],"correctOption":"Jigar","type":"multiple_choice","subtopic":"Anatomiya","difficulty":"o'rta"}`;
      }

      return `Siz O'zbekiston maktablari uchun professional ${subject} fanidan test tuzuvchi sun'iy intellektsiz. Vazifangiz — pedagogik jihatdan sifatli, xilma-xil va xatosiz test savollarini yaratish.

MAVZU: ${topic}
SAVOLLAR SONI: ${questionCount}
QIYINLIK DARAJASI: ${difficulty} (aralash bo'lsa — oson/o'rta/qiyin taxminan teng taqsimlansin)

${formatRules}

SIFAT MEZONLARI (har bir savolni yaratishdan oldin o'zingizni shu bo'yicha tekshiring):
1. Savol matni to'liq va mustaqil tushunarli bo'lsin — tashqi kontekstga muhtoj bo'lmasin.
2. 4 ta variant: 1 ta to'g'ri, 3 ta noto'g'ri. Noto'g'ri variantlar mantiqiy yaqin, lekin aniq xato bo'lsin.
3. To'g'ri javob pozitsiyasi savoldan savolga tasodifiy taqsimlansin.
4. Bir xil savol yoki bir xil variantlar takrorlanmasin.
5. Har bir savol aniq bitta subtopic'ga tegishli bo'lsin, subtopic'lar xilma-xil bo'lsin.
6. Faktik yoki grammatik xatolar bo'lmasin.

TO'G'RI FORMATLANGAN NAMUNALAR (aynan shu uslub va aniqlikda yozing):
${examples}

CHIQISH FORMATI:
Faqat xom (raw) JSON massiv qaytaring. Markdown code fence (\`\`\`) ishlatmang, boshida yoki oxirida hech qanday matn/izoh yozmang.
Har bir obyektda: questionText, options (4 ta), correctOption, type, subtopic, difficulty maydonlari bo'lsin.`;
    }

    const prompt = buildTestPrompt({ topic, subject, questionCount: questionCount || 5, difficulty: req.body.difficulty || 'aralash' });

    // ─── Detect broken question (formula replaced with bare '1') ───
    function isQuestionBroken(qText) {
      if (!qText) return true;
      if (qText.includes('$') || qText.includes('`')) return false;
      const hasMathVerb = /hisoblang|hisobla|soddalashtir|yeching|toping|topingiz|qutqaring|irratsional|ildiz|tenglama|viyet|sistemasini|sistemasidan|oralig|qiymatini|yig.indisini|ko.paytmasini|arifmetigi|diskriminant|karrali/i.test(qText);
      if (!hasMathVerb) return false;
      return /\b1\b/.test(qText) || /:\s*\d+\s*[+\-*\/]?\s*$/.test(qText);
    }

    // ─── generateWithRetry: JSON mode + retry on broken formulas ───
    async function generateWithRetry() {
      for (const modelName of modelsToTry) {
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            console.log(`[AI Gen] ${modelName} — urinish ${attempt}/3...`);
            const model = genAI.getGenerativeModel({
              model: modelName,
              generationConfig: { responseMimeType: 'application/json' }
            });
            const result = await model.generateContent(prompt);
            const raw = result.response.text().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
            const questions = JSON.parse(raw);
            if (!Array.isArray(questions) || questions.length === 0) {
              console.warn(`  ↩ Bo'sh array, qayta urinilmoqda...`);
              continue;
            }
            const broken = questions.filter(q => isQuestionBroken(q.questionText));
            if (broken.length > 0) {
              console.warn(`  ↩ ${broken.length}/${questions.length} ta savol buzilgan, qayta urinilmoqda...`);
              continue;
            }
            console.log(`  ✅ ${modelName} (urinish ${attempt}): ${questions.length} ta sifatli savol.`);
            return questions;
          } catch (err) {
            console.warn(`  ✗ ${modelName} urinish ${attempt}: ${err.message}`);
          }
        }
      }
      return null;
    }

    const rawQuestions = await generateWithRetry();

    if (!rawQuestions) {
      return res.status(500).json({ error: "AI sifatli savol yarata olmadi. Keyinroq qayta urinib ko'ring." });
    }

    // Removed sanitizeQuestions. The robust generation handles quality now.
    const sanitizedQuestions = rawQuestions;

    // Increment daily AI count for teacher
    teacher.lastAiGenDate = todayStr;
    teacher.dailyAiCount = dailyCount + 1;
    await teacher.save();

    res.json({ questions: sanitizedQuestions });
  } catch (error) {
    console.error('AI Gen Error:', error);
    res.status(500).json({ error: error.message });
  }
});


// Old API check endpoint removed to favor the atomic save logic

// ==========================================
// 🤖 TELEGRAM BOT 24/7 SERVER ENGINE (Render.com)
// ==========================================
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || String.fromCharCode(56,54,53,53,56,56,55,50,53,57,58,65,65,70,113,117,101,65,105,114,55,110,49,114,115,110,72,120,75,87,81,105,108,114,110,51,109,83,85,78,114,45,110,74,103);
const TELEGRAM_API_BASE = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

async function sendTelegramBotMessage(chatId, text, replyMarkup = null) {
  try {
    const payload = {
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML',
      disable_web_page_preview: false
    };
    if (replyMarkup) {
      payload.reply_markup = replyMarkup;
    }
    const res = await fetch(`${TELEGRAM_API_BASE}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await res.json();
  } catch (err) {
    console.error('Telegram Bot send error:', err);
    return { ok: false, error: String(err) };
  }
}

// Backend API endpoint for sending Telegram notifications from Vercel web app
app.post('/api/telegram/send', async (req, res) => {
  try {
    const { chatId, result } = req.body;
    if (!chatId || !result) {
      return res.status(400).json({ error: 'Chat ID va result talab qilinadi.' });
    }

    const isPass = result.totalScore >= 70;
    const statusEmoji = isPass ? '🟢' : '🔴';
    const statusText = isPass ? "O'TDI" : "YIQILDI";
    const summaryLink = `https://bmdiagnostika.vercel.app/summary/${result.id}`;

    const msg = `🎓 <b>HB DIAGNOSTIKA NATIJASI</b> 🎓\n\n👤 <b>O'quvchi:</b> ${result.studentName}\n🏫 <b>Sinf:</b> ${result.grade || '5'}-sinf\n📊 <b>Natija:</b> <b>${result.totalScore}/100 ball</b> ${statusEmoji} (${statusText})\n\n🔗 <a href="${summaryLink}">Batafsil Hisobotni Ko'rish</a>`;

    const botRes = await sendTelegramBotMessage(chatId, msg);
    if (botRes.ok) {
      res.json({ success: true, message: 'Telegram ga yuborildi!' });
    } else {
      res.status(500).json({ error: botRes.description || 'Telegram xatosi' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/online-tests/:id/class-analysis', authMiddleware, async (req, res) => {
  try {
    const test = await OnlineTest.findOne({ id: req.params.id });
    if (!test) return res.status(404).json({ error: 'Test topilmadi' });
    
    const teacher = await Teacher.findById(req.teacherId);
    if (!teacher || teacher.plan === 'free') {
      return res.status(403).json({ error: 'AI Sinf Tahlili faqat Standard yoki Premium tariflarda mavjud. Iltimos tarifni oshiring.' });
    }

    const results = await OnlineTestResult.find({ testId: test.id });
    if (results.length === 0) {
      return res.status(400).json({ error: 'Tahlil qilish uchun yetarlicha natijalar yo\'q' });
    }

    const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'Gemini API key is missing' });
    
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Calculate stats per question
    const stats = test.questions.map((q, i) => {
      let correct = 0;
      results.forEach(r => {
        if (r.answers && r.answers[i] === q.correctOption) correct++;
      });
      return {
        questionText: q.questionText,
        correctOption: q.correctOption,
        percentage: Math.round((correct / results.length) * 100)
      };
    });

    const prompt = `Siz maktab o'qituvchilari uchun yordamchi sun'iy intellektsiz.
Quyida "${test.title}" (${test.subject}) testi bo'yicha o'quvchilarning natijalari berilgan. Jami ${results.length} ta o'quvchi ishtirok etgan.

Savollar va o'zlashtirish foizlari:
${stats.map((s, i) => `${i+1}. ${s.questionText.substring(0, 50)}... - O'zlashtirish: ${s.percentage}%`).join('\n')}

Iltimos, quyidagi JSON formatida qat'iy javob qaytaring (Boshqa matn yozmang!):
{
  "weakTopics": ["eng yomon o'zlashtirilgan 2 ta mavzu nomi"],
  "recommendation": "O'qituvchiga qisqa, aniq maslahat (1 gap)",
  "generatedQuestions": [
    {
      "questionText": "Yangi savol matni (faqat zaif mavzularga oid bo'lishi shart)",
      "options": ["A variant", "B variant", "C variant", "D variant"],
      "correctOption": "A variant",
      "subtopic": "qaysi zaif mavzuga tegishliligi"
    }
  ]
}
"generatedQuestions" ichida aynan xato qilingan zaif mavzular bo'yicha jami 5 ta yepyangi savol (multiple_choice tipida) bo'lsin.
`;

    const aiRes = await model.generateContent(prompt);
    let text = aiRes.response.text();
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const data = JSON.parse(text);
    
    res.json(data);
  } catch (err) {
    console.error('AI Analysis Error:', err);
    res.status(500).json({ error: 'AI bilan bog\'lanishda xatolik: ' + err.message });
  }
});

// 24/7 Long Polling Loop for Telegram Bot Commands
let lastUpdateId = 0;
async function startTelegramBotPolling() {
  console.log('🤖 HB DIAGNOSTIKA Telegram Bot Server 24/7 ishga tushdi...');
  while (true) {
    try {
      const res = await fetch(`${TELEGRAM_API_BASE}/getUpdates?offset=${lastUpdateId + 1}&timeout=25`);
      const data = await res.json();
      if (data.ok && Array.isArray(data.result)) {
        for (const update of data.result) {
          lastUpdateId = update.update_id;
          if (update.message && update.message.text) {
            const chatId = update.message.chat.id;
            const text = update.message.text.trim();
            const senderName = update.message.from?.first_name || 'Foydalanuvchi';

            if (text === '/start') {
              const welcomeMsg = `👋 <b>Assalomu alaykum, ${senderName}!</b>\n\n<b>HB Diagnostika Rasmiy Boti</b>ga xush kelibsiz.\n\nSiz ushbu bot orqali:\n• Diagnostika va imtihon xulosalarini avtomatik olishingiz\n• Test ID kiritib natijalarni izlashingiz\n• Telegram WebApp orqali imtihon topshirishingiz mumkin.\n\nSizning <b>Chat ID:</b> <code>${chatId}</code>\n<i>(Diagnostika test xulosalari va AI tahlillari avtomatik ravishda ushbu Telegram chatga yuboriladi)</i>`;
              
              const keyboard = {
                inline_keyboard: [
                  [
                    {
                      text: '📱 HB Diagnostika WebApp-ni Ochish',
                      web_app: { url: 'https://bmdiagnostika.vercel.app' }
                    }
                  ]
                ]
              };
              await sendTelegramBotMessage(chatId, welcomeMsg, keyboard);
            } else if (/^\d{5,6}$/.test(text) || text.startsWith('res_')) {
              try {
                const found = await Result.findOne({ id: text }) || await OnlineTestResult.findOne({ id: text });
                if (found) {
                  const summaryMsg = `🎓 <b>HB DIAGNOSTIKA NATIJASI</b> 🎓\n\n👤 <b>O'quvchi:</b> ${found.studentName}\n🏫 <b>Sinf:</b> ${found.grade || '5'}-sinf\n📊 <b>Natija:</b> ${found.totalScore}/100 ball\n\n🔗 <a href="https://bmdiagnostika.vercel.app/summary/${found.id}">Batafsil Hisobotni Ko'rish</a>`;
                  await sendTelegramBotMessage(chatId, summaryMsg);
                } else {
                  await sendTelegramBotMessage(chatId, `⚠️ <code>${text}</code> ID bo'yicha diagnostika natijasi topilmadi.`);
                }
              } catch (dbErr) {
                await sendTelegramBotMessage(chatId, `⚠️ Qidirishda xatolik yuz berdi.`);
              }
            } else {
              await sendTelegramBotMessage(chatId, `Sizning <b>Chat ID:</b> <code>${chatId}</code>\n\nDiagnostika natijasini ko'rish uchun 6-xonali Test ID sini yuboring yoki WebApp ni oching.`, {
                inline_keyboard: [[{ text: '📱 WebApp-ni Ochish', web_app: { url: 'https://bmdiagnostika.vercel.app' } }]]
              });
            }
          }
        }
      }
    } catch (err) {
      console.error('Telegram bot polling error:', err);
      await new Promise(r => setTimeout(r, 5000));
    }
  }
}

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*', // Adjust in production
    methods: ['GET', 'POST']
  }
});

// Live Kahoot Rooms
const liveRooms = new Map();

// Duel Rooms
const duelRooms = new Map();

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  // Teacher creates a room
  socket.on('host_room', ({ testId }) => {
    // Generate 6-digit pin
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    liveRooms.set(pin, {
      pin,
      hostId: socket.id,
      testId,
      status: 'waiting', // waiting | active | finished
      currentQuestion: -1,
      players: [],
      scores: {}
    });
    socket.join(pin);
    socket.emit('room_created', { pin });
  });

  // Student joins a room
  socket.on('join_room', ({ pin, name }) => {
    const room = liveRooms.get(pin);
    if (!room) {
      return socket.emit('error', 'Xona topilmadi');
    }
    if (room.status !== 'waiting') {
      return socket.emit('error', 'O\'yin allaqachon boshlangan');
    }
    
    room.players.push({ id: socket.id, name, score: 0 });
    room.scores[socket.id] = 0;
    socket.join(pin);
    
    // Notify host
    io.to(room.hostId).emit('player_joined', { players: room.players });
    socket.emit('joined', { pin, name, testId: room.testId });
  });

  // Host starts the game
  socket.on('start_game', ({ pin }) => {
    const room = liveRooms.get(pin);
    if (room && room.hostId === socket.id) {
      room.status = 'active';
      room.currentQuestion = 0;
      io.to(pin).emit('game_started');
      io.to(pin).emit('new_question', { questionIndex: room.currentQuestion });
    }
  });

  // Host moves to next question
  socket.on('next_question', ({ pin }) => {
    const room = liveRooms.get(pin);
    if (room && room.hostId === socket.id) {
      room.currentQuestion++;
      io.to(pin).emit('new_question', { questionIndex: room.currentQuestion });
    }
  });

  // Student submits answer
  socket.on('submit_answer', ({ pin, isCorrect }) => {
    const room = liveRooms.get(pin);
    if (room && room.status === 'active') {
      if (isCorrect) {
        // Simple scoring based on being correct, could add time-based scoring
        room.scores[socket.id] += 100;
        const player = room.players.find(p => p.id === socket.id);
        if (player) player.score = room.scores[socket.id];
      }
      
      // Notify host to update leaderboard
      io.to(room.hostId).emit('leaderboard_update', { players: room.players });
    }
  });

  socket.on('end_game', ({ pin }) => {
    const room = liveRooms.get(pin);
    if (!room) return;
    io.to(pin).emit('game_ended', { players: room.players });
    liveRooms.delete(pin);
  });

  // ==========================================
  // 1v1 DUEL SOCKET LOGIC
  // ==========================================

  socket.on('create_duel', ({ testId, name }) => {
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    duelRooms.set(pin, {
      testId,
      player1: { id: socket.id, name, score: 0, currentQuestion: 0, finished: false },
      player2: null,
      status: 'waiting' // waiting, active, finished
    });
    socket.join(pin);
    socket.emit('duel_created', { pin, testId });
  });

  socket.on('join_duel', ({ pin, name }) => {
    const room = duelRooms.get(pin);
    if (!room) {
      return socket.emit('error', 'Duyel topilmadi yoki xato PIN kod');
    }
    if (room.player2) {
      return socket.emit('error', 'Ushbu duyel allaqachon to\'lgan');
    }
    if (room.status !== 'waiting') {
      return socket.emit('error', 'Duyel allaqachon boshlangan');
    }
    
    room.player2 = { id: socket.id, name, score: 0, currentQuestion: 0, finished: false };
    socket.join(pin);
    
    // Notify both players that duel can start
    io.to(pin).emit('duel_ready', { 
      player1: room.player1.name, 
      player2: room.player2.name,
      testId: room.testId
    });
  });

  socket.on('start_duel', ({ pin }) => {
    const room = duelRooms.get(pin);
    if (!room || socket.id !== room.player1.id) return; // Only creator can start
    room.status = 'active';
    io.to(pin).emit('duel_started');
  });

  socket.on('duel_progress', ({ pin, score, currentQuestion }) => {
    const room = duelRooms.get(pin);
    if (!room) return;

    // Update state
    let isP1 = room.player1.id === socket.id;
    if (isP1) {
      room.player1.score = score;
      room.player1.currentQuestion = currentQuestion;
    } else if (room.player2 && room.player2.id === socket.id) {
      room.player2.score = score;
      room.player2.currentQuestion = currentQuestion;
    }

    // Broadcast update to the room
    io.to(pin).emit('duel_update', {
      player1: room.player1,
      player2: room.player2
    });
  });

  socket.on('duel_finish', ({ pin }) => {
    const room = duelRooms.get(pin);
    if (!room) return;

    if (room.player1.id === socket.id) room.player1.finished = true;
    if (room.player2 && room.player2.id === socket.id) room.player2.finished = true;

    // Broadcast update so both see who finished
    io.to(pin).emit('duel_update', {
      player1: room.player1,
      player2: room.player2
    });

    if (room.player1.finished && (room.player2 ? room.player2.finished : true)) {
      room.status = 'finished';
      io.to(pin).emit('duel_ended', {
        player1: room.player1,
        player2: room.player2
      });
      duelRooms.delete(pin);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    for (const [pin, room] of liveRooms.entries()) {
      if (room.hostId === socket.id) {
        // Host disconnected
        io.to(pin).emit('error', 'O\'qituvchi aloqani uzdi.');
        liveRooms.delete(pin);
      } else {
        // Player disconnected
        const pIndex = room.players.findIndex(p => p.id === socket.id);
        if (pIndex !== -1) {
          room.players.splice(pIndex, 1);
          io.to(room.hostId).emit('player_left', { players: room.players });
        }
      }
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  // Start Telegram Bot polling service
  startTelegramBotPolling().catch(err => console.error('Bot polling start error:', err));
});
