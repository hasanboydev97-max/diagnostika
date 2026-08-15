import { useState, useEffect, useRef, useCallback } from 'react';
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

// ─── Vocabulary Bank ─────────────────────────────────────────────────────────
// Each entry: uzbek word, correct Russian translation, 3 plausible WRONG options.
// All Russian words verified for accuracy.
const WORD_BANK: WordPair[] = [
  // ─ Fruits & Food ─────────────────────────────────────────────────────────
  { uzbek: 'Olma',       russian: 'Яблоко',      options: ['Груша', 'Слива', 'Дыня'] },
  { uzbek: 'Nok',        russian: 'Груша',       options: ['Яблоко', 'Слива', 'Виноград'] },
  { uzbek: 'Uzum',       russian: 'Виноград',    options: ['Яблоко', 'Вишня', 'Лимон'] },
  { uzbek: 'Limon',      russian: 'Лимон',       options: ['Апельсин', 'Лайм', 'Грейпфрут'] },
  { uzbek: 'Apelsin',    russian: 'Апельсин',    options: ['Лимон', 'Мандарин', 'Грейпфрут'] },
  { uzbek: 'Gilos',      russian: 'Вишня',       options: ['Слива', 'Виноград', 'Ягода'] },
  { uzbek: 'Shaftoli',   russian: 'Персик',      options: ['Слива', 'Абрикос', 'Манго'] },
  { uzbek: "O'rik",     russian: 'Абрикос',     options: ['Персик', 'Слива', 'Вишня'] },
  { uzbek: 'Tarvuz',     russian: 'Арбуз',       options: ['Дыня', 'Тыква', 'Огурец'] },
  { uzbek: 'Non',        russian: 'Хлеб',        options: ['Торт', 'Печенье', 'Рис'] },
  { uzbek: 'Guruch',     russian: 'Рис',         options: ['Пшеница', 'Кукуруза', 'Ячмень'] },
  { uzbek: "Go'sht",    russian: 'Мясо',        options: ['Рыба', 'Яйцо', 'Молоко'] },
  { uzbek: 'Tuxum',      russian: 'Яйцо',        options: ['Мясо', 'Сыр', 'Масло'] },
  { uzbek: 'Sut',        russian: 'Молоко',      options: ['Вода', 'Сок', 'Йогурт'] },
  { uzbek: 'Suv',        russian: 'Вода',        options: ['Сок', 'Молоко', 'Чай'] },
  { uzbek: 'Choy',       russian: 'Чай',         options: ['Кофе', 'Сок', 'Молоко'] },
  { uzbek: 'Qahva',      russian: 'Кофе',        options: ['Чай', 'Какао', 'Сок'] },
  { uzbek: 'Shakar',     russian: 'Сахар',       options: ['Соль', 'Мёд', 'Мука'] },
  { uzbek: 'Tuz',        russian: 'Соль',        options: ['Сахар', 'Перец', 'Мука'] },
  // ─ Body Parts ──────────────────────────────────────────────────────────────
  { uzbek: "Qo'l",      russian: 'Рука',        options: ['Нога', 'Ладонь', 'Палец'] },
  { uzbek: "Ko'z",      russian: 'Глаз',        options: ['Нос', 'Рот', 'Ухо'] },
  { uzbek: 'Quloq',      russian: 'Ухо',         options: ['Глаз', 'Нос', 'Щека'] },
  { uzbek: 'Burun',      russian: 'Нос',         options: ['Рот', 'Глаз', 'Подбородок'] },
  { uzbek: "Og'iz",     russian: 'Рот',         options: ['Нос', 'Губа', 'Подбородок'] },
  { uzbek: 'Bosh',       russian: 'Голова',      options: ['Шея', 'Череп', 'Мозг'] },
  { uzbek: 'Oyoq',       russian: 'Нога',        options: ['Ступня', 'Колено', 'Бедро'] },
  { uzbek: 'Tish',       russian: 'Зуб',         options: ['Губа', 'Язык', 'Дёсна'] },
  { uzbek: 'Yuz',        russian: 'Лицо',        options: ['Голова', 'Шея', 'Щека'] },
  { uzbek: 'Qorin',      russian: 'Живот',       options: ['Грудь', 'Спина', 'Бедро'] },
  { uzbek: 'Yelka',      russian: 'Плечо',       options: ['Локоть', 'Запястье', 'Грудь'] },
  { uzbek: 'Tizza',      russian: 'Колено',      options: ['Лодыжка', 'Локоть', 'Бедро'] },
  { uzbek: 'Barmoq',     russian: 'Палец',       options: ['Большой палец', 'Ладонь', 'Запястье'] },
  // ─ Colors ───────────────────────────────────────────────────────────────────
  { uzbek: "Ko'k",      russian: 'Синий',       options: ['Зелёный', 'Фиолетовый', 'Серый'] },
  { uzbek: 'Yashil',     russian: 'Зелёный',     options: ['Синий', 'Жёлтый', 'Бирюзовый'] },
  { uzbek: 'Qizil',      russian: 'Красный',     options: ['Розовый', 'Оранжевый', 'Бордовый'] },
  { uzbek: 'Sariq',      russian: 'Жёлтый',      options: ['Оранжевый', 'Золотой', 'Бежевый'] },
  { uzbek: 'Oq',         russian: 'Белый',       options: ['Серый', 'Кремовый', 'Серебряный'] },
  { uzbek: 'Qora',       russian: 'Чёрный',      options: ['Серый', 'Тёмный', 'Коричневый'] },
  { uzbek: 'Pushti',     russian: 'Розовый',     options: ['Фиолетовый', 'Сиреневый', 'Малиновый'] },
  { uzbek: "To'q sariq", russian: 'Оранжевый',  options: ['Жёлтый', 'Золотой', 'Янтарный'] },
  { uzbek: 'Jigarrang',  russian: 'Коричневый',  options: ['Бежевый', 'Загар', 'Бордовый'] },
  { uzbek: 'Kulrang',    russian: 'Серый',       options: ['Серебряный', 'Белый', 'Чёрный'] },
  // ─ Adjectives ──────────────────────────────────────────────────────────────
  { uzbek: 'Katta',      russian: 'Большой',     options: ['Огромный', 'Широкий', 'Высокий'] },
  { uzbek: 'Kichik',     russian: 'Маленький',   options: ['Крошечный', 'Короткий', 'Тонкий'] },
  { uzbek: 'Baland',     russian: 'Высокий',     options: ['Длинный', 'Широкий', 'Большой'] },
  { uzbek: 'Past',       russian: 'Низкий',      options: ['Короткий', 'Маленький', 'Плоский'] },
  { uzbek: 'Tez',        russian: 'Быстрый',     options: ['Скорый', 'Стремительный', 'Резкий'] },
  { uzbek: 'Sekin',      russian: 'Медленный',   options: ['Спокойный', 'Тихий', 'Мягкий'] },
  { uzbek: 'Issiq',      russian: 'Горячий',     options: ['Тёплый', 'Жгучий', 'Знойный'] },
  { uzbek: 'Sovuq',      russian: 'Холодный',    options: ['Прохладный', 'Морозный', 'Студёный'] },
  { uzbek: 'Yangi',      russian: 'Новый',       options: ['Свежий', 'Современный', 'Недавний'] },
  { uzbek: 'Eski',       russian: 'Старый',      options: ['Древний', 'Подержанный', 'Ветхий'] },
  { uzbek: 'Chiroyli',   russian: 'Красивый',    options: ['Симпатичный', 'Милый', 'Прекрасный'] },
  { uzbek: 'Yaxshi',     russian: 'Хороший',     options: ['Отличный', 'Прекрасный', 'Добрый'] },
  { uzbek: 'Yomon',      russian: 'Плохой',      options: ['Ужасный', 'Бедный', 'Неверный'] },
  // ─ Animals ──────────────────────────────────────────────────────────────────
  { uzbek: 'Mushuk',     russian: 'Кошка',       options: ['Собака', 'Кролик', 'Лиса'] },
  { uzbek: 'It',         russian: 'Собака',      options: ['Кошка', 'Волк', 'Лиса'] },
  { uzbek: 'Ot',         russian: 'Лошадь',      options: ['Осёл', 'Верблюд', 'Корова'] },
  { uzbek: 'Sigir',      russian: 'Корова',      options: ['Овца', 'Коза', 'Буйвол'] },
  { uzbek: "Qo'y",      russian: 'Овца',        options: ['Коза', 'Ягнёнок', 'Свинья'] },
  { uzbek: 'Qush',       russian: 'Птица',       options: ['Летучая мышь', 'Насекомое', 'Бабочка'] },
  { uzbek: 'Baliq',      russian: 'Рыба',        options: ['Лягушка', 'Краб', 'Креветка'] },
  { uzbek: 'Sher',       russian: 'Лев',         options: ['Тигр', 'Леопард', 'Гепард'] },
  { uzbek: 'Fil',        russian: 'Слон',        options: ['Носорог', 'Бегемот', 'Жираф'] },
  { uzbek: 'Maymun',     russian: 'Обезьяна',    options: ['Горилла', 'Шимпанзе', 'Бабуин'] },
  { uzbek: "Bo'ri",     russian: 'Волк',        options: ['Лиса', 'Собака', 'Гиена'] },
  { uzbek: 'Ayiq',       russian: 'Медведь',     options: ['Волк', 'Лев', 'Тигр'] },
  { uzbek: 'Quyon',      russian: 'Кролик',      options: ['Заяц', 'Белка', 'Хомяк'] },
  // ─ School & People ─────────────────────────────────────────────────────────
  { uzbek: 'Maktab',     russian: 'Школа',       options: ['Колледж', 'Библиотека', 'Детский сад'] },
  { uzbek: 'Dars',       russian: 'Урок',        options: ['Класс', 'Домашнее задание', 'Экзамен'] },
  { uzbek: "O'qituvchi", russian: 'Учитель',     options: ['Профессор', 'Тренер', 'Репетитор'] },
  { uzbek: "O'quvchi",  russian: 'Ученик',      options: ['Студент', 'Выпускник', 'Слушатель'] },
  { uzbek: "Do'st",     russian: 'Друг',        options: ['Приятель', 'Товарищ', 'Коллега'] },
  { uzbek: 'Oila',       russian: 'Семья',       options: ['Родственники', 'Пара', 'Сообщество'] },
  { uzbek: 'Ota',        russian: 'Отец',        options: ['Дядя', 'Дедушка', 'Брат'] },
  { uzbek: 'Ona',        russian: 'Мать',        options: ['Тётя', 'Бабушка', 'Сестра'] },
  { uzbek: 'Aka',        russian: 'Брат',        options: ['Сестра', 'Кузен', 'Дядя'] },
  { uzbek: 'Opa',        russian: 'Сестра',      options: ['Брат', 'Тётя', 'Кузина'] },
  { uzbek: 'Shifokor',   russian: 'Врач',        options: ['Медсестра', 'Стоматолог', 'Хирург'] },
  // ─ Places ───────────────────────────────────────────────────────────────────
  { uzbek: 'Shahar',     russian: 'Город',       options: ['Посёлок', 'Деревня', 'Столица'] },
  { uzbek: 'Qishloq',    russian: 'Деревня',     options: ['Посёлок', 'Город', 'Район'] },
  { uzbek: "Ko'cha",    russian: 'Улица',       options: ['Проспект', 'Дорога', 'Переулок'] },
  { uzbek: 'Bozor',      russian: 'Рынок',       options: ['Магазин', 'Торговый центр', 'Базар'] },
  { uzbek: 'Kasalxona',  russian: 'Больница',    options: ['Клиника', 'Аптека', 'Диспансер'] },
  { uzbek: 'Kutubxona',  russian: 'Библиотека',  options: ['Архив', 'Музей', 'Книжный магазин'] },
  { uzbek: 'Masjid',     russian: 'Мечеть',      options: ['Церковь', 'Храм', 'Собор'] },
  { uzbek: 'Park',       russian: 'Парк',        options: ['Сад', 'Зоопарк', 'Площадь'] },
  // ─ Transport ──────────────────────────────────────────────────────────────
  { uzbek: 'Mashina',    russian: 'Машина',      options: ['Фургон', 'Грузовик', 'Джип'] },
  { uzbek: 'Avtobus',    russian: 'Автобус',     options: ['Трамвай', 'Маршрутка', 'Троллейбус'] },
  { uzbek: 'Samolyot',   russian: 'Самолёт',     options: ['Вертолёт', 'Планёр', 'Реактивный самолёт'] },
  { uzbek: 'Poyezd',     russian: 'Поезд',       options: ['Трамвай', 'Метро', 'Электричка'] },
  { uzbek: 'Kema',       russian: 'Корабль',     options: ['Лодка', 'Паром', 'Яхта'] },
  { uzbek: 'Velosiped',  russian: 'Велосипед',   options: ['Самокат', 'Трицикл', 'Мопед'] },
  // ─ Technology ──────────────────────────────────────────────────────────────
  { uzbek: 'Telefon',    russian: 'Телефон',     options: ['Планшет', 'Радио', 'Пейджер'] },
  { uzbek: 'Kompyuter',  russian: 'Компьютер',   options: ['Ноутбук', 'Монитор', 'Принтер'] },
  { uzbek: 'Televizor',  russian: 'Телевизор',   options: ['Экран', 'Монитор', 'Проектор'] },
  { uzbek: 'Kamera',     russian: 'Камера',      options: ['Веб-камера', 'Сканер', 'Проектор'] },
  // ─ Furniture & Home ─────────────────────────────────────────────────────────
  { uzbek: 'Uy',         russian: 'Дом',         options: ['Квартира', 'Вилла', 'Коттедж'] },
  { uzbek: 'Eshik',      russian: 'Дверь',       options: ['Ворота', 'Окно', 'Стена'] },
  { uzbek: 'Deraza',     russian: 'Окно',        options: ['Дверь', 'Стекло', 'Штора'] },
  { uzbek: 'Stol',       russian: 'Стол',        options: ['Парта', 'Прилавок', 'Полка'] },
  { uzbek: 'Stul',       russian: 'Стул',        options: ['Скамейка', 'Диван', 'Табурет'] },
  { uzbek: 'Karavot',    russian: 'Кровать',     options: ['Диван', 'Матрас', 'Кушетка'] },
  { uzbek: 'Lampa',      russian: 'Лампа',       options: ['Лампочка', 'Свеча', 'Фонарь'] },
  { uzbek: "Ko'zgu",    russian: 'Зеркало',     options: ['Стекло', 'Рамка', 'Экран'] },
  { uzbek: 'Oshxona',    russian: 'Кухня',       options: ['Ванная', 'Спальня', 'Столовая'] },
  { uzbek: 'Yotoqxona',  russian: 'Спальня',     options: ['Кухня', 'Кабинет', 'Гостиная'] },
  { uzbek: 'Hammom',     russian: 'Ванная',      options: ['Туалет', 'Кухня', 'Спальня'] },
  // ─ Stationery ──────────────────────────────────────────────────────────────
  { uzbek: 'Kitob',      russian: 'Книга',       options: ['Журнал', 'Учебник', 'Дневник'] },
  { uzbek: 'Qalam',      russian: 'Карандаш',    options: ['Ручка', 'Маркер', 'Мел'] },
  { uzbek: 'Ruchka',     russian: 'Ручка',       options: ['Карандаш', 'Маркер', 'Фломастер'] },
  { uzbek: 'Daftar',     russian: 'Тетрадь',     options: ['Книга', 'Дневник', 'Папка'] },
  { uzbek: 'Sumka',      russian: 'Сумка',       options: ['Рюкзак', 'Чемодан', 'Кошелёк'] },
  // ─ Clothing ────────────────────────────────────────────────────────────────
  { uzbek: 'Kiyim',      russian: 'Одежда',      options: ['Костюм', 'Форма', 'Наряд'] },
  { uzbek: "Ko'ylak",   russian: 'Рубашка',     options: ['Куртка', 'Блуза', 'Жилет'] },
  { uzbek: 'Shim',       russian: 'Брюки',       options: ['Шорты', 'Юбка', 'Леггинсы'] },
  { uzbek: 'Etik',       russian: 'Сапог',       options: ['Туфля', 'Тапочка', 'Сандалия'] },
  { uzbek: 'Shlyapa',    russian: 'Шляпа',       options: ['Кепка', 'Шлем', 'Берет'] },
  { uzbek: 'Palto',      russian: 'Пальто',      options: ['Куртка', 'Кардиган', 'Свитер'] },
  // ─ Time ───────────────────────────────────────────────────────────────────
  { uzbek: 'Tong',       russian: 'Утро',        options: ['Полдень', 'Рассвет', 'Восход'] },
  { uzbek: 'Tush',       russian: 'Полдень',     options: ['Утро', 'Полдня', 'День'] },
  { uzbek: 'Kech',       russian: 'Вечер',       options: ['День', 'Сумерки', 'Закат'] },
  { uzbek: 'Tun',        russian: 'Ночь',        options: ['Полночь', 'Вечер', 'Темнота'] },
  { uzbek: 'Kun',        russian: 'День',        options: ['Неделя', 'Дата', 'Период'] },
  { uzbek: 'Hafta',      russian: 'Неделя',      options: ['Месяц', 'Две недели', 'Период'] },
  { uzbek: 'Oy',         russian: 'Месяц',       options: ['Год', 'Сезон', 'Квартал'] },
  { uzbek: 'Yil',        russian: 'Год',         options: ['Десятилетие', 'Век', 'Сезон'] },
  // ─ Seasons ────────────────────────────────────────────────────────────────
  { uzbek: 'Bahor',      russian: 'Весна',       options: ['Лето', 'Осень', 'Зима'] },
  { uzbek: 'Yoz',        russian: 'Лето',        options: ['Весна', 'Осень', 'Зима'] },
  { uzbek: 'Kuz',        russian: 'Осень',       options: ['Весна', 'Лето', 'Зима'] },
  { uzbek: 'Qish',       russian: 'Зима',        options: ['Весна', 'Осень', 'Лето'] },
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
  const [saving, setSaving] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const nameRef = useRef('');
  const usedIndices = useRef<Set<number>>(new Set());

  const syncScore = (v: number) => { scoreRef.current = v; setScore(v); };
  const syncLives = (v: number) => { livesRef.current = v; setLives(v); };

  const pickNextWord = useCallback(() => {
    if (usedIndices.current.size >= WORD_BANK.length) usedIndices.current.clear();
    let idx: number;
    do { idx = Math.floor(Math.random() * WORD_BANK.length); }
    while (usedIndices.current.has(idx));
    usedIndices.current.add(idx);
    const word = WORD_BANK[idx];
    setCurrentWord({ ...word, displayOptions: shuffle([word.russian, ...word.options]) });
  }, []);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/games/leaderboard/${GAME_ID}`);
      if (res.ok) setLeaderboard(await res.json());
    } catch (_) {}
  }, []);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const saveScore = useCallback(async (finalScore: number, name: string) => {
    if (finalScore <= 0) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/games/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerName: name.trim().toUpperCase(),
          gameId: GAME_ID,
          score: finalScore,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error('[RussianWords] saveScore failed:', err);
        toast.error('Natija saqlanmadi. Internet aloqasini tekshiring.', { duration: 4000 });
      } else {
        await fetchLeaderboard();
      }
    } catch (e) {
      console.error('[RussianWords] saveScore network error:', e);
      toast.error('Server bilan aloqa yo\'q. Natija saqlanmadi.', { duration: 4000 });
    } finally {
      setSaving(false);
    }
  }, [fetchLeaderboard]);

  const endGame = useCallback((finalScore?: number, name?: string) => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const s = finalScore ?? scoreRef.current;
    const n = name ?? nameRef.current;
    setGameState('gameover');
    fetchLeaderboard();
    saveScore(s, n);
  }, [fetchLeaderboard, saveScore]);

  const startGame = useCallback(() => {
    if (!playerName.trim()) {
      toast.error('Ismingizni kiriting!', {
        style: { background: '#000', color: '#fff', border: '2px solid #000', borderRadius: '0', padding: '16px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '10px' }
      });
      return;
    }
    nameRef.current = playerName;
    syncScore(0);
    syncLives(3);
    setCombo(0);
    setTimeLeft(GAME_DURATION);
    setFeedback(null);
    setClickedOption(null);
    usedIndices.current.clear();
    setGameState('playing');
    pickNextWord();

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          endGame(scoreRef.current, nameRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [playerName, pickNextWord, endGame]);

  const handleOptionClick = (option: string) => {
    if (feedback !== null || !currentWord) return;
    setClickedOption(option);
    if (option === currentWord.russian) {
      const points = 10 + combo * 2;
      const newScore = scoreRef.current + points;
      syncScore(newScore);
      setCombo(prev => prev + 1);
      setFeedback('correct');
      setTimeout(() => { setFeedback(null); setClickedOption(null); pickNextWord(); }, 350);
    } else {
      const newLives = livesRef.current - 1;
      setCombo(0);
      syncLives(newLives);
      setFeedback('wrong');
      setTimeout(() => {
        setFeedback(null);
        setClickedOption(null);
        if (newLives <= 0) {
          endGame(scoreRef.current, nameRef.current);
        } else {
          pickNextWord();
        }
      }, 600);
    }
  };

  const timerPct = (timeLeft / GAME_DURATION) * 100;
  const highestRecord = leaderboard.length > 0 ? leaderboard[0].score : 0;

  return (
    <div className="min-h-screen bg-white font-sans flex flex-col relative">
      {/* HEADER */}
      <header className="relative z-20 flex justify-between items-center p-4">
        <button
          onClick={() => navigate('/games')}
          className="w-12 h-12 bg-white border-2 border-black text-black rounded-none flex items-center justify-center hover:bg-zinc-100 transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        {gameState === 'playing' && (
          <div className="bg-white border-2 border-black rounded-none px-4 py-2 font-bold text-[10px] uppercase tracking-widest text-black flex items-center gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <Trophy className="w-4 h-4" />
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
              className="w-full flex flex-col items-center text-center font-sans"
            >
              <div className="relative mb-8">
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                  className="w-24 h-24 bg-black text-white border-2 border-black rounded-none flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                >
                  <Languages className="w-10 h-10 text-white" strokeWidth={1.5} />
                </motion.div>
              </div>

              <h1 className="font-sans font-black text-3xl md:text-5xl uppercase tracking-tighter text-black mb-3">Rus So'zlari</h1>
              <p className="text-black text-sm mb-8 font-bold uppercase tracking-widest max-w-sm leading-relaxed">
                O'zbek so'zni ko'ring, rus tarjimasini toping. 1 daqiqa, 3 jonlik.
              </p>

              {highestRecord > 0 && (
                <div className="bg-white border-2 border-black text-black font-bold uppercase tracking-widest text-[10px] px-5 py-3 rounded-none mb-8 flex items-center gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <Trophy className="w-4 h-4" /> TOP REKORD: {highestRecord}
                </div>
              )}

              <div className="w-full max-w-sm space-y-4">
                <div className="relative">
                  <input
                    type="text"
                    value={playerName}
                    onChange={e => setPlayerName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && startGame()}
                    placeholder="Ismingizni kiriting..."
                    autoFocus
                    className="w-full bg-white border-2 border-black rounded-none px-5 py-4 text-[10px] font-bold uppercase tracking-widest text-black outline-none placeholder:text-zinc-400 focus:bg-zinc-50 transition-colors"
                  />
                </div>
                <button
                  onClick={startGame}
                  className="w-full bg-black text-white font-bold text-[10px] uppercase tracking-[0.2em] py-4 flex items-center justify-center gap-2 hover:bg-zinc-800 transition-colors border-2 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                >
                  Boshlash
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
                <div className="bg-white border-2 border-black rounded-none p-4 flex flex-col sm:flex-row justify-between items-center gap-4 mb-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <div className="flex items-center gap-4">
                    <div className="font-bold uppercase tracking-widest text-[10px] text-black flex items-center gap-2">
                      <Clock className="w-4 h-4" /> {timeLeft}s
                    </div>
                    <div className="flex gap-1">
                      {[...Array(3)].map((_, i) => (
                        <Heart key={i} className={`w-4 h-4 ${i < lives ? 'fill-black text-black' : 'fill-transparent text-black'}`} />
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="font-bold uppercase tracking-widest text-[10px] text-black">
                      Top Rekord: {Math.max(highestRecord, score)}
                    </div>
                    <AnimatePresence>
                      {combo >= 2 && (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                          className="font-bold uppercase tracking-widest text-[10px] text-black flex items-center gap-1"
                        >
                          <Flame className="w-4 h-4 fill-black text-black" /> {combo}x COMBO
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
                <div className="w-full h-3 bg-white border-2 border-black rounded-none overflow-hidden">
                  <motion.div
                    className={`h-full ${timeLeft > 15 ? 'bg-black' : 'bg-rose-500'}`}
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
                className={`w-full max-w-3xl rounded-none border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white p-8 md:p-12 mb-6 flex flex-col items-center justify-center relative overflow-hidden transition-colors min-h-[160px]
                  ${feedback === 'correct' ? 'bg-teal-50' : feedback === 'wrong' ? 'bg-rose-50' : 'bg-white'}`}
              >
                <div className="font-bold uppercase tracking-widest text-[10px] text-black mb-4">O'zbek → Ruscha</div>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentWord.uzbek}
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 20, opacity: 0 }}
                    transition={{ type: 'spring', damping: 20 }}
                    className={`font-sans font-black text-3xl md:text-5xl uppercase tracking-tighter z-10
                      ${feedback === 'correct' ? 'text-teal-600' : feedback === 'wrong' ? 'text-rose-600' : 'text-black'}`}
                  >
                    {currentWord.uzbek}
                  </motion.div>
                </AnimatePresence>
                <AnimatePresence>
                  {feedback === 'correct' && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 2, opacity: 0 }} className="absolute text-teal-500/20">
                      <Check className="w-40 h-40" strokeWidth={3} />
                    </motion.div>
                  )}
                  {feedback === 'wrong' && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 2, opacity: 0 }} className="absolute text-rose-500/20">
                      <X className="w-40 h-40" strokeWidth={3} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Buttons */}
              <div className="grid grid-cols-2 gap-4 w-full max-w-3xl">
                {currentWord.displayOptions.map((opt) => {
                  const isClicked = clickedOption === opt;
                  return (
                    <button
                      key={opt}
                      disabled={feedback !== null}
                      onClick={() => handleOptionClick(opt)}
                      className={`
                        w-full py-6 md:py-8 rounded-none border-2 border-black bg-white text-black font-sans font-black text-xl md:text-2xl uppercase tracking-widest transition-all
                        ${feedback === null ? 'hover:-translate-y-1 hover:bg-zinc-100 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]' : ''}
                        ${isClicked ? 'translate-y-0 shadow-none bg-zinc-200' : 'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'}
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
              <div className="rounded-none border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white p-8 md:p-10 w-full flex flex-col items-center text-center mb-6">
                <h2 className="font-sans font-black text-3xl md:text-5xl uppercase tracking-tighter text-black mb-2">
                  {lives <= 0 ? '3 Xato — O\'yin Tugadi!' : 'Vaqt Tugadi!'}
                </h2>
                <p className="text-[10px] font-bold text-black mb-6 uppercase tracking-widest">Ajoyib urinish!</p>

                <div className="w-full bg-white border-2 border-black rounded-none py-8 mb-6 relative">
                  {score > highestRecord && score > 0 && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-black text-white px-4 py-2 border-2 border-black rounded-none text-[10px] font-bold uppercase tracking-widest animate-bounce shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                      🎉 YANGI REKORD!
                    </div>
                  )}
                  <div className="font-bold uppercase tracking-widest text-[10px] text-black mb-2">Sizning Natijangiz</div>
                  <div className="text-[4.5rem] md:text-[5.5rem] font-black text-black leading-none flex items-center justify-center gap-3">
                    <Trophy className="w-14 h-14" />
                    {score}
                  </div>
                  {saving && (
                    <div className='mt-3 text-[10px] font-bold uppercase tracking-widest text-black flex items-center justify-center gap-2'>
                      <div className='w-4 h-4 border-2 border-black border-t-transparent rounded-none animate-spin' />
                      Natija saqlanmoqda...
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full">
                  <button onClick={startGame}
                    className="flex-1 w-full bg-black text-white font-bold text-[10px] uppercase tracking-[0.2em] py-4 flex items-center justify-center gap-2 hover:bg-zinc-800 transition-colors border-2 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                  >
                    QAYTA O'YNASH
                  </button>
                  <button onClick={() => navigate('/games')}
                    className="flex-1 w-full bg-white text-black font-bold text-[10px] uppercase tracking-[0.2em] py-4 flex items-center justify-center gap-2 hover:bg-zinc-100 transition-colors border-2 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                  >
                    CHIQISH
                  </button>
                </div>
              </div>

              {/* Leaderboard */}
              <div className="w-full rounded-none border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white p-5">
                <h3 className="font-sans font-black text-2xl uppercase tracking-tighter text-black mb-4 flex items-center justify-center gap-2">
                  <Flame className="w-6 h-6" /> TOP REKORDLAR
                </h3>
                <div className="space-y-2">
                  {leaderboard.length === 0 && (
                    <p className='text-center text-black font-bold uppercase tracking-widest text-[10px] py-4'>Hali rekordlar yo'q. Birinchi bo'ling!</p>
                  )}
                  {leaderboard.slice(0, 5).map((record, idx) => {
                    const isMe = record.playerName === playerName.trim().toUpperCase() && record.score === score;
                    return (
                      <div key={record._id} className={`flex items-center justify-between px-4 py-3 rounded-none border-2 border-black ${isMe ? 'bg-black text-white' : 'bg-white text-black'}`}>
                        <div className="flex items-center gap-4">
                          <div className={`w-8 h-8 rounded-none border-2 border-black flex items-center justify-center font-black text-[10px]
                            ${isMe ? 'bg-white text-black' : 'bg-black text-white'}`}>
                            {idx + 1}
                          </div>
                          <span className={`font-bold text-[10px] uppercase tracking-widest`}>{record.playerName}</span>
                        </div>
                        <span className={`font-black text-lg`}>{record.score}</span>
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
