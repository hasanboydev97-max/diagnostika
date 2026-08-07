import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Clock, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import MeshGradient from '../components/ui/MeshGradient';
import { db, type DiagnosticTest } from '../lib/db';
import { generateDiagnosticSummary } from '../lib/gemini';

export default function DiagnosticTakeTest() {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();

  const [test, setTest] = useState<DiagnosticTest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [studentName, setStudentName] = useState('');
  const [hasStarted, setHasStarted] = useState(false);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadTest() {
      if (!testId) return;
      try {
        const found = await db.getDiagnosticTest(testId);
        if (!found) {
          setError('Test topilmadi.');
        } else {
          setTest(found);
          const savedProgress = localStorage.getItem(`diagnostic_progress_${testId}`);
          if (savedProgress) {
            try {
              setAnswers(JSON.parse(savedProgress));
            } catch (e) {
              console.error(e);
            }
          }
        }
      } catch (err) {
        setError('Xatolik yuz berdi.');
      } finally {
        setLoading(false);
      }
    }
    loadTest();
  }, [testId]);

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim()) {
      toast.error('Iltimos, ism va familiyangizni kiriting');
      return;
    }
    setHasStarted(true);
  };

  const handleOptionSelect = (option: string) => {
    const newAnswers = { ...answers, [currentIdx]: option };
    setAnswers(newAnswers);
    if (testId) {
      localStorage.setItem(`diagnostic_progress_${testId}`, JSON.stringify(newAnswers));
    }
  };

  const getWeight = (difficulty: string) => {
    if (difficulty === 'Qiyin') return 3;
    if (difficulty === "O'rta") return 2;
    return 1;
  };

  const handleSubmit = async () => {
    if (!test || !testId) return;
    setSubmitting(true);
    try {
      const questionResults: Record<number, boolean> = {};
      test.questions.forEach((q, idx) => {
        questionResults[q.blueprintId] = answers[idx] === q.correctOption;
      });

      const blueprint = test.blueprint;
      const categories = [...new Set(blueprint.map((q) => q.category))];
      const scores: Record<string, number> = {};
      
      categories.forEach(cat => {
        const catQuestions = blueprint.filter(q => q.category === cat);
        let earned = 0, maxPossible = 0;
        catQuestions.forEach(q => {
          const w = getWeight(q.difficulty);
          maxPossible += w;
          if (questionResults[q.id]) earned += w;
        });
        scores[cat] = maxPossible > 0 ? Math.round((earned / maxPossible) * 100) : 0;
      });
      
      const totalScore = Math.round(Object.values(scores).reduce((a, b) => a + b, 0) / Object.values(scores).length);

      const summary = await generateDiagnosticSummary(
        studentName,
        test.grade,
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
        grade: test.grade,
        blueprintSnapshot: blueprint,
        scores,
        totalScore,
        questionResults,
        aiSummaryText: summary.summary,
        aiAdviceText: summary.advice,
        aiRoadmap: summary.roadmap || undefined,
        createdAt: new Date().toISOString()
      });

      localStorage.removeItem(`diagnostic_progress_${testId}`);
      toast.success('Test muvaffaqiyatli yakunlandi!');
      navigate(`/summary/${resultId}`);

    } catch (err) {
      console.error(err);
      toast.error('Natijani saqlashda xatolik yuz berdi');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center font-display">
        <Loader2 className="w-8 h-8 animate-spin text-black" />
      </div>
    );
  }

  if (error || !test) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex flex-col items-center justify-center font-display p-4">
        <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold mb-4">{error || 'Test topilmadi'}</h1>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-3 bg-black text-white rounded-2xl hover:bg-black/90 transition-colors"
        >
          Bosh sahifaga qaytish
        </button>
      </div>
    );
  }

  if (!hasStarted) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex flex-col items-center justify-center p-4 font-display relative overflow-hidden">
        <MeshGradient />
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] w-full max-w-md relative z-10"
        >
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center shadow-lg shadow-black/20">
              <span className="text-white font-bold text-2xl">HB.</span>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-center mb-2">Diagnostika Testi</h1>
          <p className="text-gray-500 text-center mb-8">{test.grade}-sinf uchun</p>
          
          <form onSubmit={handleStart} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ism va Familiyangiz
              </label>
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="Masalan: Ali Valiyev"
                className="w-full p-4 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black transition-all"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full p-4 bg-black text-white rounded-2xl font-medium hover:bg-black/90 transition-colors flex justify-center items-center gap-2"
            >
              Testni boshlash
              <ArrowRight className="w-5 h-5" />
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  if (submitting) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex flex-col items-center justify-center font-display p-4">
        <Loader2 className="w-10 h-10 animate-spin text-black mb-4" />
        <h2 className="text-xl font-medium animate-pulse">Natijalar hisoblanmoqda...</h2>
        <p className="text-gray-500 mt-2 text-center max-w-sm">Sun'iy intellekt sizning javoblaringizni tahlil qilmoqda. Bu biroz vaqt olishi mumkin.</p>
      </div>
    );
  }

  const currentQuestion = test.questions[currentIdx];
  const currentBlueprint = test.blueprint.find(b => b.id === currentQuestion.blueprintId);
  const totalQuestions = test.questions.length;
  const isLast = currentIdx === totalQuestions - 1;
  const progress = ((currentIdx + 1) / totalQuestions) * 100;

  const getDifficultyColor = (diff?: string) => {
    if (diff === 'Oson') return 'bg-green-100 text-green-700';
    if (diff === "O'rta") return 'bg-yellow-100 text-yellow-700';
    if (diff === 'Qiyin') return 'bg-red-100 text-red-700';
    return 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] font-display flex flex-col">
      {/* Top Bar */}
      <div className="bg-white sticky top-0 z-50 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="h-1 bg-gray-100 w-full">
          <motion.div 
            className="h-full bg-black"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <div className="max-w-4xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-black text-white px-4 py-2 rounded-xl font-medium">
              {currentIdx + 1} / {totalQuestions}
            </div>
            {currentBlueprint && (
              <span className={`px-3 py-1 rounded-lg text-sm font-medium ${getDifficultyColor(currentBlueprint.difficulty)}`}>
                {currentBlueprint.difficulty}
              </span>
            )}
          </div>
          <div className="text-sm text-gray-500 font-medium">
            {currentBlueprint?.category}
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-8 flex flex-col lg:flex-row gap-8">
        
        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIdx}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-3xl p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] mb-6 flex-1"
            >
              <h2 className="text-xl md:text-2xl font-medium leading-relaxed mb-8">
                {currentQuestion.questionText}
              </h2>

              <div className="space-y-4">
                {currentQuestion.options.map((option, idx) => {
                  const isSelected = answers[currentIdx] === option;
                  const letter = String.fromCharCode(65 + idx); // A, B, C, D
                  
                  return (
                    <button
                      key={idx}
                      onClick={() => handleOptionSelect(option)}
                      className={`w-full text-left p-4 rounded-2xl border-2 transition-all duration-200 flex items-center gap-4 group ${
                        isSelected
                          ? 'border-black bg-black text-white shadow-lg shadow-black/10'
                          : 'border-transparent bg-[#F5F5F7] hover:bg-gray-200 text-black'
                      }`}
                    >
                      <div className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center font-bold text-lg transition-colors ${
                        isSelected ? 'bg-white text-black' : 'bg-white text-black group-hover:bg-black group-hover:text-white shadow-sm'
                      }`}>
                        {letter}
                      </div>
                      <span className="text-lg flex-1">{option}</span>
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="shrink-0"
                        >
                          <Check className="w-6 h-6 text-white" />
                        </motion.div>
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex flex-wrap items-center justify-between gap-4 mt-auto">
            <button
              onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
              disabled={currentIdx === 0}
              className="p-4 rounded-2xl bg-white text-black font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              Oldingi
            </button>
            
            {isLast ? (
              <button
                onClick={handleSubmit}
                disabled={Object.keys(answers).length !== totalQuestions}
                className="p-4 px-8 rounded-2xl bg-black text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-black/90 transition-colors shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center gap-2"
              >
                Yakunlash
                <Check className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={() => setCurrentIdx(prev => Math.min(totalQuestions - 1, prev + 1))}
                className="p-4 rounded-2xl bg-black text-white font-medium hover:bg-black/90 transition-colors shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center gap-2"
              >
                Keyingi
                <ArrowRight className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Sidebar / Grid */}
        <div className="w-full lg:w-72">
          <div className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sticky top-24">
            <h3 className="font-medium text-lg mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Savollar paneli
            </h3>
            <div className="grid grid-cols-5 gap-2">
              {test.questions.map((_, idx) => {
                const isAnswered = !!answers[idx];
                const isCurrent = currentIdx === idx;
                
                return (
                  <button
                    key={idx}
                    onClick={() => setCurrentIdx(idx)}
                    className={`
                      w-10 h-10 rounded-xl text-sm font-medium transition-all duration-200 flex items-center justify-center
                      ${isCurrent ? 'ring-2 ring-black ring-offset-2' : ''}
                      ${isAnswered 
                        ? 'bg-black text-white' 
                        : 'bg-[#F5F5F7] text-gray-500 hover:bg-gray-200'}
                    `}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
            
            <div className="mt-8 space-y-3 text-sm">
              <div className="flex items-center gap-3 text-gray-600">
                <div className="w-4 h-4 rounded-md bg-black"></div>
                Belgilangan
              </div>
              <div className="flex items-center gap-3 text-gray-600">
                <div className="w-4 h-4 rounded-md bg-[#F5F5F7]"></div>
                Belgilanmagan
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
