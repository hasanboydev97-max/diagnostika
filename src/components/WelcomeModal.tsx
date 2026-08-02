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
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={containerVariants}
          className={`fixed inset-0 z-50 flex flex-col items-center justify-center p-4 md:p-8 ${modalBg} backdrop-blur-md overflow-y-auto`}
        >
          {/* Subtle star pattern background */}
          <div className="absolute inset-0 opacity-[0.15]" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>
          
          <motion.div variants={itemVariants} className="relative z-10 max-w-3xl w-full text-center space-y-4">
            
            {/* Header */}
            <div className="space-y-4 mb-4 mt-8 md:mt-0">
              <motion.div 
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', damping: 12, stiffness: 150, delay: 0.3 }}
                className={`w-12 h-12 md:w-14 md:h-14 mx-auto rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.15)] border-2 border-white/20 text-white ${isPassed ? 'bg-success' : 'bg-danger'}`}
              >
                {isPassed ? <Trophy size={24} /> : <Frown size={24} />}
              </motion.div>
              
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold tracking-tight text-white drop-shadow-md px-2 leading-tight">
                {isPassed ? 'Umumiy diagnostik xulosa' : 'Diagnostika yakunlandi'}
              </h1>
              <p className="text-xs sm:text-sm md:text-base text-slate-300 max-w-lg mx-auto px-4">
                Uch kirish imtihoni — matematika, ingliz tili va tanqidiy fikrlash
              </p>
            </div>
            
            {/* Info Strip */}
            <motion.div variants={itemVariants} className="flex flex-row justify-center items-center gap-3 sm:gap-6 text-[10px] sm:text-xs md:text-sm text-slate-300 py-3 border-y border-white/10 bg-white/5 backdrop-blur-sm rounded-xl mx-auto max-w-2xl px-2">
              <span className="flex flex-col sm:flex-row sm:items-center">Nomzod: <strong className="text-white font-medium sm:ml-1">{candidateName}</strong></span>
              <span className="flex flex-col sm:flex-row sm:items-center">Sinf: <strong className="text-white font-medium sm:ml-1">{grade}</strong></span>
              <span className="flex flex-col sm:flex-row sm:items-center">Imtihonlar: <strong className="text-white font-medium sm:ml-1">3 fan</strong></span>
            </motion.div>

            {/* Main Result Card */}
            <motion.div variants={itemVariants} className="bg-white/10 border border-white/10 rounded-3xl p-5 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 md:gap-10 backdrop-blur-xl shadow-2xl relative overflow-hidden mt-4 md:mt-8 max-w-3xl mx-auto">
              
              {/* Dynamic Glow */}
              <div className={`absolute -top-32 -left-32 w-64 h-64 rounded-full blur-[80px] opacity-30 pointer-events-none ${isPassed ? 'bg-blue-400' : 'bg-red-500'}`}></div>
              
              <div className="flex-1 w-full relative z-10 flex flex-col items-center md:items-start text-center md:text-left">
                <div className="flex flex-col items-center md:items-start mb-6">
                  <div className="flex items-baseline justify-center md:justify-start gap-1">
                    <motion.span 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1, duration: 0.8 }}
                      className="text-6xl md:text-7xl font-display font-bold text-white tracking-tight leading-none"
                    >
                      {score}
                    </motion.span>
                    <span className="text-2xl md:text-3xl text-slate-400 font-display">/ 100</span>
                  </div>
                  <span className="text-[10px] md:text-xs text-slate-400 uppercase tracking-widest font-bold mt-2">Umumiy natija</span>
                </div>
                
                <div className="flex justify-between w-full pt-5 border-t border-white/10 px-2 sm:px-0 gap-2">
                  {[
                    { label: 'Matematika', val: scores?.math || 0 },
                    { label: 'Ingliz tili', val: scores?.english || 0 },
                    { label: 'T. Fikrlash', val: scores?.critical || 0 }
                  ].map((s, idx) => (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.2 + idx * 0.1 }}
                      className="flex flex-col items-center flex-1"
                    >
                      <div className="text-xl sm:text-2xl font-bold text-white mb-1">{s.val}</div>
                      <div className="text-[8px] sm:text-[10px] text-slate-400 uppercase font-bold tracking-widest text-center leading-tight">
                        {s.label.includes(' ') ? s.label.split(' ').map((w,i)=><div key={i}>{w}</div>) : s.label}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
              
              {/* Decision Box */}
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', delay: 1.5, bounce: 0.5 }}
                className={`relative z-10 shadow-xl px-4 py-5 md:px-8 md:py-8 rounded-[1.5rem] flex flex-col items-center justify-center w-full md:min-w-[280px] md:w-auto border-2 ${isPassed ? 'bg-primary/90 border-blue-400/30 text-white' : 'bg-slate-800/90 border-red-500/30 text-slate-200'}`}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 border-4 shadow-md ${isPassed ? 'bg-success/20 border-success text-success' : 'bg-danger/20 border-danger text-danger'}`}>
                  {isPassed ? <Check strokeWidth={3} size={24} /> : <X strokeWidth={3} size={24} />}
                </div>
                <h3 className={`text-xl font-display font-bold mb-2 tracking-wide ${isPassed ? 'text-white' : 'text-white'}`}>
                  {isPassed ? 'QABUL QILINSIN' : 'QABUL QILINMADI'}
                </h3>
                <p className={`text-xs text-center font-medium leading-relaxed ${isPassed ? 'text-blue-100' : 'text-slate-400'}`}>
                  {isPassed 
                    ? <>ISHONCHLI DARAJA —<br/>QABUL TAVSIYA ETILADI</>
                    : <>YETARLI DARAJA EMAS —<br/>QAYTA URINIB KO'RING</>
                  }
                </p>
              </motion.div>

            </motion.div>

            {/* Action Button */}
            <motion.div variants={itemVariants} className="pt-2 md:pt-4 pb-12 md:pb-0 relative z-10">
              <button 
                onClick={handleClose}
                className="group relative inline-flex items-center justify-center gap-2 md:gap-3 bg-white/10 hover:bg-white border border-white/20 text-white hover:text-slate-900 px-6 py-3 md:px-8 md:py-3 rounded-full font-bold transition-all shadow-lg hover:shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:-translate-y-1 overflow-hidden w-full max-w-xs mx-auto"
              >
                <span className="relative z-10 tracking-widest uppercase text-xs">To'liq hisobotni ko'rish</span>
                <ArrowRight size={16} className="relative z-10 group-hover:translate-x-1 transition-transform" />
              </button>
            </motion.div>
            
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
