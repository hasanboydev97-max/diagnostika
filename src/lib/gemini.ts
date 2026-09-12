import type { QuestionBlueprint } from './blueprint';

/**
 * agar xato bersa Groq LLaMA-3.3-70B zudlik bilan o'rin oladi.
 * Endi barcha xavfsizlik orqa fonda (backend) ta'minlanadi.
 */
async function executeResilientAiPrompt(prompt: string): Promise<string> {
  try {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const response = await fetch(`${apiUrl}/ai/generate-text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ prompt })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || `HTTP error ${response.status}`);
    }

    const data = await response.json();
    return data.text || '';
  } catch (error) {
    console.error("Backend AI /api/ai/generate-text xatosi:", error);
    throw error;
  }
}

function cleanJsonText(rawText: string): string {
  let cleanText = rawText.replace(/```json\n?/gi, '').replace(/```\n?/gi, '').trim();
  
  // Find the first { or [ and the last } or ] to extract only the JSON part
  const firstBrace = cleanText.indexOf('{');
  const firstBracket = cleanText.indexOf('[');
  let startIndex = -1;
  if (firstBrace !== -1 && firstBracket !== -1) {
    startIndex = Math.min(firstBrace, firstBracket);
  } else if (firstBrace !== -1) {
    startIndex = firstBrace;
  } else if (firstBracket !== -1) {
    startIndex = firstBracket;
  }
  
  if (startIndex !== -1) {
    const isObject = cleanText[startIndex] === '{';
    const lastIndex = cleanText.lastIndexOf(isObject ? '}' : ']');
    if (lastIndex !== -1 && lastIndex >= startIndex) {
      cleanText = cleanText.substring(startIndex, lastIndex + 1);
    }
  }

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

QO'SHIMCHA QOIDALAR:
1. Mavzular (topic) mutlaqo takrorlanmasin. Har bir savol uchun o'ziga xos noyob mavzu tanlansin.

Javobni FAQAT VA FAQAT JSON Array formatida qaytaring, boshqa hech qanday izoh yozmang. Namuna formati:
[
  { "id": 1, "topic": "Kichik matn yaratish", "category": "creativity", "difficulty": "O'rta", "skill": "Sintezlash", "thinkingType": "Ijodiy" }
]`;

  try {
    const rawText = await executeResilientAiPrompt(prompt);
    const cleanText = cleanJsonText(rawText);
    // BUG #3 FIX: JSON.parse try/catch ichida
    let parsed: QuestionBlueprint[];
    try {
      parsed = JSON.parse(cleanText) as QuestionBlueprint[];
    } catch (parseErr) {
      console.error('Blueprint JSON parse xatosi:', parseErr);
      // BUG #7 FIX: null qaytarish o'rniga error throw — frontend toast ko'rsata oladi
      throw new Error("AI javobi noto'g'ri formatda. Iltimos qayta urinib ko'ring.");
    }
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((item, index) => ({
        ...item,
        id: index + 1
      })).slice(0, 30);
    }
    throw new Error("AI bo'sh savol shabloni qaytardi. Qayta urinib ko'ring.");
  } catch (error) {
    console.error("Blueprint AI generation error:", error);
    throw error; // BUG #7 FIX: caller ga error yetkaziladi
  }
};

export interface GeneratedQuestion {
  blueprintId: number;
  questionText: string;
  options: string[];
  correctOption: string;
  explanation?: string;
}

export const generateDiagnosticTest = async (blueprint: QuestionBlueprint[], grade: string, language: string = 'o\'zbek'): Promise<GeneratedQuestion[] | null> => {
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

ASOSIY QOIDALAR (Majburiy):
1. TIL VA MOSLIK: Savollar qat'iyan ${language.toUpperCase()} tilida bo'lsin. Har bir savol o'zining mavzusiga, kognitiv ko'nikmasiga va qiyinlik darajasiga mos kelsin.
2. YAGONA TO'G'RI JAVOB: Har bir savolning faqat bitta shubhasiz to'g'ri javobi bo'lishi shart. Agar matnda ikki xil talqin qilinadigan tushuncha bo'lsa, aniqlashtiring.
3. DISTRAKTORLAR SIFATI: Noto'g'ri variantlar (distraktorlar) mantiqan yaqin, lekin aniq noto'g'ri bo'lsin. Tasodifiy emas, balki tipik xatoni aks ettirsin. Barcha variantlar bir-biridan farq qilsin.
4. TUSHUNISHNI TEKSHIRING: Berilgan ma'lumotni shunchaki qaytarib so'raydigan yuzaki savollardan qoching.
5. NOYOB KO'NIKMA: Savollar matni, sonlar, muammolar va variantlar 100% noyob bo'lishi KAFOLATLANSIN. Hech bir savol boshqasini takrorlamasin!

O'Z-O'ZINI TEKSHIRISH (Self-Review):
1. Bu savolning faqat bitta to'g'ri javobi bormi?
2. Savol matni ko'p ma'nolimi?
3. Kalit javob 100% mosmi?
4. Matematik ifodalar qat'iy $...$ va to'g'ri LaTeX escape (masalan \\sqrt) bilan yozildimi? Xato (sqrt2 kabi) yozilmadimi?
Agar kamchilik topsangiz, uni darhol to'g'rilab JSONga kiriting.

TEXNIK VA FORMATLASH QOIDALARI:
1. QAT'IY LATEX FORMATI (CRITICAL): Matematika, fizika va kimyo formulalari MUTLAQO to'g'ri LaTeX sintaksisi bilan yozilishi shart. Barcha matematik ifodalarni, sonlarni, ildizlarni $...$ ichiga oling!
   - Noto'g'ri: 3sqrt8, sqrt18, frac1sqrt5-sqrt3, x^2, cosalpha, a_1
   - To'g'ri: $3\\\\sqrt{8}$, $\\\\sqrt{18}$, $\\\\frac{1}{\\\\sqrt{5}} - \\\\sqrt{3}$, $x^2$, $\\\\cos\\\\alpha$, $a_1$
2. JSON ESCAPE (LATEX): Matematik formulalarda standart bitta backslash (\\) ishlatiladi (masalan: \\frac, \\sqrt, \\alpha). Lekin siz JSON qaytarayotganingiz uchun, JSON sintaksisi buzilmasligi maqsadida ularni string ichida escape qiling (ya'ni qo'shaloq \\\\ qilib yozing). Natijada JSON parse qilingandan keyin kodda bitta backslash qolishi kerak.
3. NEVER put newlines (\\n) inside math mode. Math MUST be on a single line.

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
    // BUG #3 FIX: JSON.parse try/catch ichida
    let parsed: GeneratedQuestion[];
    try {
      parsed = JSON.parse(cleanText) as GeneratedQuestion[];
    } catch (parseErr) {
      console.error('DiagnosticTest JSON parse xatosi:', parseErr);
      throw new Error("AI javobi noto'g'ri formatda. Iltimos qayta urinib ko'ring.");
    }
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((item, index) => ({
        ...item,
        blueprintId: blueprint[index]?.id || index + 1
      }));
    }
    throw new Error("AI bo'sh test qaytardi. Qayta urinib ko'ring.");
  } catch (error) {
    console.error("Diagnostic test AI generation error:", error);
    throw error; // BUG #7 FIX
  }
};

export interface GenerateCustomTestParams {
  subject: string;
  grade: string;
  questionCount: number;
  difficulty: string; // 'Oson' | 'O\'rta' | 'Qiyin' | 'Aralash'
  topic?: string;
  language?: string;
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
  const { subject, grade, questionCount, difficulty, topic, language = 'O\'zbek' } = params;

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
- Til: ${language}
- Qiyinlik darajasi sharti: ${difficultyInstruction}
- ${topicInstruction}
${subjectSpecificRules}

ASOSIY QOIDALAR (Majburiy):
1. YAGONA TO'G'RI JAVOB: Har bir savolning faqat bitta shubhasiz to'g'ri javobi bo'lishi shart. Agar matnda ikki xil talqin qilinadigan tushuncha bo'lsa, aniqlashtiring.
2. DISTRAKTORLAR SIFATI: Noto'g'ri variantlar (distraktorlar) mantiqan yaqin, lekin aniq noto'g'ri bo'lsin. Tasodifiy emas, balki tipik xatoni aks ettirsin. Barcha variantlar bir-biridan farq qilsin.
3. TUSHUNISHNI TEKSHIRING: O'quvchini tahlil qilishga majbur qiling, yuzaki va yodlangan faktlarni quruq so'rashdan qoching.
4. XATOSIZLIK VA ANIKLIK: Barcha faktlar, formulalar va ma'lumotlar 100% ilmiy to'g'ri va aniq bo'lishi KAFOLATLANSIN.
5. NOYOB KO'NIKMA: Savollar matni, sonlar, muammolar va variantlar 100% noyob bo'lishi KAFOLATLANSIN. Hech bir savol boshqasini takrorlamasin!

O'Z-O'ZINI TEKSHIRISH (Self-Review):
1. Bu savolning faqat bitta to'g'ri javobi bormi?
2. Savol matni ko'p ma'nolimi?
3. Kalit javob 100% mosmi?
4. Matematik ifodalar qat'iy $...$ va to'g'ri LaTeX escape (masalan \\sqrt) bilan yozildimi? Xato (sqrt2 kabi) yozilmadimi?
Agar kamchilik topsangiz, uni darhol to'g'rilab JSONga kiriting.

TEXNIK VA FORMATLASH QOIDALARI:
1. QAT'IY LATEX FORMATI (CRITICAL): Matematika, fizika va kimyo formulalari MUTLAQO to'g'ri LaTeX sintaksisi bilan yozilishi shart. Barcha matematik ifodalarni, sonlarni, ildizlarni $...$ ichiga oling!
   - Noto'g'ri: 3sqrt8, sqrt18, frac1sqrt5-sqrt3, x^2, cosalpha, a_1
   - To'g'ri: $3\\\\sqrt{8}$, $\\\\sqrt{18}$, $\\\\frac{1}{\\\\sqrt{5}} - \\\\sqrt{3}$, $x^2$, $\\\\cos\\\\alpha$, $a_1$
2. JSON ESCAPE (LATEX): Matematik formulalarda standart bitta backslash (\\) ishlatiladi (masalan: \\frac, \\sqrt, \\alpha). Lekin siz JSON qaytarayotganingiz uchun, JSON sintaksisi buzilmasligi maqsadida ularni string ichida escape qiling (ya'ni qo'shaloq \\\\ qilib yozing). Natijada JSON parse qilingandan keyin kodda bitta backslash qolishi kerak.
3. PROGRESSIYA QOIDASI: Agar mavzu Arifmetik yoki Geometrik progressiya bo'lsa, qaysi turdaligini matnda aniq yozing.
4. NEVER put newlines (\\n) inside math mode. Inline and block math MUST be on a single line.

Har bir savolda quyidagilar bo'lishi shart:
- Savol matni (aniq, tushunarli, chuqur ma'noli va mutlaqo xatosiz)
- 4 ta javob varianti (A, B, C, D)
- To'g'ri javob ko'rsatkichi (faqat "A", "B", "C" yoki "D")
- Kategoriya (fan nomi)
- Qiyinchilik: "Oson", "O'rta" yoki "Qiyin"
- Kognitiv ko'nikma: "Tushunish", "Qo'llash", "Tahlil qilish", "Baholash" yoki "Sintezlash"
- Qisqa tushuntirish (javob nima uchun to'g'riligini isbotlovchi, xatosiz matn)

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
    // BUG #3 FIX: JSON.parse try/catch ichida
    let parsed: CustomGeneratedQuestion[];
    try {
      parsed = JSON.parse(cleanText) as CustomGeneratedQuestion[];
    } catch (parseErr) {
      console.error('CustomTest JSON parse xatosi:', parseErr);
      throw new Error("AI javobi noto'g'ri formatda. Iltimos qayta urinib ko'ring.");
    }
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((item, index) => ({
        ...item,
        id: index + 1
      })).slice(0, questionCount);
    }
    throw new Error("AI bo'sh test qaytardi. Qayta urinib ko'ring.");
  } catch (error) {
    console.error("Custom test AI generation error:", error);
    throw error; // BUG #7 FIX
  }
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
  language?: string;
}

export const generateMatrixTestQuestions = async (params: GenerateMatrixTestParams): Promise<CustomGeneratedQuestion[] | null> => {
  const { grade, subjects, difficulty, topic, language = 'O\'zbek' } = params;

  const totalQuestions = subjects.reduce((sum, item) => sum + item.count, 0);
  const subjectsPrompt = subjects.map(s => `- ${s.subject}: ${s.count} ta savol`).join('\n');

  const topicInstruction = topic && topic.trim() 
    ? `Asosiy mavzu yo'nalishi: "${topic}".` 
    : `Mavzular ${grade}-sinf darsligidagi mos mavzulardan bo'lsin.`;

  const prompt = `Siz malakali ta'lim ekspertisiz. ${grade}-sinf o'quvchilari uchun aniq berilgan taqsimot bo'yicha jami ${totalQuestions} ta diagnostika test savoli tuzing.

Til: ${language}

Fanlar va savollar soni taqsimoti:
${subjectsPrompt}

Qiyinlik darajalari bo'yicha taqsimot:
- Oson savollar: ${difficulty.oson} ta
- O'rta savollar: ${difficulty.orta} ta
- Qiyin savollar: ${difficulty.qiyin} ta

${topicInstruction}

ASOSIY QOIDALAR (Majburiy):
1. YAGONA TO'G'RI JAVOB: Har bir savolning faqat bitta shubhasiz to'g'ri javobi bo'lishi shart. Agar matnda ikki xil talqin qilinadigan tushuncha bo'lsa, aniqlashtiring.
2. DISTRAKTORLAR SIFATI: Noto'g'ri variantlar (distraktorlar) mantiqan yaqin, lekin aniq noto'g'ri bo'lsin. Tasodifiy emas, balki tipik xatoni aks ettirsin. Barcha variantlar bir-biridan farq qilsin.
3. TUSHUNISHNI TEKSHIRING: O'quvchini tahlil qilishga majbur qiling, yuzaki va yodlangan faktlarni quruq so'rashdan qoching.
4. MOSLIK: Har bir savol tegishli faniga ("category") va ko'rsatilgan qiyinlik darajasiga ("difficulty") aniq mos kelsin. Savollar ${language} tilida bo'lsin.
5. NOYOB KO'NIKMA: Savollar matni, sonlar, muammolar va variantlar 100% noyob bo'lishi KAFOLATLANSIN. Hech bir savol boshqasini takrorlamasin!

O'Z-O'ZINI TEKSHIRISH (Self-Review):
1. Bu savolning faqat bitta to'g'ri javobi bormi?
2. Savol matni ko'p ma'nolimi?
3. Kalit javob 100% mosmi?
4. Matematik ifodalar qat'iy $...$ va to'g'ri LaTeX escape (masalan \\sqrt) bilan yozildimi? Xato (sqrt2 kabi) yozilmadimi?
Agar kamchilik topsangiz, uni darhol to'g'rilab JSONga kiriting.

TEXNIK VA FORMATLASH QOIDALARI:
1. QAT'IY LATEX FORMATI (CRITICAL): Matematika, fizika va kimyo formulalari MUTLAQO to'g'ri LaTeX sintaksisi bilan yozilishi shart. Barcha matematik ifodalarni, sonlarni, ildizlarni $...$ ichiga oling!
   - Noto'g'ri: 3sqrt8, sqrt18, frac1sqrt5-sqrt3, x^2, cosalpha, a_1
   - To'g'ri: $3\\\\sqrt{8}$, $\\\\sqrt{18}$, $\\\\frac{1}{\\\\sqrt{5}} - \\\\sqrt{3}$, $x^2$, $\\\\cos\\\\alpha$, $a_1$
2. JSON ESCAPE (LATEX): Matematik formulalarda standart bitta backslash (\\) ishlatiladi (masalan: \\frac, \\sqrt, \\alpha). Lekin siz JSON qaytarayotganingiz uchun, JSON sintaksisi buzilmasligi maqsadida ularni string ichida escape qiling (ya'ni qo'shaloq \\\\ qilib yozing). Natijada JSON parse qilingandan keyin kodda bitta backslash qolishi kerak.
3. PROGRESSIYA QOIDASI: Agar mavzu Arifmetik yoki Geometrik progressiya bo'lsa, qaysi turdaligini matnda aniq yozing.
4. NEVER put newlines (\\n) inside math mode. Inline and block math MUST be on a single line.

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
    // BUG #3 FIX: JSON.parse try/catch ichida
    let parsed: CustomGeneratedQuestion[];
    try {
      parsed = JSON.parse(cleanText) as CustomGeneratedQuestion[];
    } catch (parseErr) {
      console.error('MatrixTest JSON parse xatosi:', parseErr);
      throw new Error("AI javobi noto'g'ri formatda. Iltimos qayta urinib ko'ring.");
    }
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((item, index) => ({
        ...item,
        id: index + 1
      })).slice(0, totalQuestions);
    }
    throw new Error("AI bo'sh test qaytardi. Qayta urinib ko'ring.");
  } catch (error) {
    console.error("Matrix test AI generation error:", error);
    throw error; // BUG #7 FIX
  }
};

export interface ClassAnalysisResult {
  generalIssues: string;
  studentBreakdowns: { name: string; score: number; feedback: string }[];
  handbook: { question: string; correctAnswer: string; explanation: string }[];
}

export const generateClassAnalysis = async (
  testTitle: string,
  questions: any[] = [],
  results: any[] = []
): Promise<ClassAnalysisResult> => {
  const prompt = `Sen tajribali metotistsan.
"${testTitle}" testi bo'yicha sinf natijalari va savollar berilgan. QAT'IY JSON formatda qisqa xulosa ber.

Savollar:
${JSON.stringify((questions || []).map((q: any) => {
  let correctText = q.correctOption;
  if (q.options && q.correctOption) {
    const idx = q.correctOption.charCodeAt(0) - 65;
    if (idx >= 0 && idx < q.options.length) correctText = q.options[idx];
  }
  return {
    question: q.questionText || q.topic || 'Nomalum savol',
    correctAnswer: correctText
  };
}).slice(0, 10), null, 2)}

O'quvchilar:
${JSON.stringify((results || []).map(r => ({
  name: r.studentName,
  score: Math.round(((r.score || 0) / (r.totalScore || Math.max(r.score || 1, 1))) * 100) // BUG #10 FIX: doim 100% lik shkalada beramiz
})).slice(0, 15), null, 2)}

QAT'IY JSON obyekti qaytar (faqat JSON, hech qanday qo'shimcha matnsiz):
{
  "generalIssues": "Umumiy muammolar haqida qisqacha 2 gaplik xulosa.",
  "studentBreakdowns": [
    {
      "name": "O'quvchi ismi",
      "score": 80, // Foizdagi natija (100 dan)
      "feedback": "Qisqa individual tavsiya (1 gap)"
    }
  ],
  "handbook": [
    {
      "question": "Savol",
      "correctAnswer": "Javob",
      "explanation": "Nega shu javob to'g'riligi (1 gapda)"
    }
  ]
}
`;

  const responseText = await executeResilientAiPrompt(prompt);
  if (!responseText || responseText.trim().length === 0) {
    throw new Error("AI bo'sh javob qaytardi. Iltimos qayta urinib ko'ring.");
  }

  const cleaned = cleanJsonText(responseText);

  try {
    return JSON.parse(cleaned) as ClassAnalysisResult;
  } catch (parseErr) {
    console.error('[generateClassAnalysis] JSON parse xatosi. Raw text:', responseText.slice(0, 300));
    throw new Error("AI javobi noto'g'ri formatda. Iltimos qayta urinib ko'ring.");
  }
};
