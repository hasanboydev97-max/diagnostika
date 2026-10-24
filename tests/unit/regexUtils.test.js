/**
 * Unit Tests — RegEx escaping (ReDoS himoyasi)
 */
import { describe, it, expect } from 'vitest';
import { escapeRegex } from '../../server/utils/regexUtils.js';

describe('escapeRegex', () => {
  it("oddiy matn o'zgarmaydi", () => {
    expect(escapeRegex('Alisher Navoiy')).toBe('Alisher Navoiy');
  });

  it("maxsus belgilarni escape qiladi", () => {
    expect(escapeRegex('a+b')).toBe('a\\+b');
    expect(escapeRegex('a.b')).toBe('a\\.b');
    expect(escapeRegex('(test)')).toBe('\\(test\\)');
    // [ va ] escape qilinadi, lekin - bracket ichida emas shuning uchun escape shart emas
    expect(escapeRegex('[az]')).toBe('\\[az\\]');
    expect(escapeRegex('a*b?c')).toBe('a\\*b\\?c');
    expect(escapeRegex('a$b')).toBe('a\\$b');
    expect(escapeRegex('^test')).toBe('\\^test');
  });

  it("ReDoS hujumi qilishi mumkin bo'lgan matnni xavfsiz qiladi", () => {
    const malicious = '((a+)+)+';
    const escaped = escapeRegex(malicious);
    // Escaped version xavfsiz regex sifatida ishlatilishi mumkin
    expect(() => new RegExp(escaped)).not.toThrow();
  });

  it("bo'sh matn", () => {
    expect(escapeRegex('')).toBe('');
  });
});
