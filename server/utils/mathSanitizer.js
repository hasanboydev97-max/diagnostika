/**
 * mathSanitizer.js — Markaziy matematik ifoda tozalagich
 *
 * Barcha manbalardan kelgan (AI, Excel, OCR) savol matnlari
 * bazaga yozilishidan OLDIN shu modul orqali o'tkaziladi.
 *
 * Tuzatiladigan muammolar:
 *  1. Mismatched dollar: $formula$$  →  $$formula$$
 *  2. Orphan trailing $$: =0$$       →  =0
 *  3. Merged text: $$formula$$text   →  $$formula$$ text
 *  4. Inline merge: $x_1$va          →  $x_1$ va
 *  5. =digit + harf: =0tenglama      →  =0 tenglama
 *  6. Bo'sh dollar: $$ $$            →  (olib tashlanadi)
 */

// ─── Ichki yordamchi funksiyalar ──────────────────────────────────────────────

/**
 * $$ juftliklari balansini tuzatish.
 * - Single-open + double-close: $inner$$ → $$inner$$
 * - Odd $$ count bo'lsa — oxiridagi yolg'iz $$ ni olib tashla
 */
function fixBlockDollarBalance(text) {
  // Pass 1: $inner$$ (1 ta ochuvchi, 2 ta yopuvchi) → $$inner$$
  let t = text.replace(/(?<!\$)\$(?!\$)([^$\n]{1,300}?)\$\$(?!\$)/g, (_, inner) => `$$${inner}$$`);

  // Pass 2: Toq $$ count bo'lsa — oxiridagi orphan $$ olib tashlanadi
  const allDoubles = t.match(/\$\$/g) || [];
  if (allDoubles.length % 2 !== 0) {
    t = t.replace(/\$\$(?=[^$]*$)/, '');
  }
  return t;
}

/**
 * Inline $ balansi: toq soni bo'lsa oxiridagi $ ni escape qilish
 */
function fixInlineDollarBalance(text) {
  const singleCount = (text.match(/(?<!\$)\$(?!\$)/g) || []).length;
  if (singleCount % 2 !== 0) {
    return text.replace(/(?<!\$)\$(?!\$)(?=[^$]*$)/, '\\$');
  }
  return text;
}

/**
 * Math blok ($$...$$) bilan atrofdagi matn orasiga bo'sh joy qo'yish.
 */
function ensureSpaceAroundBlockMath(text) {
  // $$formula$$text  →  $$formula$$ text
  let t = text.replace(/(\$\$)([^\s$\\.,!?;:\n\d([{'\-])/gu, '$1 $2');
  // text$$formula  →  text $$formula
  t = t.replace(/([^\s$\\])(\$\$)/gu, '$1 $2');
  return t;
}

/**
 * Inline math ($...$) bilan atrofdagi matn orasiga bo'sh joy qo'yish.
 */
function ensureSpaceAroundInlineMath(text) {
  // $x$ text(nospace) → $x$ text
  // Process: after a complete $...$ pattern, if non-space follows
  let t = text.replace(
    /((?<!\$)\$(?!\$)(?:[^$\n\\]|\\.){1,150}?\$(?!\$))([^\s$.,!?;:\n([{'\-])/gu,
    '$1 $3'
  );
  // word$x$ → word $x$
  t = t.replace(/([^\s$\\])(\$(?!\$))/gu, '$1 $2');
  return t;
}

/**
 * Raqam yoki yopuvchi belgidan keyin darhol Kiril/lotin harf kelsa bo'sh joy qo'sh.
 * =0tenglama → =0 tenglama  |  }tenglama → } tenglama
 */
function fixMergedTextAfterMath(text) {
  let t = text.replace(/(=\s*-?\d+(?:\.\d+)?)([\u0400-\u04FF\u02BCa-zA-Zʻʼ'])/gu, '$1 $2');
  t = t.replace(/([}\]])([\u0400-\u04FF\u02BCa-zA-Zʻʼ'])/gu, '$1 $2');
  return t;
}

/** Bo'sh dollar belgilarini olib tashlash */
function removeEmptyMathDelimiters(text) {
  let t = text.replace(/\$\$\s*\$\$/g, '');
  t = t.replace(/(?<!\$)\$\s*\$(?!\$)/g, '');
  return t;
}

// ─── Eksport funksiyalari ─────────────────────────────────────────────────────

/**
 * Yagona matn satrini tozalash.
 * @param {string} text
 * @returns {string}
 */
export function sanitizeMathText(text) {
  if (!text || typeof text !== 'string') return String(text ?? '');

  let t = text;
  t = fixBlockDollarBalance(t);
  t = ensureSpaceAroundBlockMath(t);
  t = ensureSpaceAroundInlineMath(t);
  t = fixMergedTextAfterMath(t);
  t = fixInlineDollarBalance(t);
  t = removeEmptyMathDelimiters(t);
  t = t.replace(/[ \t]{2,}/g, ' ').trim();

  return t;
}

/**
 * Savolni to'liq tozalash (questionText + options + correctOption).
 * @param {Object} question
 * @returns {Object}
 */
export function sanitizeQuestion(question) {
  if (!question || typeof question !== 'object') return question;

  const cleaned = { ...question };
  cleaned.questionText = sanitizeMathText(cleaned.questionText);
  if (Array.isArray(cleaned.options)) {
    cleaned.options = cleaned.options.map(sanitizeMathText);
  }
  if (cleaned.correctOption) {
    cleaned.correctOption = sanitizeMathText(cleaned.correctOption);
  }
  if (cleaned.subtopic) {
    cleaned.subtopic = String(cleaned.subtopic).trim();
  }
  return cleaned;
}

/**
 * Savollar massivini tozalash.
 * @param {Array} questions
 * @returns {Array}
 */
export function sanitizeQuestions(questions) {
  if (!Array.isArray(questions)) return questions ?? [];
  return questions.map(sanitizeQuestion);
}

/**
 * Savol buzilganligini tekshirish — kuchaytirilgan versiya.
 * @param {Object} q
 * @returns {boolean} true = buzilgan
 */
export function isQuestionMalformed(q) {
  if (!q || typeof q !== 'object') return true;
  const text = String(q.questionText ?? '');

  if (text.trim().length < 5) return true;

  // Orphan trailing $$
  if (/=\s*-?\d+\s*\$\$$/.test(text)) return true;
  if (/[^$]\$\$\s*$/.test(text)) return true;

  // Merged text (digit immediately followed by Cyrillic)
  if (/=\s*-?\d+[\u0400-\u04FF\u02BC]/u.test(text)) return true;

  // Toq inline $
  const singleDollars = (text.match(/(?<!\$)\$(?!\$)/g) ?? []).length;
  if (singleDollars % 2 !== 0) return true;

  // Toq $$
  const doubleDollars = (text.match(/\$\$/g) ?? []).length;
  if (doubleDollars % 2 !== 0) return true;

  // Options tekshiruvi
  if (!Array.isArray(q.options) || q.options.length < 2) return true;
  if (q.options.some(o => !o || String(o).trim().length === 0)) return true;
  if (!q.correctOption) return true;
  if (!q.options.includes(q.correctOption)) return true;

  return false;
}
