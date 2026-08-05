import { GoogleGenerativeAI } from '@google/generative-ai';
import type { QuestionBlueprint } from './blueprint';

export const generateDiagnosticSummary = async (studentName: string, grade: string, scores: any, questionResults: Record<number, boolean>, blueprint: QuestionBlueprint[]) => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';

  if (!apiKey) {
    throw new Error("API kalit topilmadi. .env faylini tekshiring.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  // Sizning API kalitingiz eksklyuziv tarzda mutlaqo yangi avlod (Gemini 3.x) modellariga ulangan ekan!
  const fallbackModels = ["gemini-3.6-flash", "gemini-3.5-flash-lite", "gemini-2.5-flash", "gemini-flash-latest"];

  // Qaysi mavzular va ko'nikmalarda qanday xato qilinganini tahlil qilish
  const failedQuestions = blueprint.filter(q => !questionResults[q.id]);
  const failedTopics = failedQuestions.map(q => q.topic).join(', ');
  const failedSkills = [...new Set(failedQuestions.map(q => q.skill))].join(', ');
  const failedDifficulties = [...new Set(failedQuestions.map(q => q.difficulty))].join(', ');

  const prompt = `Siz malakali o'qituvchi va psixologsiz. Quyidagi o'quvchining maktab kirish imtihonidagi test natijalarini tahlil qiling va 2 qismdan iborat xulosa yozing.
O'quvchi ismi: ${studentName}
O'quvchi sinfi: ${grade}-sinf

Umumiy natijalar:
- Matematika: ${scores.math}%
- Mantiq: ${scores.logic}%
- Analitik fikrlash: ${scores.analytical}%
- Og'zaki nutq (Verbal): ${scores.verbal}%
- Kreativlik: ${scores.creativity}%

O'quvchi xato qilgan spesifik joylar:
- Xato qilingan mavzular: ${failedTopics || 'Deyarli yo\'q, juda yaxshi'}
- Qiynalgan ko'nikmalari: ${failedSkills || 'Barcha ko\'nikmalar shakllangan'}
- Qaysi qiyinlikdagi savollarda ko'p xato qildi: ${failedDifficulties || 'Hech qaysi'}

Vazifa:
Iltimos, javobni faqat va faqat quyidagi JSON formatida qaytaring, boshqa hech qanday izoh qo'shmang. Tahlilda o'quvchining aniq qaysi mavzularda oqsagani va qaysi ko'nikmalari pastligini (yuqoridagi statistikaga asosan) alohida ta'kidlab o'ting:
{
  "summary": "O'quvchining kuchli va zaif tomonlari (qaysi mavzular va ko'nikmalarda oqsagani), umumiy intellektual profili haqida 3-4 gapdan iborat chuqur tahlil (o'zbek tilida).",
  "advice": "O'quvchi o'zini qanday rivojlantirishi kerakligi, xato qilgan mavzularini qanday to'g'rilashi haqida amaliy, motivatsion 3-4 gapdan iborat maslahat (o'zbek tilida)."
}`;

  let lastError = "";

  for (const modelName of fallbackModels) {
    try {
      console.log(`AI modeli orqali so'rov yuborilmoqda: ${modelName}...`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Attempt to parse the JSON output from Gemini
      try {
        // ba'zida AI JSON ni markdown kod bloki ichida qaytaradi
        let cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        cleanText = cleanText.replace(/(?<!\\)\\(?!["\\/bfnrt])/g, "\\\\"); // LaTeX \ larni to'g'irlash
        const parsed = JSON.parse(cleanText);
        console.log(`Muvaffaqiyatli: ${modelName} modelidan javob olindi.`);
        return {
          summary: parsed.summary,
          advice: parsed.advice
        };
      } catch (parseError) {
        console.error(`JSON o'qishda xatolik (${modelName}):`, text);
        // Agar JSON formatida qaytarmagan bo'lsa ham oddiy matn sifatida saqlaymiz
        return {
          summary: text.substring(0, 300) + "...",
          advice: "Natijalarni ustozingiz bilan tahlil qiling."
        };
      }
    } catch (error: any) {
      console.warn(`Model xatoligi (${modelName}):`, error);
      lastError += `\n[${modelName}]: ${error.message || error.toString()}`;
      // Agar xato bo'lsa tsikl davom etadi va keyingi modelga o'tadi
    }
  }

  // Agar barcha modellar xato bersa
  console.error("Barcha Gemini modellari ishlamay qoldi yoki limit tugadi.");
  return {
    summary: `Texnik xatolik yuz berdi: ${lastError}`,
    advice: "Bu odatda API kalit noto'g'riligi yoki internet muammosi tufayli yuz beradi."
  };
};

export const generateGradeBlueprint = async (grade: string): Promise<QuestionBlueprint[] | null> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
  if (!apiKey) throw new Error("API kalit topilmadi.");

  const genAI = new GoogleGenerativeAI(apiKey);
  const fallbackModels = ["gemini-3.6-flash", "gemini-3.5-flash-lite", "gemini-2.5-flash", "gemini-flash-latest"];

  const prompt = `Siz malakali ta'lim ekspertisiz. Menga ${grade}-sinf o'quvchilari uchun diagnostika test shablonini tuzib bering.
Jami 30 ta savol bo'lishi shart.
Kategoriyalar taqsimoti: 6 ta math, 6 ta logic, 6 ta analytical, 6 ta verbal, 6 ta creativity.
Qiyinchilik (difficulty): Oson, O'rta, Qiyin (aralash bo'lsin).
Kognitiv ko'nikma (skill): Tushunish, Qo'llash, Tahlil, Baholash, Sintezlash.
Fikrlash turi (thinkingType): Mantiqiy, Analitik, Ijodiy, Tanqidiy.

Javobni FAQAT VA FAQAT JSON Array formatida qaytaring, boshqa hech qanday izoh yozmang. Namuna formati:
[
  { "id": 1, "topic": "Kichik matn yaratish", "category": "creativity", "difficulty": "O'rta", "skill": "Sintezlash", "thinkingType": "Ijodiy" },
  ...
]
`;

  for (const modelName of fallbackModels) {
    try {
      console.log(`Blueprint yaratilmoqda: ${modelName}...`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const text = (await result.response).text();
      
      let cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      cleanText = cleanText.replace(/(?<!\\)\\(?!["\\/bfnrt])/g, "\\\\");
      const parsed = JSON.parse(cleanText) as QuestionBlueprint[];
      
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Ensure IDs are 1 to 30
        return parsed.map((item, index) => ({
          ...item,
          id: index + 1
        })).slice(0, 30);
      }
    } catch (error) {
      console.warn(`Blueprint model xatoligi (${modelName}):`, error);
    }
  }

  return null;
};
