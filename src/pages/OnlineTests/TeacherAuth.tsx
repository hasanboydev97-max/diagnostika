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
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-[15px] sm:px-6 lg:px-8 font-sans relative">
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative">
        <button 
          onClick={() => navigate('/')} 
          className="absolute -top-4 -left-8 hidden md:flex items-center justify-center p-2 text-gray-400 hover:text-gray-900 bg-white border border-gray-200 rounded-full shadow-sm hover:shadow-md transition-all hover:-translate-x-1"
          title="Bosh sahifaga qaytish"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          O'qituvchilar tizimi
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {isLogin ? 'Hisobingizga kiring' : 'Yangi akkaunt yarating'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-5 shadow sm:rounded-lg sm:px-10 border border-gray-100">
          <form className="space-y-6" onSubmit={handleSubmit}>
            
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700">F.I.SH</label>
                <div className="mt-1">
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <div className="mt-1">
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                />
              </div>
            </div>

            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Mutaxassislik fani</label>
                <div className="mt-1 relative">
                  <select
                    required
                    value={formData.subject}
                    onChange={e => setFormData({ ...formData, subject: e.target.value })}
                    className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-black focus:border-black sm:text-sm rounded-md border"
                  >
                    {SUBJECTS.map(sub => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">Parol</label>
              <div className="mt-1">
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black disabled:opacity-50"
              >
                {loading ? 'Kutilmoqda...' : (isLogin ? 'Kirish' : 'Ro\'yxatdan o\'tish')}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  {isLogin ? 'Akkauntingiz yo\'qmi?' : 'Akkauntingiz bormi?'}
                </span>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
              >
                {isLogin ? 'Ro\'yxatdan o\'tish' : 'Tizimga kirish'}
              </button>
            </div>
          </div>
          <div className="mt-6 md:hidden">
            <button
              onClick={() => navigate('/')}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Bosh sahifaga qaytish
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
