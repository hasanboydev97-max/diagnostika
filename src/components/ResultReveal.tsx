import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Trophy, ArrowRight, BookOpen } from 'lucide-react';
import MagicButton from './MagicButton';

interface ResultRevealProps {
  score: number;
  threshold?: number;
  onClose: () => void;
}

export default function ResultReveal({ score, threshold = 65, onClose }: ResultRevealProps) {
  const [isVisible, setIsVisible] = useState(true);
  const isPassed = score >= threshold;

  useEffect(() => {
    // Disable body scroll when modal is open
    document.body.style.overflow = 'hidden';
    
    if (isPassed) {
      // Trigger massive confetti after a short delay for drama
      const timer = setTimeout(() => {
        const duration = 3.5 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 };

        const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

        const interval = setInterval(function() {
          const timeLeft = animationEnd - Date.now();

          if (timeLeft <= 0) {
            return clearInterval(interval);
          }

          const particleCount = 50 * (timeLeft / duration);
          confetti({
            ...defaults, particleCount,
            origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
          });
          confetti({
            ...defaults, particleCount,
            origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
          });
        }, 250);
      }, 500);

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
    }, 800); // wait for exit animation
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
          transition={{ duration: 0.8 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-xl p-4"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 1.1, opacity: 0, y: -50 }}
            transition={{ type: 'spring', damping: 25, stiffness: 120, delay: 0.2 }}
            className={`w-full max-w-lg bg-white rounded-[2rem] p-8 md:p-12 shadow-[0_0_100px_rgba(0,0,0,0.5)] flex flex-col items-center text-center relative overflow-hidden ${isPassed ? 'border-4 border-white/20' : 'border border-slate-200'}`}
          >
            {/* Background Glow inside modal */}
            <div className={`absolute -top-24 -left-24 w-56 h-56 rounded-full blur-3xl opacity-40 pointer-events-none ${isPassed ? 'bg-primary' : 'bg-slate-300'}`}></div>
            <div className={`absolute -bottom-24 -right-24 w-56 h-56 rounded-full blur-3xl opacity-40 pointer-events-none ${isPassed ? 'bg-success' : 'bg-slate-200'}`}></div>

            {/* Icon */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', damping: 15, stiffness: 120, delay: 0.5 }}
              className={`w-28 h-28 rounded-full flex items-center justify-center mb-8 shadow-2xl z-10 ${isPassed ? 'bg-gradient-to-br from-primary to-blue-600 text-white border-4 border-white' : 'bg-gradient-to-br from-slate-100 to-slate-200 text-slate-500 border-4 border-white'}`}
            >
              {isPassed ? <Trophy size={48} strokeWidth={1.5} /> : <BookOpen size={48} strokeWidth={1.5} />}
            </motion.div>

            {/* Content */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="z-10 w-full"
            >
              <h2 className={`text-4xl font-display font-bold mb-4 ${isPassed ? 'text-neutral-main' : 'text-neutral-main'}`}>
                {isPassed ? 'Tabriklaymiz!' : 'Natijalar tayyor'}
              </h2>
              
              <div className="bg-slate-50/80 backdrop-blur-sm rounded-2xl p-6 mb-8 border border-slate-100">
                <p className="text-[17px] text-neutral-secondary leading-relaxed font-medium">
                  {isPassed 
                    ? 'Siz barcha sinovlardan muvaffaqiyatli o\'tdingiz. Ko\'rsatkichlaringiz juda yuqori darajada!' 
                    : 'Sizning natijalaringiz hisoblandi. Kuchli tomonlaringiz va rivojlanish nuqtalaringiz bilan tanishing.'}
                </p>
              </div>

              <div className="flex justify-center">
                <MagicButton
                  onClick={handleClose}
                  label="Tafsilotlarni ko'rish"
                  icon={<ArrowRight />}
                />
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
