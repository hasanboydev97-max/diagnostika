import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, Plus, Trash2, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import FormattedText from '../../components/FormattedText';
import { getAuthHeaders, getToken, getTeacher } from '../../lib/auth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function CreateTest() {
  const navigate = useNavigate();
  const teacher = getTeacher();
  const [title, setTitle] = useState('');
  const [subject] = useState(teacher?.subject || '');
  const [hasTimeLimit, setHasTimeLimit] = useState(false);
  const [durationMinutes, setDurationMinutes] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [mode, setMode] = useState<'ai' | 'manual'>('ai');
  
  useEffect(() => {
    if (!getToken()) {
      navigate('/teacher/login');
      return;
    }
  }, []);
  
  const [topic, setTopic] = useState('');
  const [questionCount, setQuestionCount] = useState(5);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [questions, setQuestions] = useState<any[]>([]);

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
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans pb-20">
      <div className="max-w-7xl mx-auto px-6 py-10">
        
        {/* Navigation */}
        <button 
          onClick={() => navigate('/online-tests')}
          className="group flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-8 font-medium"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Testlarga qaytish
        </button>

        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900">Test yaratish</h1>
          <p className="text-gray-500 mt-1 text-sm">Yangi test sozlamalarini kiriting.</p>
        </div>

        {/* Basic Info Card */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Test nomi</label>
              <input 
                type="text" 
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm shadow-sm placeholder-gray-400
                  focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors"
                placeholder="masalan, Tarixdan choraklik imtihon"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Fan</label>
              <input 
                type="text" 
                value={subject}
                disabled
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm text-gray-500 cursor-not-allowed shadow-sm"
              />
              <p className="text-xs text-gray-400 mt-1">O'qituvchi akkauntidan olingan.</p>
            </div>
          </div>
          
          <div className="pt-4 border-t border-gray-100">
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Test vaqti (daqiqa)</label>
              <input 
                type="number"
                min="1"
                value={durationMinutes}
                onChange={e => setDurationMinutes(e.target.value)}
                className="w-full max-w-sm px-3 py-2 bg-white border border-gray-300 rounded-md text-sm shadow-sm placeholder-gray-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors"
                placeholder="masalan, 45 (bo'sh qolsa cheklanmagan)"
              />
              <p className="text-xs text-gray-500 mt-1">O'quvchi testni boshlaganidan so'ng qancha vaqt beriladi.</p>
            </div>
            
            <label className="flex items-center gap-2 cursor-pointer mb-4">
              <input 
                type="checkbox" 
                checked={hasTimeLimit}
                onChange={e => setHasTimeLimit(e.target.checked)}
                className="w-4 h-4 text-black border-gray-300 rounded focus:ring-black"
              />
              <span className="text-sm font-medium text-gray-700">Vaqt chegarasini o'rnatish (Qachon ochilib yopilishi)</span>
            </label>
            
            {hasTimeLimit && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-4 rounded-lg border border-gray-100">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Boshlanish vaqti</label>
                  <input 
                    type="datetime-local" 
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm shadow-sm focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Tugash vaqti</label>
                  <input 
                    type="datetime-local" 
                    value={endTime}
                    onChange={e => setEndTime(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm shadow-sm focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Builder Mode Selector */}
        <div className="flex bg-gray-100 p-1 rounded-lg w-full max-w-sm mb-6 border border-gray-200">
          <button
            onClick={() => setMode('ai')}
            className={`flex-1 text-sm font-medium py-1.5 rounded-md transition-all ${
              mode === 'ai' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            AI Yordamida
          </button>
          <button
            onClick={() => setMode('manual')}
            className={`flex-1 text-sm font-medium py-1.5 rounded-md transition-all ${
              mode === 'manual' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Qo'lda kiritish
          </button>
        </div>

        {/* AI Form */}
        {mode === 'ai' && (
          <div className="bg-blue-50/50 p-6 rounded-xl border border-blue-100 mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="text-blue-500" size={18} />
              <h3 className="text-sm font-semibold text-blue-900">Gemini AI yordamida yaratish</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Aniq mavzu (Ixtiyoriy)</label>
                <input 
                  type="text" 
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm shadow-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  placeholder="masalan, 2-Jahon urushi"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Savollar soni</label>
                <input 
                  type="number" 
                  min="1" max="20"
                  value={questionCount}
                  onChange={e => setQuestionCount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm shadow-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                />
              </div>
            </div>
            <button
              onClick={handleGenerate}
              disabled={generating || !subject.trim()}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 shadow-sm"
            >
              {generating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {generating ? 'Yaratilmoqda...' : 'Savollarni yaratish'}
            </button>
          </div>
        )}

        {/* Questions Editor */}
        {questions.length > 0 && (
          <div className="space-y-6 mb-8">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <h2 className="text-lg font-semibold text-gray-900">Savollar ({questions.length})</h2>
            </div>
            
            {questions.map((q, qIndex) => (
              <div key={qIndex} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex gap-4 items-start mb-6">
                  <span className="font-mono text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded mt-2">
                    Q{qIndex + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <MathInput
                      value={q.questionText}
                      onChange={(e: any) => {
                        const newQ = [...questions];
                        newQ[qIndex].questionText = e.target.value;
                        setQuestions(newQ);
                      }}
                      placeholder="Savolingizni bu yerga yozing..."
                      isTextarea={true}
                    />
                  </div>
                  <button
                    onClick={() => setQuestions(questions.filter((_, i) => i !== qIndex))}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors mt-1"
                    title="Savolni o'chirish"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-12">
                  {q.options.map((opt: string, oIndex: number) => {
                    const isCorrect = q.correctOption === opt && opt !== '';
                    return (
                      <div key={oIndex} className={`flex items-center gap-3 p-2 rounded-md border ${isCorrect ? 'border-green-500 bg-green-50/30' : 'border-transparent'}`}>
                        <input
                          type="radio"
                          name={`correct-${qIndex}`}
                          checked={isCorrect}
                          onChange={() => {
                            if (!opt.trim()) return toast.warning('Please enter option text first.');
                            const newQ = [...questions];
                            newQ[qIndex].correctOption = opt;
                            setQuestions(newQ);
                          }}
                          className="w-4 h-4 text-black border-gray-300 focus:ring-black cursor-pointer"
                        />
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
                            placeholder={`Variant ${oIndex + 1}`}
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

        {/* Add Manual Button */}
        {mode === 'manual' && (
          <button
            onClick={addManualQuestion}
            className="w-full py-4 flex items-center justify-center gap-2 text-sm font-medium text-gray-500 bg-gray-50 border border-dashed border-gray-300 rounded-xl hover:bg-gray-100 hover:text-gray-900 transition-colors mb-8"
          >
            <Plus size={16} />
            Add a new question
          </button>
        )}

        {/* Sticky Save Button */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10 flex justify-center">
          <div className="max-w-7xl w-full flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-black text-white text-sm font-medium rounded-md hover:bg-gray-800 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 shadow-sm"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              {saving ? 'Saving Test...' : 'Save Test'}
            </button>
          </div>
        </div>

      </div>
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

  // If we are not editing and the value exists, show the rendered math
  if (!isEditing && value) {
    return (
      <div 
        onClick={() => setIsEditing(true)} 
        className={`cursor-text border border-transparent hover:border-gray-300 hover:bg-gray-50 rounded px-3 py-2 transition-colors min-h-[40px] w-full flex items-center ${isTextarea ? 'items-start' : ''}`}
        title="Tahrirlash uchun bosing"
      >
        <FormattedText content={value} />
      </div>
    );
  }

  // If editing or empty, show input field
  if (isTextarea) {
    return (
      <textarea
        value={value}
        onChange={onChange}
        onBlur={() => setIsEditing(false)}
        autoFocus={isEditing}
        rows={2}
        className="w-full px-3 py-2 bg-white border border-black rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-black resize-none"
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
      className="w-full bg-white border-b-2 border-black px-2 py-1 text-sm focus:outline-none transition-colors"
      placeholder={placeholder}
    />
  );
}
