import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ChevronRight, FileText, Search, Trash2, ShieldAlert, Crown } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { getAuthHeaders, getToken, getTeacher, fetchCurrentTeacher } from '../../lib/auth';
import MeshGradient from '../../components/ui/MeshGradient';
import TeacherProfileModal from '../../components/TeacherProfileModal';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface OnlineTest {
  id: string;
  title: string;
  subject: string;
  questions: any[];
  createdAt: string;
}

export default function OnlineTestsDashboard() {
  const [tests, setTests] = useState<OnlineTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const navigate = useNavigate();
  const [teacher, setTeacher] = useState<any>(getTeacher());

  useEffect(() => {
    if (!getToken()) {
      navigate('/teacher/login');
      return;
    }
    fetchTests();
    fetchCurrentTeacher().then(fresh => {
      if (fresh) setTeacher(fresh);
    });
  }, []);

  const fetchTests = async () => {
    try {
      const res = await fetch(`${API_URL}/online-tests`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setTests(data);
      }
    } catch (error) {
      console.error('Failed to fetch tests', error);
      toast.error('Testlarni yuklashda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTest = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Rostdan ham bu testni o'chirmoqchimisiz?")) return;
    
    try {
      const res = await fetch(`${API_URL}/online-tests/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        setTests(tests.filter(t => t.id !== id));
        toast.success("Test muvaffaqiyatli o'chirildi");
      } else {
        toast.error("O'chirishda xatolik yuz berdi");
      }
    } catch (error) {
      toast.error("Tarmoq xatosi");
    }
  };

  const filteredTests = tests.filter(test => 
    test.title.toLowerCase().includes(search.toLowerCase()) ||
    test.subject.toLowerCase().includes(search.toLowerCase())
  );
  return (
    <div className="min-h-screen relative font-sans text-[#111111] overflow-x-hidden bg-[#fdfdfd]">
      <MeshGradient />
      
      {/* Header */}
      <header className="border-b border-white/50 bg-white/60 backdrop-blur-xl sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Portal Title */}
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-semibold text-zinc-900 leading-tight">O'qituvchi Portali</h1>
                {/* Plan Badge */}
                {teacher?.plan === 'premium' ? (
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 border border-amber-500/20 uppercase tracking-wider">
                    Premium
                  </span>
                ) : teacher?.plan === 'standard' ? (
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-zinc-955 text-white uppercase tracking-wider">
                    Standard
                  </span>
                ) : (
                  <span className="text-[9px] font-medium px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-500 border border-zinc-200 uppercase tracking-wider">
                    Free
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-500 font-medium">{teacher?.name}</p>
            </div>
          </div>
          
          {/* Right Header Actions: Admin link & Profile Avatar */}
          <div className="flex items-center gap-3">
            {teacher?.role === 'admin' && (
              <button
                onClick={() => navigate('/superadmin')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-zinc-200 hover:border-zinc-400 hover:bg-zinc-50 text-xs font-medium text-zinc-700 transition-colors"
              >
                <ShieldAlert size={14} />
                <span className="hidden sm:inline">Admin Panel</span>
              </button>
            )}

            {/* Premium Gold Ring & Crown Badge Avatar */}
            <button
              onClick={() => setIsProfileOpen(true)}
              className={`relative p-[2px] rounded-full transition-all group focus:outline-none ${
                teacher?.plan === 'premium'
                  ? 'bg-gradient-to-tr from-amber-400 via-amber-500 to-yellow-600 shadow-sm hover:scale-105'
                  : 'border-2 border-black/20 hover:border-black'
              }`}
              title="Profil Sozlamalari & Hisob"
            >
              <div className={`w-9 h-9 rounded-full bg-[#111111] text-white overflow-hidden flex items-center justify-center font-bold text-sm transition-transform shadow-xs ${
                teacher?.plan === 'premium' ? 'border-2 border-white' : ''
              }`}>
                {teacher?.avatar ? (
                  <img src={teacher.avatar} alt={teacher.name} className="w-full h-full object-cover" />
                ) : (
                  <span>{teacher?.name?.charAt(0)?.toUpperCase() || 'M'}</span>
                )}
              </div>
              
              {teacher?.plan === 'premium' ? (
                <span className="absolute -top-1 -right-1 bg-gradient-to-r from-amber-500 to-amber-600 text-white p-0.5 rounded-full border border-white shadow-xs flex items-center justify-center">
                  <Crown size={8} className="fill-current text-white" />
                </span>
              ) : (
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white"></span>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 relative z-10">
        {/* Pending Subscription Request Banner */}
        {teacher?.planStatus === 'pending' && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xl">⏳</span>
              <div>
                <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">To'lov ko'rib chiqilmoqda</h4>
                <p className="text-xs text-amber-800">
                  {teacher?.requestedPlan?.toUpperCase()} tarifiga ulanish so'rovingiz qabul qilindi. Admin tekshiruvidan so'ng dostup faollashadi.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-8">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Test nomini qidirish..." 
              className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button 
            onClick={() => navigate('/online-tests/create')}
            className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-[#111111] hover:bg-[#333] text-white rounded-2xl font-bold transition-all shadow-lg shadow-[#111111]/20"
          >
            <Plus size={16} />
            <span>Yangi Test Yaratish</span>
          </button>
        </div>

        {/* List Section */}
        <div>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white/60 backdrop-blur-xl border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl p-6 h-[160px] flex flex-col justify-between animate-pulse">
                  <div className="space-y-3 w-full">
                    <div className="flex justify-between">
                       <div className="h-5 bg-zinc-100 rounded-lg w-16"></div>
                       <div className="h-5 bg-zinc-100 rounded-lg w-6"></div>
                    </div>
                    <div className="h-5 bg-zinc-200 rounded w-full"></div>
                    <div className="h-5 bg-zinc-200 rounded w-2/3"></div>
                  </div>
                  <div className="flex justify-between items-center border-t border-zinc-100 pt-3">
                     <div className="h-3 bg-zinc-100 rounded w-24"></div>
                     <div className="h-5 bg-zinc-100 rounded w-5"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredTests.length === 0 ? (
            <div className="bg-white/60 backdrop-blur-xl border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl p-16 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-6 border border-gray-100">
                <FileText className="text-gray-400" size={32} strokeWidth={1.5} />
              </div>
              <h3 className="text-xl font-semibold text-black mb-2">Ma'lumot topilmadi</h3>
              <p className="text-gray-500 mb-8 max-w-md">Hali hech qanday test yaratmagansiz. O'quvchilaringiz uchun birinchi onlayn testingizni yarating.</p>
              {!search && (
                <button 
                  onClick={() => navigate('/online-tests/create')}
                  className="px-6 py-2.5 bg-white border border-gray-200 text-black hover:bg-gray-50 text-sm font-bold tracking-wide rounded-xl transition-all shadow-sm flex items-center gap-2"
                >
                  <Plus size={16} strokeWidth={2} />
                  Test yaratish
                </button>
              )}
            </div>
          ) : (
            <motion.div 
              initial="hidden"
              animate="show"
              variants={{
                hidden: { opacity: 0 },
                show: { opacity: 1, transition: { staggerChildren: 0.05 } }
              }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {filteredTests.map((test) => (
                <motion.div
                  variants={{
                    hidden: { opacity: 0, y: 10 },
                    show: { opacity: 1, y: 0, transition: { duration: 0.3 } }
                  }}
                  key={test.id}
                  onClick={() => navigate(`/online-tests/details/${test.id}`)}
                  className="bg-white/80 backdrop-blur-xl border border-black/5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl p-6 hover:bg-white hover:-translate-y-1 hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] hover:border-black/10 transition-all cursor-pointer group relative flex flex-col h-full overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#111111]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-4">
                      <span className="px-3 py-1 bg-gray-100/80 rounded-lg text-[10px] uppercase tracking-wider font-bold text-gray-600 border border-black/5 group-hover:bg-gray-100 group-hover:text-black transition-colors">{test.subject}</span>
                      <button 
                        onClick={(e) => handleDeleteTest(e, test.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 z-10"
                        title="O'chirish"
                      >
                        <Trash2 size={16} strokeWidth={1.5} />
                      </button>
                    </div>
                    
                    <h3 className="text-lg font-semibold text-[#111111] group-hover:text-accent transition-colors mb-3 line-clamp-2 leading-snug">{test.title}</h3>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-black/5 flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs text-gray-500 font-medium">
                      <div className="flex items-center gap-1.5">
                        <FileText size={14} strokeWidth={1.5} />
                        <span>{test?.questions?.length || 0} savol</span>
                      </div>
                      <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                      <span>{new Date(test.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-[#111111] group-hover:text-white transition-colors">
                      <ChevronRight size={16} className="text-gray-400 group-hover:text-white transition-colors" strokeWidth={2} />
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </main>

      <TeacherProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        teacher={teacher}
        onTeacherUpdate={(updatedTeacher) => setTeacher(updatedTeacher)}
      />
    </div>
  );
}
