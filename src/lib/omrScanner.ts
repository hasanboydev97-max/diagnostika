import { GoogleGenerativeAI } from '@google/generative-ai';

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
  // Flash is perfect for vision tasks, it's fast and cheap.
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `
    Sen OMR (Optical Mark Recognition) skannersan. Vazifang rasmda keltirilgan test javoblar varag'ini (bubble sheet) o'qib berish.
    Rasmda 1 dan ${totalQuestions} gacha savollar raqamlangan bo'lishi va har biriga (A, B, C, D) kabi variantlar belgilangan bo'lishi mumkin.
    O'quvchi tomonidan qora ruchkada to'ldirilgan yoki qoraytirilgan javoblarni top. Agar o'quvchi xato qilib "V" yoki "X" qo'ygan bo'lsa ham javobni qabul qil, asosiysi niyat qaysi variantga qaratilganini aniqla.
    Agar bitta savolga bir nechta javob belgilangan bo'lsa yoki umuman belgilanmagan bo'lsa, uni null deb qaytar.

    JAVOBNI FAQATGINA QATIY JSON ARRAY FORMATIDA QAYTAR. HECH QANDAY QO'SHIMCHA SO'ZLARSIZ. 
    Format quyidagicha bo'lishi shart:
    [
      {"q": 1, "ans": "A"},
      {"q": 2, "ans": "B"},
      {"q": 3, "ans": null}
    ]
  `;

  try {
    const imagePart = base64ToGenerativePart(base64Image, 'image/jpeg');
    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();
    
    // Clean JSON parsing
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(jsonStr);

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
