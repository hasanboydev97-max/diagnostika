import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ChevronRight, FileText, Search, Trash2, LogOut, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { getAuthHeaders, getToken, logout, getTeacher } from '../../lib/auth';

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
  const navigate = useNavigate();
  const teacher = getTeacher();

  useEffect(() => {
    if (!getToken()) {
      navigate('/teacher/login');
      return;
    }
    fetchTests();
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
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      <div className="max-w-7xl mx-auto px-6 py-12">
        
        {/* Minimalist Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">O'qituvchi Paneli</h1>
            <p className="text-gray-500 mt-1">{teacher?.name} - {teacher?.subject} o'qituvchisi</p>
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {teacher?.role === 'admin' && (
              <button
                onClick={() => navigate('/superadmin')}
                className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors shadow-sm"
              >
                <ShieldAlert size={20} />
                <span className="hidden sm:inline">Super Admin</span>
              </button>
            )}
            <button
              onClick={() => navigate('/online-tests/create')}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-black hover:bg-gray-800 text-white px-5 py-2.5 rounded-lg font-medium transition-colors shadow-sm"
            >
              <Plus size={20} />
              <span>Yangi Test</span>
            </button>
            <button
              onClick={logout}
              className="p-2.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-gray-200 hover:border-red-100 bg-white"
              title="Chiqish"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="mb-8 relative max-w-2xl">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Testlarni nomi yoki fani bo'yicha qidiring..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="block w-full pl-12 pr-4 py-3.5 bg-white border border-gray-200 rounded-2xl text-sm font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent shadow-sm transition-all duration-300 hover:shadow-md"
          />
        </div>

        {/* List Section */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          {loading ? (
            <div className="divide-y divide-gray-100">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-6 flex items-center justify-between animate-pulse">
                  <div className="space-y-3 w-1/2">
                    <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-100 rounded w-1/2"></div>
                  </div>
                  <div className="h-8 w-24 bg-gray-100 rounded-md"></div>
                </div>
              ))}
            </div>
          ) : filteredTests.length === 0 ? (
            <div className="text-center py-20">
              <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="text-gray-400" size={24} />
              </div>
              <h3 className="text-gray-900 font-medium mb-1">Testlar topilmadi</h3>
              <p className="text-sm text-gray-500 mb-6">
                {search ? "Boshqa so'z bilan qidirib ko'ring." : "Birinchi testingizni yaratishdan boshlang."}
              </p>
              {!search && (
                <button
                  onClick={() => navigate('/online-tests/create')}
                  className="text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  Birinchi testingizni yarating &rarr;
                </button>
              )}
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {filteredTests.map((test) => (
                <li
                  key={test.id}
                  className="group hover:bg-gray-50/80 transition-colors flex items-center justify-between p-4 sm:p-6 cursor-pointer"
                  onClick={() => navigate(`/online-tests/details/${test.id}`)}
                >
                  <div className="flex items-start gap-4">
                    <div className="mt-1 bg-gray-100 p-2 rounded-md text-gray-500 group-hover:bg-white group-hover:shadow-sm transition-all border border-transparent group-hover:border-gray-200">
                      <FileText size={18} />
                    </div>
                    <div>
                      <h3 className="text-gray-900 font-medium">{test.title}</h3>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        <span className="font-medium bg-gray-100 px-2 py-0.5 rounded text-gray-600">
                          {test.subject}
                        </span>
                        <span>•</span>
                        <span>{test.questions?.length || 0} ta savol</span>
                        <span>•</span>
                        <span>{new Date(test.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center text-gray-400 group-hover:text-gray-900 transition-colors">
                    <span className="text-sm font-medium mr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      Natijalar
                    </span>
                    <ChevronRight size={18} className="mr-4" />
                    <button
                      onClick={(e) => handleDeleteTest(e, test.id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                      title="Testni o'chirish"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
