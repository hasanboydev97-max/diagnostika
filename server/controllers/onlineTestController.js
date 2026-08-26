import mongoose from 'mongoose';
import fs from 'fs';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { OnlineTest, OnlineTestResult, Teacher } from '../models/index.js';
import { buildDocxBuffer, sanitizePdfText } from '../utils/exportUtils.js';
import PDFDocument from 'pdfkit';
import { isAnswerCorrect, computeScore } from '../utils/scoring.js';
import { processQuestionBatch } from '../utils/mathSanitizer.js';

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
        const { score: serverScore, totalScore: serverTotal } = computeScore(test.questions, data.answers);
        data.score = serverScore;
        data.totalScore = serverTotal;
        console.log(`✅ Score serverda hisoblandi: ${serverScore}/${serverTotal} (klientdan: ${req.body.score}/${req.body.totalScore})`);
      }
    }

    // Attempt AI Generation safely
    let aiFeedback = "Ajoyib natija! AI tizimi hozirda band bo'lgani sababli batafsil xulosa berolmadi, ammo yechimlaringiz muvaffaqiyatli saqlandi.";
    try {
      const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
      if (apiKey && test && data.questions) {
        const genAI = new GoogleGenerativeAI(apiKey);
        const modelsToTry = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-1.5-flash-8b'];
        
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
            const result = await model.generateContent("Start generation.");
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
    
    // Broadcast to Telegram subscribers
    import('../index.js').then(m => m.broadcastResultToTelegram?.(data)).catch(() => {});

    res.status(201).json({ message: 'Result saved successfully', id: data.id, aiFeedback });
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
              questionText: { type: "string" },
              options: {
                type: "array",
                items: { type: "string" },
                minItems: 4,
                maxItems: 4
              },
              correctAnswerIndex: { type: "integer", minimum: 0, maximum: 3 }
            },
            required: ["questionText", "options", "correctAnswerIndex"]
          }
        }
      },
      required: ["questions"]
    };

    function buildTestPrompt({ topic, subject, questionCount = 5, difficulty = 'aralash' }) {
      return `You are a question-bank generator for a MERN-based online testing platform.
Your ONLY output is a JSON object matching the provided schema. Do not
explain, do not think out loud, do not add commentary before or after the
JSON. Every extra sentence you generate costs latency — output the JSON and
nothing else.

TASK
Generate exactly ${questionCount} multiple-choice questions for:
  Subject: ${subject}
  Topic: ${topic}
  Difficulty: ${difficulty}

OUTPUT DISCIPLINE (for speed — follow strictly)
- No preamble ("Here are your questions:"), no postamble, no markdown code
  fences around the JSON.
- Do not restate the instructions.
- Do not add an "explanation" field unless explicitly requested — it roughly
  doubles output length for no benefit in a timed test context.
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

4. Every { you open MUST have a matching }. Double-check nested \\frac{}{},
   \\sqrt{}, and subscript/superscript groups before finalizing each question.

5. Never use $ for currency. If a dollar amount is needed in a word problem,
   write "so'm" or "dollar" as a word — never a $ symbol outside of math.

6. Use ONLY standard KaTeX-supported syntax: \\frac, \\sqrt, \\sum, \\int,
   \\left( \\right), \\cdot, \\times, \\div, \\leq, \\geq, \\neq, \\infty, \\pi,
   \\sin \\cos \\tan, subscripts (_), superscripts (^). No custom macros, no
   \\newcommand, no \\text{} unless strictly necessary.

7. Do not double-escape backslashes. Write \\sqrt{50}, never \\\\sqrt{50}.

FEW-SHOT REFERENCE (follow this exact pattern)
GOOD:
  "questionText": "Tenglamani yeching: $2x + 3 = 11$"
GOOD:
  "questionText": "Integralni hisoblang: $\\int_0^1 x^2\\,dx$"
BAD — never produce this:
  "questionText": "Tenglamani yeching: $ 2x + 3 = 11 $"
BAD — never produce this (unclosed brace):
  "questionText": "Soddalashtiring: $\\frac{1}{2"

ANSWER QUALITY RULES
- Exactly 4 options per question, only ONE mathematically correct.
- Distractors (wrong options) must be plausible — typical calculation
  mistakes a student would make, not random numbers.
- correctAnswerIndex must be a 0-based integer matching the correct option.
- Do not repeat the same numeric setup across questions in this batch —
  vary coefficients/values even within the same topic.

Return ONLY the JSON object. Begin generation now.`;
    }

    const prompt = buildTestPrompt({ topic, subject, questionCount: questionCount || 10, difficulty: req.body.difficulty || 'aralash' });

    // ─── generateWithRetry: Groq (Llama-3) + Gemini Fallback ───
    async function generateWithRetry() {
      let lastError = "";
      const groqKey = process.env.VITE_GROQ_API_KEY || process.env.GROQ_API_KEY;
      const geminiModels = ['gemini-3.6-flash', 'gemini-3.5-flash-lite', 'gemini-2.5-flash', 'gemini-flash-latest'];
      const groqModels = ['qwen/qwen3.8-27b', 'groq/compound', 'openai/gpt-oss-120b'];

      // Qaysi API orqali chaqirishni belgilaymiz
      const attempts = [];
      if (groqKey) groqModels.forEach(m => attempts.push({ provider: 'groq', model: m }));
      if (apiKey) geminiModels.forEach(m => attempts.push({ provider: 'gemini', model: m }));

      if (attempts.length === 0) {
        return { success: false, error: "Nafaqat Gemini, balki Groq API kaliti ham kiritilmagan!" };
      }

      for (const task of attempts) {
        for (let attempt = 1; attempt <= 2; attempt++) { // har biriga 2 martadan urinish
          try {
            console.log(`[AI Gen] ${task.provider.toUpperCase()} (${task.model}) — urinish ${attempt}/2...`);
            let rawText = "";

            if (task.provider === 'groq') {
              // 🚀 Groq API orqali
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
                  temperature: 0.2,
                  response_format: { type: "json_object" }
                })
              });
              const data = await res.json();
              if (!res.ok) throw new Error(data.error?.message || "Groq xatosi");
              // Agar obyekt qaytsa, ichidan massivni qidiramiz
              const content = data.choices[0].message.content;
              const jsonParsed = JSON.parse(content);
              // Groq ba'zan { questions: [...] } shaklida qaytaradi
              if (Array.isArray(jsonParsed)) rawText = content;
              else if (jsonParsed.questions) rawText = JSON.stringify(jsonParsed.questions);
              else rawText = content;

            } else {
              // 🌐 Gemini API orqali
              const model = genAI.getGenerativeModel({
                model: task.model,
                generationConfig: { responseMimeType: 'application/json', temperature: 0.2 }
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
            
            // Map correctAnswerIndex to correctOption
            questions = questions.map(q => {
              if (q.correctAnswerIndex !== undefined && Array.isArray(q.options)) {
                q.correctOption = q.options[q.correctAnswerIndex];
              }
              return q;
            });

            if (questions.length === 0) {
              console.warn(`  ⚠️ Bo'sh ro'yxat...`);
              lastError = "AI bo'sh ro'yxat qaytardi";
              continue;
            }
            
            const batchResult = processQuestionBatch(questions, { 
              minAcceptable: Math.min(10, Math.floor((questionCount || 30) * 0.5)), 
              targetCount: questionCount || 30 
            });
            
            if (batchResult.shouldFallbackToNextProvider) {
              console.warn(`  ⚠️ Yaroqsiz savollar ko'p. Qolgan: ${batchResult.stats.valid}/${batchResult.stats.received}`);
              lastError = "Savollar sifatsiz yoki juda ko'p qismi validatsiyadan o'ta olmadi";
              continue;
            }
            
            console.log(`  ✅ ${task.provider} (${task.model}) muvaffaqiyatli: ${batchResult.stats.valid} ta savol (Tuzatildi: ${batchResult.stats.repaired}, O'chirildi: ${batchResult.stats.dropped}).`);
            return { success: true, data: batchResult.questions };
          } catch (err) {
            console.warn(`  ✗ ${task.provider} (${task.model}) xatosi: ${err.message}`);
            lastError = err.message;
          }
        }
      }
      return { success: false, error: lastError };
    }

    const aiResult = await generateWithRetry();

    if (!aiResult.success) {
      return res.status(500).json({ error: `AI xatosi: ${aiResult.error}` });
    }
    
    const rawQuestions = aiResult.data;

    // Removed sanitizeQuestions. The robust generation handles quality now.
    // Shuffle options to ensure the correct answer is randomly distributed among options (A, B, C, D)
    const sanitizedQuestions = rawQuestions.map(q => {
      if (Array.isArray(q.options)) {
        const shuffled = [...q.options];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        q.options = shuffled;
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

    const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'Gemini API key is missing' });
    
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: "application/json"
      }
    });

    // ✅ 11. DRY: isAnswerCorrect artiq bu yerda takrorlanmaydi — server/utils/scoring.js dan import qilingan

    // Calculate stats per question
    const stats = test.questions.map((q, i) => {
      let correct = 0;
      results.forEach(r => {
        if (!r.questions) return;
        const shuffledIndex = r.questions.findIndex(rq => rq.questionText === q.questionText);
        if (shuffledIndex !== -1) {
          const studentAns = (r.answers || {})[shuffledIndex];
          const rq = r.questions[shuffledIndex];
          if (isAnswerCorrect(studentAns, rq.correctOption, rq.options || [])) {
            correct++;
          }
        }
      });
      const perc = Math.round((correct / results.length) * 100);
      return {
        questionText: q.questionText,
        correctOption: q.correctOption,
        percentage: perc,
        errorPercentage: 100 - perc
      };
    });

    const weakStudentsList = results
      .filter(r => (r.score / (r.totalScore || test.questions.length)) < 0.7)
      .map(r => r.studentName)
      .join(', ');

    const prompt = `Siz maktab o'qituvchilari uchun yordamchi sun'iy intellektsiz.
Quyida "${test.title}" (${test.subject}) testi bo'yicha o'quvchilarning natijalari berilgan. Jami ${results.length} ta o'quvchi ishtirok etgan.

Savollar va o'zlashtirish foizlari:
${stats.map((s, i) => `${i+1}. ${s.questionText.substring(0, 50)}... - Xato qilish ko'rsatkichi: ${s.errorPercentage}%`).join('\n')}

Zaif natija ko'rsatgan o'quvchilar: ${weakStudentsList || "Yo'q"}

Iltimos, quyidagi JSON formatida qat'iy javob qaytaring (Boshqa matn yozmang!):
{
  "weakTopics": [
    { "topic": "Mavzu nomi (masalan: Diskriminant formulasi)", "errorPercentage": 68 }
  ],
  "recommendation": "O'qituvchiga qisqa, aniq maslahat (1 gap)",
  "studentPlans": [
    { "studentName": "Ism", "plan": "O'quvchiga atalgan 1 ta shaxsiy maslahat gap" }
  ],
  "generatedQuestions": [
    {
      "questionText": "Yangi savol matni (faqat zaif mavzularga oid bo'lishi shart)",
      "options": ["A variant", "B variant", "C variant", "D variant"],
      "correctOption": "A variant",
      "subtopic": "qaysi zaif mavzuga tegishliligi"
    }
  ],
  "studentGuide": "Markdown formatidagi batafsil umumiy o'quv qo'llanma matni..."
}
Qoidalar:
1. "weakTopics" ichida eng yuqori "Xato qilish ko'rsatkichi"ga ega bo'lgan 2-3 ta mavzuni foizi bilan yozing.
2. "studentPlans" ro'yxatida faqatgina yuqorida nomi keltirilgan zaif o'quvchilarga (agar mavjud bo'lsa) nima qilishlari kerakligini aniq ko'rsating.
3. "generatedQuestions" ichida aynan xato qilingan zaif mavzular bo'yicha jami 5 ta yepyangi savol bo'lsin.
4. "studentGuide" ichida ushbu testdagi eng muhim mavzular, o'quvchilar eng ko'p xato qilgan joylar tahlili, qisqacha nazariy tushuntirishlar va o'rganish bo'yicha amaliy maslahatlarni qamrab oluvchi Mukammal (Senior level) kengaytirilgan qo'llanmani Markdown formatida yozing. Kamida 300 so'zdan iborat bo'lsin.
`;

    const aiRes = await model.generateContent(prompt);
    let text = aiRes.response.text();
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