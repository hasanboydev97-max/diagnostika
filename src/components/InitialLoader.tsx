import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function InitialLoader({ onComplete }: { onComplete: () => void }) {
  const [progress, setProgress] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    const hasLoaded = sessionStorage.getItem('has_loaded_hb');
    if (hasLoaded) {
      onComplete();
      return;
    }

    const duration = 1200;
    const interval = 20;
    const steps = duration / interval;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      const progressRatio = currentStep / steps;
      const easedProgress = 1 - Math.pow(1 - progressRatio, 3); 
      const newProgress = Math.min(100, Math.floor(easedProgress * 100));
      
      setProgress(newProgress);

      if (currentStep >= steps) {
        clearInterval(timer);
        setIsFadingOut(true);
        sessionStorage.setItem('has_loaded_hb', 'true');
        setTimeout(() => {
          onComplete();
        }, 600);
      }
    }, interval);

    return () => clearInterval(timer);
  }, [onComplete]);

  if (sessionStorage.getItem('has_loaded_hb') && progress === 0) {
    return null; 
  }

  return (
    <AnimatePresence>
      {!isFadingOut && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#fdfdfd] text-[#111111]"
        >
          <div className="flex flex-col items-center w-full max-w-[220px] px-4">
            <motion.img 
              src="/logo.png" 
              alt="HB Logo" 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="w-16 h-16 object-contain mb-3 rounded-2xl p-1 bg-white border border-black/5 shadow-sm" 
            />
            
            <motion.h1 
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="font-extrabold text-2xl tracking-wider text-black mb-0.5"
            >
              HB
            </motion.h1>
            
            <p className="text-[11px] font-semibold tracking-[0.25em] text-neutral-400 uppercase mb-6">
              Loading...
            </p>
            
            <div className="w-full h-[2px] bg-black/10 relative overflow-hidden rounded-full mb-3">
              <motion.div 
                className="absolute top-0 left-0 h-full bg-black rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.1, ease: "linear" }}
              />
            </div>
            
            <div className="flex justify-center w-full">
              <span className="text-[10px] font-bold tracking-[0.2em] text-neutral-400 font-mono">
                {progress}%
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
