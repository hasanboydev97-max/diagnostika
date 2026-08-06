import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../lib/db';
import { 
  Users, 
  FileText, 
  Award, 
  ShieldAlert, 
  LayoutDashboard,
  LogOut,
  ChevronRight,
  TrendingUp,
  Activity,
  UserCheck
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
        <p className="mt-4 text-slate-500 font-medium">Ma'lumotlar yuklanmoqda...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col">
        <div className="p-6 border-b border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-black text-slate-800 text-lg tracking-tight leading-tight">SuperAdmin</h1>
            <p className="text-xs text-slate-500 font-medium">Boshqaruv paneli</p>
          </div>
        </div>
        
        <div className="flex-1 py-6 flex flex-col gap-2 px-4">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all ${activeTab === 'overview' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <LayoutDashboard className="w-5 h-5" />
            Umumiy Holat
          </button>
          <button 
            onClick={() => setActiveTab('teachers')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all ${activeTab === 'teachers' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <Users className="w-5 h-5" />
            O'qituvchilar
          </button>
          <button 
            onClick={() => setActiveTab('tests')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all ${activeTab === 'tests' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <FileText className="w-5 h-5" />
            Barcha Testlar
          </button>
          <button 
            onClick={() => setActiveTab('results')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all ${activeTab === 'results' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <Award className="w-5 h-5" />
            Natijalar
          </button>
        </div>

        <div className="p-4 border-t border-slate-100">
          <button 
            onClick={() => navigate('/online-tests')}
            className="flex w-full items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Chiqish
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col max-h-screen overflow-hidden">
        {/* Mobile Header */}
        <div className="md:hidden bg-white p-4 border-b border-slate-200 flex justify-between items-center sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-indigo-600" />
            <h1 className="font-black text-slate-800 text-lg">SuperAdmin</h1>
          </div>
          <button onClick={() => navigate('/online-tests')} className="p-2 text-slate-500 bg-slate-100 rounded-lg">
            <LogOut className="w-5 h-5" />
          </button>
        </div>

        {/* Mobile Nav */}
        <div className="md:hidden flex overflow-x-auto p-4 gap-2 bg-slate-50 border-b border-slate-200 no-scrollbar">
          {['overview', 'teachers', 'tests', 'results'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-bold transition-colors ${activeTab === tab ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'bg-white text-slate-600 border border-slate-200'}`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black text-slate-800">Umumiy Statistika</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
                  <div className="absolute -right-6 -top-6 w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Users className="w-10 h-10 text-blue-500/20" />
                  </div>
                  <p className="text-slate-500 font-semibold mb-1 text-sm uppercase tracking-wider relative z-10">Jami O'qituvchilar</p>
                  <h3 className="text-4xl font-black text-slate-800 relative z-10">{stats.teachers}</h3>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
                  <div className="absolute -right-6 -top-6 w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    <FileText className="w-10 h-10 text-indigo-500/20" />
                  </div>
                  <p className="text-slate-500 font-semibold mb-1 text-sm uppercase tracking-wider relative z-10">Jami Testlar</p>
                  <h3 className="text-4xl font-black text-slate-800 relative z-10">{stats.tests}</h3>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
                  <div className="absolute -right-6 -top-6 w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Award className="w-10 h-10 text-emerald-500/20" />
                  </div>
                  <p className="text-slate-500 font-semibold mb-1 text-sm uppercase tracking-wider relative z-10">Jami Natijalar</p>
                  <h3 className="text-4xl font-black text-slate-800 relative z-10">{stats.results}</h3>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                  <div className="flex items-center gap-2 mb-6">
                    <TrendingUp className="w-5 h-5 text-indigo-600" />
                    <h3 className="font-bold text-slate-800 text-lg">So'nggi faollik (Testlar)</h3>
                  </div>
                  <div className="space-y-4">
                    {tests.slice(0, 5).map(t => (
                      <div key={t._id} className="flex items-center justify-between pb-4 border-b border-slate-100 last:border-0 last:pb-0">
                        <div>
                          <p className="font-bold text-slate-700">{t.title}</p>
                          <p className="text-xs text-slate-500 mt-1">Avtor: {t.teacher?.name || 'Noma\'lum'}</p>
                        </div>
                        <span className="text-xs font-semibold px-2 py-1 bg-slate-100 rounded text-slate-600">
                          {new Date(t.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                  <div className="flex items-center gap-2 mb-6">
                    <Activity className="w-5 h-5 text-emerald-600" />
                    <h3 className="font-bold text-slate-800 text-lg">So'nggi O'qituvchilar</h3>
                  </div>
                  <div className="space-y-4">
                    {teachers.slice(0, 5).map(t => (
                      <div key={t._id} className="flex items-center justify-between pb-4 border-b border-slate-100 last:border-0 last:pb-0">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-400">
                            {t.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-700">{t.name}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{t.email}</p>
                          </div>
                        </div>
                        <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded ${t.role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
                          {t.role}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TEACHERS TAB */}
          {activeTab === 'teachers' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-black text-slate-800">O'qituvchilar Ro'yxati</h2>
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
                        <th className="p-4 font-bold">Ism / Email</th>
                        <th className="p-4 font-bold">Fan</th>
                        <th className="p-4 font-bold">Rol</th>
                        <th className="p-4 font-bold text-center">Testlar soni</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {teachers.map(t => (
                        <tr key={t._id} className="hover:bg-slate-50/50">
                          <td className="p-4">
                            <div className="font-bold text-slate-800">{t.name}</div>
                            <div className="text-xs text-slate-500 mt-1">{t.email}</div>
                          </td>
                          <td className="p-4 font-semibold text-slate-700">{t.subject}</td>
                          <td className="p-4">
                            <span className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-full ${t.role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
                              {t.role}
                            </span>
                          </td>
                          <td className="p-4 text-center font-black text-slate-700">{t.testCount || 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TESTS TAB */}
          {activeTab === 'tests' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-black text-slate-800">Barcha Onlayn Testlar</h2>
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
                        <th className="p-4 font-bold">Test Nomi</th>
                        <th className="p-4 font-bold">O'qituvchi</th>
                        <th className="p-4 font-bold">Savollar</th>
                        <th className="p-4 font-bold">Vaqti</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {tests.map(t => (
                        <tr key={t._id} className="hover:bg-slate-50/50">
                          <td className="p-4">
                            <div className="font-bold text-slate-800">{t.title}</div>
                            <div className="text-xs text-slate-500 mt-1 font-mono">{t.id}</div>
                          </td>
                          <td className="p-4">
                            <div className="font-semibold text-slate-700">{t.teacher?.name || 'Noma\'lum'}</div>
                            <div className="text-xs text-slate-500 mt-1">{t.teacher?.subject || t.subject}</div>
                          </td>
                          <td className="p-4 font-bold text-slate-700">{t.questions?.length || 0} ta</td>
                          <td className="p-4 text-sm text-slate-600">{new Date(t.createdAt).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* RESULTS TAB */}
          {activeTab === 'results' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-black text-slate-800">Oxirgi Natijalar</h2>
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
                        <th className="p-4 font-bold">O'quvchi</th>
                        <th className="p-4 font-bold">Test (ID)</th>
                        <th className="p-4 font-bold">O'qituvchi</th>
                        <th className="p-4 font-bold text-center">Natija</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {results.map((r, idx) => (
                        <tr key={r._id || idx} className="hover:bg-slate-50/50">
                          <td className="p-4 font-bold text-slate-800">{r.studentName}</td>
                          <td className="p-4">
                            <div className="font-semibold text-slate-700">{r.test?.title || 'Oflayn Test'}</div>
                            <div className="text-xs text-slate-500 mt-1 font-mono">{r.testId || r.id}</div>
                          </td>
                          <td className="p-4 font-medium text-slate-600">{r.teacher?.name || '—'}</td>
                          <td className="p-4 text-center">
                            <span className={`px-2.5 py-1 rounded-md text-xs font-black ${r.totalScore >= 50 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                              {r.totalScore}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
