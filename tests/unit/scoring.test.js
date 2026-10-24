/**
 * Unit Tests — Scoring logikasi
 *
 * Bu oddiy, tez ishlaydigan testlar — DB, server kerak emas.
 * Senior developer har yangi funksiya yozganda test ham yozadi.
 */
import { describe, it, expect } from 'vitest';

// ─── Test qilinayotgan funksiyalar ────────────────────────────────────────────
// server/utils/scoring.js dan import
import { calculateScore, calculateSubjectScores, getPerformanceLevel } from '../../server/utils/scoring.js';

describe('calculateScore', () => {
  it("to'g'ri javoblar foizini hisoblaydi", () => {
    const score = calculateScore(7, 10);
    expect(score).toBe(70);
  });

  it("0 ta to'g'ri javob = 0 foiz", () => {
    expect(calculateScore(0, 10)).toBe(0);
  });

  it("barcha to'g'ri = 100 foiz", () => {
    expect(calculateScore(10, 10)).toBe(100);
  });

  it("0 ta savol bo'lsa — 0 qaytaradi (nolga bo'linish xatosi yo'q)", () => {
    expect(calculateScore(0, 0)).toBe(0);
  });

  it("manfiy qiymat qabul qilmaydi", () => {
    expect(calculateScore(-1, 10)).toBe(0);
  });
});

describe('getPerformanceLevel', () => {
  it("90+ = excellent", () => {
    expect(getPerformanceLevel(95)).toBe('excellent');
  });

  it("70-89 = good", () => {
    expect(getPerformanceLevel(75)).toBe('good');
  });

  it("50-69 = average", () => {
    expect(getPerformanceLevel(55)).toBe('average');
  });

  it("50 dan past = poor", () => {
    expect(getPerformanceLevel(40)).toBe('poor');
  });

  it("chegara qiymatlari (edge cases)", () => {
    expect(getPerformanceLevel(90)).toBe('excellent');
    expect(getPerformanceLevel(70)).toBe('good');
    expect(getPerformanceLevel(50)).toBe('average');
    expect(getPerformanceLevel(0)).toBe('poor');
  });
});
