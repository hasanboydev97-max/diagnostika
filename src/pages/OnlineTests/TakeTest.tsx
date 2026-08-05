import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft, Check } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function TakeTest() {
  const { testId } = useParams();
  const navigate = useNavigate();
  
  const [test, setTest] = useState<any>(null);
  const [studentName, setStudentName] = useState('');
  const [started, setStarted] = useState(false);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTest();
  }, [testId]);

  const fetchTest = async () => {
    try {
      const res = await fetch(`${API_URL}/online-tests/${testId}`);
      if (!res.ok) throw new Error('Test not found');
      const data = await res.json();
      setTest(data);
    } catch (error) {
      console.error(error);
      toast.error('Test not found');
      navigate('/online-tests');
    } finally {
      setLoading(false);
    }
  };

  const handleStart = () => {
    if (!studentName.trim()) {
      toast.error('Please enter your name to continue.');
      return;
    }
    setStarted(true);
  };

  const handleSelectOption = (option: string) => {
    setAnswers({ ...answers, [currentQIndex]: option });
  };

  const handleSubmit = async () => {
    const answeredCount = Object.keys(answers).length;
    if (answeredCount < test.questions.length) {
      const confirmSubmit = window.confirm(`You have only answered ${answeredCount} out of ${test.questions.length} questions. Submit anyway?`);
      if (!confirmSubmit) return;
    }
    
    setSubmitting(true);
    const toastId = toast.loading('Submitting and analyzing your answers...');
    
    let score = 0;
    test.questions.forEach((q: any, i: number) => {
      if (answers[i] === q.correctOption) {
        score++;
      }
    });

    const resultId = 'res_' + Date.now().toString();
    
    try {
      const aiRes = await fetch(`${API_URL}/online-test-results/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testTitle: test.title,
          studentName,
          score,
          totalScore: test.questions.length,
          answers,
          questions: test.questions
        })
      });
      const aiData = await aiRes.json();
      
      await fetch(`${API_URL}/online-test-results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: resultId,
          testId,
          studentName,
          answers,
          score,
          totalScore: test.questions.length,
          aiFeedback: aiData.feedback,
          createdAt: new Date().toISOString()
        })
      });
      
      toast.success('Test submitted successfully!', { id: toastId });
      navigate(`/online-tests/results/${resultId}`);
    } catch (error) {
      console.error(error);
      toast.error('Error submitting test', { id: toastId });
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="animate-spin text-gray-400" size={32} />
      </div>
    );
  }

  if (!started) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white p-8 md:p-10 rounded-2xl shadow-sm border border-gray-200 max-w-md w-full">
          <button 
            onClick={() => navigate('/online-tests')}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-8"
          >
            <ArrowLeft size={16} /> Back
          </button>
          
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">{test.title}</h1>
          <p className="text-gray-500 text-sm mb-8">{test.subject} • {test.questions.length} Questions</p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Enter your full name</label>
              <input 
                type="text" 
                value={studentName}
                onChange={e => setStudentName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleStart()}
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg shadow-sm placeholder-gray-400
                  focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors"
                placeholder="e.g. John Doe"
                autoFocus
              />
            </div>
            
            <button 
              onClick={handleStart}
              className="w-full py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
            >
              Start Assessment
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentQ = test.questions[currentQIndex];
  const progress = ((currentQIndex + 1) / test.questions.length) * 100;

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans flex flex-col">
      {/* Progress Bar */}
      <div className="h-1 w-full bg-gray-100">
        <div 
          className="h-full bg-black transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Header */}
      <header className="border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 bg-white z-10">
        <div>
          <h2 className="text-sm font-medium text-gray-900">{test.title}</h2>
          <p className="text-xs text-gray-500">{studentName}</p>
        </div>
        <div className="text-sm font-medium text-gray-500">
          {currentQIndex + 1} of {test.questions.length}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-6 md:p-12 flex flex-col justify-center">
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h3 className="text-2xl md:text-3xl font-semibold text-gray-900 mb-10 leading-snug">
            {currentQ.questionText}
          </h3>

          <div className="space-y-3">
            {currentQ.options.map((opt: string, i: number) => {
              const isSelected = answers[currentQIndex] === opt;
              return (
                <button
                  key={i}
                  onClick={() => handleSelectOption(opt)}
                  className={`w-full text-left p-4 md:p-5 rounded-xl border text-base md:text-lg transition-all flex items-center justify-between group ${
                    isSelected 
                      ? 'border-black bg-gray-50 text-black' 
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <span className={isSelected ? 'font-medium' : ''}>{opt}</span>
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                    isSelected ? 'border-black bg-black text-white' : 'border-gray-300 group-hover:border-gray-400'
                  }`}>
                    {isSelected && <Check size={12} strokeWidth={3} />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="mt-16 flex items-center justify-between pt-6 border-t border-gray-100">
          <button
            onClick={() => setCurrentQIndex(prev => Math.max(0, prev - 1))}
            disabled={currentQIndex === 0}
            className="px-6 py-2.5 text-sm font-medium text-gray-600 disabled:opacity-30 hover:text-gray-900 transition-colors"
          >
            Previous
          </button>
          
          {currentQIndex < test.questions.length - 1 ? (
            <button
              onClick={() => setCurrentQIndex(prev => prev + 1)}
              className="px-8 py-2.5 bg-gray-100 text-gray-900 rounded-full text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              Next Question
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="inline-flex items-center gap-2 px-8 py-2.5 bg-black text-white rounded-full text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-70"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
              {submitting ? 'Submitting...' : 'Submit Assessment'}
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
