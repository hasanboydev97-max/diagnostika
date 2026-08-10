import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ChevronRight, FileText, Search, Trash2, LogOut, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { getAuthHeaders, getToken, logout, getTeacher, fetchCurrentTeacher } from '../../lib/auth';
import MeshGradient from '../../components/ui/MeshGradient';
import TeacherProfileModal from '../../components/TeacherProfileModal';
import { User, Settings } from 'lucide-react';

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
      console.error(error);
      toast.error('Failed to fetch tests');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTest = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm('Haqiqatan ham ushbu testni va uning barcha natijalarini o\'chirmoqchimisiz?')) return;
    
    try {
      const res = await fetch(`${API_URL}/online-tests/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        toast.success('Test muvaffaqiyatli o\'chirildi');
        setTests(tests.filter(t => t.id !== id));
      } else {
        throw new Error('O\'chirishda xatolik');
      }
    } catch (error) {
      console.error(error);
      toast.error('Testni o\'chirish imkonsiz');
    }
  };

  const filteredTests = tests.filter(
    (t) =>
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.subject.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen relative font-sans text-[#111111] overflow-x-hidden bg-[#fdfdfd]">
      <MeshGradient />
      
      {/* Top Navbar / Header Area */}
      <header className="border-b border-white/50 bg-white/60 backdrop-blur-xl sticky top-0 z-20 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Clickable Avatar / Profile Trigger */}
            <button
              onClick={() => setIsProfileOpen(true)}
              className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-zinc-100/80 transition-all text-left group"
              title="Profil Sozlamalari"
            >
              <div className="w-9 h-9 rounded-xl bg-zinc-900 text-white border border-zinc-700 overflow-hidden flex items-center justify-center font-bold text-sm shadow-xs group-hover:scale-105 transition-transform">
                {teacher?.avatar ? (
                  <img src={teacher.avatar} alt={teacher.name} className="w-full h-full object-cover" />
                ) : (
                  <span>{teacher?.name?.charAt(0)?.toUpperCase() || 'M'}</span>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-sm font-semibold text-zinc-900 leading-tight group-hover:text-black">
                    O'qituvchi Portali
                  </h1>
                  {/* Plan Badge */}
                  {teacher?.plan === 'premium' ? (
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 border border-amber-500/30 uppercase">
                      👑 Premium
                    </span>
                  ) : teacher?.plan === 'standard' ? (
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-black text-white uppercase">
                      🔥 Standard
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200 uppercase">
                      Free
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-zinc-500 font-medium flex items-center gap-1">
                  <span>{teacher?.name}</span>
                  <Settings size={11} className="text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </p>
              </div>
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Profile Button */}
            <button
              onClick={() => setIsProfileOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-zinc-200 hover:border-zinc-400 hover:bg-zinc-50 text-xs font-medium text-zinc-700 transition-colors"
              title="Profil Sozlamalari"
            >
              <User size={14} />
              <span className="hidden sm:inline">Profil</span>
            </button>
            {/* Upgrade Plan Button */}
            {teacher?.plan !== 'premium' && (
              <button
                onClick={() => navigate('/')}
                className="px-3 py-1.5 rounded-md bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 border border-amber-500/30 text-xs font-semibold transition-colors hidden sm:flex items-center gap-1"
              >
                <span>Tarifni Oshirish</span>
              </button>
            )}

            {teacher?.role === 'admin' && (
              <button
                onClick={() => navigate('/superadmin')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-zinc-200 hover:border-zinc-400 hover:bg-zinc-50 text-xs font-medium text-zinc-700 transition-colors"
              >
                <ShieldAlert size={14} />
                <span className="hidden sm:inline">Admin Panel</span>
              </button>
            )}
            <button
              onClick={() => navigate('/online-tests/create')}
              className="flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-white px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
            >
              <Plus size={14} />
              <span className="hidden sm:inline">Yangi Test</span>
            </button>
            <button
              onClick={logout}
              className="p-1.5 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-md transition-colors"
              title="Chiqish"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 relative z-10">
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
        
        {/* Search Bar */}
        <div className="mb-6 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-zinc-400" />
          </div>
          <input
            type="text"
            placeholder="Test qidirish..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="block w-full pl-9 pr-4 py-3 bg-white/60 backdrop-blur-md border border-white/50 rounded-xl shadow-sm text-sm font-medium text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-white focus:bg-white/80 transition-all"
          />
        </div>

        {/* List Section */}
        <div className="border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl overflow-hidden bg-white/60 backdrop-blur-xl">
          {loading ? (
            <div className="divide-y divide-zinc-100">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 flex items-center justify-between animate-pulse">
                  <div className="space-y-2 w-1/3">
                    <div className="h-4 bg-zinc-100 rounded w-full"></div>
                    <div className="h-3 bg-zinc-50 rounded w-2/3"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredTests.length === 0 ? (
            <div className="text-center py-16 flex flex-col items-center">
              <div className="w-12 h-12 border border-zinc-200 rounded-md flex items-center justify-center mb-3 bg-zinc-50">
                <FileText className="text-zinc-400 w-5 h-5" />
              </div>
              <h3 className="text-sm font-medium text-zinc-900 mb-1">Ma'lumot topilmadi</h3>
              <p className="text-xs text-zinc-500 mb-4">
                {search ? "Qidiruvingizga mos test yo'q." : "Hali hech qanday test yaratmagansiz."}
              </p>
              {!search && (
                <button
                  onClick={() => navigate('/online-tests/create')}
                  className="text-xs font-medium text-zinc-900 hover:underline underline-offset-2 flex items-center gap-1"
                >
                  <Plus size={12} /> Test yaratish
                </button>
              )}
            </div>
          ) : (
            <motion.ul 
              initial="hidden"
              animate="show"
              variants={{
                hidden: { opacity: 0 },
                show: { opacity: 1, transition: { staggerChildren: 0.05 } }
              }}
              className="divide-y divide-zinc-100"
            >
              {filteredTests.map((test) => (
                <motion.li
                  variants={{
                    hidden: { opacity: 0, y: 10 },
                    show: { opacity: 1, y: 0, transition: { duration: 0.3 } }
                  }}
                  key={test.id}
                  className="group hover:bg-zinc-50 transition-all flex items-center justify-between p-4 cursor-pointer hover:pl-6"
                  onClick={() => navigate(`/online-tests/details/${test.id}`)}
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <h3 className="text-sm font-medium text-zinc-900 leading-none mb-1.5">{test.title}</h3>
                      <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                        <span className="font-medium bg-zinc-100 border border-zinc-200 px-1.5 py-0.5 rounded text-zinc-700">
                          {test.subject}
                        </span>
                        <span>{test.questions?.length || 0} savol</span>
                        <span>•</span>
                        <span>{new Date(test.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => handleDeleteTest(e, test.id)}
                      className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                      title="O'chirish"
                    >
                      <Trash2 size={14} />
                    </button>
                    <div className="text-zinc-400 group-hover:text-zinc-900 transition-colors">
                      <ChevronRight size={16} />
                    </div>
                  </div>
                </motion.li>
              ))}
            </motion.ul>
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
