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
  TrendingUp,
  Activity,
  Search,
  Inbox
} from 'lucide-react';
import { toast } from 'sonner';
import { getToken, getTeacher } from '../lib/auth';

export default function SuperAdmin() {
  const [activeTab, setActiveTab] = useState<'overview' | 'teachers' | 'tests' | 'results'>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({ teachers: 0, tests: 0, results: 0 });
  const [teachers, setTeachers] = useState<any[]>([]);
  const [tests, setTests] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const navigate = useNavigate();

  useEffect(() => {
    const token = getToken();
    const teacherData = getTeacher() || {};
    
    if (!token || teacherData.role !== 'admin') {
      toast.error('Bu sahifaga kirish huquqingiz yo\'q!');
      navigate('/online-tests');
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [statsData, teachersData, testsData, resultsData] = await Promise.all([
          db.getAdminStats(token),
          db.getAdminTeachers(token),
          db.getAdminTests(token),
          db.getAdminResults(token)
        ]);
        
        setStats(statsData);
        setTeachers(teachersData);
        setTests(testsData);
        setResults(resultsData);
      } catch (error: any) {
        toast.error(error.message || 'Xatolik yuz berdi');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  // Reset search when changing tabs
  useEffect(() => {
    setSearchQuery('');
  }, [activeTab]);

  // Derived filtered data
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center items-center font-['Space_Grotesk']">
        <div className="w-10 h-10 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 font-medium text-sm">Tizimga ulanilmoqda...</p>
      </div>
    );
  }

  const EmptyState = ({ message }: { message: string }) => (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4">
        <Inbox className="w-8 h-8 text-slate-300" />
      </div>
      <p className="text-slate-500 font-medium">{message}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-['Space_Grotesk'] text-slate-900 selection:bg-slate-900 selection:text-white">
      
      {/* Sidebar - Desktop */}
      <div className="w-64 bg-white border-r border-slate-100 hidden md:flex flex-col sticky top-0 h-screen">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-bold text-slate-900 text-sm tracking-wide">Maktab Diagnostikasi</h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mt-0.5">Admin Portal</p>
          </div>
        </div>
        
        <div className="flex-1 py-4 flex flex-col gap-1 px-3">
          {[
            { id: 'overview', icon: LayoutDashboard, label: 'Umumiy Holat' },
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
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive ? 'bg-slate-50 text-slate-900' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50/50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-slate-900' : 'text-slate-400'}`} />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="p-4">
          <button 
            onClick={() => navigate('/')}
            className="flex w-full items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors group"
          >
            <LogOut className="w-4 h-4 text-slate-400 group-hover:text-slate-900" />
            Bosh sahifaga qaytish
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Mobile Header & Nav */}
        <div className="md:hidden bg-white border-b border-slate-100 sticky top-0 z-20">
          <div className="p-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-slate-900" />
              <h1 className="font-bold text-slate-900 text-sm tracking-wide">Admin Portal</h1>
            </div>
            <button onClick={() => navigate('/')} className="text-slate-400 hover:text-slate-900 p-1" title="Bosh sahifaga qaytish">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
          <div className="flex overflow-x-auto px-4 pb-4 gap-2 no-scrollbar">
            {[
              { id: 'overview', label: 'Umumiy' },
              { id: 'teachers', label: 'O\'qituvchilar' },
              { id: 'tests', label: 'Testlar' },
              { id: 'results', label: 'Natijalar' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-1.5 rounded-full whitespace-nowrap text-xs font-semibold transition-all ${
                  activeTab === tab.id ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-600 border border-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
          
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-8"
            >
              
              {/* OVERVIEW TAB */}
              {activeTab === 'overview' && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { label: "Jami O'qituvchilar", count: stats.teachers, icon: Users },
                      { label: "Jami Testlar", count: stats.tests, icon: FileText },
                      { label: "Jami Natijalar", count: stats.results, icon: Award }
                    ].map((stat, i) => (
                      <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-[0_2px_10px_rgb(0,0,0,0.02)] flex flex-col justify-between h-32">
                        <div className="flex justify-between items-start">
                          <p className="text-slate-500 font-medium text-sm">{stat.label}</p>
                          <stat.icon className="w-5 h-5 text-slate-300" />
                        </div>
                        <h3 className="text-3xl font-bold tracking-tight">{stat.count}</h3>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Recent Tests */}
                    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-[0_2px_10px_rgb(0,0,0,0.02)] p-6">
                      <div className="flex items-center gap-2 mb-6">
                        <TrendingUp className="w-4 h-4 text-slate-400" />
                        <h3 className="font-semibold text-sm">So'nggi Yaratilgan Testlar</h3>
                      </div>
                      {tests.length === 0 ? <EmptyState message="Testlar mavjud emas" /> : (
                        <div className="space-y-4">
                          {tests.slice(0, 5).map(t => (
                            <div key={t._id} className="flex justify-between items-center group">
                              <div className="min-w-0">
                                <p className="font-medium text-sm truncate">{t.title}</p>
                                <p className="text-xs text-slate-500 truncate mt-0.5">{t.teacher?.name || 'Noma\'lum avtor'}</p>
                              </div>
                              <div className="text-xs text-slate-400 whitespace-nowrap ml-4">
                                {new Date(t.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Recent Teachers */}
                    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-[0_2px_10px_rgb(0,0,0,0.02)] p-6">
                      <div className="flex items-center gap-2 mb-6">
                        <Activity className="w-4 h-4 text-slate-400" />
                        <h3 className="font-semibold text-sm">Ro'yxatdan O'tgan Ustozlar</h3>
                      </div>
                      {teachers.length === 0 ? <EmptyState message="O'qituvchilar mavjud emas" /> : (
                        <div className="space-y-4">
                          {teachers.slice(0, 5).map(t => (
                            <div key={t._id} className="flex justify-between items-center">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-xs font-semibold text-slate-500 shrink-0">
                                  {t.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium text-sm truncate">{t.name}</p>
                                  <p className="text-xs text-slate-500 truncate mt-0.5">{t.email}</p>
                                </div>
                              </div>
                              <div className="ml-4 shrink-0">
                                {t.role === 'admin' ? (
                                  <span className="px-2 py-1 bg-slate-900 text-white text-[10px] uppercase font-bold rounded">Admin</span>
                                ) : (
                                  <span className="px-2 py-1 bg-slate-50 border border-slate-200 text-slate-500 text-[10px] uppercase font-bold rounded">Ustoz</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* TEACHERS TAB */}
              {activeTab === 'teachers' && (
                <div className="bg-white rounded-2xl border border-slate-200/60 shadow-[0_2px_10px_rgb(0,0,0,0.02)] flex flex-col h-[calc(100vh-8rem)]">
                  <div className="p-4 md:p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h2 className="font-semibold text-lg">O'qituvchilar</h2>
                    <div className="relative w-full sm:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="text" 
                        placeholder="Qidirish..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition-all"
                      />
                    </div>
                  </div>
                  
                  <div className="flex-1 overflow-auto">
                    {filteredTeachers.length === 0 ? (
                      <EmptyState message="Hech narsa topilmadi" />
                    ) : (
                      <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-slate-50/50 sticky top-0 z-10 backdrop-blur-md">
                          <tr>
                            <th className="px-6 py-3 font-medium text-slate-500 border-b border-slate-100">Foydalanuvchi</th>
                            <th className="px-6 py-3 font-medium text-slate-500 border-b border-slate-100">Mutaxassisligi</th>
                            <th className="px-6 py-3 font-medium text-slate-500 border-b border-slate-100 text-center">Testlar</th>
                            <th className="px-6 py-3 font-medium text-slate-500 border-b border-slate-100 text-right">Rol</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {filteredTeachers.map(t => (
                            <tr key={t._id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-6 py-4">
                                <div className="font-medium text-slate-900">{t.name}</div>
                                <div className="text-xs text-slate-500 mt-0.5">{t.email}</div>
                              </td>
                              <td className="px-6 py-4 text-slate-600">{t.subject || 'Noma\'lum'}</td>
                              <td className="px-6 py-4 text-center font-medium">{t.testCount || 0}</td>
                              <td className="px-6 py-4 text-right">
                                {t.role === 'admin' ? (
                                  <span className="px-2 py-1 bg-slate-900 text-white text-[10px] uppercase font-bold rounded">Admin</span>
                                ) : (
                                  <span className="px-2 py-1 bg-slate-50 border border-slate-200 text-slate-500 text-[10px] uppercase font-bold rounded">Ustoz</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}

              {/* TESTS TAB */}
              {activeTab === 'tests' && (
                <div className="bg-white rounded-2xl border border-slate-200/60 shadow-[0_2px_10px_rgb(0,0,0,0.02)] flex flex-col h-[calc(100vh-8rem)]">
                  <div className="p-4 md:p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h2 className="font-semibold text-lg">Barcha Testlar</h2>
                    <div className="relative w-full sm:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="text" 
                        placeholder="Test ID, nomi, avtor..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition-all"
                      />
                    </div>
                  </div>
                  
                  <div className="flex-1 overflow-auto">
                    {filteredTests.length === 0 ? (
                      <EmptyState message="Hech narsa topilmadi" />
                    ) : (
                      <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-slate-50/50 sticky top-0 z-10 backdrop-blur-md">
                          <tr>
                            <th className="px-6 py-3 font-medium text-slate-500 border-b border-slate-100">Test</th>
                            <th className="px-6 py-3 font-medium text-slate-500 border-b border-slate-100">O'qituvchi</th>
                            <th className="px-6 py-3 font-medium text-slate-500 border-b border-slate-100 text-center">Savollar</th>
                            <th className="px-6 py-3 font-medium text-slate-500 border-b border-slate-100 text-right">Yaratilgan</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {filteredTests.map(t => (
                            <tr key={t._id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-6 py-4">
                                <div className="font-medium text-slate-900">{t.title}</div>
                                <div className="text-xs font-mono text-slate-400 mt-0.5">#{t.id}</div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-slate-900">{t.teacher?.name || 'Noma\'lum'}</div>
                                <div className="text-xs text-slate-500 mt-0.5">{t.teacher?.subject || t.subject}</div>
                              </td>
                              <td className="px-6 py-4 text-center font-medium">{t.questions?.length || 0}</td>
                              <td className="px-6 py-4 text-right text-slate-500 text-xs">
                                {new Date(t.createdAt).toLocaleDateString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}

              {/* RESULTS TAB */}
              {activeTab === 'results' && (
                <div className="bg-white rounded-2xl border border-slate-200/60 shadow-[0_2px_10px_rgb(0,0,0,0.02)] flex flex-col h-[calc(100vh-8rem)]">
                  <div className="p-4 md:p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h2 className="font-semibold text-lg">Test Natijalari</h2>
                    <div className="relative w-full sm:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="text" 
                        placeholder="O'quvchi, Test nomi..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition-all"
                      />
                    </div>
                  </div>
                  
                  <div className="flex-1 overflow-auto">
                    {filteredResults.length === 0 ? (
                      <EmptyState message="Hech narsa topilmadi" />
                    ) : (
                      <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-slate-50/50 sticky top-0 z-10 backdrop-blur-md">
                          <tr>
                            <th className="px-6 py-3 font-medium text-slate-500 border-b border-slate-100">O'quvchi</th>
                            <th className="px-6 py-3 font-medium text-slate-500 border-b border-slate-100">Test</th>
                            <th className="px-6 py-3 font-medium text-slate-500 border-b border-slate-100">O'qituvchi</th>
                            <th className="px-6 py-3 font-medium text-slate-500 border-b border-slate-100 text-right">Ball</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {filteredResults.map((r, idx) => (
                            <tr key={r._id || idx} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-6 py-4 font-medium text-slate-900">{r.studentName}</td>
                              <td className="px-6 py-4">
                                <div className="text-slate-900">{r.test?.title || 'Oflayn Test'}</div>
                                <div className="text-xs font-mono text-slate-400 mt-0.5">#{r.testId || r.id}</div>
                              </td>
                              <td className="px-6 py-4 text-slate-600">{r.teacher?.name || '—'}</td>
                              <td className="px-6 py-4 text-right">
                                <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-bold ${
                                  r.totalScore >= 70 ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 
                                  r.totalScore >= 50 ? 'bg-amber-50 text-amber-700 border border-amber-100' : 
                                  'bg-rose-50 text-rose-700 border border-rose-100'
                                }`}>
                                  {r.totalScore}%
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
          
        </div>
      </div>
    </div>
  );
}
