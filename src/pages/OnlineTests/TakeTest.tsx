import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft, AlertTriangle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import FormattedText from '../../components/FormattedText';
import MeshGradient from '../../components/ui/MeshGradient';

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
      <div className="min-h-screen relative bg-[#fdfdfd] flex flex-col justify-center items-center font-sans overflow-hidden">
        <MeshGradient />
        <div className="w-5 h-5 border-2 border-white/50 border-t-black rounded-full animate-spin mb-3 relative z-10"></div>
        <p className="text-gray-500 font-medium text-[11px] uppercase tracking-wider relative z-10">Yuklanmoqda</p>
      </div>
    );
  }

  if (timeStatus === 'early') {
    return (
      <div className="min-h-screen relative overflow-hidden bg-[#fdfdfd] flex items-center justify-center p-6 text-[#111111] selection:bg-black selection:text-white">
        <MeshGradient />
        <div className="border border-white/50 bg-white/60 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 rounded-2xl max-w-sm w-full text-center relative z-10">
          <Clock className="mx-auto text-gray-400 mb-4" size={32} />
          <h1 className="text-lg font-semibold text-black mb-2">Test hali ochilmagan</h1>
          <p className="text-gray-500 text-sm mb-6">
            Ushbu test <strong>{new Date(test.startTime).toLocaleString('uz-UZ')}</strong> sanasida ochiladi.
          </p>
          <button onClick={() => navigate('/online-tests')} className="text-xs font-medium text-black hover:underline">
            Ortga qaytish
          </button>
        </div>
      </div>
    );
  }

  if (timeStatus === 'closed') {
    return (
      <div className="min-h-screen relative overflow-hidden bg-[#fdfdfd] flex items-center justify-center p-6 text-[#111111] selection:bg-black selection:text-white">
        <MeshGradient />
        <div className="border border-white/50 bg-white/60 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 rounded-2xl max-w-sm w-full text-center relative z-10">
          <AlertTriangle className="mx-auto text-gray-400 mb-4" size={32} />
          <h1 className="text-lg font-semibold text-black mb-2">Test yopilgan</h1>
          <p className="text-gray-500 text-sm mb-6">
            Ushbu test qabul qilishni to'xtatgan.
          </p>
          <button onClick={() => navigate('/online-tests')} className="text-xs font-medium text-black hover:underline">
            Ortga qaytish
          </button>
        </div>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-[#fdfdfd] flex items-center justify-center p-6 font-sans text-[#111111] selection:bg-black selection:text-white">
        <MeshGradient />
        <div className="border border-white/50 bg-white/60 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 rounded-3xl max-w-sm w-full relative z-10">
          <button 
            onClick={() => navigate('/online-tests')}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-black transition-colors mb-6 font-medium"
          >
            <ArrowLeft size={14} /> Ortga
          </button>
          
          <h1 className="text-xl font-semibold text-black mb-1 leading-tight">{test.title}</h1>
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-6">
            <span className="font-medium px-1.5 py-0.5 bg-white/50 border border-white/50 rounded">{test.subject}</span>
            <span>•</span>
            <span>{test.questions.length} savol</span>
          </div>
          
          <div className="bg-white/50 backdrop-blur-md border border-white/50 p-3 rounded-xl mb-6 text-xs text-gray-700 leading-relaxed shadow-sm">
            <strong className="text-black">Qat'iy ogohlantirish:</strong> Testni boshlagach, boshqa oynaga o'tish (tab almashtirish) qat'iyan man etiladi.
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">To'liq ismingizni kiriting</label>
              <input 
                type="text" 
                value={studentName}
                onChange={e => setStudentName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleStart()}
                className="w-full px-4 py-3 bg-white/60 backdrop-blur-md border border-white/50 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:border-white focus:bg-white/80 transition-all shadow-sm"
                placeholder="Masalan: Aliyev Vali"
                autoFocus
              />
            </div>
            
            <button 
              onClick={handleStart}
              className="w-full py-3.5 bg-black text-white rounded-xl text-sm font-semibold hover:bg-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black shadow-sm"
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
      className="min-h-screen relative overflow-hidden bg-[#fdfdfd] text-[#111111] font-sans flex flex-col select-none selection:bg-black selection:text-white pb-32"
      onCopy={(e) => e.preventDefault()}
      onCut={(e) => e.preventDefault()}
      onPaste={(e) => e.preventDefault()}
      onContextMenu={(e) => e.preventDefault()}
    >
      <MeshGradient />
      
      {/* Progress Bar */}
      <div className="h-[3px] w-full bg-white/30 backdrop-blur-sm relative z-20">
        <div 
          className="h-full bg-black transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Header */}
      <header className="border-b border-white/50 px-6 h-16 flex items-center justify-between sticky top-0 bg-white/60 backdrop-blur-xl z-20 shadow-sm">
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
        <div className="lg:w-72 shrink-0 order-2 lg:order-1">
          <div className="bg-white/60 backdrop-blur-xl border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl p-6 lg:sticky lg:top-28">
            <div className="flex items-center justify-between mb-5 border-b border-black/10 pb-3">
              <h3 className="text-xs font-bold text-black uppercase tracking-wider">Savollar</h3>
              <span className="text-[10px] font-bold text-gray-500 px-2 py-1 bg-white/50 rounded-md border border-white/50">{Object.keys(answers).length} / {test.questions.length}</span>
            </div>
            
            <div className="grid grid-cols-5 gap-2 md:gap-2">
              {test.questions.map((_: any, idx: number) => {
                const isAnswered = answers[idx] !== undefined;
                const isCurrent = idx === currentQIndex;
                
                let btnClass = "w-full aspect-square rounded-xl text-[11px] md:text-xs font-bold transition-all duration-300 flex items-center justify-center border shadow-sm ";
                if (isCurrent) {
                  btnClass += "border-black bg-black text-white shadow-md scale-105";
                } else if (isAnswered) {
                  btnClass += "border-black/20 bg-white/80 text-black hover:bg-white hover:border-black/40 hover:shadow-md";
                } else {
                  btnClass += "border-white/50 bg-white/40 text-gray-500 hover:border-black/20 hover:bg-white hover:text-black";
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
        <div className="flex-1 flex flex-col max-w-3xl order-1 lg:order-2">
          <div className="bg-white/60 backdrop-blur-xl border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl p-6 md:p-10 flex flex-col min-h-[500px]">
          <AnimatePresence mode="wait">
            <motion.div 
              key={currentQIndex}
              initial={{ opacity: 0, y: 10, filter: 'blur(5px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -10, filter: 'blur(5px)' }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="flex-1"
            >
              <div className="mb-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/50 border border-white/50 rounded-lg text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-4 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-black/40"></span>
                  {currentQIndex + 1}-Savol
                </div>
                <h3 className="text-xl md:text-2xl font-semibold text-black leading-relaxed">
                  <FormattedText content={currentQ.questionText} />
                </h3>
              </div>

              <div className="space-y-3">
                {currentQ.options.map((opt: string, i: number) => {
                  const isSelected = answers[currentQIndex] === opt;
                  return (
                    <button
                      key={i}
                      onClick={() => handleSelectOption(opt)}
                      className={`w-full text-left px-5 py-4 rounded-2xl border text-sm transition-all duration-300 flex items-center gap-4 group ${
                        isSelected 
                          ? 'border-black bg-white/90 shadow-md ring-1 ring-black' 
                          : 'border-white/50 bg-white/40 hover:bg-white/80 hover:border-black/20 hover:shadow-md shadow-sm'
                      }`}
                    >
                      <div className={`w-5 h-5 shrink-0 rounded-full border flex items-center justify-center transition-colors ${
                        isSelected ? 'border-black bg-black text-white' : 'border-black/20 bg-white/50 group-hover:border-black/40'
                      }`}>
                        {isSelected && <div className="w-2 h-2 bg-white rounded-full"></div>}
                      </div>
                      <span className={`flex-1 leading-relaxed ${isSelected ? 'font-semibold text-black' : 'text-gray-700 group-hover:text-black'}`}>
                        <FormattedText content={opt} />
                      </span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Footer Navigation */}
          <div className="mt-12 flex items-center justify-between pt-6 border-t border-black/10">
            <button
              onClick={() => setCurrentQIndex(prev => Math.max(0, prev - 1))}
              disabled={currentQIndex === 0}
              className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-gray-500 disabled:opacity-30 hover:text-black hover:bg-white/50 rounded-xl transition-all"
            >
              Oldingi
            </button>
            
            {currentQIndex < test.questions.length - 1 ? (
              <button
                onClick={() => setCurrentQIndex(prev => prev + 1)}
                className="px-6 py-3 bg-white/80 border border-white/50 shadow-sm text-black rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-white transition-all hover:shadow-md hover:border-black/20"
              >
                Keyingi
              </button>
            ) : (
              <button
                onClick={() => handleSubmit(false)}
                disabled={submitting}
                className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white shadow-md rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-gray-900 transition-all hover:shadow-lg disabled:opacity-70"
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
                {submitting ? 'Yuborilmoqda...' : 'Yakunlash'}
              </button>
            )}
          </div>
          </div>
        </div>
      </main>
    </div>
  );
}
