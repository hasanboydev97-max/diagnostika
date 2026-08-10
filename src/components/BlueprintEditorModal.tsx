import { useState, useEffect, useRef } from 'react';
import type { QuestionBlueprint, CognitiveSkill, Difficulty, ThinkingType } from '../lib/blueprint';
import { GRADE_BLUEPRINTS } from '../lib/gradeBlueprints';
import { X, Save, RotateCcw, Sparkles, ChevronDown, Plus } from 'lucide-react';
import { generateGradeBlueprint } from '../lib/gemini';
import { db } from '../lib/db';

const DEFAULT_SUBJECT_LIST = [
  'Matematika', 
  'Informatika', 
  'Kimyo', 
  'Biologiya', 
  'Ingliz tili', 
  'Rus tili', 
  'Mantiq', 
  'Fizika', 
  'Tarix', 
  'O\'zbek tili', 
  'Geografiya', 
  'Kreativlik', 
  'Analitik'
];

function CustomCombobox({ 
  value, 
  onChange, 
  options, 
  placeholder,
  onAddCategory
}: { 
  value: string; 
  onChange: (val: string) => void; 
  options: string[]; 
  placeholder: string;
  onAddCategory?: (val: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => setInputValue(value), [value]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const mergedOptions = Array.from(new Set([...DEFAULT_SUBJECT_LIST, ...options]));
  const filteredOptions = mergedOptions.filter(o => o.toLowerCase().includes(inputValue.toLowerCase()));
  const exactMatch = mergedOptions.some(o => o.toLowerCase() === inputValue.trim().toLowerCase());
  const showAdd = inputValue.trim().length > 0 && !exactMatch;

  return (
    <div className="relative w-full" ref={containerRef}>
      <div className="relative flex items-center">
        <input 
          type="text"
          value={inputValue}
          onChange={e => {
             setInputValue(e.target.value);
             onChange(e.target.value);
             setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full border-b border-black/10 bg-transparent py-2 pr-7 text-sm font-medium text-black focus:border-black outline-none transition-colors"
        />
        <button 
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-0 top-1/2 -translate-y-1/2 p-1 hover:bg-black/5 rounded-full transition-colors text-gray-400 focus:outline-none flex items-center justify-center"
        >
          <ChevronDown className={`w-3.5 h-3.5 text-black transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} strokeWidth={2.5} />
        </button>
      </div>
      
      {isOpen && (
        <div className="absolute z-[100] top-full left-0 min-w-[240px] w-max max-w-[280px] mt-2 flex flex-col bg-white/95 backdrop-blur-xl border border-black/10 shadow-[0_20px_50px_rgba(0,0,0,0.18)] rounded-2xl p-2 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="overflow-y-auto max-h-48 space-y-0.5 pr-1 scrollbar-thin">
            {filteredOptions.map(opt => {
              const isSelected = opt.toLowerCase() === inputValue.trim().toLowerCase();
              return (
                <div 
                  key={opt}
                  onClick={() => {
                    setInputValue(opt);
                    onChange(opt);
                    setIsOpen(false);
                  }}
                  className={`px-3 py-2 text-xs font-semibold rounded-xl cursor-pointer transition-all flex items-center justify-between ${
                    isSelected 
                      ? 'bg-black text-white' 
                      : 'text-black hover:bg-slate-100 hover:text-black'
                  }`}
                >
                  <span>{opt}</span>
                  {isSelected && <span className="text-[10px] text-emerald-400 font-bold">✓</span>}
                </div>
              );
            })}
            {filteredOptions.length === 0 && !showAdd && (
              <div className="px-3 py-3 text-xs text-gray-400 italic text-center">Mavjud emas</div>
            )}
          </div>
          
          {showAdd && (
            <div className="pt-2 mt-2 border-t border-black/10">
              <button
                type="button"
                onClick={() => {
                  if (onAddCategory) onAddCategory(inputValue.trim());
                  onChange(inputValue.trim());
                  setIsOpen(false);
                }}
                className="w-full text-left px-3 py-2.5 bg-black text-white hover:bg-neutral-800 rounded-xl text-xs font-semibold flex items-center justify-between transition-all shadow-md group"
              >
                <span className="flex items-center gap-2 truncate pr-1">
                  <Plus className="w-3.5 h-3.5 text-emerald-400 shrink-0" strokeWidth={3} />
                  <span className="truncate">Yangi fan: <strong className="text-emerald-300 font-bold">{inputValue.trim()}</strong></span>
                </span>
                <span className="text-[9px] bg-white/20 px-2 py-0.5 rounded-full font-mono uppercase tracking-wider shrink-0">Qo'shish</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface Props {
  grade: string;
  initialBlueprint: QuestionBlueprint[];
  onSave: (newBlueprint: QuestionBlueprint[]) => void;
  onClose: () => void;
}

export default function BlueprintEditorModal({ grade, initialBlueprint, onSave, onClose }: Props) {
  const [blueprint, setBlueprint] = useState<QuestionBlueprint[]>(initialBlueprint);
  const [isGenerating, setIsGenerating] = useState(false);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);

  useEffect(() => {
    db.getAllCategories().then(cats => setAvailableCategories(cats));
  }, []);

  const handleChange = (index: number, field: keyof QuestionBlueprint, value: any) => {
    const newBp = [...blueprint];
    newBp[index] = { ...newBp[index], [field]: value };
    setBlueprint(newBp);
  };

  const handleAddCategory = async (newCategory: string) => {
    await db.addCustomCategory(newCategory);
    const updatedCats = await db.getAllCategories();
    setAvailableCategories(updatedCats);
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
    <div className="fixed inset-0 bg-black/20 backdrop-blur-md z-50 flex items-center justify-center p-4 md:p-6">
      <div className="bg-[#fdfdfd] rounded-[24px] shadow-[0_16px_40px_rgb(0,0,0,0.12)] border border-black/10 w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 md:p-8 border-b border-black/5 bg-transparent">
          <div>
            <h2 className="text-2xl md:text-3xl font-medium tracking-tight text-black">{grade}-sinf uchun test qolipi</h2>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em] mt-2">Mavzu va parametrlarni tahrirlash</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-black hover:bg-black/5 rounded-full transition-colors">
            <X className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-transparent">
          <div className="space-y-2">
            {blueprint.map((q, i) => (
              <div key={q.id} className="group flex flex-col md:flex-row gap-4 md:gap-6 items-start md:items-end p-4 rounded-2xl hover:bg-black/[0.02] border border-transparent hover:border-black/5 transition-colors">
                <div className="font-medium text-gray-300 w-6 pb-2">#{String(q.id).padStart(2, '0')}</div>
                
                <div className="flex-1 w-full">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-1 block">Mavzu / Savol matni</label>
                  <input 
                    type="text" 
                    value={q.topic} 
                    onChange={e => handleChange(i, 'topic', e.target.value)}
                    className="w-full border-b border-black/10 bg-transparent py-2 text-sm text-black focus:border-black outline-none transition-colors"
                  />
                </div>

                <div className="w-full md:w-40">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-1 block">Kategoriya</label>
                  <CustomCombobox 
                    value={q.category} 
                    onChange={val => handleChange(i, 'category', val)}
                    options={availableCategories}
                    placeholder="Masalan: Fizika"
                    onAddCategory={handleAddCategory}
                  />
                </div>

                <div className="w-full md:w-28">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-1 block">Qiyinlik</label>
                  <select 
                    value={q.difficulty} 
                    onChange={e => handleChange(i, 'difficulty', e.target.value as Difficulty)}
                    className="w-full border-b border-black/10 bg-transparent py-2 text-sm text-black focus:border-black outline-none transition-colors cursor-pointer"
                  >
                    <option value="Oson">Oson</option>
                    <option value="O'rta">O'rta</option>
                    <option value="Qiyin">Qiyin</option>
                  </select>
                </div>

                <div className="w-full md:w-32">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-1 block">Ko'nikma</label>
                  <select 
                    value={q.skill} 
                    onChange={e => handleChange(i, 'skill', e.target.value as CognitiveSkill)}
                    className="w-full border-b border-black/10 bg-transparent py-2 text-sm text-black focus:border-black outline-none transition-colors cursor-pointer"
                  >
                    <option value="Tushunish">Tushunish</option>
                    <option value="Qo'llash">Qo'llash</option>
                    <option value="Tahlil qilish">Tahlil qilish</option>
                    <option value="Baholash">Baholash</option>
                    <option value="Sintezlash">Sintezlash</option>
                  </select>
                </div>

                <div className="w-full md:w-32">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-1 block">Fikrlash turi</label>
                  <select 
                    value={q.thinkingType} 
                    onChange={e => handleChange(i, 'thinkingType', e.target.value as ThinkingType)}
                    className="w-full border-b border-black/10 bg-transparent py-2 text-sm text-black focus:border-black outline-none transition-colors cursor-pointer"
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
        <div className="p-6 md:p-8 border-t border-black/5 bg-[#fdfdfd] flex flex-col md:flex-row justify-between gap-6 items-center">
          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            <button 
              onClick={() => setBlueprint(GRADE_BLUEPRINTS[grade] || GRADE_BLUEPRINTS['5'])} 
              className="px-4 py-2 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 hover:text-black transition-colors"
            >
              <RotateCcw className="w-4 h-4" /> Qayta tiklash
            </button>
            <button 
              onClick={handleGenerateAI}
              disabled={isGenerating}
              className={`px-6 py-3 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] rounded-full transition-all border ${isGenerating ? 'bg-black/5 border-black/5 text-gray-400 cursor-not-allowed' : 'bg-transparent border-black/10 text-black hover:border-black'}`}
            >
              {isGenerating ? (
                <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {isGenerating ? 'Yaratilmoqda...' : `AI orqali yaratish`}
            </button>
          </div>
          
          <div className="flex gap-4 w-full md:w-auto">
            <button onClick={onClose} className="flex-1 md:flex-none px-6 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 hover:text-black transition-colors">
              Bekor qilish
            </button>
            <button onClick={handleSave} className="flex-1 md:flex-none px-8 py-3 bg-black text-white rounded-full text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-black/80 shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2">
              <Save className="w-4 h-4" /> Saqlash
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
