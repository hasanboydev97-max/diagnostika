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
import { generateClassAnalysis, type StudentAnalysis, type CurriculumTopicInsight } from '../../lib/gemini';
import { openClassReportPrintWindow } from '../../lib/classReportPdfGenerator';
import { sendTelegramMessage, getSavedChatId } from '../../lib/telegram';

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
  const [selectedStudent, setSelectedStudent] = useState<StudentAnalysis | null>(null);
  const [activeAnalysisTab, setActiveAnalysisTab] = useState<'class' | 'topics' | 'students' | 'handbook'>('class');

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
      let optIdx = 0;
      if (typeof q.correctOption === 'number') {
        optIdx = q.correctOption;
      } else if (typeof q.correctOption === 'string') {
        if (['a', 'b', 'c', 'd', 'e'].includes(q.correctOption.toLowerCase().trim())) {
          const map: Record<string, number> = { a: 0, b: 1, c: 2, d: 3, e: 4 };
          optIdx = map[q.correctOption.toLowerCase().trim()];
        } else if (Array.isArray(q.options)) {
          const foundIdx = q.options.findIndex((opt: string) => opt.trim() === q.correctOption.trim());
          if (foundIdx !== -1) optIdx = foundIdx;
        }
      }
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
      // Senior optimization: Rasm hajmini va formatini client-side optimallashtirish (Network va AI limitlarini oldini olish uchun)
      const compressedImg = await new Promise<string>((resolve) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let { width, height } = img;
          const MAX_SIZE = 1600; // Optimal o'lcham
          if (width > MAX_SIZE || height > MAX_SIZE) {
            if (width > height) {
              height = Math.round((height * MAX_SIZE) / width);
              width = MAX_SIZE;
            } else {
              width = Math.round((width * MAX_SIZE) / height);
              height = MAX_SIZE;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            // Oq fon qo'yish (shaffof PNG lar uchun)
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, width, height);
            
            // SENIOR DARAJASIDAGI YECHIM: Rasmni AI ko'rishi uchun qulaylashtirish
            // Qorong'i va xira rasmlarni avtomatik oqartirish va kontrastini oshirish
            ctx.filter = 'contrast(1.4) brightness(1.2) grayscale(0.2)';
            
            ctx.drawImage(img, 0, 0, width, height);
          }
          resolve(canvas.toDataURL('image/jpeg', 0.85)); // 85% sifatli JPEG (hajm va sifat balansi)
        };
        img.src = base64Img;
      });

      const answerKey = getTestAnswerKey();
      const omrRes = await gradeOMRFromImage(compressedImg, answerKey, {
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
      const res = await fetch(`${API_URL}/online-test-results`, {
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

      if (!res.ok) {
         const errData = await res.json().catch(() => ({}));
         throw new Error(errData.error || "Natijani saqlashda xatolik yuz berdi");
      }

      const questionResults: Record<number, boolean> = {};
      omrResult.answers.forEach((a: any) => {
        questionResults[a.q] = !!a.isCorrect;
      });

      const blueprint = QUESTIONS_BLUEPRINT.slice(0, totalScore);
      const catTotals: Record<string, number> = {};
      const catCorrects: Record<string, number> = {};

      blueprint.forEach((bp: any) => {
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

    let successCount = 0;
    let failCount = 0;

    try {
      for (let i = 0; i < zipGradeData.students.length; i++) {
        const s = zipGradeData.students[i];
        const earned = typeof s.earnedPts === 'number' ? s.earnedPts : Math.round((s.percent / 100) * test.questions.length);

        try {
          const res = await fetch(`${API_URL}/online-test-results`, {
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
          
          if (!res.ok) throw new Error("Backend failed");
          successCount++;
        } catch (innerErr) {
          console.error(`Failed to save student ${s.studentName}`, innerErr);
          failCount++;
        }

        toast.loading(`${i + 1}/${zipGradeData.students.length} o'quvchi saqlanmoqda...`, { id: toastId });
      }

      if (failCount === 0) {
        toast.success(`Barcha ${successCount} nafar o'quvchi ushbu testga saqlandi!`, { id: toastId });
      } else {
        toast.error(`${successCount} tasi saqlandi, ${failCount} tasi saqlanmadi (Tarmoq xatosi).`, { id: toastId, duration: 6000 });
      }
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

      const res = await fetch(`${API_URL}/online-test-results`, {
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

      if (!res.ok) {
         const errData = await res.json().catch(() => ({}));
         throw new Error(errData.error || "Natijani saqlashda xatolik yuz berdi");
      }

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
    if (!test || !results || results.length === 0) {
      toast.error("Tahlil uchun kamida 1 ta o'quvchi natijasi kerak!");
      return;
    }
    const teacher = getTeacher();
    if (teacher?.plan === 'free') {
      toast.error("AI Sinf Tahlili faqat 'Premium' yoki 'Standard' tarifda mavjud!");
      return;
    }
    
    setIsAnalyzing(true);
    setIsAnalysisModalOpen(true);
    try {
      const classResult = await generateClassAnalysis(test.title, test.questions, results);
      if (!classResult) throw new Error("AI tahlil yarata olmadi.");
      setAnalysisResult(classResult);
      
      // Botga yuborish
      const chatId = getSavedChatId();
      if (chatId) {
        let msg = `🎓 <b>AI Sinf Tahlili: ${test.title}</b> 🎓\n\n`;
        msg += `💡 <b>Umumiy Xulosa:</b>\n${classResult.generalIssues}\n\n`;
        msg += `👤 <b>O'quvchilar:</b>\n`;
        classResult.studentBreakdowns.forEach(st => {
          msg += `• <b>${st.name}</b> (${st.score} ball): ${st.feedback}\n`;
        });
        sendTelegramMessage(chatId, msg).catch(() => {});
      }
    } catch (error: any) {
      toast.error(error.message || "Tahlilda xatolik");
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
                  onClick={async () => {
                    const { downloadDesktopShortcut } = await import('../../lib/shortcut');
                    downloadDesktopShortcut(testId as string, test?.title || 'Test');
                    toast.success("Ish stoliga yorliq yuklandi!");
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white hover:bg-neutral-50 text-neutral-900 border border-black/10 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all shadow-xs group cursor-pointer"
                >
                  <Download size={15} className="group-hover:scale-110 transition-transform" /> Ish stoliga yorliq yuklash
                </button>
                
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
                  <table className="w-full text-left text-sm whitespace-nowrap">
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
              <div className="px-4 sm:px-8 py-4 sm:py-5 border-b border-black/10 flex items-start sm:items-center justify-between bg-neutral-50/70 gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-neutral-900 text-white flex items-center justify-center shadow-sm shrink-0">
                    <Scan size={20} className="text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-semibold tracking-tight text-neutral-900 leading-tight line-clamp-1">
                      Qog'ozdagi Testlarni Tekshirish <span className="text-emerald-600 text-[10px] ml-1 bg-emerald-100 px-2 py-0.5 rounded-full relative -top-0.5">v2.1</span>
                    </h3>
                    <p className="text-[10px] sm:text-xs text-neutral-500 font-medium mt-0.5 line-clamp-1">
                      Test: <span className="font-bold text-neutral-800">"{test.title}"</span> ({test.questions?.length} ta savol kaliti)
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsCameraModalOpen(false)}
                  className="w-8 h-8 sm:w-9 sm:h-9 shrink-0 rounded-xl bg-white hover:bg-neutral-100 border border-black/10 text-neutral-500 hover:text-black flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Minimalist Segmented Tab Switcher */}
              <div className="px-4 sm:px-8 pt-4 pb-2 border-b border-black/5 bg-white flex gap-2 overflow-x-auto scrollbar-hide">
                <button
                  onClick={() => setOmrTab('bubble-omr')}
                  className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap shrink-0 ${
                    omrTab === 'bubble-omr' 
                      ? 'bg-black text-white shadow-sm' 
                      : 'text-neutral-500 hover:text-black hover:bg-neutral-100'
                  }`}
                >
                  <Scan size={14} /> OMR Blankasi Skaneri
                </button>
                <button
                  onClick={() => setOmrTab('zipgrade')}
                  className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap shrink-0 ${
                    omrTab === 'zipgrade' 
                      ? 'bg-black text-white shadow-sm' 
                      : 'text-neutral-500 hover:text-black hover:bg-neutral-100'
                  }`}
                >
                  <FileSpreadsheet size={14} /> ZipGrade CSV Import
                </button>
                <button
                  onClick={() => setOmrTab('multi-page')}
                  className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap shrink-0 ${
                    omrTab === 'multi-page' 
                      ? 'bg-black text-white shadow-sm' 
                      : 'text-neutral-500 hover:text-black hover:bg-neutral-100'
                  }`}
                >
                  <FileText size={14} /> Savollar Kitobchasini Tekshirish
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-4 sm:p-8 overflow-y-auto flex-1 space-y-4 sm:space-y-6">

                {/* TAB 1: BUBBLE OMR CAMERA SCANNER */}
                {omrTab === 'bubble-omr' && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
                    
                    {/* Viewfinder Area */}
                    <div className="lg:col-span-7 space-y-3">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                        <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-neutral-500 line-clamp-1">
                          Javoblar varaqasini ramkaga to'g'rilang:
                        </span>
                        <button
                          onClick={handleDownloadOMRSheet}
                          className="text-xs font-bold text-neutral-800 hover:text-black bg-white hover:bg-neutral-50 px-3 py-1.5 rounded-xl border border-black/10 flex items-center gap-1.5 shadow-xs transition-all w-full sm:w-auto justify-center"
                        >
                          <Printer size={13} /> Blankani yuklash (PDF)
                        </button>
                      </div>

                      <div className="bg-neutral-950 rounded-3xl overflow-hidden shadow-xl relative aspect-[3/4] sm:aspect-[4/3] border-4 border-neutral-100 flex items-center justify-center">
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
                          <table className="w-full text-left text-xs whitespace-nowrap">
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

      {/* AI CLASS ANALYSIS MODAL — PROFESSIONAL VERSION */}
      <AnimatePresence>
        {isAnalysisModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ duration: 0.25 }}
              className="bg-white border border-black/10 rounded-3xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col shadow-2xl"
            >
              {/* Modal Header */}
              <div className="px-5 sm:px-8 py-4 sm:py-5 border-b border-black/10 flex items-center justify-between bg-gradient-to-r from-neutral-50 to-white shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-neutral-900 tracking-tight leading-tight">AI Sinf Tahlili va Xulosa</h3>
                    <p className="text-[10px] sm:text-xs text-neutral-500 font-medium mt-0.5">{test?.title} • {results.length} nafar o'quvchi</p>
                  </div>
                </div>
                <button
                  onClick={() => { setIsAnalysisModalOpen(false); setSelectedStudent(null); setActiveAnalysisTab('class'); }}
                  className="w-9 h-9 rounded-xl bg-white hover:bg-neutral-100 border border-black/10 text-neutral-500 hover:text-black flex items-center justify-center transition-colors shrink-0"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Loading State */}
              {isAnalyzing && (
                <div className="flex-1 flex flex-col items-center justify-center py-20 px-8 text-center space-y-5">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full border-4 border-amber-100 border-t-amber-500 animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Sparkles size={20} className="text-amber-500" />
                    </div>
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-neutral-900 mb-1">Sinf tahlil qilinmoqda...</h4>
                    <p className="text-sm text-neutral-500 max-w-xs leading-relaxed">Sun'iy intellekt har bir o'quvchi uchun individual yo'l xarita va ota-onalarga hisobot tuzmoqda</p>
                  </div>
                  <div className="flex flex-col gap-2 w-full max-w-xs">
                    {['Sinf statistikasi hisoblanmoqda', 'Individual tahlil amalga oshirilmoqda', 'Ota-onalarga hisobotlar yozilmoqda', 'Yo\'l xaritalari tuzilmoqda'].map((step, i) => (
                      <div key={i} className="flex items-center gap-2.5 text-xs text-neutral-500">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" style={{ animationDelay: `${i * 0.3}s` }} />
                        {step}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Results */}
              {!isAnalyzing && analysisResult && (
                <>
                  {/* Tabs */}
                  <div className="px-5 sm:px-8 pt-4 pb-0 border-b border-black/5 flex gap-1 overflow-x-auto scrollbar-hide shrink-0 bg-white">
                    {[
                      { key: 'class', label: 'Sinf Bo\'yicha', icon: '🏫' },
                      { key: 'topics', label: `O'tilgan Mavzular & Zarurati (${analysisResult.curriculumTopics?.length || 0})`, icon: '📚' },
                      { key: 'students', label: `O'quvchilar (${analysisResult.studentAnalyses?.length || 0})`, icon: '👥' },
                      { key: 'handbook', label: 'Savollar Qo\'llanma', icon: '📖' },
                    ].map(tab => (
                      <button
                        key={tab.key}
                        onClick={() => { setActiveAnalysisTab(tab.key as any); setSelectedStudent(null); }}
                        className={`flex items-center gap-1.5 px-4 py-2.5 rounded-t-xl text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap shrink-0 border-b-2 ${
                          activeAnalysisTab === tab.key
                            ? 'border-b-black text-neutral-900 bg-neutral-50 shadow-xs'
                            : 'border-b-transparent text-neutral-400 hover:text-neutral-700 hover:bg-neutral-50/50'
                        }`}
                      >
                        <span>{tab.icon}</span> {tab.label}
                      </button>
                    ))}
                  </div>

                  <div className="overflow-y-auto flex-1">

                    {/* ===== TAB 1: CLASS OVERVIEW ===== */}
                    {activeAnalysisTab === 'class' && (
                      <div className="p-5 sm:p-8 space-y-6">
                        {/* Deduplication notice if any were cleaned */}
                        {analysisResult.classOverview.duplicatesRemovedCount > 0 && (
                          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-2xl p-4 flex items-center justify-between gap-3 text-xs text-blue-900 shadow-xs">
                            <div className="flex items-center gap-2.5">
                              <span className="text-base">🛡️</span>
                              <div>
                                <span className="font-bold">Aqlli Tozalash Muvaffaqiyatli:</span> {analysisResult.classOverview.rawSubmissionsCount} ta topshiriqdan <strong>{analysisResult.classOverview.duplicatesRemovedCount} ta</strong> takrorlangan urinish va soxta test ismlari tozalandi.
                                <div className="text-[11px] text-blue-700/80 mt-0.5">Har bir o'quvchining faqat eng yaxshi (maksimal) balli qoldirildi.</div>
                              </div>
                            </div>
                            <span className="px-2.5 py-1 rounded-full bg-blue-600 text-white text-[10px] font-bold uppercase tracking-wider shrink-0">
                              {analysisResult.classOverview.totalStudents} yagona o'quvchi
                            </span>
                          </div>
                        )}

                        {/* Stats Row */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {[
                            { label: 'Jami yagona o\'quvchi', value: analysisResult.classOverview.totalStudents, color: 'bg-blue-50 text-blue-700 border-blue-100' },
                            { label: 'O\'rtacha ball', value: `${analysisResult.classOverview.averageScore}%`, color: 'bg-amber-50 text-amber-700 border-amber-100' },
                            { label: 'O\'tganlar (≥60%)', value: analysisResult.classOverview.passCount, color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
                            { label: 'Muammoli (<60%)', value: analysisResult.classOverview.failCount, color: 'bg-rose-50 text-rose-700 border-rose-100' },
                          ].map((stat, i) => (
                            <div key={i} className={`border rounded-2xl p-4 text-center ${stat.color}`}>
                              <div className="text-2xl sm:text-3xl font-black mb-1">{stat.value}</div>
                              <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider opacity-80">{stat.label}</div>
                            </div>
                          ))}
                        </div>

                        {/* Top performer + Needs attention */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {analysisResult.classOverview.topPerformer && (
                            <div className="bg-gradient-to-br from-emerald-50 to-white border border-emerald-100 rounded-2xl p-4 flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center text-lg font-black shadow-md shadow-emerald-500/20 shrink-0">🏆</div>
                              <div>
                                <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-0.5">Eng yuqori natija</div>
                                <div className="font-bold text-neutral-900 text-sm">{analysisResult.classOverview.topPerformer}</div>
                              </div>
                            </div>
                          )}
                          {analysisResult.classOverview.needsAttention?.length > 0 && (
                            <div className="bg-gradient-to-br from-rose-50 to-white border border-rose-100 rounded-2xl p-4">
                              <div className="text-[10px] font-bold text-rose-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">⚠️ Alohida e'tibor talab qiluvchilar</div>
                              <div className="flex flex-wrap gap-1.5">
                                {analysisResult.classOverview.needsAttention.map((name: string, i: number) => (
                                  <span key={i} className="px-2.5 py-1 bg-white border border-rose-200 text-rose-700 text-[10px] font-bold rounded-lg">{name}</span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Strengths & Weaknesses */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5">
                            <h4 className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest mb-3 flex items-center gap-1.5">✅ Sinf Kuchli Tomonlari</h4>
                            <ul className="space-y-2">
                              {(analysisResult.classOverview.classStrengths || []).map((s: string, i: number) => (
                                <li key={i} className="flex items-start gap-2 text-xs text-emerald-800 font-medium leading-relaxed">
                                  <span className="mt-0.5 w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[9px] font-black shrink-0">{i + 1}</span>
                                  {s}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div className="bg-rose-50 border border-rose-100 rounded-2xl p-5">
                            <h4 className="text-[10px] font-bold text-rose-700 uppercase tracking-widest mb-3 flex items-center gap-1.5">⚡ Sinf Zaif Tomonlari</h4>
                            <ul className="space-y-2">
                              {(analysisResult.classOverview.classWeaknesses || []).map((w: string, i: number) => (
                                <li key={i} className="flex items-start gap-2 text-xs text-rose-800 font-medium leading-relaxed">
                                  <span className="mt-0.5 w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center text-[9px] font-black shrink-0">{i + 1}</span>
                                  {w}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        {/* Teacher Recommendations */}
                        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5">
                          <h4 className="text-[10px] font-bold text-indigo-700 uppercase tracking-widest mb-3 flex items-center gap-2">🎓 O'qituvchiga Metodik Tavsiyalar</h4>
                          <ol className="space-y-3">
                            {(analysisResult.classOverview.teacherRecommendations || []).map((rec: string, i: number) => (
                              <li key={i} className="flex items-start gap-3">
                                <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                                <p className="text-xs sm:text-sm text-indigo-900 leading-relaxed font-medium">{rec}</p>
                              </li>
                            ))}
                          </ol>
                        </div>

                        {/* General Summary */}
                        <div className="bg-neutral-900 text-white rounded-2xl p-6">
                          <div className="flex items-center gap-2 mb-3">
                            <BrainCircuit size={18} className="text-amber-400" />
                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-neutral-300">Umumiy Sinf Xulosasi</h4>
                          </div>
                          <p className="text-sm leading-relaxed font-medium text-neutral-100">{analysisResult.generalIssues}</p>
                        </div>
                      </div>
                    )}

                    {/* ===== TAB 2: CURRICULUM TOPICS & REAL WORLD RELEVANCE ===== */}
                    {activeAnalysisTab === 'topics' && (
                      <div className="p-5 sm:p-8 space-y-6">
                        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 rounded-2xl p-5">
                          <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-2 mb-1.5">
                            <span>🎯</span> O'tilgan Mavzularning Real Hayotdagi Ahamiyati
                          </h4>
                          <p className="text-xs text-amber-800 leading-relaxed font-medium">
                            Ushbu testdagi har bir mavzu shunchaki nazariya emas, balki bolaning zamonaviy dunyoda muvaffaqiyatga erishishi, IT, moliya, muhandislik va mantiqiy qaror qabul qilishida o'ta muhim ahamiyat kasb etadi.
                          </p>
                        </div>

                        <div className="space-y-4">
                          {(analysisResult.curriculumTopics || []).map((t: CurriculumTopicInsight, idx: number) => (
                            <div key={idx} className="bg-white border border-black/10 rounded-2xl p-6 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden">
                              <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-gradient-to-b from-amber-500 via-orange-500 to-indigo-600" />
                              <div className="pl-3 space-y-4">
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/5 pb-3">
                                  <div className="flex items-center gap-2.5">
                                    <span className="w-7 h-7 rounded-lg bg-black text-white text-xs font-bold flex items-center justify-center">
                                      {idx + 1}
                                    </span>
                                    <h5 className="font-bold text-base text-neutral-900">{t.topic}</h5>
                                  </div>
                                  {t.category && (
                                    <span className="px-3 py-1 rounded-full bg-neutral-100 text-neutral-700 text-[10px] font-bold uppercase tracking-wider border border-black/5">
                                      {t.category}
                                    </span>
                                  )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {/* Why it matters */}
                                  <div className="bg-neutral-50 rounded-xl p-4 border border-black/5 space-y-1.5">
                                    <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
                                      <span>🧠</span> Nima uchun bolaga kerak?
                                    </div>
                                    <p className="text-xs text-neutral-800 leading-relaxed font-medium">
                                      {t.whyItMattersForChild}
                                    </p>
                                  </div>

                                  {/* Real world & careers */}
                                  <div className="bg-blue-50/70 rounded-xl p-4 border border-blue-100 space-y-1.5">
                                    <div className="text-[10px] font-bold text-blue-700 uppercase tracking-wider flex items-center gap-1.5">
                                      <span>💼</span> Real hayot va zamonaviy kasblarda (Faktlar)
                                    </div>
                                    <p className="text-xs text-blue-950 leading-relaxed font-medium">
                                      {t.realWorldApplication}
                                    </p>
                                  </div>

                                  {/* Cognitive benefits */}
                                  <div className="bg-purple-50/70 rounded-xl p-4 border border-purple-100 space-y-1.5">
                                    <div className="text-[10px] font-bold text-purple-700 uppercase tracking-wider flex items-center gap-1.5">
                                      <span>⚡</span> Kognitiv & Neyropsixologik Foydasi
                                    </div>
                                    <p className="text-xs text-purple-950 leading-relaxed font-medium">
                                      {t.cognitiveBenefits}
                                    </p>
                                  </div>

                                  {/* Success metric */}
                                  <div className="bg-emerald-50/70 rounded-xl p-4 border border-emerald-100 space-y-1.5">
                                    <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
                                      <span>🎯</span> O'zlashtirish Mezoni
                                    </div>
                                    <p className="text-xs text-emerald-950 leading-relaxed font-medium">
                                      {t.successMetric}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ===== TAB 3: INDIVIDUAL STUDENTS ===== */}
                    {activeAnalysisTab === 'students' && !selectedStudent && (
                      <div className="p-5 sm:p-8">
                        <p className="text-xs text-neutral-500 mb-4">O'quvchini bosing — to'liq individual tahlil va yo'l xaritasini ko'ring.</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {(analysisResult.studentAnalyses || []).map((st: StudentAnalysis, idx: number) => {
                            const levelConfig: Record<string, { bg: string; text: string; border: string; dot: string }> = {
                              'yuqori':    { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
                              'yaxshi':    { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',    dot: 'bg-blue-500' },
                              "o'rta":     { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   dot: 'bg-amber-500' },
                              'zaif':      { bg: 'bg-orange-50',  text: 'text-orange-700',  border: 'border-orange-200',  dot: 'bg-orange-500' },
                              'juda zaif': { bg: 'bg-rose-50',    text: 'text-rose-700',    border: 'border-rose-200',    dot: 'bg-rose-500' },
                            };
                            const lc = levelConfig[st.level] || levelConfig["o'rta"];
                            return (
                              <button
                                key={idx}
                                onClick={() => setSelectedStudent(st)}
                                className="text-left bg-white border border-black/10 rounded-2xl p-4 hover:shadow-md hover:border-black/20 transition-all group"
                              >
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex items-center gap-2">
                                    <div className={`w-8 h-8 rounded-xl ${lc.bg} ${lc.text} font-black text-sm flex items-center justify-center shrink-0`}>
                                      {st.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                      <div className="font-bold text-neutral-900 text-sm leading-tight">{st.name}</div>
                                      <div className="text-[10px] text-neutral-400 font-medium">{st.scoreRaw}</div>
                                    </div>
                                  </div>
                                  <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${lc.bg} ${lc.text} ${lc.border} whitespace-nowrap`}>
                                    {st.scorePercent}%
                                  </div>
                                </div>
                                <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg ${lc.bg} ${lc.border} border`}>
                                  <div className={`w-1.5 h-1.5 rounded-full ${lc.dot}`} />
                                  <span className={`text-[10px] font-bold uppercase tracking-wider ${lc.text}`}>{st.level}</span>
                                </div>
                                {st.weaknesses?.[0] && (
                                  <p className="text-[10px] text-neutral-500 mt-2 leading-relaxed line-clamp-2">⚡ {st.weaknesses[0]}</p>
                                )}
                                <div className="mt-3 text-[10px] font-bold text-neutral-400 group-hover:text-neutral-600 flex items-center gap-1 transition-colors">
                                  To'liq tahlilni ko'rish →
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Individual Student Detail Panel */}
                    {activeAnalysisTab === 'students' && selectedStudent && (() => {
                      const st = selectedStudent;
                      const levelConfig: Record<string, { bg: string; text: string; border: string; gradient: string }> = {
                        'yuqori':    { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', gradient: 'from-emerald-500 to-teal-600' },
                        'yaxshi':    { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',    gradient: 'from-blue-500 to-indigo-600' },
                        "o'rta":     { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   gradient: 'from-amber-500 to-orange-600' },
                        'zaif':      { bg: 'bg-orange-50',  text: 'text-orange-700',  border: 'border-orange-200',  gradient: 'from-orange-500 to-red-600' },
                        'juda zaif': { bg: 'bg-rose-50',    text: 'text-rose-700',    border: 'border-rose-200',    gradient: 'from-rose-500 to-pink-700' },
                      };
                      const lc = levelConfig[st.level] || levelConfig["o'rta"];
                      return (
                        <div className="p-5 sm:p-8 space-y-5">
                          {/* Back button */}
                          <button
                            onClick={() => setSelectedStudent(null)}
                            className="flex items-center gap-2 text-xs font-bold text-neutral-500 hover:text-neutral-900 transition-colors"
                          >
                            <ArrowLeft size={14} /> O'quvchilar ro'yxatiga qaytish
                          </button>

                          {/* Student Header Card */}
                          <div className={`bg-gradient-to-br ${lc.gradient} text-white rounded-3xl p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4`}>
                            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-3xl font-black shrink-0">
                              {st.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1">
                              <h3 className="text-xl sm:text-2xl font-bold leading-tight">{st.name}</h3>
                              <p className="text-white/80 text-sm mt-0.5">{st.scoreRaw} ball • Daraja: <strong className="text-white uppercase">{st.level}</strong></p>
                              <p className="text-white/70 text-xs mt-1 leading-relaxed">{st.personalityInsight}</p>
                            </div>
                            <div className="text-right">
                              <div className="text-4xl font-black">{st.scorePercent}%</div>
                              <div className="text-white/70 text-xs">Umumiy natija</div>
                            </div>
                          </div>

                          {/* Strengths & Weaknesses */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
                              <h5 className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-3">✅ Kuchli Tomonlari</h5>
                              <ul className="space-y-2">
                                {(st.strengths || []).map((s, i) => (
                                  <li key={i} className="flex items-start gap-2 text-xs text-emerald-900 font-medium leading-relaxed">
                                    <span className="mt-0.5 text-emerald-500 shrink-0">●</span> {s}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4">
                              <h5 className="text-[10px] font-bold text-rose-700 uppercase tracking-wider mb-3">⚡ Zaif Tomonlari</h5>
                              <ul className="space-y-2">
                                {(st.weaknesses || []).map((w, i) => (
                                  <li key={i} className="flex items-start gap-2 text-xs text-rose-900 font-medium leading-relaxed">
                                    <span className="mt-0.5 text-rose-500 shrink-0">●</span> {w}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>

                          {/* Immediate Actions */}
                          {st.immediateActions?.length > 0 && (
                            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4">
                              <h5 className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider mb-3">⚡ Darhol Bajarilishi Kerak</h5>
                              <ul className="space-y-2">
                                {st.immediateActions.map((a, i) => (
                                  <li key={i} className="flex items-start gap-2 text-xs text-indigo-900 font-medium leading-relaxed">
                                    <span className="mt-0.5 w-5 h-5 rounded-lg bg-indigo-600 text-white text-[9px] font-black flex items-center justify-center shrink-0">{i + 1}</span> {a}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Parent Report */}
                          <div className="bg-neutral-900 text-white rounded-2xl p-5">
                            <h5 className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                              <span>✉️</span> Ota-Onalarga Hisobot
                            </h5>
                            <p className="text-sm text-neutral-100 leading-relaxed font-medium">{st.parentReport}</p>
                          </div>

                          {/* 3-Phase Roadmap */}
                          {st.roadmap?.length > 0 && (
                            <div>
                              <h5 className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest mb-4 flex items-center gap-2">🗺️ Rivojlanish Yo'l Xaritasi (3 Bosqich)</h5>
                              <div className="space-y-4">
                                {st.roadmap.map((step, i) => (
                                  <div key={i} className="relative bg-white border border-black/10 rounded-2xl p-5 overflow-hidden">
                                    <div className={`absolute top-0 left-0 bottom-0 w-1 bg-gradient-to-b ${
                                      i === 0 ? 'from-blue-400 to-blue-600' :
                                      i === 1 ? 'from-amber-400 to-amber-600' :
                                      'from-emerald-400 to-emerald-600'
                                    }`} />
                                    <div className="pl-3">
                                      <div className="flex items-center gap-2 mb-2">
                                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${
                                          i === 0 ? 'bg-blue-100 text-blue-700' :
                                          i === 1 ? 'bg-amber-100 text-amber-700' :
                                          'bg-emerald-100 text-emerald-700'
                                        }`}>{step.phase}</span>
                                        <span className="text-[10px] text-neutral-500 font-semibold">{step.duration}</span>
                                      </div>
                                      <h6 className="font-bold text-neutral-900 text-sm mb-3">{step.focus}</h6>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">Amaliyotlar:</p>
                                          <ul className="space-y-1.5">
                                            {step.actions.map((a, j) => (
                                              <li key={j} className="text-xs text-neutral-700 font-medium flex items-start gap-1.5">
                                                <span className="text-neutral-400 mt-0.5">›</span> {a}
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                        <div className="space-y-2.5">
                                          <div className="bg-amber-50 border border-amber-100 rounded-xl p-2.5">
                                            <p className="text-[9px] font-bold text-amber-600 uppercase tracking-wider mb-1">👨‍👩‍👧 Ota-onaga:</p>
                                            <p className="text-[10px] text-amber-900 font-medium leading-relaxed">{step.parentTip}</p>
                                          </div>
                                          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-2.5">
                                            <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider mb-1">🎯 Kutilayotgan natija:</p>
                                            <p className="text-[10px] text-emerald-900 font-medium leading-relaxed">{step.expectedOutcome}</p>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* ===== TAB 3: HANDBOOK ===== */}
                    {activeAnalysisTab === 'handbook' && (
                      <div className="p-5 sm:p-8 space-y-4">
                        <p className="text-xs text-neutral-500">Test savollari bo'yicha to'g'ri javoblar, pedagogik izohlar va tipik xatolar.</p>
                        {(analysisResult.handbook || []).map((hb: any, idx: number) => (
                          <div key={idx} className="bg-white border border-black/10 rounded-2xl p-5 relative overflow-hidden shadow-sm">
                            <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-gradient-to-b from-neutral-800 to-neutral-600" />
                            <div className="pl-3">
                              <p className="text-sm font-semibold text-neutral-900 leading-relaxed mb-3">
                                <span className="text-neutral-400 mr-2 text-xs">{idx + 1}.</span>{hb.question}
                              </p>
                              <div className="flex flex-col sm:flex-row gap-2.5">
                                <div className="flex-1 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-xl p-3 text-xs font-bold flex items-start gap-2">
                                  <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                                  <div>
                                    <div className="text-[9px] text-emerald-600 uppercase tracking-wider mb-0.5">To'g'ri javob</div>
                                    {hb.correctAnswer}
                                  </div>
                                </div>
                                {hb.commonMistake && (
                                  <div className="flex-1 bg-rose-50 text-rose-800 border border-rose-100 rounded-xl p-3 text-xs font-medium flex items-start gap-2">
                                    <span className="text-rose-500 shrink-0 mt-0.5">⚠️</span>
                                    <div>
                                      <div className="text-[9px] text-rose-600 uppercase tracking-wider mb-0.5 font-bold">Tipik xato</div>
                                      {hb.commonMistake}
                                    </div>
                                  </div>
                                )}
                              </div>
                              <p className="text-xs text-neutral-600 leading-relaxed mt-2.5">
                                <strong className="text-neutral-800">📝 Izoh:</strong> {hb.explanation}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                  </div>

                  {/* Footer with download button */}
                  <div className="px-5 sm:px-8 py-4 border-t border-black/10 flex flex-col sm:flex-row items-center justify-between gap-3 bg-neutral-50/70 shrink-0">
                    <p className="text-[10px] text-neutral-500">
                      {new Date(analysisResult.analyzedAt || Date.now()).toLocaleDateString('uz-UZ', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })} da tahlil qilindi
                    </p>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <button
                        onClick={() => openClassReportPrintWindow(analysisResult, test)}
                        className="flex items-center gap-2 px-6 py-2.5 bg-neutral-900 hover:bg-black text-white text-xs font-bold uppercase tracking-wider rounded-xl hover:scale-[1.01] active:scale-[0.99] transition-all shadow-md cursor-pointer border border-white/10"
                        title="Ota-onalarga berish uchun har bir bolaga alohida rasmiy A4 varaq chiqarish (Print/PDF)"
                      >
                        <Printer size={15} className="text-emerald-400" /> Rasmiy PDF Chop Etish / Yuklash (A4)
                      </button>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
