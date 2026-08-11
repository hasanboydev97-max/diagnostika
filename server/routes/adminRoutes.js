import express from 'express';
import { 
  getSubscriptions, 
  updateSubscriptionPlan, 
  getStats, 
  getTeachers, 
  getTests, 
  getResults 
} from '../controllers/adminController.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Apply auth and admin middleware to all routes in this file
router.use(authMiddleware, adminMiddleware);

router.get('/subscriptions', getSubscriptions);
router.post('/subscriptions/update-plan', updateSubscriptionPlan);

router.get('/stats', getStats);
router.get('/teachers', getTeachers);
router.get('/tests', getTests);
router.get('/results', getResults);

export default router;
