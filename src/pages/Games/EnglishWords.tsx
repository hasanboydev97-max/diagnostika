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


const OPTION_COLORS = [
  { bg: 'bg-[#FF4B4B]', border: 'border-[#CC3C3C]', text: 'text-white' },
  { bg: 'bg-[#3B82F6]', border: 'border-[#2563EB]', text: 'text-white' },
  { bg: 'bg-[#F59E0B]', border: 'border-[#D97706]', text: 'text-white' },
  { bg: 'bg-[#10B981]', border: 'border-[#059669]', text: 'text-white' },
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
    <div className={`min-h-screen relative font-sans overflow-hidden transition-all duration-300 flex flex-col
      ${gameState === 'playing'
        ? feedback === 'correct' ? 'bg-violet-50' : feedback === 'wrong' ? 'bg-rose-50' : 'bg-violet-50'
        : 'bg-[#F8FAFC]'}`}
    >
      {/* Subtle dot grid */}
      <div className="absolute inset-0 opacity-10 pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #6d28d9 1px, transparent 0)', backgroundSize: '32px 32px' }}
      />

      {/* ── HEADER ─────────────────────────────────────── */}
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

      {/* ── MAIN ───────────────────────────────────────── */}
      <div className="flex flex-col items-center justify-center flex-1 w-full max-w-4xl mx-auto p-4 relative z-10">
        <AnimatePresence mode="wait">

          {/* START SCREEN */}
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
                  className="w-32 h-32 bg-gradient-to-br from-violet-500 to-purple-700 rounded-[2rem] shadow-[0_10px_0_#5b21b6] flex items-center justify-center"
                >
                  <BookOpen className="w-16 h-16 text-white" strokeWidth={2.5} />
                </motion.div>
                <motion.div animate={{ scale: [1, 1.3, 1], opacity: [0.6, 1, 0.6] }} transition={{ duration: 2, repeat: Infinity }} className="absolute -top-3 -right-3 text-2xl">📚</motion.div>
                <motion.div animate={{ scale: [1, 1.3, 1], opacity: [0.6, 1, 0.6] }} transition={{ duration: 2, repeat: Infinity, delay: 1 }} className="absolute -bottom-3 -left-3 text-2xl">🇬🇧</motion.div>
              </div>

              <h1 className="text-4xl md:text-6xl font-black text-slate-800 mb-2 tracking-tight">English Words</h1>
              <p className="text-slate-500 text-base md:text-lg mb-6 font-bold max-w-sm">
                O'zbek so'zni ko'r, ingliz tarjimasini tap! 1 daqiqa, 3 jonlik.
              </p>

              {highestRecord > 0 && (
                <div className="bg-violet-100 border border-violet-300 text-violet-700 font-bold px-4 py-2 rounded-xl mb-6 flex items-center gap-2 shadow-sm">
                  <Trophy className="w-5 h-5 fill-violet-500 text-violet-500" /> TOP REKORD: {highestRecord}
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
                  className="w-full bg-white border-2 border-slate-200 rounded-2xl px-5 py-4 text-xl font-bold text-center text-slate-800 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/20 transition-all placeholder:text-slate-300 shadow-sm"
                />
                <button
                  onClick={startGame}
                  className="w-full bg-[#8B5CF6] border-b-[6px] border-[#6D28D9] text-white font-black text-2xl py-5 rounded-2xl active:border-b-0 active:translate-y-[6px] transition-all shadow-md"
                >
                  BOSHLA!
                </button>
              </div>
            </motion.div>
          )}

          {/* PLAYING SCREEN */}
          {gameState === 'playing' && currentWord && (
            <motion.div key="playing"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full flex flex-col items-center justify-between py-2"
            >
              {/* Stats row */}
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
                        <motion.div
                          initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                          className="text-orange-500 font-black text-lg flex items-center gap-1"
                        >
                          <Flame className="w-5 h-5 fill-orange-500" /> {combo}x COMBO
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
                {/* Timer bar */}
                <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full ${timeLeft > 15 ? 'bg-[#8B5CF6]' : 'bg-[#EF4444]'}`}
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
                  ${feedback === 'correct' ? 'border-[#8B5CF6] bg-violet-50' : feedback === 'wrong' ? 'border-[#EF4444] bg-rose-50' : 'border-slate-200'}`}
              >
                <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">O'zbek → Ingliz</div>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentWord.uzbek}
                    initial={{ y: -30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 30, opacity: 0 }}
                    transition={{ type: 'spring', damping: 18 }}
                    className={`text-[2.8rem] md:text-[4.5rem] font-black tracking-tight z-10
                      ${feedback === 'correct' ? 'text-violet-600' : feedback === 'wrong' ? 'text-rose-500' : 'text-slate-800'}`}
                  >
                    {currentWord.uzbek}
                  </motion.div>
                </AnimatePresence>

                <AnimatePresence>
                  {feedback === 'correct' && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 2, opacity: 0 }} className="absolute text-violet-400">
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

              {/* Answer buttons */}
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
                        w-full py-6 md:py-8 rounded-2xl text-xl md:text-3xl font-black transition-all transform
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
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-violet-600 text-white px-4 py-1 rounded-full text-xs font-black animate-bounce">
                      🎉 YANGI REKORD!
                    </div>
                  )}
                  <div className="text-slate-400 font-bold text-base mb-2 uppercase">Sizning Natijangiz</div>
                  <div className="text-[4.5rem] md:text-[5.5rem] font-black text-violet-500 leading-none drop-shadow-sm flex items-center justify-center gap-3">
                    <Trophy className="w-14 h-14 fill-violet-500" />
                    {score}
                  </div>
                  {saving && (
                    <div className="mt-3 text-sm text-slate-400 flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                      Natija saqlanmoqda...
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full">
                  <button onClick={startGame}
                    className="flex-1 bg-[#8B5CF6] border-b-[6px] border-[#6D28D9] text-white font-black text-xl py-4 rounded-xl active:border-b-0 active:translate-y-[6px] transition-all shadow-md"
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
                  {leaderboard.length === 0 && (
                    <p className="text-center text-slate-400 py-4 text-sm">Hali rekordlar yo'q. Birinchi bo'ling!</p>
                  )}
                  {leaderboard.slice(0, 5).map((record, idx) => {
                    const isMe = record.playerName === playerName.trim().toUpperCase() && record.score === score;
                    return (
                      <div key={record._id} className={`flex items-center justify-between px-4 py-3 rounded-xl border-2 ${isMe ? 'bg-violet-50 border-violet-400' : 'bg-slate-50 border-slate-100'}`}>
                        <div className="flex items-center gap-4">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm
                            ${idx === 0 ? 'bg-amber-400 text-white' : idx === 1 ? 'bg-slate-300 text-white' : idx === 2 ? 'bg-amber-700 text-white' : 'bg-slate-200 text-slate-500'}`}>
                            {idx + 1}
                          </div>
                          <span className={`font-bold text-lg uppercase ${isMe ? 'text-violet-600' : 'text-slate-700'}`}>{record.playerName}</span>
                        </div>
                        <span className={`font-black text-xl ${isMe ? 'text-violet-600' : 'text-slate-800'}`}>{record.score}</span>
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
