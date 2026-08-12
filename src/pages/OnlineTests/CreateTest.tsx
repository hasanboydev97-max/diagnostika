import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Sparkles, Plus, Trash2, Loader2, Save, Settings2, FileText, Upload, Table } from 'lucide-react';
import { toast } from 'sonner';
import FormattedText from '../../components/FormattedText';
import { getAuthHeaders, getToken, getTeacher } from '../../lib/auth';
import MeshGradient from '../../components/ui/MeshGradient';
import MagicButton from '../../components/MagicButton';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function CreateTest() {
  const navigate = useNavigate();
  const location = useLocation();
  const teacher = getTeacher();
  const [title, setTitle] = useState('');
  const [subject] = useState(teacher?.subject || '');
  const [hasTimeLimit, setHasTimeLimit] = useState(false);
  const [durationMinutes, setDurationMinutes] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [mode, setMode] = useState<'ai' | 'manual' | 'ocr' | 'excel'>('excel');
  const [ocrText, setOcrText] = useState('');
  
  useEffect(() => {
    if (!getToken()) {
      navigate('/teacher/login');
      return;
    }
  }, [navigate]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [topic, setTopic] = useState('');
  const [questionCount, setQuestionCount] = useState<number | string>(0);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [questions, setQuestions] = useState<any[]>(() => {
    const st = location.state as any;
    return st?.importedQuestions || [];
  });

  const handleGenerate = async () => {
    if (!subject.trim()) {
      toast.error('Subject is required for AI generation');
      return;
    }
    setGenerating(true);
    const toastId = toast.loading('AI is crafting your questions...');
    
    try {
      const res = await fetch(`${API_URL}/online-tests/generate`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ subject, topic, questionCount })
      });
      const data = await res.json();
      
      if (data.questions) {
        setQuestions(data.questions);
        toast.success('Questions generated successfully!', { id: toastId });
      } else {
        toast.error(data.error || 'Failed to generate questions.', { id: toastId });
      }
    } catch (error) {
      console.error(error);
      toast.error('Network error during generation.', { id: toastId });
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateOcr = async () => {
    if (teacher?.plan !== 'premium') {
      toast.error('Hujjat va Rasmdan (OCR) test yaratish faqat Premium tarifda mavjud! Tarifni oshiring.');
      return;
    }
    if (!ocrText.trim()) {
      toast.error('Iltimos, matn yoki hujjat mazmunini kiriting.');
      return;
    }
    setGenerating(true);
    const toastId = toast.loading('Hujjat tahlil qilinmoqda va test yaratilmoqda...');
    try {
      const res = await fetch(`${API_URL}/online-tests/generate-ocr`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ rawText: ocrText, questionCount })
      });
      const data = await res.json();
      if (data.questions) {
        setQuestions([...questions, ...data.questions]);
        toast.success('Hujjatdan test muvaffaqiyatli yaratildi!', { id: toastId });
        setOcrText('');
      } else {
        toast.error(data.error || 'Hujjatdan test yaratishda xatolik.', { id: toastId });
      }
    } catch (err: any) {
      toast.error(err.message || 'Xatolik yuz berdi', { id: toastId });
    } finally {
      setGenerating(false);
    }
  };

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setGenerating(true);
    const toastId = toast.loading('Fayl tahlil qilinmoqda...');
    
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = evt.target?.result;
        // Dymamically import xlsx to keep bundle light
        const XLSX = await import('xlsx');
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Export to array of arrays
        const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        const newQuestions = [];
        // Skip row 0 if it looks like a header (e.g. contains 'savol' or 'A')
        const headerText = rows[0] ? rows[0].join('').toLowerCase() : '';
        const startIdx = (headerText.includes('savol') || headerText.includes('variant')) ? 1 : 0;

        for (let i = startIdx; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length < 6) continue;
          
          const questionText = String(row[0] || '').trim();
          if (!questionText) continue;

          const options = [
            String(row[1] || '').trim(),
            String(row[2] || '').trim(),
            String(row[3] || '').trim(),
            String(row[4] || '').trim()
          ];

          let correctRaw = String(row[5] || '').trim();
          let correctOption = '';

          const upperCorrect = correctRaw.toUpperCase();
          if (upperCorrect === 'A') correctOption = options[0];
          else if (upperCorrect === 'B') correctOption = options[1];
          else if (upperCorrect === 'C') correctOption = options[2];
          else if (upperCorrect === 'D') correctOption = options[3];
          else {
             if (options.includes(correctRaw)) {
               correctOption = correctRaw;
             } else {
               correctOption = options[0]; // fallback
             }
          }

          newQuestions.push({
            questionText,
            options,
            correctOption,
            type: 'multiple_choice'
          });
        }

        if (newQuestions.length > 0) {
           setQuestions([...questions, ...newQuestions]);
           toast.success(`${newQuestions.length} ta savol muvaffaqiyatli import qilindi!`, { id: toastId });
        } else {
           toast.error('Fayldan hech qanday savol topilmadi. Formatni tekshiring.', { id: toastId });
        }
      } catch (err) {
        console.error(err);
        toast.error('Faylni o\'qishda xatolik yuz berdi.', { id: toastId });
      } finally {
        setGenerating(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.onerror = () => {
      toast.error('Faylni o\'qishda xatolik yuz berdi.', { id: toastId });
      setGenerating(false);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleSave = async () => {
    if (!title.trim() || !subject.trim()) {
      return toast.error('Title and Subject are required.');
    }
    if (questions.length === 0) {
      return toast.error('Please add at least one question.');
    }
    
    // Validate questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.questionText.trim()) return toast.error(`Question ${i + 1} is empty.`);
      if (!q.correctOption) return toast.error(`Select a correct option for question ${i + 1}.`);
      if (q.options.some((opt: string) => !opt.trim())) return toast.error(`Some options in question ${i + 1} are empty.`);
    }

    if (hasTimeLimit) {
      if (!startTime || !endTime) return toast.error('Iltimos, boshlanish va tugash vaqtlarini kiriting.');
      if (new Date(startTime) >= new Date(endTime)) return toast.error('Tugash vaqti boshlanishidan keyin bo\'lishi kerak.');
    }

    setSaving(true);
    const id = 'test_' + Date.now().toString();
    const testData = {
      id,
      title,
      subject,
      questions,
      durationMinutes: durationMinutes ? Number(durationMinutes) : null,
      startTime: hasTimeLimit ? new Date(startTime).toISOString() : null,
      endTime: hasTimeLimit ? new Date(endTime).toISOString() : null,
      createdAt: new Date().toISOString()
    };
    try {
      const res = await fetch(`${API_URL}/online-tests`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(testData)
      });
      
      if (!res.ok) throw new Error('Save failed');
      
      toast.success('Test saved successfully!');
      navigate('/online-tests');
    } catch (error) {
      console.error(error);
      toast.error('Failed to save test.');
    } finally {
      setSaving(false);
    }
  };

  const addManualQuestion = () => {
    setQuestions([...questions, {
      questionText: '',
      options: ['', '', '', ''],
      correctOption: '',
      type: 'multiple_choice'
    }]);
  };

  return (
    <div className="min-h-screen relative font-sans text-[#111111] overflow-x-hidden bg-[#fdfdfd] pb-24">
      <MeshGradient />
      
      {/* Header */}
      <header className="border-b border-white/50 bg-white/60 backdrop-blur-xl sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-3 md:px-6 h-14 flex items-center justify-between">
          <button 
            onClick={() => navigate('/online-tests')}
            className="flex items-center gap-2 text-xs font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            <ArrowLeft size={14} />
            Orqaga
          </button>
          <div className="text-sm font-semibold tracking-tight">Yangi Test Yaratish</div>
          <div className="scale-[0.85] origin-right">
            <MagicButton
              onClick={handleSave}
              disabled={saving}
              loading={saving}
              label="Saqlash"
              icon={<Save />}
            />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 md:px-6 py-6 md:py-8 relative z-20">
        
        {/* Settings Section */}
        <section className="mb-10 bg-white/60 backdrop-blur-xl border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl p-4 md:p-8">
          <div className="flex items-center gap-2 mb-6 border-b border-white/50 pb-4">
            <Settings2 size={18} className="text-zinc-600" />
            <h2 className="text-base font-semibold">Test Sozlamalari</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Test Nomi</label>
              <input 
                type="text" 
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full px-4 py-3 bg-white/60 backdrop-blur-md border border-white/50 rounded-xl text-sm placeholder-zinc-400 focus:outline-none focus:border-white focus:bg-white/80 transition-all shadow-sm"
                placeholder="Masalan: Tarixdan choraklik imtihon"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Fan</label>
              <input 
                type="text" 
                value={subject}
                disabled
                className="w-full px-4 py-3 bg-zinc-50/50 backdrop-blur-md border border-white/50 rounded-xl text-sm text-zinc-500 cursor-not-allowed shadow-sm"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Vaqt Limiti (daqiqa)</label>
              <input 
                type="number"
                min="1"
                value={durationMinutes}
                onChange={e => setDurationMinutes(e.target.value)}
                className="w-full px-4 py-3 bg-white/60 backdrop-blur-md border border-white/50 rounded-xl text-sm placeholder-zinc-400 focus:outline-none focus:border-white focus:bg-white/80 transition-all shadow-sm"
                placeholder="Bo'sh qolsa cheklanmagan"
              />
            </div>
          </div>
          
          <div className="mt-5">
            <label className="flex items-center gap-2 cursor-pointer w-max">
              <input 
                type="checkbox" 
                checked={hasTimeLimit}
                onChange={e => setHasTimeLimit(e.target.checked)}
                className="w-4 h-4 text-zinc-900 border-zinc-300 rounded focus:ring-zinc-900"
              />
              <span className="text-xs font-medium text-zinc-700">Mavjudlik vaqtini belgilash (Ochilish/Yopilish)</span>
            </label>
            
            {hasTimeLimit && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 bg-zinc-50/50 p-4 border border-zinc-200 rounded-md">
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Boshlanish</label>
                  <input 
                    type="datetime-local" 
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-zinc-200 rounded text-xs focus:outline-none focus:border-zinc-400 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Tugash</label>
                  <input 
                    type="datetime-local" 
                    value={endTime}
                    onChange={e => setEndTime(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-zinc-200 rounded text-xs focus:outline-none focus:border-zinc-400 transition-colors"
                  />
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Builder Mode Selector */}
        <div className="flex bg-zinc-100 p-1 rounded-xl w-full max-w-[600px] mb-6 gap-1 overflow-x-auto">
          <button
            onClick={() => setMode('excel')}
            className={`flex-1 min-w-[120px] text-[11px] font-semibold uppercase tracking-wider py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              mode === 'excel' ? 'bg-white text-zinc-900 shadow-sm border border-zinc-200/50' : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            <Table size={14} /> Excel Import
          </button>
          <button
            onClick={() => setMode('ai')}
            className={`flex-1 min-w-[120px] text-[11px] font-semibold uppercase tracking-wider py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              mode === 'ai' ? 'bg-white text-zinc-900 shadow-sm border border-zinc-200/50' : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            <Sparkles size={14} /> AI Mavzuli
          </button>
          <button
            onClick={() => setMode('ocr')}
            className={`flex-1 min-w-[120px] text-[11px] font-semibold uppercase tracking-wider py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              mode === 'ocr' ? 'bg-white text-zinc-900 shadow-sm border border-zinc-200/50' : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            <FileText size={14} /> OCR 👑
          </button>
          <button
            onClick={() => setMode('manual')}
            className={`flex-1 min-w-[120px] text-[11px] font-semibold uppercase tracking-wider py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              mode === 'manual' ? 'bg-white text-zinc-900 shadow-sm border border-zinc-200/50' : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            <Plus size={14} /> Qo'lda kiritish
          </button>
        </div>

        {/* Excel Import Form */}
        {mode === 'excel' && (
          <div className="bg-white border border-zinc-200 p-6 rounded-2xl mb-8 shadow-sm text-center">
            <div className="mx-auto w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
              <Table size={24} />
            </div>
            <h3 className="text-base font-semibold text-zinc-900 tracking-tight mb-2">Excel orqali savollarni yuklash</h3>
            <p className="text-sm text-zinc-500 mb-6 max-w-lg mx-auto leading-relaxed">
              50-100 ta savolni bir soniyada yuklang. Excel faylingiz quyidagi tartibda bo'lishi kerak:
            </p>
            
            <div className="bg-zinc-50 border border-zinc-100 rounded-xl p-4 text-left max-w-xl mx-auto mb-6 text-[11px] overflow-x-auto shadow-inner">
              <table className="w-full text-zinc-600 border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 text-zinc-900 uppercase tracking-wider text-[10px]">
                    <th className="p-2 font-bold text-left">A ustun</th>
                    <th className="p-2 font-bold text-left">B ustun</th>
                    <th className="p-2 font-bold text-left">C ustun</th>
                    <th className="p-2 font-bold text-left">D ustun</th>
                    <th className="p-2 font-bold text-left">E ustun</th>
                    <th className="p-2 font-bold text-left">F ustun</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-2">Savol matni</td>
                    <td className="p-2">A variant</td>
                    <td className="p-2">B variant</td>
                    <td className="p-2">C variant</td>
                    <td className="p-2">D variant</td>
                    <td className="p-2 font-medium text-emerald-600">To'g'ri javob harfi (A/B/C/D)</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <input 
              type="file" 
              accept=".xlsx, .xls, .csv" 
              ref={fileInputRef}
              onChange={handleExcelUpload}
              className="hidden" 
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={generating}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-zinc-900 text-white text-xs font-semibold uppercase tracking-wider rounded-xl hover:bg-zinc-800 disabled:opacity-50 transition-colors focus:outline-none shadow-md"
            >
              {generating ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              {generating ? 'Fayl o\'qilmoqda...' : 'Excel faylni tanlash'}
            </button>
          </div>
        )}

        {/* AI Mavzuli Form */}
        {mode === 'ai' && (
          <div className="bg-white border border-zinc-200 p-6 rounded-2xl mb-8 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="text-zinc-900" size={16} />
              <h3 className="text-sm font-semibold text-zinc-900 uppercase tracking-wider">AI Savollar Generatsiyasi</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Aniq mavzu (Ixtiyoriy)</label>
                <input 
                  type="text" 
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm placeholder-zinc-400 focus:outline-none focus:border-zinc-400 focus:bg-white transition-colors"
                  placeholder="masalan: 2-Jahon urushi yoki Trigonometriya"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Savollar soni</label>
                <input 
                  type="number" 
                  min="1" max="20"
                  value={questionCount}
                  onChange={e => {
                    const val = e.target.value;
                    setQuestionCount(val === '' ? '' : Number(val));
                  }}
                  className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:border-zinc-400 focus:bg-white transition-colors"
                />
              </div>
            </div>
            <button
              onClick={handleGenerate}
              disabled={generating || !subject.trim()}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-zinc-900 text-white text-xs font-semibold uppercase tracking-wider rounded-xl hover:bg-zinc-800 disabled:opacity-50 transition-colors focus:outline-none shadow-md"
            >
              {generating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {generating ? 'Yaratilmoqda...' : 'Savollarni yaratish'}
            </button>
          </div>
        )}

        {/* OCR / Hujjat va Rasmdan Test Yaratish (Premium 👑) */}
        {mode === 'ocr' && (
          <div className="bg-white border border-zinc-200 p-6 rounded-2xl mb-8 shadow-sm">
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <FileText className="text-amber-500" size={16} />
                <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">Hujjatdan (OCR) Test Yaratish</h3>
              </div>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-black text-white uppercase shadow-sm">
                👑 Premium Imkoniyat
              </span>
            </div>
            <p className="text-xs text-zinc-500 mb-4">
              Kitob, darslik, yoki imtihon varaqasi matnini nusxalab ushbu joyga tashlang. AI avtomatik ravishda savol va javob variantlarini ajratib oladi!
            </p>
            <textarea
              rows={6}
              value={ocrText}
              onChange={e => setOcrText(e.target.value)}
              placeholder="Masalan: 1. O'zbekiston poytaxti qayer? A) Toshkent B) Samarqand C) Buxoro..."
              className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm placeholder-zinc-400 focus:outline-none focus:border-zinc-400 focus:bg-white transition-all mb-4 font-sans"
            />
            <MagicButton
              onClick={handleGenerateOcr}
              disabled={generating || !ocrText.trim()}
              label="Hujjatdan Savollarni Ajratib Olish"
              loading={generating}
              loadingLabel="Hujjat Tahlil Qilinmoqda..."
              icon={<Sparkles />}
            />
          </div>
        )}

        {/* Add Manual Button (only when in manual mode) */}
        {mode === 'manual' && (
          <div className="mb-8">
             <button
              onClick={addManualQuestion}
              className="w-full py-4 flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-600 bg-white border-2 border-dashed border-zinc-300 rounded-xl hover:bg-zinc-50 hover:text-zinc-900 hover:border-zinc-400 transition-all shadow-sm"
            >
              <Plus size={16} />
              Qo'lda yangi savol qo'shish
            </button>
          </div>
        )}

        {/* Questions Editor */}
        {questions.length > 0 && (
          <div className="space-y-4 mb-8">
            <div className="flex items-center gap-2 mb-4 border-b border-zinc-200 pb-3">
              <FileText size={18} className="text-zinc-500" />
              <h2 className="text-base font-semibold text-zinc-900 tracking-tight">Umumiy Savollar ({questions.length})</h2>
            </div>
            
            {questions.map((q, qIndex) => (
              <div key={qIndex} className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm relative overflow-hidden group">
                {/* Visual marker */}
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-zinc-200 group-hover:bg-zinc-800 transition-colors"></div>
                
                <div className="flex gap-4 items-start mb-5 pl-2">
                  <span className="font-mono text-xs font-bold text-zinc-500 bg-zinc-100 px-2 py-1 rounded-md mt-1 border border-zinc-200">
                    Q{String(qIndex + 1).padStart(2, '0')}
                  </span>
                  <div className="flex-1 min-w-0 bg-zinc-50 rounded-lg p-1 border border-transparent focus-within:border-zinc-300 transition-colors">
                    <MathInput
                      value={q.questionText}
                      onChange={(e: any) => {
                        const newQ = [...questions];
                        newQ[qIndex].questionText = e.target.value;
                        setQuestions(newQ);
                      }}
                      placeholder="Savol matni..."
                      isTextarea={true}
                    />
                  </div>
                  <button
                    onClick={() => setQuestions(questions.filter((_, i) => i !== qIndex))}
                    className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors mt-1"
                    title="O'chirish"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-12">
                  {q.options.map((opt: string, oIndex: number) => {
                    const isCorrect = q.correctOption === opt && opt !== '';
                    return (
                      <div key={oIndex} className={`flex items-start gap-3 p-2.5 rounded-lg border transition-all ${isCorrect ? 'border-emerald-500 bg-emerald-50/50 shadow-sm' : 'border-zinc-200 bg-white hover:border-zinc-300'}`}>
                        <div className="mt-1.5 flex items-center justify-center relative">
                          <input
                            type="radio"
                            name={`correct-${qIndex}`}
                            checked={isCorrect}
                            onChange={() => {
                              if (!opt.trim()) return toast.warning('Iltimos, avval variantni yozing.');
                              const newQ = [...questions];
                              newQ[qIndex].correctOption = opt;
                              setQuestions(newQ);
                            }}
                            className="w-4 h-4 text-emerald-600 border-zinc-300 focus:ring-emerald-500 cursor-pointer"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <MathInput
                            value={opt}
                            onChange={(e: any) => {
                              const newQ = [...questions];
                              const oldVal = newQ[qIndex].options[oIndex];
                              const newVal = e.target.value;
                              newQ[qIndex].options[oIndex] = newVal;
                              if (newQ[qIndex].correctOption === oldVal) {
                                newQ[qIndex].correctOption = newVal;
                              }
                              setQuestions(newQ);
                            }}
                            placeholder={`Variant ${String.fromCharCode(65 + oIndex)}`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

      </main>
    </div>
  );
}

// Senior-level UX: Click-to-edit Math Input
function MathInput({ 
  value, 
  onChange, 
  placeholder, 
  isTextarea = false 
}: { 
  value: string; 
  onChange: (e: any) => void; 
  placeholder: string; 
  isTextarea?: boolean; 
}) {
  const [isEditing, setIsEditing] = useState(false);

  if (!isEditing && value) {
    return (
      <div 
        onClick={() => setIsEditing(true)} 
        className={`cursor-text rounded-md px-3 py-2 transition-colors min-h-[36px] w-full flex items-center text-sm ${isTextarea ? 'items-start min-h-[50px]' : ''}`}
        title="Tahrirlash uchun bosing"
      >
        <FormattedText content={value} />
      </div>
    );
  }

  if (isTextarea) {
    return (
      <textarea
        value={value}
        onChange={onChange}
        onBlur={() => setIsEditing(false)}
        autoFocus={isEditing}
        rows={2}
        className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-md text-sm focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 resize-none shadow-sm"
        placeholder={placeholder}
      />
    );
  }

  return (
    <input
      type="text"
      value={value}
      onChange={onChange}
      onBlur={() => setIsEditing(false)}
      autoFocus={isEditing}
      className="w-full bg-white border border-zinc-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-colors shadow-sm"
      placeholder={placeholder}
    />
  );
}
