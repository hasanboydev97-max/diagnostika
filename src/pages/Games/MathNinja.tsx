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

const OPTION_COLORS = [
  { bg: 'bg-rose-500', border: 'border-rose-600', text: 'text-white', shadow: 'hover:shadow-rose-500/30' },
  { bg: 'bg-blue-500', border: 'border-blue-600', text: 'text-white', shadow: 'hover:shadow-blue-500/30' },
  { bg: 'bg-amber-500', border: 'border-amber-600', text: 'text-white', shadow: 'hover:shadow-amber-500/30' },
  { bg: 'bg-emerald-500', border: 'border-emerald-600', text: 'text-white', shadow: 'hover:shadow-emerald-500/30' },
];

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
    <div className={`min-h-screen relative font-sans overflow-hidden transition-all duration-300 flex flex-col
      ${gameState === 'playing'
        ? feedback === 'correct' ? 'bg-emerald-50' : feedback === 'wrong' ? 'bg-rose-50' : 'bg-[#F0FDF4]'
        : 'bg-[#F8FAFC]'}`}
    >
      {/* Dot grid */}
      <div className="absolute inset-0 opacity-10 pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #334155 1px, transparent 0)', backgroundSize: '32px 32px' }}
      />

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
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

      {/* ── MAIN ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col items-center justify-center flex-1 w-full max-w-4xl mx-auto p-4 relative z-10">
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
                  className="w-32 h-32 bg-gradient-to-br from-indigo-500 via-purple-500 to-purple-600 rounded-[2rem] shadow-2xl shadow-indigo-500/40 flex items-center justify-center relative overflow-hidden"
                >
                  <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-white/20 rounded-full blur-xl" />
                  <Zap className="w-14 h-14 text-white relative z-10 fill-white" />
                </motion.div>
              </div>

              <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-3 tracking-tight font-sans">Tezkor Hisob</h1>
              <p className="text-slate-500 text-[16px] mb-8 font-sans max-w-sm leading-relaxed">
                1 daqiqa vaqt. 3 ta xato qilish imkoni. Eng zo'r ekaningizni isbotlang!
              </p>

              {highestRecord > 0 && (
                <div className="bg-indigo-50/50 backdrop-blur-sm border border-indigo-100 text-indigo-700 font-semibold px-5 py-2.5 rounded-full mb-8 flex items-center gap-2 shadow-sm text-sm">
                  <Trophy className="w-4 h-4 fill-indigo-500 text-indigo-500" /> TOP REKORD: {highestRecord}
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
                    className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4.5 text-[17px] font-medium text-slate-800 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-slate-400 shadow-sm font-sans"
                  />
                </div>
                <button
                  onClick={startGame}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-[17px] py-4.5 rounded-2xl hover:opacity-90 active:scale-[0.98] transition-all shadow-xl shadow-indigo-500/20 font-sans tracking-wide"
                >
                  Boshlash
                </button>
              </div>
            </motion.div>
          )}

          {/* PLAYING */}
          {gameState === 'playing' && (
            <motion.div key="playing"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full flex flex-col items-center justify-between py-2"
            >
              {/* Stats */}
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
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                          className="text-orange-500 font-black text-lg flex items-center gap-1"
                        >
                          <Flame className="w-5 h-5 fill-orange-500" /> {combo}x COMBO
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
                <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full ${timeLeft > 15 ? 'bg-[#10B981]' : 'bg-[#EF4444]'}`}
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
                className={`w-full max-w-3xl bg-white rounded-3xl p-8 md:p-12 mb-6 flex items-center justify-center border shadow-xl shadow-slate-200/40 relative overflow-hidden transition-colors min-h-[160px]
                  ${feedback === 'correct' ? 'border-indigo-200 bg-indigo-50/50' : feedback === 'wrong' ? 'border-rose-200 bg-rose-50/50' : 'border-slate-100'}`}
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentQuestion.text}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 1.2, opacity: 0 }}
                    transition={{ type: 'spring', damping: 20 }}
                    className={`text-5xl md:text-7xl font-bold tracking-tight z-10 font-sans
                      ${feedback === 'correct' ? 'text-indigo-600' : feedback === 'wrong' ? 'text-rose-600' : 'text-slate-900'}`}
                  >
                    {currentQuestion.text}
                  </motion.div>
                </AnimatePresence>
                <AnimatePresence>
                  {feedback === 'correct' && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 2, opacity: 0 }} className="absolute text-indigo-500/10">
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
              <div className="grid grid-cols-2 gap-4 w-full max-w-3xl">
                {options.map((opt, idx) => {
                  const style = OPTION_COLORS[idx % 4];
                  const isClicked = clickedOption === opt;
                  return (
                    <button
                      key={idx}
                      disabled={feedback !== null}
                      onClick={() => handleOptionClick(opt)}
                      className={`
                        w-full py-6 md:py-8 rounded-[20px] text-3xl md:text-4xl font-bold font-sans transition-all transform border border-white/20
                        ${style.bg} ${style.text}
                        ${feedback === null ? `hover:-translate-y-1 hover:shadow-xl ${style.shadow}` : ''}
                        ${isClicked ? 'scale-95 brightness-90 shadow-none' : 'shadow-md'}
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
              className="w-full max-w-xl flex flex-col items-center font-sans"
            >
              <div className="bg-white rounded-[2rem] p-8 md:p-10 w-full border border-slate-100 shadow-2xl shadow-slate-200/50 flex flex-col items-center text-center mb-6 relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-indigo-50/50 to-transparent pointer-events-none" />
                
                <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2 relative z-10 tracking-tight">
                  {lives <= 0 ? 'O\'yin Tugadi!' : 'Vaqt Tugadi!'}
                </h2>
                <p className="text-[15px] font-medium text-slate-500 mb-8 relative z-10">Ajoyib o'yin, natijangiz bilan tanishing</p>
                
                <div className="w-full bg-slate-50/50 rounded-[1.5rem] py-8 mb-8 relative border border-slate-100">
                  {score > highestRecord && score > 0 && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-4 py-1.5 rounded-full text-[11px] font-bold tracking-wider uppercase shadow-md shadow-indigo-500/20">
                      Yangi Rekord
                    </div>
                  )}
                  <div className="text-[5rem] md:text-[6rem] font-bold text-indigo-600 leading-none flex items-center justify-center gap-4">
                    {score}
                  </div>
                  {saving && (
                    <div className="mt-4 text-xs font-medium text-slate-400 flex items-center justify-center gap-2">
                      <div className="w-3.5 h-3.5 border-2 border-slate-200 border-t-indigo-500 rounded-full animate-spin" />
                      Saqlanmoqda...
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

              {/* Leaderboard */}
              <div className="w-full bg-white rounded-[2rem] p-6 border border-slate-100 shadow-xl shadow-slate-200/40">
                <h3 className="font-bold text-[17px] text-slate-900 mb-5 flex items-center gap-2 font-sans">
                  <Trophy className="w-5 h-5 text-amber-500 fill-amber-500" />
                  Top Rekordlar
                </h3>
                <div className="space-y-2">
                  {leaderboard.length === 0 && (
                    <p className="text-center text-slate-400 py-6 text-[15px]">Hali rekordlar yo'q. Birinchi bo'ling!</p>
                  )}
                  {leaderboard.slice(0, 5).map((record, idx) => {
                    const isMe = record.playerName === playerName.trim().toUpperCase() && record.score === score;
                    return (
                      <div key={record._id} className={`flex items-center justify-between px-5 py-3.5 rounded-2xl transition-colors ${isMe ? 'bg-indigo-50/50 border border-indigo-100' : 'hover:bg-slate-50 border border-transparent'}`}>
                        <div className="flex items-center gap-4">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[13px]
                            ${idx === 0 ? 'bg-amber-100 text-amber-600' : idx === 1 ? 'bg-slate-100 text-slate-600' : idx === 2 ? 'bg-orange-100 text-orange-600' : 'bg-slate-50 text-slate-400'}`}>
                            {idx + 1}
                          </div>
                          <span className={`font-semibold text-[15px] capitalize tracking-tight ${isMe ? 'text-indigo-700' : 'text-slate-700'}`}>{record.playerName.toLowerCase()}</span>
                        </div>
                        <span className={`font-bold text-[17px] ${isMe ? 'text-indigo-600' : 'text-slate-900'}`}>{record.score}</span>
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
