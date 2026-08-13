import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Trophy, Clock, X, Check, Activity } from 'lucide-react';
import { API_URL } from '../../config';
import { toast } from 'sonner';

interface GameRecord {
  _id: string;
  playerName: string;
  score: number;
  createdAt: string;
}

const MathNinja = () => {
  const navigate = useNavigate();
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover'>('start');
  const [playerName, setPlayerName] = useState('');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [currentQuestion, setCurrentQuestion] = useState({ text: '', answer: 0 });
  const [userAnswer, setUserAnswer] = useState('');
  const [leaderboard, setLeaderboard] = useState<GameRecord[]>([]);
  const [combo, setCombo] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<any>(null);

  // Generate a random math question
  const generateQuestion = () => {
    const operators = ['+', '-', '*'];
    const operator = operators[Math.floor(Math.random() * operators.length)];
    let a, b, answer;

    // Difficulty scales slightly with score
    const maxNum = Math.min(10 + Math.floor(score / 50) * 5, 50);

    if (operator === '+') {
      a = Math.floor(Math.random() * maxNum) + 1;
      b = Math.floor(Math.random() * maxNum) + 1;
      answer = a + b;
    } else if (operator === '-') {
      a = Math.floor(Math.random() * maxNum) + 10;
      b = Math.floor(Math.random() * a); // ensure positive answer
      answer = a - b;
    } else {
      a = Math.floor(Math.random() * 12) + 1;
      b = Math.floor(Math.random() * 12) + 1;
      answer = a * b;
    }

    setCurrentQuestion({ text: `${a} ${operator === '*' ? '×' : operator} ${b}`, answer });
    setUserAnswer('');
    if (inputRef.current) inputRef.current.focus();
  };

  const startGame = () => {
    if (!playerName.trim()) {
      toast.error('Iltimos ismingizni kiriting!');
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
          body: JSON.stringify({
            playerName,
            gameId: 'math-ninja',
            score
          })
        });
        fetchLeaderboard();
      } catch (err) {
        console.error('Failed to submit score');
      }
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch(`${API_URL}/games/leaderboard/math-ninja`);
      if (res.ok) {
        const data = await res.json();
        setLeaderboard(data);
      }
    } catch (err) {
      console.error('Failed to fetch leaderboard');
    }
  };

  useEffect(() => {
    if (gameState === 'start') {
      fetchLeaderboard();
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userAnswer) return;

    const parsedAnswer = parseInt(userAnswer, 10);
    if (parsedAnswer === currentQuestion.answer) {
      // Correct
      const points = 10 + (combo * 2);
      setScore(prev => prev + points);
      setCombo(prev => prev + 1);
      setFeedback('correct');
      setTimeout(() => setFeedback(null), 300);
      generateQuestion();
    } else {
      // Wrong
      setCombo(0);
      setFeedback('wrong');
      setTimeout(() => setFeedback(null), 300);
      setUserAnswer(''); // clear input to try again
    }
  };

  return (
    <div className={`min-h-screen relative font-sans overflow-x-hidden transition-colors duration-300 ${feedback === 'correct' ? 'bg-emerald-50' : feedback === 'wrong' ? 'bg-rose-50' : 'bg-slate-50'}`}>
      {/* Header */}
      <header className="absolute top-0 left-0 w-full p-4 md:p-6 z-20 flex justify-between items-center">
        <button 
          onClick={() => navigate('/games')}
          className="w-10 h-10 bg-white/80 backdrop-blur rounded-full flex items-center justify-center shadow-sm hover:scale-105 transition-transform"
        >
          <ArrowLeft className="w-5 h-5 text-slate-800" />
        </button>
        {gameState === 'playing' && (
          <div className="flex gap-4">
            <div className="bg-white/80 backdrop-blur px-4 py-2 rounded-full font-bold text-slate-800 flex items-center gap-2 shadow-sm">
              <Clock className="w-4 h-4 text-amber-500" />
              00:{timeLeft.toString().padStart(2, '0')}
            </div>
            <div className="bg-white/80 backdrop-blur px-4 py-2 rounded-full font-bold text-slate-800 flex items-center gap-2 shadow-sm">
              <Trophy className="w-4 h-4 text-amber-500" />
              {score} pt
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <AnimatePresence mode="wait">
          {/* START SCREEN */}
          {gameState === 'start' && (
            <motion.div 
              key="start"
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl border border-slate-100"
            >
              <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
                <Activity className="w-10 h-10" />
              </div>
              <h1 className="text-3xl font-bold text-center mb-2">Tezkor Hisob</h1>
              <p className="text-slate-500 text-center text-sm mb-8">60 soniya ichida iloji boricha ko'proq matematik misollarni yeching. Raqobatchilarni ortda qoldiring!</p>
              
              <div className="mb-6">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">O'yinchi ismi</label>
                <input 
                  type="text" 
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Ismingizni kiriting..."
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 text-lg font-medium outline-none focus:border-blue-500 transition-colors"
                  autoFocus
                />
              </div>
              
              <button 
                onClick={startGame}
                className="w-full bg-blue-600 text-white font-bold text-lg py-4 rounded-xl shadow-[0_4px_0_0_#1e3a8a] hover:bg-blue-700 hover:translate-y-[2px] hover:shadow-[0_2px_0_0_#1e3a8a] active:translate-y-[4px] active:shadow-none transition-all"
              >
                BOSHLA
              </button>

              {/* Mini Leaderboard */}
              {leaderboard.length > 0 && (
                <div className="mt-8 pt-8 border-t border-slate-100">
                  <h3 className="font-bold text-slate-800 mb-4 flex items-center justify-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-500" />
                    Top Rekordlar
                  </h3>
                  <div className="space-y-2">
                    {leaderboard.slice(0, 3).map((record, idx) => (
                      <div key={record._id} className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-lg text-sm">
                        <div className="flex items-center gap-3">
                          <span className={`font-bold ${idx === 0 ? 'text-amber-500' : idx === 1 ? 'text-slate-400' : 'text-amber-700'}`}>#{idx + 1}</span>
                          <span className="font-medium truncate max-w-[150px]">{record.playerName}</span>
                        </div>
                        <span className="font-bold">{record.score}</span>
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
              initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-lg flex flex-col items-center"
            >
              {combo > 1 && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  className="mb-4 text-orange-500 font-bold text-xl drop-shadow-sm flex items-center gap-1"
                >
                  🔥 {combo}x COMBO
                </motion.div>
              )}
              
              <motion.div 
                animate={feedback === 'wrong' ? { x: [-10, 10, -10, 10, 0] } : {}}
                transition={{ duration: 0.4 }}
                className={`w-full bg-white rounded-[2rem] p-10 shadow-2xl border-4 ${feedback === 'correct' ? 'border-emerald-400' : feedback === 'wrong' ? 'border-rose-400' : 'border-transparent'}`}
              >
                <div className="text-center font-mono text-6xl md:text-8xl font-black text-slate-800 mb-10 tracking-tighter">
                  {currentQuestion.text}
                </div>
                
                <form onSubmit={handleSubmit}>
                  <input
                    ref={inputRef}
                    type="number"
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    className="w-full text-center bg-slate-100 rounded-2xl text-4xl font-bold py-6 outline-none focus:ring-4 focus:ring-blue-500/20 transition-all"
                    placeholder="?"
                    autoFocus
                  />
                  <button type="submit" className="hidden">Submit</button>
                </form>
              </motion.div>
            </motion.div>
          )}

          {/* GAME OVER SCREEN */}
          {gameState === 'gameover' && (
            <motion.div 
              key="gameover"
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl border border-slate-100 text-center flex flex-col"
            >
              <h1 className="text-4xl font-black text-slate-800 mb-2">Vaqt tugadi!</h1>
              <p className="text-slate-500 mb-6">Sizning natijangiz</p>
              
              <div className="text-7xl font-black text-blue-600 mb-8 drop-shadow-sm">
                {score}
              </div>
              
              <button 
                onClick={startGame}
                className="w-full bg-blue-600 text-white font-bold text-lg py-4 rounded-xl shadow-[0_4px_0_0_#1e3a8a] hover:bg-blue-700 hover:translate-y-[2px] hover:shadow-[0_2px_0_0_#1e3a8a] active:translate-y-[4px] active:shadow-none transition-all mb-4"
              >
                QAYTA O'YNASH
              </button>
              
              <button 
                onClick={() => navigate('/games')}
                className="w-full bg-slate-100 text-slate-700 font-bold text-lg py-4 rounded-xl hover:bg-slate-200 transition-colors"
              >
                O'yinlar Ro'yxatiga Qaytish
              </button>

              <div className="mt-8 pt-6 border-t border-slate-100 text-left h-64 overflow-y-auto custom-scrollbar">
                <h3 className="font-bold text-slate-800 mb-4 sticky top-0 bg-white pb-2 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-500" />
                  Global Reyting (Top 100)
                </h3>
                <div className="space-y-2">
                  {leaderboard.map((record, idx) => (
                    <div key={record._id} className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm ${record.playerName === playerName && record.score === score ? 'bg-blue-50 border border-blue-200' : 'bg-slate-50'}`}>
                      <div className="flex items-center gap-4">
                        <span className={`font-bold w-6 text-center ${idx === 0 ? 'text-amber-500 text-lg' : idx === 1 ? 'text-slate-400 text-base' : idx === 2 ? 'text-amber-700 text-base' : 'text-slate-400'}`}>
                          {idx + 1}
                        </span>
                        <span className="font-medium truncate max-w-[150px] md:max-w-[200px]">{record.playerName}</span>
                      </div>
                      <span className="font-bold">{record.score}</span>
                    </div>
                  ))}
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
