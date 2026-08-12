import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle2, XCircle, Trophy } from 'lucide-react';
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
    });

    newSocket.on('game_ended', ({ players }) => {
      setStatus('finished');
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

    // Asynchronous progression
    setTimeout(() => {
      if (currentQuestionIndex + 1 < test.questions.length) {
        setCurrentQuestionIndex(prev => prev + 1);
        setHasAnswered(false);
      }
    }, 2500);
  };

  const violationsRef = useRef(0);

  // Proctoring: strict rules in active live test
  useEffect(() => {
    if (status !== 'active') return;

    const handleViolation = () => {
      violationsRef.current += 1;
      if (violationsRef.current === 1) {
        toast.error("OGOHLANTIRISH: Iltimos, test vaqtida oynani tark etmang! Takrorlansa chetlashtirilasiz.", {
          duration: 6000,
          position: 'top-center',
          style: { background: '#f59e0b', color: '#fff', border: 'none' }
        });
      } else {
        toast.error("QOIDABUZARLIK! Oynani tark etganingiz sababli chetlashtirildingiz.", {
          duration: 5000,
          position: 'top-center'
        });
        if (socket) socket.disconnect();
        navigate('/');
      }
    };

    const onVisibilityChange = () => {
      if (document.hidden) handleViolation();
    };

    const onWindowBlur = () => {
      handleViolation();
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('blur', onWindowBlur);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('blur', onWindowBlur);
    };
  }, [status, socket, navigate]);


  const fadeUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] }
  };

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
              <p className="text-xs uppercase tracking-[0.3em] text-gray-500 mb-4">Jonli Test</p>
              <h1 className="text-3xl font-medium tracking-tight">O'yinga ulanish</h1>
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
                />
              </div>
              
              <button 
                type="submit"
                className="w-full bg-[#111111] text-[#fdfdfd] py-5 mt-4 hover:bg-black transition-colors"
              >
                <span className="text-xs uppercase tracking-[0.2em]">Ulanish</span>
              </button>
            </form>
          </motion.div>
        )}

        {/* WAITING SCREEN */}
        {status === 'waiting' && (
          <motion.div 
            key="waiting"
            initial="initial" animate="animate" exit="exit" variants={fadeUp}
            className="flex-1 flex flex-col items-center justify-center p-6 text-center"
          >
            <p className="text-xs uppercase tracking-[0.3em] text-gray-500 mb-4">Ulandingiz</p>
            <h2 className="text-2xl md:text-4xl font-medium tracking-tight mb-12">O'yin boshlanishini kuting</h2>
            <Loader2 className="animate-spin text-gray-400" size={32} />
          </motion.div>
        )}

        {/* ACTIVE GAME - QUESTION */}
        {status === 'active' && !hasAnswered && test && (
          <motion.div 
            key="active"
            initial="initial" animate="animate" exit="exit" variants={fadeUp}
            className="flex-1 flex flex-col container mx-auto max-w-4xl p-6"
          >
            <div className="text-center mb-10 md:mb-12 pt-8 md:pt-12">
              <p className="text-xs uppercase tracking-[0.3em] text-gray-500 mb-4">Savol</p>
              <h3 className="text-xl md:text-2xl font-sans font-medium leading-relaxed max-w-4xl mx-auto">
                <FormattedText content={test.questions[currentQuestionIndex]?.questionText || ''} />
              </h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mt-auto flex-1 w-full auto-rows-fr pb-4 md:pb-8">
              {test.questions[currentQuestionIndex]?.options.map((opt: string, i: number) => {
                const colors = [
                  'bg-[#e21b3c] border-[#b0132c] text-white shadow-[0_8px_0_0_#b0132c,0_15px_20px_rgba(0,0,0,0.2),inset_0_2px_0_rgba(255,255,255,0.3)] hover:bg-[#eb2b4c] hover:-translate-y-1 hover:shadow-[0_12px_0_0_#b0132c,0_20px_25px_rgba(0,0,0,0.2),inset_0_2px_0_rgba(255,255,255,0.3)] active:translate-y-[8px] active:shadow-[0_0px_0_0_#b0132c,0_0px_0px_rgba(0,0,0,0.2)]',
                  'bg-[#1368ce] border-[#0e4e9a] text-white shadow-[0_8px_0_0_#0e4e9a,0_15px_20px_rgba(0,0,0,0.2),inset_0_2px_0_rgba(255,255,255,0.3)] hover:bg-[#1f7ae5] hover:-translate-y-1 hover:shadow-[0_12px_0_0_#0e4e9a,0_20px_25px_rgba(0,0,0,0.2),inset_0_2px_0_rgba(255,255,255,0.3)] active:translate-y-[8px] active:shadow-[0_0px_0_0_#0e4e9a,0_0px_0px_rgba(0,0,0,0.2)]',
                  'bg-[#d89e00] border-[#a57a00] text-white shadow-[0_8px_0_0_#a57a00,0_15px_20px_rgba(0,0,0,0.2),inset_0_2px_0_rgba(255,255,255,0.3)] hover:bg-[#ebaf0a] hover:-translate-y-1 hover:shadow-[0_12px_0_0_#a57a00,0_20px_25px_rgba(0,0,0,0.2),inset_0_2px_0_rgba(255,255,255,0.3)] active:translate-y-[8px] active:shadow-[0_0px_0_0_#a57a00,0_0px_0px_rgba(0,0,0,0.2)]',
                  'bg-[#26890c] border-[#1b6308] text-white shadow-[0_8px_0_0_#1b6308,0_15px_20px_rgba(0,0,0,0.2),inset_0_2px_0_rgba(255,255,255,0.3)] hover:bg-[#32a215] hover:-translate-y-1 hover:shadow-[0_12px_0_0_#1b6308,0_20px_25px_rgba(0,0,0,0.2),inset_0_2px_0_rgba(255,255,255,0.3)] active:translate-y-[8px] active:shadow-[0_0px_0_0_#1b6308,0_0px_0px_rgba(0,0,0,0.2)]'
                ];
                return (
                  <motion.button
                    key={i}
                    onClick={() => handleAnswer(i)}
                    className={`border p-6 md:p-8 text-center text-xl md:text-2xl font-bold rounded-xl transition-all duration-150 flex items-center justify-center w-full h-full min-h-[120px] ${colors[i % 4]}`}
                  >
                    <FormattedText content={opt} />
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ACTIVE GAME - ANSWER RESULT */}
        {status === 'active' && hasAnswered && (
          <motion.div 
            key="answered"
            initial="initial" animate="animate" exit="exit" variants={fadeUp}
            className={`flex-1 flex flex-col items-center justify-center p-6 text-white ${isCorrectLast ? 'bg-[#111111]' : 'bg-red-900'}`}
          >
            {isCorrectLast ? (
              <CheckCircle2 size={64} className="mb-8" strokeWidth={1} />
            ) : (
              <XCircle size={64} className="mb-8" strokeWidth={1} />
            )}
            <p className="text-xs uppercase tracking-[0.3em] text-white/60 mb-2">
              {isCorrectLast ? 'To\'g\'ri' : 'Xato'}
            </p>
            <h2 className="text-4xl font-medium mb-12">
              {isCorrectLast ? '+100 ball' : 'Keyingi safar!'}
            </h2>
            <div className="border border-white/20 px-6 py-3">
              <span className="text-xs uppercase tracking-[0.2em] text-white/60">
                {currentQuestionIndex + 1 >= (test?.questions?.length || 0) ? 'Test yakunlandi, natijalarni kuting...' : 'Keyingi savolga o\'tilmoqda...'}
              </span>
            </div>
          </motion.div>
        )}

        {/* FINISHED SCREEN */}
        {status === 'finished' && (
          <motion.div 
            key="finished"
            initial="initial" animate="animate" exit="exit" variants={fadeUp}
            className="flex-1 flex flex-col items-center justify-center p-6 text-center"
          >
            <Trophy size={48} className="text-gray-300 mb-8" strokeWidth={1} />
            <p className="text-xs uppercase tracking-[0.3em] text-gray-500 mb-4">O'yin tugadi</p>
            <h1 className="text-3xl font-medium tracking-tight mb-16">Sizning o'rningiz</h1>
            
            <div className="text-6xl md:text-8xl font-light tracking-tighter mb-16 border-b border-black/10 pb-16 w-full max-w-xs mx-auto">
              #{rank}
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
