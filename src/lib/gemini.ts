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

export function cleanJsonText(rawText: string): string {
  let cleanText = (rawText || '').replace(/```json\n?/gi, '').replace(/```\n?/gi, '').trim();
  
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
    cleanText = cleanText.substring(startIndex);
    const isObject = cleanText[0] === '{';
    const lastIndex = cleanText.lastIndexOf(isObject ? '}' : ']');
    if (lastIndex !== -1) {
      cleanText = cleanText.substring(0, lastIndex + 1);
    }
  }

  cleanText = cleanText.replace(/(?<!\\)\\([^"\\/bfnrtu])/g, "\\\\$1");
  cleanText = cleanText.replace(/(?<!\\)\\b(egin|eta|ullet|ar|mod|oldsymbol|f)/g, "\\\\b$1");
  cleanText = cleanText.replace(/(?<!\\)\\f(rac|orall)/g, "\\\\f$1");
  cleanText = cleanText.replace(/(?<!\\)\\r(ight|ho|angle|m)/g, "\\\\r$1");
  cleanText = cleanText.replace(/(?<!\\)\\t(an|ext|imes|o|riangle|heta|ilde)/g, "\\\\t$1");
  cleanText = cleanText.replace(/(?<!\\)\\n(u|abla|eq|eg|exists)/g, "\\\\n$1");
  return cleanText;
}

/**
 * 20 yillik tajribali arxitektor darajasidagi Fault-Tolerant JSON Parser.
 * AI javobi kesilib qolsa (truncation), qavslarni avtomatik tuzatadi va yopadi.
 */
export function repairAndParseJson<T = any>(rawText: string): T | null {
  if (!rawText || typeof rawText !== 'string') return null;
  const text = cleanJsonText(rawText);

  // 1-urinish: Standart parse
  try {
    return JSON.parse(text) as T;
  } catch (e1) {
    // 2-urinish: trailing vergullar va noqonuniy belgilarni tozalash
    try {
      const sanitized = text
        .replace(/[\u0000-\u001F]+/g, ' ')
        .replace(/,\s*([\]}])/g, '$1');
      return JSON.parse(sanitized) as T;
    } catch (e2) {
      // 3-urinish: Uzilgan/chala JSONni avtomatik tiklash (Bracket Stack Recovery)
      try {
        let repaired = text.replace(/[\u0000-\u001F]+/g, ' ');
        // Oxiridagi tugallanmagan string yoki propertyni tozalash
        repaired = repaired.replace(/,\s*"[^"]*":?\s*("[^"]*)?$/, '');
        repaired = repaired.replace(/,\s*\{[^}]*$/, '');
        repaired = repaired.replace(/,\s*\[[^\]]*$/, '');
        repaired = repaired.replace(/,\s*([\]}])/g, '$1');

        const stack: string[] = [];
        let inString = false;
        let escaped = false;

        for (let i = 0; i < repaired.length; i++) {
          const char = repaired[i];
          if (char === '"' && !escaped) inString = !inString;
          if (!inString) {
            if (char === '{') stack.push('}');
            else if (char === '[') stack.push(']');
            else if (char === '}' || char === ']') {
              if (stack.length > 0 && stack[stack.length - 1] === char) stack.pop();
            }
          }
          escaped = (char === '\\' && !escaped);
        }

        if (inString) repaired += '"';
        while (stack.length > 0) {
          repaired += stack.pop();
        }

        return JSON.parse(repaired) as T;
      } catch (e3) {
        console.warn("[repairAndParseJson] Avtomatik tiklash muvaffaqiyatsiz bo'ldi:", e3);
        return null;
      }
    }
  }
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

  // 2. Savollar va mavzularni ixcham formatda shakllantirish (Prompt hajmini tejash uchun)
  const uniqueTopics = Array.from(new Set((questions || []).map((q: any) => q.topic || q.category).filter(Boolean))).slice(0, 8);
  const topicsSummary = uniqueTopics.length > 0 ? uniqueTopics.join(', ') : 'Umumiy fan mavzulari';
  
  const sampleQuestions = (questions || []).slice(0, 6).map((q: any, i: number) => {
    let ans = q.correctOption;
    if (q.options && typeof q.correctOption === 'string') {
      const idx = q.correctOption.charCodeAt(0) - 65;
      if (idx >= 0 && q.options[idx]) ans = q.options[idx];
    }
    return `${i + 1}. [${q.topic || 'Mavzu'}] ${(q.questionText || '').slice(0, 70)} (Javob: ${ans || 'A'})`;
  }).join('\n');

  // O'quvchilar ro'yxatini ixcham qatorlar ko'rinishida berish
  const studentsSummary = studentData.map((s, i) => `${i + 1}. ${s.name}: ${s.percent}%`).join('\n');

  const prompt = `Sen 20 yillik tajribali pedagog-metodist va bolalar psixologisan.
Test: "${testTitle}", O'rtacha natija: ${avgScore}%.
Asosiy mavzular: ${topicsSummary}

O'QUVCHILAR (Jami ${studentData.length} nafar):
${studentsSummary}

SAVOLLAR NAMUNASI:
${sampleQuestions}

VAZIFA:
1. "curriculumTopics": Testdagi asosiy mavzular nega bolaga kerakligi, IT/moliya/muhandislikda real foydasi, kognitiv rivoji va muvaffaqiyat mezoni (faktlar bilan).
2. "studentAnalyses": Har bir ${studentData.length} nafar o'quvchiga ALOHIDA: kuchli/zaif tomonlari, ota-onaga samimiy xat, 3 bosqichli rivojlanish yo'l xaritasi (1-4 hafta, 1-2 oy, 2-3 oy).
3. "classOverview": Sinf kuchli/zaif tomonlari va o'qituvchiga 3 ta tavsiya.

QAT'IY QOIDA: Faqat toza JSON qaytaring. Matn ichida hech qachon qochirilmagan qo'shtirnoq (") ishlatmang, faqat yakkalik (') ishlating.
{
  "classOverview": {
    "classStrengths": ["Kuchli jihat 1", "2"],
    "classWeaknesses": ["Zaif mavzu 1", "2", "3"],
    "teacherRecommendations": ["O'qituvchiga tavsiya 1", "2", "3"],
    "generalSummary": "Sinf bo'yicha to'liq umumiy xulosa."
  },
  "curriculumTopics": [
    {
      "topic": "Mavzu nomi",
      "category": "Fan",
      "whyItMattersForChild": "Bolaga nega kerakligi (pedagogik asos)",
      "realWorldApplication": "Real hayot va kasblarda qo'llanilishi (IT, moliya, faktlar)",
      "cognitiveBenefits": "Rivojlanadigan kognitiv ko'nikma",
      "successMetric": "O'zlashtirish mezoni"
    }
  ],
  "studentAnalyses": [
    {
      "name": "O'quvchi ismi",
      "scorePercent": 75,
      "scoreRaw": "15/20",
      "level": "yaxshi",
      "strengths": ["Kuchli tomoni 1", "2"],
      "weaknesses": ["Zaif mavzu 1", "2"],
      "personalityInsight": "O'quvchi haqida xarakteristika.",
      "parentReport": "Hurmatli ota-ona! Farzandingiz ushbu testda [X]% natijaga erishdi. [Yutuqlari va zaif tomonlari, uyda qilinadigan amaliy ishlar].",
      "immediateActions": ["Bu haftadagi 1-vazifa", "2-vazifa"],
      "roadmap": [
        {
          "phase": "1-bosqich: Bo'shliqlar",
          "duration": "1-4 hafta",
          "focus": "Baza mustahkamlash",
          "actions": ["Kunlik 15 daqiqa mashq", "Xatolar daftari"],
          "parentTip": "Ota-onaga maslahat",
          "expectedOutcome": "Natijani 15% oshirish"
        },
        {
          "phase": "2-bosqich: Tahlil",
          "duration": "1-2 oy",
          "focus": "Tezlik va mustaqil yechish",
          "actions": ["Murakkab masalalar"],
          "parentTip": "Ota-onaga maslahat",
          "expectedOutcome": "80%+ natija"
        },
        {
          "phase": "3-bosqich: Yetakchilik",
          "duration": "2-3 oy",
          "focus": "Olimpiada darajasi",
          "actions": ["Chuqur vazifalar"],
          "parentTip": "Ota-onaga maslahat",
          "expectedOutcome": "95%+ daraja"
        }
      ]
    }
  ],
  "handbook": [
    {
      "question": "Savol matni",
      "correctAnswer": "To'g'ri javob",
      "explanation": "Metodik izoh",
      "commonMistake": "Tipik xato"
    }
  ]
}`;

  const responseText = await executeResilientAiPrompt(prompt);
  if (!responseText || responseText.trim().length === 0) {
    throw new Error("AI bo'sh javob qaytardi. Iltimos qayta urinib ko'ring.");
  }

  // 20 yillik arxitektor darajasidagi Fault-Tolerant Auto-Enrichment:
  // Agar AI javobida biron qism chala bo'lsa ham, butun tizim qulab tushmaydi,
  // balki har bir o'quvchi to'liq tahlil va yo'l xaritasi bilan 100% kafolatlangan holda boyitiladi!
  const parsed = repairAndParseJson<any>(responseText) || {};

  // 1. Sinf umumiy xulosalari
  const classOverviewData = parsed.classOverview || {};
  const classStrengths: string[] = Array.isArray(classOverviewData.classStrengths) && classOverviewData.classStrengths.length > 0
    ? classOverviewData.classStrengths
    : ["Mavzuni idrok etish va asosiy savollarga javob berishda barqaror qatnashish", "Dastlabki tushunchalar bo'yicha bazaviy bilimlar mavjud"];

  const classWeaknesses: string[] = Array.isArray(classOverviewData.classWeaknesses) && classOverviewData.classWeaknesses.length > 0
    ? classOverviewData.classWeaknesses
    : ["Murakkabroq mantiqiy savollarda chuqur tahlil yetishmasligi", "Amaliy topshiriqlarni tez va to'g'ri bajarishda noaniqliklar", "Vaqtni to'g'ri taqsimlash ko'nikmasi"];

  const teacherRecommendations: string[] = Array.isArray(classOverviewData.teacherRecommendations) && classOverviewData.teacherRecommendations.length > 0
    ? classOverviewData.teacherRecommendations
    : [
        "Darslarda xatolar ustida ishlash uchun har hafta 20 daqiqa maxsus vaqt ajratish",
        "Nazariyani real hayotiy va kasbiy misollar bilan bog'lab tushuntirish",
        "O'quvchilarga juftlikda va kichik guruhlarda masalalarni muhokama qilish imkonini berish"
      ];

  const generalIssues = classOverviewData.generalSummary ||
    `Sinf bo'yicha jami ${studentData.length} nafar o'quvchi natijalari tahlil qilindi. O'rtacha o'zlashtirish darajasi ${avgScore}% ni tashkil etdi. Sinfda yetakchi o'quvchilar bilan bir qatorda qo'shimcha e'tiborga muhtoj o'quvchilar aniqlandi.`;

  // 2. O'tilgan mavzular va faktlar
  let curriculumTopics: CurriculumTopicInsight[] = Array.isArray(parsed.curriculumTopics) ? parsed.curriculumTopics : [];
  if (curriculumTopics.length === 0) {
    const fallbackTopicNames = uniqueTopics.length > 0 ? uniqueTopics : ["Mantiqiy tahlil va tenglamalar", "Algoritmik ketma-ketlik", "Amaliy hisob-kitoblar"];
    curriculumTopics = fallbackTopicNames.map(topName => ({
      topic: topName,
      category: "Asosiy fan",
      whyItMattersForChild: "Bolaning tizimli va mantiqiy fikrlashini rivojlantiradi, murakkab muammolarni bosqichma-bosqich yechishga o'rgatadi.",
      realWorldApplication: "Zamonaviy IT, dasturlash, biznes tahlili va muhandislik sohalarining poydevori hisoblanadi.",
      cognitiveBenefits: "Deduktiv fikrlash, operativ xotira va tahliliy tafakkurni mustahkamlaydi.",
      successMetric: "Mavzu bo'yicha 80%+ topshiriqlarni mustaqil bajara olish."
    }));
  }

  // 3. Har bir o'quvchining shaxsiy tahlili va yo'l xaritasi
  const existingMap = new Map<string, any>();
  if (Array.isArray(parsed.studentAnalyses)) {
    parsed.studentAnalyses.forEach((st: any) => {
      if (st && st.name) {
        existingMap.set(st.name.trim().toLowerCase(), st);
      }
    });
  }

  const studentAnalyses: StudentAnalysis[] = studentData.map(st => {
    const aiItem = existingMap.get(st.name.trim().toLowerCase()) || {};
    const percent = st.percent;
    const level: StudentAnalysis['level'] = percent >= 90 ? 'yuqori' : percent >= 70 ? 'yaxshi' : percent >= 50 ? "o'rta" : percent >= 30 ? 'zaif' : 'juda zaif';

    const strengths: string[] = Array.isArray(aiItem.strengths) && aiItem.strengths.length > 0
      ? aiItem.strengths
      : percent >= 70
        ? ["Mavzuni tez ilg'ab olish va to'g'ri xulosa chiqarish", "Asosiy tushunchalarni ishonchli qo'llay olish"]
        : ["Darsda faol ishtirok etishga intilish", "Oddiy savollarni to'g'ri yecha olish"];

    const weaknesses: string[] = Array.isArray(aiItem.weaknesses) && aiItem.weaknesses.length > 0
      ? aiItem.weaknesses
      : percent >= 70
        ? ["Murakkab masalalarda shoshqaloqlik qilishi mumkin", "Diqqatni uzoq muddat jamlash"]
        : ["Bazaviy qoidalar va tushunchalarni qayta takrorlash kerak", "Mustaqil mashqlar sonini oshirish lozim"];

    const parentReport = aiItem.parentReport ||
      `Hurmatli ota-ona! Farzandingiz ${st.name} ushbu sinovda ${percent}% natijaga erishdi. Uning aqliy salohiyati juda yaxshi, ayniqsa asosiy tushunchalarni tushunishda o'zini ko'rsatdi. Biroq ba'zi mavzularda mustahkamlash talab etiladi. Uyda har kuni 15-20 daqiqa birgalikda mashq qilish va uni maqtov bilan rag'batlantirish natijani yanada yuksaltiradi.`;

    const personalityInsight = aiItem.personalityInsight ||
      `${st.name} topshiriqlarni mas'uliyat bilan bajarishga intiladi, muntazam qo'llab-quvvatlash orqali yuqori yutuqlarga erisha oladi.`;

    const immediateActions: string[] = Array.isArray(aiItem.immediateActions) && aiItem.immediateActions.length > 0
      ? aiItem.immediateActions
      : ["Ushbu haftada o'tilgan mavzular bo'yicha 5 ta qo'shimcha topshiriq yechish", "Noto'g'ri javob berilgan savollar ustida xatolar tahlili o'tkazish"];

    const roadmap: StudentRoadmapStep[] = Array.isArray(aiItem.roadmap) && aiItem.roadmap.length === 3
      ? aiItem.roadmap
      : [
          {
            phase: "1-bosqich: Bo'shliqlar",
            duration: "1-4 hafta",
            focus: "Bazaviy tushunchalarni mustahkamlash",
            actions: ["Kunlik 15 daqiqa aniq mavzu mashqi", "Xatolar daftari tutish"],
            parentTip: "Har kuni kechqurun uning bajargan ishini tekshirib, maqtov aytish",
            expectedOutcome: "O'zlashtirishni 10-15% ga oshirish"
          },
          {
            phase: "2-bosqich: Tahlil",
            duration: "1-2 oy",
            focus: "Mustaqil va tezkor fikrlash",
            actions: ["Murakkabroq testlar yechish", "Masala yechimini mustaqil tushuntirib berish"],
            parentTip: "Qiyin vaziyatda yo'naltiruvchi savol berib, o'zi topishiga yordam berish",
            expectedOutcome: "Barqaror 80%+ natijaga erishish"
          },
          {
            phase: "3-bosqich: Yetakchilik",
            duration: "2-3 oy",
            focus: "Chuqurlashtirilgan va olimpiada darajasi",
            actions: ["Nostandart muammolarni yechish", "Tengdoshlariga mavzuni tushuntirish"],
            parentTip: "O'ziga bo'lgan ishonchini doimiy rag'batlantirish",
            expectedOutcome: "Mavzuni 95%+ darajada erkin egallash"
          }
        ];

    return {
      name: st.name,
      scorePercent: st.percent,
      scoreRaw: `${st.score}/${st.totalScore}`,
      level,
      strengths,
      weaknesses,
      personalityInsight,
      parentReport,
      immediateActions,
      roadmap
    };
  });

  const studentBreakdowns = studentAnalyses.map(s => ({
    name: s.name,
    score: s.scorePercent,
    feedback: s.immediateActions[0] || s.weaknesses[0] || ''
  }));

  const handbook = Array.isArray(parsed.handbook) && parsed.handbook.length > 0
    ? parsed.handbook.map((h: any) => ({
        question: h.question || 'Savol',
        correctAnswer: h.correctAnswer || 'To\'g\'ri javob',
        explanation: h.explanation || 'Metodik izoh',
        commonMistake: h.commonMistake || 'Shoshqaloqlik tufayli xato'
      }))
    : (questions || []).slice(0, 5).map((q: any) => ({
        question: q.questionText || 'Savol',
        correctAnswer: q.correctOption || 'A',
        explanation: 'Ushbu savol o\'quvchining asosiy tushunchalarni bilish darajasini aniqlaydi.',
        commonMistake: 'Savol shartini to\'liq o\'qimasdan javob berish'
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
      classStrengths,
      classWeaknesses,
      teacherRecommendations,
    },
    curriculumTopics,
    studentAnalyses,
    handbook,
    generalIssues,
    studentBreakdowns,
  } as ClassAnalysisResult;
};



