import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft, AlertTriangle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import FormattedText from '../../components/FormattedText';
import MeshGradient from '../../components/ui/MeshGradient';

import { db } from '../../lib/db';
import { generateDiagnosticSummary } from '../../lib/gemini';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function TakeTest() {
  const { testId } = useParams();
  const navigate = useNavigate();
  
  const [test, setTest] = useState<any>(null);
  const [studentName, setStudentName] = useState('');
  const [started, setStarted] = useState(false);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [timeStatus, setTimeStatus] = useState<'open' | 'early' | 'closed'>('open');
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  // Custom cursor state
  const [mousePosition, setMousePosition] = useState({ x: -100, y: -100 });
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    const updateMousePosition = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', updateMousePosition);
    return () => window.removeEventListener('mousemove', updateMousePosition);
  }, []);

  const violations = useRef(0);
  const submitRef = useRef(false);

  const SAVE_KEY = `test_progress_${testId}`;

  // Keshdan saqlangan ma'lumotlarni o'qish (Auto-save)
  useEffect(() => {
    fetchTest();
    const savedProgress = localStorage.getItem(SAVE_KEY);
    if (savedProgress) {
      try {
        const parsed = JSON.parse(savedProgress);
        if (parsed.studentName) setStudentName(parsed.studentName);
        if (parsed.answers) setAnswers(parsed.answers);
        if (parsed.timeLeft) setTimeLeft(parsed.timeLeft);
        if (parsed.started) setStarted(parsed.started);
        if (parsed.currentQIndex) setCurrentQIndex(parsed.currentQIndex);
      } catch (e) {
        console.warn("Keshni o'qishda xatolik", e);
      }
    }
  }, [testId]);

  // Har safar javob yoki vaqt o'zgarganda keshga saqlash
  useEffect(() => {
    if (started) {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        studentName,
        answers,
        timeLeft,
        started,
        currentQIndex
      }));
    }
  }, [answers, timeLeft, started, studentName, currentQIndex]);

  const fetchTest = async () => {
    try {
      if (testId) {
        // Try local diagnostic test first
        const localTest = await db.getDiagnosticTest(testId);
        if (localTest) {
          setTest({
            ...localTest,
            isDiagnostic: true,
            title: `${localTest.grade}-sinf Diagnostika Testi`,
            subject: 'Diagnostika'
          });
          setLoading(false);
          return;
        }
      }
      
      const res = await fetch(`${API_URL}/online-tests/${testId}`);
      if (!res.ok) throw new Error('Test not found');
      const data = await res.json();
      setTest(data);
      checkTimeLimit(data);
    } catch (error) {
      console.error(error);
      toast.error('Test topilmadi');
      navigate('/online-tests');
    } finally {
      setLoading(false);
    }
  };

  const checkTimeLimit = (testData: any) => {
    const now = new Date();
    if (testData.startTime && now < new Date(testData.startTime)) {
      setTimeStatus('early');
    } else if (testData.endTime && now > new Date(testData.endTime)) {
      setTimeStatus('closed');
    } else {
      setTimeStatus('open');
    }
  };

  const handleStart = async () => {
    if (!studentName.trim()) {
      toast.error('Please enter your name to continue.');
      return;
    }
    
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch (err) {
      console.warn('Fullscreen request failed', err);
    }

    if (test.durationMinutes && timeLeft === null) {
      setTimeLeft(test.durationMinutes * 60);
    }
    setStarted(true);
  };

  useEffect(() => {
    if (!started || timeLeft === null || timeLeft <= 0 || submitting) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(timer);
          if (!submitRef.current) {
            handleSubmit(true);
            toast.error("Vaqt tugadi! Test avtomatik yakunlandi.", { duration: 5000 });
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [started, timeLeft, submitting]);

  useEffect(() => {
    if (!started) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleViolation();
      }
    };

    const handleViolation = () => {
      if (submitting) return;
      
      violations.current += 1;
      
      if (violations.current === 1) {
        toast.error('QOIDABUZARLIK! Iltimos, testdan chiqmang yoki boshqa oynaga o\'tmang. Yana bir marta takrorlansa test avtomatik yopiladi!', {
          duration: 10000,
          position: 'top-center',
          icon: <AlertTriangle className="text-red-500" />
        });
      } else if (violations.current >= 2) {
        toast.error('QOIDABUZARLIK TAKRORLANDI! Test majburiy yakunlanmoqda...', {
          duration: 5000,
          position: 'top-center'
        });
        handleSubmit(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleViolation); 

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleViolation);
    };
  }, [started, answers]); 

  const handleSelectOption = (option: string) => {
    setAnswers(prev => ({ ...prev, [currentQIndex]: option }));
  };

  const isAnswerCorrect = (userAns: string | undefined, correctOpt: string | undefined, options: string[] = []): boolean => {
    if (!userAns || !correctOpt) return false;
    const u = String(userAns).trim().toLowerCase();
    const c = String(correctOpt).trim().toLowerCase();

    // 1. Direct text match
    if (u === c) return true;

    // 2. Letter mapping: A -> options[0], B -> options[1], C -> options[2], D -> options[3]
    const letterMap: Record<string, number> = { a: 0, b: 1, c: 2, d: 3 };
    if (letterMap[c] !== undefined && options[letterMap[c]]) {
      if (String(options[letterMap[c]]).trim().toLowerCase() === u) return true;
    }
    if (letterMap[u] !== undefined && options[letterMap[u]]) {
      if (String(options[letterMap[u]]).trim().toLowerCase() === c) return true;
    }

    return false;
  };

  const handleSubmit = async (isForced: boolean = false) => {
    if (submitRef.current) return;
    
    if (!isForced) {
      const answeredCount = Object.keys(answers).length;
      if (answeredCount < test.questions.length) {
        const confirmSubmit = window.confirm(`Siz ${test.questions.length} ta savoldan faqat ${answeredCount} tasiga javob berdingiz. Baribir yakunlaysizmi?`);
        if (!confirmSubmit) return;
      }
    }
    
    setSubmitting(true);
    submitRef.current = true;
    const toastId = toast.loading('Javoblaringiz tekshirilmoqda...');

    // If test is marked diagnostic, generate AI Diagnostic Summary and go to /summary/:id
    if (test.isDiagnostic || test.type === 'diagnostic') {
      try {
        const questionResults: Record<number, boolean> = {};

        // Always construct blueprint directly from actual test questions
        const blueprint = test.questions.map((q: any, idx: number) => {
          const rawTopic = q.questionText 
            ? q.questionText.replace(/<[^>]*>/g, '').trim()
            : (q.topic || `Savol #${idx + 1}`);
          
          return {
            id: q.blueprintId || q.id || idx + 1,
            topic: rawTopic.length > 75 ? rawTopic.substring(0, 75) + '...' : rawTopic,
            category: q.category || test.subject || 'Matematika',
            skill: q.skill || 'Tushunish',
            thinkingType: q.thinkingType || 'Analitik',
            difficulty: q.difficulty || 'O\'rta',
            timeEstimate: '1min'
          };
        });

        test.questions.forEach((q: any, i: number) => {
          const bpId = blueprint[i].id;
          questionResults[bpId] = isAnswerCorrect(answers[i], q.correctOption, q.options || []);
        });

        // Compute category scores
        const categories = [...new Set(blueprint.map((q: any) => q.category))] as string[];
        const scores: Record<string, number> = {};
        categories.forEach(cat => {
          const catQuestions = blueprint.filter((q: any) => q.category === cat);
          let earned = 0, maxPossible = 0;
          catQuestions.forEach((q: any) => {
            const w = q.difficulty === 'Qiyin' ? 3 : (q.difficulty === 'O\'rta' ? 2 : 1);
            maxPossible += w;
            if (questionResults[q.id]) earned += w;
          });
          scores[cat] = maxPossible > 0 ? Math.round((earned / maxPossible) * 100) : 0;
        });

        const totalScore = Math.round(Object.values(scores).reduce((a, b) => a + b, 0) / (Object.values(scores).length || 1));

        toast.loading('AI Diagnostik xulosa yaratilmoqda...', { id: toastId });

        const summaryResponse = await generateDiagnosticSummary(
          studentName,
          test.grade || '5',
          scores,
          questionResults,
          blueprint
        );

        const resultId = Math.floor(100000 + Math.random() * 900000).toString();
        const pin = Math.floor(1000 + Math.random() * 9000).toString();

        await db.saveResult({
          id: resultId,
          pin,
          studentName,
          grade: test.grade || '5',
          blueprintSnapshot: blueprint,
          scores,
          totalScore,
          questionResults,
          aiSummaryText: summaryResponse.summary,
          aiAdviceText: summaryResponse.advice,
          aiRoadmap: summaryResponse.roadmap || undefined,
          createdAt: new Date().toISOString()
        });

        if (document.fullscreenElement) {
          document.exitFullscreen().catch(err => console.log(err));
        }
        localStorage.removeItem(SAVE_KEY);
        toast.success('Diagnostik natijangiz tayyor!', { id: toastId });
        navigate(`/summary/${resultId}`);
        return;
      } catch (err: any) {
        console.error(err);
        toast.error('Diagnostika yaratishda xatolik: ' + err.message, { id: toastId });
        setSubmitting(false);
        submitRef.current = false;
        return;
      }
    }
    
    let score = 0;
    test.questions.forEach((q: any, i: number) => {
      if (isAnswerCorrect(answers[i], q.correctOption, q.options || [])) {
        score++;
      }
    });

    const resultId = 'res_' + Date.now().toString();
    
    try {
      const res = await fetch(`${API_URL}/online-test-results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: resultId,
          testId,
          studentName: studentName + (isForced ? ' (Qoidabuzarlik)' : ''),
          answers,
          score,
          totalScore: test.questions.length,
          questions: test.questions,
          createdAt: new Date().toISOString()
        })
      });
      
      if (!res.ok) {
        let errMsg = 'Server xatosi';
        try {
          const errData = await res.json();
          errMsg = errData.error || errMsg;
        } catch(e) {
          errMsg = `Server xatosi (${res.status})`;
        }
        throw new Error(errMsg);
      }

      if (document.fullscreenElement) {
        document.exitFullscreen().catch(err => console.log(err));
      }

      // Muvaffaqiyatli topshirilgach keshni tozalash
      localStorage.removeItem(SAVE_KEY);

      toast.success('Test muvaffaqiyatli yakunlandi!', { id: toastId });
      navigate(`/online-tests/results/${resultId}`);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Xatolik yuz berdi. Iltimos qayta urinib ko\'ring.', { id: toastId });
      setSubmitting(false);
      submitRef.current = false;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen relative overflow-hidden flex flex-col justify-center items-center font-sans cursor-none">
        <MeshGradient />
        <div className="bg-[#fdfdfd] shadow-2xl p-12 rounded-[2rem] flex flex-col items-center relative z-10">
          <div className="w-6 h-6 border-2 border-black/10 border-t-black rounded-full animate-spin mb-4"></div>
          <p className="text-black font-semibold text-[10px] uppercase tracking-[0.3em]">Yuklanmoqda</p>
        </div>
      </div>
    );
  }

  if (timeStatus === 'early') {
    return (
      <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-6 text-[#111111] selection:bg-black selection:text-white cursor-none">
        <MeshGradient />
        <div className="bg-[#fdfdfd] shadow-2xl rounded-[2.5rem] p-12 max-w-sm w-full text-center relative z-10">
          <Clock className="mx-auto text-black mb-6" size={40} strokeWidth={1.5} />
          <h1 className="text-xl font-medium text-black mb-2 tracking-tight">Test hali ochilmagan</h1>
          <p className="text-gray-500 text-sm mb-8 leading-relaxed">
            Ushbu test <strong>{new Date(test.startTime).toLocaleString('uz-UZ')}</strong> sanasida ochiladi.
          </p>
          <button onClick={() => navigate('/online-tests')} className="text-[10px] font-bold uppercase tracking-[0.2em] text-black border-b border-black pb-1 hover:text-gray-500 hover:border-gray-500 transition-colors">
            Ortga qaytish
          </button>
        </div>
      </div>
    );
  }

  if (timeStatus === 'closed') {
    return (
      <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-6 text-[#111111] selection:bg-black selection:text-white cursor-none">
        <MeshGradient />
        <div className="bg-[#fdfdfd] shadow-2xl rounded-[2.5rem] p-12 max-w-sm w-full text-center relative z-10">
          <AlertTriangle className="mx-auto text-black mb-6" size={40} strokeWidth={1.5} />
          <h1 className="text-xl font-medium text-black mb-2 tracking-tight">Test yopilgan</h1>
          <p className="text-gray-500 text-sm mb-8 leading-relaxed">
            Ushbu test qabul qilishni to'xtatgan.
          </p>
          <button onClick={() => navigate('/online-tests')} className="text-[10px] font-bold uppercase tracking-[0.2em] text-black border-b border-black pb-1 hover:text-gray-500 hover:border-gray-500 transition-colors">
            Ortga qaytish
          </button>
        </div>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-6 font-sans text-[#111111] selection:bg-black selection:text-white cursor-none">
        <MeshGradient />
        
        {/* Custom Cursor */}
        <motion.div
          className="hidden md:block fixed top-0 left-0 w-16 h-16 rounded-full bg-white mix-blend-difference pointer-events-none z-[9999]"
          animate={{
            x: mousePosition.x - 32,
            y: mousePosition.y - 32,
            scale: isHovering ? 1.5 : 1
          }}
          transition={{ type: "spring", stiffness: 150, damping: 15, mass: 0.1 }}
        />

        <div className="bg-white/60 backdrop-blur-xl border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-10 md:p-12 rounded-[2rem] max-w-lg w-full relative z-10">
          <button 
            onClick={() => navigate('/online-tests')}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 hover:text-black transition-colors mb-10"
          >
            <ArrowLeft size={14} /> Ortga
          </button>
          
          <h1 className="text-3xl font-medium text-black mb-4 tracking-tight leading-tight">{test.title}</h1>
          <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-600 mb-8">
            <span className="px-2 py-1 bg-white/50 border border-white/50 rounded-md">{test.subject}</span>
            <span className="text-black/20">•</span>
            <span>{test.questions.length} savol</span>
          </div>
          
          <div className="bg-white/40 border border-white/50 rounded-xl p-5 mb-8 text-xs text-gray-600 leading-relaxed shadow-sm">
            <strong className="text-black block mb-2 text-[10px] uppercase tracking-[0.2em]">Qat'iy ogohlantirish</strong> 
            Testni boshlagach, boshqa oynaga o'tish (tab almashtirish) qat'iyan man etiladi.
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-[0.2em] mb-3">To'liq ismingizni kiriting</label>
              <input 
                type="text" 
                value={studentName}
                onChange={e => setStudentName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleStart()}
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
                className="w-full px-5 py-4 bg-white/50 border border-white/50 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:bg-white/80 focus:border-black/20 transition-colors shadow-sm"
                placeholder="Masalan: Aliyev Vali"
                autoFocus
              />
            </div>
            
            <button 
              onClick={handleStart}
              onMouseEnter={() => setIsHovering(true)}
              onMouseLeave={() => setIsHovering(false)}
              className="w-full py-4 bg-black text-white rounded-xl text-[10px] uppercase tracking-[0.2em] font-bold hover:bg-gray-900 shadow-md transition-colors focus:outline-none"
            >
              Testni Boshlash
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentQ = test.questions[currentQIndex];
  const progress = ((currentQIndex + 1) / test.questions.length) * 100;

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div 
      className="min-h-screen relative overflow-hidden flex flex-col font-sans select-none bg-[#fdfdfd] text-[#111111]"
      onCopy={(e) => e.preventDefault()}
      onCut={(e) => e.preventDefault()}
      onPaste={(e) => e.preventDefault()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Progress Bar */}
      <div className="h-[3px] w-full bg-black/5 relative z-20">
        <div 
          className="h-full bg-black transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Header */}
      <header className="border-b border-black/5 px-6 md:px-12 h-16 flex items-center justify-between sticky top-0 bg-[#fdfdfd] z-20">
        <div className="flex flex-col">
          <h2 className="text-sm font-medium text-black tracking-tight">{test.title}</h2>
          <p className="text-[9px] font-bold text-gray-600 uppercase tracking-[0.2em] mt-1">{studentName}</p>
        </div>
        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-2 text-[9px] font-bold text-gray-600 uppercase tracking-[0.2em]">
            <AlertTriangle size={12} strokeWidth={2} /> Oynani tark etmang
          </div>
          {timeLeft !== null && (
            <div className={`flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] ${
              timeLeft <= 60 ? 'text-red-500 animate-pulse' : 'text-black'
            }`}>
              <Clock size={14} strokeWidth={2} />
              {formatTime(timeLeft)}
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-6 md:px-12 py-8 relative z-10 flex flex-col lg:flex-row gap-12 lg:gap-24 h-full">
        
        {/* Question Palette Sidebar */}
        <div className="lg:w-64 shrink-0 order-2 lg:order-1">
          <div className="lg:sticky lg:top-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em]">Savollar</h3>
              <span className="text-[10px] font-bold text-black uppercase tracking-[0.2em]">{Object.keys(answers).length} / {test.questions.length}</span>
            </div>
            
            <div className="grid grid-cols-5 gap-2">
                {test.questions.map((_: any, idx: number) => {
                  const isAnswered = answers[idx] !== undefined;
                  const isCurrent = idx === currentQIndex;
                  
                  let btnClass = "w-full aspect-square text-[10px] font-bold transition-all duration-300 flex items-center justify-center border ";
                  if (isCurrent) {
                    btnClass += "border-black bg-black text-white scale-110";
                  } else if (isAnswered) {
                    btnClass += "border-black/20 bg-transparent text-black hover:border-black";
                  } else {
                    btnClass += "border-black/5 bg-transparent text-gray-400 hover:border-black/30 hover:text-black";
                  }
                  
                  return (
                    <button
                      key={idx}
                      onClick={() => setCurrentQIndex(idx)}
                      onMouseEnter={() => setIsHovering(true)}
                      onMouseLeave={() => setIsHovering(false)}
                      className={btnClass}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

        {/* Question Area */}
        <div className="flex-1 flex flex-col min-w-0 order-1 lg:order-2">
          <AnimatePresence mode="wait">
            <motion.div 
              key={currentQIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="flex-1"
            >
              <div className="mb-10">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em] mb-3">
                  {currentQIndex + 1}-Savol
                </div>
                <h3 className="text-xl md:text-2xl lg:text-3xl font-medium text-black leading-snug tracking-tight">
                  <FormattedText content={currentQ.questionText} />
                </h3>
              </div>

                <div className="space-y-0 border-t border-black/10">
                  {currentQ.options.map((opt: string, i: number) => {
                    const isSelected = answers[currentQIndex] === opt;
                    return (
                      <button
                        key={i}
                        onClick={() => handleSelectOption(opt)}
                        onMouseEnter={() => setIsHovering(true)}
                        onMouseLeave={() => setIsHovering(false)}
                        className="w-full text-left py-4 md:py-5 border-b border-black/10 transition-colors duration-300 flex items-start md:items-center gap-5 group"
                      >
                        <div className="w-5 h-5 mt-0.5 md:mt-0 shrink-0 rounded-full border flex items-center justify-center transition-colors border-black/20 group-hover:border-black">
                          {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-black"></div>}
                        </div>
                        <span className={`flex-1 text-base md:text-lg leading-relaxed transition-colors ${isSelected ? 'font-medium text-black' : 'text-gray-500 group-hover:text-black'}`}>
                          <FormattedText content={opt} />
                        </span>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            </AnimatePresence>

          {/* Footer Navigation */}
          <div className="mt-16 pt-8 border-t border-black/5 flex items-center justify-between">
            <button
              onClick={() => setCurrentQIndex(prev => Math.max(0, prev - 1))}
              disabled={currentQIndex === 0}
              onMouseEnter={() => setIsHovering(true)}
              onMouseLeave={() => setIsHovering(false)}
              className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 disabled:opacity-30 hover:text-black transition-colors"
            >
              Oldingi
            </button>
            
            {currentQIndex < test.questions.length - 1 ? (
              <button
                onClick={() => setCurrentQIndex(prev => prev + 1)}
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
                className="text-[10px] font-bold uppercase tracking-[0.2em] text-black border-b border-black pb-1 hover:text-gray-500 hover:border-gray-500 transition-all"
              >
                Keyingi
              </button>
            ) : (
              <button
                onClick={() => handleSubmit(false)}
                disabled={submitting}
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
                className="inline-flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.2em] text-black border-b border-black pb-1 hover:text-gray-500 hover:border-gray-500 transition-all disabled:opacity-30"
              >
                {submitting ? <Loader2 size={12} className="animate-spin" /> : null}
                {submitting ? 'Yuborilmoqda...' : 'Yakunlash'}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
