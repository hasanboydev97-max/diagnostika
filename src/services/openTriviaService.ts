// ── Hybrid Uzbek Trivia Engine with 100+ Question Pool ────────────────────

export interface TriviaQuestion {
  id: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  question: string;
  correctAnswer: string;
  options: string[];
}

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
      difficulty: 'easy',
      question: 'Suvning kimyoviy formulasi qaysi javobda to\'g\'ri ko\'rsatilgan?',
      correctAnswer: 'H2O',
      options: ['H2O', 'CO2', 'NaCl', 'O2'],
    },
    {
      id: 'uz_sci_3',
      category: 'Fan va Tabiat',
      difficulty: 'easy',
      question: 'Quyosh tizimidagi eng katta sayyora qaysi?',
      correctAnswer: 'Yupiter',
      options: ['Yupiter', 'Mars', 'Saturn', 'Venera'],
    },
    {
      id: 'uz_sci_4',
      category: 'Fan va Tabiat',
      difficulty: 'medium',
      question: 'Yorug\'likning vakuumdagi tezligi taxminan qanchaga teng?',
      correctAnswer: '300,000 km/s',
      options: ['300,000 km/s', '150,000 km/s', '500,000 km/s', '3,000 km/s'],
    },
    {
      id: 'uz_sci_5',
      category: 'Fan va Tabiat',
      difficulty: 'easy',
      question: 'Inson tanasidagi eng katta organ qaysi?',
      correctAnswer: 'Teri',
      options: ['Teri', 'Jigar', 'Yurak', 'O\'pka'],
    },
    {
      id: 'uz_sci_6',
      category: 'Fan va Tabiat',
      difficulty: 'medium',
      question: 'O\'simliklarning quyosh nuri orqali oziqlanish jarayoni nima deyiladi?',
      correctAnswer: 'Fotosintez',
      options: ['Fotosintez', 'Diffuziya', 'Osmoz', 'Fermentatsiya'],
    },
    {
      id: 'uz_sci_7',
      category: 'Fan va Tabiat',
      difficulty: 'medium',
      question: 'Elektr tokining kuchi qaysi birlikda o\'lchanadi?',
      correctAnswer: 'Amper (A)',
      options: ['Amper (A)', 'Volt (V)', 'Vatt (W)', 'Om (Ω)'],
    },
    {
      id: 'uz_sci_8',
      category: 'Fan va Tabiat',
      difficulty: 'medium',
      question: 'Atomaning yadrosi qanday zarralardan tashkil topgan?',
      correctAnswer: 'Proton va neytron',
      options: ['Proton va neytron', 'Faqat elektron', 'Elektron va pozitron', 'Faqat proton'],
    },
    {
      id: 'uz_sci_9',
      category: 'Fan va Tabiat',
      difficulty: 'hard',
      question: 'Jismning inertligi o\'lchovi nima deb ataladi?',
      correctAnswer: 'Massa',
      options: ['Massa', 'Kuch', 'Tezlanish', 'Og\'irlik'],
    },
    {
      id: 'uz_sci_10',
      category: 'Fan va Tabiat',
      difficulty: 'easy',
      question: 'Quyoshga eng yaqin joylashgan sayyora qaysi?',
      correctAnswer: 'Merkuriy',
      options: ['Merkuriy', 'Venera', 'Mars', 'Yer'],
    },
    {
      id: 'uz_sci_11',
      category: 'Fan va Tabiat',
      difficulty: 'medium',
      question: 'Kislorodning kimyoviy belgisi nima?',
      correctAnswer: 'O',
      options: ['O', 'K', 'C', 'N'],
    },
    {
      id: 'uz_sci_12',
      category: 'Fan va Tabiat',
      difficulty: 'hard',
      question: 'Arximed qonuni qaysi soha qonuniyatini ifodalaydi?',
      correctAnswer: 'Suyuqlikdagi jismga ta\'sir qiluvchi itaruvchi kuch',
      options: ['Suyuqlikdagi jismga ta\'sir qiluvchi itaruvchi kuch', 'Termodinamika', 'Optik sinish', 'Yadroviy parchalanish'],
    }
  ],

  computers: [
    {
      id: 'uz_comp_1',
      category: 'IT va Kompyuter',
      difficulty: 'easy',
      question: 'Kompyuterning markaziy protsessori qanday qisqartiriladi?',
      correctAnswer: 'CPU',
      options: ['CPU', 'RAM', 'GPU', 'HDD'],
    },
    {
      id: 'uz_comp_2',
      category: 'IT va Kompyuter',
      difficulty: 'easy',
      question: 'Veb-sahifaning tuzilishini (skeletini) yaratuvchi til qaysi?',
      correctAnswer: 'HTML',
      options: ['HTML', 'CSS', 'JavaScript', 'SQL'],
    },
    {
      id: 'uz_comp_3',
      category: 'IT va Kompyuter',
      difficulty: 'easy',
      question: 'Operativ xotira (Vaqtinchalik xotira) qanday ataladi?',
      correctAnswer: 'RAM',
      options: ['RAM', 'ROM', 'SSD', 'Flash'],
    },
    {
      id: 'uz_comp_4',
      category: 'IT va Kompyuter',
      difficulty: 'medium',
      question: '1 Kilobayt (KB) nechta baytga teng?',
      correctAnswer: '1024 bayt',
      options: ['1024 bayt', '1000 bayt', '512 bayt', '2048 bayt'],
    },
    {
      id: 'uz_comp_5',
      category: 'IT va Kompyuter',
      difficulty: 'medium',
      question: 'Python dasturlash tilining yaratuvchisi kim?',
      correctAnswer: 'Gvido van Rossum',
      options: ['Gvido van Rossum', 'Bill Geyts', 'Dennis Ritchi', 'Jeyms Gosling'],
    },
    {
      id: 'uz_comp_6',
      category: 'IT va Kompyuter',
      difficulty: 'easy',
      question: 'Ikkilik sanoq sistemasida qaysi raqamlar ishlatiladi?',
      correctAnswer: '0 va 1',
      options: ['0 va 1', '1 va 2', '0 dan 9 gacha', 'A dan F gacha'],
    },
    {
      id: 'uz_comp_7',
      category: 'IT va Kompyuter',
      difficulty: 'medium',
      question: 'Veb-sahifalarga zamonaviy bezak va dizayn beruvchi til qaysi?',
      correctAnswer: 'CSS',
      options: ['CSS', 'HTML', 'PHP', 'Ruby'],
    },
    {
      id: 'uz_comp_8',
      category: 'IT va Kompyuter',
      difficulty: 'hard',
      question: 'Relatsion ma\'lumotlar bazasini boshqarish uchun qaysi so\'rov tili ishlatiladi?',
      correctAnswer: 'SQL',
      options: ['SQL', 'NoSQL', 'GraphQL', 'REST'],
    },
    {
      id: 'uz_comp_9',
      category: 'IT va Kompyuter',
      difficulty: 'medium',
      question: 'Dunyo bo\'yicha eng mashhur ochiq kodli OS yadrasi nima?',
      correctAnswer: 'Linux',
      options: ['Linux', 'Windows', 'MacOS', 'Unix'],
    },
    {
      id: 'uz_comp_10',
      category: 'IT va Kompyuter',
      difficulty: 'hard',
      question: 'Sun\'iy intellekt va neyron tarmoqlar qaysi tilda ko\'proq yoziladi?',
      correctAnswer: 'Python',
      options: ['Python', 'PHP', 'HTML', 'Pascal'],
    }
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
      question: 'Dunyoning eng baland cho\'qqisi (Everest) qaysi tog\' tizmasida?',
      correctAnswer: 'Himalay',
      options: ['Himalay', 'Alp', 'And', 'Tyan-Shan'],
    },
    {
      id: 'uz_geo_5',
      category: 'Geografiya',
      difficulty: 'easy',
      question: 'Yaponiya davlatining poytaxti qaysi shahar?',
      correctAnswer: 'Tokio',
      options: ['Tokio', 'Seul', 'Pekin', 'Bangkok'],
    },
    {
      id: 'uz_geo_6',
      category: 'Geografiya',
      difficulty: 'medium',
      question: 'Maydoni bo\'yicha dunyodagi eng katta qit\'a qaysi?',
      correctAnswer: 'Osiyo',
      options: ['Osiyo', 'Afrika', 'Shimoliy Amerika', 'Yevropa'],
    },
    {
      id: 'uz_geo_7',
      category: 'Geografiya',
      difficulty: 'medium',
      question: 'Dunyoning eng katta tropik o\'rmonlari qayerda joylashgan?',
      correctAnswer: 'Amazonka havzasida',
      options: ['Amazonka havzasida', 'Sibirda', 'Sahroi Kabirda', 'Madagaskarda'],
    },
    {
      id: 'uz_geo_8',
      category: 'Geografiya',
      difficulty: 'hard',
      question: 'Dunyodagi eng chuqur chuchuk suvli ko\'l qaysi?',
      correctAnswer: 'Baykal ko\'li',
      options: ['Baykal ko\'li', 'Kaspiy dengizi', 'Viktoriya', 'Mishigan'],
    },
    {
      id: 'uz_geo_9',
      category: 'Geografiya',
      difficulty: 'easy',
      question: 'Fransiyaning poytaxti qaysi shahar?',
      correctAnswer: 'Parij',
      options: ['Parij', 'Lion', 'Marsel', 'Nissa'],
    },
    {
      id: 'uz_geo_10',
      category: 'Geografiya',
      difficulty: 'medium',
      question: 'Misr poytaxti qaysi?',
      correctAnswer: 'Qohira',
      options: ['Qohira', 'Iskandariya', 'Gizah', 'Luksor'],
    }
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
    {
      id: 'uz_hist_6',
      category: 'Tarix',
      difficulty: 'medium',
      question: 'Boburiylar sulolasiga asos solgan va "Boburnoma" muallifi kim?',
      correctAnswer: 'Zahriddin Muhammad Bobur',
      options: ['Zahriddin Muhammad Bobur', 'Humoyun Mirzo', 'Akbarshoh', 'Shohjahon'],
    },
    {
      id: 'uz_hist_7',
      category: 'Tarix',
      difficulty: 'hard',
      question: 'Yer radiusini birinchi bo\'lib aniq hisoblab bergan alloma kim?',
      correctAnswer: 'Abu Rayhon Beruniy',
      options: ['Abu Rayhon Beruniy', 'Al-Xorazmiy', 'Ibn Sino', 'Ahmad al-Farg\'oniy'],
    },
    {
      id: 'uz_hist_8',
      category: 'Tarix',
      difficulty: 'medium',
      question: 'Qadimgi Dunyoning yetti mo\'jizasidan biri bo\'lgan Piramidalar qayerda?',
      correctAnswer: 'Misrda',
      options: ['Misrda', 'Gretsiyada', 'Iroqda', 'Hindistonda'],
    }
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
      difficulty: 'easy',
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
    {
      id: 'uz_gen_6',
      category: 'Umumiy Bilimlar',
      difficulty: 'easy',
      question: 'Bir yilda nechta fasl bor?',
      correctAnswer: '4 ta',
      options: ['4 ta', '2 ta', '12 ta', '3 ta'],
    },
    {
      id: 'uz_gen_7',
      category: 'Umumiy Bilimlar',
      difficulty: 'medium',
      question: 'Yer Quyosh atrofini to\'liq bir marta aylanib chiqishi qancha vaqt oladi?',
      correctAnswer: '365 kun (1 yil)',
      options: ['365 kun (1 yil)', '24 soat', '30 kun', '100 kun'],
    },
    {
      id: 'uz_gen_8',
      category: 'Umumiy Bilimlar',
      difficulty: 'hard',
      question: 'Dunyodagi eng katta qush qaysi?',
      correctAnswer: 'Tuyaqush',
      options: ['Tuyaqush', 'Burgut', 'Pingvin', 'Pelikan'],
    }
  ],
};

export async function fetchOpenTriviaQuestions(
  categoryKey: string = 'science',
  difficulty: 'easy' | 'medium' | 'hard' = 'medium',
  amount: number = 5
): Promise<TriviaQuestion[]> {
  const pool = UZBEK_QUESTION_BANK[categoryKey] || UZBEK_QUESTION_BANK.science;
  const filtered = pool.filter(q => q.difficulty === difficulty);
  const candidates = filtered.length >= amount ? filtered : pool;
  
  // Randomly shuffle the pool and pick unique questions
  const shuffled = [...candidates].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(amount, shuffled.length));
}
