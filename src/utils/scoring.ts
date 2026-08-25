/**
 * Frontend uchun umumiy scoring yordamchi moduli (DRY tamoyili).
 * Server tomon ekvivalenti: server/utils/scoring.js
 */

/**
 * O'quvchi javobining to'g'riligini tekshiradi.
 * Ham harf (a, b, c, d), ham matn asosida taqqoslaydi.
 */
export function isAnswerCorrect(
  userAns: string | undefined,
  correctOpt: string | undefined,
  options: string[] = []
): boolean {
  if (!userAns || !correctOpt) return false;
  const u = String(userAns).trim().toLowerCase();
  const c = String(correctOpt).trim().toLowerCase();
  if (u === c) return true;
  const letterMap: Record<string, number> = { a: 0, b: 1, c: 2, d: 3 };
  if (letterMap[c] !== undefined && options[letterMap[c]]) {
    if (String(options[letterMap[c]]).trim().toLowerCase() === u) return true;
  }
  if (letterMap[u] !== undefined && options[letterMap[u]]) {
    if (String(options[letterMap[u]]).trim().toLowerCase() === c) return true;
  }
  return false;
}
