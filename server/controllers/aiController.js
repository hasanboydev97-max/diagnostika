import { GoogleGenerativeAI } from '@google/generative-ai';
import { executeResilientTextGen, executeResilientVisionOCR } from '../services/aiOrchestrator.js';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY;

if (!GEMINI_API_KEY && !GROQ_API_KEY) {
  console.warn(
    '⚠️ [aiController] Hech qanday AI API kaliti topilmadi.\n' +
    '   /api/ai/* endpointlari ishlamaydi. Render/hosting Environment Variables bo\'limini tekshiring.'
  );
}

const GEMINI_VISION_MODELS = [
  "gemini-2.5-flash",
  "gemini-3.5-flash-lite"
];

export const generateText = async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

    if (prompt.length > 10000) {
      return res.status(400).json({ error: 'Prompt juda uzun (max 10000 belgi).' });
    }

    const result = await executeResilientTextGen({
      prompt,
      systemPrompt: 'You are an educational assistant for teachers. Always provide clear, accurate responses.'
    });

    if (result.success && result.questions && result.questions.length > 0) {
      return res.json({ text: JSON.stringify(result.questions) });
    }

    res.json({ text: result.rawText || "Muvaffaqiyatli bajarildi" });
  } catch (error) {
    console.error('[generateText] Xato:', error.message);
    res.status(500).json({ error: error.message });
  }
};

export const generateVision = async (req, res) => {
  try {
    const { prompt, images, requireJson } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt is required' });
    if (!GEMINI_API_KEY) {
      return res.status(503).json({ error: 'Gemini API kaliti sozlanmagan. Admin bilan bog\'laning.' });
    }

    if (prompt.length > 10000) {
      return res.status(400).json({ error: 'Prompt juda uzun (max 10000 belgi).' });
    }

    if (!Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: 'Kamida bitta rasm talab qilinadi.' });
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const imageParts = images.map(img => ({
      inlineData: { data: img.data, mimeType: img.mimeType || 'image/jpeg' }
    }));

    let lastError = "";
    for (const modelName of GEMINI_VISION_MODELS) {
      try {
        const config = requireJson ? { responseMimeType: "application/json" } : {};
        const model = genAI.getGenerativeModel({ model: modelName, generationConfig: config });
        const result = await model.generateContent([prompt, ...imageParts]);
        const text = await result.response.text();
        if (text && text.trim()) {
          return res.json({ text });
        }
      } catch (err) {
        lastError += `[${modelName}]: ${err.message}; `;
      }
    }

    res.status(503).json({ error: `Vision AI vaqtincha mavjud emas: ${lastError}` });
  } catch (error) {
    console.error('[generateVision] Xato:', error.message);
    res.status(500).json({ error: error.message });
  }
};
