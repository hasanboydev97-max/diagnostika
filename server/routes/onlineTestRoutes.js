import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import {
  getTests,
  getTestById,
  getTestResults,
  exportToPdf,
  exportToDocx,
  exportToExcel,
  createTest,
  submitTestResult,
  deleteTest,
  getTestResultById,
  generateAITest,
  classAnalysis
} from '../controllers/onlineTestController.js';

const router = express.Router();
const resultsRouter = express.Router();

// --- /api/online-tests ---
router.get('/', authMiddleware, getTests);
router.post('/', authMiddleware, createTest);
router.post('/generate', authMiddleware, generateAITest);

router.get('/:id', getTestById);
router.delete('/:id', authMiddleware, deleteTest);

router.get('/:id/results', authMiddleware, getTestResults);
router.post('/:id/class-analysis', authMiddleware, classAnalysis);

router.get('/:id/export/pdf', authMiddleware, exportToPdf);
router.get('/:id/export/docx', authMiddleware, exportToDocx);
router.get('/:id/export/excel', authMiddleware, exportToExcel);

// --- /api/online-test-results ---
resultsRouter.post('/', submitTestResult);
resultsRouter.get('/:id', getTestResultById);

export { router as onlineTestRoutes, resultsRouter as onlineTestResultRoutes };
