import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function InitialLoader({ onComplete }: { onComplete: () => void }) {
  const [progress, setProgress] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    // Check if we've already loaded in this session to prevent annoying repeated loaders
    const hasLoaded = sessionStorage.getItem('has_loaded_hb');
    if (hasLoaded) {
      onComplete();
      return;
    }

    const duration = 1200; // 1.2 seconds for a premium, snappy feel
    const interval = 20;
    const steps = duration / interval;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      // Custom easing for progress bar (starts fast, slows down at end)
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
        }, 600); // Wait for fade out animation
      }
    }, interval);

    return () => clearInterval(timer);
  }, [onComplete]);

  // If already loaded in session, don't render anything while unmounting
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
          <div className="flex flex-col items-center w-full max-w-[200px] px-4">
            <h1 className="text-4xl md:text-5xl font-medium tracking-tight mb-8 font-sans">HB.</h1>
            
            <div className="w-full h-[1px] bg-black/10 relative overflow-hidden mb-6">
              <motion.div 
                className="absolute top-0 left-0 h-full bg-black"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.1, ease: "linear" }}
              />
            </div>
            
            <div className="flex justify-center w-full">
              <span className="text-[10px] font-semibold tracking-[0.3em] uppercase text-gray-400 font-mono">
                {progress} %
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
