export type SubjectCategory = 'math' | 'logic' | 'analytical' | 'verbal' | 'creativity';
export type Difficulty = 'Oson' | 'O\'rta' | 'Qiyin';
export type CognitiveSkill = 'Tushunish' | 'Qo\'llash' | 'Tahlil qilish' | 'Baholash' | 'Sintezlash';
export type ThinkingType = 'Analitik' | 'Induktiv' | 'Deduktiv' | 'Fazoviy';

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
  { id: 1, topic: 'Natural sonlar va amallar', category: 'math', skill: 'Tushunish', thinkingType: 'Deduktiv', difficulty: 'Oson', timeEstimate: '45s' },
  { id: 2, topic: 'Oddiy va o\'nli kasrlar', category: 'math', skill: 'Qo\'llash', thinkingType: 'Deduktiv', difficulty: 'O\'rta', timeEstimate: '1min 30s' },
  { id: 3, topic: 'Foiz va nisbat', category: 'math', skill: 'Tahlil qilish', thinkingType: 'Analitik', difficulty: 'O\'rta', timeEstimate: '1min 45s' },
  { id: 4, topic: 'Matnli masalalar', category: 'math', skill: 'Sintezlash', thinkingType: 'Induktiv', difficulty: 'Qiyin', timeEstimate: '2min' },
  { id: 5, topic: 'Geometriya (Yuz va perimetr)', category: 'math', skill: 'Qo\'llash', thinkingType: 'Fazoviy', difficulty: 'O\'rta', timeEstimate: '1min 30s' },
  { id: 6, topic: 'Tenglama va tengsizliklar', category: 'math', skill: 'Tahlil qilish', thinkingType: 'Analitik', difficulty: 'Qiyin', timeEstimate: '2min 15s' },

  // Mantiq (6 ta savol)
  { id: 7, topic: 'Shakllar ketma-ketligi', category: 'logic', skill: 'Tushunish', thinkingType: 'Induktiv', difficulty: 'Oson', timeEstimate: '30s' },
  { id: 8, topic: 'Raqamlar qonuniyati', category: 'logic', skill: 'Tahlil qilish', thinkingType: 'Induktiv', difficulty: 'O\'rta', timeEstimate: '1min' },
  { id: 9, topic: 'Mantiqiy shartlar (Agar... unda...)', category: 'logic', skill: 'Baholash', thinkingType: 'Deduktiv', difficulty: 'O\'rta', timeEstimate: '1min 30s' },
  { id: 10, topic: 'Fazoviy tasavvur (Kubiklar)', category: 'logic', skill: 'Qo\'llash', thinkingType: 'Fazoviy', difficulty: 'Qiyin', timeEstimate: '2min' },
  { id: 11, topic: 'Yolg\'on/Rost tasdiqlar', category: 'logic', skill: 'Baholash', thinkingType: 'Deduktiv', difficulty: 'O\'rta', timeEstimate: '1min 45s' },
  { id: 12, topic: 'Murakkab qonuniyatlar', category: 'logic', skill: 'Sintezlash', thinkingType: 'Induktiv', difficulty: 'Qiyin', timeEstimate: '2min 30s' },

  // Analitik fikrlash (6 ta savol)
  { id: 13, topic: 'Jadvalli ma\'lumotlar tahlili', category: 'analytical', skill: 'Tahlil qilish', thinkingType: 'Analitik', difficulty: 'O\'rta', timeEstimate: '1min 30s' },
  { id: 14, topic: 'Diagrammalar o\'qish', category: 'analytical', skill: 'Tushunish', thinkingType: 'Analitik', difficulty: 'Oson', timeEstimate: '45s' },
  { id: 15, topic: 'Ma\'lumotlar yetarliligini tekshirish', category: 'analytical', skill: 'Baholash', thinkingType: 'Deduktiv', difficulty: 'Qiyin', timeEstimate: '2min' },
  { id: 16, topic: 'Muammoni qismlarga ajratish', category: 'analytical', skill: 'Tahlil qilish', thinkingType: 'Analitik', difficulty: 'O\'rta', timeEstimate: '1min 45s' },
  { id: 17, topic: 'Statistik ehtimollik', category: 'analytical', skill: 'Qo\'llash', thinkingType: 'Induktiv', difficulty: 'Qiyin', timeEstimate: '2min 15s' },
  { id: 18, topic: 'Sabab-oqibat bog\'lanishlari', category: 'analytical', skill: 'Sintezlash', thinkingType: 'Deduktiv', difficulty: 'O\'rta', timeEstimate: '1min 15s' },

  // Og'zaki nutq / Verbal (6 ta savol)
  { id: 19, topic: 'Sinonim va antonimlar', category: 'verbal', skill: 'Tushunish', thinkingType: 'Induktiv', difficulty: 'Oson', timeEstimate: '30s' },
  { id: 20, topic: 'Matnni tushunish (Asosiy g\'oya)', category: 'verbal', skill: 'Tahlil qilish', thinkingType: 'Analitik', difficulty: 'O\'rta', timeEstimate: '2min' },
  { id: 21, topic: 'Gapdagi mantiqiy xatoni topish', category: 'verbal', skill: 'Baholash', thinkingType: 'Deduktiv', difficulty: 'O\'rta', timeEstimate: '1min 15s' },
  { id: 22, topic: 'Maqol va iboralar ma\'nosi', category: 'verbal', skill: 'Qo\'llash', thinkingType: 'Induktiv', difficulty: 'Oson', timeEstimate: '45s' },
  { id: 23, topic: 'Matnni xulosalash', category: 'verbal', skill: 'Sintezlash', thinkingType: 'Analitik', difficulty: 'Qiyin', timeEstimate: '2min 15s' },
  { id: 24, topic: 'So\'z o\'yinlari, o\'xshatishlar', category: 'verbal', skill: 'Tahlil qilish', thinkingType: 'Induktiv', difficulty: 'O\'rta', timeEstimate: '1min' },

  // Kreativlik (6 ta savol)
  { id: 25, topic: 'Noan\'anaviy yechimlar izlash', category: 'creativity', skill: 'Sintezlash', thinkingType: 'Induktiv', difficulty: 'Qiyin', timeEstimate: '2min 30s' },
  { id: 26, topic: 'Tasavvur qilish va to\'ldirish', category: 'creativity', skill: 'Qo\'llash', thinkingType: 'Fazoviy', difficulty: 'O\'rta', timeEstimate: '1min 30s' },
  { id: 27, topic: 'Turli obyektlarni bog\'lash', category: 'creativity', skill: 'Tahlil qilish', thinkingType: 'Analitik', difficulty: 'O\'rta', timeEstimate: '1min 15s' },
  { id: 28, topic: 'Yangi shakl yasash', category: 'creativity', skill: 'Sintezlash', thinkingType: 'Fazoviy', difficulty: 'Qiyin', timeEstimate: '2min' },
  { id: 29, topic: 'Vaziyatdan chiqib ketish', category: 'creativity', skill: 'Baholash', thinkingType: 'Deduktiv', difficulty: 'O\'rta', timeEstimate: '1min 45s' },
  { id: 30, topic: 'G\'oyalar xilma-xilligi', category: 'creativity', skill: 'Tushunish', thinkingType: 'Induktiv', difficulty: 'Oson', timeEstimate: '1min' },
];
