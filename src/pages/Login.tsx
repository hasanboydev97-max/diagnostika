import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Lock, ArrowRight, Activity, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../lib/db';
import logo from '../assets/logo.jpg';

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
      <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center p-6 relative font-['Space_Grotesk'] overflow-hidden">
        
        {/* Subtle grid background for premium engineering feel */}
        <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-60"></div>
        
        <div className="z-10 w-full max-w-sm">
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="bg-white border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl p-6 md:p-8"
          >
            <div className="flex flex-col items-center text-center mb-8">
              <div className="relative w-16 h-16 mb-6">
                <div className="absolute inset-0 border-2 border-slate-100 rounded-full"></div>
                <div className="absolute inset-0 border-2 border-slate-900 rounded-full border-t-transparent animate-spin" style={{ animationDuration: '1s' }}></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Activity className="w-5 h-5 text-slate-900 animate-pulse" />
                </div>
              </div>
              
              <h3 className="text-lg font-bold text-slate-900 mb-2">Tahlil qilinmoqda</h3>
              
              <div className="h-5 relative w-full flex justify-center">
                <AnimatePresence mode="wait">
                  <motion.p 
                    key={loadingStep}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ duration: 0.2 }}
                    className="text-xs font-medium text-slate-500 absolute"
                  >
                    {loadingSteps[loadingStep]}
                  </motion.p>
                </AnimatePresence>
              </div>
            </div>
            
            <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-slate-900 rounded-full"
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
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-['Space_Grotesk'] selection:bg-slate-900 selection:text-white relative">
      
      {/* Subtle grid background for premium engineering feel */}
      <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-60"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10 relative">
        <button 
          onClick={() => navigate('/')} 
          className="absolute top-0 -left-12 hidden md:flex items-center justify-center p-2 text-slate-400 hover:text-slate-900 bg-white border border-slate-200 rounded-full shadow-sm hover:shadow-md transition-all hover:-translate-x-1"
          title="Bosh sahifaga qaytish"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg transform -rotate-3 transition-transform hover:rotate-0 duration-300 overflow-hidden border-2 border-white ring-1 ring-slate-100">
            <img src={logo} alt="Maktab Logosi" className="w-full h-full object-contain" />
          </div>
        </div>
        <h2 className="mt-2 text-center text-3xl font-bold tracking-tight text-slate-900">
          Maktab Diagnostikasi
        </h2>
        <p className="mt-2 text-center text-sm text-slate-500">
          O'quvchi natijalarini ko'rish uchun tizimga kiring
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-[420px] z-10">
        <div className="bg-white py-8 px-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:rounded-2xl sm:px-10 border border-slate-100">
          <form className="space-y-6" onSubmit={handleLogin}>
            
            <div>
              <label htmlFor="id" className="block text-sm font-medium text-slate-700">
                Login (ID)
              </label>
              <div className="mt-2 relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Search className="h-4 w-4 text-slate-400" aria-hidden="true" />
                </div>
                <input
                  id="id"
                  type="text"
                  required
                  value={id}
                  onChange={(e) => setId(e.target.value)}
                  className="block w-full rounded-lg border-0 py-3 pl-10 text-slate-900 ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-slate-900 sm:text-sm sm:leading-6 transition-shadow bg-slate-50 focus:bg-white"
                  placeholder="6 xonali raqamni kiriting"
                />
              </div>
            </div>

            <div>
              <label htmlFor="pin" className="block text-sm font-medium text-slate-700">
                Parol (PIN)
              </label>
              <div className="mt-2 relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Lock className="h-4 w-4 text-slate-400" aria-hidden="true" />
                </div>
                <input
                  id="pin"
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="block w-full rounded-lg border-0 py-3 pl-10 text-slate-900 ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-slate-900 sm:text-sm sm:leading-6 transition-shadow bg-slate-50 focus:bg-white tracking-[0.2em]"
                  placeholder="••••"
                  maxLength={4}
                />
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 p-3 border border-red-100 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center">
                  <div className="ml-2">
                    <h3 className="text-sm font-medium text-red-800">{error}</h3>
                  </div>
                </div>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="group relative flex w-full justify-center items-center rounded-lg bg-slate-900 px-3 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:opacity-70 disabled:cursor-not-allowed transition-all"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    Davom etish
                    <span className="absolute right-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-8 md:hidden">
            <button 
              onClick={() => navigate('/')}
              className="w-full flex items-center justify-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 py-3 rounded-lg transition-colors border border-slate-200"
            >
              <ArrowLeft className="w-4 h-4" />
              Bosh sahifaga qaytish
            </button>
          </div>
        </div>
      </div>
      
      <div className="mt-auto pb-6 text-center z-10">
        <p className="text-xs text-slate-400 font-medium tracking-wide">&copy; {new Date().getFullYear()} Maktab Diagnostikasi. Barcha huquqlar himoyalangan.</p>
      </div>
    </div>
  );
}
