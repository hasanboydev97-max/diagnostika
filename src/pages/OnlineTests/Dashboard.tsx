import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Plus, ChevronRight, FileText, Search, Trash2, ShieldAlert, Crown, Gamepad2, Scan, Printer  } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { getAuthHeaders, getToken, getTeacher, fetchCurrentTeacher } from '../../lib/auth';
import MeshGradient from '../../components/ui/MeshGradient';
import TeacherProfileModal from '../../components/TeacherProfileModal';
import AiTestCreatorModal from '../../components/AiTestCreatorModal';
import MagicButton from '../../components/MagicButton';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface OnlineTest {
  id: string;
  title: string;
  subject: string;
  questions: any[];
  createdAt: string;
  isDiagnostic?: boolean;
}

export default function OnlineTestsDashboard() {
  const [tests, setTests] = useState<OnlineTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
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
        <div className="max-w-7xl mx-auto px-2.5 md:px-6 h-16 flex items-center justify-between">
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
                <span className="absolute -top-1.5 -right-1.5 w-[16px] h-[16px] bg-gradient-to-br from-amber-400 to-amber-600 rounded-full border-2 border-white shadow-sm flex items-center justify-center">
                  <Crown size={9} className="text-white fill-white" />
                </span>
              ) : (
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white"></span>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-2.5 md:px-6 py-6 md:py-8 relative z-10">
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

        {/* Test Creation Hub */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <button 
            onClick={() => setIsAiModalOpen(true)}
            className="bg-white border border-zinc-200/80 p-5 rounded-2xl flex items-start gap-4 hover:border-zinc-300 shadow-sm hover:shadow-[4px_4px_0px_0px_#d4d4d8] hover:-translate-y-[2px] hover:-translate-x-[2px] transition-all duration-200 text-left group"
          >
            <div className="w-12 h-12 shrink-0 bg-black text-white rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
              <Sparkles size={20} className="text-amber-300" />
            </div>
            <div>
              <h3 className="text-[15px] font-bold text-zinc-900 tracking-tight">AI Diagnostika Testi</h3>
              <p className="text-[12px] text-zinc-500 mt-1 leading-relaxed">
                O'quvchining bilimini chuqur tahlil qiluvchi (Kognitiv yo'l xaritasi) AI test. Avtomatik baholanadi.
              </p>
            </div>
          </button>
          
          <button 
            onClick={() => navigate('/online-tests/create')}
            className="bg-[#111111] border border-black p-5 rounded-2xl flex items-start gap-4 hover:bg-black shadow-sm hover:shadow-[4px_4px_0px_0px_#27272a] hover:-translate-y-[2px] hover:-translate-x-[2px] transition-all duration-200 text-left group"
          >
            <div className="w-12 h-12 shrink-0 bg-white/10 border border-white/5 text-white rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
              <Plus size={24} />
            </div>
            <div>
              <h3 className="text-[15px] font-bold text-white tracking-tight">Standart Test Yaratish</h3>
              <p className="text-[12px] text-zinc-400 mt-1 leading-relaxed">
                Sarlavha va vaqt belgilangan oddiy ballik test (Excel, AI, OCR, Qo'lda kiritish orqali).
              </p>
            </div>
          </button>
        </div>

        {/* Controls & Search */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-8 bg-zinc-50/50 p-3 rounded-2xl border border-zinc-100">
          <div className="relative w-full md:w-96 flex items-center">
            <Search className="absolute left-3.5 text-zinc-400" size={16} />
            <input 
              type="text" 
              placeholder="Test nomini qidirish..." 
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-zinc-200/80 rounded-xl focus:outline-none focus:border-black focus:ring-2 focus:ring-black/5 transition-all shadow-sm text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="w-full md:w-auto flex flex-wrap sm:flex-nowrap gap-2">
            <button
              onClick={() => navigate('/admin/omr-scanner')}
              className="bg-white border border-zinc-200/80 text-zinc-700 hover:bg-zinc-50 px-4 py-2.5 rounded-xl font-bold text-[11px] uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-200 shadow-sm hover:border-zinc-300 hover:shadow-[3px_3px_0px_0px_#d4d4d8] hover:-translate-y-[1px] hover:-translate-x-[1px]"
              title="Kamera va ZipGrade orqali testlarni tekshirish"
            >
              <Scan size={14} className="text-zinc-800" />
              OMR Skanner
            </button>
            <button
              onClick={() => navigate('/admin/omr-generator')}
              className="bg-white border border-zinc-200/80 text-zinc-700 hover:bg-zinc-50 px-4 py-2.5 rounded-xl font-bold text-[11px] uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-200 shadow-sm hover:border-zinc-300 hover:shadow-[3px_3px_0px_0px_#d4d4d8] hover:-translate-y-[1px] hover:-translate-x-[1px]"
              title="Test javoblar varaqasini chop etish uchun PDF yaratish"
            >
              <Printer size={14} className="text-zinc-500" />
              Varaqa PDF
            </button>
            <button
              onClick={() => navigate('/games')}
              className="bg-white border border-zinc-200/80 text-zinc-700 hover:bg-zinc-50 px-4 py-2.5 rounded-xl font-bold text-[11px] uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-200 shadow-sm hover:border-zinc-300 hover:shadow-[3px_3px_0px_0px_#d4d4d8] hover:-translate-y-[1px] hover:-translate-x-[1px]"
            >
              <Gamepad2 size={14} className="text-zinc-800" />
              O'yinlar
            </button>
          </div>
        </div>

        {/* List Section */}
        <div>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white border border-zinc-200/80 rounded-2xl p-5 md:p-6 h-[160px] flex flex-col justify-between animate-pulse shadow-xs">
                  <div className="space-y-3 w-full">
                    <div className="flex justify-between">
                       <div className="h-5 bg-zinc-100 rounded-md w-16"></div>
                       <div className="h-5 bg-zinc-100 rounded-md w-6"></div>
                    </div>
                    <div className="h-5 bg-zinc-200 rounded-md w-full"></div>
                    <div className="h-5 bg-zinc-200 rounded-md w-2/3"></div>
                  </div>
                  <div className="flex justify-between items-center border-t border-zinc-100 pt-3">
                     <div className="h-3 bg-zinc-100 rounded-md w-24"></div>
                     <div className="h-5 bg-zinc-100 rounded-md w-5"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredTests.length === 0 ? (
            <div className="bg-white border border-zinc-200/80 rounded-2xl p-16 flex flex-col items-center justify-center text-center shadow-xs">
              <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mb-5 border border-zinc-200">
                <FileText className="text-zinc-400" size={32} strokeWidth={1.5} />
              </div>
              <h3 className="text-xl font-bold text-zinc-900 mb-2">Ma'lumot topilmadi</h3>
              <p className="text-zinc-500 mb-6 max-w-md text-sm">Hali hech qanday test yaratmagansiz. O'quvchilaringiz uchun birinchi onlayn testingizni yarating.</p>
              {!search && (
                <div className="mt-2">
                  <MagicButton
                    onClick={() => navigate('/online-tests/create')}
                    label="Test Yaratish"
                    icon={<Plus />}
                  />
                </div>
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
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6"
            >
              {filteredTests.map((test) => (
                <motion.div
                  variants={{
                    hidden: { opacity: 0, y: 10 },
                    show: { opacity: 1, y: 0, transition: { duration: 0.3 } }
                  }}
                  key={test.id}
                  onClick={() => navigate(`/online-tests/details/${test.id}`)}
                  className={`border transition-all duration-200 rounded-2xl p-5 md:p-6 flex flex-col justify-between relative group cursor-pointer hover:-translate-y-[2px] hover:-translate-x-[2px] ${
                    test.isDiagnostic
                      ? 'bg-gradient-to-br from-zinc-50 to-white border-black/10 hover:border-black/30 hover:shadow-[4px_4px_0px_0px_#27272a] shadow-sm'
                      : 'bg-white border-zinc-200/80 hover:border-zinc-300 shadow-sm hover:shadow-[4px_4px_0px_0px_#d4d4d8]'
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex flex-wrap gap-2">
                        {test.isDiagnostic && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#111111] text-white text-[10px] font-bold uppercase tracking-widest rounded-md shadow-sm">
                            <Sparkles size={12} className="text-yellow-400" />
                            AI Diagnostika
                          </span>
                        )}
                        <span className={`inline-flex items-center px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md ${
                          test.isDiagnostic ? 'bg-zinc-100 text-zinc-600' : 'bg-zinc-100 text-zinc-700'
                        }`}>
                          {test.subject}
                        </span>
                      </div>
                      <button 
                        onClick={(e) => handleDeleteTest(e, test.id)}
                        className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 z-10"
                        title="O'chirish"
                      >
                        <Trash2 size={16} strokeWidth={1.5} />
                      </button>
                    </div>
                    
                    <h3 className={`text-[15px] font-semibold font-sans transition-colors mb-3 line-clamp-2 leading-snug tracking-tight ${
                      test.isDiagnostic ? 'text-neutral-900 group-hover:text-black' : 'text-neutral-900 group-hover:text-black'
                    }`}>{test.title}</h3>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-zinc-100 flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs text-zinc-500 font-medium">
                      <div className="flex items-center gap-1.5">
                        <FileText size={14} strokeWidth={1.5} />
                        <span>{test?.questions?.length || 0} savol</span>
                      </div>
                      <span className="w-1 h-1 rounded-full bg-zinc-300"></span>
                      <span>{new Date(test.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                      test.isDiagnostic ? 'bg-zinc-100 group-hover:bg-black group-hover:text-white' : 'bg-zinc-50 group-hover:bg-zinc-900 group-hover:text-white'
                    }`}>
                      <ChevronRight size={16} className={`transition-colors ${test.isDiagnostic ? 'text-zinc-500 group-hover:text-white' : 'text-zinc-400 group-hover:text-white'}`} strokeWidth={2} />
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
    
      {isAiModalOpen && (
        <AiTestCreatorModal
          initialGrade="5"
          blueprint={[]}
          teacherSubject={teacher?.subject || ''}
          onClose={() => {
            setIsAiModalOpen(false);
            fetchTests(); // Refresh the list in case a test was saved!
          }}
        />
      )}
    </div>
  );
}
