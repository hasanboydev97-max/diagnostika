import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Webcam from 'react-webcam';
import { 
  ArrowLeft, Loader2, Copy, Users, BrainCircuit, Calendar, 
  ExternalLink, FileText, Download, X, Sparkles, Play, 
  Scan, Camera, Upload, CheckCircle2, RefreshCw,
  Printer, FileSpreadsheet, Trash2
} from 'lucide-react';
import { getAuthHeaders, getToken, getTeacher } from '../../lib/auth';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import MagicButton from '../../components/MagicButton';
import MeshGradient from '../../components/ui/MeshGradient';
import { generateOMRPdf } from '../../lib/omrPdfGenerator';
import { gradeOMRFromImage, gradeTestFromPhoto, type OMRResult, type PaperGradingResult } from '../../lib/omrScanner';
import { parseZipGradeFile, type ZipGradeImportResult } from '../../lib/zipgradeParser';
import { db, type StudentResult } from '../../lib/db';
import { QUESTIONS_BLUEPRINT } from '../../lib/blueprint';

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

  // OMR & ZipGrade Modal State
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [omrTab, setOmrTab] = useState<'bubble-omr' | 'zipgrade' | 'multi-page'>('bubble-omr');
  
  // Smart OMR Camera State
  const [omrImageSrc, setOmrImageSrc] = useState<string | null>(null);
  const [isProcessingOmr, setIsProcessingOmr] = useState(false);
  const [omrResult, setOmrResult] = useState<OMRResult | null>(null);
  const [omrStudentName, setOmrStudentName] = useState('');
  const [omrStudentId, setOmrStudentId] = useState('');
  const [omrCameraFacing, setOmrCameraFacing] = useState<'environment' | 'user'>('environment');
  const omrWebcamRef = useRef<Webcam>(null);
  const omrFileInputRef = useRef<HTMLInputElement>(null);

  // Multi-page Question Paper State
  const [paperStudentName, setPaperStudentName] = useState('');
  const [paperImageSrcs, setPaperImageSrcs] = useState<string[]>([]);
  const [isScanningPaper, setIsScanningPaper] = useState(false);
  const [paperGradingResult, setPaperGradingResult] = useState<PaperGradingResult | null>(null);
  const paperWebcamRef = useRef<Webcam>(null);

  // ZipGrade Import State
  const [zipGradeData, setZipGradeData] = useState<ZipGradeImportResult | null>(null);
  const [isImportingZipGrade, setIsImportingZipGrade] = useState(false);
  const zipgradeFileInputRef = useRef<HTMLInputElement>(null);

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
      toast.error("Ma'lumotlarni yuklashda xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteResult = async (id: string, studentName: string) => {
    if (!window.confirm(`"${studentName}" ning natijasini o'chirib tashlamoqchimisiz? Bu amalni orqaga qaytarib bo'lmaydi.`)) {
      return;
    }
    
    const toastId = toast.loading('Natija o\'chirilmoqda...');
    try {
      const res = await fetch(`${API_URL}/online-test-results/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'O\'chirishda xatolik');
      }
      
      toast.success('Natija muvaffaqiyatli o\'chirildi', { id: toastId });
      fetchData(); // Refresh the list
    } catch (err: any) {
      toast.error(err.message, { id: toastId });
    }
  };

  const getTestAnswerKey = useCallback((): Record<number, string> => {
    if (!test || !test.questions) return {};
    const keyMap: Record<number, string> = {};
    const optionLetters = ['A', 'B', 'C', 'D', 'E'];
    test.questions.forEach((q: any, idx: number) => {
      const optIdx = typeof q.correctOption === 'number' ? q.correctOption : 0;
      keyMap[idx + 1] = optionLetters[optIdx] || 'A';
    });
    return keyMap;
  }, [test]);

  // 1. Download Standardized OMR Bubble Sheet PDF for this specific test
  const handleDownloadOMRSheet = () => {
    if (!test) return;
    const questionCount = test.questions?.length || 30;
    const schoolName = test.subject ? `${test.subject.toUpperCase()} FANI TESTI` : 'Maktab Diagnostika Testi';
    const testTitle = test.title || 'Imtihon Javoblar Varag\'i';

    try {
      const doc = generateOMRPdf({
        schoolName,
        testTitle,
        subject: test.subject || 'Umumiy Fan',
        questionCount,
        optionsCount: 4,
        variant: 'A'
      });

      doc.save(`OMR_Blankasi_${test.title.replace(/\s+/g, '_')}.pdf`);
      toast.success("Standardlashtirilgan OMR Javoblar varaqasi (PDF) tayyorlandi!");
    } catch (err: any) {
      console.error(err);
      toast.error("PDF yaratishda xatolik: " + err.message);
    }
  };

  // 2. Process Smart OMR Camera Scan
  const handleCaptureOmrPhoto = useCallback(() => {
    if (omrWebcamRef.current) {
      const screenshot = omrWebcamRef.current.getScreenshot();
      if (screenshot) {
        setOmrImageSrc(screenshot);
        processOmrImage(screenshot);
      }
    }
  }, [omrWebcamRef, test]);

  const handleOmrFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setOmrImageSrc(base64);
      processOmrImage(base64);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const processOmrImage = async (base64Img: string) => {
    if (!test || !test.questions) return;
    setIsProcessingOmr(true);
    setOmrResult(null);

    const toastId = toast.loading("AI OMR varaqani tahlil qilmoqda...");
    try {
      const answerKey = getTestAnswerKey();
      const omrRes = await gradeOMRFromImage(base64Img, answerKey, {
        totalQuestions: test.questions.length,
        optionsCount: 4,
        testTitle: test.title
      });

      setOmrResult(omrRes);
      setOmrStudentName(omrRes.studentName || `O'quvchi #${results.length + 1}`);
      setOmrStudentId(omrRes.studentId || Math.floor(100000 + Math.random() * 900000).toString());

      toast.success(`Tekshirildi! Natija: ${omrRes.score}% (${omrRes.correctCount}/${test.questions.length})`, { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Tekshirishda xatolik yuz berdi", { id: toastId });
    } finally {
      setIsProcessingOmr(false);
    }
  };

  const handleSaveOmrStudent = async () => {
    if (!omrResult || !test) return;

    const studentName = omrStudentName.trim() || `O'quvchi #${results.length + 1}`;
    const studentId = omrStudentId.trim() || Math.floor(100000 + Math.random() * 900000).toString();
    const score = omrResult.correctCount;
    const totalScore = test.questions.length;

    const toastId = toast.loading(`${studentName} natijasi saqlanmoqda...`);

    try {
      await fetch(`${API_URL}/online-test-results`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          testId,
          studentName,
          score,
          totalScore,
          answers: omrResult.answers,
          summaryText: omrResult.summaryText,
          createdAt: new Date().toISOString()
        })
      });

      const questionResults: Record<number, boolean> = {};
      omrResult.answers.forEach(a => {
        questionResults[a.q] = !!a.isCorrect;
      });

      const blueprint = QUESTIONS_BLUEPRINT.slice(0, totalScore);
      const catTotals: Record<string, number> = {};
      const catCorrects: Record<string, number> = {};

      blueprint.forEach(bp => {
        const isCorrect = questionResults[bp.id] || false;
        catTotals[bp.category] = (catTotals[bp.category] || 0) + 1;
        if (isCorrect) catCorrects[bp.category] = (catCorrects[bp.category] || 0) + 1;
      });

      const scores: Record<string, number> = {};
      Object.keys(catTotals).forEach(cat => {
        scores[cat] = Math.round(((catCorrects[cat] || 0) / catTotals[cat]) * 100);
      });

      const fullResult: StudentResult = {
        id: studentId,
        pin: Math.floor(1000 + Math.random() * 9000).toString(),
        studentName,
        grade: test.subject || '5',
        blueprintSnapshot: blueprint,
        scores,
        totalScore: omrResult.score,
        questionResults,
        aiSummaryText: omrResult.summaryText,
        createdAt: new Date().toISOString()
      };

      await db.saveResult(fullResult);

      toast.success(`${studentName} muvaffaqiyatli saqlandi!`, { id: toastId });
      
      setOmrImageSrc(null);
      setOmrResult(null);
      setOmrStudentName('');
      
      fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error(`Saqlashda xatolik: ${err.message}`, { id: toastId });
    }
  };

  const handleZipGradeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      toast.loading("ZipGrade fayli o'qilmoqda...", { id: 'zipgrade-load' });
      const arrayBuffer = await file.arrayBuffer();
      const parsed = parseZipGradeFile(arrayBuffer);
      
      setZipGradeData(parsed);
      toast.success(`${parsed.students.length} nafar o'quvchi ma'lumotlari yuklandi!`, { id: 'zipgrade-load' });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "ZipGrade faylini o'qishda xatolik yuz berdi", { id: 'zipgrade-load' });
    } finally {
      e.target.value = '';
    }
  };

  const handleSaveAllZipGradeStudents = async () => {
    if (!zipGradeData || zipGradeData.students.length === 0 || !test) return;

    setIsImportingZipGrade(true);
    const toastId = toast.loading(`0/${zipGradeData.students.length} o'quvchi saqlanmoqda...`);

    try {
      for (let i = 0; i < zipGradeData.students.length; i++) {
        const s = zipGradeData.students[i];
        const earned = typeof s.earnedPts === 'number' ? s.earnedPts : Math.round((s.percent / 100) * test.questions.length);

        await fetch(`${API_URL}/online-test-results`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            testId,
            studentName: s.studentName,
            score: earned,
            totalScore: test.questions.length,
            createdAt: new Date().toISOString()
          })
        });

        toast.loading(`${i + 1}/${zipGradeData.students.length} o'quvchi saqlandi...`, { id: toastId });
      }

      toast.success(`Barcha ${zipGradeData.students.length} nafar o'quvchi ushbu testga saqlandi!`, { id: toastId });
      setZipGradeData(null);
      fetchData();
      setIsCameraModalOpen(false);
    } catch (err: any) {
      console.error(err);
      toast.error("ZipGrade natijalarini saqlashda xatolik yuz berdi", { id: toastId });
    } finally {
      setIsImportingZipGrade(false);
    }
  };

  const handleGradePaperTest = async () => {
    if (!paperStudentName.trim()) {
      toast.error("Iltimos, o'quvchi ism-familiyasini kiriting!");
      return;
    }
    if (paperImageSrcs.length === 0) {
      toast.error("Iltimos, kamida 1 ta javoblar varaqasini kamerada rasmga oling yoki fayl yuklang!");
      return;
    }
    if (!test || !test.questions || test.questions.length === 0) {
      toast.error("Test savollari topilmadi");
      return;
    }

    setIsScanningPaper(true);
    const toastId = toast.loading(`AI ${paperImageSrcs.length} ta sahifadagi javoblar varaqalarini tekshirmoqda...`);

    try {
      const result = await gradeTestFromPhoto(paperImageSrcs, test.questions, paperStudentName.trim());
      setPaperGradingResult(result);

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
      fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error(`Xatolik: ${err.message}`, { id: toastId });
    } finally {
      setIsScanningPaper(false);
    }
  };

  const copyTestLink = () => {
    const link = `${window.location.origin}/online-tests/take/${testId}`;
    navigator.clipboard.writeText(link);
    toast.success("Test manzili nusxalandi! O'quvchilarga yuborishingiz mumkin.");
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
      toast.error('Word (DOCX) eksporti faqat Standard va Premium tariflarda mavjud!');
      return;
    }
    await secureDownload(`${API_URL}/online-tests/${testId}/export/docx`, `${test.title}.docx`, 'Word fayl tayyorlanmoqda...');
  };

  const handleExportExcel = async () => {
    if (!test) return;
    const teacher = getTeacher();
    if (teacher?.plan === 'free') {
      toast.error('Excel eksporti faqat Standard va Premium tariflarda mavjud!');
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
      toast.error("AI Sinf Tahlili faqat 'Premium' yoki 'Standard' tarifda mavjud!");
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fdfdfd] flex flex-col justify-center items-center font-sans">
        <div className="w-6 h-6 border-2 border-black/20 border-t-black rounded-full animate-spin mb-3"></div>
        <p className="text-black font-semibold text-xs uppercase tracking-widest">Yuklanmoqda</p>
      </div>
    );
  }

  if (!test) {
    return (
      <div className="min-h-screen bg-[#fdfdfd] flex flex-col items-center justify-center font-sans p-6">
        <div className="border border-black/10 bg-white p-8 rounded-3xl text-center max-w-md shadow-sm">
          <h2 className="text-lg font-bold mb-4 text-neutral-900">Test topilmadi</h2>
          <button onClick={() => navigate('/online-tests')} className="text-xs font-bold uppercase tracking-widest underline underline-offset-4 hover:opacity-70 text-neutral-800">
            Dashboard'ga qaytish
          </button>
        </div>
      </div>
    );
  }

  const totalPercentage = results.reduce((acc, curr) => acc + (curr.score / curr.totalScore) * 100, 0);
  const averagePercentage = results.length > 0 ? Math.round(totalPercentage / results.length) : 0;

  return (
    <div className="min-h-screen font-sans text-[#111111] selection:bg-black selection:text-white relative overflow-hidden bg-[#fdfdfd]">
      <MeshGradient />
      
      {/* Header */}
      <header className="border-b border-black/10 sticky top-0 z-30 bg-white/70 backdrop-blur-xl shadow-xs">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <button 
            onClick={() => navigate('/online-tests')}
            className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-600 hover:text-black transition-colors group"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            Dashboard
          </button>
          <div className="text-xs font-bold uppercase tracking-widest text-neutral-800 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-black"></span>
            {test.title}
          </div>
          <div className="w-20"></div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12 relative z-10">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Sidebar Test Action Card */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <div className="bg-white/80 backdrop-blur-md rounded-3xl border border-black/10 shadow-[0_8px_30px_rgb(0,0,0,0.03)] p-4 md:p-8 flex flex-col gap-6">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] px-3 py-1 rounded-full bg-white border border-black/10 text-neutral-800 shadow-xs">
                    {test.subject || 'FAN'}
                  </span>
                  <span className="text-xs text-neutral-400 font-medium flex items-center gap-1.5">
                    <Calendar size={13} /> 
                    {new Date(test.createdAt).toLocaleDateString('uz-UZ')}
                  </span>
                </div>
                <h1 className="text-2xl md:text-3xl font-medium tracking-tight text-neutral-900 leading-tight">
                  {test.title}
                </h1>
              </div>
              
              <div className="pt-6 border-t border-black/10 flex flex-col gap-3">
                <MagicButton
                  label="Link Nusxalash"
                  icon={<Copy size={15} />}
                  onClick={copyTestLink}
                  variant="indigo"
                  fullWidth
                />
                
                <button
                  onClick={() => navigate(`/online-tests/take/${testId}`)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-neutral-100 hover:bg-neutral-200/80 text-neutral-900 border border-black/5 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all shadow-xs group cursor-pointer"
                >
                  <ExternalLink size={15} className="group-hover:scale-110 transition-transform" /> Yechib ko'rish
                </button>
                
                {/* 4-Way Export Grid */}
                <div className="grid grid-cols-2 gap-2.5 w-full mt-1">
                  <button
                    onClick={handleExportWord}
                    className="flex items-center justify-center gap-2 p-3 bg-white hover:bg-neutral-50 text-neutral-800 border border-black/10 rounded-2xl text-xs font-semibold transition-all shadow-xs group cursor-pointer"
                    title="Word (.docx) formatida test savollarini yuklash"
                  >
                    <FileText size={14} className="text-neutral-500 group-hover:text-black transition-colors" /> Word
                  </button>
                  <button
                    onClick={handleExportExcel}
                    className="flex items-center justify-center gap-2 p-3 bg-white hover:bg-neutral-50 text-neutral-800 border border-black/10 rounded-2xl text-xs font-semibold transition-all shadow-xs group cursor-pointer"
                    title="Excel (.xlsx) formatida natijalarni yuklash"
                  >
                    <FileSpreadsheet size={14} className="text-neutral-500 group-hover:text-black transition-colors" /> Excel
                  </button>
                  <button
                    onClick={handleDownloadPDF}
                    disabled={isDownloadingPdf}
                    className="flex items-center justify-center gap-2 p-3 bg-white hover:bg-neutral-50 text-neutral-800 border border-black/10 rounded-2xl text-xs font-semibold transition-all shadow-xs group cursor-pointer disabled:opacity-50"
                    title="PDF formatida test savollarini yuklash"
                  >
                    {isDownloadingPdf ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} className="text-neutral-500 group-hover:text-black transition-colors" />} PDF
                  </button>
                  <button
                    onClick={handleDownloadOMRSheet}
                    className="flex items-center justify-center gap-2 p-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 border border-amber-500/20 rounded-2xl text-xs font-bold transition-all shadow-xs group cursor-pointer"
                    title="Ushbu test uchun maxsus OMR javoblar varaqasi (PDF)ni chop etish"
                  >
                    <Printer size={14} className="text-amber-700 group-hover:scale-110 transition-transform" /> OMR Blank
                  </button>
                </div>
                
                {/* Main Interactive Modes */}
                <div className="flex flex-col gap-2.5 mt-2">
                  <button 
                    onClick={() => navigate(`/online-tests/live/host/${testId}`)} 
                    className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white rounded-2xl text-xs font-bold uppercase tracking-wider transition-all shadow-md shadow-purple-500/20 group cursor-pointer"
                  >
                    <Play size={15} fill="currentColor" className="group-hover:scale-110 transition-transform" /> 
                    Jonli Rejim (Kahoot)
                  </button>

                  <button
                    onClick={() => setIsCameraModalOpen(true)}
                    className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-neutral-900 hover:bg-black text-white rounded-2xl text-xs font-bold uppercase tracking-wider transition-all shadow-md shadow-black/15 group cursor-pointer"
                  >
                    <Scan size={16} className="text-emerald-400 group-hover:scale-110 transition-transform" /> 
                    Kamera Skanner (OMR) & ZipGrade
                  </button>
                  
                  <button
                    onClick={handleClassAnalysis}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white hover:bg-neutral-50 border border-black/10 text-neutral-800 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all shadow-xs group cursor-pointer"
                  >
                    <Sparkles size={15} className="text-amber-500 group-hover:rotate-12 transition-transform" /> AI Sinf Tahlili
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="bg-white/80 backdrop-blur-md p-4 md:p-6 rounded-3xl border border-black/10 shadow-[0_8px_30px_rgb(0,0,0,0.03)] grid grid-cols-2 gap-4 divide-x divide-black/10">
               <div className="pr-4">
                 <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1 flex items-center gap-1.5">
                   <Users size={13} className="text-neutral-500"/> Qatnashuvchilar
                 </p>
                 <p className="text-3xl font-medium tracking-tight text-neutral-900">{results.length}</p>
               </div>
               <div className="pl-6">
                 <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1 flex items-center gap-1.5">
                   <BrainCircuit size={13} className="text-neutral-500"/> O'rtacha foiz
                 </p>
                 <p className="text-3xl font-medium tracking-tight text-neutral-900">{averagePercentage}%</p>
               </div>
            </div>
          </div>

          {/* Right Results Table */}
          <div className="lg:col-span-8">
            <div className="bg-white/80 backdrop-blur-md rounded-3xl border border-black/10 shadow-[0_8px_30px_rgb(0,0,0,0.03)] overflow-hidden">
              <div className="px-8 py-5 border-b border-black/10 bg-white/40 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-900 flex items-center gap-2">
                  <span>O'quvchilar Natijalari</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-black text-white text-[10px] font-mono font-bold">
                    {results.length}
                  </span>
                </h3>
              </div>

              {results.length === 0 ? (
                <div className="p-20 text-center text-neutral-400 flex flex-col items-center justify-center">
                  <div className="w-14 h-14 rounded-full bg-neutral-100 flex items-center justify-center mb-4 border border-black/5">
                    <Scan size={26} strokeWidth={1.5} className="text-neutral-400" />
                  </div>
                  <p className="text-sm font-semibold text-neutral-700">Hozircha natijalar mavjud emas</p>
                  <p className="text-xs text-neutral-400 max-w-sm mt-1.5 leading-relaxed">
                    O'quvchilar onlayn test yechishi yoki siz qog'ozdagi javoblarini kamera skanneri orqali kiritishingiz mumkin.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-neutral-50/70 border-b border-black/5 text-[10px] uppercase font-bold text-neutral-400 tracking-widest">
                      <tr>
                        <th className="px-8 py-4">O'quvchi</th>
                        <th className="px-6 py-4">Natija</th>
                        <th className="px-6 py-4">Vaqti</th>
                        <th className="px-8 py-4 text-right">Amal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5">
                      {results.map((r, i) => {
                        const pct = Math.round((r.score / r.totalScore) * 100);
                        return (
                          <tr key={r._id || r.id || i} className="hover:bg-neutral-50/80 transition-colors">
                            <td className="px-8 py-4 font-semibold text-neutral-900 flex items-center gap-2.5">
                              <span className="w-2 h-2 rounded-full bg-neutral-400"></span>
                              {r.studentName}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-neutral-800">{r.score} / {r.totalScore}</span>
                                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                                  pct >= 70 
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                                    : pct >= 50 
                                    ? 'bg-amber-50 text-amber-800 border-amber-200' 
                                    : 'bg-rose-50 text-rose-800 border-rose-200'
                                }`}>
                                  {pct}%
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-xs text-neutral-400 font-medium">
                              {new Date(r.createdAt).toLocaleString('uz-UZ', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="px-8 py-4 text-right flex items-center justify-end gap-2">
                              <button
                                onClick={() => navigate(`/online-tests/results/${r._id || r.id}`)}
                                className="text-xs font-bold text-neutral-800 hover:text-black bg-white hover:bg-neutral-100 border border-black/10 px-3.5 py-1.5 rounded-xl transition-all shadow-xs cursor-pointer uppercase tracking-wider"
                              >
                                Ko'rish
                              </button>
                              <button
                                onClick={() => handleDeleteResult(r._id || r.id || '', r.studentName)}
                                className="w-8 h-8 flex items-center justify-center rounded-xl bg-white hover:bg-rose-50 border border-black/10 text-neutral-400 hover:text-rose-500 hover:border-rose-200 transition-all shadow-xs cursor-pointer"
                                title="Natijani o'chirish"
                              >
                                <Trash2 size={14} />
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

      {/* REFINED BESPOKE OMR & ZIPGRADE SCANNER MODAL */}
      <AnimatePresence>
        {isCameraModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              className="bg-white border border-black/10 rounded-3xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl relative z-10"
            >
              {/* Modal Top Bar */}
              <div className="px-8 py-5 border-b border-black/10 flex items-center justify-between bg-neutral-50/70">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-neutral-900 text-white flex items-center justify-center shadow-sm">
                    <Scan size={20} className="text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold tracking-tight text-neutral-900 leading-tight">Qog'ozdagi Testlarni Tekshirish</h3>
                    <p className="text-xs text-neutral-500 font-medium mt-0.5">
                      Test: <span className="font-bold text-neutral-800">"{test.title}"</span> ({test.questions?.length} ta savol kaliti ulangan)
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsCameraModalOpen(false)}
                  className="w-9 h-9 rounded-xl bg-white hover:bg-neutral-100 border border-black/10 text-neutral-500 hover:text-black flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Minimalist Segmented Tab Switcher */}
              <div className="px-8 pt-4 pb-2 border-b border-black/5 bg-white flex gap-2 overflow-x-auto">
                <button
                  onClick={() => setOmrTab('bubble-omr')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                    omrTab === 'bubble-omr' 
                      ? 'bg-black text-white shadow-sm' 
                      : 'text-neutral-500 hover:text-black hover:bg-neutral-100'
                  }`}
                >
                  <Scan size={14} /> OMR Blankasi Skaneri
                </button>
                <button
                  onClick={() => setOmrTab('zipgrade')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                    omrTab === 'zipgrade' 
                      ? 'bg-black text-white shadow-sm' 
                      : 'text-neutral-500 hover:text-black hover:bg-neutral-100'
                  }`}
                >
                  <FileSpreadsheet size={14} /> ZipGrade CSV Import
                </button>
                <button
                  onClick={() => setOmrTab('multi-page')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                    omrTab === 'multi-page' 
                      ? 'bg-black text-white shadow-sm' 
                      : 'text-neutral-500 hover:text-black hover:bg-neutral-100'
                  }`}
                >
                  <FileText size={14} /> Savollar Kitobchasini Tekshirish
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-8 overflow-y-auto flex-1 space-y-6">

                {/* TAB 1: BUBBLE OMR CAMERA SCANNER */}
                {omrTab === 'bubble-omr' && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    
                    {/* Viewfinder Area */}
                    <div className="lg:col-span-7 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-widest text-neutral-500">
                          Javoblar varaqasini ramkaga to'g'rilang:
                        </span>
                        <button
                          onClick={handleDownloadOMRSheet}
                          className="text-xs font-bold text-neutral-800 hover:text-black bg-white hover:bg-neutral-50 px-3 py-1.5 rounded-xl border border-black/10 flex items-center gap-1.5 shadow-xs transition-all"
                        >
                          <Printer size={13} /> Blankani yuklash (PDF)
                        </button>
                      </div>

                      <div className="bg-neutral-950 rounded-3xl overflow-hidden shadow-2xl relative aspect-[4/3] border-4 border-neutral-100 flex items-center justify-center">
                        {!omrImageSrc ? (
                          <>
                            <Webcam
                              audio={false}
                              ref={omrWebcamRef}
                              screenshotFormat="image/jpeg"
                              videoConstraints={{ facingMode: omrCameraFacing }}
                              className="w-full h-full object-cover"
                            />

                            {/* Laser corner HUD overlay */}
                            <div className="absolute inset-0 pointer-events-none p-6 flex flex-col justify-between">
                              <div className="flex justify-between">
                                <div className="w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-md shadow-[0_0_12px_rgba(52,211,153,0.6)]" />
                                <div className="w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-md shadow-[0_0_12px_rgba(52,211,153,0.6)]" />
                              </div>
                              <div className="flex justify-center">
                                <span className="bg-black/70 backdrop-blur-md px-3.5 py-1.5 rounded-full text-white text-[11px] font-semibold border border-white/10">
                                  4 ta burchakni nishonga to'g'rilang
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <div className="w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-md shadow-[0_0_12px_rgba(52,211,153,0.6)]" />
                                <div className="w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-md shadow-[0_0_12px_rgba(52,211,153,0.6)]" />
                              </div>
                            </div>

                            {/* Bottom Controls */}
                            <div className="absolute bottom-5 left-0 right-0 px-6 flex items-center justify-between z-20">
                              <button
                                type="button"
                                onClick={() => setOmrCameraFacing(prev => prev === 'environment' ? 'user' : 'environment')}
                                className="p-3 bg-black/50 backdrop-blur-md text-white rounded-2xl hover:bg-black/70 border border-white/20 transition-all"
                                title="Kamerani almashtirish"
                              >
                                <RefreshCw size={18} />
                              </button>

                              <button
                                type="button"
                                onClick={handleCaptureOmrPhoto}
                                className="w-16 h-16 bg-white hover:bg-neutral-100 rounded-full flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all"
                              >
                                <div className="w-12 h-12 rounded-full bg-neutral-900 text-white flex items-center justify-center">
                                  <Camera size={22} className="text-emerald-400" />
                                </div>
                              </button>

                              <button
                                type="button"
                                onClick={() => omrFileInputRef.current?.click()}
                                className="p-3 bg-black/50 backdrop-blur-md text-white rounded-2xl hover:bg-black/70 border border-white/20 transition-all"
                                title="Galereyadan rasm yuklash"
                              >
                                <Upload size={18} />
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <img src={omrImageSrc} alt="Scanned sheet" className="w-full h-full object-contain" />
                            {isProcessingOmr && (
                              <div className="absolute inset-0 bg-neutral-950/75 backdrop-blur-md flex flex-col items-center justify-center text-white z-30">
                                <Loader2 size={36} className="animate-spin text-emerald-400 mb-3" />
                                <p className="font-bold text-sm">Neyrotarmoq AI tahlil qilmoqda...</p>
                              </div>
                            )}
                            {!isProcessingOmr && (
                              <button
                                type="button"
                                onClick={() => { setOmrImageSrc(null); setOmrResult(null); }}
                                className="absolute bottom-5 left-1/2 -translate-x-1/2 px-6 py-3 bg-white text-neutral-900 font-bold text-xs rounded-2xl shadow-xl flex items-center gap-2 hover:bg-neutral-100 transition-all"
                              >
                                <RefreshCw size={14} /> Qaytadan rasmga olish
                              </button>
                            )}
                          </>
                        )}
                      </div>
                      <input type="file" ref={omrFileInputRef} accept="image/*" onChange={handleOmrFileUpload} className="hidden" />
                    </div>

                    {/* Verification & Grade Card */}
                    <div className="lg:col-span-5 space-y-4">
                      {omrResult ? (
                        <div className="bg-white border border-black/10 rounded-3xl p-6 shadow-xl space-y-4">
                          <div className="flex items-center justify-between pb-3 border-b border-black/5">
                            <div className="flex items-center gap-3">
                              <div className={`w-12 h-12 rounded-2xl text-white font-black text-xl flex items-center justify-center shadow-md ${
                                omrResult.score >= 80 ? 'bg-emerald-600' : omrResult.score >= 60 ? 'bg-amber-500' : 'bg-rose-500'
                              }`}>
                                {omrResult.score}%
                              </div>
                              <div>
                                <h4 className="font-bold text-sm text-neutral-900 leading-tight">To'g'ri: {omrResult.correctCount} / {test.questions.length}</h4>
                                <span className="text-[10px] text-neutral-400 uppercase font-semibold">Gemini Vision AI</span>
                              </div>
                            </div>
                          </div>

                          <div>
                            <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-1 block">O'quvchi F.I.Sh</label>
                            <input
                              type="text"
                              value={omrStudentName}
                              onChange={e => setOmrStudentName(e.target.value)}
                              className="w-full bg-neutral-50 border border-black/10 rounded-2xl px-4 py-2.5 text-xs font-bold text-neutral-900 outline-none focus:border-black transition-colors"
                            />
                          </div>

                          {omrResult.summaryText && (
                            <div className="bg-neutral-50 border border-black/5 rounded-2xl p-3.5 text-xs text-neutral-800 flex gap-2.5 leading-relaxed">
                              <Sparkles size={16} className="text-amber-500 shrink-0 mt-0.5" />
                              <div>{omrResult.summaryText}</div>
                            </div>
                          )}

                          {/* Question Pills */}
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-2 block">Savollar tahlili:</span>
                            <div className="grid grid-cols-5 gap-1.5 max-h-36 overflow-y-auto pr-1">
                              {omrResult.answers.map(a => (
                                <div key={a.q} className={`p-1.5 rounded-xl text-center text-[10px] font-bold border ${
                                  a.isCorrect ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
                                }`}>
                                  #{a.q}: {a.ans} {a.correctAns && !a.isCorrect && `(${a.correctAns})`}
                                </div>
                              ))}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={handleSaveOmrStudent}
                            className="w-full py-3.5 bg-neutral-900 hover:bg-black text-white font-bold text-xs uppercase tracking-wider rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <CheckCircle2 size={16} className="text-emerald-400" /> 
                            Bazaga Saqlash & Keyingi O'quvchi
                          </button>
                        </div>
                      ) : (
                        <div className="bg-neutral-50/70 rounded-3xl p-8 border-2 border-dashed border-black/10 flex flex-col items-center justify-center text-center text-neutral-400 h-[340px]">
                          <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center mb-3 border border-black/5">
                            <Scan size={24} className="text-neutral-400" />
                          </div>
                          <p className="text-xs font-bold text-neutral-700">Varaqani Skaner Qiling</p>
                          <p className="text-[11px] text-neutral-400 max-w-xs mt-1.5 leading-relaxed">
                            Kamerani to'g'rilab oq tugmani bosing. Natijalar avtomatik o'qilib, shu test jadvaliga qo'shiladi.
                          </p>
                        </div>
                      )}
                    </div>

                  </div>
                )}

                {/* TAB 2: ZIPGRADE CSV IMPORT */}
                {omrTab === 'zipgrade' && (
                  <div className="space-y-6">
                    <div className="bg-neutral-900 text-white p-8 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400 mb-2 flex items-center gap-1.5">
                          <FileSpreadsheet size={13} /> ZipGrade CSV Sinxronizatsiya
                        </div>
                        <h4 className="text-xl font-medium tracking-tight">ZipGrade ilovasidan olingan faylni yuklang</h4>
                        <p className="text-xs text-neutral-300 mt-1.5 max-w-xl leading-relaxed">
                          Ushbu test uchun ZipGrade ilovasida olingan CSV yoki Excel faylini tanlang. Tizim barcha o'quvchilar ballarini ushbu test natijalariga avtomatik kiritadi.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => zipgradeFileInputRef.current?.click()}
                        className="px-6 py-3.5 bg-white text-neutral-900 font-bold text-xs rounded-2xl shadow-lg hover:bg-neutral-100 transition-all shrink-0 flex items-center gap-2 cursor-pointer uppercase tracking-wider"
                      >
                        <Upload size={15} /> CSV / Excel Tanlash
                      </button>
                      <input type="file" ref={zipgradeFileInputRef} accept=".csv, .xlsx, .xls" onChange={handleZipGradeUpload} className="hidden" />
                    </div>

                    {zipGradeData && (
                      <div className="bg-white border border-black/10 rounded-3xl p-6 shadow-xl space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-black/5">
                          <h4 className="font-bold text-sm text-neutral-900">
                            Aniqlangan o'quvchilar: <span className="font-mono font-black">{zipGradeData.students.length} nafar</span>
                          </h4>
                          <button
                            type="button"
                            onClick={handleSaveAllZipGradeStudents}
                            disabled={isImportingZipGrade}
                            className="px-6 py-3 bg-neutral-900 hover:bg-black text-white font-bold text-xs rounded-2xl shadow-md transition-all flex items-center gap-2 cursor-pointer uppercase tracking-wider"
                          >
                            {isImportingZipGrade ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} className="text-emerald-400" />}
                            Barcha O'quvchilarni Ushbu Testga Saqlash
                          </button>
                        </div>

                        <div className="max-h-60 overflow-y-auto rounded-2xl border border-black/5 bg-neutral-50/50">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-neutral-100/70 font-bold text-neutral-500 uppercase text-[10px] tracking-wider">
                              <tr>
                                <th className="p-3.5">#</th>
                                <th className="p-3.5">F.I.Sh</th>
                                <th className="p-3.5">Ball</th>
                                <th className="p-3.5">Foiz</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-black/5">
                              {zipGradeData.students.map((st, idx) => (
                                <tr key={idx}>
                                  <td className="p-3.5 text-neutral-400 font-bold">{idx + 1}</td>
                                  <td className="p-3.5 font-bold text-neutral-900">{st.studentName}</td>
                                  <td className="p-3.5 font-semibold">{st.earnedPts} / {test.questions.length}</td>
                                  <td className="p-3.5">
                                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-neutral-200 text-neutral-800">
                                      {st.percent}%
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 3: MULTI-PAGE QUESTION PAPER SCANNER */}
                {omrTab === 'multi-page' && (
                  <div className="space-y-6">
                    {!paperGradingResult ? (
                      <>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-1.5">
                            O'quvchi Ismi va Familiyasi <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={paperStudentName}
                            onChange={e => setPaperStudentName(e.target.value)}
                            placeholder="Masalan: Azizbek Rahimov"
                            className="w-full bg-neutral-50 border border-black/10 rounded-2xl px-4 py-3 text-xs font-bold text-neutral-900 outline-none focus:border-black transition-colors"
                          />
                        </div>

                        {paperImageSrcs.length > 0 && (
                          <div className="grid grid-cols-4 gap-3">
                            {paperImageSrcs.map((src, idx) => (
                              <div key={idx} className="relative rounded-2xl overflow-hidden border border-black/10 aspect-[4/3] shadow-sm">
                                <img src={src} alt="page" className="w-full h-full object-cover" />
                                <button
                                  type="button"
                                  onClick={() => setPaperImageSrcs(prev => prev.filter((_, i) => i !== idx))}
                                  className="absolute top-2 right-2 w-6 h-6 bg-rose-600 text-white rounded-lg flex items-center justify-center shadow-md"
                                >
                                  <X size={12} />
                                </button>
                                <span className="absolute bottom-2 left-2 bg-black/70 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
                                  {idx + 1}-bet
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="relative bg-neutral-950 rounded-3xl overflow-hidden aspect-[4/3] flex items-center justify-center shadow-xl border-4 border-neutral-100">
                          <Webcam
                            audio={false}
                            ref={paperWebcamRef}
                            screenshotFormat="image/jpeg"
                            videoConstraints={{ facingMode: 'environment' }}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-3 z-10">
                            <button
                              type="button"
                              onClick={() => {
                                if (paperWebcamRef.current) {
                                  const shot = paperWebcamRef.current.getScreenshot();
                                  if (shot) setPaperImageSrcs(prev => [...prev, shot]);
                                }
                              }}
                              className="px-6 py-3 bg-white text-neutral-900 font-bold text-xs uppercase tracking-wider rounded-2xl shadow-xl flex items-center gap-2 hover:bg-neutral-100 transition-all cursor-pointer"
                            >
                              <Camera size={16} /> {paperImageSrcs.length === 0 ? "Rasmga olish" : `➕ ${paperImageSrcs.length + 1}-Betni qo'shish`}
                            </button>
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={isScanningPaper || paperImageSrcs.length === 0 || !paperStudentName.trim()}
                          onClick={handleGradePaperTest}
                          className="w-full py-4 bg-neutral-900 hover:bg-black disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                        >
                          {isScanningPaper ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} className="text-emerald-400" />}
                          AI Bilan Tekshirish va Saqlash
                        </button>
                      </>
                    ) : (
                      <div className="bg-neutral-50 border border-black/10 rounded-3xl p-8 text-center space-y-4">
                        <h4 className="text-2xl font-medium tracking-tight text-neutral-900">{paperGradingResult.studentName}</h4>
                        <div className="text-4xl font-bold text-neutral-900">
                          {paperGradingResult.score} / {paperGradingResult.totalScore} ({Math.round((paperGradingResult.score / paperGradingResult.totalScore) * 100)}%)
                        </div>
                        {paperGradingResult.summaryText && (
                          <p className="text-xs text-neutral-600 max-w-lg mx-auto leading-relaxed">
                            {paperGradingResult.summaryText}
                          </p>
                        )}
                        <button
                          type="button"
                          onClick={() => { setPaperGradingResult(null); setPaperImageSrcs([]); setPaperStudentName(''); }}
                          className="px-8 py-3 bg-neutral-900 text-white font-bold text-xs uppercase tracking-wider rounded-2xl shadow-md hover:bg-black transition-all cursor-pointer"
                        >
                          Keyingi o'quvchini tekshirish
                        </button>
                      </div>
                    )}
                  </div>
                )}

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* AI CLASS ANALYSIS MODAL */}
      <AnimatePresence>
        {isAnalysisModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              className="bg-white border border-black/10 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
            >
              <div className="px-8 py-5 border-b border-black/10 flex items-center justify-between bg-neutral-50/70">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-amber-500/10 text-amber-700 border border-amber-500/20 flex items-center justify-center">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-neutral-900 tracking-tight leading-tight">AI Sinf Tahlili va Xulosa</h3>
                    <p className="text-xs text-neutral-500 font-medium mt-0.5">Barcha o'quvchilar natijalari bo'yicha kognitiv pedagogik tahlil</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAnalysisModalOpen(false)}
                  className="w-9 h-9 rounded-xl bg-white hover:bg-neutral-100 border border-black/10 text-neutral-500 hover:text-black flex items-center justify-center transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-8 overflow-y-auto space-y-6 flex-1">
                {isAnalyzing ? (
                  <div className="py-20 flex flex-col items-center justify-center text-center">
                    <Loader2 size={36} className="animate-spin text-neutral-900 mb-4" />
                    <h4 className="text-base font-bold text-neutral-900">Sinf natijalari tahlil qilinmoqda...</h4>
                    <p className="text-xs text-neutral-400 max-w-xs mt-1">Sun'iy intellekt zaif mavzularni va shaxsiy tavsiyalarni tuzmoqda</p>
                  </div>
                ) : analysisResult ? (
                  <div className="space-y-6">
                    <div className="bg-neutral-50 border border-black/5 p-4 md:p-6 rounded-3xl">
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-2">Umumiy Sinf bo'yicha Xulosa:</h4>
                      <p className="text-xs text-neutral-800 leading-relaxed">{analysisResult.recommendation}</p>
                    </div>
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
