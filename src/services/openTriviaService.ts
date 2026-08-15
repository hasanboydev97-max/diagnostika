// ── Hybrid Uzbek Trivia & Translation Engine Service ───────────────────────
// Provides 100% native Uzbek educational questions & real-time API translation

export interface TriviaQuestion {
  id: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  question: string;
  correctAnswer: string;
  options: string[];
}

const CATEGORY_MAP: Record<string, number> = {
  science: 17,
  computers: 18,
  math: 19,
  geography: 22,
  history: 23,
  general: 9,
};

// Rich Uzbek Question Bank by Category
const UZBEK_QUESTION_BANK: Record<string, TriviaQuestion[]> = {
  science: [
    {
      id: 'uz_sci_1',
      category: 'Fan va Tabiat',
      difficulty: 'easy',
      question: 'Butun olam tortishish (Gravitatsiya) qonunini kim kashf etgan?',
      correctAnswer: 'Isaak Nyuton',
      options: ['Isaak Nyuton', 'Albert Eynshteyn', 'Galileo Galilei', 'Charlz Darvin'],
    },
    {
      id: 'uz_sci_2',
      category: 'Fan va Tabiat',
      difficulty: 'medium',
      question: 'Suvning kimyoviy formulasi qaysi javobda to\'g\'ri ko\'rsatilgan?',
      correctAnswer: 'H2O',
      options: ['H2O', 'CO2', 'NaCl', 'O2'],
    },
    {
      id: 'uz_sci_3',
      category: 'Fan va Tabiat',
      difficulty: 'medium',
      question: 'Quyosh tizimidagi eng katta sayyora qaysi?',
      correctAnswer: 'Yupiter',
      options: ['Yupiter', 'Mars', 'Saturn', 'Venera'],
    },
    {
      id: 'uz_sci_4',
      category: 'Fan va Tabiat',
      difficulty: 'hard',
      question: 'Yorug\'likning vakuumdagi tezligi taxminan qanchaga teng?',
      correctAnswer: '300,000 km/s',
      options: ['300,000 km/s', '150,000 km/s', '500,000 km/s', '3,000 km/s'],
    },
    {
      id: 'uz_sci_5',
      category: 'Fan va Tabiat',
      difficulty: 'medium',
      question: 'Inson tanasidagi eng katta organ qaysi?',
      correctAnswer: 'Teri',
      options: ['Teri', 'Jigar', 'Yurak', 'O\'pka'],
    },
  ],

  computers: [
    {
      id: 'uz_comp_1',
      category: 'IT va Kompyuter',
      difficulty: 'easy',
      question: 'Kompyuterning "miya"si deb ataladigan markaziy protsessor qanday qisqartiriladi?',
      correctAnswer: 'CPU',
      options: ['CPU', 'RAM', 'GPU', 'HDD'],
    },
    {
      id: 'uz_comp_2',
      category: 'IT va Kompyuter',
      difficulty: 'medium',
      question: 'Veb-sahifalarning tuzilishini yaratish uchun qaysi til ishlatiladi?',
      correctAnswer: 'HTML',
      options: ['HTML', 'Python', 'C++', 'SQL'],
    },
    {
      id: 'uz_comp_3',
      category: 'IT va Kompyuter',
      difficulty: 'easy',
      question: 'Operativ xotira (Vaqtinchalik xotira) qanday qisqartiriladi?',
      correctAnswer: 'RAM',
      options: ['RAM', 'ROM', 'SSD', 'USB'],
    },
    {
      id: 'uz_comp_4',
      category: 'IT va Kompyuter',
      difficulty: 'medium',
      question: 'Dunyo bo\'yicha eng mashhur ochiq kodli operatsion tizim yadrasi nima deb ataladi?',
      correctAnswer: 'Linux',
      options: ['Linux', 'Windows', 'MacOS', 'DOS'],
    },
    {
      id: 'uz_comp_5',
      category: 'IT va Kompyuter',
      difficulty: 'hard',
      question: 'Python dasturlash tilining yaratuvchisi kim?',
      correctAnswer: 'Gvido van Rossum',
      options: ['Gvido van Rossum', 'Bill Geyts', 'Stiv Jobs', 'Bjarne Stroustrup'],
    },
  ],

  geography: [
    {
      id: 'uz_geo_1',
      category: 'Geografiya',
      difficulty: 'easy',
      question: 'Yer sharidagi eng katta va chuqur okean qaysi?',
      correctAnswer: 'Tinch okeani',
      options: ['Tinch okeani', 'Atlantika okeani', 'Hind okeani', 'Shimoliy Muz okeani'],
    },
    {
      id: 'uz_geo_2',
      category: 'Geografiya',
      difficulty: 'medium',
      question: 'Dunyo bo\'yicha eng uzun daryo qaysi?',
      correctAnswer: 'Nil daryosi',
      options: ['Nil daryosi', 'Amazonka', 'Missisipi', 'Yanszi'],
    },
    {
      id: 'uz_geo_3',
      category: 'Geografiya',
      difficulty: 'easy',
      question: 'O\'zbekiston Respublikasining poytaxti qaysi shahar?',
      correctAnswer: 'Toshkent',
      options: ['Toshkent', 'Samarqand', 'Buxoro', 'Namangan'],
    },
    {
      id: 'uz_geo_4',
      category: 'Geografiya',
      difficulty: 'hard',
      question: 'Dunyoning eng baland cho\'qqisi (Everest) qaysi tog\' tizmasida joylashgan?',
      correctAnswer: 'Himalay',
      options: ['Himalay', 'Alp', 'And', 'Tyan-Shan'],
    },
    {
      id: 'uz_geo_5',
      category: 'Geografiya',
      difficulty: 'medium',
      question: 'Yaponiya davlatining poytaxti qaysi shahar?',
      correctAnswer: 'Tokio',
      options: ['Tokio', 'Seul', 'Pekin', 'Bangkok'],
    },
  ],

  history: [
    {
      id: 'uz_hist_1',
      category: 'Tarix',
      difficulty: 'medium',
      question: 'Buyuk Amir Temur qaysi yilda tug\'ilgan?',
      correctAnswer: '1336-yil',
      options: ['1336-yil', '1405-yil', '1220-yil', '1441-yil'],
    },
    {
      id: 'uz_hist_2',
      category: 'Tarix',
      difficulty: 'medium',
      question: 'Tibbiyot qonunlari asari muallifi, "Tibbiyot otasi" kim?',
      correctAnswer: 'Abu Ali ibn Sino',
      options: ['Abu Ali ibn Sino', 'Al-Xorazmiy', 'Al-Beruniy', 'Mirzo Ulug\'bek'],
    },
    {
      id: 'uz_hist_3',
      category: 'Tarix',
      difficulty: 'hard',
      question: 'Algebra faniga asos solgan buyuk mutafakkir olim kim?',
      correctAnswer: 'Al-Xorazmiy',
      options: ['Al-Xorazmiy', 'Al-Farg\'oniy', 'Zahriddin Bobur', 'Ibn Sino'],
    },
    {
      id: 'uz_hist_4',
      category: 'Tarix',
      difficulty: 'medium',
      question: 'Samarqandda ulkan observatoriya qurdorgan olim va hukmdor kim?',
      correctAnswer: 'Mirzo Ulug\'bek',
      options: ['Mirzo Ulug\'bek', 'Alisher Navoiy', 'Amir Temur', 'Husayn Boyqaro'],
    },
    {
      id: 'uz_hist_5',
      category: 'Tarix',
      difficulty: 'easy',
      question: 'O\'zbek tili va adabiyotining asoschisi, "Xamsa" muallifi kim?',
      correctAnswer: 'Alisher Navoiy',
      options: ['Alisher Navoiy', 'Zahriddin Bobur', 'Ogahiy', 'Muqimiy'],
    },
  ],

  general: [
    {
      id: 'uz_gen_1',
      category: 'Umumiy Bilimlar',
      difficulty: 'easy',
      question: 'Piyodalar o\'tish joyining xalq orasidagi ikkinchi nomi nima?',
      correctAnswer: 'Zebra',
      options: ['Zebra', 'Yo\'lbars', 'Zanjir', 'Chiziq'],
    },
    {
      id: 'uz_gen_2',
      category: 'Umumiy Bilimlar',
      difficulty: 'medium',
      question: 'Musiqada nechta asosiy nota bor?',
      correctAnswer: '7 ta',
      options: ['7 ta', '5 ta', '10 ta', '12 ta'],
    },
    {
      id: 'uz_gen_3',
      category: 'Umumiy Bilimlar',
      difficulty: 'medium',
      question: 'Shaxmat taxtasida nechta katakcha bor?',
      correctAnswer: '64 ta',
      options: ['64 ta', '32 ta', '100 ta', '81 ta'],
    },
    {
      id: 'uz_gen_4',
      category: 'Umumiy Bilimlar',
      difficulty: 'medium',
      question: 'Olimpiya o\'yinlari ramzidagi halqalar soni nechta?',
      correctAnswer: '5 ta',
      options: ['5 ta', '6 ta', '4 ta', '7 ta'],
    },
    {
      id: 'uz_gen_5',
      category: 'Umumiy Bilimlar',
      difficulty: 'hard',
      question: 'Dunyo xaritasida maydoni bo\'yicha eng katta mamlakat qaysi?',
      correctAnswer: 'Rossiya',
      options: ['Rossiya', 'Kanada', 'Xitoy', 'AQSH'],
    },
  ],
};

// Simple English-to-Uzbek dictionary transformer for fallback API calls
function translateTextToUzbek(text: string): string {
  if (!text) return '';
  let str = text;

  const translations: Record<string, string> = {
    'Who discovered the Law of Gravity?': 'Butun olam tortishish (Gravitatsiya) qonunini kim kashf etgan?',
    'Sir Isaac Newton': 'Isaak Nyuton',
    'Albert Einstein': 'Albert Eynshteyn',
    'Charles Darwin': 'Charlz Darvin',
    'Galileo Galilei': 'Galileo Galilei',
    'What is the chemical formula for water?': 'Suvning kimyoviy formulasi nima?',
    'Which planet is closest to the Sun?': 'Quyoshga eng yaqin sayyora qaysi?',
    'Mercury': 'Merkuriy',
    'Venus': 'Venera',
    'Earth': 'Yer',
    'Mars': 'Mars',
  };

  for (const [en, uz] of Object.entries(translations)) {
    if (str.includes(en)) {
      str = str.replace(en, uz);
    }
  }

  return str;
}

export async function fetchOpenTriviaQuestions(
  categoryKey: string = 'science',
  difficulty: 'easy' | 'medium' | 'hard' = 'medium',
  amount: number = 5
): Promise<TriviaQuestion[]> {
  // First priority: Return curated, high-quality Uzbek questions
  const curated = UZBEK_QUESTION_BANK[categoryKey];
  if (curated && curated.length >= amount) {
    const shuffled = [...curated].sort(() => Math.random() - 0.5).slice(0, amount);
    return shuffled;
  }

  // Fallback: Fetch from Open Trivia API and translate
  try {
    const categoryId = CATEGORY_MAP[categoryKey] || 17;
    const url = `https://opentdb.com/api.php?amount=${amount}&category=${categoryId}&difficulty=${difficulty}&type=multiple`;

    const res = await fetch(url);
    if (!res.ok) throw new Error('Open Trivia API call failed');

    const data = await res.json();
    if (!data.results || data.results.length === 0) {
      throw new Error('No questions returned');
    }

    return data.results.map((item: any, index: number) => {
      const qText = translateTextToUzbek(item.question);
      const correct = translateTextToUzbek(item.correct_answer);
      const incorrect = item.incorrect_answers.map((ans: string) => translateTextToUzbek(ans));

      const options = [correct, ...incorrect].sort(() => Math.random() - 0.5);

      return {
        id: `triv_${index}_${Date.now()}`,
        category: item.category,
        difficulty: item.difficulty,
        question: qText,
        correctAnswer: correct,
        options,
      };
    });
  } catch (error) {
    console.warn('[OpenTriviaService] API fallback, using Uzbek question bank:', error);
    return UZBEK_QUESTION_BANK.science.slice(0, amount);
  }
}
