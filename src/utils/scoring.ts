/**
 * Frontend uchun umumiy scoring yordamchi moduli (DRY tamoyili).
 * Server tomon ekvivalenti: server/utils/scoring.js
 */

// Matnni standartlashtirish (HTML belgilarni va ortiqcha bo'shliqlarni tozalash)
function normalize(s: string): string {
  return String(s || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

// Sof HTML teglardan tozalash (rich-text formatdagi javoblar uchun)
function stripHtmlTags(s: string): string {
  return normalize(s).replace(/<[^>]*>/g, '').trim();
}

// Asosiy taqqoslash mantiqi (Senior Level)
function isEqual(ans1: string, ans2: string): boolean {
  const stripped1 = stripHtmlTags(ans1);
  const stripped2 = stripHtmlTags(ans2);

  // Agar ikkala javob ham sof HTML teglardan iborat bo'lsa (masalan <link href="...">)
  // stripHtmlTags ularni bo'sh string ("") qilib qo'yadi.
  // Bu holatda ularning asl (tozalanmagan) qiymatlarini normalizatsiya qilib taqqoslaymiz.
  if (stripped1 === '' && stripped2 === '') {
    return normalize(ans1) === normalize(ans2);
  }

  return stripped1 === stripped2;
}

/**
 * O'quvchi javobining to'g'riligini tekshiradi.
 * Ham harf (a, b, c, d), ham to'liq matn asosida taqqoslaydi.
 */
export function isAnswerCorrect(
  userAns: string | undefined,
  correctOpt: string | undefined,
  options: string[] = [],
  correctAnswerText?: string   // optional: shuffle-safe to'g'ri javob matni
): boolean {
  if (!userAns || !correctOpt) return false;

  // 1. Agar correctAnswerText berilgan bo'lsa — eng ishonchli yo'l
  if (correctAnswerText && isEqual(userAns, correctAnswerText)) return true;

  // 2. To'g'ridan-to'g'ri matn taqqoslash
  if (isEqual(userAns, correctOpt)) return true;

  // 3. Harf indeksi orqali options dan matn olib taqqoslash
  const uNorm = normalize(userAns);
  const cNorm = normalize(correctOpt);
  const letterMap: Record<string, number> = { a: 0, b: 1, c: 2, d: 3 };

  // correctOpt harf bo'lsa → options dan to'g'ri matnni topib taqqosla
  if (letterMap[cNorm] !== undefined && options[letterMap[cNorm]] !== undefined) {
    if (isEqual(userAns, options[letterMap[cNorm]])) return true;
  }

  // userAns harf bo'lsa → options dan o'quvchi matni topib to'g'ri bilan taqqosla
  if (letterMap[uNorm] !== undefined && options[letterMap[uNorm]] !== undefined) {
    if (isEqual(options[letterMap[uNorm]], correctOpt)) return true;
  }

  return false;
}
