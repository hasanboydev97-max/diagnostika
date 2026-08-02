import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Variants } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Trophy, ArrowRight, Frown, Check, X } from 'lucide-react';

interface WelcomeModalProps {
  score: number;
  threshold?: number;
  onClose: () => void;
  candidateName: string;
  grade: string;
  scores: any;
}

export default function WelcomeModal({ 
  score, 
  threshold = 65, 
  onClose,
  candidateName,
  grade,
  scores
}: WelcomeModalProps) {
  const [isVisible, setIsVisible] = useState(true);
  const isPassed = score >= threshold;

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    
    if (isPassed) {
      // Confetti animation
      const timer = setTimeout(() => {
        const duration = 4 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 35, spread: 360, ticks: 60, zIndex: 9999 };

        const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

        const interval = setInterval(function() {
          const timeLeft = animationEnd - Date.now();

          if (timeLeft <= 0) {
            return clearInterval(interval);
          }

          const particleCount = 60 * (timeLeft / duration);
          confetti({
            ...defaults, particleCount,
            origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
          });
          confetti({
            ...defaults, particleCount,
            origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
          });
        }, 250);
      }, 600);

      return () => {
        clearTimeout(timer);
        document.body.style.overflow = 'unset';
      };
    } else {
      return () => {
        document.body.style.overflow = 'unset';
      };
    }
  }, [isPassed]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      document.body.style.overflow = 'unset';
      onClose();
    }, 600);
  };

  // Variants for staggered animations
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2, delayChildren: 0.1 }
    },
    exit: { opacity: 0, transition: { duration: 0.4 } }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100, damping: 15 } }
  };

  const modalBg = isPassed 
    ? "bg-gradient-to-b from-[#0f172a] to-[#1e3a8a]/40" 
    : "bg-gradient-to-b from-[#0f172a] to-[#7f1d1d]/30";

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm overflow-y-auto"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
            className="w-full max-w-sm sm:max-w-md bg-slate-900/95 border border-slate-700 rounded-[2rem] shadow-2xl overflow-hidden relative backdrop-blur-xl my-8"
          >
            {/* Dynamic Subtle Glow */}
            <div className={`absolute -top-32 -right-32 w-64 h-64 rounded-full blur-[80px] opacity-20 pointer-events-none ${isPassed ? 'bg-success' : 'bg-danger'}`}></div>

            {/* Header */}
            <div className="pt-8 px-6 pb-4 text-center relative z-10">
              <div className={`mx-auto w-14 h-14 rounded-2xl mb-4 flex items-center justify-center border ${isPassed ? 'bg-success/10 text-success border-success/20' : 'bg-danger/10 text-danger border-danger/20'}`}>
                {isPassed ? <Trophy size={24} /> : <Frown size={24} />}
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-1.5 tracking-tight">Diagnostik xulosa</h2>
              <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-slate-400 font-medium">
                <span className="text-slate-200">{candidateName}</span>
                <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                <span>{grade}</span>
                <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                <span>3 fan</span>
              </div>
            </div>

            {/* Scores Area */}
            <div className="px-5 sm:px-6 py-2 relative z-10">
              <div className="bg-slate-800/60 rounded-[1.5rem] border border-slate-700/50 p-5 flex items-center justify-between">
                {/* Total Score */}
                <div className="flex flex-col justify-center">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">Umumiy ball</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-5xl sm:text-6xl font-bold text-white leading-none tracking-tight">{score}</span>
                    <span className="text-sm text-slate-500 font-bold">/100</span>
                  </div>
                </div>

                {/* Divider */}
                <div className="w-px h-16 bg-slate-700/50 mx-4 sm:mx-6"></div>

                {/* Subjects */}
                <div className="flex flex-col gap-2.5 flex-1">
                  <div className="flex justify-between items-center text-xs sm:text-sm">
                    <span className="text-slate-400 font-medium">Matematika</span>
                    <span className="text-white font-bold">{scores?.math || 0}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs sm:text-sm">
                    <span className="text-slate-400 font-medium">Ingliz tili</span>
                    <span className="text-white font-bold">{scores?.english || 0}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs sm:text-sm">
                    <span className="text-slate-400 font-medium">T. Fikrlash</span>
                    <span className="text-white font-bold">{scores?.critical || 0}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Decision Pill */}
            <div className="px-5 sm:px-6 pt-4 pb-6 relative z-10">
              <div className={`w-full py-3.5 rounded-xl flex items-center justify-center gap-2.5 font-bold text-sm tracking-wide ${isPassed ? 'bg-success/10 text-success border border-success/20' : 'bg-danger/10 text-danger border border-danger/20'}`}>
                {isPassed ? <Check size={18} strokeWidth={2.5} /> : <X size={18} strokeWidth={2.5} />}
                {isPassed ? 'QABUL QILINISHI TAVSIYA ETILADI' : 'YETARLI DARAJA EMAS'}
              </div>
            </div>

            {/* Action Button */}
            <div className="p-4 sm:p-5 bg-slate-800/40 border-t border-slate-700/50 relative z-10">
              <button onClick={handleClose} className="w-full bg-white text-slate-900 py-3.5 sm:py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-100 active:scale-[0.98] transition-all">
                To'liq hisobotni ko'rish <ArrowRight size={18} />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
