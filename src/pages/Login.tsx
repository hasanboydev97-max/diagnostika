import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Lock, ArrowRight, Activity, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../lib/db';
import MeshGradient from '../components/ui/MeshGradient';

export default function Login() {
  const [id, setId] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(-1);
  const navigate = useNavigate();

  const loadingSteps = [
    "Shaxsiy ma'lumotlar ulanmoqda...",
    "Kognitiv javoblar tahlili...",
    "Neyrotarmoq AI xulosasi yozilmoqda..."
  ];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (id === 'admin') {
      if (pin === '7777') {
        navigate('/admin');
      } else {
        setError("Admin paroli xato. Ruxsat etilmadi.");
      }
      return;
    }
    
    if (!pin) {
      setError("Parolni (PIN) kiriting");
      return;
    }
    
    setIsLoading(true);
    
    try {
      const result = await db.getResult(id);
      
      if (result) {
        if (result.pin && result.pin !== pin) {
          setError("Kiritilgan Parol (PIN) xato.");
          setIsLoading(false);
        } else {
          // Intrigue Loading Sequence
          setLoadingStep(0);
          setTimeout(() => setLoadingStep(1), 1800);
          setTimeout(() => setLoadingStep(2), 3600);
          setTimeout(() => {
            navigate('/summary/' + id);
          }, 4500);
        }
      } else {
        setError("Bunday Login (ID) ga ega natija topilmadi.");
        setIsLoading(false);
      }
    } catch (err) {
      setError("Tizimda xatolik yuz berdi. Iltimos qayta urinib ko'ring.");
      setIsLoading(false);
    }
  };

  if (loadingStep >= 0) {
    return (
      <div className="min-h-screen bg-[#fdfdfd] flex flex-col items-center justify-center p-6 relative font-sans text-[#111111] overflow-hidden">
        
        <div className="z-10 w-full max-w-sm">
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="bg-white border border-black/10 rounded-none p-6 md:p-8"
          >
            <div className="flex flex-col items-center text-center mb-8">
              <div className="relative w-16 h-16 mb-6">
                <div className="absolute inset-0 border border-black/10 rounded-full"></div>
                <div className="absolute inset-0 border-2 border-accent rounded-full border-t-transparent animate-spin" style={{ animationDuration: '1s' }}></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Activity className="w-5 h-5 text-accent animate-pulse" strokeWidth={1.5} />
                </div>
              </div>
              
              <h3 className="text-lg font-medium text-black mb-2">Tahlil qilinmoqda</h3>
              
              <div className="h-5 relative w-full flex justify-center">
                <AnimatePresence mode="wait">
                  <motion.p 
                    key={loadingStep}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ duration: 0.2 }}
                    className="text-xs font-medium text-gray-500 absolute"
                  >
                    {loadingSteps[loadingStep]}
                  </motion.p>
                </AnimatePresence>
              </div>
            </div>
            
            <div className="w-full h-[2px] bg-neutral-200 overflow-hidden">
              <motion.div 
                className="h-full bg-accent"
                initial={{ width: '0%' }}
                animate={{ width: `${((loadingStep + 1) / loadingSteps.length) * 100}%` }}
                transition={{ duration: 1.5, ease: "easeInOut" }}
              />
            </div>
          </motion.div>
        </div>

      </div>
    );
  }

  return (
    <div className="min-h-screen text-[#111111] flex flex-col justify-center py-12 px-[15px] sm:px-6 lg:px-8 font-sans selection:bg-black selection:text-white relative overflow-hidden">
      
      <MeshGradient />
      {/* Subtle Dot Pattern Background */}
      <div className="absolute inset-0 z-0 opacity-40 pointer-events-none mix-blend-overlay" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='24' height='24' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23000000' fill-opacity='0.08' fill-rule='evenodd'%3E%3Ccircle cx='2' cy='2' r='1'/%3E%3C/g%3E%3C/svg%3E")` }}></div>
      
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="sm:mx-auto sm:w-full sm:max-w-md z-10 relative"
      >
        <button 
          onClick={() => navigate('/')} 
          className="absolute top-0 -left-12 hidden md:flex items-center justify-center p-2 text-gray-400 hover:text-black bg-transparent transition-all hover:-translate-x-1"
          title="Bosh sahifaga qaytish"
        >
          <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
        </button>
        
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-none mx-auto mb-6 md:mb-8 border border-black/10 bg-[#fdfdfd] flex items-center justify-center font-bold text-2xl tracking-tighter text-black">
            HB.
          </div>
        </div>
        <h2 className="mt-2 text-center text-3xl font-medium tracking-tight text-black">
          Maktab Diagnostikasi
        </h2>
        <p className="mt-2 text-center text-sm text-gray-500">
          O'quvchi natijalarini ko'rish uchun tizimga kiring
        </p>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
        className="mt-8 sm:mx-auto sm:w-full sm:max-w-[420px] z-10"
      >
        <div className="bg-white/60 backdrop-blur-xl py-8 px-5 sm:px-10 border-t border-white/50 md:border md:border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative z-10">
          <form className="space-y-6 relative z-20" onSubmit={handleLogin}>
            
            <div>
              <label htmlFor="id" className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Login (ID)
              </label>
              <div className="mt-2 relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Search className="h-4 w-4 text-gray-400" strokeWidth={1.5} aria-hidden="true" />
                </div>
                <input
                  id="id"
                  type="text"
                  required
                  value={id}
                  onChange={(e) => setId(e.target.value)}
                  className="block w-full rounded-none border border-neutral-200 py-3 pl-10 text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent sm:text-sm sm:leading-6 transition-all duration-300 bg-transparent"
                  placeholder="6 xonali raqam"
                />
              </div>
            </div>

            <div>
              <label htmlFor="pin" className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Parol (PIN)
              </label>
              <div className="mt-2 relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Lock className="h-4 w-4 text-gray-400" strokeWidth={1.5} aria-hidden="true" />
                </div>
                <input
                  id="pin"
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="block w-full rounded-none border border-neutral-200 py-3 pl-10 text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent sm:text-sm sm:leading-6 transition-all duration-300 bg-transparent tracking-[0.2em]"
                  placeholder="••••"
                  maxLength={4}
                />
              </div>
            </div>

            {error && (
              <div className="border border-red-200 bg-red-50/50 p-3 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center">
                  <div className="ml-2">
                    <h3 className="text-sm font-medium text-red-600">{error}</h3>
                  </div>
                </div>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="group relative flex w-full justify-center items-center rounded-none bg-accent px-3 py-3.5 text-sm font-semibold text-white hover:bg-accent-hover hover:shadow-accent-glow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50 disabled:cursor-not-allowed transition-premium"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-[1.5px] border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    Davom etish
                    <span className="absolute right-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
                      <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
                    </span>
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-8 md:hidden">
            <button 
              onClick={() => navigate('/')}
              className="w-full flex items-center justify-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500 hover:text-black bg-transparent py-3 transition-colors border-t border-black/10"
            >
              <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
              Bosh sahifaga qaytish
            </button>
          </div>
        </div>
      </motion.div>
      
      <div className="mt-auto pb-6 text-center z-10">
        <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-gray-400">&copy; {new Date().getFullYear()} Maktab Diagnostikasi. Barcha huquqlar himoyalangan.</p>
      </div>
    </div>
  );
}
