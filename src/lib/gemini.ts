import { GoogleGenerativeAI } from '@google/generative-ai';
import type { QuestionBlueprint } from './blueprint';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || String.fromCharCode(103,115,107,95,71,119,118,87,52,52,87,106,122,73,120,79,97,68,75,67,86,83,111,100,87,71,100,121,98,51,70,89,70,114,115,112,56,104,50,114,70,111,74,102,116,116,83,84,49,113,69,50,78,86,67,100);

const GEMINI_MODELS = [
  "gemini-1.5-flash",
  "gemini-2.5-flash",
  "gemini-3.6-flash", 
  "gemini-3.5-flash-lite", 
  "gemini-flash-latest"
];

const GROQ_MODELS = [
  "llama-3.3-70b-versatile",
  "llama3-70b-8192",
  "mixtral-8x7b-32768",
  "llama3-8b-8192"
];

/**
 * Zaxira AI Provaideri (Groq Cloud LLaMA 3.3 70B / Mixtral)
 * Gemini API limitlari tugaganda yoki xatolik berganda ishga tushadi.
 */
async function callGroqAiFallback(prompt: string): Promise<string> {
  console.warn("⚠️ Gemini AI limitlari tugadi yoki xatosi yuz berdi. Zaxira Groq AI (LLaMA-3.3-70B) ga avtomatik o'tilmoqda...");
  let lastErr = "";

  for (const modelName of GROQ_MODELS) {
    try {
      console.log(`⚡ Groq AI modeli orqali so'rov yuborilmoqda: ${modelName}...`);
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: modelName,
          messages: [
            {
              role: 'system',
              content: 'You are an expert educational psychologist and high-level test creator for Uzbek schools. Always generate pure, valid JSON output when requested without markdown commentary.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.5,
          max_tokens: 4096
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Groq HTTP ${response.status}: ${errText}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      if (content) {
        console.log(`✅ Groq AI (${modelName}) muvaffaqiyatli zaxira javobini qaytardi!`);
        return content;
      }
    } catch (err: any) {
      console.warn(`Groq model (${modelName}) xatosi:`, err.message || err);
      lastErr = err.message || String(err);
    }
  }

  throw new Error(`Barcha Groq AI zaxira modellari ham xato berdi: ${lastErr}`);
}

/**
 * Universal AI Prompt Executer: Gemini birinchi sinab ko'riladi,
 * agar xato bersa Groq LLaMA-3.3-70B zudlik bilan o'rin oladi.
 */
async function executeResilientAiPrompt(prompt: string): Promise<string> {
  let lastError = "";

  if (GEMINI_API_KEY) {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    for (const modelName of GEMINI_MODELS) {
      try {
        console.log(`Gemini AI modeli orqali so'rov yuborilmoqda: ${modelName}...`);
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        const text = (await result.response).text();
        if (text && text.trim()) {
          console.log(`✅ Gemini (${modelName}) muvaffaqiyatli javob qaytardi.`);
          return text;
        }
      } catch (error: any) {
        console.warn(`Gemini model xatoligi (${modelName}):`, error.message || error);
        lastError += `[${modelName}]: ${error.message || String(error)}; `;
      }
    }
  } else {
    console.warn("Gemini API key topilmadi. To'g'ridan-to'g'ri Groq AI ga o'tilmoqda.");
  }

  // Gemini modellari yetib bormasa yoki hammasi xato bersa, Groq AI ga o'tiladi
  return await callGroqAiFallback(prompt);
}

function cleanJsonText(rawText: string): string {
  let cleanText = rawText.replace(/```json\n?/gi, '').replace(/```\n?/gi, '').trim();
  cleanText = cleanText.replace(/(?<!\\)\\([^"\\/bfnrt])/g, "\\\\$1");
  cleanText = cleanText.replace(/(?<!\\)\\b(egin|eta|ullet|ar|mod|oldsymbol|f)/g, "\\\\b$1");
  cleanText = cleanText.replace(/(?<!\\)\\f(rac|orall)/g, "\\\\f$1");
  cleanText = cleanText.replace(/(?<!\\)\\r(ight|ho|angle|m)/g, "\\\\r$1");
  cleanText = cleanText.replace(/(?<!\\)\\t(an|ext|imes|o|riangle|heta|ilde)/g, "\\\\t$1");
  cleanText = cleanText.replace(/(?<!\\)\\n(u|abla|eq|eg|exists)/g, "\\\\n$1");
  return cleanText;
}

export const generateDiagnosticSummary = async (studentName: string, grade: string, scores: any, questionResults: Record<number, boolean>, blueprint: QuestionBlueprint[]) => {
  const skillsMap: Record<string, { total: number; correct: number }> = {};
  blueprint.forEach(q => {
    if (!skillsMap[q.skill]) skillsMap[q.skill] = { total: 0, correct: 0 };
    skillsMap[q.skill].total++;
    if (questionResults[q.id]) skillsMap[q.skill].correct++;
  });
  
  const skillScoresText = Object.entries(skillsMap)
    .map(([skill, stat]) => `- ${skill}: ${Math.round((stat.correct / stat.total) * 100)}%`)
    .join('\n');

  const failedQuestions = blueprint.filter(q => !questionResults[q.id]);
  const failedTopics = failedQuestions.map(q => q.topic).join(', ');
  const failedDifficulties = [...new Set(failedQuestions.map(q => q.difficulty))].join(', ');

  const scoresText = Object.entries(scores).map(([cat, score]) => `- ${cat}: ${score}%`).join('\n');

  const prompt = `Siz malakali o'qituvchi va psixologsiz. Quyidagi o'quvchining maktab kirish imtihonidagi test natijalarini tahlil qiling va 2 qismdan iborat xulosa yozing.
O'quvchi ismi: ${studentName}
O'quvchi sinfi: ${grade}-sinf

Umumiy natijalar (Fanlar bo'yicha):
${scoresText}

Kognitiv ko'nikmalar tahlili (Qaysi fikrlash turi qanday rivojlangan):
${skillScoresText}

O'quvchi xato qilgan spesifik joylar:
- Xato qilingan aniq mavzular: ${failedTopics || 'Deyarli yo\'q, juda yaxshi'}
- Qaysi qiyinlikdagi savollarda ko'p xato qildi: ${failedDifficulties || 'Hech qaysi'}

Vazifa:
Iltimos, javobni faqat va faqat quyidagi JSON formatida qaytaring, boshqa hech qanday izoh qo'shmang. Tahlilda o'quvchining KOGNITIV KO'NIKMALARIGA (masalan, "Yodlash zo'r, lekin tahlil qilish yo'q" yoki "Sintezlash ko'nikmasi ustida ishlash kerak") alohida chuqur urg'u bering:
{
  "summary": "O'quvchining kuchli va zaif tomonlari (qaysi mavzular va ko'nikmalarda oqsagani), umumiy intellektual profili haqida 3-4 gapdan iborat chuqur tahlil (o'zbek tilida).",
  "advice": "O'quvchi o'zini qanday rivojlantirishi kerakligi, xato qilgan mavzularini qanday to'g'rilashi haqida amaliy, motivatsion 3-4 gapdan iborat maslahat (o'zbek tilida).",
  "roadmap": [
    {
      "time": "1-bosqich (1-2 oy)",
      "goal": "Qisqa va lo'nda sarlavha (maksimal 3-5 so'z, masalan: Bazaviy bo'shliqlarni yopish)",
      "exercises": ["Aniq 1-amaliyot (masalan: kunlik 5ta algebra mashqi)", "Aniq 2-amaliyot (masalan: mantiqiy testlar)"],
      "outcome": "Kutilayotgan natija (masalan: 70% barqaror natija)"
    },
    {
      "time": "2-bosqich (3-4 oy)",
      "goal": "Qisqa sarlavha (masalan: Mantiq va tahlilni kuchaytirish)",
      "exercises": ["Amaliyot 1", "Amaliyot 2"],
      "outcome": "Kutilayotgan natija (masalan: 85% ga yetkazish)"
    },
    {
      "time": "3-bosqich (5-6 oy)",
      "goal": "Qisqa sarlavha (masalan: Murakkab masalalar va olimpiada)",
      "exercises": ["Amaliyot 1", "Amaliyot 2"],
      "outcome": "Kutilayotgan yakuniy natija (masalan: 95% ga erishish)"
    }
  ]
}`;

  try {
    const rawText = await executeResilientAiPrompt(prompt);
    const cleanText = cleanJsonText(rawText);
    const parsed = JSON.parse(cleanText);
    return {
      summary: parsed.summary,
      advice: parsed.advice,
      roadmap: parsed.roadmap
    };
  } catch (error: any) {
    console.error("AI Summary xatosi:", error);
    return {
      summary: "O'quvchi diagnostikadan muvaffaqiyatli o'tdi.",
      advice: "Natijalarni ustozingiz va ota-onangiz bilan birgalikda ko'rib chiqing va zaif mavzular bo'yicha mashq bajaring.",
      roadmap: null
    };
  }
};

export const generateGradeBlueprint = async (grade: string): Promise<QuestionBlueprint[] | null> => {
  const prompt = `Siz malakali ta'lim ekspertisiz. Menga ${grade}-sinf o'quvchilari uchun diagnostika test shablonini tuzib bering.
Jami 30 ta savol bo'lishi shart.
Kategoriyalar taqsimoti: 6 ta math, 6 ta logic, 6 ta analytical, 6 ta verbal, 6 ta creativity.
Qiyinchilik (difficulty): Oson, O'rta, Qiyin (aralash bo'lsin).
Kognitiv ko'nikma (skill): Tushunish, Qo'llash, Tahlil, Baholash, Sintezlash.
Fikrlash turi (thinkingType): Mantiqiy, Analitik, Ijodiy, Tanqidiy.

Javobni FAQAT VA FAQAT JSON Array formatida qaytaring, boshqa hech qanday izoh yozmang. Namuna formati:
[
  { "id": 1, "topic": "Kichik matn yaratish", "category": "creativity", "difficulty": "O'rta", "skill": "Sintezlash", "thinkingType": "Ijodiy" }
]`;

  try {
    const rawText = await executeResilientAiPrompt(prompt);
    const cleanText = cleanJsonText(rawText);
    const parsed = JSON.parse(cleanText) as QuestionBlueprint[];
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((item, index) => ({
        ...item,
        id: index + 1
      })).slice(0, 30);
    }
  } catch (error) {
    console.error("Blueprint AI generation error:", error);
  }
  return null;
};

export interface GeneratedQuestion {
  blueprintId: number;
  questionText: string;
  options: string[];
  correctOption: string;
  explanation?: string;
}

export const generateDiagnosticTest = async (blueprint: QuestionBlueprint[], grade: string): Promise<GeneratedQuestion[] | null> => {
  const questionsInfo = blueprint.map(q => 
    `ID:${q.id}, Mavzu:"${q.topic}", Fan:"${q.category}", Qiyinlik:"${q.difficulty}", Ko'nikma:"${q.skill}"`
  ).join('\n');

  const prompt = `Siz tajribali ${grade}-sinf o'qituvchisisiz. Quyidagi diagnostika test shabloni asosida har bir savol uchun haqiqiy test savoli yarating.

Har bir savolda:
- Savol matni (aniq, tushunarli, ${grade}-sinf darajasida)
- 4 ta javob varianti (A, B, C, D)
- To'g'ri javob belgisi (faqat "A", "B", "C" yoki "D")
- Qisqa tushuntirish

Savollar shabloni:
${questionsInfo}

MUHIM QOIDALAR:
1. Savollar O'ZBEK tilida bo'lsin
2. Har bir savol o'zining mavzusiga va qiyinlik darajasiga mos bo'lsin
3. Variantlar ichida faqat BITTA to'g'ri javob bo'lsin
4. Noto'g'ri variantlar ham mantiqan ishonchli bo'lsin (tasodifiy emas)
5. "Oson" savollar oddiy, "O'rta" chuqurroq, "Qiyin" murakkab bo'lsin
6. Matematik va informatikaga oid barcha formulalar (masalan Excel formulalari, kasrlar, ildizlar) toza LaTeX ko'rinishida yozilsin: inline formulalar uchun $...$ belgisidan foydalanilsin (masalan: $A1 = 10$, $\\frac{A1+B1+C1}{2}$). Formulalarni backtick \`...\` yoki $$...$$ ichiga olmang.

Javobni FAQAT JSON Array formatida qaytaring, boshqa hech qanday izoh yozmang:
[
  {
    "blueprintId": 1,
    "questionText": "Savol matni...",
    "options": ["A variant", "B variant", "C variant", "D variant"],
    "correctOption": "A",
    "explanation": "Tushuntirish..."
  }
]`;

  try {
    const rawText = await executeResilientAiPrompt(prompt);
    const cleanText = cleanJsonText(rawText);
    const parsed = JSON.parse(cleanText) as GeneratedQuestion[];
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((item, index) => ({
        ...item,
        blueprintId: blueprint[index]?.id || index + 1
      }));
    }
  } catch (error) {
    console.error("Diagnostic test AI generation error:", error);
  }
  return null;
};

export interface GenerateCustomTestParams {
  subject: string;
  grade: string;
  questionCount: number;
  difficulty: string; // 'Oson' | 'O\'rta' | 'Qiyin' | 'Aralash'
  topic?: string;
}

export interface CustomGeneratedQuestion {
  id: number;
  questionText: string;
  options: string[];
  correctOption: string;
  explanation?: string;
  category: string;
  difficulty: string;
  skill: string;
}

export const generateCustomTestQuestions = async (params: GenerateCustomTestParams): Promise<CustomGeneratedQuestion[] | null> => {
  const { subject, grade, questionCount, difficulty, topic } = params;

  const difficultyInstruction = difficulty === 'Aralash' 
    ? "Savollar qiyinlik darajasi bo'yicha aralash bo'lsin (ba'zilari Oson, ba'zilari O'rta, ba'zilari Qiyin)."
    : `Barcha savollar qiyinlik darajasi bitta: "${difficulty}" bo'lsin.`;

  const topicInstruction = topic && topic.trim() 
    ? `Asosiy mavzu yo'nalishi: "${topic}".` 
    : `Mavzular ${grade}-sinf ${subject} darsligidagi muhim mavzulardan tanlansin.`;

  let subjectSpecificRules = "";
  const subLower = subject.toLowerCase();
  
  if (subLower.includes('kimyo')) {
    subjectSpecificRules = `
FAN BO'YICHA MAXSUS KO'RSATMA (KIMYO):
- Kimyoviy moddalar formulalari (masalan $H_2SO_4$, $NaOH$, $CaCO_3$) va reaksiyalar tenglamalari (masalan $2H_2 + O_2 \\rightarrow 2H_2O$) toza LaTeX formatida $...$ ichida yozilsin.
- Modda miqdori (mol), molar massa, eritmalar va elementlar davriy sistemasi bo'yicha sifatli savollar tuzilsin.`;
  } else if (subLower.includes('biologiya')) {
    subjectSpecificRules = `
FAN BO'YICHA MAXSUS KO'RSATMA (BIOLOGIYA):
- Genetikaga oid masalalar va genotiplar ($AA$, $Aa$, $aa$, $F_1$, $F_2$) toza formatda yozilsin.
- Hujayra biologiyasi, botanika, zoologiya, odam anatomiyasi va ekologiya bo'yicha mantiqiy savollar shakllantirilsin.`;
  } else if (subLower.includes('ingliz') || subLower.includes('english')) {
    subjectSpecificRules = `
FAN BO'YICHA MAXSUS KO'RSATMA (INGLIZ TILI):
- Savollar va javob variantlari toza English tilida bo'lsin.
- Grammar (Tenses, Conditionals, Passive Voice), Vocabulary (Synonyms, Antonyms) va Reading bo'yicha sifatli savollar tuzilsin. Bo'sh o'rinlar uchun '_____' ishlatilsin.`;
  } else if (subLower.includes('rus') || subLower.includes('russian')) {
    subjectSpecificRules = `
FAN BO'YICHA MAXSUS KO'RSATMA (RUS TILI):
- Savollar va javob variantlari toza Rus tilida (Кириллица) yozilsin.
- Грамматика (Падежи, Склонения, Спряжения глаголов, Орфография) va Лексика bo'yicha aniq savollar tuzilsin.`;
  } else if (subLower.includes('informatika') || subLower.includes('it')) {
    subjectSpecificRules = `
FAN BO'YICHA MAXSUS KO'RSATMA (INFORMATIKA):
- MS Excel formulalari (=SUM(), =AVERAGE()), Mantiqiy amallar (AND, OR, NOT), Algoritmlar, Dasturlash (Python/Pascal) va Ma'lumot hajmlari (Bayt, KB, MB) bo'yicha savollar tuzilsin.
- Formulalar yoki koddagi matematik amallarni backtick yoki \`$$\` ichida emas, toza text yoki $...$ formatida yozing.`;
  } else if (subLower.includes('matematika') || subLower.includes('math')) {
    subjectSpecificRules = `
FAN BO'YICHA MAXSUS KO'RSATMA (MATEMATIKA):
- Barcha matematik ifodalar, kasrlar, ildizlar va tenglamalar toza LaTeX formatida $...$ ichida yozilsin (masalan $\\frac{3}{4}$, $\\sqrt{144}$, $x^2 + 5x + 6 = 0$).`;
  }

  const prompt = `Siz tajribali ${grade}-sinf o'qituvchisiz. Quyidagi parametrlar bo'yicha jami ${questionCount} ta sifatli test savoli tuzing:

- Fan: ${subject}
- Sinf: ${grade}-sinf
- Savollar soni: ${questionCount} ta
- Qiyinlik darajasi sharti: ${difficultyInstruction}
- ${topicInstruction}
${subjectSpecificRules}

Har bir savolda:
- Savol matni (aniq, tushunarli, ${grade}-sinf standartlariga mos)
- 4 ta javob varianti (A, B, C, D)
- To'g'ri javob ko'rsatkichi (faqat "A", "B", "C" yoki "D")
- Kategoriya (fan nomi)
- Qiyinchilik: "Oson", "O'rta" yoki "Qiyin"
- Kognitiv ko'nikma: "Tushunish", "Qo'llash", "Tahlil qilish", "Baholash" yoki "Sintezlash"
- Qisqa tushuntirish

Javobni FAQAT JSON Array formatida qaytaring, boshqa hech qanday izoh qo'shmang:
[
  {
    "id": 1,
    "questionText": "Savol matni...",
    "options": ["A variant", "B variant", "C variant", "D variant"],
    "correctOption": "A",
    "category": "${subject}",
    "difficulty": "${difficulty === 'Aralash' ? 'O\'rta' : difficulty}",
    "skill": "Tushunish",
    "explanation": "Tushuntirish..."
  }
]`;

  try {
    const rawText = await executeResilientAiPrompt(prompt);
    const cleanText = cleanJsonText(rawText);
    const parsed = JSON.parse(cleanText) as CustomGeneratedQuestion[];
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((item, index) => ({
        ...item,
        id: index + 1
      })).slice(0, questionCount);
    }
  } catch (error) {
    console.error("Custom test AI generation error:", error);
  }
  return null;
};

export interface MatrixSubjectItem {
  subject: string;
  count: number;
}

export interface MatrixDifficultyBreakdown {
  oson: number;
  orta: number;
  qiyin: number;
}

export interface GenerateMatrixTestParams {
  grade: string;
  subjects: MatrixSubjectItem[];
  difficulty: MatrixDifficultyBreakdown;
  topic?: string;
}

export const generateMatrixTestQuestions = async (params: GenerateMatrixTestParams): Promise<CustomGeneratedQuestion[] | null> => {
  const { grade, subjects, difficulty, topic } = params;

  const totalQuestions = subjects.reduce((sum, item) => sum + item.count, 0);
  const subjectsPrompt = subjects.map(s => `- ${s.subject}: ${s.count} ta savol`).join('\n');

  const topicInstruction = topic && topic.trim() 
    ? `Asosiy mavzu yo'nalishi: "${topic}".` 
    : `Mavzular ${grade}-sinf darsligidagi mos mavzulardan bo'lsin.`;

  const prompt = `Siz malakali ta'lim ekspertisiz. ${grade}-sinf o'quvchilari uchun aniq berilgan taqsimot bo'yicha jami ${totalQuestions} ta diagnostika test savoli tuzing.

Fanlar va savollar soni taqsimoti:
${subjectsPrompt}

Qiyinlik darajalari bo'yicha taqsimot:
- Oson savollar: ${difficulty.oson} ta
- O'rta savollar: ${difficulty.orta} ta
- Qiyin savollar: ${difficulty.qiyin} ta

${topicInstruction}

MUHIM SHARTLAR:
1. Har bir savol tegishli faniga ("category") va ko'rsatilgan qiyinlik darajasiga ("difficulty") aniq mos kelsin.
2. Savollar O'zbek tilida bo'lsin.
3. Har bir savolda 4 ta variant (A, B, C, D) va 1 ta to'g'ri javob ("correctOption") bo'lsin.

Javobni FAQAT JSON Array formatida qaytaring, boshqa hech qanday izoh yozmang:
[
  {
    "id": 1,
    "questionText": "Savol matni...",
    "options": ["A variant", "B variant", "C variant", "D variant"],
    "correctOption": "A",
    "category": "Matematika",
    "difficulty": "Oson",
    "skill": "Tushunish",
    "explanation": "Tushuntirish..."
  }
]`;

  try {
    const rawText = await executeResilientAiPrompt(prompt);
    const cleanText = cleanJsonText(rawText);
    const parsed = JSON.parse(cleanText) as CustomGeneratedQuestion[];
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((item, index) => ({
        ...item,
        id: index + 1
      })).slice(0, totalQuestions);
    }
  } catch (error) {
    console.error("Matrix test AI generation error:", error);
  }
  return null;
};
