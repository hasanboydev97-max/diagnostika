import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Trophy, Clock, X, Check, Flame, Zap } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface GameRecord {
  _id: string;
  playerName: string;
  score: number;
  createdAt: string;
}

// Vibrant colors for the 4 options
const OPTION_COLORS = [
  { bg: 'bg-[#FF4B4B]', border: 'border-[#CC3C3C]', text: 'text-white', shadow: 'shadow-[0_8px_0_#CC3C3C]' },
  { bg: 'bg-[#3B82F6]', border: 'border-[#2563EB]', text: 'text-white', shadow: 'shadow-[0_8px_0_#2563EB]' },
  { bg: 'bg-[#F59E0B]', border: 'border-[#D97706]', text: 'text-white', shadow: 'shadow-[0_8px_0_#D97706]' },
  { bg: 'bg-[#10B981]', border: 'border-[#059669]', text: 'text-white', shadow: 'shadow-[0_8px_0_#059669]' }
];

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
  const [clickedOption, setClickedOption] = useState<number | null>(null);

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
      
      if (wrongAnswer < 0 && operator !== '-') wrongAnswer = Math.abs(wrongAnswer) + 1;
      
      newOptions.add(wrongAnswer);
    }
    
    setOptions(Array.from(newOptions).sort(() => Math.random() - 0.5));
  };

  const startGame = () => {
    if (!playerName.trim()) {
      toast.error('Ismingizni kiriting!', { style: { background: '#FF4B4B', color: '#fff', border: 'none', borderRadius: '16px', padding: '16px', fontWeight: 'bold' }});
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
    if (feedback !== null) return; // Prevent multiple clicks
    setClickedOption(selectedAnswer);
    
    if (selectedAnswer === currentQuestion.answer) {
      const points = 10 + (combo * 2);
      setScore(prev => prev + points);
      setCombo(prev => prev + 1);
      setFeedback('correct');
      setTimeout(() => {
        setFeedback(null);
        setClickedOption(null);
        generateQuestion();
      }, 400);
    } else {
      setCombo(0);
      setFeedback('wrong');
      setTimeout(() => {
        setFeedback(null);
        setClickedOption(null);
        generateQuestion(); // Move to next question even if wrong, or we could let them retry. Kahoot style moves on.
      }, 600);
    }
  };

  const timerPercentage = (timeLeft / 60) * 100;
  
  return (
    <div className={`min-h-screen relative font-sans overflow-hidden transition-all duration-300 flex flex-col
      ${gameState === 'playing' ? 'bg-[#F0FDF4]' : 'bg-[#F8FAFC]'}`}>
      
      {/* Dynamic Background Pattern */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #334155 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>

      {/* Header */}
      <header className="relative z-20 flex justify-between items-center p-4 md:p-6">
        <button 
          onClick={() => navigate('/games')}
          className="w-14 h-14 bg-white border-b-[4px] border-slate-200 text-slate-700 rounded-2xl flex items-center justify-center hover:bg-slate-50 active:border-b-0 active:translate-y-[4px] transition-all"
        >
          <ArrowLeft className="w-7 h-7" />
        </button>
        {gameState === 'playing' && (
          <div className="flex gap-4">
            <div className="bg-white border-b-[4px] border-slate-200 px-6 py-3 rounded-2xl font-black text-2xl text-slate-700 flex items-center gap-3">
              <Trophy className="w-7 h-7 text-amber-400 fill-amber-400" />
              {score}
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <div className="flex flex-col items-center justify-center flex-1 w-full max-w-5xl mx-auto p-4 relative z-10">
        <AnimatePresence mode="wait">
          
          {/* START SCREEN */}
          {gameState === 'start' && (
            <motion.div 
              key="start"
              initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 1.1 }}
              className="w-full flex flex-col items-center text-center"
            >
              <div className="relative mb-8">
                <motion.div
                  animate={{ y: [0, -15, 0], rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="w-40 h-40 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[2.5rem] shadow-[0_15px_0_#4338ca] flex items-center justify-center"
                >
                  <Zap className="w-24 h-24 text-white fill-white" />
                </motion.div>
                {/* Sparkles */}
                <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity }} className="absolute -top-4 -right-4 text-3xl">✨</motion.div>
                <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity, delay: 1 }} className="absolute -bottom-4 -left-4 text-3xl">⭐</motion.div>
              </div>
              
              <h1 className="text-5xl md:text-7xl font-black text-slate-800 mb-4 tracking-tight drop-shadow-sm">
                Tezkor Hisob
              </h1>
              <p className="text-slate-500 text-lg md:text-xl mb-12 font-bold max-w-md">
                1 daqiqa vaqt. Faqat to'g'ri javoblar. Miya tezligingizni sinab ko'ring!
              </p>
              
              <div className="w-full max-w-md space-y-4">
                <input 
                  type="text" 
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Ismingiz kim?"
                  className="w-full bg-white border-2 border-slate-200 rounded-2xl px-6 py-5 text-2xl font-bold text-center text-slate-800 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 transition-all placeholder:text-slate-300 shadow-sm"
                />
                
                <button 
                  onClick={startGame}
                  className="w-full bg-[#10B981] border-b-[8px] border-[#059669] text-white font-black text-3xl py-6 rounded-2xl active:border-b-0 active:translate-y-[8px] transition-all shadow-lg"
                >
                  BOSHLA!
                </button>
              </div>
            </motion.div>
          )}

          {/* PLAYING SCREEN */}
          {gameState === 'playing' && (
            <motion.div 
              key="playing"
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className="w-full flex flex-col h-full items-center justify-between py-4"
            >
              {/* Timer & Combo Bar */}
              <div className="w-full max-w-2xl mb-8">
                <div className="flex justify-between items-end mb-2 px-2">
                  <div className="font-bold text-slate-500 flex items-center gap-2">
                    <Clock className="w-5 h-5" /> {timeLeft}s
                  </div>
                  <AnimatePresence>
                    {combo >= 2 && (
                      <motion.div 
                        initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}
                        className="text-orange-500 font-black text-xl flex items-center gap-1"
                      >
                        <Flame className="w-6 h-6 fill-orange-500" /> {combo}x COMBO
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <div className="w-full h-4 bg-slate-200 rounded-full overflow-hidden">
                  <motion.div 
                    className={`h-full ${timeLeft > 15 ? 'bg-[#10B981]' : 'bg-[#EF4444]'}`}
                    initial={{ width: '100%' }}
                    animate={{ width: `${timerPercentage}%` }}
                    transition={{ duration: 1, ease: "linear" }}
                  />
                </div>
              </div>

              {/* Question Card */}
              <motion.div 
                animate={feedback === 'wrong' ? { x: [-10, 10, -10, 10, 0] } : {}}
                transition={{ duration: 0.3 }}
                className={`w-full max-w-4xl bg-white rounded-[3rem] p-8 md:p-16 mb-8 flex items-center justify-center border-b-[8px] shadow-sm relative overflow-hidden transition-colors ${
                  feedback === 'correct' ? 'border-[#10B981] bg-[#ECFDF5]' : 
                  feedback === 'wrong' ? 'border-[#EF4444] bg-[#FEF2F2]' : 
                  'border-slate-200'
                }`}
              >
                {/* Large Background Icon for aesthetics */}
                <div className="absolute right-[-10%] top-[-10%] opacity-[0.03] rotate-12 pointer-events-none">
                  <BrainIcon size={400} />
                </div>
                
                <AnimatePresence mode="wait">
                  <motion.div 
                    key={currentQuestion.text}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 1.5, opacity: 0 }}
                    transition={{ type: 'spring', damping: 15 }}
                    className={`text-[5rem] md:text-[8rem] font-black tracking-tighter z-10 ${
                      feedback === 'correct' ? 'text-[#10B981]' : 
                      feedback === 'wrong' ? 'text-[#EF4444]' : 
                      'text-slate-800'
                    }`}
                  >
                    {currentQuestion.text}
                  </motion.div>
                </AnimatePresence>

                {/* Feedback Icons overlay */}
                <AnimatePresence>
                  {feedback === 'correct' && (
                    <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 2, opacity: 0 }} className="absolute text-[#10B981]">
                      <Check className="w-48 h-48" strokeWidth={4} />
                    </motion.div>
                  )}
                  {feedback === 'wrong' && (
                    <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 2, opacity: 0 }} className="absolute text-[#EF4444]">
                      <X className="w-48 h-48" strokeWidth={4} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
              
              {/* Massive Answer Buttons Grid */}
              <div className="grid grid-cols-2 gap-4 md:gap-6 w-full max-w-4xl">
                {options.map((opt, idx) => {
                  const style = OPTION_COLORS[idx % 4];
                  const isClicked = clickedOption === opt;
                  
                  return (
                    <button
                      key={idx}
                      disabled={feedback !== null}
                      onClick={() => handleOptionClick(opt)}
                      className={`
                        w-full py-8 md:py-12 rounded-3xl text-4xl md:text-6xl font-black transition-all transform
                        ${style.bg} ${style.text} ${style.border} border-b-[8px]
                        ${feedback === null ? 'hover:brightness-110 active:border-b-0 active:translate-y-[8px]' : ''}
                        ${isClicked ? 'border-b-0 translate-y-[8px] brightness-110' : ''}
                      `}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* GAME OVER SCREEN */}
          {gameState === 'gameover' && (
            <motion.div 
              key="gameover"
              initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              className="w-full max-w-3xl flex flex-col items-center"
            >
              <div className="bg-white rounded-[3rem] p-10 md:p-14 w-full border-b-[12px] border-slate-200 shadow-xl flex flex-col items-center text-center relative overflow-hidden mb-8">
                
                <h2 className="text-4xl md:text-5xl font-black text-slate-800 mb-2">Vaqt Tugadi!</h2>
                <p className="text-xl font-bold text-slate-500 mb-8 uppercase tracking-widest">Ajoyib o'yin</p>
                
                <div className="w-full bg-[#F8FAFC] border-4 border-slate-100 rounded-[2rem] py-10 mb-8">
                  <div className="text-slate-400 font-bold text-lg mb-2 uppercase">Sizning Natijangiz</div>
                  <div className="text-[6rem] md:text-[8rem] font-black text-amber-500 leading-none drop-shadow-sm flex items-center justify-center gap-4">
                    <Trophy className="w-20 h-20 fill-amber-500" />
                    {score}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 w-full">
                  <button 
                    onClick={startGame}
                    className="flex-1 bg-[#3B82F6] border-b-[8px] border-[#2563EB] text-white font-black text-2xl py-6 rounded-2xl active:border-b-0 active:translate-y-[8px] transition-all shadow-lg flex justify-center items-center gap-3"
                  >
                    QAYTA O'YNASH
                  </button>
                  <button 
                    onClick={() => navigate('/games')}
                    className="flex-1 bg-white border-4 border-slate-200 text-slate-700 font-black text-2xl py-6 rounded-2xl hover:bg-slate-50 active:translate-y-[4px] transition-all"
                  >
                    CHIQISH
                  </button>
                </div>
              </div>

              {/* Leaderboard Table (Kahoot style) */}
              <div className="w-full bg-white rounded-3xl p-6 border-b-[6px] border-slate-200 shadow-md">
                <h3 className="font-black text-2xl text-slate-800 mb-6 flex items-center justify-center gap-3">
                  <Flame className="w-8 h-8 text-orange-500 fill-orange-500" /> TOP REKORDLAR
                </h3>
                <div className="space-y-3">
                  {leaderboard.slice(0, 5).map((record, idx) => {
                    const isMe = record.playerName === playerName && record.score === score;
                    return (
                      <div key={record._id} className={`flex items-center justify-between px-6 py-4 rounded-2xl border-2 ${
                        isMe ? 'bg-amber-50 border-amber-400' : 'bg-slate-50 border-slate-100'
                      }`}>
                        <div className="flex items-center gap-6">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-xl ${
                            idx === 0 ? 'bg-amber-400 text-white shadow-lg' : 
                            idx === 1 ? 'bg-slate-300 text-white shadow-md' : 
                            idx === 2 ? 'bg-amber-700 text-white shadow-md' : 
                            'bg-slate-200 text-slate-500'
                          }`}>
                            {idx + 1}
                          </div>
                          <span className={`font-bold text-2xl uppercase ${isMe ? 'text-amber-600' : 'text-slate-700'}`}>
                            {record.playerName}
                          </span>
                        </div>
                        <span className={`font-black text-3xl ${isMe ? 'text-amber-600' : 'text-slate-800'}`}>
                          {record.score}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// Simple Brain SVG for background decoration
const BrainIcon = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/>
    <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/>
    <path d="M12 5v13"/>
    <path d="M9 13h6"/>
  </svg>
);

export default MathNinja;
