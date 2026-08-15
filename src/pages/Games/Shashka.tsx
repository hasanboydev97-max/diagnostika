import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Trophy, RefreshCw, Star, Lock, Play, Volume2, VolumeX, Crown } from 'lucide-react';
import { toast } from 'sonner';
import MeshGradient from '../../components/ui/MeshGradient';
import confetti from 'canvas-confetti';
import { gameSound } from '../../utils/gameSound';

const BOARD_SIZE = 8;

export type PieceType = 'empty' | 'player' | 'player_king' | 'ai' | 'ai_king';

export interface Position {
  r: number;
  c: number;
}

export interface Move {
  from: Position;
  to: Position;
  captured?: Position;
}

interface ShashkaStage {
  level: number;
  name: string;
  description: string;
}

const SHASHKA_STAGES: ShashkaStage[] = [
  { level: 1, name: "1-Bosqich: Boshlang'ich Shashkachi", description: "Shashka asoslari va oson raqib" },
  { level: 2, name: "2-Bosqich: Epchil Raqib", description: "Taktik hujumlarni qaytaring" },
  { level: 3, name: "3-Bosqich: Taktik Master", description: "Dama chiqarish va pozitsiyani egallash" },
  { level: 4, name: "4-Bosqich: Professional Shashkachi", description: "Qiyin vaziyatlardan chiqish san'ati" },
  { level: 5, name: "5-Bosqich: SHASHKA GRANDMASTER 👑", description: "Mukammal sun'iy intellektga qarshi jang" }
];

export const Shashka = () => {
  const navigate = useNavigate();
  const [gameState, setGameState] = useState<'stage_select' | 'playing' | 'stage_victory' | 'gameover'>('stage_select');
  const [playerName, setPlayerName] = useState('');
  const [currentStageLevel, setCurrentStageLevel] = useState<number>(1);
  const [unlockedStageLevel, setUnlockedStageLevel] = useState<number>(1);
  const [stageStars, setStageStars] = useState<Record<number, number>>({});

  // 8x8 Board matrix
  const [board, setBoard] = useState<PieceType[][]>([]);
  const [selectedPos, setSelectedPos] = useState<Position | null>(null);
  const [validMoves, setValidMoves] = useState<Move[]>([]);
  const [lastMove, setLastMove] = useState<Move | null>(null);
  const [turn, setTurn] = useState<'player' | 'ai'>('player');
  const [playerCapturedCount, setPlayerCapturedCount] = useState(0);
  const [aiCapturedCount, setAiCapturedCount] = useState(0);
  const [mascotQuote, setMascotQuote] = useState("Oq donalar sizniki! Birinchi yurishni boshlang! ♟️");
  const [isMuted, setIsMuted] = useState(gameSound.getMuted());

  const isAiThinkingRef = useRef(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('hb_shashka_stages');
      if (saved) {
        const parsed = JSON.parse(saved);
        setUnlockedStageLevel(parsed.unlockedStageLevel || 1);
        setStageStars(parsed.stageStars || {});
      }
    } catch (_) {}
  }, []);

  const toggleSound = () => setIsMuted(gameSound.toggleMute());

  // Initialize standard checkers board
  const initBoard = useCallback(() => {
    const newBoard: PieceType[][] = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill('empty'));
    
    // AI pieces on top 3 rows (dark squares only)
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if ((r + c) % 2 === 1) {
          newBoard[r][c] = 'ai';
        }
      }
    }

    // Player pieces on bottom 3 rows (dark squares only)
    for (let r = 5; r < 8; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if ((r + c) % 2 === 1) {
          newBoard[r][c] = 'player';
        }
      }
    }

    setBoard(newBoard);
    setSelectedPos(null);
    setValidMoves([]);
    setLastMove(null);
    setTurn('player');
    setPlayerCapturedCount(0);
    setAiCapturedCount(0);
    isAiThinkingRef.current = false;
  }, []);

  // Calculate available moves for a given position
  const getMovesForPiece = useCallback((b: PieceType[][], r: number, c: number): Move[] => {
    const piece = b[r][c];
    if (piece === 'empty') return [];

    const isPlayer = piece === 'player' || piece === 'player_king';
    const isKing = piece === 'player_king' || piece === 'ai_king';
    const moves: Move[] = [];
    const captures: Move[] = [];

    // Direction vectors: forward for player is (-1), forward for AI is (+1)
    const dirs: [number, number][] = [];
    if (isKing) {
      dirs.push([-1, -1], [-1, 1], [1, -1], [1, 1]);
    } else if (isPlayer) {
      dirs.push([-1, -1], [-1, 1]);
    } else {
      dirs.push([1, -1], [1, 1]);
    }

    const captureDirs: [number, number][] = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

    // 1. Check Captures
    for (const [dr, dc] of captureDirs) {
      const midR = r + dr;
      const midC = c + dc;
      const destR = r + dr * 2;
      const destC = c + dc * 2;

      if (destR >= 0 && destR < BOARD_SIZE && destC >= 0 && destC < BOARD_SIZE) {
        const midPiece = b[midR][midC];
        const destPiece = b[destR][destC];

        if (destPiece === 'empty') {
          const isEnemy = isPlayer
            ? (midPiece === 'ai' || midPiece === 'ai_king')
            : (midPiece === 'player' || midPiece === 'player_king');

          if (isEnemy) {
            captures.push({
              from: { r, c },
              to: { r: destR, c: destC },
              captured: { r: midR, c: midC }
            });
          }
        }
      }
    }

    if (captures.length > 0) {
      return captures;
    }

    // 2. Regular step moves
    for (const [dr, dc] of dirs) {
      const destR = r + dr;
      const destC = c + dc;

      if (destR >= 0 && destR < BOARD_SIZE && destC >= 0 && destC < BOARD_SIZE) {
        if (b[destR][destC] === 'empty') {
          moves.push({
            from: { r, c },
            to: { r: destR, c: destC }
          });
        }
      }
    }

    return moves;
  }, []);

  // Get all valid moves for current side
  const getAllMoves = useCallback((b: PieceType[][], side: 'player' | 'ai'): Move[] => {
    let allMoves: Move[] = [];
    let captureMoves: Move[] = [];

    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const piece = b[r][c];
        const matchSide = side === 'player' ? (piece === 'player' || piece === 'player_king') : (piece === 'ai' || piece === 'ai_king');
        if (matchSide) {
          const moves = getMovesForPiece(b, r, c);
          for (const m of moves) {
            if (m.captured) {
              captureMoves.push(m);
            } else {
              allMoves.push(m);
            }
          }
        }
      }
    }

    return captureMoves.length > 0 ? captureMoves : allMoves;
  }, [getMovesForPiece]);

  // Execute a move on the board
  const executeMove = useCallback((b: PieceType[][], move: Move) => {
    const newBoard = b.map(row => [...row]);
    const { from, to, captured } = move;
    let piece = newBoard[from.r][from.c];

    newBoard[from.r][from.c] = 'empty';

    // Check promotion to King (Dama)
    if (piece === 'player' && to.r === 0) {
      piece = 'player_king';
      gameSound.playVictory();
      setMascotQuote("OFARIN! DAMA CHIQARILDINGIZ! 👑");
    } else if (piece === 'ai' && to.r === BOARD_SIZE - 1) {
      piece = 'ai_king';
    }

    newBoard[to.r][to.c] = piece;

    if (captured) {
      newBoard[captured.r][captured.c] = 'empty';
      gameSound.playCorrect();
    } else {
      gameSound.playTick();
    }

    setLastMove(move);
    return newBoard;
  }, []);

  const handleStageVictory = useCallback(() => {
    gameSound.playVictory();
    confetti({ particleCount: 140, spread: 90, origin: { y: 0.5 } });

    const earnedStars = 3;
    const nextUnlocked = Math.max(unlockedStageLevel, Math.min(5, currentStageLevel + 1));
    const newStageStars = { ...stageStars, [currentStageLevel]: Math.max(stageStars[currentStageLevel] || 0, earnedStars) };

    setUnlockedStageLevel(nextUnlocked);
    setStageStars(newStageStars);

    try {
      localStorage.setItem('hb_shashka_stages', JSON.stringify({
        unlockedStageLevel: nextUnlocked,
        stageStars: newStageStars
      }));
    } catch (_) {}

    setGameState('stage_victory');
  }, [currentStageLevel, unlockedStageLevel, stageStars]);

  const handleGameover = useCallback(() => {
    gameSound.playWrong();
    setGameState('gameover');
  }, []);

  // Snappy AI Move engine (280ms response time)
  const performAiMove = useCallback((currentB: PieceType[][]) => {
    if (isAiThinkingRef.current) return;
    isAiThinkingRef.current = true;

    setTimeout(() => {
      const aiMoves = getAllMoves(currentB, 'ai');

      if (aiMoves.length === 0) {
        isAiThinkingRef.current = false;
        handleStageVictory();
        return;
      }

      let chosenMove = aiMoves[0];
      const captureMoves = aiMoves.filter(m => m.captured);

      if (captureMoves.length > 0) {
        chosenMove = captureMoves[Math.floor(Math.random() * captureMoves.length)];
      } else {
        const scoredMoves = aiMoves.map(m => {
          let score = 0;
          if (m.to.r === BOARD_SIZE - 1) score += 50;
          if (m.to.c >= 2 && m.to.c <= 5) score += 10;
          return { move: m, score };
        });

        scoredMoves.sort((a, b) => b.score - a.score);
        chosenMove = scoredMoves[0].move;
      }

      const nextBoard = executeMove(currentB, chosenMove);
      if (chosenMove.captured) {
        setAiCapturedCount(prev => prev + 1);
      }

      setBoard(nextBoard);
      setTurn('player');
      setSelectedPos(null);
      setValidMoves([]);
      isAiThinkingRef.current = false;

      // Update mascot quote after AI move
      if (chosenMove.captured) {
        setMascotQuote("Raqib donangizni urib oldi! Diqqatli bo'ling!");
      } else {
        setMascotQuote("Sizning navbatingiz! Oq donalardan birini tanlang ♟️");
      }

      // Check if Player has any moves left
      const playerMoves = getAllMoves(nextBoard, 'player');
      if (playerMoves.length === 0) {
        handleGameover();
      }
    }, 280);
  }, [getAllMoves, executeMove, handleStageVictory, handleGameover]);

  const startStage = (lvl: number) => {
    if (!playerName.trim()) {
      toast.error('Ismingizni kiriting!');
      return;
    }
    setCurrentStageLevel(lvl);
    initBoard();
    setGameState('playing');
    setMascotQuote("Oq donalar sizniki! Qani, g'alabali yurishni boshlang! ♟️");
  };

  // Player clicks a square on the board
  const handleSquareClick = (r: number, c: number) => {
    if (turn !== 'player' || isAiThinkingRef.current || gameState !== 'playing') return;

    const piece = board[r][c];
    const isPlayerPiece = piece === 'player' || piece === 'player_king';

    // If clicking on one of the highlighted target move squares
    const matchedMove = validMoves.find(m => m.to.r === r && m.to.c === c);
    if (matchedMove) {
      const nextBoard = executeMove(board, matchedMove);
      if (matchedMove.captured) {
        setPlayerCapturedCount(prev => prev + 1);
      }

      setBoard(nextBoard);
      setSelectedPos(null);
      setValidMoves([]);
      setTurn('ai');
      setMascotQuote("Ajoyib yurish! Raqib javob qaytarmoqda... ⏳");

      // Check if AI has any pieces left
      const aiPiecesCount = nextBoard.flat().filter(p => p === 'ai' || p === 'ai_king').length;
      if (aiPiecesCount === 0) {
        handleStageVictory();
        return;
      }

      performAiMove(nextBoard);
      return;
    }

    // If clicking own player piece, highlight its valid moves
    if (isPlayerPiece) {
      const moves = getMovesForPiece(board, r, c);
      setSelectedPos({ r, c });
      setValidMoves(moves);
      if (moves.length > 0) {
        setMascotQuote("Yashil nuqtaga bosib, donani suring! ✨");
      } else {
        setMascotQuote("Bu donaning yurish yo'li to'silgan. Boshqasini tanlang!");
      }
    } else {
      setSelectedPos(null);
      setValidMoves([]);
    }
  };

  return (
    <div className="min-h-screen text-slate-800 flex flex-col font-sans selection:bg-amber-500 selection:text-white relative overflow-hidden bg-gradient-to-br from-[#FFFDF9] via-[#F8FAFC] to-[#EFF6FF]">
      <MeshGradient />

      {/* Header */}
      <header className="relative z-20 flex justify-between items-center px-4 md:px-8 py-3.5 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl shadow-xs">
        <button
          onClick={() => navigate('/games')}
          className="h-10 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/90 rounded-2xl flex items-center gap-2 transition-all font-bold text-xs uppercase tracking-wider shadow-xs cursor-pointer active:scale-95"
        >
          <ArrowLeft className="w-4 h-4 text-slate-600" />
          <span>PORTAL</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleSound}
            className="w-10 h-10 bg-slate-100 hover:bg-slate-200 border border-slate-200/90 rounded-2xl flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95"
          >
            {isMuted ? <VolumeX className="w-4.5 h-4.5 text-rose-500" /> : <Volume2 className="w-4.5 h-4.5 text-amber-600" />}
          </button>
          {gameState === 'playing' && (
            <div className="bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 px-4 py-2 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-sm border border-amber-300">
              <Trophy className="w-4 h-4 fill-slate-950" />
              <span>{playerCapturedCount * 20} BALL</span>
            </div>
          )}
        </div>
      </header>

      {/* Main Area */}
      <div className="flex flex-col items-center justify-center flex-1 w-full max-w-4xl mx-auto p-4 md:p-6 relative z-10">
        <AnimatePresence mode="wait">
          {/* Stage Select Screen */}
          {gameState === 'stage_select' && (
            <motion.div key="stage_select"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.04 }}
              className="w-full max-w-2xl bg-white/95 backdrop-blur-2xl border-2 border-amber-100/90 rounded-3xl p-6 md:p-10 shadow-2xl shadow-amber-100/60 font-sans"
            >
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-gradient-to-tr from-amber-400 to-yellow-500 rounded-3xl flex items-center justify-center mx-auto mb-3.5 shadow-lg shadow-amber-400/25 text-4xl border-2 border-white">
                  ♟️
                </div>
                <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 mb-1.5">Interaktiv Shashka Arenasi</h1>
                <p className="text-xs text-slate-500 font-medium max-w-md mx-auto">Sun'iy intellektga qarshi jonli shashka o'ynang, damalar chiqaring va g'alaba qozoning!</p>
              </div>

              <div className="mb-8 max-w-md mx-auto">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">O'quvchi Ismi:</label>
                <input
                  type="text"
                  value={playerName}
                  onChange={e => setPlayerName(e.target.value)}
                  placeholder="Ismingizni kiriting..."
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold text-slate-900 outline-none placeholder:text-slate-400 focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-100 transition-all shadow-inner"
                />
              </div>

              <div className="space-y-3.5 mb-6">
                {SHASHKA_STAGES.map((stage) => {
                  const isUnlocked = stage.level <= unlockedStageLevel;
                  const stars = stageStars[stage.level] || 0;

                  return (
                    <div key={stage.level} className={`p-4.5 rounded-2xl border-2 transition-all flex items-center justify-between gap-4 ${isUnlocked ? 'bg-gradient-to-r from-amber-50/60 to-orange-50/60 border-amber-200/90 shadow-sm hover:shadow-md hover:border-amber-300' : 'bg-slate-50/80 border-slate-200/80 opacity-60'}`}>
                      <div className="flex items-center gap-3.5">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg ${isUnlocked ? 'bg-gradient-to-tr from-amber-400 to-yellow-500 text-slate-950 shadow-md shadow-amber-400/25' : 'bg-slate-200 text-slate-400'}`}>
                          {isUnlocked ? stage.level : <Lock className="w-5 h-5" />}
                        </div>
                        <div>
                          <h3 className="font-extrabold text-sm text-slate-900">{stage.name}</h3>
                          <p className="text-xs text-slate-500 mt-0.5">{stage.description}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {isUnlocked && (
                          <div className="flex gap-1 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs">
                            {[1, 2, 3].map(starIdx => (
                              <Star key={starIdx} className={`w-4 h-4 ${starIdx <= stars ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-200'}`} />
                            ))}
                          </div>
                        )}
                        <button
                          disabled={!isUnlocked}
                          onClick={() => startStage(stage.level)}
                          className={`px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 border-b-4 ${isUnlocked ? 'bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-700 active:border-b-0 active:translate-y-1 cursor-pointer shadow-md shadow-emerald-500/20' : 'bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed'}`}
                        >
                          <Play className="w-3.5 h-3.5 fill-white" /> O'ynash
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Interactive Checkers Playing Arena */}
          {gameState === 'playing' && (
            <motion.div key="playing" className="w-full flex flex-col items-center justify-between max-w-xl">
              {/* Mascot Bubble */}
              <div className="w-full flex items-center gap-3 mb-4 bg-white/95 backdrop-blur-xl border border-amber-100 p-3 rounded-2xl shadow-sm">
                <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 1.5 }} className="w-11 h-11 bg-gradient-to-tr from-amber-400 to-yellow-500 rounded-2xl flex items-center justify-center text-xl shadow-md border-2 border-white">
                  ♟️
                </motion.div>
                <div className="bg-amber-50/80 border border-amber-200/70 px-4 py-2 rounded-xl text-xs font-bold text-amber-900 flex-1">
                  {mascotQuote}
                </div>
              </div>

              {/* Status Header */}
              <div className="w-full bg-white/95 backdrop-blur-xl border-2 border-amber-100 rounded-2xl p-3.5 flex justify-between items-center shadow-md mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-slate-900 border-2 border-white shadow-xs" />
                  <span className="text-xs font-bold text-slate-700">Raqib (AI): {12 - playerCapturedCount} dona</span>
                </div>

                {/* Animated Turn Badge */}
                <div>
                  {turn === 'player' ? (
                    <span className="text-xs font-black uppercase text-emerald-800 bg-emerald-50 px-3.5 py-1.5 rounded-xl border-2 border-emerald-300 shadow-xs flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> SIZNING NAVBATINGIZ
                    </span>
                  ) : (
                    <span className="text-xs font-black uppercase text-amber-900 bg-amber-50 px-3.5 py-1.5 rounded-xl border-2 border-amber-300 shadow-xs flex items-center gap-1.5 animate-pulse">
                      <span className="w-2 h-2 rounded-full bg-amber-500" /> RAQIB YURMOQDA...
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-white border-2 border-amber-400 shadow-xs" />
                  <span className="text-xs font-bold text-slate-700">Siz (Oq): {12 - aiCapturedCount} dona</span>
                </div>
              </div>

              {/* 8x8 Wooden Checkers Board */}
              <div className="w-full aspect-square max-w-md bg-amber-950 border-6 border-amber-950 rounded-3xl p-2.5 shadow-2xl grid grid-cols-8 grid-rows-8 gap-0.5">
                {board.map((row, r) =>
                  row.map((piece, c) => {
                    const isDark = (r + c) % 2 === 1;
                    const isSelected = selectedPos?.r === r && selectedPos?.c === c;
                    const isValidTarget = validMoves.some(m => m.to.r === r && m.to.c === c);
                    const isLastMovedSquare = lastMove && (lastMove.to.r === r && lastMove.to.c === c);

                    return (
                      <div
                        key={`${r}-${c}`}
                        onClick={() => handleSquareClick(r, c)}
                        className={`relative flex items-center justify-center rounded-md cursor-pointer transition-colors ${
                          isDark ? 'bg-[#78350f]' : 'bg-[#fef3c7]'
                        } ${isSelected ? 'ring-3 ring-amber-400' : isLastMovedSquare ? 'ring-2 ring-amber-300/80' : ''}`}
                      >
                        {/* Highlight dot for valid moves */}
                        {isValidTarget && (
                          <div className="w-4 h-4 bg-emerald-400 rounded-full animate-ping z-20 shadow-lg border-2 border-white" />
                        )}

                        {/* Pieces */}
                        {piece !== 'empty' && (
                          <motion.div
                            whileHover={{ scale: 1.08 }}
                            whileTap={{ scale: 0.95 }}
                            className={`w-9/12 h-9/12 rounded-full flex items-center justify-center font-black text-sm relative shadow-md border-3 transition-transform ${
                              piece === 'player' || piece === 'player_king'
                                ? 'bg-gradient-to-tr from-slate-50 to-white text-slate-900 border-amber-300 shadow-amber-300/30'
                                : 'bg-gradient-to-tr from-slate-900 to-slate-800 text-white border-slate-700 shadow-slate-950/50'
                            }`}
                          >
                            {/* King Crown */}
                            {(piece === 'player_king' || piece === 'ai_king') && (
                              <Crown className={`w-4 h-4 ${piece === 'player_king' ? 'text-amber-500 fill-amber-400' : 'text-yellow-300 fill-yellow-300'}`} />
                            )}
                          </motion.div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          )}

          {/* Victory Modal */}
          {gameState === 'stage_victory' && (
            <motion.div key="stage_victory" className="w-full max-w-md bg-white/98 backdrop-blur-2xl border-4 border-amber-400 rounded-3xl p-8 shadow-2xl flex flex-col items-center text-center font-sans">
              <div className="w-22 h-22 bg-gradient-to-tr from-amber-400 to-yellow-500 rounded-3xl flex items-center justify-center text-5xl mb-3 shadow-lg shadow-amber-400/30 border-2 border-white">
                🏆
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-1">SHASHKA G'ALABASI!</h2>
              <p className="text-xs text-slate-500 mb-5 font-bold">Raqib donalari to'liq zabt etildi!</p>

              <div className="flex gap-2 mb-5 bg-amber-50/80 px-6 py-3 rounded-2xl border border-amber-200">
                {[1, 2, 3].map(starIdx => (
                  <Star key={starIdx} className="w-8 h-8 text-amber-400 fill-amber-400 animate-bounce" />
                ))}
              </div>

              <div className="flex flex-col gap-2.5 w-full">
                {currentStageLevel < 5 && (
                  <button onClick={() => startStage(currentStageLevel + 1)} className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black text-xs uppercase py-3.5 rounded-2xl shadow-md border-b-4 border-emerald-700 cursor-pointer active:translate-y-1">
                    KEYINGI BOSQICH ➔
                  </button>
                )}
                <button onClick={() => setGameState('stage_select')} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase py-3.5 rounded-2xl border border-slate-200 cursor-pointer">
                  Bosqichlar Xaritasi
                </button>
              </div>
            </motion.div>
          )}

          {/* Gameover Modal */}
          {gameState === 'gameover' && (
            <motion.div key="gameover" className="w-full max-w-md bg-white/98 backdrop-blur-2xl border-4 border-rose-400 rounded-3xl p-8 shadow-2xl flex flex-col items-center text-center font-sans">
              <div className="w-20 h-20 bg-rose-50 border-2 border-rose-300 text-rose-500 rounded-3xl flex items-center justify-center text-4xl mb-3">💔</div>
              <h2 className="text-2xl font-black text-slate-900 mb-1">Bu Safar Raqib Yutdi!</h2>
              <p className="text-xs text-slate-500 mb-6">Yana bir bor yangi taktika bilan sinab ko'ring!</p>
              <div className="flex flex-col gap-2.5 w-full">
                <button onClick={() => startStage(currentStageLevel)} className="w-full bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs uppercase py-3.5 rounded-2xl border-b-4 border-amber-600 cursor-pointer flex items-center justify-center gap-2 active:translate-y-1">
                  <RefreshCw className="w-4 h-4" /> Qayta Urinish
                </button>
                <button onClick={() => setGameState('stage_select')} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase py-3.5 rounded-2xl border border-slate-200 cursor-pointer">
                  Bosqichlar Xaritasi
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Shashka;
