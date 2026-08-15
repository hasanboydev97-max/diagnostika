import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Star, Play, Trophy, Sparkles, MapPin, Crown } from 'lucide-react';

interface LevelStage {
  id: number;
  title: string;
  gameId: string;
  route: string;
  category: 'math' | 'logic' | 'languages';
  targetScore: number;
  description: string;
  iconName: string;
}

const STAGES: LevelStage[] = [
  { id: 1, title: 'Global Live Trivia Duel', gameId: 'global-trivia', route: '/games/global-trivia', category: 'logic', targetScore: 60, description: 'Open Trivia API orqali fanlar va IT bo\'yicha jonli duel!', iconName: '🌍' },
  { id: 2, title: 'Math Ninja Arcade', gameId: 'math-ninja', route: '/games/math-ninja', category: 'math', targetScore: 80, description: '3D plitkalar va maskot bilan tezkor matematik hisob', iconName: '🥷' },
  { id: 3, title: 'Shaxmat Detektivi (Puzzle)', gameId: 'chess-puzzle', route: '/games/chess-puzzle', category: 'logic', targetScore: 100, description: 'Chess.com API orqali kunlik taktik masalalarni yeching', iconName: '♟️' },
  { id: 4, title: 'Ingliz Lug\'ati Quest', gameId: 'english-words', route: '/games/english-words', category: 'languages', targetScore: 80, description: 'Asosiy inglizcha so\'zlarni tezkor toping', iconName: '🔤' },
  { id: 5, title: 'Formulalar Sirli Olami', gameId: 'formula-chain', route: '/games/formula-chain', category: 'math', targetScore: 100, description: 'Fizika va matematika formulalarini yig\'ing', iconName: '🧪' },
  { id: 6, title: 'Rus Tili Qadami', gameId: 'russian-words', route: '/games/russian-words', category: 'languages', targetScore: 90, description: 'Ruscha kundalik so\'zlarni sinang', iconName: '🇷🇺' },
  { id: 7, title: 'Juftliklar Topish', gameId: 'match-master', route: '/games/match-master', category: 'logic', targetScore: 100, description: 'Flip kartalardan juftliklarni toping', iconName: '🧩' },
  { id: 8, title: 'Detektiv: Xato Izlab', gameId: 'mistake-inspector', route: '/games/mistake-inspector', category: 'logic', targetScore: 110, description: 'Hisobdagi mantiqiy xatoni toping', iconName: '🔍' },
  { id: 9, title: 'Global Trivia Master', gameId: 'global-trivia', route: '/games/global-trivia', category: 'logic', targetScore: 130, description: 'Qiyin darajadagi dunyo bilimlar testi', iconName: '🚀' },
  { id: 10, title: 'Ninja Master Boss Level', gameId: 'math-ninja', route: '/games/math-ninja', category: 'math', targetScore: 150, description: 'Chaqqonlik va chaqmoq tezligidagi oxirgi bosqich', iconName: '👑' }
];

export const QuestLevelMap = () => {
  const navigate = useNavigate();
  const [unlockedLevel, setUnlockedLevel] = useState<number>(1);
  const [levelStars, setLevelStars] = useState<Record<number, number>>({});
  const [selectedStage, setSelectedStage] = useState<LevelStage>(STAGES[0]);

  useEffect(() => {
    try {
      const savedProgress = localStorage.getItem('hb_game_journey_progress');
      if (savedProgress) {
        const parsed = JSON.parse(savedProgress);
        setUnlockedLevel(parsed.unlockedLevel || 1);
        setLevelStars(parsed.levelStars || {});
      }
    } catch (_) {}
  }, []);

  const totalStars = Object.values(levelStars).reduce((acc, curr) => acc + curr, 0);

  // Generate S-curve winding coordinates for stage nodes
  const getNodePosition = (index: number) => {
    const xOffsets = [50, 75, 80, 50, 25, 20, 50, 80, 75, 50];
    const x = xOffsets[index % xOffsets.length];
    return { x };
  };

  return (
    <div className="w-full relative min-h-[850px] bg-gradient-to-b from-indigo-900 via-purple-900 to-slate-950 rounded-3xl p-4 md:p-8 overflow-hidden shadow-2xl border border-white/20 text-white font-sans">
      {/* Background Magical Atmosphere */}
      <div className="absolute inset-0 z-0 opacity-40 pointer-events-none">
        <div className="absolute top-10 left-10 w-48 h-48 bg-pink-500/30 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-64 h-64 bg-purple-500/30 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl" />
      </div>

      {/* Level Map Header Stats */}
      <div className="relative z-10 flex flex-wrap justify-between items-center bg-white/10 backdrop-blur-xl border border-white/20 p-4 rounded-2xl mb-8 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-tr from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/30 text-white font-black text-xl">
            <Crown className="w-7 h-7 text-white fill-white" />
          </div>
          <div>
            <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
              Sarguzasht Xaritasi <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
            </h2>
            <p className="text-xs text-purple-200 font-medium">Bosqichlarni ketma-ket zabt eting va yulduzlarni yig'ing!</p>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-2 sm:mt-0">
          <div className="bg-amber-500/20 border border-amber-400/40 px-4 py-2 rounded-xl flex items-center gap-2 text-amber-300 font-bold text-xs">
            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
            <span>{totalStars} / {STAGES.length * 3} YULDUZ</span>
          </div>
          <div className="bg-indigo-500/20 border border-indigo-400/40 px-4 py-2 rounded-xl flex items-center gap-2 text-indigo-200 font-bold text-xs">
            <Trophy className="w-4 h-4 text-indigo-400" />
            <span>BOSQICH {unlockedLevel}/{STAGES.length}</span>
          </div>
        </div>
      </div>

      {/* Dynamic S-Curve Path Container */}
      <div className="relative z-10 max-w-lg mx-auto py-8 flex flex-col items-center gap-12">
        {/* SVG Path Connecting Nodes */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" overflow="visible">
          <path
            d={STAGES.map((_, i) => {
              const pos = getNodePosition(i);
              const y = i * 110 + 40;
              return `${i === 0 ? 'M' : 'L'} ${pos.x}% ${y}`;
            }).join(' ')}
            fill="none"
            stroke="rgba(255, 255, 255, 0.25)"
            strokeWidth="8"
            strokeDasharray="10 8"
            strokeLinecap="round"
          />
        </svg>

        {/* Stage Nodes */}
        {STAGES.map((stage, idx) => {
          const isUnlocked = stage.id <= unlockedLevel;
          const isCurrent = stage.id === unlockedLevel;
          const stars = levelStars[stage.id] || 0;
          const pos = getNodePosition(idx);
          const isSelected = selectedStage.id === stage.id;

          return (
            <div
              key={stage.id}
              style={{ marginLeft: `${(pos.x - 50) * 1.5}%` }}
              className="relative z-10 flex flex-col items-center"
            >
              {/* Floating Character Pin on Current Level */}
              {isCurrent && (
                <motion.div
                  initial={{ y: -10 }}
                  animate={{ y: [-10, 2, -10] }}
                  transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                  className="absolute -top-14 z-20 flex flex-col items-center"
                >
                  <div className="bg-gradient-to-tr from-amber-400 to-amber-500 text-slate-950 px-3 py-1 rounded-full font-black text-[11px] uppercase tracking-wider shadow-lg flex items-center gap-1 border border-white">
                    <span>Siz shu yerdasiz</span>
                    <MapPin className="w-3.5 h-3.5 fill-slate-950" />
                  </div>
                  <div className="w-0 h-0 border-l-6 border-r-6 border-t-8 border-l-transparent border-r-transparent border-t-amber-400" />
                </motion.div>
              )}

              {/* Node Circle Button */}
              <motion.button
                whileHover={{ scale: isUnlocked ? 1.1 : 1 }}
                whileTap={{ scale: isUnlocked ? 0.95 : 1 }}
                onClick={() => {
                  if (isUnlocked) {
                    setSelectedStage(stage);
                  }
                }}
                className={`w-20 h-20 rounded-full flex flex-col items-center justify-center relative cursor-pointer shadow-2xl transition-all border-4 ${
                  isCurrent
                    ? 'bg-gradient-to-tr from-amber-400 via-amber-300 to-yellow-500 border-white text-slate-950 ring-8 ring-amber-400/40 shadow-amber-500/50'
                    : isUnlocked
                    ? 'bg-gradient-to-tr from-indigo-500 to-purple-600 border-white/80 text-white hover:border-amber-300 shadow-purple-500/30'
                    : 'bg-slate-800/80 border-slate-700 text-slate-500 cursor-not-allowed'
                } ${isSelected ? 'ring-4 ring-white' : ''}`}
              >
                {isUnlocked ? (
                  <>
                    <span className="text-xl font-black">{stage.id}</span>
                    <span className="text-xs">{stage.iconName}</span>
                  </>
                ) : (
                  <Lock className="w-7 h-7 text-slate-500" />
                )}

                {/* Stars Display on Node */}
                {isUnlocked && (
                  <div className="absolute -bottom-3 flex gap-0.5 bg-slate-950/80 px-2 py-0.5 rounded-full border border-white/20">
                    {[1, 2, 3].map((starIdx) => (
                      <Star
                        key={starIdx}
                        className={`w-3 h-3 ${
                          starIdx <= stars
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-slate-600 fill-slate-600'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </motion.button>

              {/* Node Title Label */}
              <div className={`mt-3 text-center px-3 py-1 rounded-xl text-xs font-bold transition-colors backdrop-blur-md ${
                isCurrent ? 'bg-amber-400/20 border border-amber-400/40 text-amber-300' : 'bg-white/5 border border-white/10 text-slate-300'
              }`}>
                {stage.title}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Stage Bottom Drawer Bar */}
      <AnimatePresence>
        {selectedStage && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="sticky bottom-4 z-30 max-w-xl mx-auto bg-slate-900/95 backdrop-blur-2xl border-2 border-amber-400/60 rounded-3xl p-5 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4 mt-8"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-tr from-amber-400 to-yellow-500 rounded-2xl flex items-center justify-center text-slate-950 font-black text-2xl shadow-lg shadow-amber-500/20">
                {selectedStage.iconName}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-amber-400 text-slate-950 text-[10px] font-black uppercase px-2 py-0.5 rounded-md">
                    BOSQICH {selectedStage.id}
                  </span>
                  <h3 className="font-extrabold text-sm text-white">{selectedStage.title}</h3>
                </div>
                <p className="text-xs text-slate-300 mt-1 font-medium">{selectedStage.description}</p>
                <div className="text-[11px] font-bold text-amber-300 mt-1 flex items-center gap-1">
                  <Trophy className="w-3.5 h-3.5 text-amber-400" /> Maqsad: {selectedStage.targetScore} ball to'plash
                </div>
              </div>
            </div>

            <button
              onClick={() => navigate(selectedStage.route)}
              className="w-full sm:w-auto bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 text-slate-950 font-black text-xs uppercase tracking-wider px-6 py-4 rounded-2xl shadow-xl shadow-amber-500/30 flex items-center justify-center gap-2 border-b-4 border-amber-700 active:border-b-0 active:translate-y-1 cursor-pointer transition-all hover:brightness-110"
            >
              <span>BOSQICHNI BOSHLASH</span>
              <Play className="w-4 h-4 fill-slate-950" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default QuestLevelMap;
