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
  const stripped1 = stripHtmlTags(ans1);
  const stripped2 = stripHtmlTags(ans2);
  if (stripped1 === '' && stripped2 === '') {
    return normalize(ans1) === normalize(ans2);
  }
  return stripped1 === stripped2;
}

/**
 * O'quvchi javobining to'g'riligini tekshiradi.
 */
export function isAnswerCorrect(userAns, correctOpt, options = []) {
  if (!userAns || !correctOpt) return false;

  if (isEqual(userAns, correctOpt)) return true;

  const uNorm = normalize(userAns);
  const cNorm = normalize(correctOpt);
  const letterMap = { a: 0, b: 1, c: 2, d: 3 };

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
