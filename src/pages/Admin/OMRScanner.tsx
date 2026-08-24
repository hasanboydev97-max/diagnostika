import { useRef, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Camera, RefreshCw, Scan, CheckCircle2, 
  Upload, FileSpreadsheet, Key, Eye, 
  Download, Sparkles, Check, FileText, Layers
} from 'lucide-react';
import { toast } from 'sonner';
import MeshGradient from '../../components/ui/MeshGradient';
import { Link } from 'react-router-dom';
import { gradeOMRFromImage, type OMRResult } from '../../lib/omrScanner';
import { parseZipGradeFile, convertZipGradeRowToStudentResult, type ZipGradeImportResult } from '../../lib/zipgradeParser';
import { db, type StudentResult } from '../../lib/db';
import { QUESTIONS_BLUEPRINT } from '../../lib/blueprint';
import * as XLSX from 'xlsx';

export default function OMRScanner() {
  const webcamRef = useRef<Webcam>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const zipgradeFileInputRef = useRef<HTMLInputElement>(null);

  // Active Tab: 'camera' | 'zipgrade' | 'key' | 'history'
  const [activeTab, setActiveTab] = useState<'camera' | 'zipgrade' | 'key' | 'history'>('camera');
  
  // Camera state
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  
  // Question & Answer Key State
  const [totalQuestions, setTotalQuestions] = useState(30);
  const [optionsCount, setOptionsCount] = useState(4);
  const [testTitle, setTestTitle] = useState('1-Chorak Yakuniy Diagnostika');
  const [answerKey, setAnswerKey] = useState<Record<number, string>>(() => {
    const init: Record<number, string> = {};
    const sample = ['A', 'B', 'C', 'D'];
    for (let i = 1; i <= 30; i++) {
      init[i] = sample[(i - 1) % 4];
    }
    return init;
  });

  // Current Scan Result
  const [currentResult, setCurrentResult] = useState<OMRResult | null>(null);
  const [studentNameInput, setStudentNameInput] = useState('');
  const [studentIdInput, setStudentIdInput] = useState('');
  const [studentClassInput, setStudentClassInput] = useState('5-A');

  // Batch Session Results
  const [sessionStudents, setSessionStudents] = useState<StudentResult[]>([]);

  // ZipGrade Import State
  const [zipGradeData, setZipGradeData] = useState<ZipGradeImportResult | null>(null);
  const [isImportingZipGrade, setIsImportingZipGrade] = useState(false);

  // Quick Key String helper
  const [keyStringInput, setKeyStringInput] = useState('');

  // Update answer key when totalQuestions changes
  const handleQuestionCountChange = (count: number) => {
    setTotalQuestions(count);
    setAnswerKey(prev => {
      const next: Record<number, string> = {};
      const sample = ['A', 'B', 'C', 'D'];
      for (let i = 1; i <= count; i++) {
        next[i] = prev[i] || sample[(i - 1) % optionsCount];
      }
      return next;
    });
  };

  const applyKeyString = () => {
    const clean = keyStringInput.replace(/[^A-Za-z]/g, '').toUpperCase();
    if (!clean) {
      toast.error("Iltimos, kalit harflarini kiriting (masalan: ABCDABCD...)");
      return;
    }
    const nextKey: Record<number, string> = { ...answerKey };
    for (let i = 0; i < Math.min(clean.length, totalQuestions); i++) {
      nextKey[i + 1] = clean[i];
    }
    setAnswerKey(nextKey);
    toast.success(`${Math.min(clean.length, totalQuestions)} ta savol kaliti yangilandi!`);
    setKeyStringInput('');
  };

  const handleMediaError = useCallback((err: string | DOMException) => {
    console.error("Kamera xatosi:", err);
    toast.error("Kameraga ulanib bo'lmadi. Ruxsat berilganligini tekshiring.");
  }, []);

  const processScannedImage = useCallback(async (base64Img: string) => {
    setIsProcessing(true);
    setCurrentResult(null);
    try {
      toast.loading("AI Varaqani tahlil qilmoqda...", { id: 'omr-process' });
      
      const omrRes = await gradeOMRFromImage(base64Img, answerKey, {
        totalQuestions,
        optionsCount,
        testTitle
      });

      setCurrentResult(omrRes);
      setStudentNameInput(omrRes.studentName || `O'quvchi #${sessionStudents.length + 1}`);
      setStudentIdInput(omrRes.studentId || Math.floor(100000 + Math.random() * 900000).toString());
      setStudentClassInput(omrRes.studentClass || '5-A');

      toast.success(`Tekshirildi! Natija: ${omrRes.score}% (${omrRes.correctCount}/${totalQuestions})`, { id: 'omr-process' });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Tekshirishda xatolik yuz berdi", { id: 'omr-process' });
    } finally {
      setIsProcessing(false);
    }
  }, [answerKey, totalQuestions, optionsCount, testTitle, sessionStudents.length]);

  const captureCamera = useCallback(() => {
    if (webcamRef.current) {
      const screenshot = webcamRef.current.getScreenshot();
      if (screenshot) {
        setImageSrc(screenshot);
        processScannedImage(screenshot);
      }
    }
  }, [webcamRef, processScannedImage]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setImageSrc(base64);
      processScannedImage(base64);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const saveCurrentToSession = async () => {
    if (!currentResult) return;

    const studentId = studentIdInput.trim() || Math.floor(100000 + Math.random() * 900000).toString();
    const studentName = studentNameInput.trim() || `O'quvchi #${sessionStudents.length + 1}`;
    const grade = studentClassInput.trim() || '5-A';

    const questionResults: Record<number, boolean> = {};
    currentResult.answers.forEach(a => {
      questionResults[a.q] = !!a.isCorrect;
    });

    const blueprint = QUESTIONS_BLUEPRINT.slice(0, totalQuestions);
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

    const studentResultObj: StudentResult = {
      id: studentId,
      pin: Math.floor(1000 + Math.random() * 9000).toString(),
      studentName,
      grade,
      blueprintSnapshot: blueprint,
      scores,
      totalScore: currentResult.score,
      questionResults,
      aiSummaryText: currentResult.summaryText,
      createdAt: new Date().toISOString()
    };

    await db.saveResult(studentResultObj);

    setSessionStudents(prev => [studentResultObj, ...prev]);
    toast.success(`${studentName} natijasi bazaga saqlandi!`);
    
    setImageSrc(null);
    setCurrentResult(null);
  };

  const handleZipGradeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      toast.loading("ZipGrade fayli o'qilmoqda...", { id: 'zipgrade-load' });
      const arrayBuffer = await file.arrayBuffer();
      const parsed = parseZipGradeFile(arrayBuffer);
      
      setZipGradeData(parsed);
      setTotalQuestions(parsed.totalQuestions);
      if (parsed.answerKey) {
        setAnswerKey(parsed.answerKey);
      }
      toast.success(`${parsed.students.length} nafar o'quvchi ma'lumotlari muvaffaqiyatli yuklandi!`, { id: 'zipgrade-load' });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "ZipGrade faylini o'qishda xatolik yuz berdi", { id: 'zipgrade-load' });
    } finally {
      e.target.value = '';
    }
  };

  const saveAllZipGradeToDatabase = async () => {
    if (!zipGradeData || zipGradeData.students.length === 0) return;

    setIsImportingZipGrade(true);
    const toastId = toast.loading(`0/${zipGradeData.students.length} o'quvchi saqlanmoqda...`);

    const newResults: StudentResult[] = [];

    try {
      for (let i = 0; i < zipGradeData.students.length; i++) {
        const student = zipGradeData.students[i];
        const studentResult = convertZipGradeRowToStudentResult(student, QUESTIONS_BLUEPRINT.slice(0, zipGradeData.totalQuestions));
        
        await db.saveResult(studentResult);
        newResults.push(studentResult);

        toast.loading(`${i + 1}/${zipGradeData.students.length} o'quvchi saqlandi...`, { id: toastId });
      }

      setSessionStudents(prev => [...newResults, ...prev]);
      toast.success(`Barcha ${newResults.length} nafar o'quvchi tizimga muvaffaqiyatli kiritildi!`, { id: toastId });
      setActiveTab('history');
      setZipGradeData(null);
    } catch (err: any) {
      console.error(err);
      toast.error("Saqlashda xatolik yuz berdi.", { id: toastId });
    } finally {
      setIsImportingZipGrade(false);
    }
  };

  const exportSessionToExcel = () => {
    if (sessionStudents.length === 0) {
      toast.error("Eksport qilish uchun natijalar mavjud emas");
      return;
    }

    const rows = sessionStudents.map((s, idx) => ({
      "T/r": idx + 1,
      "F.I.Sh": s.studentName,
      "Sinf": s.grade,
      "Login (ID)": s.id,
      "Parol (PIN)": s.pin,
      "Natija (%)": s.totalScore,
      "Sana": new Date(s.createdAt).toLocaleDateString()
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Natijalar");
    XLSX.writeFile(wb, `Test_Natijalari_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success("Excel fayl yuklab olindi!");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 selection:bg-indigo-600 selection:text-white">
      <MeshGradient />

      {/* Top Header */}
      <header className="relative z-20 bg-white/90 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25">
            <Scan className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">OMR & ZipGrade Skanner Markazi</h1>
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700 rounded-full border border-indigo-200">
                Senior AI v2.5
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">Smartfon kamerasi, rasm va ZipGrade orqali testlarni soniyalarda tekshirish</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link 
            to="/admin/omr-generator" 
            className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-xl transition-all border border-slate-200 shadow-sm flex items-center gap-2 text-sm"
          >
            <FileText className="w-4 h-4 text-indigo-600" />
            Varaqa Chop Etish (PDF)
          </Link>
          <Link 
            to="/admin" 
            className="px-4 py-2.5 bg-slate-900 hover:bg-black text-white font-semibold rounded-xl transition-all shadow-sm text-sm"
          >
            Boshqaruv Paneli
          </Link>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="relative z-10 bg-white/60 backdrop-blur-sm border-b border-slate-200 px-6 py-2">
        <div className="max-w-7xl mx-auto flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTab('camera')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
              activeTab === 'camera' 
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' 
                : 'text-slate-600 hover:bg-white hover:text-slate-900'
            }`}
          >
            <Camera className="w-4 h-4" />
            Kamera & Rasm Skanner
          </button>

          <button
            onClick={() => setActiveTab('zipgrade')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
              activeTab === 'zipgrade' 
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' 
                : 'text-slate-600 hover:bg-white hover:text-slate-900'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            ZipGrade CSV / Excel Import
            {zipGradeData && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('key')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
              activeTab === 'key' 
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' 
                : 'text-slate-600 hover:bg-white hover:text-slate-900'
            }`}
          >
            <Key className="w-4 h-4" />
            Javoblar Kaliti ({totalQuestions} ta savol)
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
              activeTab === 'history' 
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' 
                : 'text-slate-600 hover:bg-white hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            Sessiya Natijalari ({sessionStudents.length})
          </button>
        </div>
      </div>

      {/* Main Body */}
      <main className="flex-1 p-4 md:p-8 relative z-10 max-w-7xl mx-auto w-full overflow-y-auto">
        <AnimatePresence mode="wait">
          
          {/* TAB 1: LIVE CAMERA & PHOTO SCANNER */}
          {activeTab === 'camera' && (
            <motion.div
              key="camera-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
            >
              {/* Left Viewfinder Box */}
              <div className="lg:col-span-7 flex flex-col gap-4">
                {/* Active Key Indicator */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                      <Key className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Tanlangan test kaliti</div>
                      <div className="text-sm font-bold text-slate-800">{testTitle} ({totalQuestions} savol)</div>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab('key')}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Kalitni o'zgartirish
                  </button>
                </div>

                {/* Viewfinder Canvas */}
                <div className="bg-slate-950 rounded-3xl overflow-hidden shadow-2xl relative aspect-[3/4] sm:aspect-[4/3] border-4 border-white flex items-center justify-center">
                  {!imageSrc ? (
                    <>
                      <Webcam
                        audio={false}
                        ref={webcamRef}
                        screenshotFormat="image/jpeg"
                        videoConstraints={{ 
                          facingMode: cameraFacing,
                          width: { ideal: 1920 },
                          height: { ideal: 1080 }
                        }}
                        onUserMediaError={handleMediaError}
                        className="absolute inset-0 w-full h-full object-cover"
                      />

                      {/* Laser-guided HUD Alignment Guide */}
                      <div className="absolute inset-0 pointer-events-none p-6 flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                          <div className="w-10 h-10 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg shadow-[0_0_15px_rgba(52,211,153,0.5)]" />
                          <div className="w-10 h-10 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg shadow-[0_0_15px_rgba(52,211,153,0.5)]" />
                        </div>

                        <div className="flex justify-center">
                          <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 text-white text-xs font-semibold tracking-wide flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                            Varaqaning 4 ta burchagini nishonga to'g'rilang
                          </div>
                        </div>

                        <div className="flex justify-between items-end">
                          <div className="w-10 h-10 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg shadow-[0_0_15px_rgba(52,211,153,0.5)]" />
                          <div className="w-10 h-10 border-b-4 border-r-4 border-emerald-400 rounded-br-lg shadow-[0_0_15px_rgba(52,211,153,0.5)]" />
                        </div>
                      </div>

                      {/* Controls Bottom Bar */}
                      <div className="absolute bottom-6 left-0 right-0 px-6 flex items-center justify-between z-20">
                        {/* Switch Camera */}
                        <button
                          onClick={() => setCameraFacing(prev => prev === 'environment' ? 'user' : 'environment')}
                          className="p-3 bg-black/40 backdrop-blur-md text-white rounded-2xl hover:bg-black/60 border border-white/20 transition-all"
                          title="Kamerani almashtirish"
                        >
                          <RefreshCw className="w-5 h-5" />
                        </button>

                        {/* Capture Trigger */}
                        <button
                          onClick={captureCamera}
                          className="w-18 h-18 bg-white hover:bg-slate-100 rounded-full flex items-center justify-center shadow-[0_0_0_6px_rgba(255,255,255,0.3)] hover:scale-105 active:scale-95 transition-all group"
                        >
                          <div className="w-14 h-14 rounded-full bg-indigo-600 flex items-center justify-center text-white group-hover:bg-indigo-700 transition-colors">
                            <Camera className="w-7 h-7" />
                          </div>
                        </button>

                        {/* Upload from Gallery button */}
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="p-3 bg-black/40 backdrop-blur-md text-white rounded-2xl hover:bg-black/60 border border-white/20 transition-all"
                          title="Rasmni fayldan yuklash"
                        >
                          <Upload className="w-5 h-5" />
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <img src={imageSrc} alt="Scanned test sheet" className="absolute inset-0 w-full h-full object-contain bg-slate-900" />
                      
                      {isProcessing && (
                        <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-md flex flex-col items-center justify-center text-center p-6 z-30">
                          <div className="w-16 h-16 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-4 shadow-lg shadow-indigo-500/30" />
                          <h3 className="text-white text-lg font-bold">Neyrotarmoq AI Tekshirmoqda...</h3>
                          <p className="text-indigo-200 text-xs mt-1 max-w-xs">Doirachalar, o'quvchi ismi va javoblar tahlil qilinmoqda</p>
                        </div>
                      )}

                      {!isProcessing && (
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex gap-3">
                          <button
                            onClick={() => {
                              setImageSrc(null);
                              setCurrentResult(null);
                            }}
                            className="px-6 py-3 bg-white hover:bg-slate-100 text-slate-900 font-bold rounded-2xl flex items-center gap-2 shadow-2xl transition-all"
                          >
                            <RefreshCw className="w-4 h-4" /> Qaytadan rasmga olish
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>

                <input 
                  type="file" 
                  ref={fileInputRef} 
                  accept="image/*" 
                  onChange={handleFileUpload} 
                  className="hidden" 
                />
              </div>

              {/* Right Results & Verification Column */}
              <div className="lg:col-span-5 flex flex-col gap-6">
                {currentResult ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white rounded-3xl p-6 shadow-xl border border-slate-200 flex flex-col gap-5"
                  >
                    {/* Header Banner */}
                    <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-lg ${
                          currentResult.score >= 80 
                            ? 'bg-emerald-500 text-white shadow-emerald-500/25' 
                            : currentResult.score >= 60 
                            ? 'bg-amber-500 text-white shadow-amber-500/25' 
                            : 'bg-rose-500 text-white shadow-rose-500/25'
                        }`}>
                          {currentResult.score}%
                        </div>
                        <div>
                          <h3 className="font-extrabold text-lg text-slate-900 leading-tight">Natija Aniqlanildi</h3>
                          <p className="text-xs text-slate-500 font-medium">{currentResult.correctCount} ta to'g'ri / {totalQuestions} ta savol</p>
                        </div>
                      </div>

                      <span className="px-2.5 py-1 text-[11px] font-bold bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-100">
                        {currentResult.method}
                      </span>
                    </div>

                    {/* Student Editable Fields */}
                    <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">O'quvchining F.I.Sh</label>
                        <input
                          type="text"
                          value={studentNameInput}
                          onChange={(e) => setStudentNameInput(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                          placeholder="Ism Familiya"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Login (ID)</label>
                          <input
                            type="text"
                            value={studentIdInput}
                            onChange={(e) => setStudentIdInput(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-indigo-700 focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Sinf</label>
                          <input
                            type="text"
                            value={studentClassInput}
                            onChange={(e) => setStudentClassInput(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* AI Pedagogical Summary */}
                    {currentResult.summaryText && (
                      <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-4 flex gap-3 text-xs text-indigo-950 leading-relaxed">
                        <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                        <div>{currentResult.summaryText}</div>
                      </div>
                    )}

                    {/* Detailed Questions Breakdown Grid */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Savollar kesimida tahlil:</h4>
                      <div className="grid grid-cols-5 sm:grid-cols-6 gap-1.5 max-h-48 overflow-y-auto pr-1">
                        {currentResult.answers.map((a) => (
                          <div 
                            key={a.q} 
                            className={`p-2 rounded-xl text-center flex flex-col items-center justify-center border text-xs ${
                              a.isCorrect 
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                                : a.ans === '-' 
                                ? 'bg-slate-100 text-slate-500 border-slate-200'
                                : 'bg-rose-50 text-rose-800 border-rose-200'
                            }`}
                          >
                            <span className="text-[10px] text-slate-500 font-semibold">#{a.q}</span>
                            <span className="font-black text-sm">{a.ans}</span>
                            {a.correctAns && !a.isCorrect && (
                              <span className="text-[9px] font-bold text-slate-500 mt-0.5">({a.correctAns})</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-2 flex flex-col gap-2">
                      <button
                        onClick={saveCurrentToSession}
                        className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 transition-all"
                      >
                        <CheckCircle2 className="w-5 h-5" />
                        Bazaga Saqlash & Keyingi Varaqaga O'tish
                      </button>
                    </div>

                  </motion.div>
                ) : (
                  <div className="bg-white/80 rounded-3xl p-8 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center h-full min-h-[350px] text-slate-400">
                    <div className="w-16 h-16 rounded-3xl bg-slate-100 flex items-center justify-center mb-4 text-slate-400">
                      <Scan className="w-8 h-8" />
                    </div>
                    <h3 className="font-bold text-slate-700 text-base mb-1">Varaqani Skaner Qiling</h3>
                    <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                      Kamerani test javoblar varaqasiga qarating va oq tugmani bosing yoki faylni to'g'ridan-to'g'ri yuklang.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* TAB 2: ZIPGRADE CSV / EXCEL IMPORT */}
          {activeTab === 'zipgrade' && (
            <motion.div
              key="zipgrade-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              {/* Info Card */}
              <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-3xl p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="space-y-2 max-w-2xl">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-semibold text-indigo-300">
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    To'g'ridan-to'g'ri ZipGrade Integratsiyasi
                  </div>
                  <h2 className="text-2xl font-black tracking-tight">ZipGrade CSV yoki Excel Natijalarini Yuklash</h2>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    ZipGrade mobil ilovasida skanerlangan testlarni "Export to CSV" qiling va bu yerga yuklang. Tizimimiz barcha o'quvchilarni taniy oladi, AI kognitiv tahlilini yaratadi va Telegram botga tayyorlab beradi.
                  </p>
                </div>

                <button
                  onClick={() => zipgradeFileInputRef.current?.click()}
                  className="px-6 py-3.5 bg-white hover:bg-slate-100 text-slate-900 font-extrabold rounded-2xl shadow-lg transition-all flex items-center gap-2 shrink-0"
                >
                  <Upload className="w-5 h-5 text-indigo-600" />
                  CSV / Excel Faylni Tanlash
                </button>
                <input 
                  type="file" 
                  ref={zipgradeFileInputRef} 
                  accept=".csv, .xlsx, .xls" 
                  onChange={handleZipGradeUpload} 
                  className="hidden" 
                />
              </div>

              {/* Uploaded ZipGrade Data Preview */}
              {zipGradeData && (
                <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-200 space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
                    <div>
                      <h3 className="text-xl font-extrabold text-slate-900">{zipGradeData.quizName}</h3>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        Aniqlangan savollar soni: <span className="font-bold text-slate-800">{zipGradeData.totalQuestions} ta</span> | Jami o'quvchilar: <span className="font-bold text-slate-800">{zipGradeData.students.length} nafar</span>
                      </p>
                    </div>

                    <button
                      onClick={saveAllZipGradeToDatabase}
                      disabled={isImportingZipGrade}
                      className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-lg shadow-emerald-500/25 flex items-center gap-2 transition-all disabled:opacity-50"
                    >
                      {isImportingZipGrade ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5" />
                          Barchasini Bazaga Saqlash & AI Tahlil Qilish
                        </>
                      )}
                    </button>
                  </div>

                  {/* Students Table */}
                  <div className="overflow-x-auto rounded-2xl border border-slate-100">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-slate-500 font-bold text-xs uppercase tracking-wider">
                        <tr>
                          <th className="p-4">#</th>
                          <th className="p-4">O'quvchi F.I.Sh</th>
                          <th className="p-4">Sinf</th>
                          <th className="p-4">To'plangan Ball</th>
                          <th className="p-4">Foiz (%)</th>
                          <th className="p-4 text-right">Javoblar</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {zipGradeData.students.map((student, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/80 transition-colors font-medium">
                            <td className="p-4 text-slate-400 font-bold">{idx + 1}</td>
                            <td className="p-4 font-bold text-slate-800">{student.studentName}</td>
                            <td className="p-4 text-slate-600">{student.className || '-'}</td>
                            <td className="p-4 font-bold text-slate-900">{student.earnedPts} / {student.possiblePts}</td>
                            <td className="p-4">
                              <span className={`px-2.5 py-1 rounded-lg text-xs font-black ${
                                student.percent >= 80 ? 'bg-emerald-100 text-emerald-800' :
                                student.percent >= 60 ? 'bg-amber-100 text-amber-800' :
                                'bg-rose-100 text-rose-800'
                              }`}>
                                {student.percent}%
                              </span>
                            </td>
                            <td className="p-4 text-right text-xs font-mono text-slate-400">
                              {Object.keys(student.answers).length} ta savol
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* TAB 3: ANSWER KEY CONFIGURATION */}
          {activeTab === 'key' && (
            <motion.div
              key="key-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="bg-white rounded-3xl p-8 shadow-xl border border-slate-200 space-y-8"
            >
              <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-100">
                <div>
                  <h2 className="text-2xl font-black text-slate-900">Javoblar Kalitini Sozlash</h2>
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    Skanner qog'ozdagi belgilangan javoblarni ushbu to'g'ri kalitlarga solishtirib baholaydi
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-slate-500">Savollar soni:</span>
                  {[10, 20, 30, 45, 60].map(count => (
                    <button
                      key={count}
                      onClick={() => handleQuestionCountChange(count)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        totalQuestions === count 
                          ? 'bg-indigo-600 text-white shadow-sm' 
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {count} ta
                    </button>
                  ))}
                </div>
              </div>

              {/* Title & Options count configuration */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">Test Sarlavhasi</label>
                  <input
                    type="text"
                    value={testTitle}
                    onChange={(e) => setTestTitle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">Variantlar Soni</label>
                  <select
                    value={optionsCount}
                    onChange={(e) => setOptionsCount(parseInt(e.target.value, 10))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:border-indigo-500"
                  >
                    <option value={3}>3 ta variant (A, B, C)</option>
                    <option value={4}>4 ta variant (A, B, C, D)</option>
                    <option value={5}>5 ta variant (A, B, C, D, E)</option>
                  </select>
                </div>
              </div>

              {/* Quick Input String */}
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col md:flex-row items-center gap-4">
                <div className="flex-1 w-full">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">
                    Tezkor Kalit Yozish (Masalan: ABCDABCDABCD...)
                  </label>
                  <input
                    type="text"
                    value={keyStringInput}
                    onChange={(e) => setKeyStringInput(e.target.value)}
                    placeholder="ABCDABCD..."
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 font-mono uppercase tracking-widest text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <button
                  onClick={applyKeyString}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all self-end md:self-auto shrink-0"
                >
                  Qo'llash
                </button>
              </div>

              {/* Interactive Bubble Key Grid */}
              <div>
                <h3 className="text-sm font-bold text-slate-700 mb-4">Savollar bo'yicha to'g'ri javobni tanlang:</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-3">
                  {Array.from({ length: totalQuestions }, (_, i) => {
                    const qNum = i + 1;
                    const selected = answerKey[qNum] || 'A';
                    return (
                      <div key={qNum} className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col items-center gap-2">
                        <span className="text-xs font-bold text-slate-500">Savol #{qNum}</span>
                        <div className="flex gap-1">
                          {['A', 'B', 'C', 'D', 'E'].slice(0, optionsCount).map(opt => (
                            <button
                              key={opt}
                              onClick={() => setAnswerKey(prev => ({ ...prev, [qNum]: opt }))}
                              className={`w-7 h-7 rounded-lg text-xs font-black transition-all ${
                                selected === opt 
                                  ? 'bg-indigo-600 text-white shadow-sm scale-105' 
                                  : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                              }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  onClick={() => {
                    toast.success("Kalitlar saqlandi!");
                    setActiveTab('camera');
                  }}
                  className="px-8 py-3.5 bg-slate-900 hover:bg-black text-white font-bold rounded-2xl shadow-lg transition-all flex items-center gap-2"
                >
                  <Check className="w-5 h-5" /> Saqlash va Skanerga O'tish
                </button>
              </div>
            </motion.div>
          )}

          {/* TAB 4: SESSION GRADED STUDENTS */}
          {activeTab === 'history' && (
            <motion.div
              key="history-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="bg-white rounded-3xl p-6 md:p-8 shadow-xl border border-slate-200 space-y-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-2xl font-black text-slate-900">Sessiyada Baholangan O'quvchilar</h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Ushbu seansda skanerlangan yoki yuklangan o'quvchilar ro'yxati
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={exportSessionToExcel}
                    className="px-4 py-2.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold rounded-xl border border-emerald-200 transition-all flex items-center gap-2 text-sm"
                  >
                    <Download className="w-4 h-4" /> Excel Eksport
                  </button>
                </div>
              </div>

              {sessionStudents.length === 0 ? (
                <div className="text-center py-16 text-slate-400 space-y-3">
                  <Scan className="w-12 h-12 mx-auto opacity-40" />
                  <p className="text-sm font-semibold text-slate-500">Hozircha o'quvchilar skanerlanmadi.</p>
                  <button
                    onClick={() => setActiveTab('camera')}
                    className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl text-xs hover:bg-indigo-700 transition-colors"
                  >
                    Skanerlashni Boshlash
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-100">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 font-bold text-xs uppercase tracking-wider">
                      <tr>
                        <th className="p-4">#</th>
                        <th className="p-4">F.I.Sh</th>
                        <th className="p-4">Sinf</th>
                        <th className="p-4">Login (ID)</th>
                        <th className="p-4">Parol (PIN)</th>
                        <th className="p-4">Natija</th>
                        <th className="p-4 text-right">Amallar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sessionStudents.map((student, idx) => (
                        <tr key={student.id || idx} className="hover:bg-slate-50 transition-colors font-medium">
                          <td className="p-4 text-slate-400 font-bold">{idx + 1}</td>
                          <td className="p-4 font-bold text-slate-800">{student.studentName}</td>
                          <td className="p-4 text-slate-600">{student.grade}</td>
                          <td className="p-4 font-mono font-bold text-indigo-600">{student.id}</td>
                          <td className="p-4 font-mono text-slate-500">{student.pin || '-'}</td>
                          <td className="p-4">
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-black ${
                              student.totalScore >= 80 ? 'bg-emerald-100 text-emerald-800' :
                              student.totalScore >= 60 ? 'bg-amber-100 text-amber-800' :
                              'bg-rose-100 text-rose-800'
                            }`}>
                              {student.totalScore}%
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <Link
                              to={`/summary/${student.id}`}
                              target="_blank"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              AI Xulosa & PDF
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
}
