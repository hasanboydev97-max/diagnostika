import mongoose from 'mongoose';

const gameRecordSchema = new mongoose.Schema({
  playerName: {
    type: String,
    required: true,
    trim: true,
  },
  gameId: {
    type: String,
    required: true,
    enum: ['math-ninja', 'word-match', 'fill-blanks'],
  },
  score: {
    type: Number,
    required: true,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Create a compound index for fast leaderboard retrieval
gameRecordSchema.index({ gameId: 1, score: -1 });

export default mongoose.model('GameRecord', gameRecordSchema);
