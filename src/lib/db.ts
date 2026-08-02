import type { QuestionBlueprint } from './blueprint';
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
  scores: {
    math: number;
    logic: number;
    analytical: number;
    verbal: number;
    creativity: number;
  };
  totalScore: number;
  questionResults: Record<number, boolean>;
  aiSummaryText?: string;
  aiAdviceText?: string;
  createdAt: string;
}

const LOCAL_DB_KEY = 'maktab_student_results';
const LOCAL_BLUEPRINT_KEY = 'maktab_blueprints_v2';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

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
    try {
      const res = await fetch(`${API_URL}/results/${id}`);
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn("Could not fetch from backend, trying local storage");
    }

    const current: StudentResult[] = await localforage.getItem<StudentResult[]>(LOCAL_DB_KEY) || [];
    return current.find(r => r.id === id);
  },

  async getAllResults(): Promise<StudentResult[]> {
    try {
      const res = await fetch(`${API_URL}/results`);
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn("Could not fetch from backend, returning local storage");
    }

    return await localforage.getItem<StudentResult[]>(LOCAL_DB_KEY) || [];
  }
};
