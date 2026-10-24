import express from 'express';
import { register, login, getMe, updateProfile, changePassword, forgotPassword, resetPassword } from '../controllers/authController.js';
import { authMiddleware, checkPlanExpiry } from '../middleware/auth.js';
import { validate, serverSchemas } from '../middleware/validate.js';

const router = express.Router();

// Validatsiya middleware har bir route'ga qo'shildi
router.post('/register', validate(serverSchemas.register), register);
router.post('/login', validate(serverSchemas.login), login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

router.get('/me', authMiddleware, checkPlanExpiry, getMe);
router.put('/profile', authMiddleware, updateProfile);
router.put('/change-password', authMiddleware, validate(serverSchemas.changePassword), changePassword);

export default router;
