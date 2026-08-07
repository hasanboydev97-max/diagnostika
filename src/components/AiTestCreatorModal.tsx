import { useState, useEffect } from 'react';
import { X, Sparkles, Copy, ExternalLink, Check, BookOpen, Layers, BarChart, Plus, SlidersHorizontal, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { db } from '../lib/db';
import { generateCustomTestQuestions, generateDiagnosticTest, generateMatrixTestQuestions } from '../lib/gemini';
import type { QuestionBlueprint } from '../lib/blueprint';
import { useNavigate } from 'react-router-dom';

interface Props {
  initialGrade: string;
  blueprint: QuestionBlueprint[];
  onClose: () => void;
}

interface SubjectCount {
  subject: string;
  count: number;
  selected: boolean;
}

export default function AiTestCreatorModal({ initialGrade, blueprint, onClose }: Props) {
  const navigate = useNavigate();
  const [activeMode, setActiveMode] = useState<'simple' | 'matrix'>('matrix');
  
  // General settings
  const [grade, setGrade] = useState(initialGrade);
  const [topic, setTopic] = useState('');
  
  // Simple Mode state
  const [simpleSubject, setSimpleSubject] = useState('Barchasi (Diagnostika)');
  const [simpleQuestionCount, setSimpleQuestionCount] = useState<number>(15);
  const [simpleDifficulty, setSimpleDifficulty] = useState<string>('Aralash');

  // Matrix Mode state
  const [subjectCounts, setSubjectCounts] = useState<SubjectCount[]>([]);
  const [newCustomSubject, setNewCustomSubject] = useState('');
  const [showAddCustom, setShowAddCustom] = useState(false);
  
  // Difficulty breakdown in Matrix Mode
  const [difficultyBreakdown, setDifficultyBreakdown] = useState({
    oson: 10,
    orta: 15,
    qiyin: 5
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [createdTestId, setCreatedTestId] = useState<string | null>(null);

  useEffect(() => {
    db.getAllCategories().then(cats => {
      // Default initial subjects for matrix mode
      const defaults = ['Matematika', 'Mantiq', 'Analitik', 'Verbal', 'Kreativlik'];
      const allCats = Array.from(new Set([...defaults, ...cats]));
      
      const initialSubjectCounts: SubjectCount[] = allCats.map((cat, idx) => ({
        subject: cat,
        count: idx < 3 ? 10 : 5,
        selected: idx < 3 // Select first 3 by default
      }));
      
      setSubjectCounts(initialSubjectCounts);
    });
  }, []);

  // Calculate totals for matrix mode
  const selectedSubjects = subjectCounts.filter(s => s.selected && s.count > 0);
  const totalSubjectQuestions = selectedSubjects.reduce((sum, s) => sum + s.count, 0);
  const totalDifficultyQuestions = difficultyBreakdown.oson + difficultyBreakdown.orta + difficultyBreakdown.qiyin;

  // Auto sync difficulty counts to match total subject questions if needed
  const syncDifficultyWithTotal = () => {
    const total = totalSubjectQuestions || 30;
    const oson = Math.round(total * 0.3);
    const qiyin = Math.round(total * 0.2);
    const orta = total - oson - qiyin;
    setDifficultyBreakdown({ oson, orta, qiyin });
  };

  const handleAddCustomSubject = async () => {
    if (!newCustomSubject.trim()) return;
    const subjectName = newCustomSubject.trim();
    await db.addCustomCategory(subjectName);
    
    if (!subjectCounts.some(s => s.subject.toLowerCase() === subjectName.toLowerCase())) {
      setSubjectCounts(prev => [...prev, { subject: subjectName, count: 10, selected: true }]);
    }
    setNewCustomSubject('');
    setShowAddCustom(false);
    toast.success(`"${subjectName}" fani qo'shildi!`);
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    const toastId = toast.loading('AI savollarni shakllantirmoqda... (30-45 soniya)');

    try {
      let questions: any[] = [];

      if (activeMode === 'simple') {
        if (simpleSubject === 'Barchasi (Diagnostika)' && simpleQuestionCount === 30) {
          const res = await generateDiagnosticTest(blueprint, grade);
          if (res) questions = res;
        } else {
          const actualSubject = simpleSubject === 'Barchasi (Diagnostika)' ? 'Matematika va Mantiq' : simpleSubject;
          const res = await generateCustomTestQuestions({
            subject: actualSubject,
            grade,
            questionCount: simpleQuestionCount,
            difficulty: simpleDifficulty,
            topic
          });
          if (res) {
            questions = res.map((q, idx) => ({
              blueprintId: q.id || idx + 1,
              questionText: q.questionText,
              options: q.options,
              correctOption: q.correctOption,
              explanation: q.explanation,
              category: q.category || actualSubject,
              difficulty: q.difficulty || (simpleDifficulty === 'Aralash' ? 'O\'rta' : simpleDifficulty),
              skill: q.skill || 'Tushunish'
            }));
          }
        }
      } else {
        // Matrix Mode Generation
        if (selectedSubjects.length === 0) {
          toast.error('Kamida 1 ta fanni tanlang va savollar sonini kiriting!', { id: toastId });
          setIsGenerating(false);
          return;
        }

        const res = await generateMatrixTestQuestions({
          grade,
          subjects: selectedSubjects.map(s => ({ subject: s.subject, count: s.count })),
          difficulty: difficultyBreakdown,
          topic
        });

        if (res) {
          questions = res.map((q, idx) => ({
            blueprintId: q.id || idx + 1,
            questionText: q.questionText,
            options: q.options,
            correctOption: q.correctOption,
            explanation: q.explanation,
            category: q.category || selectedSubjects[0]?.subject || 'Matematika',
            difficulty: q.difficulty || 'O\'rta',
            skill: q.skill || 'Tushunish'
          }));
        }
      }

      if (!questions || questions.length === 0) {
        toast.error('AI savollarni yaratishda xatolik. Qayta urinib ko\'ring.', { id: toastId });
        return;
      }

      const testId = Math.floor(100000 + Math.random() * 900000).toString();
      await db.saveDiagnosticTest({
        id: testId,
        grade,
        blueprint,
        questions,
        createdAt: new Date().toISOString(),
        status: 'active'
      });

      setCreatedTestId(testId);
      toast.success(`Test muvaffaqiyatli yaratildi! Kod: ${testId}`, { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error('Xatolik yuz berdi: ' + err.message, { id: toastId });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 md:p-6">
      <div className="bg-[#fdfdfd] rounded-[28px] shadow-[0_25px_60px_rgba(0,0,0,0.2)] border border-black/10 w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 md:p-7 border-b border-black/5 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-black text-white flex items-center justify-center shadow-md">
              <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold tracking-tight text-black">AI Test Konstruktori</h2>
              <p className="text-xs text-gray-500 mt-0.5">Fanlar, miqdor va qiyinchilik taqsimotini Senior-levelda sozlang</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 text-gray-400 hover:text-black hover:bg-black/5 rounded-full transition-colors">
            <X className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </div>

        {/* Mode Tabs */}
        {!createdTestId && (
          <div className="px-6 md:px-8 pt-4 bg-slate-50/50 border-b border-black/5 flex gap-2">
            <button
              type="button"
              onClick={() => setActiveMode('matrix')}
              className={`pb-3 px-4 text-xs font-bold uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 ${
                activeMode === 'matrix'
                  ? 'border-black text-black'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" /> Chuqur Sozlama (Multi-Fan & Qiyinlik Matritsasi)
            </button>
            <button
              type="button"
              onClick={() => setActiveMode('simple')}
              className={`pb-3 px-4 text-xs font-bold uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 ${
                activeMode === 'simple'
                  ? 'border-black text-black'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              <Zap className="w-4 h-4" /> Tezkor Rejim
            </button>
          </div>
        )}

        {/* Content */}
        <div className="p-6 md:p-8 overflow-y-auto space-y-6 flex-1">
          {createdTestId ? (
            <div className="text-center py-8 space-y-6">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-200 shadow-sm">
                <Check className="w-8 h-8" strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-black">Test Muvaffaqiyatli Yaratildi!</h3>
                <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest">O'quvchiga quyidagi test kodini taqdim eting</p>
              </div>

              <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl max-w-sm mx-auto flex items-center justify-between shadow-sm">
                <div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">TEST KODI</div>
                  <div className="text-3xl font-black tracking-widest text-black mt-1 select-all">{createdTestId}</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(createdTestId);
                    toast.success('Test kodi nusxalandi!');
                  }}
                  className="px-4 py-2.5 bg-black text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-neutral-800 transition-colors flex items-center gap-2"
                >
                  <Copy className="w-4 h-4" /> Nusxalash
                </button>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => navigate(`/online-tests/take/${createdTestId}`)}
                  className="px-6 py-3.5 bg-black text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2 shadow-md"
                >
                  Testni ochish (O'quvchi ko'rinishida) <ExternalLink className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setCreatedTestId(null)}
                  className="px-6 py-3.5 bg-slate-100 text-black rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-200 transition-colors"
                >
                  Yana boshqa test yaratish
                </button>
              </div>
            </div>
          ) : activeMode === 'matrix' ? (
            /* Matrix Mode (Multi-subject & difficulty breakdown) */
            <div className="space-y-8">
              {/* Sinf Selector */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-black" /> Sinf Tanlang
                </label>
                <div className="flex flex-wrap gap-2">
                  {['5', '6', '7', '8', '9', '10', '11'].map(g => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGrade(g)}
                      className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                        grade === g
                          ? 'bg-black text-white border-black shadow-md'
                          : 'bg-white text-gray-600 border-black/10 hover:border-black/30'
                      }`}
                    >
                      {g}-sinf
                    </button>
                  ))}
                </div>
              </div>

              {/* Multi-subject selection & count per subject */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-black" /> Fanlarni Tanlang va Savollar Sonini Belgilang
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAddCustom(!showAddCustom)}
                    className="text-[11px] font-bold text-black uppercase tracking-wider hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Yangi fan qo'shish
                  </button>
                </div>

                {showAddCustom && (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex gap-2">
                    <input
                      type="text"
                      value={newCustomSubject}
                      onChange={e => setNewCustomSubject(e.target.value)}
                      placeholder="Masalan: Fizika, Tarix, Geografiya..."
                      className="flex-1 bg-white border border-black/10 rounded-xl px-4 py-2 text-sm text-black focus:border-black focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomSubject}
                      className="px-5 py-2 bg-black text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-neutral-800"
                    >
                      Saqlash
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-56 overflow-y-auto pr-1">
                  {subjectCounts.map((item, index) => (
                    <div
                      key={item.subject}
                      className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                        item.selected
                          ? 'border-black bg-white shadow-sm ring-1 ring-black/10'
                          : 'border-black/10 bg-slate-50/50 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <label className="flex items-center gap-3 cursor-pointer flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={item.selected}
                          onChange={e => {
                            const checked = e.target.checked;
                            setSubjectCounts(prev =>
                              prev.map((s, i) => (i === index ? { ...s, selected: checked } : s))
                            );
                          }}
                          className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black"
                        />
                        <span className="text-sm font-bold text-black truncate">{item.subject}</span>
                      </label>

                      {item.selected && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <input
                            type="number"
                            min={1}
                            max={50}
                            value={item.count}
                            onChange={e => {
                              const val = Math.max(1, parseInt(e.target.value) || 1);
                              setSubjectCounts(prev =>
                                prev.map((s, i) => (i === index ? { ...s, count: val } : s))
                              );
                            }}
                            className="w-14 text-center bg-slate-100 border border-black/10 rounded-lg py-1 text-xs font-bold text-black focus:outline-none focus:border-black"
                          />
                          <span className="text-[10px] text-gray-400 font-bold uppercase">ta</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Subject Summary Badge */}
                <div className="p-3 bg-slate-100 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="font-bold text-black flex items-center gap-2">
                    <span>Fanlar jamlanmasi:</span>
                    <div className="flex flex-wrap gap-1">
                      {selectedSubjects.map(s => (
                        <span key={s.subject} className="bg-white border border-black/10 px-2 py-0.5 rounded text-[10px] font-bold">
                          {s.subject}: {s.count} ta
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="font-black text-black text-sm bg-black text-white px-3 py-1 rounded-lg">
                    Jami: {totalSubjectQuestions} ta savol
                  </div>
                </div>
              </div>

              {/* Fine-grained Difficulty Distribution */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <BarChart className="w-4 h-4 text-black" /> Qiyinchilik Darajalari Taqsimoti
                  </label>
                  <button
                    type="button"
                    onClick={syncDifficultyWithTotal}
                    className="text-[11px] font-bold text-gray-500 hover:text-black uppercase tracking-wider underline"
                  >
                    Fanlar jamiga moslash
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {/* Oson */}
                  <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl text-center space-y-2">
                    <div className="text-[10px] font-black uppercase tracking-widest text-emerald-700">🟢 Oson</div>
                    <div className="flex items-center justify-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={difficultyBreakdown.oson}
                        onChange={e => setDifficultyBreakdown(prev => ({ ...prev, oson: Math.max(0, parseInt(e.target.value) || 0) }))}
                        className="w-16 text-center bg-white border border-emerald-300 rounded-xl py-2 text-lg font-black text-emerald-900 focus:outline-none"
                      />
                      <span className="text-xs font-bold text-emerald-700">ta</span>
                    </div>
                  </div>

                  {/* O'rta */}
                  <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-2xl text-center space-y-2">
                    <div className="text-[10px] font-black uppercase tracking-widest text-amber-700">🟡 O'rtacha</div>
                    <div className="flex items-center justify-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={difficultyBreakdown.orta}
                        onChange={e => setDifficultyBreakdown(prev => ({ ...prev, orta: Math.max(0, parseInt(e.target.value) || 0) }))}
                        className="w-16 text-center bg-white border border-amber-300 rounded-xl py-2 text-lg font-black text-amber-900 focus:outline-none"
                      />
                      <span className="text-xs font-bold text-amber-700">ta</span>
                    </div>
                  </div>

                  {/* Qiyin */}
                  <div className="p-4 bg-rose-50/60 border border-rose-200 rounded-2xl text-center space-y-2">
                    <div className="text-[10px] font-black uppercase tracking-widest text-rose-700">🔴 Qiyin</div>
                    <div className="flex items-center justify-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={difficultyBreakdown.qiyin}
                        onChange={e => setDifficultyBreakdown(prev => ({ ...prev, qiyin: Math.max(0, parseInt(e.target.value) || 0) }))}
                        className="w-16 text-center bg-white border border-rose-300 rounded-xl py-2 text-lg font-black text-rose-900 focus:outline-none"
                      />
                      <span className="text-xs font-bold text-rose-700">ta</span>
                    </div>
                  </div>
                </div>

                {/* Synchronized Warning Notice if mismatch */}
                {totalDifficultyQuestions !== totalSubjectQuestions && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-center justify-between">
                    <span>⚠️ Fanlar jami (<strong>{totalSubjectQuestions}</strong>) va qiyinchiliklar jami (<strong>{totalDifficultyQuestions}</strong>) mos emas.</span>
                    <button
                      type="button"
                      onClick={syncDifficultyWithTotal}
                      className="px-3 py-1 bg-amber-600 text-white font-bold rounded-lg text-[10px] uppercase tracking-wider"
                    >
                      Tenglashtirish
                    </button>
                  </div>
                )}
              </div>

              {/* Mavzu Yo'nalishi */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                  Maxsus Mavzu Yo'nalishi <span className="text-gray-300 font-normal lowercase">(ixtiyoriy)</span>
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  placeholder="Masalan: Mantiqiy misollar, Geometrik shakllar, Matnli masalalar..."
                  className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-sm text-black placeholder:text-gray-300 focus:border-black focus:outline-none"
                />
              </div>
            </div>
          ) : (
            /* Simple Mode */
            <div className="space-y-6">
              {/* Fan / Subject */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <BookOpen className="w-3.5 h-3.5 text-black" /> Fan / Kategoriya
                </label>
                <select
                  value={simpleSubject}
                  onChange={e => setSimpleSubject(e.target.value)}
                  className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-sm text-black font-medium focus:border-black focus:outline-none transition-colors"
                >
                  <option value="Barchasi (Diagnostika)">Barchasi (Diagnostika)</option>
                  {subjectCounts.map(item => (
                    <option key={item.subject} value={item.subject}>{item.subject}</option>
                  ))}
                </select>
              </div>

              {/* Sinf & Savollar Soni Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5 text-black" /> Sinf
                  </label>
                  <select
                    value={grade}
                    onChange={e => setGrade(e.target.value)}
                    className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-sm text-black font-medium focus:border-black focus:outline-none transition-colors"
                  >
                    {['5', '6', '7', '8', '9', '10', '11'].map(g => (
                      <option key={g} value={g}>{g}-sinf</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                    Savollar soni
                  </label>
                  <select
                    value={simpleQuestionCount}
                    onChange={e => setSimpleQuestionCount(Number(e.target.value))}
                    className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-sm text-black font-medium focus:border-black focus:outline-none transition-colors"
                  >
                    <option value={5}>5 ta savol (Qisqa test)</option>
                    <option value={10}>10 ta savol</option>
                    <option value={15}>15 ta savol (Standart)</option>
                    <option value={20}>20 ta savol</option>
                    <option value={30}>30 ta savol (To'liq Diagnostika)</option>
                  </select>
                </div>
              </div>

              {/* Qiyinlik darajasi */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <BarChart className="w-3.5 h-3.5 text-black" /> Qiyinlik Darajasi
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {['Aralash', 'Oson', "O'rta", 'Qiyin'].map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setSimpleDifficulty(d)}
                      className={`py-3 rounded-xl text-xs font-bold transition-all border ${
                        simpleDifficulty === d
                          ? 'bg-black text-white border-black shadow-md'
                          : 'bg-white text-gray-600 border-black/10 hover:border-black/30'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* Kontekst / Mavzu (Optional) */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                  Mavzu yoki Maxsus Yo'nalish <span className="text-gray-300 font-normal lowercase">(ixtiyoriy)</span>
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  placeholder="Masalan: Tenglamalar, Kasrlar, Shakllar mantiqi"
                  className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-sm text-black placeholder:text-gray-300 focus:border-black focus:outline-none transition-colors"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!createdTestId && (
          <div className="p-6 border-t border-black/5 bg-white flex justify-between items-center">
            <div className="text-xs font-bold text-gray-500">
              {activeMode === 'matrix' ? (
                <span>Jami: <strong className="text-black">{totalSubjectQuestions} ta</strong> savol shakllantiriladi</span>
              ) : (
                <span>Jami: <strong className="text-black">{simpleQuestionCount} ta</strong> savol</span>
              )}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-3 text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-black transition-colors"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                disabled={isGenerating}
                onClick={handleGenerate}
                className={`px-8 py-3.5 bg-black text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${
                  isGenerating ? 'bg-black/50 cursor-wait' : 'hover:bg-neutral-800 shadow-md'
                }`}
              >
                {isGenerating && <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>}
                {isGenerating ? 'Yaratilmoqda...' : 'AI Testni Yaratish'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
