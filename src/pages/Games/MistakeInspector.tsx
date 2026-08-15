import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Trophy, Clock, Heart, Flame, Volume2, VolumeX, Search, ShieldAlert, CheckCircle2, AlertTriangle, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import { gameSound } from '../../utils/gameSound';
import FormattedText from '../../components/FormattedText';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const GAME_ID = 'mistake-inspector';
const GAME_DURATION = 80;

interface InspectorTask {
  id: string;
  title: string;
  category: 'Matematika' | 'Ona Tili' | 'Fizika' | 'Mantiq';
  steps: {
    stepIndex: number; // 0, 1, 2, 3
    text: string;
    isWrong: boolean;
    explanation?: string;
  }[];
  fixOptions: string[]; // 3 options for how to correct the mistake
  correctFixIndex: number;
}

const INSPECTOR_DATABASE: InspectorTask[] = [
  {
    id: 'm1',
    title: 'Tenglamani yechish: 2x + 8 = 20',
    category: 'Matematika',
    steps: [
      { stepIndex: 0, text: 'Bosqich 1: 2x + 8 = 20', isWrong: false },
      { stepIndex: 1, text: 'Bosqich 2: 2x = 20 + 8', isWrong: true, explanation: '8 o\'ng tarafga o\'tayotganda ishorasi minus (-) bo\'lishi kerak edi!' },
      { stepIndex: 2, text: 'Bosqich 3: 2x = 28', isWrong: false },
      { stepIndex: 3, text: 'Bosqich 4: x = 14', isWrong: false }
    ],
    fixOptions: [
      '2x = 20 - 8 (x = 6)',
      '2x = 20 × 8 (x = 80)',
      '2x = 20 / 8 (x = 2.5)'
    ],
    correctFixIndex: 0
  },
  {
    id: 'm2',
    title: 'Imlo va Grammatika Tekshiruvi',
    category: 'Ona Tili',
    steps: [
      { stepIndex: 0, text: 'Qadam 1: Bugun maktabimizda katta tadbir bo\'lib o\'tdi.', isWrong: false },
      { stepIndex: 1, text: 'Qadam 2: Barcha o\'quvchilar xursandchilik bilan qatnashdi.', isWrong: false },
      { stepIndex: 2, text: 'Qadam 3: Muallimimiz bizga intilish va qunt haqida so' + "'" + 'zladi.', isWrong: false },
      { stepIndex: 3, text: 'Qadam 4: Barcha vazifalarni havoiy qilmasdan bajarish lozim.', isWrong: true, explanation: 'Havoiy emas, havoyi yoki mas\'uliyat bilan deb yozilishi kerak.' }
    ],
    fixOptions: [
      'Barcha vazifalarni sidqidildan bajarish lozim.',
      'Barcha vazifalarni havoiylik bilan bajardik.',
      'Barcha vazifalarni mas\'uliyatsiz bajarish lozim.'
    ],
    correctFixIndex: 0
  },
  {
    id: 'm3',
    title: 'Tezlik va Masofa Hisobi',
    category: 'Fizika',
    steps: [
      { stepIndex: 0, text: 'Bosqich 1: Mashina v = 60 km/h tezlik bilan t = 2 soat yurdi.', isWrong: false },
      { stepIndex: 1, text: 'Bosqich 2: S formulasi: S = v / t', isWrong: true, explanation: 'Masofa formulasi S = v · t ko\'paytirish bo\'ladi!' },
      { stepIndex: 2, text: 'Bosqich 3: S = 60 / 2', isWrong: false },
      { stepIndex: 3, text: 'Bosqich 4: S = 30 km', isWrong: false }
    ],
    fixOptions: [
      'S = v · t (S = 60 · 2 = 120 km)',
      'S = v + t (S = 60 + 2 = 62 km)',
      'S = t / v (S = 2 / 60 km)'
    ],
    correctFixIndex: 0
  },
  {
    id: 'm4',
    title: 'Kasrlarni qo\'shish: 1/3 + 1/6',
    category: 'Matematika',
    steps: [
      { stepIndex: 0, text: 'Bosqich 1: 1/3 va 1/6 kasrlarini qo\'shamiz.', isWrong: false },
      { stepIndex: 1, text: 'Bosqich 2: Umumiy maxraj 6 ga keltiramiz: 2/6 + 1/6', isWrong: false },
      { stepIndex: 2, text: 'Bosqich 3: Surat va maxrajni alohida qo\'shamiz: (2+1)/(6+6)', isWrong: true, explanation: 'Maxrajlar qo\'shilmaydi, o\'zgarishsiz qoladi (6)!' },
      { stepIndex: 3, text: 'Bosqich 4: Natija: 3/12 = 1/4', isWrong: false }
    ],
    fixOptions: [
      '(2+1)/6 = 3/6 = 1/2',
      '(2·1)/(6·6) = 2/36',
      '(2-1)/6 = 1/6'
    ],
    correctFixIndex: 0
  },
  {
    id: 'm5',
    title: 'Mantiqiy Ketma-ketlik: 2, 4, 8, 16, ?',
    category: 'Mantiq',
    steps: [
      { stepIndex: 0, text: 'Qadam 1: Ketma-ketlik: 2, 4, 8, 16', isWrong: false },
      { stepIndex: 1, text: 'Qadam 2: Har bir son 2 ga ko\'paytirib borilmoqda.', isWrong: false },
      { stepIndex: 2, text: 'Qadam 3: Navbatdagi son: 16 + 2 = 18', isWrong: true, explanation: '16 ni 2 ga qo\'shish emas, 2 ga ko\'paytirish kerak (16 · 2 = 32)!' },
      { stepIndex: 3, text: 'Qadam 4: Natija 18 deb olindi.', isWrong: false }
    ],
    fixOptions: [
      'Navbatdagi son: 16 · 2 = 32',
      'Navbatdagi son: 16 · 16 = 256',
      'Navbatdagi son: 16 - 2 = 14'
    ],
    correctFixIndex: 0
  }
];

interface GameRecord {
  _id: string;
  playerName: string;
  score: number;
  createdAt: string;
}

const MistakeInspector = () => {
  const navigate = useNavigate();
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover'>('start');
  const [playerName, setPlayerName] = useState('');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [lives, setLives] = useState(3);
  const [combo, setCombo] = useState(0);
  const [muted, setMuted] = useState(gameSound.getMuted());
  const [, setLeaderboard] = useState<GameRecord[]>([]);

  // Current Task & Phase: 'select_step' -> 'fix_mistake'
  const [currentTask, setCurrentTask] = useState<InspectorTask>(INSPECTOR_DATABASE[0]);
  const [phase, setPhase] = useState<'select_step' | 'fix_mistake'>('select_step');
  const [selectedStepIndex, setSelectedStepIndex] = useState<number | null>(null);

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

  const setupTask = useCallback(() => {
    const task = INSPECTOR_DATABASE[Math.floor(Math.random() * INSPECTOR_DATABASE.length)];
    setCurrentTask(task);
    setPhase('select_step');
    setSelectedStepIndex(null);
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
    setupTask();

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

  // Handle Step Selection
  const handleSelectStep = (index: number) => {
    setSelectedStepIndex(index);
    const targetStep = currentTask.steps.find(s => s.stepIndex === index);

    if (targetStep?.isWrong) {
      // Step correctly identified as wrong!
      gameSound.playCorrect();
      toast.success('Xato bosqichni to\'g\'ri topdingiz! Endi to\'g\'ri yechimni tanlang.', { duration: 2000 });
      setTimeout(() => {
        setPhase('fix_mistake');
      }, 800);
    } else {
      // Wrong step chosen
      gameSound.playWrong();
      setCombo(0);
      const newLives = lives - 1;
      setLives(newLives);
      toast.error('Bu bosqichda xatolik yo\'q. Boshqa bosqichni ko\'zdan kechiring.', { duration: 2000 });

      if (newLives <= 0) {
        setTimeout(() => endGame(), 1000);
      } else {
        setSelectedStepIndex(null);
      }
    }
  };

  // Handle Fix Selection
  const handleSelectFix = (fixIdx: number) => {
    if (fixIdx === currentTask.correctFixIndex) {
      // Fix correct!
      const comboBonus = combo * 15;
      const roundScore = 60 + comboBonus;
      setScore(prev => prev + roundScore);
      const newCombo = combo + 1;
      setCombo(newCombo);

      if (newCombo >= 3) {
        gameSound.playCombo(newCombo);
      } else {
        gameSound.playCorrect();
      }

      toast.success(`Ajoyib detektivlik! +${roundScore} ball`, { duration: 1500 });
      setTimeout(() => {
        setupTask();
      }, 1000);
    } else {
      // Fix wrong
      gameSound.playWrong();
      setCombo(0);
      const newLives = lives - 1;
      setLives(newLives);
      toast.error('Tuzatish varianti noto\'g\'ri!', { duration: 2000 });

      if (newLives <= 0) {
        setTimeout(() => endGame(), 1000);
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

      {/* Main Container */}
      <main className="flex flex-col items-center justify-center flex-1 w-full max-w-4xl mx-auto p-4 md:p-6 relative z-10">
        <AnimatePresence mode="wait">
          {/* 1. START SCREEN */}
          {gameState === 'start' && (
            <motion.div key="start"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.02 }}
              className="w-full max-w-md bg-white border border-zinc-200/80 rounded-3xl p-8 md:p-10 shadow-xl shadow-zinc-900/5 flex flex-col items-center text-center font-sans"
            >
              <div className="w-20 h-20 bg-gradient-to-br from-amber-500 to-indigo-600 text-white rounded-2xl flex items-center justify-center mb-6 shadow-md shadow-indigo-500/20">
                <Search className="w-10 h-10 text-white" strokeWidth={2} />
              </div>

              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 mb-2">
                Detektiv: Xatoni Top
              </h1>
              <p className="text-zinc-500 text-xs leading-relaxed mb-6">
                Berilgan mantiqiy va ilmiy bosqichlardagi yashirin xatolarni aniqlang hamda ularni to'g'ri mezon bilan almashtiring.
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
                  O'yinni Boshlash <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* 2. PLAYING SCREEN */}
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
                    <span>{score} ball</span>
                  </div>
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

              {/* Task Banner */}
              <div className="w-full bg-white border border-zinc-200/80 p-6 md:p-8 rounded-2xl text-center shadow-xs relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-1 bg-zinc-100">
                  <motion.div
                    className={`h-full ${timeLeft > 15 ? 'bg-indigo-600' : 'bg-rose-500'}`}
                    initial={{ width: '100%' }}
                    animate={{ width: `${(timeLeft / GAME_DURATION) * 100}%` }}
                    transition={{ duration: 1, ease: 'linear' }}
                  />
                </div>
                
                <span className="px-3 py-1 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold uppercase tracking-wider mb-3 inline-block mt-1">
                  {currentTask.category}
                </span>
                <h2 className="text-xl md:text-2xl font-bold tracking-tight text-zinc-900 mb-2">
                  {currentTask.title}
                </h2>
                <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">
                  {phase === 'select_step' ? 'Qaysi bosqichda xatolik borligini tanlang:' : 'Ushbu xatoni to\'g\'ri tuzatuvchi variantni tanlang:'}
                </p>
              </div>

              {/* PHASE 1: SELECT WRONG STEP */}
              {phase === 'select_step' && (
                <div className="space-y-3 w-full">
                  {currentTask.steps.map(step => (
                    <motion.button
                      key={step.stepIndex}
                      whileHover={{ scale: 1.005 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => handleSelectStep(step.stepIndex)}
                      className={`w-full p-4 md:p-5 rounded-2xl text-left border transition-all flex items-center justify-between shadow-xs ${
                        selectedStepIndex === step.stepIndex 
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-600/20' 
                          : 'bg-white border-zinc-200/80 text-zinc-800 hover:border-indigo-300 hover:bg-indigo-50/30'
                      }`}
                    >
                      <div className="font-semibold text-sm md:text-base"><FormattedText content={step.text} /></div>
                      <ShieldAlert className={`w-5 h-5 shrink-0 ml-3 ${selectedStepIndex === step.stepIndex ? 'text-white' : 'text-zinc-400'}`} />
                    </motion.button>
                  ))}
                </div>
              )}

              {/* PHASE 2: FIX MISTAKE OPTIONS */}
              {phase === 'fix_mistake' && (
                <div className="space-y-4 w-full">
                  <div className="p-4 md:p-5 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-amber-950 flex items-start gap-3 shadow-xs">
                    <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
                    <div className="text-xs font-medium leading-relaxed">
                      <strong className="block font-bold mb-0.5 text-amber-900 text-xs uppercase tracking-wider">Xatolik Tushuntirishi:</strong>
                      {currentTask.steps.find(s => s.isWrong)?.explanation}
                    </div>
                  </div>

                  <div className="space-y-3">
                    {currentTask.fixOptions.map((opt, idx) => (
                      <motion.button
                        key={idx}
                        whileHover={{ scale: 1.005 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => handleSelectFix(idx)}
                        className="w-full p-4 md:p-5 rounded-2xl bg-white border border-zinc-200/80 hover:border-indigo-400 hover:bg-indigo-50/50 text-left transition-all flex items-center justify-between shadow-xs group cursor-pointer"
                      >
                        <div className="font-semibold text-sm md:text-base text-zinc-800 group-hover:text-indigo-950"><FormattedText content={opt} /></div>
                        <CheckCircle2 className="w-5 h-5 text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-3" />
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* 3. GAME OVER SCREEN */}
          {gameState === 'gameover' && (
            <motion.div key="gameover"
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="w-full max-w-md flex flex-col items-center font-sans"
            >
              <div className="bg-white rounded-3xl border border-zinc-200/80 shadow-xl shadow-zinc-900/5 p-8 md:p-10 w-full flex flex-col items-center text-center relative overflow-hidden">
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 mb-1">
                  {lives <= 0 ? 'O\'yin Tugadi!' : 'Vaqt Tugadi!'}
                </h2>
                <p className="text-xs text-zinc-500 mb-6">Barakalla, {playerName}!</p>
                
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

export default MistakeInspector;
