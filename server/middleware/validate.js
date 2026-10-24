/**
 * Zod Validatsiya Middleware — Express route'lar uchun.
 *
 * Ishlatish:
 *   router.post('/login', validate(loginSchema), loginController);
 *
 * Schema xato bo'lsa — 400 qaytaradi, aniq xato xabari bilan.
 * Schema to'g'ri bo'lsa — `req.body` tozalangan, type-safe ma'lumot bilan to'ldiriladi.
 */
import { z } from 'zod';

/**
 * @param {z.ZodSchema} schema
 * @param {'body' | 'query' | 'params'} target
 */
export function validate(schema, target = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      const errors = result.error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      return res.status(400).json({
        error: 'Kiritilgan ma\'lumotlar noto\'g\'ri',
        details: errors,
      });
    }

    // Tozalangan va type-safe ma'lumotni req ga yozamiz
    req[target] = result.data;
    next();
  };
}

// Zod schemalar (server tomonida ishlatiladi)
import { z as zod } from 'zod';

export const serverSchemas = {
  login: zod.object({
    email: zod.string().email().toLowerCase().trim(),
    password: zod.string().min(6).max(128),
  }),

  register: zod.object({
    name: zod.string().min(2).max(100).trim(),
    email: zod.string().email().toLowerCase().trim(),
    password: zod.string().min(6).max(128),
    subject: zod.string().min(1).max(100),
  }),

  changePassword: zod.object({
    currentPassword: zod.string().min(1),
    newPassword: zod.string().min(6).max(128),
  }),

  updatePlan: zod.object({
    teacherId: zod.string().min(1),
    plan: zod.enum(['free', 'standard', 'premium']),
    status: zod.enum(['active', 'pending', 'expired']).default('active'),
    durationDays: zod.number().int().min(1).max(3650).default(30),
  }),

  subscriptionRequest: zod.object({
    requestedPlan: zod.enum(['standard', 'premium']),
    paymentNote: zod.string().max(500).optional().default(''),
  }),

  createTest: zod.object({
    title: zod.string().min(1).max(200).trim(),
    subject: zod.string().max(100).optional(),
    questions: zod.array(zod.object({
      text: zod.string().min(1).max(2000),
      options: zod.array(zod.string()).min(2).max(6),
      correctAnswer: zod.number().int().min(0),
      subject: zod.string().optional(),
      difficulty: zod.enum(['easy', 'medium', 'hard']).optional(),
      points: zod.number().int().min(1).max(10).default(1),
    })).min(1).max(200),
    durationMinutes: zod.number().int().min(1).max(300).optional(),
    isDiagnostic: zod.boolean().optional().default(false),
    grade: zod.string().optional(),
  }),
};
