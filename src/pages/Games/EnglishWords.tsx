import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Trophy, Clock, X, Check, Flame, BookOpen, Heart } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const GAME_ID = 'english-words';
const GAME_DURATION = 60;

interface GameRecord {
  _id: string;
  playerName: string;
  score: number;
  createdAt: string;
}

interface WordPair {
  uzbek: string;
  english: string;
  options: string[]; // 3 wrong answers pre-defined for that word
}

// ─── Vocabulary Bank ───────────────────────────────────────────────────────────────────────────
// Each entry: uzbek word, correct English translation, 3 plausible WRONG options.
// Verified against authoritative Uzbek-English dictionaries.
const WORD_BANK: WordPair[] = [
  // ─ Fruits & Food ────────────────────────────────────────────────────────────
  { uzbek: 'Olma',       english: 'Apple',      options: ['Pear', 'Plum', 'Melon'] },
  { uzbek: 'Nok',        english: 'Pear',       options: ['Apple', 'Plum', 'Grape'] },
  { uzbek: 'Uzum',       english: 'Grape',      options: ['Apple', 'Cherry', 'Lemon'] },
  { uzbek: 'Limon',      english: 'Lemon',      options: ['Orange', 'Lime', 'Grapefruit'] },
  { uzbek: 'Apelsin',    english: 'Orange',     options: ['Lemon', 'Tangerine', 'Grapefruit'] },
  { uzbek: 'Gilos',      english: 'Cherry',     options: ['Plum', 'Grape', 'Berry'] },
  { uzbek: 'Shaftoli',   english: 'Peach',      options: ['Plum', 'Apricot', 'Mango'] },
  { uzbek: 'O\'rik',     english: 'Apricot',    options: ['Peach', 'Plum', 'Cherry'] },
  { uzbek: 'Tarvuz',     english: 'Watermelon', options: ['Melon', 'Pumpkin', 'Cucumber'] },
  { uzbek: 'Non',        english: 'Bread',      options: ['Cake', 'Biscuit', 'Rice'] },
  { uzbek: 'Guruch',     english: 'Rice',       options: ['Wheat', 'Corn', 'Barley'] },
  { uzbek: 'Go\'sht',   english: 'Meat',       options: ['Fish', 'Egg', 'Milk'] },
  { uzbek: 'Tuxum',      english: 'Egg',        options: ['Meat', 'Cheese', 'Butter'] },
  { uzbek: 'Sut',        english: 'Milk',       options: ['Water', 'Juice', 'Yogurt'] },
  { uzbek: 'Suv',        english: 'Water',      options: ['Juice', 'Milk', 'Tea'] },
  { uzbek: 'Choy',       english: 'Tea',        options: ['Coffee', 'Juice', 'Milk'] },
  { uzbek: 'Qahva',      english: 'Coffee',     options: ['Tea', 'Cocoa', 'Juice'] },
  { uzbek: 'Shakar',     english: 'Sugar',      options: ['Salt', 'Honey', 'Flour'] },
  { uzbek: 'Tuz',        english: 'Salt',       options: ['Sugar', 'Pepper', 'Flour'] },
  // ─ Body Parts ──────────────────────────────────────────────────────────────
  { uzbek: 'Qo\'l',     english: 'Hand',       options: ['Foot', 'Arm', 'Finger'] },
  { uzbek: 'Ko\'z',     english: 'Eye',        options: ['Nose', 'Mouth', 'Ear'] },
  { uzbek: 'Quloq',      english: 'Ear',        options: ['Eye', 'Nose', 'Cheek'] },
  { uzbek: 'Burun',      english: 'Nose',       options: ['Mouth', 'Eye', 'Chin'] },
  { uzbek: 'Og\'iz',    english: 'Mouth',      options: ['Nose', 'Lip', 'Chin'] },
  { uzbek: 'Bosh',       english: 'Head',       options: ['Neck', 'Skull', 'Brain'] },
  { uzbek: 'Oyoq',       english: 'Leg',        options: ['Foot', 'Knee', 'Hip'] },
  { uzbek: 'Tish',       english: 'Tooth',      options: ['Lip', 'Tongue', 'Gum'] },
  { uzbek: 'Yuz',        english: 'Face',       options: ['Head', 'Neck', 'Cheek'] },
  { uzbek: 'Qorin',      english: 'Stomach',    options: ['Chest', 'Back', 'Hip'] },
  { uzbek: 'Yelka',      english: 'Shoulder',   options: ['Elbow', 'Wrist', 'Chest'] },
  { uzbek: 'Tizza',      english: 'Knee',       options: ['Ankle', 'Elbow', 'Hip'] },
  { uzbek: 'Barmoq',     english: 'Finger',     options: ['Thumb', 'Palm', 'Wrist'] },
  // ─ Colors ───────────────────────────────────────────────────────────────────
  { uzbek: 'Ko\'k',     english: 'Blue',       options: ['Green', 'Purple', 'Grey'] },
  { uzbek: 'Yashil',     english: 'Green',      options: ['Blue', 'Yellow', 'Teal'] },
  { uzbek: 'Qizil',      english: 'Red',        options: ['Pink', 'Orange', 'Maroon'] },
  { uzbek: 'Sariq',      english: 'Yellow',     options: ['Orange', 'Gold', 'Beige'] },
  { uzbek: 'Oq',         english: 'White',      options: ['Grey', 'Cream', 'Silver'] },
  { uzbek: 'Qora',       english: 'Black',      options: ['Grey', 'Dark', 'Brown'] },
  { uzbek: 'Pushti',     english: 'Pink',       options: ['Purple', 'Lilac', 'Magenta'] },
  { uzbek: 'To\'q sariq', english: 'Orange',   options: ['Yellow', 'Gold', 'Amber'] },
  { uzbek: 'Jigarrang',  english: 'Brown',      options: ['Beige', 'Tan', 'Maroon'] },
  { uzbek: 'Kulrang',    english: 'Grey',       options: ['Silver', 'White', 'Black'] },
  // ─ Adjectives ──────────────────────────────────────────────────────────────
  { uzbek: 'Katta',      english: 'Big',        options: ['Huge', 'Wide', 'Tall'] },
  { uzbek: 'Kichik',     english: 'Small',      options: ['Tiny', 'Short', 'Thin'] },
  { uzbek: 'Baland',     english: 'Tall',       options: ['High', 'Long', 'Wide'] },
  { uzbek: 'Past',       english: 'Low',        options: ['Short', 'Small', 'Flat'] },
  { uzbek: 'Tez',        english: 'Fast',       options: ['Quick', 'Rapid', 'Swift'] },
  { uzbek: 'Sekin',      english: 'Slow',       options: ['Calm', 'Quiet', 'Soft'] },
  { uzbek: 'Issiq',      english: 'Hot',        options: ['Warm', 'Burning', 'Scorching'] },
  { uzbek: 'Sovuq',      english: 'Cold',       options: ['Cool', 'Freezing', 'Chilly'] },
  { uzbek: 'Yangi',      english: 'New',        options: ['Fresh', 'Modern', 'Recent'] },
  { uzbek: 'Eski',       english: 'Old',        options: ['Ancient', 'Used', 'Worn'] },
  { uzbek: 'Chiroyli',   english: 'Beautiful',  options: ['Pretty', 'Nice', 'Lovely'] },
  { uzbek: 'Yaxshi',     english: 'Good',       options: ['Nice', 'Fine', 'Great'] },
  { uzbek: 'Yomon',      english: 'Bad',        options: ['Ugly', 'Poor', 'Wrong'] },
  // ─ Animals ──────────────────────────────────────────────────────────────────
  { uzbek: 'Mushuk',     english: 'Cat',        options: ['Dog', 'Rabbit', 'Fox'] },
  { uzbek: 'It',         english: 'Dog',        options: ['Cat', 'Wolf', 'Fox'] },
  { uzbek: 'Ot',         english: 'Horse',      options: ['Donkey', 'Camel', 'Cow'] },
  { uzbek: 'Sigir',      english: 'Cow',        options: ['Sheep', 'Goat', 'Buffalo'] },
  { uzbek: 'Qo\'y',     english: 'Sheep',      options: ['Goat', 'Lamb', 'Pig'] },
  { uzbek: 'Qush',       english: 'Bird',       options: ['Bat', 'Insect', 'Butterfly'] },
  { uzbek: 'Baliq',      english: 'Fish',       options: ['Frog', 'Crab', 'Shrimp'] },
  { uzbek: 'Sher',       english: 'Lion',       options: ['Tiger', 'Leopard', 'Cheetah'] },
  { uzbek: 'Fil',        english: 'Elephant',   options: ['Rhino', 'Hippo', 'Giraffe'] },
  { uzbek: 'Maymun',     english: 'Monkey',     options: ['Gorilla', 'Chimpanzee', 'Baboon'] },
  { uzbek: 'Bo\'ri',    english: 'Wolf',       options: ['Fox', 'Dog', 'Hyena'] },
  { uzbek: 'Ayiq',       english: 'Bear',       options: ['Wolf', 'Lion', 'Tiger'] },
  { uzbek: 'Quyon',      english: 'Rabbit',     options: ['Hare', 'Squirrel', 'Hamster'] },
  // ─ School & People ─────────────────────────────────────────────────────────
  { uzbek: 'Maktab',     english: 'School',     options: ['College', 'Library', 'Kindergarten'] },
  { uzbek: 'Dars',       english: 'Lesson',     options: ['Class', 'Homework', 'Exam'] },
  { uzbek: 'O\'qituvchi', english: 'Teacher',   options: ['Professor', 'Trainer', 'Tutor'] },
  { uzbek: 'O\'quvchi',  english: 'Student',    options: ['Pupil', 'Learner', 'Graduate'] },
  { uzbek: 'Do\'st',    english: 'Friend',      options: ['Buddy', 'Companion', 'Colleague'] },
  { uzbek: 'Oila',       english: 'Family',     options: ['Relatives', 'Couple', 'Community'] },
  { uzbek: 'Ota',        english: 'Father',     options: ['Uncle', 'Grandfather', 'Brother'] },
  { uzbek: 'Ona',        english: 'Mother',     options: ['Aunt', 'Grandmother', 'Sister'] },
  { uzbek: 'Aka',        english: 'Brother',    options: ['Sister', 'Cousin', 'Uncle'] },
  { uzbek: 'Opa',        english: 'Sister',     options: ['Brother', 'Aunt', 'Cousin'] },
  { uzbek: 'Shifokor',   english: 'Doctor',     options: ['Nurse', 'Dentist', 'Surgeon'] },
  // ─ Places ───────────────────────────────────────────────────────────────────
  { uzbek: 'Shahar',     english: 'City',       options: ['Town', 'Village', 'Capital'] },
  { uzbek: 'Qishloq',    english: 'Village',    options: ['Town', 'City', 'District'] },
  { uzbek: 'Ko\'cha',   english: 'Street',      options: ['Avenue', 'Road', 'Alley'] },
  { uzbek: 'Bozor',      english: 'Market',     options: ['Shop', 'Mall', 'Bazaar'] },
  { uzbek: 'Kasalxona',  english: 'Hospital',   options: ['Clinic', 'Pharmacy', 'Dispensary'] },
  { uzbek: 'Kutubxona',  english: 'Library',    options: ['Archive', 'Museum', 'Bookshop'] },
  { uzbek: 'Masjid',     english: 'Mosque',     options: ['Church', 'Temple', 'Cathedral'] },
  { uzbek: 'Park',       english: 'Park',       options: ['Garden', 'Zoo', 'Square'] },
  // ─ Transport ──────────────────────────────────────────────────────────────
  { uzbek: 'Mashina',    english: 'Car',        options: ['Van', 'Truck', 'Jeep'] },
  { uzbek: 'Avtobus',    english: 'Bus',        options: ['Tram', 'Minibus', 'Trolleybus'] },
  { uzbek: 'Samolyot',   english: 'Airplane',   options: ['Helicopter', 'Glider', 'Jet'] },
  { uzbek: 'Poyezd',     english: 'Train',      options: ['Tram', 'Subway', 'Trolley'] },
  { uzbek: 'Kema',       english: 'Ship',       options: ['Boat', 'Ferry', 'Yacht'] },
  { uzbek: 'Velosiped',  english: 'Bicycle',    options: ['Scooter', 'Tricycle', 'Moped'] },
  // ─ Technology ──────────────────────────────────────────────────────────────
  { uzbek: 'Telefon',    english: 'Phone',      options: ['Tablet', 'Radio', 'Pager'] },
  { uzbek: 'Kompyuter',  english: 'Computer',   options: ['Laptop', 'Monitor', 'Printer'] },
  { uzbek: 'Televizor',  english: 'Television', options: ['Screen', 'Monitor', 'Projector'] },
  { uzbek: 'Kamera',     english: 'Camera',     options: ['Webcam', 'Scanner', 'Projector'] },
  // ─ Furniture & Home ─────────────────────────────────────────────────────────
  { uzbek: 'Uy',         english: 'House',      options: ['Apartment', 'Flat', 'Villa'] },
  { uzbek: 'Eshik',      english: 'Door',       options: ['Gate', 'Window', 'Wall'] },
  { uzbek: 'Deraza',     english: 'Window',     options: ['Door', 'Glass', 'Curtain'] },
  { uzbek: 'Stol',       english: 'Table',      options: ['Desk', 'Counter', 'Shelf'] },
  { uzbek: 'Stul',       english: 'Chair',      options: ['Bench', 'Sofa', 'Stool'] },
  { uzbek: 'Karavot',    english: 'Bed',        options: ['Sofa', 'Mattress', 'Cot'] },
  { uzbek: 'Lampa',      english: 'Lamp',       options: ['Bulb', 'Candle', 'Lantern'] },
  { uzbek: 'Ko\'zgu',   english: 'Mirror',      options: ['Glass', 'Frame', 'Screen'] },
  { uzbek: 'Oshxona',    english: 'Kitchen',    options: ['Bathroom', 'Bedroom', 'Dining room'] },
  { uzbek: 'Yotoqxona',  english: 'Bedroom',    options: ['Kitchen', 'Study', 'Living room'] },
  { uzbek: 'Hammom',     english: 'Bathroom',   options: ['Toilet', 'Kitchen', 'Bedroom'] },
  // ─ Stationery ──────────────────────────────────────────────────────────────
  { uzbek: 'Kitob',      english: 'Book',       options: ['Magazine', 'Textbook', 'Journal'] },
  { uzbek: 'Qalam',      english: 'Pencil',     options: ['Pen', 'Marker', 'Chalk'] },
  { uzbek: 'Ruchka',     english: 'Pen',        options: ['Pencil', 'Marker', 'Crayon'] },
  { uzbek: 'Daftar',     english: 'Notebook',   options: ['Book', 'Journal', 'Folder'] },
  { uzbek: 'Sumka',      english: 'Bag',        options: ['Backpack', 'Suitcase', 'Pouch'] },
  // ─ Clothing ────────────────────────────────────────────────────────────────
  { uzbek: 'Kiyim',      english: 'Clothes',    options: ['Costume', 'Uniform', 'Outfit'] },
  { uzbek: 'Ko\'ylak',  english: 'Shirt',       options: ['Jacket', 'Blouse', 'Vest'] },
  { uzbek: 'Shim',       english: 'Trousers',   options: ['Shorts', 'Skirt', 'Leggings'] },
  { uzbek: 'Etik',       english: 'Boot',       options: ['Shoe', 'Slipper', 'Sandal'] },
  { uzbek: 'Shlyapa',    english: 'Hat',        options: ['Cap', 'Helmet', 'Beret'] },
  { uzbek: 'Palto',      english: 'Coat',       options: ['Jacket', 'Cardigan', 'Jumper'] },
  // ─ Time ───────────────────────────────────────────────────────────────────
  { uzbek: 'Tong',       english: 'Morning',    options: ['Noon', 'Dawn', 'Sunrise'] },
  { uzbek: 'Tush',       english: 'Noon',       options: ['Morning', 'Afternoon', 'Midday'] },
  { uzbek: 'Kech',       english: 'Evening',    options: ['Afternoon', 'Dusk', 'Twilight'] },
  { uzbek: 'Tun',        english: 'Night',      options: ['Midnight', 'Evening', 'Dark'] },
  { uzbek: 'Kun',        english: 'Day',        options: ['Week', 'Date', 'Period'] },
  { uzbek: 'Hafta',      english: 'Week',       options: ['Month', 'Fortnight', 'Period'] },
  { uzbek: 'Oy',         english: 'Month',      options: ['Year', 'Season', 'Quarter'] },
  { uzbek: 'Yil',        english: 'Year',       options: ['Decade', 'Century', 'Season'] },
  // ─ Seasons ────────────────────────────────────────────────────────────────
  { uzbek: 'Bahor',      english: 'Spring',     options: ['Summer', 'Autumn', 'Winter'] },
  { uzbek: 'Yoz',        english: 'Summer',     options: ['Spring', 'Autumn', 'Winter'] },
  { uzbek: 'Kuz',        english: 'Autumn',     options: ['Spring', 'Summer', 'Winter'] },
  { uzbek: 'Qish',       english: 'Winter',     options: ['Spring', 'Autumn', 'Summer'] },
];


// Fisher-Yates shuffle
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const EnglishWords = () => {
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
  // Track used indices to avoid repeating words in a session
  const usedIndices = useRef<Set<number>>(new Set());

  const syncScore = (v: number) => { scoreRef.current = v; setScore(v); };
  const syncLives = (v: number) => { livesRef.current = v; setLives(v); };

  const pickNextWord = useCallback(() => {
    // Reset pool if all words used
    if (usedIndices.current.size >= WORD_BANK.length) {
      usedIndices.current.clear();
    }
    let idx: number;
    do { idx = Math.floor(Math.random() * WORD_BANK.length); }
    while (usedIndices.current.has(idx));
    usedIndices.current.add(idx);

    const word = WORD_BANK[idx];
    const displayOptions = shuffle([word.english, ...word.options]);
    setCurrentWord({ ...word, displayOptions });
  }, []);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/games/leaderboard/${GAME_ID}`);
      if (res.ok) setLeaderboard(await res.json());
    } catch (_) { /* silent fail */ }
  }, []);

  useEffect(() => {
    fetchLeaderboard();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [fetchLeaderboard]);

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
        console.error('[EnglishWords] saveScore failed:', err);
        toast.error('Natija saqlanmadi. Internet aloqasini tekshiring.', { duration: 4000 });
      } else {
        await fetchLeaderboard();
      }
    } catch (e) {
      console.error('[EnglishWords] saveScore network error:', e);
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
        style: { background: '#8B5CF6', color: '#fff', border: 'none', borderRadius: '16px', padding: '16px', fontWeight: 'bold' }
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

    if (option === currentWord.english) {
      const points = 10 + combo * 2;
      const newScore = scoreRef.current + points;
      syncScore(newScore);
      setCombo(prev => prev + 1);
      setFeedback('correct');
      setTimeout(() => { setFeedback(null); setClickedOption(null); pickNextWord(); }, 350);
    } else {
      const newLives = livesRef.current - 1;
      syncLives(newLives);
      setCombo(0);
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
    <div className="min-h-screen bg-slate-50/50 font-sans flex flex-col text-zinc-900 selection:bg-indigo-600 selection:text-white">
      {/* Header */}
      <header className="relative z-20 flex justify-between items-center p-4 border-b border-zinc-200/80 bg-white/90 backdrop-blur-md shadow-xs">
        <button
          onClick={() => navigate('/games')}
          className="w-10 h-10 bg-zinc-100 border border-zinc-200/80 text-zinc-700 rounded-xl flex items-center justify-center hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
          title="O'yinlarga qaytish"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {gameState === 'playing' && (
          <div className="bg-white border border-zinc-200/80 px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider text-zinc-900 flex items-center gap-2 shadow-xs">
            <Trophy className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span>{score} ball</span>
          </div>
        )}
      </header>

      {/* Main Container */}
      <div className="flex flex-col items-center justify-center flex-1 w-full max-w-4xl mx-auto p-4 md:p-6 relative z-10">
        <AnimatePresence mode="wait">
          {/* START */}
          {gameState === 'start' && (
            <motion.div key="start"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.02 }}
              className="w-full max-w-md bg-white border border-zinc-200/80 rounded-3xl p-8 md:p-10 shadow-xl shadow-zinc-900/5 flex flex-col items-center text-center font-sans"
            >
              <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-indigo-700 text-white rounded-2xl flex items-center justify-center mb-6 shadow-md shadow-indigo-500/20">
                <BookOpen className="w-10 h-10 text-white" strokeWidth={1.75} />
              </div>

              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 mb-2">Ingliz Tili Lug'ati</h1>
              <p className="text-zinc-500 text-xs leading-relaxed mb-6">
                O'zbekcha so'zni ko'rib, uning inglizcha to'g'ri tarjimasini toping. 1 daqiqa vaqt!
              </p>

              {highestRecord > 0 && (
                <div className="bg-amber-50 border border-amber-200 text-amber-900 font-semibold px-4 py-2 rounded-xl mb-6 flex items-center gap-2 text-xs">
                  <Trophy className="w-4 h-4 fill-amber-500 text-amber-500" /> TOP REKORD: {highestRecord} ball
                </div>
              )}

              <div className="w-full space-y-3.5">
                <div>
                  <input
                    type="text"
                    value={playerName}
                    onChange={e => setPlayerName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && startGame()}
                    placeholder="Ismingizni kiriting..."
                    autoFocus
                    className="w-full bg-zinc-50 border border-zinc-200/80 rounded-xl px-4 py-3.5 text-xs font-semibold text-zinc-900 outline-none placeholder:text-zinc-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-xs"
                  />
                </div>
                <button
                  onClick={startGame}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm shadow-indigo-600/20 active:scale-[0.99]"
                >
                  O'yinni Boshlash
                </button>
              </div>
            </motion.div>
          )}

          {/* PLAYING SCREEN */}
          {gameState === 'playing' && currentWord && (
            <motion.div key="playing"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full flex flex-col items-center justify-between py-2 max-w-3xl"
            >
              {/* Stats row */}
              <div className="w-full mb-4">
                <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-xs mb-3">
                  <div className="flex gap-4 items-center w-full sm:w-auto justify-between sm:justify-start">
                    <div className="font-bold uppercase tracking-wider text-xs text-zinc-800 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-indigo-600" /> {timeLeft}s
                    </div>
                    <div className="flex gap-1.5">
                      {[...Array(3)].map((_, i) => (
                        <Heart key={i} className={`w-4 h-4 ${i < lives ? 'fill-rose-500 text-rose-500' : 'fill-zinc-200 text-zinc-300'}`} />
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                    <div className="font-semibold text-xs text-zinc-500">
                      Top Rekord: {Math.max(highestRecord, score)}
                    </div>
                    <AnimatePresence>
                      {combo >= 2 && (
                        <motion.div
                          initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                          className="font-bold uppercase tracking-wider text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full flex items-center gap-1"
                        >
                          <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500" /> {combo}x Combo
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
                {/* Timer bar */}
                <div className="w-full h-2 rounded-full border border-zinc-200/80 bg-zinc-100 overflow-hidden">
                  <motion.div
                    className="h-full bg-indigo-600"
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
                className={`w-full bg-white rounded-3xl p-8 md:p-12 mb-6 flex flex-col items-center justify-center border border-zinc-200/80 shadow-xs relative overflow-hidden transition-colors min-h-[180px]
                  ${feedback === 'correct' ? 'bg-emerald-50/60 border-emerald-300' : feedback === 'wrong' ? 'bg-rose-50/60 border-rose-300' : 'bg-white'}`}
              >
                <div className="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full uppercase tracking-wider mb-3">O'zbek → Ingliz</div>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentWord.uzbek}
                    initial={{ y: -10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 10, opacity: 0 }}
                    transition={{ type: 'spring', damping: 20 }}
                    className="text-3xl md:text-5xl font-extrabold tracking-tight text-zinc-900 z-10"
                  >
                    {currentWord.uzbek}
                  </motion.div>
                </AnimatePresence>

                <AnimatePresence>
                  {feedback === 'correct' && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 2, opacity: 0 }} className="absolute text-emerald-500/10">
                      <Check className="w-40 h-40" strokeWidth={3} />
                    </motion.div>
                  )}
                  {feedback === 'wrong' && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 2, opacity: 0 }} className="absolute text-rose-500/10">
                      <X className="w-40 h-40" strokeWidth={3} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Answer buttons */}
              <div className="grid grid-cols-2 gap-3.5 w-full">
                {currentWord.displayOptions.map((opt) => {
                  const isClicked = clickedOption === opt;
                  return (
                    <button
                      key={opt}
                      disabled={feedback !== null}
                      onClick={() => handleOptionClick(opt)}
                      className={`
                        w-full py-4 md:py-6 rounded-2xl border text-xl md:text-2xl font-extrabold font-sans transition-all shadow-xs cursor-pointer ${
                          isClicked 
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-600/30 scale-95' 
                            : 'bg-white text-zinc-900 border-zinc-200/80 hover:border-indigo-400 hover:bg-indigo-50/50'
                        }
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
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="w-full max-w-md flex flex-col items-center font-sans"
            >
              <div className="bg-white rounded-3xl p-8 md:p-10 w-full border border-zinc-200/80 shadow-xl shadow-zinc-900/5 flex flex-col items-center text-center mb-6 relative">
                
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 mb-1">
                  {lives <= 0 ? 'O\'yin Tugadi!' : 'Vaqt Tugadi!'}
                </h2>
                <p className="text-xs text-zinc-500 mb-6">Ajoyib urinish, natijangiz bilan tanishing</p>
                
                <div className="w-full bg-indigo-50/50 rounded-2xl py-6 mb-6 border border-indigo-100 flex flex-col items-center relative">
                  {score > highestRecord && score > 0 && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-white px-3.5 py-0.5 rounded-full font-bold uppercase tracking-wider text-[10px] shadow-xs">
                      Yangi Rekord 🏆
                    </div>
                  )}
                  <div className="text-4xl md:text-5xl font-bold text-indigo-600 leading-none flex items-center justify-center">
                    {score} <span className="text-sm text-zinc-500 font-semibold ml-2">ball</span>
                  </div>
                  {saving && (
                    <div className="mt-3 text-xs font-semibold text-zinc-500 flex items-center justify-center gap-2">
                      <div className="w-3.5 h-3.5 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                      Saqlanmoqda...
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full">
                  <button onClick={startGame}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider py-3.5 rounded-xl transition-all shadow-sm shadow-indigo-600/20"
                  >
                    Qayta O'ynash
                  </button>
                  <button onClick={() => navigate('/games')}
                    className="flex-1 bg-white border border-zinc-200/80 text-zinc-800 font-bold text-xs uppercase tracking-wider py-3.5 rounded-xl transition-all hover:bg-zinc-50 shadow-xs"
                  >
                    Chiqish
                  </button>
                </div>
              </div>

              {/* Leaderboard */}
              <div className="w-full bg-white rounded-none border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6">
                <h3 className="font-bold text-[14px] uppercase tracking-widest text-black mb-6 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-black" />
                  Top Rekordlar
                </h3>
                <div className="space-y-3">
                  {leaderboard.length === 0 && (
                    <p className="text-center text-black font-bold text-[10px] uppercase tracking-widest py-6">Hali rekordlar yo'q. Birinchi bo'ling!</p>
                  )}
                  {leaderboard.slice(0, 5).map((record, idx) => {
                    const isMe = record.playerName === playerName.trim().toUpperCase() && record.score === score;
                    return (
                      <div key={record._id} className={`flex items-center justify-between px-5 py-4 border-2 border-black rounded-none transition-colors ${isMe ? 'bg-zinc-100' : 'bg-white'}`}>
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 rounded-none border-2 border-black bg-black text-white flex items-center justify-center font-bold text-[12px]">
                            {idx + 1}
                          </div>
                          <span className="font-bold text-[12px] uppercase tracking-widest text-black">{record.playerName}</span>
                        </div>
                        <span className="font-black text-xl text-black">{record.score}</span>
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

export default EnglishWords;
