import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle2, XCircle, Trophy, Wifi, WifiOff } from 'lucide-react';
import FormattedText from '../../components/FormattedText';
import { toast } from 'sonner';
import { isAnswerCorrect } from '../../utils/scoring';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const SOCKET_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:5000';

export default function LivePlayer() {
  const navigate = useNavigate();

  // ✅ FIX 1: Socket useRef bilan saqlanadi — useState emas.
  // useState async yangilanadi, useRef esa SYNC — handleJoin paytida null bo'lmaydi.
  const socketRef = useRef<Socket | null>(null);

  const [pin, setPin] = useState('');
  const [name, setName] = useState('');
  const [status, setStatus] = useState<'login' | 'waiting' | 'active' | 'finished'>('login');

  // ✅ FIX 2: isJoining — join bosilgandan 'joined'/'error' event kelguncha disabled
  const [isJoining, setIsJoining] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const [test, setTest] = useState<any>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(-1);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [isCorrectLast, setIsCorrectLast] = useState<boolean | null>(null);
  const [rank, setRank] = useState(0);

  // ✅ FIX 3: joinData ref da — reconnect paytida qayta emit uchun
  const joinDataRef = useRef<{ pin: string; name: string } | null>(null);
  // status ref da — useEffect closure stale state muammosini oldini oladi
  const statusRef = useRef(status);
  useEffect(() => { statusRef.current = status; }, [status]);

  useEffect(() => {
    const newSocket = io(SOCKET_URL, {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
    });
    socketRef.current = newSocket;

    newSocket.on('connect', () => {
      setIsConnected(true);
      // ✅ FIX 4: Reconnect bo'lganda — agar avval join qilingan bo'lsa, qayta join
      const currentStatus = statusRef.current;
      if (joinDataRef.current && currentStatus !== 'login' && currentStatus !== 'finished') {
        console.log('[Socket] Reconnect: qayta join...');
        newSocket.emit('join_room', joinDataRef.current);
      }
    });

    newSocket.on('disconnect', () => setIsConnected(false));
    newSocket.on('connect_error', () => setIsConnected(false));

    newSocket.on('joined', async ({ testId }: { testId: string }) => {
      setIsJoining(false); // ✅ Join tugadi — tugma faollashadi
      setStatus('waiting');
      try {
        const res = await fetch(`${API_URL}/online-tests/${testId}`);
        if (res.ok) setTest(await res.json());
      } catch (e) { console.error(e); }
    });

    newSocket.on('error', (msg: string) => {
      setIsJoining(false); // ✅ Xato bo'lsa ham tugma faollashadi
      toast.error(msg);
      const s = statusRef.current;
      if (s === 'login') setStatus('login');
    });

    newSocket.on('game_started', () => setStatus('active'));

    newSocket.on('new_question', ({ questionIndex }: { questionIndex: number }) => {
      setCurrentQuestionIndex(questionIndex);
      setHasAnswered(false);
    });

    newSocket.on('game_ended', ({ players }: { players: any[] }) => {
      setStatus('finished');
      const sorted = [...players].sort((a, b) => b.score - a.score);
      const myRank = sorted.findIndex(p => p.id === newSocket.id) + 1;
      setRank(myRank || sorted.length);
    });

    return () => { newSocket.disconnect(); };
  }, []);

  // ✅ FIX 5: handleJoin — socketRef (sync), isJoining double-click bloklash,
  // socket ulanmagan bo'lsa connect ni kutib emit qilish
  const handleJoin = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (isJoining) return;

    const trimPin = pin.replace(/\D/g, '').trim();
    const trimName = name.trim();

    if (!trimPin) return toast.error('PIN kodni kiriting');
    if (!trimName) return toast.error('Ismingizni kiriting');
    if (trimPin.length < 4) return toast.error("PIN kod kamida 4 raqam bo'lishi kerak");

    const socket = socketRef.current;
    if (!socket) return toast.error('Socket ulanmagan. Sahifani yangilang.');

    setIsJoining(true);
    joinDataRef.current = { pin: trimPin, name: trimName };

    if (!socket.connected) {
      // Socket hali ulanmagan — connected hodisasini kutib emit
      const toastId = toast.loading('Serverga ulanmoqda...');
      socket.once('connect', () => {
        toast.dismiss(toastId);
        socket.emit('join_room', { pin: trimPin, name: trimName });
      });
      socket.once('connect_error', () => {
        toast.dismiss(toastId);
        toast.error("Server bilan ulanib bo'lmadi. Qayta urinib ko'ring.");
        setIsJoining(false);
        joinDataRef.current = null;
      });
      return;
    }

    socket.emit('join_room', { pin: trimPin, name: trimName });
  }, [pin, name, isJoining]);

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPin(e.target.value.replace(/\D/g, '').slice(0, 6));
  };

  const handleAnswer = (optionIndex: number) => {
    if (hasAnswered || !test) return;
    setHasAnswered(true);
    const question = test.questions[currentQuestionIndex];
    const selectedOption = question.options[optionIndex];
    const isCorrect = isAnswerCorrect(selectedOption, question.correctOption, question.options || []);
    setIsCorrectLast(isCorrect);
    socketRef.current?.emit('submit_answer', {
      pin: joinDataRef.current?.pin || pin,
      isCorrect
    });
    setTimeout(() => {
      if (currentQuestionIndex + 1 < test.questions.length) {
        setCurrentQuestionIndex(prev => prev + 1);
        setHasAnswered(false);
      }
    }, 2500);
  };

  const violationsRef = useRef(0);

  useEffect(() => {
    if (status !== 'active') return;
    const handleViolation = () => {
      violationsRef.current += 1;
      if (violationsRef.current === 1) {
        toast.error("OGOHLANTIRISH: Iltimos, test vaqtida oynani tark etmang! Takrorlansa chetlashtirilasiz.", {
          duration: 6000, position: 'top-center',
          style: { background: '#f59e0b', color: '#fff', border: 'none' }
        });
      } else {
        toast.error("QOIDABUZARLIK! Oynani tark etganingiz sababli chetlashtirildingiz.", {
          duration: 5000, position: 'top-center'
        });
        const socket = socketRef.current;
        if (socket) {
          socket.emit('live_disqualify', { pin: joinDataRef.current?.pin || pin });
          socket.disconnect();
        }
        navigate('/');
      }
    };
    const onVis = () => { if (document.hidden) handleViolation(); };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('blur', handleViolation);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('blur', handleViolation);
    };
  }, [status, navigate]);

  const fadeUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] }
  };

  return (
    <div className="min-h-screen bg-[#fdfdfd] text-[#111111] font-sans selection:bg-black selection:text-white flex flex-col">

      {/* ✅ Connection status indicator — top right */}
      <div className={`fixed top-3 right-3 z-50 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all duration-500 ${
        isConnected
          ? 'bg-green-50 text-green-600 border border-green-200'
          : 'bg-red-50 text-red-500 border border-red-200 animate-pulse'
      }`}>
        {isConnected ? <Wifi size={10} /> : <WifiOff size={10} />}
        {isConnected ? 'Ulangan' : 'Ulanmoqda...'}
      </div>

      <AnimatePresence mode="wait">

        {/* ── LOGIN SCREEN ── */}
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
                  inputMode="numeric"
                  value={pin}
                  onChange={handlePinChange}
                  disabled={isJoining}
                  className="w-full bg-white border border-black/10 px-6 py-4 text-center text-2xl font-mono tracking-widest focus:outline-none focus:border-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  maxLength={6}
                  placeholder="000000"
                  autoFocus
                />
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-gray-500 mb-2 pl-2">Ismingiz</p>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  disabled={isJoining}
                  className="w-full bg-white border border-black/10 px-6 py-4 text-center text-lg focus:outline-none focus:border-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="Ism Familiya"
                  maxLength={40}
                  onKeyDown={e => e.key === 'Enter' && handleJoin(e as any)}
                />
              </div>

              {/* ✅ Tugma — isJoining paytida disabled + spinner ko'rsatiladi */}
              <button
                type="submit"
                disabled={isJoining || !pin.trim() || !name.trim()}
                className="w-full bg-[#111111] text-[#fdfdfd] py-5 mt-4 hover:bg-black transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-3"
              >
                {isJoining ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span className="text-xs uppercase tracking-[0.2em]">Ulanmoqda...</span>
                  </>
                ) : (
                  <span className="text-xs uppercase tracking-[0.2em]">Ulanish</span>
                )}
              </button>
            </form>
          </motion.div>
        )}

        {/* ── WAITING SCREEN ── */}
        {status === 'waiting' && (
          <motion.div
            key="waiting"
            initial="initial" animate="animate" exit="exit" variants={fadeUp}
            className="flex-1 flex flex-col items-center justify-center p-6 text-center"
          >
            <p className="text-xs uppercase tracking-[0.3em] text-gray-500 mb-4">Muvaffaqiyatli ulandi</p>
            <h2 className="text-2xl md:text-4xl font-medium tracking-tight mb-4">
              {joinDataRef.current?.name || name}
            </h2>
            <p className="text-sm text-gray-500 mb-12">O'qituvchi o'yinni boshlagunini kuting...</p>
            <Loader2 className="animate-spin text-gray-400" size={32} />
          </motion.div>
        )}

        {/* ── ACTIVE GAME - QUESTION ── */}
        {status === 'active' && !hasAnswered && test && (
          <motion.div
            key="active"
            initial="initial" animate="animate" exit="exit" variants={fadeUp}
            className="flex-1 flex flex-col w-full mx-auto max-w-[95%] p-4 md:p-6"
          >
            <div className="text-center mb-10 md:mb-12 pt-8 md:pt-12">
              <p className="text-xs uppercase tracking-[0.3em] text-gray-500 mb-4">
                {currentQuestionIndex + 1} / {test.questions.length} — Savol
              </p>
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
                    whileTap={{ scale: 0.97 }}
                    className={`border p-6 md:p-8 text-center text-xl md:text-2xl font-bold rounded-xl transition-all duration-150 flex items-center justify-center w-full h-full min-h-[120px] ${colors[i % 4]}`}
                  >
                    <FormattedText content={opt} />
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ── ACTIVE GAME - ANSWER RESULT ── */}
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
                {currentQuestionIndex + 1 >= (test?.questions?.length || 0)
                  ? 'Test yakunlandi, natijalarni kuting...'
                  : 'Keyingi savolga o\'tilmoqda...'}
              </span>
            </div>
          </motion.div>
        )}

        {/* ── FINISHED SCREEN ── */}
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
              #{rank || '—'}
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
