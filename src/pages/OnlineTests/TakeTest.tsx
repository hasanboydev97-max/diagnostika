import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft, Check, AlertTriangle, Clock } from 'lucide-react';
import { toast } from 'sonner';
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

  useEffect(() => {
    fetchTest();
  }, [testId]);

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
    
    // Request fullscreen
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch (err) {
      console.warn('Fullscreen request failed', err);
    }

    if (test.durationMinutes) {
      setTimeLeft(test.durationMinutes * 60);
    }
    setStarted(true);
  };

  // Timer Effect
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

  // Anti-cheating effect
  useEffect(() => {
    if (!started) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleViolation();
      }
    };

    const handleViolation = () => {
      if (submitting) return; // ignore if already submitting
      
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
        handleSubmit(true); // force submit
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleViolation); // catches split screen or clicking outside

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleViolation);
    };
  }, [started, answers]); // pass answers so handleSubmit closure has latest answers

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

      // Exit fullscreen if active
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(err => console.log(err));
      }

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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="animate-spin text-gray-400" size={32} />
      </div>
    );
  }

  // Handle Time Restrictions UI
  if (timeStatus === 'early') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white p-8 md:p-10 rounded-2xl shadow-sm border border-gray-200 max-w-md w-full text-center">
          <Clock className="mx-auto text-blue-500 mb-4" size={48} />
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Test hali ochilmagan</h1>
          <p className="text-gray-500 text-sm mb-6">
            Ushbu test <strong>{new Date(test.startTime).toLocaleString('uz-UZ')}</strong> sanasida ochiladi. Iltimos kuting.
          </p>
          <button onClick={() => navigate('/online-tests')} className="text-sm font-medium text-blue-600 hover:underline">
            Ortga qaytish
          </button>
        </div>
      </div>
    );
  }

  if (timeStatus === 'closed') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white p-8 md:p-10 rounded-2xl shadow-sm border border-gray-200 max-w-md w-full text-center">
          <AlertTriangle className="mx-auto text-red-500 mb-4" size={48} />
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Test yopilgan</h1>
          <p className="text-gray-500 text-sm mb-6">
            Ushbu test qabul qilishni to'xtatgan (Yopilish vaqti: {new Date(test.endTime).toLocaleString('uz-UZ')}).
          </p>
          <button onClick={() => navigate('/online-tests')} className="text-sm font-medium text-blue-600 hover:underline">
            Ortga qaytish
          </button>
        </div>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white p-8 md:p-10 rounded-2xl shadow-sm border border-gray-200 max-w-md w-full">
          <button 
            onClick={() => navigate('/online-tests')}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-8"
          >
            <ArrowLeft size={16} /> Back
          </button>
          
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">{test.title}</h1>
          <p className="text-gray-500 text-sm mb-6">{test.subject} • {test.questions.length} ta savol</p>
          
          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-8 text-sm text-yellow-800">
            <strong>QAT'IY OGOHLANTIRISH:</strong> Testni boshlagach, boshqa oynaga o'tish (tab almashtirish) qat'iyan man etiladi. Qoidabuzarlik sezilsa, test avtomatik yopiladi va baholanadi.
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">To'liq ismingizni kiriting</label>
              <input 
                type="text" 
                value={studentName}
                onChange={e => setStudentName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleStart()}
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg shadow-sm placeholder-gray-400
                  focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors"
                placeholder="Masalan: Aliyev Vali"
                autoFocus
              />
            </div>
            
            <button 
              onClick={handleStart}
              className="w-full py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
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
      className="min-h-screen bg-white text-gray-900 font-sans flex flex-col select-none"
      onCopy={(e) => e.preventDefault()}
      onCut={(e) => e.preventDefault()}
      onPaste={(e) => e.preventDefault()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Progress Bar */}
      <div className="h-1 w-full bg-gray-100">
        <div 
          className="h-full bg-black transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Header */}
      <header className="border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 bg-white z-10">
        <div>
          <h2 className="text-sm font-medium text-gray-900">{test.title}</h2>
          <p className="text-xs text-gray-500">{studentName}</p>
        </div>
        <div className="flex items-center gap-4">
          {timeLeft !== null && (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-bold tracking-wider ${
              timeLeft <= 60 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-gray-100 text-gray-800'
            }`}>
              <Clock size={16} />
              {formatTime(timeLeft)}
            </div>
          )}
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-600 rounded text-xs font-medium border border-red-100">
            <AlertTriangle size={12} /> Ekranni tark etmang
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 flex flex-col lg:flex-row gap-8">
        
        {/* Question Palette Sidebar */}
        <div className="lg:w-72 shrink-0 order-2 lg:order-1">
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 lg:sticky lg:top-24">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">Savollar paneli</h3>
              <span className="text-xs font-medium text-gray-500">{Object.keys(answers).length} / {test.questions.length} belgilanmadi</span>
            </div>
            
            <div className="grid grid-cols-5 gap-2">
              {test.questions.map((_: any, idx: number) => {
                const isAnswered = answers[idx] !== undefined;
                const isCurrent = idx === currentQIndex;
                
                let btnClass = "w-10 h-10 rounded-lg text-sm font-medium transition-all flex items-center justify-center border ";
                if (isCurrent) {
                  btnClass += "border-black bg-black text-white shadow-md scale-105";
                } else if (isAnswered) {
                  btnClass += "border-green-500 bg-green-50 text-green-700 hover:bg-green-100";
                } else {
                  btnClass += "border-gray-200 bg-white text-gray-600 hover:border-gray-400 hover:bg-gray-50";
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
            
            <div className="mt-6 pt-4 border-t border-gray-200 flex flex-col gap-2 text-xs text-gray-500">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-black"></div> Hozirgi savol
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-green-50 border border-green-500"></div> Javob berilgan
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-white border border-gray-200"></div> Javob berilmagan
              </div>
            </div>
          </div>
        </div>

        {/* Question Area */}
        <div className="flex-1 flex flex-col max-w-4xl order-1 lg:order-2 lg:pt-8">
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h3 className="text-2xl md:text-3xl font-semibold text-gray-900 mb-10 leading-snug">
            <FormattedText content={currentQ.questionText} />
          </h3>

          <div className="space-y-3">
            {currentQ.options.map((opt: string, i: number) => {
              const isSelected = answers[currentQIndex] === opt;
              return (
                <button
                  key={i}
                  onClick={() => handleSelectOption(opt)}
                  className={`w-full text-left p-4 md:p-5 rounded-xl border text-base md:text-lg transition-all flex items-center justify-between group ${
                    isSelected 
                      ? 'border-black bg-gray-50 text-black' 
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <span className={isSelected ? 'font-medium' : ''}>
                    <FormattedText content={opt} />
                  </span>
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                    isSelected ? 'border-black bg-black text-white' : 'border-gray-300 group-hover:border-gray-400'
                  }`}>
                    {isSelected && <Check size={12} strokeWidth={3} />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="mt-16 flex items-center justify-between pt-6 border-t border-gray-100">
          <button
            onClick={() => setCurrentQIndex(prev => Math.max(0, prev - 1))}
            disabled={currentQIndex === 0}
            className="px-6 py-2.5 text-sm font-medium text-gray-600 disabled:opacity-30 hover:text-gray-900 transition-colors"
          >
            Oldingi
          </button>
          
          {currentQIndex < test.questions.length - 1 ? (
            <button
              onClick={() => setCurrentQIndex(prev => prev + 1)}
              className="px-8 py-2.5 bg-gray-100 text-gray-900 rounded-full text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              Keyingi Savol
            </button>
          ) : (
            <button
              onClick={() => handleSubmit(false)}
              disabled={submitting}
              className="inline-flex items-center gap-2 px-8 py-2.5 bg-black text-white rounded-full text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-70"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
              {submitting ? 'Yuborilmoqda...' : 'Testni Yakunlash'}
            </button>
          )}
        </div>
        </div>
      </main>
    </div>
  );
}
