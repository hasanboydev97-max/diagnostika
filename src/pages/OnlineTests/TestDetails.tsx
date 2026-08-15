import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Copy, Users, BrainCircuit, Calendar, ExternalLink, FileText, Download, X, Sparkles, Play } from 'lucide-react';
import { getAuthHeaders, getToken, getTeacher } from '../../lib/auth';
import { toast } from 'sonner';
import FormattedText from '../../components/FormattedText';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import MagicButton from '../../components/MagicButton';

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
      const token = getToken();
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
      toast.error("AI Sinf Tahlili faqat 'Premium' yoki 'Standard' tarifda mavjud! Tarifni oshiring.");
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

  const handleExportGuideToWord = async () => {
    if (!analysisResult?.studentGuide || !test) return;
    try {
      const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import('docx');
      
      const lines = analysisResult.studentGuide.split('\n');
      const children = [
        new Paragraph({
          text: `${test.title} - Kengaytirilgan O'quv Qo'llanmasi`,
          heading: HeadingLevel.HEADING_1,
          spacing: { after: 400 }
        })
      ];

      lines.forEach((line: string) => {
        const tLine = line.trim();
        if (tLine.startsWith('# ')) {
          children.push(new Paragraph({ text: tLine.replace('# ', ''), heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 }}));
        } else if (tLine.startsWith('## ')) {
          children.push(new Paragraph({ text: tLine.replace('## ', ''), heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 150 }}));
        } else if (tLine.startsWith('### ')) {
          children.push(new Paragraph({ text: tLine.replace('### ', ''), heading: HeadingLevel.HEADING_3, spacing: { before: 200, after: 100 }}));
        } else if (tLine.startsWith('- ')) {
          children.push(new Paragraph({ text: tLine, bullet: { level: 0 }, spacing: { after: 100 }}));
        } else if (tLine !== '') {
          children.push(new Paragraph({ children: [new TextRun({ text: tLine })], spacing: { after: 120 } }));
        }
      });

      const doc = new Document({
        sections: [{ properties: {}, children }]
      });

      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${test.title}_Qollanma.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Qo'llanma Word formatida yuklandi!");
    } catch (error) {
      console.error(error);
      toast.error('Word hujjatni yaratishda xatolik yuz berdi');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col justify-center items-center font-mono">
        <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-black font-bold text-[10px] uppercase tracking-widest">Yuklanmoqda</p>
      </div>
    );
  }

  if (!test) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center font-mono p-4">
        <div className="border-2 border-black p-8 text-center">
          <h2 className="text-lg font-bold mb-4 uppercase tracking-tighter">Test topilmadi</h2>
          <button onClick={() => navigate('/online-tests')} className="text-[10px] font-bold uppercase tracking-widest underline underline-offset-4 hover:opacity-50">
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
    <div className="min-h-screen font-sans text-black bg-white">
      
      {/* Header */}
      <header className="border-b-2 border-black sticky top-0 z-30 bg-white">
        <div className="max-w-7xl mx-auto px-3 md:px-6 h-14 flex items-center justify-between">
          <button 
            onClick={() => navigate('/online-tests')}
            className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-black hover:opacity-50 transition-opacity"
          >
            <ArrowLeft size={14} />
            Dashboard
          </button>
          <div className="text-xs font-bold uppercase tracking-widest">{test.title}</div>
          <div className="w-20"></div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-3 md:px-6 py-6 md:py-8">

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
                      <div className="w-4 h-4 border border-black"></div>
                      <FormattedText content={opt} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 print:hidden">
          
          {/* Sidebar Info */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <div className="border-2 border-black p-8">
              <span className="inline-block px-2 py-1 bg-black text-white text-[10px] font-bold uppercase tracking-wider mb-4">
                {test.subject}
              </span>
              <h1 className="text-2xl font-bold tracking-tighter text-black mb-1 leading-tight">
                {test.title}
              </h1>
              <p className="text-zinc-500 text-[10px] mb-6 flex items-center gap-1.5 font-bold uppercase tracking-widest">
                <Calendar size={12} /> 
                {new Date(test.createdAt).toLocaleDateString('uz-UZ')}
              </p>
              
              <div className="pt-6 border-t-2 border-black flex flex-col gap-3">
                <MagicButton
                  label="Link Nusxalash"
                  icon={<Copy size={14} />}
                  onClick={copyTestLink}
                />
                <button
                  onClick={() => navigate(`/online-tests/take/${testId}`)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-black text-black text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-100 transition-colors"
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
                
                <div className="flex flex-col gap-2">
                  <MagicButton 
                    label="Jonli Rejim (Kahoot)" 
                    icon={<Play fill="currentColor" />} 
                    onClick={() => navigate(`/online-tests/live/host/${testId}`)} 
                    className="w-full justify-center"
                  />
                  
                  <button
                    onClick={handleClassAnalysis}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-zinc-900 text-zinc-900 text-xs font-bold uppercase tracking-widest hover:bg-zinc-50 transition-colors group"
                  >
                    <Sparkles size={14} className="text-zinc-900" /> AI Sinf Tahlili
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-none border border-zinc-200 grid grid-cols-2 gap-4">
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
            <div className="bg-white rounded-none border border-zinc-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-zinc-200 bg-zinc-50">
                <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-900">O'quvchilar Natijalari <span className="text-zinc-500 font-normal">({results.length})</span></h3>
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
      <AnimatePresence>
        {isAnalysisModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-transparent" 
              onClick={() => !isAnalyzing && setIsAnalysisModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
              className="bg-[#fdfdfd] border border-black/10 w-full max-w-6xl rounded-none md:rounded-2xl overflow-hidden flex flex-col max-h-[90vh] shadow-[0_20px_60px_rgba(0,0,0,0.1)] relative z-10 selection:bg-black selection:text-white"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 md:p-10 border-b border-black/10 bg-[#fdfdfd]">
                <div className="flex items-center gap-4 md:gap-6">
                  <div className="w-10 h-10 md:w-12 md:h-12 border border-black/10 bg-[#111111] text-white flex items-center justify-center rounded-none">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-gray-500 block mb-1">AI Tahlilchi</span>
                    <h2 className="text-xl md:text-3xl font-medium tracking-tight text-[#111111]">AI Sinf Tahlili</h2>
                  </div>
                </div>
                {!isAnalyzing && (
                  <button 
                    onClick={() => setIsAnalysisModalOpen(false)} 
                    className="p-2 md:p-3 text-gray-400 hover:text-black transition-colors border border-transparent hover:border-black/10 rounded-none"
                  >
                    <X className="w-6 h-6" strokeWidth={1.5} />
                  </button>
                )}
              </div>
              
              <div className="p-4 md:p-10 overflow-y-auto flex-1 bg-[#fdfdfd]">
                {isAnalyzing ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <div className="w-12 h-12 border-2 border-black/20 border-t-black rounded-full animate-spin mb-4"></div>
                    <p className="text-sm font-medium text-black uppercase tracking-[0.1em] mb-1">AI xulosalarni shakllantirmoqda...</p>
                    <p className="text-xs text-gray-400">Bu bir necha soniya vaqt olishi mumkin</p>
                  </div>
                ) : analysisResult ? (
                  <div className="space-y-12">
                    
                    {/* Grid for Weak Topics & Recommendation */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                      <div className="lg:col-span-5">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em] mb-4 block">Eng ko'p xato qilingan mavzular</span>
                        <div className="border-t border-black/10 divide-y divide-black/5">
                          {analysisResult.weakTopics?.map((item: any, i: number) => (
                            <div key={i} className="py-4 flex items-center justify-between gap-4">
                              <span className="text-sm text-[#111111] font-medium">{typeof item === 'string' ? item : item.topic}</span>
                              <span className="text-xs font-mono font-bold border border-black/10 px-2 py-1 bg-white">
                                {typeof item === 'string' ? '' : `${item.errorPercentage}% xato`}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="lg:col-span-7">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em] mb-4 block">Umumiy Sinf bo'yicha Maslahat</span>
                        <div className="border border-black/5 p-8 bg-white">
                          <p className="text-base text-gray-600 leading-relaxed font-normal">
                            {analysisResult.recommendation}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Student Plans */}
                    {analysisResult.studentPlans && analysisResult.studentPlans.length > 0 && (
                      <div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em] mb-6 block">O'quvchilar uchun shaxsiy reja</span>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                          {analysisResult.studentPlans.map((plan: any, i: number) => (
                            <div key={i} className="border border-black/5 p-4 md:p-6 bg-white flex flex-col justify-between hover:border-black/20 transition-colors shadow-sm">
                              <div>
                                <h4 className="text-sm font-bold text-black mb-2">{plan.studentName}</h4>
                                <p className="text-sm text-gray-500 leading-relaxed">{plan.plan}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Comprehensive Student Guide */}
                    {analysisResult.studentGuide && (
                      <div className="border-t border-black/10 pt-12 mt-12">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em] block">O'quvchilar uchun Umumiy Qo'llanma</span>
                          <button
                            onClick={handleExportGuideToWord}
                            className="bg-[#111111] text-[#fdfdfd] px-6 py-2 text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-black transition-colors flex items-center gap-2"
                          >
                            <Download size={14} /> Word qilib yuklab olish
                          </button>
                        </div>
                        <div className="prose prose-sm max-w-none text-[#111111]">
                          <ReactMarkdown>{analysisResult.studentGuide}</ReactMarkdown>
                        </div>
                      </div>
                    )}

                    {/* Re-generate Test Section */}
                    {analysisResult.generatedQuestions?.length > 0 && (
                      <div className="border border-black/10 p-8 md:p-12 text-center bg-white flex flex-col items-center justify-center max-w-3xl mx-auto">
                        <BrainCircuit size={32} className="text-black mb-4" strokeWidth={1} />
                        <h4 className="text-lg font-medium text-black mb-2">Qayta Test Tayyor!</h4>
                        <p className="text-sm text-gray-500 mb-8 max-w-lg">
                          Aynan yuqoridagi zaif mavzularni mustahkamlash uchun {analysisResult.generatedQuestions.length} ta yepyangi savol yaratildi.
                        </p>
                        <button
                          onClick={handleCreateNewTestFromAnalysis}
                          className="bg-[#111111] text-[#fdfdfd] px-8 py-4 text-[10px] font-bold uppercase tracking-[0.3em] hover:bg-black transition-colors flex items-center gap-2"
                        >
                          <Sparkles size={14} /> Shu savollar bilan yangi test yaratish
                        </button>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
