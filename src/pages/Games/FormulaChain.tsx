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

      {/* Main Body */}
      <main className="flex flex-col items-center justify-center flex-1 w-full max-w-4xl mx-auto p-4 relative z-10">
        <AnimatePresence mode="wait">
          {/* 1. START SCREEN */}
          {gameState === 'start' && (
            <motion.div key="start-screen"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="w-full flex flex-col items-center text-center font-sans"
            >
              <div className="relative mb-8">
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                  className="w-32 h-32 bg-gradient-to-br from-indigo-500 via-purple-500 to-purple-600 rounded-[2rem] shadow-2xl shadow-indigo-500/40 flex items-center justify-center relative overflow-hidden"
                >
                  <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-white/20 rounded-full blur-xl" />
                  <Brain className="w-14 h-14 text-white relative z-10" strokeWidth={1.5} />
                </motion.div>
              </div>

              <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-3 tracking-tight">Formula Zanjiri</h1>
              <p className="text-slate-500 text-[16px] mb-8 max-w-sm leading-relaxed">
                Formulalar va mantiqiy bloklarni to'g'ri ketma-ketlikda sudrab joylashtiring. Mantiqiy fikrlashingiz va bilimingizni namoyish eting!
              </p>

              {leaderboard.length > 0 && (
                <div className="bg-indigo-50/50 backdrop-blur-sm border border-indigo-100 text-indigo-700 font-semibold px-5 py-2.5 rounded-full mb-8 flex items-center gap-2 shadow-sm text-sm">
                  <Trophy className="w-4 h-4 fill-indigo-500 text-indigo-500" /> TOP REKORD: {Math.max(...leaderboard.map(r => r.score))}
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
                    className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4.5 text-[17px] font-medium text-slate-800 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-slate-400 shadow-sm"
                  />
                </div>
                <button
                  onClick={startGame}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-[17px] py-4.5 rounded-2xl hover:opacity-90 active:scale-[0.98] transition-all shadow-xl shadow-indigo-500/20 tracking-wide flex items-center justify-center gap-2"
                >
                  Boshlash <ChevronRight className="w-5 h-5" />
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
              <div className="w-full bg-white border border-slate-200 shadow-[0_2px_10px_rgb(0,0,0,0.02)] rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-center gap-4 relative z-10">
                <div className="flex items-center gap-4 sm:gap-6 w-full sm:w-auto justify-center sm:justify-start">
                  <div className="flex items-center gap-2 text-slate-600 font-semibold text-sm">
                    <Clock className="w-5 h-5 text-slate-400" /> 
                    <span>{timeLeft}s</span>
                  </div>
                  <div className="h-4 w-px bg-slate-200" />
                  <div className="flex items-center gap-1.5">
                    {[...Array(3)].map((_, i) => (
                      <Heart key={i} className={`w-5 h-5 ${i < lives ? 'fill-rose-500 text-rose-500' : 'fill-slate-100 text-slate-100'}`} strokeWidth={2} />
                    ))}
                  </div>
                  <div className="h-4 w-px bg-slate-200" />
                  <div className="flex items-center gap-2 text-slate-600 font-semibold text-sm">
                    <Trophy className="w-5 h-5 text-indigo-500" />
                    <span>{score}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="hidden sm:block text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                    Top Rekord: {leaderboard.length > 0 ? Math.max(...leaderboard.map(r => r.score), score) : score}
                  </div>
                  <AnimatePresence>
                    {combo >= 2 && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                        className="px-3 py-1.5 bg-orange-50 text-orange-600 rounded-full text-xs font-bold border border-orange-100 flex items-center gap-1.5 shadow-sm"
                      >
                        <Flame className="w-4 h-4 fill-orange-500" /> x{combo} Combo
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Task / Formula Hint Box */}
              <div className="w-full bg-white border border-slate-200 p-8 md:p-10 rounded-[2rem] text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-1.5 bg-slate-100">
                  <motion.div
                    className={`h-full ${timeLeft > 15 ? 'bg-indigo-500' : 'bg-rose-500'}`}
                    initial={{ width: '100%' }}
                    animate={{ width: `${(timeLeft / GAME_DURATION) * 100}%` }}
                    transition={{ duration: 1, ease: 'linear' }}
                  />
                </div>
                
                <span className="px-4 py-1.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100 text-[11px] font-bold uppercase tracking-widest mb-5 inline-block mt-2">
                  {currentFormula.category}
                </span>

                <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-3 tracking-tight">
                  {currentFormula.title}
                </h2>
                <p className="text-slate-500 text-[15px] font-medium italic max-w-lg mx-auto">
                  "{currentFormula.hint}"
                </p>
              </div>

              {/* Selected Formula Chain Dropzone */}
              <div className={`w-full min-h-[120px] p-6 rounded-3xl border transition-all flex flex-wrap items-center justify-center gap-3 relative overflow-hidden
                ${feedback === 'correct' ? 'bg-emerald-50/80 border-emerald-200 shadow-lg shadow-emerald-500/10' : feedback === 'wrong' ? 'bg-rose-50/80 border-rose-200 shadow-lg shadow-rose-500/10' : 'bg-slate-50/80 border-slate-200 shadow-inner'}`}>
                {selectedBlocks.length === 0 ? (
                  <span className="text-slate-400 text-[15px] font-medium">
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
                      className="px-6 py-4 rounded-[1.25rem] bg-indigo-600 text-white font-bold text-xl md:text-2xl shadow-lg shadow-indigo-500/30 transition-all hover:-translate-y-1 active:scale-95 flex items-center justify-center min-w-[64px]"
                    >
                      <FormattedText content={item.val} />
                    </motion.button>
                  ))
                )}
              </div>

              {/* Available Blocks Pool */}
              <div className="w-full bg-white border border-slate-100 p-6 rounded-3xl shadow-md">
                <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-5 text-center">
                  Mavjud Bloklar
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4 min-h-[80px]">
                  {availableBlocks.map(item => (
                    <motion.button
                      key={item.id}
                      layout
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.9, opacity: 0 }}
                      onClick={() => handleSelectBlock(item)}
                      className="px-6 py-4 rounded-[1.25rem] bg-white text-slate-700 font-bold text-xl md:text-2xl shadow-sm border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all active:scale-95 flex items-center justify-center min-w-[64px]"
                    >
                      <FormattedText content={item.val} />
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Check Action Button */}
              <div className="flex gap-4 w-full">
                <button
                  onClick={() => setupRound()}
                  className="px-6 py-4 rounded-2xl bg-white hover:bg-slate-50 text-slate-500 font-semibold text-[15px] border border-slate-200 transition-all flex items-center justify-center gap-2 shadow-sm"
                  title="O'tkazib yuborish"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>

                <button
                  disabled={selectedBlocks.length === 0}
                  onClick={checkSolution}
                  className="flex-1 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 disabled:opacity-50 disabled:pointer-events-none text-white font-semibold text-[17px] shadow-xl shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
                >
                  <Check className="w-6 h-6" /> Tekshirish
                </button>
              </div>
            </motion.div>
          )}

          {/* 3. GAME OVER SCREEN */}
          {gameState === 'gameover' && (
            <motion.div key="gameover"
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="w-full max-w-xl flex flex-col items-center font-sans"
            >
              <div className="bg-white rounded-[2rem] p-8 md:p-10 w-full border border-slate-100 shadow-2xl shadow-slate-200/50 flex flex-col items-center text-center mb-6 relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-indigo-50/50 to-transparent pointer-events-none" />
                
                <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2 relative z-10 tracking-tight">
                  {lives <= 0 ? 'O\'yin Tugadi!' : 'Vaqt Tugadi!'}
                </h2>
                <p className="text-[15px] font-medium text-slate-500 mb-8 relative z-10">Ajoyib urinish, natijangiz bilan tanishing</p>
                
                <div className="w-full bg-slate-50/50 rounded-[1.5rem] py-8 mb-8 relative border border-slate-100 flex flex-col items-center">
                  <div className="text-[5rem] md:text-[6rem] font-bold text-indigo-600 leading-none flex items-center justify-center gap-4">
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
                    className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-[16px] py-4 rounded-xl hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-indigo-500/20"
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

export default FormulaChain;
