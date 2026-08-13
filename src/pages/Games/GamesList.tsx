import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchCurrentTeacher, getToken } from '../../lib/auth';
import { Zap, Crown, ArrowLeft, Gamepad2, Brain } from 'lucide-react';
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
              {/* Math Ninja Game Card */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -5 }}
                className="bg-white border-2 border-black/10 hover:border-black/30 rounded-3xl overflow-hidden shadow-lg cursor-pointer transition-all duration-300 flex flex-col group"
                onClick={() => navigate('/games/math-ninja')}
              >
                <div className="h-48 bg-gradient-to-br from-blue-500 to-indigo-600 relative overflow-hidden flex items-center justify-center">
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors"></div>
                  <Brain className="w-24 h-24 text-white opacity-20 absolute -right-4 -bottom-4" />
                  <div className="relative z-10 text-white font-mono text-4xl font-bold drop-shadow-md">
                    12 × 4 = ?
                  </div>
                </div>
                <div className="p-6 flex-1 flex flex-col">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] uppercase tracking-wider font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded">Matematika</span>
                  </div>
                  <h3 className="text-2xl font-bold mb-2">Tezkor Hisob</h3>
                  <p className="text-sm text-neutral-500 mb-6 flex-1">
                    Qisqa vaqt ichida qancha ko'p matematik misollarni yechishingizni sinab ko'ring. Tezlik va aniqlik - g'alaba kaliti!
                  </p>
                  <div className="mt-auto">
                    <div className="bg-neutral-900 group-hover:bg-indigo-600 text-white w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-md">
                      O'ynash <Zap className="w-5 h-5 text-amber-400" />
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
