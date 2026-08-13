import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchCurrentTeacher, getToken } from '../../lib/auth';
import { Zap, Crown, ArrowLeft, Gamepad2, Brain, Flame } from 'lucide-react';
import { motion } from 'framer-motion';
import MeshGradient from '../../components/ui/MeshGradient';

const GamesList = () => {
  const navigate = useNavigate();
  const [teacher, setTeacher] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      navigate('/teacher/login');
      return;
    }
    fetchCurrentTeacher().then(fresh => {
      setTeacher(fresh);
      setLoading(false);
    });
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fdfdfd]">
        <div className="w-8 h-8 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
      </div>
    );
  }

  const isPremium = teacher?.plan === 'premium';

  return (
    <div className="min-h-screen relative font-sans text-[#111111] overflow-x-hidden bg-[#fdfdfd]">
      <MeshGradient />
      
      {/* Header */}
      <header className="border-b border-white/50 bg-white/60 backdrop-blur-xl sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center gap-4">
          <button 
            onClick={() => navigate('/online-tests')}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Gamepad2 className="w-5 h-5 text-indigo-600" />
            <h1 className="text-sm font-semibold text-zinc-900 leading-tight">Ta'limiy O'yinlar</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-12">
        {!isPremium ? (
          <div className="max-w-xl mx-auto text-center mt-12 bg-white/60 backdrop-blur-md border border-amber-200 p-10 rounded-3xl shadow-xl">
            <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Crown className="w-10 h-10" />
            </div>
            <h2 className="text-3xl font-bold mb-4">Premium obuna zarur</h2>
            <p className="text-neutral-600 mb-8 leading-relaxed">
              Ta'limiy o'yinlar modilidan foydalanish va o'quvchilaringiz darslarini qiziqarli o'yinlar bilan boyitish uchun Premium tarifiga o'ting.
            </p>
            <button 
              onClick={() => navigate('/')}
              className="bg-black text-white px-8 py-4 rounded-xl font-medium hover:bg-neutral-800 transition-colors w-full"
            >
              Tarifni o'zgartirish
            </button>
          </div>
        ) : (
          <div>
            <div className="mb-10 text-center">
              <h2 className="text-4xl font-bold tracking-tight mb-3">Mini O'yinlar</h2>
              <p className="text-neutral-500 max-w-xl mx-auto">
                O'quvchilar e'tiborini tortish va darsni interaktiv qilish uchun mo'ljallangan maxsus o'yinlar to'plami.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -8, scale: 1.02 }}
                className="bg-white rounded-[2rem] overflow-hidden cursor-pointer transition-all duration-300 flex flex-col group border-b-[8px] border-slate-200 hover:border-indigo-500 shadow-sm hover:shadow-2xl"
                onClick={() => navigate('/games/math-ninja')}
              >
                <div className="h-56 bg-gradient-to-br from-[#3B82F6] via-[#6366F1] to-[#8B5CF6] relative overflow-hidden flex items-center justify-center p-6">
                  {/* Decorative background circles */}
                  <div className="absolute top-[-20%] right-[-10%] w-40 h-40 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                  <div className="absolute bottom-[-20%] left-[-10%] w-32 h-32 bg-indigo-900/20 rounded-full blur-xl group-hover:scale-150 transition-transform duration-700 delay-100"></div>
                  
                  <Brain className="w-48 h-48 text-white opacity-[0.07] absolute -right-8 -bottom-8 rotate-12 group-hover:rotate-0 transition-transform duration-500" />
                  
                  <div className="relative z-10 bg-white/20 backdrop-blur-md border border-white/30 px-8 py-4 rounded-3xl text-white font-mono text-5xl font-black drop-shadow-xl transform group-hover:scale-110 transition-transform duration-300 shadow-[0_10px_30px_rgba(0,0,0,0.1)]">
                    12 × 4 = ?
                  </div>
                </div>
                
                <div className="p-8 flex-1 flex flex-col bg-white">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-xs uppercase tracking-widest font-black bg-indigo-100 text-indigo-600 px-3 py-1.5 rounded-xl">
                      Matematika
                    </span>
                    <span className="text-xs uppercase tracking-widest font-black bg-orange-100 text-orange-600 px-3 py-1.5 rounded-xl flex items-center gap-1">
                      <Flame className="w-3 h-3" /> QIZIQARLI
                    </span>
                  </div>
                  
                  <h3 className="text-3xl font-black mb-3 text-slate-800">Tezkor Hisob</h3>
                  <p className="text-base text-slate-500 mb-8 font-medium leading-relaxed flex-1">
                    Qisqa vaqt ichida eng ko'p matematik misollarni yeching. Tezlik va aniqlik — g'alaba kaliti! 🏆
                  </p>
                  
                  <div className="mt-auto">
                    <div className="bg-[#10B981] group-hover:bg-[#059669] text-white w-full py-5 rounded-2xl font-black text-xl flex items-center justify-center gap-3 transition-colors shadow-lg border-b-[6px] border-[#059669] active:border-b-0 active:translate-y-[6px]">
                      Hozir O'ynash <Zap className="w-6 h-6 fill-white" />
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Placeholder for future games */}
              <div className="bg-neutral-50 border-2 border-dashed border-neutral-200 rounded-3xl p-8 flex flex-col items-center justify-center text-center opacity-70">
                <div className="w-16 h-16 bg-neutral-200 text-neutral-400 rounded-2xl flex items-center justify-center mb-4">
                  <Gamepad2 className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold mb-2 text-neutral-600">So'z Ustasi (Tez kunda)</h3>
                <p className="text-xs text-neutral-400 max-w-[200px]">Ingliz va Rus tillaridagi so'zlarni moslashtirish o'yini.</p>
              </div>

              <div className="bg-neutral-50 border-2 border-dashed border-neutral-200 rounded-3xl p-8 flex flex-col items-center justify-center text-center opacity-70">
                <div className="w-16 h-16 bg-neutral-200 text-neutral-400 rounded-2xl flex items-center justify-center mb-4">
                  <Gamepad2 className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold mb-2 text-neutral-600">Harf Teruvchi (Tez kunda)</h3>
                <p className="text-xs text-neutral-400 max-w-[200px]">Tushirib qoldirilgan harflarni topish orqali so'z yasash.</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default GamesList;
