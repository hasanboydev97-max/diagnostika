import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Award, Calendar, ChevronRight, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import MeshGradient from '../components/ui/MeshGradient';

export default function StudentDashboard() {
  const { studentName } = useParams();
  const navigate = useNavigate();
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    if (!studentName) {
      navigate('/');
      return;
    }

    const fetchResults = async () => {
      try {
        const response = await fetch(`${API_URL}/student-results/${encodeURIComponent(studentName)}`);
        if (!response.ok) throw new Error('Ma\'lumotlarni yuklashda xatolik');
        const data = await response.json();
        setResults(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [studentName, navigate, API_URL]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fdfdfd] flex items-center justify-center font-sans">
        <MeshGradient />
        <div className="flex flex-col items-center gap-4 relative z-10">
          <Loader2 className="w-8 h-8 animate-spin text-black" />
          <p className="text-xs font-bold uppercase tracking-widest">Ma'lumotlar yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#fdfdfd] flex items-center justify-center font-sans">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button onClick={() => navigate('/')} className="px-4 py-2 bg-black text-white rounded-lg">Bosh sahifaga qaytish</button>
        </div>
      </div>
    );
  }

  const chartData = [...results].reverse().map((r, i) => ({
    name: `Test ${i + 1}`,
    score: r.totalScore,
    date: new Date(r.createdAt).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' })
  }));

  const bestScore = results.length > 0 ? Math.max(...results.map(r => r.totalScore)) : 0;
  const avgScore = results.length > 0 ? Math.round(results.reduce((acc, curr) => acc + curr.totalScore, 0) / results.length) : 0;

  return (
    <div className="min-h-screen bg-[#fdfdfd] text-[#111111] font-sans relative selection:bg-black selection:text-white">
      <MeshGradient />

      <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 relative z-10 space-y-12">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2 bg-white border border-black/10 rounded-full hover:bg-neutral-100 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{studentName}</h1>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-widest mt-1">Shaxsiy Kabinet</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-3">
            <div className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center font-bold text-xl shadow-lg">
              {studentName?.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="bg-white/80 backdrop-blur-xl border border-black/10 p-6 rounded-3xl shadow-sm">
            <div className="flex items-center gap-3 mb-2 text-gray-500">
              <Award className="w-5 h-5" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Eng Yuqori Ball</span>
            </div>
            <div className="text-4xl font-bold">{bestScore} <span className="text-xl text-gray-400 font-medium">/100</span></div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="bg-white/80 backdrop-blur-xl border border-black/10 p-6 rounded-3xl shadow-sm">
            <div className="flex items-center gap-3 mb-2 text-gray-500">
              <TrendingUp className="w-5 h-5" />
              <span className="text-[10px] font-bold uppercase tracking-widest">O'rtacha Ball</span>
            </div>
            <div className="text-4xl font-bold">{avgScore} <span className="text-xl text-gray-400 font-medium">/100</span></div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="bg-white/80 backdrop-blur-xl border border-black/10 p-6 rounded-3xl shadow-sm">
            <div className="flex items-center gap-3 mb-2 text-gray-500">
              <Calendar className="w-5 h-5" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Jami Testlar</span>
            </div>
            <div className="text-4xl font-bold">{results.length} <span className="text-xl text-gray-400 font-medium">ta</span></div>
          </motion.div>
        </div>

        {results.length > 1 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }} className="bg-white/80 backdrop-blur-xl border border-black/10 p-6 md:p-8 rounded-3xl shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-widest mb-6">O'zlashtirish Dinamikasi</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{ borderRadius: '16px', border: '1px solid rgba(0,0,0,0.1)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                    cursor={{ stroke: '#000', strokeWidth: 1, strokeDasharray: '4 4' }}
                  />
                  <Line type="monotone" dataKey="score" stroke="#111111" strokeWidth={3} dot={{ r: 4, fill: '#111111', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }} className="bg-white/80 backdrop-blur-xl border border-black/10 rounded-3xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-black/5 flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-widest">Testlar Tarixi</h3>
          </div>
          {results.length === 0 ? (
            <div className="p-12 text-center text-gray-500">Hech qanday natija topilmadi.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-neutral-50/50 text-[10px] uppercase tracking-widest text-gray-500 font-bold border-b border-black/5">
                    <th className="px-6 py-4">Sana</th>
                    <th className="px-6 py-4">Sinf/Fan</th>
                    <th className="px-6 py-4">Natija</th>
                    <th className="px-6 py-4 text-right">Amal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {results.map((result) => {
                    const isPass = result.totalScore >= 70;
                    return (
                      <tr key={result.id} className="hover:bg-neutral-50 transition-colors group cursor-pointer" onClick={() => navigate(`/summary/${result.id}`)}>
                        <td className="px-6 py-5 text-sm font-medium">
                          {new Date(result.createdAt).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-6 py-5">
                          <span className="px-3 py-1 bg-neutral-100 rounded-lg text-xs font-semibold">{result.grade || '5'}-sinf</span>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <span className="text-xl font-bold">{result.totalScore}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${isPass ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {isPass ? "O'tdi" : "Yiqildi"}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <button className="p-2 rounded-full hover:bg-black hover:text-white transition-colors border border-black/10">
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
