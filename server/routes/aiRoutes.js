import express from 'express';
import { generateText, generateVision } from '../controllers/aiController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Using authMiddleware to prevent abuse. 
// However, if students use it for diagnostic summaries, we might need a separate loose route or keep it open with rate limits.
// For now, let's keep it open but rate-limited in index.js, as students don't log in.
router.post('/generate-text', generateText);
router.post('/generate-vision', generateVision);

export default router;
