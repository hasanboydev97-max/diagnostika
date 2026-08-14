import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Trophy, Clock, Heart, Flame, Volume2, VolumeX, RotateCcw, Check, Sparkles, Brain } from 'lucide-react';
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
    title: 'Suvning Kimyoviy Formulasi',
    category: 'Kimyo',
    blocks: ['H₂O', '=', '2H', '+', 'O'],
    hint: 'Vodorod va kislorod birikmasi'
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
    title: 'Mantiqiy shart (Dasturlash)',
    category: 'Mantiq',
    blocks: ['if', '(', 'x', '>', '0', ')'],
    hint: 'Agar x musbat bo\'lsa'
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
    <div className="min-h-screen bg-slate-900 text-white font-sans relative overflow-x-hidden selection:bg-indigo-500 selection:text-white">
      {/* Dynamic Ambient Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Header */}
      <header className="relative z-20 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <button
            onClick={() => navigate('/games')}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-semibold text-sm">O'yinlar ro'yxatiga</span>
          </button>

          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Brain className="w-4 h-4" /> Formula Zanjiri
            </div>

            <button
              onClick={toggleSound}
              className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 hover:text-white transition-all active:scale-95"
              title={muted ? 'Ovozni yoqish' : 'Ovozni o\'chirish'}
            >
              {muted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5 text-emerald-400" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="relative z-10 max-w-4xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {/* 1. START SCREEN */}
          {gameState === 'start' && (
            <motion.div
              key="start-screen"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-slate-800/70 border border-slate-700/80 rounded-3xl p-8 md:p-12 shadow-2xl backdrop-blur-xl max-w-xl mx-auto text-center"
            >
              <div className="w-20 h-20 bg-indigo-500/20 border border-indigo-500/30 rounded-3xl flex items-center justify-center mx-auto mb-6 text-indigo-400 shadow-inner">
                <Sparkles className="w-10 h-10 animate-pulse" />
              </div>

              <h1 className="text-3xl md:text-4xl font-extrabold mb-3 tracking-tight">
                Formula Zanjiri
              </h1>
              <p className="text-slate-400 text-sm md:text-base leading-relaxed mb-8">
                Formulalar va mantiqiy bloklarni to'g'ri ketma-ketlikda sudrab joylashtiring. Mantiqiy fikrlashingiz va bilimingizni namoyish eting!
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
                  placeholder="Masalan: Jasur Aliyev"
                  className="w-full bg-slate-900/90 border border-slate-700 rounded-2xl px-5 py-4 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium text-lg"
                />
              </div>

              <button
                onClick={startGame}
                className="w-full py-4 bg-gradient-to-r from-indigo-500 via-indigo-600 to-indigo-700 hover:from-indigo-600 hover:to-indigo-800 text-white font-bold text-lg rounded-2xl shadow-lg shadow-indigo-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                O'yinni Boshlash
              </button>

              {/* Mini Leaderboard preview */}
              {leaderboard.length > 0 && (
                <div className="mt-10 pt-6 border-t border-slate-700/60 text-left">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Trophy className="w-4 h-4 text-amber-400" /> Eng Yuqori Natijalar
                    </span>
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {leaderboard.slice(0, 5).map((rec, idx) => (
                      <div key={rec._id || idx} className="flex items-center justify-between bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-2.5 text-sm">
                        <div className="flex items-center gap-3">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${idx === 0 ? 'bg-amber-400 text-slate-950' : idx === 1 ? 'bg-slate-300 text-slate-950' : idx === 2 ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                            {idx + 1}
                          </span>
                          <span className="font-semibold text-slate-200">{rec.playerName}</span>
                        </div>
                        <span className="font-bold text-indigo-400">{rec.score} ball</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* 2. PLAYING SCREEN */}
          {gameState === 'playing' && (
            <motion.div
              key="playing-screen"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="space-y-6"
            >
              {/* Status Bar */}
              <div className="grid grid-cols-4 gap-3 bg-slate-800/80 border border-slate-700/70 p-4 rounded-2xl backdrop-blur-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[11px] uppercase font-bold text-slate-400">Ball</div>
                    <div className="text-xl font-black text-amber-400">{score}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${timeLeft <= 10 ? 'bg-red-500/20 text-red-400 animate-bounce' : 'bg-indigo-500/10 text-indigo-400'}`}>
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

              {/* Task / Formula Hint Box */}
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/80 p-6 md:p-8 rounded-3xl text-center shadow-xl relative overflow-hidden">
                <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-3 inline-block">
                  {currentFormula.category}
                </span>

                <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
                  {currentFormula.title}
                </h2>
                <p className="text-slate-400 text-sm italic">
                  "{currentFormula.hint}"
                </p>
              </div>

              {/* Selected Formula Chain Dropzone */}
              <div className={`min-h-[100px] p-5 rounded-3xl border-2 transition-all flex flex-wrap items-center justify-center gap-3 ${feedback === 'correct' ? 'bg-emerald-500/10 border-emerald-500 shadow-lg shadow-emerald-500/20' : feedback === 'wrong' ? 'bg-red-500/10 border-red-500 shadow-lg shadow-red-500/20' : 'bg-slate-800/90 border-dashed border-slate-600'}`}>
                {selectedBlocks.length === 0 ? (
                  <span className="text-slate-500 text-sm font-medium">
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
                      className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xl shadow-md border border-indigo-400/30 transition-all active:scale-95 flex items-center justify-center min-w-[56px]"
                    >
                      <FormattedText text={item.val} />
                    </motion.button>
                  ))
                )}
              </div>

              {/* Available Blocks Pool */}
              <div className="bg-slate-800/60 border border-slate-700/60 p-6 rounded-3xl">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 text-center">
                  Mavjud Bloklar:
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3 min-h-[60px]">
                  {availableBlocks.map(item => (
                    <motion.button
                      key={item.id}
                      layout
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.9, opacity: 0 }}
                      onClick={() => handleSelectBlock(item)}
                      className="px-5 py-3 rounded-2xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-xl shadow-sm border border-slate-600 transition-all active:scale-95 flex items-center justify-center min-w-[56px]"
                    >
                      <FormattedText text={item.val} />
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Check Action Button */}
              <div className="flex gap-4">
                <button
                  onClick={() => setupRound()}
                  className="px-6 py-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-base border border-slate-700 transition-all flex items-center justify-center gap-2"
                  title="Tashlab o'tish"
                >
                  <RotateCcw className="w-5 h-5" /> O'tkazib yuborish
                </button>

                <button
                  disabled={selectedBlocks.length === 0}
                  onClick={checkSolution}
                  className="flex-1 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:opacity-40 disabled:pointer-events-none text-white font-bold text-lg shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2"
                >
                  <Check className="w-6 h-6" /> Tekshirish
                </button>
              </div>
            </motion.div>
          )}

          {/* 3. GAME OVER SCREEN */}
          {gameState === 'gameover' && (
            <motion.div
              key="gameover-screen"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-slate-800/90 border border-slate-700 p-8 md:p-12 rounded-3xl shadow-2xl max-w-xl mx-auto text-center backdrop-blur-xl"
            >
              <div className="w-20 h-20 bg-amber-500/20 border border-amber-500/30 rounded-3xl flex items-center justify-center mx-auto mb-6 text-amber-400 shadow-inner">
                <Trophy className="w-10 h-10 animate-bounce" />
              </div>

              <h2 className="text-3xl font-extrabold text-white mb-2">O'yin Yakunlandi!</h2>
              <p className="text-slate-400 text-sm mb-6">Ajoyib harakat, {playerName}!</p>

              <div className="bg-slate-900/80 border border-slate-700 rounded-2xl p-6 mb-8 flex justify-around">
                <div>
                  <div className="text-xs uppercase font-bold text-slate-400 mb-1">Yakuniy Ball</div>
                  <div className="text-4xl font-black text-amber-400">{score}</div>
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
                  className="flex-1 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/25 transition-all"
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

export default FormulaChain;
