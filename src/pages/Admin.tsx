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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-3 sm:p-6" style={{ 
      backgroundImage: 'radial-gradient(circle at center, #ffffff 0%, #f1f5f9 100%)' 
    }}>
      <div className="bg-white max-w-7xl w-full p-4 sm:p-8 rounded-2xl shadow-xl border border-slate-200 my-4 sm:my-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-neutral-main mb-2">Admin Panel</h1>
            <p className="text-sm sm:text-base text-neutral-secondary">O'quvchi natijalarini boshqarish va diagnostika yaratish.</p>
          </div>
          
          <div className="flex flex-wrap w-full md:w-auto bg-slate-100 p-1 rounded-lg">
            <button 
              onClick={() => setActiveTab('new')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition-all ${activeTab === 'new' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <PlusCircle className="w-4 h-4" /> Yangi qo'shish
            </button>
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition-all ${activeTab === 'dashboard' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Users className="w-4 h-4" /> Barcha o'quvchilar
            </button>
          </div>
        </div>

        {activeTab === 'dashboard' ? (
          <div className="space-y-4">
            {allResults.length === 0 ? (
              <div className="text-center py-12 text-slate-400">Hozircha natijalar yo'q.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-sm border-b">
                      <th className="p-4 font-medium rounded-tl-lg">O'quvchi</th>
                      <th className="p-4 font-medium">Sinf</th>
                      <th className="p-4 font-medium">Sana</th>
                      <th className="p-4 font-medium">Natija</th>
                      <th className="p-4 font-medium text-indigo-600">Login (ID)</th>
                      <th className="p-4 font-medium text-indigo-600">Parol (PIN)</th>
                      <th className="p-4 font-medium rounded-tr-lg">Amallar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {allResults.map(r => (
                      <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 font-medium text-slate-800">{r.studentName}</td>
                        <td className="p-4 text-slate-600">{r.grade}-sinf</td>
                        <td className="p-4 text-slate-500 text-sm">{new Date(r.createdAt).toLocaleDateString()}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${r.totalScore >= 50 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                            {r.totalScore}%
                          </span>
                        </td>
                        <td className="p-4 font-mono font-bold text-slate-700">{r.id}</td>
                        <td className="p-4 font-mono font-bold text-slate-500">{r.pin || '---'}</td>
                        <td className="p-4">
                          <button onClick={() => navigate('/summary/' + r.id)} className="text-primary hover:underline text-sm font-medium">
                            Ko'rish
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          /* New Result Tab */
          generatedCredentials ? (
              <div className="bg-emerald-50 border border-emerald-200 p-8 rounded-xl text-center space-y-6">
              <h2 className="text-2xl font-bold text-emerald-800">Muvaffaqiyatli saqlandi!</h2>
              <p className="text-emerald-700">O'quvchiga quyidagi tizimga kirish ma'lumotlarini bering:</p>
              
              <div className="flex flex-col md:flex-row justify-center gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-emerald-100 min-w-[200px]">
                  <div className="text-sm font-medium text-slate-400 mb-1 uppercase tracking-wider">Login (ID)</div>
                  <div className="text-4xl font-bold text-slate-800 tracking-widest">{generatedCredentials.id}</div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-emerald-100 min-w-[200px]">
                  <div className="text-sm font-medium text-slate-400 mb-1 uppercase tracking-wider">Parol (PIN)</div>
                  <div className="text-4xl font-bold text-primary tracking-widest">{generatedCredentials.pin}</div>
                </div>
              </div>
              
              <p className="text-sm text-emerald-600 max-w-lg mx-auto">
                Ota-ona tizimga aynan shu login va parol orqali kirib, farzandining batafsil diagnostikasini (SaaS) ko'ra oladi.
              </p>
              
              <div className="pt-4 flex justify-center gap-4">
                <button 
                  onClick={() => {
                    setStudentName('');
                    setGrade('5');
                    const initial: Record<number, boolean> = {};
                    currentBlueprint.forEach(q => initial[q.id] = false);
                    setQuestionResults(initial);
                    setGeneratedCredentials(null);
                  }} 
                  className="text-emerald-800 font-medium hover:underline"
                >
                  Yana bitta kiritish
                </button>
                <button onClick={() => navigate('/summary/' + generatedCredentials.id)} className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-emerald-700 transition-colors">
                  Xulosani ko'rish
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
              <div className="space-y-6 pt-6 border-t">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-xl text-neutral-main">Imtihon savollari ({grade}-sinf uchun)</h3>
                    <p className="text-sm text-neutral-secondary mt-1">O'quvchi to'g'ri topgan savollarni belgilang. Vaqtni tejash uchun guruh yoki umumiy tugmalardan foydalaning.</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button 
                      type="button"
                      onClick={() => {
                        const all: Record<number, boolean> = {};
                        currentBlueprint.forEach(q => all[q.id] = true);
                        setQuestionResults(all);
                      }}
                      className="text-xs font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-3 py-2 rounded-lg transition-colors border border-emerald-200"
                    >
                      Barchasi To'g'ri
                    </button>
                    <button 
                      type="button"
                      onClick={() => {
                        const inverted: Record<number, boolean> = {};
                        currentBlueprint.forEach(q => inverted[q.id] = !questionResults[q.id]);
                        setQuestionResults(inverted);
                      }}
                      className="text-xs font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-3 py-2 rounded-lg transition-colors border border-indigo-200"
                    >
                      Teskari qilish (Invert)
                    </button>
                    <button 
                      type="button"
                      onClick={() => {
                        const none: Record<number, boolean> = {};
                        currentBlueprint.forEach(q => none[q.id] = false);
                        setQuestionResults(none);
                      }}
                      className="text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 px-3 py-2 rounded-lg transition-colors border border-slate-200"
                    >
                      Tozalash
                    </button>
                    <button 
                      type="button"
                      onClick={() => setIsEditorOpen(true)}
                      className="flex items-center gap-2 text-xs font-medium text-primary bg-primary/5 hover:bg-primary/10 px-3 py-2 rounded-lg transition-colors border border-primary/20 ml-auto"
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

              <button 
                type="submit" 
                disabled={isLoading}
                className={`w-full py-4 rounded-xl text-white font-bold text-lg transition-all shadow-md flex items-center justify-center gap-3 ${isLoading ? 'bg-slate-400 cursor-not-allowed' : 'bg-primary hover:bg-blue-700 hover:shadow-lg hover:-translate-y-0.5'}`}
              >
                {isLoading && <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                {isLoading ? "AI xulosa shakllantirmoqda (Bulutga yuklanmoqda)..." : "Saqlash va AI xulosa yaratish"}
              </button>
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
