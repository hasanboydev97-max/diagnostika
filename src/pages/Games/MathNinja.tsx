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
    <div className="min-h-screen bg-white font-sans flex flex-col relative transition-all duration-300">

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <header className="relative z-20 flex justify-between items-center p-4">
        <button
          onClick={() => navigate('/games')}
          className="w-12 h-12 bg-white border-2 border-black text-black rounded-none flex items-center justify-center hover:bg-zinc-100 transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        {gameState === 'playing' && (
          <div className="bg-white border-2 border-black rounded-none px-5 py-2 font-black text-xl text-black flex items-center gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <Trophy className="w-6 h-6" />
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
                  className="w-24 h-24 bg-black text-white border-2 border-black rounded-none flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                >
                  <Zap className="w-12 h-12 text-white" />
                </motion.div>
              </div>

              <h1 className="font-sans font-black text-3xl md:text-5xl uppercase tracking-tighter text-black mb-3">Tezkor Hisob</h1>
              <p className="text-black font-bold uppercase tracking-widest text-[10px] mb-8 max-w-sm leading-relaxed text-center">
                1 daqiqa vaqt. 3 ta xato qilish imkoni. Eng zo'r ekaningizni isbotlang!
              </p>

              {highestRecord > 0 && (
                <div className="bg-white border-2 border-black text-black font-bold uppercase tracking-widest px-5 py-2.5 rounded-none mb-8 flex items-center gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-[10px]">
                  <Trophy className="w-4 h-4" /> TOP REKORD: {highestRecord}
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
                    className="w-full bg-white border-2 border-black rounded-none px-5 py-4 text-[10px] font-bold uppercase tracking-widest text-black outline-none placeholder:text-zinc-400 focus:bg-zinc-50 transition-colors"
                  />
                </div>
                <button
                  onClick={startGame}
                  className="w-full bg-black text-white font-bold text-[10px] uppercase tracking-[0.2em] py-4 flex items-center justify-center gap-2 hover:bg-zinc-800 transition-colors border-2 border-black rounded-none"
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
                <div className="bg-white border-2 border-black rounded-none p-4 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-2">
                  <div className="flex gap-4 items-center w-full sm:w-auto justify-between sm:justify-start">
                    <div className="font-bold uppercase tracking-widest text-[10px] text-black flex items-center gap-1.5">
                      <Clock className="w-4 h-4" /> {timeLeft}s
                    </div>
                    <div className="flex gap-1">
                      {[...Array(3)].map((_, i) => (
                        <Heart key={i} className={`w-4 h-4 ${i < lives ? 'fill-black text-black' : 'fill-transparent text-zinc-300'}`} />
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                    <div className="font-bold uppercase tracking-widest text-[10px] text-black">
                      Top Rekord: {Math.max(highestRecord, score)}
                    </div>
                    <AnimatePresence>
                      {combo >= 2 && (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                          className="font-bold uppercase tracking-widest text-[10px] text-black flex items-center gap-1 border-2 border-black px-2 py-1"
                        >
                          <Flame className="w-4 h-4" /> {combo}x COMBO
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
                <div className="w-full h-3 border-2 border-black bg-white">
                  <motion.div
                    className="h-full bg-black"
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
                className={`w-full max-w-3xl bg-white rounded-none p-8 md:p-12 mb-6 flex items-center justify-center border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden transition-colors min-h-[160px]
                  ${feedback === 'correct' ? 'bg-zinc-100' : feedback === 'wrong' ? 'bg-zinc-200' : 'bg-white'}`}
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentQuestion.text}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 1.2, opacity: 0 }}
                    transition={{ type: 'spring', damping: 20 }}
                    className="font-sans font-black text-5xl md:text-7xl uppercase text-black z-10"
                  >
                    {currentQuestion.text}
                  </motion.div>
                </AnimatePresence>
                <AnimatePresence>
                  {feedback === 'correct' && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 2, opacity: 0 }} className="absolute text-black/10">
                      <Check className="w-40 h-40" strokeWidth={3} />
                    </motion.div>
                  )}
                  {feedback === 'wrong' && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 2, opacity: 0 }} className="absolute text-black/10">
                      <X className="w-40 h-40" strokeWidth={3} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Answer buttons */}
              <div className="grid grid-cols-2 gap-4 w-full max-w-3xl">
                {options.map((opt, idx) => {
                  const isClicked = clickedOption === opt;
                  return (
                    <button
                      key={idx}
                      disabled={feedback !== null}
                      onClick={() => handleOptionClick(opt)}
                      className={`
                        w-full py-6 md:py-8 rounded-none text-3xl md:text-4xl font-black font-sans transition-colors border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
                        ${isClicked ? 'bg-black text-white translate-y-[4px] translate-x-[4px] shadow-none' : 'bg-white text-black hover:bg-black hover:text-white'}
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
              <div className="bg-white rounded-none p-8 md:p-10 w-full border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center text-center mb-6 relative overflow-hidden">
                <h2 className="font-sans font-black text-3xl md:text-5xl uppercase text-black mb-2 relative z-10">
                  {lives <= 0 ? 'O\'yin Tugadi!' : 'Vaqt Tugadi!'}
                </h2>
                <p className="font-bold uppercase tracking-widest text-[10px] text-zinc-500 mb-8 relative z-10">Ajoyib o'yin, natijangiz bilan tanishing</p>
                
                <div className="w-full bg-white rounded-none py-8 mb-8 relative border-2 border-black">
                  {score > highestRecord && score > 0 && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-black text-white px-4 py-1.5 rounded-none font-bold uppercase tracking-[0.2em] text-[10px] border-2 border-black">
                      Yangi Rekord
                    </div>
                  )}
                  <div className="text-[5rem] md:text-[6rem] font-black text-black leading-none flex items-center justify-center gap-4">
                    {score}
                  </div>
                  {saving && (
                    <div className="mt-4 font-bold uppercase tracking-widest text-[10px] text-zinc-500 flex items-center justify-center gap-2">
                      <div className="w-3.5 h-3.5 border-2 border-zinc-200 border-t-black rounded-none animate-spin" />
                      Saqlanmoqda...
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-4 w-full relative z-10">
                  <button onClick={startGame}
                    className="flex-1 bg-black text-white font-bold text-[10px] uppercase tracking-[0.2em] py-4 flex items-center justify-center gap-2 hover:bg-zinc-800 transition-colors border-2 border-black rounded-none"
                  >
                    Qayta O'ynash
                  </button>
                  <button onClick={() => navigate('/games')}
                    className="flex-1 bg-white text-black font-bold text-[10px] uppercase tracking-[0.2em] py-4 flex items-center justify-center gap-2 hover:bg-zinc-100 transition-colors border-2 border-black rounded-none"
                  >
                    Chiqish
                  </button>
                </div>
              </div>

              {/* Leaderboard */}
              <div className="w-full bg-white rounded-none p-6 border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                <h3 className="font-bold uppercase tracking-widest text-[12px] text-black mb-5 flex items-center gap-2">
                  <Trophy className="w-5 h-5" />
                  Top Rekordlar
                </h3>
                <div className="space-y-2">
                  {leaderboard.length === 0 && (
                    <p className="text-center font-bold uppercase tracking-widest text-[10px] text-zinc-400 py-6">Hali rekordlar yo'q. Birinchi bo'ling!</p>
                  )}
                  {leaderboard.slice(0, 5).map((record, idx) => {
                    const isMe = record.playerName === playerName.trim().toUpperCase() && record.score === score;
                    return (
                      <div key={record._id} className={`flex items-center justify-between px-5 py-3.5 rounded-none border-2 border-black transition-colors ${isMe ? 'bg-black text-white' : 'bg-white text-black hover:bg-zinc-50'}`}>
                        <div className="flex items-center gap-4">
                          <div className={`w-7 h-7 rounded-none border-2 border-current flex items-center justify-center font-bold text-[10px] uppercase`}>
                            {idx + 1}
                          </div>
                          <span className="font-bold uppercase tracking-widest text-[10px]">{record.playerName.toLowerCase()}</span>
                        </div>
                        <span className="font-black text-[14px]">{record.score}</span>
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
