import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { setToken, setTeacher } from '../../lib/auth';
import { ArrowLeft, ArrowRight, Mail, Lock, User, BookOpen, Eye, EyeOff, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import MeshGradient from '../../components/ui/MeshGradient';
import MagicButton from '../../components/MagicButton';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const SUBJECTS = [
  "Matematika", "Informatika", "Ona tili", "Tarix", 
  "Ingliz tili", "Fizika", "Kimyo", "Biologiya"
];

export default function TeacherAuth() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    subject: SUBJECTS[0]
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const endpoint = isLogin ? '/auth/login' : '/auth/register';
    
    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Xatolik yuz berdi");
      }
      
      setToken(data.token);
      setTeacher(data.teacher);
      
      toast.success(isLogin ? "Muvaffaqiyatli kirdingiz!" : "Ro'yxatdan o'tdingiz!");
      navigate('/online-tests');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen text-[#111111] flex flex-col justify-center py-12 px-[15px] sm:px-6 lg:px-8 font-sans selection:bg-black selection:text-white relative overflow-hidden bg-[#fdfdfd]">
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
          className="absolute top-0 -left-12 hidden md:flex items-center justify-center p-2 text-neutral-400 hover:text-black bg-transparent transition-all hover:-translate-x-1"
          title="Bosh sahifaga qaytish"
        >
          <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
        </button>

        <div className="flex justify-center mb-6">
          <img src="/logo.png" alt="HB Ta'lim Diagnostikasi" className="h-14 md:h-18 w-auto object-contain mx-auto mb-6 md:mb-8" />
        </div>

        <h2 className="mt-2 text-center text-3xl font-medium tracking-tight text-black">
          O'qituvchilar tizimi
        </h2>
        <p className="mt-2 text-center text-sm text-gray-500">
          {isLogin ? 'Hisobingizga kiring' : 'Yangi akkaunt yarating'}
        </p>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
        className="mt-8 sm:mx-auto sm:w-full sm:max-w-[420px] z-10"
      >
        <div className="bg-white/60 backdrop-blur-xl py-8 px-5 sm:px-10 border-t border-white/50 md:border md:border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl md:rounded-3xl relative z-10">
          <form className="space-y-5 relative z-20" onSubmit={handleSubmit}>
            
            <AnimatePresence mode="wait">
              {!isLogin && (
                <motion.div
                  key="name-field"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    F.I.SH
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                      <User className="h-4 w-4 text-gray-400" strokeWidth={1.5} />
                    </div>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="block w-full rounded-xl border border-neutral-200 py-3 pl-10 pr-4 text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent sm:text-sm transition-all duration-300 bg-transparent"
                      placeholder="Ism va familiyangiz"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Email
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                  <Mail className="h-4 w-4 text-gray-400" strokeWidth={1.5} />
                </div>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="block w-full rounded-xl border border-neutral-200 py-3 pl-10 pr-4 text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent sm:text-sm transition-all duration-300 bg-transparent"
                  placeholder="nomi@mail.uz"
                />
              </div>
            </div>

            <AnimatePresence mode="wait">
              {!isLogin && (
                <motion.div
                  key="subject-field"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    Mutaxassislik fani
                  </label>
                  <div className="relative flex items-center">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 z-10">
                      <BookOpen className="h-4 w-4 text-gray-400" strokeWidth={1.5} />
                    </div>
                    <select
                      required
                      value={formData.subject}
                      onChange={e => setFormData({ ...formData, subject: e.target.value })}
                      className="block w-full rounded-xl border border-neutral-200 py-3 pl-10 pr-10 text-neutral-900 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent sm:text-sm transition-all duration-300 bg-transparent appearance-none"
                    >
                      {SUBJECTS.map(sub => (
                        <option key={sub} value={sub} className="text-neutral-900 bg-white">{sub}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5">
                      <ChevronDown className="h-4 w-4 text-gray-400" strokeWidth={1.5} />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Parol
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                  <Lock className="h-4 w-4 text-gray-400" strokeWidth={1.5} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  className="block w-full rounded-xl border border-neutral-200 py-3 pl-10 pr-10 text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent sm:text-sm transition-all duration-300 bg-transparent tracking-wider"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" strokeWidth={1.5} />
                  ) : (
                    <Eye className="h-4 w-4" strokeWidth={1.5} />
                  )}
                </button>
              </div>
            </div>

            <div className="pt-2 flex justify-center">
              <MagicButton
                type="submit"
                disabled={loading}
                label={isLogin ? "KIRISH" : "RO'YXATDAN O'TISH"}
                loading={loading}
                loadingLabel="Kutilmoqda..."
                icon={<ArrowRight />}
                fullWidth
              />
            </div>
          </form>

          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-black/10" />
              </div>
              <div className="relative flex justify-center text-[10px] font-bold uppercase tracking-widest">
                <span className="px-3 bg-white/80 backdrop-blur-md rounded-full border border-neutral-200/80 py-0.5 text-gray-400">
                  {isLogin ? "Akkauntingiz yo'qmi?" : "Akkauntingiz bormi?"}
                </span>
              </div>
            </div>

            <div className="mt-6 flex justify-center">
              <MagicButton
                type="button"
                variant="ghost"
                fullWidth
                label={isLogin ? "RO'YXATDAN O'TISH" : "TIZIMGA KIRISH"}
                onClick={() => setIsLogin(!isLogin)}
              />
            </div>
          </div>

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
      
      <div className="mt-auto pb-6 text-center z-10 pt-8">
        <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-gray-400">&copy; {new Date().getFullYear()} HB Ta'lim Diagnostikasi. Barcha huquqlar himoyalangan.</p>
      </div>
    </div>
  );
}

