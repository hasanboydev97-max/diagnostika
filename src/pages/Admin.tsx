import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { db, type StudentResult } from '../lib/db';
import { generateDiagnosticSummary } from '../lib/gemini';
import { useNavigate } from 'react-router-dom';
import type { QuestionBlueprint } from '../lib/blueprint';
import { GRADE_BLUEPRINTS } from '../lib/gradeBlueprints';
import { Check, Settings2, Users, PlusCircle, ChevronDown, Sparkles, Scan, Printer } from 'lucide-react';
import BlueprintEditorModal from '../components/BlueprintEditorModal';
import AiTestCreatorModal from '../components/AiTestCreatorModal';
import MeshGradient from '../components/ui/MeshGradient';

export default function Admin() {
  const [activeTab, setActiveTab] = useState<'new' | 'dashboard'>('new');
  const [allResults, setAllResults] = useState<StudentResult[]>([]);
  
  const [studentName, setStudentName] = useState('');
  const [grade, setGrade] = useState('5');
  const [isSelectOpen, setIsSelectOpen] = useState(false);
  const [currentBlueprint, setCurrentBlueprint] = useState<QuestionBlueprint[]>(GRADE_BLUEPRINTS['5']);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [fastMode, setFastMode] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const [questionResults, setQuestionResults] = useState<Record<number, boolean>>(() => {
    const initial: Record<number, boolean> = {};
    GRADE_BLUEPRINTS['5'].forEach(q => initial[q.id] = false);
    return initial;
  });

  // Fast entry keyboard listener
  useEffect(() => {
    if (!fastMode || activeTab !== 'new') return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (document.activeElement?.tagName === 'INPUT') return;
      
      if (e.key === '1' || e.key === '0') {
        e.preventDefault();
        const currentQ = currentBlueprint[currentIndex];
        if (!currentQ) return;
        
        const isCorrect = e.key === '1';
        setQuestionResults(prev => ({
          ...prev,
          [currentQ.id]: isCorrect
        }));
        
        if (currentIndex < currentBlueprint.length - 1) {
          setCurrentIndex(prev => prev + 1);
        }
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        setCurrentIndex(prev => Math.max(0, prev - 1));
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        setCurrentIndex(prev => Math.min(currentBlueprint.length - 1, prev + 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fastMode, currentIndex, currentBlueprint, activeTab]);

  const [isLoading, setIsLoading] = useState(false);
  const [generatedCredentials, setGeneratedCredentials] = useState<{id: string, pin: string} | null>(null);
  const navigate = useNavigate();

  // Load blueprint when grade changes
  useEffect(() => {
    const loadBlueprint = async () => {
      const saved = await db.getBlueprint(grade);
      const bpToUse = saved || GRADE_BLUEPRINTS[grade] || GRADE_BLUEPRINTS['5'];
      setCurrentBlueprint(bpToUse);
      
      // Reset answers
      const initial: Record<number, boolean> = {};
      bpToUse.forEach(q => initial[q.id] = false);
      setQuestionResults(initial);
    };
    if (activeTab === 'new') loadBlueprint();
  }, [grade, activeTab]);

  // Load dashboard data
  useEffect(() => {
    if (activeTab === 'dashboard') {
      db.getAllResults().then(res => setAllResults(res));
    }
  }, [activeTab]);

  const handleSaveBlueprint = async (newBp: QuestionBlueprint[]) => {
    await db.saveBlueprint(grade, newBp);
    setCurrentBlueprint(newBp);
    setIsEditorOpen(false);
  };

  const handleToggleQuestion = (id: number) => {
    setQuestionResults(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const getWeight = (difficulty: string) => {
    if (difficulty === 'Qiyin') return 3;
    if (difficulty === "O'rta") return 2;
    return 1;
  };

  const calculateScores = () => {
    const scores: Record<string, number> = {};
    const categories = Array.from(new Set(currentBlueprint.map(q => q.category)));
    categories.forEach(category => {
      const qs = currentBlueprint.filter(q => q.category === category);
      if (qs.length === 0) {
        scores[category] = 0;
      } else {
        const totalWeight = qs.reduce((acc, q) => acc + getWeight(q.difficulty), 0);
        const earnedWeight = qs.reduce((acc, q) => {
          if (questionResults[q.id]) return acc + getWeight(q.difficulty);
          return acc;
        }, 0);
        scores[category] = Math.round((earnedWeight / totalWeight) * 100);
      }
    });
    return scores;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName) return alert("O'quvchi ismini kiriting!");

    setIsLoading(true);
    
    // Calculate individual category scores
    const calculatedScores = calculateScores();
    const categoriesCount = Object.keys(calculatedScores).length || 1;
    const totalScoreSum = Object.values(calculatedScores).reduce((a, b) => a + b, 0);
    const totalScore = Math.round(totalScoreSum / categoriesCount);
    
    // Call Gemini API
    const aiResponse = await generateDiagnosticSummary(studentName, grade, calculatedScores, questionResults, currentBlueprint);
    
    // Generate secure 6-digit ID and 4-digit PIN
    const uniqueId = Math.floor(100000 + Math.random() * 900000).toString();
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    
    // Save to DB (Hybrid Cloud/Local)
    await db.saveResult({
      id: uniqueId,
      pin,
      studentName,
      grade,
      scores: calculatedScores,
      questionResults,
      blueprintSnapshot: currentBlueprint,
      totalScore,
      aiSummaryText: aiResponse.summary,
      aiAdviceText: aiResponse.advice,
      aiRoadmap: aiResponse.roadmap,
      createdAt: new Date().toISOString(),
    });

    setGeneratedCredentials({ id: uniqueId, pin });
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen relative font-sans text-[#111111] selection:bg-black selection:text-white pb-20 overflow-x-hidden">
      <MeshGradient />
      
      <div className="max-w-[1600px] mx-auto px-[15px] sm:px-6 py-4 md:py-16 flex flex-col gap-6 md:gap-20 relative z-10">
        <div className="bg-white/60 backdrop-blur-xl border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-[15px] sm:p-8 md:p-12 rounded-2xl md:rounded-3xl">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 md:mb-8 gap-8 border-b border-black/10 pb-8">
          <div>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => navigate('/dashboard')}
                className="p-2 border border-black/10 hover:border-black rounded-lg transition-colors group"
                title="Dashboardga qaytish"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500 group-hover:text-black transition-colors">
                  <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
              </button>
              <h1 className="text-4xl md:text-5xl font-medium tracking-tight">Admin Panel</h1>
            </div>
            <p className="text-sm text-gray-500 mt-2 ml-14">O'quvchi natijalarini boshqarish va diagnostika yaratish.</p>
          </div>
          
          <div className="flex flex-wrap w-full md:w-auto gap-2">
            <button 
              onClick={() => navigate('/admin/omr-scanner')}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 rounded-xl font-bold text-xs uppercase tracking-wider transition-all"
              title="Kamera va ZipGrade orqali testlarni tekshirish"
            >
              <Scan className="w-4 h-4" /> OMR Skanner
            </button>
            <button 
              onClick={() => navigate('/admin/omr-generator')}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-black/10 text-neutral-700 hover:bg-neutral-50 rounded-xl font-bold text-xs uppercase tracking-wider transition-all"
              title="Test blankasini chop etish (PDF)"
            >
              <Printer className="w-4 h-4 text-neutral-500" /> Varaqa PDF
            </button>
            <button 
              onClick={() => setActiveTab('new')}
              className={`flex-1 md:flex-none flex items-center justify-center gap-3 px-5 py-3 font-semibold text-xs uppercase tracking-widest transition-all duration-300 rounded-xl border ${activeTab === 'new' ? 'bg-black text-white border-black shadow-sm' : 'bg-transparent text-gray-400 border-black/10 hover:border-black hover:text-black'}`}
            >
              <PlusCircle className="w-4 h-4" /> Qo'shish
            </button>
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`flex-1 md:flex-none flex items-center justify-center gap-3 px-5 py-3 font-semibold text-xs uppercase tracking-widest transition-all duration-300 rounded-xl border ${activeTab === 'dashboard' ? 'bg-black text-white border-black shadow-sm' : 'bg-transparent text-gray-400 border-black/10 hover:border-black hover:text-black'}`}
            >
              <Users className="w-4 h-4" /> Barchasi
            </button>
          </div>
        </div>

        {activeTab === 'dashboard' ? (
          <div className="space-y-4">
            {allResults.length === 0 ? (
              <div className="text-center py-16 text-[10px] tracking-widest uppercase font-semibold text-gray-400 border-b border-black/10">Hozircha natijalar yo'q.</div>
            ) : (
              <>
                {/* Mobile Cards View */}
                <div className="grid grid-cols-1 gap-6 md:hidden">
                  {allResults.map(r => (
                    <div key={r.id} className="border-b border-black/10 pb-6 flex flex-col gap-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-lg font-medium">{r.studentName}</div>
                          <div className="text-xs text-gray-500 tracking-wider uppercase mt-1">{new Date(r.createdAt).toLocaleDateString()} &bull; {r.grade}-sinf</div>
                        </div>
                        <span className={`text-xl font-medium ${r.totalScore >= 50 ? 'text-black' : 'text-gray-400'}`}>
                          {r.totalScore}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center bg-white/50 backdrop-blur-sm p-4 rounded-xl border border-white/50">
                        <div>
                          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">ID / LOGIN</div>
                          <div className="font-mono text-sm tracking-wider text-black">{r.id}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">PAROL (PIN)</div>
                          <div className="font-mono text-sm tracking-wider text-black">{r.pin || '---'}</div>
                        </div>
                      </div>
                      <button onClick={() => navigate('/summary/' + r.id)} className="w-full mt-2 border border-black text-black hover:bg-black hover:text-white py-3 text-xs tracking-[0.2em] uppercase font-bold transition-colors">
                        Xulosani Ko'rish
                      </button>
                    </div>
                  ))}
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left whitespace-nowrap border-collapse">
                    <thead>
                      <tr>
                        <th className="py-4 border-b border-black/10 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">O'quvchi</th>
                        <th className="py-4 border-b border-black/10 text-[10px] font-semibold text-gray-400 uppercase tracking-widest pl-6">Sinf / Sana</th>
                        <th className="py-4 border-b border-black/10 text-[10px] font-semibold text-gray-400 uppercase tracking-widest pl-6">Natija</th>
                        <th className="py-4 border-b border-black/10 text-[10px] font-semibold text-gray-400 uppercase tracking-widest pl-6">Login (ID)</th>
                        <th className="py-4 border-b border-black/10 text-[10px] font-semibold text-gray-400 uppercase tracking-widest pl-6">Parol (PIN)</th>
                        <th className="py-4 border-b border-black/10 text-[10px] font-semibold text-gray-400 uppercase tracking-widest text-right">Amallar</th>
                      </tr>
                    </thead>
                    <motion.tbody
                      initial="hidden"
                      animate="show"
                      variants={{
                        hidden: { opacity: 0 },
                        show: { opacity: 1, transition: { staggerChildren: 0.05 } }
                      }}
                    >
                      {allResults.map(r => (
                        <motion.tr 
                          variants={{
                            hidden: { opacity: 0, y: 10 },
                            show: { opacity: 1, y: 0, transition: { duration: 0.3 } }
                          }}
                          key={r.id} 
                          className="group hover:bg-white/50 transition-colors border-b border-black/10"
                        >
                          <td className="py-6 pl-4 md:pl-0 group-hover:pl-4 transition-all duration-300">
                            <div className="text-lg md:text-xl font-medium tracking-tight capitalize">{r.studentName}</div>
                          </td>
                          <td className="py-6 pl-6">
                            <div className="text-base text-black">{r.grade}-sinf</div>
                            <div className="text-xs text-gray-500 mt-1 tracking-wider uppercase">{new Date(r.createdAt).toLocaleDateString()}</div>
                          </td>
                          <td className="py-6 pl-6">
                            <span className={`text-2xl font-medium tracking-tight ${r.totalScore >= 50 ? 'text-black' : 'text-gray-400'}`}>
                              {r.totalScore}<span className="text-sm font-normal text-gray-400 ml-1">%</span>
                            </span>
                          </td>
                          <td className="py-6 pl-6 font-mono text-sm tracking-widest text-black">{r.id}</td>
                          <td className="py-6 pl-6 font-mono text-sm tracking-widest text-gray-500">{r.pin || '---'}</td>
                          <td className="py-6 pr-4 md:pr-0 text-right">
                            <button onClick={() => navigate('/summary/' + r.id)} className="border border-black/10 hover:border-black text-black px-4 py-2 text-[10px] uppercase tracking-widest font-bold transition-colors rounded-lg">
                              Ko'rish
                            </button>
                          </td>
                        </motion.tr>
                      ))}
                    </motion.tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        ) : (
          /* New Result Tab */
          generatedCredentials ? (
            <div className="border border-black/10 p-8 md:p-16 text-center space-y-12">
              <div>
                <div className="w-16 h-16 border border-black/10 text-black flex items-center justify-center mx-auto mb-6">
                  <Check className="w-6 h-6" />
                </div>
                <h2 className="text-3xl md:text-4xl font-medium tracking-tight">Muvaffaqiyatli saqlandi</h2>
                <p className="text-gray-500 text-sm mt-4 tracking-wider uppercase">O'quvchiga quyidagi ma'lumotlarni taqdim eting</p>
              </div>
              
              <div className="flex flex-col sm:flex-row justify-center gap-6">
                <div className="p-6 md:p-8 border border-white/50 bg-white/50 backdrop-blur-md rounded-2xl flex-1 max-w-[280px] mx-auto sm:mx-0 w-full shadow-sm">
                  <div className="text-[10px] font-bold text-gray-500 mb-3 uppercase tracking-[0.3em]">Login (ID)</div>
                  <div className="text-4xl md:text-5xl font-medium tracking-widest text-black select-all">{generatedCredentials.id}</div>
                </div>
                <div className="p-6 md:p-8 border border-white/50 bg-white/50 backdrop-blur-md rounded-2xl flex-1 max-w-[280px] mx-auto sm:mx-0 w-full shadow-sm">
                  <div className="text-[10px] font-bold text-gray-500 mb-3 uppercase tracking-[0.3em]">Parol (PIN)</div>
                  <div className="text-4xl md:text-5xl font-medium tracking-widest text-black select-all">{generatedCredentials.pin}</div>
                </div>
              </div>
              
              <div className="pt-8 border-t border-black/10 flex flex-col sm:flex-row justify-center gap-4">
                <button onClick={() => navigate('/summary/' + generatedCredentials.id)} className="w-full sm:w-auto bg-black text-white px-8 py-4 text-xs font-bold tracking-[0.2em] uppercase hover:bg-black/80 transition-colors">
                  Xulosani ko'rish
                </button>
                <button 
                  onClick={() => {
                    setStudentName('');
                    setGrade('5');
                    const initial: Record<number, boolean> = {};
                    currentBlueprint.forEach(q => initial[q.id] = false);
                    setQuestionResults(initial);
                    setGeneratedCredentials(null);
                  }} 
                  className="w-full sm:w-auto bg-transparent text-black border border-black/20 px-8 py-4 text-xs font-bold tracking-[0.2em] uppercase hover:border-black transition-colors"
                >
                  Yangi qo'shish
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-16 md:gap-24">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-12 lg:gap-24">
                <div className="md:col-span-4">
                  <h2 className="text-[10px] font-semibold tracking-[0.3em] uppercase text-gray-500 mb-6">O'quvchi ma'lumotlari</h2>
                </div>
                <div className="md:col-span-8 flex flex-col md:flex-row gap-8 md:gap-12">
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold tracking-[0.2em] uppercase text-gray-400 mb-4">Ism-familiya</label>
                    <input 
                      type="text" 
                      value={studentName}
                      onChange={e => setStudentName(e.target.value)}
                      placeholder="Masalan: Abdulaziz Telmonov"
                      className="w-full border-b border-black/20 pb-3 bg-transparent text-lg md:text-xl focus:outline-none focus:border-black transition-colors placeholder:text-gray-300"
                      required
                    />
                  </div>
                  <div className="w-full md:w-48 relative">
                    <label className="block text-[10px] font-bold tracking-[0.2em] uppercase text-gray-400 mb-4">Sinf</label>
                    <div 
                      onClick={() => setIsSelectOpen(!isSelectOpen)}
                      className="w-full border-b border-black/20 pb-3 bg-transparent text-lg md:text-xl cursor-pointer flex justify-between items-center transition-colors hover:border-black"
                    >
                      <span>{grade}-sinf</span>
                      <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${isSelectOpen ? 'rotate-180' : ''}`} />
                    </div>
                    
                    {isSelectOpen && (
                      <div className="absolute top-full left-0 w-full mt-2 bg-white border border-black/10 shadow-xl z-50">
                        {[5, 6, 7, 8, 9, 10, 11].map(g => (
                          <div 
                            key={g}
                            onClick={() => {
                              setGrade(String(g));
                              setIsSelectOpen(false);
                            }}
                            className="px-6 py-4 text-lg hover:bg-[#f8f8f8] hover:pl-8 transition-all cursor-pointer border-b border-black/5 last:border-0"
                          >
                            {g}-sinf
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Questions Section */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-12 lg:gap-24 border-t border-black/10 pt-16">
                <div className="md:col-span-4">
                  <div className="md:sticky md:top-32 flex flex-col gap-6">
                    <div>
                      <h2 className="text-[10px] font-semibold tracking-[0.3em] uppercase text-gray-500 mb-2">Imtihon savollari</h2>
                      <p className="text-xl font-medium tracking-tight">O'quvchi to'g'ri topgan savollarni belgilang</p>
                    </div>
                    
                    <div className="flex flex-col gap-3 mt-4">
                      <button 
                        type="button"
                        onClick={() => {
                          const all: Record<number, boolean> = {};
                          currentBlueprint.forEach(q => all[q.id] = true);
                          setQuestionResults(all);
                        }}
                        className="w-full text-left py-3 border-b border-black/10 text-xs font-bold uppercase tracking-[0.2em] hover:pl-2 hover:border-black transition-all text-gray-400 hover:text-black"
                      >
                        Barchasini belgilash
                      </button>
                      <button 
                        type="button"
                        onClick={() => {
                          const none: Record<number, boolean> = {};
                          currentBlueprint.forEach(q => none[q.id] = false);
                          setQuestionResults(none);
                        }}
                        className="w-full text-left py-3 border-b border-black/10 text-xs font-bold uppercase tracking-[0.2em] hover:pl-2 hover:border-black transition-all text-gray-400 hover:text-black"
                      >
                        Barchasini tozalash
                      </button>
                      <button 
                        type="button"
                        onClick={() => setFastMode(!fastMode)}
                        className={`w-full text-left py-3 border-b border-black/10 text-xs font-bold uppercase tracking-[0.2em] transition-all flex items-center justify-between mt-4 ${fastMode ? 'text-black border-black' : 'text-gray-400 hover:text-black hover:pl-2 hover:border-black'}`}
                      >
                        <span>Tezkor kiritish {fastMode && '(ON)'}</span>
                      </button>
                      <button 
                        type="button"
                        onClick={() => setIsEditorOpen(true)}
                        className="w-full text-left py-3 border-b border-black/10 text-xs font-bold uppercase tracking-[0.2em] hover:pl-2 hover:border-black transition-all text-gray-400 hover:text-black flex items-center justify-between mt-4"
                      >
                        <span>Shablonni o'zgartirish</span>
                        <Settings2 className="w-4 h-4" />
                      </button>
                      
                      <button 
                        type="button"
                        onClick={() => setIsAiModalOpen(true)}
                        className="w-full text-left py-4 mt-4 rounded-xl px-4 text-xs font-bold uppercase tracking-[0.2em] transition-all flex items-center justify-between gap-2 bg-black text-white hover:bg-neutral-800 shadow-md group"
                      >
                        <span>AI Test Yaratish (Moslashuvchan)</span>
                        <Sparkles className="w-4 h-4 text-amber-300 group-hover:rotate-12 transition-transform" />
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="md:col-span-8 space-y-16">
                  {fastMode && (
                    <div className="bg-black text-white p-6 md:p-8 rounded-2xl mb-8 shadow-2xl">
                      <div className="flex justify-between items-start mb-6">
                        <div>
                          <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-400 mb-2">Tezkor Kiritish Rejimi</h3>
                          <p className="text-lg md:text-xl font-medium tracking-tight">To'g'ri bo'lsa <kbd className="bg-white/20 px-2 py-1 rounded mx-1 font-mono">1</kbd>, noto'g'ri bo'lsa <kbd className="bg-white/20 px-2 py-1 rounded mx-1 font-mono">0</kbd> bosing.</p>
                        </div>
                        <div className="text-3xl md:text-4xl font-black tracking-tighter text-white/50">{currentIndex + 1}<span className="text-xl">/{currentBlueprint.length}</span></div>
                      </div>
                      
                      <div className="flex flex-col gap-3">
                        {currentBlueprint.map((q, idx) => (
                          <div 
                            key={q.id}
                            onClick={() => setCurrentIndex(idx)}
                            className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-all duration-300 ${idx === currentIndex ? 'border-white bg-white/10 scale-[1.02] shadow-lg ring-1 ring-white/50' : 'border-white/10 opacity-50 hover:opacity-100 hover:bg-white/5'}`}
                          >
                            <div className="flex items-center gap-4">
                              <span className="font-mono text-[10px] text-gray-400 font-bold w-6">#{String(idx + 1).padStart(2, '0')}</span>
                              <div className="flex flex-col">
                                <span className="font-medium text-sm md:text-base">{q.topic}</span>
                                <span className="text-[9px] text-gray-400 uppercase tracking-widest font-bold mt-1">{q.category} &bull; {q.difficulty}</span>
                              </div>
                            </div>
                            <div className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${questionResults[q.id] ? 'bg-white text-black' : 'border border-white/20 text-transparent'}`}>
                              <Check className="w-4 h-4" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {!fastMode && Array.from(new Set(currentBlueprint.map(q => q.category))).map(category => {
                    const categoryQuestions = currentBlueprint.filter(q => q.category === category);
                    
                    return (
                      <div key={category} className="space-y-6">
                        <div className="flex items-center justify-between border-b border-black/10 pb-4">
                          <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.3em]">
                            {category}
                          </h4>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {categoryQuestions.map(q => {
                            const isCorrect = questionResults[q.id];
                            return (
                              <div 
                                key={q.id} 
                                onClick={() => handleToggleQuestion(q.id)}
                                className={`cursor-pointer border p-5 flex flex-col gap-4 transition-all duration-300 ${isCorrect ? 'border-black bg-black text-white' : 'border-black/10 bg-transparent text-black hover:border-black/30'}`}
                              >
                                <div className="flex justify-between items-start">
                                  <span className={`text-[10px] font-bold tracking-widest ${isCorrect ? 'text-gray-400' : 'text-gray-400'}`}>#{String(q.id).padStart(2, '0')}</span>
                                  <div className={`w-5 h-5 border flex items-center justify-center transition-colors ${isCorrect ? 'border-white text-white' : 'border-black/20 text-transparent'}`}>
                                    {isCorrect && <Check className="w-3 h-3" />}
                                  </div>
                                </div>
                                <div className="text-base font-medium leading-relaxed tracking-tight">
                                  {q.topic}
                                </div>
                                <div className="flex items-center gap-3 mt-auto pt-4">
                                  <span className={`text-[9px] uppercase tracking-[0.2em] font-bold ${isCorrect ? 'text-gray-400' : 'text-gray-500'}`}>
                                    {q.difficulty}
                                  </span>
                                  <span className={`text-[9px] uppercase tracking-[0.2em] font-bold truncate max-w-[150px] ${isCorrect ? 'text-gray-400' : 'text-gray-500'}`}>
                                    {q.skill}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Sticky Mobile Bottom Bar for Save Button */}
              <div className="pt-16 border-t border-black/10 grid grid-cols-1 md:grid-cols-12 gap-12 lg:gap-24">
                <div className="md:col-span-4 hidden md:block"></div>
                <div className="md:col-span-8">
                  <button 
                    type="submit" 
                    disabled={isLoading}
                    className={`w-full py-6 md:py-8 text-white font-bold text-xs uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-4 ${isLoading ? 'bg-black/50 cursor-not-allowed' : 'bg-black hover:bg-black/80'}`}
                  >
                    {isLoading && <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>}
                    {isLoading ? "Xulosa yozilmoqda..." : "Saqlash va AI xulosa yaratish"}
                  </button>
                </div>
              </div>
            </form>
          )
        )}
        </div>
      </div>

      {isEditorOpen && (
        <BlueprintEditorModal 
          grade={grade} 
          initialBlueprint={currentBlueprint} 
          onSave={handleSaveBlueprint} 
          onClose={() => setIsEditorOpen(false)} 
        />
      )}

      {isAiModalOpen && (
        <AiTestCreatorModal
          initialGrade={grade}
          blueprint={currentBlueprint}
          onClose={() => setIsAiModalOpen(false)}
        />
      )}
    </div>
  );
}
