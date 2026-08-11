import express from 'express';
import { register, login, getMe, updateProfile, changePassword } from '../controllers/authController.js';

// We will need authMiddleware, which is currently in server/index.js.
// So we should move authMiddleware to server/middleware/auth.js eventually.
// For now, I will import it from a new file we will create.
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', authMiddleware, getMe);
router.put('/profile', authMiddleware, updateProfile);
router.put('/change-password', authMiddleware, changePassword);

export default router;
