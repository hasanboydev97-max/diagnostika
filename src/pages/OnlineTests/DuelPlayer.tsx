import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { Swords, Trophy, Loader2, Copy, Check, X, ShieldAlert } from 'lucide-react';
import MeshGradient from '../../components/ui/MeshGradient';
import FormattedText from '../../components/FormattedText';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const SOCKET_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:5000';

type PlayerState = {
  id: string;
  name: string;
  score: number;
  currentQuestion: number;
  finished: boolean;
};

export default function DuelPlayer() {
  const location = useLocation();
  const navigate = useNavigate();
  const [socket, setSocket] = useState<Socket | null>(null);

  const [status, setStatus] = useState<'login' | 'lobby' | 'active' | 'finished'>('login');
  
  // Login states
  const [pin, setPin] = useState('');
  const [name, setName] = useState('');
  
  // Duel states
  const [testId, setTestId] = useState<string | null>(null);
  const [test, setTest] = useState<any>(null);
  const [isCreator, setIsCreator] = useState(false);
  const [p1, setP1] = useState<PlayerState | null>(null);
  const [p2, setP2] = useState<PlayerState | null>(null);
  
  // Game states
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [hasAnsweredCurrent, setHasAnsweredCurrent] = useState(false);
  const [myScore, setMyScore] = useState(0);

  useEffect(() => {
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    const state = location.state as any;
    if (state?.isCreator && state?.testId && state?.studentName) {
      setIsCreator(true);
      setName(state.studentName);
      setTestId(state.testId);
      newSocket.emit('create_duel', { testId: state.testId, name: state.studentName });
    } else {
      setStatus('login');
    }

    newSocket.on('error', (msg) => {
      toast.error(msg);
      if (status === 'lobby' && !isCreator) setStatus('login');
    });

    newSocket.on('duel_created', ({ pin, testId }) => {
      setPin(pin);
      setStatus('lobby');
      fetchTest(testId);
    });

    newSocket.on('duel_ready', ({ player1, player2, testId }) => {
      if (!isCreator) {
        setPin(pin);
        setTestId(testId);
        fetchTest(testId);
        setStatus('lobby');
      }
      setP1(prev => ({ ...prev, name: player1 } as any));
      setP2(prev => ({ ...prev, name: player2 } as any));
      toast.success('Raqib ulandi!');
    });

    newSocket.on('duel_started', () => {
      setStatus('active');
    });

    newSocket.on('duel_update', ({ player1, player2 }) => {
      setP1(player1);
      setP2(player2);
    });

    newSocket.on('duel_ended', ({ player1, player2 }) => {
      setP1(player1);
      setP2(player2);
      setStatus('finished');
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const fetchTest = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/online-tests/${id}`);
      if (res.ok) setTest(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim() || !name.trim()) return toast.error('PIN va Ismingizni kiriting');
    socket?.emit('join_duel', { pin, name });
  };

  const handleStartDuel = () => {
    if (!p2) return toast.error('Raqib kutilmoqda');
    socket?.emit('start_duel', { pin });
  };

  const handleAnswer = (optionIndex: number) => {
    if (hasAnsweredCurrent || !test) return;
    setHasAnsweredCurrent(true);
    
    const question = test.questions[currentQIndex];
    const selectedOption = question.options[optionIndex];
    const isCorrect = selectedOption === question.correctOption;
    
    const newScore = isCorrect ? myScore + 1 : myScore;
    if (isCorrect) setMyScore(newScore);
    
    socket?.emit('duel_progress', { 
      pin, 
      score: newScore, 
      currentQuestion: currentQIndex + 1 
    });

    setTimeout(() => {
      if (currentQIndex + 1 >= test.questions.length) {
        socket?.emit('duel_finish', { pin });
      } else {
        setCurrentQIndex(prev => prev + 1);
        setHasAnsweredCurrent(false);
      }
    }, 1000);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(pin);
    toast.success('PIN nusxalandi');
  };

  if (!socket) return null;

  return (
    <div className="min-h-screen relative font-sans text-zinc-900 bg-[#fdfdfd] overflow-hidden flex flex-col">
      <MeshGradient />

      {status === 'login' && (
        <div className="flex-1 flex items-center justify-center p-6 relative z-10">
          <form onSubmit={handleJoin} className="bg-white/80 backdrop-blur-xl border border-white/50 shadow-2xl rounded-3xl p-8 max-w-sm w-full text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-rose-500 to-orange-500 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg shadow-rose-200">
              <Swords size={32} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-zinc-800 mb-6">Duyelga Ulanish</h1>
            
            <input 
              type="text" 
              placeholder="Duyel PIN" 
              value={pin}
              onChange={e => setPin(e.target.value)}
              className="w-full text-center text-2xl font-bold tracking-widest px-4 py-4 bg-zinc-100 border border-zinc-200 rounded-xl mb-4 focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-200 transition-all"
              maxLength={6}
            />
            
            <input 
              type="text" 
              placeholder="Ismingiz" 
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full text-center text-lg px-4 py-4 bg-zinc-100 border border-zinc-200 rounded-xl mb-6 focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-200 transition-all"
            />
            
            <button 
              type="submit"
              className="w-full bg-gradient-to-r from-rose-500 to-orange-500 text-white py-4 rounded-xl font-bold text-lg hover:from-rose-600 hover:to-orange-600 transition-all shadow-lg shadow-rose-200"
            >
              Jangga kirish
            </button>
          </form>
        </div>
      )}

      {status === 'lobby' && (
        <div className="flex-1 flex items-center justify-center p-6 relative z-10">
          <div className="bg-white/80 backdrop-blur-xl border border-white/50 shadow-2xl rounded-3xl p-8 max-w-md w-full text-center">
            <h2 className="text-2xl font-bold text-zinc-900 mb-2">Duyel xonasi</h2>
            {isCreator ? (
              <p className="text-zinc-500 mb-6 text-sm">Raqibingizga quyidagi PIN ni bering:</p>
            ) : (
              <p className="text-zinc-500 mb-6 text-sm">Yaratuvchi o'yinni boshlashini kuting...</p>
            )}

            {isCreator && (
              <div className="bg-zinc-100 border border-zinc-200 rounded-2xl p-6 mb-8 relative group cursor-pointer" onClick={copyLink}>
                <div className="text-6xl font-black text-rose-600 tracking-widest">{pin}</div>
                <div className="absolute top-2 right-2 p-2 bg-white rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                  <Copy size={16} className="text-zinc-500" />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between gap-4 mb-8">
              <div className="flex-1 bg-blue-50 border border-blue-100 rounded-xl p-4 text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="font-bold text-blue-700">{p1?.name?.[0] || name[0]}</span>
                </div>
                <p className="font-semibold text-blue-900 truncate">{p1?.name || name}</p>
              </div>
              <div className="text-zinc-400 font-black italic">VS</div>
              <div className="flex-1 bg-red-50 border border-red-100 rounded-xl p-4 text-center">
                {p2 ? (
                  <>
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <span className="font-bold text-red-700">{p2.name[0]}</span>
                    </div>
                    <p className="font-semibold text-red-900 truncate">{p2.name}</p>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-2 border-2 border-dashed border-zinc-300">
                      <Loader2 size={20} className="text-zinc-400 animate-spin" />
                    </div>
                    <p className="font-medium text-zinc-500 text-sm">Kutilmoqda...</p>
                  </>
                )}
              </div>
            </div>

            {isCreator && (
              <button 
                onClick={handleStartDuel}
                disabled={!p2}
                className="w-full bg-black text-white py-4 rounded-xl font-bold text-lg hover:bg-zinc-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Boshlash
              </button>
            )}
          </div>
        </div>
      )}

      {status === 'active' && test && (
        <div className="flex-1 flex flex-col p-4 sm:p-6 max-w-4xl mx-auto w-full relative z-10">
          
          {/* Progress Bars */}
          <div className="bg-white/80 backdrop-blur-xl border border-white/50 rounded-2xl p-4 shadow-sm mb-6 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <span className="w-20 truncate font-semibold text-xs text-blue-800">{p1?.name}</span>
              <div className="flex-1 bg-zinc-100 rounded-full h-3 overflow-hidden">
                <div 
                  className="bg-blue-500 h-full transition-all duration-500" 
                  style={{ width: \`\${((p1?.currentQuestion || 0) / test.questions.length) * 100}%\` }}
                ></div>
              </div>
              <span className="text-xs font-bold w-8 text-right">{p1?.score}/{test.questions.length}</span>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="w-20 truncate font-semibold text-xs text-red-800">{p2?.name}</span>
              <div className="flex-1 bg-zinc-100 rounded-full h-3 overflow-hidden">
                <div 
                  className="bg-red-500 h-full transition-all duration-500" 
                  style={{ width: \`\${((p2?.currentQuestion || 0) / test.questions.length) * 100}%\` }}
                ></div>
              </div>
              <span className="text-xs font-bold w-8 text-right">{p2?.score}/{test.questions.length}</span>
            </div>
          </div>

          {/* Question Card */}
          <div className="flex-1 bg-white border border-zinc-200 rounded-3xl shadow-xl overflow-hidden flex flex-col">
            <div className="p-6 sm:p-10 border-b border-zinc-100 flex-1 flex items-center justify-center text-center">
              <h2 className="text-xl sm:text-2xl font-bold text-zinc-900">
                <FormattedText content={test.questions[currentQIndex]?.questionText} />
              </h2>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 bg-zinc-50 p-4">
              {test.questions[currentQIndex]?.options.map((opt: string, i: number) => (
                <button
                  key={i}
                  onClick={() => handleAnswer(i)}
                  disabled={hasAnsweredCurrent}
                  className="bg-white border border-zinc-200 p-6 rounded-2xl text-left hover:border-black hover:shadow-md transition-all disabled:opacity-50"
                >
                  <FormattedText content={opt} />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {status === 'finished' && p1 && p2 && (
        <div className="flex-1 flex items-center justify-center p-6 relative z-10">
          <div className="bg-white/90 backdrop-blur-xl border border-white/50 shadow-2xl rounded-3xl p-10 max-w-lg w-full text-center">
            <Trophy size={64} className="text-yellow-500 mx-auto mb-6" />
            <h1 className="text-3xl font-black text-zinc-900 mb-8">Natijalar</h1>
            
            <div className="flex items-end justify-center gap-4 mb-10">
              <div className={\`flex flex-col items-center \${p1.score >= p2.score ? 'order-2' : 'order-1 opacity-70'}\`}>
                <div className="font-bold text-zinc-600 mb-2 truncate w-24">{p1.score >= p2.score ? p1.name : p2.name}</div>
                <div className={\`w-24 \${p1.score >= p2.score ? 'h-32 bg-yellow-400' : 'h-24 bg-zinc-300'} rounded-t-xl flex items-center justify-center text-white font-black text-2xl shadow-inner\`}>
                  {p1.score >= p2.score ? '1' : '2'}
                </div>
                <div className="mt-2 font-bold">{p1.score >= p2.score ? p1.score : p2.score} ball</div>
              </div>
              
              <div className={\`flex flex-col items-center \${p1.score < p2.score ? 'order-2' : 'order-1 opacity-70'}\`}>
                <div className="font-bold text-zinc-600 mb-2 truncate w-24">{p1.score < p2.score ? p1.name : p2.name}</div>
                <div className={\`w-24 \${p1.score < p2.score ? 'h-32 bg-yellow-400' : 'h-24 bg-zinc-300'} rounded-t-xl flex items-center justify-center text-white font-black text-2xl shadow-inner\`}>
                  {p1.score < p2.score ? '1' : '2'}
                </div>
                <div className="mt-2 font-bold">{p1.score < p2.score ? p1.score : p2.score} ball</div>
              </div>
            </div>
            
            <button 
              onClick={() => navigate('/')}
              className="w-full bg-black text-white py-4 rounded-xl font-bold text-lg hover:bg-zinc-800 transition-colors"
            >
              Bosh sahifaga qaytish
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
