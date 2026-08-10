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
      // Only show if not dismissed recently
      const dismissed = localStorage.getItem('pwa_prompt_dismissed');
      if (!dismissed) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Also check if app is running standalone (already installed)
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
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-[999] bg-neutral-900/90 text-white backdrop-blur-xl border border-white/20 p-4 rounded-2xl shadow-2xl flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="HB Logo" className="w-11 h-11 rounded-xl object-contain bg-white/10 p-1 border border-white/20" />
            <div>
              <div className="flex items-center gap-1.5 font-bold text-sm tracking-tight">
                <span>HB Diagnostikasi</span>
                <span className="bg-primary/20 text-primary text-[10px] px-1.5 py-0.5 rounded font-mono uppercase">App</span>
              </div>
              <p className="text-xs text-neutral-400">Mobil va kompyuterga ilova sifatida o'rnating</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleInstallClick}
              className="bg-primary text-black hover:bg-primary/90 text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-lg transition-transform active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>O'rnatish</span>
            </button>
            <button
              onClick={handleDismiss}
              className="text-neutral-400 hover:text-white p-1 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
