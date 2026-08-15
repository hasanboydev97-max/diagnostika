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
  { id: 3, title: 'Bayroqlar va Poytaxtlar', gameId: 'flag-quiz', route: '/games/flag-quiz', category: 'logic', targetScore: 70, description: 'REST Countries API bilan dunyo davlatlarini sinang', iconName: '🗺️' },
  { id: 4, title: 'Audio Spelling Bee', gameId: 'spelling-bee', route: '/games/spelling-bee', category: 'languages', targetScore: 80, description: 'Free Dictionary Audio API talaffuzli so\'z terish', iconName: '🎧' },
  { id: 5, title: 'Shaxmat Detektivi (Puzzle)', gameId: 'chess-puzzle', route: '/games/chess-puzzle', category: 'logic', targetScore: 100, description: 'Chess.com API orqali kunlik taktik masalalarni yeching', iconName: '♟️' },
  { id: 6, title: 'Ingliz Lug\'ati Quest', gameId: 'english-words', route: '/games/english-words', category: 'languages', targetScore: 80, description: 'Asosiy inglizcha so\'zlarni tezkor toping', iconName: '🔤' },
  { id: 7, title: 'Formulalar Sirli Olami', gameId: 'formula-chain', route: '/games/formula-chain', category: 'math', targetScore: 100, description: 'Fizika va matematika formulalarini yig\'ing', iconName: '🧪' },
  { id: 8, title: 'Juftliklar Topish', gameId: 'match-master', route: '/games/match-master', category: 'logic', targetScore: 100, description: 'Flip kartalardan juftliklarni toping', iconName: '🧩' },
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
    <div className="w-full relative min-h-[850px] bg-gradient-to-b from-[#F0F5FF] via-[#FAF5FF] to-[#FFFBEB] rounded-3xl p-4 md:p-8 overflow-hidden shadow-xl border-2 border-indigo-100/90 font-sans text-slate-800">
      {/* Background Soft Pastel Orbs */}
      <div className="absolute inset-0 z-0 opacity-40 pointer-events-none">
        <div className="absolute top-10 left-10 w-72 h-72 bg-blue-200/50 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-purple-200/50 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-200/40 rounded-full blur-3xl" />
      </div>

      {/* Level Map Header Stats (Light Mode Premium) */}
      <div className="relative z-10 flex flex-wrap justify-between items-center bg-white/95 backdrop-blur-xl border border-indigo-100/90 p-4.5 rounded-2xl mb-8 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 bg-gradient-to-tr from-amber-400 to-yellow-500 rounded-2xl flex items-center justify-center shadow-md shadow-amber-400/25 text-slate-950 font-black text-xl border-2 border-white">
            <Crown className="w-6 h-6 text-slate-950 fill-slate-950" />
          </div>
          <div>
            <h2 className="text-lg font-black tracking-tight text-slate-900 flex items-center gap-1.5">
              Sarguzasht Xaritasi <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
            </h2>
            <p className="text-xs text-slate-500 font-medium">Bosqichlarni ketma-ket zabt eting va yulduzlarni yig'ing!</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 mt-2 sm:mt-0">
          <div className="bg-amber-50 border border-amber-200/90 px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 text-amber-900 font-bold text-xs shadow-xs">
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span>{totalStars} / {STAGES.length * 3} YULDUZ</span>
          </div>
          <div className="bg-indigo-50 border border-indigo-200/90 px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 text-indigo-900 font-bold text-xs shadow-xs">
            <Trophy className="w-4 h-4 text-indigo-600" />
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
            stroke="rgba(99, 102, 241, 0.35)"
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
                  <div className="bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 px-3 py-1 rounded-full font-black text-[11px] uppercase tracking-wider shadow-md flex items-center gap-1 border-2 border-white">
                    <span>Siz shu yerdasiz</span>
                    <MapPin className="w-3.5 h-3.5 fill-slate-950" />
                  </div>
                  <div className="w-0 h-0 border-l-6 border-r-6 border-t-8 border-l-transparent border-r-transparent border-t-amber-400" />
                </motion.div>
              )}

              {/* Node Circle Button */}
              <motion.button
                whileHover={{ scale: isUnlocked ? 1.08 : 1 }}
                whileTap={{ scale: isUnlocked ? 0.95 : 1 }}
                onClick={() => {
                  if (isUnlocked) {
                    setSelectedStage(stage);
                  }
                }}
                className={`w-20 h-20 rounded-full flex flex-col items-center justify-center relative cursor-pointer shadow-lg transition-all border-4 ${
                  isCurrent
                    ? 'bg-gradient-to-tr from-amber-400 via-yellow-400 to-amber-500 border-white text-slate-950 ring-6 ring-amber-400/40 shadow-amber-400/40'
                    : isUnlocked
                    ? 'bg-gradient-to-tr from-indigo-500 to-purple-600 border-white text-white hover:border-amber-300 shadow-indigo-400/25'
                    : 'bg-slate-100 border-slate-300 text-slate-400 cursor-not-allowed shadow-xs'
                } ${isSelected ? 'ring-4 ring-indigo-500' : ''}`}
              >
                {isUnlocked ? (
                  <>
                    <span className="text-xl font-black">{stage.id}</span>
                    <span className="text-xs">{stage.iconName}</span>
                  </>
                ) : (
                  <Lock className="w-6 h-6 text-slate-400" />
                )}

                {/* Stars Display on Node */}
                {isUnlocked && (
                  <div className="absolute -bottom-3 flex gap-0.5 bg-white px-2 py-0.5 rounded-full border border-slate-200 shadow-xs">
                    {[1, 2, 3].map((starIdx) => (
                      <Star
                        key={starIdx}
                        className={`w-3 h-3 ${
                          starIdx <= stars
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-slate-200 fill-slate-200'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </motion.button>

              {/* Node Title Label */}
              <div className={`mt-3 text-center px-3 py-1 rounded-xl text-xs font-bold transition-colors shadow-xs ${
                isCurrent ? 'bg-amber-100/90 border border-amber-300 text-amber-900' : 'bg-white/90 border border-slate-200 text-slate-700'
              }`}>
                {stage.title}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Stage Bottom Drawer Bar (Light Mode Style) */}
      <AnimatePresence>
        {selectedStage && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="sticky bottom-4 z-30 max-w-xl mx-auto bg-white/95 backdrop-blur-2xl border-2 border-indigo-200 rounded-3xl p-5 shadow-2xl shadow-indigo-100/70 flex flex-col sm:flex-row items-center justify-between gap-4 mt-8"
          >
            <div className="flex items-center gap-4">
              <div className="w-13 h-13 bg-gradient-to-tr from-amber-400 to-yellow-500 rounded-2xl flex items-center justify-center text-slate-950 font-black text-2xl shadow-md shadow-amber-400/20 border-2 border-white">
                {selectedStage.iconName}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-amber-400 text-slate-950 text-[10px] font-black uppercase px-2 py-0.5 rounded-md">
                    BOSQICH {selectedStage.id}
                  </span>
                  <h3 className="font-extrabold text-sm text-slate-900">{selectedStage.title}</h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">{selectedStage.description}</p>
                <div className="text-[11px] font-bold text-amber-700 mt-1 flex items-center gap-1">
                  <Trophy className="w-3.5 h-3.5 text-amber-500" /> Maqsad: {selectedStage.targetScore} ball to'plash
                </div>
              </div>
            </div>

            <button
              onClick={() => navigate(selectedStage.route)}
              className="w-full sm:w-auto bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 text-slate-950 font-black text-xs uppercase tracking-wider px-6 py-3.5 rounded-2xl shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 border-b-4 border-amber-700 active:border-b-0 active:translate-y-1 cursor-pointer transition-all hover:brightness-105"
            >
              <span>BOSQICHNI BOSHLASH</span>
              <Play className="w-3.5 h-3.5 fill-slate-950" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default QuestLevelMap;
