import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Lock, ArrowRight, Activity } from 'lucide-react';
import { db } from '../lib/db';

export default function Login() {
  const [id, setId] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(-1);
  const navigate = useNavigate();

  const loadingSteps = [
    "Shaxsiy ma'lumotlar tekshirilmoqda...",
    "Kognitiv ko'rsatkichlar tahlil qilinmoqda...",
    "Neyrotarmoq xulosasi tayyorlanmoqda..."
  ];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (id === 'admin') {
      navigate('/admin');
      return;
    }
    
    if (!pin && id !== 'admin') {
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
          setTimeout(() => setLoadingStep(1), 1500);
          setTimeout(() => setLoadingStep(2), 3000);
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
      <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center p-6 relative font-['Space_Grotesk']">
        <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-60"></div>
        
        <div className="z-10 flex flex-col items-center max-w-sm w-full text-center">
          <div className="relative w-24 h-24 mb-10">
            <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-slate-900 rounded-full border-t-transparent animate-spin" style={{ animationDuration: '1.5s' }}></div>
            <div className="absolute inset-4 bg-slate-900 rounded-full animate-pulse flex items-center justify-center">
              <Activity className="text-white w-7 h-7" />
            </div>
          </div>
          
          <h3 className="text-2xl font-bold text-slate-900 mb-3 tracking-tight">Natijalar yuklanmoqda</h3>
          
          <div className="h-8 flex items-center justify-center mb-8 w-full">
            <p className="text-sm font-medium text-slate-500 animate-pulse transition-opacity duration-300">
              {loadingSteps[loadingStep]}
            </p>
          </div>
          
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
            <div 
              className="h-full bg-slate-900 rounded-full transition-all ease-out"
              style={{ 
                width: `${((loadingStep + 1) / loadingSteps.length) * 100}%`,
                transitionDuration: '1500ms'
              }}
            ></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-['Space_Grotesk'] selection:bg-slate-900 selection:text-white relative">
      
      {/* Subtle grid background for premium engineering feel */}
      <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-60"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-lg transform -rotate-3 transition-transform hover:rotate-0 duration-300">
            <Activity className="w-6 h-6" />
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

          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-100" />
              </div>
              <div className="relative flex justify-center text-sm font-medium leading-6">
                <span className="bg-white px-6 text-slate-400">O'qituvchimisiz?</span>
              </div>
            </div>

            <div className="mt-4 text-center">
              <p className="text-xs text-slate-500">
                Tizimga kirish uchun Login qismiga <kbd className="font-sans px-2 py-1 bg-slate-100 border border-slate-200 rounded-md text-slate-600 font-semibold ml-1">admin</kbd> deb yozing
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-auto pb-6 text-center z-10">
        <p className="text-xs text-slate-400 font-medium tracking-wide">&copy; {new Date().getFullYear()} Maktab Diagnostikasi. Barcha huquqlar himoyalangan.</p>
      </div>
    </div>
  );
}
