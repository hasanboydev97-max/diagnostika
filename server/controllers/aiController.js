import { GoogleGenerativeAI } from '@google/generative-ai';
import { executeResilientTextGen, executeResilientVisionOCR } from '../services/aiOrchestrator.js';

// Vision uchun: pullik yoki bepul Gemini kaliti yetarli (dinamik tekshiruv)
const checkHasGeminiKey = () => !!(
  process.env.GEMINI_PAID_API_KEY ||
  process.env.VITE_GEMINI_PAID_API_KEY ||
  process.env.GEMINI_API_KEY ||
  process.env.VITE_GEMINI_API_KEY
);


export const generateText = async (req, res) => {
  try {
    const { prompt, systemPrompt, isPremium } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

    if (prompt.length > 50000) {
      return res.status(400).json({ error: 'Prompt juda uzun (max 50000 belgi).' });
    }

    const defaultSystemPrompt = 'You are an educational assistant for teachers. Always respond with valid JSON only, no markdown, no extra text.';

    const result = await executeResilientTextGen({
      prompt,
      systemPrompt: systemPrompt || defaultSystemPrompt,
      isPremium: Boolean(isPremium)
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
    // BUG #2 FIX: pullik yoki bepul kalit bormi tekshir (dinamik)
    if (!checkHasGeminiKey()) {
      return res.status(503).json({ error: 'Gemini API kaliti sozlanmagan. Admin bilan bog\'laning.' });
    }

    if (prompt.length > 50000) {
      return res.status(400).json({ error: 'Prompt juda uzun (max 50000 belgi).' });
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

    if (result.success && result.rawData) {
      // requireJson logic is handled inside orchestrator
      return res.json({ text: JSON.stringify(result.rawData) });
    }

    res.status(503).json({ error: result.error || "Rasm formatini tahlil qilib bo'lmadi." });
  } catch (error) {
    console.error('[generateVision] Xato:', error.message);
    res.status(500).json({ error: error.message });
  }
};

export const explainMistake = async (req, res) => {
  try {
    const { questionText, options, studentAnswer, correctAnswer, subject, grade } = req.body;
    if (!questionText) {
      return res.status(400).json({ error: 'Savol matni kiritilishi shart.' });
    }

    const prompt = `
Savol: "${questionText}"
Variantlar: ${JSON.stringify(options || [])}
O'quvchining belgilagan javobi: "${studentAnswer || 'Belgilanmagan'}"
To'g'ri javob: "${correctAnswer || ''}"
Fan: ${subject || 'Umumiy'}
Sinf: ${grade || '5'}-sinf

Quyidagi 3 qismdan iborat tushuntirish ber:
1. 💡 **Xatoning ehtimoliy sababi** (o'quvchi nima uchun chalg'igan bo'lishi mumkin)
2. 📝 **Qadamma-qadam to'g'ri yechim** (formula yoki mantiqiy asos bilan)
3. 🎯 **Eslab qolish uchun maslahat** (o'quvchi kelgusida bu xatoni takrorlamasligi uchun)

Javobni o'quvchiga dalda beruvchi do'stona tilda, tushunarli formatda o'zbek tilida yoz.
`;

    const systemPrompt = 'Sen o\'quvchilarga xatolarini mehribonlik bilan tushuntiruvchi professional pedagogik AI mentorsan. O\'zbek tilida ravon va tushunarli yoz. Kerakli formulalarni $...$ ichida LaTeX formatida ko\'rsat.';

    const result = await executeResilientTextGen({
      prompt,
      systemPrompt,
      isPremium: false
    });

    if (!result.success) {
      return res.status(503).json({ error: result.error || 'AI xizmati vaqtincha mavjud emas.' });
    }

    res.json({ explanation: result.text });
  } catch (error) {
    console.error('[explainMistake] Xato:', error.message);
    res.status(500).json({ error: error.message });
  }
};
