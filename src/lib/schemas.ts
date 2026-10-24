/**
 * Zod Schemas — Backend va Frontend o'rtasida umumiy validatsiya.
 *
 * Senior pattern: "Parse, don't validate"
 * - Input schema: foydalanuvchi kiritgan ma'lumotni tekshirish
 * - Output schema: API javobini tekshirish
 *
 * Bu fayllar istalsa shared/ papkaga o'tkazilib, server va client
 * ikkala tomonda ham ishlatilishi mumkin.
 */

import { z } from 'zod';

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const loginSchema = z.object({
  email: z.string().email('Yaroqli email kiriting').toLowerCase().trim(),
  password: z.string().min(6, 'Parol kamida 6 ta belgi'),
});

export const registerSchema = z.object({
  name: z.string().min(2, 'Ism kamida 2 ta belgi').max(100).trim(),
  email: z.string().email('Yaroqli email kiriting').toLowerCase().trim(),
  password: z.string().min(6, 'Parol kamida 6 ta belgi').max(128),
  subject: z.string().min(1, 'Fan turini kiriting').max(100),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Joriy parolni kiriting'),
  newPassword: z.string().min(6, 'Yangi parol kamida 6 ta belgi').max(128),
});

// ─── Online Test ──────────────────────────────────────────────────────────────
export const questionSchema = z.object({
  text: z.string().min(1).max(2000),
  options: z.array(z.string().min(1)).min(2).max(6),
  correctAnswer: z.number().int().min(0),
  subject: z.string().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  points: z.number().int().min(1).max(10).default(1),
});

export const createTestSchema = z.object({
  title: z.string().min(1, 'Test nomini kiriting').max(200).trim(),
  subject: z.string().max(100).optional(),
  questions: z.array(questionSchema).min(1, 'Kamida 1 ta savol kerak').max(200),
  durationMinutes: z.number().int().min(1).max(300).optional(),
  isDiagnostic: z.boolean().optional().default(false),
  grade: z.string().optional(),
});

// ─── Admin ────────────────────────────────────────────────────────────────────
export const updatePlanSchema = z.object({
  teacherId: z.string().min(1),
  plan: z.enum(['free', 'standard', 'premium']),
  status: z.enum(['active', 'pending', 'expired']).default('active'),
  durationDays: z.number().int().min(1).max(3650).default(30),
});

// ─── Subscription ─────────────────────────────────────────────────────────────
export const subscriptionRequestSchema = z.object({
  requestedPlan: z.enum(['standard', 'premium']),
  paymentNote: z.string().max(500).optional().default(''),
});

// ─── TypeScript Types (schemalardan avtomatik generatsiya) ────────────────────
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type QuestionInput = z.infer<typeof questionSchema>;
export type CreateTestInput = z.infer<typeof createTestSchema>;
export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;
