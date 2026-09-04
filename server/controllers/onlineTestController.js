import mongoose from 'mongoose';
import fs from 'fs';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { OnlineTest, OnlineTestResult, Teacher } from '../models/index.js';
import { buildDocxBuffer, sanitizePdfText } from '../utils/exportUtils.js';
import PDFDocument from 'pdfkit';
import { isAnswerCorrect, computeScore } from '../utils/scoring.js';
import { processQuestionBatch } from '../utils/mathSanitizer.js';
import pLimit from 'p-limit';

const aiLimit = pLimit(1);

export const getTests = async (req, res) => {
  try {
    const tests = await OnlineTest.find({ teacherId: req.teacherId }).sort({ createdAt: -1 });
    res.json(tests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
export const getTestById = async (req, res) => {
  try {
    const { id } = req.params;
    const query = mongoose.Types.ObjectId.isValid(id)
      ? { $or: [{ _id: id }, { id: id }] }
      : { id: id };
    const test = await OnlineTest.findOne(query).lean();
    if (!test) return res.status(404).json({ error: 'Not found' });
    res.json(test);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
export const getTestResults = async (req, res) => {
  try {
    const { id } = req.params;
    const testQuery = mongoose.Types.ObjectId.isValid(id)
      ? { $or: [{ _id: id }, { id: id }], teacherId: req.teacherId }
      : { id: id, teacherId: req.teacherId };
    const test = await OnlineTest.findOne(testQuery);
    if (!test) return res.status(403).json({ error: 'Forbidden' });
    
    const testIds = [test.id, test._id?.toString(), id].filter(Boolean);

    // 1. Fetch from new architecture
    const newResults = await OnlineTestResult.find({ testId: { $in: testIds } }).lean();
    
    // 2. Fetch from old legacy architecture (in case student used old cached frontend)
    const { Result } = await import('../models/index.js');
    const oldResults = await Result.find({ testId: { $in: testIds } }).lean();
    
    // Merge, deduplicate by ID just in case, and sort by date descending
    const merged = [...newResults, ...oldResults];
    const uniqueMap = new Map();
    merged.forEach(r => uniqueMap.set(r.id || r._id.toString(), r));
    const allResults = Array.from(uniqueMap.values()).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    res.json(allResults);
  } catch (error) {
    console.error("TestResults Fetch Error:", error);
    res.status(500).json({ error: 'Server error' });
  }
};


export const exportToDocx = async (req, res) => {
  try {
    const { id } = req.params;
    const testQuery = mongoose.Types.ObjectId.isValid(id)
      ? { $or: [{ _id: id }, { id: id }] }
      : { id: id };
    const test = await OnlineTest.findOne(testQuery);
    if (!test) return res.status(404).json({ error: 'Test not found' });

    const buffer = await buildDocxBuffer(test.title, test.subject, test.questions);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(test.title || 'Test')}.docx"`);
    res.send(buffer);
  } catch (error) {
    console.error("DOCX Export Error:", error.message, error.stack);
    res.status(500).json({ error: 'Server error generating DOCX', detail: error.message });
  }
};
export const exportToExcel = async (req, res) => {
  try {
    const { id } = req.params;
    const testQuery = mongoose.Types.ObjectId.isValid(id)
      ? { $or: [{ _id: id }, { id: id }] }
      : { id: id };
    const test = await OnlineTest.findOne(testQuery);
    if (!test) return res.status(404).json({ error: 'Test topilmadi' });

    const testIds = [test.id, test._id?.toString(), id].filter(Boolean);
    const newResults = await OnlineTestResult.find({ testId: { $in: testIds } }).lean();
    const { Result } = await import('../models/index.js');
    const oldResults = await Result.find({ testId: { $in: testIds } }).lean();
    const merged = [...newResults, ...oldResults];
    const uniqueMap = new Map();
    merged.forEach(r => uniqueMap.set(r.id || r._id.toString(), r));
    const results = Array.from(uniqueMap.values()).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    let csvContent = '\uFEFF'; // UTF-8 BOM for Excel Uzbek characters
    csvContent += 'O\'quvchi F.I.SH,Ball,Maksimal Ball,Foiz,Sana\n';

    results.forEach(r => {
      const percent = Math.round((r.score / (r.totalScore || 1)) * 100);
      const dateStr = r.createdAt ? new Date(r.createdAt).toLocaleString() : '';
      csvContent += `"${r.studentName || ''}","${r.score || 0}","${r.totalScore || 0}","${percent}%","${dateStr}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(test.title || 'Test')}_Natijalar.csv"`);
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
export const exportToPdf = async (req, res) => {
  try {
    const { id } = req.params;
    const testQuery = mongoose.Types.ObjectId.isValid(id)
      ? { $or: [{ _id: id }, { id: id }] }
      : { id: id };
    const test = await OnlineTest.findOne(testQuery);
    if (!test) return res.status(404).json({ error: 'Test not found' });

    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 56, bottom: 56, left: 70, right: 56 },
      bufferPages: true,
    });

    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));

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

    doc.font(boldFont).fontSize(18)
      .text(sanitizePdfText(test.title || 'Test'), { align: 'center' });
    doc.font(regularFont).fontSize(12)
      .text(`Fan: ${sanitizePdfText(test.subject || '')}`, { align: 'center' });
    doc.moveDown(1);

    (test.questions || []).forEach((q, i) => {
      doc.moveDown(0.4);
      const qText = `${i + 1}. ${sanitizePdfText(q.questionText || '')}`;
      if (doc.y > 720) doc.addPage();
      doc.font(boldFont).fontSize(11).text(qText, { lineGap: 2 });
      (q.options || []).forEach((opt, oi) => {
        const letterLabel = optionLetters[oi] || `${oi + 1}`;
        const optText = `   ${letterLabel}) ${sanitizePdfText(opt || '')}`;
        doc.font(regularFont).fontSize(11).text(optText, { lineGap: 1 });
      });
    });

    doc.moveDown(1.5);
    if (doc.y > 700) doc.addPage();
    doc.font(boldFont).fontSize(13).text('Kalit javoblar:', { underline: false });
    doc.moveDown(0.3);

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
};
export const createTest = async (req, res) => {
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
};
export const submitTestResult = async (req, res) => {
  try {
    const data = req.body;
    if (!data.id) {
      data.id = 'res_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    }
    
    // Verify time limit on backend to prevent bypassing
    const testQuery = mongoose.Types.ObjectId.isValid(data.testId)
      ? { $or: [{ _id: data.testId }, { id: data.testId }] }
      : { id: data.testId };
    const test = await OnlineTest.findOne(testQuery);
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
          const testIds = [test.id, test._id?.toString(), data.testId].filter(Boolean);
          const studentCount = await OnlineTestResult.countDocuments({ testId: { $in: testIds } });
          const maxStudents = creator.plan === 'premium' ? Infinity : (creator.plan === 'standard' ? 50 : 15);
          if (studentCount >= maxStudents) {
            return res.status(403).json({
              error: `Ushbu test uchun o'quvchilar limiti (${maxStudents} ta) to'lgan. Ustozingiz tarifini oshirishi kerak.`
            });
          }
        }
      }

      // ✅ 6. KRITIK: Score serverda qayta hisoblanadi — klientdan kelgan qiymatga ishonilmaydi
      // Hacker score=100 yuborsa ham, DB ga to'g'ri hisoblangan qiymat yoziladi
      if (test.questions && Array.isArray(test.questions) && data.answers) {
        let serverScore = 0;
        let serverTotal = test.questions.length;

        if (data.questions && Array.isArray(data.questions)) {
          // Frontend questions are shuffled. Match by questionText to find the original question securely.
          const answeredIds = new Set();
          serverScore = data.questions.reduce((acc, q, i) => {
            const originalQ = test.questions.find(tq => {
              const matchesText = (tq.questionText || '').trim() === (q.questionText || '').trim();
              const uniqueKey = tq._id ? tq._id.toString() : tq.questionText;
              return matchesText && !answeredIds.has(uniqueKey);
            });
            if (originalQ) {
              answeredIds.add(originalQ._id ? originalQ._id.toString() : originalQ.questionText);
              return acc + (isAnswerCorrect(data.answers[i], originalQ.correctOption, originalQ.options || []) ? 1 : 0);
            }
            return acc;
          }, 0);
        } else {
          // Fallback: data.questions yo'q. data.answers indekslari noaniq bo'lishi mumkin,
          // shu sababli matn bo'yicha qayta moslashtirish imkonsiz.
          // Xavfsiz yechim: faqat matn-matn solishtirish (harf indeksiga ishonmaymiz).
          serverScore = test.questions.reduce((acc, q, i) => {
            const userAns = data.answers[i];
            if (!userAns) return acc;
            // Faqat to'g'ridan-to'g'ri matn taqqoslash — indeks muammosini oldini olish uchun
            const isCorrect = String(userAns).trim().toLowerCase() === String(q.correctOption || '').trim().toLowerCase();
            return acc + (isCorrect ? 1 : 0);
          }, 0);
        }

        data.score = serverScore;
        data.totalScore = serverTotal;
        console.log(`✅ Score serverda hisoblandi: ${serverScore}/${serverTotal} (klientdan: ${req.body.score}/${req.body.totalScore})`);
      }
    }

    // ✅ KRITIK FIX: Natijani BIRINCHI tez saqlaymiz, AI feedbackni background'da ishlaymiz.
    // Bu "qotib qolish" va "Failed" muammolarini hal qiladi.

    // Upsert: agar bir xil id bilan ikki marta so'rov kelsa (foydalanuvchi qayta bosganida),
    // MongoServerError: duplicate key o'rniga — shunchaki yangilaydi. Bu "Failed" xatosini to'xtatadi.
    const defaultFeedback = "Natijangiz saqlandi! AI batafsil tavsiyalarni tayyorlayapti, natijangizni yangilasangiz ko'rishingiz mumkin.";
    data.aiFeedback = defaultFeedback;

    await OnlineTestResult.findOneAndUpdate(
      { id: data.id },
      { $setOnInsert: data },
      { upsert: true, new: true }
    );

    // Foydalanuvchiga DARHOL javob qaytaramiz — AI ni kutmaymiz!
    res.status(201).json({ message: 'Result saved successfully', id: data.id, aiFeedback: defaultFeedback });

    // ── AI feedback background'da ishlaydi (fire-and-forget) ──────────────
    // Bu blok foydalanuvchiga javob berilgandan KEYIN ishlaydi.
    // Xato bo'lsa ham foydalanuvchiga ta'siri yo'q.
    aiLimit(async () => {
      try {
        const anthropicKey = process.env.VITE_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;
        const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
        const groqKey = process.env.VITE_GROQ_API_KEY || process.env.GROQ_API_KEY;

        if (!((anthropicKey || apiKey || groqKey) && test && data.questions)) return;

        const attempts = [];
        if (anthropicKey) attempts.push({ provider: 'anthropic', model: 'claude-sonnet-4-6' });
        if (apiKey) attempts.push({ provider: 'gemini', model: 'gemini-1.5-flash' });
        if (groqKey) attempts.push({ provider: 'groq', model: 'llama3-70b-8192' });

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

        let aiFeedback = null;
        for (const task of attempts) {
          try {
            console.log(`[BG AI] ${task.provider.toUpperCase()} orqali fikr olinmoqda...`);
            if (task.provider === 'anthropic') {
              const r = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: { 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
                body: JSON.stringify({ model: task.model, max_tokens: 1024, temperature: 0.7,
                  system: "Sen tajribali ustozsan. O'quvchiga dalda ber va maslahat yoz. Matn qisqa bo'lsin.",
                  messages: [{ role: 'user', content: prompt }] })
              });
              const rd = await r.json();
              if (!r.ok) throw new Error(rd.error?.message || 'Anthropic xatosi');
              aiFeedback = rd.content[0].text;
            } else if (task.provider === 'groq') {
              const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ model: task.model, temperature: 0.7,
                  messages: [{ role: 'system', content: "Sen tajribali ustozsan. Faqat matnli maslahat yoz." }, { role: 'user', content: prompt }] })
              });
              const rd = await r.json();
              if (!r.ok) throw new Error(rd.error?.message || 'Groq xatosi');
              aiFeedback = rd.choices[0].message.content;
            } else {
              const genAI = new GoogleGenerativeAI(apiKey);
              const model = genAI.getGenerativeModel({ model: task.model });
              const result = await model.generateContent(prompt);
              aiFeedback = result.response.text();
            }
            console.log(`[BG AI] Muvaffaqiyatli! ${task.provider} orqali javob olindi.`);
            break;
          } catch (modelError) {
            console.warn(`[BG AI] Model xatosi (${task.provider}):`, modelError.message);
          }
        }

        if (aiFeedback) {
          await OnlineTestResult.findOneAndUpdate({ id: data.id }, { $set: { aiFeedback } });
          console.log(`[BG AI] aiFeedback DB ga yozildi. id=${data.id}`);
        }
      } catch (bgErr) {
        console.error('[BG AI] Background AI xatosi:', bgErr.message);
      }

      // API limitlarga tushmaslik uchun 4 soniya kutamiz (Gemini 15 RPM = ~4s)
      await new Promise(resolve => setTimeout(resolve, 4000));

      // Telegram broadcast ham background'da
      import('../index.js').then(m => m.broadcastResultToTelegram?.(data)).catch(() => {});
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteTest = async (req, res) => {
  try {
    const testId = req.params.id;
    const testQuery = mongoose.Types.ObjectId.isValid(testId)
      ? { $or: [{ _id: testId }, { id: testId }], teacherId: req.teacherId }
      : { id: testId, teacherId: req.teacherId };
    // Delete the test itself IF it belongs to the teacher
    const deletedTest = await OnlineTest.findOneAndDelete(testQuery);
    if (!deletedTest) {
      return res.status(404).json({ error: 'Test not found or unauthorized' });
    }
    // Delete all results associated with this test
    const testIds = [deletedTest.id, deletedTest._id?.toString(), testId].filter(Boolean);
    await OnlineTestResult.deleteMany({ testId: { $in: testIds } });
    
    res.json({ message: 'Test and associated results deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
export const getTestResultById = async (req, res) => {
  try {
    const { id } = req.params;
    const query = mongoose.Types.ObjectId.isValid(id)
      ? { $or: [{ _id: id }, { id: id }] }
      : { id: id };
    
    let result = await OnlineTestResult.findOne(query).lean();
    if (!result) {
      const { Result } = await import('../models/index.js');
      result = await Result.findOne(query).lean();
    }
    if (!result) return res.status(404).json({ error: 'Not found' });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
export const generateAITest = async (req, res) => {
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
    } // ✅ Xato tuzatildi: bu yopuvchi qavs qolib ketgan ekan
    
    const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    const groqKey = process.env.VITE_GROQ_API_KEY || process.env.GROQ_API_KEY;
    
    if (!apiKey && !groqKey) {
      return res.status(500).json({ error: 'Nafaqat Gemini, balki Groq API kaliti ham topilmadi. Lutfan .env faylni tekshiring.' });
    }

    // Initialize genAI only if apiKey exists
    const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;
    const modelsToTry = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-1.5-flash-8b'];

        const aiSchema = {
      type: "object",
      properties: {
        questions: {
          type: "array",
          minItems: 1,
          items: {
            type: "object",
            properties: {
              questionNumber: { type: "integer" },
              questionText: { type: "string" },
              options: {
                type: "array",
                items: { type: "string" },
                minItems: 4,
                maxItems: 4
              },
              correctAnswerIndex: { type: "integer", minimum: 0, maximum: 3 }
            },
            required: ["questionNumber", "questionText", "options", "correctAnswerIndex"]
          }
        }
      },
      required: ["questions"]
    };

    function buildTestPrompt({ topic, subject, questionCount = 5, difficulty = 'aralash' }) {
      return String.raw`You are a question-bank generator for a MERN-based online testing platform.
Your ONLY output is a JSON object matching the provided schema. Do not
explain, do not think out loud, do not add commentary before or after the
JSON. Every extra sentence you generate costs latency — output the JSON and
nothing else.

TASK
Generate exactly ${questionCount} multiple-choice questions for:
  Subject: ${subject}
  Topic(s): ${topic}
  Difficulty: ${difficulty}

CRITICAL QUALITY INSTRUCTIONS (SENIOR LEVEL):
1. ZERO DUPLICATION: You MUST NOT generate similar or duplicate questions. Every single question must test a completely unique concept, feature, or scenario within the topics. Do not repeat the same question phrasing, logic, or options.
2. ZERO SYNTAX ERRORS: If generating questions about programming, HTML, CSS, Excel formulas, or technical tools, all code snippets MUST be 100% syntactically perfect. No missing brackets, no incorrect tags, no typos. Use standard conventions.
3. EXACT COUNT: You MUST generate EXACTLY ${questionCount} questions. Use the "questionNumber" field to count from 1 to ${questionCount}. Do not stop until you reach ${questionCount}.
4. EVEN DISTRIBUTION: If multiple topics are provided (separated by commas), distribute the questions evenly. Do not focus heavily on just one topic.
5. PLAUSIBLE DISTRACTORS: Wrong options (distractors) must be realistic and challenging. Do not make them obvious jokes or entirely unrelated concepts.
6. CLARITY: Questions must be formulated clearly and unambiguously in the Uzbek language.

OUTPUT DISCIPLINE (for speed — follow strictly)
- No preamble ("Here are your questions:"), no postamble, no markdown code
  fences around the JSON.
- Do not restate the instructions.
- Do not add an "explanation" field unless explicitly requested.
- Do not second-guess or revise your own answer inside the output. Generate
  once, directly, correctly.

LATEX FORMATTING (strict — remark-math compatible, zero tolerance)
1. Inline math: $expression$ — NEVER a space right after the opening $ or
   right before the closing $.
   Correct:   $x_1 + x_2 = 5$
   Incorrect: $ x_1 + x_2 = 5 $          <- will break the renderer

2. Block math: $expression$ — same rule, no inner-edge spaces.
   Correct:   $\sqrt{50} = 5\sqrt{2}$
   Incorrect: $ \sqrt{50} = 5\sqrt{2} $

3. Every $ and every $ you open MUST close within the SAME string field.
   Never split one expression across questionText and an option, and never
   leave a trailing unclosed $ or $ at the end of a field.

4. Every { you open MUST have a matching }. Double-check nested \frac{}{},
   \sqrt{}, and subscript/superscript groups before finalizing each question.

5. Never use $ for currency. If a dollar amount is needed in a word problem,
   write "so'm" or "dollar" as a word — never a $ symbol outside of math.

6. Use ONLY standard KaTeX-supported syntax: \frac, \sqrt, \sum, \int,
   \left( \right), \cdot, \times, \div, \leq, \geq, \neq, \infty, \pi,
   \sin \cos \tan, subscripts (_), superscripts (^). No custom macros, no
   \newcommand, no \text{} unless strictly necessary.

7. Do not double-escape backslashes. Write \sqrt{50}, never \\\sqrt{50}.

8. Systems of equations MUST use \begin{cases} ... \end{cases}.
   Correct: $\begin{cases} x+y=5 \\\\ x-y=1 \end{cases}$
   Incorrect: $x+y=5x-y=1$ or $x+y=5, x-y=1$

FEW-SHOT REFERENCE (follow this exact pattern)
GOOD:
  "questionNumber": 1,
  "questionText": "Tenglamani yeching: $2x + 3 = 11$"
GOOD:
  "questionNumber": 2,
  "questionText": "Integralni hisoblang: $\int_0^1 x^2\\,dx$"
BAD — never produce this:
  "questionNumber": 3,
  "questionText": "Tenglamani yeching: $ 2x + 3 = 11 $"
BAD — never produce this (unclosed brace):
  "questionNumber": 4,
  "questionText": "Soddalashtiring: $\frac{1}{2"
GOOD:
  "questionNumber": 5,
  "questionText": "Tenglamalar sistemasini yeching: $\begin{cases} x+y=5 \\\\ x-y=1 \end{cases}$"

ANSWER QUALITY RULES
- Exactly 4 options per question, only ONE mathematically and factually correct.
- Distractors (wrong options) must be plausible — typical mistakes a student would make, not random numbers or words.
- correctAnswerIndex must be a 0-based integer matching the correct option.
- Do not repeat the same numeric setup or logic across questions in this batch — vary concepts deeply even within the same topic.

Return ONLY the JSON object. Begin generation now.`;
    }

    // --- Senior Level Batching Logic (Anthropic -> Gemini -> Groq) ---
    async function generateChunkWithRetry(chunkTopic, chunkCount) {
      const prompt = buildTestPrompt({ 
        topic: chunkTopic, 
        subject, 
        questionCount: chunkCount, 
        difficulty: req.body.difficulty || 'aralash' 
      });

      let lastError = "";
      const anthropicKey = process.env.VITE_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;
      const groqKey = process.env.VITE_GROQ_API_KEY || process.env.GROQ_API_KEY;
      const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

      const anthropicModels = ['claude-sonnet-4-6'];
      const geminiModels = ['gemini-1.5-flash', 'gemini-1.5-flash-8b', 'gemini-1.5-pro'];
      const groqModels = ['llama3-70b-8192', 'llama3-8b-8192'];

      const attempts = [];
      if (anthropicKey) anthropicModels.forEach(m => attempts.push({ provider: 'anthropic', model: m }));
      if (apiKey) geminiModels.forEach(m => attempts.push({ provider: 'gemini', model: m }));
      if (groqKey) groqModels.forEach(m => attempts.push({ provider: 'groq', model: m }));

      if (attempts.length === 0) {
        return { success: false, error: "Anthropic, Gemini yoki Groq API kalitlaridan biri kiritilishi shart!" };
      }

      for (const task of attempts) {
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            console.log(`[AI Gen] ${task.provider.toUpperCase()} (${task.model}) — urinish ${attempt}/2...`);
            let rawText = "";

            if (task.provider === 'anthropic') {
              const res = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                  'x-api-key': anthropicKey,
                  'anthropic-version': '2023-06-01',
                  'content-type': 'application/json'
                },
                body: JSON.stringify({
                  model: task.model,
                  max_tokens: 4096,
                  temperature: 0.5,
                  system: "RETURN ONLY A VALID JSON OBJECT MATCHING THE REQUESTED SCHEMA. NO MARKDOWN, NO EXPLANATIONS.\n\n" + prompt + "\n\nJSON Schema:\n" + JSON.stringify(aiSchema),
                  messages: [
                    { role: "user", content: "Generate the questions now. Output strictly raw JSON, nothing else." }
                  ]
                })
              });
              const data = await res.json();
              if (!res.ok) throw new Error(data.error?.message || "Anthropic xatosi");
              rawText = data.content[0].text;
            } else if (task.provider === 'groq') {
              const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${groqKey}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  model: task.model,
                  messages: [
                    { role: "system", content: prompt + "\n\nJSON Schema:\n" + JSON.stringify(aiSchema) },
                    { role: "user", content: "Generate questions." }
                  ],
                  temperature: 0.5,
                  response_format: { type: "json_object" }
                })
              });
              const data = await res.json();
              if (!res.ok) throw new Error(data.error?.message || "Groq xatosi");
              const content = data.choices[0].message.content;
              const jsonParsed = JSON.parse(content);
              if (Array.isArray(jsonParsed)) rawText = content;
              else if (jsonParsed.questions) rawText = JSON.stringify(jsonParsed.questions);
              else rawText = content;
            } else {
              const model = genAI.getGenerativeModel({
                model: task.model,
                generationConfig: { responseMimeType: 'application/json', temperature: 0.5 }
              });
              const result = await model.generateContent(prompt);
              rawText = result.response.text();
            }

            const raw = rawText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
            const safeRaw = raw.replace(/(?<!\\)\\([^nrtb"\\])/g, '\\\\$1');
            
            let parsedObj = JSON.parse(safeRaw);
            let questions = [];
            if (Array.isArray(parsedObj)) {
              questions = parsedObj;
            } else if (parsedObj.questions && Array.isArray(parsedObj.questions)) {
              questions = parsedObj.questions;
            } else {
              questions = [parsedObj];
            }
            
            questions = questions.map(q => {
              if (q.correctAnswerIndex !== undefined && Array.isArray(q.options)) {
                q.correctOption = q.options[q.correctAnswerIndex];
              }
              return q;
            });

            if (questions.length === 0) {
              lastError = "AI bo'sh ro'yxat qaytardi";
              continue;
            }
            
            const batchResult = processQuestionBatch(questions, { 
              minAcceptable: Math.min(2, Math.floor(chunkCount * 0.5)), 
              targetCount: chunkCount 
            });
            
            if (batchResult.shouldFallbackToNextProvider) {
              lastError = "Savollar sifatsiz yoki juda ko'p qismi validatsiyadan o'ta olmadi";
              continue;
            }
            
            return { success: true, data: batchResult.questions };
          } catch (err) {
            lastError = err.message;
          }
        }
      }
      return { success: false, error: lastError };
    }

    let rawQuestions = [];
    const targetTotal = questionCount || 10;
    const topicsArray = topic.split(',').map(t => t.trim()).filter(Boolean);
    
    // Exact distribution calculation
    let neededPerTopic = {};
    topicsArray.forEach(t => neededPerTopic[t] = 0);
    for (let i = 0; i < targetTotal; i++) {
      neededPerTopic[topicsArray[i % topicsArray.length]]++;
    }
    
    // Generate questions for each topic until its quota is met
    for (const currentTopic of topicsArray) {
      let needed = neededPerTopic[currentTopic];
      let failsafe = 0;
      
      while (needed > 0 && failsafe < 5) {
        const chunkCount = Math.min(needed, 10);
        const aiResult = await generateChunkWithRetry(currentTopic, chunkCount);
        
        if (aiResult.success && aiResult.data && aiResult.data.length > 0) {
          rawQuestions = rawQuestions.concat(aiResult.data);
          needed -= aiResult.data.length; // decrement by successfully generated amount
        } else {
          failsafe++; // prevent infinite loops if AI completely fails
          if (failsafe >= 5 && rawQuestions.length === 0) {
             return res.status(500).json({ error: `AI xatosi: ${aiResult.error}` });
          }
        }
      }
    }
    
    // Trim to exactly targetTotal just in case of slight over-generation
    rawQuestions = rawQuestions.slice(0, targetTotal);

    // Removed sanitizeQuestions. The robust generation handles quality now.
    // Shuffle options to ensure the correct answer is randomly distributed among options (A, B, C, D)
    const sanitizedQuestions = rawQuestions.map(q => {
      if (Array.isArray(q.options) && q.correctOption !== undefined) {
        const shuffled = [...q.options];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        q.options = shuffled;
        // ✅ FIX: correctOption matn sifatida saqlanadi (to'g'ri),
        // lekin correctAnswerIndex ham yangilanishi kerak — izchillik uchun
        q.correctAnswerIndex = shuffled.findIndex(opt => opt === q.correctOption);
      }
      return q;
    });

    // Increment daily AI count for teacher
    teacher.lastAiGenDate = todayStr;
    teacher.dailyAiCount = dailyCount + 1;
    await teacher.save();

    res.json({ questions: sanitizedQuestions });
  } catch (error) {
    console.error('AI Gen Error:', error);
    res.status(500).json({ error: error.message });
  }
};
export const classAnalysis = async (req, res) => {
  try {
    const { id } = req.params;
    const testQuery = mongoose.Types.ObjectId.isValid(id)
      ? { $or: [{ _id: id }, { id: id }] }
      : { id: id };
    const test = await OnlineTest.findOne(testQuery);
    if (!test) return res.status(404).json({ error: 'Test topilmadi' });
    
    const teacher = await Teacher.findById(req.teacherId);
    if (!teacher || teacher.plan === 'free') {
      return res.status(403).json({ error: 'AI Sinf Tahlili faqat Standard yoki Premium tariflarda mavjud. Iltimos tarifni oshiring.' });
    }

    const testIds = [test.id, test._id?.toString(), id].filter(Boolean);
    const results = await OnlineTestResult.find({ testId: { $in: testIds } });
    if (results.length === 0) {
      return res.status(400).json({ error: 'Tahlil qilish uchun yetarlicha natijalar yo\'q' });
    }

    const totalStudents = results.length;
    const maxScore = results[0]?.totalScore || test.questions?.length || 0;
    const averageScore = results.reduce((acc, curr) => acc + (curr.score || 0), 0) / totalStudents;
    const formattedResults = results.map(r => `${r.studentName}: ${r.score}/${r.totalScore || maxScore}`).join(', ');

    const prompt = `Siz tajribali metodist-o'qituvchi va ta'lim ekspertisiz (Senior Level). "${test.title || 'Test'}" mavzusida o'quvchilar test ishlashdi.
Testda jami ${totalStudents} ta o'quvchi qatnashdi.
O'rtacha ball: ${averageScore.toFixed(1)} / ${maxScore}.
O'quvchilarning natijalari: ${formattedResults}.

Vazifangiz: Sinfning umumiy o'zlashtirish darajasini chuqur kognitiv-pedagogik tahlil qilish.
1. O'zlashtirishi past o'quvchilar va umumiy tendensiyalardagi kamchiliklarni ochib bering.
2. O'qituvchiga keyingi darslar uchun amaliy, aniq, zamonaviy va SENIOR LEVEL darajasidagi metodik tavsiyalar bering (ilg'or pedagogik texnologiyalar, differensial yondashuv va aniq qadamlar).
Javobingiz mukammal, professional, xulosali va juda yuqori saviyada bo'lishi shart.

Javobni FAQAT quyidagi JSON formatida qaytaring (boshqa hech qanday so'z yoki markdown qo'shmang):
{
  "recommendation": "Sinfning mukammal pedagogik tahlili va yuqori darajadagi metodik tavsiyalar matni (kamida 3-4 ta xat boshidan iborat bo'lsin)..."
}`;

    const anthropicKey = process.env.VITE_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;
    const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    const groqKey = process.env.VITE_GROQ_API_KEY || process.env.GROQ_API_KEY;

    if (!anthropicKey && !apiKey && !groqKey) {
      return res.status(500).json({ error: 'Hech qanday AI API kaliti (Anthropic, Gemini, Groq) topilmadi' });
    }

    const { GoogleGenerativeAI } = await import("@google/generative-ai");

    const attempts = [];
    if (anthropicKey) attempts.push({ provider: 'anthropic', model: 'claude-sonnet-4-6' });
    if (apiKey) attempts.push({ provider: 'gemini', model: 'gemini-1.5-flash' });
    if (groqKey) attempts.push({ provider: 'groq', model: 'llama3-70b-8192' });

    let text = "";
    let aiSuccess = false;

    for (const task of attempts) {
      try {
        console.log(`[Class Analysis] ${task.provider.toUpperCase()} orqali tahlil qilinmoqda...`);
        if (task.provider === 'anthropic') {
          const res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'x-api-key': anthropicKey,
              'anthropic-version': '2023-06-01',
              'content-type': 'application/json'
            },
            body: JSON.stringify({
              model: task.model,
              max_tokens: 4096,
              temperature: 0.2,
              system: "RETURN ONLY A VALID JSON OBJECT MATCHING THE REQUESTED FORMAT. NO MARKDOWN, NO EXPLANATIONS.",
              messages: [{ role: "user", content: prompt }]
            })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error?.message || "Anthropic xatosi");
          text = data.content[0].text;
        } else if (task.provider === 'groq') {
          const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${groqKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: task.model,
              messages: [
                { role: "system", content: "RETURN ONLY A VALID JSON OBJECT." },
                { role: "user", content: prompt }
              ],
              temperature: 0.2,
              response_format: { type: "json_object" }
            })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error?.message || "Groq xatosi");
          text = data.choices[0].message.content;
        } else {
          const genAI = new GoogleGenerativeAI(apiKey);
          const model = genAI.getGenerativeModel({ 
            model: task.model,
            generationConfig: { responseMimeType: "application/json", temperature: 0.2 }
          });
          const aiRes = await model.generateContent(prompt);
          text = aiRes.response.text();
        }

        if (text && text.trim().length > 10) {
          aiSuccess = true;
          break; // Muvaffaqiyatli bo'lsa, loopni to'xtatamiz
        }
      } catch (err) {
        console.warn(`  ✗ [Class Analysis] ${task.provider} xatosi:`, err.message);
      }
    }

    if (!aiSuccess) {
      return res.status(500).json({ error: 'Barcha AI taʼminotchilari (Anthropic, Gemini, Groq) javob berishdan bosh tortdi.' });
    }
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();

    // ✅ 12. JSON.parse try/catch — AI noto'g'ri JSON qaytarsa server crash bo'lmaydi
    let data;
    try {
      data = JSON.parse(text);
    } catch (parseErr) {
      console.error('AI JSON parse xatosi:', parseErr.message, '\nAI javobi:', text.substring(0, 200));
      return res.status(500).json({ error: 'AI javobini tahlil qilishda xatolik. Qayta urinib ko\'ring.' });
    }
    
    res.json(data);
  } catch (err) {
    console.error('AI Analysis Error:', err);
    res.status(500).json({ error: 'AI bilan bog\'lanishda xatolik: ' + err.message });
  }
};