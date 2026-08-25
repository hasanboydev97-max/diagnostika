/**
 * Umumiy scoring yordamchi moduli (DRY tamoyili).
 * Bir xil mantiq server/controllers/onlineTestController.js va
 * src/pages/OnlineTests/TestResultView.tsx da takrorlanmaslik uchun bu yerga chiqarildi.
 */

/**
 * O'quvchi javobining to'g'riligini tekshiradi.
 * Ham harf (a, b, c, d), ham matn asosida taqqoslaydi.
 *
 * @param {string|undefined} userAns   - O'quvchi tanlagan javob
 * @param {string|undefined} correctOpt - To'g'ri javob (a/b/c/d yoki to'liq matn)
 * @param {string[]} options            - Javob variantlari massivi
 * @returns {boolean}
 */
export function isAnswerCorrect(userAns, correctOpt, options = []) {
  if (!userAns || !correctOpt) return false;
  const u = String(userAns).trim().toLowerCase();
  const c = String(correctOpt).trim().toLowerCase();
  if (u === c) return true;
  const letterMap = { a: 0, b: 1, c: 2, d: 3 };
  if (letterMap[c] !== undefined && options[letterMap[c]]) {
    if (String(options[letterMap[c]]).trim().toLowerCase() === u) return true;
  }
  if (letterMap[u] !== undefined && options[letterMap[u]]) {
    if (String(options[letterMap[u]]).trim().toLowerCase() === c) return true;
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
