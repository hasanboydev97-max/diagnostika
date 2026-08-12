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
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [isWaitingForOpponent, setIsWaitingForOpponent] = useState(false);
  const [disqualificationMsg, setDisqualificationMsg] = useState<string | null>(null);
  const [disqualifiedName, setDisqualifiedName] = useState<string | null>(null);

  // Refs to avoid stale closures in socket listener
  const pinRef = useRef(pin);
  pinRef.current = pin;
  const nameRef = useRef(name);
  nameRef.current = name;
  const isCreatorRef = useRef(isCreator);
  isCreatorRef.current = isCreator;
  const statusRef = useRef(status);
  statusRef.current = status;
  const socketRef = useRef(socket);
  socketRef.current = socket;
  const isWaitingForOpponentRef = useRef(isWaitingForOpponent);
  isWaitingForOpponentRef.current = isWaitingForOpponent;

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
      // Clear location state so refresh doesn't recreate the duel
      navigate(location.pathname + location.search, { replace: true, state: {} });
    } else {
      const urlPin = new URLSearchParams(location.search).get('pin');
      const saved = localStorage.getItem('duel_state');
      let p = null;
      try { if (saved) p = JSON.parse(saved); } catch(e){}
      
      if (p && p.pin && p.name && p.status === 'lobby' && (!urlPin || urlPin === p.pin)) {
        setPin(p.pin);
        setName(p.name);
        setIsCreator(p.isCreator);
        setStatus('lobby');
        // Update refs immediately for the connect event
        pinRef.current = p.pin;
        nameRef.current = p.name;
        isCreatorRef.current = p.isCreator;
        statusRef.current = 'lobby';
      } else {
        if (urlPin && urlPin !== p?.pin) {
          setPin(urlPin);
        }
        setStatus('login');
      }
    }

    newSocket.on('error', (msg) => {
      toast.error(msg);
      if (statusRef.current === 'lobby') setStatus('login');
    });

    newSocket.on('duel_created', ({ pin, testId }) => {
      setPin(pin);
      setStatus('lobby');
      fetchTest(testId);
    });

    newSocket.on('duel_ready', ({ player1, player2, testId: newTestId }) => {
      if (!isCreatorRef.current) {
        setPin(pinRef.current);
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

    newSocket.on('duel_ended', ({ player1, player2, disqualifiedPlayer }) => {
      setP1(player1);
      setP2(player2);
      if (disqualifiedPlayer) {
        setDisqualifiedName(disqualifiedPlayer);
        if (disqualifiedPlayer === nameRef.current) {
          setDisqualificationMsg("Siz qoidabuzarlik qilganingiz (oynani tark etganingiz) sababli chetlashtirildingiz va mag'lub bo'ldingiz.");
        } else {
          setDisqualificationMsg(`Raqibingiz (${disqualifiedPlayer}) qoidabuzarlik qilgani (oynani tark etgani) sababli chetlashtirildi. Siz g'olib bo'ldingiz!`);
        }
      }
      setStatus('finished');
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  // Save to localStorage when in lobby to allow rejoining on refresh
  useEffect(() => {
    if (status === 'lobby') {
      localStorage.setItem('duel_state', JSON.stringify({ pin, name, isCreator, status }));
    } else if (status === 'finished' || status === 'login') {
      localStorage.removeItem('duel_state');
    }
  }, [pin, name, isCreator, status]);

  const fetchTest = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/online-tests/${id}`);
      if (res.ok) setTest(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const violationsRef = useRef(0);

  // Proctoring: strict rules in active duel
  useEffect(() => {
    if (status !== 'active' || isWaitingForOpponent) return;

    const handleDuelViolation = () => {
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
        if (socketRef.current) {
          socketRef.current.emit('duel_disqualify', { pin: pinRef.current, name: nameRef.current });
        }
      }
    };

    const onVisibilityChange = () => {
      if (document.hidden) handleDuelViolation();
    };

    const onWindowBlur = () => {
      handleDuelViolation();
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('blur', onWindowBlur);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('blur', onWindowBlur);
    };
  }, [status, isWaitingForOpponent]);

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
    setSelectedOptionIndex(optionIndex);
    
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
        setIsWaitingForOpponent(true);
        socket?.emit('duel_finish', { pin });
      } else {
        setCurrentQIndex(prev => prev + 1);
        setHasAnsweredCurrent(false);
        setSelectedOptionIndex(null);
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
            className="flex-1 flex flex-col w-full mx-auto max-w-[95%] py-8 px-4 md:px-6"
          >
            {/* Progress Header */}
            <div className="grid grid-cols-2 gap-12 border-b border-black/10 pb-8 mb-12">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-[0.2em]">{p1?.name}</span>
                  <span className="text-xs font-mono">{p1?.currentQuestion || 0}/{test.questions.length} savol | {p1?.score} pt</span>
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
                  <span className="text-xs uppercase tracking-[0.2em]">{p2?.name || 'Raqib'}</span>
                  <span className="text-xs font-mono">{p2?.currentQuestion || 0}/{test.questions.length} savol | {p2?.score || 0} pt</span>
                </div>
                <div className="h-1 bg-black/5 w-full">
                  <div 
                    className="h-full bg-black transition-all duration-500"
                    style={{ width: `${((p2?.currentQuestion || 0) / test.questions.length) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {isWaitingForOpponent ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
                <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mb-6">
                  <Loader2 className="animate-spin text-amber-600" size={32} />
                </div>
                <h3 className="text-2xl font-semibold mb-2">Siz barcha savollarga javob berdingiz!</h3>
                <p className="text-sm text-zinc-500 max-w-md mb-8">
                  Raqibingiz testni yakunlashini kuting. O'yin yakunlangach, natijalar e'lon qilinadi.
                </p>
                <div className="flex items-center gap-6 bg-zinc-50 border border-black/5 rounded-2xl p-6">
                  <div className="text-left">
                    <p className="text-xs uppercase text-zinc-400 font-medium">Sizning ballingiz</p>
                    <p className="text-lg font-bold font-mono">{(isCreator ? p1?.score : p2?.score) ?? myScore} / {test.questions.length}</p>
                  </div>
                  <div className="w-[1px] h-8 bg-zinc-200" />
                  <div className="text-left">
                    <p className="text-xs uppercase text-zinc-400 font-medium">Raqibingiz</p>
                    <p className="text-lg font-bold font-mono">{(isCreator ? p2?.name : p1?.name) || 'Raqib'}: {(isCreator ? p2?.score : p1?.score) ?? 0} / {test.questions.length}</p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Question */}
                <div className="mb-10 md:mb-12">
                  <p className="text-xs uppercase tracking-[0.3em] text-gray-500 mb-4 text-center">Savol {currentQIndex + 1}</p>
                  <h2 className="text-xl md:text-2xl font-sans font-medium leading-relaxed text-center max-w-4xl mx-auto">
                    <FormattedText content={test.questions[currentQIndex]?.questionText} />
                  </h2>
                </div>
                
                {/* Options */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mt-auto flex-1 w-full auto-rows-fr pb-4 md:pb-8">
                  {test.questions[currentQIndex]?.options.map((opt: string, i: number) => {
                    const isCorrect = opt === test.questions[currentQIndex]?.correctOption;
                    const isSelected = selectedOptionIndex === i;
                    
                    let btnClass = "border p-6 md:p-8 text-center text-xl md:text-2xl font-bold rounded-xl transition-all duration-150 flex items-center justify-center w-full h-full min-h-[120px] ";
                    
                    if (hasAnsweredCurrent) {
                      if (isCorrect) {
                        btnClass += "bg-emerald-500 border-emerald-600 text-white shadow-[0_4px_0_0_#047857]";
                      } else if (isSelected) {
                        btnClass += "bg-rose-500 border-rose-600 text-white shadow-[0_4px_0_0_#be123c]";
                      } else {
                        btnClass += "opacity-30 border-black/5 bg-gray-50 text-gray-400 shadow-none";
                      }
                    } else {
                      const colors = [
                        'bg-[#e21b3c] border-[#b0132c] text-white shadow-[0_8px_0_0_#b0132c,0_15px_20px_rgba(0,0,0,0.2),inset_0_2px_0_rgba(255,255,255,0.3)] hover:bg-[#eb2b4c] hover:-translate-y-1 hover:shadow-[0_12px_0_0_#b0132c,0_20px_25px_rgba(0,0,0,0.2),inset_0_2px_0_rgba(255,255,255,0.3)] active:translate-y-[8px] active:shadow-[0_0px_0_0_#b0132c,0_0px_0px_rgba(0,0,0,0.2)]',
                        'bg-[#1368ce] border-[#0e4e9a] text-white shadow-[0_8px_0_0_#0e4e9a,0_15px_20px_rgba(0,0,0,0.2),inset_0_2px_0_rgba(255,255,255,0.3)] hover:bg-[#1f7ae5] hover:-translate-y-1 hover:shadow-[0_12px_0_0_#0e4e9a,0_20px_25px_rgba(0,0,0,0.2),inset_0_2px_0_rgba(255,255,255,0.3)] active:translate-y-[8px] active:shadow-[0_0px_0_0_#0e4e9a,0_0px_0px_rgba(0,0,0,0.2)]',
                        'bg-[#d89e00] border-[#a57a00] text-white shadow-[0_8px_0_0_#a57a00,0_15px_20px_rgba(0,0,0,0.2),inset_0_2px_0_rgba(255,255,255,0.3)] hover:bg-[#ebaf0a] hover:-translate-y-1 hover:shadow-[0_12px_0_0_#a57a00,0_20px_25px_rgba(0,0,0,0.2),inset_0_2px_0_rgba(255,255,255,0.3)] active:translate-y-[8px] active:shadow-[0_0px_0_0_#a57a00,0_0px_0px_rgba(0,0,0,0.2)]',
                        'bg-[#26890c] border-[#1b6308] text-white shadow-[0_8px_0_0_#1b6308,0_15px_20px_rgba(0,0,0,0.2),inset_0_2px_0_rgba(255,255,255,0.3)] hover:bg-[#32a215] hover:-translate-y-1 hover:shadow-[0_12px_0_0_#1b6308,0_20px_25px_rgba(0,0,0,0.2),inset_0_2px_0_rgba(255,255,255,0.3)] active:translate-y-[8px] active:shadow-[0_0px_0_0_#1b6308,0_0px_0px_rgba(0,0,0,0.2)]'
                      ];
                      btnClass += colors[i % 4];
                    }

                    return (
                      <motion.button
                        key={i}
                        onClick={() => handleAnswer(i)}
                        disabled={hasAnsweredCurrent}
                        className={btnClass}
                      >
                        <FormattedText content={opt} />
                      </motion.button>
                    );
                  })}
                </div>
              </>
            )}
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
            <h1 className="text-4xl md:text-6xl font-medium tracking-tight mb-10">Jang yakunlandi</h1>
            
            {disqualificationMsg && (
              <div className="mb-10 p-4 bg-rose-50 border border-rose-200 rounded-2xl max-w-xl mx-auto flex items-center gap-3">
                <span className="text-xl">⚠️</span>
                <p className="text-sm font-semibold text-rose-800 text-left">{disqualificationMsg}</p>
              </div>
            )}
            
            <div className="flex items-end justify-center gap-4 md:gap-16 border-b border-black/10 pb-0 w-full max-w-2xl h-72 mb-16">
              {(() => {
                const isP1Disq = disqualifiedName === p1.name;
                const isP2Disq = disqualifiedName === p2.name;
                const p1Rank = isP1Disq ? 2 : (isP2Disq ? 1 : (p1.score > p2.score ? 1 : p1.score < p2.score ? 2 : 1));
                const p2Rank = isP2Disq ? 2 : (isP1Disq ? 1 : (p2.score > p1.score ? 1 : p2.score < p1.score ? 2 : 1));

                return (
                  <>
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: p1Rank === 1 ? '100%' : '70%', opacity: 1 }}
                      transition={{ duration: 1, delay: 0.4 }}
                      className={`flex-1 flex flex-col items-center border-t border-l border-r rounded-t-3xl pt-8 relative overflow-hidden ${p1Rank === 2 ? 'bg-gradient-to-t from-zinc-200 to-zinc-50 border-zinc-200 shadow-[inset_0_2px_15px_rgba(255,255,255,1)] text-zinc-900' : 'bg-gradient-to-t from-amber-200 to-amber-50 border-amber-200 shadow-[inset_0_2px_15px_rgba(255,255,255,1)] text-amber-950'}`}
                    >
                      <span className={`text-lg md:text-2xl font-medium mb-1 truncate w-full text-center px-2 ${p1Rank === 1 ? 'text-amber-950' : 'text-zinc-900'}`}>{p1.name}</span>
                      <span className={`text-sm font-mono mb-auto ${p1Rank === 1 ? 'text-amber-700' : 'text-zinc-600'} ${isP1Disq ? 'line-through opacity-50' : ''}`}>{p1.score} pt</span>
                      <span className={`text-6xl font-bold mb-8 relative z-10 ${p1Rank === 1 ? 'text-amber-700/80' : 'text-zinc-500/80'}`}>
                        {p1Rank}
                      </span>
                    </motion.div>

                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: p2Rank === 1 ? '100%' : '70%', opacity: 1 }}
                      transition={{ duration: 1, delay: 0.6 }}
                      className={`flex-1 flex flex-col items-center border-t border-l border-r rounded-t-3xl pt-8 relative overflow-hidden ${p2Rank === 2 ? 'bg-gradient-to-t from-zinc-200 to-zinc-50 border-zinc-200 shadow-[inset_0_2px_15px_rgba(255,255,255,1)] text-zinc-900' : 'bg-gradient-to-t from-amber-200 to-amber-50 border-amber-200 shadow-[inset_0_2px_15px_rgba(255,255,255,1)] text-amber-950'}`}
                    >
                      <span className={`text-lg md:text-2xl font-medium mb-1 truncate w-full text-center px-2 ${p2Rank === 1 ? 'text-amber-950' : 'text-zinc-900'}`}>{p2.name}</span>
                      <span className={`text-sm font-mono mb-auto ${p2Rank === 1 ? 'text-amber-700' : 'text-zinc-600'} ${isP2Disq ? 'line-through opacity-50' : ''}`}>{p2.score} pt</span>
                      <span className={`text-6xl font-bold mb-8 relative z-10 ${p2Rank === 1 ? 'text-amber-700/80' : 'text-zinc-500/80'}`}>
                        {p2Rank}
                      </span>
                    </motion.div>
                  </>
                );
              })()}
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
