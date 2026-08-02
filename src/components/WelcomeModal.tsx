import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Variants } from 'framer-motion';
import confetti from 'canvas-confetti';
import { ArrowRight, CheckCircle, XCircle } from 'lucide-react';
import logo from '../assets/logo.jpg';

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
      const timer = setTimeout(() => {
        const duration = 4 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 45, spread: 360, ticks: 100, zIndex: 9999, colors: ['#2563eb', '#3b82f6', '#60a5fa', '#ffffff'] };

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

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15, delayChildren: 0.1 }
    },
    exit: { opacity: 0, backdropFilter: 'blur(0px)', transition: { duration: 0.5 } }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 120, damping: 20 } }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={containerVariants}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden bg-slate-950/90 backdrop-blur-3xl"
        >
          {/* Animated Premium Aurora Background Blobs */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <motion.div 
              animate={{ rotate: 360, scale: [1, 1.2, 1] }} 
              transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
              className={`absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] rounded-full blur-[120px] opacity-30 mix-blend-screen ${isPassed ? 'bg-blue-600' : 'bg-rose-900'}`}
            />
            <motion.div 
              animate={{ rotate: -360, scale: [1, 1.3, 1] }} 
              transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
              className={`absolute -bottom-[20%] -right-[10%] w-[60vw] h-[60vw] rounded-full blur-[100px] opacity-20 mix-blend-screen ${isPassed ? 'bg-indigo-500' : 'bg-red-800'}`}
            />
            {/* Noise Texture Overlay */}
            <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>
            {/* Premium Subtle Grid */}
            <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_80%,transparent_100%)]"></div>
          </div>
          
          <motion.div className="relative z-10 w-full max-w-4xl mx-auto flex flex-col items-center justify-center min-h-screen py-8 md:py-0">
            
            {/* Logo Area */}
            <motion.div variants={itemVariants} className="relative mb-6 md:mb-8 group flex-shrink-0">
              <div className={`absolute inset-0 rounded-2xl blur-xl opacity-40 group-hover:opacity-70 transition-opacity duration-700 ${isPassed ? 'bg-blue-400' : 'bg-rose-500'}`}></div>
              <div className="relative w-16 h-16 md:w-24 md:h-24 rounded-[1rem] md:rounded-2xl bg-white p-1.5 shadow-[0_0_30px_rgba(255,255,255,0.1)] backdrop-blur-md transform -rotate-3 hover:rotate-0 transition-transform duration-500">
                <img src={logo} alt="School Logo" className="w-full h-full object-contain rounded-xl" />
              </div>
            </motion.div>

            {/* Typography Header */}
            <motion.div variants={itemVariants} className="text-center mb-6 md:mb-10 space-y-3 flex-shrink-0 w-full px-4">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-white to-white/60 tracking-tight leading-none">
                {isPassed ? 'Diagnostik Xulosa' : 'Diagnostika Yakunlandi'}
              </h1>
              <div className="flex flex-wrap justify-center items-center gap-2 md:gap-4 text-[10px] md:text-sm font-medium text-slate-300">
                <span className="px-3 py-1 md:px-4 md:py-1.5 rounded-full bg-white/5 border border-white/5 backdrop-blur-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
                  Nomzod: <span className="text-white font-bold">{candidateName}</span>
                </span>
                <span className="px-3 py-1 md:px-4 md:py-1.5 rounded-full bg-white/5 border border-white/5 backdrop-blur-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
                  Sinf: <span className="text-white font-bold">{grade}</span>
                </span>
              </div>
            </motion.div>

            {/* The Ultimate Glass Card */}
            <motion.div variants={itemVariants} className="w-full max-w-[92%] sm:max-w-[90%] md:max-w-full flex-shrink-0">
              <div className="relative rounded-[1.8rem] md:rounded-[2rem] p-[2px] md:p-1 overflow-hidden bg-gradient-to-b from-white/10 to-white/0 shadow-2xl">
                {/* Inner Glass */}
                <div className="relative rounded-[1.7rem] md:rounded-[1.8rem] bg-slate-900/60 backdrop-blur-xl border border-white/10 overflow-hidden flex flex-col md:flex-row shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]">
                  
                  {/* Left Side: Score Details */}
                  <div className="flex-1 p-5 md:p-12 flex flex-col justify-center relative">
                    <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/5 to-transparent"></div>
                    <div className="relative z-10 flex flex-row items-end justify-center md:justify-start gap-2 md:gap-4 mb-5 md:mb-10">
                      <div className="text-[4.5rem] md:text-[7rem] font-black leading-none text-transparent bg-clip-text bg-gradient-to-b from-white to-white/50 tracking-tighter">
                        {score}
                      </div>
                      <div className="pb-2 md:pb-6 text-base md:text-2xl font-bold text-slate-500 uppercase tracking-widest">
                        / 100
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 md:gap-4 w-full relative z-10">
                      {[
                        { label: 'Matematika', val: scores?.math || 0 },
                        { label: 'Mantiq', val: scores?.logic || 0 },
                        { label: 'Analitik', val: scores?.analytical || 0 }
                      ].map((s, idx) => (
                        <div key={idx} className="flex flex-col items-center justify-center p-3 md:p-4 rounded-xl md:rounded-2xl bg-white/5 border border-white/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] hover:bg-white/10 transition-colors">
                          <span className="text-2xl md:text-3xl font-bold text-white mb-1 leading-none">{s.val}</span>
                          <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-center leading-tight mt-1">{s.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right Side: Decision Panel */}
                  <div className={`w-full md:w-[320px] py-6 px-4 md:p-12 flex flex-col items-center justify-center relative overflow-hidden ${isPassed ? 'bg-gradient-to-br from-blue-600 to-indigo-900' : 'bg-gradient-to-br from-rose-600 to-rose-900'}`}>
                    {/* Inner glowing orb */}
                    <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent"></div>
                    
                    <div className="relative z-10 flex flex-col items-center text-center">
                      <div className={`w-12 h-12 md:w-16 md:h-16 rounded-[1rem] md:rounded-2xl mb-3 md:mb-6 flex items-center justify-center shadow-2xl backdrop-blur-md border ${isPassed ? 'bg-blue-500/30 border-blue-400/50' : 'bg-rose-500/30 border-rose-400/50'}`}>
                        {isPassed ? <CheckCircle className="text-white w-6 h-6 md:w-8 md:h-8" /> : <XCircle className="text-white w-6 h-6 md:w-8 md:h-8" />}
                      </div>
                      
                      <h3 className="text-xl md:text-2xl font-black text-white tracking-tight mb-2 md:mb-3 leading-none">
                        {isPassed ? 'QABUL QILINDI' : 'RAD ETILDI'}
                      </h3>
                      
                      <p className="text-[9px] md:text-xs font-semibold text-white/70 uppercase tracking-widest leading-relaxed px-4">
                        {isPassed 
                          ? 'Ishonchli daraja. Qabul tavsiya etiladi.'
                          : 'Yetarli daraja emas. Qayta urinib ko\'ring.'
                        }
                      </p>
                    </div>
                  </div>

                </div>
              </div>
            </motion.div>

            {/* Premium Ghost Button */}
            <motion.div variants={itemVariants} className="mt-8 md:mt-10 mb-6 md:mb-0 flex-shrink-0">
              <button 
                onClick={handleClose}
                className="group relative px-7 py-3 md:px-8 md:py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full flex items-center gap-2 md:gap-3 overflow-hidden transition-all duration-500 hover:shadow-[0_0_30px_rgba(255,255,255,0.1)] hover:border-white/20 backdrop-blur-sm"
              >
                <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-out"></span>
                <span className="relative z-10 text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] text-white">Batafsil Hisobot</span>
                <ArrowRight className="relative z-10 text-white group-hover:translate-x-1 transition-transform w-3.5 h-3.5 md:w-4 md:h-4" />
              </button>
            </motion.div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
