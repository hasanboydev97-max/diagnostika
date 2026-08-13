import GameRecord from '../models/GameRecord.js';

// ─── POST /api/games/score ─────────────────────────────────────────────────
// Submit a score. Uses findOneAndUpdate with upsert so a player's personal
// best is always stored as a single document — no duplicates possible even
// under race conditions.
export const submitScore = async (req, res) => {
  try {
    const { playerName, gameId, score } = req.body;

    // Input validation
    if (!playerName || typeof playerName !== 'string' || !playerName.trim()) {
      return res.status(400).json({ message: 'playerName kiritilmagan' });
    }
    if (!gameId || typeof gameId !== 'string' || !gameId.trim()) {
      return res.status(400).json({ message: 'gameId kiritilmagan' });
    }
    if (score === undefined || score === null || typeof score !== 'number' || score < 0) {
      return res.status(400).json({ message: 'score noto\'g\'ri' });
    }

    const name = playerName.trim().toUpperCase();
    const gid  = gameId.trim();

    // Atomic upsert: create if not exists, update only if new score is higher.
    // $max operator guarantees we never overwrite a higher existing score.
    const record = await GameRecord.findOneAndUpdate(
      { playerName: name, gameId: gid },
      {
        $max: { score },
        $setOnInsert: { playerName: name, gameId: gid },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
        runValidators: true,
      }
    );

    const isNewRecord = record.score === score;
    return res.status(200).json({
      message: isNewRecord ? 'Yangi rekord o\'rnatildi!' : 'Natija saqlandi.',
      record,
    });

  } catch (error) {
    // Duplicate key on upsert is a race condition — harmless, just re-fetch
    if (error.code === 11000) {
      const { playerName, gameId } = req.body;
      const existing = await GameRecord.findOne({
        playerName: playerName?.trim().toUpperCase(),
        gameId: gameId?.trim(),
      });
      return res.status(200).json({ message: 'Natija saqlandi.', record: existing });
    }
    console.error('[Games] submitScore error:', error);
    return res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
};

// ─── GET /api/games/leaderboard/:gameId ───────────────────────────────────
// Return top 100 players for the given game, sorted by score desc.
export const getLeaderboard = async (req, res) => {
  try {
    const { gameId } = req.params;

    if (!gameId || !gameId.trim()) {
      return res.status(400).json({ message: 'gameId kiritilmagan' });
    }

    const leaderboard = await GameRecord
      .find({ gameId: gameId.trim() })
      .sort({ score: -1 })
      .limit(100)
      .select('playerName score createdAt updatedAt');

    return res.status(200).json(leaderboard);
  } catch (error) {
    console.error('[Games] getLeaderboard error:', error);
    return res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
};
