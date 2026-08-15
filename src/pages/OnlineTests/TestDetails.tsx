import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Webcam from 'react-webcam';
import { ArrowLeft, Loader2, Copy, Users, BrainCircuit, Calendar, ExternalLink, FileText, Download, X, Sparkles, Play, Scan, Camera, RefreshCw, Upload, CheckCircle2, Check, XCircle } from 'lucide-react';
import { getAuthHeaders, getToken, getTeacher } from '../../lib/auth';
import { toast } from 'sonner';
import FormattedText from '../../components/FormattedText';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import MagicButton from '../../components/MagicButton';
import { gradeTestFromPhoto, type PaperGradingResult } from '../../lib/omrScanner';

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

  // Camera paper test grading states
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [paperStudentName, setPaperStudentName] = useState('');
  const [paperImageSrc, setPaperImageSrc] = useState<string | null>(null);
  const [isScanningPaper, setIsScanningPaper] = useState(false);
  const [paperGradingResult, setPaperGradingResult] = useState<PaperGradingResult | null>(null);
  const webcamRef = useRef<Webcam>(null);

  const handleCapturePhoto = () => {
    if (webcamRef.current) {
      const screenshot = webcamRef.current.getScreenshot();
      if (screenshot) {
        setPaperImageSrc(screenshot);
      } else {
        toast.error("Kameradan tasvir o'qib bo'lmadi");
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setPaperImageSrc(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleGradePaperTest = async () => {
    if (!paperStudentName.trim()) {
      toast.error("Iltimos, o'quvchi ism-familiyasini kiriting!");
      return;
    }
    if (!paperImageSrc) {
      toast.error("Iltimos, javoblar varaqasini kamerada rasmga oling yoki fayl yuklang!");
      return;
    }
    if (!test || !test.questions || test.questions.length === 0) {
      toast.error("Test savollari topilmadi");
      return;
    }

    setIsScanningPaper(true);
    const toastId = toast.loading("AI javoblar varag'ini skanerlamoqda va tekshirmoqda...");

    try {
      const result = await gradeTestFromPhoto(paperImageSrc, test.questions, paperStudentName.trim());
      setPaperGradingResult(result);

      // Save result to server database
      await fetch(`${API_URL}/online-test-results`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          testId,
          studentName: paperStudentName.trim(),
          score: result.score,
          totalScore: result.totalScore,
          createdAt: new Date().toISOString()
        })
      });

      toast.success(`${paperStudentName.trim()} natijasi (${result.score}/${result.totalScore}) saqlandi!`, { id: toastId });
      fetchData(); // Refresh test results table!
    } catch (err: any) {
      console.error(err);
      toast.error(`Xatolik: ${err.message}`, { id: toastId });
    } finally {
      setIsScanningPaper(false);
    }
  };

  const resetPaperScanner = () => {
    setPaperImageSrc(null);
    setPaperGradingResult(null);
    setPaperStudentName('');
  };

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
    <div className="min-h-screen font-sans text-zinc-900 bg-slate-50/50">
      
      {/* Header */}
      <header className="border-b border-zinc-200/80 sticky top-0 z-30 bg-white/90 backdrop-blur-md shadow-xs">
        <div className="max-w-7xl mx-auto px-3 md:px-6 h-14 flex items-center justify-between">
          <button 
            onClick={() => navigate('/online-tests')}
            className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-600 hover:text-zinc-900 transition-colors"
          >
            <ArrowLeft size={15} />
            Dashboard
          </button>
          <div className="text-xs font-bold uppercase tracking-wider text-zinc-800 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
            {test.title}
          </div>
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
                      <div className="w-4 h-4 border border-zinc-300 rounded"></div>
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
            <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-sm p-6 md:p-8 flex flex-col gap-6">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="inline-flex items-center px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100 text-[10px] font-bold uppercase tracking-wider rounded-md">
                    {test.subject}
                  </span>
                  <span className="text-[11px] text-zinc-500 flex items-center gap-1 font-medium">
                    <Calendar size={13} className="text-zinc-400" /> 
                    {new Date(test.createdAt).toLocaleDateString('uz-UZ')}
                  </span>
                </div>
                <h1 className="text-xl md:text-2xl font-bold tracking-tight text-zinc-900 leading-tight">
                  {test.title}
                </h1>
              </div>
              
              <div className="pt-5 border-t border-zinc-100 flex flex-col gap-3">
                <MagicButton
                  label="Link Nusxalash"
                  icon={<Copy size={15} />}
                  onClick={copyTestLink}
                  variant="indigo"
                  fullWidth
                />
                <button
                  onClick={() => navigate(`/online-tests/take/${testId}`)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100/70 text-indigo-700 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-xs group"
                >
                  <ExternalLink size={15} className="group-hover:scale-110 transition-transform" /> Yechib ko'rish
                </button>
                
                <div className="grid grid-cols-3 gap-2 w-full mt-1">
                  <button
                    onClick={handleExportWord}
                    className="flex items-center justify-center gap-1.5 px-2 py-2.5 bg-blue-50/70 text-blue-700 border border-blue-200/80 hover:bg-blue-100/80 hover:border-blue-300 rounded-lg text-[11px] font-semibold transition-all shadow-xs"
                    title="Word hujjat"
                  >
                    <FileText size={13} /> Word
                  </button>
                  <button
                    onClick={handleExportExcel}
                    className="flex items-center justify-center gap-1.5 px-2 py-2.5 bg-emerald-50/70 text-emerald-700 border border-emerald-200/80 hover:bg-emerald-100/80 hover:border-emerald-300 rounded-lg text-[11px] font-semibold transition-all shadow-xs"
                    title="Excel CSV jadval"
                  >
                    <FileText size={13} /> Excel
                  </button>
                  <button
                    onClick={handleDownloadPDF}
                    disabled={isDownloadingPdf}
                    className="flex items-center justify-center gap-1.5 px-2 py-2.5 bg-rose-50/70 text-rose-700 border border-rose-200/80 hover:bg-rose-100/80 hover:border-rose-300 rounded-lg text-[11px] font-semibold transition-all shadow-xs disabled:opacity-50"
                    title="PDF fayl"
                  >
                    {isDownloadingPdf
                      ? <><Loader2 size={13} className="animate-spin" /> ...</>
                      : <><Download size={13} /> PDF</>
                    }
                  </button>
                </div>
                
                <div className="flex flex-col gap-2.5 mt-1">
                  <MagicButton 
                    label="Jonli Rejim (Kahoot)" 
                    icon={<Play size={15} fill="currentColor" />} 
                    onClick={() => navigate(`/online-tests/live/host/${testId}`)} 
                    variant="purple"
                    fullWidth
                  />

                  <button
                    onClick={() => setIsCameraModalOpen(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-50/70 hover:bg-emerald-100/80 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-xs group cursor-pointer"
                  >
                    <Scan size={15} className="text-emerald-600 group-hover:scale-110 transition-transform" /> Kamera Skanner (OMR)
                  </button>
                  
                  <button
                    onClick={handleClassAnalysis}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-indigo-500/10 border border-indigo-200/90 text-indigo-950 hover:bg-indigo-100/60 hover:border-indigo-300 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-xs group cursor-pointer"
                  >
                    <Sparkles size={15} className="text-amber-500 group-hover:rotate-12 transition-transform" /> AI Sinf Tahlili
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-sm grid grid-cols-2 gap-4 divide-x divide-zinc-100">
               <div className="pr-2">
                 <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1 flex items-center gap-1.5">
                   <Users size={14} className="text-indigo-500"/> Qatnashuvchilar
                 </p>
                 <p className="text-2xl font-bold text-zinc-900">{results.length}</p>
               </div>
               <div className="pl-4">
                 <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1 flex items-center gap-1.5">
                   <BrainCircuit size={14} className="text-emerald-500"/> O'rtacha foiz
                 </p>
                 <p className="text-2xl font-bold text-zinc-900">{averagePercentage}%</p>
               </div>
            </div>
          </div>

          {/* Results Table */}
          <div className="lg:col-span-8">
            <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-zinc-100 bg-zinc-50/70 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 flex items-center gap-2">
                  <span>O'quvchilar Natijalari</span>
                  <span className="px-2 py-0.5 rounded-full bg-zinc-200/80 text-zinc-700 text-[10px] font-semibold">
                    {results.length}
                  </span>
                </h3>
              </div>
              
              {results.length === 0 ? (
                <div className="p-12 text-center flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400 mb-3">
                    <Users size={22} />
                  </div>
                  <p className="text-sm font-semibold text-zinc-900 mb-1">Hech kim topshirmagan</p>
                  <p className="text-xs text-zinc-500">Linkni nusxalab o'quvchilarga yuboring.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-zinc-50/50 border-b border-zinc-100">
                      <tr>
                        <th className="px-6 py-3.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500">O'quvchi</th>
                        <th className="px-6 py-3.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Natija</th>
                        <th className="px-6 py-3.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Vaqti</th>
                        <th className="px-6 py-3.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 text-right">Amal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {results.map((res: any) => {
                        const percent = Math.round((res.score / res.totalScore) * 100);
                        return (
                          <tr key={res.id || res._id} className="hover:bg-zinc-50/80 transition-colors">
                            <td className="px-6 py-4 text-xs font-semibold text-zinc-900 capitalize">
                              {res.studentName}
                            </td>
                            <td className="px-6 py-4 text-xs">
                              <div className="flex items-center gap-2.5">
                                <span className="font-bold text-zinc-900">{res.score} <span className="text-zinc-400 font-normal">/ {res.totalScore}</span></span>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider ${
                                  percent >= 80 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 
                                  percent >= 50 ? 'bg-amber-50 text-amber-700 border border-amber-200' : 
                                  'bg-rose-50 text-rose-700 border border-rose-200'
                                }`}>
                                  {percent}%
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-xs text-zinc-500 font-medium">
                              {new Date(res.createdAt).toLocaleString('uz-UZ', {
                                day: '2-digit', month: '2-digit', year: 'numeric',
                                hour: '2-digit', minute: '2-digit'
                              })}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button
                                onClick={() => navigate(`/online-tests/results/${res.id || res._id}`)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-50/70 hover:bg-indigo-100 text-indigo-700 text-[11px] font-semibold uppercase tracking-wider transition-colors border border-indigo-100"
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
              className="bg-white border border-zinc-200/80 w-full max-w-6xl rounded-2xl md:rounded-3xl overflow-hidden flex flex-col max-h-[90vh] shadow-2xl relative z-10"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-5 md:p-8 border-b border-zinc-100 bg-white">
                <div className="flex items-center gap-4 md:gap-5">
                  <div className="w-10 h-10 md:w-12 md:h-12 border border-indigo-100 bg-indigo-50 text-indigo-600 flex items-center justify-center rounded-xl">
                    <Sparkles className="w-5 h-5 md:w-6 md:h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-indigo-600 block mb-0.5">AI Tahlilchi</span>
                    <h2 className="text-xl md:text-2xl font-bold tracking-tight text-zinc-900">AI Sinf Tahlili</h2>
                  </div>
                </div>
                {!isAnalyzing && (
                  <button 
                    onClick={() => setIsAnalysisModalOpen(false)} 
                    className="p-2 text-zinc-400 hover:text-zinc-700 transition-colors border border-zinc-200/60 hover:border-zinc-300 rounded-xl"
                  >
                    <X className="w-5 h-5" strokeWidth={1.75} />
                  </button>
                )}
              </div>
              
              <div className="p-5 md:p-8 overflow-y-auto flex-1 bg-slate-50/50">
                {isAnalyzing ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <div className="w-12 h-12 border-2 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                    <p className="text-sm font-semibold text-zinc-900 uppercase tracking-wider mb-1">AI xulosalarni shakllantirmoqda...</p>
                    <p className="text-xs text-zinc-500">Bu bir necha soniya vaqt olishi mumkin</p>
                  </div>
                ) : analysisResult ? (
                  <div className="space-y-8">
                    
                    {/* Grid for Weak Topics & Recommendation */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
                      <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-zinc-200/80 shadow-xs">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-4 block">Eng ko'p xato qilingan mavzular</span>
                        <div className="border-t border-zinc-100 divide-y divide-zinc-100">
                          {analysisResult.weakTopics?.map((item: any, i: number) => (
                            <div key={i} className="py-3.5 flex items-center justify-between gap-4">
                              <span className="text-xs text-zinc-900 font-semibold">{typeof item === 'string' ? item : item.topic}</span>
                              <span className="text-[11px] font-semibold border border-rose-200 text-rose-700 px-2.5 py-1 rounded-full bg-rose-50/70">
                                {typeof item === 'string' ? '' : `${item.errorPercentage}% xato`}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-zinc-200/80 shadow-xs">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-4 block">Umumiy Sinf bo'yicha Maslahat</span>
                        <div className="bg-indigo-50/50 border border-indigo-100/80 p-5 rounded-xl">
                          <p className="text-sm text-zinc-700 leading-relaxed font-normal">
                            {analysisResult.recommendation}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Student Plans */}
                    {analysisResult.studentPlans && analysisResult.studentPlans.length > 0 && (
                      <div>
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-4 block">O'quvchilar uchun shaxsiy reja</span>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {analysisResult.studentPlans.map((plan: any, i: number) => (
                            <div key={i} className="border border-zinc-200/80 p-5 rounded-2xl bg-white flex flex-col justify-between hover:border-zinc-300 transition-colors shadow-xs">
                              <div>
                                <h4 className="text-xs font-bold text-zinc-900 mb-2">{plan.studentName}</h4>
                                <p className="text-xs text-zinc-600 leading-relaxed">{plan.plan}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Comprehensive Student Guide */}
                    {analysisResult.studentGuide && (
                      <div className="border-t border-zinc-200/80 pt-8">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">O'quvchilar uchun Umumiy Qo'llanma</span>
                          <button
                            onClick={handleExportGuideToWord}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 text-xs font-semibold rounded-xl transition-all shadow-xs flex items-center gap-2"
                          >
                            <Download size={14} /> Word qilib yuklab olish
                          </button>
                        </div>
                        <div className="prose prose-sm max-w-none text-zinc-800 bg-white p-6 rounded-2xl border border-zinc-200/80">
                          <ReactMarkdown>{analysisResult.studentGuide}</ReactMarkdown>
                        </div>
                      </div>
                    )}

                    {/* Re-generate Test Section */}
                    {analysisResult.generatedQuestions?.length > 0 && (
                      <div className="border border-indigo-200/80 p-8 md:p-10 text-center bg-white rounded-2xl shadow-xs flex flex-col items-center justify-center max-w-3xl mx-auto">
                        <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
                          <BrainCircuit size={24} />
                        </div>
                        <h4 className="text-base font-bold text-zinc-900 mb-1">Qayta Test Tayyor!</h4>
                        <p className="text-xs text-zinc-500 mb-6 max-w-lg">
                          Aynan yuqoridagi zaif mavzularni mustahkamlash uchun {analysisResult.generatedQuestions.length} ta yepyangi savol yaratildi.
                        </p>
                        <button
                          onClick={handleCreateNewTestFromAnalysis}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-sm flex items-center gap-2"
                        >
                          <Sparkles size={15} /> Shu savollar bilan yangi test yaratish
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

      {/* Paper Camera Scanner Modal */}
      <AnimatePresence>
        {isCameraModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white border border-zinc-200/80 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
            >
              {/* Modal Header */}
              <div className="px-6 py-5 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shadow-xs">
                    <Camera size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-zinc-900 leading-tight">Qog'ozdagi Javoblarni Kamera Orqali Tekshirish</h3>
                    <p className="text-xs text-zinc-500 font-medium">Suratga oling yoki fayl yuklang — AI bu test uchun avtomatik baholaydi</p>
                  </div>
                </div>
                <button
                  onClick={() => { setIsCameraModalOpen(false); resetPaperScanner(); }}
                  className="w-9 h-9 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-500 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                {!paperGradingResult ? (
                  <>
                    {/* Student Name Field */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-2">
                        O'quvchi Ismi va Familiyasi <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={paperStudentName}
                        onChange={e => setPaperStudentName(e.target.value)}
                        placeholder="Masalan: Azizbek Rahimov"
                        className="w-full bg-zinc-50 border border-zinc-200/80 rounded-xl px-4 py-3 text-xs font-semibold text-zinc-900 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-xs"
                      />
                    </div>

                    {/* Camera View / Preview */}
                    <div className="space-y-3">
                      <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700">
                        Javoblar Varaqasi (Kamera yoki Rasm)
                      </label>

                      {!paperImageSrc ? (
                        <div className="relative bg-slate-900 rounded-2xl overflow-hidden aspect-[4/3] border border-zinc-200 shadow-md flex items-center justify-center">
                          <Webcam
                            audio={false}
                            ref={webcamRef}
                            screenshotFormat="image/jpeg"
                            videoConstraints={{ facingMode: 'environment' }}
                            className="w-full h-full object-cover"
                          />
                          
                          {/* Guide Box Overlay */}
                          <div className="absolute inset-4 border-2 border-dashed border-white/60 rounded-xl pointer-events-none flex items-center justify-center">
                            <span className="bg-black/60 backdrop-blur-md text-white text-xs font-medium px-4 py-2 rounded-full">
                              Qog'oz varag'ini romga to'g'rilang
                            </span>
                          </div>

                          {/* Action overlay buttons */}
                          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 z-10">
                            <button
                              type="button"
                              onClick={handleCapturePhoto}
                              className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg flex items-center gap-2 transition-transform active:scale-95 cursor-pointer"
                            >
                              <Camera size={16} /> Rasmga Olish
                            </button>
                            <label className="px-4 py-3 bg-white/90 hover:bg-white text-zinc-800 font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg flex items-center gap-2 cursor-pointer transition-colors backdrop-blur-md">
                              <Upload size={16} /> Fayl
                              <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                            </label>
                          </div>
                        </div>
                      ) : (
                        <div className="relative rounded-2xl overflow-hidden border border-zinc-200 shadow-md aspect-[4/3]">
                          <img src={paperImageSrc} alt="Scanned test sheet" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setPaperImageSrc(null)}
                            className="absolute top-3 right-3 bg-black/70 hover:bg-black text-white text-xs font-semibold px-3 py-1.5 rounded-lg backdrop-blur-md flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <RefreshCw size={13} /> Qayta Olish
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Submit Button */}
                    <button
                      type="button"
                      disabled={isScanningPaper || !paperImageSrc || !paperStudentName.trim()}
                      onClick={handleGradePaperTest}
                      className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isScanningPaper ? (
                        <>
                          <Loader2 size={16} className="animate-spin" /> AI tekshirmoqda...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={16} /> AI Bilan Tekshirish va Natijani Saqlash
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  /* Graded Result View */
                  <div className="space-y-6">
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center relative overflow-hidden">
                      <div className="text-xs font-bold uppercase tracking-wider text-emerald-800 mb-1">Muvaffaqiyatli Tekshirildi va Saqlandi!</div>
                      <h4 className="text-2xl font-bold text-emerald-950 mb-4">{paperGradingResult.studentName}</h4>

                      <div className="inline-flex items-center gap-3 bg-white px-6 py-3 rounded-xl border border-emerald-200 shadow-xs mb-2">
                        <div className="text-3xl font-extrabold text-emerald-600">
                          {paperGradingResult.score} / {paperGradingResult.totalScore}
                        </div>
                        <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                          ({Math.round((paperGradingResult.score / paperGradingResult.totalScore) * 100)}%)
                        </div>
                      </div>
                    </div>

                    {/* Answers Breakdown */}
                    <div>
                      <h5 className="text-xs font-bold uppercase tracking-wider text-zinc-700 mb-3">Savollar Bo'yicha Tahlil:</h5>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {paperGradingResult.answers.map((ans, idx) => (
                          <div
                            key={idx}
                            className={`p-3 rounded-xl border flex items-center justify-between text-xs font-semibold ${
                              ans.isCorrect ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900' : 'bg-rose-50/60 border-rose-200 text-rose-900'
                            }`}
                          >
                            <span>#{idx + 1} savol</span>
                            <div className="flex items-center gap-1 font-bold">
                              {ans.selectedOption !== null ? String.fromCharCode(65 + ans.selectedOption) : '—'}
                              {ans.isCorrect ? <Check size={14} className="text-emerald-600" /> : <XCircle size={14} className="text-rose-600" />}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={resetPaperScanner}
                      className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm shadow-indigo-600/20 cursor-pointer"
                    >
                      Keyingi O'quvchi Qog'ozini Tekshirish ➕
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
