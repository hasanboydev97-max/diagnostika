import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X } from 'lucide-react';

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      const dismissed = localStorage.getItem('pwa_prompt_dismissed');
      if (!dismissed) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowPrompt(false);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa_prompt_dismissed', 'true');
  };

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.95 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="fixed bottom-6 right-6 left-6 md:left-auto md:max-w-sm z-[999] bg-white/95 text-neutral-900 backdrop-blur-2xl border border-black/10 p-3.5 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.12)] flex items-center justify-between gap-3 group"
        >
          <div className="flex items-center gap-3 min-w-0">
            <img src="/logo.png" alt="HB Logo" className="h-9 md:h-11 w-auto object-contain flex-shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 font-bold text-xs md:text-sm tracking-tight text-neutral-900">
                <span className="truncate">HB Diagnostikasi</span>
                <span className="bg-black/5 text-neutral-600 text-[9px] font-bold px-1.5 py-0.5 rounded font-mono uppercase tracking-wider">PWA</span>
              </div>
              <p className="text-[11px] text-neutral-500 truncate">Telefonga yoki kompyuterga o'rnating</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={handleInstallClick}
              className="bg-black text-white hover:bg-neutral-800 text-[11px] font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-md transition-all hover:scale-105 active:scale-95 uppercase tracking-wider"
            >
              <Download className="w-3.5 h-3.5" />
              <span>O'rnatish</span>
            </button>
            <button
              onClick={handleDismiss}
              className="text-neutral-400 hover:text-neutral-900 p-1.5 rounded-lg hover:bg-black/5 transition-colors"
              title="Yopish"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
