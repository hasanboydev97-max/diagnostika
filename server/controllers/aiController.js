import { GoogleGenerativeAI } from '@google/generative-ai';
import { executeResilientTextGen, executeResilientVisionOCR } from '../services/aiOrchestrator.js';

// BUG #2 & #8 FIX: paid key ham tekshiriladi, GEMINI_VISION_MODELS dead code olib tashlandi
const GEMINI_API_KEY      = process.env.GEMINI_API_KEY      || process.env.VITE_GEMINI_API_KEY;
const GEMINI_PAID_API_KEY = process.env.GEMINI_PAID_API_KEY || process.env.VITE_GEMINI_PAID_API_KEY;
const GROQ_API_KEY        = process.env.GROQ_API_KEY        || process.env.VITE_GROQ_API_KEY;

// Vision uchun: pullik yoki bepul Gemini kaliti yetarli
const hasGeminiKey = !!(GEMINI_PAID_API_KEY || GEMINI_API_KEY);

if (!GEMINI_API_KEY && !GEMINI_PAID_API_KEY && !GROQ_API_KEY) {
  console.warn(
    '⚠️ [aiController] Hech qanday AI API kaliti topilmadi.\n' +
    '   /api/ai/* endpointlari ishlamaydi. Render/hosting Environment Variables bo\'limini tekshiring.'
  );
}


export const generateText = async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

    if (prompt.length > 10000) {
      return res.status(400).json({ error: 'Prompt juda uzun (max 10000 belgi).' });
    }

    const result = await executeResilientTextGen({
      prompt,
      systemPrompt: 'You are an educational assistant for teachers. Always respond with valid JSON only, no markdown, no extra text.'
    });

    if (!result.success) {
      return res.status(503).json({ error: result.error || 'AI xizmati vaqtincha mavjud emas.' });
    }

    return res.json({ text: result.text });
  } catch (error) {
    console.error('[generateText] Xato:', error.message);
    res.status(500).json({ error: error.message });
  }
};


export const generateVision = async (req, res) => {
  try {
    const { prompt, images, requireJson } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt is required' });
    // BUG #2 FIX: pullik yoki bepul kalit bormi tekshir (avval faqat bepul tekshirilardi)
    if (!hasGeminiKey) {
      return res.status(503).json({ error: 'Gemini API kaliti sozlanmagan. Admin bilan bog\'laning.' });
    }

    if (prompt.length > 10000) {
      return res.status(400).json({ error: 'Prompt juda uzun (max 10000 belgi).' });
    }

    if (!Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: 'Kamida bitta rasm talab qilinadi.' });
    }

    // Orchestrator orqali xavfsiz chaqirish (Rate limit, fallback va concurrency queue bilan ishlaydi)
    const result = await executeResilientVisionOCR({
      promptText: prompt,
      imageBase64: images[0].data,
      imageMimeType: images[0].mimeType || 'image/jpeg'
    });

    if (result.success && result.questions && result.questions.length > 0) {
      // requireJson logic is handled inside orchestrator (it always attempts JSON if schema allows)
      // Actually executeResilientVisionOCR returns { success: true, questions }
      return res.json({ text: JSON.stringify(result.questions) });
    }

    res.status(503).json({ error: result.error || "Rasm formatini tahlil qilib bo'lmadi." });
  } catch (error) {
    console.error('[generateVision] Xato:', error.message);
    res.status(500).json({ error: error.message });
  }
};
