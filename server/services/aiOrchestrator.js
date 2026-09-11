import { GoogleGenerativeAI } from '@google/generative-ai';
import pLimit from 'p-limit';

// Concurrency queue: prevents overwhelming AI APIs when 20+ teachers create tests simultaneously
// 15 parallel — 50-100 foydalanuvchida navbat qotib qolmasligi uchun (Global Rate Limit himoyasi)
const requestQueue = pLimit(15);

// Circuit breaker / dynamic health tracking for agents
const agentHealth = new Map();

function isAgentHealthy(agentId) {
  const health = agentHealth.get(agentId);
  if (!health) return true;
  if (health.cooldownUntil && Date.now() < health.cooldownUntil) {
    return false; // currently in cooldown
  }
  return true;
}

function markAgentFailure(agentId, reason = '') {
  const isRateLimit = reason.includes('429') || reason.includes('rate') || reason.includes('quota') || reason.includes('exhausted');
  const isOverloaded = reason.includes('503') || reason.includes('overloaded') || reason.includes('demand');
  
  const cooldownMs = isRateLimit ? 30000 : (isOverloaded ? 15000 : 5000);
  agentHealth.set(agentId, {
    cooldownUntil: Date.now() + cooldownMs,
    lastError: reason,
    failedAt: Date.now()
  });
  console.warn(`⚠️ [AI Orchestrator] Agent "${agentId}" ${cooldownMs / 1000}s ga sovutish rejimiga olindi (${reason.substring(0, 60)})`);
}

function markAgentSuccess(agentId) {
  agentHealth.delete(agentId);
}

/**
 * 20-Year Senior Architecture: Multi-Agent Fallback Registry
 * 10 verified production-ready AI agents across 3 major AI platforms:
 * 1. Google Gemini (2 models)
 * 2. Anthropic Claude (3 models)
 * 3. Groq LPUs (5 models)
 */
function getAgentCatalog(keys) {
  const { geminiKey, anthropicKey, groqKey } = keys;
  const agents = [];

  // --- 1. Anthropic Claude Agents ---
  if (anthropicKey) {
    agents.push(
      { id: 'anthropic-haiku-4-5', provider: 'anthropic', model: 'claude-haiku-4-5', tier: 'elite-speed', priority: 1 },
      { id: 'anthropic-sonnet-4-5', provider: 'anthropic', model: 'claude-sonnet-4-5', tier: 'elite-intelligence', priority: 2 },
      { id: 'anthropic-opus-4-5', provider: 'anthropic', model: 'claude-opus-4-5', tier: 'elite-deep', priority: 3 }
    );
  }

  // --- 2. Google Gemini Agents ---
  if (geminiKey) {
    agents.push(
      { id: 'gemini-2-5-flash', provider: 'gemini', model: 'gemini-2.5-flash', tier: 'standard-fast', priority: 1 },
      { id: 'gemini-3-5-flash-lite', provider: 'gemini', model: 'gemini-3.5-flash-lite', tier: 'standard-lite', priority: 2 }
    );
  }

  // --- 3. Groq Accelerated Open-Weights Agents ---
  if (groqKey) {
    agents.push(
      { id: 'groq-qwen-3-6', provider: 'groq', model: 'qwen/qwen3.6-27b', tier: 'groq-speed', priority: 1 },
      { id: 'groq-compound-mini', provider: 'groq', model: 'groq/compound-mini', tier: 'groq-lite', priority: 2 },
      { id: 'groq-gpt-oss-20b', provider: 'groq', model: 'openai/gpt-oss-20b', tier: 'groq-standard', priority: 3 },
      { id: 'groq-qwen-3-8', provider: 'groq', model: 'qwen/qwen3.8-27b', tier: 'groq-deep', priority: 4 },
      { id: 'groq-compound', provider: 'groq', model: 'groq/compound', tier: 'groq-ensemble', priority: 5 }
    );
  }

  return agents;
}

/**
 * Builds a dynamic, ordered execution pipeline of AI agents based on:
 * - User Plan (Premium prioritizes Claude & Gemini 2.5 Flash)
 * - Health Status (Temporarily skips agents with 429 or temporary 503)
 * - Guaranteed Fallback (Free users cascade to Groq, and as last-resort to Claude so it NEVER fails)
 */
export function buildAgentPipeline({ isPremium = false, isVision = false }) {
  const geminiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  const anthropicKey = process.env.VITE_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;
  const groqKey = process.env.VITE_GROQ_API_KEY || process.env.GROQ_API_KEY;

  const allAgents = getAgentCatalog({ geminiKey, anthropicKey, groqKey });

  let pipeline = [];

  if (isVision) {
    // Vision / OCR pipeline: Gemini Flash 2.5 -> Gemini Flash-Lite 3.5 -> Claude Haiku
    const visionOrder = ['gemini-2-5-flash', 'gemini-3-5-flash-lite', 'anthropic-haiku-4-5'];
    pipeline = visionOrder.map(id => allAgents.find(a => a.id === id)).filter(Boolean);
  } else if (isPremium) {
    // Premium Tier: Claude Sonnet -> Claude Haiku -> Gemini 2.5 Flash -> Groq Agents
    const premiumOrder = [
      'anthropic-sonnet-4-5',
      'anthropic-haiku-4-5',
      'gemini-2-5-flash',
      'gemini-3-5-flash-lite',
      'groq-qwen-3-6',
      'groq-compound-mini',
      'groq-gpt-oss-20b',
      'anthropic-opus-4-5'
    ];
    pipeline = premiumOrder.map(id => allAgents.find(a => a.id === id)).filter(Boolean);
  } else {
    // Standard / Free Tier: Gemini 2.5 Flash -> Gemini 3.5 Lite -> Groq Qwen 3.6 -> Groq Compound -> Groq GPT-OSS -> Claude Haiku (Safety net)
    const standardOrder = [
      'gemini-2-5-flash',
      'gemini-3-5-flash-lite',
      'groq-qwen-3-6',
      'groq-compound-mini',
      'groq-gpt-oss-20b',
      'groq-qwen-3-8',
      'groq-compound',
      'anthropic-haiku-4-5' // Fail-safe safety net: customer NEVER sees a blank error
    ];
    pipeline = standardOrder.map(id => allAgents.find(a => a.id === id)).filter(Boolean);
  }

  // Sort healthy agents first, cooled-down agents last
  const healthy = pipeline.filter(a => isAgentHealthy(a.id));
  const cooledDown = pipeline.filter(a => !isAgentHealthy(a.id));

  return [...healthy, ...cooledDown];
}

/**
 * Self-Healing Multi-Pass JSON Parser:
 * Resilient against:
 * 1. Qwen `<think>` blocks
 * 2. Markdown code fences
 * 3. LaTeX unescaped backslashes (\frac, \sqrt, etc.)
 * 4. Truncated output (auto-repairs incomplete arrays/objects)
 */
export function sanitizeAndParseJSON(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    throw new Error('AI bo\'sh javob qaytardi');
  }

  // 1. Remove reasoning / thought tags
  let cleaned = rawText
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  // 2. Extract JSON substring if AI included introductory commentary
  const jsonMatch = cleaned.match(/\[\s*\{[\s\S]*\}\s*\]|\{\s*"questions"[\s\S]*\}/);
  if (jsonMatch) {
    cleaned = jsonMatch[0];
  }

  // 3. Fix unescaped LaTeX backslashes without corrupting valid escapes (\", \\, \n, etc.)
  const safeJson = cleaned.replace(/(?<!\\)\\(?!["\\/bfnrtu]|u[0-9a-fA-F]{4})/g, '\\\\');

  // 4. First parse attempt
  try {
    return JSON.parse(safeJson);
  } catch (initialErr) {
    // 5. Truncated JSON Auto-Recovery: if output was cut off, close brackets
    let repaired = safeJson.trim();
    if (repaired.startsWith('{') && !repaired.endsWith('}')) {
      repaired += '"}';
      if (repaired.includes('"questions": [') && !repaired.endsWith(']}')) {
        repaired += ']}';
      }
    } else if (repaired.startsWith('[') && !repaired.endsWith(']')) {
      repaired += '}]';
    }

    try {
      return JSON.parse(repaired);
    } catch {
      throw new Error(`JSON formatida xatolik: ${initialErr.message}`);
    }
  }
}

/**
 * Universal Question Normalizer (Postel's Law):
 * Seamlessly normalizes varying outputs from Gemini, Claude, and Groq/Qwen into
 * standard { questionNumber, questionText, options, correctAnswerIndex, correctOption }
 */
function normalizeQuestions(parsed) {
  let list = [];
  if (Array.isArray(parsed)) {
    list = parsed;
  } else if (parsed && typeof parsed === 'object') {
    const arrayKey = Object.keys(parsed).find(k => Array.isArray(parsed[k]));
    if (arrayKey) {
      list = parsed[arrayKey];
    } else {
      list = [parsed];
    }
  }

  return list.map((q, idx) => {
    if (!q || typeof q !== 'object') return null;

    // Resolve question text from any possible key
    const text = q.questionText || q.question || q.savol || q.text || q.prompt || q.title || '';
    if (!text || typeof text !== 'string') return null;

    // Resolve options from array or object map (e.g. { A: "...", B: "..." })
    let rawOptions = q.options || q.choices || q.variants || q.variantlar || q.answers || [];
    let options = [];
    if (Array.isArray(rawOptions)) {
      options = rawOptions.map(opt => {
        if (typeof opt === 'string') return opt.trim();
        if (opt && typeof opt === 'object') return (opt.text || opt.value || opt.option || JSON.stringify(opt)).trim();
        return String(opt).trim();
      }).filter(Boolean);
    } else if (typeof rawOptions === 'object') {
      options = Object.values(rawOptions).map(v => String(v).trim()).filter(Boolean);
    }

    if (options.length < 2) return null;

    // Resolve correct answer index
    let correctIdx = 0;
    if (typeof q.correctAnswerIndex === 'number' && q.correctAnswerIndex >= 0 && q.correctAnswerIndex < options.length) {
      correctIdx = q.correctAnswerIndex;
    } else if (typeof q.correctIndex === 'number' && q.correctIndex >= 0 && q.correctIndex < options.length) {
      correctIdx = q.correctIndex;
    } else if (q.correctOption && options.includes(q.correctOption)) {
      correctIdx = options.indexOf(q.correctOption);
    } else if (q.correctAnswer && options.includes(q.correctAnswer)) {
      correctIdx = options.indexOf(q.correctAnswer);
    } else if (typeof q.answer === 'string') {
      const letterIdx = ['A', 'B', 'C', 'D'].indexOf(q.answer.trim().toUpperCase());
      if (letterIdx >= 0 && letterIdx < options.length) {
        correctIdx = letterIdx;
      }
    }

    return {
      questionNumber: q.questionNumber || (idx + 1),
      questionText: text.trim(),
      options: options.slice(0, 4),
      correctAnswerIndex: correctIdx,
      correctOption: options[correctIdx] || options[0]
    };
  }).filter(Boolean);
}

/**
 * Executes an individual AI agent with a strict timeout (AbortSignal)
 */
async function callAgent(agent, { prompt, systemPrompt, aiSchema, timeoutMs = 22000, temperature = 0.7 }) {
  const geminiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  const anthropicKey = process.env.VITE_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;
  const groqKey = process.env.VITE_GROQ_API_KEY || process.env.GROQ_API_KEY;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    if (agent.provider === 'gemini') {
      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({
        model: agent.model,
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: temperature
        }
      });

      const fullPrompt = `${systemPrompt ? systemPrompt + '\n\n' : ''}${prompt}`;
      const result = await model.generateContent(fullPrompt, { signal: controller.signal });
      return result.response.text();

    } else if (agent.provider === 'anthropic') {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          model: agent.model,
          max_tokens: 4096,
          temperature: temperature,
          system: `${systemPrompt || 'You are an elite educational assessment engineer.'}\nStrictly output valid JSON matching this schema: ${JSON.stringify(aiSchema)}. No markdown fences, no conversational prose.`,
          messages: [{ role: 'user', content: prompt }]
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || `Anthropic HTTP ${res.status}`);
      return data.content?.[0]?.text || '';

    } else if (agent.provider === 'groq') {
      const supportsJsonMode = !agent.model.includes('qwen') && !agent.model.includes('compound');
      // ✅ FIX: Dinamik maxTokens — so'ralgan savollar soniga qarab moslashuvchan.
      // Groq on_demand tier da 1000 OTPM cheklov bor, lekin 950 20 ta savol uchun yetmaydi.
      // Har savol taxminan 120-150 token, overhead 300 token = adaptiv formula.
      const estimatedTokens = Math.min(Math.ceil((prompt.length / 4) * 0.6) + 400, 4096);
      const maxTokens = Math.min(Math.max(estimatedTokens, 1200), 4096);

      const body = {
        model: agent.model,
        messages: [
          {
            role: 'system',
            content: `${systemPrompt || 'You are an elite educational assessment engineer.'}\nReturn ONLY valid JSON matching: ${JSON.stringify(aiSchema)}. Do NOT include markdown code blocks or explanatory comments.`
          },
          { role: 'user', content: prompt }
        ],
        temperature: temperature,
        max_tokens: maxTokens
      };

      if (supportsJsonMode) {
        body.response_format = { type: 'json_object' };
      }

      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Authorization': `Bearer ${groqKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || `Groq HTTP ${res.status}`);
      return data.choices?.[0]?.message?.content || '';
    }

    throw new Error(`Noma'lum agent provayderi: ${agent.provider}`);
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Executes a question generation task with automatic cascading failover
 * through the agent matrix.
 */
export async function executeResilientQuestionGen({ prompt, systemPrompt, aiSchema, isPremium = false }) {
  return requestQueue(async () => {
    const pipeline = buildAgentPipeline({ isPremium });

    if (pipeline.length === 0) {
      throw new Error("Hech qanday AI agenti sozlanmagan. Iltimos API kalitlarini tekshiring.");
    }

    let lastError = '';
    const attemptLog = [];

    for (const agent of pipeline) {
      const startTime = Date.now();
      try {
        console.log(`[AI Orchestrator] 🚀 Agent ishga tushirildi: ${agent.id} (${agent.provider}/${agent.model})`);

        const rawText = await callAgent(agent, { prompt, systemPrompt, aiSchema });
        const parsed = sanitizeAndParseJSON(rawText);

        const validQuestions = normalizeQuestions(parsed);

        if (validQuestions.length === 0) {
          throw new Error("Agent qaytargan savollar strukturasi yaroqsiz");
        }

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`[AI Orchestrator] ✅ MUVAFFAQIYAT: Agent ${agent.id} (${duration}s) orqali ${validQuestions.length} ta savol yaratildi`);

        markAgentSuccess(agent.id);
        return { success: true, agentId: agent.id, questions: validQuestions };

      } catch (err) {
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        const errMsg = err.name === 'AbortError' ? '18s Timeout oshib ketdi' : err.message;
        console.warn(`[AI Orchestrator] ❌ Agent ${agent.id} muvaffaqiyatsiz (${duration}s): ${errMsg}`);
        
        markAgentFailure(agent.id, errMsg);
        lastError = `${agent.id}: ${errMsg}`;
        attemptLog.push(`${agent.id} (${errMsg})`);
      }
    }

    console.error(`[AI Orchestrator] 💥 Barcha ${pipeline.length} ta agent sinab ko'rildi, lekin hech biri javob bermadi:\n  - ${attemptLog.join('\n  - ')}`);
    return { success: false, error: lastError, attempts: attemptLog };
  });
}

/**
 * Multimodal / Vision OCR Execution with Multi-Agent Failover
 */
export async function executeResilientVisionOCR({ promptText, imageBase64, imageMimeType = 'image/jpeg' }) {
  return requestQueue(async () => {
    const pipeline = buildAgentPipeline({ isVision: true });
    const geminiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    const anthropicKey = process.env.VITE_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;

    let lastError = '';

    for (const agent of pipeline) {
      try {
        console.log(`[AI Vision] 📷 OCR Agent ishga tushdi: ${agent.id}`);

        if (agent.provider === 'gemini') {
          const genAI = new GoogleGenerativeAI(geminiKey);
          const model = genAI.getGenerativeModel({
            model: agent.model,
            generationConfig: { responseMimeType: 'application/json', temperature: 0.2 }
          });

          const contentParts = [{ text: promptText }];
          if (imageBase64) {
            contentParts.push({
              inlineData: { data: imageBase64, mimeType: imageMimeType }
            });
          }

          const result = await model.generateContent(contentParts);
          const parsed = sanitizeAndParseJSON(result.response.text());
          const questions = parsed.questions || (Array.isArray(parsed) ? parsed : []);
          if (questions.length > 0) {
            console.log(`[AI Vision] ✅ OCR MUVAFFAQIYAT: ${agent.id} orqali ${questions.length} ta savol olindi`);
            return { success: true, questions };
          }

        } else if (agent.provider === 'anthropic' && anthropicKey) {
          const content = [];
          if (imageBase64) {
            content.push({
              type: 'image',
              source: {
                type: 'base64',
                media_type: imageMimeType,
                data: imageBase64
              }
            });
          }
          content.push({ type: 'text', text: promptText });

          const res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'x-api-key': anthropicKey,
              'anthropic-version': '2023-06-01',
              'content-type': 'application/json'
            },
            body: JSON.stringify({
              model: agent.model,
              max_tokens: 4096,
              temperature: 0.2,
              messages: [{ role: 'user', content }]
            })
          });

          const data = await res.json();
          if (!res.ok) throw new Error(data.error?.message || 'Anthropic Vision xatosi');
          const parsed = sanitizeAndParseJSON(data.content?.[0]?.text || '');
          const questions = parsed.questions || (Array.isArray(parsed) ? parsed : []);
          if (questions.length > 0) {
            return { success: true, questions };
          }
        }
      } catch (err) {
        console.warn(`[AI Vision] ❌ OCR Agent ${agent.id} xatosi: ${err.message}`);
        lastError = err.message;
      }
    }

    return { success: false, error: lastError || 'Rasmdan savollarni ajratib bo\'lmadi' };
  });
}

/**
 * Text Generation (e.g. Class Analysis, Feedback) with Multi-Agent Failover
 */
export async function executeResilientTextGen({ prompt, systemPrompt, isPremium = false }) {
  const result = await executeResilientQuestionGen({
    prompt,
    systemPrompt,
    aiSchema: { type: 'object', properties: { recommendation: { type: 'string' } } },
    isPremium
  });

  return result;
}
