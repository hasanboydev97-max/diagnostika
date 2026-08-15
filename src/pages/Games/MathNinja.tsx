import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Trophy, Clock, X, Check, Flame, Zap, Heart, Sparkles, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import MeshGradient from '../../components/ui/MeshGradient';
import confetti from 'canvas-confetti';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const GAME_ID  = 'math-ninja';
const GAME_DURATION = 60;

interface GameRecord {
  _id: string;
  playerName: string;
  score: number;
  createdAt: string;
}

interface FloatingScore {
  id: number;
  text: string;
  x: number;
  y: number;
  color: string;
}

const MathNinja = () => {
  const navigate = useNavigate();
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover'>('start');
  const [playerName, setPlayerName] = useState('');
  const [score, setScore]           = useState(0);
  const [timeLeft, setTimeLeft]     = useState(GAME_DURATION);
  const [lives, setLives]           = useState(3);
  const [combo, setCombo]           = useState(0);
  const [leaderboard, setLeaderboard] = useState<GameRecord[]>([]);
  const [feedback, setFeedback]     = useState<'correct' | 'wrong' | null>(null);
  const [clickedOption, setClickedOption] = useState<number | null>(null);
  const [options, setOptions]       = useState<number[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState({ text: '', answer: 0 });
  const [saving, setSaving]         = useState(false);
  const [floatingScores, setFloatingScores] = useState<FloatingScore[]>([]);

  // Refs for values needed inside interval/callbacks without stale closures
  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const scoreRef   = useRef(0);
  const livesRef   = useRef(3);
  const nameRef    = useRef('');

  // Keep refs in sync
  const syncScore = (v: number) => { scoreRef.current = v; setScore(v); };
  const syncLives = (v: number) => { livesRef.current = v; setLives(v); };

  const triggerFloatingText = (text: string, color: string) => {
    const id = Date.now() + Math.random();
    setFloatingScores(prev => [...prev, { id, text, x: Math.random() * 80 - 40, y: -20, color }]);
    setTimeout(() => {
      setFloatingScores(prev => prev.filter(item => item.id !== id));
    }, 1000);
  };

  // ── Leaderboard ────────────────────────────────────────────────────────
  const fetchLeaderboard = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/games/leaderboard/${GAME_ID}`);
      if (res.ok) setLeaderboard(await res.json());
    } catch (_) {}
  }, []);

  useEffect(() => { fetchLeaderboard(); }, [fetchLeaderboard]);

  // ── Save score ─────────────────────────────────────────────────────────
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
      if (res.ok) {
        await fetchLeaderboard();
      }
    } catch (e) {
      console.error('[MathNinja] saveScore network error:', e);
    } finally {
      setSaving(false);
    }
  }, [fetchLeaderboard]);

  // ── Question generator ───────────────────────────────────
  const generateQuestion = useCallback((currentScore: number) => {
    const operators = ['+', '-', '×'];
    const operator  = operators[Math.floor(Math.random() * operators.length)];
    const level     = Math.min(Math.floor(currentScore / 50), 8);
    const maxNum    = 10 + level * 5;

    let a: number, b: number, answer: number;
    let attempts = 0;
    do {
      if (operator === '+') {
        a      = Math.floor(Math.random() * maxNum) + 2;
        b      = Math.floor(Math.random() * maxNum) + 2;
        answer = a + b;
      } else if (operator === '-') {
        a      = Math.floor(Math.random() * maxNum) + 4;
        b      = Math.floor(Math.random() * (a - 2)) + 1;
        answer = a - b;
      } else {
        a      = Math.floor(Math.random() * 10) + 2;
        b      = Math.floor(Math.random() * 10) + 2;
        answer = a * b;
      }
      attempts++;
    } while (answer <= 0 && attempts < 20);

    setCurrentQuestion({ text: `${a} ${operator} ${b}`, answer });

    const OFFSETS = [2, 3, 4, 5, 6, 8, 10, 12, 15];
    const wrongPool = new Set<number>();
    const shuffledOffsets = [...OFFSETS].sort(() => Math.random() - 0.5);

    for (const base of shuffledOffsets) {
      if (wrongPool.size >= 3) break;
      const sign  = wrongPool.size % 2 === 0 ? 1 : -1;
      const wrong = answer + sign * base;
      if (wrong !== answer && wrong >= 1 && !wrongPool.has(wrong)) {
        wrongPool.add(wrong);
      }
    }
    let fallback = answer + 1;
    while (wrongPool.size < 3) {
      if (fallback !== answer) wrongPool.add(fallback);
      fallback++;
    }

    const allOptions = [answer, ...Array.from(wrongPool)]
      .sort(() => Math.random() - 0.5);

    setOptions(allOptions);
  }, []);

  // ── Timer end ──────────────────────────────────────────────────────────
  const endGame = useCallback((finalScore?: number, name?: string) => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    const s = finalScore ?? scoreRef.current;
    const n = name     ?? nameRef.current;
    setGameState('gameover');
    fetchLeaderboard();
    saveScore(s, n);

    if (s > 0) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  }, [fetchLeaderboard, saveScore]);

  // ── Start ──────────────────────────────────────────────────────────────
  const startGame = useCallback(() => {
    if (!playerName.trim()) {
      toast.error('Ismingizni kiriting!');
      return;
    }
    nameRef.current = playerName;
    syncScore(0);
    syncLives(3);
    setCombo(0);
    setTimeLeft(GAME_DURATION);
    setFeedback(null);
    setClickedOption(null);
    setGameState('playing');
    generateQuestion(0);

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          endGame(scoreRef.current, nameRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [playerName, generateQuestion, endGame]);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  // ── Answer click ───────────────────────────────────────────────────────
  const handleOptionClick = (selected: number) => {
    if (feedback !== null) return;
    setClickedOption(selected);

    if (selected === currentQuestion.answer) {
      const newCombo = combo + 1;
      const points   = 10 + (newCombo - 1) * 5;
      const newScore = scoreRef.current + points;
      syncScore(newScore);
      setCombo(newCombo);
      setFeedback('correct');
      triggerFloatingText(`+${points}`, '#10B981');
      setTimeout(() => {
        setFeedback(null);
        setClickedOption(null);
        generateQuestion(newScore);
      }, 350);
    } else {
      const newLives = livesRef.current - 1;
      syncLives(newLives);
      setCombo(0);
      setFeedback('wrong');
      triggerFloatingText('-1 ❤️', '#EF4444');
      setTimeout(() => {
        setFeedback(null);
        setClickedOption(null);
        if (newLives <= 0) {
          endGame(scoreRef.current, nameRef.current);
        } else {
          generateQuestion(scoreRef.current);
        }
      }, 550);
    }
  };

  const timerPct = (timeLeft / GAME_DURATION) * 100;
  const highestRecord = leaderboard.length > 0 ? leaderboard[0].score : 0;

  return (
    <div className="min-h-screen text-[#111111] flex flex-col font-sans selection:bg-indigo-600 selection:text-white relative overflow-hidden bg-[#fafafa]">
      <MeshGradient />
      
      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 z-0 opacity-30 pointer-events-none mix-blend-overlay" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='30' height='30' viewBox='0 0 30 30' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h30v30H0z' fill='none'/%3E%3Cpath d='M30 0H0v1h30V0zM0 30V0h1v30H0z' fill='%23000000' fill-opacity='0.05'/%3E%3C/svg%3E")` }}></div>

      {/* Header HUD */}
      <header className="relative z-20 flex justify-between items-center px-4 md:px-8 py-4 border-b border-white/60 bg-white/70 backdrop-blur-xl shadow-xs">
        <button
          onClick={() => navigate('/games')}
          className="h-10 px-3.5 bg-white border border-neutral-200/80 text-neutral-700 rounded-xl flex items-center gap-2 hover:bg-neutral-100 hover:text-black transition-all shadow-xs font-semibold text-xs uppercase tracking-wider"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Chiqish</span>
        </button>

        <div className="flex items-center gap-3">
          <div className="bg-amber-500/10 border border-amber-500/20 px-3.5 py-1.5 rounded-xl font-bold text-xs uppercase tracking-wider text-amber-900 flex items-center gap-1.5 shadow-2xs">
            <Trophy className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span>{score} BALL</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex flex-col items-center justify-center flex-1 w-full max-w-3xl mx-auto p-4 md:p-6 relative z-10">
        <AnimatePresence mode="wait">
          {/* START */}
          {gameState === 'start' && (
            <motion.div key="start"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.02 }}
              className="w-full max-w-md bg-white/70 backdrop-blur-xl border border-white/60 rounded-3xl p-8 md:p-10 shadow-[0_15px_35px_rgba(0,0,0,0.04)] flex flex-col items-center text-center font-sans relative"
            >
              <div className="w-20 h-20 bg-gradient-to-tr from-indigo-600 to-indigo-800 text-white rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-indigo-600/30">
                <Zap className="w-10 h-10 text-white" strokeWidth={2} />
              </div>

              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-neutral-900 mb-2">Tezkor Hisob Ninja</h1>
              <p className="text-neutral-500 text-xs leading-relaxed mb-6 font-medium">
                60 soniya vaqt. 3 ta imkoniyat. Hisoblash tezligingizni sinab ko'ring va rekord o'rnating!
              </p>

              {highestRecord > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/20 text-amber-900 font-bold px-4 py-2 rounded-xl mb-6 flex items-center gap-2 text-xs uppercase tracking-wider">
                  <Trophy className="w-4 h-4 fill-amber-500 text-amber-500" /> REKORD: {highestRecord} BALL
                </div>
              )}

              <div className="w-full space-y-4">
                <div>
                  <input
                    type="text"
                    value={playerName}
                    onChange={e => setPlayerName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && startGame()}
                    placeholder="Ismingizni kiriting..."
                    autoFocus
                    className="w-full bg-white/80 border border-neutral-200/90 rounded-xl px-4 py-3.5 text-sm font-semibold text-neutral-900 outline-none placeholder:text-neutral-400 focus:bg-white focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all shadow-xs"
                  />
                </div>
                <button
                  onClick={startGame}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/25 active:scale-[0.98] border-b-4 border-indigo-800 active:border-b-0 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" /> O'yinni Boshlash
                </button>
              </div>
            </motion.div>
          )}

          {/* PLAYING */}
          {gameState === 'playing' && (
            <motion.div key="playing"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full flex flex-col items-center justify-between py-2 max-w-2xl"
            >
              {/* Floating scores animation */}
              <div className="relative w-full pointer-events-none">
                {floatingScores.map(item => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 1, y: 0, scale: 0.8 }}
                    animate={{ opacity: 0, y: -50, scale: 1.4 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="absolute font-black text-2xl z-30 pointer-events-none left-1/2 -translate-x-1/2 drop-shadow-md"
                    style={{ color: item.color }}
                  >
                    {item.text}
                  </motion.div>
                ))}
              </div>

              {/* Stats Bar */}
              <div className="w-full mb-6">
                <div className="bg-white/70 backdrop-blur-xl border border-white/60 rounded-2xl p-4 flex justify-between items-center shadow-xs mb-3">
                  <div className="flex gap-4 items-center">
                    <div className="font-extrabold uppercase tracking-wider text-xs text-neutral-800 flex items-center gap-2 bg-neutral-100 px-3 py-1.5 rounded-lg">
                      <Clock className="w-4 h-4 text-indigo-600 animate-spin" style={{ animationDuration: '4s' }} /> {timeLeft}S
                    </div>
                    <div className="flex gap-1.5">
                      {[...Array(3)].map((_, i) => (
                        <motion.div 
                          key={i}
                          animate={i < lives ? { scale: [1, 1.2, 1] } : { scale: 1 }}
                          transition={{ duration: 0.3 }}
                        >
                          <Heart className={`w-5 h-5 transition-all ${i < lives ? 'fill-rose-500 text-rose-500 drop-shadow-xs' : 'fill-neutral-200 text-neutral-300'}`} />
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <AnimatePresence>
                      {combo >= 2 && (
                        <motion.div 
                          initial={{ scale: 0, rotate: -10 }} 
                          animate={{ scale: 1, rotate: 0 }} 
                          exit={{ scale: 0 }}
                          className="font-black uppercase tracking-wider text-[10px] text-amber-700 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-full flex items-center gap-1 shadow-2xs"
                        >
                          <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500 animate-bounce" /> {combo}x COMBO
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Animated Progress Bar */}
                <div className="w-full h-2.5 rounded-full border border-white/80 bg-neutral-200/60 overflow-hidden shadow-inner p-[1px]">
                  <motion.div
                    className={`h-full rounded-full transition-all duration-300 ${
                      timeLeft <= 10 ? 'bg-rose-500' : timeLeft <= 25 ? 'bg-amber-500' : 'bg-indigo-600'
                    }`}
                    initial={{ width: '100%' }}
                    animate={{ width: `${timerPct}%` }}
                    transition={{ duration: 1, ease: 'linear' }}
                  />
                </div>
              </div>

              {/* Question Card */}
              <motion.div
                animate={feedback === 'wrong' ? { x: [-12, 12, -12, 12, 0] } : {}}
                transition={{ duration: 0.3 }}
                className={`w-full bg-white/70 backdrop-blur-xl rounded-3xl p-8 md:p-12 mb-6 flex items-center justify-center border shadow-xs relative overflow-hidden transition-all duration-200 min-h-[200px]
                  ${feedback === 'correct' ? 'border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-500/10' : feedback === 'wrong' ? 'border-rose-500 bg-rose-500/10 shadow-lg shadow-rose-500/10' : 'border-white/60'}`}
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentQuestion.text}
                    initial={{ scale: 0.85, opacity: 0, y: 10 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 1.1, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                    className="font-sans font-black text-5xl md:text-7xl text-neutral-900 z-10 tracking-tight"
                  >
                    {currentQuestion.text}
                  </motion.div>
                </AnimatePresence>

                <AnimatePresence>
                  {feedback === 'correct' && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 1.5, opacity: 0 }} className="absolute text-emerald-500/15">
                      <Check className="w-48 h-48" strokeWidth={3} />
                    </motion.div>
                  )}
                  {feedback === 'wrong' && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 1.5, opacity: 0 }} className="absolute text-rose-500/15">
                      <X className="w-48 h-48" strokeWidth={3} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* 3D Action Choice Tiles */}
              <div className="grid grid-cols-2 gap-4 w-full">
                {options.map((opt, idx) => {
                  const isClicked = clickedOption === opt;
                  const isCorrectAnswer = feedback !== null && opt === currentQuestion.answer;
                  const isWrongAnswer = feedback === 'wrong' && isClicked;

                  return (
                    <button
                      key={idx}
                      disabled={feedback !== null}
                      onClick={() => handleOptionClick(opt)}
                      className={`
                        w-full py-6 md:py-8 rounded-2xl text-3xl md:text-4xl font-extrabold font-sans transition-all duration-150 border-b-4 cursor-pointer relative overflow-hidden select-none active:border-b-0 active:translate-y-1 ${
                          isCorrectAnswer
                            ? 'bg-emerald-500 text-white border-emerald-700 shadow-lg shadow-emerald-500/30'
                            : isWrongAnswer
                            ? 'bg-rose-500 text-white border-rose-700 shadow-lg shadow-rose-500/30'
                            : 'bg-white text-neutral-900 border-neutral-200/90 hover:border-indigo-500 hover:bg-indigo-50/50 shadow-xs'
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
              <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-8 md:p-10 w-full border border-white/60 shadow-[0_15px_35px_rgba(0,0,0,0.04)] flex flex-col items-center text-center mb-6 relative overflow-hidden">
                <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-neutral-900 mb-1">
                  {lives <= 0 ? 'O\'yin Tugadi!' : 'Vaqt Tugadi!'}
                </h2>
                <p className="text-xs text-neutral-500 mb-6 font-medium">Ajoyib o'yin, natijangiz bilan tanishing</p>
                
                <div className="w-full bg-indigo-600/10 rounded-2xl py-6 mb-6 border border-indigo-600/20 flex flex-col items-center relative">
                  {score > highestRecord && score > 0 && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-white px-3.5 py-0.5 rounded-full font-bold uppercase tracking-wider text-[10px] shadow-sm">
                      Yangi Rekord 🏆
                    </div>
                  )}
                  <div className="text-4xl md:text-5xl font-black text-indigo-600 leading-none flex items-center justify-center">
                    {score} <span className="text-xs text-neutral-500 font-bold ml-2 uppercase tracking-wider">ball</span>
                  </div>
                  {saving && (
                    <div className="mt-3 text-xs font-semibold text-neutral-500 flex items-center justify-center gap-2">
                      <div className="w-3.5 h-3.5 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                      Saqlanmoqda...
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full">
                  <button 
                    onClick={startGame}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider py-4 rounded-xl transition-all shadow-lg shadow-indigo-600/25 border-b-4 border-indigo-800 active:border-b-0 active:translate-y-1 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" /> Qayta O'ynash
                  </button>
                  <button 
                    onClick={() => navigate('/games')}
                    className="flex-1 bg-white border border-neutral-200/90 text-neutral-800 font-bold text-xs uppercase tracking-wider py-4 rounded-xl transition-all hover:bg-neutral-100 shadow-xs border-b-4 border-neutral-300 active:border-b-0 active:translate-y-1 cursor-pointer"
                  >
                    Chiqish
                  </button>
                </div>
              </div>

              {/* Leaderboard */}
              <div className="w-full bg-white/70 backdrop-blur-xl rounded-3xl p-6 border border-white/60 shadow-xs">
                <h3 className="font-extrabold text-xs uppercase tracking-wider text-neutral-900 mb-4 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-500 fill-amber-500" />
                  Top Rekordlar
                </h3>
                <div className="space-y-2">
                  {leaderboard.length === 0 && (
                    <p className="text-center font-medium text-xs text-neutral-400 py-4">Hali rekordlar yo'q. Birinchi bo'ling!</p>
                  )}
                  {leaderboard.slice(0, 5).map((record, idx) => {
                    const isMe = record.playerName === playerName.trim().toUpperCase() && record.score === score;
                    return (
                      <div key={record._id} className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-colors ${isMe ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs' : 'bg-white/80 text-neutral-800 border-neutral-200/60'}`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-6 h-6 rounded-lg font-black text-xs flex items-center justify-center ${isMe ? 'bg-white/20 text-white' : 'bg-neutral-200/80 text-neutral-700'}`}>
                            {idx + 1}
                          </div>
                          <span className="font-semibold text-xs">{record.playerName.toLowerCase()}</span>
                        </div>
                        <span className="font-bold text-sm">{record.score} ball</span>
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

export default MathNinja;

