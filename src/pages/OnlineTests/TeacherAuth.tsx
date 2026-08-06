import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { setToken, setTeacher } from '../../lib/auth';
import { ArrowLeft } from 'lucide-react';

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
    <div className="min-h-screen bg-[#fdfdfd] text-[#111111] flex flex-col justify-center py-12 px-[15px] sm:px-6 lg:px-8 font-sans relative">
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
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
          O'qituvchilar tizimi
        </h2>
        <p className="mt-2 text-center text-sm text-gray-500">
          {isLogin ? 'Hisobingizga kiring' : 'Yangi akkaunt yarating'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="bg-[#fdfdfd] py-8 px-5 sm:px-10 border-t border-black/10 md:border md:border-black/10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            
            {!isLogin && (
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">F.I.SH</label>
                <div className="mt-1">
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="block w-full rounded-none border border-black/10 py-3 px-3 text-black placeholder-gray-400 focus:outline-none focus:border-black sm:text-sm transition-colors bg-transparent"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Email</label>
              <div className="mt-1">
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="block w-full rounded-none border border-black/10 py-3 px-3 text-black placeholder-gray-400 focus:outline-none focus:border-black sm:text-sm transition-colors bg-transparent"
                />
              </div>
            </div>

            {!isLogin && (
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Mutaxassislik fani</label>
                <div className="mt-1 relative">
                  <select
                    required
                    value={formData.subject}
                    onChange={e => setFormData({ ...formData, subject: e.target.value })}
                    className="block w-full rounded-none border border-black/10 py-3 pl-3 pr-10 text-black focus:outline-none focus:border-black sm:text-sm transition-colors bg-transparent appearance-none"
                  >
                    {SUBJECTS.map(sub => (
                      <option key={sub} value={sub} className="text-black">{sub}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Parol</label>
              <div className="mt-1">
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  className="block w-full rounded-none border border-black/10 py-3 px-3 text-black placeholder-gray-400 focus:outline-none focus:border-black sm:text-sm transition-colors bg-transparent tracking-[0.2em]"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-none shadow-none text-sm font-semibold text-white bg-black hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black disabled:opacity-50 transition-colors"
              >
                {loading ? 'Kutilmoqda...' : (isLogin ? 'Kirish' : 'Ro\'yxatdan o\'tish')}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-black/10" />
              </div>
              <div className="relative flex justify-center text-[11px] font-semibold uppercase tracking-wider">
                <span className="px-3 bg-[#fdfdfd] text-gray-400">
                  {isLogin ? 'Akkauntingiz yo\'qmi?' : 'Akkauntingiz bormi?'}
                </span>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="w-full flex justify-center py-3.5 px-4 border border-black/10 rounded-none shadow-none text-sm font-semibold text-black bg-[#fdfdfd] hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black transition-colors"
              >
                {isLogin ? 'Ro\'yxatdan o\'tish' : 'Tizimga kirish'}
              </button>
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
      </div>
    </div>
  );
}
