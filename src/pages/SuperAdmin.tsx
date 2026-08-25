import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../lib/db';
import { 
  Users, 
  FileText, 
  Award, 
  ShieldAlert, 
  LayoutDashboard,
  LogOut,
  Search,
  ArrowRight,
  Crown
} from 'lucide-react';
import { toast } from 'sonner';
import { getToken, getTeacher, fetchCurrentTeacher } from '../lib/auth';
import MeshGradient from '../components/ui/MeshGradient';

const containerVariants: any = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 }
  }
};

const itemVariants: any = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
};

export default function SuperAdmin() {
  const [activeTab, setActiveTab] = useState<'overview' | 'teachers' | 'subscriptions' | 'tests' | 'results'>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({ teachers: 0, tests: 0, results: 0 });
  const [teachers, setTeachers] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [tests, setTests] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const navigate = useNavigate();

  const fetchAdminData = async () => {
    const token = getToken();
    const teacherData = getTeacher() || {};
    
    if (!token || teacherData.role !== 'admin') {
      toast.error('Bu sahifaga kirish huquqingiz yo\'q!');
      navigate('/online-tests');
      return;
    }

    setIsLoading(true);
    try {
      const [statsData, teachersData, subsData, testsData, resultsData] = await Promise.all([
        db.getAdminStats(token),
        db.getAdminTeachers(token),
        db.getAdminSubscriptions(token),
        db.getAdminTests(token),
        db.getAdminResults(token)
      ]);
      
      setStats(statsData);
      setTeachers(teachersData);
      setSubscriptions(subsData || []);
      setTests(testsData);
      setResults(resultsData);
    } catch (error: any) {
      toast.error(error.message || 'Xatolik yuz berdi');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [navigate]);

  useEffect(() => {
    setSearchQuery('');
  }, [activeTab]);

  const filteredTeachers = useMemo(() => {
    if (!searchQuery) return teachers;
    const q = searchQuery.toLowerCase();
    return teachers.filter(t => t.name?.toLowerCase().includes(q) || t.email?.toLowerCase().includes(q));
  }, [teachers, searchQuery]);

  const filteredTests = useMemo(() => {
    if (!searchQuery) return tests;
    const q = searchQuery.toLowerCase();
    return tests.filter(t => t.title?.toLowerCase().includes(q) || t.teacher?.name?.toLowerCase().includes(q) || t.id?.toLowerCase().includes(q));
  }, [tests, searchQuery]);

  const filteredResults = useMemo(() => {
    if (!searchQuery) return results;
    const q = searchQuery.toLowerCase();
    return results.filter(r => r.studentName?.toLowerCase().includes(q) || r.test?.title?.toLowerCase().includes(q) || r.testId?.toLowerCase().includes(q));
  }, [results, searchQuery]);

  const pendingSubsCount = useMemo(() => {
    return subscriptions.filter(s => s.planStatus === 'pending').length;
  }, [subscriptions]);

  const handleUpdateTeacherPlan = async (teacherId: string, plan: string, status: string = 'active', durationDays: number = 30) => {
    const token = getToken();
    if (!token) return;
    try {
      await db.updateTeacherPlan(token, teacherId, plan, status, durationDays);
      toast.success(`Dostup faollashtirildi! Tarif: ${plan.toUpperCase()}`);
      await fetchCurrentTeacher();
      fetchAdminData();
    } catch (err: any) {
      toast.error(err.message || "Xatolik yuz berdi");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#fdfdfd] flex flex-col justify-center items-center font-sans">
        <div className="w-5 h-5 border-2 border-black/10 border-t-black rounded-full animate-spin mb-3"></div>
        <p className="text-gray-500 font-medium text-[11px] uppercase tracking-widest">Yuklanmoqda</p>
      </div>
    );
  }

  const EmptyState = ({ message }: { message: string }) => (
    <div className="flex flex-col items-center justify-center py-16 md:py-24 px-4 text-center border-b border-black/10">
      <div className="w-12 h-12 rounded-full border border-black/10 flex items-center justify-center mb-6">
        <Search className="w-5 h-5 text-gray-400" strokeWidth={1.5} />
      </div>
      <p className="text-gray-500 text-lg">{message}</p>
    </div>
  );

  return (
    <div className="min-h-screen text-[#111111] font-sans selection:bg-black selection:text-white relative overflow-hidden">
      <MeshGradient />

      <div className="max-w-7xl mx-auto px-6 py-12 md:py-32 flex flex-col gap-16 md:gap-32 relative z-10">
        
        {/* HEADER & NAV */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
          
          {/* LEFT SIDEBAR NAVIGATION */}
          <div className="md:col-span-4 md:sticky md:top-32 h-fit flex flex-col gap-8">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1 }}>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-[10px] font-semibold tracking-[0.3em] uppercase text-gray-500 flex items-center gap-2">
                  <ShieldAlert className="w-3.5 h-3.5" /> Boshqaruv
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl font-medium tracking-tight">Super Admin</h1>
            </motion.div>

            <nav className="flex flex-col gap-0 border-t border-black/10">
              {[
                { id: 'overview', icon: LayoutDashboard, label: 'Umumiy Holat' },
                { id: 'subscriptions', icon: Crown, label: 'Tariflar & Dostup', badge: pendingSubsCount },
                { id: 'teachers', icon: Users, label: 'O\'qituvchilar' },
                { id: 'tests', icon: FileText, label: 'Barcha Testlar' },
                { id: 'results', icon: Award, label: 'Natijalar' }
              ].map(tab => {
                const isActive = activeTab === tab.id;
                const Icon = tab.icon;
                return (
                  <button 
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center justify-between border-b border-black/10 py-4 md:py-6 text-left group transition-all duration-300 ${isActive ? 'text-black pl-4 border-black/30' : 'text-gray-400 hover:text-black hover:pl-2'}`}
                  >
                    <span className="flex items-center gap-4 text-sm font-semibold tracking-[0.1em] uppercase">
                      <Icon className="w-4 h-4" strokeWidth={isActive ? 2 : 1.5} />
                      <span>{tab.label}</span>
                      {tab.badge ? (
                        <span className="bg-amber-500 text-black text-[10px] font-extrabold px-2 py-0.5 rounded-full animate-pulse">
                          {tab.badge}
                        </span>
                      ) : null}
                    </span>
                    {isActive && <ArrowRight className="w-4 h-4" />}
                  </button>
                );
              })}
              <button 
                onClick={() => navigate('/')}
                className="flex items-center justify-between border-b border-black/10 py-4 md:py-6 text-left group transition-all duration-300 text-gray-400 hover:text-black hover:pl-2"
              >
                <span className="flex items-center gap-4 text-sm font-semibold tracking-[0.1em] uppercase">
                  <LogOut className="w-4 h-4" strokeWidth={1.5} />
                  Chiqish
                </span>
              </button>
            </nav>
          </div>

          {/* RIGHT CONTENT */}
          <div className="md:col-span-8 min-w-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="w-full flex flex-col gap-16"
              >
                
                {/* OVERVIEW TAB */}
                {activeTab === 'overview' && (
                  <motion.div variants={containerVariants} initial="hidden" animate="show" className="flex flex-col gap-12 md:gap-16">
                    <div>
                      <motion.h2 variants={itemVariants} className="text-xs font-semibold tracking-[0.3em] uppercase text-gray-500 mb-8 border-b border-black/10 pb-4">Statistika</motion.h2>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                        {[
                          { label: "O'qituvchilar", count: stats.teachers },
                          { label: "Testlar", count: stats.tests },
                          { label: "Natijalar", count: stats.results }
                        ].map((stat, i) => (
                          <motion.div variants={itemVariants} key={i} className="flex flex-col gap-2">
                            <span className="text-4xl font-medium tracking-tight">{stat.count}</span>
                            <span className="text-xs font-semibold tracking-[0.1em] uppercase text-gray-400">{stat.label}</span>
                          </motion.div>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 md:gap-16">
                      {/* Recent Tests */}
                      <motion.div variants={itemVariants}>
                        <div className="flex items-center justify-between border-b border-black/10 pb-4 mb-4">
                          <h2 className="text-[10px] font-semibold tracking-[0.3em] uppercase text-gray-500">So'nggi Testlar</h2>
                        </div>
                        {tests.length === 0 ? <p className="text-gray-400 py-8 text-sm uppercase tracking-widest">Testlar mavjud emas.</p> : (
                          <div className="flex flex-col">
                            {tests.slice(0, 5).map(t => (
                              <div key={t._id} className="border-b border-black/10 py-4 md:py-6 group flex justify-between items-center">
                                <div className="min-w-0 pr-4">
                                  <h3 className="text-base md:text-lg font-medium mb-1 truncate">{t.title}</h3>
                                  <p className="text-xs md:text-sm text-gray-500 truncate">{t.teacher?.name || 'Noma\'lum'}</p>
                                </div>
                                <span className="text-[10px] md:text-xs tracking-[0.1em] text-gray-400 whitespace-nowrap">
                                  {new Date(t.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </motion.div>

                      {/* Recent Teachers */}
                      <motion.div variants={itemVariants}>
                        <div className="flex items-center justify-between border-b border-black/10 pb-4 mb-4">
                          <h2 className="text-[10px] font-semibold tracking-[0.3em] uppercase text-gray-500">So'nggi Ustozlar</h2>
                        </div>
                        {teachers.length === 0 ? <p className="text-gray-400 py-8 text-sm uppercase tracking-widest">O'qituvchilar mavjud emas.</p> : (
                          <div className="flex flex-col">
                            {teachers.slice(0, 5).map(t => (
                              <div key={t._id} className="border-b border-black/10 py-4 md:py-6 group flex justify-between items-center">
                                <div className="min-w-0 pr-4">
                                  <h3 className="text-base md:text-lg font-medium mb-1 truncate">{t.name}</h3>
                                  <p className="text-xs md:text-sm text-gray-500 truncate">{t.email}</p>
                                </div>
                                <div>
                                  {t.role === 'admin' ? (
                                    <span className="text-[10px] uppercase tracking-widest font-bold text-black">Admin</span>
                                  ) : (
                                    <span className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Ustoz</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    </div>
                  </motion.div>
                )}

                {/* SUBSCRIPTIONS & PAYMENT APPROVAL TAB (PREMIUM MINIMALIST UI) */}
                {activeTab === 'subscriptions' && (
                  <motion.div variants={containerVariants} initial="hidden" animate="show" className="flex flex-col w-full">
                    <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-black/10 pb-8 mb-8 gap-6">
                      <div>
                        <motion.h2 variants={itemVariants} className="text-xs font-semibold tracking-[0.3em] uppercase text-gray-500 mb-1">
                          OBUNA VA DOSTUP BOSHQARUVI
                        </motion.h2>
                        <p className="text-xs text-gray-400 leading-relaxed max-w-sm">
                          Foydalanuvchi to'lov so'rovlarini ko'rish hamda 1 marta bosishda tariflarni faollashtirish.
                        </p>
                      </div>
                      
                      <motion.div variants={itemVariants} className="relative w-full md:w-72">
                        <input 
                          type="text" 
                          placeholder="Foydalanuvchi yoki email..." 
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full border-b border-black/20 pb-2 bg-transparent text-lg focus:outline-none focus:border-black transition-colors placeholder:text-gray-300"
                        />
                        <Search className="absolute right-0 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" strokeWidth={1.5} />
                      </motion.div>
                    </div>

                    {subscriptions.length === 0 ? (
                      <EmptyState message="Hech qanday obuna so'rovi mavjud emas." />
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left whitespace-nowrap border-collapse">
                          <thead>
                            <tr>
                              <th className="py-4 border-b border-black/10 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Foydalanuvchi</th>
                              <th className="py-4 border-b border-black/10 text-[10px] font-semibold text-gray-400 uppercase tracking-widest pl-6">Joriy Tarif</th>
                              <th className="py-4 border-b border-black/10 text-[10px] font-semibold text-gray-400 uppercase tracking-widest pl-6">So'rov / Chek kodi</th>
                              <th className="py-4 border-b border-black/10 text-[10px] font-semibold text-gray-400 uppercase tracking-widest pl-6">Holat</th>
                              <th className="py-4 border-b border-black/10 text-[10px] font-semibold text-gray-400 uppercase tracking-widest text-right">Dostup Ochish</th>
                            </tr>
                          </thead>
                          <tbody>
                            {subscriptions
                              .filter(s => !searchQuery || s.name?.toLowerCase().includes(searchQuery.toLowerCase()) || s.email?.toLowerCase().includes(searchQuery.toLowerCase()))
                              .map(s => {
                                const isPending = s.planStatus === 'pending';
                                return (
                                  <tr key={s._id} className="group hover:bg-black/[0.02] transition-colors border-b border-black/10">
                                    {/* User Details */}
                                    <td className="py-4 md:py-6 pl-4 md:pl-0 group-hover:pl-4 transition-all duration-300">
                                      <div className="text-lg md:text-xl font-medium tracking-tight text-neutral-900">{s.name}</div>
                                      <div className="text-xs font-mono tracking-wider text-gray-400 mt-0.5">{s.email}</div>
                                    </td>
                                    
                                    {/* Current Plan Badge */}
                                    <td className="py-4 md:py-6 pl-6">
                                      {s.plan === 'premium' ? (
                                        <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-white bg-black px-3 py-1 rounded-full shadow-sm">
                                          Premium 👑
                                        </span>
                                      ) : s.plan === 'standard' ? (
                                        <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-black border border-black/80 px-3 py-1 rounded-full bg-black/5">
                                          Standard 🔥
                                        </span>
                                      ) : (
                                        <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-gray-400 border border-black/10 px-3 py-1 rounded-full">
                                          Free
                                        </span>
                                      )}
                                    </td>

                                    {/* Requested Plan / Payment Note */}
                                    <td className="py-4 md:py-6 pl-6">
                                      {s.requestedPlan ? (
                                        <div className="flex flex-col gap-0.5">
                                          <span className="text-xs font-semibold tracking-wide text-neutral-900 uppercase">
                                            {s.requestedPlan} TARIFI
                                          </span>
                                          {s.paymentNote ? (
                                            <span className="text-[11px] font-mono text-gray-500">
                                              {s.paymentNote}
                                            </span>
                                          ) : (
                                            <span className="text-[11px] text-gray-300">Chek biriktirilmagan</span>
                                          )}
                                        </div>
                                      ) : (
                                        <span className="text-xs text-gray-300">—</span>
                                      )}
                                    </td>

                                    {/* Status */}
                                    <td className="py-4 md:py-6 pl-6">
                                      {isPending ? (
                                        <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-amber-600 border border-amber-500/30 px-3 py-1 rounded-full bg-amber-500/5">
                                          Kutilmoqda ⏳
                                        </span>
                                      ) : (
                                        <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-gray-400 border border-black/10 px-3 py-1 rounded-full">
                                          Faol 🟢
                                        </span>
                                      )}
                                    </td>

                                    {/* Dostup Action Buttons */}
                                    <td className="py-4 md:py-6 pr-4 md:pr-0 text-right">
                                      <div className="flex items-center justify-end gap-3">
                                        {isPending && s.requestedPlan && (
                                          <button
                                            onClick={() => handleUpdateTeacherPlan(s._id, s.requestedPlan, 'active', 30)}
                                            className="px-4 py-2 rounded-xl bg-black hover:bg-neutral-800 text-white font-medium text-xs tracking-wide uppercase transition-all duration-300 shadow-sm flex items-center gap-1.5"
                                          >
                                            <span>Dostup Ochish</span>
                                            <ArrowRight className="w-3.5 h-3.5 transform -rotate-45 group-hover:rotate-0 transition-transform" />
                                          </button>
                                        )}

                                        {/* Minimalist Plan Selector Dropdown */}
                                        <select
                                          value={s.plan || 'free'}
                                          onChange={(e) => handleUpdateTeacherPlan(s._id, e.target.value, 'active', 30)}
                                          className="text-xs font-semibold uppercase tracking-wider bg-transparent border border-black/10 rounded-xl px-3 py-2 focus:outline-none hover:border-black/30 transition-all text-neutral-800"
                                        >
                                          <option value="free">Free</option>
                                          <option value="standard">Standard (30 kun)</option>
                                          <option value="premium">Premium (30 kun)</option>
                                        </select>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* TEACHERS TAB */}
                {activeTab === 'teachers' && (
                  <motion.div variants={containerVariants} initial="hidden" animate="show" className="flex flex-col w-full">
                    <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-black/10 pb-8 mb-8 gap-6">
                      <motion.h2 variants={itemVariants} className="text-xs font-semibold tracking-[0.3em] uppercase text-gray-500">O'qituvchilar Boshqaruvi</motion.h2>
                      <motion.div variants={itemVariants} className="relative w-full md:w-72">
                        <input 
                          type="text" 
                          placeholder="Ism yoki email..." 
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full border-b border-black/20 pb-2 bg-transparent text-lg focus:outline-none focus:border-black transition-colors placeholder:text-gray-300"
                        />
                        <Search className="absolute right-0 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" strokeWidth={1.5} />
                      </motion.div>
                    </div>

                    {filteredTeachers.length === 0 ? (
                      <EmptyState message="Hech qanday o'qituvchi topilmadi." />
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left whitespace-nowrap border-collapse">
                          <thead>
                            <tr>
                              <th className="py-4 border-b border-black/10 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Ustoz</th>
                              <th className="py-4 border-b border-black/10 text-[10px] font-semibold text-gray-400 uppercase tracking-widest pl-6">Fan</th>
                              <th className="py-4 border-b border-black/10 text-[10px] font-semibold text-gray-400 uppercase tracking-widest pl-6">Testlar</th>
                              <th className="py-4 border-b border-black/10 text-[10px] font-semibold text-gray-400 uppercase tracking-widest text-right">Holat</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredTeachers.map(t => (
                              <tr key={t._id} className="group hover:bg-[#f8f8f8] transition-colors border-b border-black/10">
                                <td className="py-4 md:py-6 pl-4 md:pl-0 group-hover:pl-4 transition-all duration-300">
                                  <div className="text-lg md:text-xl font-medium tracking-tight">{t.name}</div>
                                  <div className="text-xs tracking-wider text-gray-500 mt-1 uppercase">{t.email}</div>
                                </td>
                                <td className="py-4 md:py-6 pl-6 text-gray-600 font-medium">{t.subject || '—'}</td>
                                <td className="py-4 md:py-6 pl-6 text-xl font-medium">{t.testCount || 0}</td>
                                <td className="py-4 md:py-6 pr-4 md:pr-0 text-right">
                                  {t.role === 'admin' ? (
                                    <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-black border border-black/10 px-3 py-1 rounded-full">Admin</span>
                                  ) : (
                                    <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-gray-500 border border-black/10 px-3 py-1 rounded-full">Ustoz</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* TESTS TAB */}
                {activeTab === 'tests' && (
                  <motion.div variants={containerVariants} initial="hidden" animate="show" className="flex flex-col w-full">
                    <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-black/10 pb-8 mb-8 gap-6">
                      <motion.h2 variants={itemVariants} className="text-xs font-semibold tracking-[0.3em] uppercase text-gray-500">Barcha Testlar</motion.h2>
                      <motion.div variants={itemVariants} className="relative w-full md:w-72">
                        <input 
                          type="text" 
                          placeholder="Test nomi yoki ID..." 
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full border-b border-black/20 pb-2 bg-transparent text-lg focus:outline-none focus:border-black transition-colors placeholder:text-gray-300"
                        />
                        <Search className="absolute right-0 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" strokeWidth={1.5} />
                      </motion.div>
                    </div>

                    {filteredTests.length === 0 ? (
                      <EmptyState message="Hech qanday test topilmadi." />
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left whitespace-nowrap border-collapse">
                          <thead>
                            <tr>
                              <th className="py-4 border-b border-black/10 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Test</th>
                              <th className="py-4 border-b border-black/10 text-[10px] font-semibold text-gray-400 uppercase tracking-widest pl-6">O'qituvchi</th>
                              <th className="py-4 border-b border-black/10 text-[10px] font-semibold text-gray-400 uppercase tracking-widest pl-6">Savollar</th>
                              <th className="py-4 border-b border-black/10 text-[10px] font-semibold text-gray-400 uppercase tracking-widest text-right">Sana</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredTests.map(t => (
                              <tr key={t._id} className="group hover:bg-[#f8f8f8] transition-colors border-b border-black/10">
                                <td className="py-4 md:py-6 pl-4 md:pl-0 group-hover:pl-4 transition-all duration-300">
                                  <div className="text-lg md:text-xl font-medium tracking-tight">{t.title}</div>
                                  <div className="text-[11px] font-mono tracking-widest text-gray-400 mt-1 uppercase">#{t.id}</div>
                                </td>
                                <td className="py-4 md:py-6 pl-6">
                                  <div className="text-base text-black font-medium">{t.teacher?.name || 'Noma\'lum'}</div>
                                  <div className="text-xs text-gray-500 mt-1 tracking-wider uppercase">{t.teacher?.subject || t.subject}</div>
                                </td>
                                <td className="py-4 md:py-6 pl-6 text-xl font-medium">{t.questions?.length || 0}</td>
                                <td className="py-4 md:py-6 pr-4 md:pr-0 text-right text-gray-500 text-sm tracking-wider">
                                  {new Date(t.createdAt).toLocaleDateString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* RESULTS TAB */}
                {activeTab === 'results' && (
                  <motion.div variants={containerVariants} initial="hidden" animate="show" className="flex flex-col w-full">
                    <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-black/10 pb-8 mb-8 gap-6">
                      <motion.h2 variants={itemVariants} className="text-xs font-semibold tracking-[0.3em] uppercase text-gray-500">Test Natijalari</motion.h2>
                      <motion.div variants={itemVariants} className="relative w-full md:w-72">
                        <input 
                          type="text" 
                          placeholder="O'quvchi yoki test..." 
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full border-b border-black/20 pb-2 bg-transparent text-lg focus:outline-none focus:border-black transition-colors placeholder:text-gray-300"
                        />
                        <Search className="absolute right-0 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" strokeWidth={1.5} />
                      </motion.div>
                    </div>

                    {filteredResults.length === 0 ? (
                      <EmptyState message="Hech qanday natija topilmadi." />
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left whitespace-nowrap border-collapse">
                          <thead>
                            <tr>
                              <th className="py-4 border-b border-black/10 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">O'quvchi</th>
                              <th className="py-4 border-b border-black/10 text-[10px] font-semibold text-gray-400 uppercase tracking-widest pl-6">Test</th>
                              <th className="py-4 border-b border-black/10 text-[10px] font-semibold text-gray-400 uppercase tracking-widest pl-6">Ustoz</th>
                              <th className="py-4 border-b border-black/10 text-[10px] font-semibold text-gray-400 uppercase tracking-widest text-right">Natija</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredResults.map((r, idx) => (
                              <tr key={r._id || idx} className="group hover:bg-[#f8f8f8] transition-colors border-b border-black/10">
                                <td className="py-4 md:py-6 pl-4 md:pl-0 group-hover:pl-4 transition-all duration-300 text-lg md:text-xl font-medium tracking-tight text-black capitalize">
                                  {r.studentName}
                                </td>
                                <td className="py-4 md:py-6 pl-6">
                                  <div className="text-base font-medium text-black">{r.test?.title || 'Oflayn Test'}</div>
                                  <div className="text-[11px] font-mono tracking-widest text-gray-400 mt-1 uppercase">#{r.testId || r.id}</div>
                                </td>
                                <td className="py-4 md:py-6 pl-6 text-base text-gray-500 font-medium">{r.teacher?.name || '—'}</td>
                                <td className="py-4 md:py-6 pr-4 md:pr-0 text-right">
                                  <span className={`text-2xl md:text-3xl font-medium tracking-tight ${
                                    r.totalScore >= 70 ? 'text-black' : 
                                    r.totalScore >= 50 ? 'text-gray-500' : 
                                    'text-red-400'
                                  }`}>
                                    {r.totalScore}<span className="text-sm font-normal text-gray-400 ml-1">%</span>
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </motion.div>
                )}

              </motion.div>
            </AnimatePresence>
          </div>

        </div>
      </div>
    </div>
  );
}
