import { GoogleGenerativeAI } from '@google/generative-ai';
import { OnlineTest, OnlineTestResult, Teacher } from '../models/index.js';
import { buildDocxBuffer, sanitizePdfText } from '../utils/exportUtils.js';
import PDFDocument from 'pdfkit';

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
    const test = await OnlineTest.findOne({ id: req.params.id }).lean();
    if (!test) return res.status(404).json({ error: 'Not found' });
    res.json(test);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
export const getTestResults = async (req, res) => {
  try {
    const test = await OnlineTest.findOne({ id: req.params.id, teacherId: req.teacherId });
    if (!test) return res.status(403).json({ error: 'Forbidden' });
    
    // 1. Fetch from new architecture
    const newResults = await OnlineTestResult.find({ testId: req.params.id }).lean();
    
    // 2. Fetch from old legacy architecture (in case student used old cached frontend)
    const { Result } = await import('../models/index.js');
    const oldResults = await Result.find({ testId: req.params.id }).lean();
    
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
import fs from 'fs';

export const exportToDocx = async (req, res) => {
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
};
export const exportToExcel = async (req, res) => {
  try {
    const test = await OnlineTest.findOne({ id: req.params.id });
    if (!test) return res.status(404).json({ error: 'Test topilmadi' });

    const newResults = await OnlineTestResult.find({ testId: req.params.id }).lean();
    const { Result } = await import('../models/index.js');
    const oldResults = await Result.find({ testId: req.params.id }).lean();
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
    const test = await OnlineTest.findOne({ id: req.params.id });
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
};
export const deleteTest = async (req, res) => {
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
};
export const getTestResultById = async (req, res) => {
  try {
    const result = await OnlineTestResult.findOne({ id: req.params.id });
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

SIFAT MEZONLARI (har bir savolni yaratishdan oldin o'zingizni shu bo'yicha qattiq tekshiring va 100% amal qiling):
1. QAT'IY SHART - SINTAKSIS VA IMLO: Savollar oliy darajadagi o'zbek tilida, mukammal sintaksis va grammatika bilan yozilishi SHART. Hech qanday imlo, grammatik yoki sintaksis xatolarga umuman yo'l qo'yilmasin! Savol matnining ohanggi, gap qurilishi va mantiqiy qismi uzilishlarsiz, to'liq bo'lishi kerak. Savol oxiriga tegishli tinish belgisi (masalan, so'roq belgisi "?") qo'yishni unutmang.
2. QAT'IY SHART - MANTIQ VA CHUQURLIK: Savollar yuzaki bo'lmasin. 4 ta variant: 1 ta to'g'ri, 3 ta noto'g'ri. Noto'g'ri variantlar o'ta chalg'ituvchi, reallikka juda yaqin (lekin aynan noto'g'ri) bo'lishi kerak.
3. QAT'IY SHART - ILMIY ANIQLIK: Barcha faktlar, formulalar, ma'lumotlar, ismlar va sanalar 100% ilmiy to'g'ri va xatosiz bo'lishi KAFOLATLANSIN. Taxminlarga yo'l qo'ymang.
4. QAT'IY SHART - FORMATLASH: Kodlar, formulalar yoki texnik so'zlar to'liq ishlaydigan formatda bo'lishi shart. Maxsus belgilarni (masalan, qo'shtirnoqlar, qavslar, belgilashlar) chala qoldirmang. Yozuv uzilib qolmasin.
5. To'g'ri javob pozitsiyasi savoldan savolga tasodifiy taqsimlansin.
6. Bir xil savol yoki bir xil variantlar mutlaqo takrorlanmasin. Har bir savol aniq bitta o'ziga xos subtopic'ga tegishli bo'lsin.
7. XATOGA O'RIN YO'Q: Siz o'ta professional va xatosiz generatorsiz. Biror harf, biror vergul xato ketsa, dastur ishdan chiqadi deb tasavvur qiling. Mutlaqo mukammal test bazasi yarating.

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
            
            // Fix unescaped backslashes (e.g. \frac -> \\frac) so JSON.parse doesn't fail or create \f (form-feed)
            const safeRaw = raw.replace(/(?<!\\)\\([^nrtb"\\])/g, '\\\\$1');
            
            const questions = JSON.parse(safeRaw);
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
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: "application/json"
      }
    });

    function isAnswerCorrect(userAns, correctOpt, options = []) {
      if (!userAns || !correctOpt) return false;
      const u = String(userAns).trim().toLowerCase();
      const c = String(correctOpt).trim().toLowerCase();
      if (u === c) return true;
      const lm = { a: 0, b: 1, c: 2, d: 3 };
      if (lm[c] !== undefined && options[lm[c]]) {
        if (String(options[lm[c]]).trim().toLowerCase() === u) return true;
      }
      if (lm[u] !== undefined && options[lm[u]]) {
        if (String(options[lm[u]]).trim().toLowerCase() === c) return true;
      }
      return false;
    }

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
    const data = JSON.parse(text);
    
    res.json(data);
  } catch (err) {
    console.error('AI Analysis Error:', err);
    res.status(500).json({ error: 'AI bilan bog\'lanishda xatolik: ' + err.message });
  }
};