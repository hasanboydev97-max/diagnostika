import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { Loader2, CheckCircle2, XCircle, Trophy } from 'lucide-react';
import MeshGradient from '../../components/ui/MeshGradient';
import FormattedText from '../../components/FormattedText';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const SOCKET_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:5000';

export default function LivePlayer() {
  const navigate = useNavigate();
  const [socket, setSocket] = useState<Socket | null>(null);
  
  const [pin, setPin] = useState('');
  const [name, setName] = useState('');
  const [status, setStatus] = useState<'login' | 'waiting' | 'active' | 'finished'>('login');
  
  const [test, setTest] = useState<any>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(-1);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [isCorrectLast, setIsCorrectLast] = useState<boolean | null>(null);
  const [rank, setRank] = useState(0);

  useEffect(() => {
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    newSocket.on('joined', async ({ testId }) => {
      setStatus('waiting');
      // Fetch test to know correct answers locally
      try {
        const res = await fetch(`${API_URL}/online-tests/${testId}`);
        if (res.ok) setTest(await res.json());
      } catch (e) {
        console.error(e);
      }
    });

    newSocket.on('error', (msg) => {
      toast.error(msg);
      setStatus('login');
    });

    newSocket.on('game_started', () => {
      setStatus('active');
    });

    newSocket.on('new_question', ({ questionIndex }) => {
      setCurrentQuestionIndex(questionIndex);
      setHasAnswered(false);
      setIsCorrectLast(null);
    });

    newSocket.on('game_ended', ({ players }) => {
      setStatus('finished');
      // Find my rank
      const sorted = [...players].sort((a, b) => b.score - a.score);
      const myRank = sorted.findIndex(p => p.id === newSocket.id) + 1;
      setRank(myRank);
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim() || !name.trim()) return toast.error('PIN va Ismingizni kiriting');
    socket?.emit('join_room', { pin, name });
  };

  const handleAnswer = (optionIndex: number) => {
    if (hasAnswered || !test) return;
    setHasAnswered(true);
    
    const question = test.questions[currentQuestionIndex];
    const selectedOption = question.options[optionIndex];
    const isCorrect = selectedOption === question.correctOption;
    
    setIsCorrectLast(isCorrect);
    socket?.emit('submit_answer', { pin, isCorrect });
  };

  return (
    <div className="min-h-screen relative font-sans text-zinc-900 bg-[#fdfdfd] overflow-hidden flex flex-col">
      <MeshGradient />

      {status === 'login' && (
        <div className="flex-1 flex items-center justify-center p-6 relative z-10">
          <form onSubmit={handleJoin} className="bg-white/80 backdrop-blur-xl border border-white/50 shadow-2xl rounded-3xl p-8 max-w-sm w-full text-center">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl mx-auto mb-6 flex items-center justify-center transform rotate-12 shadow-lg shadow-indigo-200">
              <span className="text-white font-black text-2xl -rotate-12">HB</span>
            </div>
            <h1 className="text-2xl font-bold text-zinc-800 mb-6">Jonli Testga Ulanish</h1>
            
            <input 
              type="text" 
              placeholder="Game PIN" 
              value={pin}
              onChange={e => setPin(e.target.value)}
              className="w-full text-center text-2xl font-bold tracking-widest px-4 py-4 bg-zinc-100 border border-zinc-200 rounded-xl mb-4 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all placeholder:font-normal placeholder:tracking-normal placeholder:text-zinc-400"
              maxLength={6}
            />
            
            <input 
              type="text" 
              placeholder="Ismingiz (Masalan: Ali)" 
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full text-center text-lg px-4 py-4 bg-zinc-100 border border-zinc-200 rounded-xl mb-6 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all placeholder:text-zinc-400"
            />
            
            <button 
              type="submit"
              className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
            >
              Ulanish
            </button>
          </form>
        </div>
      )}

      {status === 'waiting' && (
        <div className="flex-1 flex items-center justify-center p-6 relative z-10">
          <div className="text-center animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-3xl font-black text-zinc-900 mb-4">Siz ulandingiz!</h2>
            <p className="text-zinc-500 mb-8 font-medium">O'qituvchi o'yinni boshlashini kuting. Asosiy ekranga qarab turing 👀</p>
            <Loader2 className="animate-spin text-indigo-500 mx-auto" size={48} />
          </div>
        </div>
      )}

      {status === 'active' && !hasAnswered && test && (
        <div className="flex-1 p-4 flex flex-col relative z-10 h-screen">
          <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-4 mb-4 text-center">
            <h3 className="font-semibold text-zinc-800">
              <FormattedText content={test.questions[currentQuestionIndex]?.questionText || 'Savol...'} />
            </h3>
          </div>
          
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {test.questions[currentQuestionIndex]?.options.map((opt: string, i: number) => {
              const colors = [
                'bg-red-500 border-red-600 active:bg-red-600', 
                'bg-blue-500 border-blue-600 active:bg-blue-600', 
                'bg-yellow-500 border-yellow-600 text-black active:bg-yellow-600', 
                'bg-emerald-500 border-emerald-600 active:bg-emerald-600'
              ];
              return (
                <button
                  key={i}
                  onClick={() => handleAnswer(i)}
                  className={`${colors[i]} rounded-2xl p-6 flex items-center justify-center text-lg sm:text-2xl font-bold text-white shadow-sm border-b-8 active:border-b-0 active:translate-y-2 transition-all`}
                >
                  <FormattedText content={opt} />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {status === 'active' && hasAnswered && (
        <div className={`flex-1 flex items-center justify-center p-6 relative z-10 ${isCorrectLast ? 'bg-emerald-500' : 'bg-red-500'}`}>
          <div className="text-center text-white animate-in zoom-in duration-300">
            {isCorrectLast ? (
              <>
                <CheckCircle2 size={80} className="mx-auto mb-4" />
                <h2 className="text-4xl font-black mb-2">To'g'ri!</h2>
                <p className="text-emerald-100 font-medium">+100 ball</p>
              </>
            ) : (
              <>
                <XCircle size={80} className="mx-auto mb-4" />
                <h2 className="text-4xl font-black mb-2">Xato</h2>
                <p className="text-red-100 font-medium">Keyingi safar albatta to'g'ri topasiz!</p>
              </>
            )}
            <p className="mt-12 text-white/80 font-medium text-sm bg-black/10 px-4 py-2 rounded-full inline-block">Keyingi savolni kuting...</p>
          </div>
        </div>
      )}

      {status === 'finished' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
          <div className="bg-white/80 backdrop-blur-xl border border-white/50 shadow-2xl rounded-3xl p-10 max-w-sm w-full text-center">
            <Trophy size={64} className="text-yellow-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-zinc-900 mb-2">O'yin tugadi!</h1>
            
            <div className="my-8">
              <p className="text-sm text-zinc-500 font-medium uppercase tracking-wider mb-2">Sizning o'rningiz</p>
              <div className="text-6xl font-black text-indigo-600">
                #{rank}
              </div>
            </div>

            <button 
              onClick={() => navigate('/')}
              className="w-full bg-zinc-900 text-white py-3 rounded-xl font-bold hover:bg-zinc-800 transition-colors"
            >
              Bosh sahifaga qaytish
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
