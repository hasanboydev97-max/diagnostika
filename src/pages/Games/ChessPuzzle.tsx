import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ExternalLink, Volume2, VolumeX, Sparkles } from 'lucide-react';
import MeshGradient from '../../components/ui/MeshGradient';
import { gameSound } from '../../utils/gameSound';
import { fetchDailyChessPuzzle, type ChessPuzzleData } from '../../services/chessPuzzleService';

export const ChessPuzzle = () => {
  const navigate = useNavigate();
  const [puzzleData, setPuzzleData] = useState<ChessPuzzleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(gameSound.getMuted());
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    fetchDailyChessPuzzle().then(data => {
      setPuzzleData(data);
      setLoading(false);
    });
  }, []);

  const toggleSound = () => {
    setIsMuted(gameSound.toggleMute());
  };

  return (
    <div className="min-h-screen text-slate-900 flex flex-col font-sans selection:bg-indigo-600 selection:text-white relative overflow-hidden bg-[#0F172A]">
      <MeshGradient />

      {/* Header */}
      <header className="relative z-20 flex justify-between items-center px-4 md:px-8 py-4 border-b border-white/10 bg-slate-900/80 backdrop-blur-xl shadow-lg">
        <button
          onClick={() => navigate('/games')}
          className="h-11 px-4 bg-white/10 border border-white/20 text-white rounded-2xl flex items-center gap-2 hover:bg-white/20 transition-all font-bold text-xs uppercase tracking-wider"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>PORTAL</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleSound}
            className="w-11 h-11 bg-white/10 border border-white/20 text-white rounded-2xl flex items-center justify-center hover:bg-white/20 transition-all"
          >
            {isMuted ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5 text-emerald-400" />}
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex flex-col items-center justify-center flex-1 w-full max-w-4xl mx-auto p-4 md:p-6 relative z-10 text-white">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="font-extrabold text-white text-sm uppercase tracking-wider animate-pulse">Chess.com API dan Kun Puzzli Yuklanmoqda...</p>
          </div>
        ) : puzzleData ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-2xl bg-slate-900/90 backdrop-blur-2xl border-2 border-amber-400/40 rounded-3xl p-6 md:p-10 shadow-2xl flex flex-col items-center text-center font-sans"
          >
            <div className="w-20 h-20 bg-gradient-to-tr from-amber-400 to-yellow-500 text-slate-950 rounded-3xl flex items-center justify-center text-4xl mb-4 shadow-xl shadow-amber-400/30 border-2 border-white">
              ♟️
            </div>

            <h1 className="text-3xl font-black text-white mb-2">{puzzleData.title}</h1>
            <p className="text-xs text-amber-300 font-bold uppercase tracking-wider mb-6 flex items-center justify-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" /> Chess.com Kunlik Taktik Masala API
            </p>

            {/* Chess Puzzle Image / Board Preview */}
            <div className="w-full max-w-md bg-slate-950 border-4 border-amber-400/60 rounded-3xl overflow-hidden mb-6 shadow-2xl p-4 flex flex-col items-center">
              <img
                src={puzzleData.image}
                alt="Chess Puzzle"
                className="w-full h-auto rounded-2xl border border-white/20 shadow-md mb-4"
              />

              <div className="w-full bg-slate-900 p-3 rounded-xl border border-white/10 text-left">
                <span className="text-[10px] font-black uppercase text-amber-400 block mb-1">FEN POZITSIYA KODI:</span>
                <p className="text-xs font-mono text-slate-300 break-all bg-slate-950 p-2 rounded-lg border border-slate-800">{puzzleData.fen}</p>
              </div>
            </div>

            {/* Hint & Play Actions */}
            <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
              <button
                onClick={() => setShowHint(!showHint)}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider py-4 rounded-2xl border border-white/20 cursor-pointer transition-all"
              >
                {showHint ? 'Maslahatni Bekitish' : '💡 Maslahat Olish'}
              </button>

              <a
                href={puzzleData.url}
                target="_blank"
                rel="noreferrer"
                className="flex-1 bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 font-black text-xs uppercase tracking-wider py-4 rounded-2xl shadow-xl shadow-emerald-500/20 border-b-4 border-emerald-700 active:border-b-0 active:translate-y-1 cursor-pointer flex items-center justify-center gap-2"
              >
                <span>CHESS.COM DA ECHISH</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>

            {showHint && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 bg-amber-400/20 border border-amber-400/40 p-4 rounded-2xl text-xs text-amber-200 font-medium leading-relaxed max-w-md"
              >
                💡 <b>Taktik maslahat:</b> Eng birinchi shoh berish (Check), sipohni yutish (Capture) yoki xavfli hujum yurishlarini hisoblang!
              </motion.div>
            )}
          </motion.div>
        ) : null}
      </div>
    </div>
  );
};

export default ChessPuzzle;
