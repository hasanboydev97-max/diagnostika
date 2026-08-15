import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Trophy, Clock, Flame, Volume2, VolumeX, ChevronRight, Brain, Heart, RotateCcw, Check } from 'lucide-react';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import { gameSound } from '../../utils/gameSound';
import FormattedText from '../../components/FormattedText';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const GAME_ID = 'formula-chain';
const GAME_DURATION = 75;

interface FormulaItem {
  id: string;
  title: string;
  category: 'Matematika' | 'Fizika' | 'Kimyo' | 'Mantiq';
  blocks: string[]; // Correct order of tokens
  hint: string;
}

const FORMULA_DATABASE: FormulaItem[] = [
  {
    id: 'f1',
    title: 'Nyutonning II Qonuni',
    category: 'Fizika',
    blocks: ['F', '=', 'm', '·', 'a'],
    hint: 'Kuch = Massa × Tezlanish'
  },
  {
    id: 'f2',
    title: 'Eynshteyn Formulasi (Energiya)',
    category: 'Fizika',
    blocks: ['E', '=', 'm', '·', 'c²'],
    hint: 'Energiya = Massa × Yorug\'lik tezligi kvadrati'
  },
  {
    id: 'f3',
    title: 'Pifagor Teoremasi',
    category: 'Matematika',
    blocks: ['a²', '+', 'b²', '=', 'c²'],
    hint: 'Katetlar kvadratlari yig\'indisi gipotenuza kvadratiga teng'
  },
  {
    id: 'f4',
    title: 'Kvadrat Tenglama Diskriminanti',
    category: 'Matematika',
    blocks: ['D', '=', 'b²', '-', '4', '·', 'a', '·', 'c'],
    hint: 'Diskriminant formulasi'
  },
  {
    id: 'f5',
    title: 'Tezlik Formulasi',
    category: 'Fizika',
    blocks: ['S', '=', 'v', '·', 't'],
    hint: 'Masofa = Tezlik × Vaqt'
  },
  {
    id: 'f6',
    title: 'Om Qonuni (Tok kuchi)',
    category: 'Fizika',
    blocks: ['I', '=', 'U', '/', 'R'],
    hint: 'Tok kuchi = Kuchlanish / Qarshilik'
  },
  {
    id: 'f7',
    title: 'Zichlik Formulasi',
    category: 'Fizika',
    blocks: ['ρ', '=', 'm', '/', 'V'],
    hint: 'Zichlik = Massa / Hajm'
  },
  {
    id: 'f8',
    title: 'To\'g\'ri To\'rtburchak Yuzi',
    category: 'Matematika',
    blocks: ['S', '=', 'a', '·', 'b'],
    hint: 'Yuz = Bo\'y × En'
  },
  {
    id: 'f9',
    title: 'To\'g\'ri To\'rtburchak Perimetri',
    category: 'Matematika',
    blocks: ['P', '=', '2', '·', '(', 'a', '+', 'b', ')'],
    hint: 'Perimetr = 2 × (En + Bo\'y)'
  },
  {
    id: 'f10',
    title: 'Suvning Reaksiya Tenglamasi',
    category: 'Kimyo',
    blocks: ['2H₂', '+', 'O₂', '=', '2H₂O'],
    hint: 'Vodorod va kislorod reaksiyasidan suv hosil bo\'lishi'
  },
  {
    id: 'f11',
    title: 'Kinetik Energiya',
    category: 'Fizika',
    blocks: ['E_k', '=', '(', 'm', '·', 'v²', ')', '/', '2'],
    hint: 'Kinetik energiya formulasi'
  },
  {
    id: 'f12',
    title: 'Ideal Gaz Holat Tenglamasi',
    category: 'Fizika',
    blocks: ['P', '·', 'V', '=', 'n', '·', 'R', '·', 'T'],
    hint: 'Klapeyron-Mendeleyev tenglamasi'
  }
];

interface GameRecord {
  _id: string;
  playerName: string;
  score: number;
  createdAt: string;
}

const FormulaChain = () => {
  const navigate = useNavigate();
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover'>('start');
  const [playerName, setPlayerName] = useState('');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [lives, setLives] = useState(3);
  const [combo, setCombo] = useState(0);
  const [muted, setMuted] = useState(gameSound.getMuted());
  const [leaderboard, setLeaderboard] = useState<GameRecord[]>([]);

  // Round State
  const [currentFormula, setCurrentFormula] = useState<FormulaItem>(FORMULA_DATABASE[0]);
  const [availableBlocks, setAvailableBlocks] = useState<{ id: string; val: string }[]>([]);
  const [selectedBlocks, setSelectedBlocks] = useState<{ id: string; val: string }[]>([]);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch Leaderboard
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

  // Setup Next Round
  const setupRound = useCallback((pool?: FormulaItem[]) => {
    const list = pool || FORMULA_DATABASE;
    const formula = list[Math.floor(Math.random() * list.length)];
    setCurrentFormula(formula);

    // Shuffle blocks with unique tracking IDs
    const blocksWithIds = formula.blocks.map((b, i) => ({ id: `${b}-${i}-${Math.random()}`, val: b }));
    const shuffled = [...blocksWithIds].sort(() => Math.random() - 0.5);

    setAvailableBlocks(shuffled);
    setSelectedBlocks([]);
    setFeedback(null);
  }, []);

  // End Game
  const endGame = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setGameState('gameover');
    gameSound.playVictory();
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    if (nameRef.current) {
      saveScore(scoreRef.current, nameRef.current);
    }
  }, []);

  const scoreRef = useRef(score);
  scoreRef.current = score;
  const livesRef = useRef(lives);
  livesRef.current = lives;
  const nameRef = useRef(playerName);
  nameRef.current = playerName;

  // Start Game
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
    setupRound();

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

  // Handle Block Tap
  const handleSelectBlock = (item: { id: string; val: string }) => {
    gameSound.playFlip();
    setAvailableBlocks(prev => prev.filter(b => b.id !== item.id));
    setSelectedBlocks(prev => [...prev, item]);
  };

  const handleDeselectBlock = (item: { id: string; val: string }) => {
    gameSound.playFlip();
    setSelectedBlocks(prev => prev.filter(b => b.id !== item.id));
    setAvailableBlocks(prev => [...prev, item]);
  };

  // Check Solution
  const checkSolution = () => {
    const userSequence = selectedBlocks.map(b => b.val).join('');
    const targetSequence = currentFormula.blocks.join('');

    if (userSequence === targetSequence) {
      // Correct!
      setFeedback('correct');
      const comboBonus = combo * 10;
      const roundScore = 50 + comboBonus;
      const newScore = score + roundScore;
      setScore(newScore);
      const newCombo = combo + 1;
      setCombo(newCombo);

      if (newCombo >= 3) {
        gameSound.playCombo(newCombo);
      } else {
        gameSound.playCorrect();
      }

      toast.success(`Barakalla! +${roundScore} ball`, { duration: 1500 });

      setTimeout(() => {
        setupRound();
      }, 1000);
    } else {
      // Wrong!
      setFeedback('wrong');
      gameSound.playWrong();
      setCombo(0);
      const newLives = lives - 1;
      setLives(newLives);

      toast.error('Ketma-ketlik noto\'g\'ri! Qaytadan urinib ko\'ring.', { duration: 1500 });

      if (newLives <= 0) {
        setTimeout(() => endGame(), 1000);
      } else {
        setTimeout(() => {
          // Reset current round selection
          const blocksWithIds = currentFormula.blocks.map((b, i) => ({ id: `${b}-${i}-${Math.random()}`, val: b }));
          setAvailableBlocks([...blocksWithIds].sort(() => Math.random() - 0.5));
          setSelectedBlocks([]);
          setFeedback(null);
        }, 1200);
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

      {/* Main Body */}
      <main className="flex flex-col items-center justify-center flex-1 w-full max-w-4xl mx-auto p-4 md:p-6 relative z-10">
        <AnimatePresence mode="wait">
          {/* 1. START SCREEN */}
          {gameState === 'start' && (
            <motion.div key="start-screen"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.02 }}
              className="w-full max-w-md bg-white border border-zinc-200/80 rounded-3xl p-8 md:p-10 shadow-xl shadow-zinc-900/5 flex flex-col items-center text-center font-sans"
            >
              <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-indigo-700 text-white rounded-2xl flex items-center justify-center mb-6 shadow-md shadow-indigo-500/20">
                <Brain className="w-10 h-10 text-white" strokeWidth={1.75} />
              </div>

              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 mb-2">Formula Zanjiri</h1>
              <p className="text-zinc-500 text-xs leading-relaxed mb-6">
                Formulalar va mantiqiy bloklarni to'g'ri ketma-ketlikda yig'ing. Ilmiy va mantiqiy bilimlaringizni namoyish eting!
              </p>

              {leaderboard.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 text-amber-900 font-semibold px-4 py-2 rounded-xl mb-6 flex items-center gap-2 text-xs">
                  <Trophy className="w-4 h-4 fill-amber-500 text-amber-500" /> TOP REKORD: {Math.max(...leaderboard.map(r => r.score))} ball
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
                  O'yinni Boshlash <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* 2. PLAYING SCREEN */}
          {gameState === 'playing' && (
            <motion.div key="playing-screen"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="w-full flex flex-col items-center max-w-3xl space-y-6"
            >
              {/* Clean Top Status Bar */}
              <div className="w-full bg-white border border-zinc-200/80 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-center gap-4 relative z-10 shadow-xs">
                <div className="flex items-center gap-4 sm:gap-6 w-full sm:w-auto justify-center sm:justify-start">
                  <div className="flex items-center gap-2 text-zinc-800 font-bold text-xs uppercase tracking-wider">
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
                  <div className="flex items-center gap-2 text-zinc-800 font-bold text-xs uppercase tracking-wider">
                    <Trophy className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <span>{score}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="hidden sm:block text-[11px] font-semibold text-zinc-500">
                    Top Rekord: {leaderboard.length > 0 ? Math.max(...leaderboard.map(r => r.score), score) : score}
                  </div>
                  <AnimatePresence>
                    {combo >= 2 && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                        className="px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-[10px] font-bold uppercase tracking-wider border border-amber-200 flex items-center gap-1"
                      >
                        <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500" /> x{combo} Combo
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Task / Formula Hint Box */}
              <div className="w-full bg-white rounded-2xl border border-zinc-200/80 p-6 md:p-8 text-center shadow-xs relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-1 bg-zinc-100">
                  <motion.div
                    className="h-full bg-indigo-600"
                    initial={{ width: '100%' }}
                    animate={{ width: `${(timeLeft / GAME_DURATION) * 100}%` }}
                    transition={{ duration: 1, ease: 'linear' }}
                  />
                </div>
                
                <span className="px-3 py-1 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100 text-[10px] font-bold uppercase tracking-wider mb-3 inline-block mt-1">
                  {currentFormula.category}
                </span>

                <h2 className="text-xl md:text-2xl font-bold tracking-tight text-zinc-900 mb-2">
                  {currentFormula.title}
                </h2>
                <p className="text-zinc-500 text-xs font-medium">
                  "{currentFormula.hint}"
                </p>
              </div>

              {/* Selected Formula Chain Dropzone */}
              <div className={`w-full min-h-[110px] p-5 rounded-2xl border-2 transition-all flex flex-wrap items-center justify-center gap-2.5 relative shadow-xs
                ${feedback === 'correct' ? 'bg-emerald-50 border-emerald-500' : feedback === 'wrong' ? 'bg-rose-50 border-rose-500' : 'bg-indigo-50/30 border-dashed border-indigo-200'}`}>
                {selectedBlocks.length === 0 ? (
                  <span className="text-zinc-400 text-xs font-medium uppercase tracking-wider">
                    Pastdagi bloklarni bosib zanjirni shakllantiring...
                  </span>
                ) : (
                  selectedBlocks.map(item => (
                    <motion.button
                      key={item.id}
                      layout
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      onClick={() => handleDeselectBlock(item)}
                      className="px-5 py-3 rounded-xl bg-indigo-600 text-white font-bold text-base md:text-lg shadow-sm shadow-indigo-600/20 hover:bg-indigo-700 transition-all flex items-center justify-center min-w-[54px] cursor-pointer"
                    >
                      <FormattedText content={item.val} />
                    </motion.button>
                  ))
                )}
              </div>

              {/* Available Blocks Pool */}
              <div className="w-full bg-white rounded-2xl border border-zinc-200/80 p-5 md:p-6 shadow-xs">
                <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-4 text-center">
                  Mavjud Bloklar
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2.5 md:gap-3 min-h-[70px]">
                  {availableBlocks.map(item => (
                    <motion.button
                      key={item.id}
                      layout
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.9, opacity: 0 }}
                      onClick={() => handleSelectBlock(item)}
                      className="px-5 py-3 rounded-xl bg-white text-zinc-900 font-bold text-base md:text-lg border border-zinc-200/80 hover:border-indigo-400 hover:bg-indigo-50/50 transition-all shadow-xs flex items-center justify-center min-w-[54px] cursor-pointer hover:scale-105 active:scale-95"
                    >
                      <FormattedText content={item.val} />
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Check Action Button */}
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setupRound()}
                  className="w-12 h-auto py-3.5 rounded-xl bg-white hover:bg-zinc-50 text-zinc-600 font-bold text-xs uppercase tracking-wider border border-zinc-200/80 transition-colors flex items-center justify-center shadow-xs"
                  title="O'tkazib yuborish"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                <button
                  disabled={selectedBlocks.length === 0}
                  onClick={checkSolution}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm shadow-indigo-600/20 disabled:opacity-50"
                >
                  <Check className="w-5 h-5" /> Tekshirish
                </button>
              </div>
            </motion.div>
          )}

          {/* 3. GAME OVER SCREEN */}
          {gameState === 'gameover' && (
            <motion.div key="gameover"
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="w-full max-w-md flex flex-col items-center font-sans"
            >
              <div className="rounded-3xl border border-zinc-200/80 shadow-xl shadow-zinc-900/5 bg-white p-8 md:p-10 w-full flex flex-col items-center text-center relative overflow-hidden">
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 mb-1">
                  {lives <= 0 ? 'O\'yin Tugadi!' : 'Vaqt Tugadi!'}
                </h2>
                <p className="text-xs text-zinc-500 mb-6">Ajoyib urinish, erishgan natijangiz:</p>
                
                <div className="w-full bg-indigo-50/50 border border-indigo-100 rounded-2xl py-6 mb-6 relative flex flex-col items-center">
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
                    className="flex-1 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider py-3.5 rounded-xl transition-all shadow-sm shadow-indigo-600/20"
                  >
                    Qayta O'ynash
                  </button>
                  <button onClick={() => navigate('/games')}
                    className="flex-1 w-full bg-white text-zinc-800 font-bold text-xs uppercase tracking-wider py-3.5 rounded-xl transition-all border border-zinc-200/80 hover:bg-zinc-50 shadow-xs"
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

export default FormulaChain;
