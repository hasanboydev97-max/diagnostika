import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Trophy, Clock, Heart, Flame, Volume2, VolumeX, Zap, Target } from 'lucide-react';
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
  const [leaderboard, setLeaderboard] = useState<GameRecord[]>([]);

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
    <div className="min-h-screen bg-slate-900 text-white font-sans relative overflow-x-hidden selection:bg-teal-500 selection:text-slate-950">
      {/* Ambient Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-teal-500/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Header */}
      <header className="relative z-20 border-b border-slate-800 bg-slate-900/60 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <button
            onClick={() => navigate('/games')}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-semibold text-sm">O'yinlar ro'yxatiga</span>
          </button>

          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-4 h-4" /> Tezkor Atamalar Shot
            </div>

            <button
              onClick={toggleSound}
              className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 hover:text-white transition-all"
            >
              {muted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5 text-emerald-400" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Area */}
      <main className="relative z-10 max-w-4xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {/* START */}
          {gameState === 'start' && (
            <motion.div
              key="start"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-slate-800/80 border border-slate-700 rounded-3xl p-8 md:p-12 shadow-2xl backdrop-blur-xl max-w-xl mx-auto text-center"
            >
              <div className="w-20 h-20 bg-teal-500/20 border border-teal-500/30 rounded-3xl flex items-center justify-center mx-auto mb-6 text-teal-400 shadow-inner">
                <Target className="w-10 h-10 animate-pulse" />
              </div>

              <h1 className="text-3xl md:text-4xl font-extrabold mb-3 tracking-tight">
                Tezkor Atamalar Shot
              </h1>
              <p className="text-slate-400 text-sm md:text-base leading-relaxed mb-8">
                Ekranda paydo bo'lgan atamani imkon qadar tezroq tegishli kategoriyaga yo'naltiring!
              </p>

              <div className="mb-8 text-left">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Ismingizni kiriting:
                </label>
                <input
                  type="text"
                  value={playerName}
                  onChange={e => setPlayerName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && startGame()}
                  placeholder="Masalan: Bekzod Rahimov"
                  className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-5 py-4 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all font-medium text-lg"
                />
              </div>

              <button
                onClick={startGame}
                className="w-full py-4 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-slate-950 font-extrabold text-lg rounded-2xl shadow-lg shadow-teal-500/20 active:scale-[0.98] transition-all"
              >
                Atamalar Shotni Boshlash
              </button>
            </motion.div>
          )}

          {/* PLAYING */}
          {gameState === 'playing' && (
            <motion.div
              key="playing"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="space-y-8"
            >
              {/* Header Stats */}
              <div className="grid grid-cols-4 gap-3 bg-slate-800/80 border border-slate-700 p-4 rounded-2xl backdrop-blur-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[11px] uppercase font-bold text-slate-400">Ball</div>
                    <div className="text-xl font-black text-teal-400">{score}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${timeLeft <= 10 ? 'bg-red-500/20 text-red-400 animate-bounce' : 'bg-teal-500/10 text-teal-400'}`}>
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[11px] uppercase font-bold text-slate-400">Vaqt</div>
                    <div className={`text-xl font-black ${timeLeft <= 10 ? 'text-red-400' : 'text-white'}`}>{timeLeft}s</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                    <Heart className="w-5 h-5 fill-red-500" />
                  </div>
                  <div>
                    <div className="text-[11px] uppercase font-bold text-slate-400">Jon</div>
                    <div className="flex gap-1">
                      {[...Array(3)].map((_, i) => (
                        <span key={i} className={`w-2.5 h-2.5 rounded-full ${i < lives ? 'bg-red-500 shadow-sm shadow-red-500' : 'bg-slate-700'}`} />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
                    <Flame className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[11px] uppercase font-bold text-slate-400">Combo</div>
                    <div className="text-xl font-black text-orange-400">x{combo}</div>
                  </div>
                </div>
              </div>

              {/* Target Word Display Card */}
              <div className="bg-slate-800/90 border border-slate-700 p-8 rounded-3xl text-center shadow-xl relative min-h-[160px] flex flex-col items-center justify-center">
                <span className="text-xs uppercase font-bold tracking-wider text-slate-400 mb-2">
                  {currentRound.title}
                </span>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeWord?.id}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 1.2, opacity: 0 }}
                    className="text-3xl md:text-5xl font-black text-teal-300 tracking-wide"
                  >
                    {activeWord?.term}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Category Choice Buttons */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {currentRound.categories.map((cat, idx) => (
                  <motion.button
                    key={idx}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleCategoryChoice(idx)}
                    className="py-5 px-6 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 hover:from-teal-900/40 hover:to-slate-800 border border-slate-700 hover:border-teal-500 text-white font-bold text-xl shadow-lg transition-all text-center flex items-center justify-center min-h-[80px]"
                  >
                    {cat}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* GAMEOVER */}
          {gameState === 'gameover' && (
            <motion.div
              key="gameover"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-slate-800 border border-slate-700 p-8 md:p-12 rounded-3xl shadow-2xl max-w-xl mx-auto text-center backdrop-blur-xl"
            >
              <div className="w-20 h-20 bg-teal-500/20 border border-teal-500/30 rounded-3xl flex items-center justify-center mx-auto mb-6 text-teal-400">
                <Trophy className="w-10 h-10 animate-bounce" />
              </div>

              <h2 className="text-3xl font-extrabold text-white mb-2">O'yin Tugadi!</h2>
              <p className="text-slate-400 text-sm mb-6">Barakalla, {playerName}!</p>

              <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 mb-8 flex justify-around">
                <div>
                  <div className="text-xs uppercase font-bold text-slate-400 mb-1">Yakuniy Ball</div>
                  <div className="text-4xl font-black text-teal-400">{score}</div>
                </div>
                <div className="w-px bg-slate-700" />
                <div>
                  <div className="text-xs uppercase font-bold text-slate-400 mb-1">Max Combo</div>
                  <div className="text-4xl font-black text-orange-400">x{combo}</div>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => navigate('/games')}
                  className="flex-1 py-3.5 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-xl transition-all"
                >
                  Chiqish
                </button>
                <button
                  onClick={startGame}
                  className="flex-1 py-3.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-extrabold rounded-xl shadow-lg shadow-teal-500/20 transition-all"
                >
                  Qayta O'ynash
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default WordBlast;
