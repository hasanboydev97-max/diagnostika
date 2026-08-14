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

      {/* Main Content */}
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
                  className="w-32 h-32 bg-gradient-to-br from-purple-500 via-fuchsia-500 to-fuchsia-600 rounded-[2rem] shadow-2xl shadow-purple-500/40 flex items-center justify-center relative overflow-hidden"
                >
                  <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-white/20 rounded-full blur-xl" />
                  <Grid className="w-14 h-14 text-white relative z-10" strokeWidth={1.5} />
                </motion.div>
              </div>

              <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-3 tracking-tight">Juftliklar Ustasi</h1>
              <p className="text-slate-500 text-[16px] mb-8 max-w-sm leading-relaxed">
                Kartalarni ag'darib, bir-biriga mos keladigan fan atamalari, formulalar va tarjimalar juftligini toping!
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
                    className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4.5 text-[17px] font-medium text-slate-800 outline-none focus:border-purple-400 focus:ring-4 focus:ring-purple-500/10 transition-all placeholder:text-slate-400 shadow-sm"
                  />
                </div>
                <button
                  onClick={startGame}
                  className="w-full bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-semibold text-[17px] py-4.5 rounded-2xl hover:opacity-90 active:scale-[0.98] transition-all shadow-xl shadow-purple-500/20 tracking-wide flex items-center justify-center gap-2"
                >
                  Xotira O'yinini Boshlash <ChevronRight className="w-5 h-5" />
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
              {/* Header Bar */}
              <div className="w-full flex justify-between items-end mb-2 px-1">
                <div className="flex flex-col gap-1">
                  <div className="font-semibold text-slate-500 flex items-center gap-1.5 text-[13px]">
                    <Clock className="w-4 h-4" /> {timeLeft} soniya
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
                  className={`h-full ${timeLeft > 15 ? 'bg-purple-500' : 'bg-rose-500'}`}
                  initial={{ width: '100%' }}
                  animate={{ width: `${(timeLeft / GAME_DURATION) * 100}%` }}
                  transition={{ duration: 1, ease: 'linear' }}
                />
              </div>

              {/* Memory Cards Grid (4 Columns x 3 Rows) */}
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 sm:gap-4 w-full">
                {cards.map(card => (
                  <motion.div
                    key={card.id}
                    whileHover={{ scale: card.isMatched ? 1 : 1.02 }}
                    whileTap={{ scale: card.isMatched ? 1 : 0.98 }}
                    onClick={() => handleCardClick(card)}
                    className={`h-28 sm:h-32 rounded-3xl cursor-pointer select-none transition-all duration-300 flex items-center justify-center p-3 text-center border shadow-sm relative overflow-hidden 
                      ${card.isMatched 
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-600 opacity-80 pointer-events-none shadow-inner' 
                        : card.isFlipped 
                          ? 'bg-gradient-to-br from-purple-500 to-fuchsia-600 border-purple-400 text-white font-bold text-lg shadow-lg shadow-purple-500/25' 
                          : 'bg-white hover:border-purple-300 border-slate-200 text-slate-400'}`}
                  >
                    {card.isFlipped || card.isMatched ? (
                      <span className="font-bold text-base md:text-lg leading-tight relative z-10 flex flex-col items-center gap-1">
                        {card.isMatched && <Check className="w-5 h-5 text-emerald-500 mb-1" />}
                        {card.text}
                      </span>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Sparkles className="w-8 h-8 text-slate-300 opacity-70" />
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
              className="w-full max-w-xl flex flex-col items-center font-sans"
            >
              <div className="bg-white rounded-[2rem] p-8 md:p-10 w-full border border-slate-100 shadow-2xl shadow-slate-200/50 flex flex-col items-center text-center mb-6 relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-purple-50/50 to-transparent pointer-events-none" />
                
                <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2 relative z-10 tracking-tight">Vaqt Tugadi!</h2>
                <p className="text-[15px] font-medium text-slate-500 mb-8 relative z-10">Ajoyib natija, {playerName}!</p>
                
                <div className="w-full bg-slate-50/50 rounded-[1.5rem] py-8 mb-8 relative border border-slate-100 flex flex-col items-center">
                  <div className="text-[5rem] md:text-[6rem] font-bold text-purple-600 leading-none flex items-center justify-center gap-4">
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
                    className="flex-1 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-semibold text-[16px] py-4 rounded-xl hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-purple-500/20"
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

export default MatchMaster;
