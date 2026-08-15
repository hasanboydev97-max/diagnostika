import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Trophy, Clock, X, Check, Flame, Zap, Heart } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const GAME_ID  = 'math-ninja';
const GAME_DURATION = 60;

interface GameRecord {
  _id: string;
  playerName: string;
  score: number;
  createdAt: string;
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

  // Refs for values needed inside interval/callbacks without stale closures
  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const scoreRef   = useRef(0);
  const livesRef   = useRef(3);
  const nameRef    = useRef('');

  // Keep refs in sync
  const syncScore = (v: number) => { scoreRef.current = v; setScore(v); };
  const syncLives = (v: number) => { livesRef.current = v; setLives(v); };

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
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error('[MathNinja] saveScore failed:', err);
        toast.error('Natija saqlanmadi. Internet aloqasini tekshiring.', { duration: 4000 });
      } else {
        await fetchLeaderboard();
      }
    } catch (e) {
      console.error('[MathNinja] saveScore network error:', e);
      toast.error('Server bilan aloqa yo\'q. Natija saqlanmadi.', { duration: 4000 });
    } finally {
      setSaving(false);
    }
  }, [fetchLeaderboard]);

  // ── Question generator (bulletproof) ───────────────────────────────────
  // Rules:
  //   • No trivial operands (b ≠ 0, b ≠ 1 for multiplication)
  //   • Subtraction: always a > b > 0, result ≥ 1
  //   • All 4 options are POSITIVE, UNIQUE, and distinct enough (≥2 apart)
  //   • Options never go below 1 for addition/multiplication
  const generateQuestion = useCallback((currentScore: number) => {
    const operators = ['+', '-', '×'];
    const operator  = operators[Math.floor(Math.random() * operators.length)];
    const level     = Math.min(Math.floor(currentScore / 50), 8);
    const maxNum    = 10 + level * 5; // 10 … 50

    let a: number, b: number, answer: number;

    // Generate operands until a non-trivial question is formed
    let attempts = 0;
    do {
      if (operator === '+') {
        a      = Math.floor(Math.random() * maxNum) + 2;           // 2..maxNum+1
        b      = Math.floor(Math.random() * maxNum) + 2;
        answer = a + b;
      } else if (operator === '-') {
        // Ensure b ≥ 1 and answer ≥ 1
        a      = Math.floor(Math.random() * maxNum) + 4;           // 4..maxNum+3
        b      = Math.floor(Math.random() * (a - 2)) + 1;         // 1..a-2 → answer ≥ 2
        answer = a - b;
      } else {
        // Multiplication: avoid 1× and ×1 trivials
        a      = Math.floor(Math.random() * 11) + 2;              // 2..12
        b      = Math.floor(Math.random() * 11) + 2;
        answer = a * b;
      }
      attempts++;
    } while (answer <= 0 && attempts < 20);

    setCurrentQuestion({ text: `${a} ${operator} ${b}`, answer });

    // Build 3 unique wrong answers:
    //   • Spread: use ±[2,3,5,7,10,15,20] range so they look plausible but not equal
    //   • Always positive (≥ 1)
    //   • Never equal to the correct answer
    const OFFSETS = [2, 3, 5, 7, 10, 15, 20, 25, 30];
    const wrongPool = new Set<number>();
    const shuffledOffsets = [...OFFSETS].sort(() => Math.random() - 0.5);

    for (const base of shuffledOffsets) {
      if (wrongPool.size >= 3) break;
      // Alternate sign based on index to spread evenly around the answer
      const sign  = wrongPool.size % 2 === 0 ? 1 : -1;
      const wrong = answer + sign * base;
      if (wrong !== answer && wrong >= 1 && !wrongPool.has(wrong)) {
        wrongPool.add(wrong);
      }
    }
    // Fallback: if still not 3 unique wrongs, fill with sequential positives
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
  }, [fetchLeaderboard, saveScore]);

  // ── Start ──────────────────────────────────────────────────────────────
  const startGame = useCallback(() => {
    if (!playerName.trim()) {
      toast.error('Ismingizni kiriting!', {
        style: { background: '#FF4B4B', color: '#fff', border: 'none', borderRadius: '16px', padding: '16px', fontWeight: 'bold' },
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
    setGameState('playing');
    generateQuestion(0);

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Use refs — no stale closure
          endGame(scoreRef.current, nameRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [playerName, generateQuestion, endGame]);

  // Cleanup on unmount
  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  // ── Answer click ───────────────────────────────────────────────────────
  const handleOptionClick = (selected: number) => {
    if (feedback !== null) return;
    setClickedOption(selected);

    if (selected === currentQuestion.answer) {
      const newCombo = combo + 1;
      const points   = 10 + (newCombo - 1) * 2;
      const newScore = scoreRef.current + points;
      syncScore(newScore);
      setCombo(newCombo);
      setFeedback('correct');
      setTimeout(() => {
        setFeedback(null);
        setClickedOption(null);
        generateQuestion(newScore);
      }, 300);
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
          generateQuestion(scoreRef.current);
        }
      }, 500);
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
                <Zap className="w-10 h-10 text-white" strokeWidth={1.75} />
              </div>

              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 mb-2">Tezkor Hisob</h1>
              <p className="text-zinc-500 text-xs leading-relaxed mb-6">
                1 daqiqa vaqt. 3 ta xato qilish imkoni. Matematik chaqqonligingizni namoyish eting!
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

          {/* PLAYING */}
          {gameState === 'playing' && (
            <motion.div key="playing"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full flex flex-col items-center justify-between py-2 max-w-3xl"
            >
              {/* Stats */}
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
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                          className="font-bold uppercase tracking-wider text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full flex items-center gap-1"
                        >
                          <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500" /> {combo}x Combo
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
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
                className={`w-full bg-white rounded-3xl p-8 md:p-12 mb-6 flex items-center justify-center border border-zinc-200/80 shadow-xs relative overflow-hidden transition-colors min-h-[180px]
                  ${feedback === 'correct' ? 'bg-emerald-50/60 border-emerald-300' : feedback === 'wrong' ? 'bg-rose-50/60 border-rose-300' : 'bg-white'}`}
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentQuestion.text}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 1.1, opacity: 0 }}
                    transition={{ type: 'spring', damping: 20 }}
                    className="font-sans font-extrabold text-4xl md:text-6xl text-zinc-900 z-10 tracking-tight"
                  >
                    {currentQuestion.text}
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
                {options.map((opt, idx) => {
                  const isClicked = clickedOption === opt;
                  return (
                    <button
                      key={idx}
                      disabled={feedback !== null}
                      onClick={() => handleOptionClick(opt)}
                      className={`
                        w-full py-5 md:py-7 rounded-2xl text-2xl md:text-3xl font-extrabold font-sans transition-all border shadow-xs cursor-pointer ${
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
              <div className="bg-white rounded-3xl p-8 md:p-10 w-full border border-zinc-200/80 shadow-xl shadow-zinc-900/5 flex flex-col items-center text-center mb-6 relative overflow-hidden">
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 mb-1">
                  {lives <= 0 ? 'O\'yin Tugadi!' : 'Vaqt Tugadi!'}
                </h2>
                <p className="text-xs text-zinc-500 mb-6">Ajoyib o'yin, natijangiz bilan tanishing</p>
                
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
              <div className="w-full bg-white rounded-3xl p-6 border border-zinc-200/80 shadow-xs">
                <h3 className="font-bold text-sm text-zinc-900 mb-4 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-500 fill-amber-500" />
                  Top Rekordlar
                </h3>
                <div className="space-y-2">
                  {leaderboard.length === 0 && (
                    <p className="text-center font-semibold text-xs text-zinc-400 py-4">Hali rekordlar yo'q. Birinchi bo'ling!</p>
                  )}
                  {leaderboard.slice(0, 5).map((record, idx) => {
                    const isMe = record.playerName === playerName.trim().toUpperCase() && record.score === score;
                    return (
                      <div key={record._id} className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-colors ${isMe ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs' : 'bg-zinc-50/50 text-zinc-800 border-zinc-200/60'}`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-6 h-6 rounded-lg font-bold text-xs flex items-center justify-center ${isMe ? 'bg-white/20 text-white' : 'bg-zinc-200/80 text-zinc-700'}`}>
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
