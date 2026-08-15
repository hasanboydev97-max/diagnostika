// ── Chess.com Daily Puzzle API Service ────────────────────────────────────
// Real-time daily chess puzzles for critical thinking & tactics

export interface ChessPuzzleData {
  title: string;
  url: string;
  fen: string;
  pgn: string;
  image: string;
}

export async function fetchDailyChessPuzzle(): Promise<ChessPuzzleData> {
  try {
    const res = await fetch('https://api.chess.com/pub/puzzle');
    if (!res.ok) throw new Error('Chess.com API response failed');

    const data = await res.json();
    return {
      title: data.title || "Bugungi Taktik Masala",
      url: data.url || "https://www.chess.com/daily-puzzle",
      fen: data.fen || "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4",
      pgn: data.pgn || "",
      image: data.image || "https://images.chesscomfiles.com/uploads/v1/puzzle/1.png",
    };
  } catch (error) {
    console.warn('[ChessPuzzleService] Fetch failed, returning fallback:', error);
    return {
      title: "Matematik & Shaxmat Taktikasi",
      url: "https://www.chess.com/daily-puzzle",
      fen: "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4",
      pgn: "",
      image: "https://images.chesscomfiles.com/uploads/v1/puzzle/1.png",
    };
  }
}
