import GameRecord from '../models/GameRecord.js';

// @desc    Submit a new game score
// @route   POST /api/games/score
// @access  Public (or protected if we want, but kids play it so public is fine)
export const submitScore = async (req, res) => {
  try {
    const { playerName, gameId, score } = req.body;

    if (!playerName || !gameId || score === undefined) {
      return res.status(400).json({ message: 'Barcha maydonlarni to\\'ldiring' });
    }

    // Check if player already has a higher score for this game
    const existingRecord = await GameRecord.findOne({ playerName, gameId });

    if (existingRecord) {
      if (score > existingRecord.score) {
        existingRecord.score = score;
        await existingRecord.save();
        return res.status(200).json({ message: 'Yangi rekord o\\'rnatildi!', record: existingRecord });
      } else {
        return res.status(200).json({ message: 'Natija saqlandi, lekin oldingi rekordingiz balandroq.', record: existingRecord });
      }
    } else {
      const newRecord = await GameRecord.create({
        playerName,
        gameId,
        score
      });
      return res.status(201).json({ message: 'Natija saqlandi', record: newRecord });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
};

// @desc    Get leaderboard for a specific game
// @route   GET /api/games/leaderboard/:gameId
// @access  Public
export const getLeaderboard = async (req, res) => {
  try {
    const { gameId } = req.params;
    
    // Get top 100 players
    const leaderboard = await GameRecord.find({ gameId })
      .sort({ score: -1 })
      .limit(100)
      .select('playerName score createdAt');

    res.status(200).json(leaderboard);
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
};
