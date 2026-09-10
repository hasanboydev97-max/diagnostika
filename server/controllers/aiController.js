import { GoogleGenerativeAI } from '@google/generative-ai';

// KRITIK-2 FIX: Hardcoded GROQ_API_KEY (String.fromCharCode yashirish) olib tashlandi.
// API kalitlar FAQAT environment variable orqali o'rnatilishi kerak.
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY;

if (!GEMINI_API_KEY && !GROQ_API_KEY) {
  console.warn(
    '⚠️ [aiController] Hech qanday AI API kaliti topilmadi (GEMINI_API_KEY, GROQ_API_KEY).\n' +
    '   /api/ai/* endpointlari ishlamaydi. Render/hosting Environment Variables bo\'limini tekshiring.'
  );
}

const GEMINI_MODELS = [
  "gemini-1.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-pro",
];

const GEMINI_VISION_MODELS = [
  "gemini-2.0-flash",
  "gemini-1.5-flash-latest",
  "gemini-1.5-flash",
  "gemini-1.5-pro"
];

const GROQ_MODELS = [
  "qwen/qwen3.6-27b",
  "groq/compound-mini"
];

async function callGroqAiFallback(prompt) {
  if (!GROQ_API_KEY) throw new Error('GROQ_API_KEY environment variable o\'rnatilmagan.');

  let lastErr = "";
  for (const modelName of GROQ_MODELS) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: modelName,
          messages: [
            {
              role: 'system',
              content: 'You are an expert educational psychologist and high-level test creator for Uzbek schools. Always generate pure, valid JSON output when requested without markdown commentary.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.5,
          max_tokens: 4096
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Groq HTTP ${response.status}: ${errText}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      if (content) {
        return content;
      }
    } catch (err) {
      lastErr = err.message || String(err);
    }
  }
  throw new Error(`Groq AI failed: ${lastErr}`);
}

export const generateText = async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

    // Prompt injection himoyasi: foydalanuvchi kiritgan matn uzunligini cheklash
    if (prompt.length > 10000) {
      return res.status(400).json({ error: 'Prompt juda uzun (max 10000 belgi).' });
    }

    let lastError = "";
    if (GEMINI_API_KEY) {
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      for (const modelName of GEMINI_MODELS) {
        try {
          const model = genAI.getGenerativeModel({
            model: modelName,
            generationConfig: { responseMimeType: "application/json" }
          });
          const result = await model.generateContent(prompt);
          const text = (await result.response).text();
          if (text && text.trim()) {
            return res.json({ text });
          }
        } catch (err) {
          lastError += `[${modelName}]: ${err.message}; `;
        }
      }
    }

    if (!GROQ_API_KEY) {
      return res.status(503).json({
        error: 'AI xizmati vaqtincha mavjud emas. ' + (lastError || 'API kaliti topilmadi.')
      });
    }

    // Fallback to Groq
    const groqResponse = await callGroqAiFallback(prompt);
    res.json({ text: groqResponse });
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

    // Prompt uzunligi cheki
    if (prompt.length > 10000) {
      return res.status(400).json({ error: 'Prompt juda uzun (max 10000 belgi).' });
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

    if (!Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: 'Kamida bitta rasm talab qilinadi.' });
    }

    const imageParts = images.map(img => ({
      inlineData: { data: img.data, mimeType: img.mimeType }
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

    // Fallback without schema
    try {
      const fallbackModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      const promptMod = requireJson ? prompt + "\nMUHIM: FAQAT to'g'ridan-to'g'ri JSON qaytar, markdown bloklarisiz." : prompt;
      const result = await fallbackModel.generateContent([promptMod, ...imageParts]);
      const text = await result.response.text();
      if (text && text.trim()) {
        return res.json({ text });
      }
    } catch (err) {
      lastError += `[Fallback]: ${err.message}; `;
    }

    res.status(503).json({ error: `Vision AI vaqtincha mavjud emas: ${lastError}` });
  } catch (error) {
    console.error('[generateVision] Xato:', error.message);
    res.status(500).json({ error: error.message });
  }
};
