import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Trophy, Clock, Flame, Volume2, VolumeX, Grid, Sparkles } from 'lucide-react';
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
    <div className="min-h-screen bg-slate-900 text-white font-sans relative overflow-x-hidden selection:bg-purple-500 selection:text-white">
      {/* Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-purple-600/10 rounded-full blur-[140px] pointer-events-none" />

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
            <div className="px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Grid className="w-4 h-4" /> Juftliklar Ustasi
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

      {/* Main Content */}
      <main className="relative z-10 max-w-4xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {/* START */}
          {gameState === 'start' && (
            <motion.div
              key="start"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-slate-800/80 border border-slate-700 rounded-3xl p-8 md:p-12 shadow-2xl backdrop-blur-xl max-w-xl mx-auto text-center"
            >
              <div className="w-20 h-20 bg-purple-500/20 border border-purple-500/30 rounded-3xl flex items-center justify-center mx-auto mb-6 text-purple-400 shadow-inner">
                <Grid className="w-10 h-10 animate-pulse" />
              </div>

              <h1 className="text-3xl md:text-4xl font-extrabold mb-3 tracking-tight">
                Juftliklar Ustasi
              </h1>
              <p className="text-slate-400 text-sm md:text-base leading-relaxed mb-8">
                Kartalarni ag'darib, bir-biriga mos keladigan fan atamalari, formulalar va tarjimalar juftligini toping!
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
                  placeholder="Masalan: Nilufar Karimova"
                  className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-5 py-4 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all font-medium text-lg"
                />
              </div>

              <button
                onClick={startGame}
                className="w-full py-4 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-extrabold text-lg rounded-2xl shadow-lg shadow-purple-500/20 active:scale-[0.98] transition-all"
              >
                Xotira O'yinini Boshlash
              </button>
            </motion.div>
          )}

          {/* PLAYING */}
          {gameState === 'playing' && (
            <motion.div
              key="playing"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="space-y-6"
            >
              {/* Header Bar */}
              <div className="grid grid-cols-3 gap-3 bg-slate-800/80 border border-slate-700 p-4 rounded-2xl backdrop-blur-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[11px] uppercase font-bold text-slate-400">Ball</div>
                    <div className="text-xl font-black text-purple-400">{score}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${timeLeft <= 10 ? 'bg-red-500/20 text-red-400 animate-bounce' : 'bg-purple-500/10 text-purple-400'}`}>
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[11px] uppercase font-bold text-slate-400">Vaqt</div>
                    <div className={`text-xl font-black ${timeLeft <= 10 ? 'text-red-400' : 'text-white'}`}>{timeLeft}s</div>
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

              {/* Memory Cards Grid (4 Columns x 3 Rows) */}
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 sm:gap-4 max-w-2xl mx-auto">
                {cards.map(card => (
                  <motion.div
                    key={card.id}
                    whileHover={{ scale: card.isMatched ? 1 : 1.03 }}
                    whileTap={{ scale: card.isMatched ? 1 : 0.97 }}
                    onClick={() => handleCardClick(card)}
                    className={`h-28 rounded-2xl cursor-pointer select-none transition-all duration-300 flex items-center justify-center p-3 text-center border relative overflow-hidden ${card.isMatched ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-400 opacity-60 pointer-events-none' : card.isFlipped ? 'bg-purple-600 border-purple-400 text-white font-bold text-lg shadow-lg shadow-purple-500/30' : 'bg-slate-800 hover:bg-slate-750 border-slate-700 text-slate-400'}`}
                  >
                    {card.isFlipped || card.isMatched ? (
                      <span className="font-bold text-base md:text-lg leading-tight">
                        {card.text}
                      </span>
                    ) : (
                      <Sparkles className="w-7 h-7 text-slate-600 opacity-60" />
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* GAMEOVER */}
          {gameState === 'gameover' && (
            <motion.div
              key="gameover"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-slate-800 border border-slate-700 p-8 md:p-12 rounded-3xl shadow-2xl max-w-xl mx-auto text-center backdrop-blur-xl"
            >
              <div className="w-20 h-20 bg-purple-500/20 border border-purple-500/30 rounded-3xl flex items-center justify-center mx-auto mb-6 text-purple-400">
                <Trophy className="w-10 h-10 animate-bounce" />
              </div>

              <h2 className="text-3xl font-extrabold text-white mb-2">Vaqt Tugadi!</h2>
              <p className="text-slate-400 text-sm mb-6">Ajoyib natija, {playerName}!</p>

              <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 mb-8 flex justify-around">
                <div>
                  <div className="text-xs uppercase font-bold text-slate-400 mb-1">Yakuniy Ball</div>
                  <div className="text-4xl font-black text-purple-400">{score}</div>
                </div>
                <div className="w-px bg-slate-700" />
                <div>
                  <div className="text-xs uppercase font-bold text-slate-400 mb-1">Max Combo</div>
                  <div className="text-4xl font-black text-orange-400">x{combo}</div>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => navigate('/games')}
                  className="flex-1 py-3.5 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-xl transition-all"
                >
                  Chiqish
                </button>
                <button
                  onClick={startGame}
                  className="flex-1 py-3.5 bg-purple-600 hover:bg-purple-500 text-white font-extrabold rounded-xl shadow-lg shadow-purple-500/20 transition-all"
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

export default MatchMaster;
