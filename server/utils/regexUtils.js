/**
 * ReDoS (Regular Expression Denial of Service) dan himoya qiluvchi yordamchi funksiya.
 * Foydalanuvchidan kelgan matnni RegExp ichida ishlatishdan oldin maxsus belgilarni ekranlash (escape) kerak.
 * Agar bu qilinmasa, hacker `(((a+)+)+)` kabi matn yuborib, serverni osishi mumkin.
 */
export function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
