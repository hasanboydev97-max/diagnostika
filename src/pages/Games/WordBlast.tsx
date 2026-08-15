import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Trophy, Clock, Target, Volume2, VolumeX, Flame, Heart, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import { gameSound } from '../../utils/gameSound';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const GAME_ID = 'word-blast';
const GAME_DURATION = 60;

interface BlastWord {
  id: string;
  term: string;
  categoryIndex: number; // Index in categories array
}

interface GameRound {
  title: string;
  categories: string[];
  words: { term: string; categoryIndex: number }[];
}

const BLAST_ROUNDS: GameRound[] = [
  {
    title: 'Davlatlar va Ularning Poytaxtlari',
    categories: ['O\'zbekiston', 'Fransiya', 'Yaponiya'],
    words: [
      { term: 'Toshkent', categoryIndex: 0 },
      { term: 'Parij', categoryIndex: 1 },
      { term: 'Tokio', categoryIndex: 2 },
      { term: 'Samarqand', categoryIndex: 0 },
      { term: 'Lion', categoryIndex: 1 },
      { term: 'Kioto', categoryIndex: 2 },
      { term: 'Buxoro', categoryIndex: 0 },
      { term: 'Marsel', categoryIndex: 1 }
    ]
  },
  {
    title: 'Fanlar Atamalari',
    categories: ['Fizika', 'Kimyo', 'Biologiya'],
    words: [
      { term: 'Tezlanish', categoryIndex: 0 },
      { term: 'Valentlik', categoryIndex: 1 },
      { term: 'DNK', categoryIndex: 2 },
      { term: 'Kuchlanish', categoryIndex: 0 },
      { term: 'Reaksiya', categoryIndex: 1 },
      { term: 'Hujayra', categoryIndex: 2 },
      { term: 'Massasizlik', categoryIndex: 0 },
      { term: 'Molekula', categoryIndex: 1 }
    ]
  },
  {
    title: 'Tillar Lug\'ati (Tarjima categoriyasi)',
    categories: ['Kitob / O\'qish', 'Tabiat / Havo', 'Texnologiya'],
    words: [
      { term: 'Book', categoryIndex: 0 },
      { term: 'Rain', categoryIndex: 1 },
      { term: 'Computer', categoryIndex: 2 },
      { term: 'Library', categoryIndex: 0 },
      { term: 'Sun', categoryIndex: 1 },
      { term: 'Software', categoryIndex: 2 }
    ]
  }
];

interface GameRecord {
  _id: string;
  playerName: string;
  score: number;
  createdAt: string;
}

const WordBlast = () => {
  const navigate = useNavigate();
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover'>('start');
  const [playerName, setPlayerName] = useState('');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [lives, setLives] = useState(3);
  const [combo, setCombo] = useState(0);
  const [muted, setMuted] = useState(gameSound.getMuted());
  const [, setLeaderboard] = useState<GameRecord[]>([]);

  const [currentRound, setCurrentRound] = useState<GameRound>(BLAST_ROUNDS[0]);
  const [activeWord, setActiveWord] = useState<BlastWord | null>(null);

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

  const spawnNextWord = useCallback((round?: GameRound) => {
    const rnd = round || BLAST_ROUNDS[Math.floor(Math.random() * BLAST_ROUNDS.length)];
    setCurrentRound(rnd);
    const item = rnd.words[Math.floor(Math.random() * rnd.words.length)];
    setActiveWord({
      id: `w-${Math.random()}`,
      term: item.term,
      categoryIndex: item.categoryIndex
    });
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
    spawnNextWord();

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

  const handleCategoryChoice = (catIdx: number) => {
    if (!activeWord) return;

    if (catIdx === activeWord.categoryIndex) {
      // Correct Shoot!
      const comboBonus = combo * 10;
      const roundScore = 30 + comboBonus;
      setScore(prev => prev + roundScore);
      const newCombo = combo + 1;
      setCombo(newCombo);

      if (newCombo >= 3) {
        gameSound.playCombo(newCombo);
      } else {
        gameSound.playCorrect();
      }

      spawnNextWord(currentRound);
    } else {
      // Wrong Shoot!
      gameSound.playWrong();
      setCombo(0);
      const newLives = lives - 1;
      setLives(newLives);

      if (newLives <= 0) {
        endGame();
      } else {
        spawnNextWord(currentRound);
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
            <div className="bg-white border-2 border-black px-5 py-2 rounded-none font-bold text-[17px] text-black flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              {score}
            </div>
          </div>
        )}
      </header>

      {/* Main Area */}
      <main className="flex flex-col items-center justify-center flex-1 w-full max-w-4xl mx-auto p-4 relative z-10">
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
                  <Target className="w-10 h-10 text-white" strokeWidth={2} />
                </motion.div>
              </div>

              <h1 className="font-sans font-black text-3xl md:text-5xl uppercase tracking-tighter text-black mb-3">
                Tezkor Atamalar Shot
              </h1>
              <p className="text-black font-bold uppercase tracking-widest text-[10px] mb-8 max-w-sm leading-relaxed">
                Ekranda paydo bo'lgan atamani imkon qadar tezroq tegishli kategoriyaga yo'naltiring!
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
                    className="w-full bg-white border-2 border-black rounded-none px-5 py-4 text-[10px] font-bold uppercase tracking-widest text-black outline-none placeholder:text-zinc-400 focus:bg-zinc-50 transition-colors"
                  />
                </div>
                <button
                  onClick={startGame}
                  className="w-full bg-black text-white font-bold text-[10px] uppercase tracking-[0.2em] py-4 flex items-center justify-center gap-2 hover:bg-zinc-800 transition-colors border-2 border-black rounded-none"
                >
                  Atamalar Shotni Boshlash <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* PLAYING */}
          {gameState === 'playing' && (
            <motion.div key="playing"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="w-full flex flex-col items-center max-w-3xl space-y-6"
            >
              {/* Clean Top Status Bar */}
              <div className="w-full bg-white border-2 border-black rounded-none p-4 flex flex-col sm:flex-row justify-between items-center gap-4 relative z-10">
                <div className="flex items-center gap-4 sm:gap-6 w-full sm:w-auto justify-center sm:justify-start">
                  <div className="flex items-center gap-2 font-bold uppercase tracking-widest text-[10px] text-black">
                    <Clock className="w-4 h-4" /> 
                    <span>{timeLeft}S</span>
                  </div>
                  <div className="h-4 w-px bg-black" />
                  <div className="flex items-center gap-1.5">
                    {[...Array(3)].map((_, i) => (
                      <Heart key={i} className={`w-4 h-4 ${i < lives ? 'fill-black text-black' : 'fill-white text-black border-black'}`} strokeWidth={2} />
                    ))}
                  </div>
                  <div className="h-4 w-px bg-black" />
                  <div className="flex items-center gap-2 font-bold uppercase tracking-widest text-[10px] text-black">
                    <Trophy className="w-4 h-4" />
                    <span>{score}</span>
                  </div>
                </div>

                <AnimatePresence>
                  {combo >= 2 && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                      className="px-3 py-1.5 bg-black text-white rounded-none border-2 border-black flex items-center gap-1.5 font-bold uppercase tracking-widest text-[10px]"
                    >
                      <Flame className="w-3 h-3 text-white" /> x{combo} COMBO
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Target Word Display Card */}
              <div className="w-full bg-white rounded-none border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-8 text-center relative min-h-[220px] flex flex-col items-center justify-center overflow-hidden mb-6">
                <div className="absolute top-0 inset-x-0 h-1.5 bg-zinc-200">
                  <motion.div
                    className={`h-full ${timeLeft > 15 ? 'bg-black' : 'bg-red-600'}`}
                    initial={{ width: '100%' }}
                    animate={{ width: `${(timeLeft / GAME_DURATION) * 100}%` }}
                    transition={{ duration: 1, ease: 'linear' }}
                  />
                </div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-black bg-white px-4 py-1.5 rounded-none border-2 border-black mb-6 inline-block mt-2">
                  {currentRound.title}
                </span>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeWord?.id}
                    initial={{ scale: 0.5, opacity: 0, y: 10 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 1.2, opacity: 0, y: -10 }}
                    className="font-sans font-black text-4xl md:text-5xl uppercase tracking-tighter text-black"
                  >
                    {activeWord?.term}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Category Choice Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
                {currentRound.categories.map((cat, idx) => (
                  <motion.button
                    key={idx}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleCategoryChoice(idx)}
                    className="py-6 px-6 rounded-none bg-white border-2 border-black hover:bg-black hover:text-white text-black font-bold text-lg uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all text-center flex items-center justify-center min-h-[100px]"
                  >
                    {cat}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* GAMEOVER */}
          {gameState === 'gameover' && (
            <motion.div key="gameover"
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="w-full max-w-xl flex flex-col items-center font-sans"
            >
              <div className="bg-white rounded-none p-8 md:p-10 w-full border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center text-center mb-6 relative">
                
                <h2 className="font-sans font-black text-3xl md:text-5xl uppercase tracking-tighter text-black mb-2 relative z-10">
                  {lives <= 0 ? 'O\'YIN TUGADI!' : 'VAQT TUGADI!'}
                </h2>
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-8 relative z-10">Barakalla, {playerName}!</p>
                
                <div className="w-full bg-white rounded-none py-8 mb-8 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center">
                  <div className="text-[5rem] md:text-[6rem] font-black text-black leading-none flex items-center justify-center gap-4">
                    {score}
                  </div>
                  {combo > 0 && (
                    <div className="mt-4 px-3 py-1 bg-black text-white rounded-none text-[10px] font-bold uppercase tracking-widest border-2 border-black">
                      MAX COMBO: {combo}X
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-4 w-full relative z-10">
                  <button onClick={startGame}
                    className="flex-1 bg-black text-white font-bold text-[10px] uppercase tracking-[0.2em] py-4 flex items-center justify-center gap-2 hover:bg-zinc-800 transition-colors border-2 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                  >
                    QAYTA O'YNASH
                  </button>
                  <button onClick={() => navigate('/games')}
                    className="flex-1 bg-white text-black font-bold text-[10px] uppercase tracking-[0.2em] py-4 flex items-center justify-center gap-2 hover:bg-zinc-100 transition-colors border-2 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
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

export default WordBlast;
