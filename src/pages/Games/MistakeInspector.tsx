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

      {/* Main Container */}
      <main className="flex flex-col items-center justify-center flex-1 w-full max-w-4xl mx-auto p-4 relative z-10">
        <AnimatePresence mode="wait">
          {/* 1. START SCREEN */}
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
                  className="w-32 h-32 bg-gradient-to-br from-amber-400 via-orange-500 to-orange-600 rounded-[2rem] shadow-2xl shadow-orange-500/40 flex items-center justify-center relative overflow-hidden"
                >
                  <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-white/30 rounded-full blur-xl" />
                  <Search className="w-14 h-14 text-white relative z-10" strokeWidth={2} />
                </motion.div>
              </div>

              <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-3 tracking-tight">
                Detektiv: Xatoni Top
              </h1>
              <p className="text-slate-500 text-[16px] mb-8 max-w-sm leading-relaxed">
                Berilgan mantiqiy yechimlar va matnlardagi yashirin xatolarni aniqlang va ularni to'g'ri mezonlar bilan almashtiring.
              </p>

              <div className="w-full max-w-sm space-y-4">
                <div className="relative">
                  <input
                    type="text"
                    value={playerName}
                    onChange={e => setPlayerName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && startGame()}
                    placeholder="Ismingizni kiriting..."
                    autoFocus
                    className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4.5 text-[17px] font-medium text-slate-800 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10 transition-all placeholder:text-slate-400 shadow-sm"
                  />
                </div>
                <button
                  onClick={startGame}
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold text-[17px] py-4.5 rounded-2xl hover:opacity-90 active:scale-[0.98] transition-all shadow-xl shadow-orange-500/20 tracking-wide flex items-center justify-center gap-2"
                >
                  Detektivlikni Boshlash <ChevronRight className="w-5 h-5" />
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
              {/* Header Stats */}
              <div className="w-full flex justify-between items-end mb-2 px-1">
                <div className="flex flex-col gap-1">
                  <div className="font-semibold text-slate-500 flex items-center gap-1.5 text-[13px]">
                    <Clock className="w-4 h-4" /> {timeLeft} soniya
                  </div>
                  <div className="flex gap-1.5">
                    {[...Array(3)].map((_, i) => (
                      <Heart key={i} className={`w-5 h-5 ${i < lives ? 'fill-rose-500 text-rose-500' : 'fill-slate-200 text-slate-200'}`} strokeWidth={2} />
                    ))}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <AnimatePresence>
                    {combo >= 2 && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                        className="text-orange-500 font-bold text-[15px] flex items-center gap-1"
                      >
                        <Flame className="w-4 h-4 fill-orange-500" /> {combo}x COMBO
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              <div className="w-full h-2.5 bg-slate-200/60 rounded-full overflow-hidden -mt-4 mb-2">
                <motion.div
                  className={`h-full ${timeLeft > 15 ? 'bg-amber-500' : 'bg-rose-500'}`}
                  initial={{ width: '100%' }}
                  animate={{ width: `${(timeLeft / GAME_DURATION) * 100}%` }}
                  transition={{ duration: 1, ease: 'linear' }}
                />
              </div>

              {/* Task Banner */}
              <div className="w-full bg-white border border-slate-100 p-6 md:p-8 rounded-3xl text-center shadow-xl shadow-slate-200/50 relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-400 to-orange-500" />
                <span className="px-3.5 py-1 rounded-full bg-orange-50 text-orange-600 border border-orange-100 text-xs font-bold uppercase tracking-wider mb-4 inline-block">
                  {currentTask.category}
                </span>
                <h2 className="text-2xl md:text-3xl font-bold text-slate-800 mb-2 tracking-tight">
                  {currentTask.title}
                </h2>
                <p className="text-slate-500 text-[15px] font-medium">
                  {phase === 'select_step' ? '🔍 Qaysi bosqichda XATOLIK borligini bosib ko\'rsating:' : '⚡ Ushbu xatoni to\'g\'ri tuzatuvchi variantni tanlang:'}
                </p>
              </div>

              {/* PHASE 1: SELECT WRONG STEP */}
              {phase === 'select_step' && (
                <div className="space-y-3 w-full">
                  {currentTask.steps.map(step => (
                    <motion.button
                      key={step.stepIndex}
                      whileHover={{ scale: 1.01, y: -2 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => handleSelectStep(step.stepIndex)}
                      className={`w-full p-5 rounded-2xl text-left border font-semibold text-[17px] transition-all flex items-center justify-between shadow-sm
                        ${selectedStepIndex === step.stepIndex 
                          ? 'bg-amber-50 border-amber-200 text-amber-700 shadow-inner' 
                          : 'bg-white border-slate-200 text-slate-700 hover:border-amber-300 hover:shadow-md'}`}
                    >
                      <FormattedText content={step.text} />
                      <ShieldAlert className={`w-5 h-5 ${selectedStepIndex === step.stepIndex ? 'text-amber-500' : 'text-slate-400 group-hover:text-amber-500'}`} />
                    </motion.button>
                  ))}
                </div>
              )}

              {/* PHASE 2: FIX MISTAKE OPTIONS */}
              {phase === 'fix_mistake' && (
                <div className="space-y-4 w-full">
                  <div className="p-5 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-900 flex items-start gap-3 shadow-sm">
                    <AlertTriangle className="w-6 h-6 shrink-0 text-amber-500 mt-0.5" />
                    <div className="text-[15px]">
                      <strong className="block font-bold mb-1 text-amber-700">Xatolik Tushuntirishi:</strong>
                      {currentTask.steps.find(s => s.isWrong)?.explanation}
                    </div>
                  </div>

                  <div className="space-y-3">
                    {currentTask.fixOptions.map((opt, idx) => (
                      <motion.button
                        key={idx}
                        whileHover={{ scale: 1.01, y: -2 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => handleSelectFix(idx)}
                        className="w-full p-5 rounded-2xl bg-white border border-slate-200 hover:border-emerald-300 hover:shadow-md text-left font-medium text-[17px] text-slate-700 transition-all flex items-center justify-between shadow-sm"
                      >
                        <FormattedText content={opt} />
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
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
              className="w-full max-w-xl flex flex-col items-center font-sans"
            >
              <div className="bg-white rounded-[2rem] p-8 md:p-10 w-full border border-slate-100 shadow-2xl shadow-slate-200/50 flex flex-col items-center text-center mb-6 relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-orange-50/50 to-transparent pointer-events-none" />
                
                <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2 relative z-10 tracking-tight">
                  {lives <= 0 ? 'O\'yin Tugadi!' : 'Vaqt Tugadi!'}
                </h2>
                <p className="text-[15px] font-medium text-slate-500 mb-8 relative z-10">Barakalla, {playerName}!</p>
                
                <div className="w-full bg-slate-50/50 rounded-[1.5rem] py-8 mb-8 relative border border-slate-100 flex flex-col items-center">
                  <div className="text-[5rem] md:text-[6rem] font-bold text-orange-500 leading-none flex items-center justify-center gap-4">
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
                    className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold text-[16px] py-4 rounded-xl hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-orange-500/20"
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

export default MistakeInspector;
