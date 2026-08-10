export type PlanType = 'free' | 'standard' | 'premium';
export type PlanStatus = 'active' | 'pending' | 'expired';

export interface PlanLimits {
  id: PlanType;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  maxDailyAiGenerations: number;
  maxActiveOnlineTests: number;
  maxStudentsPerTest: number;
  allowDocxExport: boolean;
  allowExcelExport: boolean;
  allowAiDiagnostics: boolean;
  allowCustomBranding: boolean;
  supportLevel: string;
}

export const PLAN_CONFIGS: Record<PlanType, PlanLimits> = {
  free: {
    id: 'free',
    name: 'Free',
    priceMonthly: 0,
    priceYearly: 0,
    maxDailyAiGenerations: 3,
    maxActiveOnlineTests: 2,
    maxStudentsPerTest: 15,
    allowDocxExport: false,
    allowExcelExport: false,
    allowAiDiagnostics: false,
    allowCustomBranding: false,
    supportLevel: 'Standart'
  },
  standard: {
    id: 'standard',
    name: 'Standard',
    priceMonthly: 49000,
    priceYearly: 470000,
    maxDailyAiGenerations: 25,
    maxActiveOnlineTests: Infinity,
    maxStudentsPerTest: 50,
    allowDocxExport: true,
    allowExcelExport: false,
    allowAiDiagnostics: true,
    allowCustomBranding: false,
    supportLevel: 'Priority (Tezkor)'
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    priceMonthly: 99000,
    priceYearly: 950000,
    maxDailyAiGenerations: Infinity,
    maxActiveOnlineTests: Infinity,
    maxStudentsPerTest: Infinity,
    allowDocxExport: true,
    allowExcelExport: true,
    allowAiDiagnostics: true,
    allowCustomBranding: true,
    supportLevel: '24/7 VIP & Menejer'
  }
};

export const getPlanLimits = (plan?: PlanType | string): PlanLimits => {
  if (plan === 'premium') return PLAN_CONFIGS.premium;
  if (plan === 'standard') return PLAN_CONFIGS.standard;
  return PLAN_CONFIGS.free;
};
