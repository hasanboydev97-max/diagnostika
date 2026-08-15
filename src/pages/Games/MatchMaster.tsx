import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Trophy, Clock, Flame, Volume2, VolumeX, Grid, Sparkles, ChevronRight, Check } from 'lucide-react';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import { gameSound } from '../../utils/gameSound';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const GAME_ID = 'match-master';
const GAME_DURATION = 90;

interface MatchPair {
  pairId: string;
  itemA: string;
  itemB: string;
  category: string;
}

const MATCH_DATABASE: MatchPair[] = [
  // Kimyo
  { pairId: 'p1', itemA: 'Suv', itemB: 'H₂O', category: 'Kimyo' },
  { pairId: 'p2', itemA: 'Temir', itemB: 'Fe', category: 'Kimyo' },
  { pairId: 'p3', itemA: 'Oltin', itemB: 'Au', category: 'Kimyo' },
  { pairId: 'p4', itemA: 'Kislorod', itemB: 'O₂', category: 'Kimyo' },
  { pairId: 'p5', itemA: 'Tuz', itemB: 'NaCl', category: 'Kimyo' },
  { pairId: 'p6', itemA: 'Kumush', itemB: 'Ag', category: 'Kimyo' },
  // Chet tillari
  { pairId: 'p7', itemA: 'Apple', itemB: 'Olma', category: 'Ingliz tili' },
  { pairId: 'p8', itemA: 'Knowledge', itemB: 'Bilim', category: 'Ingliz tili' },
  { pairId: 'p9', itemA: 'Teacher', itemB: 'O\'qituvchi', category: 'Ingliz tili' },
  { pairId: 'p10', itemA: 'Freedom', itemB: 'Erkinlik', category: 'Ingliz tili' },
  // Geografiya
  { pairId: 'p11', itemA: 'O\'zbekiston', itemB: 'Toshkent', category: 'Geografiya' },
  { pairId: 'p12', itemA: 'Fransiya', itemB: 'Parij', category: 'Geografiya' },
  { pairId: 'p13', itemA: 'Yaponiya', itemB: 'Tokio', category: 'Geografiya' },
  { pairId: 'p14', itemA: 'Buyuk Britaniya', itemB: 'London', category: 'Geografiya' },
];

interface Card {
  id: string;
  pairId: string;
  text: string;
  category: string;
  isFlipped: boolean;
  isMatched: boolean;
}

interface GameRecord {
  _id: string;
  playerName: string;
  score: number;
  createdAt: string;
}

const MatchMaster = () => {
  const navigate = useNavigate();
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover'>('start');
  const [playerName, setPlayerName] = useState('');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [combo, setCombo] = useState(0);
  const [muted, setMuted] = useState(gameSound.getMuted());
  const [, setLeaderboard] = useState<GameRecord[]>([]);

  const [cards, setCards] = useState<Card[]>([]);
  const [flippedCards, setFlippedCards] = useState<Card[]>([]);
  const [, setMatchedPairsCount] = useState(0);

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

  const setupGrid = useCallback(() => {
    // Pick 6 random pairs (12 cards total for crisp 4x3 grid)
    const shuffledPairs = [...MATCH_DATABASE].sort(() => Math.random() - 0.5).slice(0, 6);

    const generatedCards: Card[] = [];
    shuffledPairs.forEach(pair => {
      generatedCards.push({
        id: `${pair.pairId}-A-${Math.random()}`,
        pairId: pair.pairId,
        text: pair.itemA,
        category: pair.category,
        isFlipped: false,
        isMatched: false
      });
      generatedCards.push({
        id: `${pair.pairId}-B-${Math.random()}`,
        pairId: pair.pairId,
        text: pair.itemB,
        category: pair.category,
        isFlipped: false,
        isMatched: false
      });
    });

    setCards(generatedCards.sort(() => Math.random() - 0.5));
    setFlippedCards([]);
    setMatchedPairsCount(0);
  }, []);

  const scoreRef = useRef(score); scoreRef.current = score;
  const nameRef = useRef(playerName); nameRef.current = playerName;

  const endGame = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setGameState('gameover');
    gameSound.playVictory();
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
    if (nameRef.current) saveScore(scoreRef.current, nameRef.current);
  }, []);

  const startGame = () => {
    if (!playerName.trim()) {
      toast.error('Iltimos, ismingizni kiriting!');
      return;
    }
    setScore(0);
    setCombo(0);
    setTimeLeft(GAME_DURATION);
    setGameState('playing');
    setupGrid();

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

  const handleCardClick = (card: Card) => {
    if (card.isFlipped || card.isMatched || flippedCards.length >= 2) return;

    gameSound.playFlip();

    // Flip card
    setCards(prev => prev.map(c => c.id === card.id ? { ...c, isFlipped: true } : c));
    const newFlipped = [...flippedCards, card];
    setFlippedCards(newFlipped);

    if (newFlipped.length === 2) {
      const [first, second] = newFlipped;

      if (first.pairId === second.pairId) {
        // MATCH!
        gameSound.playCorrect();
        const roundScore = 40 + combo * 10;
        setScore(prev => prev + roundScore);
        setCombo(prev => prev + 1);

        setCards(prev => prev.map(c => c.pairId === first.pairId ? { ...c, isMatched: true } : c));
        setFlippedCards([]);
        setMatchedPairsCount(prev => {
          const next = prev + 1;
          if (next >= 6) {
            // Level Cleared! Re-shuffle new grid
            toast.success('Barcha juftliklar topildi! Yangi doska ochildi 🔥', { duration: 2000 });
            setTimeout(() => {
              setupGrid();
            }, 1000);
          }
          return next;
        });
      } else {
        // NO MATCH
        gameSound.playWrong();
        setCombo(0);
        setTimeout(() => {
          setCards(prev => prev.map(c => (c.id === first.id || c.id === second.id) ? { ...c, isFlipped: false } : c));
          setFlippedCards([]);
        }, 900);
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

      {/* Main Content */}
      <main className="flex flex-col items-center justify-center flex-1 w-full max-w-4xl mx-auto p-4 md:p-6 relative z-10">
        <AnimatePresence mode="wait">
          {/* START */}
          {gameState === 'start' && (
            <motion.div key="start"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.02 }}
              className="w-full max-w-md bg-white border border-zinc-200/80 rounded-3xl p-8 md:p-10 shadow-xl shadow-zinc-900/5 flex flex-col items-center text-center font-sans"
            >
              <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-indigo-700 text-white rounded-2xl flex items-center justify-center mb-6 shadow-md shadow-indigo-500/20">
                <Grid className="w-10 h-10 text-white" strokeWidth={1.75} />
              </div>

              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 mb-2">Juftliklar Ustasi</h1>
              <p className="text-zinc-500 text-xs leading-relaxed mb-6">
                Kartalarni ag'darib, bir-biriga mos keladigan fan atamalari, formulalar va tarjimalar juftligini toping!
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
                  Xotira O'yinini Boshlash <ChevronRight className="w-4 h-4" />
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
              <div className="w-full bg-white border border-zinc-200/80 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-center gap-4 relative z-10 shadow-xs">
                <div className="flex items-center gap-4 sm:gap-6 w-full sm:w-auto justify-center sm:justify-start">
                  <div className="flex items-center gap-2 text-zinc-800 font-bold text-xs uppercase tracking-wider">
                    <Clock className="w-4 h-4 text-indigo-600" /> 
                    <span>{timeLeft}s</span>
                  </div>
                  <div className="h-4 w-px bg-zinc-200" />
                  <div className="flex items-center gap-2 text-zinc-800 font-bold text-xs uppercase tracking-wider">
                    <Trophy className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <span>{score} ball</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-1/2">
                  <div className="flex-1 h-2 bg-zinc-100 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-indigo-600"
                      initial={{ width: '100%' }}
                      animate={{ width: `${(timeLeft / GAME_DURATION) * 100}%` }}
                      transition={{ duration: 1, ease: 'linear' }}
                    />
                  </div>
                  <AnimatePresence>
                    {combo >= 2 && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                        className="px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-[10px] uppercase tracking-wider font-bold border border-amber-200 flex items-center gap-1 whitespace-nowrap"
                      >
                        <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500" /> x{combo} Combo
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Memory Cards Grid (4 Columns x 3 Rows) */}
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 sm:gap-4 w-full">
                {cards.map(card => (
                  <motion.div
                    key={card.id}
                    whileHover={{ scale: card.isMatched ? 1 : 1.03 }}
                    whileTap={{ scale: card.isMatched ? 1 : 0.97 }}
                    onClick={() => handleCardClick(card)}
                    className={`h-28 sm:h-32 rounded-2xl cursor-pointer select-none transition-all duration-300 flex items-center justify-center p-3 text-center border relative overflow-hidden shadow-xs ${
                      card.isMatched 
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300 opacity-95 pointer-events-none' 
                        : card.isFlipped 
                          ? 'bg-indigo-600 text-white font-bold text-base md:text-lg border-indigo-600 shadow-sm shadow-indigo-600/30' 
                          : 'bg-white hover:bg-zinc-50 border-zinc-200/80 hover:border-indigo-300 text-zinc-700'
                    }`}
                  >
                    {card.isFlipped || card.isMatched ? (
                      <span className="font-bold text-sm md:text-base leading-tight relative z-10 flex flex-col items-center gap-1.5">
                        {card.isMatched && <Check className="w-5 h-5 text-emerald-600" />}
                        {card.text}
                      </span>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Sparkles className="w-7 h-7 text-indigo-400 opacity-40" />
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* GAMEOVER */}
          {gameState === 'gameover' && (
            <motion.div key="gameover"
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="w-full max-w-md flex flex-col items-center font-sans"
            >
              <div className="bg-white p-8 md:p-10 w-full border border-zinc-200/80 rounded-3xl shadow-xl shadow-zinc-900/5 flex flex-col items-center text-center relative overflow-hidden">
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 mb-1">Vaqt Tugadi!</h2>
                <p className="text-xs text-zinc-500 mb-6">Ajoyib natija, {playerName}!</p>
                
                <div className="w-full bg-indigo-50/50 py-6 mb-6 relative border border-indigo-100 rounded-2xl flex flex-col items-center">
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
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider py-3.5 rounded-xl transition-all shadow-sm shadow-indigo-600/20"
                  >
                    Qayta O'ynash
                  </button>
                  <button onClick={() => navigate('/games')}
                    className="flex-1 bg-white border border-zinc-200/80 text-zinc-800 font-bold text-xs uppercase tracking-wider py-3.5 rounded-xl transition-all hover:bg-zinc-50 shadow-xs"
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

export default MatchMaster;
