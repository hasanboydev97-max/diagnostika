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
    <div className="min-h-screen bg-white font-sans flex flex-col relative transition-all duration-300">

      {/* Header */}
      <header className="relative z-20 flex justify-between items-center p-4">
        <button
          onClick={() => navigate('/games')}
          className="w-12 h-12 bg-white border-2 border-black text-black rounded-none flex items-center justify-center hover:bg-zinc-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {gameState === 'playing' && (
          <div className="flex gap-2">
            <button onClick={toggleSound} className="w-12 h-12 bg-white border-2 border-black text-black rounded-none flex items-center justify-center hover:bg-zinc-100 transition-colors">
              {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
            <div className="bg-white border-2 border-black rounded-none px-5 py-2 font-bold uppercase tracking-widest text-[10px] text-black flex items-center gap-2">
              <Trophy className="w-4 h-4" />
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
              <div className="relative mb-8 w-full flex justify-center">
                <motion.div
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                  className="w-24 h-24 bg-black text-white border-2 border-black rounded-none flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                >
                  <Search className="w-10 h-10 text-white" strokeWidth={2} />
                </motion.div>
              </div>

              <h1 className="font-sans font-black text-3xl md:text-5xl uppercase tracking-tighter text-black mb-3">
                Detektiv: Xatoni Top
              </h1>
              <p className="text-black font-bold text-[10px] uppercase tracking-widest mb-8 max-w-sm leading-relaxed">
                Berilgan mantiqiy yechimlar va matnlardagi yashirin xatolarni aniqlang va ularni to'g'ri mezonlar bilan almashtiring.
              </p>

              <div className="w-full max-w-sm space-y-4">
                <div className="relative">
                  <input
                    type="text"
                    value={playerName}
                    onChange={e => setPlayerName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && startGame()}
                    placeholder="ISMINGIZNI KIRITING..."
                    autoFocus
                    className="w-full bg-white border-2 border-black rounded-none px-5 py-4 text-[10px] font-bold uppercase tracking-widest text-black outline-none placeholder:text-zinc-400 focus:bg-zinc-50 transition-colors"
                  />
                </div>
                <button
                  onClick={startGame}
                  className="w-full bg-black text-white font-bold text-[10px] uppercase tracking-[0.2em] py-4 flex items-center justify-center gap-2 hover:bg-zinc-800 transition-colors border-2 border-black rounded-none"
                >
                  BOSHLASH <ChevronRight className="w-4 h-4" />
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
              <div className="w-full bg-white border-2 border-black rounded-none p-4 flex flex-col sm:flex-row justify-between items-center gap-4 relative z-10 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <div className="flex items-center gap-4 sm:gap-6 w-full sm:w-auto justify-center sm:justify-start">
                  <div className="flex items-center gap-2 text-black font-bold uppercase tracking-widest text-[10px]">
                    <Clock className="w-4 h-4 text-black" /> 
                    <span>{timeLeft}s</span>
                  </div>
                  <div className="h-4 w-px bg-black" />
                  <div className="flex items-center gap-1.5">
                    {[...Array(3)].map((_, i) => (
                      <Heart key={i} className={`w-4 h-4 ${i < lives ? 'fill-black text-black' : 'fill-transparent text-black border-black border'}`} strokeWidth={2} />
                    ))}
                  </div>
                  <div className="h-4 w-px bg-black" />
                  <div className="flex items-center gap-2 text-black font-bold uppercase tracking-widest text-[10px]">
                    <Trophy className="w-4 h-4 text-black" />
                    <span>{score} pts</span>
                  </div>
                </div>

                <AnimatePresence>
                  {combo >= 2 && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                      className="px-3 py-1.5 bg-black text-white rounded-none border-2 border-black text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                    >
                      <Flame className="w-3 h-3 fill-white" /> x{combo} Combo
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Task Banner */}
              <div className="w-full bg-white border-2 border-black p-8 md:p-10 rounded-none text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden mt-2">
                <div className="absolute top-0 inset-x-0 h-2 bg-zinc-200 border-b-2 border-black">
                  <motion.div
                    className={`h-full ${timeLeft > 15 ? 'bg-black' : 'bg-red-600'}`}
                    initial={{ width: '100%' }}
                    animate={{ width: `${(timeLeft / GAME_DURATION) * 100}%` }}
                    transition={{ duration: 1, ease: 'linear' }}
                  />
                </div>
                
                <span className="px-4 py-2 bg-white text-black border-2 border-black text-[10px] font-bold uppercase tracking-widest mb-5 inline-block mt-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rounded-none">
                  {currentTask.category}
                </span>
                <h2 className="font-sans font-black text-2xl md:text-3xl uppercase tracking-tighter text-black mb-3">
                  {currentTask.title}
                </h2>
                <p className="text-black text-[10px] font-bold uppercase tracking-widest max-w-lg mx-auto">
                  {phase === 'select_step' ? 'QAYSI BOSQICHDA XATOLIK BORLIGINI TANLANG:' : 'USHBU XATONI TO\'G\'RI TUZATUVCHI VARIANTNI TANLANG:'}
                </p>
              </div>


              {/* PHASE 1: SELECT WRONG STEP */}
              {phase === 'select_step' && (
                <div className="space-y-4 w-full mt-4">
                  {currentTask.steps.map(step => (
                    <motion.button
                      key={step.stepIndex}
                      whileHover={{ scale: 1.01, y: -2 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => handleSelectStep(step.stepIndex)}
                      className={`w-full p-5 rounded-none text-left border-2 transition-all flex items-center justify-between shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
                        ${selectedStepIndex === step.stepIndex 
                          ? 'bg-black border-black text-white' 
                          : 'bg-white border-black text-black hover:bg-zinc-100'}`}
                    >
                      <div className="font-bold text-[12px] uppercase tracking-widest"><FormattedText content={step.text} /></div>
                      <ShieldAlert className={`w-5 h-5 ${selectedStepIndex === step.stepIndex ? 'text-white' : 'text-black'}`} />
                    </motion.button>
                  ))}
                </div>
              )}

              {/* PHASE 2: FIX MISTAKE OPTIONS */}
              {phase === 'fix_mistake' && (
                <div className="space-y-4 w-full mt-4">
                  <div className="p-5 rounded-none bg-white border-2 border-black text-black flex items-start gap-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <AlertTriangle className="w-6 h-6 shrink-0 text-black mt-0.5" />
                    <div className="text-[12px] font-bold uppercase tracking-widest">
                      <strong className="block font-black mb-1 text-black text-[14px]">XATOLIK TUSHUNTIRISHI:</strong>
                      {currentTask.steps.find(s => s.isWrong)?.explanation}
                    </div>
                  </div>

                  <div className="space-y-4">
                    {currentTask.fixOptions.map((opt, idx) => (
                      <motion.button
                        key={idx}
                        whileHover={{ scale: 1.01, y: -2 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => handleSelectFix(idx)}
                        className="w-full p-5 rounded-none bg-white border-2 border-black hover:bg-zinc-100 text-left transition-all flex items-center justify-between shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] group"
                      >
                        <div className="font-bold text-[12px] uppercase tracking-widest text-black"><FormattedText content={opt} /></div>
                        <CheckCircle2 className="w-5 h-5 text-black opacity-0 group-hover:opacity-100 transition-opacity" />
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
              <div className="bg-white rounded-none border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-8 md:p-10 w-full flex flex-col items-center text-center mb-6 relative overflow-hidden">
                <h2 className="font-sans font-black text-3xl md:text-4xl uppercase tracking-tighter text-black mb-2 relative z-10">
                  {lives <= 0 ? 'O\'YIN TUGADI!' : 'VAQT TUGADI!'}
                </h2>
                <p className="text-[10px] font-bold uppercase tracking-widest text-black mb-8 relative z-10">BARAKALLA, {playerName}!</p>
                
                <div className="w-full bg-white rounded-none py-8 mb-8 relative border-2 border-black flex flex-col items-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <div className="text-[5rem] md:text-[6rem] font-black text-black leading-none flex items-center justify-center gap-4">
                    {score}
                  </div>
                  {combo > 0 && (
                    <div className="mt-4 px-4 py-2 bg-white text-black rounded-none text-[10px] font-bold uppercase tracking-widest border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                      MAX COMBO: {combo}x
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-4 w-full relative z-10">
                  <button onClick={startGame}
                    className="flex-1 bg-black text-white font-bold text-[10px] uppercase tracking-[0.2em] py-4 flex items-center justify-center gap-2 hover:bg-zinc-800 transition-colors border-2 border-black rounded-none"
                  >
                    QAYTA O'YNASH
                  </button>
                  <button onClick={() => navigate('/games')}
                    className="flex-1 bg-white text-black font-bold text-[10px] uppercase tracking-[0.2em] py-4 flex items-center justify-center gap-2 hover:bg-zinc-100 transition-colors border-2 border-black rounded-none"
                  >
                    CHIQISH
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
