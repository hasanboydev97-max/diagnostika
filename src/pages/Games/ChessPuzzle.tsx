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
    <div className="min-h-screen text-slate-800 flex flex-col font-sans selection:bg-amber-500 selection:text-white relative overflow-hidden bg-gradient-to-br from-[#FFFDF9] via-[#F8FAFC] to-[#EFF6FF]">
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
            {isMuted ? <VolumeX className="w-4.5 h-4.5 text-rose-500" /> : <Volume2 className="w-4.5 h-4.5 text-amber-600" />}
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex flex-col items-center justify-center flex-1 w-full max-w-4xl mx-auto p-4 md:p-6 relative z-10">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-14 h-14 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="font-extrabold text-slate-700 text-sm uppercase tracking-wider animate-pulse">Chess.com API dan Kun Puzzli Yuklanmoqda...</p>
          </div>
        ) : puzzleData ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-2xl bg-white/95 backdrop-blur-2xl border-2 border-amber-100/90 rounded-3xl p-6 md:p-10 shadow-2xl shadow-amber-100/60 flex flex-col items-center text-center font-sans"
          >
            <div className="w-20 h-20 bg-gradient-to-tr from-amber-400 to-yellow-500 text-slate-950 rounded-3xl flex items-center justify-center text-4xl mb-3.5 shadow-lg shadow-amber-400/25 border-2 border-white">
              ♟️
            </div>

            <h1 className="text-2xl md:text-3xl font-black text-slate-900 mb-1.5">{puzzleData.title}</h1>
            <p className="text-xs text-amber-700 font-bold uppercase tracking-wider mb-6 flex items-center justify-center gap-1.5 bg-amber-50 px-3 py-1 rounded-xl border border-amber-200">
              <Sparkles className="w-4 h-4 text-amber-500" /> Chess.com Kunlik Taktik Masala API
            </p>

            {/* Chess Puzzle Image Preview */}
            <div className="w-full max-w-md bg-slate-50 border-2 border-amber-200/80 rounded-3xl overflow-hidden mb-6 shadow-md p-4 flex flex-col items-center">
              <img
                src={puzzleData.image}
                alt="Chess Puzzle"
                className="w-full h-auto rounded-2xl border border-slate-200 shadow-sm mb-3.5"
              />

              <div className="w-full bg-white p-3 rounded-xl border border-slate-200 text-left shadow-xs">
                <span className="text-[10px] font-black uppercase text-amber-600 block mb-1">FEN POZITSIYA KODI:</span>
                <p className="text-xs font-mono text-slate-600 break-all bg-slate-50 p-2 rounded-lg border border-slate-200">{puzzleData.fen}</p>
              </div>
            </div>

            {/* Hint & Play Actions */}
            <div className="flex flex-col sm:flex-row gap-3.5 w-full max-w-md">
              <button
                onClick={() => setShowHint(!showHint)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider py-3.5 rounded-2xl border border-slate-200 cursor-pointer transition-all active:scale-95"
              >
                {showHint ? 'Maslahatni Bekitish' : '💡 Maslahat Olish'}
              </button>

              <a
                href={puzzleData.url}
                target="_blank"
                rel="noreferrer"
                className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black text-xs uppercase tracking-wider py-3.5 rounded-2xl shadow-md shadow-emerald-500/20 border-b-4 border-emerald-700 active:border-b-0 active:translate-y-1 cursor-pointer flex items-center justify-center gap-2"
              >
                <span>CHESS.COM DA ECHISH</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>

            {showHint && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-5 bg-amber-50 border border-amber-200 p-4 rounded-2xl text-xs text-amber-900 font-medium leading-relaxed max-w-md shadow-xs text-left"
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
