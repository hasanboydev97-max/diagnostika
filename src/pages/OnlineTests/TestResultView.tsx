import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft, BrainCircuit, CheckCircle2, XCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';

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

  // Group by subtopics for Recharts
  const topicStats: Record<string, { total: number, correct: number }> = {};
  
  test.questions.forEach((q: any, i: number) => {
    const topic = q.subtopic || 'Umumiy';
    if (!topicStats[topic]) topicStats[topic] = { total: 0, correct: 0 };
    
    topicStats[topic].total += 1;
    const studentAnswers = result.answers || {};
    if (studentAnswers[i] === q.correctOption) {
      topicStats[topic].correct += 1;
    }
  });

  const chartData = Object.keys(topicStats).map(topic => {
    const stat = topicStats[topic];
    const percentage = Math.round((stat.correct / stat.total) * 100);
    return {
      subject: topic,
      Olashtirish: percentage,
      fullMark: 100,
    };
  });

  // Custom tooltip for chart
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-100 text-sm">
          <p className="font-semibold text-gray-900 mb-1">{label}</p>
          <p className="text-gray-600">O'zlashtirish: <span className="font-bold text-black">{payload[0].value}%</span></p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans pb-20">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <button 
          onClick={() => navigate('/online-tests')} 
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-10"
        >
          <ArrowLeft size={16} /> Dashboard
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          
          {/* Main Info Card */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm p-8 flex flex-col h-full">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 border-b border-gray-100 pb-8 mb-8">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-500 mb-1">{test.title}</p>
                <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-gray-900 mb-2">
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
            <div className="flex-1 flex flex-col justify-end">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
                <BrainCircuit size={16} className="text-gray-500" /> 
                AI Xulosasi
              </h3>
              <p className="text-gray-600 text-sm md:text-base leading-relaxed whitespace-pre-wrap bg-blue-50/50 p-5 rounded-xl border border-blue-100 h-full">
                {result.aiFeedback || "No AI feedback provided."}
              </p>
            </div>
          </div>

          {/* Diagnostic Chart */}
          <div className="lg:col-span-1 bg-white rounded-2xl border border-gray-200 shadow-sm p-8 flex flex-col h-full min-h-[400px]">
             <h3 className="text-lg font-semibold text-gray-900 mb-2">Mavzular Tahlili</h3>
             <p className="text-xs text-gray-500 mb-6">Qaysi sohalarda kamchiliklar borligini aniqlang</p>
             
             <div className="flex-1 w-full relative">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                   <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                   <XAxis type="number" domain={[0, 100]} hide />
                   <YAxis 
                     type="category" 
                     dataKey="subject" 
                     axisLine={false} 
                     tickLine={false} 
                     tick={{ fill: '#64748b', fontSize: 12 }} 
                     width={80}
                   />
                   <Tooltip cursor={{fill: '#f8fafc'}} content={<CustomTooltip />} />
                   <Bar dataKey="Olashtirish" radius={[0, 4, 4, 0]} barSize={24}>
                     {chartData.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={entry.Olashtirish < 50 ? '#ef4444' : entry.Olashtirish < 80 ? '#eab308' : '#10b981'} />
                     ))}
                   </Bar>
                 </BarChart>
               </ResponsiveContainer>
             </div>
             <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500"></span> Yomon</div>
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-yellow-500"></span> O'rtacha</div>
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500"></span> Yaxshi</div>
             </div>
          </div>
        </div>

        {/* Detailed Answers */}
        <div className="mt-12">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Savollar Bo'yicha Natijalar</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {test.questions.map((q: any, i: number) => {
              const studentAnswers = result.answers || {};
              const studentAns = studentAnswers[i];
              const isCorrect = studentAns === q.correctOption;
              
              return (
                <div key={i} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col">
                  <div className="flex gap-4 items-start mb-4">
                    <div className="mt-0.5 shrink-0">
                      {isCorrect ? (
                        <CheckCircle2 className="text-green-500" size={20} />
                      ) : (
                        <XCircle className="text-red-500" size={20} />
                      )}
                    </div>
                    <div>
                      <span className="text-[10px] font-bold tracking-wider uppercase text-gray-400 mb-1 block">
                        {q.subtopic || 'Umumiy'}
                      </span>
                      <h4 className="text-base font-medium text-gray-900 leading-snug">
                        {i + 1}. {q.questionText}
                      </h4>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-auto pl-9">
                    {q.options.map((opt: string, oIndex: number) => {
                      const isStudentChoice = studentAns === opt;
                      const isActuallyCorrect = opt === q.correctOption;
                      
                      let cardClass = "px-3 py-2 rounded-md border text-sm transition-colors ";
                      if (isActuallyCorrect) {
                        cardClass += "bg-green-50 border-green-200 text-green-800 font-medium";
                      } else if (isStudentChoice && !isCorrect) {
                        cardClass += "bg-red-50 border-red-200 text-red-800 font-medium";
                      } else {
                        cardClass += "bg-white border-gray-100 text-gray-500";
                      }
                      
                      return (
                        <div key={oIndex} className={cardClass}>
                          {opt}
                        </div>
                      );
                    })}
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
