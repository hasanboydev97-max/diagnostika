import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft, AlertTriangle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import FormattedText from '../../components/FormattedText';

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
      const res = await fetch(`${API_URL}/online-tests/${testId}`);
      if (!res.ok) throw new Error('Test not found');
      const data = await res.json();
      setTest(data);
      checkTimeLimit(data);
    } catch (error) {
      console.error(error);
      toast.error('Test not found');
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
    
    let score = 0;
    test.questions.forEach((q: any, i: number) => {
      if (answers[i] === q.correctOption) {
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
        const errData = await res.json();
        throw new Error(errData.error || 'Server xatosi');
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

  if (timeStatus === 'early') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6 text-zinc-900 selection:bg-zinc-200 selection:text-black">
        <div className="border border-zinc-200 p-8 rounded-md max-w-sm w-full text-center">
          <Clock className="mx-auto text-zinc-400 mb-4" size={32} />
          <h1 className="text-lg font-semibold text-zinc-900 mb-2">Test hali ochilmagan</h1>
          <p className="text-zinc-500 text-sm mb-6">
            Ushbu test <strong>{new Date(test.startTime).toLocaleString('uz-UZ')}</strong> sanasida ochiladi.
          </p>
          <button onClick={() => navigate('/online-tests')} className="text-xs font-medium text-zinc-900 hover:underline">
            Ortga qaytish
          </button>
        </div>
      </div>
    );
  }

  if (timeStatus === 'closed') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6 text-zinc-900 selection:bg-zinc-200 selection:text-black">
        <div className="border border-zinc-200 p-8 rounded-md max-w-sm w-full text-center">
          <AlertTriangle className="mx-auto text-zinc-400 mb-4" size={32} />
          <h1 className="text-lg font-semibold text-zinc-900 mb-2">Test yopilgan</h1>
          <p className="text-zinc-500 text-sm mb-6">
            Ushbu test qabul qilishni to'xtatgan.
          </p>
          <button onClick={() => navigate('/online-tests')} className="text-xs font-medium text-zinc-900 hover:underline">
            Ortga qaytish
          </button>
        </div>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6 font-sans text-zinc-900 selection:bg-zinc-200 selection:text-black">
        <div className="border border-zinc-200 p-8 rounded-md max-w-sm w-full bg-white shadow-sm">
          <button 
            onClick={() => navigate('/online-tests')}
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 transition-colors mb-6 font-medium"
          >
            <ArrowLeft size={14} /> Ortga
          </button>
          
          <h1 className="text-xl font-semibold text-zinc-900 mb-1 leading-tight">{test.title}</h1>
          <div className="flex items-center gap-2 text-xs text-zinc-500 mb-6">
            <span className="font-medium px-1.5 py-0.5 bg-zinc-100 border border-zinc-200 rounded">{test.subject}</span>
            <span>•</span>
            <span>{test.questions.length} savol</span>
          </div>
          
          <div className="bg-zinc-50 border border-zinc-200 p-3 rounded-md mb-6 text-xs text-zinc-700 leading-relaxed">
            <strong className="text-zinc-900">Qat'iy ogohlantirish:</strong> Testni boshlagach, boshqa oynaga o'tish (tab almashtirish) qat'iyan man etiladi.
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">To'liq ismingizni kiriting</label>
              <input 
                type="text" 
                value={studentName}
                onChange={e => setStudentName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleStart()}
                className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-md text-sm placeholder-zinc-400 focus:outline-none focus:border-zinc-900 transition-colors"
                placeholder="Masalan: Aliyev Vali"
                autoFocus
              />
            </div>
            
            <button 
              onClick={handleStart}
              className="w-full py-2.5 bg-zinc-900 text-white rounded-md text-sm font-medium hover:bg-zinc-800 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-900 shadow-sm"
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
      className="min-h-screen bg-white text-zinc-900 font-sans flex flex-col select-none selection:bg-zinc-200 selection:text-black"
      onCopy={(e) => e.preventDefault()}
      onCut={(e) => e.preventDefault()}
      onPaste={(e) => e.preventDefault()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Progress Bar */}
      <div className="h-[2px] w-full bg-zinc-100">
        <div 
          className="h-full bg-zinc-900 transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Header */}
      <header className="border-b border-zinc-200 px-6 h-14 flex items-center justify-between sticky top-0 bg-white z-10">
        <div className="flex flex-col">
          <h2 className="text-xs font-semibold text-zinc-900 leading-tight">{test.title}</h2>
          <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide">{studentName}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-1.5 px-2 py-1 bg-zinc-50 text-zinc-600 rounded-md border border-zinc-200 text-[10px] font-bold uppercase tracking-wider">
            <AlertTriangle size={10} /> Oynani tark etmang
          </div>
          {timeLeft !== null && (
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-bold font-mono tracking-wider border ${
              timeLeft <= 60 ? 'bg-red-50 text-red-600 border-red-200 animate-pulse' : 'bg-zinc-50 text-zinc-900 border-zinc-200'
            }`}>
              <Clock size={12} />
              {formatTime(timeLeft)}
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-8 flex flex-col lg:flex-row gap-6 md:gap-10">
        
        {/* Question Palette Sidebar */}
        <div className="lg:w-64 shrink-0 order-2 lg:order-1">
          <div className="bg-white border border-zinc-200 rounded-md p-4 lg:sticky lg:top-24">
            <div className="flex items-center justify-between mb-3 border-b border-zinc-100 pb-2">
              <h3 className="text-xs font-semibold text-zinc-900 uppercase tracking-wider">Savollar</h3>
              <span className="text-[10px] font-bold text-zinc-500">{Object.keys(answers).length} / {test.questions.length}</span>
            </div>
            
            <div className="grid grid-cols-5 gap-1 md:gap-1.5">
              {test.questions.map((_: any, idx: number) => {
                const isAnswered = answers[idx] !== undefined;
                const isCurrent = idx === currentQIndex;
                
                let btnClass = "w-full aspect-square rounded text-[10px] md:text-[11px] font-semibold transition-all flex items-center justify-center border ";
                if (isCurrent) {
                  btnClass += "border-zinc-900 bg-zinc-900 text-white";
                } else if (isAnswered) {
                  btnClass += "border-zinc-900 bg-zinc-50 text-zinc-900";
                } else {
                  btnClass += "border-zinc-200 bg-white text-zinc-400 hover:border-zinc-400";
                }
                
                return (
                  <button
                    key={idx}
                    onClick={() => setCurrentQIndex(idx)}
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
        <div className="flex-1 flex flex-col max-w-2xl order-1 lg:order-2 lg:pt-4">
          <AnimatePresence mode="wait">
            <motion.div 
              key={currentQIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              <div className="mb-8">
                <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
                  {currentQIndex + 1}-Savol
                </div>
                <h3 className="text-lg font-medium text-zinc-900 leading-relaxed">
                  <FormattedText content={currentQ.questionText} />
                </h3>
              </div>

              <div className="space-y-2">
                {currentQ.options.map((opt: string, i: number) => {
                  const isSelected = answers[currentQIndex] === opt;
                  return (
                    <button
                      key={i}
                      onClick={() => handleSelectOption(opt)}
                      className={`w-full text-left px-4 py-3 rounded-md border text-sm transition-all flex items-center gap-3 group ${
                        isSelected 
                          ? 'border-zinc-900 bg-zinc-50/50' 
                          : 'border-zinc-200 bg-white hover:border-zinc-400'
                      }`}
                    >
                      <div className={`w-4 h-4 shrink-0 rounded-full border flex items-center justify-center transition-colors ${
                        isSelected ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-300 group-hover:border-zinc-400'
                      }`}>
                        {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                      </div>
                      <span className={`flex-1 ${isSelected ? 'font-medium text-zinc-900' : 'text-zinc-700'}`}>
                        <FormattedText content={opt} />
                      </span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Footer Navigation */}
          <div className="mt-12 flex items-center justify-between pt-4 border-t border-zinc-100">
            <button
              onClick={() => setCurrentQIndex(prev => Math.max(0, prev - 1))}
              disabled={currentQIndex === 0}
              className="px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-500 disabled:opacity-30 hover:text-zinc-900 transition-colors"
            >
              Oldingi
            </button>
            
            {currentQIndex < test.questions.length - 1 ? (
              <button
                onClick={() => setCurrentQIndex(prev => prev + 1)}
                className="px-5 py-2 bg-zinc-100 border border-zinc-200 text-zinc-900 rounded-md text-xs font-semibold uppercase tracking-wider hover:bg-zinc-200 transition-colors"
              >
                Keyingi
              </button>
            ) : (
              <button
                onClick={() => handleSubmit(false)}
                disabled={submitting}
                className="inline-flex items-center gap-2 px-5 py-2 bg-zinc-900 text-white rounded-md text-xs font-semibold uppercase tracking-wider hover:bg-zinc-800 transition-colors disabled:opacity-70"
              >
                {submitting ? <Loader2 size={14} className="animate-spin" /> : null}
                {submitting ? 'Yuborilmoqda...' : 'Yakunlash'}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
