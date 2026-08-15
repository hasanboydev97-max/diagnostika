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
          <div className="flex gap-3 items-center">
            <button onClick={toggleSound} className="w-10 h-10 bg-white border border-zinc-200/80 text-zinc-700 rounded-xl flex items-center justify-center hover:bg-zinc-50 transition-colors shadow-xs">
              {muted ? <VolumeX className="w-5 h-5 text-rose-500" /> : <Volume2 className="w-5 h-5 text-indigo-600" />}
            </button>
            <div className="bg-white border border-zinc-200/80 px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider text-zinc-900 flex items-center gap-2 shadow-xs">
              <Trophy className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span>{score} ball</span>
            </div>
          </div>
        )}
      </header>

      {/* Main Area */}
      <main className="flex flex-col items-center justify-center flex-1 w-full max-w-4xl mx-auto p-4 md:p-6 relative z-10">
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
                <Target className="w-10 h-10 text-white" strokeWidth={1.75} />
              </div>

              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 mb-2">
                Tezkor Atamalar Shot
              </h1>
              <p className="text-zinc-500 text-xs leading-relaxed mb-6">
                Ekranda paydo bo'lgan atamani imkon qadar tezroq tegishli kategoriyaga yo'naltiring!
              </p>

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
                  Atamalar Shotni Boshlash <ChevronRight className="w-4 h-4" />
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
              {/* Clean Top Status Bar */}
              <div className="w-full bg-white border border-zinc-200/80 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-center gap-4 relative z-10 shadow-xs">
                <div className="flex items-center gap-4 sm:gap-6 w-full sm:w-auto justify-center sm:justify-start">
                  <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-xs text-zinc-800">
                    <Clock className="w-4 h-4 text-indigo-600" /> 
                    <span>{timeLeft}s</span>
                  </div>
                  <div className="h-4 w-px bg-zinc-200" />
                  <div className="flex items-center gap-1.5">
                    {[...Array(3)].map((_, i) => (
                      <Heart key={i} className={`w-4 h-4 ${i < lives ? 'fill-rose-500 text-rose-500' : 'fill-zinc-200 text-zinc-300'}`} />
                    ))}
                  </div>
                  <div className="h-4 w-px bg-zinc-200" />
                  <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-xs text-zinc-800">
                    <Trophy className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <span>{score}</span>
                  </div>
                </div>

                <AnimatePresence>
                  {combo >= 2 && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                      className="px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-[10px] uppercase tracking-wider font-bold border border-amber-200 flex items-center gap-1"
                    >
                      <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500" /> x{combo} Combo
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Target Word Display Card */}
              <div className="w-full bg-white rounded-3xl border border-zinc-200/80 shadow-xs p-8 md:p-12 text-center relative min-h-[220px] flex flex-col items-center justify-center overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-1 bg-zinc-100">
                  <motion.div
                    className={`h-full ${timeLeft > 15 ? 'bg-indigo-600' : 'bg-rose-500'}`}
                    initial={{ width: '100%' }}
                    animate={{ width: `${(timeLeft / GAME_DURATION) * 100}%` }}
                    transition={{ duration: 1, ease: 'linear' }}
                  />
                </div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-700 bg-indigo-50 px-3.5 py-1 rounded-full border border-indigo-100 mb-6 inline-block">
                  {currentRound.title}
                </span>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeWord?.id}
                    initial={{ scale: 0.8, opacity: 0, y: 10 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 1.1, opacity: 0, y: -10 }}
                    className="font-sans font-extrabold text-3xl md:text-5xl text-zinc-900 tracking-tight"
                  >
                    {activeWord?.term}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Category Choice Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 w-full">
                {currentRound.categories.map((cat, idx) => (
                  <motion.button
                    key={idx}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleCategoryChoice(idx)}
                    className="py-5 px-5 rounded-2xl bg-white border border-zinc-200/80 hover:border-indigo-500 hover:bg-indigo-600 hover:text-white text-zinc-800 font-bold text-sm md:text-base tracking-wide shadow-xs transition-all text-center flex items-center justify-center min-h-[90px] cursor-pointer"
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
              className="w-full max-w-md flex flex-col items-center font-sans"
            >
              <div className="bg-white rounded-3xl p-8 md:p-10 w-full border border-zinc-200/80 shadow-xl shadow-zinc-900/5 flex flex-col items-center text-center relative">
                
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 mb-1">
                  {lives <= 0 ? 'O\'yin Tugadi!' : 'Vaqt Tugadi!'}
                </h2>
                <p className="text-xs text-zinc-500 mb-6">Barakalla, {playerName}!</p>
                
                <div className="w-full bg-indigo-50/50 rounded-2xl py-6 mb-6 border border-indigo-100 flex flex-col items-center">
                  <div className="text-4xl md:text-5xl font-bold text-indigo-600 leading-none flex items-center justify-center">
                    {score} <span className="text-sm text-zinc-500 font-semibold ml-2">ball</span>
                  </div>
                  {combo > 0 && (
                    <div className="mt-3 px-3 py-0.5 bg-amber-100 text-amber-800 rounded-full text-[10px] font-bold uppercase tracking-wider border border-amber-200">
                      Max Combo: {combo}x
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
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default WordBlast;
