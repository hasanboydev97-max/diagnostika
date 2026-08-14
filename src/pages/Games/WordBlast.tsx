import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Trophy, Clock, Target, Volume2, VolumeX, Flame, Heart, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import { gameSound } from '../../utils/gameSound';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const GAME_ID = 'word-blast';
const GAME_DURATION = 60;

interface BlastWord {
  id: string;
  term: string;
  categoryIndex: number; // Index in categories array
}

interface GameRound {
  title: string;
  categories: string[];
  words: { term: string; categoryIndex: number }[];
}

const BLAST_ROUNDS: GameRound[] = [
  {
    title: 'Davlatlar va Ularning Poytaxtlari',
    categories: ['O\'zbekiston', 'Fransiya', 'Yaponiya'],
    words: [
      { term: 'Toshkent', categoryIndex: 0 },
      { term: 'Parij', categoryIndex: 1 },
      { term: 'Tokio', categoryIndex: 2 },
      { term: 'Samarqand', categoryIndex: 0 },
      { term: 'Lion', categoryIndex: 1 },
      { term: 'Kioto', categoryIndex: 2 },
      { term: 'Buxoro', categoryIndex: 0 },
      { term: 'Marsel', categoryIndex: 1 }
    ]
  },
  {
    title: 'Fanlar Atamalari',
    categories: ['Fizika', 'Kimyo', 'Biologiya'],
    words: [
      { term: 'Tezlanish', categoryIndex: 0 },
      { term: 'Valentlik', categoryIndex: 1 },
      { term: 'DNK', categoryIndex: 2 },
      { term: 'Kuchlanish', categoryIndex: 0 },
      { term: 'Reaksiya', categoryIndex: 1 },
      { term: 'Hujayra', categoryIndex: 2 },
      { term: 'Massasizlik', categoryIndex: 0 },
      { term: 'Molekula', categoryIndex: 1 }
    ]
  },
  {
    title: 'Tillar Lug\'ati (Tarjima categoriyasi)',
    categories: ['Kitob / O\'qish', 'Tabiat / Havo', 'Texnologiya'],
    words: [
      { term: 'Book', categoryIndex: 0 },
      { term: 'Rain', categoryIndex: 1 },
      { term: 'Computer', categoryIndex: 2 },
      { term: 'Library', categoryIndex: 0 },
      { term: 'Sun', categoryIndex: 1 },
      { term: 'Software', categoryIndex: 2 }
    ]
  }
];

interface GameRecord {
  _id: string;
  playerName: string;
  score: number;
  createdAt: string;
}

const WordBlast = () => {
  const navigate = useNavigate();
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover'>('start');
  const [playerName, setPlayerName] = useState('');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [lives, setLives] = useState(3);
  const [combo, setCombo] = useState(0);
  const [muted, setMuted] = useState(gameSound.getMuted());
  const [, setLeaderboard] = useState<GameRecord[]>([]);

  const [currentRound, setCurrentRound] = useState<GameRound>(BLAST_ROUNDS[0]);
  const [activeWord, setActiveWord] = useState<BlastWord | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/games/leaderboard/${GAME_ID}`);
      if (res.ok) setLeaderboard(await res.json());
    } catch (_) {}
  }, []);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const saveScore = async (finalScore: number, name: string) => {
    if (finalScore <= 0 || !name.trim()) return;
    try {
      await fetch(`${API_URL}/games/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerName: name.trim().toUpperCase(),
          gameId: GAME_ID,
          score: finalScore,
        }),
      });
      fetchLeaderboard();
    } catch (e) {
      console.error('Score save error:', e);
    }
  };

  const spawnNextWord = useCallback((round?: GameRound) => {
    const rnd = round || BLAST_ROUNDS[Math.floor(Math.random() * BLAST_ROUNDS.length)];
    setCurrentRound(rnd);
    const item = rnd.words[Math.floor(Math.random() * rnd.words.length)];
    setActiveWord({
      id: `w-${Math.random()}`,
      term: item.term,
      categoryIndex: item.categoryIndex
    });
  }, []);

  const scoreRef = useRef(score); scoreRef.current = score;
  const nameRef = useRef(playerName); nameRef.current = playerName;

  const endGame = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setGameState('gameover');
    gameSound.playVictory();
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    if (nameRef.current) saveScore(scoreRef.current, nameRef.current);
  }, []);

  const startGame = () => {
    if (!playerName.trim()) {
      toast.error('Iltimos, ismingizni kiriting!');
      return;
    }
    setScore(0);
    setLives(3);
    setCombo(0);
    setTimeLeft(GAME_DURATION);
    setGameState('playing');
    spawnNextWord();

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          endGame();
          return 0;
        }
        if (prev <= 10) gameSound.playTick();
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleCategoryChoice = (catIdx: number) => {
    if (!activeWord) return;

    if (catIdx === activeWord.categoryIndex) {
      // Correct Shoot!
      const comboBonus = combo * 10;
      const roundScore = 30 + comboBonus;
      setScore(prev => prev + roundScore);
      const newCombo = combo + 1;
      setCombo(newCombo);

      if (newCombo >= 3) {
        gameSound.playCombo(newCombo);
      } else {
        gameSound.playCorrect();
      }

      spawnNextWord(currentRound);
    } else {
      // Wrong Shoot!
      gameSound.playWrong();
      setCombo(0);
      const newLives = lives - 1;
      setLives(newLives);

      if (newLives <= 0) {
        endGame();
      } else {
        spawnNextWord(currentRound);
      }
    }
  };

  const toggleSound = () => {
    const isMuted = gameSound.toggleMute();
    setMuted(isMuted);
  };

  return (
    <div className="min-h-screen relative font-sans overflow-hidden transition-all duration-300 flex flex-col bg-[#F8FAFC]">
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #334155 1px, transparent 0)', backgroundSize: '32px 32px' }} />

      {/* Header */}
      <header className="relative z-20 flex justify-between items-center p-4">
        <button
          onClick={() => navigate('/games')}
          className="w-12 h-12 bg-white border border-slate-200 text-slate-700 rounded-2xl flex items-center justify-center hover:bg-slate-50 active:scale-95 transition-all shadow-sm"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {gameState === 'playing' && (
          <div className="flex gap-2">
            <button onClick={toggleSound} className="w-12 h-12 bg-white border border-slate-200 text-slate-700 rounded-2xl flex items-center justify-center hover:bg-slate-50 active:scale-95 transition-all shadow-sm">
              {muted ? <VolumeX className="w-5 h-5 text-rose-500" /> : <Volume2 className="w-5 h-5 text-emerald-500" />}
            </button>
            <div className="bg-white border border-slate-200 px-5 py-2 rounded-2xl font-bold text-[17px] text-slate-700 flex items-center gap-2 shadow-sm">
              <Trophy className="w-5 h-5 text-amber-500 fill-amber-500" />
              {score}
            </div>
          </div>
        )}
      </header>

      {/* Main Area */}
      <main className="flex flex-col items-center justify-center flex-1 w-full max-w-4xl mx-auto p-4 relative z-10">
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
                  className="w-32 h-32 bg-gradient-to-br from-teal-400 via-emerald-500 to-emerald-600 rounded-[2rem] shadow-2xl shadow-teal-500/40 flex items-center justify-center relative overflow-hidden"
                >
                  <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-white/30 rounded-full blur-xl" />
                  <Target className="w-14 h-14 text-white relative z-10" strokeWidth={2} />
                </motion.div>
              </div>

              <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-3 tracking-tight">
                Tezkor Atamalar Shot
              </h1>
              <p className="text-slate-500 text-[16px] mb-8 max-w-sm leading-relaxed">
                Ekranda paydo bo'lgan atamani imkon qadar tezroq tegishli kategoriyaga yo'naltiring!
              </p>

              <div className="w-full max-w-sm space-y-4">
                <div className="relative">
                  <input
                    type="text"
                    value={playerName}
                    onChange={e => setPlayerName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && startGame()}
                    placeholder="Ismingizni kiriting..."
                    autoFocus
                    className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4.5 text-[17px] font-medium text-slate-800 outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-500/10 transition-all placeholder:text-slate-400 shadow-sm"
                  />
                </div>
                <button
                  onClick={startGame}
                  className="w-full bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-semibold text-[17px] py-4.5 rounded-2xl hover:opacity-90 active:scale-[0.98] transition-all shadow-xl shadow-teal-500/20 tracking-wide flex items-center justify-center gap-2"
                >
                  Atamalar Shotni Boshlash <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          )}

          {/* PLAYING */}
          {gameState === 'playing' && (
            <motion.div key="playing"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="w-full flex flex-col items-center max-w-3xl space-y-6"
            >
              {/* Header Stats */}
              <div className="w-full flex justify-between items-end mb-2 px-1">
                <div className="flex flex-col gap-1">
                  <div className="font-semibold text-slate-500 flex items-center gap-1.5 text-[13px]">
                    <Clock className="w-4 h-4" /> {timeLeft} soniya
                  </div>
                  <div className="flex gap-1.5">
                    {[...Array(3)].map((_, i) => (
                      <Heart key={i} className={`w-5 h-5 ${i < lives ? 'fill-rose-500 text-rose-500' : 'fill-slate-200 text-slate-200'}`} strokeWidth={2} />
                    ))}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <AnimatePresence>
                    {combo >= 2 && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                        className="text-orange-500 font-bold text-[15px] flex items-center gap-1"
                      >
                        <Flame className="w-4 h-4 fill-orange-500" /> {combo}x COMBO
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              <div className="w-full h-2.5 bg-slate-200/60 rounded-full overflow-hidden -mt-4 mb-2">
                <motion.div
                  className={`h-full ${timeLeft > 15 ? 'bg-teal-500' : 'bg-rose-500'}`}
                  initial={{ width: '100%' }}
                  animate={{ width: `${(timeLeft / GAME_DURATION) * 100}%` }}
                  transition={{ duration: 1, ease: 'linear' }}
                />
              </div>

              {/* Target Word Display Card */}
              <div className="w-full bg-white border border-slate-100 p-8 rounded-[2rem] text-center shadow-2xl shadow-slate-200/60 relative min-h-[220px] flex flex-col items-center justify-center overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-teal-400 to-emerald-500" />
                <span className="text-xs uppercase font-bold tracking-wider text-teal-600 bg-teal-50 px-3 py-1 rounded-full border border-teal-100 mb-6 inline-block">
                  {currentRound.title}
                </span>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeWord?.id}
                    initial={{ scale: 0.5, opacity: 0, y: 10 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 1.2, opacity: 0, y: -10 }}
                    className="text-4xl md:text-5xl font-black text-slate-800 tracking-tight"
                  >
                    {activeWord?.term}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Category Choice Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
                {currentRound.categories.map((cat, idx) => (
                  <motion.button
                    key={idx}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleCategoryChoice(idx)}
                    className="py-6 px-6 rounded-[1.5rem] bg-white hover:bg-slate-50 border border-slate-200 hover:border-teal-300 hover:shadow-md text-slate-700 font-bold text-xl shadow-sm transition-all text-center flex items-center justify-center min-h-[100px]"
                  >
                    {cat}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* GAMEOVER */}
          {gameState === 'gameover' && (
            <motion.div key="gameover"
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="w-full max-w-xl flex flex-col items-center font-sans"
            >
              <div className="bg-white rounded-[2rem] p-8 md:p-10 w-full border border-slate-100 shadow-2xl shadow-slate-200/50 flex flex-col items-center text-center mb-6 relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-teal-50/50 to-transparent pointer-events-none" />
                
                <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2 relative z-10 tracking-tight">
                  {lives <= 0 ? 'O\'yin Tugadi!' : 'Vaqt Tugadi!'}
                </h2>
                <p className="text-[15px] font-medium text-slate-500 mb-8 relative z-10">Barakalla, {playerName}!</p>
                
                <div className="w-full bg-slate-50/50 rounded-[1.5rem] py-8 mb-8 relative border border-slate-100 flex flex-col items-center">
                  <div className="text-[5rem] md:text-[6rem] font-bold text-teal-500 leading-none flex items-center justify-center gap-4">
                    {score}
                  </div>
                  {combo > 0 && (
                    <div className="mt-4 px-3 py-1 bg-orange-100 text-orange-600 rounded-full text-xs font-bold uppercase tracking-wider border border-orange-200">
                      Max Combo: {combo}x
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full relative z-10">
                  <button onClick={startGame}
                    className="flex-1 bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-semibold text-[16px] py-4 rounded-xl hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-teal-500/20"
                  >
                    Qayta O'ynash
                  </button>
                  <button onClick={() => navigate('/games')}
                    className="flex-1 bg-white border border-slate-200 text-slate-700 font-semibold text-[16px] py-4 rounded-xl hover:bg-slate-50 active:scale-[0.98] transition-all shadow-sm"
                  >
                    Chiqish
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default WordBlast;
