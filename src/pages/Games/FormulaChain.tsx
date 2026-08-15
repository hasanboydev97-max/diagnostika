import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Trophy, Clock, Flame, Volume2, VolumeX, ChevronRight, Brain, Heart, RotateCcw, Check } from 'lucide-react';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import { gameSound } from '../../utils/gameSound';
import FormattedText from '../../components/FormattedText';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const GAME_ID = 'formula-chain';
const GAME_DURATION = 75;

interface FormulaItem {
  id: string;
  title: string;
  category: 'Matematika' | 'Fizika' | 'Kimyo' | 'Mantiq';
  blocks: string[]; // Correct order of tokens
  hint: string;
}

const FORMULA_DATABASE: FormulaItem[] = [
  {
    id: 'f1',
    title: 'Nyutonning II Qonuni',
    category: 'Fizika',
    blocks: ['F', '=', 'm', '·', 'a'],
    hint: 'Kuch = Massa × Tezlanish'
  },
  {
    id: 'f2',
    title: 'Eynshteyn Formulasi (Energiya)',
    category: 'Fizika',
    blocks: ['E', '=', 'm', '·', 'c²'],
    hint: 'Energiya = Massa × Yorug\'lik tezligi kvadrati'
  },
  {
    id: 'f3',
    title: 'Pifagor Teoremasi',
    category: 'Matematika',
    blocks: ['a²', '+', 'b²', '=', 'c²'],
    hint: 'Katetlar kvadratlari yig\'indisi gipotenuza kvadratiga teng'
  },
  {
    id: 'f4',
    title: 'Kvadrat Tenglama Diskriminanti',
    category: 'Matematika',
    blocks: ['D', '=', 'b²', '-', '4', '·', 'a', '·', 'c'],
    hint: 'Diskriminant formulasi'
  },
  {
    id: 'f5',
    title: 'Tezlik Formulasi',
    category: 'Fizika',
    blocks: ['S', '=', 'v', '·', 't'],
    hint: 'Masofa = Tezlik × Vaqt'
  },
  {
    id: 'f6',
    title: 'Om Qonuni (Tok kuchi)',
    category: 'Fizika',
    blocks: ['I', '=', 'U', '/', 'R'],
    hint: 'Tok kuchi = Kuchlanish / Qarshilik'
  },
  {
    id: 'f7',
    title: 'Zichlik Formulasi',
    category: 'Fizika',
    blocks: ['ρ', '=', 'm', '/', 'V'],
    hint: 'Zichlik = Massa / Hajm'
  },
  {
    id: 'f8',
    title: 'To\'g\'ri To\'rtburchak Yuzi',
    category: 'Matematika',
    blocks: ['S', '=', 'a', '·', 'b'],
    hint: 'Yuz = Bo\'y × En'
  },
  {
    id: 'f9',
    title: 'To\'g\'ri To\'rtburchak Perimetri',
    category: 'Matematika',
    blocks: ['P', '=', '2', '·', '(', 'a', '+', 'b', ')'],
    hint: 'Perimetr = 2 × (En + Bo\'y)'
  },
  {
    id: 'f10',
    title: 'Suvning Kimyoviy Formulasi',
    category: 'Kimyo',
    blocks: ['H₂O', '=', '2H', '+', 'O'],
    hint: 'Vodorod va kislorod birikmasi'
  },
  {
    id: 'f11',
    title: 'Kinetik Energiya',
    category: 'Fizika',
    blocks: ['E_k', '=', '(', 'm', '·', 'v²', ')', '/', '2'],
    hint: 'Kinetik energiya formulasi'
  },
  {
    id: 'f12',
    title: 'Mantiqiy shart (Dasturlash)',
    category: 'Mantiq',
    blocks: ['if', '(', 'x', '>', '0', ')'],
    hint: 'Agar x musbat bo\'lsa'
  }
];

interface GameRecord {
  _id: string;
  playerName: string;
  score: number;
  createdAt: string;
}

const FormulaChain = () => {
  const navigate = useNavigate();
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover'>('start');
  const [playerName, setPlayerName] = useState('');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [lives, setLives] = useState(3);
  const [combo, setCombo] = useState(0);
  const [muted, setMuted] = useState(gameSound.getMuted());
  const [leaderboard, setLeaderboard] = useState<GameRecord[]>([]);

  // Round State
  const [currentFormula, setCurrentFormula] = useState<FormulaItem>(FORMULA_DATABASE[0]);
  const [availableBlocks, setAvailableBlocks] = useState<{ id: string; val: string }[]>([]);
  const [selectedBlocks, setSelectedBlocks] = useState<{ id: string; val: string }[]>([]);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch Leaderboard
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

  // Setup Next Round
  const setupRound = useCallback((pool?: FormulaItem[]) => {
    const list = pool || FORMULA_DATABASE;
    const formula = list[Math.floor(Math.random() * list.length)];
    setCurrentFormula(formula);

    // Shuffle blocks with unique tracking IDs
    const blocksWithIds = formula.blocks.map((b, i) => ({ id: `${b}-${i}-${Math.random()}`, val: b }));
    const shuffled = [...blocksWithIds].sort(() => Math.random() - 0.5);

    setAvailableBlocks(shuffled);
    setSelectedBlocks([]);
    setFeedback(null);
  }, []);

  // End Game
  const endGame = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setGameState('gameover');
    gameSound.playVictory();
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    if (nameRef.current) {
      saveScore(scoreRef.current, nameRef.current);
    }
  }, []);

  const scoreRef = useRef(score);
  scoreRef.current = score;
  const livesRef = useRef(lives);
  livesRef.current = lives;
  const nameRef = useRef(playerName);
  nameRef.current = playerName;

  // Start Game
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
    setupRound();

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

  // Handle Block Tap
  const handleSelectBlock = (item: { id: string; val: string }) => {
    gameSound.playFlip();
    setAvailableBlocks(prev => prev.filter(b => b.id !== item.id));
    setSelectedBlocks(prev => [...prev, item]);
  };

  const handleDeselectBlock = (item: { id: string; val: string }) => {
    gameSound.playFlip();
    setSelectedBlocks(prev => prev.filter(b => b.id !== item.id));
    setAvailableBlocks(prev => [...prev, item]);
  };

  // Check Solution
  const checkSolution = () => {
    const userSequence = selectedBlocks.map(b => b.val).join('');
    const targetSequence = currentFormula.blocks.join('');

    if (userSequence === targetSequence) {
      // Correct!
      setFeedback('correct');
      const comboBonus = combo * 10;
      const roundScore = 50 + comboBonus;
      const newScore = score + roundScore;
      setScore(newScore);
      const newCombo = combo + 1;
      setCombo(newCombo);

      if (newCombo >= 3) {
        gameSound.playCombo(newCombo);
      } else {
        gameSound.playCorrect();
      }

      toast.success(`Barakalla! +${roundScore} ball`, { duration: 1500 });

      setTimeout(() => {
        setupRound();
      }, 1000);
    } else {
      // Wrong!
      setFeedback('wrong');
      gameSound.playWrong();
      setCombo(0);
      const newLives = lives - 1;
      setLives(newLives);

      toast.error('Ketma-ketlik noto\'g\'ri! Qaytadan urinib ko\'ring.', { duration: 1500 });

      if (newLives <= 0) {
        setTimeout(() => endGame(), 1000);
      } else {
        setTimeout(() => {
          // Reset current round selection
          const blocksWithIds = currentFormula.blocks.map((b, i) => ({ id: `${b}-${i}-${Math.random()}`, val: b }));
          setAvailableBlocks([...blocksWithIds].sort(() => Math.random() - 0.5));
          setSelectedBlocks([]);
          setFeedback(null);
        }, 1200);
      }
    }
  };

  const toggleSound = () => {
    const isMuted = gameSound.toggleMute();
    setMuted(isMuted);
  };

  return (
    <div className="min-h-screen bg-white font-sans flex flex-col">
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
              {muted ? <VolumeX className="w-5 h-5 text-rose-500" /> : <Volume2 className="w-5 h-5 text-emerald-500" />}
            </button>
            <div className="bg-white border-2 border-black px-5 py-2 rounded-none font-bold uppercase tracking-widest text-[10px] text-black flex items-center gap-2">
              <Trophy className="w-5 h-5 text-black fill-black" />
              {score}
            </div>
          </div>
        )}
      </header>

      {/* Main Body */}
      <main className="flex flex-col items-center justify-center flex-1 w-full max-w-4xl mx-auto p-4 relative z-10">
        <AnimatePresence mode="wait">
          {/* 1. START SCREEN */}
          {gameState === 'start' && (
            <motion.div key="start-screen"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="w-full flex flex-col items-center text-center font-sans"
            >
              <div className="relative mb-8">
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                  className="w-24 h-24 bg-black text-white border-2 border-black rounded-none flex items-center justify-center mb-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                >
                  <Brain className="w-12 h-12 text-white" strokeWidth={1.5} />
                </motion.div>
              </div>

              <h1 className="font-sans font-black text-3xl md:text-5xl uppercase tracking-tighter text-black mb-3">Formula Zanjiri</h1>
              <p className="text-black font-bold uppercase tracking-widest text-[10px] mb-8 max-w-sm">
                Formulalar va mantiqiy bloklarni to'g'ri ketma-ketlikda sudrab joylashtiring. Mantiqiy fikrlashingiz va bilimingizni namoyish eting!
              </p>

              {leaderboard.length > 0 && (
                <div className="bg-white border-2 border-black text-black font-bold px-5 py-2.5 rounded-none mb-8 flex items-center gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-[10px] uppercase tracking-widest">
                  <Trophy className="w-4 h-4 fill-black text-black" /> TOP REKORD: {Math.max(...leaderboard.map(r => r.score))}
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
                  Boshlash <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          )}

          {/* 2. PLAYING SCREEN */}
          {gameState === 'playing' && (
            <motion.div key="playing-screen"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="w-full flex flex-col items-center max-w-3xl space-y-6"
            >
              {/* Clean Top Status Bar */}
              <div className="w-full bg-white border-2 border-black rounded-none p-4 flex flex-col sm:flex-row justify-between items-center gap-4 relative z-10 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <div className="flex items-center gap-4 sm:gap-6 w-full sm:w-auto justify-center sm:justify-start">
                  <div className="flex items-center gap-2 text-black font-bold uppercase tracking-widest text-[10px]">
                    <Clock className="w-5 h-5 text-black" /> 
                    <span>{timeLeft}s</span>
                  </div>
                  <div className="h-4 w-px bg-black" />
                  <div className="flex items-center gap-1.5">
                    {[...Array(3)].map((_, i) => (
                      <Heart key={i} className={`w-5 h-5 ${i < lives ? 'fill-black text-black' : 'fill-white text-black'}`} strokeWidth={2} />
                    ))}
                  </div>
                  <div className="h-4 w-px bg-black" />
                  <div className="flex items-center gap-2 text-black font-bold uppercase tracking-widest text-[10px]">
                    <Trophy className="w-5 h-5 text-black" />
                    <span>{score}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="hidden sm:block text-[10px] font-bold text-black uppercase tracking-widest">
                    Top Rekord: {leaderboard.length > 0 ? Math.max(...leaderboard.map(r => r.score), score) : score}
                  </div>
                  <AnimatePresence>
                    {combo >= 2 && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                        className="px-3 py-1.5 bg-black text-white rounded-none text-[10px] font-bold uppercase tracking-widest border-2 border-black flex items-center gap-1.5"
                      >
                        <Flame className="w-4 h-4 fill-white" /> x{combo} Combo
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Task / Formula Hint Box */}
              <div className="w-full bg-white rounded-none border-2 border-black p-8 md:p-10 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-1.5 bg-white border-b-2 border-black">
                  <motion.div
                    className="h-full bg-black"
                    initial={{ width: '100%' }}
                    animate={{ width: `${(timeLeft / GAME_DURATION) * 100}%` }}
                    transition={{ duration: 1, ease: 'linear' }}
                  />
                </div>
                
                <span className="px-4 py-1.5 rounded-none bg-black text-white border-2 border-black text-[10px] font-bold uppercase tracking-widest mb-5 inline-block mt-2">
                  {currentFormula.category}
                </span>

                <h2 className="font-sans font-black text-2xl md:text-3xl uppercase tracking-tighter text-black mb-3">
                  {currentFormula.title}
                </h2>
                <p className="text-black text-[10px] uppercase tracking-widest font-bold">
                  "{currentFormula.hint}"
                </p>
              </div>

              {/* Selected Formula Chain Dropzone */}
              <div className={`w-full min-h-[120px] p-6 rounded-none border-2 transition-all flex flex-wrap items-center justify-center gap-3 relative overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
                ${feedback === 'correct' ? 'bg-green-400 border-black' : feedback === 'wrong' ? 'bg-red-400 border-black' : 'bg-white border-black'}`}>
                {selectedBlocks.length === 0 ? (
                  <span className="text-black text-[10px] font-bold uppercase tracking-widest">
                    Pastdagi bloklarni bosib zanjirni shakllantiring...
                  </span>
                ) : (
                  selectedBlocks.map(item => (
                    <motion.button
                      key={item.id}
                      layout
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      onClick={() => handleDeselectBlock(item)}
                      className="px-6 py-4 rounded-none bg-black text-white font-bold text-xl md:text-2xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-zinc-800 transition-colors flex items-center justify-center min-w-[64px]"
                    >
                      <FormattedText content={item.val} />
                    </motion.button>
                  ))
                )}
              </div>

              {/* Available Blocks Pool */}
              <div className="w-full bg-white rounded-none border-2 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <div className="text-[10px] font-bold uppercase tracking-widest text-black mb-5 text-center">
                  Mavjud Bloklar
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4 min-h-[80px]">
                  {availableBlocks.map(item => (
                    <motion.button
                      key={item.id}
                      layout
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.9, opacity: 0 }}
                      onClick={() => handleSelectBlock(item)}
                      className="px-6 py-4 rounded-none bg-white text-black font-bold text-xl md:text-2xl border-2 border-black hover:bg-zinc-100 transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center min-w-[64px]"
                    >
                      <FormattedText content={item.val} />
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Check Action Button */}
              <div className="flex gap-4 w-full">
                <button
                  onClick={() => setupRound()}
                  className="w-16 h-auto py-4 rounded-none bg-white hover:bg-zinc-100 text-black font-bold text-[10px] uppercase tracking-widest border-2 border-black transition-colors flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                  title="O'tkazib yuborish"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>

                <button
                  disabled={selectedBlocks.length === 0}
                  onClick={checkSolution}
                  className="flex-1 w-full bg-black text-white font-bold text-[10px] uppercase tracking-[0.2em] py-4 flex items-center justify-center gap-2 hover:bg-zinc-800 transition-colors border-2 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50 disabled:hover:bg-black"
                >
                  <Check className="w-6 h-6" /> Tekshirish
                </button>
              </div>
            </motion.div>
          )}

          {/* 3. GAME OVER SCREEN */}
          {gameState === 'gameover' && (
            <motion.div key="gameover"
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="w-full max-w-xl flex flex-col items-center font-sans"
            >
              <div className="rounded-none border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white p-8 md:p-10 w-full flex flex-col items-center text-center mb-6 relative overflow-hidden">
                <h2 className="font-sans font-black text-3xl md:text-5xl uppercase tracking-tighter text-black mb-3">
                  {lives <= 0 ? 'O\'yin Tugadi!' : 'Vaqt Tugadi!'}
                </h2>
                <p className="text-[10px] font-bold uppercase tracking-widest text-black mb-8 relative z-10">Ajoyib urinish, natijangiz bilan tanishing</p>
                
                <div className="w-full bg-white border-2 border-black rounded-none py-8 mb-8 relative flex flex-col items-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <div className="text-[5rem] md:text-[6rem] font-black text-black leading-none flex items-center justify-center gap-4">
                    {score}
                  </div>
                  {combo > 0 && (
                    <div className="mt-4 px-3 py-1 bg-black text-white rounded-none text-[10px] font-bold uppercase tracking-widest border-2 border-black">
                      Max Combo: {combo}x
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-4 w-full relative z-10">
                  <button onClick={startGame}
                    className="flex-1 w-full bg-black text-white font-bold text-[10px] uppercase tracking-[0.2em] py-4 flex items-center justify-center gap-2 hover:bg-zinc-800 transition-colors border-2 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                  >
                    Qayta O'ynash
                  </button>
                  <button onClick={() => navigate('/games')}
                    className="flex-1 w-full bg-white text-black font-bold text-[10px] uppercase tracking-[0.2em] py-4 flex items-center justify-center gap-2 hover:bg-zinc-100 transition-colors border-2 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
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

export default FormulaChain;
