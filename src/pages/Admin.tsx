import { useState, useEffect } from 'react';
import { db, type StudentResult } from '../lib/db';
import { generateDiagnosticSummary } from '../lib/gemini';
import { useNavigate } from 'react-router-dom';
import type { QuestionBlueprint } from '../lib/blueprint';
import { GRADE_BLUEPRINTS } from '../lib/gradeBlueprints';
import { Check, X, Settings2, Users, PlusCircle } from 'lucide-react';
import BlueprintEditorModal from '../components/BlueprintEditorModal';

export default function Admin() {
  const [activeTab, setActiveTab] = useState<'new' | 'dashboard'>('new');
  const [allResults, setAllResults] = useState<StudentResult[]>([]);
  
  const [studentName, setStudentName] = useState('');
  const [grade, setGrade] = useState('5');
  const [currentBlueprint, setCurrentBlueprint] = useState<QuestionBlueprint[]>(GRADE_BLUEPRINTS['5']);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [questionResults, setQuestionResults] = useState<Record<number, boolean>>(() => {
    const initial: Record<number, boolean> = {};
    GRADE_BLUEPRINTS['5'].forEach(q => initial[q.id] = false);
    return initial;
  });

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

  const calculateScores = () => {
    const calc = (category: string) => {
      const qs = currentBlueprint.filter(q => q.category === category);
      if (qs.length === 0) return 0;
      const correct = qs.filter(q => questionResults[q.id]).length;
      return Math.round((correct / qs.length) * 100);
    };
    return {
      math: calc('math'),
      logic: calc('logic'),
      analytical: calc('analytical'),
      verbal: calc('verbal'),
      creativity: calc('creativity')
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName) return alert("O'quvchi ismini kiriting!");

    setIsLoading(true);
    
    // Calculate individual category scores
    const calculatedScores = calculateScores();
    const totalScore = Math.round((calculatedScores.math + calculatedScores.logic + calculatedScores.analytical + calculatedScores.verbal + calculatedScores.creativity) / 5);
    
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
      createdAt: new Date().toISOString(),
    });

    setGeneratedCredentials({ id: uniqueId, pin });
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row items-start md:items-center justify-center md:p-6" style={{ 
      backgroundImage: 'radial-gradient(circle at center, #ffffff 0%, #f1f5f9 100%)' 
    }}>
      <div className="bg-white max-w-7xl w-full min-h-screen md:min-h-0 p-4 sm:p-8 md:rounded-3xl shadow-xl md:border border-slate-200">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-8 gap-5">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-neutral-main tracking-tight">Admin Panel</h1>
            <p className="text-sm text-neutral-secondary mt-1">O'quvchi natijalarini boshqarish va diagnostika yaratish.</p>
          </div>
          
          <div className="flex w-full md:w-auto bg-slate-100/80 p-1.5 rounded-xl border border-slate-200/60 shadow-inner relative">
            <button 
              onClick={() => setActiveTab('new')}
              className={`flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-all duration-300 relative z-10 ${activeTab === 'new' ? 'text-primary' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {activeTab === 'new' && <div className="absolute inset-0 bg-white rounded-lg shadow-sm border border-slate-200/50 -z-10"></div>}
              <PlusCircle className="w-4 h-4" /> Qo'shish
            </button>
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-all duration-300 relative z-10 ${activeTab === 'dashboard' ? 'text-primary' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {activeTab === 'dashboard' && <div className="absolute inset-0 bg-white rounded-lg shadow-sm border border-slate-200/50 -z-10"></div>}
              <Users className="w-4 h-4" /> Barchasi
            </button>
          </div>
        </div>

        {activeTab === 'dashboard' ? (
          <div className="space-y-4">
            {allResults.length === 0 ? (
              <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400">Hozircha natijalar yo'q.</div>
            ) : (
              <>
                {/* Mobile Cards View */}
                <div className="grid grid-cols-1 gap-4 md:hidden">
                  {allResults.map(r => (
                    <div key={r.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col gap-3">
                      <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                        <div>
                          <div className="font-bold text-slate-800 text-base">{r.studentName}</div>
                          <div className="text-xs text-slate-500 mt-0.5">{new Date(r.createdAt).toLocaleDateString()} &bull; {r.grade}-sinf</div>
                        </div>
                        <span className={`px-2.5 py-1 rounded-md text-xs font-black ${r.totalScore >= 50 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                          {r.totalScore}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">ID / LOGIN</div>
                          <div className="font-mono font-bold text-slate-700">{r.id}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">PAROL (PIN)</div>
                          <div className="font-mono font-bold text-slate-700">{r.pin || '---'}</div>
                        </div>
                      </div>
                      <button onClick={() => navigate('/summary/' + r.id)} className="w-full mt-1 bg-primary/5 text-primary hover:bg-primary/10 py-2.5 rounded-xl text-sm font-bold transition-colors">
                        Xulosani Ko'rish
                      </button>
                    </div>
                  ))}
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto bg-white rounded-2xl border border-slate-200 shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                        <th className="p-4 font-bold rounded-tl-2xl">O'quvchi</th>
                        <th className="p-4 font-bold">Sinf / Sana</th>
                        <th className="p-4 font-bold">Natija</th>
                        <th className="p-4 font-bold">Login (ID)</th>
                        <th className="p-4 font-bold">Parol (PIN)</th>
                        <th className="p-4 font-bold rounded-tr-2xl">Amallar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {allResults.map(r => (
                        <tr key={r.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="p-4 font-bold text-slate-800">{r.studentName}</td>
                          <td className="p-4">
                            <div className="text-sm font-medium text-slate-700">{r.grade}-sinf</div>
                            <div className="text-xs text-slate-400">{new Date(r.createdAt).toLocaleDateString()}</div>
                          </td>
                          <td className="p-4">
                            <span className={`px-2.5 py-1 rounded-md text-xs font-black ${r.totalScore >= 50 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                              {r.totalScore}%
                            </span>
                          </td>
                          <td className="p-4 font-mono font-bold text-slate-700 bg-slate-50/50 group-hover:bg-white">{r.id}</td>
                          <td className="p-4 font-mono font-bold text-slate-500 bg-slate-50/50 group-hover:bg-white">{r.pin || '---'}</td>
                          <td className="p-4">
                            <button onClick={() => navigate('/summary/' + r.id)} className="text-primary bg-primary/5 hover:bg-primary/10 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors">
                              Ko'rish
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        ) : (
          /* New Result Tab */
          generatedCredentials ? (
            <div className="bg-emerald-50 border border-emerald-200 p-6 md:p-10 rounded-2xl md:rounded-3xl text-center space-y-6 md:space-y-8 relative overflow-hidden shadow-inner">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none"></div>
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none"></div>
              
              <div className="relative z-10">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-sm">
                  <Check className="w-8 h-8" />
                </div>
                <h2 className="text-2xl md:text-3xl font-black text-emerald-800 tracking-tight">Muvaffaqiyatli saqlandi!</h2>
                <p className="text-emerald-700/80 text-sm md:text-base mt-2 font-medium">O'quvchiga quyidagi ma'lumotlarni taqdim eting:</p>
              </div>
              
              <div className="flex flex-col sm:flex-row justify-center gap-4 relative z-10">
                <div className="bg-white/80 backdrop-blur-sm p-5 md:p-6 rounded-2xl shadow-sm border border-emerald-100 flex-1 max-w-[240px] mx-auto sm:mx-0 w-full">
                  <div className="text-xs font-bold text-emerald-400/80 mb-2 uppercase tracking-widest">Login (ID)</div>
                  <div className="text-3xl md:text-4xl font-black text-slate-800 tracking-widest select-all">{generatedCredentials.id}</div>
                </div>
                <div className="bg-white/80 backdrop-blur-sm p-5 md:p-6 rounded-2xl shadow-sm border border-emerald-100 flex-1 max-w-[240px] mx-auto sm:mx-0 w-full">
                  <div className="text-xs font-bold text-emerald-400/80 mb-2 uppercase tracking-widest">Parol (PIN)</div>
                  <div className="text-3xl md:text-4xl font-black text-primary tracking-widest select-all">{generatedCredentials.pin}</div>
                </div>
              </div>
              
              <p className="text-xs md:text-sm text-emerald-700/70 max-w-lg mx-auto font-medium relative z-10">
                Ota-ona tizimga aynan shu login va parol orqali kirib, farzandining batafsil diagnostikasini ko'ra oladi.
              </p>
              
              <div className="pt-6 flex flex-col sm:flex-row justify-center gap-3 relative z-10">
                <button onClick={() => navigate('/summary/' + generatedCredentials.id)} className="w-full sm:w-auto bg-emerald-600 text-white px-8 py-3.5 rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20">
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
                  className="w-full sm:w-auto bg-white text-emerald-700 border border-emerald-200 px-8 py-3.5 rounded-xl font-bold hover:bg-emerald-50 transition-colors"
                >
                  Yangi qo'shish
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-secondary mb-1">O'quvchi Ism-familiyasi</label>
                  <input 
                    type="text" 
                    value={studentName}
                    onChange={e => setStudentName(e.target.value)}
                    placeholder="Masalan: Abdulaziz Telmonov"
                    className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-secondary mb-1">Sinfni tanlang</label>
                  <select 
                    value={grade}
                    onChange={e => setGrade(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    {[5, 6, 7, 8, 9, 10, 11].map(g => (
                      <option key={g} value={String(g)}>{g}-sinf</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Questions Section */}
              <div className="space-y-6 pt-8 mt-2 border-t border-slate-100">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                  <div>
                    <h3 className="font-black text-xl text-neutral-main">Imtihon savollari ({grade}-sinf)</h3>
                    <p className="text-xs md:text-sm text-neutral-secondary mt-1">
                      O'quvchi to'g'ri topgan savollarni belgilang.
                    </p>
                  </div>
                  
                  {/* Action Bar */}
                  <div className="flex flex-wrap items-center bg-slate-50 border border-slate-200 p-1.5 rounded-xl gap-1">
                    <button 
                      type="button"
                      onClick={() => {
                        const all: Record<number, boolean> = {};
                        currentBlueprint.forEach(q => all[q.id] = true);
                        setQuestionResults(all);
                      }}
                      className="flex-1 md:flex-none text-[11px] md:text-xs font-bold bg-white text-emerald-700 hover:bg-emerald-50 px-3 py-2 rounded-lg transition-colors border border-slate-200 shadow-sm"
                    >
                      Barchasi
                    </button>
                    <button 
                      type="button"
                      onClick={() => {
                        const inverted: Record<number, boolean> = {};
                        currentBlueprint.forEach(q => inverted[q.id] = !questionResults[q.id]);
                        setQuestionResults(inverted);
                      }}
                      className="flex-1 md:flex-none text-[11px] md:text-xs font-bold bg-white text-indigo-700 hover:bg-indigo-50 px-3 py-2 rounded-lg transition-colors border border-slate-200 shadow-sm"
                    >
                      Invert
                    </button>
                    <button 
                      type="button"
                      onClick={() => {
                        const none: Record<number, boolean> = {};
                        currentBlueprint.forEach(q => none[q.id] = false);
                        setQuestionResults(none);
                      }}
                      className="flex-1 md:flex-none text-[11px] md:text-xs font-bold bg-white text-slate-600 hover:bg-slate-100 px-3 py-2 rounded-lg transition-colors border border-slate-200 shadow-sm"
                    >
                      Tozalash
                    </button>
                    <div className="w-px h-6 bg-slate-200 mx-1 hidden md:block"></div>
                    <button 
                      type="button"
                      onClick={() => setIsEditorOpen(true)}
                      className="w-full md:w-auto flex justify-center items-center gap-1.5 text-[11px] md:text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 px-4 py-2 rounded-lg transition-colors shadow-sm mt-1 md:mt-0"
                    >
                      <Settings2 className="w-3.5 h-3.5" /> Shablon
                    </button>
                  </div>
                </div>
                
                <div className="space-y-8">
                  {Array.from(new Set(currentBlueprint.map(q => q.category))).map(category => {
                    const categoryQuestions = currentBlueprint.filter(q => q.category === category);
                    const isAllSelected = categoryQuestions.every(q => questionResults[q.id]);
                    
                    return (
                      <div key={category} className="space-y-3">
                        <div className="flex items-center justify-between border-b pb-2">
                          <h4 className="font-semibold text-slate-700 uppercase tracking-wider text-sm flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-primary"></span>
                            {category}
                          </h4>
                          <button
                            type="button"
                            onClick={() => {
                              setQuestionResults(prev => {
                                const next = { ...prev };
                                categoryQuestions.forEach(q => next[q.id] = !isAllSelected);
                                return next;
                              });
                            }}
                            className={`text-xs font-medium px-2.5 py-1 rounded transition-colors ${isAllSelected ? 'text-emerald-700 bg-emerald-100 hover:bg-emerald-200' : 'text-slate-600 bg-slate-100 hover:bg-slate-200'}`}
                          >
                            {isAllSelected ? "Guruhni tozalash" : "Guruhni belgilash"}
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {categoryQuestions.map(q => {
                            const isCorrect = questionResults[q.id];
                            return (
                              <div 
                                key={q.id} 
                                onClick={() => handleToggleQuestion(q.id)}
                                className={`cursor-pointer border rounded-lg p-3 flex flex-col gap-2 transition-all ${isCorrect ? 'bg-emerald-50 border-emerald-300 shadow-sm' : 'bg-slate-50 border-slate-200 hover:border-slate-300'}`}
                              >
                                <div className="flex justify-between items-start">
                                  <span className="text-xs font-bold text-slate-400">#{String(q.id).padStart(2, '0')}</span>
                                  <div className={`w-5 h-5 rounded-full flex items-center justify-center ${isCorrect ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                                    {isCorrect ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                                  </div>
                                </div>
                                <div className={`text-sm font-medium leading-tight ${isCorrect ? 'text-emerald-900' : 'text-slate-600'}`}>
                                  {q.topic}
                                </div>
                                <div className="flex items-center gap-2 mt-auto pt-2">
                                  <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                    {q.difficulty}
                                  </span>
                                  <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded truncate max-w-[100px]">
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
              <div className="sticky bottom-0 bg-white/90 backdrop-blur-xl p-4 -mx-4 sm:mx-0 sm:p-0 sm:bg-transparent z-40 border-t border-slate-200 sm:border-0 pb-safe sm:pb-0 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] sm:shadow-none mt-8">
                <button 
                  type="submit" 
                  disabled={isLoading}
                  className={`w-full py-4 rounded-xl text-white font-black text-base md:text-lg transition-all shadow-lg flex items-center justify-center gap-3 ${isLoading ? 'bg-slate-400 cursor-not-allowed shadow-none' : 'bg-primary hover:bg-blue-700 hover:shadow-xl hover:-translate-y-0.5 shadow-primary/30'}`}
                >
                  {isLoading && <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                  {isLoading ? "Xulosa yozilmoqda..." : "Saqlash va AI xulosa yaratish"}
                </button>
              </div>
            </form>
          )
        )}
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
