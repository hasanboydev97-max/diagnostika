import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Copy, Play } from 'lucide-react';
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
  const queryParams = new URLSearchParams(location.search);
  const [pin, setPin] = useState(queryParams.get('pin') || '');
  const [name, setName] = useState('');
  
  // Duel states
  const [test, setTest] = useState<any>(null);
  const [isCreator, setIsCreator] = useState(false);
  const [p1, setP1] = useState<PlayerState | null>(null);
  const [p2, setP2] = useState<PlayerState | null>(null);
  
  // Game states
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [hasAnsweredCurrent, setHasAnsweredCurrent] = useState(false);
  const [myScore, setMyScore] = useState(0);

  // Refs to avoid stale closures in socket listener
  const pinRef = useRef(pin);
  const nameRef = useRef(name);
  const isCreatorRef = useRef(isCreator);
  const statusRef = useRef(status);

  useEffect(() => { pinRef.current = pin; }, [pin]);
  useEffect(() => { nameRef.current = name; }, [name]);
  useEffect(() => { isCreatorRef.current = isCreator; }, [isCreator]);
  useEffect(() => { statusRef.current = status; }, [status]);

  useEffect(() => {
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Socket connected/reconnected:', newSocket.id);
      if (pinRef.current && nameRef.current && statusRef.current !== 'login') {
        newSocket.emit('rejoin_duel', {
          pin: pinRef.current,
          name: nameRef.current,
          isCreator: isCreatorRef.current
        });
      }
    });

    const state = location.state as any;
    if (state?.isCreator && state?.testId && state?.studentName) {
      setIsCreator(true);
      setName(state.studentName);
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

    newSocket.on('duel_ready', ({ player1, player2, testId: newTestId }) => {
      if (!isCreator) {
        setPin(pin);
        fetchTest(newTestId);
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
    const inviteLink = `${window.location.origin}/duel?pin=${pin}`;
    navigator.clipboard.writeText(inviteLink);
    toast.success("Taklif havolasi (link) nusxalandi! Do'stingizga yuboring.");
  };

  const fadeUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] }
  };

  if (!socket) return null;

  return (
    <div className="min-h-screen bg-[#fdfdfd] text-[#111111] font-sans selection:bg-black selection:text-white flex flex-col">
      <AnimatePresence mode="wait">
        
        {/* LOGIN SCREEN */}
        {status === 'login' && (
          <motion.div 
            key="login"
            initial="initial" animate="animate" exit="exit" variants={fadeUp}
            className="flex-1 flex flex-col items-center justify-center p-6 w-full max-w-md mx-auto"
          >
            <div className="text-center mb-12">
              <p className="text-xs uppercase tracking-[0.3em] text-gray-500 mb-4">1v1 Duyel</p>
              <h1 className="text-3xl font-medium tracking-tight">Jangga qo'shilish</h1>
            </div>
            
            <form onSubmit={handleJoin} className="w-full space-y-6">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-gray-500 mb-2 pl-2">Pin Kod</p>
                <input 
                  type="text" 
                  value={pin}
                  onChange={e => setPin(e.target.value)}
                  className="w-full bg-white border border-black/10 px-6 py-4 text-center text-2xl font-mono tracking-widest focus:outline-none focus:border-black transition-colors"
                  maxLength={6}
                />
              </div>
              
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-gray-500 mb-2 pl-2">Ismingiz</p>
                <input 
                  type="text" 
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-white border border-black/10 px-6 py-4 text-center text-lg focus:outline-none focus:border-black transition-colors"
                  required
                />
              </div>
              
              <button 
                type="submit"
                className="w-full bg-[#111111] text-[#fdfdfd] py-5 mt-4 hover:bg-black transition-colors flex items-center justify-center gap-4"
              >
                <span className="text-xs uppercase tracking-[0.2em]">Kirish</span>
              </button>
            </form>
          </motion.div>
        )}

        {/* LOBBY SCREEN */}
        {status === 'lobby' && (
          <motion.div 
            key="lobby"
            initial="initial" animate="animate" exit="exit" variants={fadeUp}
            className="flex-1 flex flex-col items-center justify-center p-6 max-w-2xl mx-auto w-full text-center"
          >
            <p className="text-xs uppercase tracking-[0.3em] text-gray-500 mb-4">1v1 Duyel</p>
            <h2 className="text-3xl md:text-5xl font-medium mb-12">Tayyorgarlik</h2>

            {isCreator && (
              <div 
                onClick={copyLink}
                className="mb-16 group cursor-pointer border border-black/10 px-12 py-8 bg-white hover:border-black transition-colors flex flex-col items-center gap-4"
              >
                <p className="text-[10px] uppercase tracking-[0.3em] text-gray-500 font-bold">Taklif havolasini nusxalash</p>
                <div className="text-6xl tracking-widest font-light">{pin}</div>
                <div className="flex items-center gap-2 mt-4 text-xs font-bold uppercase tracking-[0.2em] text-black">
                  <Copy size={16} /> Linkni nusxalash
                </div>
              </div>
            )}

            <div className="flex items-center justify-center w-full gap-8 mb-16">
              <div className="flex-1 border-b border-black/10 pb-4 text-left">
                <p className="text-xs uppercase tracking-[0.3em] text-gray-400 mb-2">1-O'yinchi</p>
                <p className="text-xl font-medium">{p1?.name || name}</p>
              </div>
              <div className="text-xs uppercase tracking-[0.3em] text-gray-300">VS</div>
              <div className="flex-1 border-b border-black/10 pb-4 text-right">
                <p className="text-xs uppercase tracking-[0.3em] text-gray-400 mb-2">2-O'yinchi</p>
                {p2 ? (
                  <p className="text-xl font-medium">{p2.name}</p>
                ) : (
                  <div className="flex items-center justify-end gap-2 text-gray-400">
                    <Loader2 size={16} className="animate-spin" />
                    <span className="text-sm">Kutilmoqda</span>
                  </div>
                )}
              </div>
            </div>

            {isCreator && (
              <button 
                onClick={handleStartDuel}
                disabled={!p2}
                className="bg-[#111111] text-[#fdfdfd] py-4 px-12 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-black transition-colors flex items-center justify-center gap-4 mx-auto"
              >
                <span className="text-xs uppercase tracking-[0.2em]">Jangni boshlash</span>
                <Play size={14} fill="currentColor" />
              </button>
            )}
          </motion.div>
        )}

        {/* ACTIVE DUEL SCREEN */}
        {status === 'active' && test && (
          <motion.div 
            key="active"
            initial="initial" animate="animate" exit="exit" variants={fadeUp}
            className="flex-1 flex flex-col container mx-auto max-w-5xl py-8 px-6"
          >
            {/* Progress Header */}
            <div className="grid grid-cols-2 gap-12 border-b border-black/10 pb-8 mb-12">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-[0.2em]">{p1?.name}</span>
                  <span className="text-xs font-mono">{p1?.score}/{test.questions.length}</span>
                </div>
                <div className="h-1 bg-black/5 w-full">
                  <div 
                    className="h-full bg-black transition-all duration-500"
                    style={{ width: `${((p1?.currentQuestion || 0) / test.questions.length) * 100}%` }}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-[0.2em]">{p2?.name}</span>
                  <span className="text-xs font-mono">{p2?.score}/{test.questions.length}</span>
                </div>
                <div className="h-1 bg-black/5 w-full">
                  <div 
                    className="h-full bg-black transition-all duration-500"
                    style={{ width: `${((p2?.currentQuestion || 0) / test.questions.length) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Question */}
            <div className="mb-16">
              <p className="text-xs uppercase tracking-[0.3em] text-gray-500 mb-4 text-center">Savol {currentQIndex + 1}</p>
              <h2 className="text-3xl md:text-4xl font-medium leading-relaxed text-center max-w-3xl mx-auto">
                <FormattedText content={test.questions[currentQIndex]?.questionText} />
              </h2>
            </div>
            
            {/* Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-auto">
              {test.questions[currentQIndex]?.options.map((opt: string, i: number) => {
                const colors = [
                  'bg-gradient-to-br from-rose-50 to-rose-100/50 border-rose-200 text-rose-950 shadow-[inset_0_2px_10px_rgba(255,255,255,1)] hover:border-rose-400 hover:shadow-[inset_0_2px_15px_rgba(255,255,255,1)]',
                  'bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200 text-blue-950 shadow-[inset_0_2px_10px_rgba(255,255,255,1)] hover:border-blue-400 hover:shadow-[inset_0_2px_15px_rgba(255,255,255,1)]',
                  'bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200 text-amber-950 shadow-[inset_0_2px_10px_rgba(255,255,255,1)] hover:border-amber-400 hover:shadow-[inset_0_2px_15px_rgba(255,255,255,1)]',
                  'bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200 text-emerald-950 shadow-[inset_0_2px_10px_rgba(255,255,255,1)] hover:border-emerald-400 hover:shadow-[inset_0_2px_15px_rgba(255,255,255,1)]'
                ];
                return (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    key={i}
                    onClick={() => handleAnswer(i)}
                    disabled={hasAnsweredCurrent}
                    className={`border p-8 md:p-12 text-center text-lg md:text-xl font-medium rounded-2xl transition-all flex items-center justify-center disabled:opacity-50 ${colors[i % 4]}`}
                  >
                    <FormattedText content={opt} />
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* FINISHED SCREEN */}
        {status === 'finished' && p1 && p2 && (
          <motion.div 
            key="finished"
            initial="initial" animate="animate" exit="exit" variants={fadeUp}
            className="flex-1 flex flex-col items-center justify-center p-6 text-center"
          >
            <p className="text-xs uppercase tracking-[0.3em] text-gray-500 mb-4">Natija</p>
            <h1 className="text-4xl md:text-6xl font-medium tracking-tight mb-20">Jang yakunlandi</h1>
            
            <div className="flex items-end justify-center gap-4 md:gap-16 border-b border-black/10 pb-0 w-full max-w-2xl h-72 mb-16">
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: '70%', opacity: 1 }}
                transition={{ duration: 1, delay: 0.4 }}
                className={`flex-1 flex flex-col items-center border-t border-l border-r rounded-t-3xl pt-8 relative overflow-hidden ${p1.score < p2.score ? 'bg-gradient-to-t from-zinc-200 to-zinc-50 border-zinc-200 shadow-[inset_0_2px_15px_rgba(255,255,255,1)] text-zinc-900' : 'bg-gradient-to-t from-amber-200 to-amber-50 border-amber-200 shadow-[inset_0_2px_15px_rgba(255,255,255,1)] text-amber-950'}`}
              >
                <span className={`text-lg md:text-2xl font-medium mb-1 truncate w-full text-center px-2 ${p1.score >= p2.score ? 'text-amber-950' : 'text-zinc-900'}`}>{p1.name}</span>
                <span className={`text-sm font-mono mb-auto ${p1.score >= p2.score ? 'text-amber-700/80' : 'text-zinc-500'}`}>{p1.score} pt</span>
                <span className={`text-6xl font-light mb-8 relative z-10 ${p1.score >= p2.score ? 'text-amber-900/20' : 'text-zinc-300'}`}>
                  {p1.score >= p2.score ? '1' : '2'}
                </span>
              </motion.div>

              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: '70%', opacity: 1 }}
                transition={{ duration: 1, delay: 0.6 }}
                className={`flex-1 flex flex-col items-center border-t border-l border-r rounded-t-3xl pt-8 relative overflow-hidden ${p2.score <= p1.score ? 'bg-gradient-to-t from-zinc-200 to-zinc-50 border-zinc-200 shadow-[inset_0_2px_15px_rgba(255,255,255,1)] text-zinc-900' : 'bg-gradient-to-t from-amber-200 to-amber-50 border-amber-200 shadow-[inset_0_2px_15px_rgba(255,255,255,1)] text-amber-950'}`}
              >
                <span className={`text-lg md:text-2xl font-medium mb-1 truncate w-full text-center px-2 ${p2.score > p1.score ? 'text-amber-950' : 'text-zinc-900'}`}>{p2.name}</span>
                <span className={`text-sm font-mono mb-auto ${p2.score > p1.score ? 'text-amber-700/80' : 'text-zinc-500'}`}>{p2.score} pt</span>
                <span className={`text-6xl font-light mb-8 relative z-10 ${p2.score > p1.score ? 'text-amber-900/20' : 'text-zinc-300'}`}>
                  {p2.score > p1.score ? '1' : '2'}
                </span>
              </motion.div>
            </div>

            <button 
              onClick={() => navigate('/')}
              className="border border-[#111111] text-[#111111] py-4 px-12 hover:bg-[#111111] hover:text-white transition-colors"
            >
              <span className="text-xs uppercase tracking-[0.2em]">Bosh sahifaga qaytish</span>
            </button>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
