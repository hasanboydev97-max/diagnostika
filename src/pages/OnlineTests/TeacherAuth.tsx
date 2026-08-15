import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { setToken, setTeacher } from '../../lib/auth';
import { ArrowLeft } from 'lucide-react';
import MeshGradient from '../../components/ui/MeshGradient';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const SUBJECTS = [
  "Matematika", "Informatika", "Ona tili", "Tarix", 
  "Ingliz tili", "Fizika", "Kimyo", "Biologiya"
];

export default function TeacherAuth() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
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
    <div className="min-h-screen relative font-sans text-[#111111] overflow-hidden flex flex-col justify-center py-12 px-[15px] sm:px-6 lg:px-8 bg-[#fdfdfd]">
      <MeshGradient />
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <button 
          onClick={() => navigate('/')} 
          className="absolute top-0 -left-12 hidden md:flex items-center justify-center p-2 text-gray-400 hover:text-black bg-transparent transition-all hover:-translate-x-1"
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
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="bg-white/80 backdrop-blur-xl py-8 px-6 sm:px-10 border border-zinc-200/80 rounded-3xl shadow-xl shadow-zinc-900/5 relative z-10">
          <form className="space-y-5" onSubmit={handleSubmit}>
            
            {!isLogin && (
              <div>
                <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">F.I.SH</label>
                <div className="mt-1">
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="block w-full rounded-xl border border-zinc-200/80 py-3.5 px-4 text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 sm:text-sm transition-all bg-zinc-50/50"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Email</label>
              <div className="mt-1">
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="block w-full rounded-xl border border-zinc-200/80 py-3.5 px-4 text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 sm:text-sm transition-all bg-zinc-50/50"
                />
              </div>
            </div>

            {!isLogin && (
              <div>
                <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Mutaxassislik fani</label>
                <div className="mt-1 relative">
                  <select
                    required
                    value={formData.subject}
                    onChange={e => setFormData({ ...formData, subject: e.target.value })}
                    className="block w-full rounded-xl border border-zinc-200/80 py-3.5 pl-4 pr-10 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 sm:text-sm transition-all bg-zinc-50/50 appearance-none"
                  >
                    {SUBJECTS.map(sub => (
                      <option key={sub} value={sub} className="text-zinc-900">{sub}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Parol</label>
              <div className="mt-1">
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  className="block w-full rounded-xl border border-zinc-200/80 py-3.5 px-4 text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 sm:text-sm transition-all bg-zinc-50/50 tracking-widest"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3.5 px-4 rounded-xl shadow-sm text-xs font-bold uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50 transition-all shadow-indigo-600/20"
              >
                {loading ? 'Kutilmoqda...' : (isLogin ? 'Kirish' : 'Ro\'yxatdan o\'tish')}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-200/80" />
              </div>
              <div className="relative flex justify-center text-[11px] font-semibold uppercase tracking-wider">
                <span className="px-3 bg-white text-zinc-500">
                  {isLogin ? 'Akkauntingiz yo\'qmi?' : 'Akkauntingiz bormi?'}
                </span>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="w-full flex justify-center py-3.5 px-4 border border-zinc-200/80 rounded-xl shadow-xs text-xs font-bold uppercase tracking-wider text-zinc-800 bg-white hover:bg-zinc-50 transition-all"
              >
                {isLogin ? 'Ro\'yxatdan o\'tish' : 'Tizimga kirish'}
              </button>
            </div>
          </div>
          <div className="mt-8 md:hidden">
            <button
              onClick={() => navigate('/')}
              className="w-full flex items-center justify-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 hover:text-zinc-900 bg-transparent py-3 transition-colors border-t border-zinc-200/80"
            >
              <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
              Bosh sahifaga qaytish
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
