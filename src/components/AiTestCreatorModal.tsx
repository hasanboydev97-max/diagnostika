import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Copy, ExternalLink, Check, Plus, SlidersHorizontal, Zap } from 'lucide-react';
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
      const defaults = ['Matematika', 'Mantiq', 'Analitik', 'Verbal', 'Kreativlik'];
      const allCats = Array.from(new Set([...defaults, ...cats]));
      
      const initialSubjectCounts: SubjectCount[] = allCats.map((cat, idx) => ({
        subject: cat,
        count: idx < 3 ? 10 : 5,
        selected: idx < 3
      }));
      
      setSubjectCounts(initialSubjectCounts);
    });
  }, []);

  const selectedSubjects = subjectCounts.filter(s => s.selected && s.count > 0);
  const totalSubjectQuestions = selectedSubjects.reduce((sum, s) => sum + s.count, 0);
  const totalDifficultyQuestions = difficultyBreakdown.oson + difficultyBreakdown.orta + difficultyBreakdown.qiyin;

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
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 md:p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="bg-[#fdfdfd] border border-black/10 w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh] shadow-[0_30px_70px_rgba(0,0,0,0.12)] selection:bg-black selection:text-white"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 md:p-8 border-b border-black/10 bg-white">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 border border-black/10 bg-black text-white flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-gray-400 block mb-0.5">AI KONSTRUKTOR</span>
                <h2 className="text-xl md:text-2xl font-medium tracking-tight text-[#111111]">AI Test Yaratish</h2>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="p-2 text-gray-400 hover:text-black transition-colors border border-transparent hover:border-black/10"
            >
              <X className="w-5 h-5" strokeWidth={1.5} />
            </button>
          </div>

          {/* Mode Tabs */}
          {!createdTestId && (
            <div className="px-6 md:px-8 bg-white border-b border-black/10 flex gap-6">
              <button
                type="button"
                onClick={() => setActiveMode('matrix')}
                className={`py-4 text-[10px] font-bold uppercase tracking-[0.25em] transition-all border-b-2 flex items-center gap-2 ${
                  activeMode === 'matrix'
                    ? 'border-black text-[#111111]'
                    : 'border-transparent text-gray-400 hover:text-black'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" /> Chuqur Sozlama (Multi-Fan & Qiyinlik Matritsasi)
              </button>
              <button
                type="button"
                onClick={() => setActiveMode('simple')}
                className={`py-4 text-[10px] font-bold uppercase tracking-[0.25em] transition-all border-b-2 flex items-center gap-2 ${
                  activeMode === 'simple'
                    ? 'border-black text-[#111111]'
                    : 'border-transparent text-gray-400 hover:text-black'
                }`}
              >
                <Zap className="w-3.5 h-3.5" /> Tezkor Rejim
              </button>
            </div>
          )}

          {/* Content */}
          <div className="p-6 md:p-8 overflow-y-auto space-y-8 flex-1">
            {createdTestId ? (
              <div className="text-center py-10 space-y-8">
                <div className="w-16 h-16 border border-black/10 bg-black text-white flex items-center justify-center mx-auto shadow-md">
                  <Check className="w-6 h-6" strokeWidth={2} />
                </div>
                <div>
                  <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-gray-400 block mb-2">MUVAFFAQIYATLI YARATILDI</span>
                  <h3 className="text-3xl font-medium tracking-tight text-[#111111]">Test Tayyor</h3>
                  <p className="text-xs text-gray-500 mt-2 leading-relaxed">O'quvchiga quyidagi 6 xonali test kodini taqdim eting</p>
                </div>

                <div className="p-8 bg-white border border-black/10 max-w-sm mx-auto flex items-center justify-between shadow-sm">
                  <div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em]">TEST KODI</div>
                    <div className="text-4xl font-medium tracking-widest text-[#111111] mt-2 select-all font-mono">{createdTestId}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(createdTestId);
                      toast.success('Test kodi nusxalandi!');
                    }}
                    className="px-4 py-3 bg-black text-white border border-black text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-black/80 transition-colors flex items-center gap-2"
                  >
                    <Copy className="w-3.5 h-3.5" /> Nusxalash
                  </button>
                </div>

                <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-center">
                  <button
                    type="button"
                    onClick={() => navigate(`/online-tests/take/${createdTestId}`)}
                    className="px-8 py-4 bg-black text-white border border-black text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-black/80 transition-colors flex items-center justify-center gap-2"
                  >
                    Testni ochish (O'quvchi ko'rinishida) <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreatedTestId(null)}
                    className="px-8 py-4 bg-transparent text-black border border-black/20 text-[10px] font-bold uppercase tracking-[0.2em] hover:border-black transition-colors"
                  >
                    Yangi test yaratish
                  </button>
                </div>
              </div>
            ) : activeMode === 'matrix' ? (
              /* Matrix Mode */
              <div className="space-y-8">
                {/* Sinf Selector */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em] mb-4">Sinf Tanlang</label>
                  <div className="flex flex-wrap gap-2">
                    {['5', '6', '7', '8', '9', '10', '11'].map(g => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setGrade(g)}
                        className={`px-5 py-2.5 text-xs font-bold transition-all border ${
                          grade === g
                            ? 'bg-black text-white border-black'
                            : 'bg-transparent text-gray-600 border-black/10 hover:border-black hover:text-black'
                        }`}
                      >
                        {g}-sinf
                      </button>
                    ))}
                  </div>
                </div>

                {/* Multi-subject selection */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-black/10 pb-3">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em]">
                      Fanlarni Tanlang va Savollar Sonini Belgilang
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowAddCustom(!showAddCustom)}
                      className="text-[10px] font-bold text-black uppercase tracking-[0.2em] hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Yangi fan qo'shish
                    </button>
                  </div>

                  {showAddCustom && (
                    <div className="p-4 border border-black/10 bg-white flex gap-3">
                      <input
                        type="text"
                        value={newCustomSubject}
                        onChange={e => setNewCustomSubject(e.target.value)}
                        placeholder="Masalan: Fizika, Tarix, Geografiya..."
                        className="flex-1 bg-transparent border-b border-black/20 px-2 py-2 text-sm text-black focus:outline-none focus:border-black placeholder:text-gray-300"
                      />
                      <button
                        type="button"
                        onClick={handleAddCustomSubject}
                        className="px-5 py-2 bg-black text-white text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-black/80"
                      >
                        Saqlash
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-56 overflow-y-auto pr-1">
                    {subjectCounts.map((item, index) => (
                      <div
                        key={item.subject}
                        className={`p-4 border transition-all flex items-center justify-between gap-3 ${
                          item.selected
                            ? 'border-black bg-white shadow-sm'
                            : 'border-black/10 bg-transparent opacity-60 hover:opacity-100 hover:border-black/30'
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
                            className="w-4 h-4 rounded-none border-black/20 text-black focus:ring-0"
                          />
                          <span className="text-sm font-medium text-black truncate">{item.subject}</span>
                        </label>

                        {item.selected && (
                          <div className="flex items-center gap-2 shrink-0">
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
                              className="w-14 text-center border-b border-black/30 bg-transparent py-1 text-xs font-mono font-bold text-black focus:outline-none focus:border-black"
                            />
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">ta</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Subject Summary Badge */}
                  <div className="p-4 border border-black/10 bg-white flex flex-wrap items-center justify-between gap-3">
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] flex items-center gap-2">
                      <span>TANLANGAN FANLAR:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedSubjects.map(s => (
                          <span key={s.subject} className="bg-black/5 border border-black/10 px-2.5 py-1 text-[10px] font-mono text-black">
                            {s.subject}: {s.count} ta
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="font-mono font-bold text-xs bg-black text-white px-3.5 py-1.5 uppercase tracking-widest">
                      Jami: {totalSubjectQuestions} ta savol
                    </div>
                  </div>
                </div>

                {/* Fine-grained Difficulty Distribution */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-black/10 pb-3">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em]">
                      Qiyinchilik Darajalari Taqsimoti
                    </label>
                    <button
                      type="button"
                      onClick={syncDifficultyWithTotal}
                      className="text-[10px] font-bold text-gray-500 hover:text-black uppercase tracking-[0.2em] underline"
                    >
                      Fanlar jamiga moslash
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {/* Oson */}
                    <div className="p-4 border border-black/10 bg-white text-center space-y-2">
                      <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-500">OSON</div>
                      <div className="flex items-center justify-center gap-2">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={difficultyBreakdown.oson}
                          onChange={e => setDifficultyBreakdown(prev => ({ ...prev, oson: Math.max(0, parseInt(e.target.value) || 0) }))}
                          className="w-16 text-center border-b border-black/30 bg-transparent py-1 text-xl font-mono font-bold text-black focus:outline-none focus:border-black"
                        />
                        <span className="text-[10px] font-bold text-gray-400 uppercase">ta</span>
                      </div>
                    </div>

                    {/* O'rta */}
                    <div className="p-4 border border-black/10 bg-white text-center space-y-2">
                      <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-500">O'RTACHA</div>
                      <div className="flex items-center justify-center gap-2">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={difficultyBreakdown.orta}
                          onChange={e => setDifficultyBreakdown(prev => ({ ...prev, orta: Math.max(0, parseInt(e.target.value) || 0) }))}
                          className="w-16 text-center border-b border-black/30 bg-transparent py-1 text-xl font-mono font-bold text-black focus:outline-none focus:border-black"
                        />
                        <span className="text-[10px] font-bold text-gray-400 uppercase">ta</span>
                      </div>
                    </div>

                    {/* Qiyin */}
                    <div className="p-4 border border-black/10 bg-white text-center space-y-2">
                      <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-500">QIYIN</div>
                      <div className="flex items-center justify-center gap-2">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={difficultyBreakdown.qiyin}
                          onChange={e => setDifficultyBreakdown(prev => ({ ...prev, qiyin: Math.max(0, parseInt(e.target.value) || 0) }))}
                          className="w-16 text-center border-b border-black/30 bg-transparent py-1 text-xl font-mono font-bold text-black focus:outline-none focus:border-black"
                        />
                        <span className="text-[10px] font-bold text-gray-400 uppercase">ta</span>
                      </div>
                    </div>
                  </div>

                  {totalDifficultyQuestions !== totalSubjectQuestions && (
                    <div className="p-4 border border-black/20 bg-black/5 text-black text-xs flex items-center justify-between">
                      <span className="text-[10px] font-bold tracking-wider uppercase">
                        ⚠️ Fanlar jami (<strong>{totalSubjectQuestions}</strong>) va qiyinchiliklar jami (<strong>{totalDifficultyQuestions}</strong>) mos emas.
                      </span>
                      <button
                        type="button"
                        onClick={syncDifficultyWithTotal}
                        className="px-3 py-1 bg-black text-white font-bold text-[9px] uppercase tracking-[0.2em]"
                      >
                        Tenglashtirish
                      </button>
                    </div>
                  )}
                </div>

                {/* Mavzu Yo'nalishi */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em] mb-2">
                    Maxsus Mavzu Yo'nalishi <span className="text-gray-300 font-normal lowercase">(ixtiyoriy)</span>
                  </label>
                  <input
                    type="text"
                    value={topic}
                    onChange={e => setTopic(e.target.value)}
                    placeholder="Masalan: Tenglamalar, Kasrlar, Shakllar mantiqi..."
                    className="w-full bg-transparent border-b border-black/20 pb-3 text-sm text-black placeholder:text-gray-300 focus:outline-none focus:border-black transition-colors"
                  />
                </div>
              </div>
            ) : (
              /* Simple Mode */
              <div className="space-y-8">
                {/* Fan / Subject */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em] mb-2">Fan / Kategoriya</label>
                  <select
                    value={simpleSubject}
                    onChange={e => setSimpleSubject(e.target.value)}
                    className="w-full bg-transparent border-b border-black/20 pb-3 text-base text-black focus:outline-none focus:border-black transition-colors"
                  >
                    <option value="Barchasi (Diagnostika)">Barchasi (Diagnostika)</option>
                    {subjectCounts.map(item => (
                      <option key={item.subject} value={item.subject}>{item.subject}</option>
                    ))}
                  </select>
                </div>

                {/* Sinf & Savollar Soni Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em] mb-2">Sinf</label>
                    <select
                      value={grade}
                      onChange={e => setGrade(e.target.value)}
                      className="w-full bg-transparent border-b border-black/20 pb-3 text-base text-black focus:outline-none focus:border-black transition-colors"
                    >
                      {['5', '6', '7', '8', '9', '10', '11'].map(g => (
                        <option key={g} value={g}>{g}-sinf</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em] mb-2">Savollar soni</label>
                    <select
                      value={simpleQuestionCount}
                      onChange={e => setSimpleQuestionCount(Number(e.target.value))}
                      className="w-full bg-transparent border-b border-black/20 pb-3 text-base text-black focus:outline-none focus:border-black transition-colors"
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
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em] mb-4">Qiyinlik Darajasi</label>
                  <div className="grid grid-cols-4 gap-2">
                    {['Aralash', 'Oson', "O'rta", 'Qiyin'].map(d => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setSimpleDifficulty(d)}
                        className={`py-3 text-xs font-bold transition-all border ${
                          simpleDifficulty === d
                            ? 'bg-black text-white border-black'
                            : 'bg-transparent text-gray-500 border-black/10 hover:border-black hover:text-black'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Kontekst / Mavzu (Optional) */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em] mb-2">
                    Mavzu yoki Maxsus Yo'nalish <span className="text-gray-300 font-normal lowercase">(ixtiyoriy)</span>
                  </label>
                  <input
                    type="text"
                    value={topic}
                    onChange={e => setTopic(e.target.value)}
                    placeholder="Masalan: Tenglamalar, Kasrlar, Shakllar mantiqi..."
                    className="w-full bg-transparent border-b border-black/20 pb-3 text-sm text-black placeholder:text-gray-300 focus:outline-none focus:border-black transition-colors"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          {!createdTestId && (
            <div className="p-6 border-t border-black/10 bg-white flex justify-between items-center">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">
                {activeMode === 'matrix' ? (
                  <span>Jami: <strong className="text-black font-mono">{totalSubjectQuestions} ta</strong> savol</span>
                ) : (
                  <span>Jami: <strong className="text-black font-mono">{simpleQuestionCount} ta</strong> savol</span>
                )}
              </div>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 hover:text-black transition-colors"
                >
                  Bekor qilish
                </button>
                <button
                  type="button"
                  disabled={isGenerating}
                  onClick={handleGenerate}
                  className={`px-8 py-4 bg-black text-white text-[10px] font-bold uppercase tracking-[0.3em] border border-black transition-all flex items-center gap-3 ${
                    isGenerating ? 'bg-black/50 cursor-wait' : 'hover:bg-black/80'
                  }`}
                >
                  {isGenerating && <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>}
                  {isGenerating ? 'Yaratilmoqda...' : 'AI Testni Yaratish'}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
