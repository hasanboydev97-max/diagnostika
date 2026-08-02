import { useState } from 'react';
import type { QuestionBlueprint, SubjectCategory, CognitiveSkill, Difficulty, ThinkingType } from '../lib/blueprint';
import { GRADE_BLUEPRINTS } from '../lib/gradeBlueprints';
import { X, Save, RotateCcw, Sparkles } from 'lucide-react';
import { generateGradeBlueprint } from '../lib/gemini';

interface Props {
  grade: string;
  initialBlueprint: QuestionBlueprint[];
  onSave: (newBlueprint: QuestionBlueprint[]) => void;
  onClose: () => void;
}

export default function BlueprintEditorModal({ grade, initialBlueprint, onSave, onClose }: Props) {
  const [blueprint, setBlueprint] = useState<QuestionBlueprint[]>(initialBlueprint);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleChange = (index: number, field: keyof QuestionBlueprint, value: any) => {
    const newBp = [...blueprint];
    newBp[index] = { ...newBp[index], [field]: value };
    setBlueprint(newBp);
  };

  const handleSave = () => {
    onSave(blueprint);
  };

  const handleGenerateAI = async () => {
    setIsGenerating(true);
    try {
      const aiBlueprint = await generateGradeBlueprint(grade);
      if (aiBlueprint && aiBlueprint.length === 30) {
        setBlueprint(aiBlueprint);
        // Optional: show a success toast or alert here
      } else {
        alert("AI kutilmagan javob qaytardi. Iltimos qayta urinib ko'ring.");
      }
    } catch (e) {
      alert("Xatolik yuz berdi: " + e);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border bg-slate-50">
          <div>
            <h2 className="text-xl font-bold text-neutral-main">{grade}-sinf uchun test qolipini tahrirlash</h2>
            <p className="text-sm text-neutral-secondary">Ushbu sinf uchun 30 ta savol mavzusi va parametrlarini moslang.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
          <div className="space-y-4">
            {blueprint.map((q, i) => (
              <div key={q.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-start md:items-center">
                <div className="font-bold text-slate-400 w-8">#{String(q.id).padStart(2, '0')}</div>
                
                <div className="flex-1 w-full">
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">Mavzu / Savol matni</label>
                  <input 
                    type="text" 
                    value={q.topic} 
                    onChange={e => handleChange(i, 'topic', e.target.value)}
                    className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="w-full md:w-32">
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">Kategoriya</label>
                  <select 
                    value={q.category} 
                    onChange={e => handleChange(i, 'category', e.target.value as SubjectCategory)}
                    className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm"
                  >
                    <option value="math">Matematika</option>
                    <option value="logic">Mantiq</option>
                    <option value="analytical">Analitik</option>
                    <option value="verbal">Verbal</option>
                    <option value="creativity">Kreativlik</option>
                  </select>
                </div>

                <div className="w-full md:w-32">
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">Qiyinlik</label>
                  <select 
                    value={q.difficulty} 
                    onChange={e => handleChange(i, 'difficulty', e.target.value as Difficulty)}
                    className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm"
                  >
                    <option value="Oson">Oson</option>
                    <option value="O'rta">O'rta</option>
                    <option value="Qiyin">Qiyin</option>
                  </select>
                </div>

                <div className="w-full md:w-32">
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">Ko'nikma</label>
                  <select 
                    value={q.skill} 
                    onChange={e => handleChange(i, 'skill', e.target.value as CognitiveSkill)}
                    className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm"
                  >
                    <option value="Tushunish">Tushunish</option>
                    <option value="Qo'llash">Qo'llash</option>
                    <option value="Tahlil qilish">Tahlil qilish</option>
                    <option value="Baholash">Baholash</option>
                    <option value="Sintezlash">Sintezlash</option>
                  </select>
                </div>

                <div className="w-full md:w-32">
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">Fikrlash turi</label>
                  <select 
                    value={q.thinkingType} 
                    onChange={e => handleChange(i, 'thinkingType', e.target.value as ThinkingType)}
                    className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm"
                  >
                    <option value="Analitik">Analitik</option>
                    <option value="Induktiv">Induktiv</option>
                    <option value="Deduktiv">Deduktiv</option>
                    <option value="Fazoviy">Fazoviy</option>
                  </select>
                </div>

              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-white flex flex-col md:flex-row justify-between gap-3 items-center">
          <div className="flex gap-3">
            <button 
              onClick={() => setBlueprint(GRADE_BLUEPRINTS[grade] || GRADE_BLUEPRINTS['5'])} 
              className="px-4 py-2 flex items-center gap-2 text-sm text-neutral-secondary hover:bg-slate-100 rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" /> Asl holatiga qaytarish
            </button>
            <button 
              onClick={handleGenerateAI}
              disabled={isGenerating}
              className={`px-4 py-2 flex items-center gap-2 text-sm font-medium rounded-lg transition-colors border shadow-sm ${isGenerating ? 'bg-indigo-50 border-indigo-200 text-indigo-400 cursor-not-allowed' : 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100'}`}
            >
              {isGenerating ? (
                <div className="w-4 h-4 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin"></div>
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {isGenerating ? 'Yaratilmoqda...' : `Avtomatik yaratish (${grade}-sinf)`}
            </button>
          </div>
          
          <div className="flex gap-3 w-full md:w-auto">
            <button onClick={onClose} className="flex-1 md:flex-none px-5 py-2 rounded-lg font-medium text-neutral-secondary hover:bg-slate-100">Bekor qilish</button>
            <button onClick={handleSave} className="flex-1 md:flex-none px-5 py-2 bg-primary text-white rounded-lg font-medium hover:bg-blue-700 flex items-center justify-center gap-2 shadow-sm">
              <Save className="w-4 h-4" /> Saqlash
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
