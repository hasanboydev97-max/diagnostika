import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { db, type StudentResult } from '../lib/db';
import { generateDiagnosticSummary } from '../lib/gemini';
import { useNavigate } from 'react-router-dom';
import type { QuestionBlueprint } from '../lib/blueprint';
import { GRADE_BLUEPRINTS } from '../lib/gradeBlueprints';
import { Check, Settings2, Users, PlusCircle, ChevronDown, Sparkles, Scan, Printer } from 'lucide-react';
import BlueprintEditorModal from '../components/BlueprintEditorModal';
import MeshGradient from '../components/ui/MeshGradient';

export default function Admin() {
  const [activeTab, setActiveTab] = useState<'new' | 'dashboard'>('new');
  const [allResults, setAllResults] = useState<StudentResult[]>([]);
  
  const [studentName, setStudentName] = useState('');
  const [grade, setGrade] = useState('5');
  const [isSelectOpen, setIsSelectOpen] = useState(false);
  const [currentBlueprint, setCurrentBlueprint] = useState<QuestionBlueprint[]>(GRADE_BLUEPRINTS['5']);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  
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

      
    </div>
  );
}
