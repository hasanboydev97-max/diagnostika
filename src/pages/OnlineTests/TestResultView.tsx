import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Loader2, ArrowLeft, BrainCircuit, CheckCircle2, XCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { motion } from 'framer-motion';
import FormattedText from '../../components/FormattedText';
import MeshGradient from '../../components/ui/MeshGradient';
// ✅ 11. DRY: isAnswerCorrect umumiy moduldan import qilinadi — takrorlanmaydi
import { isAnswerCorrect } from '../../utils/scoring';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function getScoreLabel(pct: number) {
  if (pct >= 90) return { text: 'MUKAMMAL! 🎉', color: 'text-green-600' };
  if (pct >= 70) return { text: "A'lo natija! ✨", color: 'text-blue-600' };
  if (pct >= 50) return { text: 'Yaxshi! 👍', color: 'text-yellow-600' };
  return { text: "Harakat qiling! 💪", color: 'text-orange-500' };
}

function formatStudentName(name: string) {
  if (!name) return "O'quvchi";
  return name.charAt(0).toUpperCase() + name.slice(1);
}


export default function TestResultView() {
  const { resultId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [result, setResult] = useState<any>(() => {
    if (location.state?.resultData) return location.state.resultData;
    if (resultId) {
      const cached = sessionStorage.getItem(`result_${resultId}`);
      if (cached) { try { return JSON.parse(cached); } catch {} }
    }
    return null;
  });

  const [test, setTest] = useState<any>(() => {
    if (location.state?.resultData?.questions) {
      return { title: location.state.resultData.testTitle || 'Onlayn Test', questions: location.state.resultData.questions };
    }
    if (resultId) {
      const cached = sessionStorage.getItem(`result_${resultId}`);
      if (cached) {
        try {
          const p = JSON.parse(cached);
          if (p.questions) return { title: p.testTitle || 'Onlayn Test', questions: p.questions };
        } catch {}
      }
    }
    return null;
  });

  const [loading, setLoading] = useState(!result);
  const [displayedScore, setDisplayedScore] = useState(0);
  // ✅ 15. Xato holati — foydalanuvchiga ko'rsatish uchun
  const [fetchError, setFetchError] = useState<string | null>(null);
  const confettiFired = useRef(false);

  useEffect(() => { fetchResult(); }, [resultId]);

  // ── Animated score counter (0 → target in ~1.2s) ─────────────────────────
  useEffect(() => {
    if (!result) return;
    const target = Math.round((result.score / (result.totalScore || 1)) * 100);
    let current = 0;
    const totalFrames = 60;
    const inc = target / totalFrames;
    const timer = setInterval(() => {
      current += inc;
      if (current >= target) { setDisplayedScore(target); clearInterval(timer); }
      else setDisplayedScore(Math.floor(current));
    }, 20);
    return () => clearInterval(timer);
  }, [result]);

  // ── Score-based confetti ──────────────────────────────────────────────────
  useEffect(() => {
    if (!result || confettiFired.current) return;
    confettiFired.current = true;
    const pct = Math.round((result.score / (result.totalScore || 1)) * 100);
    if (pct >= 90) {
      confetti({ particleCount: 200, spread: 100, origin: { y: 0.5 }, colors: ['#000', '#333', '#666'] });
      setTimeout(() => confetti({ particleCount: 80, spread: 120, origin: { y: 0.4, x: 0.15 }, colors: ['#000', '#555'] }), 500);
      setTimeout(() => confetti({ particleCount: 80, spread: 120, origin: { y: 0.4, x: 0.85 }, colors: ['#000', '#555'] }), 900);
    } else if (pct >= 70) {
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#000', '#333', '#666'] });
    }
  }, [result]);

  const fetchResult = async (retryCount = 0) => {
    try {
      let res = await fetch(`${API_URL}/online-test-results/${resultId}`);
      if (!res.ok) {
        res = await fetch(`${API_URL}/results/${resultId}`);

      }
      if (res.ok) {
        const data = await res.json();
        setResult(data);
        let testData = null;
        if (data.questions && data.questions.length > 0) {
          testData = { title: data.testTitle || 'Onlayn Test', questions: data.questions };
        } else if (data.testId) {
          try {
            const tr = await fetch(`${API_URL}/online-tests/${data.testId}`);
            if (tr.ok) testData = await tr.json();
          } catch (e) { console.warn("Test fetch failed", e); }
        } else if (data.blueprintSnapshot && data.blueprintSnapshot.length > 0) {
          testData = {
            title: data.grade ? `${data.grade}-sinf Diagnostikasi` : 'Diagnostika',
            questions: data.blueprintSnapshot.map((b: any) => ({
              questionText: b.topic,
              subtopic: b.category,
              correctOption: 'A',
              options: ['A', 'B', 'C', 'D']
            }))
          };
        }
        setTest(testData);
      } else if (retryCount < 2) {
        setTimeout(() => fetchResult(retryCount + 1), 800);
        return;
      }
    } catch (error: any) {
      console.error(error);
      setFetchError(error.message || 'Xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !result) return (
    <div className="min-h-screen relative overflow-hidden bg-[#fdfdfd] flex items-center justify-center">
      <MeshGradient />
      <Loader2 className="animate-spin text-gray-400 relative z-10" size={32} />
    </div>
  );

  // ✅ 15. Foydalanuvchiga xatoni aniq ko'rsatish
  if (fetchError && !result) return (
    <div className="min-h-screen relative overflow-hidden bg-[#fdfdfd] flex flex-col items-center justify-center text-[#111111]">
      <MeshGradient />
      <div className="bg-red-50 backdrop-blur-xl border border-red-200 shadow-md p-4 md:p-8 rounded-2xl relative z-10 text-center">
        <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-medium mb-2 text-red-700">Xatolik yuz berdi</h2>
        <p className="text-red-600 mb-4">{fetchError}</p>
        <button onClick={() => window.location.reload()} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
          Qayta urinish
        </button>
      </div>
    </div>
  );

  if (!result) return (
    <div className="min-h-screen relative overflow-hidden bg-[#fdfdfd] flex flex-col items-center justify-center text-[#111111]">
      <MeshGradient />
      <div className="bg-white/60 backdrop-blur-xl border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-4 md:p-8 rounded-2xl relative z-10 text-center">
        <h2 className="text-xl font-medium mb-4 text-black">Natija topilmadi</h2>
        <button onClick={() => navigate('/online-tests')} className="text-sm font-medium hover:underline text-gray-500 hover:text-black">
          Dashboard'ga qaytish
        </button>
      </div>
    </div>
  );

  const activeTest = test || (result?.questions ? { title: result.testTitle || 'Onlayn Test', questions: result.questions } : { title: result?.testTitle || 'Onlayn Test', questions: [] });
  const percentage = Math.round((result.score / (result.totalScore || 1)) * 100);
  const scoreLabel = getScoreLabel(percentage);

  // Topic data
  const topicStats: Record<string, { total: number; correct: number }> = {};
  (activeTest?.questions || []).forEach((q: any, i: number) => {
    const topic = q.subtopic || 'Umumiy';
    if (!topicStats[topic]) topicStats[topic] = { total: 0, correct: 0 };
    topicStats[topic].total += 1;
    if (isAnswerCorrect((result.answers || {})[i], q.correctOption, q.options || [])) topicStats[topic].correct += 1;
  });
  const chartData = Object.keys(topicStats)
    .map(topic => ({
      subject: topic,
      Olashtirish: Math.round((topicStats[topic].correct / (topicStats[topic].total || 1)) * 100),
    }))
    .sort((a, b) => b.Olashtirish - a.Olashtirish);

  return (
    <div className="min-h-screen relative overflow-x-hidden font-sans pb-20 bg-[#fdfdfd] text-[#111111]">
      <MeshGradient />
      <div className="max-w-7xl mx-auto px-3 md:px-6 py-6 md:py-12 relative z-10">

        <button onClick={() => navigate('/online-tests')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-10">
          <ArrowLeft size={16} /> Dashboard
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">

          {/* ── Main Info Card ── */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-2 bg-white/60 backdrop-blur-xl rounded-[2rem] border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-4 md:p-8 flex flex-col h-full"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 border-b border-black/10 pb-8 mb-8">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-500 mb-1">{activeTest?.title || 'Onlayn Test'}</p>
                <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-gray-900 mb-2">
                  {formatStudentName(result.studentName)} Natijalari
                </h1>
                {/* Score label — appears after counter finishes */}
                <motion.p
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.4, duration: 0.4 }}
                  className={`text-lg font-bold ${scoreLabel.color}`}
                >
                  {scoreLabel.text}
                </motion.p>
              </div>

              {/* Animated Score Badge */}
              <div className="flex items-center gap-4 bg-white/50 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/50 shadow-sm">
                <div className="text-center">
                  <motion.span
                    className="block text-3xl font-bold text-black tabular-nums"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
                  >
                    {displayedScore}%
                  </motion.span>
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Foiz</span>
                </div>
                <div className="w-px h-10 bg-gray-200 mx-2"></div>
                <div className="text-center">
                  <span className="block text-xl font-semibold text-gray-700">{result.score} / {result.totalScore}</span>
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">To'g'ri</span>
                </div>
              </div>
            </div>

            {/* AI Feedback */}
            <div className="flex-1 flex flex-col justify-end">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
                <BrainCircuit size={16} className="text-gray-500" /> AI Xulosasi
              </h3>
              <p className="text-gray-600 text-sm md:text-base leading-relaxed whitespace-pre-wrap bg-blue-50/50 p-5 rounded-xl border border-blue-100 h-full">
                {result.aiFeedback || "Natijangiz saqlandi! AI batafsil tavsiyalarni shakllantirmoqda..."}
              </p>
            </div>
          </motion.div>

          {/* ── Chart Card ── */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-1 bg-white rounded-2xl border border-gray-200 shadow-sm p-5 md:p-8 flex flex-col h-[500px]"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Mavzular Tahlili</h3>
            <p className="text-xs text-gray-500 mb-6 shrink-0">Qaysi sohalarda kamchiliklar borligini aniqlang</p>
            
            <div className="flex-1 w-full overflow-y-auto pr-2 space-y-6 custom-scrollbar">
              {chartData.length === 0 ? (
                <p className="text-sm text-gray-400 italic">Ma'lumot yo'q</p>
              ) : (
                chartData.map((entry, index) => {
                  const color = entry.Olashtirish < 50 ? 'bg-red-500' : entry.Olashtirish < 80 ? 'bg-yellow-500' : 'bg-green-500';
                  return (
                    <div key={index} className="flex flex-col gap-2">
                      <div className="flex justify-between items-end gap-4">
                        <span className="text-sm font-medium text-gray-700 leading-tight">{entry.subject}</span>
                        <span className="text-xs font-bold text-gray-900">{entry.Olashtirish}%</span>
                      </div>
                      <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${entry.Olashtirish}%` }}
                          transition={{ duration: 1, delay: 0.2 + index * 0.05, ease: "easeOut" }}
                          className={`h-full rounded-full ${color}`}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500"></span> Yomon</div>
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-yellow-500"></span> O'rtacha</div>
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500"></span> Yaxshi</div>
            </div>
          </motion.div>
        </div>

        {/* ── Staggered Question Results ── */}
        {(activeTest?.questions || []).length > 0 && (
          <div className="mt-12">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Savollar Bo'yicha Natijalar</h2>
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
              initial="hidden"
              animate="visible"
              variants={{ visible: { transition: { staggerChildren: 0.045, delayChildren: 0.25 } } }}
            >
              {(activeTest?.questions || []).map((q: any, i: number) => {
                const studentAns = (result.answers || {})[i];
                const isCorrect = isAnswerCorrect(studentAns, q.correctOption, q.options || []);

                return (
                  <motion.div
                    key={i}
                    variants={{
                      hidden: { opacity: 0, y: 18 },
                      visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 130, damping: 22 } }
                    }}
                    className={`bg-white p-4 md:p-6 rounded-xl border shadow-sm flex flex-col ${
                      isCorrect ? 'border-green-100' : 'border-red-100'
                    }`}
                  >
                    <div className="flex gap-4 items-start mb-4">
                      <motion.div
                        className="mt-0.5 shrink-0"
                        initial={{ scale: 0, rotate: -30 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", stiffness: 350, damping: 18, delay: 0.1 + i * 0.04 }}
                      >
                        {isCorrect
                          ? <CheckCircle2 className="text-green-500" size={20} />
                          : <XCircle className="text-red-500" size={20} />
                        }
                      </motion.div>
                      <div>
                        <span className="text-[10px] font-bold tracking-wider uppercase text-gray-400 mb-1 block">
                          {q.subtopic || 'Umumiy'}
                        </span>
                        <h4 className="text-base font-sans font-medium text-gray-900 leading-snug">
                          {i + 1}. <FormattedText content={q.questionText} />
                        </h4>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-auto pl-9">
                      {(q.options || []).map((opt: string, oIndex: number) => {
                        const isStudentChoice = studentAns !== undefined && String(studentAns).trim().toLowerCase() === String(opt).trim().toLowerCase();
                        const isActuallyCorrect = isAnswerCorrect(opt, q.correctOption, q.options || []);
                        let cls = "px-3 py-2 rounded-md border text-sm transition-colors ";
                        if (isActuallyCorrect) cls += "bg-green-50 border-green-200 text-green-800 font-medium";
                        else if (isStudentChoice && !isCorrect) cls += "bg-red-50 border-red-200 text-red-800 font-medium";
                        else cls += "bg-white border-gray-100 text-gray-500";
                        return (
                          <div key={oIndex} className={cls}>
                            <FormattedText content={opt} />
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
