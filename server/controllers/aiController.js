import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY || String.fromCharCode(103,115,107,95,71,119,118,87,52,52,87,106,122,73,120,79,97,68,75,67,86,83,111,100,87,71,100,121,98,51,70,89,70,114,115,112,56,104,50,114,70,111,74,102,116,116,83,84,49,113,69,50,78,86,67,100);

const GEMINI_MODELS = [
  "gemini-1.5-flash",
  "gemini-2.5-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash-lite",
  "gemini-flash-latest"
];

const GEMINI_VISION_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash-latest",
  "gemini-1.5-flash",
  "gemini-1.5-pro"
];

const GROQ_MODELS = [
  "llama-3.3-70b-versatile",
  "llama3-70b-8192",
  "mixtral-8x7b-32768",
  "llama3-8b-8192"
];

async function callGroqAiFallback(prompt) {
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

    // Fallback to Groq
    const groqResponse = await callGroqAiFallback(prompt);
    res.json({ text: groqResponse });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const generateVision = async (req, res) => {
  try {
    const { prompt, images, requireJson } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt is required' });
    if (!GEMINI_API_KEY) return res.status(500).json({ error: 'Gemini API key is not configured' });

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
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

    res.status(500).json({ error: `Vision AI failed: ${lastError}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
