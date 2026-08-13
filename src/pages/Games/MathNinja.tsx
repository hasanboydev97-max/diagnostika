import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Trophy, Zap, Target, Flame } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface GameRecord {
  _id: string;
  playerName: string;
  score: number;
  createdAt: string;
}

// Background Particles
const FloatingSymbols = () => {
  const symbols = ['+', '-', '×', '÷', '=', '∞', '%'];
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute text-white font-black text-4xl md:text-6xl select-none"
          initial={{ 
            x: Math.random() * window.innerWidth, 
            y: window.innerHeight + 100,
            opacity: 0.1 + Math.random() * 0.3,
            rotate: 0
          }}
          animate={{ 
            y: -100,
            rotate: 360,
            x: `calc(${Math.random() * 100}vw)`
          }}
          transition={{ 
            duration: 10 + Math.random() * 20, 
            repeat: Infinity,
            ease: "linear",
            delay: Math.random() * -20 // random start time
          }}
        >
          {symbols[Math.floor(Math.random() * symbols.length)]}
        </motion.div>
      ))}
    </div>
  );
};

const MathNinja = () => {
  const navigate = useNavigate();
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover'>('start');
  const [playerName, setPlayerName] = useState('');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [currentQuestion, setCurrentQuestion] = useState({ text: '', answer: 0 });
  const [options, setOptions] = useState<number[]>([]);
  const [leaderboard, setLeaderboard] = useState<GameRecord[]>([]);
  const [combo, setCombo] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);

  const timerRef = useRef<any>(null);

  const generateQuestion = () => {
    const operators = ['+', '-', '×'];
    const operator = operators[Math.floor(Math.random() * operators.length)];
    let a, b, answer;

    const maxNum = Math.min(10 + Math.floor(score / 50) * 5, 50);

    if (operator === '+') {
      a = Math.floor(Math.random() * maxNum) + 1;
      b = Math.floor(Math.random() * maxNum) + 1;
      answer = a + b;
    } else if (operator === '-') {
      a = Math.floor(Math.random() * maxNum) + 10;
      b = Math.floor(Math.random() * a); 
      answer = a - b;
    } else {
      a = Math.floor(Math.random() * 12) + 1;
      b = Math.floor(Math.random() * 12) + 1;
      answer = a * b;
    }

    setCurrentQuestion({ text: `${a} ${operator} ${b}`, answer });
    
    // Generate 3 plausible wrong answers
    const newOptions = new Set<number>();
    newOptions.add(answer);
    
    while (newOptions.size < 4) {
      let offset = Math.floor(Math.random() * 20) - 10;
      if (offset === 0) offset = 1;
      let wrongAnswer = answer + offset;
      
      // Avoid negative answers unless it's subtraction
      if (wrongAnswer < 0 && operator !== '-') wrongAnswer = Math.abs(wrongAnswer) + 1;
      
      newOptions.add(wrongAnswer);
    }
    
    // Shuffle options
    setOptions(Array.from(newOptions).sort(() => Math.random() - 0.5));
  };

  const startGame = () => {
    if (!playerName.trim()) {
      toast.error('Jangchini ismini kiriting!', { style: { background: '#000', color: '#fff', border: '1px solid #333' }});
      return;
    }
    setScore(0);
    setCombo(0);
    setTimeLeft(60);
    setGameState('playing');
    generateQuestion();
    
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          endGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const endGame = async () => {
    setGameState('gameover');
    fetchLeaderboard();
    
    if (score > 0) {
      try {
        await fetch(`${API_URL}/games/score`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerName, gameId: 'math-ninja', score })
        });
        fetchLeaderboard();
      } catch (err) {}
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch(`${API_URL}/games/leaderboard/math-ninja`);
      if (res.ok) {
        const data = await res.json();
        setLeaderboard(data);
      }
    } catch (err) {}
  };

  useEffect(() => {
    if (gameState === 'start') fetchLeaderboard();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gameState]);

  const handleOptionClick = (selectedAnswer: number) => {
    if (selectedAnswer === currentQuestion.answer) {
      const points = 10 + (combo * 2);
      setScore(prev => prev + points);
      setCombo(prev => prev + 1);
      setFeedback('correct');
      setTimeout(() => setFeedback(null), 150);
      generateQuestion();
    } else {
      setCombo(0);
      setFeedback('wrong');
      setTimeout(() => setFeedback(null), 300);
    }
  };

  // Dynamic calculations for visuals
  const isOnFire = combo >= 5;
  const timerPercentage = (timeLeft / 60) * 100;
  const timerColor = timeLeft > 30 ? 'bg-emerald-500' : timeLeft > 10 ? 'bg-amber-500' : 'bg-rose-500';

  return (
    <div className={`min-h-screen relative font-sans overflow-hidden transition-colors duration-300 flex flex-col ${
      feedback === 'correct' ? 'bg-emerald-950' : 
      feedback === 'wrong' ? 'bg-rose-950' : 
      isOnFire ? 'bg-[#1a0b00]' : 'bg-[#050505]'
    }`}>
      <FloatingSymbols />
      
      {/* Dynamic Timer Bar (Top edge) */}
      {gameState === 'playing' && (
        <div className="absolute top-0 left-0 w-full h-2 bg-neutral-900 z-50">
          <motion.div 
            className={`h-full ${timerColor} shadow-[0_0_15px_rgba(255,255,255,0.5)]`}
            initial={{ width: '100%' }}
            animate={{ width: `${timerPercentage}%` }}
            transition={{ duration: 1, ease: "linear" }}
          />
        </div>
      )}

      {/* Header */}
      <header className="absolute top-0 left-0 w-full p-6 z-20 flex justify-between items-center mt-2">
        <button 
          onClick={() => navigate('/games')}
          className="w-12 h-12 bg-white/5 border border-white/10 text-white rounded-full flex items-center justify-center hover:bg-white/10 hover:scale-105 transition-all backdrop-blur-md"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        {gameState === 'playing' && (
          <div className="flex gap-4">
            <div className="bg-white/5 border border-white/10 backdrop-blur-md px-6 py-3 rounded-full font-mono text-xl font-bold text-white flex items-center gap-3 shadow-[0_0_20px_rgba(0,0,0,0.5)]">
              <Trophy className={`w-5 h-5 ${isOnFire ? 'text-orange-500' : 'text-amber-400'}`} />
              <motion.span
                key={score}
                initial={{ scale: 1.5, color: '#4ade80' }}
                animate={{ scale: 1, color: '#ffffff' }}
                className="inline-block"
              >
                {score}
              </motion.span>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <div className="flex flex-col items-center justify-center flex-1 w-full p-4 relative z-10">
        <AnimatePresence mode="wait">
          
          {/* START SCREEN */}
          {gameState === 'start' && (
            <motion.div 
              key="start"
              initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
              className="w-full max-w-md bg-neutral-900/80 backdrop-blur-xl rounded-3xl p-8 border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col items-center relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600"></div>
              
              <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-3xl flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(99,102,241,0.4)] rotate-3">
                <Zap className="w-12 h-12" fill="currentColor" />
              </div>
              
              <h1 className="text-4xl font-black text-white text-center mb-2 tracking-tight">MATH NINJA</h1>
              <p className="text-neutral-400 text-center text-sm mb-8 font-medium">
                60 soniya. Faqat to'g'ri javoblar. <br/> Eng kuchli miya sohibi kimligini isbotlang!
              </p>
              
              <div className="w-full mb-8">
                <input 
                  type="text" 
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value.toUpperCase())}
                  placeholder="TAXALLUS KIRITING..."
                  className="w-full bg-black/50 border-2 border-white/10 rounded-2xl px-6 py-4 text-xl font-black text-white text-center tracking-widest outline-none focus:border-indigo-500 transition-colors uppercase placeholder:text-neutral-700"
                  autoFocus
                />
              </div>
              
              <button 
                onClick={startGame}
                className="w-full bg-white text-black font-black text-xl py-5 rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-transform shadow-[0_0_30px_rgba(255,255,255,0.2)]"
              >
                JANGNI BOSHLA
              </button>

              {/* Leaderboard Preview */}
              {leaderboard.length > 0 && (
                <div className="w-full mt-8 pt-6 border-t border-white/5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-neutral-300 text-sm uppercase tracking-widest flex items-center gap-2">
                      <Target className="w-4 h-4 text-rose-500" />
                      Elita (Top 3)
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {leaderboard.slice(0, 3).map((record, idx) => (
                      <div key={record._id} className="flex items-center justify-between bg-black/40 px-4 py-3 rounded-xl border border-white/5">
                        <div className="flex items-center gap-4">
                          <span className={`font-black text-lg ${idx === 0 ? 'text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]' : idx === 1 ? 'text-neutral-300' : 'text-amber-700'}`}>#{idx + 1}</span>
                          <span className="font-bold text-white tracking-wide">{record.playerName}</span>
                        </div>
                        <span className="font-mono font-bold text-indigo-400">{record.score}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* PLAYING SCREEN */}
          {gameState === 'playing' && (
            <motion.div 
              key="playing"
              initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-4xl flex flex-col items-center justify-center flex-1 h-full pb-10"
            >
              <div className="h-20 flex items-end justify-center mb-4">
                <AnimatePresence>
                  {combo >= 3 && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20, scale: 0.5 }} 
                      animate={{ opacity: 1, y: 0, scale: 1 }} 
                      exit={{ opacity: 0, scale: 1.5, filter: 'blur(10px)' }}
                      className="text-orange-500 font-black text-3xl md:text-5xl flex items-center gap-2 drop-shadow-[0_0_30px_rgba(249,115,22,0.8)]"
                    >
                      <Flame className="w-10 h-10 md:w-12 md:h-12" fill="currentColor" /> 
                      {combo}x COMBO
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              
              <motion.div 
                animate={feedback === 'wrong' ? { x: [-15, 15, -15, 15, 0] } : {}}
                transition={{ duration: 0.3 }}
                className={`w-full relative flex flex-col items-center justify-center flex-1`}
              >
                {/* Glow behind the text */}
                <div className={`absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] aspect-square rounded-full blur-3xl opacity-20 pointer-events-none ${isOnFire ? 'bg-orange-500' : 'bg-indigo-500'}`}></div>

                {/* Question */}
                <div className="relative z-10 text-center font-mono text-[4rem] md:text-[8rem] font-black text-white mb-16 tracking-tighter drop-shadow-2xl flex justify-center items-center gap-4 whitespace-nowrap">
                  <motion.span 
                    key={currentQuestion.text}
                    initial={{ y: -50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ type: 'spring', damping: 12 }}
                  >
                    {currentQuestion.text} = ?
                  </motion.span>
                </div>
                
                {/* Multiple Choice Options */}
                <div className="grid grid-cols-2 gap-4 md:gap-6 w-full max-w-3xl px-4 relative z-20 mt-auto md:mt-0">
                  {options.map((opt, idx) => (
                    <motion.button
                      key={`${currentQuestion.text}-${idx}`}
                      initial={{ opacity: 0, y: 50 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05, type: 'spring', damping: 15 }}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleOptionClick(opt)}
                      className={`
                        w-full py-6 md:py-8 rounded-3xl text-4xl md:text-5xl font-black font-mono tracking-widest transition-all
                        border-2 backdrop-blur-xl shadow-lg
                        ${isOnFire 
                          ? 'bg-orange-500/10 border-orange-500/30 text-orange-100 hover:bg-orange-500/30 hover:border-orange-400 hover:shadow-[0_0_30px_rgba(249,115,22,0.4)]'
                          : 'bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-indigo-400 hover:shadow-[0_0_30px_rgba(99,102,241,0.4)]'
                        }
                      `}
                    >
                      {opt}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* GAME OVER SCREEN */}
          {gameState === 'gameover' && (
            <motion.div 
              key="gameover"
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-2xl bg-neutral-900/80 backdrop-blur-xl rounded-[3rem] p-8 md:p-12 border border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.8)] text-center relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/40 via-transparent to-transparent"></div>
              
              <div className="relative z-10">
                <h1 className="text-5xl font-black text-white mb-2 uppercase tracking-widest">Natija</h1>
                <p className="text-indigo-300 font-medium tracking-widest uppercase mb-10">Jang Yakunlandi</p>
                
                <div className="text-[8rem] leading-none font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-neutral-500 mb-12 drop-shadow-2xl">
                  {score}
                </div>
                
                <div className="flex flex-col md:flex-row gap-4 justify-center mb-12">
                  <button 
                    onClick={startGame}
                    className="bg-white text-black font-black px-10 py-5 rounded-2xl hover:scale-105 active:scale-95 transition-all uppercase tracking-widest flex items-center justify-center gap-2"
                  >
                    <Zap className="w-6 h-6 fill-black" />
                    Qayta O'ynash
                  </button>
                  <button 
                    onClick={() => navigate('/games')}
                    className="bg-white/10 text-white font-bold px-10 py-5 rounded-2xl hover:bg-white/20 transition-all uppercase tracking-widest border border-white/10"
                  >
                    Chiqish
                  </button>
                </div>

                <div className="text-left bg-black/50 rounded-3xl p-6 border border-white/5">
                  <h3 className="font-black text-white text-xl mb-6 flex items-center gap-3">
                    <Trophy className="w-6 h-6 text-amber-500" />
                    GLOBAL REYTING
                  </h3>
                  <div className="space-y-3 h-64 overflow-y-auto custom-scrollbar pr-2">
                    {leaderboard.map((record, idx) => {
                      const isMe = record.playerName === playerName && record.score === score;
                      return (
                        <div key={record._id} className={`flex items-center justify-between px-6 py-4 rounded-2xl transition-all ${isMe ? 'bg-indigo-600 border border-indigo-400 scale-[1.02] shadow-[0_0_30px_rgba(79,70,229,0.5)] z-10 relative' : 'bg-white/5 border border-white/5'}`}>
                          <div className="flex items-center gap-4">
                            <span className={`font-black w-8 text-xl ${idx === 0 ? 'text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.8)]' : idx === 1 ? 'text-neutral-300' : idx === 2 ? 'text-amber-700' : 'text-neutral-600'}`}>
                              #{idx + 1}
                            </span>
                            <span className={`font-bold tracking-wider uppercase ${isMe ? 'text-white' : 'text-neutral-300'}`}>{record.playerName}</span>
                          </div>
                          <span className={`font-black text-xl ${isMe ? 'text-white' : 'text-indigo-400'}`}>{record.score}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default MathNinja;
