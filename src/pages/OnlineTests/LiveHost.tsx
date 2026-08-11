import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, ChevronRight, Trophy, ArrowLeft, Loader2, StopCircle } from 'lucide-react';
import { getAuthHeaders, getToken } from '../../lib/auth';
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
  const [timer, setTimer] = useState(30);
  
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

  useEffect(() => {
    return () => {
      socket?.disconnect();
    };
  }, [socket]);

  const triggerConfetti = () => {
    confetti({ particleCount: 200, spread: 100, origin: { y: 0.6 }, colors: ['#111111', '#555555', '#999999'] });
  };

  const startGame = () => {
    if (players.length === 0) {
      return toast.error("O'yinni boshlash uchun kamida 1 ta o'quvchi kerak");
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

  const fadeUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] }
  };

  const staggerContainer = {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  if (!test) {
    return (
      <div className="min-h-screen bg-[#fdfdfd] flex items-center justify-center">
        <Loader2 className="animate-spin text-gray-400" size={24} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fdfdfd] text-[#111111] font-sans selection:bg-black selection:text-white flex flex-col">
      <AnimatePresence mode="wait">
        
        {/* WAITING ROOM */}
        {status === 'waiting' && (
          <motion.div 
            key="waiting"
            initial="initial" animate="animate" exit="exit" variants={fadeUp}
            className="flex-1 container mx-auto max-w-7xl flex flex-col justify-center items-center p-8 lg:p-16 gap-12"
          >
            <div className="text-center w-full">
              <motion.p variants={fadeUp} className="text-xs uppercase tracking-[0.3em] text-gray-500 mb-4">
                {test.subject} / Test Kutish Zali
              </motion.p>
              <motion.h1 variants={fadeUp} className="text-3xl md:text-5xl font-medium tracking-tight mb-8">
                {test.title}
              </motion.h1>
            </div>

            <motion.div variants={fadeUp} className="grid grid-cols-1 md:grid-cols-2 w-full gap-8 border-t border-b border-black/10 py-12">
              <div className="flex flex-col justify-center border-r-0 md:border-r border-black/10 pr-0 md:pr-8">
                <p className="text-xs uppercase tracking-[0.3em] text-gray-500 mb-4">Ulanish Manzili</p>
                <p className="text-xl md:text-2xl font-mono text-gray-500 mb-8">{window.location.host}/live</p>
                
                <p className="text-xs uppercase tracking-[0.3em] text-gray-500 mb-4">PIN Kod</p>
                <div className="text-5xl md:text-7xl font-medium tracking-tighter">
                  {pin || '...'}
                </div>
              </div>

              <div className="flex flex-col justify-between pl-0 md:pl-8">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-gray-500 mb-6">Ulanishlar ({players.length})</p>
                  <motion.div 
                    variants={staggerContainer}
                    className="flex flex-wrap gap-2 max-h-48 overflow-y-auto"
                  >
                    {players.length === 0 ? (
                      <span className="text-gray-400 text-sm italic">O'quvchilar kutilmoqda...</span>
                    ) : (
                      players.map((p, i) => (
                        <motion.span 
                          key={i} 
                          variants={fadeUp}
                          className="px-4 py-2 border border-black/10 text-sm bg-white"
                        >
                          {p.name}
                        </motion.span>
                      ))
                    )}
                  </motion.div>
                </div>

                <div className="mt-8 pt-8 border-t border-black/10">
                  <button 
                    onClick={startGame}
                    className="w-full bg-[#111111] text-[#fdfdfd] py-4 px-8 flex items-center justify-between hover:bg-black transition-colors"
                  >
                    <span className="text-xs uppercase tracking-[0.2em]">O'yinni Boshlash</span>
                    <Play size={16} fill="currentColor" />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* ACTIVE GAME */}
        {status === 'active' && test.questions[currentQuestionIndex] && (
          <motion.div 
            key="active"
            initial="initial" animate="animate" exit="exit" variants={fadeUp}
            className="flex-1 flex flex-col container mx-auto max-w-7xl py-12 px-6"
          >
            {/* Top Bar */}
            <div className="flex items-center justify-between pb-6 border-b border-black/10 mb-12">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-gray-500 mb-2">Savol {currentQuestionIndex + 1} / {test.questions.length}</p>
                <h2 className="text-2xl font-medium">Jonli Test</h2>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-[0.3em] text-gray-500 mb-2">Vaqt</p>
                <p className="text-2xl font-mono">{timer}s</p>
              </div>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 flex-1">
              <div className="lg:col-span-8 flex flex-col">
                <div className="mb-12">
                  <h3 className="text-3xl md:text-4xl font-medium leading-relaxed">
                    <FormattedText content={test.questions[currentQuestionIndex].questionText} />
                  </h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-auto">
                  {test.questions[currentQuestionIndex].options.map((opt: string, i: number) => {
                    const colors = [
                      'bg-gradient-to-br from-rose-50 to-rose-100/50 border-rose-200 text-rose-950 shadow-[inset_0_2px_10px_rgba(255,255,255,1)]',
                      'bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200 text-blue-950 shadow-[inset_0_2px_10px_rgba(255,255,255,1)]',
                      'bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200 text-amber-950 shadow-[inset_0_2px_10px_rgba(255,255,255,1)]',
                      'bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200 text-emerald-950 shadow-[inset_0_2px_10px_rgba(255,255,255,1)]'
                    ];
                    return (
                      <div key={i} className={`border p-6 flex items-center justify-center text-lg rounded-2xl ${colors[i % 4]}`}>
                        <FormattedText content={opt} />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Leaderboard Sidebar */}
              <div className="lg:col-span-4 border-l border-black/10 pl-12 flex flex-col">
                <p className="text-xs uppercase tracking-[0.3em] text-gray-500 mb-8 flex items-center gap-2">
                  <Trophy size={14} /> Leaderboard
                </p>
                <div className="flex-1 overflow-y-auto space-y-4">
                  {players.slice(0, 10).map((p, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-black/5 last:border-0">
                      <div className="flex items-center gap-4">
                        <span className="text-xs uppercase tracking-[0.2em] text-gray-400">#{i+1}</span>
                        <span className="font-medium text-sm">{p.name}</span>
                      </div>
                      <span className="font-mono text-sm">{p.score}</span>
                    </div>
                  ))}
                </div>
                
                <div className="mt-8 space-y-4 pt-8 border-t border-black/10">
                  <button 
                    onClick={nextQuestion}
                    className="w-full border border-[#111111] text-[#111111] py-4 px-6 flex items-center justify-between hover:bg-[#111111] hover:text-white transition-colors"
                  >
                    <span className="text-xs uppercase tracking-[0.2em]">Keyingi Savol</span>
                    <ChevronRight size={16} />
                  </button>
                  <button 
                    onClick={endGame}
                    className="w-full text-gray-400 py-4 px-6 flex items-center justify-between hover:text-black transition-colors"
                  >
                    <span className="text-xs uppercase tracking-[0.2em]">Tugatish</span>
                    <StopCircle size={16} />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* FINISHED / PODIUM */}
        {status === 'finished' && (
          <motion.div 
            key="finished"
            initial="initial" animate="animate" exit="exit" variants={fadeUp}
            className="flex-1 container mx-auto max-w-4xl flex flex-col justify-center items-center p-8 min-h-[80vh]"
          >
            <p className="text-xs uppercase tracking-[0.3em] text-gray-500 mb-4">Natijalar</p>
            <h1 className="text-4xl md:text-6xl font-medium tracking-tight mb-16">G'oliblar</h1>
            
            <div className="flex items-end justify-center gap-2 md:gap-6 mb-20 w-full h-72 border-b border-black/10 pb-0">
              {/* 2nd Place */}
              {players[1] && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: '60%', opacity: 1 }}
                  transition={{ duration: 1, delay: 0.4, ease: "easeOut" }}
                  className="flex-1 flex flex-col items-center bg-gradient-to-t from-zinc-200 to-zinc-50 border-t border-l border-r border-zinc-200 shadow-[inset_0_2px_15px_rgba(255,255,255,1)] rounded-t-3xl pt-6 relative overflow-hidden"
                >
                  <span className="text-sm md:text-lg font-medium mb-1 text-zinc-900 truncate w-full text-center px-2">{players[1].name}</span>
                  <span className="text-xs font-mono text-zinc-500 mb-auto">{players[1].score} pt</span>
                  <span className="text-4xl font-light text-zinc-300 mb-6 relative z-10">2</span>
                </motion.div>
              )}

              {/* 1st Place */}
              {players[0] && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: '100%', opacity: 1 }}
                  transition={{ duration: 1, delay: 0.8, ease: "easeOut" }}
                  className="flex-1 flex flex-col items-center bg-gradient-to-t from-amber-200 to-amber-50 border-t border-l border-r border-amber-200 shadow-[inset_0_2px_15px_rgba(255,255,255,1)] rounded-t-3xl pt-8 relative overflow-hidden"
                >
                  <span className="text-lg md:text-2xl font-medium mb-1 text-amber-950 truncate w-full text-center px-2">{players[0].name}</span>
                  <span className="text-sm font-mono text-amber-700/80 mb-auto">{players[0].score} pt</span>
                  <span className="text-6xl font-light text-amber-900/20 mb-8 relative z-10">1</span>
                </motion.div>
              )}

              {/* 3rd Place */}
              {players[2] && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: '40%', opacity: 1 }}
                  transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
                  className="flex-1 flex flex-col items-center bg-gradient-to-t from-orange-200 to-orange-50 border-t border-l border-r border-orange-200 shadow-[inset_0_2px_15px_rgba(255,255,255,1)] rounded-t-3xl pt-4 relative overflow-hidden"
                >
                  <span className="text-sm md:text-base font-medium mb-1 text-orange-950 truncate w-full text-center px-2">{players[2].name}</span>
                  <span className="text-xs font-mono text-orange-700/80 mb-auto">{players[2].score} pt</span>
                  <span className="text-3xl font-light text-orange-900/20 mb-4 relative z-10">3</span>
                </motion.div>
              )}
            </div>

            <button 
              onClick={() => navigate('/online-tests')}
              className="border border-[#111111] text-[#111111] py-4 px-12 hover:bg-[#111111] hover:text-white transition-colors flex items-center gap-4"
            >
              <ArrowLeft size={16} />
              <span className="text-xs uppercase tracking-[0.2em]">Dashboard'ga qaytish</span>
            </button>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
