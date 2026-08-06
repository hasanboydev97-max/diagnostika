import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Copy, Users, BrainCircuit, Calendar, ExternalLink, FileText, Download } from 'lucide-react';
import { getAuthHeaders, getToken } from '../../lib/auth';
import { toast } from 'sonner';
import FormattedText from '../../components/FormattedText';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface Result {
  _id?: string;
  id?: string;
  studentName: string;
  score: number;
  totalScore: number;
  createdAt: string;
}

export default function TestDetails() {
  const { testId } = useParams();
  const navigate = useNavigate();
  
  const [test, setTest] = useState<any>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      navigate('/teacher/login');
      return;
    }
    fetchData();
  }, [testId]);

  const fetchData = async () => {
    try {
      const testRes = await fetch(`${API_URL}/online-tests/${testId}`, {
        headers: getAuthHeaders()
      });
      if (!testRes.ok) throw new Error('Failed to fetch test');
      const testData = await testRes.json();
      setTest(testData);

      const resultsRes = await fetch(`${API_URL}/online-tests/${testId}/results`, {
        headers: getAuthHeaders()
      });
      if (resultsRes.ok) {
        const resultsData = await resultsRes.json();
        setResults(resultsData);
      }
    } catch (error) {
      console.error(error);
      toast.error('Ma\'lumotlarni yuklashda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  const copyTestLink = () => {
    const link = `${window.location.origin}/online-tests/take/${testId}`;
    navigator.clipboard.writeText(link);
    toast.success('Test manzili nusxalandi! O\'quvchilarga yuborishingiz mumkin.');
  };

  const handleExportWord = () => {
    if (!test) return;
    window.open(`${API_URL}/online-tests/${testId}/export/docx`, '_blank');
  };

  const handleDownloadPDF = async () => {
    if (!test || isDownloadingPdf) return;
    setIsDownloadingPdf(true);
    const toastId = toast.loading('PDF tayyorlanmoqda...');
    try {
      const response = await fetch(`${API_URL}/online-tests/${testId}/export/pdf`);
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Server xatosi');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${test.title}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('PDF muvaffaqiyatli yuklandi!', { id: toastId });
    } catch (error: any) {
      console.error(error);
      toast.error(`PDF tayyorlashda xatolik: ${error.message}`, { id: toastId });
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col justify-center items-center font-sans">
        <div className="w-5 h-5 border-2 border-zinc-200 border-t-zinc-900 rounded-full animate-spin mb-3"></div>
        <p className="text-zinc-500 font-medium text-[11px] uppercase tracking-wider">Yuklanmoqda</p>
      </div>
    );
  }

  if (!test) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center font-sans text-zinc-900">
        <h2 className="text-lg font-medium mb-4">Test topilmadi</h2>
        <button onClick={() => navigate('/online-tests')} className="text-xs font-semibold uppercase tracking-wider text-zinc-500 hover:text-zinc-900 transition-colors">
          Dashboard'ga qaytish
        </button>
      </div>
    );
  }

  // Calculate average score
  const totalPercentage = results.reduce((acc, curr) => acc + (curr.score / curr.totalScore) * 100, 0);
  const averagePercentage = results.length > 0 ? Math.round(totalPercentage / results.length) : 0;

  return (
    <div className="min-h-screen bg-white text-zinc-900 font-sans pb-24 selection:bg-zinc-200 selection:text-black">
      
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <button 
            onClick={() => navigate('/online-tests')}
            className="flex items-center gap-2 text-xs font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            <ArrowLeft size={14} />
            Dashboard'ga qaytish
          </button>
          <div className="text-sm font-semibold tracking-tight">{test.title}</div>
          <div className="w-20"></div> {/* Spacer for centering */}
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* Print-only View (Hidden on screen) */}
        <div id="print-view" className="hidden print:block mb-8 bg-white p-8">
          <h1 className="text-3xl font-bold text-center mb-2">{test.title}</h1>
          <p className="text-center text-zinc-600 mb-8">Fan: {test.subject}</p>
          <div className="space-y-6">
            {test.questions.map((q: any, i: number) => (
              <div key={i} className="mb-4 page-break-inside-avoid">
                <p className="font-semibold text-lg mb-2">{i + 1}. <FormattedText content={q.questionText} /></p>
                <div className="pl-6 space-y-2">
                  {q.options.map((opt: string, oIndex: number) => (
                    <div key={oIndex} className="flex items-center gap-2">
                      <div className="w-4 h-4 border border-black rounded-full"></div>
                      <FormattedText content={opt} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 print:hidden">
          
          {/* Sidebar Info */}
          <div className="lg:col-span-4 flex flex-col gap-5">
            <div className="bg-white p-5 rounded-md border border-zinc-200">
              <span className="inline-block px-2 py-0.5 bg-zinc-100 text-zinc-600 text-[10px] font-bold uppercase tracking-wider rounded-sm mb-3">
                {test.subject}
              </span>
              <h1 className="text-xl font-semibold tracking-tight text-zinc-900 mb-1.5 leading-tight">
                {test.title}
              </h1>
              <p className="text-zinc-500 text-xs mb-5 flex items-center gap-1.5 font-medium">
                <Calendar size={12} /> 
                {new Date(test.createdAt).toLocaleDateString('uz-UZ')}
              </p>
              
              <div className="pt-4 border-t border-zinc-100 flex flex-col gap-2.5">
                <button
                  onClick={copyTestLink}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-zinc-900 text-white text-xs font-semibold rounded-md hover:bg-zinc-800 transition-colors shadow-sm"
                >
                  <Copy size={14} /> Link Nusxalash
                </button>
                <button
                  onClick={() => navigate(`/online-tests/take/${testId}`)}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-white border border-zinc-200 text-zinc-700 text-xs font-medium rounded-md hover:bg-zinc-50 hover:border-zinc-300 transition-colors"
                >
                  <ExternalLink size={14} /> Yechib ko'rish
                </button>
                
                <div className="flex gap-2 w-full mt-1.5">
                  <button
                    onClick={handleExportWord}
                    className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 bg-white border border-zinc-200 text-zinc-700 text-[11px] font-semibold rounded-md hover:bg-zinc-50 transition-colors"
                  >
                    <FileText size={12} /> Word
                  </button>
                  <button
                    onClick={handleDownloadPDF}
                    disabled={isDownloadingPdf}
                    className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 bg-white border border-zinc-200 text-zinc-700 text-[11px] font-semibold rounded-md hover:bg-zinc-50 transition-colors disabled:opacity-50"
                  >
                    {isDownloadingPdf
                      ? <><Loader2 size={12} className="animate-spin" /> Tayyor...</>
                      : <><Download size={12} /> PDF</>
                    }
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-md border border-zinc-200 grid grid-cols-2 gap-4">
               <div>
                 <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1 flex items-center gap-1.5">
                   <Users size={12}/> Qatnashuvchilar
                 </p>
                 <p className="text-xl font-semibold text-zinc-900">{results.length}</p>
               </div>
               <div>
                 <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1 flex items-center gap-1.5">
                   <BrainCircuit size={12}/> O'rtacha foiz
                 </p>
                 <p className="text-xl font-semibold text-zinc-900">{averagePercentage}%</p>
               </div>
            </div>
          </div>

          {/* Results Table */}
          <div className="lg:col-span-8">
            <div className="bg-white rounded-md border border-zinc-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-zinc-200 bg-zinc-50">
                <h3 className="text-sm font-semibold text-zinc-900">O'quvchilar Natijalari <span className="text-zinc-500 font-normal">({results.length})</span></h3>
              </div>
              
              {results.length === 0 ? (
                <div className="p-12 text-center flex flex-col items-center">
                  <Users size={24} className="text-zinc-300 mb-3" />
                  <p className="text-sm font-medium text-zinc-900 mb-1">Hech kim topshirmagan</p>
                  <p className="text-xs text-zinc-500">Linkni nusxalab o'quvchilarga yuboring.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-white border-b border-zinc-200">
                      <tr>
                        <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500">O'quvchi</th>
                        <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Natija</th>
                        <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Vaqti</th>
                        <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500 text-right">Amal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {results.map((res: any) => {
                        const percent = Math.round((res.score / res.totalScore) * 100);
                        return (
                          <tr key={res.id || res._id} className="hover:bg-zinc-50 transition-colors">
                            <td className="px-5 py-3.5 text-xs font-medium text-zinc-900 capitalize">
                              {res.studentName}
                            </td>
                            <td className="px-5 py-3.5 text-xs">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-zinc-900">{res.score} <span className="text-zinc-400 font-normal">/ {res.totalScore}</span></span>
                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded-[4px] text-[10px] font-bold tracking-wider ${
                                  percent >= 80 ? 'bg-zinc-900 text-white' : 
                                  percent >= 50 ? 'bg-zinc-200 text-zinc-900' : 'bg-red-50 text-red-600 border border-red-100'
                                }`}>
                                  {percent}%
                                </span>
                              </div>
                            </td>
                            <td className="px-5 py-3.5 text-xs text-zinc-500">
                              {new Date(res.createdAt).toLocaleString('uz-UZ', {
                                day: '2-digit', month: '2-digit', year: 'numeric',
                                hour: '2-digit', minute: '2-digit'
                              })}
                            </td>
                            <td className="px-5 py-3.5 text-right">
                              <button
                                onClick={() => navigate(`/online-tests/results/${res.id || res._id}`)}
                                className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 hover:text-zinc-900 transition-colors"
                              >
                                Ko'rish
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
