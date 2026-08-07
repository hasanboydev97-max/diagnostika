export type SubjectCategory = string; // Was: 'math' | 'logic' | 'analytical' | 'verbal' | 'creativity';
export type Difficulty = 'Oson' | 'O\'rta' | 'Qiyin';
export type CognitiveSkill = 'Tushunish' | 'Qo\'llash' | 'Tahlil qilish' | 'Baholash' | 'Sintezlash';
export type ThinkingType = 'Analitik' | 'Induktiv' | 'Deduktiv' | 'Fazoviy';

export const DEFAULT_CATEGORIES = [
  'Matematika', 
  'Mantiq', 
  'Analitik', 
  'Verbal', 
  'Kreativlik'
];

export interface QuestionBlueprint {
  id: number;
  topic: string;
  category: SubjectCategory;
  skill: CognitiveSkill;
  thinkingType: ThinkingType;
  difficulty: Difficulty;
  timeEstimate: string; // e.g. "1min", "45s"
}

// 30 ta mukammal tuzilgan diagnostika savollari qolipi
export const QUESTIONS_BLUEPRINT: QuestionBlueprint[] = [
  // Matematika (6 ta savol)
  { id: 1, topic: 'Natural sonlar va amallar', category: 'Matematika', skill: 'Tushunish', thinkingType: 'Deduktiv', difficulty: 'Oson', timeEstimate: '45s' },
  { id: 2, topic: 'Oddiy va o\'nli kasrlar', category: 'Matematika', skill: 'Qo\'llash', thinkingType: 'Deduktiv', difficulty: 'O\'rta', timeEstimate: '1min 30s' },
  { id: 3, topic: 'Foiz va nisbat', category: 'Matematika', skill: 'Tahlil qilish', thinkingType: 'Analitik', difficulty: 'O\'rta', timeEstimate: '1min 45s' },
  { id: 4, topic: 'Matnli masalalar', category: 'Matematika', skill: 'Sintezlash', thinkingType: 'Induktiv', difficulty: 'Qiyin', timeEstimate: '2min' },
  { id: 5, topic: 'Geometriya (Yuz va perimetr)', category: 'Matematika', skill: 'Qo\'llash', thinkingType: 'Fazoviy', difficulty: 'O\'rta', timeEstimate: '1min 30s' },
  { id: 6, topic: 'Tenglama va tengsizliklar', category: 'Matematika', skill: 'Tahlil qilish', thinkingType: 'Analitik', difficulty: 'Qiyin', timeEstimate: '2min 15s' },

  // Mantiq (6 ta savol)
  { id: 7, topic: 'Shakllar ketma-ketligi', category: 'Mantiq', skill: 'Tushunish', thinkingType: 'Induktiv', difficulty: 'Oson', timeEstimate: '30s' },
  { id: 8, topic: 'Raqamlar qonuniyati', category: 'Mantiq', skill: 'Tahlil qilish', thinkingType: 'Induktiv', difficulty: 'O\'rta', timeEstimate: '1min' },
  { id: 9, topic: 'Mantiqiy shartlar (Agar... unda...)', category: 'Mantiq', skill: 'Baholash', thinkingType: 'Deduktiv', difficulty: 'O\'rta', timeEstimate: '1min 30s' },
  { id: 10, topic: 'Fazoviy tasavvur (Kubiklar)', category: 'Mantiq', skill: 'Qo\'llash', thinkingType: 'Fazoviy', difficulty: 'Qiyin', timeEstimate: '2min' },
  { id: 11, topic: 'Yolg\'on/Rost tasdiqlar', category: 'Mantiq', skill: 'Baholash', thinkingType: 'Deduktiv', difficulty: 'O\'rta', timeEstimate: '1min 45s' },
  { id: 12, topic: 'Murakkab qonuniyatlar', category: 'Mantiq', skill: 'Sintezlash', thinkingType: 'Induktiv', difficulty: 'Qiyin', timeEstimate: '2min 30s' },

  // Analitik fikrlash (6 ta savol)
  { id: 13, topic: 'Jadvalli ma\'lumotlar tahlili', category: 'Analitik', skill: 'Tahlil qilish', thinkingType: 'Analitik', difficulty: 'O\'rta', timeEstimate: '1min 30s' },
  { id: 14, topic: 'Diagrammalar o\'qish', category: 'Analitik', skill: 'Tushunish', thinkingType: 'Analitik', difficulty: 'Oson', timeEstimate: '45s' },
  { id: 15, topic: 'Ma\'lumotlar yetarliligini tekshirish', category: 'Analitik', skill: 'Baholash', thinkingType: 'Deduktiv', difficulty: 'Qiyin', timeEstimate: '2min' },
  { id: 16, topic: 'Muammoni qismlarga ajratish', category: 'Analitik', skill: 'Tahlil qilish', thinkingType: 'Analitik', difficulty: 'O\'rta', timeEstimate: '1min 45s' },
  { id: 17, topic: 'Statistik ehtimollik', category: 'Analitik', skill: 'Qo\'llash', thinkingType: 'Induktiv', difficulty: 'Qiyin', timeEstimate: '2min 15s' },
  { id: 18, topic: 'Sabab-oqibat bog\'lanishlari', category: 'Analitik', skill: 'Sintezlash', thinkingType: 'Deduktiv', difficulty: 'O\'rta', timeEstimate: '1min 15s' },

  // Og'zaki nutq / Verbal (6 ta savol)
  { id: 19, topic: 'Sinonim va antonimlar', category: 'Verbal', skill: 'Tushunish', thinkingType: 'Induktiv', difficulty: 'Oson', timeEstimate: '30s' },
  { id: 20, topic: 'Matnni tushunish (Asosiy g\'oya)', category: 'Verbal', skill: 'Tahlil qilish', thinkingType: 'Analitik', difficulty: 'O\'rta', timeEstimate: '2min' },
  { id: 21, topic: 'Gapdagi mantiqiy xatoni topish', category: 'Verbal', skill: 'Baholash', thinkingType: 'Deduktiv', difficulty: 'O\'rta', timeEstimate: '1min 15s' },
  { id: 22, topic: 'Maqol va iboralar ma\'nosi', category: 'Verbal', skill: 'Qo\'llash', thinkingType: 'Induktiv', difficulty: 'Oson', timeEstimate: '45s' },
  { id: 23, topic: 'Matnni xulosalash', category: 'Verbal', skill: 'Sintezlash', thinkingType: 'Analitik', difficulty: 'Qiyin', timeEstimate: '2min 15s' },
  { id: 24, topic: 'So\'z o\'yinlari, o\'xshatishlar', category: 'Verbal', skill: 'Tahlil qilish', thinkingType: 'Induktiv', difficulty: 'O\'rta', timeEstimate: '1min' },

  // Kreativlik (6 ta savol)
  { id: 25, topic: 'Noan\'anaviy yechimlar izlash', category: 'Kreativlik', skill: 'Sintezlash', thinkingType: 'Induktiv', difficulty: 'Qiyin', timeEstimate: '2min 30s' },
  { id: 26, topic: 'Tasavvur qilish va to\'ldirish', category: 'Kreativlik', skill: 'Qo\'llash', thinkingType: 'Fazoviy', difficulty: 'O\'rta', timeEstimate: '1min 30s' },
  { id: 27, topic: 'Turli obyektlarni bog\'lash', category: 'Kreativlik', skill: 'Tahlil qilish', thinkingType: 'Analitik', difficulty: 'O\'rta', timeEstimate: '1min 15s' },
  { id: 28, topic: 'Yangi shakl yasash', category: 'Kreativlik', skill: 'Sintezlash', thinkingType: 'Fazoviy', difficulty: 'Qiyin', timeEstimate: '2min' },
  { id: 29, topic: 'Vaziyatdan chiqib ketish', category: 'Kreativlik', skill: 'Baholash', thinkingType: 'Deduktiv', difficulty: 'O\'rta', timeEstimate: '1min 45s' },
  { id: 30, topic: 'G\'oyalar xilma-xilligi', category: 'Kreativlik', skill: 'Tushunish', thinkingType: 'Induktiv', difficulty: 'Oson', timeEstimate: '1min' },
];
