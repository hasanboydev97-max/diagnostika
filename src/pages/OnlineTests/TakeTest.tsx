import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft, AlertTriangle, Swords } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import MagicButton from '../../components/MagicButton';
import confetti from 'canvas-confetti';
import FormattedText from '../../components/FormattedText';
import MeshGradient from '../../components/ui/MeshGradient';

import { db } from '../../lib/db';
import { generateDiagnosticSummary } from '../../lib/gemini';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// ─── Helpers defined outside component ───────────────────────────────────────

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function TimerRing({ timeLeft, totalTime }: { timeLeft: number; totalTime: number }) {
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const ratio = Math.min(timeLeft / Math.max(totalTime, 1), 1);
  const dashOffset = circumference * (1 - ratio);
  const isUrgent = timeLeft <= 60;
  const isCritical = timeLeft <= 10;

  return (
    <div className={`flex items-center gap-2 ${isUrgent ? 'text-red-500' : 'text-black'}`}>
      <div className={isCritical ? 'animate-pulse' : ''}>
        <svg width="40" height="40" viewBox="0 0 40 40">
          <circle
            cx="20" cy="20" r={radius} fill="none"
            stroke="currentColor" strokeOpacity="0.15" strokeWidth="2.5"
          />
          <circle
            cx="20" cy="20" r={radius} fill="none"
            stroke={isUrgent ? '#ef4444' : '#111'}
            strokeWidth="2.5"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            transform="rotate(-90 20 20)"
            style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s ease' }}
          />
        </svg>
      </div>
      <span className="text-[11px] font-bold uppercase tracking-[0.2em]">
        {formatTime(timeLeft)}
      </span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

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

  // Custom cursor
  const [mousePosition, setMousePosition] = useState({ x: -100, y: -100 });
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    const onMove = (e: MouseEvent) => setMousePosition({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  const violations = useRef(0);
  const submitRef = useRef(false);
  const milestonesFired = useRef<Set<number>>(new Set());
  const totalTimeRef = useRef<number>(0);

  const SAVE_KEY = `test_progress_${testId}`;

  // Auto-restore from localStorage
  useEffect(() => {
    fetchTest();
    const saved = localStorage.getItem(SAVE_KEY);
    if (saved) {
      try {
        const p = JSON.parse(saved);
        if (p.studentName) setStudentName(p.studentName);
        if (p.answers) setAnswers(p.answers);
        if (p.timeLeft) setTimeLeft(p.timeLeft);
        if (p.started) setStarted(p.started);
        if (p.currentQIndex) setCurrentQIndex(p.currentQIndex);
      } catch (e) {
        console.warn("Keshni o'qishda xatolik", e);
      }
    }
  }, [testId]);

  // Auto-save to localStorage
  useEffect(() => {
    if (started && test?.questions) {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        studentName, answers, timeLeft, started, currentQIndex, shuffledQuestions: test.questions
      }));
    }
  }, [answers, timeLeft, started, studentName, currentQIndex, test?.questions]);

  const fetchTest = async () => {
    try {
      let fetchedTest = null;
      if (testId) {
        const localTest = await db.getDiagnosticTest(testId);
        if (localTest) {
          fetchedTest = {
            ...localTest,
            isDiagnostic: true,
            title: `${localTest.grade}-sinf Diagnostika Testi`,
            subject: 'Diagnostika'
          };
        }
      }
      
      if (!fetchedTest) {
        const res = await fetch(`${API_URL}/online-tests/${testId}`);
        if (!res.ok) throw new Error('Test not found');
        fetchedTest = await res.json();
      }

      // Check localStorage for previously shuffled questions
      const saved = localStorage.getItem(SAVE_KEY);
      let previouslyShuffled = null;
      if (saved) {
        try {
          const p = JSON.parse(saved);
          if (p.shuffledQuestions) {
            previouslyShuffled = p.shuffledQuestions;
          }
        } catch (e) {}
      }

      if (previouslyShuffled) {
        fetchedTest.questions = previouslyShuffled;
      } else if (fetchedTest.questions) {
        // Shuffle questions and their options for new test taker
        const shuffleArray = (arr: any[]) => {
          const shuffled = [...arr];
          for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
          }
          return shuffled;
        };
        
        fetchedTest.questions = shuffleArray(fetchedTest.questions).map((q: any) => ({
          ...q,
          options: Array.isArray(q.options) ? shuffleArray(q.options) : q.options
        }));
      }

      setTest(fetchedTest);
      checkTimeLimit(fetchedTest);
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
    if (testData.startTime && now < new Date(testData.startTime)) setTimeStatus('early');
    else if (testData.endTime && now > new Date(testData.endTime)) setTimeStatus('closed');
    else setTimeStatus('open');
  };

  const handleStart = async () => {
    if (!studentName.trim()) {
      toast.error("Iltimos ismingizni kiriting.");
      return;
    }
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch (err) {
      console.warn('Fullscreen failed', err);
    }
    if (test.durationMinutes && timeLeft === null) {
      const totalSecs = test.durationMinutes * 60;
      setTimeLeft(totalSecs);
      totalTimeRef.current = totalSecs;
    } else if (timeLeft !== null && totalTimeRef.current === 0) {
      totalTimeRef.current = timeLeft;
    }
    setStarted(true);
  };

  // Countdown timer
  useEffect(() => {
    if (!started || timeLeft === null || timeLeft <= 0 || submitting) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
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

  // Anti-cheat: tab/window switch detection
  useEffect(() => {
    if (!started) return;

    const handleViolation = () => {
      if (submitting) return;
      violations.current += 1;
      
      if (violations.current === 1) {
        toast.error("OGOHLANTIRISH: Iltimos, test vaqtida boshqa oynaga o'tmang! Yana bir marta takrorlansa test yakunlanadi.", {
          duration: 6000,
          position: 'top-center',
          style: { background: '#f59e0b', color: '#fff', border: 'none' } // warning color
        });
      } else {
        toast.error("QOIDABUZARLIK! Oynani qayta tark etganingiz sababli test majburiy yakunlandi.", {
          duration: 5000,
          position: 'top-center'
        });
        handleSubmit(true);
      }
    };

    const onVisibility = () => { if (document.hidden) handleViolation(); };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', handleViolation);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', handleViolation);
    };
  }, [started, answers]);

  // 🎉 Milestone confetti: 25%, 50%, 75%, 100% javob berilganda
  useEffect(() => {
    if (!started || !test?.questions) return;
    const total = test.questions.length;
    const answered = Object.keys(answers).length;
    if (answered === 0) return;

    const milestone = Math.floor((answered / total) * 4) * 25;
    if (milestone > 0 && !milestonesFired.current.has(milestone)) {
      milestonesFired.current.add(milestone);
      confetti({
        particleCount: 35,
        spread: 50,
        origin: { y: 0.15, x: 0.5 },
        colors: ['#000', '#333', '#555', '#888'],
        scalar: 0.8
      });
      const msgs: Record<number, string> = {
        25: '🚀 Yaxshi ketmoqdasiz!',
        50: '💪 Yarimiga yetdingiz!',
        75: '⚡ Deyarli tugadi!',
        100: '🎯 Barcha savollarga javob berdingiz!'
      };
      if (msgs[milestone]) toast.success(msgs[milestone], { duration: 2000, position: 'bottom-center' });
    }
  }, [answers, started, test]);

  const handleSelectOption = (option: string) => {
    setAnswers(prev => ({ ...prev, [currentQIndex]: option }));
  };

  const isAnswerCorrect = (userAns: string | undefined, correctOpt: string | undefined, options: string[] = []): boolean => {
    if (!userAns || !correctOpt) return false;
    const u = String(userAns).trim().toLowerCase();
    const c = String(correctOpt).trim().toLowerCase();
    if (u === c) return true;
    const lm: Record<string, number> = { a: 0, b: 1, c: 2, d: 3 };
    if (lm[c] !== undefined && options[lm[c]]) {
      if (String(options[lm[c]]).trim().toLowerCase() === u) return true;
    }
    if (lm[u] !== undefined && options[lm[u]]) {
      if (String(options[lm[u]]).trim().toLowerCase() === c) return true;
    }
    return false;
  };

  const handleSubmit = async (isForced = false) => {
    if (submitRef.current) return;
    if (!isForced) {
      const answeredCount = Object.keys(answers).length;
      if (answeredCount < test.questions.length) {
        const ok = window.confirm(`${test.questions.length} ta savoldan faqat ${answeredCount} tasiga javob berdingiz. Baribir yakunlaysizmi?`);
        if (!ok) return;
      }
    }

    setSubmitting(true);
    submitRef.current = true;
    const toastId = toast.loading('Javoblaringiz tekshirilmoqda...');

    // Diagnostic test path
    if (test.isDiagnostic || test.type === 'diagnostic') {
      try {
        const questionResults: Record<number, boolean> = {};
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
            difficulty: q.difficulty || "O'rta",
            timeEstimate: '1min'
          };
        });
        test.questions.forEach((q: any, i: number) => {
          questionResults[blueprint[i].id] = isAnswerCorrect(answers[i], q.correctOption, q.options || []);
        });
        const categories = [...new Set(blueprint.map((q: any) => q.category))] as string[];
        const scores: Record<string, number> = {};
        categories.forEach(cat => {
          const qs = blueprint.filter((q: any) => q.category === cat);
          let earned = 0, max = 0;
          qs.forEach((q: any) => {
            const w = q.difficulty === 'Qiyin' ? 3 : q.difficulty === "O'rta" ? 2 : 1;
            max += w;
            if (questionResults[q.id]) earned += w;
          });
          scores[cat] = max > 0 ? Math.round((earned / max) * 100) : 0;
        });
        const totalScore = Math.round(Object.values(scores).reduce((a, b) => a + b, 0) / (Object.values(scores).length || 1));
        toast.loading('AI Diagnostik xulosa yaratilmoqda...', { id: toastId });
        const summaryResponse = await generateDiagnosticSummary(studentName, test.grade || '5', scores, questionResults, blueprint);
        const resultId = Math.floor(100000 + Math.random() * 900000).toString();
        const pin = Math.floor(1000 + Math.random() * 9000).toString();
        await db.saveResult({
          id: resultId, pin, studentName, grade: test.grade || '5',
          blueprintSnapshot: blueprint, scores, totalScore, questionResults,
          aiSummaryText: summaryResponse.summary, aiAdviceText: summaryResponse.advice,
          aiRoadmap: summaryResponse.roadmap || undefined,
          createdAt: new Date().toISOString()
        });
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
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

    // Regular test path
    let score = 0;
    test.questions.forEach((q: any, i: number) => {
      if (isAnswerCorrect(answers[i], q.correctOption, q.options || [])) score++;
    });

    const resultId = 'res_' + Date.now().toString();
    const resultPayload = {
      id: resultId, testId,
      studentName: studentName + (isForced ? ' (Qoidabuzarlik)' : ''),
      answers, score, totalScore: test.questions.length,
      questions: test.questions, testTitle: test.title,
      createdAt: new Date().toISOString()
    };

    try {
      const res = await fetch(`${API_URL}/online-test-results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resultPayload)
      });
      if (!res.ok) {
        let errMsg = 'Server xatosi';
        try { const d = await res.json(); errMsg = d.error || errMsg; } catch { errMsg = `Server xatosi (${res.status})`; }
        throw new Error(errMsg);
      }
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      localStorage.removeItem(SAVE_KEY);
      try { sessionStorage.setItem(`result_${resultId}`, JSON.stringify(resultPayload)); } catch {}
      toast.success('Test muvaffaqiyatli yakunlandi!', { id: toastId });
      navigate(`/online-tests/results/${resultId}`, { state: { resultData: resultPayload } });
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Xatolik yuz berdi. Iltimos qayta urinib ko'ring.", { id: toastId });
      setSubmitting(false);
      submitRef.current = false;
    }
  };

  // ─── Render States ────────────────────────────────────────────────────────

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
      <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-3 md:p-6 text-[#111111] cursor-none">
        <MeshGradient />
        <div className="bg-[#fdfdfd] shadow-2xl rounded-[2.5rem] p-12 max-w-sm w-full text-center relative z-10">
          <h1 className="text-xl font-medium text-black mb-2 tracking-tight">Test hali ochilmagan</h1>
          <p className="text-gray-500 text-sm mb-8 leading-relaxed">
            Ushbu test <strong>{new Date(test.startTime).toLocaleString('uz-UZ')}</strong> sanasida ochiladi.
          </p>
          <button onClick={() => navigate('/online-tests')} className="text-[10px] font-bold uppercase tracking-[0.2em] text-black border-b border-black pb-1 hover:text-gray-500 transition-colors">
            Ortga qaytish
          </button>
        </div>
      </div>
    );
  }

  if (timeStatus === 'closed') {
    return (
      <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-3 md:p-6 text-[#111111] cursor-none">
        <MeshGradient />
        <div className="bg-[#fdfdfd] shadow-2xl rounded-[2.5rem] p-12 max-w-sm w-full text-center relative z-10">
          <AlertTriangle className="mx-auto text-black mb-6" size={40} strokeWidth={1.5} />
          <h1 className="text-xl font-medium text-black mb-2 tracking-tight">Test yopilgan</h1>
          <p className="text-gray-500 text-sm mb-8 leading-relaxed">Ushbu test qabul qilishni to'xtatgan.</p>
          <button onClick={() => navigate('/online-tests')} className="text-[10px] font-bold uppercase tracking-[0.2em] text-black border-b border-black pb-1 hover:text-gray-500 transition-colors">
            Ortga qaytish
          </button>
        </div>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-3 md:p-6 font-sans text-[#111111] selection:bg-black selection:text-white cursor-none">
        <MeshGradient />
        <motion.div
          className="hidden md:block fixed top-0 left-0 w-16 h-16 rounded-full bg-white mix-blend-difference pointer-events-none z-[9999]"
          animate={{ x: mousePosition.x - 32, y: mousePosition.y - 32, scale: isHovering ? 1.5 : 1 }}
          transition={{ type: "spring", stiffness: 150, damping: 15, mass: 0.1 }}
        />
        <div className="bg-white/60 backdrop-blur-xl border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-5 md:p-10 rounded-2xl md:rounded-[2rem] max-w-lg w-full relative z-10">
          <button onClick={() => navigate('/online-tests')} onMouseEnter={() => setIsHovering(true)} onMouseLeave={() => setIsHovering(false)}
            className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 hover:text-black transition-colors mb-10">
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
            Testni boshlagach, boshqa oynaga o'tish qat'iyan man etiladi.
          </div>
          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-[0.2em] mb-3">To'liq ismingizni kiriting</label>
              <input type="text" value={studentName} onChange={e => setStudentName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleStart()}
                onMouseEnter={() => setIsHovering(true)} onMouseLeave={() => setIsHovering(false)}
                className="w-full px-5 py-4 bg-white/50 border border-white/50 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:bg-white/80 focus:border-black/20 transition-colors shadow-sm"
                placeholder="Masalan: Aliyev Vali" autoFocus />
            </div>
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-center w-full">
              <MagicButton
                onClick={handleStart}
                label="Yolg'iz Boshlash"
                className="w-full sm:w-auto"
              />
              <MagicButton
                onClick={() => {
                  if (!studentName.trim()) {
                    toast.error("Iltimos, avval ismingizni kiriting!");
                    return;
                  }
                  navigate('/duel', { state: { testId, title: test.title, isCreator: true, studentName } });
                }}
                label="Duyel Yaratish (1v1)"
                icon={<Swords />}
                variant="danger"
                className="w-full sm:w-auto"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Active Test UI (Vercel Light Compact - Commit 4cd7208) ───────────────

  const currentQ = test.questions[currentQIndex];
  const progress = ((currentQIndex + 1) / test.questions.length) * 100;

  return (
    <div
      className="min-h-screen bg-white text-zinc-900 font-sans flex flex-col select-none selection:bg-zinc-200 selection:text-black"
      onCopy={e => e.preventDefault()}
      onCut={e => e.preventDefault()}
      onPaste={e => e.preventDefault()}
      onContextMenu={e => e.preventDefault()}
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
              <TimerRing timeLeft={timeLeft} totalTime={totalTimeRef.current || timeLeft} />
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

                let btnClass = "w-full aspect-square rounded text-[11px] font-semibold transition-all flex items-center justify-center border cursor-pointer ";
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
                  className={`w-full text-left px-4 py-3 rounded-md border text-sm transition-all flex items-center gap-3 group cursor-pointer ${
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

          {/* Footer Navigation */}
          <div className="mt-12 flex items-center justify-between pt-4 border-t border-zinc-100">
            <button
              onClick={() => setCurrentQIndex(prev => Math.max(0, prev - 1))}
              disabled={currentQIndex === 0}
              className="px-4 py-3 md:py-1.5 min-h-[44px] text-xs font-semibold uppercase tracking-wider text-zinc-500 disabled:opacity-30 hover:text-zinc-900 transition-colors cursor-pointer"
            >
              Oldingi
            </button>

            {currentQIndex < test.questions.length - 1 ? (
              <button
                onClick={() => setCurrentQIndex(prev => prev + 1)}
                className="px-5 py-3 md:py-2 min-h-[44px] bg-zinc-100 border border-zinc-200 text-zinc-900 rounded-md text-xs font-semibold uppercase tracking-wider hover:bg-zinc-200 transition-colors cursor-pointer"
              >
                Keyingi
              </button>
            ) : (
              <button
                onClick={() => handleSubmit(false)}
                disabled={submitting}
                className="inline-flex items-center gap-2 px-5 py-3 md:py-2 min-h-[44px] bg-zinc-900 text-white rounded-md text-xs font-semibold uppercase tracking-wider hover:bg-zinc-800 transition-colors cursor-pointer disabled:opacity-70"
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



