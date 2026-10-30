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

    // Senior fix: Natijalar faqat aynan shu testga tegishli OnlineTestResult modelidan olinadi
    const results = await OnlineTestResult.find({ testId: { $in: testIds } })
      .sort({ createdAt: -1 })
      .lean();
    
    res.json(results);
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
    const results = await OnlineTestResult.find({ testId: { $in: testIds } })
      .sort({ createdAt: -1 })
      .lean();

    // True Excel file generation via xlsx
    const excelData = results.map((r, index) => {
      const percent = Math.round((r.score / (r.totalScore || 1)) * 100);
      const emaktabGrade = percent >= 86 ? 5 : percent >= 71 ? 4 : percent >= 55 ? 3 : 2;
      const statusLabel = percent >= 86 ? "A'lo" : percent >= 71 ? "Yaxshi" : percent >= 55 ? "Qoniqarli" : "Qoniqarsiz";

      return {
        "T/r": index + 1,
        "O'quvchi ism-familiyasi": r.studentName || 'Noma\'lum',
        "To'g'ri javoblar": r.score || 0,
        "Jami savollar": r.totalScore || 0,
        "O'zlashtirish (%)": `${percent}%`,
        "eMaktab Bahosi": emaktabGrade,
        "Daraja": statusLabel,
        "Topshirilgan sana": r.createdAt ? new Date(r.createdAt).toLocaleString('uz-UZ') : ''
      };
    });

    // eMaktab Jurnaliga to'g'ridan-to'g'ri nusxalash uchun sodda sheet
    const emaktabSimpleData = results.map((r, index) => {
      const percent = Math.round((r.score / (r.totalScore || 1)) * 100);
      const grade5 = percent >= 86 ? 5 : percent >= 71 ? 4 : percent >= 55 ? 3 : 2;
      return {
        "№": index + 1,
        "F.I.SH.": r.studentName || '',
        "Baho (5)": grade5,
        "Ball (%)": percent
      };
    });

    const worksheet = xlsx.utils.json_to_sheet(excelData);
    const emaktabWorksheet = xlsx.utils.json_to_sheet(emaktabSimpleData);
    
    // Ustunlar kengligini chiroyli qilish (Senior level touch)
    worksheet['!cols'] = [
      { wch: 6 },  // T/r
      { wch: 32 }, // Ism
      { wch: 16 }, // To'g'ri
      { wch: 14 }, // Jami
      { wch: 18 }, // Foiz
      { wch: 16 }, // eMaktab Bahosi
      { wch: 16 }, // Daraja
      { wch: 22 }  // Sana
    ];

    emaktabWorksheet['!cols'] = [
      { wch: 6 },
      { wch: 32 },
      { wch: 12 },
      { wch: 12 }
    ];

    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "Batafsil Hisobot");
    xlsx.utils.book_append_sheet(workbook, emaktabWorksheet, "eMaktab Jurnal");

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
        const apiKey = process.env.GEMINI_PAID_API_KEY || process.env.VITE_GEMINI_PAID_API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
        const groqKey = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY;

        if (!((anthropicKey || apiKey || groqKey) && test && data.questions)) {
          await OnlineTestResult.findOneAndUpdate({ id: data.id }, { $set: { aiFeedback: "AI xizmati vaqtincha o'chirilgan yoki API kalitlari ulanmagan." } });
          return;
        }

        const attempts = [];
        // [OPTIMIZATSIYA]: O'quvchilarga avtomat yoziladigan fikrlar (feedback) uchun eng arzon/pullik 2000 RPM Gemini va Groq ishlatiladi
        if (apiKey) attempts.push({ provider: 'gemini', model: 'gemini-2.5-flash' });
        if (groqKey) attempts.push({ provider: 'groq', model: 'qwen/qwen3.8-27b' });
        
        if (attempts.length === 0) {
           await OnlineTestResult.findOneAndUpdate({ id: data.id }, { $set: { aiFeedback: "AI xizmati uchun aktiv provayder topilmadi." } });
           return;
        }

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
                body: JSON.stringify({ model: task.model, temperature: 0.7, max_tokens: 500,
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
        } else {
          await OnlineTestResult.findOneAndUpdate({ id: data.id }, { $set: { aiFeedback: "AI xulosa shakllantirishda xatolik yuz berdi. Iltimos, keyinroq qayta tekshiring." } });
          console.warn(`[BG AI] aiFeedback null bo'lib qoldi, default xato matni yozildi. id=${data.id}`);
        }
      } catch (bgErr) {
        console.error('[BG AI] Background AI xatosi:', bgErr.message);
        await OnlineTestResult.findOneAndUpdate({ id: data.id }, { $set: { aiFeedback: "AI tizimida kutilmagan xatolik yuz berdi." } }).catch(() => {});
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
      
    const result = await OnlineTestResult.findOne(query);
    if (!result) return res.status(404).json({ error: 'Natija topilmadi' });
    
    // O'qituvchining aynan shu testga egasi ekanligini tasdiqlash
    const testQuery = mongoose.Types.ObjectId.isValid(result.testId)
      ? { $or: [{ _id: result.testId }, { id: result.testId }], teacherId: req.teacherId }
      : { id: result.testId, teacherId: req.teacherId };
      
    const test = await OnlineTest.findOne(testQuery);
    if (!test) {
       return res.status(403).json({ error: 'Ushbu natijani o\'chirish huquqiga ega emassiz' });
    }
    
    await OnlineTestResult.findOneAndDelete(query);
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
    
    const result = await OnlineTestResult.findOne(query).lean();
    if (!result) return res.status(404).json({ error: 'Not found' });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
export const generateAITest = async (req, res) => {
  try {
    const { 
      topic, 
      questionCount, 
      subject, 
      grade, 
      difficulty, 
      language,
      questionStyle = 'mixed',
      avoidPreviousTests = true
    } = req.body;

    if (!topic || !subject) {
      return res.status(400).json({ error: 'Mavzu (topic) va fan (subject) talab qilinadi.' });
    }

    // --- O'tgan testlar xotirasi (Cross-Test Anti-Duplication Memory) ---
    let priorQuestionTexts = [];
    if (avoidPreviousTests && req.teacherId) {
      try {
        const priorTests = await OnlineTest.find({
          teacherId: req.teacherId,
          $or: [
            { subject: new RegExp('^' + escapeRegex(subject) + '$', 'i') },
            { title: new RegExp(escapeRegex(subject), 'i') }
          ]
        })
          .sort({ createdAt: -1 })
          .limit(10)
          .select('questions title')
          .lean();

        for (const pt of priorTests) {
          if (Array.isArray(pt.questions)) {
            for (const q of pt.questions) {
              const text = q.questionText || q.text || q.question;
              if (text && typeof text === 'string') {
                priorQuestionTexts.push(text.trim());
              }
            }
          }
        }
        priorQuestionTexts = Array.from(new Set(priorQuestionTexts)).slice(0, 45);
        if (priorQuestionTexts.length > 0) {
          console.log(`[generateAITest] Cross-test deduplication: ${priorQuestionTexts.length} ta avvalgi savol olindi va AI ga taqiq sifatida uzatiladi.`);
        }
      } catch (dbErr) {
        console.warn('[generateAITest] Prior tests lookup error:', dbErr.message);
      }
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
              subtopic: { type: "string" },
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

    function buildTestPrompt({ 
      topic, 
      subject, 
      questionCount = 5, 
      difficulty = 'aralash', 
      grade = 'aralash', 
      language = 'o\'zbek', 
      questionStyle = 'mixed',
      existingQuestions = [],
      priorQuestions = [],
      topicsList = []
    }) {
      const existingText = existingQuestions.length > 0 
        ? `\n\nCRITICAL RULE: DO NOT REPEAT THE FOLLOWING CONCEPTS. These questions have ALREADY been generated in this session:\n` + existingQuestions.map((q, i) => `${i+1}. ${q.questionText || q}`).join('\n')
        : '';

      const priorText = priorQuestions.length > 0
        ? `\n\n⛔ FORBIDDEN PRIOR QUESTIONS (CROSS-TEST DEDUPLICATION):
The teacher has ALREADY tested the following questions in previous weeks.
You are STRICTLY FORBIDDEN from generating these questions, duplicate concepts, or trivial rewrites.
You MUST test completely NEW concepts, edge cases, practical aspects, and angles:
` + priorQuestions.slice(0, 35).map((q, i) => `${i+1}. ${q}`).join('\n')
        : '';

      // String.raw template ichida backtick yozib bo'lmaydi (templateni yopib qo'yadi).
      const bt = '\`';

      let styleInstruction = '';
      if (questionStyle === 'code') {
        styleInstruction = `
## QUESTION FORMAT: PRACTICAL CODE SNIPPETS & SYNTAX
- At least 80% of questions MUST include an explicit, realistic code snippet or markup inside inline backticks (${bt}...${bt}).
- Ask what the output will be, how to fix an issue, or which exact CSS/HTML/Tailwind property/class is required.
- NO pure dry theoretical definitions. Practical hands-on code only.`;
      } else if (questionStyle === 'case_study') {
        styleInstruction = `
## QUESTION FORMAT: REAL-WORLD SCENARIOS & CASE STUDIES
- Present realistic problem statements ("Bir dasturchi mobil ekran uchun menyu yasamoqda...", "Mijoz sahifa tezligini oshirishni so'radi...").
- Ask which specific tool, class, property, or architecture solves the dilemma.
- Emphasize real-world decision making over memorization.`;
      } else if (questionStyle === 'troubleshooting') {
        styleInstruction = `
## QUESTION FORMAT: BUG HUNTING & DEBUGGING
- Present a scenario or code with a flaw, conflict, or unexpected behavior.
- Ask the student to identify why the bug occurs or which change will fix it.`;
      } else if (questionStyle === 'conceptual') {
        styleInstruction = `
## QUESTION FORMAT: DEEP COMPARISONS & CONCEPTS
- Compare technologies and approaches (e.g. Flexbox vs Grid, Tailwind utility classes vs inline styles, Figma auto-layout vs grouping, vector vs raster in Canva).
- Test deep conceptual understanding rather than shallow surface definitions.`;
      }

      const randomSeed = Math.floor(Math.random() * 900000) + 100000;
      const focusAreas = [
        "mobil moslashuvchanlik (responsive layout) va turli ekranlar",
        "unumdorlik, tejamkorlik va tez yuklanish (performance)",
        "chegara holatlari (edge-cases) va kutilmagan brauzer xatti-harakatlari",
        "zamonaviy standartlar va clean code amaliyotlari",
        "foydalanuvchi tajribasi (UX), qulaylik (accessibility/a11y) va xavfsizlik"
      ];
      const randomFocus = focusAreas[Math.floor(Math.random() * focusAreas.length)];

      const multiTopicDistributionInstruction = topicsList && topicsList.length > 1
        ? `\n\n## MULTI-TOPIC COMPOSITE DISTRIBUTION (CRITICAL):\n` +
          `This assessment covers ${topicsList.length} distinct topics: ${topicsList.join(', ')}.\n` +
          `You MUST distribute the ${questionCount} questions evenly across these topics (approx. ${Math.round(questionCount / topicsList.length)} questions per topic).\n` +
          `For EVERY single question in the JSON, populate the "subtopic" field with the exact matching topic name from: [${topicsList.map(t => `"${t}"`).join(', ')}].`
        : '';

      return String.raw`Sen — istalgan fandan (matematika, fizika, biologiya, tarix, informatika, ona tili va h.k.) yuqori sifatli test tuzuvchi 20 yillik tajribali mutaxassis o'qituvchisan.
Your ONLY output is a valid JSON array. Do not explain anything, do not add any text before or after the JSON.

TASK
Generate exactly ${questionCount} multiple-choice questions for:
  Subject: ${subject}
  Topic(s): ${topic}
  Target Grade/Class: ${grade}
  Difficulty: ${difficulty}
  Style: ${questionStyle}
  Entropy Seed: #${randomSeed}
  Special Emphasis: ${randomFocus}
  Language: ${language}${multiTopicDistributionInstruction}${existingText}${priorText}
${styleInstruction}

## PEDAGOGICAL & SCIENTIFIC ACCURACY RULES

1. UNIQUE ANSWER: Each question must have exactly ONE unambiguously correct answer.
2. PLAUSIBLE DISTRACTORS: Wrong options must reflect typical student mistakes — never random or unrelated.
3. TEST UNDERSTANDING: Avoid rote recall. Prefer "Why?", "What if X?", multi-step reasoning.
4. ZERO DUPLICATION: Every question tests a completely distinct concept. No repeated setups.
5. LANGUAGE: All text must be grammatically correct ${language}. Zero language mixing in question/option text.

## ILMIY TERMINOLOGIYA VA MAKTAB DARSLIKLARI STANDARTLARI (CRITICAL):
- INFORMATIKA VA EXCEL (ELEKTRON JADVALLAR):
  * Excel jadvalining eng kichik birligi / katagi (cell) — darsliklarda FAQAT "katak" yoki "katakcha" deb ataladi!
  * ⛔ QAT'IYAN TAQIQLANADI: Excel yoki jadvallar haqidagi savollarda "hujayra" so'zini ishlatish MUTLAQO MAN ETILADI! ("Hujayra" faqat Biologiya faniga oid).
  * Excel terminlari: katak / katakcha (cell), satr (row), ustun (column), ishchi varaq (worksheet), ishchi kitob (workbook), formulalar satri (formula bar), kataklar diapazoni (range), avtoto'ldirish (AutoFill).
  * Matn muharriri (Word): matnni qalin qilish (Ctrl+B), kursiv (Ctrl+I), tagiga chizish (Ctrl+U), qidirish (Ctrl+F), saqlash (Ctrl+S), nusxa olish (Ctrl+C), qo'yish (Ctrl+V), lenta (Ribbon), hoshiya (Margins), tekislash (Alignment - chapga, o'ngga, markazga, kenglik bo'yicha).
- VARIANTLARNI TIRNOQ BILAN O'RAMANG:
  * Variantlar matnini tashqi bittalik yoki ikkitalik tirnoq ('...', "...") ichiga o'ramang!
  * TO'G'RI: ["O'qish rejimi (Read Mode)", "Chop etish tartibi (Print Layout)", "Qora nusxa (Draft View)", "Web tartibi (Web Layout)"]
  * NOTO'G'RI: ["'O'qish rejimi (Read Mode)'", "'Chop etish tartibi (Print Layout)'"]
- ILMIY VA AKADEMIK ANIKLIK (SCIENTIFIC RIGOR):
  * Savollar va variantlar O'zbekiston maktab darsliklari va fan dasturlarida qabul qilingan rasmiy ilmiy atamalar va ta'riflarga 100% mos bo'lishi shart.
  * Fizika: massa (kg) skalyar kattalik, og'irlik esa jismning tayanchga ta'sir kuchi (P = mg, N) - adashtirilmasin.
  * Biologiya: "hujayra" faqat tirik organizmlarning mikroskopik tuzilish va tiriklik birligi sifatida ishlatilsin.

## LATEX MATH RULES — CRITICAL

You are writing inside a JSON string. The ONLY escaping rule for LaTeX:
  A single backslash \ in LaTeX → write \\ in JSON string (two characters).
  Nothing more. Do NOT add extra backslashes.

CORRECT JSON examples (copy this pattern exactly):
  "questionText": "$3\\sqrt{8} - \\sqrt{18} + \\sqrt{2}$"
  "questionText": "$\\frac{6}{\\sqrt{10} - \\sqrt{7}}$"
  "questionText": "$\\sin^2\\alpha + \\cos^2\\alpha = 1$ qoidasiga ko'ra..."
  "questionText": "$\\sin 30° + \\cos 60°$ ni hisoblang."
  "questionText": "$\\cos\\alpha = \\frac{\\sqrt{3}}{2}$ bo'lsa, $\\alpha = ?$"
  "questionText": "$\\frac{1}{\\sqrt{5} - \\sqrt{3}}$ ifodasini soddalashtiring."
  "questionText": "Tenglamani yeching: $\\sqrt{2x - 1} = 3$"
  "questionText": "$\\begin{cases} x + y = 5 \\\\ x - y = 1 \\end{cases}$ sistemasini yeching."
  "options": ["$\\frac{1}{2}$", "$\\frac{\\sqrt{3}}{2}$", "$1$", "$0$"]

WRONG — NEVER DO THIS (these render as plain text, not math):
  "$3\\\\sqrt{8}$"     ← 4 backslashes = BROKEN
  "$\\\\frac{1}{2}$"  ← 4 backslashes = BROKEN
  "$\\\\sin\\\\alpha$" ← BROKEN

LATEX SYNTAX:
- Inline math: $expression$ — NO spaces at edges: $x+1$ correct, $ x+1 $ WRONG
- Every { must have matching }, every $ must close in the same field
- Allowed commands: \\frac, \\sqrt, \\sin, \\cos, \\tan, \\cot, \\pi, \\alpha, \\beta,
  \\theta, \\phi, \\leq, \\geq, \\neq, \\infty, \\cdot, \\times, \\div, \\left, \\right,
  \\begin{cases}...\\end{cases}, superscript ^, subscript _
- Angles: write 30°, 45°, 60°, 90° using the ° symbol (not \\circ) for readability
- Systems of equations MUST use \\begin{cases} ... \\\\ ... \\end{cases}
- NEVER put \n newline inside $ ... $. One line per math expression.
- IT/PROGRAMMING questions (Python, JavaScript, HTML, Excel etc.):
  * Wrap ALL code expressions in inline code: ${bt}code here${bt}
  * Python example options: ${bt}b**2 - 4*a*c${bt}, ${bt}math.sqrt(x)${bt}, ${bt}x**2 + 2*x + 1${bt}
  * HTML example options: ${bt}<h1>Sarlavha</h1>${bt}, ${bt}<div class="box">${bt}
  * NEVER write Python operators raw in options — ${bt}**${bt} without backticks renders as **bold** in Markdown!
  * Formula code is NEVER in LaTeX — use backticks, not $...$

## OUTPUT FORMAT

Return ONLY a valid JSON array — no markdown fences, no commentary.
Each element must exactly match:
{
  "questionNumber": <1..${questionCount}>,
  "questionText": "<question string with LaTeX>",
  "subtopic": "<exact topic name from ${topic}>",
  "options": ["<opt1>", "<opt2>", "<opt3>", "<opt4>"],
  "correctAnswerIndex": <0|1|2|3>,
  "correctOption": "<exact text of correct option>"
}

- Exactly 4 options, exactly 1 correct.
- Do NOT add A), B), C), D) or bullet symbols to option text.
- correctAnswerIndex is 0-based (0=first option).

Begin generation now.`;

    }

    // --- 20-Year Senior Architecture: Multi-Agent AI Orchestrator ---
    async function generateChunkWithRetry(chunkTopic, chunkCount, existingQuestions = [], topicsList = []) {
      const prompt = buildTestPrompt({ 
        topic: chunkTopic, 
        subject, 
        questionCount: chunkCount, 
        grade: req.body.grade || 'aralash',
        difficulty: req.body.difficulty || 'aralash',
        language: req.body.language || 'o\'zbek',
        questionStyle: req.body.questionStyle || 'mixed',
        existingQuestions,
        priorQuestions: priorQuestionTexts,
        topicsList
      });

      const isPremium = teacher && teacher.plan === 'premium';
      const aiResult = await executeResilientQuestionGen({
        prompt,
        systemPrompt: "You are an elite educational assessment engineer. Generate multiple-choice questions with strict scientific and academic terminology (e.g. in Excel/spreadsheets, a cell is strictly called 'katak' or 'katakcha', NEVER 'hujayra'). Output valid JSON matching the schema.",
        aiSchema,
        isPremium
      });

      if (!aiResult.success) {
        return { success: false, error: aiResult.error };
      }

      // Quality validation & distractor verification pass with subject context
      // FIX #2: Math.min(2, x) = har doim 2 → Math.max(2, x) = kamida chunkCount*50%
      // 30 savol so'ralganda minAcceptable = max(2, 15) = 15 (eski: 4 ta bo'lsa ham "OK" edi)
      const batchResult = processQuestionBatch(aiResult.questions, { 
        minAcceptable: Math.max(2, Math.floor(chunkCount * 0.5)), 
        targetCount: chunkCount,
        subject: subject
      });

      if (batchResult.shouldFallbackToNextProvider && batchResult.questions.length === 0) {
        return { success: false, error: "Savollar sifatsiz yoki validatsiyadan o'ta olmadi" };
      }

      return { success: true, data: batchResult.questions };
    }

    // Deduplication helper using Jaccard Similarity (Paraphrase & Semantic deduplication)
    // Senior-Level Smart Deduplication:
    // Faqat 100% bir xil savollarni yoki matni 88% dan ortiq o'xshash bo'lgan haqiqiy dublikatlarni aniqlaydi.
    // Dasturlashda "innerHTML vazifasi..." va "querySelector vazifasi..." kabi turli mavzulardagi
    // savollarni soxta dublikat deb o'chirib yubormaydi!
    const calculateSimilarity = (str1, str2) => {
      const clean1 = (str1 || '').toLowerCase().trim();
      const clean2 = (str2 || '').toLowerCase().trim();
      if (clean1 === clean2) return 1.0;

      const words1 = clean1.split(/\s+/).filter(w => w.length > 1);
      const words2 = clean2.split(/\s+/).filter(w => w.length > 1);
      if (words1.length === 0 || words2.length === 0) return 0;

      const set1 = new Set(words1);
      const set2 = new Set(words2);
      const intersection = [...set1].filter(x => set2.has(x)).length;
      const union = new Set([...set1, ...set2]).size;
      return union > 0 ? intersection / union : 0;
    };

    const deduplicateBatch = (candidates, existingTextsSet) => {
      const unique = [];
      for (const q of candidates) {
        if (!q || !q.questionText) continue;
        const cleanText = q.questionText.replace(/\s+/g, '').toLowerCase();

        // 1. Exact match tekshiruvi
        let isDuplicate = Array.from(existingTextsSet).some(et => et.replace(/\s+/g, '').toLowerCase() === cleanText);

        // 2. Semantik o'xshashlik tekshiruvi: 88% dan yuqori bo'lsa va variantlari ham deyarli bir xil bo'lsagina dublikat
        if (!isDuplicate) {
          isDuplicate = Array.from(existingTextsSet).some(et => {
            const textSim = calculateSimilarity(et, q.questionText);
            return textSim > 0.88;
          });
        }

        if (!isDuplicate) {
          unique.push(q);
          existingTextsSet.add(q.questionText);
        } else {
          console.warn(`[AI Deduplication] Haqiqiy takroriy savol chetlatildi: ${q.questionText.substring(0, 60)}...`);
        }
      }
      return unique;
    };

    const assignAndBalanceSubtopics = (questions, topicsList) => {
      if (!topicsList || topicsList.length <= 1) {
        const singleTopic = topicsList && topicsList[0] ? topicsList[0] : topic;
        return questions.map(q => ({ ...q, subtopic: singleTopic }));
      }

      const topicCounts = {};
      topicsList.forEach(t => { topicCounts[t.toLowerCase()] = 0; });

      return questions.map(q => {
        let assigned = null;
        const qSub = (q.subtopic || '').trim().toLowerCase();

        // 1. Direct or partial match with AI-tagged subtopic
        const directMatch = topicsList.find(t => {
          const lt = t.toLowerCase();
          return qSub === lt || qSub.includes(lt) || lt.includes(qSub);
        });

        if (directMatch) {
          assigned = directMatch;
        } else {
          // 2. Keyword heuristic from question text & options
          const fullContent = `${q.questionText || ''} ${(q.options || []).join(' ')}`.toLowerCase();
          const keywordMatch = topicsList.find(t => fullContent.includes(t.toLowerCase()));
          if (keywordMatch) {
            assigned = keywordMatch;
          } else {
            // 3. Balanced fallback: assign to the topic with lowest count so far
            let minTopic = topicsList[0];
            let minCount = topicCounts[minTopic.toLowerCase()] || 0;
            for (const t of topicsList) {
              const c = topicCounts[t.toLowerCase()] || 0;
              if (c < minCount) {
                minCount = c;
                minTopic = t;
              }
            }
            assigned = minTopic;
          }
        }

        topicCounts[assigned.toLowerCase()] = (topicCounts[assigned.toLowerCase()] || 0) + 1;
        return { ...q, subtopic: assigned };
      });
    };

    let rawQuestions = [];
    const targetTotal = questionCount || 10;
    const topicsArray = topic.split(',').map(t => t.trim()).filter(Boolean);
    const existingTextsSet = new Set();

    // ── 20-Year Senior Architecture: High-Performance Composite Generation ──
    // Eliminates 75s proxy bottleneck: single unified pass for <= 30 questions (8-10s)
    if (targetTotal <= 30) {
      // AI ba'zida 1-2 ta o'xshash yoki filtrdan o'tmaydigan savol berishi mumkin.
      // Deduplikatsiya va validatsiyadan so'ng roppa-rosa targetTotal chiqishi uchun kichik bufer bilan so'raymiz:
      const bufferCount = Math.min(Math.max(Math.ceil(targetTotal * 0.12), 2), 4);
      const requestCount = targetTotal + bufferCount;

      const aiResult = await testGenerationQueue(() => 
        generateChunkWithRetry(topic, requestCount, [], topicsArray)
      );

      if (aiResult.success && aiResult.data && aiResult.data.length > 0) {
        const unique = deduplicateBatch(aiResult.data, existingTextsSet);
        rawQuestions = rawQuestions.concat(unique);
      }

      // Agar filtrdan keyin ham targetTotal ga yetmasa, aniq yetmagan qismini darhol to'ldirish
      if (rawQuestions.length < targetTotal) {
        const needed = (targetTotal - rawQuestions.length) + 1;
        const supplementaryResult = await testGenerationQueue(() =>
          generateChunkWithRetry(topic, needed, Array.from(existingTextsSet), topicsArray)
        );
        if (supplementaryResult.success && supplementaryResult.data) {
          const topUp = deduplicateBatch(supplementaryResult.data, existingTextsSet);
          rawQuestions = rawQuestions.concat(topUp);
        }
      }
    } else {
      // For large tests (> 30 questions), split into 2 balanced parallel chunks with safety buffer
      const bufferEach = 2;
      const batchSize = Math.ceil(targetTotal / 2);
      const [batch1, batch2] = await Promise.all([
        testGenerationQueue(() => generateChunkWithRetry(topic, batchSize + bufferEach, [], topicsArray)),
        testGenerationQueue(() => generateChunkWithRetry(topic, (targetTotal - batchSize) + bufferEach, [], topicsArray))
      ]);

      if (batch1.success && batch1.data) {
        rawQuestions = rawQuestions.concat(deduplicateBatch(batch1.data, existingTextsSet));
      }
      if (batch2.success && batch2.data) {
        rawQuestions = rawQuestions.concat(deduplicateBatch(batch2.data, existingTextsSet));
      }

      if (rawQuestions.length < targetTotal) {
        const needed = (targetTotal - rawQuestions.length) + 1;
        const supplementaryResult = await testGenerationQueue(() =>
          generateChunkWithRetry(topic, needed, Array.from(existingTextsSet), topicsArray)
        );
        if (supplementaryResult.success && supplementaryResult.data) {
          const topUp = deduplicateBatch(supplementaryResult.data, existingTextsSet);
          rawQuestions = rawQuestions.concat(topUp);
        }
      }
    }

    if (rawQuestions.length === 0) {
      return res.status(500).json({ error: "AI savollarni yarata olmadi. Iltimos mavzuni tekshirib qayta urinib ko'ring." });
    }

    // Trim to exactly targetTotal just in case of slight over-generation
    rawQuestions = rawQuestions.slice(0, targetTotal);

    // Assign canonical, balanced subtopics
    rawQuestions = assignAndBalanceSubtopics(rawQuestions, topicsArray);

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
    const results = await OnlineTestResult.find({ testId: { $in: testIds } }).lean();
    
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