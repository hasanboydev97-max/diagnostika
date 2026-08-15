import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Trophy, Clock, X, Check, Flame, Heart, RefreshCw, Star, Lock, Play, Volume2, VolumeX } from 'lucide-react';
import { toast } from 'sonner';
import MeshGradient from '../../components/ui/MeshGradient';
import confetti from 'canvas-confetti';
import { gameSound } from '../../utils/gameSound';

interface GameStage {
  level: number;
  name: string;
  targetQuestions: number;
  durationSeconds: number;
  maxOperand: number;
  operators: string[];
}

const STAGES_CONFIG: GameStage[] = [
  { level: 1, name: "1-Bosqich: Boshlang'ich Ninja", targetQuestions: 5, durationSeconds: 45, maxOperand: 10, operators: ['+'] },
  { level: 2, name: "2-Bosqich: Ayirish Ustasi", targetQuestions: 7, durationSeconds: 45, maxOperand: 20, operators: ['+', '-'] },
  { level: 3, name: "3-Bosqich: Ko'paytirish Olami", targetQuestions: 8, durationSeconds: 50, maxOperand: 10, operators: ['+', '-', '×'] },
  { level: 4, name: "4-Bosqich: Chaqqon Hisob", targetQuestions: 10, durationSeconds: 60, maxOperand: 30, operators: ['+', '-', '×'] },
  { level: 5, name: "5-Bosqich: NINJA MASTER 🥷", targetQuestions: 12, durationSeconds: 60, maxOperand: 50, operators: ['+', '-', '×'] }
];

interface FloatingScore {
  id: number;
  text: string;
  color: string;
}

export const MathNinja = () => {
  const navigate = useNavigate();
  const [gameState, setGameState] = useState<'stage_select' | 'playing' | 'stage_victory' | 'gameover'>('stage_select');
  const [playerName, setPlayerName] = useState('');
  const [currentStageLevel, setCurrentStageLevel] = useState<number>(1);
  const [unlockedStageLevel, setUnlockedStageLevel] = useState<number>(1);
  const [stageStars, setStageStars] = useState<Record<number, number>>({});
  
  const [score, setScore]           = useState(0);
  const [questionCount, setQuestionCount] = useState(0);
  const [timeLeft, setTimeLeft]     = useState(45);
  const [lives, setLives]           = useState(3);
  const [combo, setCombo]           = useState(0);
  const [feedback, setFeedback]     = useState<'correct' | 'wrong' | null>(null);
  const [clickedOption, setClickedOption] = useState<number | null>(null);
  const [options, setOptions]       = useState<number[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState({ text: '', answer: 0 });
  const [floatingScores, setFloatingScores] = useState<FloatingScore[]>([]);
  const [mascotQuote, setMascotQuote] = useState("Tayyormisan? Qani ketdik! 🥷");
  const [isMuted, setIsMuted] = useState(gameSound.getMuted());

  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const scoreRef   = useRef(0);
  const livesRef   = useRef(3);

  // Load unlocked stage progress
  useEffect(() => {
    try {
      const saved = localStorage.getItem('hb_math_ninja_stages');
      if (saved) {
        const parsed = JSON.parse(saved);
        setUnlockedStageLevel(parsed.unlockedStageLevel || 1);
        setStageStars(parsed.stageStars || {});
      }
    } catch (_) {}
  }, []);

  const syncScore = (v: number) => { scoreRef.current = v; setScore(v); };
  const syncLives = (v: number) => { livesRef.current = v; setLives(v); };

  const toggleSound = () => {
    const muted = gameSound.toggleMute();
    setIsMuted(muted);
  };

  const triggerFloatingText = (text: string, color: string) => {
    const id = Date.now() + Math.random();
    setFloatingScores(prev => [...prev, { id, text, color }]);
    setTimeout(() => {
      setFloatingScores(prev => prev.filter(item => item.id !== id));
    }, 900);
  };

  // Question generator based on Stage Level
  const generateQuestion = useCallback((stageLevel: number) => {
    const config = STAGES_CONFIG.find(s => s.level === stageLevel) || STAGES_CONFIG[0];
    const operator = config.operators[Math.floor(Math.random() * config.operators.length)];
    const maxNum = config.maxOperand;

    let a: number, b: number, answer: number;
    let attempts = 0;
    do {
      if (operator === '+') {
        a = Math.floor(Math.random() * maxNum) + 2;
        b = Math.floor(Math.random() * maxNum) + 2;
        answer = a + b;
      } else if (operator === '-') {
        a = Math.floor(Math.random() * maxNum) + 4;
        b = Math.floor(Math.random() * (a - 2)) + 1;
        answer = a - b;
      } else {
        a = Math.floor(Math.random() * 9) + 2;
        b = Math.floor(Math.random() * 9) + 2;
        answer = a * b;
      }
      attempts++;
    } while (answer <= 0 && attempts < 20);

    setCurrentQuestion({ text: `${a} ${operator} ${b}`, answer });

    const OFFSETS = [2, 3, 4, 5, 7, 8, 10, 12];
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

    const allOptions = [answer, ...Array.from(wrongPool)].sort(() => Math.random() - 0.5);
    setOptions(allOptions);
  }, []);

  const completeStageVictory = useCallback((stageLvl: number, finalScore: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    syncScore(finalScore);
    
    // Calculate stars: 3 stars if 0 lives lost, 2 stars if 1 lost, 1 star if 2 lost
    const earnedStars = Math.max(1, livesRef.current);
    const nextUnlocked = Math.max(unlockedStageLevel, Math.min(5, stageLvl + 1));
    
    const newStageStars = { ...stageStars, [stageLvl]: Math.max(stageStars[stageLvl] || 0, earnedStars) };
    setUnlockedStageLevel(nextUnlocked);
    setStageStars(newStageStars);

    try {
      localStorage.setItem('hb_math_ninja_stages', JSON.stringify({
        unlockedStageLevel: nextUnlocked,
        stageStars: newStageStars
      }));
    } catch (_) {}

    gameSound.playVictory();
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 } });
    setGameState('stage_victory');
  }, [unlockedStageLevel, stageStars]);

  const endGameover = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    gameSound.playWrong();
    setGameState('gameover');
  }, []);

  const startStage = useCallback((stageLvl: number) => {
    if (!playerName.trim()) {
      toast.error('Ismingizni kiriting!');
      return;
    }
    const config = STAGES_CONFIG.find(s => s.level === stageLvl) || STAGES_CONFIG[0];
    
    setCurrentStageLevel(stageLvl);
    syncScore(0);
    syncLives(3);
    setQuestionCount(0);
    setCombo(0);
    setTimeLeft(config.durationSeconds);
    setFeedback(null);
    setClickedOption(null);
    setMascotQuote("Qani harakat qil! Tezroq hisobla! ⚡");
    setGameState('playing');
    generateQuestion(stageLvl);

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 10 && prev > 1) {
          gameSound.playTick();
        }
        if (prev <= 1) {
          endGameover();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [playerName, generateQuestion, endGameover]);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const handleOptionClick = (selected: number) => {
    if (feedback !== null) return;
    setClickedOption(selected);
    const config = STAGES_CONFIG.find(s => s.level === currentStageLevel) || STAGES_CONFIG[0];

    if (selected === currentQuestion.answer) {
      gameSound.playCorrect();
      const newCombo = combo + 1;
      const points   = 10 + (newCombo - 1) * 5;
      const newScore = scoreRef.current + points;
      const newCount = questionCount + 1;
      
      syncScore(newScore);
      setQuestionCount(newCount);
      setCombo(newCombo);
      setFeedback('correct');
      triggerFloatingText(`+${points}`, '#10B981');
      setMascotQuote(newCombo >= 3 ? "DAHSHAT! SUPER COMBO! 🔥" : "Barakalla! Davom et! ✨");

      setTimeout(() => {
        setFeedback(null);
        setClickedOption(null);
        if (newCount >= config.targetQuestions) {
          completeStageVictory(currentStageLevel, newScore);
        } else {
          generateQuestion(currentStageLevel);
        }
      }, 350);
    } else {
      gameSound.playWrong();
      const newLives = livesRef.current - 1;
      syncLives(newLives);
      setCombo(0);
      setFeedback('wrong');
      triggerFloatingText('-1 ❤️', '#EF4444');
      setMascotQuote("Ehtiyot bo'l! Xato qilding 😅");

      setTimeout(() => {
        setFeedback(null);
        setClickedOption(null);
        if (newLives <= 0) {
          endGameover();
        } else {
          generateQuestion(currentStageLevel);
        }
      }, 550);
    }
  };

  const currentConfig = STAGES_CONFIG.find(s => s.level === currentStageLevel) || STAGES_CONFIG[0];
  const timerPct = (timeLeft / currentConfig.durationSeconds) * 100;

  // Vibrant Tile Colors for 3D Arcade Buttons
  const optionColors = [
    { bg: 'bg-[#8B5CF6]', border: 'border-[#6D28D9]', text: 'text-white' }, // Purple
    { bg: 'bg-[#06B6D4]', border: 'border-[#0891B2]', text: 'text-white' }, // Cyan
    { bg: 'bg-[#F59E0B]', border: 'border-[#D97706]', text: 'text-white' }, // Amber
    { bg: 'bg-[#10B981]', border: 'border-[#059669]', text: 'text-white' }, // Emerald
  ];

  return (
    <div className="min-h-screen text-slate-900 flex flex-col font-sans selection:bg-indigo-600 selection:text-white relative overflow-hidden bg-[#0F172A]">
      <MeshGradient />
      
      {/* Dynamic Header */}
      <header className="relative z-20 flex justify-between items-center px-4 md:px-8 py-4 border-b border-white/10 bg-slate-900/80 backdrop-blur-xl shadow-lg">
        <button
          onClick={() => navigate('/games')}
          className="h-11 px-4 bg-white/10 border border-white/20 text-white rounded-2xl flex items-center gap-2 hover:bg-white/20 transition-all font-bold text-xs uppercase tracking-wider"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>PORTAL</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleSound}
            className="w-11 h-11 bg-white/10 border border-white/20 text-white rounded-2xl flex items-center justify-center hover:bg-white/20 transition-all"
            title="Ovozni yoqish/o'chirish"
          >
            {isMuted ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5 text-emerald-400" />}
          </button>
          {gameState === 'playing' && (
            <div className="bg-amber-400 text-slate-950 px-4 py-2 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-amber-400/20 border-2 border-white">
              <Trophy className="w-4 h-4 fill-slate-950" />
              <span>{score} BALL</span>
            </div>
          )}
        </div>
      </header>

      {/* Main Game Container */}
      <div className="flex flex-col items-center justify-center flex-1 w-full max-w-4xl mx-auto p-4 md:p-6 relative z-10">
        <AnimatePresence mode="wait">
          {/* 1. STAGE SELECTION MAP MODAL */}
          {gameState === 'stage_select' && (
            <motion.div key="stage_select"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="w-full max-w-2xl bg-slate-900/90 backdrop-blur-2xl border-2 border-indigo-500/40 rounded-3xl p-6 md:p-10 shadow-2xl text-white font-sans relative overflow-hidden"
            >
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-gradient-to-tr from-amber-400 to-yellow-500 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-amber-500/30 text-4xl border-2 border-white">
                  🥷
                </div>
                <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white mb-2">Math Ninja Bosqichlari</h1>
                <p className="text-xs text-indigo-200 font-medium">Barcha bosqichlarni 3 yulduz bilan zabt eting!</p>
              </div>

              {/* Name Input */}
              <div className="mb-8 max-w-md mx-auto">
                <label className="block text-xs font-bold uppercase tracking-wider text-amber-300 mb-2">O'quvchi Ismi:</label>
                <input
                  type="text"
                  value={playerName}
                  onChange={e => setPlayerName(e.target.value)}
                  placeholder="Ismingizni kiriting..."
                  className="w-full bg-slate-800/80 border-2 border-indigo-400/50 rounded-2xl px-5 py-4 text-sm font-bold text-white outline-none placeholder:text-slate-400 focus:border-amber-400 focus:ring-4 focus:ring-amber-400/20 transition-all"
                />
              </div>

              {/* Stages List */}
              <div className="space-y-4 mb-6">
                {STAGES_CONFIG.map((stage) => {
                  const isUnlocked = stage.level <= unlockedStageLevel;
                  const stars = stageStars[stage.level] || 0;

                  return (
                    <div
                      key={stage.level}
                      className={`p-5 rounded-2xl border-2 transition-all flex items-center justify-between gap-4 ${
                        isUnlocked
                          ? 'bg-indigo-950/60 border-indigo-400/60 hover:border-amber-400 shadow-lg'
                          : 'bg-slate-900/40 border-slate-800 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg ${
                          isUnlocked ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/30' : 'bg-slate-800 text-slate-500'
                        }`}>
                          {isUnlocked ? stage.level : <Lock className="w-5 h-5" />}
                        </div>
                        <div>
                          <h3 className="font-extrabold text-sm text-white">{stage.name}</h3>
                          <p className="text-xs text-indigo-200 mt-0.5">{stage.targetQuestions} ta misol • {stage.durationSeconds}s vaqt</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Stars */}
                        {isUnlocked && (
                          <div className="flex gap-1 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-white/10">
                            {[1, 2, 3].map(starIdx => (
                              <Star
                                key={starIdx}
                                className={`w-4 h-4 ${starIdx <= stars ? 'text-amber-400 fill-amber-400' : 'text-slate-700 fill-slate-700'}`}
                              />
                            ))}
                          </div>
                        )}

                        <button
                          disabled={!isUnlocked}
                          onClick={() => startStage(stage.level)}
                          className={`px-5 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 border-b-4 ${
                            isUnlocked
                              ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 border-emerald-700 active:border-b-0 active:translate-y-1 cursor-pointer shadow-lg shadow-emerald-500/20'
                              : 'bg-slate-800 text-slate-600 border-slate-900 cursor-not-allowed'
                          }`}
                        >
                          <Play className="w-4 h-4 fill-slate-950" /> O'ynash
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* 2. PLAYING ARENA (KIDS CARTOON / ARCADE UI) */}
          {gameState === 'playing' && (
            <motion.div key="playing"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full flex flex-col items-center justify-between max-w-2xl"
            >
              {/* Animated Mascot Corner */}
              <div className="w-full flex items-center gap-3 mb-4 bg-slate-900/80 backdrop-blur-xl border border-white/15 p-3 rounded-2xl shadow-lg">
                <motion.div 
                  animate={{ y: [0, -5, 0] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="w-12 h-12 bg-gradient-to-tr from-amber-400 to-yellow-500 rounded-2xl flex items-center justify-center text-2xl shadow-md border border-white"
                >
                  🥷
                </motion.div>
                <div className="bg-indigo-600/30 border border-indigo-400/40 px-4 py-2 rounded-xl text-xs font-bold text-amber-300">
                  {mascotQuote}
                </div>
              </div>

              {/* Stats Bar */}
              <div className="w-full mb-4">
                <div className="bg-slate-900/90 backdrop-blur-xl border-2 border-indigo-500/40 rounded-2xl p-4 flex justify-between items-center shadow-xl mb-3">
                  <div className="flex gap-4 items-center">
                    <div className="font-black uppercase tracking-wider text-xs text-amber-300 flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-xl border border-white/10">
                      <Clock className="w-4 h-4 text-indigo-400 animate-spin" style={{ animationDuration: '4s' }} /> {timeLeft}S
                    </div>
                    <div className="flex gap-1.5">
                      {[...Array(3)].map((_, i) => (
                        <Heart key={i} className={`w-5 h-5 transition-all ${i < lives ? 'fill-rose-500 text-rose-500 drop-shadow-md' : 'fill-slate-700 text-slate-800'}`} />
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black text-indigo-200 uppercase tracking-wider bg-indigo-950 px-3 py-1 rounded-xl border border-indigo-800">
                      {questionCount} / {currentConfig.targetQuestions} MISOL
                    </span>
                    {combo >= 2 && (
                      <span className="font-black text-xs text-amber-900 bg-amber-400 border border-amber-300 px-3 py-1 rounded-full flex items-center gap-1 shadow-md">
                        <Flame className="w-4 h-4 fill-amber-900" /> {combo}x COMBO
                      </span>
                    )}
                  </div>
                </div>

                {/* Timer Bar */}
                <div className="w-full h-3 rounded-full border-2 border-white/20 bg-slate-950 overflow-hidden shadow-inner p-[1px]">
                  <motion.div
                    className={`h-full rounded-full transition-all duration-300 ${
                      timeLeft <= 10 ? 'bg-rose-500' : timeLeft <= 20 ? 'bg-amber-500' : 'bg-emerald-400'
                    }`}
                    initial={{ width: '100%' }}
                    animate={{ width: `${timerPct}%` }}
                    transition={{ duration: 1, ease: 'linear' }}
                  />
                </div>
              </div>

              {/* Floating score text */}
              <div className="relative w-full pointer-events-none">
                {floatingScores.map(item => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 1, y: 0, scale: 0.8 }}
                    animate={{ opacity: 0, y: -60, scale: 1.5 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="absolute font-black text-3xl z-30 pointer-events-none left-1/2 -translate-x-1/2 drop-shadow-lg"
                    style={{ color: item.color }}
                  >
                    {item.text}
                  </motion.div>
                ))}
              </div>

              {/* Vibrant Question Card */}
              <motion.div
                animate={feedback === 'wrong' ? { x: [-14, 14, -14, 14, 0] } : {}}
                transition={{ duration: 0.3 }}
                className={`w-full bg-slate-900/90 backdrop-blur-2xl rounded-3xl p-8 md:p-12 mb-6 flex items-center justify-center border-4 shadow-2xl relative overflow-hidden transition-all duration-200 min-h-[220px]
                  ${feedback === 'correct' ? 'border-emerald-400 bg-emerald-950/40 shadow-emerald-500/20' : feedback === 'wrong' ? 'border-rose-500 bg-rose-950/40 shadow-rose-500/20' : 'border-amber-400/80'}`}
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentQuestion.text}
                    initial={{ scale: 0.8, opacity: 0, y: 15 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 1.15, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    className="font-sans font-black text-6xl md:text-8xl text-amber-300 z-10 tracking-wider drop-shadow-[0_5px_15px_rgba(245,158,11,0.4)]"
                  >
                    {currentQuestion.text}
                  </motion.div>
                </AnimatePresence>

                <AnimatePresence>
                  {feedback === 'correct' && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 1.5, opacity: 0 }} className="absolute text-emerald-400/20">
                      <Check className="w-56 h-56" strokeWidth={3} />
                    </motion.div>
                  )}
                  {feedback === 'wrong' && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 1.5, opacity: 0 }} className="absolute text-rose-500/20">
                      <X className="w-56 h-56" strokeWidth={3} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* 4 Vibrant 3D Color Option Buttons */}
              <div className="grid grid-cols-2 gap-4 w-full">
                {options.map((opt, idx) => {
                  const colorScheme = optionColors[idx % optionColors.length];
                  const isClicked = clickedOption === opt;
                  const isCorrectAnswer = feedback !== null && opt === currentQuestion.answer;
                  const isWrongAnswer = feedback === 'wrong' && isClicked;

                  return (
                    <button
                      key={idx}
                      disabled={feedback !== null}
                      onClick={() => handleOptionClick(opt)}
                      className={`
                        w-full py-7 md:py-9 rounded-3xl text-3xl md:text-5xl font-black font-sans transition-all duration-150 border-b-8 cursor-pointer relative overflow-hidden select-none active:border-b-0 active:translate-y-2 shadow-2xl ${
                          isCorrectAnswer
                            ? 'bg-emerald-500 text-slate-950 border-emerald-700 shadow-emerald-500/40'
                            : isWrongAnswer
                            ? 'bg-rose-500 text-white border-rose-700 shadow-rose-500/40'
                            : `${colorScheme.bg} ${colorScheme.text} ${colorScheme.border} hover:brightness-110`
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

          {/* 3. STAGE VICTORY MODAL */}
          {gameState === 'stage_victory' && (
            <motion.div key="stage_victory"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-md bg-slate-900/95 backdrop-blur-2xl border-4 border-amber-400 rounded-3xl p-8 shadow-2xl flex flex-col items-center text-center font-sans text-white relative overflow-hidden"
            >
              <div className="w-24 h-24 bg-gradient-to-tr from-amber-400 to-yellow-500 rounded-3xl flex items-center justify-center text-5xl mb-4 shadow-xl shadow-amber-400/30 border-2 border-white">
                🏆
              </div>
              
              <h2 className="text-3xl font-black text-amber-300 mb-1">BOSQICH FATH ETILDI!</h2>
              <p className="text-xs text-indigo-200 mb-6 font-bold">{currentConfig.name} muvaffaqiyatli yakunlandi!</p>

              {/* Stars Earned */}
              <div className="flex gap-2 mb-6 bg-slate-950/80 px-6 py-3 rounded-2xl border border-white/10">
                {[1, 2, 3].map(starIdx => (
                  <Star
                    key={starIdx}
                    className={`w-8 h-8 ${starIdx <= Math.max(1, lives) ? 'text-amber-400 fill-amber-400 animate-bounce' : 'text-slate-700 fill-slate-700'}`}
                    style={{ animationDelay: `${starIdx * 0.15}s` }}
                  />
                ))}
              </div>

              <div className="w-full bg-indigo-950/80 rounded-2xl py-4 mb-6 border border-indigo-400/40">
                <div className="text-3xl font-black text-white">{score} <span className="text-xs text-amber-400">BALL</span></div>
              </div>

              <div className="flex flex-col gap-3 w-full">
                {currentStageLevel < 5 && (
                  <button
                    onClick={() => startStage(currentStageLevel + 1)}
                    className="w-full bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 font-black text-xs uppercase tracking-wider py-4 rounded-2xl shadow-xl shadow-emerald-500/30 border-b-4 border-emerald-700 active:border-b-0 active:translate-y-1 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>KEYINGI BOSQICH ➔</span>
                  </button>
                )}
                <button
                  onClick={() => setGameState('stage_select')}
                  className="w-full bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider py-4 rounded-2xl border border-white/20 cursor-pointer"
                >
                  Bosqichlar Xaritasiga Qaytish
                </button>
              </div>
            </motion.div>
          )}

          {/* 4. GAMEOVER MODAL */}
          {gameState === 'gameover' && (
            <motion.div key="gameover"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-md bg-slate-900/95 backdrop-blur-2xl border-4 border-rose-500 rounded-3xl p-8 shadow-2xl flex flex-col items-center text-center font-sans text-white"
            >
              <div className="w-20 h-20 bg-rose-500/20 border-2 border-rose-500 text-rose-400 rounded-3xl flex items-center justify-center text-4xl mb-4">
                💔
              </div>
              <h2 className="text-2xl font-black text-white mb-1">Vaqt yoki Jon Tugadi!</h2>
              <p className="text-xs text-slate-400 mb-6">Yana bir bor harakat qilib ko'ring!</p>

              <div className="flex flex-col gap-3 w-full">
                <button
                  onClick={() => startStage(currentStageLevel)}
                  className="w-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs uppercase tracking-wider py-4 rounded-2xl shadow-xl shadow-amber-400/20 border-b-4 border-amber-600 active:border-b-0 active:translate-y-1 cursor-pointer flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" /> Qayta Urinish
                </button>
                <button
                  onClick={() => setGameState('stage_select')}
                  className="w-full bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider py-4 rounded-2xl border border-white/20 cursor-pointer"
                >
                  Bosqichlar Xaritasi
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default MathNinja;


