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
import JSZip from 'jszip';
import * as mml2ommlModule from 'mathml2omml';
const { mml2omml } = mml2ommlModule;
import puppeteer from 'puppeteer';

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

function autoFormatMath(text) {
  if (!text) return text;
  let normalized = text.replace(/\$/g, '');
  const tokens = normalized.split(/(\s+)/);
  let result = "";
  let inMath = false;
  let mathBuffer = "";
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.trim() === '') {
      if (inMath) mathBuffer += token;
      else result += token;
      continue;
    }
    if (isTextWord(token)) {
      if (inMath) {
        let trimmed = mathBuffer.trimRight();
        let spaces = mathBuffer.substring(trimmed.length);
        result += `$${trimmed}$${spaces}`;
        inMath = false;
        mathBuffer = "";
      }
      result += token;
    } else {
      if (!inMath) inMath = true;
      mathBuffer += token;
    }
  }
  if (inMath) {
    let trimmed = mathBuffer.trimRight();
    let spaces = mathBuffer.substring(trimmed.length);
    if (trimmed.length > 0) result += `$${trimmed}$${spaces}`;
  }
  return result;
}

function latexToOmml(latex) {
  try {
    const mathml = katex.renderToString(latex.trim(), { output: 'mathml', displayMode: false, throwOnError: false });
    const mathMatch = mathml.match(/<math[\s\S]*?<\/math>/);
    if (!mathMatch) return null;
    let mathStr = mathMatch[0].replace(/<annotation[^>]*>[\s\S]*?<\/annotation>/g, '');
    return mml2omml(mathStr);
  } catch (e) {
    return null;
  }
}

// Build XML paragraphs for a content string (returns array of XML strings)
function buildXmlParagraphs(content, bold = false, heading = null, align = null) {
  const paragraphs = [];

  const makePara = (innerXml, extraPPr = '') => {
    let pPr = '';
    if (heading || align || extraPPr) {
      pPr = '<w:pPr>';
      if (heading === 1) pPr += '<w:pStyle w:val="Heading1"/>';
      else if (heading === 2) pPr += '<w:pStyle w:val="Heading2"/>';
      if (align) pPr += `<w:jc w:val="${align}"/>`;
      pPr += extraPPr + '</w:pPr>';
    }
    return `<w:p>${pPr}${innerXml}</w:p>`;
  };

  const makeRun = (text, isBold) => {
    const rPr = isBold ? '<w:rPr><w:b/><w:bCs/></w:rPr>' : '';
    return `<w:r>${rPr}<w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`;
  };

  if (!content) {
    paragraphs.push(makePara(''));
    return paragraphs;
  }

  const formattedContent = autoFormatMath(content);
  const parts = formattedContent.split('$');
  let currentRuns = [];

  const flushParagraph = () => {
    paragraphs.push(makePara(currentRuns.join('')));
    currentRuns = [];
  };

  parts.forEach((part, index) => {
    if (index % 2 === 0) {
      // Plain text
      const lines = part.split('\n');
      lines.forEach((line, lineIndex) => {
        if (line) currentRuns.push(makeRun(line, bold));
        if (lineIndex < lines.length - 1) flushParagraph();
      });
    } else {
      // Math expression
      const omml = latexToOmml(part);
      if (omml) {
        // Flush pending text paragraph first
        if (currentRuns.length > 0) flushParagraph();
        // oMath is a direct child of w:p (NOT inside w:r)
        paragraphs.push(`<w:p>${omml}</w:p>`);
      } else {
        currentRuns.push(makeRun(`$${part}$`, bold));
      }
    }
  });

  if (currentRuns.length > 0) flushParagraph();
  return paragraphs;
}

function buildDocxXml(title, subject, questions) {
  const NS = [
    'xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"',
    'xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"',
    'xmlns:o="urn:schemas-microsoft-com:office:office"',
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"',
    'xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"',
    'xmlns:v="urn:schemas-microsoft-com:vml"',
    'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"',
    'xmlns:w10="urn:schemas-microsoft-com:office:word"',
    'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"',
    'xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"',
    'xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml"',
    'mc:Ignorable="w14 w15"'
  ].join(' ');

  const bodyParts = [];

  // Title
  bodyParts.push(`<w:p><w:pPr><w:pStyle w:val="Heading1"/><w:jc w:val="center"/></w:pPr><w:r><w:t>${escapeXml(title)}</w:t></w:r></w:p>`);

  // Subject
  bodyParts.push(`<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:t>${escapeXml('Fan: ' + subject)}</w:t></w:r></w:p>`);
  bodyParts.push(`<w:p><w:r><w:t></w:t></w:r></w:p>`);

  // Questions
  questions.forEach((q, index) => {
    const qText = `${index + 1}. ${q.questionText}`;
    bodyParts.push(...buildXmlParagraphs(qText, true));
    bodyParts.push(...buildXmlParagraphs(`A) ${q.options[0]}`, false));
    bodyParts.push(...buildXmlParagraphs(`B) ${q.options[1]}`, false));
    bodyParts.push(...buildXmlParagraphs(`C) ${q.options[2]}`, false));
    bodyParts.push(...buildXmlParagraphs(`D) ${q.options[3]}`, false));
    bodyParts.push(`<w:p><w:r><w:t></w:t></w:r></w:p>`);
  });

  // Answer key
  bodyParts.push(`<w:p><w:pPr><w:pStyle w:val="Heading2"/></w:pPr><w:r><w:t>Kalit javoblar</w:t></w:r></w:p>`);
  questions.forEach((q, index) => {
    bodyParts.push(...buildXmlParagraphs(`${index + 1}. ${q.correctOption}`, true));
  });

  const sectPr = `<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="850" w:bottom="1134" w:left="1701" w:header="709" w:footer="709" w:gutter="0"/></w:sectPr>`;

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${NS}><w:body>${bodyParts.join('')}${sectPr}</w:body></w:document>`;
}

function buildStylesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
          xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"
          xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
          mc:Ignorable="w14">
  <w:docDefaults>
    <w:rPrDefault><w:rPr>
      <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
      <w:sz w:val="24"/><w:szCs w:val="24"/>
    </w:rPr></w:rPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:rPr><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:pPr><w:jc w:val="center"/></w:pPr>
    <w:rPr><w:b/><w:bCs/><w:sz w:val="32"/><w:szCs w:val="32"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="heading 2"/>
    <w:rPr><w:b/><w:bCs/><w:sz w:val="28"/><w:szCs w:val="28"/></w:rPr>
  </w:style>
</w:styles>`;
}

async function buildDocxBuffer(title, subject, questions) {
  const zip = new JSZip();

  zip.file('[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`);

  zip.file('_rels/.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);

  zip.file('word/_rels/document.xml.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`);

  zip.file('word/document.xml', buildDocxXml(title, subject, questions));
  zip.file('word/styles.xml', buildStylesXml());

  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

// GET DOCX Export
app.get('/api/online-tests/:id/export/docx', async (req, res) => {
  try {
    const test = await OnlineTest.findOne({ id: req.params.id });
    if (!test) return res.status(404).json({ error: 'Test not found' });

    const buffer = await buildDocxBuffer(test.title, test.subject, test.questions);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(test.title)}.docx"`);
    res.send(buffer);
  } catch (error) {
    console.error("DOCX Export Error:", error);
    res.status(500).json({ error: 'Server error generating DOCX' });
  }
});

// Build HTML string for PDF render
function buildTestHtml(title, subject, questions) {
  // Render each piece of text with KaTeX inline
  const renderText = (text) => {
    if (!text) return '';
    const formatted = autoFormatMath(String(text));
    const parts = formatted.split('$');
    return parts.map((part, i) => {
      if (i % 2 === 0) {
        // escape HTML in plain text
        return part
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
      }
      try {
        return katex.renderToString(part.trim(), {
          output: 'html',
          displayMode: false,
          throwOnError: false,
        });
      } catch {
        return `$${part}$`;
      }
    }).join('');
  };

  const optionLetters = ['A', 'B', 'C', 'D'];

  const questionsHtml = questions.map((q, i) => {
    const optionsHtml = q.options.map((opt, j) => `
      <div class="option">
        <span class="option-circle"></span>
        <span class="option-text"><strong>${optionLetters[j]})</strong> ${renderText(opt)}</span>
      </div>
    `).join('');

    return `
      <div class="question">
        <p class="question-text"><strong>${i + 1}.</strong> ${renderText(q.questionText)}</p>
        <div class="options">${optionsHtml}</div>
      </div>
    `;
  }).join('');

  const answersHtml = questions.map((q, i) =>
    `<span class="answer-item">${i + 1}. <strong>${q.correctOption}</strong></span>`
  ).join('');

  // Read KaTeX CSS from node_modules to inline it
  let katexCss = '';
  try {
    const katexCssPath = join(__dirname, '../node_modules/katex/dist/katex.min.css');
    katexCss = fs.readFileSync(katexCssPath, 'utf8');
    // Fix font paths — make them absolute or use CDN fonts
    katexCss = katexCss.replace(/url\(fonts\//g, 'url(https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/fonts/');
  } catch {
    // fallback to CDN
    katexCss = '@import url("https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css");';
  }

  return `<!DOCTYPE html>
<html lang="uz">
<head>
  <meta charset="UTF-8"/>
  <style>
    ${katexCss}

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: "Times New Roman", Times, serif;
      font-size: 13pt;
      color: #000;
      background: #fff;
      padding: 20mm 25mm 20mm 30mm;
      line-height: 1.6;
    }

    h1.test-title {
      text-align: center;
      font-size: 18pt;
      font-weight: bold;
      margin-bottom: 4pt;
    }

    p.test-subject {
      text-align: center;
      font-size: 12pt;
      color: #444;
      margin-bottom: 20pt;
    }

    .question {
      margin-bottom: 14pt;
      page-break-inside: avoid;
    }

    .question-text {
      font-size: 13pt;
      margin-bottom: 6pt;
    }

    .options {
      padding-left: 16pt;
    }

    .option {
      display: flex;
      align-items: flex-start;
      gap: 8pt;
      margin-bottom: 4pt;
    }

    .option-circle {
      display: inline-block;
      width: 10pt;
      height: 10pt;
      border: 1.5pt solid #000;
      border-radius: 50%;
      flex-shrink: 0;
      margin-top: 3pt;
    }

    .option-text {
      font-size: 12pt;
    }

    .answers-section {
      margin-top: 24pt;
      border-top: 1.5pt solid #000;
      padding-top: 12pt;
      page-break-before: auto;
    }

    .answers-section h2 {
      font-size: 14pt;
      font-weight: bold;
      margin-bottom: 8pt;
    }

    .answers-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 8pt 20pt;
    }

    .answer-item {
      font-size: 12pt;
      min-width: 50pt;
    }

    /* KaTeX inline fixes */
    .katex { font-size: 1em; }
    .katex-display { display: inline; }
  </style>
</head>
<body>
  <h1 class="test-title">${escapeXml(title)}</h1>
  <p class="test-subject">Fan: ${escapeXml(subject)}</p>

  ${questionsHtml}

  <div class="answers-section">
    <h2>Kalit javoblar</h2>
    <div class="answers-grid">${answersHtml}</div>
  </div>
</body>
</html>`;
}

// GET PDF Export (server-side, Puppeteer)
app.get('/api/online-tests/:id/export/pdf', async (req, res) => {
  let browser = null;
  try {
    const test = await OnlineTest.findOne({ id: req.params.id });
    if (!test) return res.status(404).json({ error: 'Test not found' });

    const html = buildTestHtml(test.title, test.subject, test.questions);

    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
    const page = await browser.newPage();

    // Set the HTML content and wait for all network resources (KaTeX fonts)
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', right: '25mm', bottom: '20mm', left: '30mm' },
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(test.title)}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error("PDF Export Error:", error);
    res.status(500).json({ error: 'Server error generating PDF: ' + error.message });
  } finally {
    if (browser) await browser.close();
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
    const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ error: 'Gemini API key is missing' });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const modelsToTry = ['gemini-3.6-flash', 'gemini-3.5-flash-lite', 'gemini-2.5-flash', 'gemini-flash-latest'];

    const prompt = `# ROLE
You are an expert ${subject} teacher and professional exam creator.
Your job is to generate high-quality multiple-choice questions suitable for school students.
Topic: ${topic}
Number of questions: ${questionCount || 5}

# IMPORTANT RULES
1. ALL mathematical expressions MUST be written using valid LaTeX.
2. NEVER write formulas as plain text.

❌ Wrong: \\sqrt{25}, x^2, 3/5, >=, <=, !=
✅ Correct: $\\sqrt{25}$, $x^{2}$, $\\frac{3}{5}$, $\\ge$, $\\le$, $\\ne$

3. Display equations MUST use $$ ... $$
Example:
$$
\\sqrt{144}-\\sqrt{49}+\\sqrt{25}
$$

4. Inline expressions MUST use $...$
Example: $f(x)=x^2$

5. Use only KaTeX / MathJax compatible LaTeX. Allowed commands include: \\frac, \\sqrt, \\pi, \\sin, \\cos, \\tan, \\lim, \\sum, \\int, \\pm, \\times, \\div, \\neq, \\le, \\ge, \\approx, \\infty.
6. Fractions MUST always use $\\frac{a}{b}$. Never use a/b.
7. Exponents: $x^{2}$, $a^{10}$. Never write x^2.
8. Subscripts: $a_{1}$, $x_{n}$.
9. Absolute values: $\\left|x\\right|$.
10. Parentheses: Always use \\left( \\right) when expressions become long.
11. Systems of equations:
$$
\\begin{cases}
x+y=5\\\\
x-y=1
\\end{cases}
$$

# QUESTION QUALITY
Only ONE option is correct.
Randomize the correct answer position.
Difficulty should match the requested level.

# OUTPUT FORMAT
Return ONLY valid JSON.
DO NOT OUTPUT ANYTHING EXCEPT A VALID JSON ARRAY.

Example:
[
  {
    "questionText": "Hisoblang: $$\\sqrt{144}-\\sqrt{49}+\\sqrt{25}$$",
    "options": [
      "$10$",
      "$8$",
      "$12$",
      "$14$"
    ],
    "correctOption": "$10$",
    "type": "multiple_choice",
    "subtopic": "Arithmetic"
  }
]`;

    let text = "";
    let success = false;
    
    for (const modelName of modelsToTry) {
      try {
        console.log(`Test generatsiya qilish uchun model sinab ko'rilmoqda: ${modelName}...`);
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        text = response.text();
        success = true;
        console.log(`Muvaffaqiyatli! ${modelName} orqali test generatsiya qilindi.`);
        break;
      } catch (modelError) {
        console.warn(`Model xatosi (${modelName}):`, modelError.message);
      }
    }

    if (!success) {
      return res.status(500).json({ error: 'Barcha modellar limitdan oshgan yoki xatolik yuz berdi.' });
    }
    
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    // Fix bad escaped characters (like LaTeX \\sqrt, \\frac, \\right, \\tan) generated by LLM
    // We only escape backslashes that are NOT followed by valid JSON escapes
    text = text.replace(/(?<!\\)\\([^"\\/bfnrt])/g, "\\\\$1");
    
    // We specifically escape LaTeX commands that collide with JSON escapes (e.g. \frac, \right, \tan, \begin, \nu)
    text = text.replace(/(?<!\\)\\b(egin|eta|ullet|ar|mod|oldsymbol|f)/g, "\\\\b$1");
    text = text.replace(/(?<!\\)\\f(rac|orall)/g, "\\\\f$1");
    text = text.replace(/(?<!\\)\\r(ight|ho|angle|m)/g, "\\\\r$1");
    text = text.replace(/(?<!\\)\\t(an|ext|imes|o|riangle|heta|ilde)/g, "\\\\t$1");
    text = text.replace(/(?<!\\)\\n(u|abla|eq|eg|exists)/g, "\\\\n$1");
    
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
