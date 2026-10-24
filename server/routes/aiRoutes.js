import express from 'express';
import { generateText, generateVision, explainMistake } from '../controllers/aiController.js';

const router = express.Router();

router.post('/generate-text', generateText);
router.post('/generate-vision', generateVision);
router.post('/explain-mistake', explainMistake);

export default router;
