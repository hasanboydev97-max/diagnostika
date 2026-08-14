import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Trophy, Clock, Heart, Flame, Volume2, VolumeX, Search, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
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
    <div className="min-h-screen bg-slate-950 text-white font-sans relative overflow-x-hidden selection:bg-amber-500 selection:text-slate-950">
      {/* Background Ambient */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-amber-500/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Header */}
      <header className="relative z-20 border-b border-slate-800 bg-slate-900/60 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <button
            onClick={() => navigate('/games')}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-semibold text-sm">O'yinlar ro'yxatiga</span>
          </button>

          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Search className="w-4 h-4" /> Detektiv: Xatoni Top
            </div>

            <button
              onClick={toggleSound}
              className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 hover:text-white transition-all"
            >
              {muted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5 text-emerald-400" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 max-w-4xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {/* 1. START SCREEN */}
          {gameState === 'start' && (
            <motion.div
              key="start"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-slate-900/80 border border-slate-800 rounded-3xl p-8 md:p-12 shadow-2xl backdrop-blur-xl max-w-xl mx-auto text-center"
            >
              <div className="w-20 h-20 bg-amber-500/20 border border-amber-500/30 rounded-3xl flex items-center justify-center mx-auto mb-6 text-amber-400 shadow-inner">
                <Search className="w-10 h-10 animate-pulse" />
              </div>

              <h1 className="text-3xl md:text-4xl font-extrabold mb-3 tracking-tight">
                Detektiv: Xatoni Top
              </h1>
              <p className="text-slate-400 text-sm md:text-base leading-relaxed mb-8">
                Berilgan mantiqiy yechimlar va matnlardagi yashirin xatolarni aniqlang va ularni to'g mezonlar bilan almashtiring.
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
                  placeholder="Masalan: Sardor Rahimova"
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all font-medium text-lg"
                />
              </div>

              <button
                onClick={startGame}
                className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-slate-950 font-extrabold text-lg rounded-2xl shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-all"
              >
                Detektivlikni Boshlash
              </button>
            </motion.div>
          )}

          {/* 2. PLAYING SCREEN */}
          {gameState === 'playing' && (
            <motion.div
              key="playing"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="space-y-6"
            >
              {/* Header Stats */}
              <div className="grid grid-cols-4 gap-3 bg-slate-900/80 border border-slate-800 p-4 rounded-2xl backdrop-blur-xl">
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
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${timeLeft <= 10 ? 'bg-red-500/20 text-red-400 animate-bounce' : 'bg-amber-500/10 text-amber-400'}`}>
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
                        <span key={i} className={`w-2.5 h-2.5 rounded-full ${i < lives ? 'bg-red-500 shadow-sm shadow-red-500' : 'bg-slate-800'}`} />
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

              {/* Task Banner */}
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl text-center shadow-xl">
                <span className="px-3.5 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold uppercase tracking-wider mb-2 inline-block">
                  {currentTask.category}
                </span>
                <h2 className="text-2xl font-bold text-white mb-2">
                  {currentTask.title}
                </h2>
                <p className="text-slate-400 text-sm">
                  {phase === 'select_step' ? '🔍 Qaysi bosqichda XATOLIK borligini bosib ko\'rsating:' : '⚡ Ushbu xatoni to\'g\'ri tuzatuvchi variantni tanlang:'}
                </p>
              </div>

              {/* PHASE 1: SELECT WRONG STEP */}
              {phase === 'select_step' && (
                <div className="space-y-3">
                  {currentTask.steps.map(step => (
                    <motion.button
                      key={step.stepIndex}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => handleSelectStep(step.stepIndex)}
                      className={`w-full p-5 rounded-2xl text-left border font-semibold text-lg transition-all flex items-center justify-between ${selectedStepIndex === step.stepIndex ? 'bg-amber-500/20 border-amber-500 text-amber-300' : 'bg-slate-900/90 border-slate-800 text-slate-200 hover:border-slate-700 hover:bg-slate-800/60'}`}
                    >
                      <FormattedText content={step.text} />
                      <ShieldAlert className="w-5 h-5 text-slate-500 group-hover:text-amber-400" />
                    </motion.button>
                  ))}
                </div>
              )}

              {/* PHASE 2: FIX MISTAKE OPTIONS */}
              {phase === 'fix_mistake' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-start gap-3">
                    <AlertTriangle className="w-6 h-6 shrink-0 text-amber-400 mt-0.5" />
                    <div className="text-sm">
                      <strong className="block font-bold mb-1">Xatolik Tushuntirishi:</strong>
                      {currentTask.steps.find(s => s.isWrong)?.explanation}
                    </div>
                  </div>

                  <div className="space-y-3">
                    {currentTask.fixOptions.map((opt, idx) => (
                      <motion.button
                        key={idx}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => handleSelectFix(idx)}
                        className="w-full p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/60 hover:bg-slate-800 text-left font-medium text-lg text-white transition-all flex items-center justify-between"
                      >
                        <FormattedText content={opt} />
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* 3. GAME OVER SCREEN */}
          {gameState === 'gameover' && (
            <motion.div
              key="gameover"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-slate-900 border border-slate-800 p-8 md:p-12 rounded-3xl shadow-2xl max-w-xl mx-auto text-center backdrop-blur-xl"
            >
              <div className="w-20 h-20 bg-amber-500/20 border border-amber-500/30 rounded-3xl flex items-center justify-center mx-auto mb-6 text-amber-400">
                <Trophy className="w-10 h-10 animate-bounce" />
              </div>

              <h2 className="text-3xl font-extrabold text-white mb-2">Detektivlik Yakunlandi!</h2>
              <p className="text-slate-400 text-sm mb-6">Barakalla, {playerName}!</p>

              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 mb-8 flex justify-around">
                <div>
                  <div className="text-xs uppercase font-bold text-slate-400 mb-1">Yakuniy Ball</div>
                  <div className="text-4xl font-black text-amber-400">{score}</div>
                </div>
                <div className="w-px bg-slate-800" />
                <div>
                  <div className="text-xs uppercase font-bold text-slate-400 mb-1">Max Combo</div>
                  <div className="text-4xl font-black text-orange-400">x{combo}</div>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => navigate('/games')}
                  className="flex-1 py-3.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl transition-all"
                >
                  Chiqish
                </button>
                <button
                  onClick={startGame}
                  className="flex-1 py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded-xl shadow-lg shadow-amber-500/20 transition-all"
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

export default MistakeInspector;
