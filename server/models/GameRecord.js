import mongoose from 'mongoose';

const gameRecordSchema = new mongoose.Schema(
  {
    playerName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    gameId: {
      type: String,
      required: true,
      // Open enum — any future game ID is accepted without schema changes
      trim: true,
    },
    score: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
  },
  {
    // Let Mongoose manage createdAt / updatedAt automatically
    timestamps: true,
  }
);

// Compound index: fast leaderboard queries (gameId asc, score desc)
gameRecordSchema.index({ gameId: 1, score: -1 });
// Unique player per game (one record per name+gameId, updated when beaten)
gameRecordSchema.index({ playerName: 1, gameId: 1 }, { unique: true });

export default mongoose.model('GameRecord', gameRecordSchema);
