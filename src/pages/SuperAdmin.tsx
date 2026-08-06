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
  ChevronRight
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
      <div className="min-h-screen bg-white flex flex-col justify-center items-center font-sans">
        <div className="w-5 h-5 border-2 border-zinc-200 border-t-zinc-900 rounded-full animate-spin mb-3"></div>
        <p className="text-zinc-500 font-medium text-[11px] uppercase tracking-wider">Yuklanmoqda</p>
      </div>
    );
  }

  const EmptyState = ({ message }: { message: string }) => (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-10 h-10 border border-zinc-200 bg-zinc-50 rounded-md flex items-center justify-center mb-4">
        <Search className="w-4 h-4 text-zinc-400" />
      </div>
      <p className="text-zinc-500 text-sm font-medium">{message}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-white flex font-sans text-zinc-900 selection:bg-zinc-200 selection:text-black">
      
      {/* Sidebar - Desktop */}
      <div className="w-64 border-r border-zinc-200 hidden md:flex flex-col sticky top-0 h-screen bg-white">
        <div className="h-16 flex items-center gap-3 px-6 border-b border-zinc-200">
          <div className="w-6 h-6 bg-zinc-900 rounded flex items-center justify-center text-white">
            <ShieldAlert className="w-3.5 h-3.5" />
          </div>
          <span className="font-semibold text-sm tracking-tight">Super Admin</span>
        </div>
        
        <div className="flex-1 py-4 flex flex-col gap-1 px-4 overflow-y-auto">
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
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                  isActive ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-zinc-900' : 'text-zinc-400'}`} />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="p-4 border-t border-zinc-200">
          <button 
            onClick={() => navigate('/')}
            className="flex w-full items-center gap-3 px-3 py-2 text-xs font-medium text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 rounded-md transition-colors"
          >
            <LogOut className="w-4 h-4 text-zinc-400" />
            Bosh sahifaga qaytish
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 bg-zinc-50/30">
        
        {/* Mobile Header & Nav */}
        <div className="md:hidden bg-white border-b border-zinc-200 sticky top-0 z-20">
          <div className="p-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-zinc-900" />
              <h1 className="font-semibold text-zinc-900 text-sm tracking-tight">Super Admin</h1>
            </div>
            <button onClick={() => navigate('/')} className="text-zinc-400 hover:text-zinc-900 p-1">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
          <div className="flex overflow-x-auto px-4 pb-3 gap-2 no-scrollbar">
            {[
              { id: 'overview', label: 'Umumiy' },
              { id: 'teachers', label: 'O\'qituvchilar' },
              { id: 'tests', label: 'Testlar' },
              { id: 'results', label: 'Natijalar' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-md whitespace-nowrap text-xs font-medium transition-colors border ${
                  activeTab === tab.id ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white text-zinc-600 border-zinc-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 p-4 md:p-8 w-full max-w-6xl mx-auto">
          
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              
              {/* OVERVIEW TAB */}
              {activeTab === 'overview' && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { label: "Jami O'qituvchilar", count: stats.teachers },
                      { label: "Jami Testlar", count: stats.tests },
                      { label: "Jami Natijalar", count: stats.results }
                    ].map((stat, i) => (
                      <div key={i} className="bg-white p-5 rounded-md border border-zinc-200 flex flex-col justify-between h-28 shadow-sm">
                        <p className="text-zinc-500 font-medium text-xs">{stat.label}</p>
                        <h3 className="text-3xl font-semibold tracking-tight">{stat.count}</h3>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Recent Tests */}
                    <div className="bg-white rounded-md border border-zinc-200 shadow-sm overflow-hidden">
                      <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
                        <h3 className="font-semibold text-sm text-zinc-900">So'nggi Yaratilgan Testlar</h3>
                        <button onClick={() => setActiveTab('tests')} className="text-xs text-zinc-500 hover:text-zinc-900 font-medium flex items-center">
                          Barchasi <ChevronRight className="w-3 h-3 ml-1" />
                        </button>
                      </div>
                      {tests.length === 0 ? <EmptyState message="Testlar mavjud emas" /> : (
                        <div className="divide-y divide-zinc-50">
                          {tests.slice(0, 5).map(t => (
                            <div key={t._id} className="flex justify-between items-center p-4 hover:bg-zinc-50 transition-colors">
                              <div className="min-w-0">
                                <p className="font-medium text-sm text-zinc-900 truncate mb-1">{t.title}</p>
                                <p className="text-[11px] text-zinc-500 truncate">{t.teacher?.name || 'Noma\'lum'}</p>
                              </div>
                              <div className="text-[11px] text-zinc-400 whitespace-nowrap ml-4 border border-zinc-200 px-1.5 py-0.5 rounded bg-zinc-50">
                                {new Date(t.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Recent Teachers */}
                    <div className="bg-white rounded-md border border-zinc-200 shadow-sm overflow-hidden">
                      <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
                        <h3 className="font-semibold text-sm text-zinc-900">Ro'yxatdan O'tgan Ustozlar</h3>
                        <button onClick={() => setActiveTab('teachers')} className="text-xs text-zinc-500 hover:text-zinc-900 font-medium flex items-center">
                          Barchasi <ChevronRight className="w-3 h-3 ml-1" />
                        </button>
                      </div>
                      {teachers.length === 0 ? <EmptyState message="O'qituvchilar mavjud emas" /> : (
                        <div className="divide-y divide-zinc-50">
                          {teachers.slice(0, 5).map(t => (
                            <div key={t._id} className="flex justify-between items-center p-4 hover:bg-zinc-50 transition-colors">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="min-w-0">
                                  <p className="font-medium text-sm text-zinc-900 truncate mb-1">{t.name}</p>
                                  <p className="text-[11px] text-zinc-500 truncate">{t.email}</p>
                                </div>
                              </div>
                              <div className="ml-4 shrink-0">
                                {t.role === 'admin' ? (
                                  <span className="px-1.5 py-0.5 bg-zinc-900 text-white text-[10px] uppercase font-bold rounded">Admin</span>
                                ) : (
                                  <span className="px-1.5 py-0.5 border border-zinc-200 text-zinc-500 text-[10px] uppercase font-bold rounded">Ustoz</span>
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
                <div className="bg-white rounded-md border border-zinc-200 shadow-sm flex flex-col max-h-[calc(100vh-6rem)]">
                  <div className="p-4 border-b border-zinc-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h2 className="font-semibold text-sm">O'qituvchilar</h2>
                    <div className="relative w-full sm:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                      <input 
                        type="text" 
                        placeholder="Qidirish..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 bg-white border border-zinc-200 rounded-md text-xs focus:outline-none focus:border-zinc-400 transition-colors"
                      />
                    </div>
                  </div>
                  
                  <div className="flex-1 overflow-auto">
                    {filteredTeachers.length === 0 ? (
                      <EmptyState message="Hech narsa topilmadi" />
                    ) : (
                      <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-zinc-50/50 sticky top-0 z-10 border-b border-zinc-200">
                          <tr>
                            <th className="px-4 py-3 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Ism / Email</th>
                            <th className="px-4 py-3 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Fan</th>
                            <th className="px-4 py-3 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider text-center">Testlar</th>
                            <th className="px-4 py-3 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider text-right">Rol</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                          {filteredTeachers.map(t => (
                            <tr key={t._id} className="hover:bg-zinc-50/50 transition-colors">
                              <td className="px-4 py-3">
                                <div className="font-medium text-zinc-900 text-xs">{t.name}</div>
                                <div className="text-[11px] text-zinc-500 mt-0.5">{t.email}</div>
                              </td>
                              <td className="px-4 py-3 text-xs text-zinc-600">{t.subject || 'Noma\'lum'}</td>
                              <td className="px-4 py-3 text-center text-xs font-medium">{t.testCount || 0}</td>
                              <td className="px-4 py-3 text-right">
                                {t.role === 'admin' ? (
                                  <span className="px-1.5 py-0.5 bg-zinc-900 text-white text-[10px] uppercase font-bold rounded">Admin</span>
                                ) : (
                                  <span className="px-1.5 py-0.5 border border-zinc-200 text-zinc-500 text-[10px] uppercase font-bold rounded bg-zinc-50">Ustoz</span>
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
                <div className="bg-white rounded-md border border-zinc-200 shadow-sm flex flex-col max-h-[calc(100vh-6rem)]">
                  <div className="p-4 border-b border-zinc-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h2 className="font-semibold text-sm">Barcha Testlar</h2>
                    <div className="relative w-full sm:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                      <input 
                        type="text" 
                        placeholder="Test ID, nomi..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 bg-white border border-zinc-200 rounded-md text-xs focus:outline-none focus:border-zinc-400 transition-colors"
                      />
                    </div>
                  </div>
                  
                  <div className="flex-1 overflow-auto">
                    {filteredTests.length === 0 ? (
                      <EmptyState message="Hech narsa topilmadi" />
                    ) : (
                      <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-zinc-50/50 sticky top-0 z-10 border-b border-zinc-200">
                          <tr>
                            <th className="px-4 py-3 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Test / ID</th>
                            <th className="px-4 py-3 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">O'qituvchi</th>
                            <th className="px-4 py-3 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider text-center">Savollar</th>
                            <th className="px-4 py-3 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider text-right">Sana</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                          {filteredTests.map(t => (
                            <tr key={t._id} className="hover:bg-zinc-50/50 transition-colors">
                              <td className="px-4 py-3">
                                <div className="font-medium text-zinc-900 text-xs">{t.title}</div>
                                <div className="text-[10px] font-mono text-zinc-400 mt-0.5">#{t.id}</div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="text-xs text-zinc-900">{t.teacher?.name || 'Noma\'lum'}</div>
                                <div className="text-[11px] text-zinc-500 mt-0.5">{t.teacher?.subject || t.subject}</div>
                              </td>
                              <td className="px-4 py-3 text-center text-xs font-medium">{t.questions?.length || 0}</td>
                              <td className="px-4 py-3 text-right text-zinc-500 text-[11px]">
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
                <div className="bg-white rounded-md border border-zinc-200 shadow-sm flex flex-col max-h-[calc(100vh-6rem)]">
                  <div className="p-4 border-b border-zinc-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h2 className="font-semibold text-sm">Test Natijalari</h2>
                    <div className="relative w-full sm:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                      <input 
                        type="text" 
                        placeholder="O'quvchi..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 bg-white border border-zinc-200 rounded-md text-xs focus:outline-none focus:border-zinc-400 transition-colors"
                      />
                    </div>
                  </div>
                  
                  <div className="flex-1 overflow-auto">
                    {filteredResults.length === 0 ? (
                      <EmptyState message="Hech narsa topilmadi" />
                    ) : (
                      <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-zinc-50/50 sticky top-0 z-10 border-b border-zinc-200">
                          <tr>
                            <th className="px-4 py-3 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">O'quvchi</th>
                            <th className="px-4 py-3 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Test / ID</th>
                            <th className="px-4 py-3 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Ustoz</th>
                            <th className="px-4 py-3 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider text-right">Natija</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                          {filteredResults.map((r, idx) => (
                            <tr key={r._id || idx} className="hover:bg-zinc-50/50 transition-colors">
                              <td className="px-4 py-3 font-medium text-xs text-zinc-900">{r.studentName}</td>
                              <td className="px-4 py-3">
                                <div className="text-xs text-zinc-900">{r.test?.title || 'Oflayn Test'}</div>
                                <div className="text-[10px] font-mono text-zinc-400 mt-0.5">#{r.testId || r.id}</div>
                              </td>
                              <td className="px-4 py-3 text-xs text-zinc-600">{r.teacher?.name || '—'}</td>
                              <td className="px-4 py-3 text-right">
                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  r.totalScore >= 70 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 
                                  r.totalScore >= 50 ? 'bg-amber-50 text-amber-700 border border-amber-200' : 
                                  'bg-red-50 text-red-700 border border-red-200'
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
