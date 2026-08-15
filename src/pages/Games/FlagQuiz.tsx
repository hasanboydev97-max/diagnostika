import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Trophy, Clock, Heart, RefreshCw, Star, Lock, Play, Volume2, VolumeX } from 'lucide-react';
import { toast } from 'sonner';
import MeshGradient from '../../components/ui/MeshGradient';
import confetti from 'canvas-confetti';
import { gameSound } from '../../utils/gameSound';
import { fetchCountriesQuizData, type CountryQuizItem } from '../../services/countriesService';

interface QuizStage {
  level: number;
  name: string;
  count: number;
}

const STAGES: QuizStage[] = [
  { level: 1, name: "1-Bosqich: Bayroqlar Boshlanishi", count: 5 },
  { level: 2, name: "2-Bosqich: Dunyo Poytaxtlari", count: 7 },
  { level: 3, name: "3-Bosqich: Qit'alar va Davlatlar", count: 8 },
  { level: 4, name: "4-Bosqich: Zukko Geograf", count: 10 },
  { level: 5, name: "5-Bosqich: GEOGRAFIYA MASTER 🗺️", count: 12 },
];

export const FlagQuiz = () => {
  const navigate = useNavigate();
  const [gameState, setGameState] = useState<'stage_select' | 'loading' | 'playing' | 'stage_victory' | 'gameover'>('stage_select');
  const [playerName, setPlayerName] = useState('');
  const [currentStageLevel, setCurrentStageLevel] = useState<number>(1);
  const [unlockedStageLevel, setUnlockedStageLevel] = useState<number>(1);
  const [stageStars, setStageStars] = useState<Record<number, number>>({});

  const [countries, setCountries] = useState<CountryQuizItem[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(25);
  const [lives, setLives] = useState(3);
  const [combo, setCombo] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [clickedOption, setClickedOption] = useState<string | null>(null);
  const [mascotQuote, setMascotQuote] = useState("Bayroqqa qarab poytaxtni topa olasanmi? 🗺️");
  const [isMuted, setIsMuted] = useState(gameSound.getMuted());

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scoreRef = useRef(0);
  const livesRef = useRef(3);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('hb_flag_quiz_stages');
      if (saved) {
        const parsed = JSON.parse(saved);
        setUnlockedStageLevel(parsed.unlockedStageLevel || 1);
        setStageStars(parsed.stageStars || {});
      }
    } catch (_) {}
  }, []);

  const syncScore = (v: number) => { scoreRef.current = v; setScore(v); };
  const syncLives = (v: number) => { livesRef.current = v; setLives(v); };

  const toggleSound = () => setIsMuted(gameSound.toggleMute());

  const completeVictory = useCallback((stageLvl: number, finalScore: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    syncScore(finalScore);
    const earnedStars = Math.max(1, livesRef.current);
    const nextUnlocked = Math.max(unlockedStageLevel, Math.min(5, stageLvl + 1));
    const newStageStars = { ...stageStars, [stageLvl]: Math.max(stageStars[stageLvl] || 0, earnedStars) };

    setUnlockedStageLevel(nextUnlocked);
    setStageStars(newStageStars);

    try {
      localStorage.setItem('hb_flag_quiz_stages', JSON.stringify({
        unlockedStageLevel: nextUnlocked,
        stageStars: newStageStars
      }));
    } catch (_) {}

    gameSound.playVictory();
    confetti({ particleCount: 130, spread: 90, origin: { y: 0.5 } });
    setGameState('stage_victory');
  }, [unlockedStageLevel, stageStars]);

  const endGameover = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    gameSound.playWrong();
    setGameState('gameover');
  }, []);

  const startStage = async (stageLvl: number) => {
    if (!playerName.trim()) {
      toast.error('Ismingizni kiriting!');
      return;
    }
    const stageConfig = STAGES.find(s => s.level === stageLvl) || STAGES[0];
    setCurrentStageLevel(stageLvl);

    try {
      const data = await fetchCountriesQuizData(stageConfig.count);
      setCountries(data);
      setCurrentIdx(0);
      syncScore(0);
      syncLives(3);
      setCombo(0);
      setTimeLeft(25);
      setFeedback(null);
      setClickedOption(null);
      setMascotQuote("Qaysi davlat poytaxti? Diqqat bilan qara! 📍");
      setGameState('playing');

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 7 && prev > 1) gameSound.playTick();
          if (prev <= 1) {
            endGameover();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (e) {
      toast.error('Savollarni yuklashda xatolik yuz berdi');
      setGameState('stage_select');
    }
  };

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const handleOptionClick = (option: string) => {
    if (feedback !== null || !countries[currentIdx]) return;
    setClickedOption(option);
    const item = countries[currentIdx];

    if (option === item.capital) {
      gameSound.playCorrect();
      const newCombo = combo + 1;
      const points = 15 + (newCombo - 1) * 5;
      const newScore = scoreRef.current + points;
      syncScore(newScore);
      setCombo(newCombo);
      setFeedback('correct');
      setMascotQuote(newCombo >= 3 ? "AJOYIB GEOGRAF! DAHSHAT! 🔥" : "To'g'ri poytaxt! Tasanno! ✨");

      setTimeout(() => {
        setFeedback(null);
        setClickedOption(null);
        setTimeLeft(25);
        if (currentIdx + 1 >= countries.length) {
          completeVictory(currentStageLevel, newScore);
        } else {
          setCurrentIdx(prev => prev + 1);
        }
      }, 450);
    } else {
      gameSound.playWrong();
      const newLives = livesRef.current - 1;
      syncLives(newLives);
      setCombo(0);
      setFeedback('wrong');
      setMascotQuote(`Afsus! ${item.name} poytaxti: ${item.capital}`);

      setTimeout(() => {
        setFeedback(null);
        setClickedOption(null);
        if (newLives <= 0) {
          endGameover();
        } else {
          setTimeLeft(25);
          if (currentIdx + 1 >= countries.length) {
            completeVictory(currentStageLevel, scoreRef.current);
          } else {
            setCurrentIdx(prev => prev + 1);
          }
        }
      }, 700);
    }
  };

  const currentCountry = countries[currentIdx];
  const timerPct = (timeLeft / 25) * 100;

  const optionColors = [
    { bg: 'bg-[#6366F1]', hover: 'hover:bg-[#4F46E5]', border: 'border-[#4338CA]', text: 'text-white' },
    { bg: 'bg-[#0284C7]', hover: 'hover:bg-[#0369A1]', border: 'border-[#075985]', text: 'text-white' },
    { bg: 'bg-[#EA580C]', hover: 'hover:bg-[#C2410C]', border: 'border-[#9A3412]', text: 'text-white' },
    { bg: 'bg-[#059669]', hover: 'hover:bg-[#047857]', border: 'border-[#065F46]', text: 'text-white' },
  ];

  return (
    <div className="min-h-screen text-slate-800 flex flex-col font-sans selection:bg-indigo-600 selection:text-white relative overflow-hidden bg-gradient-to-br from-[#FAFCFF] via-[#F3F7FA] to-[#EDF2F7]">
      <MeshGradient />

      {/* Header */}
      <header className="relative z-20 flex justify-between items-center px-4 md:px-8 py-3.5 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl shadow-xs">
        <button
          onClick={() => navigate('/games')}
          className="h-10 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/90 rounded-2xl flex items-center gap-2 transition-all font-bold text-xs uppercase tracking-wider shadow-xs cursor-pointer active:scale-95"
        >
          <ArrowLeft className="w-4 h-4 text-slate-600" />
          <span>PORTAL</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleSound}
            className="w-10 h-10 bg-slate-100 hover:bg-slate-200 border border-slate-200/90 rounded-2xl flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95"
          >
            {isMuted ? <VolumeX className="w-4.5 h-4.5 text-rose-500" /> : <Volume2 className="w-4.5 h-4.5 text-emerald-600" />}
          </button>
          {gameState === 'playing' && (
            <div className="bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 px-4 py-2 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-sm border border-amber-300">
              <Trophy className="w-4 h-4 fill-slate-950" />
              <span>{score} BALL</span>
            </div>
          )}
        </div>
      </header>

      {/* Main Area */}
      <div className="flex flex-col items-center justify-center flex-1 w-full max-w-4xl mx-auto p-4 md:p-6 relative z-10">
        <AnimatePresence mode="wait">
          {/* Stage Select */}
          {gameState === 'stage_select' && (
            <motion.div key="stage_select"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.04 }}
              className="w-full max-w-2xl bg-white/95 backdrop-blur-2xl border-2 border-indigo-100/90 rounded-3xl p-6 md:p-10 shadow-2xl shadow-indigo-100/60 font-sans"
            >
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-gradient-to-tr from-emerald-400 to-teal-600 rounded-3xl flex items-center justify-center mx-auto mb-3.5 shadow-lg shadow-emerald-400/25 text-4xl border-2 border-white">
                  🗺️
                </div>
                <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 mb-1.5">Bayroqlar va Poytaxtlar Quiz</h1>
                <p className="text-xs text-slate-500 font-medium max-w-md mx-auto">REST Countries API orqali dunyo davlatlari bayroqlari va poytaxtlarini sinang!</p>
              </div>

              <div className="mb-8 max-w-md mx-auto">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">O'quvchi Ismi:</label>
                <input
                  type="text"
                  value={playerName}
                  onChange={e => setPlayerName(e.target.value)}
                  placeholder="Ismingizni kiriting..."
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold text-slate-900 outline-none placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100 transition-all shadow-inner"
                />
              </div>

              <div className="space-y-3.5 mb-6">
                {STAGES.map((stage) => {
                  const isUnlocked = stage.level <= unlockedStageLevel;
                  const stars = stageStars[stage.level] || 0;

                  return (
                    <div key={stage.level} className={`p-4.5 rounded-2xl border-2 transition-all flex items-center justify-between gap-4 ${isUnlocked ? 'bg-gradient-to-r from-emerald-50/60 to-teal-50/60 border-emerald-200/90 shadow-sm hover:shadow-md hover:border-emerald-300' : 'bg-slate-50/80 border-slate-200/80 opacity-60'}`}>
                      <div className="flex items-center gap-3.5">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg ${isUnlocked ? 'bg-gradient-to-tr from-emerald-400 to-teal-500 text-white shadow-md shadow-emerald-400/25' : 'bg-slate-200 text-slate-400'}`}>
                          {isUnlocked ? stage.level : <Lock className="w-5 h-5" />}
                        </div>
                        <div>
                          <h3 className="font-extrabold text-sm text-slate-900">{stage.name}</h3>
                          <p className="text-xs text-slate-500 mt-0.5">{stage.count} ta davlat bayrog'i</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {isUnlocked && (
                          <div className="flex gap-1 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs">
                            {[1, 2, 3].map(starIdx => (
                              <Star key={starIdx} className={`w-4 h-4 ${starIdx <= stars ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-200'}`} />
                            ))}
                          </div>
                        )}
                        <button
                          disabled={!isUnlocked}
                          onClick={() => startStage(stage.level)}
                          className={`px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 border-b-4 ${isUnlocked ? 'bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-700 active:border-b-0 active:translate-y-1 cursor-pointer shadow-md shadow-emerald-500/20' : 'bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed'}`}
                        >
                          <Play className="w-3.5 h-3.5 fill-white" /> O'ynash
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Loading */}
          {gameState === 'loading' && (
            <motion.div key="loading" className="flex flex-col items-center justify-center py-16">
              <div className="w-14 h-14 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="font-extrabold text-slate-700 text-sm uppercase tracking-wider animate-pulse">Bayroqlar Yuklanmoqda...</p>
            </motion.div>
          )}

          {/* Playing */}
          {gameState === 'playing' && currentCountry && (
            <motion.div key="playing" className="w-full flex flex-col items-center justify-between max-w-2xl">
              {/* Mascot */}
              <div className="w-full flex items-center gap-3 mb-4 bg-white/95 backdrop-blur-xl border border-emerald-100 p-3 rounded-2xl shadow-sm">
                <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 1.5 }} className="w-11 h-11 bg-gradient-to-tr from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center text-xl shadow-md border-2 border-white">
                  🗺️
                </motion.div>
                <div className="bg-emerald-50/80 border border-emerald-200/70 px-4 py-2 rounded-xl text-xs font-bold text-emerald-900">
                  {mascotQuote}
                </div>
              </div>

              {/* Stats */}
              <div className="w-full mb-4">
                <div className="bg-white/95 backdrop-blur-xl border-2 border-emerald-100 rounded-2xl p-3.5 flex justify-between items-center shadow-md mb-2.5">
                  <div className="flex gap-3 items-center">
                    <div className="font-black uppercase tracking-wider text-xs text-amber-900 flex items-center gap-1.5 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200">
                      <Clock className="w-4 h-4 text-amber-600 animate-spin" /> {timeLeft}S
                    </div>
                    <div className="flex gap-1">
                      {[...Array(3)].map((_, i) => (
                        <Heart key={i} className={`w-5 h-5 ${i < lives ? 'fill-rose-500 text-rose-500' : 'fill-slate-200 text-slate-300'}`} />
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black text-emerald-800 uppercase tracking-wider bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                      {currentIdx + 1} / {countries.length} BAYROQ
                    </span>
                  </div>
                </div>

                <div className="w-full h-3 rounded-full border border-slate-200 bg-slate-100 overflow-hidden shadow-inner p-[1px]">
                  <motion.div className={`h-full rounded-full transition-all duration-300 ${timeLeft <= 7 ? 'bg-rose-500' : 'bg-gradient-to-r from-emerald-400 to-teal-500'}`} initial={{ width: '100%' }} animate={{ width: `${timerPct}%` }} transition={{ duration: 1, ease: 'linear' }} />
                </div>
              </div>

              {/* Flag Card */}
              <motion.div className="w-full bg-white rounded-3xl p-6 mb-6 flex flex-col items-center justify-center border-2 border-emerald-100 shadow-xl shadow-emerald-100/40 text-center">
                <img
                  src={currentCountry.flagSvg}
                  alt={currentCountry.name}
                  className="w-44 h-30 object-cover rounded-2xl border-2 border-slate-200 shadow-md mb-3"
                />
                <h2 className="font-sans font-black text-2xl text-slate-900 uppercase tracking-wider">
                  {currentCountry.name}
                </h2>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-3 py-0.5 rounded-full mt-1">
                  Qit'a: {currentCountry.region}
                </span>
              </motion.div>

              {/* Capital Options */}
              <div className="grid grid-cols-2 gap-3.5 w-full">
                {currentCountry.options.map((opt, idx) => {
                  const colorScheme = optionColors[idx % optionColors.length];
                  const isClicked = clickedOption === opt;
                  const isCorrectAnswer = feedback !== null && opt === currentCountry.capital;
                  const isWrongAnswer = feedback === 'wrong' && isClicked;

                  return (
                    <button
                      key={idx}
                      disabled={feedback !== null}
                      onClick={() => handleOptionClick(opt)}
                      className={`w-full py-5 rounded-2xl text-xl font-extrabold font-sans transition-all duration-150 border-b-6 cursor-pointer text-center active:border-b-0 active:translate-y-2 shadow-lg ${
                        isCorrectAnswer ? 'bg-emerald-500 text-white border-emerald-700 shadow-emerald-500/30' : isWrongAnswer ? 'bg-rose-500 text-white border-rose-700 shadow-rose-500/30' : `${colorScheme.bg} ${colorScheme.hover} ${colorScheme.text} ${colorScheme.border}`
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Victory */}
          {gameState === 'stage_victory' && (
            <motion.div key="stage_victory" className="w-full max-w-md bg-white/98 backdrop-blur-2xl border-4 border-amber-400 rounded-3xl p-8 shadow-2xl flex flex-col items-center text-center font-sans">
              <div className="w-22 h-22 bg-gradient-to-tr from-amber-400 to-yellow-500 rounded-3xl flex items-center justify-center text-5xl mb-3 shadow-lg shadow-amber-400/30 border-2 border-white">
                🏆
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-1">GEOGRAFIYA ZUKKOSI!</h2>
              <p className="text-xs text-slate-500 mb-5 font-bold">Bayroqlar va poytaxtlar bosqichi fath etildi!</p>

              <div className="flex gap-2 mb-5 bg-amber-50/80 px-6 py-3 rounded-2xl border border-amber-200">
                {[1, 2, 3].map(starIdx => (
                  <Star key={starIdx} className={`w-8 h-8 ${starIdx <= Math.max(1, lives) ? 'text-amber-400 fill-amber-400 animate-bounce' : 'text-slate-200 fill-slate-200'}`} />
                ))}
              </div>

              <div className="w-full bg-emerald-50 rounded-2xl py-3.5 mb-5 border border-emerald-200">
                <div className="text-3xl font-black text-emerald-950">{score} <span className="text-xs text-amber-600">BALL</span></div>
              </div>

              <div className="flex flex-col gap-2.5 w-full">
                {currentStageLevel < 5 && (
                  <button onClick={() => startStage(currentStageLevel + 1)} className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black text-xs uppercase py-3.5 rounded-2xl shadow-md border-b-4 border-emerald-700 cursor-pointer active:translate-y-1">
                    KEYINGI BOSQICH ➔
                  </button>
                )}
                <button onClick={() => setGameState('stage_select')} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase py-3.5 rounded-2xl border border-slate-200 cursor-pointer">
                  Bosqichlar Xaritasi
                </button>
              </div>
            </motion.div>
          )}

          {/* Gameover */}
          {gameState === 'gameover' && (
            <motion.div key="gameover" className="w-full max-w-md bg-white/98 backdrop-blur-2xl border-4 border-rose-400 rounded-3xl p-8 shadow-2xl flex flex-col items-center text-center font-sans">
              <div className="w-20 h-20 bg-rose-50 border-2 border-rose-300 text-rose-500 rounded-3xl flex items-center justify-center text-4xl mb-3">💔</div>
              <h2 className="text-2xl font-black text-slate-900 mb-1">Vaqt yoki Jon Tugadi!</h2>
              <p className="text-xs text-slate-500 mb-6">Yana bir bor geografiya bilimingizni sinang!</p>
              <div className="flex flex-col gap-2.5 w-full">
                <button onClick={() => startStage(currentStageLevel)} className="w-full bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs uppercase py-3.5 rounded-2xl border-b-4 border-amber-600 cursor-pointer flex items-center justify-center gap-2 active:translate-y-1">
                  <RefreshCw className="w-4 h-4" /> Qayta Urinish
                </button>
                <button onClick={() => setGameState('stage_select')} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase py-3.5 rounded-2xl border border-slate-200 cursor-pointer">
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

export default FlagQuiz;
