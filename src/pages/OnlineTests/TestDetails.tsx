import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Copy, Users, BrainCircuit, Calendar, ExternalLink, FileText, Download, X, Sparkles, Play } from 'lucide-react';
import { getAuthHeaders, getToken, getTeacher } from '../../lib/auth';
import MeshGradient from '../../components/ui/MeshGradient';
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
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);

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

  const secureDownload = async (url: string, filename: string, loadingMsg: string) => {
    const toastId = toast.loading(loadingMsg);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Server xatosi');
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
      toast.success('Muvaffaqiyatli yuklandi!', { id: toastId });
    } catch (error: any) {
      console.error(error);
      toast.error(`Xatolik: ${error.message}`, { id: toastId });
    }
  };

  const handleExportWord = async () => {
    if (!test) return;
    const teacher = getTeacher();
    if (teacher?.plan === 'free') {
      toast.error('Word (DOCX) eksporti faqat Standard va Premium tariflarda mavjud! Tarifni oshiring.');
      return;
    }
    await secureDownload(`${API_URL}/online-tests/${testId}/export/docx`, `${test.title}.docx`, 'Word fayl tayyorlanmoqda...');
  };

  const handleExportExcel = async () => {
    if (!test) return;
    const teacher = getTeacher();
    if (teacher?.plan === 'free') {
      toast.error('Excel (CSV) eksporti faqat Standard va Premium tariflarda mavjud! Tarifni oshiring.');
      return;
    }
    await secureDownload(`${API_URL}/online-tests/${testId}/export/excel`, `${test.title}_natijalar.xlsx`, 'Excel fayl tayyorlanmoqda...');
  };

  const handleDownloadPDF = async () => {
    if (!test || isDownloadingPdf) return;
    setIsDownloadingPdf(true);
    await secureDownload(`${API_URL}/online-tests/${testId}/export/pdf`, `${test.title}.pdf`, 'PDF tayyorlanmoqda...');
    setIsDownloadingPdf(false);
  };

  const handleClassAnalysis = async () => {
    if (!test) return;
    const teacher = getTeacher();
    if (teacher?.plan === 'free') {
      toast.error('AI Sinf Tahlili faqat Standard va Premium tariflarda mavjud! Tarifni oshiring.');
      return;
    }
    
    setIsAnalyzing(true);
    setIsAnalysisModalOpen(true);
    try {
      const res = await fetch(`${API_URL}/online-tests/${testId}/class-analysis`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Xatolik yuz berdi');
      setAnalysisResult(data);
    } catch (error: any) {
      toast.error(error.message);
      setIsAnalysisModalOpen(false);
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  const handleCreateNewTestFromAnalysis = () => {
     if (!analysisResult?.generatedQuestions) return;
     navigate('/online-tests/create', { state: { importedQuestions: analysisResult.generatedQuestions } });
  };

  if (loading) {
    return (
      <div className="min-h-screen relative bg-[#fdfdfd] flex flex-col justify-center items-center font-sans overflow-hidden">
        <MeshGradient />
        <div className="w-5 h-5 border-2 border-white/50 border-t-black rounded-full animate-spin mb-3 relative z-10"></div>
        <p className="text-gray-500 font-medium text-[11px] uppercase tracking-wider relative z-10">Yuklanmoqda</p>
      </div>
    );
  }

  if (!test) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-[#fdfdfd] flex flex-col items-center justify-center font-sans text-[#111111]">
        <MeshGradient />
        <div className="bg-white/60 backdrop-blur-xl border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 rounded-2xl relative z-10 text-center">
          <h2 className="text-lg font-medium mb-4">Test topilmadi</h2>
          <button onClick={() => navigate('/online-tests')} className="text-xs font-semibold uppercase tracking-wider text-gray-500 hover:text-black transition-colors">
            Dashboard'ga qaytish
          </button>
        </div>
      </div>
    );
  }

  // Calculate average score
  const totalPercentage = results.reduce((acc, curr) => acc + (curr.score / curr.totalScore) * 100, 0);
  const averagePercentage = results.length > 0 ? Math.round(totalPercentage / results.length) : 0;

  return (
    <div className="min-h-screen relative font-sans text-[#111111] overflow-x-hidden bg-[#fdfdfd] pb-24 selection:bg-black selection:text-white">
      <MeshGradient />
      
      {/* Header */}
      <header className="border-b border-white/50 bg-white/60 backdrop-blur-xl sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
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

      <div className="max-w-7xl mx-auto px-6 py-8 relative z-20">

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
            <div className="bg-white/60 backdrop-blur-xl border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 rounded-2xl">
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
                
                <div className="grid grid-cols-3 gap-2 w-full mt-1.5">
                  <button
                    onClick={handleExportWord}
                    className="flex items-center justify-center gap-1 px-2 py-2 bg-white border border-zinc-200 text-zinc-700 text-[11px] font-semibold rounded-md hover:bg-zinc-50 transition-colors"
                    title="Word hujjat"
                  >
                    <FileText size={12} /> Word
                  </button>
                  <button
                    onClick={handleExportExcel}
                    className="flex items-center justify-center gap-1 px-2 py-2 bg-white border border-zinc-200 text-zinc-700 text-[11px] font-semibold rounded-md hover:bg-zinc-50 transition-colors"
                    title="Excel CSV jadval"
                  >
                    <FileText size={12} className="text-emerald-600" /> Excel
                  </button>
                  <button
                    onClick={handleDownloadPDF}
                    disabled={isDownloadingPdf}
                    className="flex items-center justify-center gap-1 px-2 py-2 bg-white border border-zinc-200 text-zinc-700 text-[11px] font-semibold rounded-md hover:bg-zinc-50 transition-colors disabled:opacity-50"
                    title="PDF fayl"
                  >
                    {isDownloadingPdf
                      ? <><Loader2 size={12} className="animate-spin" /> ...</>
                      : <><Download size={12} /> PDF</>
                    }
                  </button>
                </div>
                
                <button
                  onClick={() => navigate(`/online-tests/live/host/${testId}`)}
                  className="w-full mt-1.5 flex items-center justify-center gap-2 px-3 py-2.5 bg-[#46178f] text-white text-xs font-bold rounded-md hover:bg-[#381272] transition-colors shadow-sm"
                >
                  <Play size={14} fill="currentColor" /> Jonli Rejim (Kahoot)
                </button>
                
                <button
                  onClick={handleClassAnalysis}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-semibold rounded-md hover:from-violet-700 hover:to-indigo-700 transition-all shadow-md"
                >
                  <Sparkles size={14} /> AI Sinf Tahlili
                </button>
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

      {/* AI Analysis Modal */}
      {isAnalysisModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !isAnalyzing && setIsAnalysisModalOpen(false)}></div>
          <div className="bg-white rounded-2xl w-full max-w-2xl relative z-10 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
              <h3 className="font-semibold text-zinc-900 flex items-center gap-2">
                <Sparkles size={18} className="text-violet-600" />
                AI Sinf Tahlili
              </h3>
              {!isAnalyzing && (
                <button onClick={() => setIsAnalysisModalOpen(false)} className="text-zinc-400 hover:text-zinc-700 transition-colors">
                  <X size={20} />
                </button>
              )}
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              {isAnalyzing ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="relative mb-4">
                    <div className="w-12 h-12 rounded-full border-4 border-violet-100"></div>
                    <div className="w-12 h-12 rounded-full border-4 border-violet-600 border-t-transparent animate-spin absolute inset-0"></div>
                  </div>
                  <p className="text-sm font-medium text-zinc-900 mb-1">AI xulosalarni shakllantirmoqda...</p>
                  <p className="text-xs text-zinc-500">Bu bir necha soniya vaqt olishi mumkin</p>
                </div>
              ) : analysisResult ? (
                <div className="space-y-6">
                  <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-red-800 mb-3">Eng ko'p xato qilingan mavzular</h4>
                    <ul className="space-y-3">
                      {analysisResult.weakTopics?.map((item: any, i: number) => (
                        <li key={i} className="flex items-center justify-between gap-4 text-sm bg-white p-3 rounded-lg border border-red-100">
                          <span className="text-zinc-800 font-medium flex-1">{typeof item === 'string' ? item : item.topic}</span>
                          <span className="text-red-600 font-bold bg-red-100 px-2 py-1 rounded text-xs whitespace-nowrap">
                            {typeof item === 'string' ? '' : `${item.errorPercentage}% xato`}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-blue-800 mb-2">Umumiy Sinf bo'yicha Maslahat</h4>
                    <p className="text-sm text-blue-900 leading-relaxed">
                      {analysisResult.recommendation}
                    </p>
                  </div>

                  {analysisResult.studentPlans && analysisResult.studentPlans.length > 0 && (
                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 mb-3">O'quvchilar uchun shaxsiy reja</h4>
                      <ul className="space-y-2 text-sm">
                        {analysisResult.studentPlans.map((plan: any, i: number) => (
                          <li key={i} className="flex items-start gap-2 text-emerald-900 bg-white p-3 rounded-lg border border-emerald-100">
                            <span className="font-bold text-emerald-700 min-w-max">{plan.studentName}:</span>
                            <span className="text-zinc-700">{plan.plan}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {analysisResult.generatedQuestions?.length > 0 && (
                    <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 text-center">
                      <BrainCircuit size={24} className="text-zinc-400 mx-auto mb-2" />
                      <h4 className="text-sm font-bold text-zinc-900 mb-1">Qayta Test Tayyor!</h4>
                      <p className="text-xs text-zinc-500 mb-4 max-w-sm mx-auto">
                        Aynan yuqoridagi zaif mavzularni mustahkamlash uchun {analysisResult.generatedQuestions.length} ta yepyangi savol yaratildi.
                      </p>
                      <button
                        onClick={handleCreateNewTestFromAnalysis}
                        className="inline-flex items-center gap-2 bg-zinc-900 text-white px-5 py-2.5 rounded-lg text-xs font-semibold hover:bg-zinc-800 transition-colors shadow-sm"
                      >
                        <Sparkles size={14} /> Shu savollar bilan yangi test yaratish
                      </button>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
