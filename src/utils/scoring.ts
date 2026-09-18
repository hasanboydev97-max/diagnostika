/**
 * Frontend uchun umumiy scoring yordamchi moduli (DRY tamoyili).
 * Server tomon ekvivalenti: server/utils/scoring.js
 */

// Matnni standartlashtirish (HTML belgilarni va ortiqcha bo'shliqlarni tozalash)
export function normalize(s: string): string {
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
export function stripHtmlTags(s: string): string {
  return normalize(s).replace(/<[^>]*>/g, '').trim();
}

export function isEqual(ans1: string, ans2: string): boolean {
  const n1 = normalize(ans1);
  const n2 = normalize(ans2);

  if (n1 === n2) return true;

  const s1 = stripHtmlTags(ans1);
  const s2 = stripHtmlTags(ans2);

  // Agar ikkala matnda ham HTML teglar (yoki unga o'xshash qavslar) qatnashgan bo'lsa
  // va ularning toza matni har xil bo'lsa (n1 !== n2), ular turlicha javob variantlaridir (masalan <h1> va <h2>)
  const hasTag1 = /<[^>]+>/.test(ans1);
  const hasTag2 = /<[^>]+>/.test(ans2);
  
  if (hasTag1 && hasTag2) {
    return false;
  }

  // Agar s1 va s2 teng bo'lsa va tozalangan matn bo'sh/faqat tinish belgisi bo'lmasa:
  if (s1 === s2 && s1.replace(/[^\p{L}\p{N}]/gu, '').length > 0) {
    return true;
  }

  return false;
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

  // 3. Agar eski bazada correctOpt faqat harf (a, b, c, d) bo'lib saqlangan bo'lsa
  // u holda options massividan mos indeksdagi matn bilan tekshiramiz.
  // Eslatma: userAns hech qachon harf indeksi bo'lmaydi, u har doim to'liq matn.
  const cNorm = normalize(correctOpt).replace(/[^a-z]/g, '');
  const letterMap: Record<string, number> = { a: 0, b: 1, c: 2, d: 3, e: 4 };

  if (letterMap[cNorm] !== undefined && options[letterMap[cNorm]] !== undefined) {
    if (isEqual(userAns, options[letterMap[cNorm]])) return true;
  }

  return false;
}
