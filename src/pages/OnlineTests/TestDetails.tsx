import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Copy, Users, BrainCircuit, Calendar, ExternalLink, FileText, Printer } from 'lucide-react';
import { getAuthHeaders, getToken } from '../../lib/auth';
import { toast } from 'sonner';
import FormattedText from '../../components/FormattedText';
import katex from 'katex';
import { autoFormatMath } from '../../utils/mathFormatter';

const renderMathForWord = (content: string) => {
  if (!content) return '';
  const cleanContent = autoFormatMath(content);
  const parts = cleanContent.split('$');
  let result = '';
  
  parts.forEach((part, index) => {
    if (index % 2 === 0) {
      result += part;
    } else {
      try {
        result += katex.renderToString(part, {
          throwOnError: false,
          output: 'mathml',
          displayMode: false
        });
      } catch (e) {
        result += `$${part}$`;
      }
    }
  });
  return result;
};

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface Result {
  _id: string;
  studentName: string;
  score: number;
  totalScore: number;
  createdAt: string;
}

export default function TestDetails() {
  const { testId } = useParams();
  const navigate = useNavigate();
  
  const [test, setTest] = useState<any>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      navigate('/teacher/login');
      return;
    }
    fetchData();
  }, [testId]);

  const fetchData = async () => {
    try {
      // Fetch test details
      const testRes = await fetch(`${API_URL}/online-tests/${testId}`, {
        headers: getAuthHeaders()
      });
      if (!testRes.ok) throw new Error('Failed to fetch test');
      const testData = await testRes.json();
      setTest(testData);

      // Fetch results for this test
      const resultsRes = await fetch(`${API_URL}/online-tests/${testId}/results`, {
        headers: getAuthHeaders()
      });
      if (resultsRes.ok) {
        const resultsData = await resultsRes.json();
        setResults(resultsData);
      }
    } catch (error) {
      console.error(error);
      toast.error('Ma\'lumotlarni yuklashda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  const copyTestLink = () => {
    const link = `${window.location.origin}/online-tests/take/${testId}`;
    navigator.clipboard.writeText(link);
    toast.success('Test manzili nusxalandi! O\'quvchilarga yuborishingiz mumkin.');
  };

  const handleExportWord = () => {
    if (!test) return;
    
    let htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>${test.title}</title></head>
      <body>
        <h1 style="text-align:center; font-family: Arial, sans-serif;">${test.title}</h1>
        <h3 style="text-align:center; font-family: Arial, sans-serif;">Fan: ${test.subject} | ${test.durationMinutes ? 'Vaqt: ' + test.durationMinutes + ' daqiqa' : ''}</h3>
        <hr/>
    `;

    test.questions.forEach((q: any, i: number) => {
      htmlContent += `<div style="font-family: Arial, sans-serif; margin-bottom: 20px;">`;
      htmlContent += `<p><b>${i + 1}. ${renderMathForWord(q.questionText)}</b></p>`;
      q.options.forEach((opt: string) => {
        htmlContent += `<p style="margin-left: 20px;">&#9711; ${renderMathForWord(opt)}</p>`;
      });
      htmlContent += `</div>`;
    });

    htmlContent += `<br/><hr/><h2 style="font-family: Arial, sans-serif;">Kalit javoblar</h2>`;
    test.questions.forEach((q: any, i: number) => {
       htmlContent += `<p style="font-family: Arial, sans-serif; margin: 2px;"><b>${i + 1}.</b> ${renderMathForWord(q.correctOption)}</p>`;
    });

    htmlContent += `</body></html>`;

    const blob = new Blob(['\ufeff', htmlContent], {
        type: 'application/msword'
    });
    
    const downloadLink = document.createElement("a");
    document.body.appendChild(downloadLink);
    downloadLink.href = URL.createObjectURL(blob);
    downloadLink.download = `${test.title}.doc`;
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-gray-400" size={32} />
      </div>
    );
  }

  if (!test) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <h2 className="text-xl font-medium mb-4">Test topilmadi</h2>
        <button onClick={() => navigate('/online-tests')} className="text-sm text-blue-600 hover:underline">
          Dashboard'ga qaytish
        </button>
      </div>
    );
  }

  // Calculate average score
  const totalPercentage = results.reduce((acc, curr) => acc + (curr.score / curr.totalScore) * 100, 0);
  const averagePercentage = results.length > 0 ? Math.round(totalPercentage / results.length) : 0;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans pb-20">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <button 
          onClick={() => navigate('/online-tests')} 
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-8 w-fit"
        >
          <ArrowLeft size={16} /> Dashboard'ga qaytish
        </button>

        {/* Print-only View (Hidden on screen) */}
        <div className="hidden print:block mb-8">
          <h1 className="text-3xl font-bold text-center mb-2">{test.title}</h1>
          <p className="text-center text-gray-600 mb-8">Fan: {test.subject}</p>
          <div className="space-y-6">
            {test.questions.map((q: any, i: number) => (
              <div key={i} className="mb-4 page-break-inside-avoid">
                <p className="font-semibold text-lg mb-2">{i + 1}. <FormattedText content={q.questionText} /></p>
                <div className="pl-6 space-y-2">
                  {q.options.map((opt: string, oIndex: number) => (
                    <div key={oIndex} className="flex items-center gap-2">
                      <div className="w-4 h-4 border border-black rounded-full"></div>
                      <FormattedText content={opt} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 print:hidden">
          
          {/* Sidebar Info */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
              <span className="inline-block px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded mb-4">
                {test.subject}
              </span>
              <h1 className="text-2xl font-semibold tracking-tight text-gray-900 mb-2">
                {test.title}
              </h1>
              <p className="text-gray-500 text-sm mb-6 flex items-center gap-2">
                <Calendar size={14} /> 
                {new Date(test.createdAt).toLocaleDateString('uz-UZ')}
              </p>
              
              <div className="pt-6 border-t border-gray-100 flex flex-col gap-3">
                <button
                  onClick={copyTestLink}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <Copy size={16} /> Ulashish (Link nusxalash)
                </button>
                <button
                  onClick={() => navigate(`/online-tests/take/${testId}`)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <ExternalLink size={16} /> O'zim yechib ko'rish
                </button>
                <div className="flex gap-2 w-full mt-2">
                  <button
                    onClick={handleExportWord}
                    className="flex-1 flex items-center justify-center gap-2 px-2 py-2.5 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-medium rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <FileText size={14} /> Word (.doc)
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="flex-1 flex items-center justify-center gap-2 px-2 py-2.5 bg-red-50 border border-red-200 text-red-700 text-xs font-medium rounded-lg hover:bg-red-100 transition-colors"
                  >
                    <Printer size={14} /> Print (PDF)
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm grid grid-cols-2 gap-4">
               <div>
                 <p className="text-sm text-gray-500 mb-1 flex items-center gap-1.5"><Users size={14}/> Qatnashuvchilar</p>
                 <p className="text-2xl font-semibold text-gray-900">{results.length}</p>
               </div>
               <div>
                 <p className="text-sm text-gray-500 mb-1 flex items-center gap-1.5"><BrainCircuit size={14}/> O'rtacha o'zlashtirish</p>
                 <p className="text-2xl font-semibold text-gray-900">{averagePercentage}%</p>
               </div>
            </div>
          </div>

          {/* Results Table */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
                <h3 className="font-semibold text-gray-900">O'quvchilar Natijalari ({results.length})</h3>
              </div>
              
              {results.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  <Users size={32} className="mx-auto text-gray-300 mb-3" />
                  <p>Hali hech kim testni topshirmagan.</p>
                  <p className="text-sm mt-1">Ulashish tugmasi orqali test ssilkasini o'quvchilarga yuboring.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100 text-gray-500">
                      <tr>
                        <th className="px-6 py-3 font-medium">O'quvchi Ismi</th>
                        <th className="px-6 py-3 font-medium">Natija</th>
                        <th className="px-6 py-3 font-medium">Foiz</th>
                        <th className="px-6 py-3 font-medium">Topshirgan Vaqti</th>
                        <th className="px-6 py-3 font-medium text-right">Amal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {results.map((res: any) => {
                        const percent = Math.round((res.score / res.totalScore) * 100);
                        return (
                          <tr key={res.id || res._id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-6 py-4 font-medium text-gray-900 capitalize">
                              {res.studentName}
                            </td>
                            <td className="px-6 py-4 text-gray-600">
                              {res.score} / {res.totalScore}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                percent >= 80 ? 'bg-green-100 text-green-700' : 
                                percent >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                              }`}>
                                {percent}%
                              </span>
                            </td>
                            <td className="px-6 py-4 text-gray-500">
                              {new Date(res.createdAt).toLocaleString('uz-UZ')}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button
                                onClick={() => navigate(`/online-tests/results/${res.id || res._id}`)}
                                className="text-blue-600 hover:text-blue-700 font-medium hover:underline"
                              >
                                Batafsil ko'rish
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
