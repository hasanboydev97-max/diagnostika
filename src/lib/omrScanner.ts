import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

export interface OMRResult {
  score: number;
  total: number;
  correctCount: number;
  method: string;
  answers: { q: number; ans: string; isCorrect?: boolean }[];
  error?: string;
}

// Helper to convert base64 data URI to Generative Part
function base64ToGenerativePart(base64String: string, mimeType: string) {
  // Remove the data:image/...;base64, part if present
  const base64Data = base64String.split(',')[1] || base64String;
  return {
    inlineData: {
      data: base64Data,
      mimeType
    },
  };
}

const GEMINI_VISION_MODELS = [
  "gemini-1.5-flash-latest",
  "gemini-1.5-flash",
  "gemini-2.0-flash-exp",
  "gemini-1.5-pro",
  "gemini-1.5-flash-8b"
];

async function executeVisionAiModel(
  genAI: GoogleGenerativeAI,
  prompt: string,
  imageParts: any[],
  schemaProps?: any
): Promise<string> {
  let lastError = "";

  for (const modelName of GEMINI_VISION_MODELS) {
    // Attempt 1: With JSON Mime type
    try {
      console.log(`Gemini Vision AI yuborilmoqda: ${modelName}...`);
      const config: any = {};
      if (schemaProps) {
        config.responseMimeType = "application/json";
      }
      const model = genAI.getGenerativeModel({ model: modelName, generationConfig: config });
      const result = await model.generateContent([prompt, ...imageParts]);
      const responseText = await result.response.text();
      if (responseText && responseText.trim()) {
        console.log(`✅ Gemini Vision (${modelName}) muvaffaqiyatli tahlil qildi.`);
        return responseText;
      }
    } catch (err: any) {
      const msg = err.message || String(err);
      console.warn(`Gemini Vision (${modelName}) xatoligi:`, msg);
      if (msg.includes("leaked") || msg.includes("API key") || msg.includes("403")) {
        throw new Error("Gemini API key bekor qilingan (leaked key error). Iltimos Vercel Sozlamalarida (Environment Variables) VITE_GEMINI_API_KEY ga yangi kalit qo'ying!");
      }
      lastError += `[${modelName}]: ${msg}; `;
    }
  }

  // Final fallback: try without schema on gemini-1.5-flash
  try {
    const fallbackModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await fallbackModel.generateContent([prompt + "\nFAQT JSON formatida qaytar: [{\"q\": 1, \"ansIndex\": 0}]", ...imageParts]);
    const text = await result.response.text();
    if (text && text.trim()) return text;
  } catch (err: any) {
    const msg = err.message || String(err);
    if (msg.includes("leaked") || msg.includes("403")) {
      throw new Error("Gemini API key bekor qilingan (leaked key). Iltimos Vercel (Environment Variables) ga yangi VITE_GEMINI_API_KEY kiriting!");
    }
  }

  throw new Error("Gemini Vision AI xatoligi: API key bekor qilingan yoki model javob bermadi. Iltimos Vercel environment parametrlarida VITE_GEMINI_API_KEY ni yangilang.");
}

export async function processWithGemini(base64Image: string, totalQuestions: number): Promise<OMRResult> {
  if (!GEMINI_API_KEY) {
    throw new Error("Gemini API Key topilmadi.");
  }

  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const prompt = `
    Sen OMR (Optical Mark Recognition) skannersan. Vazifang rasmda keltirilgan test javoblar varag'ini (bubble sheet) o'qib berish.
    Rasmda 1 dan ${totalQuestions} gacha savollar raqamlangan.
    O'quvchi tomonidan qora ruchkada to'ldirilgan yoki qoraytirilgan javoblarni top. Agar o'quvchi xato qilib "V" yoki "X" qo'ygan bo'lsa ham javobni qabul qil, asosiysi niyat qaysi variantga qaratilganini aniqla.
    Agar bitta savolga bir nechta javob belgilangan bo'lsa yoki umuman belgilanmagan bo'lsa, 'ans' qiymatini null deb qaytar.
  `;

  try {
    const imagePart = base64ToGenerativePart(base64Image, 'image/jpeg');
    const text = await executeVisionAiModel(
      genAI,
      prompt,
      [imagePart],
      {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            q: { type: SchemaType.INTEGER, description: "Savol raqami (masalan 1)" },
            ans: { type: SchemaType.STRING, nullable: true, description: "O'quvchi belgilagan javob, masalan 'A', 'B'. Hech narsa belgilanmagan yoki ikkita belgilangan bo'lsa null bo'ladi." }
          },
          required: ["q", "ans"]
        }
      }
    );
    
    // Yana ham ishonchli JSON.parse
    const parsed = JSON.parse(text);

    if (!Array.isArray(parsed)) {
      throw new Error("AI noto'g'ri format qaytardi.");
    }

    // Mock grading logic for demonstration (in real app, compare with correct answers from DB)
    // Here we'll just randomly grade them to show it works.
    let correctCount = 0;
    const gradedAnswers = parsed.map(item => {
      // Mock correctness: let's say 'A' or 'B' is mostly correct in this mock
      const isCorrect = item.ans ? Math.random() > 0.3 : false; 
      if (isCorrect) correctCount++;
      return {
        ...item,
        isCorrect
      };
    });

    return {
      score: Math.round((correctCount / totalQuestions) * 100),
      total: totalQuestions,
      correctCount,
      method: 'Gemini AI Vision 1.5',
      answers: gradedAnswers
    };
    
  } catch (err: any) {
    console.error("Gemini Vision Error:", err);
    throw new Error(err.message || "Tahlil qilishda xatolik yuz berdi");
  }
}

export async function processWithOpenCV(_base64Image: string, totalQuestions: number): Promise<OMRResult> {
  return new Promise((resolve, reject) => {
    // Note: Writing a pure OpenCV OMR algorithm in JS takes hundreds of lines 
    // of image processing (Canny edge, finding quadrilaterals, perspectiveTransform, threshold, etc.)
    // For this demonstration, we'll simulate the OpenCV local processing delay.
    
    // To implement the real OpenCV logic later:
    // 1. let img = cv.imread(canvas);
    // 2. cv.cvtColor(img, img, cv.COLOR_RGBA2GRAY, 0);
    // 3. cv.Canny(img, edges, 50, 100, 3, false);
    // 4. cv.findContours(...);
    // 5. Transform & Crop.

    if (typeof (window as any).cv === 'undefined') {
      return reject(new Error("OpenCV.js hali yuklanmadi. Iltimos kuting."));
    }

    setTimeout(() => {
      resolve({
        score: Math.round((Math.random() * 0.4 + 0.6) * 100), // Random 60-100 score
        total: totalQuestions,
        correctCount: Math.round(totalQuestions * 0.8),
        method: 'OpenCV.js (Lokal)',
        answers: []
      });
    }, 1500);
  });
}

export interface PaperGradingResult {
  studentName: string;
  score: number;
  totalScore: number;
  correctCount: number;
  summaryText: string;
  weakTopics: string[];
  answers: {
    questionIndex: number;
    selectedOption: number | null; // 0=A, 1=B, 2=C, 3=D
    correctOption: number;
    isCorrect: boolean;
  }[];
}

export async function gradeTestFromPhoto(
  base64Images: string | string[],
  questions: { questionText: string; options: string[]; correctOption: number }[],
  studentName: string
): Promise<PaperGradingResult> {
  if (!GEMINI_API_KEY) {
    throw new Error("Gemini API kaliti sozlangan bo'lishi kerak.");
  }

  const imagesArray = Array.isArray(base64Images) ? base64Images : [base64Images];
  if (imagesArray.length === 0) {
    throw new Error("Kamida 1 ta rasm taqdim etilishi kerak.");
  }

  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

  const questionPrompts = questions.map((q, idx) => {
    const opts = (q.options || []).map((o, i) => `${String.fromCharCode(65 + i)}: ${o}`).join(', ');
    return `Savol #${idx + 1}: ${q.questionText} [Variantlar: ${opts}]`;
  }).join('\n');

  const prompt = `
    Sen ta'limiy AI OMR va multi-page test javoblarini tekshiruvchi inspektsiyasan.
    Senga o'quvchi qog'ozda to'ldirgan test varaqasi rasmlari (${imagesArray.length} bet/sahifa) taqdim etilmoqda.
    Savollar soni: ${questions.length} ta.
    
    Savollar ro'yxati:
    ${questionPrompts}
    
    Vazifang:
    Keltirilgan ${imagesArray.length} ta sahifadagi rasmlarning barchasini ko'rib chiq.
    Har bir savol uchun o'quvchi belgilagan javob variantini top (A -> 0, B -> 1, C -> 2, D -> 3).
    Agar belgilanmagan bo'lsa ansIndex = null qilib ber.
  `;

  try {
    const imageParts = imagesArray.map(img => base64ToGenerativePart(img, 'image/jpeg'));
    const responseText = await executeVisionAiModel(
      genAI,
      prompt,
      imageParts,
      {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            q: { type: SchemaType.INTEGER, description: "Savol raqami (1 dan boshlab)" },
            ansIndex: { 
              type: SchemaType.INTEGER, 
              nullable: true, 
              description: "O'quvchi tanlagan javob indeksi: 0 = A, 1 = B, 2 = C, 3 = D. Agar belgilamagan yoki tushunarsiz bo'lsa null" 
            }
          },
          required: ["q", "ansIndex"]
        }
      }
    );
    const parsed = JSON.parse(responseText);

    const gradedAnswers: PaperGradingResult['answers'] = questions.map((q, idx) => {
      const found = Array.isArray(parsed) ? parsed.find((item: any) => item.q === idx + 1) : null;
      const selectedOption = found && typeof found.ansIndex === 'number' && found.ansIndex >= 0 && found.ansIndex < (q.options?.length || 4)
        ? found.ansIndex
        : null;

      const isCorrect = selectedOption === q.correctOption;
      return {
        questionIndex: idx,
        selectedOption,
        correctOption: q.correctOption,
        isCorrect
      };
    });

    const correctCount = gradedAnswers.filter(a => a.isCorrect).length;
    const percentage = Math.round((correctCount / questions.length) * 100);

    const incorrectQuestions = gradedAnswers.filter(a => !a.isCorrect);
    const weakTopics = incorrectQuestions.map(a => {
      const qText = questions[a.questionIndex]?.questionText || '';
      return qText.replace(/<[^>]*>/g, '').trim().substring(0, 60);
    }).filter(Boolean);

    let summaryText = '';
    if (percentage >= 85) {
      summaryText = `Ajoyib natija! O'quvchi ${studentName} ushbu test mavzularini a'lo darajada o'zlashtirgan (${percentage}%).`;
    } else if (percentage >= 60) {
      summaryText = `Yaxshi natija (${percentage}%). O'quvchi ${studentName} asosiy konseptlarni tushungan, biroq xato qilingan savollar ustida qo'shimcha ishlash tavsiya etiladi.`;
    } else {
      summaryText = `Qayta tayyorgarlik talab etiladi (${percentage}%). O'quvchi ${studentName} bilimidagi bo'shliqlarni to'ldirish uchun ushbu fan bo'yicha takrorlash va individual tahlil zarur.`;
    }

    return {
      studentName,
      score: correctCount,
      totalScore: questions.length,
      correctCount,
      summaryText,
      weakTopics,
      answers: gradedAnswers
    };
  } catch (err: any) {
    console.error("Camera Paper Grading error:", err);
    throw new Error(err.message || "Rasm o'qishda va baholashda xatolik yuz berdi");
  }
}
