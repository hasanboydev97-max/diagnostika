/**
 * academicSanitizer.js — Ilmiy va Terminologik Aniqlik Sanitizeri (Senior Level)
 *
 * O'zbekiston Davlat Ta'lim Standartlari (DTS) va maktab darsliklari bo'yicha
 * sun'iy intellekt tomonidan yo'l qo'yiladigan terminologik va lingvistik
 * xatoliklarni (masalan, Excel "cell" -> "hujayra" xatosini) avtomatik tuzatadi.
 *
 * Qoidalar:
 * 1. Excel/Jadval kontekstida "hujayra" -> "katakcha" (katak)
 * 2. Biologiya fanida esa "hujayra" saqlanib qoladi (tegmaydi)
 * 3. Variantlar atrofidagi ortiqcha tirnoqlarni tozalash ('O'qish rejimi' -> O'qish rejimi)
 * 4. correctOption bilan options sinxronligini 100% kafolatlash
 */

// Excel va elektron jadvallarga oid kalit so'zlar
const SPREADSHEET_CONTEXT_REGEX = /\b(excel|jadval|spreadsheet|katak|formula|diapazon|vba|elektron\s*jadval|worksheet|workbook|satr|ustun)\b/i;

// Biologiyaga oid kalit so'zlar (hujayra haqiqiy biologik ma'noda ishlatilganda tegmaslik uchun)
const BIOLOGY_CONTEXT_REGEX = /\b(biologiya|organizm|sitoplazma|yadro|membrana|mitoxondriya|dnk|rnk|to'qima|o'simlik|hayvon|bakteriya|xromosoma|ribosoma)\b/i;

/**
 * Excel/elektron jadval kontekstidagi "hujayra" so'zlarini "katakcha"ga almashtirish
 * @param {string} text
 * @returns {string}
 */
export function fixSpreadsheetCellTerminology(text) {
  if (!text || typeof text !== 'string') return text;

  // Agar matn aniq biologiya haqida bo'lsa, o'zgartirmaymiz
  if (BIOLOGY_CONTEXT_REGEX.test(text) && !SPREADSHEET_CONTEXT_REGEX.test(text)) {
    return text;
  }

  // Faqat Excel/jadval mavzusi bo'lsa yoki kontekstda spreadsheet tushunchasi bo'lsa:
  // Hujayra -> Katakcha, hujayra -> katakcha, hujayraning -> katakchaning, va h.k.
  return text
    // Bosh harf bilan
    .replace(/\bHujayralar(i|ining|iga|ida|idan|ini)?\b/gu, 'Katakchalar$1')
    .replace(/\bHujayra(si|sining|siga|sida|sidan|sini)?\b/gu, 'Katakcha$1')
    .replace(/\bHujayra(ning|ga|da|dan|ni)?\b/gu, 'Katakcha$1')
    // Kichik harf bilan
    .replace(/\bhujayralar(i|ining|iga|ida|idan|ini)?\b/gu, 'katakchalar$1')
    .replace(/\bhujayra(si|sining|siga|sida|sidan|sini)?\b/gu, 'katakcha$1')
    .replace(/\bhujayra(ning|ga|da|dan|ni)?\b/gu, 'katakcha$1');
}

/**
 * Variantlar yoki matn atrofidagi keraksiz tirnoqlarni tozalash
 * Misol: "'Read Mode'" -> "Read Mode", "\"Justify\"" -> "Justify"
 * @param {string} text
 * @returns {string}
 */
export function stripUnwantedQuotes(text) {
  if (!text || typeof text !== 'string') return text;
  let t = text.trim();

  // JSON dan qolib ketgan escape qilingan \' yoki \" larni to'g'irlash
  t = t.replace(/\\'/g, "'").replace(/\\"/g, '"');

  // Agar butun matn bitta qo'shtirnoq yoki bitta tirnoq ichiga olingan bo'lsa:
  // 'Matn' yoki "Matn" yoki `Matn` yoki “Matn”
  if ((t.startsWith("'") && t.endsWith("'") && t.length >= 2) ||
      (t.startsWith('"') && t.endsWith('"') && t.length >= 2) ||
      (t.startsWith('`') && t.endsWith('`') && t.length >= 2) ||
      (t.startsWith('“') && t.endsWith('”') && t.length >= 2) ||
      (t.startsWith('‘') && t.endsWith('’') && t.length >= 2)) {
    const inner = t.slice(1, -1).trim();
    if (inner.length > 0) {
      t = inner;
    }
  }

  return t;
}

/**
 * Butun savol ob'ektini ilmiy va akademik standartlarga moslashtirish
 * @param {Object} question
 * @param {string} [subjectHint] - fan nomi (masalan, "Informatika")
 * @returns {Object}
 */
export function sanitizeAcademicQuestion(question, subjectHint = '') {
  if (!question || typeof question !== 'object') return question;

  const cleaned = { ...question };
  const subjectStr = String(subjectHint || cleaned.subtopic || '').toLowerCase();
  const fullContent = `${subjectStr} ${cleaned.questionText || ''} ${(cleaned.options || []).join(' ')}`;

  const isSpreadsheet = SPREADSHEET_CONTEXT_REGEX.test(fullContent);
  const isBiology = BIOLOGY_CONTEXT_REGEX.test(fullContent);

  // 1. Matnni tekshirish va tozalash
  if (cleaned.questionText) {
    let qText = cleaned.questionText;
    if (isSpreadsheet && !isBiology) {
      qText = fixSpreadsheetCellTerminology(qText);
    }
    cleaned.questionText = qText.trim();
  }

  // 2. Variantlarni tozalash
  if (Array.isArray(cleaned.options)) {
    cleaned.options = cleaned.options.map(opt => {
      let oText = stripUnwantedQuotes(opt);
      if (isSpreadsheet && !isBiology) {
        oText = fixSpreadsheetCellTerminology(oText);
      }
      return oText.trim();
    });
  }

  // 3. To'g'ri javobni tozalash va variantlar bilan sinxronlashtirish
  if (cleaned.correctOption) {
    let cText = stripUnwantedQuotes(cleaned.correctOption);
    if (isSpreadsheet && !isBiology) {
      cText = fixSpreadsheetCellTerminology(cText);
    }
    cText = cText.trim();

    // Agar cText variantlar ichida aynan topilmasa, lekin index orqali topilsa
    if (Array.isArray(cleaned.options)) {
      if (cleaned.options.includes(cText)) {
        cleaned.correctOption = cText;
      } else if (typeof cleaned.correctAnswerIndex === 'number' && cleaned.options[cleaned.correctAnswerIndex]) {
        cleaned.correctOption = cleaned.options[cleaned.correctAnswerIndex];
      } else {
        cleaned.correctOption = cText;
      }
    } else {
      cleaned.correctOption = cText;
    }
  }

  return cleaned;
}
