const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, 'server', 'controllers', 'onlineTestController.js');
let code = fs.readFileSync(p, 'utf-8');

const insertCode = `
export const generateOcrTest = async (req, res) => {
  try {
    const { rawText, questionCount } = req.body;
    if (!rawText) return res.status(400).json({ error: 'rawText is required' });

    const { Teacher } = await import('../models/index.js');
    const teacher = await Teacher.findById(req.teacherId);
    if (!teacher || teacher.plan !== 'premium') {
      return res.status(403).json({ error: 'OCR test generation requires Premium plan' });
    }

    const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    const groqKey = process.env.VITE_GROQ_API_KEY || process.env.GROQ_API_KEY;
    const anthropicKey = process.env.VITE_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;

    if (!apiKey && !groqKey && !anthropicKey) {
      return res.status(500).json({ error: 'API kaliti topilmadi' });
    }

    const targetTotal = questionCount || 10;
    const prompt = \`You are an expert test creator.
Your task is to generate EXACTLY \${targetTotal} multiple-choice questions based on the provided text.
All questions and options MUST be in Uzbek language. 
Extract the most important concepts, facts, or problem-solving steps from the text.
Ensure there are exactly 4 plausible options for each question.
Return ONLY valid JSON. No markdown, no commentary.

TEXT CONTENT TO ANALYZE:
\${rawText.slice(0, 15000)}\`;

    let attempts = [];
    if (anthropicKey) attempts.push({ provider: 'anthropic', model: 'claude-3-5-sonnet-20241022' });
    if (apiKey) attempts.push({ provider: 'gemini', model: 'gemini-1.5-pro' }, { provider: 'gemini', model: 'gemini-1.5-flash' });
    if (groqKey) attempts.push({ provider: 'groq', model: 'llama-3.3-70b-versatile' });

    let rawQuestions = [];
    let success = false;
    let errorMessage = '';

    for (const task of attempts) {
        if (success) break;
        try {
            let resText = '';
            if (task.provider === 'anthropic') {
              const fetchRes = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                  'x-api-key': anthropicKey,
                  'anthropic-version': '2023-06-01',
                  'content-type': 'application/json'
                },
                body: JSON.stringify({
                  model: task.model,
                  max_tokens: 4096,
                  temperature: 0.3,
                  system: 'RETURN ONLY VALID JSON WITH { "questions": [ { "questionNumber": 1, "questionText": "...", "options": ["...","...","...","..."], "correctAnswerIndex": 0 } ] }',
                  messages: [{ role: 'user', content: prompt }]
                })
              });
              if (!fetchRes.ok) throw new Error(await fetchRes.text());
              const json = await fetchRes.json();
              resText = json.content[0].text;
            } else if (task.provider === 'gemini') {
              const { GoogleGenerativeAI } = await import('@google/generative-ai');
              const genAI = new GoogleGenerativeAI(apiKey);
              const modelObj = genAI.getGenerativeModel({ model: task.model });
              const result = await modelObj.generateContent({
                contents: [{ role: 'user', parts: [{ text: prompt + '\\n\\nRETURN ONLY JSON: { "questions": [ { "questionNumber": 1, "questionText": "...", "options": ["...","...","...","..."], "correctAnswerIndex": 0 } ] }' }] }],
                generationConfig: { responseMimeType: 'application/json' }
              });
              resText = result.response.text();
            } else if (task.provider === 'groq') {
              const fetchRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Authorization': \`Bearer \${groqKey}\`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  model: task.model,
                  temperature: 0.3,
                  messages: [{ role: 'user', content: prompt + '\\n\\nRETURN ONLY VALID JSON: { "questions": [ { "questionNumber": 1, "questionText": "...", "options": ["...","...","...","..."], "correctAnswerIndex": 0 } ] }' }],
                  response_format: { type: 'json_object' }
                })
              });
              if (!fetchRes.ok) throw new Error(await fetchRes.text());
              const json = await fetchRes.json();
              resText = json.choices[0].message.content;
            }
            
            // Clean markdown blocks if any
            resText = resText.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
            const startIdx = resText.indexOf('{');
            const endIdx = resText.lastIndexOf('}');
            if(startIdx !== -1 && endIdx !== -1) {
                resText = resText.substring(startIdx, endIdx + 1);
            }

            const data = JSON.parse(resText);
            if (data.questions && Array.isArray(data.questions) && data.questions.length > 0) {
              rawQuestions = data.questions;
              success = true;
            }
        } catch (e) {
            errorMessage = e.message;
            console.error(\`OCR fail \${task.provider}:\`, e.message);
        }
    }

    if (!success) {
      return res.status(500).json({ error: 'AI xatosi: ' + errorMessage });
    }

    const sanitizedQuestions = rawQuestions.slice(0, targetTotal).map(q => {
        let options = q.options;
        if (!Array.isArray(options) || options.length !== 4) {
             options = [options[0]||'A', options[1]||'B', options[2]||'C', options[3]||'D'];
        }
        let correctIdx = q.correctAnswerIndex;
        if (typeof correctIdx !== 'number' || correctIdx < 0 || correctIdx > 3) correctIdx = 0;
        const correctOption = options[correctIdx];
        q.correctOption = correctOption;
        
        // Shuffle for anti-cheat
        const shuffled = [...options];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        q.options = shuffled;
        q.correctAnswerIndex = shuffled.findIndex(opt => opt === correctOption);
        return q;
    });

    res.json({ questions: sanitizedQuestions });
  } catch (error) {
    console.error('OCR Gen Error:', error);
    res.status(500).json({ error: error.message });
  }
};
`;

code = code.replace('export const classAnalysis = async (req, res) => {', insertCode + '\nexport const classAnalysis = async (req, res) => {');
fs.writeFileSync(p, code);
console.log('Successfully inserted generateOcrTest');
