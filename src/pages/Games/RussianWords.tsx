import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Trophy, Clock, X, Check, Flame, Languages, Heart } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const GAME_ID = 'russian-words';
const GAME_DURATION = 60;

interface GameRecord {
  _id: string;
  playerName: string;
  score: number;
  createdAt: string;
}

interface WordPair {
  uzbek: string;
  russian: string;
  options: string[];
}

// ─── Vocabulary Bank (100 words) ──────────────────────────────────────────
const WORD_BANK: WordPair[] = [
  { uzbek: 'Olma', russian: 'Яблоко', options: ['Апельсин', 'Виноград', 'Персик'] },
  { uzbek: 'Kitob', russian: 'Книга', options: ['Ручка', 'Стол', 'Стул'] },
  { uzbek: 'Uy', russian: 'Дом', options: ['Машина', 'Дерево', 'Дверь'] },
  { uzbek: 'Suv', russian: 'Вода', options: ['Огонь', 'Воздух', 'Земля'] },
  { uzbek: 'Non', russian: 'Хлеб', options: ['Молоко', 'Яйцо', 'Сахар'] },
  { uzbek: 'Qo\'l', russian: 'Рука', options: ['Нога', 'Глаз', 'Ухо'] },
  { uzbek: 'Ko\'z', russian: 'Глаз', options: ['Нос', 'Рот', 'Ухо'] },
  { uzbek: 'Quloq', russian: 'Ухо', options: ['Глаз', 'Нос', 'Рука'] },
  { uzbek: 'Burun', russian: 'Нос', options: ['Рот', 'Глаз', 'Голова'] },
  { uzbek: 'Og\'iz', russian: 'Рот', options: ['Нос', 'Лицо', 'Губа'] },
  { uzbek: 'Bosh', russian: 'Голова', options: ['Шея', 'Спина', 'Грудь'] },
  { uzbek: 'Oyoq', russian: 'Нога', options: ['Рука', 'Колено', 'Лодыжка'] },
  { uzbek: 'Tish', russian: 'Зуб', options: ['Ноготь', 'Кость', 'Кожа'] },
  { uzbek: 'Yuz', russian: 'Лицо', options: ['Голова', 'Шея', 'Спина'] },
  { uzbek: 'Qorin', russian: 'Живот', options: ['Грудь', 'Спина', 'Плечо'] },
  { uzbek: 'Ko\'k', russian: 'Синий', options: ['Красный', 'Зелёный', 'Жёлтый'] },
  { uzbek: 'Qizil', russian: 'Красный', options: ['Синий', 'Розовый', 'Оранжевый'] },
  { uzbek: 'Yashil', russian: 'Зелёный', options: ['Синий', 'Жёлтый', 'Коричневый'] },
  { uzbek: 'Sariq', russian: 'Жёлтый', options: ['Оранжевый', 'Золотой', 'Кремовый'] },
  { uzbek: 'Oq', russian: 'Белый', options: ['Чёрный', 'Серый', 'Серебряный'] },
  { uzbek: 'Qora', russian: 'Чёрный', options: ['Белый', 'Тёмный', 'Коричневый'] },
  { uzbek: 'Pushti', russian: 'Розовый', options: ['Фиолетовый', 'Красный', 'Лиловый'] },
  { uzbek: 'To\'q sariq', russian: 'Оранжевый', options: ['Жёлтый', 'Красный', 'Коричневый'] },
  { uzbek: 'Jigarrang', russian: 'Коричневый', options: ['Оранжевый', 'Красный', 'Бежевый'] },
  { uzbek: 'Kulrang', russian: 'Серый', options: ['Чёрный', 'Серебряный', 'Белый'] },
  { uzbek: 'Katta', russian: 'Большой', options: ['Маленький', 'Высокий', 'Широкий'] },
  { uzbek: 'Kichik', russian: 'Маленький', options: ['Большой', 'Короткий', 'Крошечный'] },
  { uzbek: 'Baland', russian: 'Высокий', options: ['Низкий', 'Широкий', 'Длинный'] },
  { uzbek: 'Past', russian: 'Низкий', options: ['Высокий', 'Маленький', 'Короткий'] },
  { uzbek: 'Tez', russian: 'Быстрый', options: ['Медленный', 'Скорый', 'Твёрдый'] },
  { uzbek: 'Sekin', russian: 'Медленный', options: ['Быстрый', 'Тихий', 'Мягкий'] },
  { uzbek: 'Issiq', russian: 'Горячий', options: ['Холодный', 'Тёплый', 'Прохладный'] },
  { uzbek: 'Sovuq', russian: 'Холодный', options: ['Горячий', 'Прохладный', 'Студёный'] },
  { uzbek: 'Yangi', russian: 'Новый', options: ['Старый', 'Свежий', 'Современный'] },
  { uzbek: 'Eski', russian: 'Старый', options: ['Новый', 'Молодой', 'Древний'] },
  { uzbek: 'Mushuk', russian: 'Кошка', options: ['Собака', 'Крыса', 'Лиса'] },
  { uzbek: 'It', russian: 'Собака', options: ['Кошка', 'Волк', 'Медведь'] },
  { uzbek: 'Ot', russian: 'Лошадь', options: ['Корова', 'Олень', 'Осёл'] },
  { uzbek: 'Sigir', russian: 'Корова', options: ['Лошадь', 'Овца', 'Бык'] },
  { uzbek: 'Qo\'y', russian: 'Овца', options: ['Коза', 'Корова', 'Свинья'] },
  { uzbek: 'Qush', russian: 'Птица', options: ['Рыба', 'Летучая мышь', 'Пчела'] },
  { uzbek: 'Baliq', russian: 'Рыба', options: ['Птица', 'Лягушка', 'Краб'] },
  { uzbek: 'Sher', russian: 'Лев', options: ['Тигр', 'Медведь', 'Волк'] },
  { uzbek: 'Fil', russian: 'Слон', options: ['Носорог', 'Бегемот', 'Жираф'] },
  { uzbek: 'Maymun', russian: 'Обезьяна', options: ['Горилла', 'Шимпанзе', 'Лемур'] },
  { uzbek: 'Maktab', russian: 'Школа', options: ['Больница', 'Рынок', 'Библиотека'] },
  { uzbek: 'Dars', russian: 'Урок', options: ['Класс', 'Курс', 'Учёба'] },
  { uzbek: 'O\'qituvchi', russian: 'Учитель', options: ['Ученик', 'Врач', 'Директор'] },
  { uzbek: 'O\'quvchi', russian: 'Ученик', options: ['Учитель', 'Студент', 'Ребёнок'] },
  { uzbek: 'Do\'st', russian: 'Друг', options: ['Враг', 'Партнёр', 'Коллега'] },
  { uzbek: 'Oila', russian: 'Семья', options: ['Друг', 'Группа', 'Команда'] },
  { uzbek: 'Ota', russian: 'Отец', options: ['Мать', 'Дядя', 'Брат'] },
  { uzbek: 'Ona', russian: 'Мать', options: ['Отец', 'Тётя', 'Сестра'] },
  { uzbek: 'Aka', russian: 'Брат', options: ['Сестра', 'Отец', 'Кузен'] },
  { uzbek: 'Opa', russian: 'Сестра', options: ['Брат', 'Мать', 'Кузина'] },
  { uzbek: 'Shahar', russian: 'Город', options: ['Деревня', 'Посёлок', 'Страна'] },
  { uzbek: 'Ko\'cha', russian: 'Улица', options: ['Дорога', 'Тропа', 'Переулок'] },
  { uzbek: 'Bozor', russian: 'Рынок', options: ['Магазин', 'Универмаг', 'Торговый центр'] },
  { uzbek: 'Kasalxona', russian: 'Больница', options: ['Клиника', 'Аптека', 'Школа'] },
  { uzbek: 'Kutubxona', russian: 'Библиотека', options: ['Школа', 'Музей', 'Архив'] },
  { uzbek: 'Mashina', russian: 'Машина', options: ['Автобус', 'Грузовик', 'Фургон'] },
  { uzbek: 'Avtobus', russian: 'Автобус', options: ['Машина', 'Поезд', 'Трамвай'] },
  { uzbek: 'Samolyot', russian: 'Самолёт', options: ['Вертолёт', 'Ракета', 'Дрон'] },
  { uzbek: 'Poyezd', russian: 'Поезд', options: ['Автобус', 'Трамвай', 'Метро'] },
  { uzbek: 'Kema', russian: 'Корабль', options: ['Лодка', 'Паром', 'Яхта'] },
  { uzbek: 'Velosiped', russian: 'Велосипед', options: ['Мотоцикл', 'Скутер', 'Трицикл'] },
  { uzbek: 'Telefon', russian: 'Телефон', options: ['Компьютер', 'Планшет', 'Радио'] },
  { uzbek: 'Kompyuter', russian: 'Компьютер', options: ['Телефон', 'Ноутбук', 'Монитор'] },
  { uzbek: 'Televizor', russian: 'Телевизор', options: ['Монитор', 'Экран', 'Проектор'] },
  { uzbek: 'Eshik', russian: 'Дверь', options: ['Окно', 'Ворота', 'Стена'] },
  { uzbek: 'Deraza', russian: 'Окно', options: ['Дверь', 'Стена', 'Стекло'] },
  { uzbek: 'Stol', russian: 'Стол', options: ['Стул', 'Парта', 'Полка'] },
  { uzbek: 'Stul', russian: 'Стул', options: ['Стол', 'Скамейка', 'Диван'] },
  { uzbek: 'Karavot', russian: 'Кровать', options: ['Диван', 'Кресло', 'Подушка'] },
  { uzbek: 'Lampa', russian: 'Лампа', options: ['Свет', 'Лампочка', 'Свеча'] },
  { uzbek: 'Ko\'zgu', russian: 'Зеркало', options: ['Стекло', 'Окно', 'Рамка'] },
  { uzbek: 'Qalam', russian: 'Карандаш', options: ['Ручка', 'Маркер', 'Мел'] },
  { uzbek: 'Ruchka', russian: 'Ручка', options: ['Карандаш', 'Маркер', 'Кисть'] },
  { uzbek: 'Daftar', russian: 'Тетрадь', options: ['Книга', 'Журнал', 'Дневник'] },
  { uzbek: 'Sumka', russian: 'Сумка', options: ['Коробка', 'Мешок', 'Чемодан'] },
  { uzbek: 'Kiyim', russian: 'Одежда', options: ['Обувь', 'Шляпа', 'Носки'] },
  { uzbek: 'Ko\'ylak', russian: 'Рубашка', options: ['Брюки', 'Куртка', 'Платье'] },
  { uzbek: 'Shim', russian: 'Брюки', options: ['Рубашка', 'Юбка', 'Шорты'] },
  { uzbek: 'Etik', russian: 'Обувь', options: ['Носки', 'Сапоги', 'Тапочки'] },
  { uzbek: 'Shlyapa', russian: 'Шляпа', options: ['Кепка', 'Капюшон', 'Шлем'] },
  { uzbek: 'Oshxona', russian: 'Кухня', options: ['Спальня', 'Ванная', 'Столовая'] },
  { uzbek: 'Yotoqxona', russian: 'Спальня', options: ['Кухня', 'Ванная', 'Кабинет'] },
  { uzbek: 'Mehmonxona', russian: 'Гостиная', options: ['Кухня', 'Спальня', 'Столовая'] },
  { uzbek: 'Tong', russian: 'Утро', options: ['Вечер', 'Полдень', 'Рассвет'] },
  { uzbek: 'Kech', russian: 'Вечер', options: ['Утро', 'Ночь', 'День'] },
  { uzbek: 'Tun', russian: 'Ночь', options: ['День', 'Вечер', 'Полночь'] },
  { uzbek: 'Kun', russian: 'День', options: ['Ночь', 'Неделя', 'Час'] },
  { uzbek: 'Hafta', russian: 'Неделя', options: ['День', 'Месяц', 'Год'] },
  { uzbek: 'Oy', russian: 'Месяц', options: ['Неделя', 'Год', 'Сезон'] },
  { uzbek: 'Yil', russian: 'Год', options: ['Месяц', 'Десятилетие', 'Сезон'] },
  { uzbek: 'Bahor', russian: 'Весна', options: ['Лето', 'Осень', 'Зима'] },
  { uzbek: 'Yoz', russian: 'Лето', options: ['Весна', 'Осень', 'Зима'] },
  { uzbek: 'Kuz', russian: 'Осень', options: ['Весна', 'Лето', 'Зима'] },
  { uzbek: 'Qish', russian: 'Зима', options: ['Лето', 'Осень', 'Весна'] },
  { uzbek: 'Non oshxona', russian: 'Булочная', options: ['Столовая', 'Кафе', 'Ресторан'] },
  { uzbek: 'Shifoxona', russian: 'Поликлиника', options: ['Больница', 'Аптека', 'Клиника'] },
];

const OPTION_COLORS = [
  { bg: 'bg-[#FF4B4B]', border: 'border-[#CC3C3C]', text: 'text-white' },
  { bg: 'bg-[#3B82F6]', border: 'border-[#2563EB]', text: 'text-white' },
  { bg: 'bg-[#F59E0B]', border: 'border-[#D97706]', text: 'text-white' },
  { bg: 'bg-[#10B981]', border: 'border-[#059669]', text: 'text-white' },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const RussianWords = () => {
  const navigate = useNavigate();
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover'>('start');
  const [playerName, setPlayerName] = useState('');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [lives, setLives] = useState(3);
  const [combo, setCombo] = useState(0);
  const [leaderboard, setLeaderboard] = useState<GameRecord[]>([]);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [clickedOption, setClickedOption] = useState<string | null>(null);
  const [currentWord, setCurrentWord] = useState<WordPair & { displayOptions: string[] } | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const usedIndices = useRef<Set<number>>(new Set());

  const pickNextWord = () => {
    if (usedIndices.current.size >= WORD_BANK.length) usedIndices.current.clear();
    let idx: number;
    do { idx = Math.floor(Math.random() * WORD_BANK.length); }
    while (usedIndices.current.has(idx));
    usedIndices.current.add(idx);
    const word = WORD_BANK[idx];
    setCurrentWord({ ...word, displayOptions: shuffle([word.russian, ...word.options]) });
  };

  const startGame = () => {
    if (!playerName.trim()) {
      toast.error('Ismingizni kiriting!', {
        style: { background: '#0D9488', color: '#fff', border: 'none', borderRadius: '16px', padding: '16px', fontWeight: 'bold' }
      });
      return;
    }
    setScore(0);
    setCombo(0);
    setTimeLeft(GAME_DURATION);
    setLives(3);
    usedIndices.current.clear();
    setGameState('playing');
    pickNextWord();

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timerRef.current!); endGame(); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const endGame = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setGameState('gameover');
    fetchLeaderboard();
    if (score > 0) {
      try {
        await fetch(`${API_URL}/games/score`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerName: playerName.trim(), gameId: GAME_ID, score }),
        });
        fetchLeaderboard();
      } catch (_) {}
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch(`${API_URL}/games/leaderboard/${GAME_ID}`);
      if (res.ok) setLeaderboard(await res.json());
    } catch (_) {}
  };

  useEffect(() => {
    fetchLeaderboard();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const handleOptionClick = (option: string) => {
    if (feedback !== null || !currentWord) return;
    setClickedOption(option);
    if (option === currentWord.russian) {
      const points = 10 + combo * 2;
      setScore(prev => prev + points);
      setCombo(prev => prev + 1);
      setFeedback('correct');
      setTimeout(() => { setFeedback(null); setClickedOption(null); pickNextWord(); }, 350);
    } else {
      const newLives = lives - 1;
      setCombo(0);
      setLives(newLives);
      setFeedback('wrong');
      setTimeout(() => {
        setFeedback(null); setClickedOption(null);
        if (newLives <= 0) endGame(); else pickNextWord();
      }, 600);
    }
  };

  const timerPct = (timeLeft / GAME_DURATION) * 100;
  const highestRecord = leaderboard.length > 0 ? leaderboard[0].score : 0;

  return (
    <div className={`min-h-screen relative font-sans overflow-hidden transition-all duration-300 flex flex-col
      ${gameState === 'playing'
        ? feedback === 'correct' ? 'bg-teal-50' : feedback === 'wrong' ? 'bg-rose-50' : 'bg-teal-50'
        : 'bg-[#F8FAFC]'}`}
    >
      <div className="absolute inset-0 opacity-10 pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #0f766e 1px, transparent 0)', backgroundSize: '32px 32px' }}
      />

      {/* HEADER */}
      <header className="relative z-20 flex justify-between items-center p-4">
        <button
          onClick={() => navigate('/games')}
          className="w-12 h-12 bg-white border-b-[4px] border-slate-200 text-slate-700 rounded-2xl flex items-center justify-center hover:bg-slate-50 active:border-b-0 active:translate-y-[4px] transition-all"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        {gameState === 'playing' && (
          <div className="bg-white border-b-[4px] border-slate-200 px-5 py-2 rounded-2xl font-black text-xl text-slate-700 flex items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-400 fill-amber-400" />
            {score}
          </div>
        )}
      </header>

      {/* MAIN */}
      <div className="flex flex-col items-center justify-center flex-1 w-full max-w-4xl mx-auto p-4 relative z-10">
        <AnimatePresence mode="wait">

          {/* START */}
          {gameState === 'start' && (
            <motion.div key="start"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="w-full flex flex-col items-center text-center"
            >
              <div className="relative mb-6">
                <motion.div
                  animate={{ y: [0, -10, 0], rotate: [0, -5, 5, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                  className="w-32 h-32 bg-gradient-to-br from-teal-400 to-cyan-600 rounded-[2rem] shadow-[0_10px_0_#0f766e] flex items-center justify-center"
                >
                  <Languages className="w-16 h-16 text-white" strokeWidth={2.5} />
                </motion.div>
                <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 2, repeat: Infinity }} className="absolute -top-3 -right-3 text-2xl">📖</motion.div>
                <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 2, repeat: Infinity, delay: 1 }} className="absolute -bottom-3 -left-3 text-2xl">🇷🇺</motion.div>
              </div>

              <h1 className="text-4xl md:text-6xl font-black text-slate-800 mb-2 tracking-tight">Rus So'zlari</h1>
              <p className="text-slate-500 text-base md:text-lg mb-6 font-bold max-w-sm">
                O'zbek so'zni ko'r, rus tarjimasini tap! 1 daqiqa, 3 jonlik.
              </p>

              {highestRecord > 0 && (
                <div className="bg-teal-100 border border-teal-300 text-teal-700 font-bold px-4 py-2 rounded-xl mb-6 flex items-center gap-2 shadow-sm">
                  <Trophy className="w-5 h-5 fill-teal-500 text-teal-500" /> TOP REKORD: {highestRecord}
                </div>
              )}

              <div className="w-full max-w-sm space-y-4">
                <input
                  type="text"
                  value={playerName}
                  onChange={e => setPlayerName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && startGame()}
                  placeholder="Ismingiz kim?"
                  autoFocus
                  className="w-full bg-white border-2 border-slate-200 rounded-2xl px-5 py-4 text-xl font-bold text-center text-slate-800 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/20 transition-all placeholder:text-slate-300 shadow-sm"
                />
                <button
                  onClick={startGame}
                  className="w-full bg-[#0D9488] border-b-[6px] border-[#0f766e] text-white font-black text-2xl py-5 rounded-2xl active:border-b-0 active:translate-y-[6px] transition-all shadow-md"
                >
                  BOSHLA!
                </button>
              </div>
            </motion.div>
          )}

          {/* PLAYING */}
          {gameState === 'playing' && currentWord && (
            <motion.div key="playing"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full flex flex-col items-center justify-between py-2"
            >
              {/* Stats */}
              <div className="w-full max-w-3xl mb-4">
                <div className="flex justify-between items-end mb-2 px-1">
                  <div className="flex flex-col gap-1">
                    <div className="font-bold text-slate-500 flex items-center gap-1.5 text-sm">
                      <Clock className="w-4 h-4" /> {timeLeft}s
                    </div>
                    <div className="flex gap-1">
                      {[...Array(3)].map((_, i) => (
                        <Heart key={i} className={`w-5 h-5 ${i < lives ? 'fill-rose-500 text-rose-500' : 'fill-slate-200 text-slate-200'}`} />
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                      Top Rekord: {Math.max(highestRecord, score)}
                    </div>
                    <AnimatePresence>
                      {combo >= 2 && (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                          className="text-orange-500 font-black text-lg flex items-center gap-1"
                        >
                          <Flame className="w-5 h-5 fill-orange-500" /> {combo}x COMBO
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
                <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full ${timeLeft > 15 ? 'bg-[#0D9488]' : 'bg-[#EF4444]'}`}
                    initial={{ width: '100%' }}
                    animate={{ width: `${timerPct}%` }}
                    transition={{ duration: 1, ease: 'linear' }}
                  />
                </div>
              </div>

              {/* Question card */}
              <motion.div
                animate={feedback === 'wrong' ? { x: [-10, 10, -10, 10, 0] } : {}}
                transition={{ duration: 0.3 }}
                className={`w-full max-w-3xl bg-white rounded-[2rem] p-6 md:p-10 mb-6 flex flex-col items-center justify-center border-b-[6px] shadow-sm relative overflow-hidden transition-colors min-h-[140px]
                  ${feedback === 'correct' ? 'border-[#0D9488] bg-teal-50' : feedback === 'wrong' ? 'border-[#EF4444] bg-rose-50' : 'border-slate-200'}`}
              >
                <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">O'zbek → Ruscha</div>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentWord.uzbek}
                    initial={{ y: -30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 30, opacity: 0 }}
                    transition={{ type: 'spring', damping: 18 }}
                    className={`text-[2.8rem] md:text-[4.5rem] font-black tracking-tight z-10
                      ${feedback === 'correct' ? 'text-teal-600' : feedback === 'wrong' ? 'text-rose-500' : 'text-slate-800'}`}
                  >
                    {currentWord.uzbek}
                  </motion.div>
                </AnimatePresence>
                <AnimatePresence>
                  {feedback === 'correct' && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 2, opacity: 0 }} className="absolute text-teal-400">
                      <Check className="w-28 h-28" strokeWidth={4} />
                    </motion.div>
                  )}
                  {feedback === 'wrong' && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 2, opacity: 0 }} className="absolute text-rose-400">
                      <X className="w-28 h-28" strokeWidth={4} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Buttons */}
              <div className="grid grid-cols-2 gap-3 md:gap-5 w-full max-w-3xl">
                {currentWord.displayOptions.map((opt, idx) => {
                  const style = OPTION_COLORS[idx % 4];
                  const isClicked = clickedOption === opt;
                  return (
                    <button
                      key={opt}
                      disabled={feedback !== null}
                      onClick={() => handleOptionClick(opt)}
                      className={`
                        w-full py-5 md:py-7 rounded-2xl text-lg md:text-2xl font-black transition-all transform
                        ${style.bg} ${style.text} ${style.border} border-b-[6px]
                        ${feedback === null ? 'hover:brightness-110 active:border-b-0 active:translate-y-[6px]' : ''}
                        ${isClicked ? 'border-b-0 translate-y-[6px] brightness-110' : ''}
                      `}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* GAME OVER */}
          {gameState === 'gameover' && (
            <motion.div key="gameover"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="w-full max-w-2xl flex flex-col items-center"
            >
              <div className="bg-white rounded-[2.5rem] p-8 md:p-10 w-full border-b-[8px] border-slate-200 shadow-xl flex flex-col items-center text-center mb-6">
                <h2 className="text-3xl md:text-4xl font-black text-slate-800 mb-2">
                  {lives <= 0 ? '3 Xato — O\'yin Tugadi!' : 'Vaqt Tugadi!'}
                </h2>
                <p className="text-lg font-bold text-slate-500 mb-6 uppercase tracking-widest">Ajoyib urinish!</p>

                <div className="w-full bg-[#F8FAFC] border-4 border-slate-100 rounded-[1.5rem] py-8 mb-6 relative">
                  {score > highestRecord && score > 0 && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-teal-600 text-white px-4 py-1 rounded-full text-xs font-black animate-bounce">
                      🎉 YANGI REKORD!
                    </div>
                  )}
                  <div className="text-slate-400 font-bold text-base mb-2 uppercase">Sizning Natijangiz</div>
                  <div className="text-[4.5rem] md:text-[5.5rem] font-black text-teal-500 leading-none flex items-center justify-center gap-3">
                    <Trophy className="w-14 h-14 fill-teal-500" />
                    {score}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full">
                  <button onClick={startGame}
                    className="flex-1 bg-[#0D9488] border-b-[6px] border-[#0f766e] text-white font-black text-xl py-4 rounded-xl active:border-b-0 active:translate-y-[6px] transition-all shadow-md"
                  >
                    QAYTA O'YNASH
                  </button>
                  <button onClick={() => navigate('/games')}
                    className="flex-1 bg-white border-4 border-slate-200 text-slate-700 font-black text-xl py-4 rounded-xl hover:bg-slate-50 active:translate-y-[4px] transition-all"
                  >
                    CHIQISH
                  </button>
                </div>
              </div>

              {/* Leaderboard */}
              <div className="w-full bg-white rounded-3xl p-5 border-b-[4px] border-slate-200 shadow-sm">
                <h3 className="font-black text-xl text-slate-800 mb-4 flex items-center justify-center gap-2">
                  <Flame className="w-6 h-6 text-orange-500 fill-orange-500" /> TOP REKORDLAR
                </h3>
                <div className="space-y-2">
                  {leaderboard.slice(0, 5).map((record, idx) => {
                    const isMe = record.playerName === playerName.trim() && record.score === score;
                    return (
                      <div key={record._id} className={`flex items-center justify-between px-4 py-3 rounded-xl border-2 ${isMe ? 'bg-teal-50 border-teal-400' : 'bg-slate-50 border-slate-100'}`}>
                        <div className="flex items-center gap-4">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm
                            ${idx === 0 ? 'bg-amber-400 text-white' : idx === 1 ? 'bg-slate-300 text-white' : idx === 2 ? 'bg-amber-700 text-white' : 'bg-slate-200 text-slate-500'}`}>
                            {idx + 1}
                          </div>
                          <span className={`font-bold text-lg uppercase ${isMe ? 'text-teal-600' : 'text-slate-700'}`}>{record.playerName}</span>
                        </div>
                        <span className={`font-black text-xl ${isMe ? 'text-teal-600' : 'text-slate-800'}`}>{record.score}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default RussianWords;
