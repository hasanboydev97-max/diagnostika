import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft, BrainCircuit, CheckCircle2, XCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function TestResultView() {
  const { resultId } = useParams();
  const navigate = useNavigate();
  
  const [result, setResult] = useState<any>(null);
  const [test, setTest] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResult();
  }, [resultId]);

  const fetchResult = async () => {
    try {
      const res = await fetch(`${API_URL}/online-test-results/${resultId}`);
      if (res.ok) {
        const data = await res.json();
        setResult(data);
        
        const testRes = await fetch(`${API_URL}/online-tests/${data.testId}`);
        if (testRes.ok) {
          const testData = await testRes.json();
          setTest(testData);
          
          const percentage = Math.round((data.score / data.totalScore) * 100);
          if (percentage >= 70) {
            confetti({
              particleCount: 150,
              spread: 70,
              origin: { y: 0.6 },
              colors: ['#000', '#333', '#666']
            });
          }
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Loader2 className="animate-spin text-gray-400" size={32} />
    </div>
  );

  if (!result || !test) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center text-gray-900">
      <h2 className="text-xl font-medium mb-4">Result not found</h2>
      <button onClick={() => navigate('/online-tests')} className="text-sm font-medium hover:underline">
        Return to Dashboard
      </button>
    </div>
  );

  const percentage = Math.round((result.score / result.totalScore) * 100);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans pb-20">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <button 
          onClick={() => navigate('/online-tests')} 
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-10"
        >
          <ArrowLeft size={16} /> Dashboard
        </button>

        {/* Overview Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 border-b border-gray-100 pb-8 mb-8">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-500 mb-1">{test.title}</p>
              <h1 className="text-3xl font-semibold tracking-tight text-gray-900 mb-2">
                {studentName(result.studentName)}'s Results
              </h1>
            </div>
            
            <div className="flex items-center gap-4 bg-gray-50 px-6 py-4 rounded-xl border border-gray-100">
              <div className="text-center">
                <span className="block text-3xl font-bold text-gray-900">{percentage}%</span>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Score</span>
              </div>
              <div className="w-px h-10 bg-gray-200 mx-2"></div>
              <div className="text-center">
                <span className="block text-xl font-semibold text-gray-700">{result.score} / {result.totalScore}</span>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Correct</span>
              </div>
            </div>
          </div>

          {/* AI Feedback */}
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
              <BrainCircuit size={16} className="text-gray-500" /> 
              AI Assessment
            </h3>
            <p className="text-gray-600 text-sm md:text-base leading-relaxed whitespace-pre-wrap bg-gray-50 p-4 rounded-lg border border-gray-100">
              {result.aiFeedback || "No AI feedback provided."}
            </p>
          </div>
        </div>

        {/* Detailed Answers */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Detailed Breakdown</h2>
          <div className="space-y-4">
            {test.questions.map((q: any, i: number) => {
              const studentAns = result.answers[i];
              const isCorrect = studentAns === q.correctOption;
              
              return (
                <div key={i} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <div className="flex gap-4 items-start">
                    <div className="mt-0.5">
                      {isCorrect ? (
                        <CheckCircle2 className="text-green-500" size={20} />
                      ) : (
                        <XCircle className="text-red-500" size={20} />
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="text-base font-medium text-gray-900 mb-4">
                        {i + 1}. {q.questionText}
                      </h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {q.options.map((opt: string, oIndex: number) => {
                          const isStudentChoice = studentAns === opt;
                          const isActuallyCorrect = opt === q.correctOption;
                          
                          let cardClass = "px-4 py-3 rounded-lg border text-sm ";
                          if (isActuallyCorrect) {
                            cardClass += "bg-green-50 border-green-200 text-green-800 font-medium";
                          } else if (isStudentChoice && !isCorrect) {
                            cardClass += "bg-red-50 border-red-200 text-red-800 font-medium";
                          } else {
                            cardClass += "bg-white border-gray-200 text-gray-500";
                          }
                          
                          return (
                            <div key={oIndex} className={cardClass}>
                              {opt}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function studentName(name: string) {
  if (!name) return 'Student';
  return name.charAt(0).toUpperCase() + name.slice(1);
}
