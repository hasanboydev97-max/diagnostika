import express from 'express';
import { submitScore, getLeaderboard } from '../controllers/gamesController.js';

const router = express.Router();

router.post('/score', submitScore);
router.get('/leaderboard/:gameId', getLeaderboard);

export default router;
