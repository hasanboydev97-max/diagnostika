import mongoose from 'mongoose';
import fs from 'fs';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { OnlineTest, OnlineTestResult, Teacher } from '../models/index.js';
import { buildDocxBuffer, sanitizePdfText } from '../utils/exportUtils.js';
import PDFDocument from 'pdfkit';
import { isAnswerCorrect, computeScore } from '../utils/scoring.js';
import { processQuestionBatch } from '../utils/mathSanitizer.js';
import pLimit from 'p-limit';
import xlsx from 'xlsx';
import { executeResilientQuestionGen, executeResilientVisionOCR, executeResilientTextGen } from '../services/aiOrchestrator.js';

// ✅ DRY FIX: Modul darajasida bir marta ta'riflanib, barcha funksiyalarda qayta ishlatiladi
const stripHtml = (text) => {
  if (!text) return '';
  return String(text)
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ')
    .trim().toLowerCase();
};

const testGenerationQueue = pLimit(10); // 50-100 foydalanuvchi uchun test yaratish navbati
const backgroundFeedbackQueue = pLimit(5); // O'quvchilar natijasi fonida AI tahlili uchun navbat

// ✅ 20-Year Senior Architecture: Thundering Herd (Cache Stampede) himoyasi
// 30 ta bola bir vaqtda kirganda DB ga faqat 1 ta so'rov boradi, qolgan 29 tasi xotiradan (Promise) kutadi
const testCache = new Map();
const teacherCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 daqiqa

const getCachedTest = (id) => {
  const now = Date.now();
  if (testCache.has(id)) {
    const cached = testCache.get(id);
    if (now - cached.timestamp < CACHE_TTL) return cached.promise;
  }
  
  const query = mongoose.Types.ObjectId.isValid(id)
    ? { $or: [{ _id: id }, { id: id }] }
    : { id: id };
    
  const promise = OnlineTest.findOne(query).lean().then(doc => {
    if (!doc) testCache.delete(id);
    return doc;
  }).catch(err => {
    testCache.delete(id);
    throw err;
  });
  
  testCache.set(id, { promise, timestamp: now });
  return promise;
};

const getCachedTeacher = (id) => {
  const now = Date.now();
  if (teacherCache.has(id)) {
    const cached = teacherCache.get(id);
    if (now - cached.timestamp < CACHE_TTL) return cached.promise;
  }
  const promise = Teacher.findById(id).lean().then(doc => {
    if (!doc) teacherCache.delete(id);
    return doc;
  }).catch(err => {
    teacherCache.delete(id);
    throw err;
  });
  teacherCache.set(id, { promise, timestamp: now });
  return promise;
};


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
    // ✅ Kesh orqali o'qiymiz, MongoDB ga bosim nolga tushadi
    const test = await getCachedTest(id);
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

    // True Excel file generation via xlsx
    const excelData = results.map((r, index) => {
      const percent = Math.round((r.score / (r.totalScore || 1)) * 100);
      return {
        "T/r": index + 1,
        "O'quvchi ism-familiyasi": r.studentName || 'Noma\'lum',
        "To'g'ri javoblar": r.score || 0,
        "Jami savollar": r.totalScore || 0,
        "O'zlashtirish (%)": `${percent}%`,
        "Topshirilgan sana": r.createdAt ? new Date(r.createdAt).toLocaleString('uz-UZ') : ''
      };
    });

    const worksheet = xlsx.utils.json_to_sheet(excelData);
    
    // Ustunlar kengligini chiroyli qilish (Senior level touch)
    worksheet['!cols'] = [
      { wch: 5 },  // T/r
      { wch: 30 }, // Ism
      { wch: 15 }, // To'g'ri
      { wch: 15 }, // Jami
      { wch: 15 }, // Foiz
      { wch: 20 }  // Sana
    ];

    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "Natijalar");

    const excelBuffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(test.title || 'Test')}_Natijalar.xlsx"`);
    res.send(excelBuffer);
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
    console.error('[createTest ERROR]', error.message, error.stack);
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
    const test = await getCachedTest(data.testId);
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
        const creator = await getCachedTeacher(test.teacherId);
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

      // ✅ KRITIK: Score serverda qayta hisoblanadi — klientdan kelgan qiymatga ishonilmaydi
      // Hacker score=100 yuborsa ham, DB ga to'g'ri hisoblangan qiymat yoziladi
      if (test.questions && Array.isArray(test.questions) && data.answers) {
        let serverScore = 0;
        let serverTotal = test.questions.length;

        if (data.questions && Array.isArray(data.questions)) {
          // Frontend questions are shuffled. Match by questionText to find the original question securely.
          // correctAnswerText — frontend shuffle qilingan options dan olingan to'g'ri matn.
          // Agar mavjud bo'lsa — eng ishonchli yo'l (harf indeksiga bog'liq emas).
          const answeredIds = new Set();

          // ✅ SENIOR LEVEL FIX: Ball hisoblashni to'liq isAnswerCorrect (DRY) yordamchisiga yukladik.
          // ✅ EVENT LOOP OPTIMIZATION (O(N^2) -> O(N)): 
          // Pre-calculate stripped texts and use Map for O(1) lookups to completely prevent Event Loop blocking during high concurrency
          const questionMap = new Map();
          test.questions.forEach(tq => {
            const stripped = stripHtml(tq.questionText || '');
            if (!questionMap.has(stripped)) {
              questionMap.set(stripped, []);
            }
            questionMap.get(stripped).push(tq);
          });

          serverScore = data.questions.reduce((acc, q, i) => {
            const qStripped = stripHtml(q.questionText || '');
            const availableList = questionMap.get(qStripped);

            if (availableList && availableList.length > 0) {
              const originalQ = availableList.shift(); // Olib tashlash - bu ishlatilganligini bildiradi

              const userAns = data.answers[i];
              if (isAnswerCorrect(userAns, originalQ.correctOption, originalQ.options || [])) {
                return acc + 1;
              }
            }
            return acc;
          }, 0);
        } else {
          // Fallback: data.questions yo'q (eski format yuborilganda)
          serverScore = test.questions.reduce((acc, q, i) => {
            const userAns = data.answers[i];
            if (isAnswerCorrect(userAns, q.correctOption, q.options || [])) {
              return acc + 1;
            }
            return acc;
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
    backgroundFeedbackQueue(async () => {
      try {
        const anthropicKey = process.env.VITE_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;
        const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
        const groqKey = process.env.VITE_GROQ_API_KEY || process.env.GROQ_API_KEY;

        if (!((anthropicKey || apiKey || groqKey) && test && data.questions)) return;

        const attempts = [];
        // [OPTIMIZATSIYA]: O'quvchilarga avtomat yoziladigan fikrlar (feedback) uchun qimmat Claude o'chirib qo'yildi.
        // O'rniga eng arzon/tekin Gemini Flash va Groq ishlatiladi. Bu xarajatni 90% ga tejaydi.
        if (apiKey) attempts.push({ provider: 'gemini', model: 'gemini-1.5-flash' });
        if (groqKey) attempts.push({ provider: 'groq', model: 'llama-3.3-70b-versatile' });
        if (attempts.length === 0) return; // Agar Gemini/Groq bo'lmasa, pul ketkazmaslik uchun jim to'xtaydi.

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

export const deleteTestResult = async (req, res) => {
  try {
    const { id } = req.params;
    const query = mongoose.Types.ObjectId.isValid(id)
      ? { $or: [{ _id: id }, { id: id }] }
      : { id: id };
      
    let result = await OnlineTestResult.findOne(query);
    let ModelToUse = OnlineTestResult;
    
    if (!result) {
      const { Result } = await import('../models/index.js');
      result = await Result.findOne(query);
      ModelToUse = Result;
    }
    
    if (!result) return res.status(404).json({ error: 'Natija topilmadi' });
    
    // O'qituvchining aynan shu testga egasi ekanligini tasdiqlash
    const testQuery = mongoose.Types.ObjectId.isValid(result.testId)
      ? { $or: [{ _id: result.testId }, { id: result.testId }], teacherId: req.teacherId }
      : { id: result.testId, teacherId: req.teacherId };
      
    const test = await OnlineTest.findOne(testQuery);
    if (!test) {
       return res.status(403).json({ error: 'Ushbu natijani o\'chirish huquqiga ega emassiz' });
    }
    
    await ModelToUse.findOneAndDelete(query);
    res.json({ message: 'Natija o\'chirildi' });
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
    const { topic, questionCount, subject, grade, difficulty } = req.body;

    if (!topic || !subject) {
      return res.status(400).json({ error: 'Mavzu (topic) va fan (subject) talab qilinadi.' });
    }

    // --- Limit TEKSHIRUVI (o'qish, o'zgartirish emas) ---
    const todayStr = new Date().toISOString().split('T')[0];
    const teacherCheck = await Teacher.findById(req.teacherId).select('plan dailyAiCount lastAiGenDate');
    if (!teacherCheck) return res.status(404).json({ error: 'O\'qituvchi topilmadi' });

    const maxAllowed = teacherCheck.plan === 'premium' ? 999999 : (teacherCheck.plan === 'standard' ? 25 : 3);
    
    // Bugun uchun necha marta ishlatilgan?
    const todayCount = teacherCheck.lastAiGenDate === todayStr ? (teacherCheck.dailyAiCount || 0) : 0;
    
    if (todayCount >= maxAllowed) {
      const limitDisplay = maxAllowed === 999999 ? 'cheklanmagan' : `${maxAllowed} ta`;
      return res.status(403).json({
        error: `Sizning ${teacherCheck.plan.toUpperCase()} tarifingiz bo'yicha kunlik AI test yaratish limiti (${limitDisplay}) to'lgan. Davom etish uchun tarifni oshiring.`
      });
    }
    // MUHIM: Counter bu yerda OSHIRILMAYDI. 
    // Faqat AI muvaffaqiyatli javob bergandan keyin oshiriladi (pastda).
    const teacher = teacherCheck;

    
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

    function buildTestPrompt({ topic, subject, questionCount = 5, difficulty = 'aralash', grade = 'aralash', existingQuestions = [] }) {
      const existingText = existingQuestions.length > 0 
        ? `\n\nCRITICAL RULE: DO NOT REPEAT THE FOLLOWING CONCEPTS. These questions have ALREADY been generated. You MUST create entirely NEW questions testing DIFFERENT concepts/angles:\n` + existingQuestions.map((q, i) => `${i+1}. ${q.questionText || q}`).join('\n')
        : '';

      return String.raw`You are an expert question-bank generator and Senior Educator for a MERN-based online testing platform.
Your ONLY output is a JSON object matching the provided schema. Do not
explain, do not think out loud, do not add commentary before or after the
JSON. Every extra sentence you generate costs latency — output the JSON and
nothing else.

TASK
Generate exactly ${questionCount} multiple-choice questions for:
  Subject: ${subject}
  Topic(s): ${topic}
  Target Grade/Class: ${grade} (Adapt vocabulary, logic, and complexity specifically for this age group)
  Difficulty: ${difficulty} (Ensure the cognitive load perfectly matches this level)${existingText}

CRITICAL PEDAGOGICAL INSTRUCTIONS (SENIOR Level):
- GRADE ADAPTATION: If a specific grade (e.g. '5-sinf') is provided, ensure the concepts and formulas strictly follow that age's curriculum. Do not use high-school level concepts for primary/middle schoolers.
- DIFFICULTY ADAPTATION: If difficulty is "Oson", test basic facts/direct applications. If "O'rtacha", test multi-step understanding. If "Qiyin" or "Olimpiada", test complex synthesis, logic, and edge cases.
1. ZERO DUPLICATION: You MUST NOT generate similar or duplicate questions. Every single question must test a completely unique concept, feature, or scenario within the topics. Do not repeat the same question phrasing, logic, or options.
2. ZERO SYNTAX ERRORS: If generating questions about programming, HTML, CSS, Excel formulas, or technical tools, all code snippets MUST be 100% syntactically perfect. No missing brackets, no incorrect tags, no typos. Use standard conventions.
3. EXACT COUNT: You MUST generate EXACTLY ${questionCount} questions. Use the "questionNumber" field to count from 1 to ${questionCount}. Do not stop until you reach ${questionCount}.
4. EVEN DISTRIBUTION: If multiple topics are provided (separated by commas), distribute the questions evenly. Do not focus heavily on just one topic.
5. PLAUSIBLE DISTRACTORS: Wrong options (distractors) must be realistic and challenging. Do not make them obvious jokes or entirely unrelated concepts.
6. CLARITY: Questions must be formulated clearly and unambiguously in the Uzbek language.
7. PROGRESSIONS (PROGRESSIYA): If the topic is Arithmetic or Geometric Progressions, ALWAYS specify the type ("Arifmetik progressiya" or "Geometrik progressiya"). Wrap all sequence terms, parameters, and formulas in Math mode (e.g., $a_1$, $b_n$, $S_n$, $d$, $q$, $1, 3, 5, \dots$). Never write a1, bn, Sn as plain text. Ensure the problem has enough given values to be mathematically solvable.

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

7. ALWAYS DOUBLE-ESCAPE BACKSLASHES in your JSON. Write \\\\sqrt{50}, \\\\frac{1}{2}, \\\\begin{cases}. This is STRICTLY REQUIRED because JSON parsers will treat single backslashes (like \\t or \\f or \\r) as control characters and destroy the LaTeX syntax.

8. Systems of equations MUST use \begin{cases} ... \end{cases}.
   Correct: $\begin{cases} x+y=5 \\\\ x-y=1 \end{cases}$
   Incorrect: $x+y=5x-y=1$ or $x+y=5, x-y=1$

9. NEVER put newlines (\\n) inside math mode. Inline and block math MUST be on a single line.

FEW-SHOT REFERENCE (follow this exact pattern)
GOOD:
  "questionNumber": 1,
  "questionText": "Tenglamani yeching: $2x + 3 = 11$"
GOOD:
  "questionNumber": 2,
  "questionText": "Integralni hisoblang: $\\\\int_0^1 x^2\\\\,dx$"
BAD — never produce this:
  "questionNumber": 3,
  "questionText": "Tenglamani yeching: $ 2x + 3 = 11 $"
BAD — never produce this (unclosed brace):
  "questionNumber": 4,
  "questionText": "Soddalashtiring: $\\\\frac{1}{2"
GOOD:
  "questionNumber": 5,
  "questionText": "Tenglamalar sistemasini yeching: $\\\\begin{cases} x+y=5 \\\\\\\\ x-y=1 \\\\end{cases}$"

ANSWER QUALITY RULES
- Exactly 4 options per question, only ONE mathematically and factually correct.
- Distractors (wrong options) must be plausible — typical mistakes a student would make, not random numbers or words.
- correctAnswerIndex must be a 0-based integer matching the correct option.
- Do not repeat the same numeric setup or logic across questions in this batch — vary concepts deeply even within the same topic.

Return ONLY the JSON object. Begin generation now.`;
    }

    // --- 20-Year Senior Architecture: Multi-Agent AI Orchestrator ---
    async function generateChunkWithRetry(chunkTopic, chunkCount, existingQuestions = []) {
      const prompt = buildTestPrompt({ 
        topic: chunkTopic, 
        subject, 
        questionCount: chunkCount, 
        grade: req.body.grade || 'aralash',
        difficulty: req.body.difficulty || 'aralash',
        existingQuestions
      });

      const isPremium = teacher && teacher.plan === 'premium';
      const aiResult = await executeResilientQuestionGen({
        prompt,
        systemPrompt: "You are an elite educational assessment engineer. Generate multiple-choice questions matching the strict JSON schema provided.",
        aiSchema,
        isPremium
      });

      if (!aiResult.success) {
        return { success: false, error: aiResult.error };
      }

      // Quality validation & distractor verification pass
      const batchResult = processQuestionBatch(aiResult.questions, { 
        minAcceptable: Math.min(2, Math.floor(chunkCount * 0.5)), 
        targetCount: chunkCount 
      });

      if (batchResult.shouldFallbackToNextProvider && batchResult.questions.length === 0) {
        return { success: false, error: "Savollar sifatsiz yoki validatsiyadan o'ta olmadi" };
      }

      return { success: true, data: batchResult.questions };
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
        // [OPTIMIZATSIYA]: Katta so'rovlarda API (Prompt) narxini 2 baravar kamaytirish 
        // uchun 10 talik bo'laklash 20 taga ko'tarildi.
        const chunkCount = Math.min(needed, 20);
        const existingTexts = rawQuestions.map(q => q.questionText).filter(Boolean);
        
        // [50-100 O'QITUVCHI UCHUN]: Kengaytirilgan navbat orqali parallel so'rovlar ketadi.
        const aiResult = await testGenerationQueue(() => generateChunkWithRetry(currentTopic, chunkCount, existingTexts));
        
        if (aiResult.success && aiResult.data && aiResult.data.length > 0) {
          // ✅ KRITIK FIX: har bir savolga uning tegishli mavzusini (subtopic) belgilaymiz.
          // Bu "Mavzular Tahlili" panelining faqat "Umumiy 100%" ko'rsatish muammosini hal qiladi.
          const withSubtopic = aiResult.data.map(q => ({ ...q, subtopic: currentTopic }));
          
          // ✅ SENIOR LEVEL FIX: Jaccard Similarity asosida Paraphrase Deduplication
          // AI savolning shaklini ozgina o'zgartirib bersa ham ushlab qolinadi.
          const calculateSimilarity = (str1, str2) => {
            const getWords = s => (s || '').toLowerCase().replace(/[^\w\sа-яёўқғҳa-z]/gi, '').split(/\s+/).filter(w => w.length > 2);
            const words1 = new Set(getWords(str1));
            const words2 = new Set(getWords(str2));
            if (words1.size === 0 || words2.size === 0) return 0;
            const intersection = new Set([...words1].filter(x => words2.has(x)));
            const union = new Set([...words1, ...words2]);
            return intersection.size / union.size;
          };

          const uniqueNewQuestions = [];
          for (const q of withSubtopic) {
            const cleanText = (q.questionText || '').replace(/\s+/g, '').toLowerCase();
            
            // 1. Exact match tekshiruvi
            let isDuplicate = existingTexts.some(et => (et || '').replace(/\s+/g, '').toLowerCase() === cleanText);
            
            // 2. Semantic (Word overlap) tekshiruvi - agar 65% dan ortiq o'xshash bo'lsa duplicate!
            if (!isDuplicate) {
              isDuplicate = existingTexts.some(et => calculateSimilarity(et, q.questionText) > 0.65);
            }
            
            if (!isDuplicate) {
              uniqueNewQuestions.push(q);
              existingTexts.push(q.questionText); // Keyingi tekshiruvlar uchun qo'shib qo'yamiz
            } else {
              console.warn(`[AI Deduplication] Takroriy savol ushlandi va o'chirildi: ${q.questionText.substring(0, 50)}...`);
            }
          }

          rawQuestions = rawQuestions.concat(uniqueNewQuestions);
          needed -= uniqueNewQuestions.length; // decrement by successfully generated and UNIQUE amount
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

    // Shuffle options to ensure the correct answer is randomly distributed among options (A, B, C, D)
    const sanitizedQuestions = rawQuestions.map(q => {
      if (Array.isArray(q.options) && q.correctOption !== undefined) {
        // ✅ FIX: Immutable shuffle — q ob'ektini mutatsiya qilmasdan yangi ob'ekt qaytaramiz
        const shuffled = [...q.options];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return {
          ...q,
          options: shuffled,
          // correctOption o'zgarmaydi (matn), lekin correctAnswerIndex yangilanadi
          correctAnswerIndex: shuffled.findIndex(opt => opt === q.correctOption)
        };
      }
      return q;
    });

    // ✅ MUVAFFAQIYATLI: Faqat shu yerda (AI ishlagan taqdirda) counter oshiriladi
    // Bu arxitektura xatosini tuzatadi: oldin counter oldin oshirilib, AI yiqilsa ham limit sarf bo'lardi
    await Teacher.findOneAndUpdate(
      { _id: req.teacherId },
      teacherCheck.lastAiGenDate === todayStr
        ? { $inc: { dailyAiCount: 1 } }
        : { $set: { lastAiGenDate: todayStr, dailyAiCount: 1 } }
    );

    res.json({ questions: sanitizedQuestions });
  } catch (error) {
    console.error('AI Gen Error:', error);
    res.status(500).json({ error: error.message });
  }
};
export const generateOcrTest = async (req, res) => {
  try {
    const { rawText, imageBase64, imageMimeType, questionCount = 5 } = req.body;

    if (!rawText && !imageBase64) {
      return res.status(400).json({ error: "Matn yoki rasm kiritilishi shart." });
    }

    const teacher = await Teacher.findById(req.teacherId).select('plan');
    if (!teacher || teacher.plan !== 'premium') {
      return res.status(403).json({ error: 'Hujjat va rasmdan test yaratish faqat Premium tarifda mavjud! Tarifni oshiring.' });
    }

    const promptText = `Siz tajribali o'qituvchi va test tuzuvchisiz.
Sizga ${imageBase64 ? "rasm va " : ""}matn beriladi. Ushbu materialdan foydalanib, EXACTLY ${questionCount} ta savol va javob variantlarini ajratib oling yoki yarating.
Ushbu qoidalarga qat'iy rioya qiling:
1. Faqat JSON formatida javob bering, hech qanday qo'shimcha izohlar bo'lmasin!
2. Har bir savol uchun 4 ta variant (A, B, C, D) bo'lishi shart.
3. To'g'ri javobni 'correctAnswerIndex' da (0, 1, 2, yoki 3) ko'rsating.
4. Agar rasmda tayyor savollar bo'lsa, o'shalarni oling. Aks holda rasm va matn mazmunidan kelib chiqib yangi savollar tuzing.
5. Matematik ifodalarni $ belgilari orasida LaTeX formatida yozing.
6. JSON Schema: {"questions":[{"questionNumber":1,"questionText":"...","options":["A","B","C","D"],"correctAnswerIndex":0}]}

Material matni:
${rawText || "Matn yo'q, faqat rasmdan oling."}`;

    const ocrResult = await executeResilientVisionOCR({
      promptText,
      imageBase64,
      imageMimeType: imageMimeType || "image/jpeg"
    });

    if (!ocrResult.success || !ocrResult.questions) {
      return res.status(500).json({ error: ocrResult.error || "Rasmdan savollarni ajratib bo'lmadi" });
    }

    const questions = ocrResult.questions.map(q => {
      if (q.correctAnswerIndex !== undefined && Array.isArray(q.options)) {
        q.correctOption = q.options[q.correctAnswerIndex];
      }
      return q;
    });

    res.json({ questions });
  } catch (error) {
    console.error('OCR Gen Error:', error);
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
    const newResults = await OnlineTestResult.find({ testId: { $in: testIds } });
    
    // ✅ FIX: Eski Result modelidan ham natijalar olinadi (orqaga mosligi)
    const { Result } = await import('../models/index.js');
    const oldResults = await Result.find({ testId: { $in: testIds } }).lean();
    
    // Merge va dedup
    const merged = [...newResults.map(r => r.toObject ? r.toObject() : r), ...oldResults];
    const uniqueMap = new Map();
    merged.forEach(r => uniqueMap.set(r.id || r._id?.toString(), r));
    const results = Array.from(uniqueMap.values());
    
    if (results.length === 0) {
      return res.status(400).json({ error: 'Tahlil qilish uchun yetarlicha natijalar yo\'q' });
    }

    const totalStudents = results.length;
    // ✅ FIX: maxScore — o'rtacha hisoblash uchun to'g'riroq
    const maxScore = Math.max(...results.map(r => r.totalScore || 0), test.questions?.length || 0) || 0;
    const averageScore = results.reduce((acc, curr) => acc + (curr.score || 0), 0) / totalStudents;
    
    // ✅ FIX: 200+ o'quvchi bo'lsa prompt juda katta bo'lib AI limitga urishi mumkin.
    // Shuning uchun maksimal 150 ta o'quvchi natijalari ko'rsatiladi, qolganlari stat sifatida.
    const MAX_RESULTS_IN_PROMPT = 150;
    const resultsForPrompt = results.slice(0, MAX_RESULTS_IN_PROMPT);
    const formattedResults = resultsForPrompt.map(r => `${r.studentName}: ${r.score}/${r.totalScore || maxScore}`).join(', ');
    const truncationNote = results.length > MAX_RESULTS_IN_PROMPT
      ? `\n(Eslatma: jami ${totalStudents} ta o'quvchidan faqat birinchi ${MAX_RESULTS_IN_PROMPT} tasi ko'rsatildi)`
      : '';

    // Statistik taqsimot (past/o'rta/yuqori)
    const passingThreshold = maxScore > 0 ? maxScore * 0.6 : 0;
    const failing = results.filter(r => (r.score || 0) < passingThreshold).length;
    const passing = totalStudents - failing;
    const statsLine = `O'zlashtirish: ${passing} ta o'quvchi muvaffaqiyatli (≥60%), ${failing} ta past ko'rsatkich.`;

    const prompt = `Siz tajribali metodist-o'qituvchi va ta'lim ekspertisiz (Senior Level). "${test.title || 'Test'}" mavzusida o'quvchilar test ishlashdi.
Testda jami ${totalStudents} ta o'quvchi qatnashdi.
O'rtacha ball: ${averageScore.toFixed(1)} / ${maxScore}.
${statsLine}
O'quvchilarning natijalari: ${formattedResults}.${truncationNote}

Vazifangiz: Sinfning umumiy o'zlashtirish darajasini chuqur kognitiv-pedagogik tahlil qilish.
1. O'zlashtirishi past o'quvchilar va umumiy tendensiyalardagi kamchiliklarni ochib bering.
2. O'qituvchiga keyingi darslar uchun amaliy, aniq, zamonaviy va SENIOR LEVEL darajasidagi metodik tavsiyalar bering (ilg'or pedagogik texnologiyalar, differensial yondashuv va aniq qadamlar).
Javobingiz mukammal, professional, xulosali va juda yuqori saviyada bo'lishi shart.

Javobni FAQAT quyidagi JSON formatida qaytaring (boshqa hech qanday so'z yoki markdown qo'shmang):
{
  "recommendation": "Sinfning mukammal pedagogik tahlili va yuqori darajadagi metodik tavsiyalar matni (kamida 3-4 ta xat boshidan iborat bo'lsin)..."
}`;

    const isPremium = teacher && teacher.plan === 'premium';
    const analysisResult = await executeResilientTextGen({
      prompt,
      systemPrompt: "Siz ta'lim metodisti va pedagogik tahlil bo'yicha yuqori toifali mutaxassissiz.",
      isPremium
    });

    if (!analysisResult.success) {
      return res.status(500).json({ error: 'Barcha AI agentlari band yoki javob bera olmadi. Iltimos qayta urinib ko\'ring.' });
    }

    // ✅ FIX: analysisResult.questions[0] — bu normalizeQuestions() dan kelgan ob'ekt.
    // classAnalysis uchun recommendation maydoni to'g'ridan olinsin.
    const analysisData = analysisResult.questions?.[0] || {};
    const recommendation = analysisData.recommendation
      || analysisData.text
      || analysisData.content
      || JSON.stringify(analysisData);

    res.json({ recommendation });
  } catch (err) {
    console.error('AI Analysis Error:', err);
    res.status(500).json({ error: 'AI bilan bog\'lanishda xatolik: ' + err.message });
  }
};