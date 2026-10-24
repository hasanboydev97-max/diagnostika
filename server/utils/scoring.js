/**
 * Umumiy scoring yordamchi moduli (DRY tamoyili).
 * Bir xil mantiq server/controllers/onlineTestController.js va
 * src/pages/OnlineTests/TestResultView.tsx da takrorlanmaslik uchun bu yerga chiqarildi.
 */

// Matnni standartlashtirish (HTML belgilarni va ortiqcha bo'shliqlarni tozalash)
function normalize(s) {
  return String(s || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

// Sof HTML teglardan tozalash
function stripHtmlTags(s) {
  return normalize(s).replace(/<[^>]*>/g, '').trim();
}

// Asosiy taqqoslash mantiqi
function isEqual(ans1, ans2) {
  const n1 = normalize(ans1);
  const n2 = normalize(ans2);

  if (n1 === n2) return true;

  const s1 = stripHtmlTags(ans1);
  const s2 = stripHtmlTags(ans2);

  const hasTag1 = /<[^>]+>/.test(ans1 || '');
  const hasTag2 = /<[^>]+>/.test(ans2 || '');
  
  if (hasTag1 && hasTag2) {
    return false;
  }

  if (s1 === s2 && s1.replace(/[^\p{L}\p{N}]/gu, '').length > 0) {
    return true;
  }

  return false;
}

/**
 * O'quvchi javobining to'g'riligini tekshiradi.
 */
export function isAnswerCorrect(userAns, correctOpt, options = []) {
  if (!userAns || !correctOpt) return false;

  if (isEqual(userAns, correctOpt)) return true;

  const uNorm = normalize(userAns).replace(/[^a-z]/g, '');
  const cNorm = normalize(correctOpt).replace(/[^a-z]/g, '');
  const letterMap = { a: 0, b: 1, c: 2, d: 3, e: 4 };

  if (letterMap[cNorm] !== undefined && options[letterMap[cNorm]] !== undefined) {
    if (isEqual(userAns, options[letterMap[cNorm]])) return true;
  }

  if (letterMap[uNorm] !== undefined && options[letterMap[uNorm]] !== undefined) {
    if (isEqual(options[letterMap[uNorm]], correctOpt)) return true;
  }

  return false;
}

/**
 * Test natijasini qayta serverda hisoblaydi.
 * Klientdan kelgan score ni ishonmang — bu funksiya orqali qayta hisoblang.
 *
 * @param {Array} questions   - Test savollari (correctOption va options bilan)
 * @param {Object} answers    - O'quvchi javoblari { [index]: javob }
 * @returns {{ score: number, totalScore: number }}
 */
export function computeScore(questions, answers) {
  if (!Array.isArray(questions) || !answers) {
    return { score: 0, totalScore: 0 };
  }
  const totalScore = questions.length;
  const score = questions.reduce((acc, q, i) => {
    return acc + (isAnswerCorrect(answers[i], q.correctOption, q.options || []) ? 1 : 0);
  }, 0);
  return { score, totalScore };
}

/**
 * Foizni hisoblash — nolga bo'linishni oldini oladi
 * @param {number} correct - To'g'ri javoblar soni
 * @param {number} total - Jami savollar soni
 * @returns {number} 0-100 oralig'idagi foiz
 */
export function calculateScore(correct, total) {
  if (!total || total <= 0 || correct < 0) return 0;
  return Math.round((correct / total) * 100);
}

/**
 * Fan bo'yicha alohida natijalarni hisoblaydi
 * @param {Array} questionResults - Savol natijalari [{subject, isCorrect}]
 * @returns {Record<string, {correct: number, total: number, percent: number}>}
 */
export function calculateSubjectScores(questionResults) {
  const map = {};
  for (const r of questionResults || []) {
    const sub = r.subject || 'Umumiy';
    if (!map[sub]) map[sub] = { correct: 0, total: 0, percent: 0 };
    map[sub].total++;
    if (r.isCorrect) map[sub].correct++;
  }
  for (const sub of Object.keys(map)) {
    map[sub].percent = calculateScore(map[sub].correct, map[sub].total);
  }
  return map;
}

/**
 * Ball asosida daraja aniqlash
 * @param {number} score - 0-100 oralig'idagi foiz
 * @returns {'excellent' | 'good' | 'average' | 'poor'}
 */
export function getPerformanceLevel(score) {
  if (score >= 90) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 50) return 'average';
  return 'poor';
}
