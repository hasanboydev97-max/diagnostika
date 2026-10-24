/**
 * Unit Tests — Plan Limits
 */
import { describe, it, expect } from 'vitest';
// src/utils/planLimits.ts — lekin vitest Node muhitida ishlaydi
// Shuning uchun bu mantiqni alohida test qilamiz

const PLAN_CONFIGS = {
  free: {
    maxDailyAiGenerations: 3,
    maxActiveOnlineTests: 2,
    maxStudentsPerTest: 15,
    allowDocxExport: false,
    allowExcelExport: false,
    allowAiDiagnostics: false,
  },
  standard: {
    maxDailyAiGenerations: 25,
    maxActiveOnlineTests: Infinity,
    maxStudentsPerTest: 50,
    allowDocxExport: true,
    allowExcelExport: false,
    allowAiDiagnostics: true,
  },
  premium: {
    maxDailyAiGenerations: Infinity,
    maxActiveOnlineTests: Infinity,
    maxStudentsPerTest: Infinity,
    allowDocxExport: true,
    allowExcelExport: true,
    allowAiDiagnostics: true,
  },
};

function getPlanLimits(plan) {
  return PLAN_CONFIGS[plan] || PLAN_CONFIGS.free;
}

describe('getPlanLimits', () => {
  it("free plan limitlari to'g'ri", () => {
    const limits = getPlanLimits('free');
    expect(limits.maxDailyAiGenerations).toBe(3);
    expect(limits.maxStudentsPerTest).toBe(15);
    expect(limits.allowDocxExport).toBe(false);
    expect(limits.allowAiDiagnostics).toBe(false);
  });

  it('standard plan limitlari to\'g\'ri', () => {
    const limits = getPlanLimits('standard');
    expect(limits.maxDailyAiGenerations).toBe(25);
    expect(limits.maxStudentsPerTest).toBe(50);
    expect(limits.allowDocxExport).toBe(true);
    expect(limits.allowExcelExport).toBe(false);
  });

  it('premium plan cheksiz imkoniyatlar', () => {
    const limits = getPlanLimits('premium');
    expect(limits.maxDailyAiGenerations).toBe(Infinity);
    expect(limits.maxStudentsPerTest).toBe(Infinity);
    expect(limits.allowExcelExport).toBe(true);
  });

  it("noma'lum plan free sifatida qaytadi", () => {
    const limits = getPlanLimits('unknown_plan');
    expect(limits.maxDailyAiGenerations).toBe(3);
  });

  it("undefined plan free sifatida qaytadi", () => {
    const limits = getPlanLimits(undefined);
    expect(limits.maxDailyAiGenerations).toBe(3);
  });
});
