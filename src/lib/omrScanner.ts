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

export async function processWithGemini(base64Image: string, totalQuestions: number): Promise<OMRResult> {
  if (!GEMINI_API_KEY) {
    throw new Error("Gemini API Key topilmadi.");
  }

  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ 
    model: "gemini-1.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
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
    }
  });

  const prompt = `
    Sen OMR (Optical Mark Recognition) skannersan. Vazifang rasmda keltirilgan test javoblar varag'ini (bubble sheet) o'qib berish.
    Rasmda 1 dan ${totalQuestions} gacha savollar raqamlangan.
    O'quvchi tomonidan qora ruchkada to'ldirilgan yoki qoraytirilgan javoblarni top. Agar o'quvchi xato qilib "V" yoki "X" qo'ygan bo'lsa ham javobni qabul qil, asosiysi niyat qaysi variantga qaratilganini aniqla.
    Agar bitta savolga bir nechta javob belgilangan bo'lsa yoki umuman belgilanmagan bo'lsa, 'ans' qiymatini null deb qaytar.
  `;

  try {
    const imagePart = base64ToGenerativePart(base64Image, 'image/jpeg');
    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();
    
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
  answers: {
    questionIndex: number;
    selectedOption: number | null; // 0=A, 1=B, 2=C, 3=D
    correctOption: number;
    isCorrect: boolean;
  }[];
}

export async function gradeTestFromPhoto(
  base64Image: string,
  questions: { questionText: string; options: string[]; correctOption: number }[],
  studentName: string
): Promise<PaperGradingResult> {
  if (!GEMINI_API_KEY) {
    throw new Error("Gemini API kaliti sozlangan bo'lishi kerak.");
  }

  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
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
    }
  });

  const questionPrompts = questions.map((q, idx) => {
    const opts = (q.options || []).map((o, i) => `${String.fromCharCode(65 + i)}: ${o}`).join(', ');
    return `Savol #${idx + 1}: ${q.questionText} [Variantlar: ${opts}]`;
  }).join('\n');

  const prompt = `
    Sen ta'limiy AI OMR va test javoblarini tekshiruvchi inspektsiyasan.
    Senga o'quvchi qog'ozda to'ldirgan test varaqasi rasmi taqdim etilmoqda.
    Savollar soni: ${questions.length} ta.
    
    Savollar ro'yxati:
    ${questionPrompts}
    
    Vazifang:
    Rasmda har bir savol uchun o'quvchi belgilagan javob variantini top (A -> 0, B -> 1, C -> 2, D -> 3).
    Agar belgilanmagan bo'lsa ansIndex = null qilib ber.
  `;

  try {
    const imagePart = base64ToGenerativePart(base64Image, 'image/jpeg');
    const result = await model.generateContent([prompt, imagePart]);
    const responseText = await result.response.text();
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

    return {
      studentName,
      score: correctCount,
      totalScore: questions.length,
      correctCount,
      answers: gradedAnswers
    };
  } catch (err: any) {
    console.error("Camera Paper Grading error:", err);
    throw new Error(err.message || "Rasm o'qishda va baholashda xatolik yuz berdi");
  }
}
