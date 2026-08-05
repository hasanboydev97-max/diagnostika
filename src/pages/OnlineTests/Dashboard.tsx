import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ChevronRight, FileText, Search } from 'lucide-react';
import { toast } from 'sonner';

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

  useEffect(() => {
    fetchTests();
  }, []);

  const fetchTests = async () => {
    try {
      const response = await fetch(`${API_URL}/online-tests`);
      if (!response.ok) throw new Error('Failed to fetch tests');
      const data = await response.json();
      setTests(data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load tests.');
    } finally {
      setLoading(false);
    }
  };

  const filteredTests = tests.filter(
    (t) =>
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.subject.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      <div className="max-w-5xl mx-auto px-6 py-12">
        
        {/* Header section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-gray-900">Online Tests</h1>
            <p className="text-gray-500 mt-1 text-sm">Create and manage your assessments.</p>
          </div>
          <button
            onClick={() => navigate('/online-tests/create')}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-black text-white text-sm font-medium rounded-md hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 shadow-sm"
          >
            <Plus size={16} />
            Create Test
          </button>
        </div>

        {/* Search & Filters */}
        <div className="mb-6 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search tests by title or subject..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-md pl-10 pr-4 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition-colors bg-white shadow-sm"
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
              <h3 className="text-gray-900 font-medium mb-1">No tests found</h3>
              <p className="text-sm text-gray-500 mb-6">
                {search ? "Try adjusting your search." : "Get started by creating your first test."}
              </p>
              {!search && (
                <button
                  onClick={() => navigate('/online-tests/create')}
                  className="text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  Create your first test &rarr;
                </button>
              )}
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {filteredTests.map((test) => (
                <li
                  key={test.id}
                  className="group hover:bg-gray-50/80 transition-colors flex items-center justify-between p-4 sm:p-6 cursor-pointer"
                  onClick={() => navigate(`/online-tests/take/${test.id}`)}
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
                        <span>{test.questions?.length || 0} questions</span>
                        <span>•</span>
                        <span>{new Date(test.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center text-gray-400 group-hover:text-gray-900 transition-colors">
                    <span className="text-sm font-medium mr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      Take Test
                    </span>
                    <ChevronRight size={18} />
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
