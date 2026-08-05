import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, Plus, Trash2, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function CreateTest() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [mode, setMode] = useState<'ai' | 'manual'>('ai');
  
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
        headers: { 'Content-Type': 'application/json' },
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

    setSaving(true);
    const id = 'test_' + Date.now().toString();
    try {
      const res = await fetch(`${API_URL}/online-tests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          title,
          subject,
          questions,
          createdAt: new Date().toISOString()
        })
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
          Back to Tests
        </button>

        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900">Create Test</h1>
          <p className="text-gray-500 mt-1 text-sm">Fill in the details to setup a new assessment.</p>
        </div>

        {/* Basic Info Card */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Test Title</label>
              <input 
                type="text" 
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm shadow-sm placeholder-gray-400
                  focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors"
                placeholder="e.g. Midterm History Exam"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Subject</label>
              <input 
                type="text" 
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm shadow-sm placeholder-gray-400
                  focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors"
                placeholder="e.g. History"
              />
            </div>
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
            AI Generator
          </button>
          <button
            onClick={() => setMode('manual')}
            className={`flex-1 text-sm font-medium py-1.5 rounded-md transition-all ${
              mode === 'manual' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Manual Entry
          </button>
        </div>

        {/* AI Form */}
        {mode === 'ai' && (
          <div className="bg-blue-50/50 p-6 rounded-xl border border-blue-100 mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="text-blue-500" size={18} />
              <h3 className="text-sm font-semibold text-blue-900">Generate with Gemini AI</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Specific Topic (Optional)</label>
                <input 
                  type="text" 
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm shadow-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  placeholder="e.g. World War II"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Number of Questions</label>
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
              {generating ? 'Generating...' : 'Generate Questions'}
            </button>
          </div>
        )}

        {/* Questions Editor */}
        {questions.length > 0 && (
          <div className="space-y-6 mb-8">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <h2 className="text-lg font-semibold text-gray-900">Questions ({questions.length})</h2>
            </div>
            
            {questions.map((q, qIndex) => (
              <div key={qIndex} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex gap-4 items-start mb-6">
                  <span className="font-mono text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    Q{qIndex + 1}
                  </span>
                  <textarea
                    value={q.questionText}
                    onChange={e => {
                      const newQ = [...questions];
                      newQ[qIndex].questionText = e.target.value;
                      setQuestions(newQ);
                    }}
                    rows={2}
                    className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-md text-sm shadow-sm focus:outline-none focus:border-black focus:ring-1 focus:ring-black resize-none"
                    placeholder="Type your question here..."
                  />
                  <button
                    onClick={() => setQuestions(questions.filter((_, i) => i !== qIndex))}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    title="Remove Question"
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
                        <input
                          type="text"
                          value={opt}
                          onChange={e => {
                            const newQ = [...questions];
                            const oldVal = newQ[qIndex].options[oIndex];
                            const newVal = e.target.value;
                            newQ[qIndex].options[oIndex] = newVal;
                            if (newQ[qIndex].correctOption === oldVal) {
                              newQ[qIndex].correctOption = newVal;
                            }
                            setQuestions(newQ);
                          }}
                          className="flex-1 bg-transparent border-b border-gray-200 focus:border-black px-1 py-1 text-sm focus:outline-none transition-colors"
                          placeholder={`Option ${oIndex + 1}`}
                        />
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
