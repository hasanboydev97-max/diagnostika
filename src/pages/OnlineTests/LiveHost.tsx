import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { Users, Play, ChevronRight, Trophy, ArrowLeft, Loader2, StopCircle } from 'lucide-react';
import { getAuthHeaders, getToken } from '../../lib/auth';
import MeshGradient from '../../components/ui/MeshGradient';
import FormattedText from '../../components/FormattedText';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const SOCKET_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:5000';

export default function LiveHost() {
  const { testId } = useParams();
  const navigate = useNavigate();
  const [socket, setSocket] = useState<Socket | null>(null);
  
  const [test, setTest] = useState<any>(null);
  const [pin, setPin] = useState('');
  const [players, setPlayers] = useState<any[]>([]);
  const [status, setStatus] = useState<'waiting' | 'active' | 'finished'>('waiting');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(-1);
  const [timer, setTimer] = useState(30); // 30 seconds per question default
  
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (!getToken()) {
      navigate('/teacher/login');
      return;
    }
    fetchTest();
  }, [testId]);

  const fetchTest = async () => {
    try {
      const res = await fetch(`${API_URL}/online-tests/${testId}`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        setTest(await res.json());
        initSocket();
      } else {
        toast.error('Test topilmadi');
        navigate('/online-tests');
      }
    } catch (err) {
      toast.error('Server xatosi');
    }
  };

  const initSocket = () => {
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      newSocket.emit('host_room', { testId });
    });

    newSocket.on('room_created', ({ pin }) => {
      setPin(pin);
    });

    newSocket.on('player_joined', ({ players }) => {
      setPlayers(players);
    });

    newSocket.on('player_left', ({ players }) => {
      setPlayers(players);
    });

    newSocket.on('new_question', ({ questionIndex }) => {
      setCurrentQuestionIndex(questionIndex);
      setStatus('active');
      startTimer();
    });

    newSocket.on('leaderboard_update', ({ players }) => {
      setPlayers([...players].sort((a, b) => b.score - a.score));
    });

    newSocket.on('game_ended', ({ players }) => {
      setStatus('finished');
      setPlayers([...players].sort((a, b) => b.score - a.score));
      triggerConfetti();
    });

    return () => newSocket.disconnect();
  };

  const startTimer = () => {
    clearInterval(timerRef.current);
    setTimer(30);
    timerRef.current = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    return () => clearInterval(timerRef.current);
  }, []);

  const triggerConfetti = () => {
    confetti({ particleCount: 200, spread: 100, origin: { y: 0.6 }, colors: ['#4f46e5', '#ec4899', '#f59e0b'] });
  };

  const startGame = () => {
    if (players.length === 0) {
      return toast.error('O'yinni boshlash uchun kamida 1 ta o'quvchi kerak');
    }
    socket?.emit('start_game', { pin });
  };

  const nextQuestion = () => {
    if (!test) return;
    if (currentQuestionIndex + 1 >= test.questions.length) {
      socket?.emit('end_game', { pin });
    } else {
      socket?.emit('next_question', { pin });
    }
  };

  const endGame = () => {
    socket?.emit('end_game', { pin });
  };

  if (!test) {
    return (
      <div className="min-h-screen bg-[#fdfdfd] flex items-center justify-center">
        <Loader2 className="animate-spin text-zinc-400" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative font-sans text-zinc-900 bg-[#fdfdfd] overflow-hidden flex flex-col">
      <MeshGradient />
      
      {status === 'waiting' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
          <div className="bg-white/80 backdrop-blur-xl border border-white/50 shadow-2xl rounded-3xl p-10 max-w-2xl w-full text-center">
            <h1 className="text-2xl font-bold text-zinc-800 mb-2">{test.title}</h1>
            <p className="text-zinc-500 mb-4">O'quvchilar ushbu manzilga kirishlari kerak:</p>
            <div className="bg-zinc-100 rounded-lg py-3 px-6 inline-block mb-6 border border-zinc-200">
              <span className="font-mono text-xl font-bold text-zinc-900 tracking-tight">bmdiagnostika.vercel.app/live</span>
            </div>
            <p className="text-zinc-500 mb-2">Va quyidagi PIN kodni kiritadilar:</p>
            
            <div className="text-6xl sm:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 tracking-widest mb-10 drop-shadow-sm">
              {pin || '...'}
            </div>
            
            <div className="flex items-center justify-between bg-zinc-50 border border-zinc-200 rounded-2xl p-4 mb-8">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center">
                  <Users size={24} />
                </div>
                <div className="text-left">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold">Ulandi</p>
                  <p className="text-xl font-bold text-zinc-900">{players.length} ta o'quvchi</p>
                </div>
              </div>
              <button 
                onClick={startGame}
                className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 flex items-center gap-2"
              >
                <Play fill="currentColor" size={18} /> Boshlash
              </button>
            </div>

            <div className="flex flex-wrap gap-2 justify-center max-h-48 overflow-y-auto">
              {players.map((p, i) => (
                <span key={i} className="px-4 py-2 bg-indigo-50 text-indigo-700 font-semibold rounded-lg text-sm border border-indigo-100 animate-in fade-in zoom-in">
                  {p.name}
                </span>
              ))}
              {players.length === 0 && <span className="text-zinc-400 text-sm italic">O'quvchilar kutilmoqda...</span>}
            </div>
          </div>
        </div>
      )}

      {status === 'active' && test.questions[currentQuestionIndex] && (
        <div className="flex-1 flex flex-col relative z-10 h-screen">
          <div className="h-2 bg-zinc-200 w-full">
            <div 
              className="h-full bg-indigo-600 transition-all duration-1000 ease-linear"
              style={{ width: `${(timer / 30) * 100}%` }}
            ></div>
          </div>
          
          <div className="flex-1 flex flex-col md:flex-row p-6 gap-6">
            <div className="flex-[3] flex flex-col">
              <div className="bg-white rounded-3xl p-8 shadow-sm border border-zinc-200 flex-1 flex flex-col justify-center text-center mb-6">
                <span className="text-zinc-400 font-bold uppercase tracking-wider text-sm mb-4">Savol {currentQuestionIndex + 1} / {test.questions.length}</span>
                <h2 className="text-3xl md:text-5xl font-semibold leading-tight text-zinc-900">
                  <FormattedText content={test.questions[currentQuestionIndex].questionText} />
                </h2>
              </div>
              
              <div className="grid grid-cols-2 gap-4 h-48">
                {test.questions[currentQuestionIndex].options.map((opt: string, i: number) => {
                  const colors = [
                    'bg-red-500 border-red-600', 
                    'bg-blue-500 border-blue-600', 
                    'bg-yellow-500 border-yellow-600 text-black', 
                    'bg-emerald-500 border-emerald-600'
                  ];
                  return (
                    <div key={i} className={`${colors[i]} rounded-2xl p-4 flex items-center justify-center text-xl font-bold text-white shadow-sm border-b-4`}>
                      <FormattedText content={opt} />
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="flex-1 bg-white rounded-3xl shadow-sm border border-zinc-200 flex flex-col overflow-hidden">
              <div className="p-4 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between">
                <h3 className="font-bold flex items-center gap-2"><Trophy size={18} className="text-yellow-500" /> Leaderboard</h3>
                <span className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded text-xs font-bold">{timer}s</span>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {players.slice(0, 10).map((p, i) => (
                  <div key={i} className="flex items-center justify-between bg-zinc-50 p-3 rounded-xl">
                    <div className="flex items-center gap-3">
                      <span className={`font-black text-lg ${i === 0 ? 'text-yellow-500' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-amber-700' : 'text-zinc-400'}`}>#{i+1}</span>
                      <span className="font-semibold">{p.name}</span>
                    </div>
                    <span className="font-mono font-bold bg-indigo-50 text-indigo-700 px-2 py-1 rounded">{p.score}</span>
                  </div>
                ))}
              </div>
              <div className="p-4 border-t border-zinc-200 flex flex-col gap-2">
                <button 
                  onClick={nextQuestion}
                  className="w-full bg-zinc-900 text-white py-3 rounded-xl font-bold hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2"
                >
                  Keyingi Savol <ChevronRight size={18} />
                </button>
                <button 
                  onClick={endGame}
                  className="w-full bg-red-50 text-red-600 py-3 rounded-xl font-bold hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                >
                  <StopCircle size={18} /> O'yinni Tugatish
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {status === 'finished' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
          <div className="bg-white/80 backdrop-blur-xl border border-white/50 shadow-2xl rounded-3xl p-10 max-w-3xl w-full text-center">
            <Trophy size={64} className="text-yellow-500 mx-auto mb-6" />
            <h1 className="text-4xl font-black text-zinc-900 mb-8">G'oliblar!</h1>
            
            <div className="flex flex-col md:flex-row items-end justify-center gap-4 mb-10 h-64">
              {/* Top 3 Podium */}
              {players[1] && (
                <div className="flex flex-col items-center flex-1 z-10">
                  <span className="font-bold text-xl mb-2">{players[1].name}</span>
                  <span className="font-mono font-bold text-zinc-500 mb-2">{players[1].score}</span>
                  <div className="w-full bg-gray-200 h-32 rounded-t-xl flex justify-center pt-4 text-4xl font-black text-gray-400">2</div>
                </div>
              )}
              {players[0] && (
                <div className="flex flex-col items-center flex-1 z-20">
                  <span className="font-bold text-2xl mb-2 text-yellow-600">{players[0].name}</span>
                  <span className="font-mono font-bold text-zinc-500 mb-2">{players[0].score}</span>
                  <div className="w-full bg-yellow-400 h-48 rounded-t-xl flex justify-center pt-4 text-5xl font-black text-yellow-600 shadow-xl">1</div>
                </div>
              )}
              {players[2] && (
                <div className="flex flex-col items-center flex-1 z-0">
                  <span className="font-bold text-lg mb-2">{players[2].name}</span>
                  <span className="font-mono font-bold text-zinc-500 mb-2">{players[2].score}</span>
                  <div className="w-full bg-amber-700/80 h-24 rounded-t-xl flex justify-center pt-4 text-3xl font-black text-amber-900">3</div>
                </div>
              )}
            </div>

            <button 
              onClick={() => navigate('/online-tests')}
              className="bg-zinc-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-zinc-800 transition-colors flex items-center gap-2 mx-auto"
            >
              <ArrowLeft size={18} /> Dashboard'ga qaytish
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
