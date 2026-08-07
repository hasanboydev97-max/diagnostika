import { useState, useEffect } from 'react';
import { X, Sparkles, Copy, ExternalLink, Check, BookOpen, Layers, BarChart, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';
import { db } from '../lib/db';
import { generateCustomTestQuestions, generateDiagnosticTest } from '../lib/gemini';
import type { QuestionBlueprint } from '../lib/blueprint';
import { useNavigate } from 'react-router-dom';

interface Props {
  initialGrade: string;
  blueprint: QuestionBlueprint[];
  onClose: () => void;
}

export default function AiTestCreatorModal({ initialGrade, blueprint, onClose }: Props) {
  const navigate = useNavigate();
  const [grade, setGrade] = useState(initialGrade);
  const [subject, setSubject] = useState('Barchasi (Diagnostika)');
  const [questionCount, setQuestionCount] = useState<number>(15);
  const [difficulty, setDifficulty] = useState<string>('Aralash');
  const [topic, setTopic] = useState('');
  
  const [categories, setCategories] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [createdTestId, setCreatedTestId] = useState<string | null>(null);

  useEffect(() => {
    db.getAllCategories().then(cats => {
      setCategories(['Barchasi (Diagnostika)', ...cats]);
    });
  }, []);

  const handleGenerate = async () => {
    setIsGenerating(true);
    const toastId = toast.loading('AI savollarni shakllantirmoqda... (30-45 soniya)');

    try {
      let questions: any[] = [];
      
      if (subject === 'Barchasi (Diagnostika)' && questionCount === 30) {
        // Full blueprint generation
        const res = await generateDiagnosticTest(blueprint, grade);
        if (res) questions = res;
      } else {
        // Custom parameter-based generation
        const actualSubject = subject === 'Barchasi (Diagnostika)' ? 'Matematika va Mantiq' : subject;
        const res = await generateCustomTestQuestions({
          subject: actualSubject,
          grade,
          questionCount,
          difficulty,
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
            difficulty: q.difficulty || (difficulty === 'Aralash' ? 'O\'rta' : difficulty),
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
    <div className="fixed inset-0 bg-black/30 backdrop-blur-md z-50 flex items-center justify-center p-4 md:p-6">
      <div className="bg-[#fdfdfd] rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-black/10 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 md:p-8 border-b border-black/5 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-black text-white flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold tracking-tight text-black">AI Test Yaratish</h2>
              <p className="text-xs text-gray-500 mt-0.5">Parametrlarni belgilang — AI savollarni tuzib beradi</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-black hover:bg-black/5 rounded-full transition-colors">
            <X className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 md:p-8 overflow-y-auto space-y-6 flex-1">
          {createdTestId ? (
            <div className="text-center py-8 space-y-6">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-200">
                <Check className="w-8 h-8" strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-black">Test Tayyor!</h3>
                <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest">O'quvchiga quyidagi test kodini bering</p>
              </div>

              <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl max-w-sm mx-auto flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">TEST KODI</div>
                  <div className="text-3xl font-black tracking-widest text-black mt-1">{createdTestId}</div>
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
                  className="px-6 py-3.5 bg-black text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2"
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
          ) : (
            <div className="space-y-6">
              {/* Fan / Subject */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <BookOpen className="w-3.5 h-3.5 text-black" /> Fan / Kategoriya
                </label>
                <select
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-sm text-black font-medium focus:border-black focus:outline-none transition-colors"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
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
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <HelpCircle className="w-3.5 h-3.5 text-black" /> Savollar soni
                  </label>
                  <select
                    value={questionCount}
                    onChange={e => setQuestionCount(Number(e.target.value))}
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
                      onClick={() => setDifficulty(d)}
                      className={`py-3 rounded-xl text-xs font-bold transition-all border ${
                        difficulty === d
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
          <div className="p-6 border-t border-black/5 bg-white flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-black transition-colors"
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
        )}
      </div>
    </div>
  );
}
