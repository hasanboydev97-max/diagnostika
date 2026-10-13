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
Iltimos, javobni faqat va faqat quyidagi JSON formatida qaytaring, boshqa hech qanday izoh qo'shmang. Tahlilda o'quvchining KOGNITIV KO'NIKMALARIGA (masalan, "Yodlash zo'r, lekin tahlil qilish yo'q") alohida chuqur urg'u bering. Matn ichida hech qachon qochirilmagan qo'shtirnoq (") ishlatmang, uning o'rniga yakkalik qo'shtirnoq (') ishlating:
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
- 4 ta javob varianti (ularning boshiga A, B, C, D deb yozmang, faqat javob matnini o'zini yozing)
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
6. KOD VA TEGLAR FORMATI: Har qanday dasturlash kodi, HTML teglar (masalan <h1>, <p>), CSS selektorlar (#, .) va maxsus simvollar mutlaqo backtick (\`) ichiga olinishi shart (masalan: \`<h1>\`, \`#menu\`). Yalang'och HTML teglar yozish qat'iyan man etiladi. Barcha kodlar sintaktik jihatdan 100% xatosiz bo'lsin.

O'Z-O'ZINI TEKSHIRISH (Self-Review):
1. Bu savolning faqat bitta to'g'ri javobi bormi?
2. Savol matni ko'p ma'nolimi?
3. Kalit javob 100% mosmi? (Agar Excel, MS Word yoki Matematik/Mantiqiy savol bo'lsa, qator/ustun/harf/raqamlarni adashtirmasdan 100% ishonch hosil qiling).
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
    "options": ["1-variant matni", "2-variant matni", "3-variant matni", "4-variant matni"],
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
  } else if (subLower.includes('informatika') || subLower.includes('it') || subLower.includes('web') || subLower.includes('dasturlash')) {
    subjectSpecificRules = `
FAN BO'YICHA MAXSUS KO'RSATMA (INFORMATIKA VA DASTURLASH):
- Tarmoqlar, Dasturlash (Python/C++/JS), Web texnologiyalar (HTML/CSS) va MS Office (Excel, Word) bo'yicha yuqori sifatli savollar tuzilsin.
- Dasturlash kodlari, HTML teglar, CSS selektorlar va maxsus simvollar mutlaqo backtick (\`) ichida yozilishi shart.
- Diqqat! MS Excel savollarida ustunlar harflar (A=1, B=2, C=3, D=4, E=5, F=6, G=7) va satrlar raqamlar (1, 2, 3) bilan belgilanishini adashtirmang (Masalan, 4-ustun va 7-satr bu G4 emas, balki D7). Barcha faktlarni 100% to'g'riligini tasdiqlang.`;
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
6. KOD VA TEGLAR FORMATI: Har qanday dasturlash kodi, HTML teglar (masalan <h1>, <p>), CSS selektorlar (#, .) va maxsus simvollar mutlaqo backtick (\`) ichiga olinishi shart (masalan: \`<h1>\`, \`#menu\`). Yalang'och HTML teglar yozish qat'iyan man etiladi. Barcha kodlar sintaktik jihatdan 100% xatosiz bo'lsin.

O'Z-O'ZINI TEKSHIRISH (Self-Review):
1. Bu savolning faqat bitta to'g'ri javobi bormi?
2. Savol matni ko'p ma'nolimi?
3. Kalit javob 100% mosmi? (Agar Excel, MS Word yoki Matematik/Mantiqiy savol bo'lsa, qator/ustun/harf/raqamlarni adashtirmasdan 100% ishonch hosil qiling).
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
- 4 ta javob varianti (ularning boshiga A, B, C, D deb yozmang, faqat javob matnini o'zini yozing)
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
    "options": ["1-variant matni", "2-variant matni", "3-variant matni", "4-variant matni"],
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
6. KOD VA TEGLAR FORMATI: Har qanday dasturlash kodi, HTML teglar (masalan <h1>, <p>), CSS selektorlar (#, .) va maxsus simvollar mutlaqo backtick (\`) ichiga olinishi shart (masalan: \`<h1>\`, \`#menu\`). Yalang'och HTML teglar yozish qat'iyan man etiladi. Barcha kodlar sintaktik jihatdan 100% xatosiz bo'lsin.

O'Z-O'ZINI TEKSHIRISH (Self-Review):
1. Bu savolning faqat bitta to'g'ri javobi bormi?
2. Savol matni ko'p ma'nolimi?
3. Kalit javob 100% mosmi? (Agar Excel, MS Word yoki Matematik/Mantiqiy savol bo'lsa, qator/ustun/harf/raqamlarni adashtirmasdan 100% ishonch hosil qiling).
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
    "options": ["1-variant matni", "2-variant matni", "3-variant matni", "4-variant matni"],
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

export interface CurriculumTopicInsight {
  topic: string;
  category?: string;
  whyItMattersForChild: string;
  realWorldApplication: string;
  cognitiveBenefits: string;
  successMetric: string;
}

export interface StudentRoadmapStep {
  phase: string;
  duration: string;
  focus: string;
  actions: string[];
  parentTip: string;
  expectedOutcome: string;
}

export interface StudentAnalysis {
  name: string;
  scorePercent: number;
  scoreRaw: string;
  level: 'yuqori' | 'yaxshi' | 'o\'rta' | 'zaif' | 'juda zaif';
  strengths: string[];
  weaknesses: string[];
  personalityInsight: string;
  parentReport: string;
  immediateActions: string[];
  roadmap: StudentRoadmapStep[];
}

export interface ClassAnalysisResult {
  testTitle: string;
  analyzedAt: string;
  classOverview: {
    totalStudents: number;
    rawSubmissionsCount: number;
    duplicatesRemovedCount: number;
    averageScore: number;
    passCount: number;
    failCount: number;
    topPerformer: string;
    needsAttention: string[];
    classStrengths: string[];
    classWeaknesses: string[];
    teacherRecommendations: string[];
  };
  curriculumTopics: CurriculumTopicInsight[];
  studentAnalyses: StudentAnalysis[];
  handbook: { question: string; correctAnswer: string; explanation: string; commonMistake: string }[];
  generalIssues: string;
  studentBreakdowns: { name: string; score: number; feedback: string }[];
}

/**
 * 20 yillik tajribali arxitektor darajasidagi ma'lumotlarni tozalash va dublikatlarni birlashtirish funksiyasi.
 * - Test/dummy/soxta ismlarni chiqarib tashlaydi ('massalan', 'test', 'demo', 'admin', 'sinov' va h.k.)
 * - Sinf, imtihon va boshqa qo'shimchalarni tozalaydi ('7-blue', '6haftali imtihon' ...)
 * - Ism-familiya teskari yozilgan dublikatlarni aniqlaydi ('Fotima Abbasova' == 'Abbasova Fotima')
 * - Bir o'quvchi bir necha marta topshirgan bo'lsa, eng yuqori (eng yaxshi) ballini saqlab qoladi!
 */
export function sanitizeAndDeduplicateStudents(results: any[]): {
  cleanedList: { name: string; score: number; totalScore: number; percent: number }[];
  rawCount: number;
  dedupedCount: number;
} {
  const rawList = results || [];
  const rawCount = rawList.length;

  const JUNK_NAME_REGEX = /^(massalan|test|demo|sinov|admin|namuna|example|proverka|temp|check|asdf|qwerty|tekshiruv|o['`]?quvchi|\d+|sample)$/i;

  interface CleanedCandidate {
    normalizedKey: string;
    displayName: string;
    score: number;
    totalScore: number;
    percent: number;
  }

  const mapByNormalizedKey = new Map<string, CleanedCandidate>();

  for (const item of rawList) {
    let rawName = (item.studentName || item.name || '').trim();
    if (!rawName) continue;

    // 1. Matnni keraksiz metadata va qo'shimchalardan tozalash
    let cleaned = rawName
      .replace(/\s*\(\s*ball:?\s*\d+\s*\)/gi, '') // "(Ball: 60)"
      .replace(/\b\d+[-_]?[a-zA-Z]+\b/gi, '') // "7-blue", "6a"
      .replace(/\b\d+[-_]?haftali\b/gi, '') // "6haftali"
      .replace(/\b(sinf|guruhi?|imtihon|test|nazorat|yakuniy|maktab|hafta)\b/gi, '')
      .replace(/[^\p{L}\s'-]/gu, '') // Raqam va maxsus belgilarni tozalash
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleaned || cleaned.length < 3) continue;

    // Soxta/test ismlarni inkor qilish
    if (JUNK_NAME_REGEX.test(cleaned.toLowerCase())) {
      continue;
    }

    // Har bir so'zni Title Case ga keltirish
    const words: string[] = cleaned
      .split(' ')
      .filter((w: string) => w.length > 1)
      .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());

    if (words.length === 0) continue;
    const formattedName = words.join(' ');

    // 2. Token-set normalization: "Abbasova Fotima" va "Fotima Abbasova" bitta key beradi
    const normalizedKey = [...words]
      .map((w: string) => w.toLowerCase())
      .sort()
      .join('_');

    const score = Number(item.score) || 0;
    const totalScore = Number(item.totalScore) || 100;
    const percent = Math.round((score / Math.max(totalScore, 1)) * 100);

    const existing = mapByNormalizedKey.get(normalizedKey);
    if (!existing) {
      mapByNormalizedKey.set(normalizedKey, {
        normalizedKey,
        displayName: formattedName,
        score,
        totalScore,
        percent
      });
    } else {
      // Bir necha marta topshirgan bo'lsa, eng yuqori (maksimal) ballni saqlaymiz
      if (percent > existing.percent) {
        existing.displayName = formattedName.length > existing.displayName.length ? formattedName : existing.displayName;
        existing.score = score;
        existing.totalScore = totalScore;
        existing.percent = percent;
      }
    }
  }

  const cleanedList = Array.from(mapByNormalizedKey.values()).map(c => ({
    name: c.displayName,
    score: c.score,
    totalScore: c.totalScore,
    percent: c.percent
  }));

  // Ball bo'yicha kamayish tartibida tartiblaymiz
  cleanedList.sort((a, b) => b.percent - a.percent);

  return {
    cleanedList,
    rawCount,
    dedupedCount: Math.max(0, rawCount - cleanedList.length)
  };
}

export const generateClassAnalysis = async (
  testTitle: string,
  questions: any[] = [],
  results: any[] = []
): Promise<ClassAnalysisResult> => {
  // 1. Ma'lumotlarni chuqur tozalash va dublikatlarni 100% yo'q qilish
  const { cleanedList: studentData, rawCount, dedupedCount } = sanitizeAndDeduplicateStudents(results);

  if (studentData.length === 0) {
    throw new Error("Yaroqli o'quvchilar ro'yxati topilmadi (barcha yozuvlar test yoki bo'sh bo'lgan).");
  }

  const avgScore = Math.round(studentData.reduce((a, b) => a + b.percent, 0) / studentData.length);

  // 2. Savollar ro'yxatini tahlil qilish uchun qisqartirilgan model
  const questionsSample = (questions || []).slice(0, 15).map((q: any) => {
    let correctText = q.correctOption;
    if (q.options && q.correctOption) {
      const idx = typeof q.correctOption === 'string' ? q.correctOption.charCodeAt(0) - 65 : q.correctOption;
      if (idx >= 0 && Array.isArray(q.options) && idx < q.options.length) correctText = q.options[idx];
    }
    return {
      topic: q.topic || q.category || 'Mavzu',
      category: q.category || 'Fan',
      difficulty: q.difficulty || 'O\'rta',
      skill: q.skill || 'Tushunish',
      question: q.questionText || q.topic || 'Savol',
      correctAnswer: correctText
    };
  });

  const prompt = `Sen 20 yillik tajribaga ega yetakchi pedagog-metodist, bolalar neyropsixologi va ta'lim tizimi tahlilchisisan.
Sening maqsading: Ushbu test orqali o'tilgan mavzularning tub mohiyatini, nima uchun bu bilimlar bolaning real hayotida va kelajagida o'ta zarurligini FAKTLAR va ilmiy dalillar bilan isbotlab berish, hamda HAR BIR O'QUVCHIGA ALOHIDA individual yo'l xaritasi va ota-onalarga chuqur, samimiy hisobot yaratishdir.

TEST NOMI: "${testTitle}"
O'QUVCHILAR SONI (Tozalangan, yagona ismlar): ${studentData.length} nafar
O'RTACHA FOIZ: ${avgScore}%

O'QUVCHILAR RO'YXATI (Dublikatlar tozalangan):
${JSON.stringify(studentData, null, 2)}

TEST SAVOLLARI VA MAVZULARI:
${JSON.stringify(questionsSample, null, 2)}

QAT'IY TALABLAR (PROFESSIONAL DARAJA):
1. O'TILGAN MAVZULAR VA ULARNING ZARURATI (curriculumTopics):
   - Testdagi asosiy mavzularni ajratib ol (kamida 3-5 ta).
   - Har bir mavzu uchun "whyItMattersForChild": Bu mavzu bolaning intellekti uchun nima beradi?
   - "realWorldApplication": FAKTLAR BILAN! Hayotda qayerda kerak bo'ladi? (Masalan: mantiqiy algoritmlar dasturlash va muhandislikda, foizlar va proporsiyalar moliyaviy qarorlarda va biznesda, matnli tahlil murakkab vaziyatlarda to'g'ri xulosa chiqarishda).
   - "cognitiveBenefits": Neyropsixologik foydasi (kognitiv moslashuvchanlik, operativ xotira, tanqidiy fikrlash).
   - "successMetric": Bola bu mavzuni to'liq egallaganini qanday bilish mumkin.

2. HAR BIR O'QUVCHIGA ALOHIDA YONDASHUV (studentAnalyses):
   - Yuqoridagi har bir ${studentData.length} nafar o'quvchi uchun ALOHIDA, takrorlanmas, shaxsiy tahlil.
   - Hech bir o'quvchida shabloniy "yaxshi natija, davom eting" degan yuzaki gaplar bo'lmasin! Aniq uning foiziga mos tahlil bo'lsin.
   - "parentReport": Ota-ona o'qiganda ko'z oldiga farzandining aniq holati keladigan, iliq, chuqur va amaliy 4-5 jumlalik maktub.
   - "roadmap": 3 ta aniq bosqichli yo'l xaritasi (1-bosqich: 1-4 hafta, 2-bosqich: 1-2 oy, 3-bosqich: 2-3 oy). Har bosqichda aniq kundalik mashqlar va ota-onaga tavsiyalar.

3. SINFNING UMUMIY HOLATI (classOverview):
   - Sinfning eng zaif mavzulari va o'qituvchiga dars jarayonini o'zgartirish uchun amaliy 3 ta maslahat.

4. MATN STANDARTI:
   - O'zbek adabiy tilida, professional pedagogik terminlar bilan yozilsin.
   - Matn ichida hech qachon qochirilmagan qo'shtirnoq (") ishlatmang, faqat yakkalik (') ishlating.

FAQAT VA FAQAT quyidagi JSON formatda javob bering, boshqa hech qanday so'z qo'shmang:
{
  "classOverview": {
    "classStrengths": ["Sinf kuchli bo'lgan aniq 1-jihat", "2-jihat"],
    "classWeaknesses": ["Sinf zaif bo'lgan aniq 1-mavzu", "2-mavzu", "3-mavzu"],
    "teacherRecommendations": ["O'qituvchiga 1-metodik ko'rsatma (faktlar bilan)", "2-ko'rsatma", "3-ko'rsatma"],
    "generalSummary": "Sinfning intellektual salohiyati va umumiy kamchiliklari bo'yicha to'liq 3-4 gaplik xulosa."
  },
  "curriculumTopics": [
    {
      "topic": "Mavzu nomi (masalan: Mantiqiy munosabatlar va tenglamalar)",
      "category": "Fan yo'nalishi",
      "whyItMattersForChild": "Nima uchun bu mavzu bolaning aqliy rivojlanishi uchun muhim (faktlar bilan)",
      "realWorldApplication": "Real hayotda va zamonaviy kasblarda (IT, moliya, muhandislik) qanday qo'llaniladi",
      "cognitiveBenefits": "Rivojlanadigan kognitiv ko'nikmalar (tanqidiy tahlil, deduktiv fikrlash)",
      "successMetric": "O'zlashtirish mezoni (masalan: 10 ta masaladan 8 tasini mustaqil yecha olish)"
    }
  ],
  "studentAnalyses": [
    {
      "name": "O'quvchining to'liq ismi",
      "scorePercent": 75,
      "scoreRaw": "15/20",
      "level": "yaxshi",
      "strengths": ["Kuchli tomoni 1", "Kuchli tomoni 2"],
      "weaknesses": ["Zaif tomoni 1 (aniq mavzu)", "Zaif tomoni 2"],
      "personalityInsight": "O'quvchining fikrlash tezligi va yondashuvi haqida 2 jumlalik xarakteristika.",
      "parentReport": "Hurmatli ota-ona! Farzandingiz [Ism] ushbu sinovda [X]% natijaga erishdi. [Uning intellektual ustunligi haqida fakt]. Biroq [zaif tomoni] bo'yicha bo'shliq sezildi. Uy sharoitida unga [aniq, qulay metodika]. Farzandingiz juda katta salohiyatga ega, unga [rag'batlantirish so'zlari].",
      "immediateActions": ["Ushbu haftada bajarishi kerak bo'lgan 1-aniq vazifa", "2-vazifa"],
      "roadmap": [
        {
          "phase": "1-bosqich: Bo'shliqlarni to'ldirish",
          "duration": "1-4 hafta",
          "focus": "Bazaviy tushunchalarni mustahkamlash",
          "actions": ["Kunlik 15 daqiqa aniq mashg'ulot", "Xatolar ustida ishlash daftarini tutish"],
          "parentTip": "Ota-onaga: har kuni kechqurun uning bajargan ishini tekshirib, rag'batlantirish",
          "expectedOutcome": "Natijani 10-15% ga oshirish"
        },
        {
          "phase": "2-bosqich: Tahlil va amaliyot",
          "duration": "1-2 oy",
          "focus": "Mantiqiy tahlil va tezlikni oshirish",
          "actions": ["Murakkabroq testlar yechish", "Mustaqil tushuntirib bera olish"],
          "parentTip": "Ota-onaga: qiyin vaziyatda to'g'ri javobni aytmasdan, yo'naltiruvchi savol berish",
          "expectedOutcome": "Barqaror 80%+ ko'rsatkich"
        },
        {
          "phase": "3-bosqich: Yetakchilik va erkin fikrlash",
          "duration": "2-3 oy",
          "focus": "Olimpiada va chuqurlashtirilgan daraja",
          "actions": ["Nostandart muammolarni yechish", "O'z tengdoshlariga tushuntirish"],
          "parentTip": "Ota-onaga: o'ziga bo'lgan ishonchini yuksaltirish",
          "expectedOutcome": "Mavzuni 95%+ darajada erkin egallash"
        }
      ]
    }
  ],
  "handbook": [
    {
      "question": "Savol matni",
      "correctAnswer": "To'g'ri javob",
      "explanation": "Nega bu javob to'g'riligi haqida metodik izoh",
      "commonMistake": "O'quvchilar yo'l qo'yadigan odatiy xato sababi"
    }
  ]
}`;

  const responseText = await executeResilientAiPrompt(prompt);
  if (!responseText || responseText.trim().length === 0) {
    throw new Error("AI bo'sh javob qaytardi. Iltimos qayta urinib ko'ring.");
  }

  const cleaned = cleanJsonText(responseText);

  try {
    const parsed = JSON.parse(cleaned);

    const generalIssues = parsed.classOverview?.generalSummary || 'Sinf tahlili muvaffaqiyatli yakunlandi.';
    const studentBreakdowns = (parsed.studentAnalyses || []).map((s: any) => ({
      name: s.name,
      score: s.scorePercent,
      feedback: s.immediateActions?.[0] || s.weaknesses?.[0] || ''
    }));

    return {
      testTitle,
      analyzedAt: new Date().toISOString(),
      classOverview: {
        totalStudents: studentData.length,
        rawSubmissionsCount: rawCount,
        duplicatesRemovedCount: dedupedCount,
        averageScore: avgScore,
        passCount: studentData.filter(s => s.percent >= 60).length,
        failCount: studentData.filter(s => s.percent < 60).length,
        topPerformer: studentData[0]?.name || '',
        needsAttention: studentData.filter(s => s.percent < 50).map(s => s.name),
        classStrengths: parsed.classOverview?.classStrengths || [],
        classWeaknesses: parsed.classOverview?.classWeaknesses || [],
        teacherRecommendations: parsed.classOverview?.teacherRecommendations || [],
      },
      curriculumTopics: parsed.curriculumTopics || [],
      studentAnalyses: parsed.studentAnalyses || [],
      handbook: (parsed.handbook || []).map((h: any) => ({
        ...h,
        commonMistake: h.commonMistake || ''
      })),
      generalIssues,
      studentBreakdowns,
    } as ClassAnalysisResult;
  } catch (parseErr) {
    console.error('[generateClassAnalysis] JSON parse xatosi. Raw text:', responseText.slice(0, 300));
    throw new Error("AI javobi noto'g'ri formatda. Iltimos qayta urinib ko'ring.");
  }
};


