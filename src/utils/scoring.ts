/**
 * Frontend uchun umumiy scoring yordamchi moduli (DRY tamoyili).
 * Server tomon ekvivalenti: server/utils/scoring.js
 */

/**
 * HTML teglarni va ortiqcha bo'shliqlarni matndan tozalaydi.
 * FormattedText komponenti render qilgan matnlar DB da HTML teg bilan
 * saqlangan bo'lishi mumkin — taqqoslashdan oldin tozalanadi.
 */
function stripHtml(text: string): string {
  return text
    .replace(/<[^>]*>/g, '')       // HTML teglarni olib tashla
    .replace(/&amp;/g, '&')        // HTML entity lar
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')          // Ko'p bo'shliqlarni birlashtir
    .trim()
    .toLowerCase();
}

/**
 * O'quvchi javobining to'g'riligini tekshiradi.
 * Ham harf (a, b, c, d), ham to'liq matn asosida taqqoslaydi.
 * HTML teglar va entity lar avtomatik tozalanadi.
 *
 * Tartibi (prioritet bo'yicha):
 * 1. correctAnswerText (shuffle-safe to'g'ri matn) bilan to'g'ridan-to'g'ri taqqoslash
 * 2. Matn-matn to'g'ridan-to'g'ri taqqoslash
 * 3. Harf indeksi orqali options dan matn olib taqqoslash
 */
export function isAnswerCorrect(
  userAns: string | undefined,
  correctOpt: string | undefined,
  options: string[] = [],
  correctAnswerText?: string   // optional: shuffle-safe to'g'ri javob matni
): boolean {
  if (!userAns || !correctOpt) return false;

  const u = stripHtml(String(userAns));
  const c = stripHtml(String(correctOpt));

  // 1. Agar correctAnswerText berilgan bo'lsa — eng ishonchli yo'l
  if (correctAnswerText) {
    const ct = stripHtml(String(correctAnswerText));
    if (ct && u === ct) return true;
  }

  // 2. To'g'ridan-to'g'ri matn taqqoslash
  if (u === c) return true;

  // 3. Harf indeksi orqali options dan matn olib taqqoslash
  const letterMap: Record<string, number> = { a: 0, b: 1, c: 2, d: 3 };

  // correctOpt harf bo'lsa → options dan to'g'ri matnni topib taqqosla
  if (letterMap[c] !== undefined && options[letterMap[c]] !== undefined) {
    const correctText = stripHtml(String(options[letterMap[c]]));
    if (correctText && u === correctText) return true;
  }

  // userAns harf bo'lsa → options dan o'quvchi matni topib to'g'ri bilan taqqosla
  if (letterMap[u] !== undefined && options[letterMap[u]] !== undefined) {
    const userText = stripHtml(String(options[letterMap[u]]));
    if (userText && userText === c) return true;
  }

  return false;
}
