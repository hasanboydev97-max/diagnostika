import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Trophy, Clock, Heart, RefreshCw, Star, Lock, Play, Volume2, VolumeX, Music } from 'lucide-react';
import { toast } from 'sonner';
import MeshGradient from '../../components/ui/MeshGradient';
import confetti from 'canvas-confetti';
import { gameSound } from '../../utils/gameSound';
import { fetchAudioSpellingWord, type AudioSpellingItem } from '../../services/dictionaryService';

const SPELLING_WORDS_LIST = [
  // Level 1: Basic 4-6 letter words
  ['APPLE', 'WATER', 'EARTH', 'SOLAR', 'RIVER', 'CLOUD', 'BREAD', 'MUSIC', 'HOUSE', 'LIGHT', 'OCEAN', 'PLANT', 'TRAIN', 'SMILE'],
  // Level 2: 6-7 letter science & nature words
  ['PLANET', 'ROCKET', 'GALAXY', 'ENERGY', 'FUTURE', 'FOREST', 'ANIMAL', 'SPRING', 'SILVER', 'YELLOW', 'MONKEY', 'DOCTOR', 'FARMER'],
  // Level 3: 7-8 letter general & academic words
  ['FREEDOM', 'SYSTEM', 'SCIENCE', 'NATURE', 'VICTORY', 'CRYSTAL', 'DIAMOND', 'WEATHER', 'MORNING', 'STUDENT', 'TEACHER', 'HISTORY'],
  // Level 4: 8-9 letter advanced words
  ['CHAMPION', 'UNIVERSE', 'TREASURE', 'SPLENDID', 'KNOWLEDGE', 'MOUNTAIN', 'KEYBOARD', 'HOSPITAL', 'DISCOVERY', 'LANGUAGE', 'CREATIVE'],
  // Level 5: Master vocabulary words
  ['INTELLIGENCE', 'ASTRONOMY', 'BEAUTIFUL', 'COMMUNITY', 'DEVELOPER', 'EDUCATION', 'FANTASTIC', 'GEOGRAPHY', 'IMPORTANT', 'WONDERFUL']
];

export const SpellingBee = () => {
  const navigate = useNavigate();
  const [gameState, setGameState] = useState<'stage_select' | 'loading' | 'playing' | 'stage_victory' | 'gameover'>('stage_select');
  const [playerName, setPlayerName] = useState('');
  const [currentStageLevel, setCurrentStageLevel] = useState<number>(1);
  const [unlockedStageLevel, setUnlockedStageLevel] = useState<number>(1);
  const [stageStars, setStageStars] = useState<Record<number, number>>({});

  const [currentWordItem, setCurrentWordItem] = useState<AudioSpellingItem | null>(null);
  const [stageWords, setStageWords] = useState<string[]>([]);
  const [wordIndex, setWordIndex] = useState(0);

  const [userLetters, setUserLetters] = useState<string[]>([]);
  const [shuffledPool, setShuffledPool] = useState<string[]>([]);

  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(35);
  const [lives, setLives] = useState(3);
  const [mascotQuote, setMascotQuote] = useState("Ovozni eshit va harflarni to'g'ri yig'! 🎧");
  const [isMuted, setIsMuted] = useState(gameSound.getMuted());

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('hb_spelling_bee_stages');
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

  const playWordAudio = (url?: string) => {
    const targetUrl = url || currentWordItem?.audioUrl;
    if (!targetUrl) return;
    try {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(targetUrl);
      audioRef.current = audio;
      audio.play().catch(e => console.warn('Audio play error:', e));
    } catch (_) {}
  };

  const loadWord = async (word: string) => {
    setGameState('loading');
    const item = await fetchAudioSpellingWord(word.toLowerCase());
    setCurrentWordItem(item);
    setUserLetters([]);

    // Prepare letter tiles pool + random extra letters
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lettersArr = item.word.split('');
    const extraCount = Math.max(2, 8 - lettersArr.length);
    const extraLetters: string[] = [];
    for (let i = 0; i < extraCount; i++) {
      extraLetters.push(alphabet[Math.floor(Math.random() * alphabet.length)]);
    }

    const fullPool = [...lettersArr, ...extraLetters].sort(() => Math.random() - 0.5);
    setShuffledPool(fullPool);
    setGameState('playing');
    playWordAudio(item.audioUrl);
  };

  const completeVictory = useCallback((stageLvl: number, finalScore: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    syncScore(finalScore);
    const earnedStars = Math.max(1, livesRef.current);
    const nextUnlocked = Math.max(unlockedStageLevel, Math.min(5, stageLvl + 1));
    const newStageStars = { ...stageStars, [stageLvl]: Math.max(stageStars[stageLvl] || 0, earnedStars) };

    setUnlockedStageLevel(nextUnlocked);
    setStageStars(newStageStars);

    try {
      localStorage.setItem('hb_spelling_bee_stages', JSON.stringify({
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
    const rawWords = SPELLING_WORDS_LIST[stageLvl - 1] || SPELLING_WORDS_LIST[0];
    const words = [...rawWords].sort(() => Math.random() - 0.5).slice(0, 5);
    setStageWords(words);
    setCurrentStageLevel(stageLvl);
    setWordIndex(0);
    syncScore(0);
    syncLives(3);
    setTimeLeft(35);

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

    await loadWord(words[0]);
  };

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const handleLetterClick = (letter: string, poolIdx: number) => {
    if (!currentWordItem) return;
    gameSound.playTick();

    const newPicked = [...userLetters, letter];
    setUserLetters(newPicked);

    // Remove letter from pool
    const newPool = [...shuffledPool];
    newPool.splice(poolIdx, 1);
    setShuffledPool(newPool);

    // Check if word length matches
    if (newPicked.length === currentWordItem.word.length) {
      const builtWord = newPicked.join('');
      if (builtWord === currentWordItem.word) {
        gameSound.playCorrect();
        const newScore = scoreRef.current + 25;
        syncScore(newScore);
        setMascotQuote("OFARIN! MUKAMMAL TALAFFUZ VA SO'Z! 🌟");

        setTimeout(async () => {
          if (wordIndex + 1 >= stageWords.length) {
            completeVictory(currentStageLevel, newScore);
          } else {
            const nextIdx = wordIndex + 1;
            setWordIndex(nextIdx);
            setTimeLeft(35);
            await loadWord(stageWords[nextIdx]);
          }
        }, 600);
      } else {
        gameSound.playWrong();
        const newLives = livesRef.current - 1;
        syncLives(newLives);
        setMascotQuote(`Afsus! To'g'ri so'z: ${currentWordItem.word}`);

        setTimeout(async () => {
          if (newLives <= 0) {
            endGameover();
          } else {
            if (wordIndex + 1 >= stageWords.length) {
              completeVictory(currentStageLevel, scoreRef.current);
            } else {
              const nextIdx = wordIndex + 1;
              setWordIndex(nextIdx);
              setTimeLeft(35);
              await loadWord(stageWords[nextIdx]);
            }
          }
        }, 800);
      }
    }
  };

  const timerPct = (timeLeft / 35) * 100;

  return (
    <div className="min-h-screen text-slate-800 flex flex-col font-sans selection:bg-purple-600 selection:text-white relative overflow-hidden bg-gradient-to-br from-[#FAF5FF] via-[#F5F3FF] to-[#EFF6FF]">
      <MeshGradient />

      {/* Header */}
      <header className="relative z-20 flex justify-between items-center px-4 md:px-8 py-3.5 border-b border-purple-200/80 bg-white/80 backdrop-blur-xl shadow-xs">
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
            {isMuted ? <VolumeX className="w-4.5 h-4.5 text-rose-500" /> : <Volume2 className="w-4.5 h-4.5 text-purple-600" />}
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
              className="w-full max-w-2xl bg-white/95 backdrop-blur-2xl border-2 border-purple-100/90 rounded-3xl p-6 md:p-10 shadow-2xl shadow-purple-100/60 font-sans"
            >
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-gradient-to-tr from-purple-500 to-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-3.5 shadow-lg shadow-purple-400/25 text-4xl border-2 border-white">
                  🎧
                </div>
                <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 mb-1.5">Audio Spelling Bee Quest</h1>
                <p className="text-xs text-slate-500 font-medium max-w-md mx-auto">Free Dictionary Audio API bilan talaffuzni eshitib, so'zlarni yig'ing!</p>
              </div>

              <div className="mb-8 max-w-md mx-auto">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">O'quvchi Ismi:</label>
                <input
                  type="text"
                  value={playerName}
                  onChange={e => setPlayerName(e.target.value)}
                  placeholder="Ismingizni kiriting..."
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold text-slate-900 outline-none placeholder:text-slate-400 focus:border-purple-500 focus:bg-white focus:ring-4 focus:ring-purple-100 transition-all shadow-inner"
                />
              </div>

              <div className="space-y-3.5 mb-6">
                {[1, 2, 3, 4, 5].map((lvl) => {
                  const isUnlocked = lvl <= unlockedStageLevel;
                  const stars = stageStars[lvl] || 0;

                  return (
                    <div key={lvl} className={`p-4.5 rounded-2xl border-2 transition-all flex items-center justify-between gap-4 ${isUnlocked ? 'bg-gradient-to-r from-purple-50/60 to-indigo-50/60 border-purple-200/90 shadow-sm hover:shadow-md hover:border-purple-300' : 'bg-slate-50/80 border-slate-200/80 opacity-60'}`}>
                      <div className="flex items-center gap-3.5">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg ${isUnlocked ? 'bg-gradient-to-tr from-purple-500 to-indigo-600 text-white shadow-md shadow-purple-400/25' : 'bg-slate-200 text-slate-400'}`}>
                          {isUnlocked ? lvl : <Lock className="w-5 h-5" />}
                        </div>
                        <div>
                          <h3 className="font-extrabold text-sm text-slate-900">{lvl}-Bosqich: Audio Spelling {lvl}</h3>
                          <p className="text-xs text-slate-500 mt-0.5">5 ta inglizcha audio so'z</p>
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
                          onClick={() => startStage(lvl)}
                          className={`px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 border-b-4 ${isUnlocked ? 'bg-purple-600 hover:bg-purple-700 text-white border-purple-800 active:border-b-0 active:translate-y-1 cursor-pointer shadow-md shadow-purple-500/20' : 'bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed'}`}
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
              <div className="w-14 h-14 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="font-extrabold text-slate-700 text-sm uppercase tracking-wider animate-pulse">Audio MP3 va Talaffuz Yuklanmoqda...</p>
            </motion.div>
          )}

          {/* Playing */}
          {gameState === 'playing' && currentWordItem && (
            <motion.div key="playing" className="w-full flex flex-col items-center justify-between max-w-2xl">
              {/* Mascot */}
              <div className="w-full flex items-center gap-3 mb-4 bg-white/95 backdrop-blur-xl border border-purple-100 p-3 rounded-2xl shadow-sm">
                <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 1.5 }} className="w-11 h-11 bg-gradient-to-tr from-purple-400 to-indigo-500 rounded-2xl flex items-center justify-center text-xl shadow-md border-2 border-white">
                  🎧
                </motion.div>
                <div className="bg-purple-50/80 border border-purple-200/70 px-4 py-2 rounded-xl text-xs font-bold text-purple-900">
                  {mascotQuote}
                </div>
              </div>

              {/* Stats */}
              <div className="w-full mb-4">
                <div className="bg-white/95 backdrop-blur-xl border-2 border-purple-100 rounded-2xl p-3.5 flex justify-between items-center shadow-md mb-2.5">
                  <div className="flex gap-3 items-center">
                    <div className="font-black uppercase tracking-wider text-xs text-amber-900 flex items-center gap-1.5 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200">
                      <Clock className="w-4 h-4 text-purple-600 animate-spin" /> {timeLeft}S
                    </div>
                    <div className="flex gap-1">
                      {[...Array(3)].map((_, i) => (
                        <Heart key={i} className={`w-5 h-5 ${i < lives ? 'fill-rose-500 text-rose-500' : 'fill-slate-200 text-slate-300'}`} />
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black text-purple-800 uppercase tracking-wider bg-purple-50 px-3 py-1.5 rounded-xl border border-purple-200">
                      {wordIndex + 1} / {stageWords.length} SO'Z
                    </span>
                  </div>
                </div>

                <div className="w-full h-3 rounded-full border border-slate-200 bg-slate-100 overflow-hidden shadow-inner p-[1px]">
                  <motion.div className={`h-full rounded-full transition-all duration-300 ${timeLeft <= 7 ? 'bg-rose-500' : 'bg-gradient-to-r from-purple-500 to-indigo-600'}`} initial={{ width: '100%' }} animate={{ width: `${timerPct}%` }} transition={{ duration: 1, ease: 'linear' }} />
                </div>
              </div>

              {/* Audio Play Card */}
              <motion.div className="w-full bg-white rounded-3xl p-6 mb-6 flex flex-col items-center justify-center border-2 border-purple-100 shadow-xl shadow-purple-100/40 text-center">
                <button
                  onClick={() => playWordAudio()}
                  className="w-20 h-20 bg-gradient-to-tr from-purple-500 to-pink-500 rounded-3xl flex items-center justify-center shadow-xl shadow-purple-400/30 text-white mb-3 hover:scale-105 active:scale-95 transition-all cursor-pointer border-2 border-white"
                >
                  <Music className="w-10 h-10 animate-pulse" />
                </button>
                <p className="text-xs font-bold text-purple-700 uppercase tracking-wider mb-2">TALAFFUZNI QAYTA ESHITISH UCHUN BOSING 🔊</p>
                <span className="text-sm font-mono text-slate-600 bg-purple-50 px-4 py-1.5 rounded-xl border border-purple-200">
                  {currentWordItem.phonetic}
                </span>
              </motion.div>

              {/* Built Word Slots */}
              <div className="flex gap-2 mb-6 justify-center flex-wrap">
                {[...Array(currentWordItem.word.length)].map((_, idx) => {
                  const letter = userLetters[idx] || '';
                  return (
                    <div
                      key={idx}
                      className="w-12 h-14 bg-white border-2 border-purple-300 rounded-2xl flex items-center justify-center font-black text-2xl text-purple-900 shadow-md"
                    >
                      {letter}
                    </div>
                  );
                })}
              </div>

              {/* Shuffled Letter Tiles Pool */}
              <div className="flex gap-2.5 justify-center flex-wrap w-full max-w-lg">
                {shuffledPool.map((lettr, pIdx) => (
                  <button
                    key={pIdx}
                    onClick={() => handleLetterClick(lettr, pIdx)}
                    className="w-13 h-13 bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-black text-xl rounded-2xl border-b-4 border-indigo-900 active:border-b-0 active:translate-y-1 shadow-md hover:brightness-110 cursor-pointer"
                  >
                    {lettr}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Victory */}
          {gameState === 'stage_victory' && (
            <motion.div key="stage_victory" className="w-full max-w-md bg-white/98 backdrop-blur-2xl border-4 border-amber-400 rounded-3xl p-8 shadow-2xl flex flex-col items-center text-center font-sans">
              <div className="w-22 h-22 bg-gradient-to-tr from-amber-400 to-yellow-500 rounded-3xl flex items-center justify-center text-5xl mb-3 shadow-lg shadow-amber-400/30 border-2 border-white">
                🏆
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-1">SPELLING CHAMPION!</h2>
              <p className="text-xs text-slate-500 mb-5 font-bold">Audio talaffuz va yozish bosqichi yutildi!</p>

              <div className="flex gap-2 mb-5 bg-amber-50/80 px-6 py-3 rounded-2xl border border-amber-200">
                {[1, 2, 3].map(starIdx => (
                  <Star key={starIdx} className={`w-8 h-8 ${starIdx <= Math.max(1, lives) ? 'text-amber-400 fill-amber-400 animate-bounce' : 'text-slate-200 fill-slate-200'}`} />
                ))}
              </div>

              <div className="w-full bg-purple-50 rounded-2xl py-3.5 mb-5 border border-purple-200">
                <div className="text-3xl font-black text-purple-950">{score} <span className="text-xs text-amber-600">BALL</span></div>
              </div>

              <div className="flex flex-col gap-2.5 w-full">
                {currentStageLevel < 5 && (
                  <button onClick={() => startStage(currentStageLevel + 1)} className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black text-xs uppercase py-3.5 rounded-2xl shadow-md border-b-4 border-purple-800 cursor-pointer active:translate-y-1">
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
              <p className="text-xs text-slate-500 mb-6">Audio talaffuzni yana bir bor sinang!</p>
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

export default SpellingBee;
