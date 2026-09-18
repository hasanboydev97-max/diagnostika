import { useRef, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Camera, RefreshCw, Scan, CheckCircle2, 
  Upload, FileSpreadsheet, Key, Eye, 
  Download, Sparkles, Check, FileText, Layers
} from 'lucide-react';
import { toast } from 'sonner';
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
    <div className="min-h-screen bg-[#fcfcfc] flex flex-col font-sans text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200/80 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white shadow-sm">
            <Scan className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-slate-900 leading-none">OMR & ZipGrade Scanner</h1>
            <p className="text-[11px] text-slate-500 mt-1">Smart grading system</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link 
            to="/admin/omr-generator" 
            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 font-medium rounded-md border border-slate-200 transition-colors flex items-center gap-2 text-xs shadow-sm"
          >
            <FileText className="w-3.5 h-3.5" />
            Varaqa Chop Etish
          </Link>
          <Link 
            to="/admin" 
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-md transition-colors text-xs shadow-sm"
          >
            Boshqaruv Paneli
          </Link>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-slate-200/80 px-6">
        <div className="max-w-6xl mx-auto flex gap-8 overflow-x-auto scrollbar-hide">
          {[
            { id: 'camera', label: 'Skanerlash', icon: Camera },
            { id: 'zipgrade', label: 'ZipGrade Import', icon: FileSpreadsheet, pulse: !!zipGradeData },
            { id: 'key', label: `Javoblar Kaliti (${totalQuestions})`, icon: Key },
            { id: 'history', label: `Sessiya Natijalari (${sessionStudents.length})`, icon: Layers }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-3.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'border-slate-900 text-slate-900' 
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.pulse && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse ml-1" />}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 p-6 relative z-10 max-w-6xl mx-auto w-full overflow-y-auto">
        <AnimatePresence mode="wait">
          
          {/* TAB 1: SCANNER */}
          {activeTab === 'camera' && (
            <motion.div
              key="camera-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
            >
              {/* Left Column: Viewfinder */}
              <div className="lg:col-span-7 flex flex-col gap-4">
                <div className="bg-white rounded-xl border border-slate-200/80 p-4 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                      <Key className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Faol Kalit</div>
                      <div className="text-sm font-medium text-slate-900">{testTitle}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab('key')}
                    className="text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-md transition-colors"
                  >
                    O'zgartirish
                  </button>
                </div>

                <div className="bg-slate-950 rounded-xl overflow-hidden shadow-sm relative aspect-[4/3] sm:aspect-[4/3] border border-slate-800 flex items-center justify-center group">
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
                      
                      {/* Minimalist Viewfinder Grid */}
                      <div className="absolute inset-0 pointer-events-none p-8 flex flex-col justify-between opacity-50">
                        <div className="flex justify-between items-start">
                          <div className="w-8 h-8 border-t-2 border-l-2 border-white" />
                          <div className="w-8 h-8 border-t-2 border-r-2 border-white" />
                        </div>
                        <div className="flex justify-between items-end">
                          <div className="w-8 h-8 border-b-2 border-l-2 border-white" />
                          <div className="w-8 h-8 border-b-2 border-r-2 border-white" />
                        </div>
                      </div>

                      {/* Controls overlay */}
                      <div className="absolute bottom-6 left-0 right-0 px-6 flex items-center justify-center gap-6 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setCameraFacing(prev => prev === 'environment' ? 'user' : 'environment')}
                          className="w-10 h-10 bg-black/50 backdrop-blur text-white rounded-full flex items-center justify-center hover:bg-black/70 transition-all"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>

                        <button
                          onClick={captureCamera}
                          className="w-16 h-16 bg-white/20 backdrop-blur rounded-full flex items-center justify-center hover:bg-white/30 transition-all border border-white/50"
                        >
                          <div className="w-12 h-12 bg-white rounded-full shadow-sm"></div>
                        </button>

                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="w-10 h-10 bg-black/50 backdrop-blur text-white rounded-full flex items-center justify-center hover:bg-black/70 transition-all"
                        >
                          <Upload className="w-4 h-4" />
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <img src={imageSrc} alt="Scanned result" className="absolute inset-0 w-full h-full object-contain bg-slate-900" />
                      
                      {isProcessing && (
                        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center text-center p-6 z-30">
                          <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mb-4" />
                          <p className="text-white text-sm font-medium">Tahlil qilinmoqda...</p>
                        </div>
                      )}

                      {!isProcessing && (
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex gap-3">
                          <button
                            onClick={() => {
                              setImageSrc(null);
                              setCurrentResult(null);
                            }}
                            className="px-4 py-2 bg-black/70 backdrop-blur hover:bg-black text-white text-sm font-medium rounded-full flex items-center gap-2 transition-all border border-white/10"
                          >
                            <RefreshCw className="w-3.5 h-3.5" /> Qaytadan
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
                <input type="file" ref={fileInputRef} accept="image/*" onChange={handleFileUpload} className="hidden" />
              </div>

              {/* Right Column: Results */}
              <div className="lg:col-span-5 flex flex-col">
                {currentResult ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col"
                  >
                    <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg border-4 ${
                          currentResult.score >= 80 ? 'border-emerald-100 text-emerald-600 bg-emerald-50' : 
                          currentResult.score >= 60 ? 'border-amber-100 text-amber-600 bg-amber-50' : 
                          'border-rose-100 text-rose-600 bg-rose-50'
                        }`}>
                          {currentResult.score}
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900">Natija</h3>
                          <p className="text-xs text-slate-500">{currentResult.correctCount} ta to'g'ri / {totalQuestions}</p>
                        </div>
                      </div>
                      <span className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-medium rounded border border-slate-200 uppercase tracking-wide">
                        {currentResult.method}
                      </span>
                    </div>

                    <div className="p-5 space-y-4">
                      <div className="grid gap-3">
                        <div>
                          <label className="text-[10px] font-medium text-slate-500 uppercase tracking-wide mb-1 block">O'quvchi F.I.Sh</label>
                          <input
                            type="text"
                            value={studentNameInput}
                            onChange={(e) => setStudentNameInput(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-sm font-medium text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] font-medium text-slate-500 uppercase tracking-wide mb-1 block">Login (ID)</label>
                            <input
                              type="text"
                              value={studentIdInput}
                              onChange={(e) => setStudentIdInput(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-sm font-mono text-slate-700 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-medium text-slate-500 uppercase tracking-wide mb-1 block">Sinf</label>
                            <input
                              type="text"
                              value={studentClassInput}
                              onChange={(e) => setStudentClassInput(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-sm font-medium text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                            />
                          </div>
                        </div>
                      </div>

                      {currentResult.summaryText && (
                        <div className="bg-slate-50 border border-slate-200 rounded-md p-3 flex gap-2">
                          <Sparkles className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <p className="text-xs text-slate-600 leading-relaxed">{currentResult.summaryText}</p>
                        </div>
                      )}

                      <div>
                        <div className="text-[10px] font-medium text-slate-500 uppercase tracking-wide mb-2">Savollar tahlili</div>
                        <div className="grid grid-cols-5 sm:grid-cols-7 gap-1 max-h-32 overflow-y-auto pr-1 scrollbar-thin">
                          {currentResult.answers.map((a) => (
                            <div 
                              key={a.q} 
                              className={`p-1.5 rounded text-center border text-xs flex flex-col items-center justify-center ${
                                a.isCorrect 
                                  ? 'bg-emerald-50/50 text-emerald-700 border-emerald-100' 
                                  : a.ans === '-' 
                                  ? 'bg-slate-50 text-slate-400 border-slate-100'
                                  : 'bg-rose-50/50 text-rose-700 border-rose-100'
                              }`}
                            >
                              <span className="text-[9px] text-slate-400 mb-0.5">{a.q}</span>
                              <span className="font-semibold">{a.ans}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <button
                        onClick={saveCurrentToSession}
                        className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Saqlash
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <div className="bg-white rounded-xl border border-slate-200/80 border-dashed h-full min-h-[300px] flex flex-col items-center justify-center text-center p-6">
                    <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mb-3">
                      <Scan className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-medium text-slate-900 mb-1">Kutilmoqda</h3>
                    <p className="text-xs text-slate-500 max-w-[200px]">Varaqani skanerlash uchun kameraga tuting yoki fayl yuklang.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* TAB 2: ZIPGRADE */}
          {activeTab === 'zipgrade' && (
            <motion.div
              key="zipgrade-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="bg-white rounded-xl border border-slate-200/80 p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">ZipGrade orqali yuklash</h2>
                  <p className="text-xs text-slate-500 mt-1 max-w-xl leading-relaxed">
                    ZipGrade ilovasidan olingan CSV yoki Excel faylni bu yerga yuklang. Tizim barcha o'quvchilarni tahlil qilib bazaga kiritadi.
                  </p>
                </div>
                <button
                  onClick={() => zipgradeFileInputRef.current?.click()}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-md transition-colors flex items-center gap-2 shrink-0"
                >
                  <Upload className="w-4 h-4" />
                  Fayl tanlash
                </button>
                <input type="file" ref={zipgradeFileInputRef} accept=".csv, .xlsx, .xls" onChange={handleZipGradeUpload} className="hidden" />
              </div>

              {zipGradeData && (
                <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
                  <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">{zipGradeData.quizName}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {zipGradeData.totalQuestions} ta savol • {zipGradeData.students.length} nafar o'quvchi
                      </p>
                    </div>
                    <button
                      onClick={saveAllZipGradeToDatabase}
                      disabled={isImportingZipGrade}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white text-sm font-medium rounded-md transition-colors flex items-center gap-2"
                    >
                      {isImportingZipGrade ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      Barchasini Saqlash
                    </button>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-white text-[11px] text-slate-500 font-medium uppercase tracking-wider border-b border-slate-100">
                        <tr>
                          <th className="px-5 py-3 font-medium">O'quvchi F.I.Sh</th>
                          <th className="px-5 py-3 font-medium">Sinf</th>
                          <th className="px-5 py-3 font-medium">Ball</th>
                          <th className="px-5 py-3 font-medium">Foiz</th>
                          <th className="px-5 py-3 font-medium text-right">Javoblar</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {zipGradeData.students.map((student, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="px-5 py-3 font-medium text-slate-900">{student.studentName}</td>
                            <td className="px-5 py-3 text-slate-600">{student.className || '-'}</td>
                            <td className="px-5 py-3 font-mono text-slate-700 text-xs">{student.earnedPts} / {student.possiblePts}</td>
                            <td className="px-5 py-3">
                              <span className={`px-2 py-0.5 rounded text-[11px] font-medium border ${
                                student.percent >= 80 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                student.percent >= 60 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                'bg-rose-50 text-rose-700 border-rose-200'
                              }`}>
                                {student.percent}%
                              </span>
                            </td>
                            <td className="px-5 py-3 text-right text-xs text-slate-500 font-mono">
                              {Object.keys(student.answers).length} ta
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

          {/* TAB 3: KEY */}
          {activeTab === 'key' && (
            <motion.div
              key="key-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-8"
            >
              <div className="flex flex-col sm:flex-row justify-between gap-6 pb-6 border-b border-slate-100">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Javoblar Kaliti Sozlamalari</h2>
                  <p className="text-xs text-slate-500 mt-1">Skaner ushbu kalitlar asosida baholaydi.</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mr-1">Savollar:</span>
                  {[10, 20, 30, 45, 60].map(count => (
                    <button
                      key={count}
                      onClick={() => handleQuestionCountChange(count)}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                        totalQuestions === count 
                          ? 'bg-slate-900 text-white' 
                          : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-1.5 block">Test Sarlavhasi</label>
                  <input
                    type="text"
                    value={testTitle}
                    onChange={(e) => setTestTitle(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-1.5 block">Variantlar Soni</label>
                  <select
                    value={optionsCount}
                    onChange={(e) => setOptionsCount(parseInt(e.target.value, 10))}
                    className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                  >
                    <option value={3}>3 ta (A, B, C)</option>
                    <option value={4}>4 ta (A, B, C, D)</option>
                    <option value={5}>5 ta (A, B, C, D, E)</option>
                  </select>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-md p-4 flex flex-col sm:flex-row items-end sm:items-center gap-3">
                <div className="flex-1 w-full">
                  <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-1.5 block">Tezkor Kalit Kiritish</label>
                  <input
                    type="text"
                    value={keyStringInput}
                    onChange={(e) => setKeyStringInput(e.target.value)}
                    placeholder="Masalan: ABCDABCD..."
                    className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-sm font-mono uppercase tracking-widest text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                  />
                </div>
                <button
                  onClick={applyKeyString}
                  className="w-full sm:w-auto px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-md transition-colors"
                >
                  Qo'llash
                </button>
              </div>

              <div>
                <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-3">To'g'ri Javoblar</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                  {Array.from({ length: totalQuestions }, (_, i) => {
                    const qNum = i + 1;
                    const selected = answerKey[qNum] || 'A';
                    return (
                      <div key={qNum} className="flex flex-col gap-1.5">
                        <span className="text-[10px] font-medium text-slate-400">Savol {qNum}</span>
                        <div className="flex gap-0.5">
                          {['A', 'B', 'C', 'D', 'E'].slice(0, optionsCount).map(opt => (
                            <button
                              key={opt}
                              onClick={() => setAnswerKey(prev => ({ ...prev, [qNum]: opt }))}
                              className={`flex-1 h-7 rounded text-[11px] font-medium transition-colors border ${
                                selected === opt 
                                  ? 'bg-slate-900 text-white border-slate-900' 
                                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
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
                    toast.success("Kalitlar saqlandi.");
                    setActiveTab('camera');
                  }}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-md transition-colors flex items-center gap-2"
                >
                  <Check className="w-4 h-4" /> Saqlash
                </button>
              </div>
            </motion.div>
          )}

          {/* TAB 4: HISTORY */}
          {activeTab === 'history' && (
            <motion.div
              key="history-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden"
            >
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Sessiya Natijalari</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Ushbu seansda skanerlangan o'quvchilar</p>
                </div>
                <button
                  onClick={exportSessionToExcel}
                  className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" /> Excel Eksport
                </button>
              </div>

              {sessionStudents.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mx-auto mb-3">
                    <Layers className="w-4 h-4" />
                  </div>
                  <p className="text-sm text-slate-600 mb-4">Hozircha natijalar yo'q.</p>
                  <button
                    onClick={() => setActiveTab('camera')}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-md transition-colors"
                  >
                    Skanerlashni boshlash
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-white text-[11px] text-slate-500 font-medium uppercase tracking-wider border-b border-slate-100">
                      <tr>
                        <th className="px-5 py-3 font-medium">F.I.Sh</th>
                        <th className="px-5 py-3 font-medium">Sinf</th>
                        <th className="px-5 py-3 font-medium">Login (ID)</th>
                        <th className="px-5 py-3 font-medium">Natija</th>
                        <th className="px-5 py-3 font-medium text-right">Amallar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sessionStudents.map((student, idx) => (
                        <tr key={student.id || idx} className="hover:bg-slate-50/50">
                          <td className="px-5 py-3 font-medium text-slate-900">{student.studentName}</td>
                          <td className="px-5 py-3 text-slate-600">{student.grade}</td>
                          <td className="px-5 py-3 font-mono text-slate-700 text-xs">{student.id}</td>
                          <td className="px-5 py-3">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-medium border ${
                              student.totalScore >= 80 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              student.totalScore >= 60 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                              'bg-rose-50 text-rose-700 border-rose-200'
                            }`}>
                              {student.totalScore}%
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right">
                            <Link
                              to={`/summary/${student.id}`}
                              target="_blank"
                              className="inline-flex items-center gap-1.5 px-2 py-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded text-xs font-medium transition-colors"
                            >
                              <Eye className="w-3 h-3" />
                              Ko'rish
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
