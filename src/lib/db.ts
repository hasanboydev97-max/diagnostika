import type { QuestionBlueprint } from './blueprint';
import type { GeneratedQuestion } from './gemini';
import localforage from 'localforage';

localforage.config({
  name: 'MaktabTest',
  storeName: 'diagnostics_data'
});

export interface StudentResult {
  id: string; // the 6 digit login ID
  pin?: string; // the 4 digit PIN
  studentName: string;
  grade: string;
  blueprintSnapshot: QuestionBlueprint[];
  scores: Record<string, number>;
  totalScore: number;
  questionResults: Record<number, boolean>;
  aiSummaryText?: string;
  aiAdviceText?: string;
  aiRoadmap?: import('../components/RoadmapJourney').RoadmapStep[];
  createdAt: string;
}

export interface DiagnosticTest {
  id: string;
  grade: string;
  blueprint: QuestionBlueprint[];
  questions: GeneratedQuestion[];
  createdAt: string;
  status: 'active' | 'archived';
}

const LOCAL_DB_KEY = 'maktab_student_results';
const LOCAL_BLUEPRINT_KEY = 'maktab_blueprints_v2';
const LOCAL_DIAGNOSTIC_TESTS_KEY = 'maktab_diagnostic_tests';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const LOCAL_CUSTOM_CATEGORIES_KEY = 'maktab_custom_categories';

export const db = {
  // Blueprints (Keep blueprints local for now as they are static settings)
  saveBlueprint: async (grade: string, blueprint: QuestionBlueprint[]) => {
    const existing = (await localforage.getItem<Record<string, QuestionBlueprint[]>>(LOCAL_BLUEPRINT_KEY)) || {};
    existing[grade] = blueprint;
    await localforage.setItem(LOCAL_BLUEPRINT_KEY, existing);
  },
  
  getBlueprint: async (grade: string): Promise<QuestionBlueprint[] | null> => {
    const existing = await localforage.getItem<Record<string, QuestionBlueprint[]>>(LOCAL_BLUEPRINT_KEY);
    if (!existing) return null;
    return existing[grade] || null;
  },

  addCustomCategory: async (category: string) => {
    if (!category.trim()) return;
    const existing = await localforage.getItem<string[]>(LOCAL_CUSTOM_CATEGORIES_KEY) || [];
    if (!existing.includes(category)) {
      existing.push(category);
      await localforage.setItem(LOCAL_CUSTOM_CATEGORIES_KEY, existing);
    }
  },

  getAllCategories: async (): Promise<string[]> => {
    const defaultCats = ["Matematika", "Mantiq", "Analitik", "Verbal", "Kreativlik"];
    const all = new Set(defaultCats);
    
    const custom = await localforage.getItem<string[]>(LOCAL_CUSTOM_CATEGORIES_KEY);
    if (custom) {
      custom.forEach(c => all.add(c));
    }
    
    const existing = await localforage.getItem<Record<string, QuestionBlueprint[]>>(LOCAL_BLUEPRINT_KEY);
    if (existing) {
      Object.values(existing).forEach(bp => {
        bp.forEach(q => {
          if (q.category) all.add(q.category);
        });
      });
    }
    return Array.from(all);
  },

  // Results
  async saveResult(result: StudentResult): Promise<void> {
    try {
      await fetch(`${API_URL}/results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result)
      });
    } catch (e) {
      console.error("Backend Error, saving to local backup:", e);
    }
    
    // Always save locally as a reliable fallback
    const current: StudentResult[] = await localforage.getItem<StudentResult[]>(LOCAL_DB_KEY) || [];
    const existingIndex = current.findIndex(r => r.id === result.id);
    if (existingIndex >= 0) {
      current[existingIndex] = result;
    } else {
      current.unshift(result);
    }
    await localforage.setItem(LOCAL_DB_KEY, current);
  },

  async getResult(id: string): Promise<StudentResult | undefined> {
    let result: StudentResult | undefined = undefined;
    try {
      const res = await fetch(`${API_URL}/results/${id}`);
      if (res.ok) {
        result = await res.json();
      }
    } catch (e) {
      console.warn("Backenddan olishda xatolik, lokal bazadan qidiramiz...");
    }

    if (!result) {
      const current: StudentResult[] = await localforage.getItem<StudentResult[]>(LOCAL_DB_KEY) || [];
      result = current.find(r => r.id === id);
    }
    return result;
  },

  async getAllResults(): Promise<StudentResult[]> {
    const localResults = await localforage.getItem<StudentResult[]>(LOCAL_DB_KEY) || [];
    let remoteResults: StudentResult[] = [];
    let isBackendOnline = false;

    try {
      const res = await fetch(`${API_URL}/results`);
      if (res.ok) {
        remoteResults = await res.json();
        isBackendOnline = true;
      }
    } catch (e) {
      console.warn("Backendga ulanib bo'lmadi, faqat lokal ma'lumotlar ko'rsatiladi.");
    }

    // Ikkala bazadagi ma'lumotlarni ID bo'yicha birlashtirish
    const mergedMap = new Map<string, StudentResult>();
    
    // Oldin backend ma'lumotlarini qo'shamiz (ular ishonchliroq)
    remoteResults.forEach(r => mergedMap.set(r.id, r));
    
    // Agar backend ishlayotgan bo'lsa, lokalda bor lekin backendda yo'q ma'lumotlarni orqa fonga jo'natib (sinxronizatsiya) yuboramiz
    if (isBackendOnline) {
      for (const local of localResults) {
        if (!mergedMap.has(local.id)) {
           mergedMap.set(local.id, local);
           // Orqa fonga (MongoDB) saqlashga yuborish
           fetch(`${API_URL}/results`, {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify(local)
           }).catch(() => {});
        }
      }
    } else {
      // Agar backend o'chgan bo'lsa, bor lokalni hammasini qo'shamiz
      localResults.forEach(r => mergedMap.set(r.id, r));
    }
    
    // Vaqti bo'yicha saralab (eng yangilari tepada) qaytaramiz
    return Array.from(mergedMap.values()).sort((a, b) => {
       const timeA = new Date(a.createdAt || 0).getTime();
       const timeB = new Date(b.createdAt || 0).getTime();
       return timeB - timeA;
    });
  },

  // --- Admin Methods ---
  async getAdminStats(token: string) {
    const res = await fetch(`${API_URL}/admin/stats`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  
  async getAdminTeachers(token: string) {
    const res = await fetch(`${API_URL}/admin/teachers`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getAdminTests(token: string) {
    const res = await fetch(`${API_URL}/admin/tests`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getAdminResults(token: string) {
    const res = await fetch(`${API_URL}/admin/results`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async requestSubscription(token: string, requestedPlan: string, paymentNote?: string) {
    const res = await fetch(`${API_URL}/subscription/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ requestedPlan, paymentNote })
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getAdminSubscriptions(token: string) {
    const res = await fetch(`${API_URL}/admin/subscriptions`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async updateTeacherPlan(token: string, teacherId: string, plan: string, status: string = 'active', durationDays: number = 30) {
    const res = await fetch(`${API_URL}/admin/subscriptions/update-plan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ teacherId, plan, status, durationDays })
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  // --- Diagnostic Tests (Local) ---
  async saveDiagnosticTest(test: DiagnosticTest): Promise<void> {
    const current = await localforage.getItem<DiagnosticTest[]>(LOCAL_DIAGNOSTIC_TESTS_KEY) || [];
    const existingIndex = current.findIndex(t => t.id === test.id);
    if (existingIndex >= 0) {
      current[existingIndex] = test;
    } else {
      current.unshift(test);
    }
    await localforage.setItem(LOCAL_DIAGNOSTIC_TESTS_KEY, current);
  },

  async getDiagnosticTest(id: string): Promise<DiagnosticTest | undefined> {
    const current = await localforage.getItem<DiagnosticTest[]>(LOCAL_DIAGNOSTIC_TESTS_KEY) || [];
    return current.find(t => t.id === id);
  },

  async getAllDiagnosticTests(): Promise<DiagnosticTest[]> {
    return await localforage.getItem<DiagnosticTest[]>(LOCAL_DIAGNOSTIC_TESTS_KEY) || [];
  }
};
